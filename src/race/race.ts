// The race screen: martinsvale under the lights in 3D, the field of eight, your car on the keys (or
// the touch pedals, or a gamepad), two views (right behind the car, or in the seat), the HUD, the
// radio, sparks and tire smoke, and the results. The race itself runs in session.ts.
import * as THREE from "three";
import { loadCar } from "../carModel";
import { earn } from "../garage";
import { CARS, type Car } from "../roster";
import { airGun, autopilot, createSession, mph, order, pitStop, progress, stepSession, type Entry, type Session } from "./session";
import { STOCK, speedOf, type CarState, type Input, type Spec } from "./physics";
import { planSpeed } from "./ai";
import { RIVALS } from "./rivals";
import { buildTrack, type TrackScene } from "./scene";
import { slug } from "./lines";
import { createRadio, type Radio } from "./radio";
import { startAudio, type RaceAudio } from "./sound";
import { HALF, L, R, S, bankAt, frame, gap, heightAt } from "./track";

/** easy: preseason testing. Walls and bumps only slow you down, a bit more grip, and the rivals take it easy */
export type RaceSetup = { car: Car; paintId: string; driver: string; spec: Spec; pitCrew: number; laps: number; easy: boolean };
export type RaceResult = { pos: number; field: number; led: number; best: number; payout: number };

const $ = (id: string) => document.getElementById(id)!;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const angleTo = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const fmt = (t: number) => (isFinite(t) && t > 0 ? t.toFixed(2) : "--.--");
const CAM_KEY = "scofti500:camera";

// what a finish pays: 1st down to 8th, for a 30-lap race (shorter pays less, longer more)
const PURSE = [3000, 2200, 1700, 1300, 1000, 800, 600, 400];
const LED_BONUS = 40;

type CarView = { root: THREE.Group; tilt: THREE.Group; body: THREE.Object3D | null; lastV: number; lastH: number; accel: number; lean: number };

export function createRace(opts: { onDone(again: boolean): void }) {
  const canvas = $("race-canvas") as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 3000);
  scene.add(camera);
  let track: TrackScene | null = null;
  let trackReady: Promise<TrackScene> | null = null;

  let sess: Session | null = null;
  let setup: RaceSetup | null = null;
  let views: CarView[] = [];
  let audio: RaceAudio | null = null;
  const radio: Radio = createRadio($("hud-radio"));
  let running = false;
  let paused = false;
  let finishedAt = 0;
  let camMode: "chase" | "seat" = (() => {
    try {
      return localStorage.getItem(CAM_KEY) === "seat" ? "seat" : "chase";
    } catch {
      return "chase";
    }
  })();

  // ---- the controls ----
  const keys = new Set<string>();
  let kbSteer = 0;
  let touchSteer: number | null = null;
  let touchGas = false;
  let touchBrake = false;
  const isRace = () => document.body.dataset.screen === "race";
  addEventListener("keydown", (e) => {
    if (!isRace()) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(k)) e.preventDefault();
    if (e.repeat) return;
    keys.add(k);
    // in the pit box, space and enter work the air gun
    if ((k === " " || k === "Enter") && sess && pitStop(sess)) tapGun();
    else if (k === "c") toggleCam();
    else if (k === "p") callPit();
    else if (k === " ") setPaused(!paused);
  });
  addEventListener("keyup", (e) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
  addEventListener("blur", () => keys.clear());
  {
    const pad = $("t-steer");
    const knob = $("t-knob");
    let x0 = 0;
    let id: number | null = null;
    pad.addEventListener("pointerdown", (e) => {
      id = e.pointerId;
      x0 = e.clientX;
      pad.setPointerCapture(e.pointerId);
      touchSteer = 0;
    });
    pad.addEventListener("pointermove", (e) => {
      if (e.pointerId !== id) return;
      touchSteer = clamp((e.clientX - x0) / 70, -1, 1);
      knob.style.transform = `translateX(${touchSteer * 52}px)`;
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      touchSteer = null;
      knob.style.transform = "";
    };
    pad.addEventListener("pointerup", end);
    pad.addEventListener("pointercancel", end);
    const pedal = (el: HTMLElement, set: (on: boolean) => void) => {
      el.addEventListener("pointerdown", (e) => {
        el.setPointerCapture(e.pointerId);
        set(true);
        el.classList.add("down");
      });
      const up = () => {
        set(false);
        el.classList.remove("down");
      };
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
    };
    pedal($("t-gas"), (on) => (touchGas = on));
    pedal($("t-brake"), (on) => (touchBrake = on));
  }
  // the pit stop's four wheels, five lug nuts each
  const nuts: HTMLElement[] = [];
  const wheels = [0, 1, 2, 3].map(() => {
    const w = document.createElement("span");
    w.className = "ps-wheel";
    for (let k = 0; k < 5; k++) {
      const n = document.createElement("i");
      n.style.setProperty("--a", `${k * 72}deg`);
      w.append(n);
      nuts.push(n);
    }
    $("ps-wheels").append(w);
    return w;
  });
  const gun = $("ps-gun");
  gun.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    tapGun();
  });
  function tapGun(): void {
    if (!sess || paused || !airGun(sess)) return;
    audio?.airGun();
    gun.classList.remove("hit");
    void gun.offsetWidth;
    gun.classList.add("hit");
  }
  function showPitStop(): void {
    const ps = sess ? pitStop(sess) : null;
    $("pit-stop").classList.toggle("on", !!ps);
    if (!ps) return;
    const lit = Math.floor(ps.done * 20 + 1e-6);
    nuts.forEach((n, k) => n.classList.toggle("on", k < lit));
    wheels.forEach((w, k) => w.classList.toggle("done", lit >= (k + 1) * 5));
    $("ps-time").textContent = ps.time.toFixed(1);
  }

  $("hud-cam").addEventListener("click", toggleCam);
  $("hud-pit").addEventListener("click", callPit);
  $("hud-pause").addEventListener("click", () => setPaused(true));
  $("rp-resume").addEventListener("click", () => setPaused(false));
  $("rp-quit").addEventListener("click", () => finish(false));
  // always on screen: straight back to the pit garage, no payout
  $("hud-exit").addEventListener("click", () => finish(false));
  $("rr-garage").addEventListener("click", () => finish(false));
  $("rr-again").addEventListener("click", () => finish(true));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running) setPaused(true);
  });

  function readInput(dt: number): Input {
    const left = keys.has("ArrowLeft") || keys.has("a");
    const right = keys.has("ArrowRight") || keys.has("d");
    const want = (right ? 1 : 0) - (left ? 1 : 0);
    // the keys turn the wheel at a steady rate, and let it come back a bit quicker
    const rate = want === 0 ? 4 : Math.sign(want) !== Math.sign(kbSteer) && kbSteer !== 0 ? 5 : 2.6;
    kbSteer += clamp(want - kbSteer, -rate * dt, rate * dt);
    let steer = touchSteer ?? kbSteer;
    let throttle = keys.has("ArrowUp") || keys.has("w") || touchGas ? 1 : 0;
    let brake = keys.has("ArrowDown") || keys.has("s") || touchBrake ? 1 : 0;
    const gp = navigator.getGamepads?.().find((g) => g);
    if (gp) {
      const ax = gp.axes[0] ?? 0;
      if (Math.abs(ax) > 0.08) steer = Math.sign(ax) * Math.pow((Math.abs(ax) - 0.08) / 0.92, 1.4);
      throttle = Math.max(throttle, gp.buttons[7]?.value ?? 0, gp.buttons[0]?.pressed ? 1 : 0);
      brake = Math.max(brake, gp.buttons[6]?.value ?? 0, gp.buttons[1]?.pressed ? 1 : 0);
    }
    // preseason: no brake pedal. Let off the gas and the car slows itself, just enough to make the
    // corner coming up (and a little on the straights)
    if (setup?.easy && sess && throttle < 0.1) {
      const c = sess.cars[sess.player];
      const v = Math.hypot(c.vx, c.vz);
      const corner = planSpeed(c.s + v * 0.6) * 0.97;
      brake = Math.max(brake, v > corner ? clamp((v - corner) / 4, 0.3, 1) : 0.15);
    }
    return { steer: clamp(steer, -1, 1), throttle, brake };
  }

  function toggleCam(): void {
    camMode = camMode === "chase" ? "seat" : "chase";
    try {
      localStorage.setItem(CAM_KEY, camMode);
    } catch {
      // not remembered
    }
    placeCamera();
  }

  /** chase: the camera in the world, following; seat: riding in your car */
  function placeCamera(): void {
    const me = sess ? views[sess.player] : null;
    document.body.classList.toggle("in-seat", camMode === "seat");
    if (!me) return;
    if (camMode === "seat") {
      me.tilt.add(camera);
      camera.position.set(-0.3, 1.02, -0.36);
      camera.rotation.set(0, -Math.PI / 2, 0);
      if (me.body) me.body.visible = false;
    } else {
      scene.add(camera);
      if (me.body) me.body.visible = true;
    }
    resize();
  }

  /** your driver's own line (only some drivers have a voice so far) */
  const me = (what: string) => `drv-${slug(setup?.driver ?? "")}-${what}`;
  let wallSaidAt = 0;

  function callPit(): void {
    if (!sess || sess.phase !== "green" || autopilot(sess)) return;
    const left = sess.laps - Math.max(0, sess.crossed[sess.player]);
    if (left <= 1) return;
    sess.pitCall = !sess.pitCall;
    $("hud-pit").classList.toggle("on", sess.pitCall);
    if (sess.pitCall) {
      radio.say("crew-pit-call");
      radio.say(me("pit"));
    }
    else radio.say("crew-stay-out");
  }

  function setPaused(on: boolean): void {
    if (!running || finishedAt) return;
    paused = on;
    $("race-pause").classList.toggle("on", on);
    audio?.pause(on);
    radio.mute(on);
    if (!on) last = performance.now();
  }

  function resize(): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tall = h > w;
    camera.fov = camMode === "seat" ? (tall ? 92 : 72) : tall ? 76 : 60;
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);

  // ---- starting a race ----

  async function start(s: RaceSetup): Promise<void> {
    setup = s;
    // preseason has no brake pedal: lift to slow down
    $("race-screen").classList.toggle("easy", s.easy);
    finishedAt = 0;
    paused = false;
    $("race-results").classList.remove("on");
    $("race-pause").classList.remove("on");
    $("race-load").classList.add("on");
    $("hud-pit").classList.remove("on");
    const bar = $("race-load-bar");
    bar.style.width = "4%";
    resize();

    // the field: the rivals in grid order, you at the back
    const entries: Entry[] = RIVALS.map((r) => {
      const car = CARS.find((c) => c.id === r.carId)!;
      if (s.easy) return { name: r.name, number: car.number, carId: r.carId, paintId: r.paint, spec: { ...STOCK, power: STOCK.power * 0.94 }, skill: r.skill * 0.95, aggression: r.aggression * 0.4 };
      return { name: r.name, number: car.number, carId: r.carId, paintId: r.paint, spec: STOCK, skill: r.skill, aggression: r.aggression };
    });
    // shuffle the rivals' starting spots a little each race
    for (let i = entries.length - 1; i > 0; i--) {
      if (Math.random() < 0.5) [entries[i], entries[i - 1]] = [entries[i - 1], entries[i]];
    }
    const mySpec = s.easy ? { ...s.spec, grip: s.spec.grip * 1.06 } : s.spec;
    entries.push({ name: s.driver, number: s.car.number, carId: s.car.id, paintId: s.paintId, spec: mySpec, skill: 1, aggression: 0.5, player: true });
    sess = createSession(entries, s.laps, s.easy);

    trackReady ??= buildTrack(scene);
    track = await trackReady;
    bar.style.width = "20%";

    for (const v of views) scene.remove(v.root);
    views = [];
    let loaded = 0;
    const made = await Promise.all(
      entries.map(async (e) => {
        const car = CARS.find((c) => c.id === e.carId)!;
        const body = await loadCar(car, e.paintId, { brightness: 0.85, maxSize: e.player ? 2048 : 1024 });
        loaded++;
        bar.style.width = `${20 + (loaded / entries.length) * 78}%`;
        return body;
      }),
    );
    if (setup !== s) return;
    views = made.map((body) => {
      const root = new THREE.Group();
      const tilt = new THREE.Group();
      root.add(tilt);
      if (body) {
        // the models face -x; the car's root faces +x
        body.rotation.y = Math.PI;
        tilt.add(body);
      }
      scene.add(root);
      return { root, tilt, body, lastV: 0, lastH: 0, accel: 0, lean: 0 };
    });
    sess.cars.forEach((c, i) => (views[i].lastH = c.h));
    placeCamera();
    camH = sess.cars[sess.player].h;
    $("race-load").classList.remove("on");

    audio?.stop();
    audio = startAudio();
    radio.clear();
    radio.mute(false);
    radio.say("ann-welcome");
    radio.say("crew-pace");
    spot = { high: false, low: false, clearAt: 0 };
    warned = { half: false, gone: false };
    lastPos = sess.entries.length;
    posSaidAt = 0;
    // a fresh loop for every race, so a quick RACE AGAIN can never leave two running
    running = true;
    last = performance.now();
    const id = ++loopId;
    requestAnimationFrame((t) => frameLoop(t, id));
  }

  // ---- the loop ----
  let last = 0;
  let loopId = 0;
  let acc = 0;
  let hudAt = 0;
  let pylonAt = 0;
  let camH = 0;
  let shake = 0;
  const DT = 1 / 120;
  // ?simtest: every frame is 1/30 s of race however slow the screen is (for screenshots in a slow
  // software-rendered browser), and the race is on window.__race to look at
  const SIMTEST = new URLSearchParams(location.search).has("simtest");

  function frameLoop(t: number, id: number): void {
    if (!running || id !== loopId) return;
    requestAnimationFrame((t2) => frameLoop(t2, id));
    const dt = SIMTEST ? 1 / 30 : Math.min(0.1, (t - last) / 1000 || 0);
    last = t;
    if (!sess || paused) return;
    if (SIMTEST) (window as unknown as { __race: Session }).__race = sess;
    const input = readInput(dt);
    acc += dt;
    let steps = 0;
    while (acc >= DT && steps < 10) {
      stepSession(sess, input, DT, setup!.pitCrew);
      acc -= DT;
      steps++;
    }
    if (steps === 10) acc = 0;
    handleEvents();
    spotter();
    drawCars(dt);
    effects(dt);
    follow(dt);
    // ?simtest screenshots can put the camera anywhere: window.__camPose = [x, y, z, lookX, lookY, lookZ]
    const pose = SIMTEST && (window as unknown as { __camPose?: number[] }).__camPose;
    if (pose) {
      camera.position.set(pose[0], pose[1], pose[2]);
      camera.lookAt(pose[3], pose[4], pose[5]);
    }
    const me = sess.cars[sess.player];
    track!.focus(me.x, me.z);
    track!.update(t / 1000, sess.phase === "checkered" ? "checkered" : sess.phase === "pace" ? "yellow" : whiteFlag() ? "white" : "green");
    sound();
    if (t > hudAt) {
      hudAt = t + 100;
      hud();
    }
    showPitStop();
    if (t > pylonAt) {
      pylonAt = t + 1000;
      const running = order(sess);
      track!.pylon(running.map((i) => sess!.entries[i].number));
      const lap = sess.phase === "pace" ? "PACE LAP" : sess.phase === "checkered" ? "CHECKERED" : `LAP ${Math.min(sess.laps, Math.max(...sess.crossed) + 1)}/${sess.laps}`;
      track!.board(running.map((i) => ({ number: sess!.entries[i].number, name: sess!.entries[i].name, me: i === sess!.player })), lap);
    }
    renderer.render(scene, camera);
    if (finishedAt && t - finishedAt > 4500 && !$("race-results").classList.contains("on")) results();
  }

  const whiteFlag = () => !!sess && sess.phase === "green" && Math.max(...sess.crossed) === sess.laps - 1;

  function drawCars(dt: number): void {
    sess!.cars.forEach((c, i) => {
      const v = views[i];
      const y = heightAt(c.s, Math.min(c.d, HALF));
      v.root.position.set(c.x, y, c.z);
      v.root.rotation.y = -c.h;
      const speed = speedOf(c);
      const a = dt > 0 ? (speed - v.lastV) / dt : 0;
      v.accel += (a - v.accel) * Math.min(1, dt * 6);
      const yawRate = dt > 0 ? angleTo(v.lastH, c.h) / dt : 0;
      v.lean += (-yawRate * speed * 0.0028 - v.lean) * Math.min(1, dt * 5);
      v.lastV = speed;
      v.lastH = c.h;
      // sit on the banking, lean out in the turns, squat and dive with the throttle and brakes
      const bank = c.d > -HALF - 0.5 ? bankAt(c.s) : 0;
      v.tilt.rotation.set(-bank + clamp(v.lean, -0.06, 0.06), 0, clamp(v.accel * 0.0035, -0.035, 0.02));
    });
  }

  function follow(dt: number): void {
    const me = sess!.cars[sess!.player];
    const v = views[sess!.player];
    if (camMode === "seat") {
      // a bit of shake from the bumps and the wall
      shake = Math.max(shake * Math.exp(-dt * 6), Math.min(0.05, me.scrape * 0.01 + me.bump * 0.008));
      camera.position.set(-0.3 + (Math.random() - 0.5) * shake, 1.02 + (Math.random() - 0.5) * shake, -0.36);
      return;
    }
    camH += angleTo(camH, me.h) * Math.min(1, dt * 6);
    const back = 7.4;
    const y = v.root.position.y;
    camera.position.set(me.x - Math.cos(camH) * back, y + 2.45, me.z - Math.sin(camH) * back);
    camera.lookAt(me.x + Math.cos(camH) * 9, y + 1.0, me.z + Math.sin(camH) * 9);
  }

  // ---- sparks and smoke ----
  const SPARKS = 240;
  const sparkPos = new Float32Array(SPARKS * 3).fill(-999);
  const sparkVel = new Float32Array(SPARKS * 3);
  const sparkLife = new Float32Array(SPARKS);
  let sparkNext = 0;
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  scene.add(new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: "#ffb347", size: 0.22, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  const smokeTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(220,220,225,0.55)");
    grad.addColorStop(1, "rgba(220,220,225,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const puffs = Array.from({ length: 48 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.visible = false;
    scene.add(s);
    return { s, life: 0, vy: 0 };
  });
  let puffNext = 0;

  function effects(dt: number): void {
    sess!.cars.forEach((c, i) => {
      const y = views[i].root.position.y;
      if (c.scrape > 1.2 || c.bump > 3) {
        const f = frame(c.s, c.d);
        const side = c.scrape > 1.2 ? (c.d > 0 ? 1 : -1) : 0;
        const n = Math.min(8, Math.ceil(c.scrape + c.bump * 0.5));
        for (let k = 0; k < n; k++) {
          const j = sparkNext++ % SPARKS;
          sparkPos.set([c.x + f.nx * side * 1.0, y + 0.35, c.z + f.nz * side * 1.0], j * 3);
          sparkVel.set([c.vx * 0.6 + (Math.random() - 0.5) * 6, 1 + Math.random() * 3, c.vz * 0.6 + (Math.random() - 0.5) * 6], j * 3);
          sparkLife[j] = 0.25 + Math.random() * 0.35;
        }
      }
      if (c.slide > 2.4 && Math.random() < dt * 30) {
        const p = puffs[puffNext++ % puffs.length];
        p.s.position.set(c.x - Math.cos(c.h) * 1.8, y + 0.4, c.z - Math.sin(c.h) * 1.8);
        p.s.visible = true;
        p.life = 1;
        p.vy = 0.8 + Math.random();
        p.s.scale.setScalar(1.4);
      }
    });
    for (let j = 0; j < SPARKS; j++) {
      if (sparkLife[j] <= 0) continue;
      sparkLife[j] -= dt;
      sparkVel[j * 3 + 1] -= 9.8 * dt;
      for (let k = 0; k < 3; k++) sparkPos[j * 3 + k] += sparkVel[j * 3 + k] * dt;
      if (sparkLife[j] <= 0) sparkPos[j * 3 + 1] = -999;
    }
    sparkGeo.getAttribute("position").needsUpdate = true;
    for (const p of puffs) {
      if (!p.s.visible) continue;
      p.life -= dt * 0.7;
      p.s.position.y += p.vy * dt;
      p.s.scale.setScalar(1.4 + (1 - p.life) * 5);
      p.s.material.opacity = Math.max(0, p.life * 0.5);
      if (p.life <= 0) p.s.visible = false;
    }
  }

  function sound(): void {
    if (!audio) return;
    const me = sess!.cars[sess!.player];
    let near = 0;
    let pitch = 0;
    for (let i = 0; i < sess!.cars.length; i++) {
      if (i === sess!.player) continue;
      const o = sess!.cars[i];
      const d = Math.hypot(o.x - me.x, o.z - me.z);
      const k = clamp(1 - d / 70, 0, 1);
      if (k > near) {
        near = k;
        pitch = (o.rpm / 60) * 4;
      }
    }
    audio.set({ rpm: me.rpm, throttle: me.throttle, slide: me.slide, scrape: me.scrape, field: near * near, fieldPitch: pitch || 300 });
    if (me.bump > 2.5) audio.bump(me.bump);
  }

  // ---- the radio ----
  let spot = { high: false, low: false, clearAt: 0 };
  let warned = { half: false, gone: false };
  let lastPos = 8;
  let posSaidAt = 0;

  function spotter(): void {
    if (!sess || sess.phase === "pace" || finishedAt) return;
    const me = sess.cars[sess.player];
    let high = false;
    let low = false;
    for (let i = 0; i < sess.cars.length; i++) {
      if (i === sess.player) continue;
      const o = sess.cars[i];
      if (Math.abs(gap(me.s, o.s)) < 5.8 && Math.abs(o.d - me.d) < 4.6) {
        if (o.d > me.d) high = true;
        else low = true;
      }
    }
    const now = performance.now();
    if (high && low && !(spot.high && spot.low)) radio.say("spot-three-wide");
    else if (high && !spot.high && !low) radio.say("spot-car-high");
    else if (low && !spot.low && !high) radio.say("spot-car-low");
    if ((spot.high || spot.low) && !high && !low) spot.clearAt = now + 350;
    if (spot.clearAt && now > spot.clearAt && !high && !low) {
      radio.say("spot-clear");
      spot.clearAt = 0;
    }
    if (high || low) spot.clearAt = 0;
    spot.high = high;
    spot.low = low;
  }

  function handleEvents(): void {
    const s = sess!;
    const name = (i: number) => s.entries[i].name;
    for (const e of s.events) {
      if (e.type === "green") {
        radio.say("spot-green");
        radio.say(me("green"));
        audio?.roar();
      } else if (e.type === "white") {
        radio.say("crew-white");
      } else if (e.type === "checkered") {
        const win = s.finishOrder[0];
        radio.say(`ann-win-${slug(name(win))}`);
        audio?.roar();
      } else if (e.type === "finish" && e.car === s.player) {
        finishedAt = performance.now();
        const p = e.pos;
        radio.say(p === 1 ? "crew-win" : p <= 3 ? `crew-podium-${p}` : "crew-next-time");
        if (p <= 3) radio.say(me(p === 1 ? "win" : "podium"));
        if (p <= 3) radio.say(me(p === 1 ? "win" : "podium"));
      } else if (e.type === "lap" && e.car === s.player) {
        const left = s.laps - s.crossed[s.player];
        const pos = order(s).indexOf(s.player) + 1;
        if (left > 1 && (left % 5 === 0 || left === 3)) radio.say(`crew-togo-${left}`);
      } else if (e.type === "pit-in" && e.car === s.player) {
        radio.say("crew-pit-in");
      } else if (e.type === "pit-stopped" && e.car === s.player) {
        radio.say("crew-four-tires");
      } else if (e.type === "pit-out" && e.car === s.player) {
        radio.say("crew-pit-out");
        warned = { half: false, gone: false };
        $("hud-pit").classList.remove("on");
      } else if (e.type === "pit-in" && Math.random() < 0.4) {
        radio.say(`crew-pitting-${slug(name(e.car))}`);
      }
    }
    s.events.length = 0;
    if (s.phase !== "green" || finishedAt) return;
    const mine = s.cars[s.player];
    // a big hit on the wall
    if (mine.scrape > 9 && performance.now() - wallSaidAt > 12000) {
      wallSaidAt = performance.now();
      radio.say(me("wall"));
      radio.say("spot-wall");
    }
    if (mine.wear > 0.45 && !warned.half) {
      warned.half = true;
      radio.say("crew-tires-half");
    } else if (mine.wear > 0.72 && !warned.gone && s.laps - s.crossed[s.player] > 3) {
      warned.gone = true;
      radio.say("crew-tires-gone");
    }
    const pos = order(s).indexOf(s.player) + 1;
    const now = performance.now();
    if (pos < lastPos && now - posSaidAt > 9000 && s.crossed[s.player] >= 0) {
      posSaidAt = now;
      radio.say(pos === 1 ? "crew-lead" : `crew-pos-${pos}`);
    }
    lastPos = pos;
  }

  // ---- the HUD ----
  const mapCanvas = $("hud-map") as HTMLCanvasElement;
  const map = mapCanvas.getContext("2d")!;
  const outline: [number, number][] = [];
  for (let s = 0; s < L; s += 6) {
    const f = frame(s);
    outline.push([f.x, f.z]);
  }

  function hud(): void {
    const s = sess!;
    const me = s.cars[s.player];
    const ord = order(s);
    const pos = ord.indexOf(s.player) + 1;
    $("hud-pos").textContent = String(pos);
    $("hud-of").textContent = `/${s.cars.length}`;
    const lap = clamp(s.crossed[s.player] + 1, 1, s.laps);
    $("hud-lap").textContent = s.phase === "pace" ? "PACE LAP" : `LAP ${lap}/${s.laps}`;
    $("hud-last").textContent = fmt(s.lastLap[s.player]);
    $("hud-best").textContent = fmt(s.bestLap[s.player]);
    $("hud-speed").textContent = String(Math.round(mph(me)));
    $("hud-gear").textContent = String(me.gear);
    $("ck-speed").textContent = String(Math.round(mph(me)));
    $("ck-gear").textContent = String(me.gear);
    ($("ck-rpm") as HTMLElement).style.width = `${clamp((me.rpm - 3000) / 6600, 0, 1) * 100}%`;
    ($("ck-wheel") as HTMLElement).style.transform = `rotate(${me.steer * 120}deg)`;
    // the tire monitor: how much of each tire is left, and how hot it is
    me.tires.forEach((t, i) => {
      const left = Math.round((1 - t.wear) * 100);
      const tire = $(`tt-${i}`);
      tire.style.setProperty("--left", `${left}%`);
      tire.dataset.wear = left > 60 ? "good" : left > 30 ? "used" : "gone";
      tire.dataset.heat = t.temp < 0.8 ? "cold" : t.temp > 1.12 ? "hot" : "ok";
      $(`tv-${i}`).innerHTML = `<b>${left}%</b><small>${Math.round(120 + t.temp * 95)}°F</small>`;
    });
    $("hud-limiter").classList.toggle("on", me.limiter);
    const flag = $("hud-flag");
    const label = s.phase === "pace" ? "" : s.phase === "checkered" ? "CHECKERED" : whiteFlag() ? "WHITE FLAG" : s.t < greenUntil() ? "GREEN" : "";
    flag.textContent = label;
    flag.dataset.flag = label.split(" ")[0].toLowerCase();

    // the running order
    const leaderP = progress(s, ord[0]);
    $("hud-board").innerHTML = ord
      .map((i, k) => {
        const behind = (leaderP - progress(s, i)) / 36;
        const lapsDown = Math.floor((leaderP - progress(s, i)) / L);
        const gapTxt = k === 0 ? "LEADER" : lapsDown > 0 ? `-${lapsDown} LAP` : `+${behind.toFixed(1)}`;
        const pit = s.drivers[i].mode === "pit" ? "<em>PIT</em>" : "";
        return `<li class="${i === s.player ? "me" : ""}"><b>${k + 1}</b><i>${s.entries[i].number}</i><span>${s.entries[i].name}</span>${pit}<small>${gapTxt}</small></li>`;
      })
      .join("");

    // the mini map
    const W = mapCanvas.width;
    const H = mapCanvas.height;
    const k = Math.min((W - 16) / (S + 2 * R + 20), (H - 16) / (2 * R + 20));
    const px = (x: number) => W / 2 + x * k;
    const pz = (z: number) => H / 2 + z * k;
    map.clearRect(0, 0, W, H);
    map.lineWidth = 7;
    map.strokeStyle = "rgba(255,255,255,0.25)";
    map.beginPath();
    outline.forEach(([x, z], i) => (i ? map.lineTo(px(x), pz(z)) : map.moveTo(px(x), pz(z))));
    map.closePath();
    map.stroke();
    s.cars.forEach((c, i) => {
      map.fillStyle = i === s.player ? "#ffd400" : "#f4f4f4";
      map.beginPath();
      map.arc(px(c.x), pz(c.z), i === s.player ? 5 : 3.5, 0, Math.PI * 2);
      map.fill();
    });
  }
  let greenAt = 0;
  const greenUntil = () => {
    if (!greenAt && sess && sess.phase === "green") greenAt = sess.t;
    return greenAt + 4;
  };

  // ---- the end ----
  function results(): void {
    const s = sess!;
    const ord = order(s);
    const pos = ord.indexOf(s.player) + 1;
    const scale = 0.4 + (s.laps / 30) * 0.6;
    const payout = Math.round((PURSE[pos - 1] ?? 300) * scale) + s.led[s.player] * LED_BONUS;
    earn(payout);
    $("rr-title").textContent = pos === 1 ? "VICTORY LANE" : pos <= 3 ? "PODIUM" : "CHECKERED FLAG";
    $("rr-pos").textContent = `P${pos}`;
    $("rr-cash").textContent = `+$${payout.toLocaleString()}`;
    // laps down on the winner, the way the real results sheet shows it
    const down = (i: number) => s.crossed[ord[0]] - s.crossed[i];
    $("rr-table").innerHTML = ord
      .map((i, k) => {
        const d = down(i);
        const laps = d > 0 ? `<em>-${d} LAP${d > 1 ? "S" : ""}</em> · ` : "";
        return `<li class="${i === s.player ? "me" : ""}"><b>${k + 1}</b><i>#${s.entries[i].number}</i><span>${s.entries[i].name}</span><small>${laps}best ${fmt(s.bestLap[i])}${s.led[i] ? ` · led ${s.led[i]}` : ""}</small></li>`;
      })
      .join("");
    $("race-results").classList.add("on");
  }

  function finish(again: boolean): void {
    running = false;
    paused = false;
    audio?.stop();
    audio = null;
    radio.clear();
    greenAt = 0;
    $("race-pause").classList.remove("on");
    $("race-results").classList.remove("on");
    if (again && setup) {
      void start(setup);
      return;
    }
    setup = null;
    opts.onDone(again);
  }

  return {
    start: (s: RaceSetup) => void start(s),
  };
}

export type { CarState };
