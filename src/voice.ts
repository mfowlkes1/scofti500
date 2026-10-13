// Voice clips (the radio, Heather, the interview), played through Web Audio. iPhones won't let a page
// start an <audio> element by itself, only from a tap, and the radio talks in the middle of a race, so its
// lines came up as captions with no sound (Michael, 2026-10-13). One AudioContext, woken by the first tap,
// can play anything after that.

let ctx: AudioContext | null = null;
const cache = new Map<string, Promise<AudioBuffer | null>>();

function context(): AudioContext {
  ctx ??= new AudioContext();
  return ctx;
}

// any tap wakes it (and keeps waking it, in case the phone put it to sleep)
for (const ev of ["pointerup", "click", "keydown"]) {
  addEventListener(ev, () => {
    const c = context();
    if (c.state !== "running") void c.resume();
  });
}

function load(url: string): Promise<AudioBuffer | null> {
  let job = cache.get(url);
  if (!job) {
    job = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
      .then((b) => context().decodeAudioData(b))
      .catch(() => null);
    cache.set(url, job);
  }
  return job;
}

export type Clip = { stop(): void; done: Promise<boolean> };

/** play a clip; done resolves true when it finished, false if it couldn't play (or was stopped) */
export function playClip(url: string, volume = 1): Clip {
  let source: AudioBufferSourceNode | null = null;
  let stopped = false;
  const done = load(url).then(
    (buf) =>
      new Promise<boolean>((resolve) => {
        if (!buf || stopped) return resolve(false);
        const c = context();
        if (c.state !== "running") void c.resume();
        const gain = c.createGain();
        gain.gain.value = volume;
        source = c.createBufferSource();
        source.buffer = buf;
        source.connect(gain).connect(c.destination);
        source.onended = () => resolve(!stopped);
        source.start();
      }),
  );
  return {
    done,
    stop() {
      stopped = true;
      try {
        source?.stop();
      } catch {
        // not started yet
      }
    },
  };
}

/** the phone app going to the background stops the voices with everything else */
export function voicesAway(gone: boolean): void {
  if (!ctx) return;
  if (gone) void ctx.suspend();
  else void ctx.resume();
}
