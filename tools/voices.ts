// Records the radio lines (src/race/lines.ts) with ElevenLabs: the spotter, the crew chief and the
// announcer each have a voice. Raw takes go in art/voices/; the game's copies are levelled and, for
// the spotter and crew chief, squeezed through a two-way-radio filter, into public/audio/radio/.
// Lines already recorded are skipped (delete a file to redo it).
// Run: ELEVENLABS_API_KEY=... npx tsx tools/voices.ts [key ...]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { LINES } from "../src/race/lines";
import type { Who } from "../src/race/radio";

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error("ELEVENLABS_API_KEY not set");

const VOICES: Record<Who, { id: string; name: string; stability: number; style: number }> = {
  spotter: { id: "iP95p4xoKVk53GoZ742B", name: "Chris", stability: 0.35, style: 0.45 },
  crew: { id: "Bj9UqZbhQsanLzgalpEG", name: "Austin Knox", stability: 0.45, style: 0.35 },
  // the Martinsvale announcer, from Michael's Voice Design: "excited and animated, more emotional" (2026-10-12)
  announcer: { id: "fBRhBCYyrzF7JBCdE4Nt", name: "nascar announcer", stability: 0.4, style: 0.55 },
  driver: { id: "", name: "driver", stability: 0.4, style: 0.45 },
};

const RAW = "art/voices";
const OUT = "public/audio/radio";
mkdirSync(RAW, { recursive: true });
mkdirSync(OUT, { recursive: true });

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(LINES);
for (const key of wanted) {
  const line = LINES[key];
  if (!line) {
    console.log(`${key}: no such line`);
    continue;
  }
  if (line.voice === "") {
    console.log(`${key}: no voice picked yet`);
    continue;
  }
  const raw = `${RAW}/${key}.mp3`;
  const out = `${OUT}/${key}.mp3`;
  if (!existsSync(raw)) {
    const v = { ...VOICES[line.who], ...(line.voice ? { id: line.voice, name: line.label ?? "driver" } : {}) };
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${v.id}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text: line.spoken ?? line.text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: v.stability, similarity_boost: 0.8, style: v.style, use_speaker_boost: true },
      }),
    });
    if (!res.ok) {
      console.log(`${key}: ${res.status} ${await res.text()}`);
      continue;
    }
    writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
    console.log(`${key}: recorded (${v.name})`);
  }
  if (!existsSync(out)) {
    // the spotter and crew chief come over a two-way radio; the announcer is on the PA
    const radio = "highpass=f=320,lowpass=f=3400,acompressor=threshold=-18dB:ratio=4,volume=1.4,";
    const filter = `${line.who === "announcer" || line.clean ? "" : radio}loudnorm=I=-16:TP=-1.5:LRA=7`;
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-af", filter, "-ac", "1", "-ar", "44100", "-b:a", "80k", out]);
  }
}

// the list the game checks before playing a recording
const have = readdirSync(OUT).filter((f) => f.endsWith(".mp3")).map((f) => f.slice(0, -4)).sort();
writeFileSync(`${OUT}/lines.json`, JSON.stringify(have, null, 1) + "\n");
console.log(`${have.length} lines recorded`);
