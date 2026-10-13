// SCOFTI Chips, the game's money (Michael, 2026-10-13: not cash or tokens; chips, "cause of poker
// chip"). Races pay chips, the pit garage spends them, and (later, in the app) packs of them can be
// bought. A chip is black and lime with SCOFTI stamped in the middle and checkered notches round the
// rim. Saved on this device (scofti500:chips); the old dollar balance (scofti500:cash) converts once,
// a tenth as many chips.
//
// Buying: the packs below. On the web nothing is sold yet ("coming soon in the app"); ?chiptest hands
// the chips over, to try the flow. The app stores (Google Play, Apple) plug in at buyPack.

const KEY = "scofti500:chips";
const OLD_CASH = "scofti500:cash";
export const STARTING_CHIPS = 250;

export type Pack = { id: string; name: string; chips: number; tag?: string };
export const PACKS: Pack[] = [
  { id: "stack", name: "STACK", chips: 500 },
  { id: "rack", name: "RACK", chips: 1500, tag: "POPULAR" },
  { id: "high-roller", name: "HIGH ROLLER", chips: 5000, tag: "BEST VALUE" },
];

export function chips(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== null) return Math.max(0, Number(raw) || 0);
    // first time on chips: bring the old dollars across
    const old = localStorage.getItem(OLD_CASH);
    const start = old !== null ? Math.round((Number(JSON.parse(old)) || 0) / 10) : STARTING_CHIPS;
    localStorage.setItem(KEY, String(start));
    localStorage.removeItem(OLD_CASH);
    return start;
  } catch {
    return STARTING_CHIPS;
  }
}

function set(n: number): void {
  try {
    localStorage.setItem(KEY, String(Math.max(0, Math.round(n))));
  } catch {
    // no storage: it just isn't remembered
  }
}

/** race winnings, or a pack bought */
export function earnChips(n: number): void {
  set(chips() + n);
}

/** spends them if there are enough; true when it went through */
export function spendChips(n: number): boolean {
  if (chips() < n) return false;
  set(chips() - n);
  return true;
}

/** buying a pack: the stores aren't hooked up yet, so only the ?chiptest switch hands them over */
export const canBuy = () => new URLSearchParams(location.search).has("chiptest");
export function buyPack(p: Pack): boolean {
  if (!canBuy()) return false;
  earnChips(p.chips);
  return true;
}

/** a chip, as inline SVG (size in px, or "1em" to sit in text) */
export function chipSvg(size: number | string = "1em"): string {
  const s = typeof size === "number" ? `${size}px` : size;
  // eight checkered notches round the rim, alternating white and lime
  const notches = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    const x = 50 + Math.cos(a) * 42;
    const y = 50 + Math.sin(a) * 42;
    return `<rect x="${x - 6}" y="${y - 8}" width="12" height="16" rx="2" fill="${i % 2 ? "#b6ff00" : "#fff"}" transform="rotate(${(a * 180) / Math.PI + 90} ${x} ${y})"/>`;
  }).join("");
  return `<svg class="chip" width="${s}" height="${s}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#0b0716" stroke="#b6ff00" stroke-width="4"/>${notches}<circle cx="50" cy="50" r="31" fill="#161026" stroke="#b6ff00" stroke-width="2" stroke-dasharray="4 3"/><text x="50" y="57" text-anchor="middle" font-family="Permanent Marker, cursive" font-size="20" fill="#fff">SCOFTI</text></svg>`;
}

/** an amount with the chip in front, as HTML */
export const chipAmount = (n: number, sign = "") => `<span class="chips-amt">${chipSvg()}${sign}${n.toLocaleString()}</span>`;
