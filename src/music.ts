// The music (offroad's and winter games' radio, cut down): one station of songs Michael makes in
// ElevenLabs, played in a shuffled order, never the same one twice in a row. Full volume on the
// menus; down under the engines during a race.
//
// Adding a song: drop it in src/radio/ named "thunder--<song-title>.mp3" (e.g.
// "thunder--burn-it-down.mp3"), levelled first:
//   ffmpeg -i in.mp3 -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 44100 -b:a 128k src/radio/thunder--<title>.mp3
// It's picked up automatically; no code to change.
//
// Songs stream (an <audio> element through Web Audio, so the volume works on iPhones too), so
// nothing big downloads up front. No sound before the first tap.

const files = import.meta.glob("./radio/*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const SONGS = Object.entries(files)
  .filter(([path]) => /radio\/thunder--.+\.mp3$/.test(path))
  .map(([, url]) => url);

const MENU = 0.95; // Michael, 2026-10-13: "can barely hear it"
const RACE = 0.6; // up over the engines (Michael, 2026-10-13: "needs music to help drown it out")
const FADE = 1.2; // seconds
const KEY = "scofti500:music";

let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let player: HTMLAudioElement | null = null;
let last = "";
let level = MENU;
let on = (() => {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
})();

export const musicOn = () => on;

/** call from the first tap or key press: browsers only allow sound after one */
export function startMusic(): void {
  if (ctx || !SONGS.length) return;
  ctx = new AudioContext();
  gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  player = new Audio();
  player.preload = "auto";
  ctx.createMediaElementSource(player).connect(gain);
  player.addEventListener("ended", next);
  // quiet when the game is in the background
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) void ctx?.suspend();
    else if (on) void ctx?.resume();
  });
  if (on) next();
  else void ctx.suspend();
}

/** music on or off (remembered) */
export function setMusic(want: boolean): void {
  on = want;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // not remembered
  }
  if (!ctx) return;
  if (!on) {
    void ctx.suspend();
    return;
  }
  void ctx.resume();
  if (player && (player.paused || !player.src)) next();
}

let ducked = false;
/** while the radio talks the music dips with everything else */
export function duckMusic(on: boolean): void {
  if (on === ducked) return;
  ducked = on;
  if (!ctx || !gain) return;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(on ? level * 0.4 : level, now + (on ? 0.15 : 0.8));
}

/** in a race the music sits down under the engines */
export function musicForRace(racing: boolean): void {
  level = racing ? RACE : MENU;
  ducked = false;
  if (!ctx || !gain) return;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(level, now + FADE);
}

function next(): void {
  if (!ctx || !gain || !player) return;
  const choices = SONGS.length > 1 ? SONGS.filter((s) => s !== last) : SONGS;
  last = choices[Math.floor(Math.random() * choices.length)];
  player.src = last;
  player.play().catch(() => {
    // blocked or can't play: the game just runs without music
  });
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(level, now + FADE);
}
