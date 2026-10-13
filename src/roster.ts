// Every driver and car in one place: change a name, line or colour here and the whole game follows.
// Drivers and cars are picked separately; any driver can take any car (Michael, 2026-10-12).
// Invented teams only: no real teams, sponsors, makers or tracks.
// Art is cut from the sheets in art/reference: faces into public/img/drivers/<id>.jpg,
// car shots into public/img/cars/<id>.jpg.

import type { KeyHue } from "./paint";

// lime splatter on black
const LIME: KeyHue = { hue: 80, width: 26 };

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
  /** main paint colour, for the card glow and the stock swatch */
  accent: string;
  /** the hue band of the car's own paint, which the colour picker repaints */
  key: KeyHue;
  /** the colour it starts in: "stock" keeps the sheet's own paint (only offered when it's the default) */
  paint: string;
  /** which views of the car there are to turn through (0 = the front three-quarter shot, 1 = rear three-quarter, 2 = side, 4 = top) */
  views: number[];
};

export const DRIVERS: Driver[] = [
  {
    id: "raven",
    name: "raven",
    team: "Scofti Racing",
    role: "the hotshot",
    line: "Smirks on the grid. Laughs on the last lap.",
  },
  {
    id: "reba",
    name: "reba",
    team: "Scofti Racing",
    role: "the ice queen",
    line: "Never smiles on the grid. Never misses a mark.",
  },
  {
    id: "foxy",
    name: "foxy",
    team: "Scofti Racing",
    role: "the veteran",
    line: "Twenty years of short tracks. Still the one to beat.",
  },
];

export const CARS: Car[] = [
  {
    id: "17-modern",
    number: "17",
    era: "modern",
    name: "guyute",
    line: "Today's car. Low, wide, all splatter.",
    accent: "#d9dde3",
    // the 17 is lime itself, so in black it goes silver (where it sits in each view)
    key: { ...LIME, numbers: { 0: [[0.17, 0.28, 0.35, 0.64]], 2: [[0.35, 0.42, 0.56, 0.66]], 4: [[0.46, 0.26, 0.7, 0.55]] } },
    // no lime on the cars (Michael)
    // starts in white camo (Michael: "that one is BADASS")
    paint: "white-camo",
    // no rear views: the sheet shows a real maker's badge on the back
    views: [0, 2, 4],
  },
  {
    id: "43-eighties",
    number: "43",
    era: "'80s",
    name: "the brawler",
    line: "A big square box. Rubbin' is racin'.",
    accent: "#d9dde3",
    key: LIME,
    // no lime on the cars (Michael)
    paint: "black",
    views: [0, 1, 2, 4],
  },
  {
    id: "3-muscle",
    number: "3",
    era: "'60s",
    name: "the muscle",
    line: "Chrome bumper, round lights, big old heart.",
    accent: "#d9dde3",
    key: LIME,
    // no lime on the cars (Michael)
    paint: "black",
    views: [0, 1, 2, 4],
  },
  {
    id: "7-owl",
    number: "7",
    era: "'80s",
    name: "the hooter",
    line: "Sees the gap before it opens.",
    accent: "#ff7a1a",
    // the orange sky in the top-left corner stays put
    key: { hue: 24, width: 16, skip: { 0: [[0, 0, 0.31, 0.43]], 1: [[0, 0, 0.12, 0.5], [0.9, 0, 1, 0.5]] } },
    paint: "stock",
    views: [0, 1, 2, 4],
  },
];

const byId = <T extends { id: string }>(list: T[], id: string | null) => list.find((x) => x.id === id);
export const driverById = (id: string | null) => byId(DRIVERS, id);
export const carById = (id: string | null) => byId(CARS, id);
export const faceUrl = (d: Driver) => `${import.meta.env.BASE_URL}img/drivers/${d.id}.jpg`;
/** head to toe, the front view off the driver's sheet */
export const fullUrl = (d: Driver) => `${import.meta.env.BASE_URL}img/drivers/${d.id}-full.jpg`;
export const carUrl = (c: Car, view = 0) => `${import.meta.env.BASE_URL}img/cars/${c.id}${view ? `-${view}` : ""}.jpg`;

// Tracks. Invented names only, never a real venue (Michael picked "martinsvale" and "Hotlanta",
// 2026-10-12). Their shapes and numbers are in race/track.ts.
export type Track = {
  id: string;
  name: string;
  /** shape and length, shown under the name */
  kind: string;
  line: string;
  /** a night race under the lights, or a day race */
  night: boolean;
};

export const TRACKS: Track[] = [
  {
    id: "martinsvale",
    name: "martinsvale",
    kind: "paperclip · half a mile",
    line: "Two long straights, two tight hairpins. Flat out, stand on the brakes, bump your way round.",
    night: true,
  },
  {
    id: "hotlanta",
    name: "hotlanta",
    kind: "tri-oval · a mile and a half",
    line: "Wide open and wicked fast. Run in the pack, ride the draft, slingshot past. Lift only when the tires go.",
    night: false,
  },
];
