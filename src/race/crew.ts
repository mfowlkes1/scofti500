// The pit crews: six to a box in firesuits in their team's colors, helmets and visors on, waiting
// behind pit road's far wall at the cart. When their car comes down pit road they climb up on the
// wall, and as it rolls into the box they're over: the jack man runs the floor jack in under the
// right side and pumps it up, two tire changers drop to a knee at the wheels with the air guns, two
// carriers bring the new tires, and the gas man holds the can in the left rear. Halfway through the
// stop they all run round to the left side, and when the car leaves they carry the old tires back
// over the wall. Everything runs off the stop itself (how far along it is), so a fast thumb on the
// air gun makes your crew move faster.
//
// Each person is a little skeleton (hips, chest, head, arms and legs that bend at the knees and
// elbows) posed in code every frame. Nothing's drawn per person: every body part and prop is one
// instanced mesh for all 48 of them, so the crews cost about fifteen draw calls.
import * as THREE from "three";
import { PAINTS } from "../paint";
import type { Session } from "./session";
import { PIT, frame, gap } from "./track";

export type PitCrews = {
  /** a new race: whose crew is in which box */
  setup(sess: Session): void;
  update(sess: Session, dt: number): void;
  /** how far the jack has the car up: y lift and roll (+ is the right side up) */
  lift(car: number): { y: number; roll: number };
};

type Job = "jack" | "front" | "rear" | "frontTire" | "rearTire" | "gas";
const JOBS: Job[] = ["jack", "front", "rear", "frontTire", "rearTire", "gas"];

/** the joints of one person; local +x is the way they face, +y up */
type Rig = {
  root: THREE.Object3D;
  hips: THREE.Object3D;
  torso: THREE.Object3D;
  head: THREE.Object3D;
  shoulder: [THREE.Object3D, THREE.Object3D];
  elbow: [THREE.Object3D, THREE.Object3D];
  hand: [THREE.Object3D, THREE.Object3D];
  hip: [THREE.Object3D, THREE.Object3D];
  knee: [THREE.Object3D, THREE.Object3D];
  foot: [THREE.Object3D, THREE.Object3D];
  /** what they carry: a tire, the gas can, the jack, an air gun */
  prop: THREE.Object3D | null;
};

type Member = {
  job: Job;
  rig: Rig;
  /** where they are, in box coordinates: x along pit road from the box's middle, z across (+ toward the track) */
  x: number;
  z: number;
  home: { x: number; z: number };
  /** how far through their running stride (radians) */
  stride: number;
  /** eases them into and out of the work pose */
  work: number;
  face: number;
};

type Crew = { members: Member[]; lift: number; side: number };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const RUN = 6.5; // m/s
const WALL_Z = PIT.inner - 0.4 - PIT.box; // the far wall's line, in box coordinates (about -2)
const WALL_H = 1.0;
const HALF_W = 1.0; // half the car's width
const AXLE = 1.45; // the wheels, fore and aft of the car's middle
const LIME = "#b6ff00";
const HIP_Y = 0.96;

/** a rival team's firesuit color, from its car's paint */
function teamColor(paintId: string): string {
  const p = PAINTS.find((q) => q.id === paintId);
  if (!p || p.id === "stock") return "#141414";
  if (p.swatch.startsWith("#")) return p.swatch;
  return p.swatch.match(/#[0-9a-f]{3,6}\s*$/i)?.[0].trim() ?? "#4b5530";
}

/** where each job works on one side of the car (side +1 right, -1 left) */
function workSpot(job: Job, side: number): { x: number; z: number } {
  const z = side * (HALF_W + 0.5);
  switch (job) {
    case "jack":
      // pit road's narrow on the wall side, so he stands in closer there
      return { x: 0.1, z: side > 0 ? HALF_W + 0.9 : -(HALF_W + 0.5) };
    case "front":
      return { x: AXLE, z };
    case "rear":
      return { x: -AXLE, z };
    case "frontTire":
      return { x: AXLE + 0.95, z: side * (HALF_W + 0.5) };
    case "rearTire":
      return { x: -AXLE - 0.95, z: side * (HALF_W + 0.5) };
    case "gas":
      // the fuel's in the left rear, so the gas man stays on that side the whole stop
      return { x: -AXLE + 0.45, z: -(HALF_W + 0.5) };
  }
}

// ---- the parts: each one a geometry hanging off a joint, drawn instanced for everybody ----
type PartName = "pelvis" | "chest" | "stripe" | "helmet" | "visor" | "upperArm" | "forearm" | "glove" | "thigh" | "shin" | "shoe" | "tire" | "rim" | "can" | "jack" | "handle" | "gun";
/** what color a part takes: the team's suit, the helmet, or its own fixed color */
type Tint = "suit" | "helmet" | "fixed";

function capsule(r: number, len: number): THREE.BufferGeometry {
  // a limb hanging down from its joint, len long
  return new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 4, 10).translate(0, -len / 2, 0);
}

/** a crew for each of count boxes, added to scene (the track's, so they go with it) */
export function buildCrews(scene: THREE.Object3D, count: number): PitCrews {
  const std = (color: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });
  const PARTS: Record<PartName, { geo: THREE.BufferGeometry; mat: THREE.Material; tint: Tint; color?: string; shadow?: boolean }> = {
    pelvis: { geo: new THREE.SphereGeometry(1, 12, 8).scale(0.15, 0.13, 0.19), mat: std("#fff"), tint: "suit", shadow: true },
    chest: { geo: new THREE.CapsuleGeometry(0.16, 0.26, 4, 12).scale(0.85, 1, 1.28).translate(0, 0.3, 0), mat: std("#fff"), tint: "suit", shadow: true },
    // the reflective stripe round the suit's middle
    stripe: { geo: new THREE.CylinderGeometry(0.152, 0.152, 0.05, 14).scale(0.85, 1, 1.28).translate(0, 0.17, 0), mat: std("#fff", { roughness: 0.35, metalness: 0.3 }), tint: "fixed", color: "#e8e8e8" },
    helmet: { geo: new THREE.SphereGeometry(0.13, 14, 10).scale(1.08, 1, 0.96), mat: std("#fff", { roughness: 0.25 }), tint: "helmet", shadow: true },
    // the visor wraps the front of the helmet (three's sphere faces -x at phi 0, so start round the back)
    visor: { geo: new THREE.SphereGeometry(0.136, 14, 6, Math.PI - 0.95, 1.9, 1.15, 0.6).scale(1.08, 1, 0.96), mat: std("#0d0f14", { roughness: 0.1, metalness: 0.6 }), tint: "fixed", color: "#ffffff" },
    upperArm: { geo: capsule(0.058, 0.3), mat: std("#fff"), tint: "suit", shadow: true },
    forearm: { geo: capsule(0.05, 0.28), mat: std("#fff"), tint: "suit", shadow: true },
    glove: { geo: new THREE.SphereGeometry(0.055, 8, 6).scale(1, 1.2, 0.8), mat: std("#151515"), tint: "fixed", color: "#ffffff" },
    thigh: { geo: capsule(0.085, 0.44), mat: std("#fff"), tint: "suit", shadow: true },
    shin: { geo: capsule(0.066, 0.44), mat: std("#fff"), tint: "suit", shadow: true },
    shoe: { geo: new THREE.BoxGeometry(0.26, 0.08, 0.11).translate(0.05, -0.04, 0), mat: std("#121212", { roughness: 0.5 }), tint: "fixed", color: "#ffffff" },
    // tires: axle along local x, so a carrier holds one flat against the chest
    tire: { geo: new THREE.TorusGeometry(0.25, 0.1, 8, 20).scale(1, 1, 2.2).rotateY(Math.PI / 2), mat: std("#141414", { roughness: 0.8 }), tint: "fixed", color: "#ffffff", shadow: true },
    rim: { geo: new THREE.CylinderGeometry(0.2, 0.2, 0.2, 14).rotateZ(Math.PI / 2), mat: std("#d7d9de", { roughness: 0.3, metalness: 0.7 }), tint: "fixed", color: "#ffffff" },
    can: { geo: new THREE.CylinderGeometry(0.15, 0.15, 0.62, 12).translate(0, 0.1, 0), mat: std("#c41e1e", { roughness: 0.35, metalness: 0.4 }), tint: "fixed", color: "#ffffff", shadow: true },
    // the floor jack: a low body that slides under the car and a long handle back to the jack man
    jack: { geo: new THREE.BoxGeometry(0.7, 0.16, 0.28).translate(0.35, 0.08, 0), mat: std("#d01f1f", { roughness: 0.4, metalness: 0.5 }), tint: "fixed", color: "#ffffff", shadow: true },
    handle: { geo: new THREE.CylinderGeometry(0.025, 0.025, 1.15, 6).translate(0, 0.575, 0), mat: std("#9a9ca2", { metalness: 0.8, roughness: 0.3 }), tint: "fixed", color: "#ffffff" },
    // the air gun: a barrel pointing out of the fist
    gun: { geo: new THREE.BoxGeometry(0.26, 0.08, 0.08).translate(0.12, -0.02, 0), mat: std("#2a2c31", { metalness: 0.6, roughness: 0.35 }), tint: "fixed", color: "#ffffff" },
  };

  /** every part to draw: which joint carries it, and whose crew it belongs to */
  const slots: Record<PartName, { obj: THREE.Object3D; crew: number }[]> = Object.fromEntries(Object.keys(PARTS).map((k) => [k, []])) as never;
  const attach = (name: PartName, parent: THREE.Object3D, crew: number, pos?: [number, number, number], rot?: [number, number, number]) => {
    const o = new THREE.Object3D();
    if (pos) o.position.set(...pos);
    if (rot) o.rotation.set(...rot);
    parent.add(o);
    slots[name].push({ obj: o, crew });
    return o;
  };
  const joint = (parent: THREE.Object3D, x: number, y: number, z: number) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };

  // the skeletons live outside the scene: only the instanced parts are drawn
  const skeletons = new THREE.Object3D();
  function person(crew: number, job: Job): Rig {
    const root = joint(skeletons, 0, 0, 0);
    const hips = joint(root, 0, HIP_Y, 0);
    attach("pelvis", hips, crew);
    const torso = joint(hips, 0, 0.02, 0);
    attach("chest", torso, crew);
    attach("stripe", torso, crew);
    const head = joint(torso, 0.02, 0.73, 0);
    attach("helmet", head, crew);
    attach("visor", head, crew);
    const sides = [-1, 1] as const;
    const shoulder = sides.map((s) => joint(torso, 0, 0.53, s * 0.23)) as [THREE.Object3D, THREE.Object3D];
    const elbow = shoulder.map((sh) => {
      attach("upperArm", sh, crew);
      return joint(sh, 0, -0.3, 0);
    }) as [THREE.Object3D, THREE.Object3D];
    const hand = elbow.map((el) => {
      attach("forearm", el, crew);
      const h = joint(el, 0, -0.29, 0);
      attach("glove", h, crew);
      return h;
    }) as [THREE.Object3D, THREE.Object3D];
    const hip = sides.map((s) => joint(hips, 0, -0.03, s * 0.1)) as [THREE.Object3D, THREE.Object3D];
    const knee = hip.map((h) => {
      attach("thigh", h, crew);
      return joint(h, 0, -0.44, 0);
    }) as [THREE.Object3D, THREE.Object3D];
    const foot = knee.map((k) => {
      attach("shin", k, crew);
      const f = joint(k, 0, -0.45, 0);
      attach("shoe", f, crew);
      return f;
    }) as [THREE.Object3D, THREE.Object3D];

    let prop: THREE.Object3D | null = null;
    if (job === "frontTire" || job === "rearTire") {
      prop = joint(torso, 0.36, 0.12, 0);
      attach("tire", prop, crew);
      attach("rim", prop, crew);
    } else if (job === "gas") {
      prop = joint(torso, 0.3, 0.2, 0.05);
      attach("can", prop, crew);
    } else if (job === "jack") {
      // the jack sits off the root so it can rest on the ground while he works it
      prop = joint(root, 0.3, 0, 0.25);
      attach("jack", prop, crew);
      attach("handle", prop, crew, [0, 0.12, 0], [0, 0, 0.6]);
    } else {
      prop = attach("gun", hand[1], crew, [0, -0.04, 0]);
    }
    return { root, hips, torso, head, shoulder, elbow, hand, hip, knee, foot, prop };
  }

  const crews: Crew[] = [];
  for (let b = 0; b < count; b++) {
    const members = JOBS.map((job, k): Member => {
      // behind the wall, either side of the cart
      const home = { x: -3.2 + k * 1.28 + (k >= 3 ? 0.5 : 0), z: WALL_Z - 2.4 - (k % 2) * 0.6 };
      return { job, rig: person(b, job), x: home.x, z: home.z, home, stride: k, work: 0, face: Math.PI / 2 };
    });
    crews.push({ members, lift: 0, side: 1 });
  }

  // one instanced mesh per part
  const suitColor = crews.map(() => new THREE.Color("#888"));
  const helmetColor = crews.map(() => new THREE.Color("#f2f2f2"));
  const meshes = (Object.keys(PARTS) as PartName[]).map((name) => {
    const p = PARTS[name];
    const list = slots[name];
    const m = new THREE.InstancedMesh(p.geo, p.mat, list.length);
    m.castShadow = !!p.shadow;
    m.frustumCulled = false;
    if (p.tint === "fixed") for (let i = 0; i < list.length; i++) m.setColorAt(i, new THREE.Color(p.color ?? "#fff"));
    scene.add(m);
    return { name, mesh: m, list, tint: p.tint };
  });
  const paint = () => {
    for (const { mesh, list, tint } of meshes) {
      if (tint === "fixed") continue;
      list.forEach((sl, i) => mesh.setColorAt(i, tint === "suit" ? suitColor[sl.crew] : helmetColor[sl.crew]));
      mesh.instanceColor!.needsUpdate = true;
    }
  };
  paint();

  // which crew services which car
  let crewOf: number[] = [];

  /** pose one person: running (stride), standing, or at their job (work 0..1) */
  function pose(m: Member, moving: boolean, speed: number, working: boolean, t: number): void {
    const r = m.rig;
    const run = moving ? clamp(speed / RUN, 0, 1) : 0;
    const ph = m.stride;
    const sw = Math.sin(ph);
    // standing / running base
    r.hips.position.y = HIP_Y - run * 0.05 + run * Math.abs(Math.cos(ph)) * 0.06;
    r.hips.rotation.set(0, 0, 0);
    r.torso.rotation.set(0, sw * 0.12 * run, -0.22 * run + Math.sin(t * 1.7 + m.home.x) * 0.01);
    r.head.rotation.set(0, 0, 0.18 * run);
    for (let s = 0; s < 2; s++) {
      const dir = s === 0 ? 1 : -1;
      // legs: thighs swing opposite, the knee folds as the leg comes through
      r.hip[s].rotation.set(0, 0, dir * sw * 0.75 * run);
      r.knee[s].rotation.set(0, 0, -Math.max(0, Math.sin(ph * 1 + (s === 0 ? -1.2 : Math.PI - 1.2))) * 1.4 * run - 0.04);
      r.foot[s].rotation.set(0, 0, 0);
      // arms swing against the legs, elbows bent when running
      r.shoulder[s].rotation.set(dir * -0.08, 0, -dir * sw * 0.6 * run);
      r.elbow[s].rotation.set(0, 0, 0.15 + run * 1.1);
    }

    const k = m.work;
    const carrying = m.job === "frontTire" || m.job === "rearTire";
    if (carrying) {
      // both hands on the tire out in front, the whole time
      for (let s = 0; s < 2; s++) {
        r.shoulder[s].rotation.set(s === 0 ? 0.25 : -0.25, 0, 0.75);
        r.elbow[s].rotation.set(0, 0, 0.75);
      }
      r.prop!.position.set(0.34, 0.12 - k * 0.1, 0);
    }
    if (m.job === "gas") {
      // the can on the shoulder running, tipped into the car's fuel port working
      const up = k;
      for (let s = 0; s < 2; s++) {
        r.shoulder[s].rotation.set(s === 0 ? 0.2 : -0.2, 0, 0.6 + up * 0.7);
        r.elbow[s].rotation.set(0, 0, 1.0 - up * 0.3);
      }
      r.prop!.position.set(0.32 + up * 0.12, 0.22 + up * 0.18, 0);
      r.prop!.rotation.set(0, 0, -up * 1.05);
    }
    if (m.job === "jack") {
      // carrying it by the handle at his side, or bent over working it, the jack under the car
      const pump = working ? Math.max(0, Math.sin(t * 7)) : 0;
      // the jack's nose goes 0.3 m in under the car's side
      const reach = Math.max(0.1, Math.abs(m.z) - HALF_W - 0.4);
      r.prop!.position.set(0.32 + k * (reach - 0.32), (1 - k) * 0.28, (1 - k) * 0.28);
      r.prop!.rotation.set((1 - k) * 0.3, 0, (1 - k) * -0.25);
      r.torso.rotation.z += -k * (0.55 + pump * 0.15);
      r.hips.position.y -= k * 0.12;
      for (let s = 0; s < 2; s++) {
        r.hip[s].rotation.z = r.hip[s].rotation.z * (1 - k) + k * (s === 0 ? 0.45 : -0.2);
        r.knee[s].rotation.z = r.knee[s].rotation.z * (1 - k) + k * (s === 0 ? -0.55 : -0.2);
        r.shoulder[s].rotation.z = r.shoulder[s].rotation.z * (1 - k) + k * (0.9 + pump * 0.2);
        r.elbow[s].rotation.z = r.elbow[s].rotation.z * (1 - k) + k * 0.2;
      }
    }
    if ((m.job === "front" || m.job === "rear") && k > 0) {
      // down on one knee at the wheel, air gun on the lug nuts, rattling
      const buzz = working ? Math.sin(t * 60 + m.home.x) * 0.02 : 0;
      r.hips.position.y = r.hips.position.y * (1 - k) + k * 0.5;
      r.torso.rotation.z = r.torso.rotation.z * (1 - k) + k * -0.42;
      r.head.rotation.z = -k * 0.15;
      // front leg: foot planted, shin upright; back leg: knee on the ground, shin flat behind
      r.hip[1].rotation.z = r.hip[1].rotation.z * (1 - k) + k * 1.45;
      r.knee[1].rotation.z = r.knee[1].rotation.z * (1 - k) + k * -1.5;
      r.hip[0].rotation.z = r.hip[0].rotation.z * (1 - k) + k * -0.05;
      r.knee[0].rotation.z = r.knee[0].rotation.z * (1 - k) + k * -1.62;
      r.foot[0].rotation.z = k * 0.6;
      r.shoulder[1].rotation.set(-0.1 * k, 0, r.shoulder[1].rotation.z * (1 - k) + k * (1.35 + buzz));
      r.elbow[1].rotation.z = r.elbow[1].rotation.z * (1 - k) + k * 0.25;
      r.shoulder[0].rotation.set(0.3 * k, 0, r.shoulder[0].rotation.z * (1 - k) + k * 0.9);
      r.elbow[0].rotation.z = r.elbow[0].rotation.z * (1 - k) + k * 0.6;
    }
  }

  return {
    setup(sess) {
      crewOf = sess.drivers.map((d) => d.box);
      sess.drivers.forEach((d, i) => {
        const crew = crews[d.box];
        if (!crew) return;
        // yours is the SCOFTI crew whatever the paint: black suits, lime helmets
        suitColor[d.box].set(sess.entries[i].player ? "#161616" : teamColor(sess.entries[i].paintId));
        helmetColor[d.box].set(sess.entries[i].player ? LIME : "#f2f2f2");
        for (const m of crew.members) {
          m.x = m.home.x;
          m.z = m.home.z;
          m.work = 0;
        }
        crew.lift = 0;
      });
      paint();
    },

    update(sess, dt) {
      const t = performance.now() / 1000;
      sess.drivers.forEach((drv, i) => {
        const crew = crews[crewOf[i]];
        if (!crew) return;
        const car = sess.cars[i];
        const stall = PIT.stall(drv.box);
        const toBox = gap(car.s, stall);
        // where the car sits in the box, so the crew lines up on it
        const carX = drv.pitPhase === "stopped" ? clamp(-toBox, -1, 1) : 0;
        // the stop: up on the wall as the car comes down pit road, over and working once it's stopped
        let state: "home" | "ready" | "work" = "home";
        let done = 0;
        if (drv.pitPhase === "stopped") {
          state = "work";
          done = 1 - Math.max(0, drv.service) / drv.serviceTotal;
        } else if (drv.pitPhase === "in" && toBox > 0 && toBox < 110) state = "ready";
        const side = done < 0.5 ? 1 : -1;
        // the jack goes up once the jack man's working it, drops at the halfway swap and at the end
        const jack = crew.members[0];
        const sideDone = side > 0 ? done / 0.5 : (done - 0.5) / 0.5;
        const up = state === "work" && jack.work > 0.8 && sideDone < 0.94 ? 1 : 0;
        if (crew.side !== side) crew.lift = 0;
        crew.side = side;
        crew.lift += (up - crew.lift) * Math.min(1, dt * 10);

        for (const m of crew.members) {
          let tx = m.home.x;
          let tz = m.home.z;
          if (state === "ready") {
            tx = m.home.x * 0.9;
            tz = WALL_Z;
          } else if (state === "work") {
            const w = workSpot(m.job, side);
            tx = carX + w.x;
            tz = w.z;
          }
          const final = { x: tx, z: tz };
          // the far wall is in the way: up onto it at the same x first, then over
          const across = (m.z < WALL_Z - 0.05 && tz > WALL_Z + 0.05) || (m.z > WALL_Z + 0.05 && tz < WALL_Z - 0.05);
          if (across) {
            tx = m.x;
            tz = WALL_Z;
          } else if (state === "work" && m.z > WALL_Z && Math.sign(tz) !== Math.sign(m.z) && Math.abs(m.z) > 0.6) {
            // round the front or back of the car, not through it
            const end = m.x >= carX ? carX + AXLE + 2.2 : carX - AXLE - 2.2;
            if (Math.abs(m.x - end) > 0.3) tz = m.z;
            tx = end;
          }
          const dx = tx - m.x;
          const dz = tz - m.z;
          const dist = Math.hypot(dx, dz);
          const stepLen = Math.min(dist, RUN * dt);
          if (dist > 1e-4) {
            m.x += (dx / dist) * stepLen;
            m.z += (dz / dist) * stepLen;
          }
          const moving = dist > 0.05;
          const there = Math.hypot(final.x - m.x, final.z - m.z) < 0.08;
          const working = state === "work" && there;
          m.work += ((working ? 1 : 0) - m.work) * Math.min(1, dt * 9);
          m.stride += stepLen * 2.6;

          // into the world: pit road runs along the front straight, so box coordinates map straight across
          const f = frame(stall + m.x, PIT.box + m.z);
          const wallD = Math.abs(m.z - WALL_Z);
          const onWall = wallD < 0.22 ? WALL_H : wallD < 0.45 ? WALL_H * (1 - (wallD - 0.22) / 0.23) : 0;
          // face where they're running; square to the car while they work on it; else toward pit road
          const want = moving ? Math.atan2(dz, dx) : state === "work" ? Math.atan2(-Math.sign(m.z), 0) : Math.PI / 2;
          m.face += Math.atan2(Math.sin(want - m.face), Math.cos(want - m.face)) * Math.min(1, dt * 14);
          m.rig.root.position.set(f.x, onWall, f.z);
          m.rig.root.rotation.y = -m.face;
          pose(m, moving, stepLen / Math.max(dt, 1e-4), working, t);
        }
      });

      // the skeletons into the instanced parts
      skeletons.updateMatrixWorld(true);
      for (const { mesh, list } of meshes) {
        list.forEach((sl, i) => mesh.setMatrixAt(i, sl.obj.matrixWorld));
        mesh.instanceMatrix.needsUpdate = true;
      }
    },

    lift(i) {
      const crew = crews[crewOf[i]];
      if (!crew) return { y: 0, roll: 0 };
      return { y: crew.lift * 0.08, roll: crew.lift * 0.08 * crew.side };
    },
  };
}
