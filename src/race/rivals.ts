// The other seven in the field: made-up drivers in the same four cars, in other paints. Each one
// races their own way: skill is how close to the limit they drive, aggression how happily they
// lean on the car in front.
export type Rival = { name: string; carId: string; paint: string; skill: number; aggression: number; style: string };

export const RIVALS: Rival[] = [
  { name: "Dixie Hart", carId: "17-modern", paint: "blue", skill: 0.975, aggression: 0.35, style: "smooth and fast" },
  { name: "Buck Tarwater", carId: "43-eighties", paint: "red", skill: 0.968, aggression: 0.95, style: "moves you out of the way" },
  { name: "Tex Calloway", carId: "7-owl", paint: "white", skill: 0.965, aggression: 0.55, style: "hard to get by" },
  { name: "Hoss Delaney", carId: "3-muscle", paint: "yellow", skill: 0.962, aggression: 0.6, style: "steady" },
  { name: "Jolene Brisket", carId: "17-modern", paint: "woods-camo", skill: 0.958, aggression: 0.3, style: "saves her tyres" },
  { name: "Skeeter Mudd", carId: "43-eighties", paint: "orange", skill: 0.955, aggression: 1, style: "wild" },
  { name: "Bo Lightfoot", carId: "3-muscle", paint: "purple", skill: 0.95, aggression: 0.2, style: "a rookie" },
];
