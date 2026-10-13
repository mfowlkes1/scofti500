// One race, in numbers: the field rolls off double file behind the pace car, goes green at the
// line, races the laps, and takes the checkered flag. Rivals pit when their tires are gone and
// there are enough laps left; you pit when you ask to. No 3D here: the race screen draws it, and
// scripts can run whole races with it.
import { paceRun, canStartPit, drive, gridSlot, newDriver, startPit, type Driver } from "./ai";
import { collide, drafts, freshTires, newCar, speedOf, step, type CarState, type Input, type Spec } from "./physics";
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

export type Phase = "pace" | "green" | "caution" | "checkered";

export type RaceEvent =
  | { type: "green" }
  | { type: "lap"; car: number }
  | { type: "white" }
  | { type: "checkered" }
  | { type: "finish"; car: number; pos: number }
  | { type: "pit-in"; car: number }
  | { type: "pit-stopped"; car: number; time: number }
  | { type: "pit-out"; car: number }
  /** a wreck brings out the yellow: car is the one stopped on the track */
  | { type: "caution"; car: number }
  /** the wreck's cleared: green next time by */
  | { type: "restart-soon" }
  | { type: "restart" };

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
  /** the most times each car has crossed the line: backing over it and driving across again isn't a lap */
  furthest: number[];
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
  /** a qualifying run: one car, a warm-up lap and then one timed lap */
  qualifying: boolean;
  /** preseason testing: nobody wrecks, so no cautions */
  easy: boolean;
  /** cautions so far, when the last one started, when the last green flew, and whether the field's
   * set for the restart */
  cautions: number;
  cautionAt: number;
  greenAt: number;
  restartArmed: boolean;
  /** how long each car has sat stopped on the track (seconds) */
  stoppedFor: number[];
  /** the next slot at the back of the caution line (for cars coming off pit road) */
  tailSlot: number;
};

export const PACE_SPEED = 21;
const PIT_TIME = 13.5; // a rival crew's four-tire stop
// Your stop: the crew gets it done in 16 s on their own (a second less per pit crew upgrade); every
// tap on the air gun takes another 0.16 s off, so a fast thumb gets you out in about 7.5 s. Taps
// past 12 a second don't count.
const YOUR_STOP = 16;
const TAP = 0.16;
const MAX_TAPS = 12;

/** easy: preseason testing, where the walls and bumps slow you down but nobody wrecks */
export function createSession(entries: Entry[], laps: number, easy = false): Session {
  return makeSession(entries, laps, easy, false);
}

/** qualifying (race night): one car, out on its own and already green. From rolling (just past the
 * line, for the warm-up lap; or, for flying=true, at speed down the backstretch for the rivals'
 * quick laps), the first time over the line starts the clock and the second stops it */
export function createQualifying(entry: Entry, flying = false): Session {
  const sess = makeSession([entry], 1, false, true);
  const c = sess.cars[0];
  const at = flying ? wrap(LINE_S - 420) : wrap(LINE_S + 25);
  Object.assign(c, newCar(at, 0, flying ? 60 : 18));
  if (flying) freshTires(c, 1);
  sess.phase = "green";
  sess.drivers[0].mode = "race";
  return sess;
}

/** a rival's qualifying lap, run straight through with no screen: their time, a hair of luck either way */
export function qualifyingLap(entry: Entry): number {
  const sess = createQualifying(entry, true);
  while (!sess.finishOrder.length && sess.t < 240) stepSession(sess, null, 1 / 120);
  const lap = sess.lastLap[0] || 999;
  return lap * (1 + (Math.random() - 0.5) * 0.006);
}

function makeSession(entries: Entry[], laps: number, easy: boolean, qualifying: boolean): Session {
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
    paceS: wrap(LINE_S - paceRun()),
    paceV: PACE_SPEED,
    crossed: entries.map(() => -1),
    furthest: entries.map(() => -1),
    lapStart: entries.map(() => 0),
    lastLap: entries.map(() => 0),
    bestLap: entries.map(() => Infinity),
    led: entries.map(() => 0),
    finishOrder: [],
    pitCall: false,
    stops: entries.map(() => 0),
    answerAt: entries.map(() => -1),
    events: [],
    qualifying,
    easy,
    cautions: 0,
    cautionAt: 0,
    greenAt: 0,
    restartArmed: false,
    stoppedFor: entries.map(() => 0),
    tailSlot: 0,
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
  if (sess.phase === "pace" || sess.phase === "caution") sess.paceS = wrap(sess.paceS + sess.paceV * dt);
  if (sess.phase === "pace") {
    // the pace car ducks off and the field goes green at the line
    if (gap(sess.paceS, LINE_S) < 14) {
      sess.phase = "green";
      sess.greenAt = sess.t;
      for (const d of sess.drivers) d.mode = "race";
      sess.events.push({ type: "green" });
    }
  } else if (sess.phase === "green") watchForWrecks(sess, dt);
  else if (sess.phase === "caution") runCaution(sess);

  const n = sess.cars.length;
  const prevS = sess.cars.map((c) => c.s);
  const lapsLeft = (i: number) => sess.laps - Math.max(0, sess.crossed[i]);

  for (let i = 0; i < n; i++) {
    const car = sess.cars[i];
    const drv = sess.drivers[i];
    const entry = sess.entries[i];
    // pit stops start down at the end of the backstretch
    if (sess.phase === "green" && drv.mode === "race" && canStartPit(car) && lapsLeft(i) > 1) {
      // rivals pit when their tires are going, or to answer your stop so nobody's left on old tires
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
    const ctx = { cars: sess.cars, me: i, spec: entry.spec, paceS: sess.paceS, paceV: sess.paceV, catchUp: sess.phase === "caution" ? 22 : 6, dt };
    const input = i === sess.player && drv.mode === "race" && playerInput ? playerInput : drive(drv, ctx);
    if (input === playerInput) car.limiter = false;
    step(car, input, entry.spec, dt);
    if (!wasStopped && drv.pitPhase === "stopped") sess.events.push({ type: "pit-stopped", car: i, time: drv.service });
    if (wasPit && drv.mode !== "pit") {
      sess.events.push({ type: "pit-out", car: i });
      if (i === sess.player) sess.pitCall = false;
      // off pit road under the yellow: onto the back of the line
      if (sess.phase === "caution") toTheBack(sess, i);
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

// ---- cautions (race night only): a car stopped on the track brings out the yellow ----
const STOPPED = 7; // m/s: slower than this on the track counts as stopped
const CAUTION_SPEED = () => (L > 1500 ? 30 : 21); // the pace car's speed under yellow

function watchForWrecks(sess: Session, dt: number): void {
  let wreck = -1;
  sess.cars.forEach((c, i) => {
    const racing = sess.drivers[i].mode === "race" && !sess.finishOrder.includes(i);
    sess.stoppedFor[i] = racing && speedOf(c) < STOPPED ? sess.stoppedFor[i] + dt : 0;
    if (sess.stoppedFor[i] > 2) wreck = i;
  });
  if (wreck < 0 || sess.easy || sess.qualifying) return;
  // not on the opening lap, not in the last few, not right after the last one, and not too many
  const leader = order(sess)[0];
  const left = sess.laps - sess.crossed[leader];
  if (sess.crossed[leader] < 1 || left <= 3 || sess.t - sess.greenAt < 30) return;
  if (sess.cautions >= Math.max(1, Math.floor(sess.laps / 8))) return;
  startCaution(sess, wreck);
}

function startCaution(sess: Session, wreck: number): void {
  sess.phase = "caution";
  sess.cautions++;
  sess.cautionAt = sess.t;
  sess.restartArmed = false;
  // the pace car pulls out ahead of the leader
  const leader = order(sess)[0];
  sess.paceS = wrap(sess.cars[leader].s + 70);
  sess.paceV = CAUTION_SPEED();
  // the field lines up double file behind it in the order they're running round the track
  const running = sess.cars
    .map((_, i) => i)
    .filter((i) => sess.drivers[i].mode !== "pit" && !sess.finishOrder.includes(i))
    .sort((a, b) => wrap(sess.paceS - sess.cars[a].s) - wrap(sess.paceS - sess.cars[b].s));
  running.forEach((i, k) => {
    const d = sess.drivers[i];
    d.mode = "pace";
    d.slot = 18 + Math.floor(k / 2) * 9.5;
    d.file = k % 2 === 0 ? -3 : 3;
  });
  sess.tailSlot = 18 + Math.ceil(running.length / 2) * 9.5;
  sess.events.push({ type: "caution", car: wreck });
}

function toTheBack(sess: Session, i: number): void {
  const d = sess.drivers[i];
  d.mode = "pace";
  d.slot = sess.tailSlot;
  d.file = 0;
  sess.tailSlot += 9.5;
}

function runCaution(sess: Session): void {
  // set for the restart once the wreck's cleared (everyone rolling again) or it's gone on long enough
  if (!sess.restartArmed) {
    const rolling = sess.cars.every((c, i) => sess.drivers[i].mode !== "pace" || speedOf(c) > 12);
    const long = sess.t - sess.cautionAt;
    if ((rolling && long > 22) || long > 70) {
      // the green comes the next time the pace car reaches the line, so it needs to be far enough off
      if (gap(sess.paceS, LINE_S) > 120) {
        sess.restartArmed = true;
        sess.events.push({ type: "restart-soon" });
      }
    }
    return;
  }
  // the pace car pulls off at the line and they're racing again
  if (gap(sess.paceS, LINE_S) < 14) {
    sess.phase = "green";
    sess.greenAt = sess.t;
    for (const d of sess.drivers) if (d.mode === "pace") d.mode = "race";
    sess.paceV = PACE_SPEED;
    sess.events.push({ type: "restart" });
  }
}

function crossLine(sess: Session, i: number): void {
  sess.crossed[i]++;
  if (sess.crossed[i] <= sess.furthest[i]) return;
  sess.furthest[i] = sess.crossed[i];
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
