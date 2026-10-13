// Runs a whole race with no screen and prints how it went: lap times, tire wear, pit stops, wall
// hits, bumps. For tuning the physics and the drivers. Run: npx tsx tools/sim.ts [laps]
// TRACK=hotlanta picks the track (martinsvale by default).
import { STOCK } from "../src/race/physics";
import { createSession, order, stepSession, type Entry } from "../src/race/session";
import { L, TRACK, setTrack, turnAmount } from "../src/race/track";

setTrack(process.env.TRACK ?? "martinsvale");

const laps = Number(process.argv[2] ?? 30);
const N = TRACK.field;
const entries: Entry[] = Array.from({ length: N }, (_, i) => ({
  name: `car${i}`,
  number: String(i),
  carId: "",
  paintId: "",
  spec: STOCK,
  skill: 0.985 - (i * 0.05) / N,
  aggression: (i % 3) / 2,
}));
// EASY=1: preseason testing (soft walls, rivals easing off the way the race screen sets them)
const easy = !!process.env.EASY;
if (easy) for (const e of entries) Object.assign(e, { spec: { ...STOCK, power: STOCK.power * 0.94 }, skill: e.skill * 0.95, aggression: e.aggression * 0.4 });
const sess = createSession(entries, laps, easy);
const dt = 1 / 120;
const walls = new Array(N).fill(0);
const bumps = new Array(N).fill(0);
let hardest = 0;
// your car's fastest on the straights and slowest in the turns, once racing
let top = 0;
let turnLow = Infinity;
while (sess.finishOrder.length < N && sess.t < laps * (L / 12) + 200) {
  stepSession(sess, null, dt);
  sess.cars.forEach((c, i) => {
    if (c.scrape > 1) walls[i]++;
    if (c.bump > 2) bumps[i]++;
    hardest = Math.max(hardest, c.scrape);
  });
  const me = sess.cars[0];
  if (sess.phase === "green" && sess.drivers[0].mode === "race") {
    const v = Math.hypot(me.vx, me.vz);
    top = Math.max(top, v);
    if (turnAmount(me.s) > 0.95) turnLow = Math.min(turnLow, v);
  }
  for (const e of sess.events) {
    if (e.type === "lap" && e.car === 0) {
      const c = sess.cars[0];
      console.log(`lap ${sess.crossed[0]}: ${sess.lastLap[0].toFixed(2)}s wear ${c.wear.toFixed(2)} [${c.tires.map((t) => `${t.wear.toFixed(2)}/${t.temp.toFixed(2)}`).join(" ")}] pos ${order(sess).indexOf(0) + 1}`);
    } else if (e.type !== "lap") console.log(`${sess.t.toFixed(1)}s`, JSON.stringify(e));
  }
  sess.events.length = 0;
}
console.log("finish", sess.finishOrder.join(" "), "t", sess.t.toFixed(0));
console.log("best", sess.bestLap.map((b) => b.toFixed(2)).join(" "));
console.log("wall frames", walls.join(" "), "hardest", hardest.toFixed(1));
console.log("bump frames", bumps.join(" "));
console.log(`car 0: top ${(top * 2.237).toFixed(0)} mph, slowest in the turns ${(turnLow * 2.237).toFixed(0)} mph, lap ${L.toFixed(0)} m`);
