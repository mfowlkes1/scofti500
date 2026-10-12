// The drivers: the rivals, and your car whenever it's driving itself (the pace laps, a pit stop).
// They use the same physics as you. Each follows a racing line round martinsvale (wide into the
// turn, down to the apex, wide out) at a speed plan worked out from grip: brake late, carry speed,
// and pass when there's room.
import { frame, gap, HALF, L, LINE_S, PIT, R, S, bankAt, wrap } from "./track";
import { G, STOCK, WHEELBASE, freshTires, speedOf, steerLock, tireGrip, type CarState, type Input, type Spec } from "./physics";

// ---- the racing line and how fast it can be driven ----

const HI = 5.2; // where the line runs on the straights and turn entry/exit
const LO = -6.2; // the apex, just off the inside edge
const LEAD = 26; // how far before a turn the line starts down

function lineD(s: number): number {
  s = wrap(s);
  const turns: [number, number][] = [
    [S, S + Math.PI * R],
    [2 * S + Math.PI * R, L],
  ];
  for (const [a, b] of turns) {
    for (const off of [0, L, -L]) {
      const t = (s + off - (a - LEAD)) / (b - a + LEAD * 1.6);
      if (t > 0 && t < 1) {
        // a late apex: the line reaches the bottom past the middle of the turn
        const bell = Math.pow(Math.sin(Math.PI * Math.pow(t, 1.18)), 2);
        return HI - (HI - LO) * bell;
      }
    }
  }
  return HI;
}

const N = Math.ceil(L);
const LINE: number[] = [];
const PLAN: number[] = [];
{
  const pts = [];
  for (let i = 0; i < N; i++) {
    LINE.push(lineD(i));
    const f = frame(i, LINE[i]);
    pts.push([f.x, f.z]);
  }
  const vmax: number[] = [];
  const brakeAt: number[] = [];
  for (let i = 0; i < N; i++) {
    const [ax, az] = pts[(i - 8 + N) % N];
    const [bx, bz] = pts[i];
    const [cx, cz] = pts[(i + 8) % N];
    // radius through three points
    const a = Math.hypot(bx - cx, bz - cz);
    const b = Math.hypot(ax - cx, az - cz);
    const c = Math.hypot(ax - bx, az - bz);
    const area = Math.abs((bx - ax) * (cz - az) - (cx - ax) * (bz - az)) / 2;
    const rad = area < 1e-6 ? 1e9 : (a * b * c) / (4 * area);
    const mu = STOCK.grip;
    const tb = Math.tan(bankAt(i));
    const aMax = (G * (mu + tb)) / (1 - mu * tb);
    vmax.push(Math.min(80, Math.sqrt(aMax * 0.97 * rad)));
    brakeAt.push(Math.min(STOCK.brake, aMax) * 0.78);
  }
  for (let i = 0; i < N; i++) PLAN.push(vmax[i]);
  // work back from every turn: how fast you can be going and still slow down in time
  for (let pass = 0; pass < 2; pass++) {
    for (let i = N - 1; i >= 0; i--) {
      const next = PLAN[(i + 1) % N];
      PLAN[i] = Math.min(PLAN[i], Math.sqrt(next * next + 2 * brakeAt[i]));
    }
  }
}

export const racingLine = (s: number) => LINE[Math.floor(wrap(s)) % N];
export const planSpeed = (s: number) => PLAN[Math.floor(wrap(s)) % N];

// ---- a driver ----

export type Mode = "pace" | "race" | "pit" | "cool";

export type Driver = {
  /** 0.9 .. 1: how close to the limit they drive */
  skill: number;
  /** 0 .. 1: how happily they lean on the car in front */
  aggression: number;
  mode: Mode;
  offset: number;
  want: number;
  /** pace laps: which file (d) and slot behind the pace car (m) */
  file: number;
  slot: number;
  /** pit stop: their box, where they are in it, and the time left on the stop */
  box: number;
  pitPhase: "in" | "stopped" | "out" | null;
  service: number;
  /** how long this stop takes with no help (seconds of work) */
  serviceTotal: number;
  /** how long the car has sat in the box */
  stopped: number;
};

export function newDriver(skill: number, aggression: number, box: number): Driver {
  return { skill, aggression, mode: "pace", offset: 0, want: 0, file: 0, slot: 0, box, pitPhase: null, service: 0, serviceTotal: 0, stopped: 0 };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** steer at a point ahead (pure pursuit) */
function steerTo(c: CarState, s2: number, d2: number): number {
  const f = frame(s2, d2);
  const dx = f.x - c.x;
  const dz = f.z - c.z;
  const ld = Math.max(3, Math.hypot(dx, dz));
  const fx = Math.cos(c.h);
  const fz = Math.sin(c.h);
  // + when the point is to the right
  const sinA = (fx * dz - fz * dx) / ld;
  const delta = Math.atan((2 * WHEELBASE * sinA) / ld);
  return clamp(delta / steerLock(Math.max(1, speedOf(c))), -1, 1);
}

function pedals(v: number, target: number): { throttle: number; brake: number } {
  const err = target - v;
  if (err > 0.25) return { throttle: clamp(0.45 + err * 0.5, 0, 1), brake: 0 };
  if (err < -0.35) return { throttle: 0, brake: clamp(-err * 0.3, 0, 1) };
  return { throttle: 0.4, brake: 0 };
}

export type Context = {
  cars: CarState[];
  me: number;
  spec: Spec;
  /** pace laps: where the pace car is (s) and its speed */
  paceS: number;
  paceV: number;
  dt: number;
};

export function drive(drv: Driver, ctx: Context): Input {
  const c = ctx.cars[ctx.me];
  const v = speedOf(c);
  c.limiter = false;
  if (drv.mode === "pace") return pace(drv, ctx, c, v);
  if (drv.mode === "pit") return pit(drv, ctx, c, v);

  // ---- racing ----
  const gripRatio = Math.sqrt((tireGrip(c) * ctx.spec.grip) / STOCK.grip);
  const powerEdge = Math.pow(ctx.spec.power / STOCK.power, 0.15);
  let target = planSpeed(c.s + v * 0.18) * gripRatio * drv.skill * powerEdge;
  if (drv.mode === "cool") target = Math.min(target, 24);

  let want = 0;
  let cap = Infinity;
  const myLine = racingLine(c.s) + drv.offset;
  for (let i = 0; i < ctx.cars.length; i++) {
    if (i === ctx.me) continue;
    const o = ctx.cars[i];
    const g = gap(c.s, o.s);
    const ov = speedOf(o);
    // someone alongside: make room
    if (Math.abs(g) < 5.6 && Math.abs(o.d - c.d) < 2.7) want += o.d > c.d ? -2.2 : 2.2;
    if (g <= 0 || g > 34) continue;
    if (Math.abs(o.d - myLine) > 2.4) continue;
    // a car in our path ahead
    const closing = v - ov;
    if (g < 26 && closing > -1.5) {
      // go round it: under it when it's high, over it when it's low
      const side = o.d > 0.5 ? -1 : 1;
      const room = side < 0 ? o.d - 3.8 > -HALF + 1.2 : o.d + 3.8 < HALF - 1.2;
      if (room) want += o.d + side * 3.8 - racingLine(c.s);
    }
    const close = 7 - drv.aggression * 3.5 + Math.max(0, closing) * 0.9;
    if (g < close) cap = Math.min(cap, ov - 0.6 + drv.aggression * 1.4);
  }
  drv.want += clamp(want - drv.want, -2.5 * ctx.dt, 2.5 * ctx.dt);
  if (want === 0) drv.want *= Math.exp(-ctx.dt * 0.7);
  drv.offset += clamp(drv.want - drv.offset, -2.4 * ctx.dt, 2.4 * ctx.dt);

  const ld = 7 + v * 0.36;
  const d2 = clamp(racingLine(c.s + ld) + drv.offset, -HALF + 1.3, HALF - 1.2);
  const steer = steerTo(c, c.s + ld, d2);
  const p = pedals(v, Math.min(target, cap));
  return { steer, ...p };
}

/** the pace laps: double file behind the pace car, holding the slot */
function pace(drv: Driver, ctx: Context, c: CarState, v: number): Input {
  const slotS = ctx.paceS - drv.slot;
  const behind = gap(c.s, slotS);
  const f = frame(c.s);
  const scale = f.arc ? (R + drv.file) / R : 1;
  const target = Math.max(0, ctx.paceV * scale + clamp(behind * 0.9, -6, 6));
  const ld = 6 + v * 0.35;
  return { steer: steerTo(c, c.s + ld, drv.file), ...pedals(v, target) };
}

// ---- pit stops ----
// Down off turn 4, onto pit road at the limiter, into the box, four tires, and back out
// past the end of the pit wall into turn 1.

const IN_FROM = L - 95; // where the dive to pit road starts (middle of turns 3-4)
const LIMIT_AT = PIT.wallFrom - 14; // the limiter line

/** is this car where a pit stop can start (it starts down at the end of the backstretch) */
export function canStartPit(c: CarState): boolean {
  return wrap(c.s) > IN_FROM - 120 && wrap(c.s) < IN_FROM;
}

export function startPit(drv: Driver): void {
  drv.mode = "pit";
  drv.pitPhase = "in";
}

function pit(drv: Driver, ctx: Context, c: CarState, v: number): Input {
  const s = wrap(c.s);
  const boxS = PIT.stall(drv.box);
  // how far along pit road we are, from the dive at the end of turn 4 (meters)
  const along = s >= IN_FROM - 130 ? s - IN_FROM : s + (L - IN_FROM);
  const others = ctx.cars.filter((_, i) => i !== ctx.me);

  if (drv.pitPhase === "stopped") {
    c.held = true;
    drv.service -= ctx.dt;
    drv.stopped += ctx.dt;
    if (drv.service <= 0) {
      c.held = false;
      freshTires(c, 0.4);
      drv.pitPhase = "out";
    }
    return { steer: 0, throttle: 0.3, brake: 1 };
  }

  let d: number;
  let target: number;
  const toLimit = along - (LIMIT_AT + L - IN_FROM);
  if (drv.pitPhase === "in") {
    if (along < 0) {
      // still on the track, waiting to dive
      d = racingLine(s);
      target = planSpeed(s);
    } else if (toLimit < 0) {
      // the dive: off the line, across the apron, onto pit road, slowing for the limiter
      const t = clamp(along / (L - IN_FROM + LIMIT_AT), 0, 1);
      d = racingLine(s) + (PIT.lane - racingLine(s)) * (t * t * (3 - 2 * t));
      target = Math.sqrt(PIT.speed * PIT.speed + 2 * 7 * -toLimit);
    } else {
      // down pit road to the box
      c.limiter = true;
      const toBox = gap(s, boxS);
      d = toBox < 22 ? PIT.lane + (PIT.box - PIT.lane) * clamp(1 - (toBox - 6) / 16, 0, 1) : PIT.lane;
      target = Math.min(PIT.speed, Math.sqrt(Math.max(0, 2 * 5.5 * (toBox - 0.4))));
      if (toBox < 1.2 && v < 1.6) {
        drv.pitPhase = "stopped";
        c.held = true;
      }
    }
  } else {
    // out of the box, down pit road, and back up onto the track in turn 1
    const pastWall = gap(PIT.wallTo, s);
    const fromBox = gap(boxS, s);
    if (pastWall < 0) {
      c.limiter = pastWall < -6;
      d = fromBox < 16 ? PIT.box + (PIT.lane - PIT.box) * clamp(fromBox / 16, 0, 1) : PIT.lane;
      target = PIT.speed;
    } else {
      const t = clamp(pastWall / 90, 0, 1);
      d = PIT.lane + (racingLine(s) - 2 - PIT.lane) * (t * t * (3 - 2 * t));
      target = PIT.speed + pastWall * 0.35;
      if (pastWall > 95) {
        drv.mode = "race";
        drv.pitPhase = null;
        drv.offset = 0;
        drv.want = 0;
      }
    }
  }
  // don't drive into the car in front on pit road
  for (const o of others) {
    const g = gap(c.s, o.s);
    if (g > 0 && g < 12 && Math.abs(o.d - d) < 2.2) target = Math.min(target, speedOf(o) - 0.5 + (g - 7) * 0.5);
  }
  const ld = 5 + v * 0.3;
  return { steer: steerTo(c, s + ld, d), ...pedals(v, Math.max(0, target)) };
}

/** where the field lines up for the pace laps: double file, pole on the inside */
export function gridSlot(pos: number): { s: number; d: number; slot: number } {
  const row = Math.floor(pos / 2);
  const slot = 18 + row * 9.5;
  return { s: wrap(LINE_S - 230 - slot), d: pos % 2 === 0 ? -3 : 3, slot };
}
