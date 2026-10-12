// Runs a whole race with no screen and prints how it went: lap times, tyre wear, pit stops, wall
// hits, bumps. For tuning the physics and the drivers. Run: npx tsx tools/sim.ts [laps]
import { STOCK } from "../src/race/physics";
import { createSession, order, stepSession, type Entry } from "../src/race/session";

const laps = Number(process.argv[2] ?? 30);
const entries: Entry[] = Array.from({ length: 8 }, (_, i) => ({
  name: `car${i}`,
  number: String(i),
  carId: "",
  paintId: "",
  spec: STOCK,
  skill: 0.985 - i * 0.008,
  aggression: (i % 3) / 2,
}));
const sess = createSession(entries, laps);
const dt = 1 / 120;
const walls = new Array(8).fill(0);
const bumps = new Array(8).fill(0);
let hardest = 0;
while (sess.finishOrder.length < 8 && sess.t < laps * 40 + 200) {
  stepSession(sess, null, dt);
  sess.cars.forEach((c, i) => {
    if (c.scrape > 1) walls[i]++;
    if (c.bump > 2) bumps[i]++;
    hardest = Math.max(hardest, c.scrape);
  });
  for (const e of sess.events) {
    if (e.type === "lap" && e.car === 0) {
      const c = sess.cars[0];
      console.log(`lap ${sess.crossed[0]}: ${sess.lastLap[0].toFixed(2)}s wear ${c.wear.toFixed(2)} [${c.tyres.map((t) => `${t.wear.toFixed(2)}/${t.temp.toFixed(2)}`).join(" ")}] pos ${order(sess).indexOf(0) + 1}`);
    } else if (e.type !== "lap") console.log(`${sess.t.toFixed(1)}s`, JSON.stringify(e));
  }
  sess.events.length = 0;
}
console.log("finish", sess.finishOrder.join(" "), "t", sess.t.toFixed(0));
console.log("best", sess.bestLap.map((b) => b.toFixed(2)).join(" "));
console.log("wall frames", walls.join(" "), "hardest", hardest.toFixed(1));
console.log("bump frames", bumps.join(" "));
