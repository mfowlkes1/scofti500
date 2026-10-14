// A phone browser can't be locked sideways (the Android app is, in its manifest). So when the phone
// swings upright the page turns itself back: the whole game is drawn a quarter turn round, the way it
// sat before, and the race keeps going (Michael, 2026-10-14: no TURN YOUR PHONE screen, no stopping).
// html.turned does the turning; vite.config.ts's turnedCss() gives every sideways-phone layout rule and
// screen-size unit a copy that reads the turned body instead of the upright screen.

let turned = false;
/** the screen angle the phone last had sideways (90: turned to the left, 270: to the right) */
let lastAngle = 90;
/** the turn the game is drawn at to sit as it did then: a quarter turn clockwise, or anticlockwise */
let rot = 90;

const screenAngle = (): number =>
  ((screen.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0) + 360) % 360;

function check(): void {
  const root = document.documentElement;
  const upright = matchMedia("(pointer: coarse)").matches && innerHeight > innerWidth;
  if (!upright) {
    // remember which way round it was sideways, to turn back to the same side
    const a = screenAngle();
    if (a === 90 || a === 270) lastAngle = a;
    rot = lastAngle === 90 ? 90 : -90;
  }
  turned = upright;
  root.classList.toggle("turned", upright);
  root.classList.toggle("turned-cw", upright && rot === 90);
  root.style.setProperty("--turn-w", `${innerHeight}px`);
  root.style.setProperty("--turn-h", `${innerWidth}px`);
}
check();
addEventListener("resize", check);
addEventListener("orientationchange", check);

/** the screen's rotation as the game sees it: the sideways one it's drawn at, when turned */
export function viewAngle(): number {
  return turned ? (screenAngle() + lastAngle) % 360 : screenAngle();
}

/** a pointer's left-to-right place across the game, turned or not */
export function pointerX(e: { clientX: number; clientY: number }): number {
  if (!turned) return e.clientX;
  return rot === -90 ? innerHeight - e.clientY : e.clientY;
}

/** an element's left edge across the game, turned or not */
export function boxLeft(el: Element): number {
  const r = el.getBoundingClientRect();
  if (!turned) return r.left;
  return rot === -90 ? innerHeight - r.bottom : r.top;
}
