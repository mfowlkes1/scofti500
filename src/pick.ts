// PICK YOUR DRIVER: bold 2D cards like winter games'. Each driver comes with their own car, so it's one pick.
// No driver art yet, so the big card is the car's door (number + livery); the sheets drop in here later.
// The pick is saved (scofti500:driver).
import { ROSTER, driverById, type Driver } from "./roster";

const KEY = "scofti500:driver";
const $ = (id: string) => document.getElementById(id)!;

function paintDoor(el: HTMLElement, d: Driver): void {
  el.style.setProperty("--body", d.body);
  el.style.setProperty("--paint", d.paint);
  el.style.setProperty("--num-fill", d.numFill);
  el.style.setProperty("--num-edge", d.numEdge);
}

export type Pick = { step: (by: number) => void };

export function createPick(onGo: (d: Driver) => void): Pick {
  let cur = 0;
  try {
    const saved = driverById(localStorage.getItem(KEY));
    if (saved) cur = ROSTER.indexOf(saved);
  } catch {
    // no storage: start on the first
  }

  const cards = ROSTER.map((d, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "card";
    b.innerHTML = `<span class="door"><span class="num">${d.number}</span></span><span class="card-name">${d.name}</span>`;
    paintDoor(b.querySelector(".door")!, d);
    b.addEventListener("click", () => {
      cur = i;
      refresh();
    });
    $("pick-cards").append(b);
    return b;
  });

  function refresh(): void {
    const d = ROSTER[cur];
    const hero = $("pick-hero");
    paintDoor(hero, d);
    $("pick-num").textContent = d.number;
    // replay the pop-in each time
    hero.classList.remove("pop");
    void hero.offsetWidth;
    hero.classList.add("pop");
    $("pick-role").textContent = d.role;
    $("pick-name").textContent = d.name;
    $("pick-team").textContent = `#${d.number} · ${d.team}`;
    $("pick-line").textContent = d.line;
    for (const [i, c] of cards.entries()) c.classList.toggle("on", i === cur);
    cards[cur].scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  $("pick-go").addEventListener("click", () => {
    const d = ROSTER[cur];
    try {
      localStorage.setItem(KEY, d.id);
    } catch {
      // no storage: the pick just isn't remembered
    }
    onGo(d);
  });

  refresh();
  return {
    step(by) {
      cur = (cur + by + ROSTER.length) % ROSTER.length;
      refresh();
    },
  };
}
