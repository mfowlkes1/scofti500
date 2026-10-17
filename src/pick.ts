// The pick screens, bold and 2D like winter games': PICK YOUR DRIVER, then PICK YOUR CAR. One picker
// drives both: a big hero image with the name, role and line beside it (below on a phone), a row of
// small cards to switch, and a fat button. Each pick is saved (scofti500:driver, scofti500:car).

const $ = (id: string) => document.getElementById(id)!;

export type PickerItem = { id: string; name: string };

export type PickerOptions<T extends PickerItem> = {
  /** element id prefix: <prefix>-img, -role, -name, -sub, -line, -go, -cards */
  prefix: string;
  items: T[];
  storageKey: string;
  img: (t: T) => string;
  /** the big picture, when it isn't the small card's (a driver head to toe) */
  hero?: (t: T) => string;
  role: (t: T) => string;
  sub: (t: T) => string;
  line: (t: T) => string;
  /** little badge on the small card (a car number, say) */
  badge?: (t: T) => string;
  /** how to earn it, when it's locked (it still shows; only the button won't take it) */
  locked?: (t: T) => string | null;
  /** the button on a locked one, when it can do something (buy a car); without it the button is off */
  onLocked?: (t: T) => void;
  /** colour of the selected card's glow */
  accent?: (t: T) => string;
  /** called each time the shown item changes, with the hero image and the item's small-card image */
  onShow?: (t: T, hero: HTMLImageElement, card: HTMLImageElement) => void;
  onGo: (t: T) => void;
};

export type Picker<T> = { step: (by: number) => void; current: () => T; refresh: () => void };

const LOCK = `<svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="4" y="10" width="16" height="12" rx="2.5" fill="currentColor"/></svg>`;

export function createPicker<T extends PickerItem>(o: PickerOptions<T>): Picker<T> {
  let cur = 0;
  try {
    const saved = o.items.findIndex((t) => t.id === localStorage.getItem(o.storageKey));
    if (saved >= 0) cur = saved;
  } catch {
    // no storage: start on the first
  }

  // warm the art so switching is instant
  for (const t of o.items) new Image().src = (o.hero ?? o.img)(t);

  const cards = o.items.map((t, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "card";
    const badge = o.badge ? `<span class="card-badge">${o.badge(t)}</span>` : "";
    b.innerHTML = `<span class="card-art"><img src="${o.img(t)}" alt="" />${badge}<span class="card-lock">${LOCK}</span></span><span class="card-name">${t.name}</span>`;
    b.addEventListener("click", () => {
      cur = i;
      refresh();
    });
    $(`${o.prefix}-cards`).append(b);
    return b;
  });

  const go = $(`${o.prefix}-go`) as HTMLButtonElement;
  const goLabel = go.textContent ?? "";

  function refresh(): void {
    const t = o.items[cur];
    const img = $(`${o.prefix}-img`) as HTMLImageElement;
    img.src = (o.hero ?? o.img)(t);
    // replay the pop-in each time
    img.classList.remove("pop");
    void img.offsetWidth;
    img.classList.add("pop");
    $(`${o.prefix}-role`).textContent = o.role(t);
    $(`${o.prefix}-name`).textContent = t.name;
    $(`${o.prefix}-sub`).textContent = o.sub(t);
    $(`${o.prefix}-line`).textContent = o.line(t);
    const how = o.locked?.(t) ?? null;
    // locked with nothing to do: dark and off; locked but buyable: still a bright button, with the lock
    go.disabled = !!how && !o.onLocked;
    go.classList.toggle("go-locked", !!how && !o.onLocked);
    go.classList.toggle("go-buy", !!how && !!o.onLocked);
    go.innerHTML = how ? `${LOCK}<span>${how}</span>` : goLabel;
    for (const [i, c] of cards.entries()) {
      c.classList.toggle("on", i === cur);
      c.classList.toggle("locked", !!o.locked?.(o.items[i]));
      c.style.setProperty("--accent", o.accent?.(o.items[i]) ?? "");
    }
    cards[cur].scrollIntoView({ block: "nearest", inline: "nearest" });
    o.onShow?.(t, img, cards[cur].querySelector("img")!);
  }

  go.addEventListener("click", () => {
    const t = o.items[cur];
    if (o.locked?.(t)) return void o.onLocked?.(t);
    try {
      localStorage.setItem(o.storageKey, t.id);
    } catch {
      // no storage: the pick just isn't remembered
    }
    o.onGo(t);
  });

  refresh();
  return {
    step(by) {
      cur = (cur + by + o.items.length) % o.items.length;
      refresh();
    },
    current: () => o.items[cur],
    refresh,
  };
}
