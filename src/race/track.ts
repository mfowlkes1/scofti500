// Martinsvale, in numbers: a half-mile paperclip (Michael, 2026-10-12: "race martinsvale under the
// lights"). Two 240 m straights joined by two tight 180° turns, concrete in the turns, asphalt on the
// straights, 12° of banking in the turns and none on the straights. Pit road runs inside the front
// straight behind a low wall.
//
// Positions on the track are (s, d): s is meters along the centerline from the start of the front
// straight (cars run counterclockwise seen from above, so every turn is a left), d is meters across
// it, + toward the outside wall. World x/z: the front straight runs along +x at z = +R.

export const S = 240; // straight length
export const R = 58; // centerline radius of the turns
export const L = 2 * S + 2 * Math.PI * R; // one lap, ~844 m
export const HALF = 8; // racing surface: d from -HALF to +HALF; the outside wall is at +HALF
export const APRON = -12.5; // flat apron from here to -HALF
export const LINE_S = S / 2; // start/finish line, the middle of the front straight
export const BANK = (12 * Math.PI) / 180;

// pit road: inside the front straight, behind a wall
export const PIT = {
  wallFrom: 22, // the pit wall runs from here...
  wallTo: 222, // ...to here, along the front straight
  wallIn: -11.6, // its pit-road face (d)
  wallOut: -10.8, // its track face (d)
  lane: -13.4, // where cars drive down pit road
  box: -15.9, // where they stop in their box, out of the way
  inner: -17.5, // the far wall of pit road
  speed: 15.6, // the limiter: 35 mph
  stall: (i: number) => 46 + i * 20, // s of each team's box
};

export type Frame = { x: number; z: number; tx: number; tz: number; nx: number; nz: number; arc: number };

/** where (s, d) is in the world, the direction of travel there (tx, tz) and the outward normal
 * (nx, nz). arc is which turn (1 = turns 1-2, 2 = turns 3-4) or 0 on a straight. */
export function frame(s: number, d = 0): Frame {
  s = wrap(s);
  if (s < S) {
    // front straight, heading +x
    return { x: s - S / 2, z: R + d, tx: 1, tz: 0, nx: 0, nz: 1, arc: 0 };
  }
  if (s < S + Math.PI * R) {
    const phi = Math.PI / 2 - (s - S) / R;
    const nx = Math.cos(phi);
    const nz = Math.sin(phi);
    return { x: S / 2 + (R + d) * nx, z: (R + d) * nz, tx: nz, tz: -nx, nx, nz, arc: 1 };
  }
  if (s < 2 * S + Math.PI * R) {
    const u = s - S - Math.PI * R;
    return { x: S / 2 - u, z: -(R + d), tx: -1, tz: 0, nx: 0, nz: -1, arc: 0 };
  }
  const phi = -Math.PI / 2 - (s - 2 * S - Math.PI * R) / R;
  const nx = Math.cos(phi);
  const nz = Math.sin(phi);
  return { x: -S / 2 + (R + d) * nx, z: (R + d) * nz, tx: nz, tz: -nx, nx, nz, arc: 2 };
}

/** the (s, d) of a world point */
export function project(x: number, z: number): { s: number; d: number } {
  if (x >= -S / 2 && x <= S / 2) {
    if (z >= 0) return { s: x + S / 2, d: z - R };
    return { s: S + Math.PI * R + (S / 2 - x), d: -z - R };
  }
  if (x > S / 2) {
    const phi = Math.atan2(z, x - S / 2);
    return { s: S + (Math.PI / 2 - phi) * R, d: Math.hypot(x - S / 2, z) - R };
  }
  const phi = Math.atan2(z, x + S / 2);
  const t = (((-Math.PI / 2 - phi) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return { s: 2 * S + Math.PI * R + t * R, d: Math.hypot(x + S / 2, z) - R };
}

export const wrap = (s: number) => ((s % L) + L) % L;
/** how far b is ahead of a along the track, -L/2..L/2 */
export function gap(a: number, b: number): number {
  let g = wrap(b - a);
  if (g > L / 2) g -= L;
  return g;
}

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** how far into a turn s is, 0 on the straights, 1 through the middle of the turns: banking and
 * concrete fade in over 30 m around each turn */
export function turnAmount(s: number): number {
  s = wrap(s);
  const ramp = 30;
  const t1a = S;
  const t1b = S + Math.PI * R;
  const t2a = 2 * S + Math.PI * R;
  const t2b = L;
  const into = (a: number, b: number, x: number) => smooth(a - ramp, a + ramp * 0.5, x) * (1 - smooth(b - ramp * 0.5, b + ramp, x));
  // turns 3-4 wrap past the line at s = L
  return Math.max(into(t1a, t1b, s), into(t2a, t2b, s), into(t2a, t2b, s + L));
}

export const bankAt = (s: number) => BANK * turnAmount(s);

/** height of the surface: the banked track rises toward the wall; the apron and infield are flat */
export function heightAt(s: number, d: number): number {
  const b = bankAt(s);
  if (b <= 0) return 0;
  return Math.max(0, Math.min(d, HALF + 1) + HALF) * Math.tan(b);
}

export type Surface = "track" | "apron" | "pit" | "grass";

export function surfaceAt(s: number, d: number): Surface {
  if (d >= -HALF) return "track";
  if (d >= APRON) return "apron";
  if (inPitRoad(s, d)) return "pit";
  // pit road's entry and exit cut across the apron and grass at the ends of the front straight
  if (onPitLink(s, d)) return "pit";
  return "grass";
}

/** on the pit lane itself, behind the pit wall */
export function inPitRoad(s: number, d: number): boolean {
  s = wrap(s);
  return s > PIT.wallFrom - 12 && s < PIT.wallTo + 12 && d < PIT.wallIn + 0.6 && d > PIT.inner - 0.5;
}

function onPitLink(s: number, d: number): boolean {
  s = wrap(s);
  const into = s > L - 70 || s < PIT.wallFrom;
  const out = s > PIT.wallTo && s < PIT.wallTo + 70;
  return (into || out) && d < APRON && d > PIT.inner - 1;
}

/** inside limit: how far down the track a car can go at s (the pit wall and the infield fence) */
export const INFIELD = -26;
