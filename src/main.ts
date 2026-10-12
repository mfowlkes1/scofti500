import "@fontsource/lilita-one";
import "@fontsource/permanent-marker";
import "@fontsource/racing-sans-one";
import "./style.css";
import { createPicker } from "./pick";
import { CARS, DRIVERS, carUrl, faceUrl, type Car, type Driver } from "./roster";

// Flow: title → PICK YOUR DRIVER → PICK YOUR CAR → race (not built yet). Backspace and the on-screen
// BACK go back; Escape belongs to the arcade.
type Screen = "title" | "driver" | "car" | "race";
const BACK: Partial<Record<Screen, Screen>> = { driver: "title", car: "driver", race: "car" };
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
  onGo: (c) => {
    $("race-who").textContent = `${driver.name} in the #${c.number} · ${c.name}`;
    show("race");
  },
});

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
