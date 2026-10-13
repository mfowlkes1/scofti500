// The drivers' colors (Michael, 2026-10-13: a color selector "to keep attention there an extra minute
// or two", and "that color will transfer to the car"). Picking a color repaints her race suit in her
// picture: only the suit's own colors change (found by hue, below her head), so her skin, hair, lips
// and the white SCOFTI lettering stay as they are; a two-tone suit keeps its second tone as trim. The same
// color becomes her car's paint.
import { PAINTS } from "./paint";
import { fullUrl, type Driver } from "./roster";

/** the colors on offer: her own (stock), then the car paints that work on cloth (no camo) */
export const SUIT_PAINTS = PAINTS.filter((p) => !p.camo);

// each suit's colors, as hue windows (degrees), the first one her main color: measured off her
// picture (red sits just below skin tones, so its window stops short of them)
// (light: how bright her main color is, so a new color comes out as bright as it should, a dark green
// turning a real red rather than maroon)
const SUITS: Record<string, { windows: [number, number][]; main: number; light: number; swatch: string; paint: string }> = {
  raven: { windows: [[338, 6]], main: 355, light: 0.42, swatch: "#1b1b1f", paint: "black" },
  reba: { windows: [[338, 6]], main: 357, light: 0.45, swatch: "#d81f26", paint: "red" },
  lynx: { windows: [[315, 348]], main: 330, light: 0.55, swatch: "#ff2f8f", paint: "pink" },
  maia: { windows: [[125, 165], [195, 235]], main: 145, light: 0.22, swatch: "#1f8a3a", paint: "green" },
  paige: { windows: [[130, 170], [200, 235]], main: 150, light: 0.22, swatch: "#1f8a4a", paint: "green" },
};

/** the swatch for "her own colors" */
export const ownSwatch = (d: Driver) => SUITS[d.id]?.swatch ?? "#888";

/** the car paint her color gives: the color picked, or for her own suit the paint nearest it */
export const carPaintFor = (d: Driver, suit: string) => (suit === "stock" ? (SUITS[d.id]?.paint ?? "stock") : suit);

const KEY = "scofti500:suit";
export function savedSuit(d: Driver): string {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, string>;
    return SUIT_PAINTS.some((p) => p.id === all[d.id]) ? all[d.id] : "stock";
  } catch {
    return "stock";
  }
}
export function saveSuit(d: Driver, paint: string): void {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, string>;
    all[d.id] = paint;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // not remembered
  }
}

const inWindow = (h: number, [a, b]: [number, number]) => (a <= b ? h >= a && h <= b : h >= a || h <= b);

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return [h, s, l];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m];
}

const made = new Map<string, Promise<string>>();
const load = (src: string) =>
  new Promise<HTMLImageElement>((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = fail;
    img.src = src;
  });

/** her full picture in a suit color (a blob URL; her own picture for her own colors) */
export function suitUrl(d: Driver, paintId: string): Promise<string> {
  const suit = SUITS[d.id];
  const paint = SUIT_PAINTS.find((p) => p.id === paintId);
  if (!suit || !paint || paint.id === "stock") return Promise.resolve(fullUrl(d));
  const key = `${d.id}|${paintId}`;
  let job = made.get(key);
  if (job) return job;
  job = load(fullUrl(d))
    .then(async (img) => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const g = c.getContext("2d", { willReadFrequently: true })!;
      g.drawImage(img, 0, 0);
      const data = g.getImageData(0, 0, c.width, c.height);
      const px = data.data;
      const shift = (paint.hsl?.[0] ?? 0) - suit.main;
      // below her head only: lips and makeup can share the suit's hue
      const from = Math.floor(c.height * 0.18) * c.width * 4;
      for (let i = from; i < px.length; i += 4) {
        if (px[i + 3] < 8) continue;
        const [h, s, l] = rgbToHsl(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255);
        if (s < 0.35 || l < 0.08 || l > 0.9) continue;
        const w = suit.windows.findIndex((win) => inWindow(h, win));
        // her main color takes the new one; a second tone (Maia and Paige's blue) stays as a trim,
        // except going all black or white
        if (w < 0 || (w > 0 && paint.id !== "black" && paint.id !== "white")) continue;
        let out: [number, number, number];
        if (paint.id === "black") out = hslToRgb(h, s * 0.12, l * 0.32);
        else if (paint.id === "white") out = hslToRgb(h, s * 0.06, 0.74 + l * 0.24);
        else out = hslToRgb((h + shift + 720) % 360, Math.min(1, s * 1.15), Math.min(0.88, l * ((paint.hsl?.[2] ?? 0.5) / suit.light)));
        px[i] = out[0] * 255;
        px[i + 1] = out[1] * 255;
        px[i + 2] = out[2] * 255;
      }
      g.putImageData(data, 0, 0);
      const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/webp", 0.9));
      return blob ? URL.createObjectURL(blob) : fullUrl(d);
    })
    .catch(() => fullUrl(d));
  made.set(key, job);
  return job;
}
