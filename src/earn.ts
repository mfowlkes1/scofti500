// Drivers you earn (Michael, 2026-10-17): Raven and Paige are open to everyone; Reba, Maia and Lynx
// join Scofti Racing once you've proved yourself on track. Earned, never bought: no chips. Locked
// drivers still show and still say hello on the pick screen.
//
// Cars are different: they can be bought with chips or earned on track, whichever comes first. Guyute
// and the brawler are open to everyone.
//
// Only race night / race day counts, not preseason testing. Saved on this device: scofti500:earned
// (drivers and cars earned or bought), scofti500:wins (every win, by track) and scofti500:races (how
// many races finished).

import { spendChips } from "./chips";

const EARNED_KEY = "scofti500:earned";
const WINS_KEY = "scofti500:wins";
const RACES_KEY = "scofti500:races";

type Run = { pos: number; wins: string[]; races: number };
type Rule = { id: string; how: string; met: (r: Run) => boolean };
type CarRule = Rule & { price: number };

// in the order you earn them
const RULES: Rule[] = [
  { id: "reba", how: "FINISH ON THE PODIUM TO PLAY WITH REBA", met: (r) => r.pos <= 3 },
  { id: "maia", how: "MAIA WON'T JOIN A TEAM WITHOUT A WIN", met: (r) => r.pos === 1 },
  // any three wins, at any tracks
  { id: "lynx", how: "3 WINS AND YOU CAN PLAY WITH LYNX", met: (r) => r.wins.length >= 3 },
];

// the cars by car id: a price in chips, or the goal that earns it
const CAR_RULES: CarRule[] = [
  { id: "3-muscle", price: 1000, how: "OR FINISH 5 RACES", met: (r) => r.races >= 5 },
  { id: "7-owl", price: 1500, how: "OR WIN AT MARTINSVALE", met: (r) => r.wins.includes("martinsvale") },
  { id: "90-nineties", price: 2500, how: "OR WIN AT HOTLANTA", met: (r) => r.wins.includes("hotlanta") },
];

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // no storage: it just isn't remembered
  }
}

const earned = () => read<string[]>(EARNED_KEY, []);
const add = (ids: string[]) => {
  if (ids.length) write(EARNED_KEY, [...earned(), ...ids]);
};

/** how to earn this driver, or null when she's open */
export function lockedHow(id: string): string | null {
  const rule = RULES.find((r) => r.id === id);
  return rule && !earned().includes(id) ? rule.how : null;
}

/** a locked car's price and the goal that earns it instead, or null when it's yours */
export function carLock(id: string): { price: number; how: string } | null {
  const rule = CAR_RULES.find((r) => r.id === id);
  return rule && !earned().includes(id) ? { price: rule.price, how: rule.how } : null;
}

/** buys a locked car if there are chips for it; true when it went through */
export function buyCar(id: string): boolean {
  const lock = carLock(id);
  if (!lock || !spendChips(lock.price)) return false;
  add([id]);
  return true;
}

/** a race finished (not preseason): remembers it and any win, and returns the drivers and cars it
 * just earned */
export function raceFinished(pos: number, track: string): { drivers: string[]; cars: string[] } {
  const wins = read<string[]>(WINS_KEY, []);
  if (pos === 1) write(WINS_KEY, (wins.push(track), wins));
  const races = read<number>(RACES_KEY, 0) + 1;
  write(RACES_KEY, races);
  const have = earned();
  const now = (rules: Rule[]) => rules.filter((r) => !have.includes(r.id) && r.met({ pos, wins, races })).map((r) => r.id);
  const fresh = { drivers: now(RULES), cars: now(CAR_RULES) };
  add([...fresh.drivers, ...fresh.cars]);
  return fresh;
}
