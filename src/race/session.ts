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
  /** pit stops each car has made */
  stops: number[];
  /** when you pit, the rivals answer: the lap each one comes in (-1: not planning to) */
  answerAt: number[];
  events: RaceEvent[];
};

export const PACE_SPEED = 21;
const PIT_TIME = 13.5; // a rival crew's four-tyre stop
// Your stop: the crew gets it done in 16 s on their own (a second less per pit crew upgrade); every
// tap on the air gun takes another 0.16 s off, so a fast thumb gets you out in about 7.5 s. Taps
// past 12 a second don't count.
const YOUR_STOP = 16;
const TAP = 0.16;
const MAX_TAPS = 12;

/** easy: preseason testing, where the walls and bumps slow you down but nobody wrecks */
export function createSession(entries: Entry[], laps: number, easy = false): Session {
  const cars: CarState[] = [];
  const drivers: Driver[] = [];
  entries.forEach((e, pos) => {
    const g = gridSlot(pos);
    const car = newCar(g.s, g.d, PACE_SPEED);
    car.soft = easy;
    cars.push(car);
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
    stops: entries.map(() => 0),
    answerAt: entries.map(() => -1),
    events: [],
  };
}

/** how far round the race a car is, for the running order. A car that has taken the checkered flag
 * stops where it crossed the line, so the laps it completed are what count. */
export function progress(sess: Session, i: number): number {
  if (sess.finishOrder.includes(i)) return sess.crossed[i] * L;
  return sess.crossed[i] * L + wrap(sess.cars[i].s - LINE_S);
}

/** the running order: most laps first; cars level on laps finish in the order they crossed the line
 * (a car six laps down that crosses right behind the winner is still six laps down) */
export function order(sess: Session): number[] {
  const at = (i: number) => sess.finishOrder.indexOf(i);
  return sess.cars
    .map((_, i) => i)
    .sort((a, b) => progress(sess, b) - progress(sess, a) || (at(a) < 0 ? 1e9 : at(a)) - (at(b) < 0 ? 1e9 : at(b)));
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
      // rivals pit when their tyres are going, or to answer your stop so nobody's left on old tyres
      const answering = sess.answerAt[i] >= 0 && sess.crossed[i] >= sess.answerAt[i] && lapsLeft(i) >= 3 && car.wear > 0.12;
      const wants = i === sess.player ? sess.pitCall : (car.wear > 0.66 + (i % 3) * 0.05 && lapsLeft(i) >= 8) || answering;
      if (wants) {
        startPit(drv);
        drv.service = i === sess.player ? YOUR_STOP - pitCrew : PIT_TIME - 0.8 + (i % 4) * 0.4 + Math.random() * 0.8;
        drv.serviceTotal = drv.service;
        drv.stopped = 0;
        sess.events.push({ type: "pit-in", car: i });
        sess.stops[i]++;
        sess.answerAt[i] = -1;
        // you pitted: everyone who's made fewer stops comes in over the next few laps, a few at a time
        if (i === sess.player) {
          sess.answerAt.forEach((_, k) => {
            if (k !== i && sess.stops[k] < sess.stops[i]) sess.answerAt[k] = Math.max(0, sess.crossed[k]) + 1 + (k % 4);
          });
        }
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
    sess.events.push({ type: "finish", car: i, pos: order(sess).indexOf(i) + 1 });
    return;
  }
  if (c === sess.laps - 1 && order(sess)[0] === i) sess.events.push({ type: "white" });
  sess.events.push({ type: "lap", car: i });
}

export const mph = (c: CarState) => speedOf(c) * 2.237;

/** a tap on the air gun during your pit stop: true when it counted */
const taps: number[] = [];
export function airGun(sess: Session): boolean {
  const drv = sess.drivers[sess.player];
  if (drv.pitPhase !== "stopped" || drv.service <= 0) return false;
  const now = sess.t;
  while (taps.length && now - taps[0] > 1) taps.shift();
  if (taps.length >= MAX_TAPS) return false;
  taps.push(now);
  drv.service -= TAP;
  return true;
}

/** your pit stop as it stands: how far along (0..1) and how long you've sat there, or null */
export function pitStop(sess: Session): { done: number; time: number } | null {
  const drv = sess.drivers[sess.player];
  if (drv.pitPhase !== "stopped") return null;
  return { done: Math.min(1, 1 - Math.max(0, drv.service) / drv.serviceTotal), time: drv.stopped };
}
