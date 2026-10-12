// Paint colours for the cars. The car pictures are recoloured in the browser: every pixel in the car's
// key colour (lime on most, orange on the hooter) takes the new colour and keeps its own light and
// shade, so the splatter, the SCOFTI lettering and the reflections survive. Camo swaps the key colour
// for a woodland pattern. Results are cached per car + colour. The pick is saved per car
// (scofti500:paint, a JSON map of car id → colour id).

export type Paint = {
  id: string;
  label: string;
  /** what the swatch button shows (a CSS background); stock shows the car itself */
  swatch: string;
  /** target hue (deg), saturation and lightness (0–1); omitted for stock and camo */
  hsl?: [number, number, number];
  /** a camo pattern instead of a flat colour */
  camo?: keyof typeof CAMOS;
};

export const PAINTS: Paint[] = [
  { id: "stock", label: "stock", swatch: "var(--stock)" },
  { id: "red", label: "red", swatch: "#e0201f", hsl: [0, 0.85, 0.48] },
  { id: "blue", label: "blue", swatch: "#1f62e8", hsl: [220, 0.85, 0.5] },
  { id: "yellow", label: "yellow", swatch: "#ffd400", hsl: [50, 1, 0.5] },
  { id: "orange", label: "orange", swatch: "#ff7a1a", hsl: [25, 1, 0.55] },
  { id: "green", label: "green", swatch: "#1fae3a", hsl: [133, 0.7, 0.4] },
  { id: "purple", label: "purple", swatch: "#7b3fe0", hsl: [265, 0.75, 0.55] },
  { id: "pink", label: "pink", swatch: "#ff4fa3", hsl: [330, 1, 0.62] },
  { id: "white", label: "white", swatch: "#f2f2f2", hsl: [0, 0, 0.92] },
  { id: "black", label: "black", swatch: "#111", hsl: [0, 0, 0.07] },
  { id: "woods-camo", label: "woods camo", swatch: "radial-gradient(circle at 30% 30%, #565f34 0 22%, transparent 24%), radial-gradient(circle at 70% 65%, #705c3e 0 24%, transparent 26%), radial-gradient(circle at 25% 75%, #1e1e18 0 16%, transparent 18%), #34401f", camo: "woods" },
  { id: "white-camo", label: "white camo", swatch: "radial-gradient(circle at 30% 30%, #c4c8ce 0 22%, transparent 24%), radial-gradient(circle at 70% 65%, #969ba2 0 24%, transparent 26%), radial-gradient(circle at 25% 75%, #62666e 0 16%, transparent 18%), #eceef0", camo: "white" },
];

/** which hue band is the car's own paint: centre and half-width in degrees */
export type KeyHue = {
  hue: number;
  width: number;
  /** per view: where a number painted in the key colour sits; dark paints turn it silver so it still reads */
  numbers?: Record<number, [number, number, number, number][]>;
  /** per view: areas of the picture to leave alone (sky that matches the paint), as [x0, y0, x1, y1] fractions */
  skip?: Record<number, [number, number, number, number][]>;
};

const KEY = "scofti500:paint";

/** the car's saved colour, or its default if nothing (or a colour that no longer exists) is saved */
export function savedPaint(carId: string, fallback: string): string {
  try {
    const id = JSON.parse(localStorage.getItem(KEY) ?? "{}")[carId];
    return PAINTS.some((p) => p.id === id) ? id : fallback;
  } catch {
    return fallback;
  }
}

export function savePaint(carId: string, paintId: string): void {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    all[carId] = paintId;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // no storage: the colour just isn't remembered
  }
}

// ---- recolouring ----

const loaded = new Map<string, Promise<HTMLImageElement>>();
const done = new Map<string, string>();

function load(url: string): Promise<HTMLImageElement> {
  let p = loaded.get(url);
  if (!p) {
    p = new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = url;
    });
    loaded.set(url, p);
  }
  return p;
}

/** the car picture in this paint, as an image URL (the original URL for stock) */
export async function paintedUrl(url: string, key: KeyHue, paintId: string, view = 0): Promise<string> {
  const paint = PAINTS.find((p) => p.id === paintId);
  if (!paint || paint.id === "stock") return url;
  const cacheKey = `${url}|${paintId}`;
  const hit = done.get(cacheKey);
  if (hit) return hit;

  const img = await load(url);
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height);
  recolour(data, paint, key, key.skip?.[view] ?? [], key.numbers?.[view] ?? []);
  g.putImageData(data, 0, 0);
  const out = await new Promise<string>((res) =>
    c.toBlob((b) => res(b ? URL.createObjectURL(b) : url), "image/jpeg", 0.88),
  );
  done.set(cacheKey, out);
  return out;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type Rect = [number, number, number, number];

function recolour(data: ImageData, paint: Paint, key: KeyHue, skip: Rect[], numbers: Rect[]): void {
  const px = data.data;
  const w = data.width;
  const camo = paint.camo ? camoField(w, data.height, CAMOS[paint.camo]) : null;
  // the key paint's own typical lightness, so shading maps across
  const REF_L = 0.5;
  const h0 = data.height;
  const toPx = (rs: Rect[]) => rs.map(([x0, y0, x1, y1]) => [x0 * w, y0 * h0, x1 * w, y1 * h0]);
  const skips = toPx(skip);
  const nums = toPx(numbers);
  const dark = !camo && paint.hsl![2] < 0.3;
  for (let i = 0, n = 0; i < px.length; i += 4, n++) {
    const x = n % w;
    const y = (n / w) | 0;
    const inside = (rs: number[][]) => rs.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1);
    if (skips.length && inside(skips)) continue;
    const [h, s, l] = rgbToHsl(px[i], px[i + 1], px[i + 2]);
    let dh = Math.abs(h - key.hue);
    if (dh > 180) dh = 360 - dh;
    // how much this pixel is the car's paint: on-hue, coloured enough, not blown out or black.
    // Black reaches further into the dark, muddy edges so no green fringe is left behind.
    const width = dark ? key.width * 1.5 : key.width;
    const weight =
      (1 - smooth(width * 0.6, width, dh)) *
      (dark ? smooth(0.1, 0.25, s) : smooth(0.18, 0.4, s)) *
      (dark ? smooth(0.02, 0.06, l) : smooth(0.06, 0.16, l)) *
      (1 - smooth(0.92, 0.99, l));
    if (weight <= 0) continue;
    const shade = l / REF_L;
    let r: number, gg: number, b: number;
    if (camo) {
      const [cr, cg, cb] = camo[n];
      r = cr * shade;
      gg = cg * shade;
      b = cb * shade;
    } else {
      const [th, ts, tl] = paint.hsl!;
      if (dark && nums.length && inside(nums)) {
        // a number painted in the key colour goes silver so it still reads on a black car
        [r, gg, b] = hslToRgb(210, 0.06, Math.min(1, 0.74 * shade));
      } else if (dark) {
        // solid black: keep just a hint of the shine
        [r, gg, b] = hslToRgb(th, ts, tl * (0.7 + 0.3 * shade));
      } else {
        [r, gg, b] = hslToRgb(th, ts, Math.min(1, tl * shade));
      }
    }
    px[i] = px[i] + (Math.min(255, r) - px[i]) * weight;
    px[i + 1] = px[i + 1] + (Math.min(255, gg) - px[i + 1]) * weight;
    px[i + 2] = px[i + 2] + (Math.min(255, b) - px[i + 2]) * weight;
  }
}

// camo: four colours in soft blobs from two layers of value noise
type Rgb = [number, number, number];
const CAMOS = {
  woods: [
    [86, 96, 52], // olive
    [52, 64, 36], // dark green
    [112, 92, 62], // brown
    [30, 30, 24], // near black
  ] as Rgb[],
  white: [
    [236, 238, 240], // snow
    [196, 200, 206], // light grey
    [150, 155, 162], // mid grey
    [98, 102, 110], // slate
  ] as Rgb[],
};

function camoField(w: number, h: number, CAMO: Rgb[]): Rgb[] {
  const out: [number, number, number][] = new Array(w * h);
  const scale = Math.max(w, h) / 22;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = noise(x / scale, y / scale) * 0.7 + noise(x / (scale * 0.45) + 17, y / (scale * 0.45) + 5) * 0.3;
      out[y * w + x] = CAMO[v < 0.36 ? 0 : v < 0.5 ? 1 : v < 0.63 ? 2 : 3];
    }
  }
  return out;
}

function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g] = [c, x];
  else if (hp < 2) [r, g] = [x, c];
  else if (hp < 3) [g, b] = [c, x];
  else if (hp < 4) [g, b] = [x, c];
  else if (hp < 5) [r, b] = [x, c];
  else [r, b] = [c, x];
  const m = l - c / 2;
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
