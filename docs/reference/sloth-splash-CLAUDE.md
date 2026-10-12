# Sloth Splash

Was **Simple Sloth** until 2026-10-04 (the name void-signal's bonus round teased). Michael renamed it because
"simple" didn't say water slide. A web check found no game, app or trademark called Sloth Splash.

Scofti arcade game. Lives at **scofti.com/arcade/sloth-splash**. Repo `github.com/mfowlkes1/slothsplash`.
`handoff.md` holds the original brief from the void-signal Claude.

## The game

The sloth lies on his back in a rubber ring, riding an endless jungle water slide. Stay on the slide.
He starts at a sloth crawl and speeds up until it's absurd, while the music stays chill. Fly off the edge
and there's a huge splash, and his claws wipe the screen like windshield wipers.

**The goal is the Google Play and Apple app stores.** It's a phone game first. The scofti arcade version is a
promo/demo of it.

**Starting from scratch here.** Don't touch, run or import anything in void-signal (not even its dev
server). Everything the game needs lives in this folder. Michael OK'd copying specific assets from it (the alien
sloth, the jungle plants); ask before taking anything else.

**Engine decision (2026-10-04):** stay with Three.js and wrap it with Capacitor for the stores, the way
`C:\ai\games\unsafe-release` does (Phaser + Capacitor; went to Google Play review 2026-10-03). Copy its app setup
(`capacitor.config.ts`, `build:app` mode, `src/app.ts`, `docs/store/` kit) when we get there. Godot and Unity were
considered and turned down: slower phone testing, heavier web demo.

## Design decisions (Michael, 2026-10-04)

- **Opening:** tap the app icon → 3D splash screen with both sloths and the SLOTH SPLASH title → PLAY.
- **Camera:** behind him and up high (Subway Surfers style): all of him in the ring, plenty of slide ahead.
- **Game shape:** separate slides with endings (e.g. waterfall, cave, river); finishing one unlocks the next.
- **Characters:** pick either sloth before riding. Same game, different rider.
- **Look:** real-looking jungle (lifelike plants, sunlight, mist, water) with the shiny toy sloths riding through
  it. **Lots** of 3D plants and trees.

## Stack

Vite + TypeScript + Three.js. `npm run dev` → http://localhost:5220/arcade/sloth-splash/

- `src/main.ts`: entry, renderer, title camera shots, and the flow: title → PLAY → pick screen (tap a sloth in
  the pool; he hops, glows; remembered; pick a slide 1–5, locked until the one before is finished) → RIDE!
  (he belly-flops, camera dives, lens drops) → ride → crash (SPLOOSH!) or finish (SLIDE N DONE!, NEXT SLIDE)
  → result. The ring spins half a turn every few seconds, so he faces the camera, then downhill.
- Slides: `LEVELS` in `src/game/tuning.ts` (length, start speed, speed growth, bend strength, track shape:
  drops, humps, straights, bend length). Each ends with a straight, a checkered finish arch and a launch ramp.
  Each runs somewhere different: `src/game/themes.ts` (Sunny Jungle, Misty Rainforest, Sunset River, Moonlit
  Jungle with fireflies, Volcano Gorge): sky, fog, light, slide/water/river/ground colours and plant mix, applied
  by `world.setLook` and `slide.useTheme` when a ride starts.
- `src/music.ts`, `src/sfx.ts`: music and sound effects (Web Audio, start on the PLAY tap); the flower ding is
  synthesised in `sfx.ts`
- `src/voices.ts`: the sloths talk while riding (start, fast on drops, close near the lip, off, finish, flowers
  on a 6-run, land). Voices: The Sloth = Will, Noodles = Charlie, Trey = Roger (ElevenLabs). Add lines in
  `art/voices/generate.mjs`, then `sh art/voices/trim.sh`; `COUNT` in voices.ts must match.
- `src/game/flowers.ts`: hibiscus collectibles in patterns along the slide (pink 1, red 5); banked after each ride
- Gift Shop: `src/tubes.ts` (tube skins painted in code, prices in flowers), `src/shop.ts` (cards), shop flow in
  `main.ts` (try on → BUY/EQUIP). The "Mystery" sloth card is a teaser for a third, buyable sloth (not made yet).
  Real-money purchases come later with the store apps.
- `src/burst.ts`: one-shot splash (droplet crown, spray, foam ring) for anything hitting the water
- `src/world.ts`: shared sky, fog, lights, ripple normals, rubber ring, plant sizes
- `src/game/`: the ride. `tuning.ts` holds every difficulty number (speed ramp, steering, wall height);
  `path.ts` makes the endless bending downhill line; `slide.ts` builds trough, water, legs, river, banks and
  plants in 30 m pieces; `rider.ts` is the sloth sliding up the walls and flying off; `steering.ts` is thumb
  drag / arrow keys; `game.ts` ties it together with the camera. Crash → claws wipe the lens (CSS in
  `style.css`, claw art in `index.html`) → result panel.
- `src/splash.ts`: the opening 3D scene (sky, mirror pool, cliff, plants, sunbeams, mist, both sloths in rings)
- `src/waterfall.ts`: the waterfall, all in shaders (three curved water sheets, foam, spray droplets, rising mist); reusable for slide endings
- `src/version.ts`: the build number (shown on the title and credits); bump it for each phone/arcade/store build
- Title screen: ✕ exit (to the Scofti Arcade page), CREDITS (Scofti original art, music, voices; tools; font),
  loading screen that holds the title until its models are in (`whenLoaded` in `src/models.ts`)
- `src/home.ts`: sends vercel.app visitors to scofti.com (browser code, skipped in dev)
- `src/models.ts`: `model(name, height)` loads `public/models/<name>.glb` (meshopt + WebP)
- `src/style.css`: 9:16 cabinet and welcome screen
- `art/`: source pictures behind the models (not shipped)
- `art/meshy/generate.mjs`: makes jungle models in Meshy (`node art/meshy/generate.mjs <name>`); prompts live in it, task IDs in `tasks.json`
- `cover.html` (dev only): renders the covers from the title scene; camera set by URL
  (`?w=1080&h=1920&fov=36&x=0.2&y=2.2&z=13.5&lx=0.2&ly=2.6&lz=-2&wash=0.4` made the portrait;
  `?w=1920&h=1080&fov=34&x=0.2&y=1.7&z=9.5&lx=0.2&ly=1.5&lz=-2&wash=0.3` the wide one); `window.snap()` gives the PNG
- `preview.html` (dev only): look at models side by side, `/arcade/sloth-splash/preview.html?m=tree-palm,plant-fern`

Shrink new models: `npx gltf-transform optimize in.glb public/models/out.glb --compress meshopt --texture-compress webp --texture-size 1024 --simplify-ratio <r>`.
Meshy ignores the triangle target on multi-image jobs, so always simplify.

## Characters in this game

Rider names (Michael, 2026-10-04): **The Sloth** (hoodie), **Noodles** (alien), **Trey** (hippie, bought
in the Gift Shop for 3,000 flowers; a dark "?" silhouette in the pool until then). A quiet nod for jam-band
fans: never use a band name, a surname or a real person's likeness.

- **Hoodie sloth** (`sloth-hoodie.glb`): from Michael's sheet `C:\ai\apps\sloth\design\mascot\sloth-reference-sheet-v1.png`. Brown fur, green hoodie with lightning patch, stopwatch, sneakers.
- **Alien sloth** (`sloth-alien.glb`): Scofti's purple-and-mint sloth with glowing antennae, copied from void-signal.
- **Jungle plants** (`plant-*.glb`, six of them), copied from void-signal. Sizes it used, with the sloth 2.6 tall:
  banana 12, elephant ear 8 (pot sinks 0.22 into the ground), monstera 5.5, bird of paradise 6, tree fern 11,
  hibiscus 5. Need more variety (palms, big canopy trees, vines, ferns, rocks) for "lots of plants".

## Test link (2026-10-04)

Vercel project `slothsplash` (mfowlkes1s-projects), **not connected to GitHub yet**, so pushes don't deploy.
`https://slothsplash.vercel.app` currently serves the private **test build** (`npm run build:test` → `dist-test/`:
base `/`, no redirect to scofti). To update it: build:test, copy `dist-test/` into a staging folder's
`.vercel/output/static/` with `.vercel/project.json` and a v3 `config.json` (the CSP header as a route), then
`vercel deploy --prebuilt --yes` there. Before the scofti launch, deploy the real build (`dist/`) to production
instead, then add `"sloth-splash": "https://slothsplash.vercel.app"` to scofti's `GAMES` in `next.config.ts`.

## Arcade rules

- Own GitHub repo and own Vercel project; scofti.com mounts it with a rewrite. **A push to main goes live, so confirm with Michael first.**
- Vite `base: "/arcade/sloth-splash/"`. Load runtime files through `import.meta.env.BASE_URL`. Never `/file.png`, never an absolute vercel.app URL.
- No server redirect on Vercel (it loops through scofti's proxy); `src/home.ts` does it in the browser.
- `vercel.json` holds only the `frame-ancestors 'self' https://scofti.com https://www.scofti.com` CSP header. Never DENY.
- Portrait 9:16; fill the box, never stretch. Desktop plays it in a 9:16 cabinet.
- One thumb on a phone, keyboard on a computer. Escape belongs to the arcade; use Backspace and on-screen BACK buttons.
- No sound before the first tap (START).
- Cover: `public/img/cover-portrait.jpg` (9:16, no title, dark/plain top third) and `public/img/cover.jpg` (16:9, for shares).
- Head tags: title, description, canonical, og:url = canonical, og:title, og:description, absolute scofti.com og:image, twitter:card summary_large_image.
- Nothing loads from other sites. Bundle fonts, music and models. CC BY credits go on the welcome screen. Every asset goes in `ASSETS.md`.
- localStorage keys are `sloth-splash:<thing>`, all listed in `ASSETS.md`.
- Commits authored as **mfowlkes1 (mfowlkes@gmail.com)** only.
- No real brands, people, venues or trademarks (water parks and slide makers included).
- Dev port **5220**.

**Go-live list** for the scofti side: vercel.app address, cover path, splash title (each line's text, colour, outline, font), localStorage keys, confirmation that nothing loads from other sites.

## Characters

Scofti's own: sloth, clyde, gem, metis, deekdeek, al, chickadee, tela, michael, her. Read
`C:\ai\scofti\assets\characters\README.md` before making any art. Glossy vinyl-toy figures, about 3 heads
tall, bright 3D, never flat vector.

## Working habits

- Michael is new to game making: plain words, one clear recommendation. Ask in plain chat with numbered options; a bare number is his pick. No pop-up question boxes or plan-approval prompts.
- He tests on his phone, one change at a time, and drops files (voices, music, art) on his Desktop.
- Edit files with the edit tools, not shell rewrites (line endings got mangled before).
- Take Playwright screenshots (playwright-core + installed Chrome) before handing a build to the phone.
- Music loads in the background and never blocks start. Fades run on timers. Keep volumes gentle. The speed ramp is the difficulty, so watch it.
- 3D models: Meshy (`MESHY_API_KEY` user env var) → GLB → shrink with gltf-transform. Noses often need a turn.
- Voices: ElevenLabs (`ELEVENLABS_API_KEY`); Michael picks the voice. Music: Pixabay. Record both in `ASSETS.md`.
- Slow phones: step post effects down.
- Near the end, ask Michael what this game's bonus round will be (the next game), and build it as a module that lifts out.
- When the game is done, add a "sloth-splash" section to the studio relay file (`docs/history/scofti-arcade-brainstorm-2026-09-26.md` in void-signal; ask Michael before editing it, since that's void-signal's folder).

## Open questions

- What each slide is (how many, their places, how long, what's at each ending) and what you collect or score.
