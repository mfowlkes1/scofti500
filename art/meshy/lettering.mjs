// Draws the lettering that fix-lettering.mjs paints onto the cars' 3D textures (Meshy garbled SCOFTI into
// "SCORFF"), in the game's own fonts. Needs Chrome via Playwright (borrowed from scofti-winter-games).
// Run: node art/meshy/lettering.mjs
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const require = createRequire("C:/ai/games/scofti-winter-games/package.json");
const { chromium } = require("playwright-core");
const font = async (pkg, file) =>
  (await readFile(fileURLToPath(new URL(`../../node_modules/@fontsource/${pkg}/files/${file}`, import.meta.url)))).toString("base64");
const marker = await font("permanent-marker", "permanent-marker-latin-400-normal.woff2");
const racing = await font("racing-sans-one", "racing-sans-one-latin-400-normal.woff2");

const LETTERS = {
  scofti: { w: 1600, h: 400, html: `<b class="m">SCOFTI</b>` },
  "17": { w: 900, h: 600, html: `<b class="n">17</b>` },
  "43": { w: 900, h: 600, html: `<b class="n">43</b>` },
  "3": { w: 600, h: 600, html: `<b class="n">3</b>` },
};
const b = await chromium.launch({ channel: "chrome" });
for (const [name, { w, h, html }] of Object.entries(LETTERS)) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.setContent(`<style>
    @font-face{font-family:M;src:url(data:font/woff2;base64,${marker})}
    @font-face{font-family:R;src:url(data:font/woff2;base64,${racing})}
    html,body{margin:0;height:100%;background:transparent;display:grid;place-items:center;overflow:hidden}
    b{font-weight:400;color:#0a0a0a;line-height:1;white-space:nowrap;display:inline-block;padding:0 .25em}
    .m{font-family:M;font-size:${h * 0.82}px;transform:skewX(-10deg);-webkit-text-stroke:${h * 0.035}px #0a0a0a}
    .n{font-family:R;font-size:${h * 0.85}px;font-style:italic;-webkit-text-stroke:${h * 0.03}px #fff;paint-order:stroke fill}
  </style>${html}`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: fileURLToPath(new URL(`lettering/${name}.png`, import.meta.url)), omitBackground: true });
}
await b.close();
