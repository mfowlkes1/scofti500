// Every line on the radio, by key. The race says them by key; tools/voices.ts records each one with
// ElevenLabs into public/audio/radio/<key>.mp3 (and lists them in lines.json). A line with no
// recording yet is read by the browser's voice.
import type { Who } from "./radio";
import { RIVALS } from "./rivals";

export type Line = {
  who: Who;
  text: string;
  /** shown on screen instead of the role (a driver's name) */
  label?: string;
  /** an ElevenLabs voice for this line instead of the role's */
  voice?: string;
  /** not over the radio: no two-way-radio filter */
  clean?: boolean;
};

const lines: Record<string, Line> = {
  "ann-welcome": { who: "announcer", text: "Good evening, race fans, and welcome to Martinsvale under the lights!" },
  "crew-pace": { who: "crew", text: "Double file behind the pace car. Stay in line till the green, then it's all you." },
  "spot-green": { who: "spotter", text: "Green, green, green!" },
  "spot-car-high": { who: "spotter", text: "Car high." },
  "spot-car-low": { who: "spotter", text: "Car low." },
  "spot-three-wide": { who: "spotter", text: "Three wide! You're in the middle." },
  "spot-clear": { who: "spotter", text: "Clear." },
  "crew-white": { who: "crew", text: "White flag. Last lap, bring it home." },
  "crew-pit-call": { who: "crew", text: "Pit this time by. Four tyres, we're ready." },
  "crew-stay-out": { who: "crew", text: "Okay, stay out. Stay out." },
  "crew-pit-in": { who: "crew", text: "Pit road's open. Come on down, we've got you on the limiter." },
  "crew-four-tyres": { who: "crew", text: "Four tyres, four tyres!" },
  "crew-pit-out": { who: "crew", text: "Go, go, go! Cold tyres, take it easy for a lap." },
  "crew-tyres-half": { who: "crew", text: "Tyres are starting to go away. Be easy on 'em in the corners." },
  "crew-tyres-gone": { who: "crew", text: "Those tyres are about done. Pit when you want, we're ready." },
  "crew-lead": { who: "crew", text: "You're leading! P1!" },
  "crew-win": { who: "crew", text: "You won it! You won Martinsvale! Burn it down, kid!" },
  "crew-podium-2": { who: "crew", text: "P2. Great run, that's a podium." },
  "crew-podium-3": { who: "crew", text: "P3. Great run, that's a podium." },
  "crew-next-time": { who: "crew", text: "We'll get 'em next time. Bring it on in." },
  "spot-wall": { who: "spotter", text: "Whoa, you're okay. Keep going." },
};
// moving up: "That's P5. Keep going."
for (let p = 2; p <= 8; p++) lines[`crew-pos-${p}`] = { who: "crew", text: `That's P${p}. Keep going.` };
// counting down the laps
for (const n of [3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]) lines[`crew-togo-${n}`] = { who: "crew", text: `${n} to go.` };
// who's pitting, and who won
for (const r of RIVALS) {
  const id = slug(r.name);
  lines[`crew-pitting-${id}`] = { who: "crew", text: `${r.name} is pitting.` };
  lines[`ann-win-${id}`] = { who: "announcer", text: `Checkered flag! ${r.name} wins at Martinsvale!` };
}
for (const name of ["Madhuvan", "Allan", "Si"]) lines[`ann-win-${slug(name)}`] = { who: "announcer", text: `Checkered flag! ${name} wins it under the lights!` };

// the drivers talk back. Madhuvan: "Jessa" from the ElevenLabs library (Michael, 2026-10-12)
const DRIVER_VOICES: Record<string, string> = { madhuvan: "yj30vwTGJxSHezdAGsv9" };
const DRIVER_LINES: Record<string, string> = {
  green: "Here we go!",
  pit: "Copy. Coming in.",
  win: "Woo! That one's for the crew! Look at that infield!",
  podium: "Good run tonight. We'll be back.",
  wall: "I'm okay, I'm okay. Talk to me.",
};
for (const [driver, voice] of Object.entries(DRIVER_VOICES)) {
  const label = driver.toUpperCase();
  for (const [k, text] of Object.entries(DRIVER_LINES)) lines[`drv-${driver}-${k}`] = { who: "driver", text, label, voice };
  // said when you pick her, not on the radio
  lines[`drv-${driver}-pick`] = { who: "driver", text: "Madhuvan. Let's go racing.", label, voice, clean: true };
}

export const LINES = lines;

export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
