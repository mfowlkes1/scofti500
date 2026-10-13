// The race's sounds, all made in code (Web Audio) like offroad's: your V8 (pitch from the rpm, gears
// and all), the rest of the field roaring past, tire squeal, the wall scraping, thumps when cars
// touch, and the crowd. Recordings can replace any of them later.

export type RaceAudio = {
  set(o: { rpm: number; throttle: number; slide: number; scrape: number; field: number; fieldPitch: number }): void;
  bump(power: number): void;
  /** the air gun on a lug nut: a short buzzing brrrt */
  airGun(): void;
  roar(): void;
  /** the radio's talking: everything dips so the line comes through */
  duck(on: boolean): void;
  pause(on: boolean): void;
  stop(): void;
};

export function startAudio(): RaceAudio | null {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  void ctx.resume();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 1);
  // under the radio: the whole race dips while someone's talking
  const under = ctx.createGain();
  master.connect(under).connect(ctx.destination);
  // how long the engine has sat flat out near the limiter (a big track's long straights and flat
  // turns): past a couple of seconds it eases back and mellows, so the drone doesn't wear on you
  // (Michael, 2026-10-13: "when this thing is maxed out and it stays like that, the sound is annoying")
  let held = 0;
  let lastSet = ctx.currentTime;

  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const noise = () => {
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    n.loop = true;
    n.start();
    return n;
  };
  const shaper = (k: number) => {
    const w = ctx.createWaveShaper();
    const curve = new Float32Array(512);
    for (let i = 0; i < 512; i++) curve[i] = Math.tanh(((i / 511) * 2 - 1) * k);
    w.curve = curve;
    return w;
  };

  // ---- your engine: a lumpy V8, two saws and a square through grit and a filter ----
  const eng = ctx.createGain();
  eng.gain.value = 0.32;
  const engTone = ctx.createBiquadFilter();
  engTone.type = "lowpass";
  engTone.Q.value = 2.5;
  const grit = shaper(2.6);
  grit.connect(engTone).connect(eng).connect(master);
  const oscs = [
    { type: "sawtooth" as OscillatorType, mult: 0.5, level: 0.55 },
    { type: "sawtooth" as OscillatorType, mult: 1.003, level: 0.35 },
    { type: "square" as OscillatorType, mult: 0.25, level: 0.3 },
  ].map(({ type, mult, level }) => {
    const o = ctx.createOscillator();
    o.type = type;
    const g = ctx.createGain();
    g.gain.value = level;
    o.connect(g).connect(grit);
    o.start();
    return { o, mult };
  });
  // the cam's lope
  const lope = ctx.createOscillator();
  const lopeGain = ctx.createGain();
  lopeGain.gain.value = 6;
  lope.connect(lopeGain);
  for (const { o } of oscs) lopeGain.connect(o.frequency);
  lope.start();

  // ---- the field: everyone else, one big roar that swells as they get close ----
  const field = ctx.createGain();
  field.gain.value = 0;
  const fieldTone = ctx.createBiquadFilter();
  fieldTone.type = "lowpass";
  fieldTone.frequency.value = 1200;
  const fieldGrit = shaper(2);
  fieldGrit.connect(fieldTone).connect(field).connect(master);
  const fieldOscs = [0.5, 0.507, 0.995].map((mult) => {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    const g = ctx.createGain();
    g.gain.value = 0.3;
    o.connect(g).connect(fieldGrit);
    o.start();
    return { o, mult };
  });

  // ---- tires squealing ----
  const squeal = ctx.createGain();
  squeal.gain.value = 0;
  const sqF = ctx.createBiquadFilter();
  sqF.type = "bandpass";
  sqF.frequency.value = 1900;
  sqF.Q.value = 6;
  noise().connect(sqF).connect(squeal).connect(master);
  const sqTone = ctx.createOscillator();
  sqTone.frequency.value = 1150;
  const sqToneG = ctx.createGain();
  sqToneG.gain.value = 0.15;
  sqTone.connect(sqToneG).connect(squeal);
  sqTone.start();

  // ---- the wall ----
  const scrape = ctx.createGain();
  scrape.gain.value = 0;
  const scF = ctx.createBiquadFilter();
  scF.type = "highpass";
  scF.frequency.value = 2400;
  noise().connect(scF).connect(scrape).connect(master);

  // ---- the crowd ----
  const crowd = ctx.createGain();
  crowd.gain.value = 0.05;
  const crF = ctx.createBiquadFilter();
  crF.type = "bandpass";
  crF.frequency.value = 800;
  crF.Q.value = 0.5;
  noise().connect(crF).connect(crowd).connect(master);

  return {
    set({ rpm, throttle, slide, scrape: sc, field: near, fieldPitch }) {
      const now = ctx.currentTime;
      const dt = Math.min(0.2, now - lastSet);
      lastSet = now;
      held = throttle > 0.8 && rpm > 8300 ? held + dt : Math.max(0, held - dt * 3);
      const cruise = Math.min(1, Math.max(0, (held - 2) / 3));
      // a V8 fires four times a revolution
      const fire = (rpm / 60) * 4;
      for (const { o, mult } of oscs) o.frequency.setTargetAtTime(fire * mult, now, 0.03);
      engTone.frequency.setTargetAtTime((500 + throttle * 2600 + rpm * 0.12) * (1 - 0.45 * cruise), now, 0.3);
      eng.gain.setTargetAtTime((0.15 + throttle * 0.16) * (1 - 0.5 * cruise), now, 0.3);
      lope.frequency.setTargetAtTime(rpm / 120, now, 0.1);
      for (const { o, mult } of fieldOscs) o.frequency.setTargetAtTime(fieldPitch * mult, now, 0.08);
      field.gain.setTargetAtTime(near * 0.24 * (1 - 0.35 * cruise), now, 0.1);
      squeal.gain.setTargetAtTime(Math.min(0.16, Math.max(0, slide - 1.6) * 0.05), now, 0.05);
      scrape.gain.setTargetAtTime(Math.min(0.35, sc * 0.06), now, 0.03);
    },
    bump(power) {
      const now = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 260;
      const g = ctx.createGain();
      g.gain.setValueAtTime(Math.min(1.2, 0.2 + power * 0.12), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      src.connect(f).connect(g).connect(master);
      src.start(now, Math.random());
      src.stop(now + 0.3);
    },
    airGun() {
      const now = ctx.currentTime;
      const len = 0.16;
      // a hiss of air, chopped fast by the hammer inside
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 2400;
      f.Q.value = 1.2;
      const chop = ctx.createGain();
      chop.gain.value = 0.5;
      const hammer = ctx.createOscillator();
      hammer.type = "square";
      hammer.frequency.value = 55;
      const depth = ctx.createGain();
      depth.gain.value = 0.5;
      hammer.connect(depth).connect(chop.gain);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.5, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + len);
      src.connect(f).connect(chop).connect(g).connect(master);
      // and the motor's whine
      const whine = ctx.createOscillator();
      whine.type = "sawtooth";
      whine.frequency.setValueAtTime(700, now);
      whine.frequency.linearRampToValueAtTime(1100, now + len);
      const wg = ctx.createGain();
      wg.gain.value = 0.05;
      whine.connect(wg).connect(g);
      src.start(now, Math.random());
      hammer.start(now);
      whine.start(now);
      for (const n of [src, hammer, whine]) n.stop(now + len + 0.02);
    },
    roar() {
      const now = ctx.currentTime;
      crowd.gain.cancelScheduledValues(now);
      crowd.gain.setValueAtTime(crowd.gain.value, now);
      crowd.gain.linearRampToValueAtTime(0.22, now + 0.4);
      crowd.gain.setTargetAtTime(0.05, now + 2, 1.2);
    },
    duck(on) {
      under.gain.setTargetAtTime(on ? 0.35 : 1, ctx.currentTime, on ? 0.08 : 0.4);
    },
    pause(on) {
      void (on ? ctx.suspend() : ctx.resume());
    },
    stop() {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      setTimeout(() => void ctx.close(), 800);
    },
  };
}
