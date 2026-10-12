# scofti500: handoff

Hello. You're the Claude that builds this game. I'm the studio director (the Claude in `C:\ai\games`). I don't write code; you own this build. This letter covers what Michael wants, the arcade rules, and what the earlier games learned.

**This is a placeholder for now (2026-10-11).** Michael isn't building tonight. It's the next game. When he opens this folder, start by reading this letter, then ask him what he wants.

## the game

Address: **scofti.com/arcade/scofti500**. Folder and slug: `scofti500` (Michael: "just scofti500", no hyphen). Repo: `github.com/mfowlkes1/scofti500`. The folder holds this letter, `docs/` and `art/reference/`, and no code yet.

**Name on the title screen:** SCOFTI 500.

**What Michael has said so far:** a stock car racing game. **A big oval, racing against other cars, having to brake and accelerate.** That's all that's decided. Ask him before you design anything else. Use plain chat and numbered options:
1. race length: a quick arcade race, or laps with a counter ("lap 12 of 20")?
2. who drives: scofti and zyra like offroad, the cast as rival drivers, or a pick of anyone?
3. the feel: realistic (drafting, tyre wear) or arcade (boost, bumping)? Drafting (tuck in behind, slingshot past) is the classic stock car trick, so suggest it.
4. pit stops: none, quick and automatic, or a tap-fast mini-game?
5. wrecks: none, spin-outs, or big pileups to dodge?
6. what you chase: wins, best time, a season with points, or money and upgrades like offroad?

Then build one small playable race, show him, and grow it one change at a time. **Basic first, trick out later.**

**The one-thumb skill** is braking and accelerating: hold to gas, let off or brake into the turns. Find the one skill that feels good, as offroad did with feathering the throttle.

## the car (Michael's sheets in `art/reference/`)

- `scofti-17-car-sheet.png`: the **#17 SCOFTI stock car**, black and neon lime with the brushed SCOFTI wrap. Views: front, rear, left, right, top, three-quarter, underneath. **Cut out the front, rear, left, right and top views and send them all to Meshy multi-image** (offroad's way, which came out right first time). Leave out the underneath view.
- **Strip the car maker badges** on the front grille and the rear (they look like real brands). No real brands, so clean them off the cut views before Meshy or off the model after.
- `scofti-17-car-sunset.png`: **the mood.** Sunset sky, wet shiny track with reflections, lights on, packed grandstands. Aim the look at this.
- Team colours: black + neon lime, the same Scofti racing look as offroad and zyra's F1 suit. Rivals get their own invented teams, numbers and colours.

## start from the latest games' setup

**Engine: Three.js + Vite + TypeScript**, the same stack as scofti-offroad and scofti-winter-games. Copy the setup from `C:\ai\games\scofti-winter-games` (the newest) and `C:\ai\games\scofti-offroad`: `vite.config.ts`, `tsconfig.json`, `.gitignore`, `vercel.json`, `src/home.ts`, `src/models.ts` (meshopt + WebP loader), `src/music.ts` (the radio that finds songs in `src/radio/` itself), `src/sfx.ts`, `src/version.ts`, `src/brand.ts`, `src/rec.ts` (REC mode for videos), `src/ads.ts` (billboards), the loading screen, `cover.html`, `tools/shot.mjs` and the Meshy scripts in `art/meshy/`. Swap the slug, port and storage keys. Copy files in; never import from or run things in another game's folder. Write your own `CLAUDE.md` early, laid out like winter games'.

Michael on offroad: "we built and shipped that shit in like 6 hours", and "offroad's style was perfection". Read `docs/history/scofti-offroad-notes-2026-10-05.md` first, then `docs/reference/scofti-winter-games-CLAUDE.md` to see how far that approach got.

## fit any screen (from day one)

**Wide on a computer, tall on a phone, one layout that adapts.**
- The 3D fills the whole window, and the camera pulls back on tall screens.
- The score and buttons pin to the corners.
- Menu panels sit beside the action on a wide screen and below it on a phone. Keep them slim so the 3D stays on display.
- The game opens on its own page. The title needs its own ✕ (top right) back to `/arcade`, worked out from `import.meta.env.BASE_URL`.
- Take screenshots at a phone size (390x844) **and** a computer size (1920x1080) before every handoff to Michael.

## what's in this folder

- `docs/history/scofti-arcade-brainstorm-2026-09-26.md`: the studio relay file. Add a "scofti500" section when done (what it became, what worked, what didn't, setup notes, leftover ideas).
- `docs/history/scofti-offroad-notes-2026-10-05.md`: offroad's notes on what worked.
- `docs/reference/`: the CLAUDE.md files of scofti-winter-games, scofti-offroad, sloth-splash and void-signal, plus offroad's and winter games' handoffs.
- `art/reference/`: the two #17 car sheets, the whole cast's sheets (including the winter ones and si), scofti's and zyra's driver sheets, zyra's F1 sheet, and `characters-README.md`. Read the README before making any art.

## characters

**scofti** is Michael himself, and **zyra** is his made-up human. Always work from a sheet; describing either from scratch gets a different person. The driver sheets and zyra's black-and-lime F1 suit fit a stock car game. Ask Michael whether he'll make new sheets.

The rest of the cast is Scofti's own: clyde, gem, metis, deekdeek, al, chickadee, sloth, tela and si. They're glossy vinyl-toy figures about 3 heads tall, rendered bright and 3D, never flat vector. deekdeek is formidable and never the joke (in winter games he was team Whalers, no whale logo). metis says nothing and misses nothing. chickadee is dry and unimpressed. Keep names lowercase. They'd make good rival drivers or pit crew; ask Michael.

**Brand:** Scofti has no brand yet, and the games build it, with traffic coming from YouTube Shorts. Put SCOFTI everywhere a clip might catch it: the car, the wall, the infield grass, banners, the pit wall, victory lane. Design the moments a Short would show, like a last-lap pass, a big wreck or a burnout. **The SCOFTI brush font is only for the word SCOFTI** ("that is ours"); other names get their own font.

## arcade rules (all of them, every game)

- Use your own GitHub repo and your own Vercel project. scofti.com mounts it at `/arcade/scofti500` with a rewrite. **A push to main goes live. Michael reviews every push, so ask first.**
- Base path: Vite `base: "/arcade/scofti500/"`. Load things at runtime through `import.meta.env.BASE_URL`. Never use `/file.png`, and never an absolute vercel.app URL.
- No server redirect on Vercel, because it would loop through scofti's proxy. `src/home.ts` sends vercel.app visitors to scofti in browser code (it's skipped in dev).
- `vercel.json` holds only one header: `Content-Security-Policy: frame-ancestors 'self' https://scofti.com https://www.scofti.com`. Never DENY.
- **Fit any screen** (see above). Never stretch.
- One thumb on a phone, keyboard on a computer. Escape belongs to the arcade, so use Backspace and on-screen BACK buttons for going back.
- No sound before the first tap (START button).
- Cover: `public/img/cover-portrait.jpg` at 9:16 with no title and a dark or plain top third, because the shelf puts the title there. Also make a 16:9 `public/img/cover.jpg` for shares.
- Head tags: title, description, canonical `https://scofti.com/arcade/scofti500`, og:url = canonical, og:title, og:description, an absolute scofti.com og:image, and twitter:card summary_large_image.
- Nothing loads from other sites. Bundle fonts, music and models. Credit everything, and record every asset in `ASSETS.md`.
- Name every localStorage key `scofti500:<thing>` and list them all, because scofti's privacy page lists them.
- Commits are authored as **mfowlkes1 (mfowlkes@gmail.com)** and nobody else.
- **No real brands, people, venues or trademarks; invent them.** That means no "NASCAR" anywhere in the game, no real tracks, series, drivers, car makers or sponsors. Made-up ones with a wink are fine; keep anything kids see clean.
- Build numbers: v1.0.0.N (`src/version.ts`). Only bump it when Michael says.
- Dev port: **5250** (unsafe-release 5173, void-signal 5180, down-the-holler 5210, sloth-splash 5220, scofti-offroad 5230, scofti-winter-games 5240).

**Go-live list** to give Michael for the scofti side: the vercel.app address, the cover paths, the splash title (each line's text, colour, outline and font), the localStorage keys, confirmation that nothing loads from other sites, and a one-line game description.

## what the earlier games learned

- **Michael's reference sheets → Meshy multi-image → GLB.** Meshy key: Windows user env `MESHY_API_KEY`. Split moving parts out in code (offroad cut the tyres out so they spin). Shrink with `npx gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress webp --texture-size 2048 --simplify-ratio 0.5`. Noses often need a turn.
- **One thumb, one skill.**
- **Tune with a quick simulation first** (pure-number physics in its own file, run with `node file.ts`), then confirm with a Playwright bot playing the real game. Winter games did this for every event.
- **Check that the money rewards skill.** In offroad, holding the gas in a hole once paid more than a clean win.
- **Screenshot the track from every angle.** For ground laid flat with `rotation.x = -PI/2`, world z = position.z − y. Offroad got it backwards twice, and an oval has banked turns.
- **Hide startup work behind a loading screen** so the title never stalls.
- **Use real recordings for anything that has to sound real.** A code-made engine rev sounded bad, and a stock car lives on its engine roar.
- **Keep the 3D on display.** Menus mustn't cover the car.
- **Make names easy to change in one place.** Michael's names come fast and change.
- **From winter games:** REC mode (`?rec`) for recording videos; billboards for Scofti's games and Michael's studio **I am Easy to Use** (`ads.ts`); a big one-of-a-kind board at the finish; record holders shown on the result card; a shop with gear levels and snacks that boost one run; poster cards for picking. Michael liked all of these.
- Edit files with the edit tools, not shell rewrites, which mangled line endings before.
- Music loads in the background and never blocks start. Fades run on timers. Keep volumes gentle. Watch the difficulty ramp.
- Slow phones: step effects down (smoke, sparks, crowd).

## music and voices

**Michael makes the music himself in ElevenLabs.** Never call the music API for him. You write prompts when he asks: style, BPM, and lyrics with [Verse]/[Hook] tags. Never name a real artist; describe the sound. Songs drop into `src/radio/<station>--<title>.mp3` (level them with ffmpeg loudnorm, as winter games' CLAUDE.md shows), and the radio finds them. Voices: ElevenLabs (`ELEVENLABS_API_KEY`); Michael picks the voice, and you make the lines through the API. Record everything in `ASSETS.md`. A race announcer, a spotter in your ear ("clear high!") and a roaring crowd would suit this game.

## later in the build

- Ask Michael whether it's headed for the app stores (sloth-splash has the Capacitor setup).
- Every Scofti game has a quick bonus round that teases the next game. Near the end, ask Michael what it is, and build it as a module that lifts out.

## how Michael works

He's new to game making, so use plain words and give one clear recommendation. Ask questions in plain chat with numbered options; a bare number is his pick. Pop-up question boxes and plan-approval prompts get rejected. He prefers lowercase. He tests on his phone, one change at a time, and drops files (voices, music, art) on his Desktop. He reviews every push.
