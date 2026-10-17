import "@fontsource/lilita-one";
import "@fontsource/permanent-marker";
import "@fontsource/racing-sans-one";
import "./turn";
import "./style.css";
import "./race/race.css";
import { PAINTS, paintedUrl, savePaint, savedPaint } from "./paint";
import { UPGRADES, MAX_LEVEL, buy, levels, nextCost, tuned } from "./garage";
import { PACKS, buyPack, canBuy, chipAmount, chipSvg, chips, flagSvg } from "./chips";
import { createGarage } from "./garageRoom";
import { musicAway, musicForRace, musicOn, onSongChange, prevSong, setMusic, skipSong, startMusic } from "./music";
import { playClip, voicesAway, type Clip } from "./voice";
import { createPicker } from "./pick";
import { LINES, slug } from "./race/lines";
import { STOCK } from "./race/physics";
import { createRace } from "./race/race";
import { CARS, DRIVERS, TRACKS, carUrl, faceUrl, fullUrl, type Car, type Driver } from "./roster";
import { buyCar, carLock, lockedHow } from "./earn";
import { sendHome } from "./home";
import { savedSteer, setSteer, touchScreen, type SteerMode } from "./steer";
import { pointerX } from "./turn";
import { SUIT_PAINTS, carPaintFor, ownSwatch, saveSuit, savedSuit, suitUrl } from "./suit";
import { VERSION } from "./version";

// on the raw vercel.app address? off to scofti.com
sendHome();

// Flow: title → PICK YOUR DRIVER → PICK YOUR CAR → PIT GARAGE → PICK YOUR TRACK → the race → back to
// the pit garage. Backspace and the on-screen BACK go back; Escape belongs to the arcade.
type Screen = "title" | "driver" | "car" | "garage" | "track" | "race" | "credits" | "chips";
const BACK: Partial<Record<Screen, Screen>> = { driver: "title", car: "driver", garage: "car", track: "garage", credits: "title", chips: "garage" };
const $ = (id: string) => document.getElementById(id)!;

let screen: Screen = "title";
const garage = createGarage($("garage-canvas") as HTMLCanvasElement);
let garageCar: Car | null = null;
function show(next: Screen): void {
  screen = next;
  document.body.dataset.screen = next;
  garage.show(next === "garage");
  musicForRace(next === "race");
  // (a race may have just earned someone: the locks redrawn, and hello from whoever's up)
  if (next === "driver") drivers.refresh();
}

// The drivers talk on the pick screens: hello when you look at one, then what they think of each car
// and paint, in a speech bubble and out loud (their recordings from tools/voices.ts).
let clip: Clip | null = null;
let bubbleTimer = 0;
function speak(d: Driver, what: string, bubble: HTMLElement): void {
  const key = `drv-${slug(d.name)}-${what}`;
  const line = LINES[key];
  if (!line) return;
  clip?.stop();
  clip = playClip(`${import.meta.env.BASE_URL}audio/radio/${key}.mp3`);
  for (const b of document.querySelectorAll(".say-bubble")) b.classList.remove("on");
  bubble.textContent = line.text;
  void bubble.offsetWidth;
  bubble.classList.add("on");
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.remove("on"), 1800 + line.text.length * 55);
}

// the music starts on the first tap or key (browsers allow no sound before one); ♪ turns it off and on
// (a full tap: pointerup and click count on phones, pointerdown doesn't; every tap until it's playing)
addEventListener("pointerup", startMusic);
addEventListener("click", startMusic);
addEventListener("keydown", startMusic);
// ◀◀ ▶▶: skip songs (on the title and the pause screen); the song's name shows for a moment
for (const id of ["song-prev", "rp-prev"]) $(id).addEventListener("click", prevSong);
for (const id of ["song-next", "rp-next", "hud-song"]) $(id).addEventListener("click", skipSong);
let songTimer = 0;
onSongChange((name) => {
  const el = $("song-name");
  el.textContent = `♪ ${name}`;
  el.classList.add("on");
  clearTimeout(songTimer);
  songTimer = setTimeout(() => el.classList.remove("on"), 3000);
  $("music").classList.remove("off");
});
const musicBtn = $("music");
musicBtn.classList.toggle("off", !musicOn());
musicBtn.addEventListener("click", () => {
  startMusic();
  setMusic(!musicOn());
  musicBtn.classList.toggle("off", !musicOn());
});

$("version").textContent = VERSION;
// pictures named in the page load from the game's own address (scofti.com serves it at /arcade/scofti500
// with no slash on the end, so a plain "img/..." missed it; Heather showed as a broken image)
for (const img of document.querySelectorAll<HTMLImageElement>("img[data-src]")) img.src = import.meta.env.BASE_URL + img.dataset.src;

const lineupImgs = new Map<string, HTMLImageElement>();
// (declared up here: the driver picker shows her colors as soon as it's made)
let suitJob = 0;
// the title: all the drivers lined up together, Reba in the middle (the first thing anyone sees)
{
  const order = ["maia", "lynx", "reba", "raven", "paige"];
  const lined = [...order.map((id) => DRIVERS.find((d) => d.id === id)).filter((d): d is Driver => !!d), ...DRIVERS.filter((d) => !order.includes(d.id))];
  for (const d of lined) {
    const img = new Image();
    img.alt = "";
    lineupImgs.set(d.id, img);
    void suitUrl(d, savedSuit(d)).then((url) => (img.src = url));
    $("lineup").append(img);
  }
}

// ✕ back to the arcade shelf: /arcade/scofti500/ → /arcade/
($("to-arcade") as HTMLAnchorElement).href = import.meta.env.BASE_URL.replace(/scofti500\/?$/, "");
// in the phone app the ✕ closes the app
if (import.meta.env.MODE === "app") {
  $("to-arcade").addEventListener("click", (e) => {
    e.preventDefault();
    void import("./app").then(({ exitApp }) => exitApp());
  });
}

let driver: Driver = DRIVERS[0];

const drivers = createPicker<Driver>({
  prefix: "driver",
  items: DRIVERS,
  // no storageKey: Raven is up every time the game is opened, never the driver picked last (Michael,
  // 2026-10-17: Paige kept showing first)
  img: faceUrl,
  hero: fullUrl,
  role: (d) => d.role,
  sub: (d) => d.team,
  line: (d) => d.line,
  // Reba, Maia and Lynx are earned on track (earn.ts); locked, they still show and say hello
  locked: (d) => lockedHow(d.id),
  // say hello as each one comes up, and show her colors
  onShow: (d, hero) => {
    showSuits(d, hero);
    if (screen === "driver") speak(d, "hello", $("driver-say"));
  },
  onGo: (d) => {
    driver = d;
    // her color goes on her car
    paintCarsFor(d);
    // they come along to the car screen, small in the corner, and say their line as you pick them
    ($("car-driver") as HTMLImageElement).src = faceUrl(d);
    show("car");
    speak(d, "pick", $("car-say"));
  },
});

// ---- her colors: a swatch for each, her own first; the pick repaints her suit and her car ----
function showSuits(d: Driver, hero: HTMLImageElement): void {
  const row = $("driver-suits");
  row.style.setProperty("--stock", ownSwatch(d));
  row.replaceChildren(
    ...SUIT_PAINTS.map((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "swatch";
      b.dataset.paint = p.id;
      const label = p.id === "stock" ? "her colors" : p.label;
      b.title = label;
      b.setAttribute("aria-label", label);
      b.style.background = p.swatch;
      if (p.id === "stock") b.textContent = "★";
      b.addEventListener("click", () => {
        saveSuit(d, p.id);
        applySuit(d, hero);
        paintCarsFor(d);
        speak(d, `paint-${p.id}`, $("driver-say"));
      });
      return b;
    }),
  );
  applySuit(d, hero);
}

async function applySuit(d: Driver, hero: HTMLImageElement): Promise<void> {
  const id = savedSuit(d);
  for (const s of $("driver-suits").children) s.classList.toggle("on", (s as HTMLElement).dataset.paint === id);
  $("suit-name").textContent = id === "stock" ? "her colors" : SUIT_PAINTS.find((p) => p.id === id)!.label;
  const job = ++suitJob;
  // hold the picture back until the color's ready, so her old suit never flashes
  if (id !== "stock") hero.style.visibility = "hidden";
  const url = await suitUrl(d, id);
  const lined = lineupImgs.get(d.id);
  if (lined) lined.src = url;
  if (job !== suitJob) return;
  hero.src = url;
  hero.style.visibility = "";
}

/** her color is her car's paint, whichever car she takes */
function paintCarsFor(d: Driver): void {
  const paint = carPaintFor(d, savedSuit(d));
  for (const c of CARS) savePaint(c.id, paint);
}

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
  // every card's number badge and glow in silver, the hooter's too (Michael, 2026-10-17); its orange
  // accent stays for its stock paint swatch
  accent: () => "#d9dde3",
  // the muscle and the hooter: bought with chips, or earned on track (earn.ts)
  locked: (c) => {
    const lock = carLock(c.id);
    return lock && `BUY ${chipAmount(lock.price)}<small>${lock.how}</small>`;
  },
  // short on chips: it opens GET CHIPS, like an upgrade does
  onLocked: (c) => (buyCar(c.id) ? cars.refresh() : openChips("car")),
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
    showGaragePaints(c);
    showUpgrades();
    show("garage");
    // on a phone, tilt or thumb? Once each time the game is opened, the last pick lit up (only asking
    // the very first time, Michael never saw it again: 2026-10-14)
    if (touchScreen() && !steerAsked()) askSteer();
  },
});
const ASKED = "scofti500:steer-asked";
function steerAsked(): boolean {
  try {
    return sessionStorage.getItem(ASKED) === "1";
  } catch {
    return !!savedSteer();
  }
}
const steerNote = $("steer-ask").querySelector("small")!;
const STEER_NOTE = steerNote.textContent;
function askSteer(): void {
  const was = savedSteer();
  for (const b of document.querySelectorAll<HTMLButtonElement>("#steer-ask [data-steer]")) b.classList.toggle("on", b.dataset.steer === was);
  steerNote.textContent = STEER_NOTE;
  $("steer-ask").classList.add("on");
}
for (const b of document.querySelectorAll<HTMLButtonElement>("#steer-ask [data-steer]")) {
  b.addEventListener("click", async () => {
    const want = b.dataset.steer as SteerMode;
    const got = await setSteer(want);
    if (got !== want) {
      // the phone said no to its motion sensor: an iPhone won't ask again until Safari is closed
      askSteer();
      steerNote.textContent = "the phone said no to tilt. close the browser all the way, open the game again and say allow";
      return;
    }
    try {
      sessionStorage.setItem(ASKED, "1");
    } catch {
      // asked again next time
    }
    $("steer-ask").classList.remove("on");
  });
}

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
  img.addEventListener("pointerdown", (e) => (startX = pointerX(e)));
  img.addEventListener("pointerup", (e) => {
    if (startX === null) return;
    const dx = pointerX(e) - startX;
    startX = null;
    // a swipe turns the way you swiped; a tap goes round
    turn(Math.abs(dx) > 30 ? (dx < 0 ? 1 : -1) : 1);
  });
}

// the tracks: a button for each, hotlanta picked every time the game is opened (Michael, 2026-10-16:
// the easier one to play, so everyone starts there), never the one raced last
let track = TRACKS.find((t) => t.id === "hotlanta") ?? TRACKS[0];
const trackButtons = TRACKS.map((t) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = t.name.toUpperCase();
  b.addEventListener("click", () => {
    track = t;
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
$("to-credits").addEventListener("click", () => {
  show("credits");
  rollCredits();
});

// the credits roll up by themselves, like the end of a movie; a touch or the wheel takes over
function rollCredits(): void {
  const el = $("credits-screen");
  el.scrollTop = 0;
  let pos = 0;
  // a moment to read the title first
  let last = performance.now() + 1500;
  let stopped = false;
  const stop = () => (stopped = true);
  el.addEventListener("pointerdown", stop, { once: true });
  el.addEventListener("wheel", stop, { once: true });
  const step = (now: number) => {
    if (stopped || screen !== "credits") return;
    pos += 0.035 * Math.max(0, Math.min(50, now - last));
    last = Math.max(last, now);
    el.scrollTop = pos;
    if (pos < el.scrollHeight - el.clientHeight) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
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

// ---- the pit garage's upgrades: each car keeps its own, paid for with SCOFTI Chips ----
// ---- the car's paint in the pit garage (Michael, 2026-10-13): her color to start, any paint here ----
function showGaragePaints(car: Car): void {
  const row = $("garage-paints");
  row.style.setProperty("--stock", car.accent);
  const mark = () => {
    const id = paintOf(car);
    for (const s of row.children) s.classList.toggle("on", (s as HTMLElement).dataset.paint === id);
    $("garage-paint-name").textContent = "paint: " + PAINTS.find((p) => p.id === id)!.label;
  };
  row.replaceChildren(
    ...paintsFor(car).map((p) => {
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
        garage.setCar(car, p.id);
        mark();
        const label = p.id === "stock" ? "" : ` in ${p.label}`;
        $("race-who").textContent = `${driver.name} in the #${car.number} · ${car.name}${label}`;
        speak(driver, `paint-${p.id}`, $("car-say"));
      });
      return b;
    }),
  );
  mark();
}

function showUpgrades(): void {
  const car = garageCar;
  if (!car) return;
  $("garage-cash").innerHTML = chipAmount(chips());
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
        b.innerHTML = chipAmount(cost);
        // short on chips: it still works, it opens GET CHIPS
        b.classList.toggle("short", chips() < cost);
        b.addEventListener("click", () => {
          if (buy(car.id, u.id)) showUpgrades();
          else openChips();
        });
      }
      row.append(b);
      return row;
    }),
  );
}

// ---- GET CHIPS: the packs. On the web it's "coming soon in the app" (?chiptest hands them over) ----
function openChips(from: Screen = "garage"): void {
  // back to wherever it was opened from (the pit garage, or a car you're short for)
  BACK.chips = from;
  $("chips-have").innerHTML = chipAmount(chips());
  $("chips-note").textContent = canBuy() ? "TEST MODE: packs are free" : "Coming soon in the SCOFTI 500 app. For now, race to win more!";
  $("chips-packs").replaceChildren(
    ...PACKS.map((p, k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pack";
      // a pile: more chips for the bigger packs, stacked in towers
      const towers = [[2], [3, 2], [4, 3, 4]][k] ?? [2];
      const pile = towers.map((n) => `<span class="tower">${Array.from({ length: n }, () => chipSvg(52)).join("")}</span>`).join("");
      b.innerHTML = `${p.tag ? `<em>${p.tag}</em>` : ""}<span class="pile">${flagSvg(p.flag, 58)}${pile}</span><b>${p.name}</b>${chipAmount(p.chips)}<small>${canBuy() ? "FREE (TEST)" : "SOON"}</small>`;
      b.addEventListener("click", () => {
        if (buyPack(p)) {
          $("chips-have").innerHTML = chipAmount(chips());
          showUpgrades();
        }
      });
      return b;
    }),
  );
  show("chips");
}
$("chips-back").addEventListener("click", () => back());
$("chips-race").addEventListener("click", () => (BACK.chips === "car" ? back() : show("track")));
{
  const lineup = $("chips-lineup");
  for (const id of ["maia", "lynx", "reba", "raven", "paige"]) {
    const d = DRIVERS.find((x) => x.id === id);
    if (!d) continue;
    const img = new Image();
    img.alt = "";
    void suitUrl(d, savedSuit(d)).then((url) => (img.src = url));
    lineup.append(img);
  }
}

// ---- the race: how many laps, then go ----
const LAPS_KEY = "scofti500:laps";
// short races (Michael, 2026-10-13: "these races too long"): 5, 10 or 15 laps, 10 to start
const LAP_CHOICES = [5, 10, 15];
let laps = 10;
try {
  const saved = Number(localStorage.getItem(LAPS_KEY));
  // (an old 30 or 60 from before falls back to 10)
  if (LAP_CHOICES.includes(saved)) laps = saved;
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
    // a car may have been earned: its lock comes off before you're back to the cars
    cars.refresh();
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

// The phone app's back button: a race pauses (or resumes); other screens step back like Backspace;
// false on the title, where the app closes. Leaving the app quiets it and pauses a race.
function back(): boolean {
  if (screen === "race") {
    race.togglePause();
    return true;
  }
  const prev = BACK[screen];
  if (!prev) return false;
  show(prev);
  return true;
}
if (import.meta.env.MODE === "app") {
  void import("./app").then(({ setupApp }) =>
    setupApp(back, (gone) => {
      musicAway(gone);
      voicesAway(gone);
      if (gone && screen === "race") race.pause();
    }),
  );
}
addEventListener("keydown", (e) => {
  if (screen === "track" && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    goRacing();
  }
});
