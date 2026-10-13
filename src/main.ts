import "@fontsource/lilita-one";
import "@fontsource/permanent-marker";
import "@fontsource/racing-sans-one";
import "./style.css";
import "./race/race.css";
import { PAINTS, paintedUrl, savePaint, savedPaint } from "./paint";
import { UPGRADES, MAX_LEVEL, buy, cash, levels, nextCost, tuned } from "./garage";
import { createGarage } from "./garageRoom";
import { musicForRace, musicOn, setMusic, startMusic } from "./music";
import { createPicker } from "./pick";
import { LINES, slug } from "./race/lines";
import { STOCK } from "./race/physics";
import { createRace } from "./race/race";
import { CARS, DRIVERS, TRACKS, carUrl, faceUrl, fullUrl, type Car, type Driver } from "./roster";
import { sendHome } from "./home";
import { VERSION } from "./version";

// on the raw vercel.app address? off to scofti.com
sendHome();

// Flow: title → PICK YOUR DRIVER → PICK YOUR CAR → PIT GARAGE → PICK YOUR TRACK → the race → back to
// the pit garage. Backspace and the on-screen BACK go back; Escape belongs to the arcade.
type Screen = "title" | "driver" | "car" | "garage" | "track" | "race" | "credits";
const BACK: Partial<Record<Screen, Screen>> = { driver: "title", car: "driver", garage: "car", track: "garage", credits: "title" };
const $ = (id: string) => document.getElementById(id)!;

let screen: Screen = "title";
const garage = createGarage($("garage-canvas") as HTMLCanvasElement);
let garageCar: Car | null = null;
function show(next: Screen): void {
  screen = next;
  document.body.dataset.screen = next;
  garage.show(next === "garage");
  musicForRace(next === "race");
  if (next === "driver") speak(drivers.current(), "hello", $("driver-say"));
}

// The drivers talk on the pick screens: hello when you look at one, then what they think of each car
// and paint, in a speech bubble and out loud (their recordings from tools/voices.ts).
let clip: HTMLAudioElement | null = null;
let bubbleTimer = 0;
function speak(d: Driver, what: string, bubble: HTMLElement): void {
  const key = `drv-${slug(d.name)}-${what}`;
  const line = LINES[key];
  if (!line) return;
  clip?.pause();
  clip = new Audio(`${import.meta.env.BASE_URL}audio/radio/${key}.mp3`);
  void clip.play().catch(() => null);
  for (const b of document.querySelectorAll(".say-bubble")) b.classList.remove("on");
  bubble.textContent = line.text;
  void bubble.offsetWidth;
  bubble.classList.add("on");
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.remove("on"), 1800 + line.text.length * 55);
}

// the music starts on the first tap or key (browsers allow no sound before one); ♪ turns it off and on
addEventListener("pointerdown", startMusic, { once: true });
addEventListener("keydown", startMusic, { once: true });
const musicBtn = $("music");
musicBtn.classList.toggle("off", !musicOn());
musicBtn.addEventListener("click", () => {
  startMusic();
  setMusic(!musicOn());
  musicBtn.classList.toggle("off", !musicOn());
});

$("version").textContent = VERSION;

// the title: all the drivers lined up together, Reba in the middle (the first thing anyone sees)
{
  const order = ["maia", "lynx", "reba", "raven", "paige"];
  const lined = [...order.map((id) => DRIVERS.find((d) => d.id === id)).filter((d): d is Driver => !!d), ...DRIVERS.filter((d) => !order.includes(d.id))];
  for (const d of lined) {
    const img = new Image();
    img.src = fullUrl(d);
    img.alt = "";
    $("lineup").append(img);
  }
}

// ✕ back to the arcade shelf: /arcade/scofti500/ → /arcade/
($("to-arcade") as HTMLAnchorElement).href = import.meta.env.BASE_URL.replace(/scofti500\/?$/, "");

let driver: Driver = DRIVERS[0];

const drivers = createPicker<Driver>({
  prefix: "driver",
  items: DRIVERS,
  storageKey: "scofti500:driver",
  img: faceUrl,
  hero: fullUrl,
  role: (d) => d.role,
  sub: (d) => d.team,
  line: (d) => d.line,
  // say hello as each one comes up
  onShow: (d) => {
    if (screen === "driver") speak(d, "hello", $("driver-say"));
  },
  onGo: (d) => {
    driver = d;
    // they come along to the car screen, small in the corner, and say their line as you pick them
    ($("car-driver") as HTMLImageElement).src = faceUrl(d);
    show("car");
    speak(d, "pick", $("car-say"));
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
  onShow: (c, hero, card) => {
    showPaints(c, hero, card);
    if (screen === "car") speak(driver, `car-${c.id}`, $("car-say"));
  },
  onGo: (c) => {
    const paint = PAINTS.find((p) => p.id === paintOf(c))!;
    const colour = paint.id === "stock" ? "" : ` in ${paint.label}`;
    $("race-who").textContent = `${driver.name} in the #${c.number} · ${c.name}${colour}`;
    garageCar = c;
    garage.setCar(c, paintOf(c));
    showUpgrades();
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
        speak(driver, `paint-${p.id}`, $("car-say"));
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

// the tracks: a button for each, the one you raced last picked
const TRACK_KEY = "scofti500:track";
let track = TRACKS[0];
try {
  track = TRACKS.find((t) => t.id === localStorage.getItem(TRACK_KEY)) ?? track;
} catch {
  // not remembered
}
const trackButtons = TRACKS.map((t) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = t.name.toUpperCase();
  b.addEventListener("click", () => {
    track = t;
    try {
      localStorage.setItem(TRACK_KEY, t.id);
    } catch {
      // not remembered
    }
    showTrack();
  });
  $("track-pick").append(b);
  return b;
});
function showTrack(): void {
  trackButtons.forEach((b, i) => b.classList.toggle("on", TRACKS[i] === track));
  $("track-name").textContent = track.name;
  $("track-kind").textContent = track.kind;
  $("track-line").textContent = track.line;
  $("track-time").textContent = track.night ? "★ UNDER THE LIGHTS ★" : "★ SUNDAY AFTERNOON ★";
  $("mode-real").textContent = track.night ? "RACE NIGHT" : "RACE DAY";
}
showTrack();

$("race-now").addEventListener("click", () => show("driver"));
$("to-credits").addEventListener("click", () => show("credits"));
$("credits-version").textContent = VERSION;
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

// ---- the pit garage's upgrades: each car keeps its own, paid for with cash ----
const money = (n: number) => `$${n.toLocaleString()}`;
function showUpgrades(): void {
  const car = garageCar;
  if (!car) return;
  $("garage-cash").textContent = money(cash());
  const lv = levels(car.id);
  $("garage-upgrades").replaceChildren(
    ...UPGRADES.map((u) => {
      const row = document.createElement("div");
      row.className = "upgrade";
      const cost = nextCost(car.id, u.id);
      const pips = Array.from({ length: MAX_LEVEL }, (_, i) => `<i class="${i < lv[u.id] ? "on" : ""}"></i>`).join("");
      row.innerHTML = `<div class="up-text"><b>${u.name}</b><span>${u.does}</span><span class="pips">${pips}</span></div>`;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "buy";
      if (cost === null) {
        b.textContent = "MAX";
        b.disabled = true;
      } else {
        b.textContent = money(cost);
        b.disabled = cash() < cost;
        b.addEventListener("click", () => {
          if (buy(car.id, u.id)) showUpgrades();
        });
      }
      row.append(b);
      return row;
    }),
  );
}

// ---- the race: how many laps, then go ----
const LAPS_KEY = "scofti500:laps";
let laps = 30;
try {
  laps = Number(localStorage.getItem(LAPS_KEY)) || 30;
} catch {
  // not remembered
}
function showLaps(): void {
  for (const b of document.querySelectorAll<HTMLButtonElement>("#laps-pick button")) b.classList.toggle("on", Number(b.dataset.laps) === laps);
}
for (const b of document.querySelectorAll<HTMLButtonElement>("#laps-pick button")) {
  b.addEventListener("click", () => {
    laps = Number(b.dataset.laps);
    try {
      localStorage.setItem(LAPS_KEY, String(laps));
    } catch {
      // not remembered
    }
    showLaps();
  });
}
showLaps();

// ---- preseason testing (easy: the walls only slow you down) or race night (the real thing) ----
const MODE_KEY = "scofti500:mode";
let easy = true;
try {
  easy = localStorage.getItem(MODE_KEY) !== "real";
} catch {
  // not remembered
}
function showMode(): void {
  for (const b of document.querySelectorAll<HTMLButtonElement>("#mode-pick button")) b.classList.toggle("on", (b.dataset.mode === "easy") === easy);
  $("mode-line").textContent = easy
    ? "Walls just slow you down, no wrecks. Rivals take it easy."
    : "The real thing: hit the wall and you'll spin. Rivals race hard.";
}
for (const b of document.querySelectorAll<HTMLButtonElement>("#mode-pick button")) {
  b.addEventListener("click", () => {
    easy = b.dataset.mode === "easy";
    try {
      localStorage.setItem(MODE_KEY, easy ? "easy" : "real");
    } catch {
      // not remembered
    }
    showMode();
  });
}
showMode();

const race = createRace({
  onDone: () => {
    showUpgrades();
    show("garage");
  },
});
function goRacing(): void {
  const car = garageCar ?? cars.current();
  show("race");
  race.start({ car, paintId: paintOf(car), driver: driver.name, spec: tuned(STOCK, car.id), pitCrew: levels(car.id).crew, laps, easy, track: track.id });
}
$("track-go").addEventListener("click", goRacing);
addEventListener("keydown", (e) => {
  if (screen === "track" && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    goRacing();
  }
});
