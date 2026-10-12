// Meshy garbles lettering: SCOFTI came out as "SCORFF", "DUTTOO" or junk, numbers as "117" or "4J",
// and the roofs and hoods as made-up letters. This paints those panels over in each car's texture:
// plain lime fading out into the splatter at the edges, then clean lettering from lettering/ (made by
// lettering.mjs, with SCOFTI's I always barred). The game repaints lime to the picked color as usual,
// so the black lettering stays black on every color.
// Run: node art/meshy/fix-lettering.mjs [car ...]  → art/meshy/<car>-lettered.glb, then
// gltf-transform optimize each into public/models/<car>.glb. Check with flat.mjs.
import { NodeIO } from "@gltf-transform/core";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
const here = (f) => fileURLToPath(new URL(f, import.meta.url));

// the lettering, plus a soft halo around it: the area cleared to plain lime so the old junk doesn't
// show through, while the splatter further out stays
const letters = async (name) => {
  const file = here(`lettering/${name}.png`);
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const blurred = await sharp(file).ensureAlpha().extractChannel(3).blur(info.height * 0.1).raw().toBuffer();
  const halo = blurred.map((v) => Math.min(255, v * 6));
  return { data, halo, w: info.width, h: info.height };
};
const SCOFTI = await letters("scofti");
const NUM = { "17": await letters("17"), "43": await letters("43"), "3": await letters("3") };

// Each panel: which faces (by position p and face normal n), its flat "reading" frame (a to the
// right, b downwards, in model units), the area it may touch and where the lettering goes. A panel
// with box: true clears all of its area; the others clear only a halo round the new letters.
// The models: x runs front (−) to back (+), y up, z across.
const sideL = (clear, at, img, box = true) => ({ faces: (p, n) => n[2] > 0.55, frame: (p) => [p[0], -p[1]], clear, at, img, box });
const sideR = (clear, at, img, box = true) => ({ faces: (p, n) => n[2] < -0.55, frame: (p) => [-p[0], -p[1]], clear, at, img, box });
// the hood reads right from the driver's seat (the in-car view), the roof number from the right side
// (the grandstands); both were mirror images before. Their areas are given front-to-back as the
// model's x, and flipped into the reading frame here.
const flipB = ([a0, a1, b0, b1]) => [a0, a1, -b1, -b0];
const flipA = ([a0, a1, b0, b1]) => [-a1, -a0, b0, b1];
const hood = (clear, at) => ({ faces: (p, n) => n[1] > 0.5, frame: (p) => [-p[2], p[0]], clear: flipB(clear), at: flipB(at), img: SCOFTI, box: true });
const roof = (clear, at, img) => ({ faces: (p, n) => n[1] > 0.7, frame: (p) => [-p[0], -p[2]], clear: flipA(clear), at: flipA(at), img, box: true });
const rear = (clear, at) => ({ faces: (p, n) => n[0] > 0.55 && p[0] > 0.7, frame: (p) => [-p[2], -p[1]], clear, at, img: SCOFTI, box: true });

const CARS = {
  "car-17-modern": [
    sideL([0.1, 0.94, -0.125, 0.07], [0.1, 0.92, -0.125, 0.08], SCOFTI, false),
    sideR([-0.94, -0.1, -0.125, 0.07], [-0.92, -0.1, -0.125, 0.08], SCOFTI),
    // the right side's number came out "117"
    sideR([-0.19, 0.37, -0.11, 0.19], [-0.13, 0.33, -0.085, 0.175], NUM["17"]),
    rear([-0.32, 0.32, 0.0, 0.11], [-0.26, 0.26, -0.008, 0.122]),
    hood([-0.21, 0.21, 0.42, 0.82], [-0.26, 0.26, 0.555, 0.685]),
    roof([-0.08, 0.48, -0.3, 0.3], [-0.02, 0.44, -0.153, 0.153], NUM["17"]),
  ],
  "car-43-eighties": [
    sideL([0.18, 0.86, -0.11, 0.1], [0.17, 0.85, -0.1, 0.1], SCOFTI),
    sideR([-0.86, -0.18, -0.11, 0.1], [-0.85, -0.17, -0.1, 0.1], SCOFTI),
    sideL([-0.33, 0.23, -0.08, 0.2], [-0.33, 0.23, -0.07, 0.19], NUM["43"]),
    sideR([-0.23, 0.33, -0.08, 0.2], [-0.23, 0.33, -0.07, 0.19], NUM["43"]),
    hood([-0.27, 0.27, 0.38, 0.86], [-0.26, 0.26, 0.56, 0.69]),
    roof([-0.1, 0.42, -0.24, 0.24], [-0.06, 0.38, -0.147, 0.147], NUM["43"]),
    rear([-0.29, 0.29, -0.06, 0.1], [-0.24, 0.24, -0.04, 0.08]),
  ],
  "car-3-muscle": [
    sideL([0.22, 0.86, -0.11, 0.09], [0.2, 0.84, -0.1, 0.08], SCOFTI),
    sideR([-0.86, -0.22, -0.11, 0.09], [-0.84, -0.2, -0.1, 0.08], SCOFTI),
    sideL([-0.23, 0.15, -0.09, 0.18], [-0.2, 0.12, -0.08, 0.17], NUM["3"]),
    sideR([-0.15, 0.23, -0.09, 0.18], [-0.12, 0.2, -0.08, 0.17], NUM["3"]),
    hood([-0.27, 0.27, 0.38, 0.88], [-0.26, 0.26, 0.57, 0.7]),
    roof([-0.1, 0.42, -0.24, 0.24], [0.0, 0.32, -0.16, 0.16], NUM["3"]),
  ],
};

for (const car of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CARS)) {
const PANELS = CARS[car];
const doc = await new NodeIO().read(here(`${car}.glb`));
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const P = prim.getAttribute("POSITION").getArray();
const UV = prim.getAttribute("TEXCOORD_0").getArray();
const I = prim.getIndices().getArray();
const tex = prim.getMaterial().getBaseColorTexture();
const base = await sharp(Buffer.from(tex.getImage())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const T = base.data;
const W = base.info.width;
const H = base.info.height;


// the car's own lime, averaged from the texture
let lime = [0, 0, 0];
let count = 0;
for (let i = 0; i < T.length; i += 3 * 5) {
  const [r, g, b] = [T[i], T[i + 1], T[i + 2]];
  if (g > 180 && r > 140 && b < 90 && g > r) {
    lime[0] += r;
    lime[1] += g;
    lime[2] += b;
    count++;
  }
}
lime = lime.map((v) => v / count);


const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function shade(panel, pos, o) {
  const [a, b] = panel.frame(pos);
  const [a0, a1, b0, b1] = panel.clear;
  // boxes get a crisp edge (a clean decal panel); halos fade out
  const f = Math.min(a1 - a0, b1 - b0) * (panel.box ? 0.05 : 0.18);
  const inBox = smooth(a0, a0 + f, a) * smooth(a1, a1 - f, a) * smooth(b0, b0 + f, b) * smooth(b1, b1 - f, b);
  if (inBox <= 0) return;
  const [t0, t1, s0, s1] = panel.at;
  const u = (a - t0) / (t1 - t0);
  const v = (b - s0) / (s1 - s0);
  const { data, halo, w, h } = panel.img;
  const k = u >= 0 && u < 1 && v >= 0 && v < 1 ? Math.floor(v * h) * w + Math.floor(u * w) : -1;
  const clear = inBox * (panel.box ? 1 : k < 0 ? 0 : Math.min(1, halo[k] / 255));
  let rgb = [0, 1, 2].map((c) => T[o + c] + (lime[c] - T[o + c]) * clear);
  if (k >= 0) {
    const al = data[k * 4 + 3] / 255;
    rgb = rgb.map((c, i) => c + (data[k * 4 + i] - c) * al);
  }
  for (let c = 0; c < 3; c++) T[o + c] = Math.round(rgb[c]);
}

const done = new Uint8Array(W * H); // a texel shared by two faces is painted once
for (let t = 0; t < I.length; t += 3) {
  const k = [I[t], I[t + 1], I[t + 2]];
  const p = k.map((i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]);
  const e1 = p[1].map((v, i) => v - p[0][i]);
  const e2 = p[2].map((v, i) => v - p[0][i]);
  let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  const len = Math.hypot(...n) || 1;
  n = n.map((v) => v / len);
  const mid = [0, 1, 2].map((c) => (p[0][c] + p[1][c] + p[2][c]) / 3);
  const panels = PANELS.filter((pn) => pn.faces(mid, n));
  if (!panels.length) continue;
  const sx = k.map((i) => UV[i * 2] * W);
  const sy = k.map((i) => UV[i * 2 + 1] * H);
  const den = (sy[1] - sy[2]) * (sx[0] - sx[2]) + (sx[2] - sx[1]) * (sy[0] - sy[2]);
  if (Math.abs(den) < 1e-9) continue;
  const x0 = Math.max(0, Math.floor(Math.min(...sx)) - 1), x1 = Math.min(W - 1, Math.ceil(Math.max(...sx)) + 1);
  const y0 = Math.max(0, Math.floor(Math.min(...sy)) - 1), y1 = Math.min(H - 1, Math.ceil(Math.max(...sy)) + 1);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (done[y * W + x]) continue;
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((sy[1] - sy[2]) * (px - sx[2]) + (sx[2] - sx[1]) * (py - sy[2])) / den;
      const w1 = ((sy[2] - sy[0]) * (px - sx[2]) + (sx[0] - sx[2]) * (py - sy[2])) / den;
      const w2 = 1 - w0 - w1;
      // a little past the edge too, so no seams show between faces
      if (w0 < -0.15 || w1 < -0.15 || w2 < -0.15) continue;
      const pos = [0, 1, 2].map((c) => w0 * p[0][c] + w1 * p[1][c] + w2 * p[2][c]);
      done[y * W + x] = 1;
      for (const pn of panels) shade(pn, pos, (y * W + x) * 3);
    }
}

tex.setImage(new Uint8Array(await sharp(T, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 92 }).toBuffer()));
tex.setMimeType("image/jpeg");
await new NodeIO().write(here(`${car}-lettered.glb`), doc);
console.log(`${car}: lime ${lime.map((v) => v.toFixed(0))}, ${W}x${H}, saved ${car}-lettered.glb`);
}
