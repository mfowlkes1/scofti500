// The tracks, in numbers. Every track is two big turns joined by a backstretch, and a front stretch
// that's either straight (a paperclip, Martinsvale) or kinked out in the middle (a tri-oval, Hotlanta).
// The rest of the race reads the current track from here (setTrack picks it), so the values below
// are live: S, R, L and the rest change when the track does.
//
// Martinsvale (Michael, 2026-10-12: "race martinsvale under the lights"): a half-mile paperclip. Two
// 240 m straights joined by two tight 180° turns, concrete in the turns, 12° of banking in them and
// none on the straights.
// Hotlanta (Michael, 2026-10-12: tri-oval, day, "Hotlanta"): about a mile and a half. Long, sweeping
// 30° turns (steep enough to run three-wide in a pack with grip to spare), 5° on the straights, and the start/finish line out on the tri-oval's kink. Flat out in
// a pack and the draft is everything.
//
// Positions on the track are (s, d): s is meters along the centerline from the start of the front
// stretch (cars run counterclockwise seen from above, so every turn is a left), d is meters across
// it, + toward the outside wall. World x/z: the front stretch runs along +x on the +z side, the turns'
// centers are at (±S/2, 0), and the backstretch runs along -x at z = -R.

export type TrackDef = {
  id: string;
  /** the backstretch, and the distance between the two turns' centers */
  S: number;
  /** centerline radius of the turns */
  R: number;
  bankDeg: number;
  /** banking on the straights */
  straightBankDeg: number;
  /** a tri-oval: the kink in the front stretch, its radius and how far it turns */
  dogleg?: { r: number; deg: number };
  /** pit road: the pit wall (s), the limiter (m/s), where the AI starts down for it (m before the
   * line s = 0) and where the entry lane leaves the apron (m before s = 0) */
  pit: { wallFrom: number; wallTo: number; speed: number; dive: number; link: number; gap: number };
  /** how many cars start, you included */
  field: number;
  /** how much of the grip the drivers' speed plan uses in the turns: a pack needs room to spare */
  aiGrip: number;
  /** air drag (1 = Martinsvale): the big track's cars carry a draggier aero package */
  drag: number;
  night: boolean;
  concreteTurns: boolean;
};

export const TRACK_DEFS: Record<string, TrackDef> = {
  martinsvale: {
    id: "martinsvale",
    S: 240,
    R: 58,
    bankDeg: 12,
    straightBankDeg: 0,
    // a full short-track field (Michael, 2026-10-13: "load up the martinsville race with cars"); the
    // boxes packed tight to fit them all along the pit wall
    pit: { wallFrom: 22, wallTo: 222, speed: 15.6, dive: 95, link: 70, gap: 9.5 },
    field: 20,
    aiGrip: 0.97,
    drag: 1,
    night: true,
    concreteTurns: true,
  },
  hotlanta: {
    id: "hotlanta",
    S: 640,
    R: 185,
    bankDeg: 30,
    straightBankDeg: 5,
    dogleg: { r: 800, deg: 36 },
    // a full field (Michael, 2026-10-13: "give it full nascar"... "35"), so the boxes are packed tight
    pit: { wallFrom: 60, wallTo: 420, speed: 24.6, dive: 260, link: 180, gap: 9.5 },
    field: 35,
    aiGrip: 0.86,
    drag: 1,
    night: false,
    concreteTurns: false,
  },
};

export const HALF = 8; // racing surface: d from -HALF to +HALF; the outside wall is at +HALF
export const APRON = -12.5; // flat apron from here to -HALF
/** inside limit: how far down the track a car can go at s (the pit wall and the infield fence) */
export const INFIELD = -26;

// pit road: inside the front stretch, behind a wall. The cross-section is the same on every track;
// where it runs along the track and the limiter come from the track.
export const PIT = {
  wallFrom: 22, // the pit wall runs from here...
  wallTo: 222, // ...to here, along the front stretch
  wallIn: -11.6, // its pit-road face (d)
  wallOut: -10.8, // its track face (d)
  lane: -13.4, // where cars drive down pit road
  box: -15.9, // where they stop in their box, out of the way
  inner: -17.5, // the far wall of pit road
  speed: 15.6, // the limiter: 35 mph at Martinsvale
  dive: 95,
  link: 70,
  gap: 20, // between the boxes
  stall: (i: number) => PIT.wallFrom + 24 + i * PIT.gap, // s of each team's box
};

export let TRACK: TrackDef = TRACK_DEFS.martinsvale;
export let S = 0; // backstretch length
export let R = 0; // turn radius
export let L = 0; // one lap
export let LINE_S = 0; // the start/finish line, the middle of the front stretch
export let BANK = 0;
export let STRAIGHT_BANK = 0;
/** the two big turns, as [start, end] in s */
export let TURNS: [number, number][] = [];
/** how far the track reaches in x and z, for the map */
export let BOUNDS = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };

// the centerline as pieces: straights (from a point, along a heading) and arcs (round a center,
// phi going down as s goes up, so every turn is a left)
type Piece =
  | { kind: "line"; s0: number; len: number; x: number; z: number; tx: number; tz: number }
  | { kind: "arc"; s0: number; len: number; cx: number; cz: number; r: number; phi0: number; arc: number };
let pieces: Piece[] = [];

const listeners: (() => void)[] = [];
/** run fn now and again whenever the track changes (for anything worked out from the track) */
export function onTrack(fn: () => void): void {
  listeners.push(fn);
  fn();
}

export function setTrack(id: string): void {
  const t = TRACK_DEFS[id] ?? TRACK_DEFS.martinsvale;
  if (t === TRACK && pieces.length) return;
  TRACK = t;
  S = t.S;
  R = t.R;
  BANK = (t.bankDeg * Math.PI) / 180;
  STRAIGHT_BANK = (t.straightBankDeg * Math.PI) / 180;
  Object.assign(PIT, t.pit);
  pieces = [];
  let s = 0;
  const line = (x: number, z: number, tx: number, tz: number, len: number) => {
    pieces.push({ kind: "line", s0: s, len, x, z, tx, tz });
    s += len;
  };
  const arc = (cx: number, cz: number, r: number, phi0: number, sweep: number, id: number) => {
    pieces.push({ kind: "arc", s0: s, len: r * sweep, cx, cz, r, phi0, arc: id });
    s += r * sweep;
  };
  const dl = t.dogleg;
  // h: half the kink's turn; the big turns give up that much each
  const h = dl ? (dl.deg * Math.PI) / 360 : 0;
  if (dl) {
    // the front stretch: up to the kink, round it, and down to turn 1, each straight tangent to both
    const sh = Math.sin(h);
    const ch = Math.cos(h);
    const zd = R * ch - dl.r * ch + ((S / 2 + (R - dl.r) * sh) * sh) / ch; // the kink's center
    const ex = S / 2 + R * sh; // where turn 1 starts (and, mirrored, where turn 4 ends)
    const ez = R * ch;
    const px = dl.r * sh; // where the kink ends (and, mirrored, starts)
    const pz = zd + dl.r * ch;
    const a = (ex - px) * ch + (pz - ez) * sh;
    line(-ex, ez, ch, sh, a);
    arc(0, zd, dl.r, Math.PI / 2 + h, 2 * h, 3);
    line(px, pz, ch, -sh, a);
    LINE_S = a + dl.r * h;
  } else {
    line(-S / 2, R, 1, 0, S);
    LINE_S = S / 2;
  }
  const t1 = s;
  arc(S / 2, 0, R, Math.PI / 2 - h, Math.PI - h, 1);
  line(S / 2, -R, -1, 0, S);
  const t3 = s;
  arc(-S / 2, 0, R, -Math.PI / 2, Math.PI - h, 2);
  L = s;
  TURNS = [
    [t1, t1 + R * (Math.PI - h)],
    [t3, L],
  ];
  BOUNDS = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (let k = 0; k < L; k += 4) {
    const f = frame(k);
    BOUNDS.minX = Math.min(BOUNDS.minX, f.x);
    BOUNDS.maxX = Math.max(BOUNDS.maxX, f.x);
    BOUNDS.minZ = Math.min(BOUNDS.minZ, f.z);
    BOUNDS.maxZ = Math.max(BOUNDS.maxZ, f.z);
  }
  for (const fn of listeners) fn();
}

export type Frame = { x: number; z: number; tx: number; tz: number; nx: number; nz: number; arc: number; r: number };

/** where (s, d) is in the world, the direction of travel there (tx, tz) and the outward normal
 * (nx, nz). arc is which turn (1 = turns 1-2, 2 = turns 3-4, 3 = a tri-oval's kink) or 0 on a
 * straight, and r its radius (0 on a straight). */
export function frame(s: number, d = 0): Frame {
  s = wrap(s);
  let p = pieces[pieces.length - 1];
  for (const q of pieces) {
    if (s < q.s0 + q.len) {
      p = q;
      break;
    }
  }
  const u = s - p.s0;
  if (p.kind === "line") {
    // the outward normal is to the right of the heading
    const nx = -p.tz;
    const nz = p.tx;
    return { x: p.x + p.tx * u + nx * d, z: p.z + p.tz * u + nz * d, tx: p.tx, tz: p.tz, nx, nz, arc: 0, r: 0 };
  }
  const phi = p.phi0 - u / p.r;
  const nx = Math.cos(phi);
  const nz = Math.sin(phi);
  return { x: p.cx + (p.r + d) * nx, z: p.cz + (p.r + d) * nz, tx: nz, tz: -nx, nx, nz, arc: p.arc, r: p.r };
}

/** the (s, d) of a world point: the closest piece it lies alongside */
export function project(x: number, z: number): { s: number; d: number } {
  let best = { s: 0, d: Infinity };
  let bestScore = Infinity;
  for (const p of pieces) {
    let u: number;
    let d: number;
    if (p.kind === "line") {
      u = (x - p.x) * p.tx + (z - p.z) * p.tz;
      d = (x - p.x) * -p.tz + (z - p.z) * p.tx;
    } else {
      const phi = Math.atan2(z - p.cz, x - p.cx);
      // how far round from the start, 0..2π, then back into -π..π about the piece's middle
      let a = (((p.phi0 - phi) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const mid = p.len / p.r / 2;
      if (a - mid > Math.PI) a -= 2 * Math.PI;
      u = a * p.r;
      d = Math.hypot(x - p.cx, z - p.cz) - p.r;
    }
    if (u < -0.5 || u > p.len + 0.5) continue;
    // a hair past a piece's end still counts (the pieces meet smoothly), but the piece it's really on wins
    const score = Math.abs(d) + (u < 0 || u > p.len ? 1e-3 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = { s: wrap(p.s0 + u), d };
    }
  }
  return best;
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
 * concrete fade in round each turn, over 30 m at Martinsvale and longer on a big track's steep turns */
export function turnAmount(s: number): number {
  s = wrap(s);
  const ramp = Math.max(30, R * 0.5);
  const into = (a: number, b: number, x: number) => smooth(a - ramp, a + ramp * 0.5, x) * (1 - smooth(b - ramp * 0.5, b + ramp, x));
  let k = 0;
  // turns 3-4 end at the line, s = L, so look a lap either way too
  for (const [a, b] of TURNS) k = Math.max(k, into(a, b, s), into(a, b, s + L), into(a, b, s - L));
  return k;
}

export const bankAt = (s: number) => STRAIGHT_BANK + (BANK - STRAIGHT_BANK) * turnAmount(s);

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
  // pit road's entry and exit cut across the apron and grass at the ends of the front stretch
  if (onPitLink(s, d)) return "pit";
  return "grass";
}

/** pit road's far wall (its d) at s: down the inside of the entry lane, along the boxes and up the
 * inside of the exit lane, so there's a wall on your left all the way through; null where there's none */
export function pitFarWall(s: number): number | null {
  s = wrap(s);
  const edge = PIT.inner - 0.4;
  const rise = APRON - PIT.inner - 1;
  const link = PIT.link + 5;
  if (s > L - link) return edge + ((L - s) / link) * rise;
  if (s <= PIT.wallTo + 13) return edge;
  if (s < PIT.wallTo + 80) return edge + ((s - PIT.wallTo - 13) / 67) * rise;
  return null;
}

/** on the pit lane itself, behind the pit wall */
export function inPitRoad(s: number, d: number): boolean {
  s = wrap(s);
  return s > PIT.wallFrom - 12 && s < PIT.wallTo + 12 && d < PIT.wallIn + 0.6 && d > PIT.inner - 0.5;
}

function onPitLink(s: number, d: number): boolean {
  s = wrap(s);
  const into = s > L - PIT.link || s < PIT.wallFrom;
  const out = s > PIT.wallTo && s < PIT.wallTo + 70;
  return (into || out) && d < APRON && d > PIT.inner - 1;
}

setTrack("martinsvale");
