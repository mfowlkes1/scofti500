// The radio: your spotter up on the roof calling traffic, your crew chief on the box, and the
// announcer for the crowd. Each line shows on screen and is spoken: by a recording in
// public/audio/radio/<key>.mp3 when there is one (listed in public/audio/radio/lines.json), otherwise
// by the browser's own voice. Spotter calls cut in over everything; the rest wait their turn.

import { LINES } from "./lines";

export type Who = "spotter" | "crew" | "announcer" | "driver";

const LABEL: Record<Who, string> = { spotter: "SPOTTER", crew: "CREW CHIEF", announcer: "ANNOUNCER", driver: "DRIVER" };
// how each one sounds with the browser's voice
const VOICE: Record<Who, { rate: number; pitch: number; pick: number }> = {
  spotter: { rate: 1.3, pitch: 1.05, pick: 0 },
  crew: { rate: 1.02, pitch: 0.72, pick: 1 },
  announcer: { rate: 1.08, pitch: 1.12, pick: 2 },
  driver: { rate: 1.1, pitch: 1.2, pick: 3 },
};

export type Radio = {
  /** say a line from lines.ts */
  say(key: string): void;
  clear(): void;
  /** how long (ms) the radio has been silent, 0 while a line is playing or waiting */
  quiet(): number;
  mute(on: boolean): void;
};

/** onTalk: called with true as a line starts and false once the radio goes quiet */
export function createRadio(box: HTMLElement, onTalk: (talking: boolean) => void = () => {}): Radio {
  const synth = "speechSynthesis" in window ? window.speechSynthesis : null;
  let voices: SpeechSynthesisVoice[] = [];
  const loadVoices = () => {
    const all = synth?.getVoices() ?? [];
    const en = all.filter((v) => v.lang.startsWith("en"));
    // american voices first
    voices = [...en.filter((v) => v.lang === "en-US"), ...en.filter((v) => v.lang !== "en-US")];
  };
  loadVoices();
  synth?.addEventListener?.("voiceschanged", loadVoices);

  const queue: { who: Who; text: string; key?: string; label?: string }[] = [];
  let busy = false;
  let playing = 0; // which line is current, so a cut-off line finishing late changes nothing
  let speaking: Who | null = null; // who is on the radio right now
  let muted = false;
  let hideAt = 0;
  let lastAt = 0; // when the last line ended
  let current: HTMLAudioElement | null = null;
  // which lines have a recording (public/audio/radio/lines.json: a list of keys)
  let recorded: Promise<Set<string>> | null = null;

  function show(who: Who, text: string, label?: string): void {
    box.dataset.who = who;
    box.querySelector("b")!.textContent = label ?? LABEL[who];
    box.querySelector("span")!.textContent = text;
    box.classList.add("on");
    hideAt = performance.now() + 2600 + text.length * 45;
    setTimeout(() => {
      if (performance.now() >= hideAt) box.classList.remove("on");
    }, hideAt - performance.now() + 50);
  }

  function hasFile(key: string): Promise<boolean> {
    recorded ??= fetch(`${import.meta.env.BASE_URL}audio/radio/lines.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((keys: string[]) => new Set(keys))
      .catch(() => new Set<string>());
    return recorded.then((s) => s.has(key));
  }

  async function next(): Promise<void> {
    if (busy) return;
    const line = queue.shift();
    if (!line) return;
    busy = true;
    const id = ++playing;
    speaking = line.who;
    onTalk(true);
    show(line.who, line.text, line.label);
    const done = () => {
      if (id !== playing) return;
      busy = false;
      lastAt = performance.now();
      if (!queue.length) onTalk(false);
      void next();
    };
    if (muted) return void setTimeout(done, 900 + line.text.length * 30);
    if (line.key && (await hasFile(line.key))) {
      current = new Audio(`${import.meta.env.BASE_URL}audio/radio/${line.key}.mp3`);
      current.onended = current.onerror = done;
      void current.play().catch(done);
      return;
    }
    if (!synth) return void setTimeout(done, 900 + line.text.length * 30);
    const u = new SpeechSynthesisUtterance((line.key && LINES[line.key]?.spoken) || line.text);
    const v = VOICE[line.who];
    u.rate = v.rate;
    u.pitch = v.pitch;
    u.volume = 0.95;
    if (voices.length) u.voice = voices[v.pick % voices.length];
    u.onend = u.onerror = done;
    synth.speak(u);
    // some browsers never fire onend
    setTimeout(() => busy && done(), 1500 + line.text.length * 110);
  }

  return {
    say(key) {
      const line = LINES[key];
      if (!line) return;
      const { who, text } = line;
      if (who === "spotter") {
        // traffic can't wait: drop anything stale and cut in (but let your driver finish; the call
        // goes straight after)
        for (let i = queue.length - 1; i >= 0; i--) if (queue[i].who === "spotter") queue.splice(i, 1);
        if (busy && speaking !== "driver") {
          playing++;
          synth?.cancel();
          current?.pause();
          busy = false;
        }
        queue.unshift({ who, text, key, label: line.label });
      } else {
        if (queue.length > 3) return;
        queue.push({ who, text, key, label: line.label });
      }
      void next();
    },
    quiet() {
      return busy || queue.length ? 0 : performance.now() - lastAt;
    },
    clear() {
      queue.length = 0;
      lastAt = performance.now();
      onTalk(false);
      playing++;
      synth?.cancel();
      current?.pause();
      busy = false;
      box.classList.remove("on");
    },
    mute(on) {
      muted = on;
      if (on) synth?.cancel();
    },
  };
}
