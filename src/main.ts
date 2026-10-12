import "@fontsource/lilita-one";
import "@fontsource/permanent-marker";
import "@fontsource/racing-sans-one";
import "./style.css";
import { PAINTS, paintedUrl, savePaint, savedPaint } from "./paint";
import { createPicker } from "./pick";
import { CARS, DRIVERS, carUrl, faceUrl, type Car, type Driver } from "./roster";

// Flow: title → PICK YOUR DRIVER → PICK YOUR CAR → PICK YOUR TRACK (not built yet). Backspace and the on-screen
// BACK go back; Escape belongs to the arcade.
type Screen = "title" | "driver" | "car" | "track";
const BACK: Partial<Record<Screen, Screen>> = { driver: "title", car: "driver", track: "car" };
const $ = (id: string) => document.getElementById(id)!;

let screen: Screen = "title";
function show(next: Screen): void {
  screen = next;
  document.body.dataset.screen = next;
}

// ✕ back to the arcade shelf: /arcade/scofti500/ → /arcade/
($("to-arcade") as HTMLAnchorElement).href = import.meta.env.BASE_URL.replace(/scofti500\/?$/, "");

let driver: Driver = DRIVERS[0];

const drivers = createPicker<Driver>({
  prefix: "driver",
  items: DRIVERS,
  storageKey: "scofti500:driver",
  img: faceUrl,
  role: (d) => d.role,
  sub: (d) => d.team,
  line: (d) => d.line,
  onGo: (d) => {
    driver = d;
    show("car");
  },
});

const cars = createPicker<Car>({
  prefix: "car",
  items: CARS,
  storageKey: "scofti500:car",
  img: carUrl,
  role: (c) => c.era,
  sub: (c) => `#${c.number}`,
  line: (c) => c.line,
  badge: (c) => c.number,
  accent: (c) => c.accent,
  onShow: (c, hero, card) => showPaints(c, hero, card),
  onGo: (c) => {
    const paint = PAINTS.find((p) => p.id === savedPaint(c.id))!;
    const colour = paint.id === "stock" ? "" : ` in ${paint.label}`;
    $("race-who").textContent = `${driver.name} in the #${c.number} · ${c.name}${colour}`;
    show("track");
  },
});

// the colour swatches under the car; each car remembers its own colour
function showPaints(car: Car, hero: HTMLImageElement, card: HTMLImageElement): void {
  const row = $("car-paints");
  row.style.setProperty("--stock", car.accent);
  row.replaceChildren(
    ...PAINTS.map((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "swatch";
      b.title = p.label;
      b.setAttribute("aria-label", p.label);
      b.style.background = p.swatch;
      if (p.id === "stock") b.textContent = "★";
      b.addEventListener("click", () => {
        savePaint(car.id, p.id);
        applyPaint(car, hero, card);
      });
      return b;
    }),
  );
  applyPaint(car, hero, card);
}

let paintJob = 0;
async function applyPaint(car: Car, hero: HTMLImageElement, card: HTMLImageElement): Promise<void> {
  const id = savedPaint(car.id);
  const i = PAINTS.findIndex((p) => p.id === id);
  for (const [j, s] of [...$("car-paints").children].entries()) s.classList.toggle("on", j === i);
  $("paint-name").textContent = PAINTS[i].label;
  const job = ++paintJob;
  const url = await paintedUrl(carUrl(car), car.key, id);
  // a later pick won the race: leave the picture alone
  if (job !== paintJob) return;
  hero.src = url;
  card.src = url;
}

$("race-now").addEventListener("click", () => show("driver"));
for (const b of document.querySelectorAll<HTMLButtonElement>("[data-back]")) {
  b.addEventListener("click", () => show(BACK[screen] ?? "title"));
}

addEventListener("keydown", (e) => {
  const picker = screen === "driver" ? drivers : screen === "car" ? cars : null;
  if (e.key === "Backspace") {
    const prev = BACK[screen];
    if (prev) show(prev);
  } else if (screen === "title" && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    show("driver");
  } else if (picker) {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") picker.step(-1);
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") picker.step(1);
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      $(`${screen}-go`).click();
    }
  }
});

show("title");
