// Every driver and car in one place: change a name, number or colour here and the whole game follows.
// Just these three for now (Michael, 2026-10-12). Invented teams only: no real teams, sponsors, makers or tracks.
// Faces are cut from the sheets in art/reference into public/img/drivers/<id>.jpg.

export type Driver = {
  id: string;
  name: string;
  number: string;
  team: string;
  role: string;
  line: string;
  /** car body colour */
  body: string;
  /** door number fill and outline */
  numFill: string;
  numEdge: string;
  /** the livery painted over the body on the door (a CSS background) */
  paint: string;
};

// one checkered row across the door, 80% of the way down
const CHECKS = "repeating-conic-gradient(#fff 0 25%, #0b0b0b 0 50%) 0 80% / 20px 20px repeat-x";

export const ROSTER: Driver[] = [
  {
    id: "madhuvan",
    name: "madhuvan",
    number: "27",
    team: "Scofti Racing",
    role: "the closer",
    line: "Smiles on the grid. Gone by turn three.",
    body: "#d0141f",
    numFill: "#fff",
    numEdge: "#0b0b0b",
    // red, a checkered strip low on the door over a black band
    paint: `${CHECKS}, linear-gradient(180deg, transparent 0 72%, #0b0b0b 72% 92%, transparent 92%)`,
  },
  {
    id: "allan",
    name: "allan",
    number: "33",
    team: "Scofti Racing",
    role: "the hotshot",
    line: "Cocky, quick, and grinning the whole way round.",
    body: "#0b0b0b",
    numFill: "#fff",
    numEdge: "#d0141f",
    paint: "linear-gradient(105deg, transparent 58%, #d0141f 58% 66%, #fff 66% 69%, #d0141f 69% 74%, transparent 74%)",
  },
  {
    id: "si",
    name: "si",
    number: "00",
    team: "Scofti Racing",
    role: "the wild card",
    line: "Nobody knows what's in the bubble. Nobody asks.",
    body: "#0b0b0b",
    numFill: "#e9f2ff",
    numEdge: "#d0141f",
    paint:
      "radial-gradient(120% 90% at 85% 15%, rgba(255, 190, 240, 0.55), rgba(140, 200, 255, 0.35) 35%, rgba(255, 230, 150, 0.25) 55%, transparent 70%), linear-gradient(180deg, transparent 84%, #d0141f 84% 90%, transparent 90%)",
  },
];

export const driverById = (id: string | null) => ROSTER.find((d) => d.id === id);
export const faceUrl = (d: Driver) => `${import.meta.env.BASE_URL}img/drivers/${d.id}.jpg`;
