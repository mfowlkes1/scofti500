// The race screen: the track in 3D (martinsvale under the lights, or hotlanta in the sun), the field of eight, your car on the keys (or
// the touch pedals, or a gamepad), two views (right behind the car, or in the seat), the HUD, the
// radio, sparks and tire smoke, and the results. The race itself runs in session.ts.
import * as THREE from "three";
import { loadCar } from "../carModel";
import { duckMusic } from "../music";
import { addNumber } from "../carNumber";
import { CAR_HEIGHT } from "../carModel";
import { chipAmount, earnChips } from "../chips";
import { CARS, type Car } from "../roster";
import { airGun, autopilot, createQualifying, createSession, mph, order, pitStop, progress, qualifyingLap, stepSession, type Entry, type Session } from "./session";
import { STOCK, speedOf, type CarState, type Input, type Spec } from "./physics";
import { planSpeed } from "./ai";
import { fieldOf } from "./rivals";
import { buildTrack, type TrackScene } from "./scene";
import { buildCrews, type PitCrews } from "./crew";
import { CHATTER_COUNT, HEATHER_UPDATE_COUNT, HEATHER_WRAP_COUNT, LINES, slug } from "./lines";
import { DRIVERS } from "../roster";
import { savedSuit, suitUrl } from "../suit";
import { createRadio, type Radio } from "./radio";
import { startAudio, type RaceAudio } from "./sound";
import { BOUNDS, HALF, L, TRACK, bankAt, frame, gap, heightAt, setTrack } from "./track";

/** easy: preseason testing. Walls and bumps only slow you down, a bit more grip, and the rivals take it easy */
/** grid: the starting order from qualifying (names); race night qualifies first when there's none */
export type RaceSetup = { car: Car; paintId: string; driver: string; spec: Spec; pitCrew: number; laps: number; easy: boolean; track: string; grid?: string[] };
export type RaceResult = { pos: number; field: number; led: number; best: number; payout: number };

const $ = (id: string) => document.getElementById(id)!;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const angleTo = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const fmt = (t: number) => (isFinite(t) && t > 0 ? t.toFixed(2) : "--.--");
const CAM_KEY = "scofti500:camera";

// what a finish pays: 1st down to 8th, for a 15-lap race (shorter pays less)
const PURSE = [300, 220, 170, 130, 100, 80, 60, 40];
const LED_BONUS = 4;

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
  // each track's scene, built the first time it's raced and kept
  const tracks = new Map<string, Promise<TrackScene>>();
  let crews: PitCrews | null = null;
  const crewSets = new Map<string, PitCrews>();

  let sess: Session | null = null;
  let setup: RaceSetup | null = null;
  let views: CarView[] = [];
  let audio: RaceAudio | null = null;
  const radio: Radio = createRadio(
    $("hud-radio"),
    (talking) => {
      audio?.duck(talking);
      duckMusic(talking);
    },
    $("heather"),
  );
  let running = false;
  let paused = false;
  let finishedAt = 0;
  // when the winner took the flag: the recap comes 20 s after it even if you're still out there
  // (wrecked or a lap down), placed by the laps you finished (Michael, 2026-10-13)
  let checkeredAt = 0;
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
    // let off the gas and the car slows itself, just enough to make the corner coming up (and a little
    // on the straights). Both nights drive this way, with no brake pedal on screen (Michael,
    // 2026-10-12/13); the down key and a gamepad trigger still brake harder
    if (sess && throttle < 0.1) {
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
  /** a line that names the track: this track's version when there is one */
  const here = (key: string) => (LINES[`${key}-${TRACK.id}`] ? `${key}-${TRACK.id}` : key);
  let wallSaidAt = 0;

  function callPit(): void {
    if (!sess || sess.phase !== "green" || autopilot(sess) || sess.qualifying) return;
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
    setTrack(s.track);
    traceOutline();
    $("load-track").textContent = TRACK.id.toUpperCase();
    $("load-line").textContent = TRACK.night ? "rolling out under the lights…" : "rolling out into the heat…";
    finishedAt = 0;
    checkeredAt = 0;
    interviewDone = false;
    interviewing = false;
    paused = false;
    $("race-results").classList.remove("on");
    $("race-pause").classList.remove("on");
    $("race-load").classList.add("on");
    $("hud-pit").classList.remove("on");
    const bar = $("race-load-bar");
    bar.style.width = "4%";
    resize();

    // race night starts with qualifying: you alone, a warm-up lap and one timed lap (Michael,
    // 2026-10-13). Its times set the grid; preseason testing just lines up and goes
    const qualifying = !s.easy && !s.grid;
    // the field: the rivals in grid order (as many as the track takes), you at the back
    const rivals: Entry[] = fieldOf(TRACK.field).map((r) => {
      const number = r.number;
      if (s.easy) return { name: r.name, number, carId: r.carId, paintId: r.paint, spec: { ...STOCK, power: STOCK.power * 0.94 }, skill: r.skill * 0.95, aggression: r.aggression * 0.4 };
      return { name: r.name, number, carId: r.carId, paintId: r.paint, spec: STOCK, skill: r.skill, aggression: r.aggression };
    });
    const mySpec = s.easy ? { ...s.spec, grip: s.spec.grip * 1.06 } : s.spec;
    const me: Entry = { name: s.driver, number: s.car.number, carId: s.car.id, paintId: s.paintId, spec: mySpec, skill: 1, aggression: 0.5, player: true };
    let entries: Entry[];
    if (qualifying) {
      entries = [me];
      sess = createQualifying(me);
    } else {
      if (s.grid) {
        // lined up the way they qualified
        const all = [...rivals, me];
        entries = s.grid.map((n) => all.find((e) => e.name === n)).filter((e): e is Entry => !!e);
      } else {
        // shuffle the rivals' starting spots a little each race, you at the back
        entries = rivals;
        for (let i = entries.length - 1; i > 0; i--) {
          if (Math.random() < 0.5) [entries[i], entries[i - 1]] = [entries[i - 1], entries[i]];
        }
        entries.push(me);
      }
      sess = createSession(entries, s.laps, s.easy);
    }

    if (!tracks.has(TRACK.id))
      tracks.set(
        TRACK.id,
        buildTrack().then((t) => {
          scene.add(t.root);
          return t;
        }),
      );
    track = await tracks.get(TRACK.id)!;
    for (const t of await Promise.all(tracks.values())) t.root.visible = t === track;
    track.apply(scene);
    bar.style.width = "20%";

    for (const v of views) scene.remove(v.root);
    views = [];
    let loaded = 0;
    // rivals in the same car and paint share one painted model (copies of it); a big field gets
    // smaller paint textures to go easy on phones
    const shared = new Map<string, Promise<THREE.Group | null>>();
    const big = entries.length > 12;
    const made = await Promise.all(
      entries.map(async (e) => {
        const car = CARS.find((c) => c.id === e.carId)!;
        let body: THREE.Group | null;
        if (e.player) body = await loadCar(car, e.paintId, { brightness: 0.85, maxSize: 2048 });
        else {
          const key = `${e.carId}|${e.paintId}`;
          if (!shared.has(key)) shared.set(key, loadCar(car, e.paintId, { brightness: 0.85, maxSize: big ? 512 : 1024 }));
          body = (await shared.get(key)!)?.clone() ?? null;
          // their own number over the one baked into the model
          if (body) addNumber(body, e.carId, e.number, e.paintId);
        }
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
    // each track's pit crews, one for every box, live in its scene
    crews = crewSets.get(TRACK.id) ?? buildCrews(track.root, TRACK.field);
    crewSets.set(TRACK.id, crews);
    crews.setup(sess);
    if (!paceCar) await buildPaceCar();
    paceGone = -1;
    lastPhase = "";
    placeCamera();
    camH = sess.cars[sess.player].h;
    $("race-load").classList.remove("on");

    audio?.stop();
    audio = startAudio();
    radio.clear();
    radio.mute(false);
    if (qualifying) radio.say("crew-qual-warm");
    else {
      radio.say(here("ann-welcome"));
      radio.say("ann-stakes");
      radio.say("crew-pace");
    }
    spot = { high: false, low: false, clearAt: 0 };
    warned = { half: false, gone: false };
    lastPos = sess.entries.length;
    posSaidAt = 0;
    chat = freshChat();
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
    // (window.__simSpeed fast-forwards it: that many times 1/30 s a frame)
    const dt = SIMTEST ? ((window as unknown as { __simSpeed?: number }).__simSpeed ?? 1) / 30 : Math.min(0.1, (t - last) / 1000 || 0);
    last = t;
    if (!sess || paused) return;
    if (SIMTEST) (window as unknown as { __race: Session }).__race = sess;
    const input = readInput(dt);
    acc += dt;
    let steps = 0;
    const most = SIMTEST ? 400 : 10;
    while (acc >= DT && steps < most) {
      stepSession(sess, input, DT, setup!.pitCrew);
      acc -= DT;
      steps++;
    }
    if (steps === most) acc = 0;
    handleEvents();
    spotter();
    crews?.update(sess, dt);
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
    track!.update(t / 1000, sess.phase === "checkered" ? "checkered" : sess.phase === "pace" || sess.phase === "caution" ? "yellow" : whiteFlag() ? "white" : "green");
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
      const lap = sess.phase === "pace" ? "PACE LAP" : sess.phase === "checkered" ? "CHECKERED" : sess.phase === "caution" ? "CAUTION" : `LAP ${Math.min(sess.laps, Math.max(...sess.crossed) + 1)}/${sess.laps}`;
      track!.board(running.map((i) => ({ number: sess!.entries[i].number, name: sess!.entries[i].name, me: i === sess!.player })), lap);
    }
    renderer.render(scene, camera);
    if (!finishedAt && checkeredAt && !sess.qualifying && t - checkeredAt > 20000) finishedAt = t - 4500;
    if (finishedAt && t - finishedAt > (sess.qualifying ? 1500 : 4500) && !$("race-results").classList.contains("on")) {
      if (sess.qualifying) qualified();
      else if (!interviewDone) interview();
      else results();
    }
  }

  const whiteFlag = () => !!sess && sess.phase === "green" && Math.max(...sess.crossed) === sess.laps - 1;

  // ---- the pace car: white, PACE on the doors, a light bar flashing on the roof. It leads the pace
  // laps and every caution, then ducks off down the apron at the green ----
  let paceCar: { root: THREE.Group; tilt: THREE.Group; lights: THREE.Mesh[] } | null = null;
  let paceGone = -1; // when it pulled off (race time), -1 while it's leading
  let lastPhase = "";
  async function buildPaceCar(): Promise<void> {
    const car = CARS.find((c) => c.id === "17-modern")!;
    const body = await loadCar(car, "white", { brightness: 0.85, maxSize: 1024 });
    const root = new THREE.Group();
    const tilt = new THREE.Group();
    root.add(tilt);
    if (body) {
      addNumber(body, car.id, "PACE", "white");
      body.rotation.y = Math.PI;
      tilt.add(body);
    }
    // the light bar across the roof: amber, red and blue
    const lights = ["#ffb000", "#ff2020", "#2060ff"].map((c, k) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.34), new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
      m.position.set(0.2, CAR_HEIGHT * 0.98, (k - 1) * 0.36);
      tilt.add(m);
      return m;
    });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 1.2), new THREE.MeshStandardMaterial({ color: "#222" }));
    bar.position.set(0.2, CAR_HEIGHT * 0.94, 0);
    tilt.add(bar);
    root.visible = false;
    scene.add(root);
    paceCar = { root, tilt, lights };
  }

  function drawPaceCar(): void {
    const s = sess!;
    if (!paceCar) return;
    const leading = s.phase === "pace" || s.phase === "caution";
    if (leading) paceGone = -1;
    else if (lastPhase === "pace" || lastPhase === "caution") paceGone = s.t;
    lastPhase = s.phase;
    const out = paceGone < 0 ? 0 : s.t - paceGone;
    if ((!leading && paceGone < 0) || out > 5 || s.qualifying) {
      paceCar.root.visible = false;
      return;
    }
    // pulling off: it speeds up and drops down to the apron, out of the way
    const at = s.paceS + out * (s.paceV + out * 5);
    const d = -Math.min(11, out * out * 3);
    const f = frame(at, d);
    paceCar.root.visible = true;
    paceCar.root.position.set(f.x, heightAt(at, Math.min(d, HALF)), f.z);
    paceCar.root.rotation.y = -Math.atan2(f.tz, f.tx);
    paceCar.tilt.rotation.set(d > -HALF - 0.5 ? -bankAt(at) : 0, 0, 0);
    // the lights take turns
    const beat = Math.floor(s.t * 6) % 3;
    paceCar.lights.forEach((m, k) => (m.visible = k === beat || (beat === 2 && k === 0)));
  }

  function drawCars(dt: number): void {
    drawPaceCar();
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
      // up on the jack in the pit box
      const jack = crews ? crews.lift(i) : { y: 0, roll: 0 };
      v.tilt.position.y = jack.y;
      v.tilt.rotation.set(-bank + clamp(v.lean, -0.06, 0.06) - jack.roll, 0, clamp(v.accel * 0.0035, -0.035, 0.02));
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
  // the rest of the radio chatter, with when each thing was last said so it never nags
  const freshChat = () => ({
    leader: -1,
    leadAt: 0,
    fastest: Infinity,
    fastAt: 0,
    alongside: 0,
    stillSaid: false,
    rubAt: 0,
    draftFor: 0,
    draftAt: 0,
    droppedAt: 0,
    trendAt: 0,
    ahead: Infinity,
    behind: Infinity,
    closeAt: 0,
    catchAt: 0,
    goGetSaid: false,
    lappedAt: 0,
    stop: 99,
    chat: [] as number[], // chatter lines still to say, shuffled
    bones: false,
    heatherAt: performance.now(),
    heatherSaid: 0,
    updates: [] as number[],
  });
  let chat = freshChat();

  function spotter(): void {
    if (!sess || sess.phase !== "green" || finishedAt) return;
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
    if ((high || low) && !chat.alongside) chat.alongside = now;
    if (chat.alongside && (high || low) && now - chat.alongside > 3500 && !chat.stillSaid) {
      chat.stillSaid = true;
      radio.say("spot-still-there");
    }
    if (high && low && !(spot.high && spot.low)) radio.say("spot-three-wide");
    else if (high && !spot.high && !low) radio.say("spot-car-high");
    else if (low && !spot.low && !high) radio.say("spot-car-low");
    if ((spot.high || spot.low) && !high && !low) spot.clearAt = now + 350;
    if (spot.clearAt && now > spot.clearAt && !high && !low) {
      // after a long fight side by side, a bit more excited
      radio.say(chat.stillSaid ? "spot-clear-go" : "spot-clear");
      spot.clearAt = 0;
      chat.alongside = 0;
      chat.stillSaid = false;
    }
    if (high || low) spot.clearAt = 0;
    spot.high = high;
    spot.low = low;
  }

  function handleEvents(): void {
    const s = sess!;
    if (s.qualifying) {
      // over the line once: the clock's running. Twice: that's the lap
      for (const e of s.events) {
        if (e.type === "lap") radio.say("crew-qual-go");
        else if (e.type === "finish") finishedAt = performance.now();
      }
      s.events.length = 0;
      return;
    }
    const name = (i: number) => s.entries[i].name;
    for (const e of s.events) {
      if (e.type === "caution") {
        radio.say("spot-caution");
        radio.say("ann-caution");
        // Heather says who it was
        radio.say(`hea-caution-${slug(name(e.car))}`);
        radio.say("crew-caution");
        cautionUntil = s.t + 3;
      } else if (e.type === "restart-soon") {
        radio.say("crew-restart-soon");
      } else if (e.type === "restart") {
        radio.say("spot-green");
        radio.say("ann-restart");
        radio.say(me("green"));
        greenAt = s.t;
        audio?.roar();
      } else if (e.type === "green") {
        radio.say(here("ann-green"));
        radio.say("spot-green");
        radio.say(me("green"));
        audio?.roar();
      } else if (e.type === "white") {
        radio.say("ann-white");
        radio.say("crew-white");
        radio.say(me("white"));
      } else if (e.type === "checkered") {
        checkeredAt = performance.now();
        const win = s.finishOrder[0];
        radio.say(here(`ann-win-${slug(name(win))}`));
        audio?.roar();
      } else if (e.type === "finish" && e.car === s.player) {
        finishedAt = performance.now();
        const p = e.pos;
        radio.say(p === 1 ? here("crew-win") : p <= 3 ? `crew-podium-${p}` : "crew-next-time");
        radio.say(me(p === 1 ? "win" : p <= 3 ? "podium" : "thanks"));
      } else if (e.type === "lap" && e.car === s.player) {
        const left = s.laps - s.crossed[s.player];
        const pos = order(s).indexOf(s.player) + 1;
        const done = s.crossed[s.player];
        if (left > 1 && (left % 5 === 0 || left === 3)) radio.say(`crew-togo-${left}`);
        if (s.laps >= 10 && done === Math.floor(s.laps / 2)) {
          radio.say(here("ann-halfway"));
          radio.say("crew-halfway");
        radio.say(me("copy"));
        }
        // a couple of laps in, the crew chief asks how it feels: worn fronts push (tight), worn rears
        // come round (loose)
        if (done === Math.min(3, s.laps - 2) && done >= 2) {
          const t = s.cars[s.player].tires;
          const tilt = (t[0].wear + t[1].wear - t[2].wear - t[3].wear) / 2;
          const feel = tilt > 0.012 ? "tight" : tilt < -0.012 ? "loose" : "good";
          radio.say("crew-how-car");
          radio.say(me(`feel-${feel}`));
          radio.say(feel === "good" ? "crew-copy-good" : "crew-copy-fix");
        }
        // fastest lap of the race so far
        const lap = s.lastLap[s.player];
        const others = Math.min(...s.bestLap.filter((_, i) => i !== s.player));
        if (done >= 2 && lap > 0 && lap === s.bestLap[s.player] && lap < others && lap < chat.fastest && performance.now() - chat.fastAt > 30000) {
          chat.fastest = lap;
          chat.fastAt = performance.now();
          radio.say(me("fast"));
          radio.say("crew-fastest");
        }
      } else if (e.type === "pit-in" && e.car === s.player) {
        radio.say("crew-pit-in");
        radio.say("spot-pit-road");
      } else if (e.type === "pit-stopped" && e.car === s.player) {
        chat.stop = e.time;
        radio.say("crew-four-tires");
      } else if (e.type === "pit-out" && e.car === s.player) {
        // a quick stop (lots of tapping) gets the crew fired up
        radio.say(chat.stop < 11 ? "crew-great-stop" : "crew-pit-out");
        radio.say(me("pit-out"));
        warned = { half: false, gone: false };
        $("hud-pit").classList.remove("on");
      } else if (e.type === "pit-in" && Math.random() < 3 / s.cars.length) {
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
      radio.say("crew-smooth");
    }
    if (mine.wear > 0.45 && !warned.half) {
      warned.half = true;
      radio.say("crew-tires-half");
      radio.say(me("copy"));
    } else if (mine.wear > 0.72 && !warned.gone && s.laps - s.crossed[s.player] > 3) {
      warned.gone = true;
      radio.say(me("tires"));
      radio.say("crew-tires-gone");
    }
    const ord = order(s);
    const pos = ord.indexOf(s.player) + 1;
    const now = performance.now();
    const racing = !autopilot(s) && s.crossed[s.player] >= 0;
    if (pos < lastPos && now - posSaidAt > 9000 && racing) {
      posSaidAt = now;
      radio.say(me(pos === 1 ? "lead" : "got-one"));
      if (pos > 1 && Math.random() < 0.4) radio.say(Math.random() < 0.5 ? "spot-clean" : "crew-nice-move");
      radio.say(pos === 1 ? "crew-lead" : `crew-pos-${pos}`);
    } else if (pos > lastPos && now - chat.droppedAt > 20000 && racing) {
      chat.droppedAt = now;
      radio.say(me("passed"));
      if (Math.random() < 0.5) radio.say("crew-passed-ok");
    }
    lastPos = pos;

    // the announcer calls every new leader (the first one at the green goes without saying)
    const leader = ord[0];
    if (leader !== chat.leader) {
      if (chat.leader >= 0 && now - chat.leadAt > 8000) radio.say(`ann-lead-${slug(name(leader))}`);
      chat.leader = leader;
      chat.leadAt = now;
    }

    // trading paint with another car
    if (mine.bump > 1.5 && now - chat.rubAt > 15000) {
      chat.rubAt = now;
      radio.say(Math.random() < 0.5 ? me("rubbing") : "crew-rubbing");
    }

    // a long tow in the draft (about two and a half seconds)
    chat.draftFor = mine.draft > 0.22 ? chat.draftFor + 1 : 0;
    if (chat.draftFor > 150 && now - chat.draftAt > 45000) {
      chat.draftAt = now;
      radio.say(me("draft"));
    }

    // Heather pops up with a race update now and then: twice a race or so, once it's settled in
    if (racing && s.crossed[s.player] >= 1 && radio.quiet() > 9000 && now - chat.heatherAt > 70000 && chat.heatherSaid < 3) {
      chat.heatherAt = now;
      chat.heatherSaid++;
      if (!chat.updates.length) chat.updates = Array.from({ length: HEATHER_UPDATE_COUNT }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
      radio.say(`hea-update-${chat.updates.pop()}`);
      return;
    }
    // your driver is a talker: after about 14 quiet seconds they say something (each line once
    // before any repeats)
    if (racing && radio.quiet() > 14000) {
      const d = slug(setup?.driver ?? "");
      // Martinsvale: once a race, the fans are throwing chicken bones on the track (Michael, 2026-10-13)
      if (TRACK.id === "martinsvale" && !chat.bones && s.crossed[s.player] >= 1) {
        chat.bones = true;
        radio.say(me("bones"));
        return;
      }
      if (!chat.chat.length) chat.chat = Array.from({ length: CHATTER_COUNT[d] ?? 0 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
      const n = chat.chat.pop();
      if (n) radio.say(me(`chat-${n}`));
    }

    // every few seconds: are we reeling in the car ahead, is the one behind reeling us in, and are
    // there lapped cars up the road
    if (now - chat.trendAt > 6000 && racing) {
      chat.trendAt = now;
      const at = progress(s, s.player);
      const ahead = pos > 1 ? progress(s, ord[pos - 2]) - at : Infinity;
      const behind = pos < ord.length ? at - progress(s, ord[pos]) : Infinity;
      if (ahead < 70 && chat.ahead - ahead > 8 && now - chat.closeAt > 40000) {
        chat.closeAt = now;
        if (pos === 2 && !chat.goGetSaid) {
          chat.goGetSaid = true;
          radio.say("crew-go-get-em");
        } else radio.say("crew-closing");
        radio.say(me("copy"));
      }
      if (behind < 40 && chat.behind - behind > 6 && now - chat.catchAt > 40000) {
        chat.catchAt = now;
        radio.say(behind < 20 ? "spot-run" : "crew-catching");
      }
      chat.ahead = ahead;
      chat.behind = behind;
      if (now - chat.lappedAt > 60000) {
        for (let i = 0; i < s.cars.length; i++) {
          if (i === s.player || s.finishOrder.includes(i)) continue;
          const g = gap(mine.s, s.cars[i].s);
          if (g > 0 && g < 90 && at - progress(s, i) > L / 2) {
            chat.lappedAt = now;
            radio.say("crew-lapped");
            radio.say(me("copy"));
            break;
          }
        }
      }
    }
  }

  // ---- the HUD ----
  const mapCanvas = $("hud-map") as HTMLCanvasElement;
  const map = mapCanvas.getContext("2d")!;
  const outline: [number, number][] = [];
  function traceOutline(): void {
    outline.length = 0;
    for (let s = 0; s < L; s += 6) {
      const f = frame(s);
      outline.push([f.x, f.z]);
    }
  }

  // ---- the dash, lit up (Michael, 2026-10-13: "light that shit up like a xmas tree") ----
  const shiftLeds = [...$("ck-shift").children] as HTMLElement[];
  const needle = (id: string, k: number) => $(id).setAttribute("transform", `rotate(${-140 + clamp(k, 0, 1) * 280})`);
  const lamp = (id: string, on: boolean, text?: string, color?: string) => {
    const el = $(id);
    el.classList.toggle("on", on);
    if (text !== undefined) el.textContent = text;
    if (color) el.dataset.c = color;
  };
  function dash(s: Session, me: CarState, pos: number, lap: number): void {
    // shift lights fill green, yellow, red, then all blue and flashing at the top of the gear
    const k = clamp((me.rpm - 4200) / 5000, 0, 1);
    const lit = Math.round(k * shiftLeds.length);
    const flash = k > 0.96 && me.gear < 4 && Math.floor(performance.now() / 90) % 2 === 0;
    shiftLeds.forEach((led, i) => {
      led.className = flash ? "blue" : i < lit ? (i < 5 ? "green" : i < 9 ? "yellow" : "red") : "";
    });
    $("ck-pos").textContent = String(pos);
    $("ck-lap").textContent = String(lap);
    // the lap timer: this lap ticking up, your best, and how this lap's last one compared
    const running = s.phase !== "pace" && s.crossed[s.player] >= 0 && !s.finishOrder.includes(s.player);
    $("ck-laptime").textContent = running ? clock(s.t - s.lapStart[s.player]) : clock(s.lastLap[s.player] || 0);
    const best = s.bestLap[s.player];
    $("ck-best").textContent = isFinite(best) ? clock(best) : "--.--";
    const last = s.lastLap[s.player];
    const delta = $("ck-delta");
    if (last > 0 && isFinite(best) && s.crossed[s.player] >= 2) {
      const d = last - best;
      delta.textContent = d <= 0.0005 ? "PB!" : `+${d.toFixed(2)}`;
      delta.className = d <= 0.0005 ? "pb" : "slow";
    } else delta.textContent = "";
    // the gauges: water follows the tires' heat, oil the revs, fuel goes down through a run and fills at a stop
    needle("ck-water", (me.temp - 0.5) / 0.8);
    needle("ck-oil", 0.25 + (me.rpm / 9600) * 0.7);
    const since = Math.max(0, s.crossed[s.player] - (pitLapOf(s) ?? 0));
    needle("ck-fuel", 1 - Math.min(0.9, since / 40));
    // the warning lights
    lamp("ck-l-draft", me.draft > 0.15);
    lamp("ck-l-tires", me.wear > 0.55);
    lamp("ck-l-pit", me.limiter);
    lamp("ck-l-hot", me.temp > 1.12);
    lamp("ck-l-caution", s.phase === "caution" || s.phase === "pace");
    const flag = s.phase === "checkered" ? ["CHECKER", "white"] : whiteFlag() ? ["WHITE", "white"] : s.phase === "green" ? ["GREEN", "green"] : ["GREEN", "green"];
    lamp("ck-l-flag", s.phase === "green" || s.phase === "checkered", flag[0], flag[1]);
  }
  /** a lap time on the dash: 0:23.4 */
  const clock = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
  // the lap of your last pit stop (the fuel gauge fills there)
  let pitLap = 0;
  const pitLapOf = (s: Session) => (s.drivers[s.player].pitPhase === "stopped" ? (pitLap = Math.max(0, s.crossed[s.player])) : pitLap);

  function hud(): void {
    const s = sess!;
    const me = s.cars[s.player];
    const ord = order(s);
    const pos = ord.indexOf(s.player) + 1;
    $("hud-pos").textContent = String(pos);
    $("hud-of").textContent = `/${s.cars.length}`;
    const lap = clamp(s.crossed[s.player] + 1, 1, s.laps);
    $("hud-lap").textContent = s.qualifying
      ? s.finishOrder.length
        ? "QUALIFIED"
        : s.crossed[s.player] < 0
          ? "WARM-UP LAP"
          : "QUALIFYING LAP"
      : s.phase === "pace"
        ? "PACE LAP"
        : s.phase === "caution"
          ? `CAUTION · LAP ${lap}/${s.laps}`
        : `LAP ${lap}/${s.laps}`;
    $("hud-last").textContent = fmt(s.lastLap[s.player]);
    $("hud-best").textContent = fmt(s.bestLap[s.player]);
    $("hud-speed").textContent = String(Math.round(mph(me)));
    $("hud-gear").textContent = String(me.gear);
    $("ck-speed").textContent = String(Math.round(mph(me)));
    $("ck-gear").textContent = String(me.gear);
    dash(s, me, pos, lap);
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
    const label = s.phase === "pace" ? "" : s.t < cautionUntil ? "CAUTION" : s.phase === "caution" ? "" : s.phase === "checkered" ? "CHECKERED" : whiteFlag() ? "WHITE FLAG" : s.t < greenUntil() ? "GREEN" : "";
    flag.textContent = label;
    flag.dataset.flag = label.split(" ")[0].toLowerCase();

    // the running order
    const leaderP = progress(s, ord[0]);
    const mine = ord.indexOf(s.player);
    const shown = ord.length <= 10 ? ord : ord.filter((_, k) => k < 5 || Math.abs(k - Math.max(mine, 6)) <= 1);
    $("hud-board").innerHTML = shown
      .map((i) => {
        const k = ord.indexOf(i);
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
    const k = Math.min((W - 16) / (BOUNDS.maxX - BOUNDS.minX + 20), (H - 16) / (BOUNDS.maxZ - BOUNDS.minZ + 20));
    const px = (x: number) => W / 2 + (x - (BOUNDS.minX + BOUNDS.maxX) / 2) * k;
    const pz = (z: number) => H / 2 + (z - (BOUNDS.minZ + BOUNDS.maxZ) / 2) * k;
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
  let cautionUntil = 0;
  const greenUntil = () => {
    if (!greenAt && sess && sess.phase === "green") greenAt = sess.t;
    return greenAt + 4;
  };

  // ---- qualifying's done: everyone's time, and where you start ----
  function qualified(): void {
    const s = sess!;
    const mine = s.lastLap[s.player] || 999;
    // the rivals each run their quick lap (no screen; well under a second)
    const times = fieldOf(TRACK.field).map((r) => ({
      name: r.name,
      number: r.number,
      time: qualifyingLap({ name: r.name, number: r.number, carId: r.carId, paintId: r.paint, spec: STOCK, skill: r.skill, aggression: r.aggression }),
      me: false,
    }));
    times.push({ name: s.entries[s.player].name, number: s.entries[s.player].number, time: mine, me: true });
    times.sort((a, b) => a.time - b.time);
    const pos = times.findIndex((t) => t.me) + 1;
    if (setup) setup = { ...setup, grid: times.map((t) => t.name) };
    radio.clear();
    if (pos === 1) radio.say("ann-pole");
    radio.say(pos === 1 ? "crew-qual-pole" : pos <= 10 ? "crew-qual-top" : pos <= times.length * 0.6 ? "crew-qual-mid" : "crew-qual-back");
    $("rr-title").textContent = pos === 1 ? "POLE POSITION" : "QUALIFYING";
    $("rr-pos").textContent = `P${pos}`;
    $("rr-cash").textContent = mine < 999 ? `${mine.toFixed(3)}s` : "no time";
    $("rr-table").innerHTML = times
      .map((t, k) => `<li class="${t.me ? "me" : ""}"><b>${k + 1}</b><i>#${t.number}</i><span>${t.name}</span><small>${t.time < 999 ? t.time.toFixed(3) : "--"}</small></li>`)
      .join("");
    $("rr-again").textContent = "GO RACING ▶";
    $("race-results").classList.add("on");
    // the sheet opens with you in view
    $("rr-table").querySelector(".me")?.scrollIntoView({ block: "center" });
  }

  // ---- the interview: Heather and your driver, before the results (Michael, 2026-10-13) ----
  let interviewDone = false;
  let interviewing = false;
  let interviewClip: HTMLAudioElement | null = null;
  function interview(): void {
    if (interviewing) return;
    interviewing = true;
    const s = sess!;
    const pos = order(s).indexOf(s.player) + 1;
    const how = pos === 1 ? "win" : pos <= 3 ? "podium" : pos <= Math.ceil(s.cars.length / 2) ? "mid" : "back";
    const d = DRIVERS.find((x) => slug(x.name) === slug(setup?.driver ?? ""));
    const meImg = $("iv-driver") as HTMLImageElement;
    if (d) void suitUrl(d, savedSuit(d)).then((url) => (meImg.src = url));
    $("iv-who").textContent = (setup?.driver ?? "").toUpperCase();
    radio.clear();
    $("race-interview").classList.add("on");
    const steps = [`hea-q-${how}`, me(`int-${how}`), `hea-wrap-${1 + Math.floor(Math.random() * HEATHER_WRAP_COUNT)}`];
    const done = () => {
      if (!interviewing) return;
      interviewing = false;
      interviewDone = true;
      interviewClip?.pause();
      duckMusic(false);
      $("race-interview").classList.remove("on");
      results();
    };
    const play = (k: number) => {
      if (!interviewing) return;
      if (k >= steps.length) return void setTimeout(done, 900);
      const line = LINES[steps[k]];
      if (!line) return play(k + 1);
      const heather = line.who === "reporter";
      $("race-interview").dataset.talking = heather ? "heather" : "driver";
      $("iv-label").textContent = heather ? "HEATHER · TRACKSIDE" : (setup?.driver ?? "").toUpperCase();
      $("iv-text").textContent = line.text;
      duckMusic(true);
      interviewClip = new Audio(`${import.meta.env.BASE_URL}audio/radio/${steps[k]}.mp3`);
      const next = () => setTimeout(() => play(k + 1), 350);
      interviewClip.onended = next;
      interviewClip.onerror = () => setTimeout(() => play(k + 1), 2500 + line.text.length * 45);
      void interviewClip.play().catch(() => setTimeout(() => play(k + 1), 2500 + line.text.length * 45));
    };
    $("iv-skip").onclick = done;
    play(0);
  }

  // ---- the end ----
  function results(): void {
    const s = sess!;
    // race again means qualify again
    $("rr-again").textContent = "RACE AGAIN ▶";
    if (setup) setup = { ...setup, grid: undefined };
    const ord = order(s);
    const pos = ord.indexOf(s.player) + 1;
    const scale = 0.4 + (s.laps / 15) * 0.6;
    const payout = Math.round((PURSE[pos - 1] ?? 30) * scale) + s.led[s.player] * LED_BONUS;
    earnChips(payout);
    $("rr-title").textContent = pos === 1 ? "VICTORY LANE" : pos <= 3 ? "PODIUM" : "CHECKERED FLAG";
    $("rr-pos").textContent = `P${pos}`;
    $("rr-cash").innerHTML = chipAmount(payout, "+");
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
    /** pause the race (the phone app going to the background) */
    pause: () => setPaused(true),
    /** the phone's back button in a race: pause it, or resume a paused one */
    togglePause: () => setPaused(!paused),
  };
}

export type { CarState };
