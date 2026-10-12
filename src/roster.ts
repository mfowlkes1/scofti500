// Every driver and car in one place: change a name, line or colour here and the whole game follows.
// Drivers and cars are picked separately; any driver can take any car (Michael, 2026-10-12).
// Invented teams only: no real teams, sponsors, makers or tracks.
// Art is cut from the sheets in art/reference: faces into public/img/drivers/<id>.jpg,
// car shots into public/img/cars/<id>.jpg.

export type Driver = {
  id: string;
  name: string;
  team: string;
  role: string;
  line: string;
};

export type Car = {
  id: string;
  number: string;
  /** the era badge on the card */
  era: string;
  name: string;
  line: string;
  /** main paint colour, for the card glow */
  accent: string;
};

export const DRIVERS: Driver[] = [
  {
    id: "madhuvan",
    name: "madhuvan",
    team: "Scofti Racing",
    role: "the closer",
    line: "Smiles on the grid. Gone by turn three.",
  },
  {
    id: "allan",
    name: "allan",
    team: "Scofti Racing",
    role: "the hotshot",
    line: "Cocky, quick, and grinning the whole way round.",
  },
  {
    id: "si",
    name: "si",
    team: "Scofti Racing",
    role: "the wild card",
    line: "Nobody knows what's in the bubble. Nobody asks.",
  },
];

export const CARS: Car[] = [
  {
    id: "17-modern",
    number: "17",
    era: "modern",
    name: "the 17",
    line: "Today's car. Low, wide, splattered in lime.",
    accent: "#b6ff00",
  },
  {
    id: "43-eighties",
    number: "43",
    era: "'80s",
    name: "the brawler",
    line: "A big square box. Rubbin' is racin'.",
    accent: "#b6ff00",
  },
  {
    id: "43-muscle",
    number: "43",
    era: "'60s",
    name: "the muscle",
    line: "Chrome bumper, round lights, big old heart.",
    accent: "#b6ff00",
  },
  {
    id: "7-owl",
    number: "7",
    era: "'80s",
    name: "the hooter",
    line: "Sees the gap before it opens.",
    accent: "#ff7a1a",
  },
];

const byId = <T extends { id: string }>(list: T[], id: string | null) => list.find((x) => x.id === id);
export const driverById = (id: string | null) => byId(DRIVERS, id);
export const carById = (id: string | null) => byId(CARS, id);
export const faceUrl = (d: Driver) => `${import.meta.env.BASE_URL}img/drivers/${d.id}.jpg`;
export const carUrl = (c: Car) => `${import.meta.env.BASE_URL}img/cars/${c.id}.jpg`;
