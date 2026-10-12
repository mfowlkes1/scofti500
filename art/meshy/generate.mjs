// Makes the cars in Meshy from Michael's car sheets (multi-image to 3D) and saves the raw GLBs here.
// Copied from scofti-offroad's art/meshy/generate.mjs and set up for the car sheets.
// Run: node art/meshy/generate.mjs [name ...]   (no names = everything not yet made)
// Each sheet is cut into four views first (art/meshy/views/). Task IDs go in tasks.json so ASSETS.md
// can cite them. Shrink the results with gltf-transform (see CLAUDE.md / the handoff).
import { writeFile, readFile, access, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const KEY = process.env.MESHY_API_KEY;
if (!KEY) throw new Error("MESHY_API_KEY not set");
const API = "https://api.meshy.ai/openapi/v1/multi-image-to-3d";
const DIR = new URL(".", import.meta.url);
const REF = new URL("../reference/", import.meta.url);

// The 1448 x 1086 car sheets (the brawler, the muscle, the hooter) share one layout: a big front
// three-quarter top left, a rear three-quarter top right, then front, rear, both sides, top and
// underneath below. Meshy takes up to four views; these four show every side of the car.
const SHEET_VIEWS = [
  { left: 0, top: 0, width: 840, height: 420 }, // front three-quarter
  { left: 848, top: 40, width: 600, height: 330 }, // rear three-quarter
  { left: 688, top: 410, width: 744, height: 186 }, // left side
  { left: 15, top: 450, width: 310, height: 190 }, // straight front
];

const NO_BRANDS = "No car maker badges, no emblems, no sponsor logos, no other text.";

const MODELS = {
  "car-43-eighties": {
    sheet: "car-43-80s-sheet.png",
    views: SHEET_VIEWS,
    texture: `Boxy 1980s stock car. Matte black body covered in bright lime green paint splatter, white brush-lettered SCOFTI on the hood, doors and rear, big black number 43 with a white outline on both doors and the roof. Black wheels, black tires with yellow lettering, quad square headlights, black grille. ${NO_BRANDS}`,
  },
  "car-3-muscle": {
    sheet: "car-3-muscle-sheet.png",
    views: SHEET_VIEWS,
    texture: `Late-1960s muscle car built as a stock car. Matte black body covered in bright lime green paint splatter, brush-lettered SCOFTI on the hood, doors and rear, big black number 3 with a white outline on both doors and the roof. Chrome front bumper, round quad headlights, black wheels. ${NO_BRANDS}`,
  },
  "car-7-owl": {
    sheet: "car-7-owl-sheet.png",
    views: SHEET_VIEWS,
    texture: `Boxy 1980s stock car. Bright orange body with white panels, a fierce owl face across the hood and rear, owl feather shapes down the sides, big white number 7 with a black outline on both doors and the roof. Black wheels, quad square headlights, black grille. ${NO_BRANDS}`,
  },
};

const auth = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tasksFile = new URL("tasks.json", DIR);
const tasks = JSON.parse(await readFile(tasksFile, "utf8").catch(() => "{}"));
const save = () => writeFile(tasksFile, JSON.stringify(tasks, null, 2));

async function cutViews(name, sheet, boxes) {
  await mkdir(new URL("views/", DIR), { recursive: true });
  const urls = [];
  for (const [i, box] of boxes.entries()) {
    const png = await sharp(fileURLToPath(new URL(sheet, REF))).extract(box).png().toBuffer();
    await writeFile(new URL(`views/${name}-${i + 1}.png`, DIR), png);
    urls.push(`data:image/png;base64,${png.toString("base64")}`);
  }
  return urls;
}

async function make(name) {
  const { sheet, views, texture } = MODELS[name];
  tasks[name] ??= {};
  if (!tasks[name].task) {
    const res = await fetch(API, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        image_urls: await cutViews(name, sheet, views),
        ai_model: "latest",
        topology: "triangle",
        should_remesh: true,
        target_polycount: 60000,
        should_texture: true,
        enable_pbr: true,
        texture_prompt: texture,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json)}`);
    tasks[name].task = json.result;
    await save();
  }
  console.log(`${name}: task ${tasks[name].task}`);
  for (;;) {
    await sleep(15000);
    const task = await (await fetch(`${API}/${tasks[name].task}`, { headers: auth })).json();
    if (task.status === "SUCCEEDED") {
      const glb = await (await fetch(task.model_urls.glb)).arrayBuffer();
      await writeFile(new URL(`${name}.glb`, DIR), Buffer.from(glb));
      console.log(`${name}: saved (${(glb.byteLength / 1e6).toFixed(1)} MB)`);
      return;
    }
    if (task.status === "FAILED" || task.status === "CANCELED")
      throw new Error(`${task.status}: ${JSON.stringify(task.task_error)}`);
    console.log(`${name}: ${task.status} ${task.progress ?? ""}%`);
  }
}

const exists = (name) => access(new URL(`${name}.glb`, DIR)).then(() => true, () => false);
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(MODELS);
await Promise.all(
  wanted.map(async (name) => {
    if (await exists(name)) return;
    try {
      await make(name);
    } catch (err) {
      console.log(`${name}: FAILED ${err.message}`);
    }
  }),
);
console.log("done");
