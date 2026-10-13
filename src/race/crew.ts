// The pit crews: six to a box, in their team's colors, waiting behind pit road's far wall at the
// cart. When their car comes down pit road they climb up on the wall, and as it rolls into the box
// they're over: the jack man lifts the right side, two tire changers drop to the wheels, two
// carriers bring the new tires, and the gas man hangs the can in the left rear. Halfway through the
// stop they all run round to the left side, and when the car leaves they carry the old tires back
// over the wall. Everything runs off the stop itself (how far along it is), so a fast thumb on the
// air gun makes your crew move faster.
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

type Member = {
  job: Job;
  g: THREE.Group;
  legs: THREE.Mesh;
  upper: THREE.Group;
  /** what they carry: a tire or the gas can */
  prop: THREE.Object3D | null;
  /** where they are, in box coordinates: x along pit road from the box's middle, z across (+ toward the track) */
  x: number;
  z: number;
  home: { x: number; z: number };
  kneel: number;
};

type Crew = { members: Member[]; shirt: THREE.MeshStandardMaterial; helmet: THREE.MeshStandardMaterial; lift: number; side: number };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const RUN = 6.5; // m/s
const WALL_Z = PIT.inner - 0.4 - PIT.box; // the far wall's line, in box coordinates (about -2)
const WALL_H = 1.0;
const HALF_W = 1.0; // half the car's width
const AXLE = 1.45; // the wheels, fore and aft of the car's middle
const LIME = "#b6ff00";

/** a rival team's shirt color, from its car's paint */
function teamColor(paintId: string): string {
  const p = PAINTS.find((q) => q.id === paintId);
  if (!p || p.id === "stock") return "#141414";
  if (p.swatch.startsWith("#")) return p.swatch;
  return p.swatch.match(/#[0-9a-f]{3,6}\s*$/i)?.[0].trim() ?? "#4b5530";
}

/** where each job works on one side of the car (side +1 right, -1 left) */
function workSpot(job: Job, side: number): { x: number; z: number; kneel: number } {
  const z = side * (HALF_W + 0.45);
  switch (job) {
    case "jack":
      return { x: 0.1, z: side * (HALF_W + 0.6), kneel: 0.3 };
    case "front":
      return { x: AXLE, z, kneel: 1 };
    case "rear":
      return { x: -AXLE, z, kneel: 1 };
    case "frontTire":
      return { x: AXLE + 0.9, z: side * (HALF_W + 0.7), kneel: 0 };
    case "rearTire":
      return { x: -AXLE - 0.9, z: side * (HALF_W + 0.7), kneel: 0 };
    case "gas":
      // the fuel's in the left rear, so the gas man stays on that side the whole stop
      return { x: -AXLE + 0.4, z: -(HALF_W + 0.5), kneel: 0 };
  }
}

export function buildCrews(scene: THREE.Scene): PitCrews {
  const root = new THREE.Group();
  scene.add(root);
  const legGeo = new THREE.BoxGeometry(0.3, 0.8, 0.22).translate(0, 0.4, 0);
  const torsoGeo = new THREE.CylinderGeometry(0.18, 0.21, 0.62, 8).translate(0, 1.11, 0);
  const headGeo = new THREE.SphereGeometry(0.15, 10, 8).translate(0, 1.55, 0);
  const pants = new THREE.MeshStandardMaterial({ color: "#1d1e22", roughness: 0.85 });
  const rubber = new THREE.MeshStandardMaterial({ color: "#121212", roughness: 0.75 });
  const rim = new THREE.MeshStandardMaterial({ color: "#c9ccd2", roughness: 0.35, metalness: 0.6 });
  const canMat = new THREE.MeshStandardMaterial({ color: "#c41e1e", roughness: 0.4, metalness: 0.4 });
  const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 16).rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.29, 10).rotateX(Math.PI / 2);
  const canGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.7, 10);

  const tire = () => {
    const t = new THREE.Group();
    t.add(new THREE.Mesh(tireGeo, rubber), new THREE.Mesh(rimGeo, rim));
    t.position.set(0.32, 0.95, 0);
    return t;
  };
  const can = () => {
    const c = new THREE.Mesh(canGeo, canMat);
    c.position.set(0.3, 1.25, 0);
    return c;
  };

  const crews: Crew[] = [];
  for (let b = 0; b < 8; b++) {
    const shirt = new THREE.MeshStandardMaterial({ color: "#888", roughness: 0.7 });
    const helmet = new THREE.MeshStandardMaterial({ color: "#f2f2f2", roughness: 0.3 });
    const members = JOBS.map((job, k): Member => {
      const g = new THREE.Group();
      const legs = new THREE.Mesh(legGeo, pants);
      const upper = new THREE.Group();
      upper.add(new THREE.Mesh(torsoGeo, shirt), new THREE.Mesh(headGeo, helmet));
      g.add(legs, upper);
      const prop = job === "frontTire" || job === "rearTire" ? tire() : job === "gas" ? can() : null;
      if (prop) upper.add(prop);
      root.add(g);
      // behind the wall, either side of the cart
      const home = { x: -3.2 + k * 1.28 + (k >= 3 ? 0.5 : 0), z: WALL_Z - 2.4 - (k % 2) * 0.6 };
      return { job, g, legs, upper, prop, x: home.x, z: home.z, home, kneel: 0 };
    });
    crews.push({ members, shirt, helmet, lift: 0, side: 1 });
  }
  // which crew services which car
  let crewOf: number[] = [];

  return {
    setup(sess) {
      crewOf = sess.drivers.map((d) => d.box);
      sess.drivers.forEach((d, i) => {
        const crew = crews[d.box];
        if (!crew) return;
        // yours is the SCOFTI crew whatever the paint: black shirts, lime helmets
        crew.shirt.color.set(sess.entries[i].player ? "#141414" : teamColor(sess.entries[i].paintId));
        crew.helmet.color.set(sess.entries[i].player ? LIME : "#f2f2f2");
        for (const m of crew.members) {
          m.x = m.home.x;
          m.z = m.home.z;
          m.kneel = 0;
        }
        crew.lift = 0;
      });
    },

    update(sess, dt) {
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
        // the jack goes up once the jack man's there, drops at the halfway swap and at the end
        const jack = crew.members[0];
        const atJack = state === "work" && Math.hypot(jack.x - (carX + workSpot("jack", side).x), jack.z - workSpot("jack", side).z) < 0.3;
        const sideDone = side > 0 ? done / 0.5 : (done - 0.5) / 0.5;
        const up = atJack && sideDone < 0.94 ? 1 : 0;
        if (crew.side !== side) crew.lift = 0;
        crew.side = side;
        crew.lift += (up - crew.lift) * Math.min(1, dt * 10);

        for (const m of crew.members) {
          let tx = m.home.x;
          let tz = m.home.z;
          let kneel = 0;
          if (state === "ready") {
            tx = m.home.x * 0.9;
            tz = WALL_Z;
          } else if (state === "work") {
            const w = workSpot(m.job, side);
            tx = carX + w.x;
            tz = w.z;
            kneel = w.kneel;
          }
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
          m.kneel += ((moving ? 0 : kneel) - m.kneel) * Math.min(1, dt * 12);

          // into the world: pit road runs along the front straight, so box coordinates map straight across
          const f = frame(stall + m.x, PIT.box + m.z);
          const onWall = Math.abs(m.z - WALL_Z) < 0.35 ? WALL_H : Math.abs(m.z - WALL_Z) < 0.7 ? WALL_H * (1 - (Math.abs(m.z - WALL_Z) - 0.35) / 0.35) : 0;
          const bob = moving ? Math.abs(Math.sin(performance.now() * 0.018 + m.home.x)) * 0.08 : 0;
          const work = state === "work" && !moving && m.kneel > 0.5 ? Math.sin(performance.now() * 0.05 + m.home.x) * 0.03 : 0;
          m.g.position.set(f.x, onWall + bob, f.z);
          // face where they're running, or the car while they work on it
          const face = moving ? Math.atan2(dz, dx) : state === "work" ? Math.atan2(-m.z, carX - m.x) : Math.PI / 2;
          m.g.rotation.y = -face;
          m.legs.scale.y = 1 - m.kneel * 0.62;
          m.upper.position.y = -m.kneel * 0.58 + work;
          // carriers hold the tire out in front; the gas man lifts the can into the car
          if (m.job === "gas" && m.prop) {
            const fueling = state === "work" && !moving;
            m.prop.rotation.z = fueling ? -0.9 : 0;
            m.prop.position.y = fueling ? 1.45 : 1.15;
          }
        }
      });
    },

    lift(i) {
      const crew = crews[crewOf[i]];
      if (!crew) return { y: 0, roll: 0 };
      return { y: crew.lift * 0.08, roll: crew.lift * 0.08 * crew.side };
    },
  };
}
