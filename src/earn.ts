// Drivers you earn (Michael, 2026-10-17): Raven and Paige are open to everyone; Reba, Maia and Lynx
// join Scofti Racing once you've proved yourself on track. Earned, never bought: no chips. Locked
// drivers still show and still say hello on the pick screen. Only race night / race day counts, not
// preseason testing. Saved on this device (scofti500:earned, and the tracks won at in scofti500:wins).

const EARNED_KEY = "scofti500:earned";
const WINS_KEY = "scofti500:wins";

type Rule = { id: string; how: string; met: (pos: number, wins: string[]) => boolean };

// in the order you earn them
const RULES: Rule[] = [
  { id: "reba", how: "FINISH ON THE PODIUM TO EARN REBA", met: (pos) => pos <= 3 },
  { id: "maia", how: "WIN A RACE TO EARN MAIA", met: (pos) => pos === 1 },
  { id: "lynx", how: "WIN AT HOTLANTA AND MARTINSVALE TO EARN LYNX", met: (_, wins) => wins.includes("hotlanta") && wins.includes("martinsvale") },
];

function read(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, list: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // no storage: it just isn't remembered
  }
}

/** how to earn this driver, or null when she's open */
export function lockedHow(id: string): string | null {
  const rule = RULES.find((r) => r.id === id);
  return rule && !read(EARNED_KEY).includes(id) ? rule.how : null;
}

/** a race finished (not preseason): remembers a win, and returns the drivers it just earned */
export function raceFinished(pos: number, track: string): string[] {
  const wins = read(WINS_KEY);
  if (pos === 1 && !wins.includes(track)) write(WINS_KEY, (wins.push(track), wins));
  const earned = read(EARNED_KEY);
  const fresh = RULES.filter((r) => !earned.includes(r.id) && r.met(pos, wins)).map((r) => r.id);
  if (fresh.length) write(EARNED_KEY, [...earned, ...fresh]);
  return fresh;
}
