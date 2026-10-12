import "@fontsource/lilita-one";
import "@fontsource/permanent-marker";
import "@fontsource/racing-sans-one";
import "./style.css";
import { PAINTS, paintedUrl, savePaint, savedPaint } from "./paint";
import { createPicker } from "./pick";
import { CARS, DRIVERS, TRACKS, carUrl, faceUrl, type Car, type Driver } from "./roster";

// Flow: title → PICK YOUR DRIVER → PICK YOUR CAR → PIT GARAGE → PICK YOUR TRACK (garage and track not built yet). Backspace and the on-screen
// BACK go back; Escape belongs to the arcade.
type Screen = "title" | "driver" | "car" | "garage" | "track";
const BACK: Partial<Record<Screen, Screen>> = { driver: "title", car: "driver", garage: "car", track: "garage" };
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

// the car being shown and which way round it is (tap the picture to turn it)
let viewIndex = 0;
let shownCar = CARS[0];
let shownHero: HTMLImageElement | null = null;
let shownCard: HTMLImageElement | null = null;
let paintJob = 0;

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
    const paint = PAINTS.find((p) => p.id === paintOf(c))!;
    const colour = paint.id === "stock" ? "" : ` in ${paint.label}`;
    $("race-who").textContent = `${driver.name} in the #${c.number} · ${c.name}${colour}`;
    ($("garage-car") as HTMLImageElement).src = shownCard?.src ?? carUrl(c);
    show("garage");
  },
});

// the colours a car offers: stock only when the car starts in its own paint (no lime on the cars)
function paintsFor(car: Car) {
  return PAINTS.filter((p) => p.id !== "stock" || car.paint === "stock");
}
function paintOf(car: Car): string {
  const id = savedPaint(car.id, car.paint);
  return paintsFor(car).some((p) => p.id === id) ? id : car.paint;
}

// paint the small car cards in each car's colour from the start
for (const [i, img] of [...document.querySelectorAll<HTMLImageElement>("#car-cards img")].entries()) {
  const car = CARS[i];
  paintedUrl(carUrl(car), car.key, paintOf(car)).then((url) => (img.src = url));
}

// the colour swatches under the car; each car remembers its own colour
function showPaints(car: Car, hero: HTMLImageElement, card: HTMLImageElement): void {
  // a new car starts from the front
  if (car !== shownCar) viewIndex = 0;
  shownCar = car;
  shownHero = hero;
  shownCard = card;
  const row = $("car-paints");
  row.style.setProperty("--stock", car.accent);
  const options = paintsFor(car);
  row.replaceChildren(
    ...options.map((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "swatch";
      b.dataset.paint = p.id;
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

async function applyPaint(car: Car, hero: HTMLImageElement, card: HTMLImageElement): Promise<void> {
  const id = paintOf(car);
  for (const s of $("car-paints").children) s.classList.toggle("on", (s as HTMLElement).dataset.paint === id);
  $("paint-name").textContent = PAINTS.find((p) => p.id === id)!.label;
  const view = car.views[viewIndex];
  showViewDots(car);
  const job = ++paintJob;
  // hide the unpainted picture until the paint is ready, so the sheet's own colour never flashes
  if (id !== "stock") hero.style.visibility = "hidden";
  const [heroUrl, cardUrl] = await Promise.all([
    paintedUrl(carUrl(car, view), car.key, id, view),
    paintedUrl(carUrl(car), car.key, id),
  ]);
  // a later pick won the race: leave the picture alone
  if (job !== paintJob) return;
  hero.src = heroUrl;
  card.src = cardUrl;
  hero.style.visibility = "";
}

// ---- turning the car: tap the picture (or swipe it) to go round its views ----

function showViewDots(car: Car): void {
  const dots = $("car-views");
  dots.replaceChildren(
    ...car.views.map((_, i) => {
      const d = document.createElement("i");
      d.classList.toggle("on", i === viewIndex);
      return d;
    }),
  );
}

function turn(by: number): void {
  if (!shownHero || !shownCard) return;
  const n = shownCar.views.length;
  viewIndex = (viewIndex + by + n) % n;
  shownHero.classList.remove("turn");
  void shownHero.offsetWidth;
  shownHero.classList.add("turn");
  applyPaint(shownCar, shownHero, shownCard);
}

{
  const img = $("car-img");
  let startX: number | null = null;
  img.addEventListener("pointerdown", (e) => (startX = e.clientX));
  img.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    // a swipe turns the way you swiped; a tap goes round
    turn(Math.abs(dx) > 30 ? (dx < 0 ? 1 : -1) : 1);
  });
}

// one track so far; a picker comes when there are more
const track = TRACKS[0];
$("track-name").textContent = track.name;
$("track-kind").textContent = track.kind;
$("track-line").textContent = track.line;

$("race-now").addEventListener("click", () => show("driver"));
$("garage-go").addEventListener("click", () => show("track"));
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
  } else if (screen === "garage" && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    show("track");
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
