// Makes a new car sheet with OpenAI's image model, laid out like the cars we have (the '80s #43 sheet
// is the reference for the layout and the body style). The picture lands in art/reference/.
// Run: OPENAI_API_KEY=... node art/openai/car-sheet.mjs 90s       (then "90s fix" for a clean sheet with no lettering)
// No real brands: no maker badges, sponsors or real series anywhere on the car.
import { readFileSync, writeFileSync } from "node:fs";

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) throw new Error("OPENAI_API_KEY not set");

const CARS = {
  "90s": {
    out: "art/reference/car-90s-sheet.png",
    body:
      "a 1990s-era American oval-track stock car: smoother and rounder than the boxy 1980s car in the reference, " +
      "with a low sloped nose, flush headlight decals instead of real lights, a fastback roofline, a tall flat rear " +
      "spoiler, a full roll cage through the window net, steel wheels with racing slicks",
    paint: "black and neon lime splatter like the reference, the word SCOFTI in a brush-script font on the hood and doors",
    // the 90 for the '90s (no rival has it)
    number: "90",
  },
};

const pick = CARS[process.argv[2] ?? "90s"];
if (!pick) throw new Error(`no such car: ${process.argv[2]} (have: ${Object.keys(CARS).join(", ")})`);
// "fix": a second pass on a sheet already made, taking every word, number and caption off, so Meshy
// builds a clean car and art/meshy/fix-lettering.mjs paints the real SCOFTI (bars on the I) and number on
// the model, as for the other cars (image models misspell it and drop the bars). Saved beside it as
// -fixed, the first take left as it was.
const fixing = process.argv[3] === "fix";

const prompt = fixing
  ? `Edit this car reference sheet. Keep the car, its body shape, every view, the camera angles, the black and ` +
    `lime paint splatter and the layout exactly the same. Remove ALL lettering and numbers: no words on the car ` +
    `at all and no race numbers (where they were, continue the black paint and lime splatter), and remove every ` +
    `text caption and label from the sheet. The result has no text of any kind anywhere. No badges or logos.`
  :
  `A car reference sheet in exactly the same layout as the attached sheet (front three-quarter, rear three-quarter, ` +
  `left side, right side and top views, all on one sheet, plain studio background). The car is ${pick.body}. ` +
  `Paint: ${pick.paint}, race number ${pick.number} in big bold digits on both doors and the roof. ` +
  `Glossy, clean, realistic paint, studio lighting. No car maker badges or logos, no real brand names, ` +
  `no sponsor logos, no real racing series names; any sponsor areas are plain color blocks.`;

const form = new FormData();
form.append("model", "gpt-image-1");
form.append("prompt", prompt);
form.append("size", "1536x1024");
form.append("quality", "high");
const images = [fixing ? pick.out : "art/reference/car-43-80s-sheet.png"];
for (const [i, file] of images.entries()) form.append("image[]", new Blob([readFileSync(file)], { type: "image/png" }), `ref-${i}.png`);
if (fixing) form.append("input_fidelity", "high");

const res = await fetch("https://api.openai.com/v1/images/edits", {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}` },
  body: form,
});
const json = await res.json();
if (!res.ok) throw new Error(JSON.stringify(json.error ?? json));
const out = fixing ? pick.out.replace(".png", "-fixed.png") : pick.out;
writeFileSync(out, Buffer.from(json.data[0].b64_json, "base64"));
console.log(`${out}: done`);
