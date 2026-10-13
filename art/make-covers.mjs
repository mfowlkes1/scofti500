// The covers with the drivers lined up across the bottom (the scofti agent, 2026-10-13: the all-women
// line-up is the hook, so the arcade shelf should show it too). The tall shelf cover keeps its top
// third plain sky, because the shelf puts the title there; the wide one is for shares.
// Run: node art/make-covers.mjs → public/img/cover-portrait.jpg and cover.jpg
import sharp from "sharp";

const ORDER = ["maia", "lynx", "reba", "raven", "paige"]; // Reba in the middle, as on the title
const DRIVERS = "public/img/drivers";

/** the drivers side by side on a background, the middle one a step forward */
async function lineup(background, out, { width, height, lineHeight, bottom, overlap }) {
  const comps = [];
  const sized = [];
  for (const [k, id] of ORDER.entries()) {
    const scale = k === 2 ? 1 : k === 1 || k === 3 ? 0.96 : 0.92;
    const h = Math.round(lineHeight * scale);
    const buf = await sharp(`${DRIVERS}/${id}-full.webp`).resize({ height: h }).png().toBuffer();
    const { width: w } = await sharp(buf).metadata();
    sized.push({ buf, w, h, k });
  }
  const total = sized.reduce((sum, s) => sum + s.w, 0) - overlap * (sized.length - 1);
  let x = Math.round((width - total) / 2);
  for (const s of sized) {
    s.x = x;
    x += s.w - overlap;
  }
  // the outer ones first, so the middle one stands in front
  for (const s of [...sized].sort((a, b) => Math.abs(b.k - 2) - Math.abs(a.k - 2))) {
    // a soft shadow under each
    const shadow = await sharp(s.buf).ensureAlpha().linear(0, 0).blur(18).modulate({ brightness: 0 }).png().toBuffer();
    comps.push({ input: shadow, left: s.x + 6, top: height - bottom - s.h + 14, blend: "multiply" });
    comps.push({ input: s.buf, left: s.x, top: height - bottom - s.h });
  }
  await sharp(background).resize(width, height, { fit: "cover" }).composite(comps).jpeg({ quality: 84, mozjpeg: true }).toFile(out);
  console.log(out);
}

await lineup("public/img/welcome-tall.jpg", "public/img/cover-portrait.jpg", { width: 941, height: 1672, lineHeight: 640, bottom: 30, overlap: 30 });
await lineup("public/img/welcome-wide.jpg", "public/img/cover.jpg", { width: 1200, height: 675, lineHeight: 430, bottom: 0, overlap: 18 });
