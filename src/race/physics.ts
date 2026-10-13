// How a stock car drives, in numbers (no 3D here, so a script can run whole races to tune it).
// Michael (2026-10-12): "as realistic as possible", with tire wear "and all that".
//
// The model, per car, in world meters and seconds:
// - Grip is a friction circle. The tires can give so much acceleration in total (more in the banked
//   turns), shared between braking/driving and cornering. Brake hard in a turn and there's less left
//   to turn with.
// - Steering sets how fast the car rotates. The velocity follows the nose only as fast as the
//   remaining grip allows, so too fast into a turn and the car slides up the track toward the wall.
// - The engine is power-limited (~ 600 hp at the wheels); air drag grows with the square of speed;
//   drafting behind a car cuts it.
// - Tires wear with every meter, much faster while sliding, and lose grip as they go. Cold tires
//   (the start, out of the pits) have less grip until they warm up.
// - Walls and other cars push back: rubbin' is racin', but a hard hit off-center spins you.
import { frame, gap, heightAt, HALF, INFIELD, inPitRoad, L, PIT, TRACK, project, surfaceAt, bankAt, wrap, type Surface } from "./track";

export const G = 9.81;
export const WHEELBASE = 2.8;
export const CAR_LEN = 5.1;
export const CAR_W = 2.0;

export type Spec = {
  /** at the wheels, watts */
  power: number;
  /** how hard the brakes can stop, m/s² (the tires still have the last word) */
  brake: number;
  /** tire grip, as a friction coefficient */
  grip: number;
  /** how fast the tires wear (1 = stock) */
  wear: number;
};

export const STOCK: Spec = { power: 440_000, brake: 13.5, grip: 1.12, wear: 1 };

export type Input = { steer: number; throttle: number; brake: number };

export type CarState = {
  x: number;
  z: number;
  /** direction of the nose: forward is (cos h, sin h) in x/z */
  h: number;
  vx: number;
  vz: number;
  /** extra spin from hits, rad/s, fades as the tires catch it */
  spin: number;
  /** the steering as it is, after the wheel has turned (-1 left .. 1 right) */
  steer: number;
  throttle: number;
  brake: number;
  s: number;
  d: number;
  /** each tire: left front, right front, left rear, right rear */
  tires: Tire[];
  /** the tires overall, for grip: 0 new .. 1 gone (the most worn tire counts most) */
  wear: number;
  /** tire warmth overall, 0 cold .. 1 working */
  temp: number;
  /** last step's slide (m/s sideways), for smoke and squeal */
  slide: number;
  /** wall contact this step (m/s into the wall), for sparks and scrape */
  scrape: number;
  /** a car hit this step (m/s), for the thump */
  bump: number;
  /** draft this step, 0..0.35 */
  draft: number;
  surface: Surface;
  /** the engine: gear 1..4 and rpm */
  gear: number;
  rpm: number;
  /** held still (in the pit box) */
  held: boolean;
  /** stuck to the pit limiter */
  limiter: boolean;
  /** preseason testing: walls and bumps slow you down but don't wreck you */
  soft: boolean;
};

/** one tire: wear 0 new .. 1 gone, warmth 0 cold .. 1 working (past ~1.15 it's overheating) */
export type Tire = { wear: number; temp: number };
export const TIRE_NAMES = ["LF", "RF", "LR", "RR"];

/** four new tires, cold (out of the pits) or warm (the start, after the pace laps) */
export function freshTires(c: CarState, temp: number): void {
  c.tires = [0, 1, 2, 3].map(() => ({ wear: 0, temp }));
  c.wear = 0;
  c.temp = temp;
}

export function newCar(s: number, d: number, speed: number): CarState {
  const f = frame(s, d);
  return {
    x: f.x,
    z: f.z,
    h: Math.atan2(f.tz, f.tx),
    vx: f.tx * speed,
    vz: f.tz * speed,
    spin: 0,
    steer: 0,
    throttle: 0,
    brake: 0,
    s: wrap(s),
    d,
    tires: [0, 1, 2, 3].map(() => ({ wear: 0, temp: 0.75 })),
    wear: 0,
    temp: 0.75,
    slide: 0,
    scrape: 0,
    bump: 0,
    draft: 0,
    surface: "track",
    gear: 2,
    rpm: 5000,
    held: false,
    limiter: false,
    soft: false,
  };
}

export const speedOf = (c: CarState) => Math.hypot(c.vx, c.vz);

/** how much grip the tires have left: worn tires fall away (8% down at half worn, 20% when gone),
 * cold ones are down up to 9% */
export function tireGrip(c: CarState): number {
  return (0.91 + 0.09 * Math.min(1, c.temp)) * (1 - 0.2 * Math.pow(c.wear, 1.35));
}

const SURFACE_GRIP: Record<Surface, number> = { track: 1, apron: 0.9, pit: 0.95, grass: 0.42 };
const SURFACE_DRAG: Record<Surface, number> = { track: 0.12, apron: 0.18, pit: 0.15, grass: 2.6 };

/** the most a tire can corner with at s, m/s² (the banking helps) */
export function gripLimit(spec: Spec, c: CarState, s: number, d: number, surface: Surface): number {
  const mu = spec.grip * tireGrip(c) * SURFACE_GRIP[surface];
  const tb = Math.tan(surface === "track" ? bankAt(s) : 0);
  return (G * (mu + tb)) / Math.max(0.3, 1 - mu * tb);
}

/** the steering lock at this speed: full lock asks a bit more than fresh tires can give, so a
 * stab of the wheel slides, but it never needs more than full lock to make the turn. Steep banking
 * (Hotlanta) holds the car to much more, so there the lock opens up with the banking under it */
export function steerLock(v: number, s?: number): number {
  const tb = s === undefined ? 0 : Math.tan(bankAt(s));
  const a = Math.max(G * (STOCK.grip + 0.21) * 1.32, (G * (STOCK.grip + tb)) / (1 - STOCK.grip * tb));
  return Math.min(0.5, Math.atan((a * WHEELBASE) / Math.max(1, v * v)));
}

// the gearbox: top speed of each gear (m/s); rpm runs 3500..9400 across it
const GEARS = [19, 31, 43, 58];
// tire wear: tuned so a hard-driven set is about done after 20 laps
const WEAR_SCALE = 0.95;
const DRAG = 2.0e-4; // per meter: a_drag = DRAG * v²  (top speed ~ 70 m/s with no draft)

export function step(c: CarState, input: Input, spec: Spec, dt: number): void {
  // the steering wheel, throttle and brake take a moment to move
  c.steer += Math.max(-dt * 4.5, Math.min(dt * 4.5, input.steer - c.steer));
  c.throttle += Math.max(-dt * 6, Math.min(dt * 4, input.throttle - c.throttle));
  c.brake += Math.max(-dt * 8, Math.min(dt * 8, input.brake - c.brake));

  if (c.held) {
    c.vx = c.vz = 0;
    c.spin = 0;
    c.slide = c.scrape = c.bump = 0;
    c.rpm += (2800 + c.throttle * 3000 - c.rpm) * Math.min(1, dt * 6);
    return;
  }

  const fx = Math.cos(c.h);
  const fz = Math.sin(c.h);
  const rx = -fz;
  const rz = fx;
  let vLong = c.vx * fx + c.vz * fz;
  const v = Math.hypot(c.vx, c.vz);

  const surface = surfaceAt(c.s, c.d);
  c.surface = surface;
  const aMax = gripLimit(spec, c, c.s, c.d, surface);
  const muFlat = spec.grip * tireGrip(c) * SURFACE_GRIP[surface];

  // ---- along the car: engine, brakes, drag ----
  let drive = 0;
  if (c.throttle > 0) drive = c.throttle * Math.min(spec.power / (1550 * Math.max(4, vLong)), muFlat * G * 0.75);
  let braking = c.brake * Math.min(spec.brake, aMax * 1.05);
  if (vLong < 0.5) braking = Math.min(braking, Math.max(0, vLong) / dt);
  if (c.limiter && vLong > PIT.speed) drive = 0;
  const drag = DRAG * TRACK.drag * (1 - c.draft) * v * v + SURFACE_DRAG[surface] * Math.min(1, v);
  // the tires can only push so hard in total
  const tireLong = Math.min(aMax, drive + braking);
  const latAvail = Math.sqrt(Math.max(0, aMax * aMax - tireLong * tireLong));
  vLong += (drive - braking - drag * Math.sign(vLong)) * dt;
  if (c.limiter && vLong > PIT.speed) vLong -= Math.min(vLong - PIT.speed, 6 * dt);

  // ---- turning ----
  const delta = c.steer * steerLock(Math.abs(vLong), c.s);
  let yaw = (vLong * Math.tan(delta)) / WHEELBASE;
  // the tires can't turn the car much faster than grip allows; past that it slides
  const yawMax = (latAvail * 1.12) / Math.max(3, v) + 0.15;
  yaw = Math.max(-yawMax, Math.min(yawMax, yaw));

  // keep the old sideways speed in the frame of the car
  let vLat = c.vx * rx + c.vz * rz;
  // a sliding car tries to straighten itself out (the tires pull it back in line)
  const slip = Math.atan2(vLat, Math.max(1, Math.abs(vLong)));
  c.spin *= Math.exp(-dt * (0.8 + 2.4 * Math.min(1, latAvail / 12)));
  // preseason: knocked slow and sideways, the car straightens itself back down the track
  if (c.soft && v < 14 && !c.limiter && !inPitRoad(c.s, c.d) && c.d > PIT.wallIn) {
    const t = frame(c.s, c.d);
    c.h += angleTo(c.h, Math.atan2(t.tz, t.tx)) * Math.min(1, dt * 2.5);
    c.spin *= Math.exp(-dt * 6);
  }
  // race night: a car stopped after a wreck (nose in the wall, say) swings round to face down the
  // track, so the gas gets it going again (there's no reverse)
  else if (!c.soft && v < 3 && !c.limiter && !inPitRoad(c.s, c.d) && c.d > PIT.wallIn) {
    const t = frame(c.s, c.d);
    c.h += angleTo(c.h, Math.atan2(t.tz, t.tx)) * Math.min(1, dt * 1.5);
    c.spin *= Math.exp(-dt * 6);
  }
  const settle = -Math.sin(slip) * 1.6 * Math.min(1, v / 10);
  const turn = (yaw + c.spin + settle * 0.35) * dt;
  c.h += turn;

  // the same velocity, seen from the turned car
  const nfx = Math.cos(c.h);
  const nfz = Math.sin(c.h);
  const nrx = -nfz;
  const nrz = nfx;
  const vxw = fx * vLong + rx * vLat;
  const vzw = fz * vLong + rz * vLat;
  vLong = vxw * nfx + vzw * nfz;
  vLat = vxw * nrx + vzw * nrz;
  // grip pulls the sideways speed out, as much as it can
  const fix = Math.min(Math.abs(vLat), latAvail * dt);
  vLat -= Math.sign(vLat) * fix;
  // sliding scrubs speed
  if (Math.abs(vLat) > 0.6) vLong -= Math.sign(vLong) * Math.min(Math.abs(vLong), Math.abs(vLat) * 0.35 * dt);
  c.slide = Math.abs(vLat);

  c.vx = nfx * vLong + nrx * vLat;
  c.vz = nfz * vLong + nrz * vLat;
  c.x += c.vx * dt;
  c.z += c.vz * dt;

  // ---- where that put us: walls ----
  const prevD = c.d;
  const p = project(c.x, c.z);
  c.s = p.s;
  c.d = p.d;
  c.scrape = 0;
  wallCheck(c, prevD);

  // ---- tires: each one wears and warms with the work it does ----
  // the tracks are all left turns, so the right side carries the corners (the right front most);
  // braking leans on the fronts, the throttle on the rears, and sliding chews them all.
  const dist = v * dt;
  const cornering = yaw * v; // + turning right
  const lat = Math.min(1.5, Math.abs(cornering) / Math.max(4, aMax));
  const brk = braking / Math.max(4, aMax);
  const drv = drive / Math.max(4, aMax);
  const sliding = Math.min(3, c.slide / 2);
  const base = (dist / L) * (1 / 42) * spec.wear * WEAR_SCALE;
  let worst = 0;
  let sumW = 0;
  let sumT = 0;
  c.tires.forEach((t, i) => {
    const front = i < 2;
    const right = i % 2 === 1;
    const outside = cornering < 0 ? right : !right;
    const load = 0.45 + lat * (outside ? 1.35 : 0.3) + brk * (front ? 1.2 : 0.3) + drv * (front ? 0.05 : 0.55);
    t.wear = Math.min(1, t.wear + base * load * (1 + sliding * 2.2));
    const warmTo = v > 12 ? 0.8 + Math.min(0.4, load * 0.13 + sliding * 0.15) : 0.55;
    t.temp += (warmTo - t.temp) * Math.min(1, dt / (t.temp < warmTo ? 14 : 40));
    worst = Math.max(worst, t.wear);
    sumW += t.wear;
    sumT += t.temp;
  });
  c.wear = 0.55 * worst + 0.45 * (sumW / 4);
  c.temp = sumT / 4;

  // ---- the engine ----
  const speed = Math.max(0, vLong);
  if (speed > GEARS[c.gear - 1] * 0.985 && c.gear < GEARS.length) c.gear++;
  else if (c.gear > 1 && speed < GEARS[c.gear - 2] * 0.7) c.gear--;
  const lo = c.gear > 1 ? GEARS[c.gear - 2] * 0.55 : 0;
  const rpmTo = 3500 + 5900 * Math.min(1.02, Math.max(0, (speed - lo) / (GEARS[c.gear - 1] - lo)));
  c.rpm += (rpmTo + c.throttle * 300 - c.rpm) * Math.min(1, dt * 10);
}

/** the outside wall, the pit wall and pit road's far wall, and the infield fence */
function wallCheck(c: CarState, prevD: number): void {
  const hw = CAR_W / 2 + 0.05;
  const s = c.s;
  let limitHi = HALF - hw;
  let limitLo = INFIELD;
  const alongWall = s > PIT.wallFrom && s < PIT.wallTo;
  if (alongWall) {
    // which side of the pit wall: wherever the car was a moment ago
    if (prevD > (PIT.wallIn + PIT.wallOut) / 2) {
      limitLo = PIT.wallOut + hw;
    } else {
      // on pit road
      limitHi = PIT.wallIn - hw;
      limitLo = PIT.inner + hw;
    }
  }
  if (c.d > limitHi) hitWall(c, c.d - limitHi, 1);
  else if (c.d < limitLo) hitWall(c, limitLo - c.d, -1);
}

function hitWall(c: CarState, depth: number, side: 1 | -1): void {
  const f = frame(c.s, c.d);
  // the wall's normal, pointing back toward the car
  const nx = -f.nx * side;
  const nz = -f.nz * side;
  c.x += nx * depth;
  c.z += nz * depth;
  c.d -= depth * side;
  const into = -(c.vx * nx + c.vz * nz);
  if (into > 0 && c.soft) {
    // preseason: no bounce, no spin. The car slides along the wall, loses some speed, and gets
    // turned back along the track
    c.vx += nx * into;
    c.vz += nz * into;
    const keep = 1 - Math.min(0.3, into * 0.03);
    c.vx *= keep;
    c.vz *= keep;
    c.spin = 0;
    if (Math.hypot(c.vx, c.vz) > 2) c.h += angleTo(c.h, Math.atan2(c.vz, c.vx)) * 0.5;
    c.scrape = Math.max(c.scrape, into + 0.5);
  } else if (into > 0) {
    // bounce a little, and the scrape takes speed off
    c.vx += nx * into * 1.25;
    c.vz += nz * into * 1.25;
    const keep = 1 - Math.min(0.5, into * 0.03);
    c.vx *= keep;
    c.vz *= keep;
    c.scrape = Math.max(c.scrape, into + 0.5);
    // a square hit kicks the tail round
    const fx = Math.cos(c.h);
    const fz = Math.sin(c.h);
    const cross = fx * nz - fz * nx;
    c.spin += cross * Math.min(2.5, into * 0.18);
    // and scuffs the tires on that side
    for (const i of side > 0 ? [1, 3] : [0, 2]) c.tires[i].wear = Math.min(1, c.tires[i].wear + into * 0.003);
  } else {
    c.scrape = Math.max(c.scrape, 0.3);
  }
}

function angleTo(from: number, to: number): number {
  let a = (to - from) % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// ---- cars touching ----
// Each car is three circles down its length. A push apart, a share of the speed along the hit,
// and a twist if it landed off-center.
const CIRCLES = [-1.6, 0, 1.6];
const RAD = 1.0;

export function collide(cars: CarState[]): void {
  for (const c of cars) c.bump = 0;
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i];
      const b = cars[j];
      if (Math.abs(a.x - b.x) > 7 || Math.abs(a.z - b.z) > 7) continue;
      for (const oa of CIRCLES) {
        for (const ob of CIRCLES) {
          const ax = a.x + Math.cos(a.h) * oa;
          const az = a.z + Math.sin(a.h) * oa;
          const bx = b.x + Math.cos(b.h) * ob;
          const bz = b.z + Math.sin(b.h) * ob;
          let nx = ax - bx;
          let nz = az - bz;
          const dist = Math.hypot(nx, nz);
          if (dist >= RAD * 2 || dist < 1e-4) continue;
          nx /= dist;
          nz /= dist;
          const push = (RAD * 2 - dist) / 2;
          if (!a.held) {
            a.x += nx * push;
            a.z += nz * push;
          }
          if (!b.held) {
            b.x -= nx * push;
            b.z -= nz * push;
          }
          const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
          if (rel >= 0) continue;
          const j2 = (-(1 + 0.15) * rel) / 2;
          // preseason cars get knocked about half as much
          if (!a.held) {
            a.vx += nx * j2 * (a.soft ? 0.5 : 1);
            a.vz += nz * j2 * (a.soft ? 0.5 : 1);
          }
          if (!b.held) {
            b.vx -= nx * j2 * (b.soft ? 0.5 : 1);
            b.vz -= nz * j2 * (b.soft ? 0.5 : 1);
          }
          // off-center hits twist the car: the farther from the middle, the more
          const twist = Math.min(1.8, j2 * 0.11);
          a.spin += (a.soft ? 0.2 : 1) * twist * (oa / 1.6) * (Math.cos(a.h) * nz - Math.sin(a.h) * nx);
          b.spin -= (b.soft ? 0.2 : 1) * twist * (ob / 1.6) * (Math.cos(b.h) * nz - Math.sin(b.h) * nx);
          a.bump = Math.max(a.bump, -rel);
          b.bump = Math.max(b.bump, -rel);
        }
      }
    }
  }
  for (const c of cars) {
    const p = project(c.x, c.z);
    c.s = p.s;
    c.d = p.d;
  }
}

/** the draft: running close behind a car cuts your drag a lot, and pushing one helps it a little */
export function drafts(cars: CarState[]): void {
  for (const c of cars) c.draft = 0;
  for (const a of cars) {
    for (const b of cars) {
      if (a === b) continue;
      const g = gap(a.s, b.s); // b ahead of a by g
      if (g <= 0 || g > 32 || Math.abs(a.d - b.d) > 1.9) continue;
      a.draft = Math.max(a.draft, 0.35 * (1 - g / 32));
      if (g < 9) b.draft = Math.max(b.draft, 0.06);
    }
  }
}

export const surfaceHeight = (c: CarState) => heightAt(c.s, c.d);
