// Flat pictures of a car model's paint from each side (orthographic, straight from the texture), to
// check the lettering without a browser. Run: node art/meshy/flat.mjs car-43-eighties [...]
// → art/meshy/flat/<name>-<view>.png
import { NodeIO } from "@gltf-transform/core";
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const here = (f) => fileURLToPath(new URL(f, import.meta.url));
mkdirSync(here("flat"), { recursive: true });

// each view: how a model point maps to the picture (right, down) and which way is "toward the camera"
const VIEWS = {
  left: { map: (p) => [p[0], -p[1]], depth: (p) => p[2] }, // looking at the +z side
  right: { map: (p) => [-p[0], -p[1]], depth: (p) => -p[2] },
  top: { map: (p) => [p[0], p[2]], depth: (p) => p[1] },
  rear: { map: (p) => [-p[2], -p[1]], depth: (p) => p[0] },
};

for (const name of process.argv.slice(2)) {
  const doc = await new NodeIO().read(here(`${name}.glb`));
  const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
  const P = prim.getAttribute("POSITION").getArray();
  const UV = prim.getAttribute("TEXCOORD_0").getArray();
  const I = prim.getIndices().getArray();
  const img = await sharp(Buffer.from(prim.getMaterial().getBaseColorTexture().getImage())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const T = img.data, TW = img.info.width, TH = img.info.height;
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < P.length; i += 3) for (let c = 0; c < 3; c++) (lo[c] = Math.min(lo[c], P[i + c])), (hi[c] = Math.max(hi[c], P[i + c]));
  for (const [vn, v] of Object.entries(VIEWS)) {
    const corners = [];
    for (const x of [lo[0], hi[0]]) for (const y of [lo[1], hi[1]]) for (const z of [lo[2], hi[2]]) corners.push(v.map([x, y, z]));
    const a0 = Math.min(...corners.map((c) => c[0])), a1 = Math.max(...corners.map((c) => c[0]));
    const b0 = Math.min(...corners.map((c) => c[1])), b1 = Math.max(...corners.map((c) => c[1]));
    const W = 1400, H = Math.round((W * (b1 - b0)) / (a1 - a0));
    const out = Buffer.alloc(W * H * 3, 40);
    const zb = new Float32Array(W * H).fill(-Infinity);
    for (let t = 0; t < I.length; t += 3) {
      const k = [I[t], I[t + 1], I[t + 2]];
      const p = k.map((i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]);
      const s = p.map((q) => v.map(q)).map(([a, b]) => [((a - a0) / (a1 - a0)) * W, ((b - b0) / (b1 - b0)) * H]);
      const d = p.map((q) => v.depth(q));
      const den = (s[1][1] - s[2][1]) * (s[0][0] - s[2][0]) + (s[2][0] - s[1][0]) * (s[0][1] - s[2][1]);
      if (Math.abs(den) < 1e-9) continue;
      const x0 = Math.max(0, Math.floor(Math.min(s[0][0], s[1][0], s[2][0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(s[0][0], s[1][0], s[2][0])));
      const y0 = Math.max(0, Math.floor(Math.min(s[0][1], s[1][1], s[2][1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(s[0][1], s[1][1], s[2][1])));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5;
          const w0 = ((s[1][1] - s[2][1]) * (px - s[2][0]) + (s[2][0] - s[1][0]) * (py - s[2][1])) / den;
          const w1 = ((s[2][1] - s[0][1]) * (px - s[2][0]) + (s[0][0] - s[2][0]) * (py - s[2][1])) / den;
          const w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          const z = w0 * d[0] + w1 * d[1] + w2 * d[2];
          if (z <= zb[y * W + x]) continue;
          zb[y * W + x] = z;
          const u = w0 * UV[k[0] * 2] + w1 * UV[k[1] * 2] + w2 * UV[k[2] * 2];
          const vv = w0 * UV[k[0] * 2 + 1] + w1 * UV[k[1] * 2 + 1] + w2 * UV[k[2] * 2 + 1];
          const tx = Math.min(TW - 1, Math.max(0, Math.floor(u * TW))), ty = Math.min(TH - 1, Math.max(0, Math.floor(vv * TH)));
          for (let c = 0; c < 3; c++) out[(y * W + x) * 3 + c] = T[(ty * TW + tx) * 3 + c];
        }
    }
    await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toFile(here(`flat/${name}-${vn}.png`));
  }
  console.log(name, "done", `x ${lo[0].toFixed(2)}..${hi[0].toFixed(2)} y ${lo[1].toFixed(2)}..${hi[1].toFixed(2)} z ${lo[2].toFixed(2)}..${hi[2].toFixed(2)}`);
}
