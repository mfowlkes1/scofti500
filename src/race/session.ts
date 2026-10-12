// One race, in numbers: the field rolls off double file behind the pace car, goes green at the
// line, races the laps, and takes the checkered flag. Rivals pit when their tyres are gone and
// there are enough laps left; you pit when you ask to. No 3D here: the race screen draws it, and
// scripts can run whole races with it.
import { canStartPit, drive, gridSlot, newDriver, startPit, type Driver } from "./ai";
import { collide, drafts, newCar, speedOf, step, type CarState, type Input, type Spec } from "./physics";
import { L, LINE_S, gap, wrap } from "./track";

export type Entry = {
  name: string;
  number: string;
  carId: string;
  paintId: string;
  spec: Spec;
  skill: number;
  aggression: number;
  player?: boolean;
};

export type Phase = "pace" | "green" | "checkered";

export type RaceEvent =
  | { type: "green" }
  | { type: "lap"; car: number }
  | { type: "white" }
  | { type: "checkered" }
  | { type: "finish"; car: number; pos: number }
  | { type: "pit-in"; car: number }
  | { type: "pit-stopped"; car: number; time: number }
  | { type: "pit-out"; car: number };

export type Session = {
  entries: Entry[];
  cars: CarState[];
  drivers: Driver[];
  player: number;
  laps: number;
  t: number;
  phase: Phase;
  paceS: number;
  paceV: number;
  /** line crossings since the green (-1 before it) */
  crossed: number[];
  lapStart: number[];
  lastLap: number[];
  bestLap: number[];
  led: number[];
  finishOrder: number[];
  /** you asked for a pit stop this time by */
  pitCall: boolean;
  events: RaceEvent[];
};

export const PACE_SPEED = 21;
const PIT_TIME = 13.5; // a four-tyre stop with a stock crew

export function createSession(entries: Entry[], laps: number): Session {
  const cars: CarState[] = [];
  const drivers: Driver[] = [];
  entries.forEach((e, pos) => {
    const g = gridSlot(pos);
    cars.push(newCar(g.s, g.d, PACE_SPEED));
    const d = newDriver(e.skill, e.aggression, pos);
    d.file = g.d;
    d.slot = g.slot;
    drivers.push(d);
  });
  return {
    entries,
    cars,
    drivers,
    player: entries.findIndex((e) => e.player),
    laps,
    t: 0,
    phase: "pace",
    paceS: wrap(LINE_S - 230),
    paceV: PACE_SPEED,
    crossed: entries.map(() => -1),
    lapStart: entries.map(() => 0),
    lastLap: entries.map(() => 0),
    bestLap: entries.map(() => Infinity),
    led: entries.map(() => 0),
    finishOrder: [],
    pitCall: false,
    events: [],
  };
}

/** how far round the race a car is, for the running order */
export const progress = (sess: Session, i: number) => sess.crossed[i] * L + wrap(sess.cars[i].s - LINE_S);

export function order(sess: Session): number[] {
  const done = sess.finishOrder;
  const rest = sess.cars.map((_, i) => i).filter((i) => !done.includes(i));
  rest.sort((a, b) => progress(sess, b) - progress(sess, a));
  return [...done, ...rest];
}

/** is your car driving itself right now (pace laps, a pit stop, after the flag) */
export const autopilot = (sess: Session) => sess.drivers[sess.player].mode !== "race";

export function stepSession(sess: Session, playerInput: Input | null, dt: number, pitCrew = 0): void {
  sess.t += dt;
  if (sess.phase === "pace") {
    sess.paceS = wrap(sess.paceS + sess.paceV * dt);
    // the pace car ducks off and the field goes green at the line
    if (gap(sess.paceS, LINE_S) < 14) {
      sess.phase = "green";
      for (const d of sess.drivers) d.mode = "race";
      sess.events.push({ type: "green" });
    }
  }

  const n = sess.cars.length;
  const prevS = sess.cars.map((c) => c.s);
  const lapsLeft = (i: number) => sess.laps - Math.max(0, sess.crossed[i]);

  for (let i = 0; i < n; i++) {
    const car = sess.cars[i];
    const drv = sess.drivers[i];
    const entry = sess.entries[i];
    // pit stops start down at the end of the backstretch
    if (sess.phase === "green" && drv.mode === "race" && canStartPit(car) && lapsLeft(i) > 1) {
      const wants = i === sess.player ? sess.pitCall : car.wear > 0.66 + (i % 3) * 0.05 && lapsLeft(i) >= 8;
      if (wants) {
        startPit(drv);
        drv.service = (i === sess.player ? PIT_TIME - pitCrew * 1.4 : PIT_TIME - 0.8 + (i % 4) * 0.4) + Math.random() * 0.8;
        sess.events.push({ type: "pit-in", car: i });
      }
    }
    const wasStopped = drv.pitPhase === "stopped";
    const wasPit = drv.mode === "pit";
    const ctx = { cars: sess.cars, me: i, spec: entry.spec, paceS: sess.paceS, paceV: sess.paceV, dt };
    const input = i === sess.player && drv.mode === "race" && playerInput ? playerInput : drive(drv, ctx);
    if (input === playerInput) car.limiter = false;
    step(car, input, entry.spec, dt);
    if (!wasStopped && drv.pitPhase === "stopped") sess.events.push({ type: "pit-stopped", car: i, time: drv.service });
    if (wasPit && drv.mode !== "pit") {
      sess.events.push({ type: "pit-out", car: i });
      if (i === sess.player) sess.pitCall = false;
    }
  }
  collide(sess.cars);
  drafts(sess.cars);

  // the line
  for (let i = 0; i < n; i++) {
    const before = gap(LINE_S, prevS[i]);
    const after = gap(LINE_S, sess.cars[i].s);
    if (Math.abs(before) > 60 || Math.abs(after) > 60) continue;
    if (before < 0 && after >= 0) crossLine(sess, i);
    else if (before >= 0 && after < 0) sess.crossed[i]--;
  }
}

function crossLine(sess: Session, i: number): void {
  sess.crossed[i]++;
  if (sess.phase === "pace") return;
  const c = sess.crossed[i];
  if (c > 0) {
    const time = sess.t - sess.lapStart[i];
    sess.lastLap[i] = time;
    if (time < sess.bestLap[i] && sess.drivers[i].mode !== "pit") sess.bestLap[i] = time;
    if (order(sess)[0] === i) sess.led[i]++;
  }
  sess.lapStart[i] = sess.t;
  if (sess.finishOrder.includes(i)) return;
  if (sess.phase === "checkered" || c >= sess.laps) {
    if (sess.phase !== "checkered") {
      sess.phase = "checkered";
      sess.events.push({ type: "checkered" });
    }
    sess.finishOrder.push(i);
    sess.drivers[i].mode = "cool";
    sess.events.push({ type: "finish", car: i, pos: sess.finishOrder.length });
    return;
  }
  if (c === sess.laps - 1 && order(sess)[0] === i) sess.events.push({ type: "white" });
  sess.events.push({ type: "lap", car: i });
}

export const mph = (c: CarState) => speedOf(c) * 2.237;
