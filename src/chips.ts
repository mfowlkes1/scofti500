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

// named for the flags, in race order: green starts it, white's the last lap, checkered wins it (Michael,
// 2026-10-13: racing, not casino)
export type Pack = { id: string; name: string; chips: number; flag: "green" | "white" | "checkered"; tag?: string };
export const PACKS: Pack[] = [
  { id: "green-flag", name: "GREEN FLAG", chips: 500, flag: "green" },
  { id: "white-flag", name: "WHITE FLAG", chips: 1500, flag: "white", tag: "POPULAR" },
  { id: "checkered-flag", name: "CHECKERED FLAG", chips: 5000, flag: "checkered", tag: "BEST VALUE" },
];

/** a racing flag on a pole, as inline SVG */
export function flagSvg(flag: Pack["flag"], size = 44): string {
  let cloth: string;
  if (flag === "checkered") {
    const cells: string[] = [];
    for (let y = 0; y < 4; y++) for (let x = 0; x < 5; x++) if ((x + y) % 2 === 0) cells.push(`<rect x="${12 + x * 7.2}" y="${8 + y * 7}" width="7.2" height="7" fill="#111"/>`);
    cloth = `<path d="M12 8 Q30 2 48 8 V36 Q30 30 12 36 Z" fill="#fff"/>${cells.join("")}`;
  } else {
    cloth = `<path d="M12 8 Q30 2 48 8 V36 Q30 30 12 36 Z" fill="${flag === "green" ? "#19c43b" : "#fff"}"/>`;
  }
  return `<svg class="flag" width="${size}" height="${size}" viewBox="0 0 52 60" aria-hidden="true"><rect x="9" y="4" width="3" height="54" rx="1.5" fill="#c9cdd3"/>${cloth}<path d="M12 8 Q30 2 48 8 V36 Q30 30 12 36 Z" fill="none" stroke="#0b0716" stroke-width="2"/></svg>`;
}

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

/** a chip, as inline SVG (size in px, or "1em" to sit in text). A real poker chip: bright lime with a
 * black edge and big white edge spots, a black middle with the stamp and a shine across the top. Big
 * ones say SCOFTI; small ones (in prices) a bold S, since the word can't be read that small (Michael,
 * 2026-10-13: the dark ones didn't stand out) */
export function chipSvg(size: number | string = "1em", big = typeof size === "number" && size >= 40): string {
  const s = typeof size === "number" ? `${size}px` : size;
  const spots = Array.from({ length: 6 }, (_, i) => `<rect x="43" y="4" width="14" height="14" rx="2.5" fill="#fff" transform="rotate(${i * 60} 50 50)"/>`).join("");
  const stamp = big
    ? `<text x="50" y="56" text-anchor="middle" font-family="Permanent Marker, cursive" font-size="17" fill="#fff">SCOFTI</text>`
    : `<text x="50" y="65" text-anchor="middle" font-family="Permanent Marker, cursive" font-size="44" fill="#b6ff00">S</text>`;
  return `<svg class="chip" width="${s}" height="${s}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#b6ff00" stroke="#0b0716" stroke-width="6"/>${spots}<circle cx="50" cy="50" r="31" fill="#0b0716"/><circle cx="50" cy="50" r="26" fill="none" stroke="#b6ff00" stroke-width="2" stroke-dasharray="5 4"/>${stamp}<path d="M17 36 A35 35 0 0 1 38 15" stroke="#fff" stroke-opacity=".6" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;
}

/** an amount with the chip in front, as HTML */
export const chipAmount = (n: number, sign = "") => `<span class="chips-amt">${chipSvg()}${sign}${n.toLocaleString()}</span>`;
