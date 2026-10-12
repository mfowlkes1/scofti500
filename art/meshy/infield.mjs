// The infield's vehicles from Meshy text-to-3D: a race team's hauler, a fan's motorhome and a pickup.
// White bodies with no logos, so the race scene can tint each one (team colors on the haulers).
// Preview, then refine (texture), then download to art/meshy/<name>.glb; optimize into public/models.
// Run: node art/meshy/infield.mjs   (MESHY_API_KEY from the environment). Re-running resumes.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const API = "https://api.meshy.ai/openapi/v2/text-to-3d";
const KEY =
  process.env.MESHY_API_KEY || execSync(`powershell.exe -NoProfile -Command "[Environment]::GetEnvironmentVariable('MESHY_API_KEY','User')"`).toString().trim();
const auth = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const NO_BRANDS = "No logos, no brand names, no badges, no text.";

const MODELS = {
  hauler: {
    prompt: "A race team transporter: an American semi truck with a long-nose cab and a long 53 foot enclosed trailer, side by side as one vehicle, realistic proportions",
    texture: `Clean glossy white semi truck cab and white enclosed trailer, chrome bumper and grille, chrome exhaust stacks, black tires, tinted windows. ${NO_BRANDS}`,
    poly: 12000,
  },
  motorhome: {
    prompt: "A big American class A motorhome RV, boxy, with a roll-out awning on one side, realistic proportions",
    texture: `White motorhome with simple gray and black swoosh stripes down the sides, dark tinted windows, black tires, silver wheels. ${NO_BRANDS}`,
    poly: 8000,
  },
  pickup: {
    prompt: "A full size American pickup truck with a crew cab and an open bed, realistic proportions",
    texture: `Glossy white paint, chrome grille, black tires with silver wheels, tinted windows. ${NO_BRANDS}`,
    poly: 6000,
  },
};

const TASKS = "art/meshy/infield-tasks.json";
const tasks = existsSync(TASKS) ? JSON.parse(readFileSync(TASKS, "utf8")) : {};
const save = () => writeFileSync(TASKS, JSON.stringify(tasks, null, 2));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(body) {
  const res = await fetch(API, { method: "POST", headers: auth, body: JSON.stringify(body) });
  const j = await res.json();
  if (!j.result) throw new Error(JSON.stringify(j));
  return j.result;
}
async function until(id) {
  for (;;) {
    const t = await (await fetch(`${API}/${id}`, { headers: auth })).json();
    if (t.status === "SUCCEEDED") return t;
    if (t.status === "FAILED" || t.status === "CANCELED") throw new Error(`${id}: ${JSON.stringify(t.task_error)}`);
    await wait(10000);
  }
}

await Promise.all(
  Object.entries(MODELS).map(async ([name, m]) => {
    const out = `art/meshy/${name}.glb`;
    if (existsSync(out)) return console.log(name, "already done");
    tasks[name] ??= {};
    if (!tasks[name].preview) {
      tasks[name].preview = await post({ mode: "preview", prompt: m.prompt, art_style: "realistic", ai_model: "latest", topology: "triangle", target_polycount: m.poly, should_remesh: true });
      save();
    }
    await until(tasks[name].preview);
    console.log(name, "preview done");
    if (!tasks[name].refine) {
      tasks[name].refine = await post({ mode: "refine", preview_task_id: tasks[name].preview, texture_prompt: m.texture, enable_pbr: false });
      save();
    }
    const t = await until(tasks[name].refine);
    writeFileSync(out, Buffer.from(await (await fetch(t.model_urls.glb)).arrayBuffer()));
    console.log(name, "saved", out);
  }),
);
