// The rest of the field: made-up drivers in the same four cars, in other paints. Each one races
// their own way: skill is how close to the limit they drive, aggression how happily they lean on the
// car in front. The first seven race everywhere; the big tracks fill out a full field (Hotlanta: 35
// cars, Michael 2026-10-13) with the pack after them. Every rival has a number of their own, painted
// over the model's (carNumber.ts).
export type Rival = { name: string; number: string; carId: string; paint: string; skill: number; aggression: number; style: string };

export const RIVALS: Rival[] = [
  { name: "Dixie Hart", number: "88", carId: "17-modern", paint: "blue", skill: 0.975, aggression: 0.35, style: "smooth and fast" },
  { name: "Buck Tarwater", number: "13", carId: "43-eighties", paint: "red", skill: 0.968, aggression: 0.95, style: "moves you out of the way" },
  { name: "Tex Calloway", number: "70", carId: "7-owl", paint: "white", skill: 0.965, aggression: 0.55, style: "hard to get by" },
  { name: "Hoss Delaney", number: "33", carId: "3-muscle", paint: "yellow", skill: 0.962, aggression: 0.6, style: "steady" },
  { name: "Jolene Brisket", number: "25", carId: "17-modern", paint: "woods-camo", skill: 0.958, aggression: 0.3, style: "saves her tires" },
  { name: "Skeeter Mudd", number: "66", carId: "43-eighties", paint: "orange", skill: 0.955, aggression: 1, style: "wild" },
  { name: "Bo Lightfoot", number: "95", carId: "3-muscle", paint: "purple", skill: 0.95, aggression: 0.2, style: "a rookie" },
];

// the pack: name, number, car, paint, skill, aggression
const PACK: [string, string, string, string, number, number][] = [
  ["Waylon Pickett", "2", "7-owl", "black", 0.966, 0.5],
  ["Darla Mae Swift", "4", "17-modern", "pink", 0.964, 0.4],
  ["Rusty Kincaid", "5", "43-eighties", "green", 0.962, 0.7],
  ["Cooter Briggs", "6", "3-muscle", "orange", 0.96, 0.9],
  ["Lonnie Fairbanks", "8", "7-owl", "blue", 0.959, 0.3],
  ["Duke Rawlins", "9", "17-modern", "red", 0.958, 0.8],
  ["Savannah Rhodes", "10", "43-eighties", "white-camo", 0.957, 0.45],
  ["Earl Tatum", "11", "3-muscle", "white", 0.956, 0.35],
  ["Cash Holloway", "12", "7-owl", "yellow", 0.955, 0.65],
  ["Billy Ray Gaskins", "14", "17-modern", "purple", 0.954, 0.75],
  ["Clem Hollister", "15", "43-eighties", "black", 0.953, 0.25],
  ["Wade Bassett", "16", "3-muscle", "green", 0.952, 0.55],
  ["Junior Pruitt", "18", "7-owl", "orange", 0.951, 0.85],
  ["Lula Belle Tanner", "19", "17-modern", "white", 0.95, 0.4],
  ["Hank Dillard", "20", "43-eighties", "blue", 0.949, 0.6],
  ["Boone Whitaker", "21", "3-muscle", "woods-camo", 0.948, 0.5],
  ["Lucky Stroud", "22", "7-owl", "red", 0.947, 0.95],
  ["Travis McCracken", "24", "17-modern", "yellow", 0.946, 0.3],
  ["Sonny Beaumont", "28", "43-eighties", "pink", 0.945, 0.45],
  ["Roscoe Pike", "31", "3-muscle", "black", 0.944, 0.7],
  ["Vern Huckaby", "38", "7-owl", "green", 0.943, 0.2],
  ["Gus Hargrove", "41", "17-modern", "orange", 0.942, 0.6],
  ["Jimmy Joe Craddock", "42", "43-eighties", "purple", 0.941, 0.8],
  ["Merle Haskins", "47", "3-muscle", "blue", 0.94, 0.35],
  ["Otis Fenwick", "48", "7-owl", "white-camo", 0.939, 0.5],
  ["Tucker Graves", "54", "17-modern", "green", 0.938, 0.9],
  ["Delbert Moody", "99", "43-eighties", "white", 0.936, 0.25],
];
export const PACK_RIVALS: Rival[] = PACK.map(([name, number, carId, paint, skill, aggression]) => ({ name, number, carId, paint, skill, aggression, style: "" }));

/** the rivals for a field of this many cars (you make the last one) */
export const fieldOf = (cars: number): Rival[] => [...RIVALS, ...PACK_RIVALS].slice(0, cars - 1);
