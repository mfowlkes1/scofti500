import "@fontsource/lilita-one";
import "@fontsource/permanent-marker";
import "@fontsource/racing-sans-one";
import "./style.css";
import { createPick } from "./pick";

// Flow: title → PICK YOUR DRIVER → race (not built yet). Backspace and the on-screen BACK go back;
// Escape belongs to the arcade.
type Screen = "title" | "pick" | "race";
const $ = (id: string) => document.getElementById(id)!;

let screen: Screen = "title";
function show(next: Screen): void {
  screen = next;
  document.body.dataset.screen = next;
}

// ✕ back to the arcade shelf: /arcade/scofti500/ → /arcade/
($("to-arcade") as HTMLAnchorElement).href = import.meta.env.BASE_URL.replace(/scofti500\/?$/, "");

const pick = createPick((d) => {
  $("race-who").textContent = `${d.name} · #${d.number}`;
  show("race");
});

$("race-now").addEventListener("click", () => show("pick"));
$("pick-back").addEventListener("click", () => show("title"));
$("race-back").addEventListener("click", () => show("pick"));

addEventListener("keydown", (e) => {
  if (e.key === "Backspace") {
    if (screen === "pick") show("title");
    else if (screen === "race") show("pick");
  } else if (screen === "title" && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    show("pick");
  } else if (screen === "pick") {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") pick.step(-1);
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") pick.step(1);
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      $("pick-go").click();
    }
  }
});

show("title");
