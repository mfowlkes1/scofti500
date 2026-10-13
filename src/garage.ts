// The pit garage's upgrades, like scofti-offroad's garage: SCOFTI Chips (chips.ts) buy them, and each
// car keeps its own. Races pay the chips; you start with enough for a couple of upgrades. Engine
// adds power, brakes stop harder, tires grip more and wear slower, the pit crew changes tires quicker.
// Saved on this device (scofti500:upgrades).

import { chips, spendChips } from "./chips";

export type UpgradeId = "engine" | "brakes" | "tires" | "crew";

export const UPGRADES: { id: UpgradeId; name: string; does: string; cost: number[] }[] = [
  { id: "engine", name: "ENGINE", does: "faster down the straights", cost: [100, 250, 500] },
  { id: "brakes", name: "BRAKES", does: "brake later into the turns", cost: [80, 200, 400] },
  { id: "tires", name: "TIRES", does: "more grip, wear slower", cost: [80, 200, 400] },
  { id: "crew", name: "PIT CREW", does: "quicker pit stops", cost: [60, 150, 300] },
];
export const MAX_LEVEL = 3;

export type Levels = Record<UpgradeId, number>;
const none = (): Levels => ({ engine: 0, brakes: 0, tires: 0, crew: 0 });

const UPGRADES_KEY = "scofti500:upgrades";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
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

export const levels = (carId: string): Levels => ({ ...none(), ...read<Record<string, Levels>>(UPGRADES_KEY, {})[carId] });

/** the price of the next level of an upgrade, or null when it's maxed */
export function nextCost(carId: string, id: UpgradeId): number | null {
  const lv = levels(carId)[id];
  return lv >= MAX_LEVEL ? null : UPGRADES.find((u) => u.id === id)!.cost[lv];
}

/** buys the next level if there are chips for it; true when it went through */
export function buy(carId: string, id: UpgradeId): boolean {
  const cost = nextCost(carId, id);
  if (cost === null || chips() < cost) return false;
  const all = read<Record<string, Levels>>(UPGRADES_KEY, {});
  const lv = levels(carId);
  lv[id]++;
  all[carId] = lv;
  spendChips(cost);
  write(UPGRADES_KEY, all);
  return true;
}

/** what the upgrades make of a car: the stock car's numbers, improved level by level */
export function tuned<T extends { power: number; brake: number; grip: number; wear: number }>(stock: T, carId: string): T {
  const lv = levels(carId);
  return {
    ...stock,
    power: stock.power * (1 + 0.045 * lv.engine),
    brake: stock.brake * (1 + 0.06 * lv.brakes),
    grip: stock.grip * (1 + 0.018 * lv.tires),
    wear: stock.wear * (1 - 0.15 * lv.tires),
  };
}
