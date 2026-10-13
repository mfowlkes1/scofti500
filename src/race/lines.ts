// Every line on the radio, by key. The race says them by key; tools/voices.ts records each one with
// ElevenLabs into public/audio/radio/<key>.mp3 (and lists them in lines.json). A line with no
// recording yet is read by the browser's voice.
import type { Who } from "./radio";
import { PACK_RIVALS, RIVALS } from "./rivals";

export type Line = {
  who: Who;
  text: string;
  /** shown on screen instead of the role (a driver's name) */
  label?: string;
  /** an ElevenLabs voice for this line instead of the role's */
  voice?: string;
  /** not over the radio: no two-way-radio filter */
  clean?: boolean;
  /** what the voice reads, when it gets the written words wrong (Si) */
  spoken?: string;
};

const lines: Record<string, Line> = {
  "ann-welcome": { who: "announcer", text: "Good evening, race fans, and welcome to Martinsvale under the lights!" },
  // what the series is for (Michael, 2026-10-13: whoever wins it "gets a deal with the big boys"). The
  // series is the Scofti Academy, all women; the SCOFTI 500 is its big race
  "ann-stakes": { who: "announcer", text: "This is the SCOFTI 500, folks, the crown jewel of the Scofti Academy! Whoever takes the Academy championship earns a ride with the big boys!" },
  "crew-pace": { who: "crew", text: "Double file behind the pace car. Stay in line till the green, then it's all you." },
  "spot-green": { who: "spotter", text: "Green, green, green!" },
  "spot-car-high": { who: "spotter", text: "Car high." },
  "spot-car-low": { who: "spotter", text: "Car low." },
  "spot-three-wide": { who: "spotter", text: "Three wide! You're in the middle." },
  "spot-clear": { who: "spotter", text: "Clear." },
  "crew-white": { who: "crew", text: "White flag. Last lap, bring it home." },
  "crew-pit-call": { who: "crew", text: "Pit this time by. Four tires, we're ready." },
  "crew-stay-out": { who: "crew", text: "Okay, stay out. Stay out." },
  "crew-pit-in": { who: "crew", text: "Pit road's open. Come on down, we've got you on the limiter." },
  "crew-four-tires": { who: "crew", text: "Four tires, four tires!" },
  "crew-pit-out": { who: "crew", text: "Go, go, go! Cold tires, take it easy for a lap." },
  "crew-tires-half": { who: "crew", text: "Tires are starting to go away. Be easy on 'em in the corners." },
  "crew-tires-gone": { who: "crew", text: "Those tires are about done. Pit when you want, we're ready." },
  "crew-lead": { who: "crew", text: "You're leading! P1!" },
  "crew-win": { who: "crew", text: "You won it! You won Martinsvale! Burn it down, kid!" },
  "crew-podium-2": { who: "crew", text: "P2. Great run, that's a podium." },
  "crew-podium-3": { who: "crew", text: "P3. Great run, that's a podium." },
  "crew-next-time": { who: "crew", text: "We'll get 'em next time. Bring it on in." },
  "spot-wall": { who: "spotter", text: "Whoa, you're okay. Keep going." },
};
// moving up: "That's P5. Keep going."
for (let p = 2; p <= 35; p++) lines[`crew-pos-${p}`] = { who: "crew", text: `That's P${p}. Keep going.` };
// counting down the laps
for (const n of [3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]) lines[`crew-togo-${n}`] = { who: "crew", text: `${n} to go.` };
// who's pitting, and who won
for (const r of RIVALS) {
  const id = slug(r.name);
  lines[`crew-pitting-${id}`] = { who: "crew", text: `${r.name} is pitting.` };
  lines[`ann-win-${id}`] = { who: "announcer", text: `Checkered flag! ${r.name} wins at Martinsvale!` };
}
for (const name of ["Raven", "Reba", "Lynx", "Maia", "Paige"]) lines[`ann-win-${slug(name)}`] = { who: "announcer", text: `Checkered flag! ${name} wins it under the lights!` };

// ---- more radio: the crew chief, the spotter and the announcer talking you round ----
Object.assign(lines, {
  "crew-how-car": { who: "crew", text: "Talk to me. How's the car feel?" },
  "crew-copy-good": { who: "crew", text: "Love to hear it. We won't touch a thing." },
  "crew-copy-fix": { who: "crew", text: "Copy. We'll fix it on the next stop." },
  "crew-closing": { who: "crew", text: "You're faster than the car in front. Reel 'em in." },
  "crew-catching": { who: "crew", text: "Car behind's coming. Hit your marks." },
  "crew-fastest": { who: "crew", text: "Fastest lap of the race! That's what I'm talkin' about!" },
  "crew-halfway": { who: "crew", text: "Halfway. Car looks good, keep doing what you're doing." },
  "crew-smooth": { who: "crew", text: "Breathe. Smooth is fast." },
  "crew-go-get-em": { who: "crew", text: "Leader's right up the road. Go get 'em." },
  "crew-passed-ok": { who: "crew", text: "That's alright. Plenty of laps left." },
  "crew-great-stop": { who: "crew", text: "Great stop, boys! Great stop!" },
  "crew-rubbing": { who: "crew", text: "Easy on the fenders. We need it in one piece." },
  "crew-nice-move": { who: "crew", text: "Nice move!" },
  "crew-lapped": { who: "crew", text: "Lapped cars coming up. Be patient." },
  "spot-still-there": { who: "spotter", text: "Still there. Still there." },
  "spot-clear-go": { who: "spotter", text: "You're clear! Go, go!" },
  "spot-run": { who: "spotter", text: "Car behind's got a run on you." },
  "spot-clean": { who: "spotter", text: "Clean pass. Good job." },
  "spot-pit-road": { who: "spotter", text: "Pit road's clear, all the way down." },
  "ann-green": { who: "announcer", text: "Green flag! Here they come at Martinsvale!" },
  "ann-halfway": { who: "announcer", text: "We are halfway home here at Martinsvale!" },
  "ann-white": { who: "announcer", text: "White flag! One lap to go!" },
} satisfies Record<string, Line>);
// Hotlanta's versions of the lines that name the track (the race picks "<key>-hotlanta" there)
Object.assign(lines, {
  "ann-welcome-hotlanta": { who: "announcer", text: "Good afternoon, race fans, and welcome to Hotlanta! It's a hot one today!" },
  "ann-green-hotlanta": { who: "announcer", text: "Green flag! Here they come at Hotlanta!" },
  "ann-halfway-hotlanta": { who: "announcer", text: "We are halfway home here at Hotlanta!" },
  "crew-win-hotlanta": { who: "crew", text: "You won it! You won Hotlanta! Burn it down, kid!" },
} satisfies Record<string, Line>);
for (const r of RIVALS) lines[`ann-win-${slug(r.name)}-hotlanta`] = { who: "announcer", text: `Checkered flag! ${r.name} wins at Hotlanta!` };
for (const name of ["Raven", "Reba", "Lynx", "Maia", "Paige"]) lines[`ann-win-${slug(name)}-hotlanta`] = { who: "announcer", text: `Checkered flag! ${name} wins it at Hotlanta!` };
// cautions: a wreck brings out the yellow and the pace car; the field restarts double file
Object.assign(lines, {
  "spot-caution": { who: "spotter", text: "Caution, caution! Wreck up ahead, slow it down!" },
  "ann-caution": { who: "announcer", text: "Yellow flag! There's trouble on the track!" },
  "crew-caution": { who: "crew", text: "Caution's out. Ride it out behind the pace car. We'll restart double file." },
  "crew-restart-soon": { who: "crew", text: "Pace car's coming in. Green flag next time by. Get ready!" },
  "ann-restart": { who: "announcer", text: "And we're back to green!" },
} satisfies Record<string, Line>);
// qualifying (race night): the warm-up, the lap, and how it went
Object.assign(lines, {
  "crew-qual-warm": { who: "crew", text: "Warm-up lap. Get some heat in those tires. Then it's one lap, all you've got." },
  "crew-qual-go": { who: "crew", text: "Green flag, you're on your lap! Make it count!" },
  "crew-qual-pole": { who: "crew", text: "That's the pole! We're starting up front!" },
  "crew-qual-top": { who: "crew", text: "Great lap! That's a top ten starting spot." },
  "crew-qual-mid": { who: "crew", text: "Good lap. We'll start mid-pack and work our way up." },
  "crew-qual-back": { who: "crew", text: "We'll be starting in the back. Plenty of time to pass 'em all." },
  "ann-pole": { who: "announcer", text: "And that's the pole! What a lap!" },
} satisfies Record<string, Line>);
// the announcer calls every lead change
for (const r of RIVALS) lines[`ann-lead-${slug(r.name)}`] = { who: "announcer", text: `${r.name} takes the lead!` };
for (const name of ["Raven", "Reba", "Lynx", "Maia", "Paige"]) lines[`ann-lead-${slug(name)}`] = { who: "announcer", text: `${name} takes the lead! Listen to this crowd!` };
// the pack (Hotlanta's full field): who leads, who wins, who's pitting
for (const r of PACK_RIVALS) {
  const id = slug(r.name);
  lines[`ann-lead-${id}`] = { who: "announcer", text: `${r.name} takes the lead!` };
  lines[`ann-win-${id}-hotlanta`] = { who: "announcer", text: `Checkered flag! ${r.name} wins at Hotlanta!` };
  lines[`crew-pitting-${id}`] = { who: "crew", text: `${r.name} is pitting.` };
}

// ---- the drivers ----
// The series is all women (Michael, 2026-10-13); he picked each voice. Reba: "SCOFTI CON daisy", a voice
// he designed (Madhuvan's, before she left). From the ElevenLabs library: Raven "Blue - Neutral, Vocal
// Fry, Commentator", Lynx "Marie - Young & Optimistic", Maia "Eryn - Strong Female Military Commander",
// Paige "Jessa - Easygoing and Effortless"
const DRIVER_VOICES: Record<string, string> = { raven: "kfU9VUUMjY4PWNoUfZ45", reba: "VDCzHcQzuGC8lVW8vjyr", lynx: "ijbjxuucMt4vnA0kA9IO", maia: "wa4sQVgbDDzUDEzJwch3", paige: "yj30vwTGJxSHezdAGsv9" };
// on the radio, the same words in each driver's voice
const DRIVER_LINES: Record<string, string> = {
  green: "Here we go!",
  pit: "Copy. Coming in.",
  win: "Woo! That one's for the crew! Look at that infield!",
  podium: "Good run tonight. We'll be back.",
  wall: "I'm okay, I'm okay. Talk to me.",
  "feel-good": "Car's great. Don't touch it.",
  "feel-loose": "She's a little loose off the corners.",
  "feel-tight": "Tight in the middle. Pushing up the track.",
  "got-one": "Got 'em!",
  passed: "Aw, they got me.",
  lead: "We're leading? Let's go!",
  tires: "Tires are falling off.",
  draft: "Big draft here. Gonna slingshot 'em.",
  white: "Last lap. Let's bring it home.",
  thanks: "Thanks, guys. We'll get 'em next time.",
  "pit-out": "Good stop, guys!",
  fast: "Yeah! That one felt fast.",
  rubbing: "Rubbin's racin'!",
};
// said on the pick screens, not over the radio: hello when you look at them, and what they think of
// each car and paint
const HELLO: Record<string, string> = {
  raven: "Hope you brought a fast car. You're gonna need it.",
  reba: "Don't get comfortable. I'm here to win.",
  lynx: "Hi! I'm gonna wreck your whole day. Don't take it personal.",
  maia: "Red hair, short fuse. Stay out of my way.",
  paige: "Cameras are rolling. Watch me steal the show.",
};
// each driver's own take on each car: Raven cocky and laughing at you, Reba the ice queen, Lynx the wild child, Maia the firecracker, Paige the showstopper; tough, never
// sweet (Michael, 2026-10-13: "not like an innocent girl"). The 7 is a nod to the old owl car, and
// Raven winks about it (Michael: a polite nod to Alan Kulwicki)
const CAR_TALK: Record<string, Record<string, string>> = {
  raven: {
    "17-modern": "The seventeen. Sleek and mean. I like it.",
    "43-eighties": "The forty-three. Old school. Let's teach the new kids something.",
    "3-muscle": "The three. That's a lot of motor. Good thing I can handle it.",
    "7-owl": "Number seven, the owl car. Hooters? I brought my own.",
  },
  reba: {
    "17-modern": "The seventeen. Clean lines. I'll make it fast.",
    "43-eighties": "The forty-three. Old iron. It'll do what I tell it.",
    "3-muscle": "The three. Plenty of muscle. I'll keep it on a leash.",
    "7-owl": "The seven. Quiet. Patient. Like me.",
  },
  lynx: {
    "17-modern": "The seventeen. Shiny. Let's see how fast it goes sideways.",
    "43-eighties": "The forty-three. Grandpa's ride. Let's make it misbehave.",
    "3-muscle": "The three. Loud and rowdy. Just like me.",
    "7-owl": "The seven. Owl car? Let's stay up all night.",
  },
  maia: {
    "17-modern": "The seventeen. Fast and mean. Let's light it up.",
    "43-eighties": "The forty-three. Old school and angry. Perfect.",
    "3-muscle": "The three. Loud enough for me? Barely.",
    "7-owl": "The seven. Owl car. Let's ruffle some feathers.",
  },
  paige: {
    "17-modern": "The seventeen. Built for the spotlight. So am I.",
    "43-eighties": "The forty-three. A classic. Classics never lose.",
    "3-muscle": "The three. All muscle, no manners. My kind of car.",
    "7-owl": "The seven. Night owl. I'll make it the main event.",
  },
};
// on the radio when it's been quiet a while, so your driver keeps talking all race (Michael,
// 2026-10-12: "she needs to be talkative on the radio"), and how each one answers the crew chief
const CHATTER: Record<string, string[]> = {
  raven: [
    "Ha! Did you see that? They never saw me coming.",
    "I'm just getting warmed up.",
    "Pass me? Cute. Try again.",
    "This car's on rails. Keep it coming.",
    "Keep the radio short. I'm busy.",
    "I could do this all day.",
    "Somebody up there's driving scared. I can smell it.",
    "Smile for the cameras. I'm about to take the lead.",
  ],
  reba: [
    "Patience. They'll make a mistake.",
    "I see the gap. Waiting for it.",
    "Breathe. Hit your marks. Win.",
    "They're getting nervous. Good.",
    "Ice in my veins. Fire under the hood.",
    "I don't need luck. I need laps.",
    "Every lap, a little closer.",
    "Let them race each other. I'm racing the clock.",
  ],
  lynx: [
    "Whoo! Best job in the world!",
    "Bet I can go faster. Watch.",
    "Rules? I thought those were suggestions.",
    "I'm not reckless. I'm creative.",
    "Somebody's mad at me. Good.",
    "Pedal down, music up!",
    "If you're not having fun, you're doing it wrong.",
    "Bump drafting? Love it. Mostly.",
  ],
  maia: [
    "Move! I'm not asking twice.",
    "Whoever's in front of me, I'm coming for you.",
    "I'm hot, the car's hot. Let's go!",
    "Get out of my way or get moved.",
    "That's it. I'm done being patient.",
    "Somebody's getting a bumper today.",
    "Fire in the hole!",
    "I didn't come here to make friends.",
  ],
  paige: [
    "Wave to the crowd, ladies. I'm about to pass you.",
    "Every lap's a highlight reel.",
    "They paid to see a show. Let's give 'em one.",
    "Smooth hands, heavy foot.",
    "I like it when they're watching.",
    "Big screen's on me. Better make this good.",
    "Patience now. Fireworks later.",
    "Save the drama for the last lap.",
  ],
};
const COPY: Record<string, string> = { raven: "Copy that.", reba: "Understood.", lynx: "Yep! Got it!", maia: "Yeah, yeah. Got it.", paige: "Copy. Showtime." };
export const CHATTER_COUNT: Record<string, number> = Object.fromEntries(Object.entries(CHATTER).map(([d, l]) => [d, l.length]));
const PAINT_TALK: Record<string, string> = {
  stock: "Stock. Let 'em know who's driving.",
  red: "Red. So they know I'm dangerous.",
  blue: "Blue. Cold as ice on a restart.",
  yellow: "Yellow. They'll see me coming. Won't matter.",
  orange: "Orange. Hot as hell.",
  green: "Green. The color of my prize money.",
  purple: "Purple. Royalty. Bow down.",
  pink: "Pink. And I'll still beat every one of 'em.",
  white: "White. Pure as it gets.",
  black: "Black. All business. No mercy.",
  "woods-camo": "Woods camo. Huntin' season, and they're the deer.",
  "white-camo": "White camo. Now that's badass.",
};
// what each one says about each color she can wear (Michael, 2026-10-13: "their own sayings for all
// selections"); stock is her own colors
const PAINT_LINES: Record<string, Record<string, string>> = {
  raven: {
    stock: "My own colors. Classic me.",
    red: "Red. Ha! They'll see me coming and still can't stop me.",
    blue: "Blue. Cool on the outside. Trouble on the inside.",
    yellow: "Yellow. Like a caution flag. Fitting.",
    orange: "Orange. Loud. I like loud.",
    green: "Green. Green means go. Watch me go.",
    purple: "Purple. Fancy. I'll take it.",
    pink: "Pink. Cute, right? Wait till I pass you.",
    white: "White. Pure as it gets. Unlike my driving.",
    black: "Black. My favorite. Matches my mood.",
    "woods-camo": "Woods camo. Good luck finding me. I'll be up front.",
    "white-camo": "White camo. Snow day. Let's slide.",
  },
  reba: {
    stock: "My colors. Nothing else needed.",
    red: "Red. Consider it a warning.",
    blue: "Blue. Cold. Suits me.",
    yellow: "Yellow. Bright. I'll allow it.",
    orange: "Orange. Not my style. I'll win anyway.",
    green: "Green. The color of money. Mine.",
    purple: "Purple. Royalty. Naturally.",
    pink: "Pink. Don't let it fool you.",
    white: "White. Pure. Like ice.",
    black: "Black. Quiet. Deadly.",
    "woods-camo": "Woods camo. Patient. Like a hunter.",
    "white-camo": "White camo. Frozen ground. My territory.",
  },
  lynx: {
    stock: "My pink! Obviously the best.",
    red: "Red! Spicy. Let's go!",
    blue: "Blue? Kinda chill. I'm not.",
    yellow: "Yellow! Like a bumblebee with a temper.",
    orange: "Orange! Traffic cone chic.",
    green: "Green! Go, go, go!",
    purple: "Purple! Now we're talking.",
    pink: "Pink! Did you even have to ask?",
    white: "White. Pure as it gets. I'll get it dirty.",
    black: "Black. Mysterious. Totally me. Kidding!",
    "woods-camo": "Camo! Hide and seek at a hundred and eighty.",
    "white-camo": "White camo! Snowball fight on wheels!",
  },
  maia: {
    stock: "My colors. Don't touch 'em.",
    red: "Red! Now you're talking. Matches my temper.",
    blue: "Blue. Calm. Don't count on it.",
    yellow: "Yellow. Caution. You should've listened.",
    orange: "Orange. Fire. Obviously.",
    green: "Green. Envy. They'll have plenty.",
    purple: "Purple. The color of the bruises I'm handing out.",
    pink: "Pink. Go ahead, laugh. Then try to pass me.",
    white: "White. Pure. Won't stay that way.",
    black: "Black. Like the marks I leave on the track.",
    "woods-camo": "Woods camo. Sneak attack incoming.",
    "white-camo": "White camo. Cold blooded. Hot headed.",
  },
  paige: {
    stock: "My signature look. Iconic.",
    red: "Red. Red carpet ready.",
    blue: "Blue. Classic. The cameras love it.",
    yellow: "Yellow. Spotlight color.",
    orange: "Orange. Bold choice. I like bold.",
    green: "Green. Like the money they'll pay to watch me.",
    purple: "Purple. Main character energy.",
    pink: "Pink. Pretty in the photos. Mean on the track.",
    white: "White. Pure. Picture perfect.",
    black: "Black. Elegant. Dangerous.",
    "woods-camo": "Woods camo. Even camouflaged, all eyes are on me.",
    "white-camo": "White camo. The winter collection.",
  },
};
// a driver's own words in place of the shared radio, paint and pick lines above
const OWN: Record<string, Record<string, string>> = {
  paige: {
    green: "Showtime!",
    win: "And that's how you steal the show!",
    podium: "Podium. Good. Not great.",
    "got-one": "Thanks for the warm-up.",
    passed: "Enjoy it. It won't last.",
    lead: "Out front, where the cameras are.",
    rubbing: "Easy now. I just got this paint done.",
    white: "Last lap. Make it a highlight.",
    pick: "Let's go racing!",
  },
  maia: {
    green: "Green! Let's raise some hell!",
    win: "That's what happens when you make me mad!",
    podium: "Podium? I wanted the win. I'm furious.",
    "got-one": "Move it or lose it!",
    passed: "Oh, she's gonna pay for that.",
    lead: "Out front and fired up!",
    rubbing: "You want to rub? Let's rub!",
    white: "Last lap! Nobody touch me!",
    wall: "Ow! Okay. Now I'm mad.",
    pick: "Let's go racing!",
  },
  lynx: {
    green: "Let's gooo!",
    win: "Ha! Did that just happen? It did!",
    podium: "Podium! Not bad for a troublemaker.",
    "got-one": "Bye bye!",
    passed: "Hey! Rude. I'm coming back.",
    lead: "Leading? Oh, this is gonna be fun.",
    rubbing: "Bumper cars! My favorite!",
    white: "Last lap! Hold on tight!",
    wall: "Oops! Still rolling!",
    tires: "Tires are toast. Whatever, still fun.",
    pick: "Let's go racing!",
  },
  reba: {
    green: "Green. Time to work.",
    win: "Told you. Ice cold.",
    podium: "Not the top step. Not good enough.",
    "got-one": "Next.",
    passed: "Fine. I'll take it back.",
    lead: "Out front. Staying here.",
    rubbing: "Touch me again. I dare you.",
    white: "Last lap. Nothing changes.",
    pick: "Let's go racing.",
  },
  raven: {
    green: "Green flag! Let's have some fun.",
    win: "Ha! Told you. Somebody hand me that trophy.",
    podium: "Podium. Not bad. Next time it's the top step.",
    "got-one": "See ya!",
    passed: "Oh, she did not just do that.",
    lead: "Out front! Try and catch me.",
    rubbing: "Ha! Rubbin's racin'!",
    white: "Last lap. Let's make it a good one.",
    pick: "Let's go racing!",
  },
};
for (const [driver, voice] of Object.entries(DRIVER_VOICES)) {
  const label = driver.toUpperCase();
  for (const [k, text] of Object.entries(DRIVER_LINES)) lines[`drv-${driver}-${k}`] = { who: "driver", text, label, voice };
  CHATTER[driver].forEach((text, i) => (lines[`drv-${driver}-chat-${i + 1}`] = { who: "driver", text, label, voice }));
  lines[`drv-${driver}-copy`] = { who: "driver", text: COPY[driver], label, voice };
  const say = (key: string, text: string) => (lines[`drv-${driver}-${key}`] = { who: "driver", text, label, voice, clean: true });
  say("pick", "Let's go racing!");
  say("hello", HELLO[driver]);
  for (const [car, text] of Object.entries(CAR_TALK[driver])) say(`car-${car}`, text);
  for (const [paint, text] of Object.entries({ ...PAINT_TALK, ...PAINT_LINES[driver] })) say(`paint-${paint}`, text);
  for (const [k, text] of Object.entries(OWN[driver] ?? {})) lines[`drv-${driver}-${k}`].text = text;
}

export const LINES = lines;

export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
