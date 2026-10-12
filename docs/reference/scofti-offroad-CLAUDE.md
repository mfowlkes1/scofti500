# Scofti Offroad

Scofti arcade game. Lives at **scofti.com/arcade/scofti-offroad**. Repo `github.com/mfowlkes1/scoftioffroad`
(private, created and pushed 2026-10-05; Michael is setting up Vercel). `handoff.md` holds the original brief from the studio director.

Title screen: **SCOFTI OFFROAD**, "mud racing team" under it.

## The game

Big-tyre mud racing with personality. The player races for the **Scofti Offroad Racing Team** (black and lime).
Score is **mud slung** (lbs): every blob thrown counts, a blob that lands in the stands ("CROWD SOAKED!")
counts a lot more.

- **Drag heats** (built): side by side through one deep pit, ~5–6 s. Hold to gas. Too much and the tyres spin
  and dig in; too little and the rig bogs down. The gauge shows the needle (your throttle) and the green grip
  zone, which moves through the pit. Dig in fully = STUCK until you ease off.
- **Obstacle runs** (not built): longer runs with ruts, hills and jumps.

## Design decisions (Michael, 2026-10-05)

- 3D, Three.js. Camera low behind the rig (chase cam), or **cockpit cam** (built 2026-10-05: camera button or C;
  the rig body is hidden and an SVG frame in `index.html` draws cage/dash/hood; rufford gets a wiper).
- Structure: **one season**; each event = a drag bracket, then an obstacle run.
- **Flow** (Michael, 2026-10-05): START → pick a driver (they fill the screen) → pick a **colour** (lime,
  orange, pink, blue: on the suit AND the ride's lime parts; `src/paint.ts` turns lime pixels to the new hue)
  (also white, black, camo and "donut" = red rings on navy, Michael 2026-10-05; patterns replace the lime)
  → pick a ride: **zip tie** (#17 side-by-side) or **rufford** (#103 mud truck), both on show → the ride
  spins in the **garage**: buy upgrades with **cash** (tyres, engine, suspension; 3 levels; per ride) → RACE
  the next bracket heat → result card with prize money → NEXT HEAT or GARAGE.
- Michael: "these beasts need to be on display too". Menus keep the 3D rides visible: slim panels, the ride
  and garage screens use a showroom spot behind the start line (`SHOWROOM` in main.ts) looking back at the arch.
- Rufford is **#103** in name only: no number painted on it ("mud trucks don't have numbers"). Zip tie wears its **17**. SCOFTI added on
  rufford's tailgate in code (the chase cam stares at it).
- Logo everywhere: the **brush SCOFTI wordmark** (Permanent Marker font in code).
- Rivals: **gem** (sneaky; heat 1 now), **metis** (silent, fast), **deekdeek** (giant monster rig, formidable,
  never the joke), **chickadee** (judging from the stands). Rivals run the UTV shape in their own colours and
  show their own name; deekdeek gets a monster rig (crimson and gold, from his bökh jacket; giant tyres).

## Stack

Vite + TypeScript + Three.js. `npm run dev` → http://localhost:5230/arcade/scofti-offroad/ (also on the LAN
address Vite prints, for Michael's phone on the same wifi).

- `src/main.ts`: renderer, flow (title → pick driver + rig → heat → result card), input (hold anywhere /
  Space / ↑ / W; Backspace = back; Enter = next), localStorage, title/pick camera.
- `src/garage.ts`: upgrades (cost, what each level does: `effect()`), prize money (`PRIZE`), cash and
  levels in localStorage. Upgrades reach the race as physics `Mods` (power, grip zone width, dig rate) and
  show on the ride (`fitUpgrades`: bigger tyres, lifted body).
- Drags are a **wager** (Michael, 2026-10-05): entry $25 / $50 / $100, a win pays double the entry (+$250 for
  the final), mud slung pays $0.25/lb win or lose (counted only for good driving: grip zone + speed, not
  wheelspin, so holding the gas can't farm cash). Start $200. Broke = can't pay the next entry → free
  PRACTICE (pays nothing) and a fresh $200 after 12 hours (`scofti-offroad:broke-at`). Buy-back comes later.
  Upgrade prices stay as they were (Michael: the mud money is the income).
- Rivals **upgrade too**: each bracket won (`scofti-offroad:brackets-won`) raises their power/skill/grip
  (`upgraded()` in bracket.ts, caps at tier 4). Sim: tier 0 deekdeek ~5.2 s; tier 3 ~4.8 s, about what a
  sloppy driver in a maxed ride does (~4.7 s in game).
- **Sponsor hill climbs** (Michael, 2026-10-05): broke ("GET SPONSORED" in the garage) or tapping an upgrade
  you can't afford → a made-up sponsor (`src/sponsors.ts`: Bog Hog Hot Sauce, Gravy Train Tyres, Swamp Fizz
  Soda, Dirt Nap Mattresses) offers $100 to climb their mud hill in 16 s. Free to retry; each sponsor pays
  once per 12 h. Same thumb + gauge; the zone rises on the steep part. `src/game/hillPhysics.ts` (sim: clean
  ~8.5 s, sloppy ~9 s, very sloppy / half throttle / floored = fail), `src/game/hill.ts` (scene at x = 46,
  off to the side of the pit; sponsor arch at the crest). Later: sponsor stickers on the ride.
- **Obstacle run**, called **FULL SEND** in the game (built 2026-10-05; garage button, always open): a **time trial** (free; beat
  your best for +$25) or a **challenge** to gem $50 / metis $100 / deekdeek $200 (win pays double, plus mud
  money). Course: start → mud → ruts → hill → jump → water → mud → finish (`src/game/course.ts` numbers,
  `src/game/obstacle.ts` scene at x = -125). Jump: let go in the air to land clean (+12% speed); on the gas =
  tail landing (-60%). Sim: clean ~16 s, sloppy ~16.4 s, very sloppy ~20.6 s; holding the gas gets stuck in the
  ruts. Ground planes laid flat with rotation.x = -PI/2: world z = position.z - y (got this backwards once).
- START rev: plays `public/audio/start-rev.mp3` if it exists (Michael makes it); code synth is the fallback.
- **Style shop** (garage → STYLE; `src/style-shop.ts`): looks only. Wheel colour, light bar (white/amber/
  rainbow), AURA (the underglow), SCOFTI mud flaps, chrome stacks that puff smoke. Buy once per ride, switch
  free. Tap anything you don't own to try it on (padlock if you can't afford it; buy bar underneath).
- **Cooler** (garage → COOLER; `src/snacks.ts`): a beat-up redneck cooler with SCOFTI OFFROAD stickers.
  Buy made-up snacks into it; EAT one: Carini Dog / Swamp Fizz / Flautas give a one-race boost (power /
  wider zone / slower dig), the rest are just for fun (the driver says a line). Michael: "both".
- **Radio** looks like a car stereo: lit display with the station + a knob that turns a notch per station.
- Build numbers: v1.0.0.N like the other games (`src/version.ts`).
- `src/paint.ts`: team colours; repaints driver pictures and model textures (lime hue → new hue).
- `src/bracket.ts`: the drag bracket: gem (heat 1) → metis (heat 2) → deekdeek (final, monster rig).
  Each rival's look, `skill`, `power`, colour and tagline; measured in-game times in the comment. Lose =
  TRY AGAIN that heat; win all three = BRACKET CHAMPS card with the bracket's total mud. Progress is per visit.
- `src/game/physics.ts`: the drag heat in pure numbers (`TRACK`, `TUNING`, `zoneAt`, `step`). Tune here.
  A quick check: write a policy loop over `step()` and run it with `node file.ts` (Node strips types).
  2026-10-05 tuning: perfect feathering ≈ 5.2 s, sloppy ≈ 5.3 s, steady half throttle ≈ 6.2 s, floored = stuck.
- `src/game/heat.ts`: one heat: light tree countdown (launch window), rival AI (`skill`), spray, rig posing
  (sinks into the mud, bounces, wheels spin), chase cam, HUD, lens splats, result.
- `src/game/arena.ts`: the pit, berms, banner barriers, bleachers + crowd (instanced; `cheer()` makes them
  jump), flags, start arch, light tree (beside the right lane), finish, treeline, sky.
- `src/game/spray.ts`: mud blobs (one instanced pool, `setMax` for slow phones).
- `src/brand.ts`: canvas art: wordmark, flames, side/tail panels, banners, arch sign, flags, decal.
- `src/rig.ts`: rigs built from boxes/tubes: the rivals, and stand-ins for the team rigs until the models load.
- `src/rigModel.ts`: loads the Meshy team rigs and **cuts the four tyres out of the single mesh** so they spin
  (outermost low geometry on each corner = tyre). `FILES` sets length, which way the nose points, and the
  tailgate decal.
- `src/sfx.ts`: all sounds made in code for now: engine (rev follows throttle), mud splatter, crowd roar,
  light-tree beeps.
- `src/music.ts`: the **radio**: rap / country / EDM / rock, shuffled per station, never the same song twice
  in a row; tap the radio button (race: next to the camera; menus: top right) or R to go through the
  stations and OFF. Songs are **made by Michael in ElevenLabs** (I write the prompts when asked; he makes
  them). **Add a song**: level it, `ffmpeg -i in.mp3 -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 44100 -b:a 128k
  src/radio/<station>--<song-title>.mp3`; it's found automatically (`import.meta.glob`). ffmpeg is the
  WinGet Gyan.FFmpeg install (full path under `%LOCALAPPDATA%MicrosoftWinGetPackages`).
- `src/models.ts`: `model(name, height)` loads `public/models/<name>.glb` (meshopt + WebP).
- `src/home.ts`: sends vercel.app visitors to scofti.com (browser code, skipped in dev/test).
- `art/reference/`: Michael's sheets (scofti, zyra, the UTV, rufford). Always work from these.
- `art/meshy/generate.mjs`: multi-image-to-3D from a sheet's four views (`node art/meshy/generate.mjs rig-utv`;
  needs `MESHY_API_KEY` from the Windows user env). Task IDs in `tasks.json`.
- `preview.html` (dev): `/arcade/scofti-offroad/preview.html?m=rig-utv,rig-rufford`.

Shrink models: `npx gltf-transform optimize in.glb public/models/out.glb --compress meshopt --texture-compress webp --texture-size 2048 --simplify-ratio 0.5`.

## Arcade rules

- Own GitHub repo and own Vercel project; scofti.com mounts it with a rewrite. **A push to main goes live, so confirm with Michael first.**
- Vite `base: "/arcade/scofti-offroad/"`. Load runtime files through `import.meta.env.BASE_URL`. Never `/file.png`, never an absolute vercel.app URL.
- No server redirect on Vercel; `src/home.ts` does it in the browser.
- `vercel.json` holds only the `frame-ancestors 'self' https://scofti.com https://www.scofti.com` CSP header. Never DENY.
- Portrait 9:16; fill the box, never stretch. The arcade links straight to the game's own page (no cabinet,
  no frame, the whole window on every screen), so the game offers its own way back: the ✕ top right of the
  title goes to `/arcade` (the base path minus the slug, from `import.meta.env.BASE_URL`).
- One thumb on a phone, keyboard on a computer. Escape belongs to the arcade; use Backspace and on-screen BACK buttons.
- No sound before the first tap (START).
- Cover: `public/img/cover-portrait.jpg` (9:16, no title, plain sky top third) and `public/img/cover.jpg` (16:9). Made 2026-10-05
  with `cover.html` (dev; camera and ride spots in the URL):
  portrait `?w=1080&h=1920&fov=50&x=0.1&y=1.6&z=-3.5&lx=0.1&ly=2.2&lz=-19&tx=2.0&tz=-20.5&ux=-1.9&uz=-17`,
  wide `?w=1920&h=1080&fov=30&x=0.2&y=1.8&z=16&lx=0&ly=1.4&lz=0`; `window.snap()` → PNG → sharp → JPG.
- Head tags: done in `index.html`.
- Nothing loads from other sites. Bundle fonts, music and models. Credits on the welcome screen. Every asset in `ASSETS.md`.
- localStorage keys are `scofti-offroad:<thing>`, all listed in `ASSETS.md`.
- Commits authored as **mfowlkes1 (mfowlkes@gmail.com)** only.
- No real brands, people, venues or trademarks (the TV show, truck/UTV makers, tyre brands, energy drinks, mud
  parks). Michael's sheets had a carmaker badge on rufford's axles and a sportswear logo on scofti's cap: keep
  them off anything we make.
- Dev port **5230**.

**Go-live list** for the scofti side: vercel.app address, cover path, splash title (each line's text, colour,
outline, font), localStorage keys, confirmation that nothing loads from other sites.

## Working habits

- Michael is new to game making: plain words, one clear recommendation. Ask in plain chat with numbered options; a bare number is his pick. No pop-up question boxes or plan-approval prompts. He prefers lowercase.
- He tests on his phone, one change at a time, and drops files on his Desktop.
- Edit files with the edit tools, not shell rewrites.
- Take Playwright screenshots (playwright-core + installed Chrome) before handing a build to the phone.
- Music loads in the background and never blocks start. Keep volumes gentle. Watch the difficulty ramp.
- Voices: ElevenLabs (`ELEVENLABS_API_KEY`); Michael picks the voice. A loud track announcer and a crowd would suit. Music: Pixabay. Record both in `ASSETS.md`.
- Slow phones: step effects down (mud particles especially).
- Ask Michael whether this game is headed for the app stores (sloth-splash has a Capacitor setup).
- Near the end, ask Michael what the bonus round is (teases the next game); build it as a module that lifts out.
- When done, add a "scofti-offroad" section to `docs/history/scofti-arcade-brainstorm-2026-09-26.md`.

## Where we are (2026-10-05, end of session 1)

Live at scoftioffroad.vercel.app, **v1.0.0.19**, everything pushed. Credits and covers done. The go-live
details went to scofti's Claude (Vercel address, covers, splash title, 14 localStorage keys, no outside
loads, game description); it's wiring the arcade, then QA, then Michael signs off the post.

Michael is playing it on his phone for a while. **Next (when he's back):**
1. His notes from playing.
2. More levels (more brackets / Full Send courses).
3. Wrap in Capacitor for the app stores (copy sloth-splash's setup: capacitor.config.ts, build:app mode,
   src/app.ts, docs/store/), then submit.
4. **Clip mode for YouTube Shorts** (Michael asked 2026-10-05, "later"): a hidden link (e.g. `?clip=1`)
   that hides the gauge, buttons, radio and HUD, and adds film-style cameras (low by the tyres at launch,
   slow-mo spray, side-on at the jump, crowd getting soaked) so he can screen-record clean, branded clips.
5. Still open: START rev recording (prompt given; he makes it in ElevenLabs → public/audio/start-rev.mp3),
   sponsor stickers on the ride, announcer/crowd voices, driver models in the seats, the bonus round that
   teases the next game, the "scofti-offroad" section in docs/history/.
