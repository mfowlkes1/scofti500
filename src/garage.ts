// The pit garage's money and upgrades, like scofti-offroad's garage: cash buys upgrades, and each car
// keeps its own. Races pay the cash (earn); you start with enough for a couple of upgrades. Engine
// adds power, brakes stop harder, tyres grip more and wear slower, the pit crew changes tyres quicker.
// All saved on this device (scofti500:cash, scofti500:upgrades).

export type UpgradeId = "engine" | "brakes" | "tyres" | "crew";

export const UPGRADES: { id: UpgradeId; name: string; does: string; cost: number[] }[] = [
  { id: "engine", name: "ENGINE", does: "faster down the straights", cost: [1000, 2500, 5000] },
  { id: "brakes", name: "BRAKES", does: "brake later into the turns", cost: [800, 2000, 4000] },
  { id: "tyres", name: "TYRES", does: "more grip, wear slower", cost: [800, 2000, 4000] },
  { id: "crew", name: "PIT CREW", does: "quicker pit stops", cost: [600, 1500, 3000] },
];
export const MAX_LEVEL = 3;
export const STARTING_CASH = 2500;

export type Levels = Record<UpgradeId, number>;
const none = (): Levels => ({ engine: 0, brakes: 0, tyres: 0, crew: 0 });

const CASH_KEY = "scofti500:cash";
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

export const cash = (): number => read(CASH_KEY, STARTING_CASH);
export const levels = (carId: string): Levels => ({ ...none(), ...read<Record<string, Levels>>(UPGRADES_KEY, {})[carId] });

/** the price of the next level of an upgrade, or null when it's maxed */
export function nextCost(carId: string, id: UpgradeId): number | null {
  const lv = levels(carId)[id];
  return lv >= MAX_LEVEL ? null : UPGRADES.find((u) => u.id === id)!.cost[lv];
}

/** buys the next level if there's cash for it; true when it went through */
export function buy(carId: string, id: UpgradeId): boolean {
  const cost = nextCost(carId, id);
  if (cost === null || cash() < cost) return false;
  const all = read<Record<string, Levels>>(UPGRADES_KEY, {});
  const lv = levels(carId);
  lv[id]++;
  all[carId] = lv;
  write(UPGRADES_KEY, all);
  write(CASH_KEY, cash() - cost);
  return true;
}

/** race winnings */
export function earn(amount: number): void {
  write(CASH_KEY, cash() + amount);
}

/** what the upgrades make of a car: the stock car's numbers, improved level by level */
export function tuned<T extends { power: number; brake: number; grip: number; wear: number }>(stock: T, carId: string): T {
  const lv = levels(carId);
  return {
    ...stock,
    power: stock.power * (1 + 0.045 * lv.engine),
    brake: stock.brake * (1 + 0.06 * lv.brakes),
    grip: stock.grip * (1 + 0.018 * lv.tyres),
    wear: stock.wear * (1 - 0.15 * lv.tyres),
  };
}
