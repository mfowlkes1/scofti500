// Every driver and car in one place: change a name, number or colour here and the whole game follows.
// Draft 1 (docs/roster.md). Invented teams only: no real teams, sponsors, makers or tracks.

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

export const ROSTER: Driver[] = [
  {
    id: "scofti",
    name: "scofti",
    number: "17",
    team: "Scofti Racing",
    role: "the rookie",
    line: "Fast, raw, still learning to save his tyres.",
    body: "#0b0b0b",
    numFill: "#b6ff00",
    numEdge: "#000",
    paint: "linear-gradient(115deg, transparent 55%, #b6ff00 55% 62%, transparent 62%)",
  },
  {
    id: "zyra",
    name: "zyra",
    number: "71",
    team: "Scofti Racing",
    role: "the secret weapon",
    line: "The 17 flipped. Lime, black flames, gold glass.",
    body: "#b6ff00",
    numFill: "#0b0b0b",
    numEdge: "#e8c45a",
    paint: "linear-gradient(115deg, transparent 50%, #0b0b0b 50% 58%, transparent 58% 64%, #0b0b0b 64% 68%, transparent 68%)",
  },
  {
    id: "deekdeek",
    name: "deekdeek",
    number: "99",
    team: "Whalers Racing",
    role: "the rival",
    line: "Trades paint all race. Rubbin' is racin'.",
    body: "#9e1424",
    numFill: "#f3d27a",
    numEdge: "#000",
    paint: "linear-gradient(180deg, #d4a63a 0 8%, transparent 8% 92%, #d4a63a 92%)",
  },
  {
    id: "gem",
    name: "gem",
    number: "4",
    team: "Midnight Movers",
    role: "the sneak",
    line: "Steals your draft and slips past low.",
    body: "#16224a",
    numFill: "#fff",
    numEdge: "#16224a",
    paint: "repeating-linear-gradient(180deg, transparent 0 14%, #9cc3ff 14% 23%)",
  },
  {
    id: "metis",
    name: "metis",
    number: "8",
    team: "Black Bob Racing",
    role: "the quiet one",
    line: "Says nothing. Misses nothing.",
    body: "#121214",
    numFill: "#2fe6e6",
    numEdge: "#000",
    paint: "linear-gradient(180deg, transparent 46%, #2fe6e6 46% 54%, transparent 54%)",
  },
  {
    id: "clyde",
    name: "clyde",
    number: "12",
    team: "Sunburst Lab Motorsports",
    role: "the clean one",
    line: "Friendly, fair, always gives you room.",
    body: "#f1e6cf",
    numFill: "#e0761a",
    numEdge: "#3b2410",
    paint: "repeating-conic-gradient(from 0deg at 85% 120%, #f29a1e 0 6deg, transparent 6deg 16deg)",
  },
  {
    id: "tela",
    name: "tela",
    number: "1",
    team: "Snowline Racing",
    role: "the champion",
    line: "Defending champ. The last car to beat.",
    body: "#e9ebee",
    numFill: "#ff4fa3",
    numEdge: "#2a2a2e",
    paint:
      "radial-gradient(circle at 20% 30%, #9aa0a8 0 9%, transparent 9.5%), radial-gradient(circle at 70% 70%, #c3c7cd 0 14%, transparent 14.5%), radial-gradient(circle at 45% 85%, #8a9098 0 7%, transparent 7.5%), radial-gradient(circle at 85% 20%, #b0b5bc 0 10%, transparent 10.5%)",
  },
];

export const driverById = (id: string | null) => ROSTER.find((d) => d.id === id);
