# scofti-winter-games: handoff

Hello. You're the Claude that builds this game. I'm the studio director (the Claude in `C:\ai\games`). I don't write code; you own this build. This letter covers what Michael wants, the arcade rules, and what the earlier games learned.

## the game

Address: **scofti.com/arcade/scofti-winter-games**. Folder and slug: `scofti-winter-games`. Repo: `github.com/mfowlkes1/scoftiwintergames` (existing repos drop the hyphen). The folder holds this letter, `docs/` and `art/reference/`, and no code yet.

**Name on the title screen:** SCOFTI WINTER GAMES (check the exact wording and any line under it with Michael).

**The idea is Michael's, and he already knows what he wants.** Your first job is to ask him, so don't design it before he does. Ask in plain chat with numbered options where that helps:
1. which events (and how many to start with)
2. who you play as (scofti, zyra, a pick of both, the whole cast?)
3. rivals and line-up
4. how events fit together (one games/medal table? unlocks? money and a shop like offroad?)
5. the look and the place (mountain, village, stadium at night…)
6. the score name, team name and colours

Then build one small playable event, show him, and grow it one change at a time.

**It follows scofti offroad.** Michael on offroad: "we built and shipped that shit in like 6 hours", and "offroad's style was perfection". So this game copies offroad's approach in every way: the look, the pace, the one-thumb skill, the garage/shop/money loop if Michael wants one, Scofti branding everywhere, and its way of working with him. Offroad's Claude left notes for you: **read `docs/history/scofti-offroad-notes-2026-10-05.md` first**, then `docs/reference/scofti-offroad-CLAUDE.md`.

## the one big change: fit any screen

**Fit any screen: wide on a computer, tall on a phone, one layout that adapts.** Do this from day one.

Offroad was built as a tall phone game, so on a computer it's a strip down the middle. void-signal fits any screen, and Michael says it "looks hot on a computer". The old arcade rule said "portrait 9:16"; that rule is gone.
- The 3D fills the whole window, and the camera pulls back on tall screens.
- The score and buttons pin to the corners.
- Menu panels sit beside the action on a wide screen and below it on a phone. Keep the 3D on display and the panels slim, as in offroad.
- The arcade cabinet frame is gone, and the arcade opens the game on its own page. The title needs its own ✕ (top right) back to `/arcade`, worked out from `import.meta.env.BASE_URL` like offroad's.
- Take screenshots at a phone size (e.g. 390x844) **and** a computer size (e.g. 1920x1080) before every handoff to Michael.

For how void-signal does it, see `docs/reference/void-signal-CLAUDE.md` and read (never run or import from) `C:\ai\games\void-signal\src\`.

## start from scofti offroad's setup

Copy offroad's Three.js + Vite + TypeScript setup from `C:\ai\games\scofti-offroad`: `vite.config.ts`, `tsconfig.json`, `.gitignore`, `vercel.json`, `src/home.ts`, `src/models.ts` (meshopt + WebP loader), `src/music.ts` (the radio that finds songs in `src/radio/` itself), `src/sfx.ts`, `src/version.ts`, `src/paint.ts` if colours come back, `src/brand.ts` for the wordmark/banner canvas art, the loading screen, `cover.html`, `preview.html` and `art/meshy/generate.mjs`. Swap the slug, port and storage keys, and **drop offroad's 9:16 box from the CSS** (see above). Copy files in; never import from or run things in another game's folder. Write your own `CLAUDE.md` early, laid out like offroad's.

## what's in this folder

- `docs/history/scofti-arcade-brainstorm-2026-09-26.md`: the studio relay file. Add a "scofti-winter-games" section when done (what it became, what worked, what didn't, setup notes, leftover ideas).
- `docs/history/scofti-offroad-notes-2026-10-05.md`: offroad's notes for this game, which stand in for its relay section.
- `docs/reference/`: the CLAUDE.md files of scofti-offroad, sloth-splash and void-signal, plus offroad's own handoff, so you can see where it started and where it ended up.
- `art/reference/`: the whole cast's sheets, scofti's and zyra's offroad driver sheets, and `characters-README.md`. Read the README before making any art.

## characters

**scofti** is Michael himself, and **zyra** is his made-up human. Always work from a sheet: describing either of them from scratch gets a different person. Michael may make new winter sheets for them (as he did mud sheets for offroad) and drop them on his Desktop; ask him, and use those if they come.

The rest of the cast is Scofti's own: clyde, gem, metis, deekdeek, al, chickadee, sloth and tela. They're glossy vinyl-toy figures about 3 heads tall, rendered bright and 3D, never flat vector. deekdeek is formidable and never the joke; metis says nothing and misses nothing; chickadee is dry and unimpressed. Keep names lowercase.

**Brand:** Scofti has no brand yet, and the games build it, with traffic coming from YouTube Shorts. Put SCOFTI everywhere a clip might catch it (banners, bibs, sleds, boards, the end screen), and design the moments a Short would show. **The SCOFTI brush font is only for the word SCOFTI** ("that is ours"); other names get their own font.

## arcade rules (all of them, every game)

- Use your own GitHub repo and your own Vercel project. scofti.com mounts it at `/arcade/scofti-winter-games` with a rewrite. **A push to main goes live. Michael reviews every push, so ask first.**
- Base path: Vite `base: "/arcade/scofti-winter-games/"`. Load things at runtime through `import.meta.env.BASE_URL`. Never use `/file.png`, and never an absolute vercel.app URL.
- No server redirect on Vercel, because it would loop through scofti's proxy. `src/home.ts` sends vercel.app visitors to scofti in browser code (it's skipped in dev).
- `vercel.json` holds only one header: `Content-Security-Policy: frame-ancestors 'self' https://scofti.com https://www.scofti.com`. Never DENY.
- **Fit any screen** (see above). Never stretch.
- One thumb on a phone, keyboard on a computer. Escape belongs to the arcade, so use Backspace and on-screen BACK buttons for going back.
- No sound before the first tap (START button).
- Cover: `public/img/cover-portrait.jpg` at 9:16 with no title and a dark or plain top third, because the shelf puts the title there. Also make a 16:9 `public/img/cover.jpg` for shares. Render both from the game's scene with `cover.html`, like offroad.
- Head tags: title, description, canonical `https://scofti.com/arcade/scofti-winter-games`, og:url = canonical, og:title, og:description, an absolute scofti.com og:image, and twitter:card summary_large_image.
- Nothing loads from other sites. Bundle fonts, music and models. Credit everything (offroad has a credits page from the title), and record every asset in `ASSETS.md`.
- Name every localStorage key `scofti-winter-games:<thing>` and list them all, because scofti's privacy page lists them.
- Commits are authored as **mfowlkes1 (mfowlkes@gmail.com)** and nobody else.
- No real brands, people, venues or trademarks; invent them. That includes the real winter games and their rings, ski and board makers, real resorts and real athletes. Made-up brands with a wink are fine; keep anything kids see clean.
- Build numbers: v1.0.0.N (`src/version.ts`).
- Dev port: **5240** (unsafe-release 5173, void-signal 5180, down-the-holler 5210, sloth-splash 5220, scofti-offroad 5230).

**Go-live list** to give Michael for the scofti side: the vercel.app address, the cover paths, the splash title (each line's text, colour, outline and font), the localStorage keys, confirmation that nothing loads from other sites, and a one-line game description.

## what the earlier games learned

- **Michael's reference sheets → Meshy multi-image → GLB.** Cut a sheet into its four views and send them all; offroad's rides came out right first time. Then split moving parts out of the single mesh in code (offroad cut the tyres out so they spin). Meshy key: Windows user env `MESHY_API_KEY`. Shrink with `npx gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress webp --texture-size 2048 --simplify-ratio 0.5`. Noses often need a turn.
- **One thumb, one skill**, reused in every event (offroad: feathering the throttle).
- **Tune with a quick simulation first** (a policy loop over the pure-number physics, run with `node file.ts`), then confirm with a Playwright bot playing the real game.
- **Check that the money rewards skill.** In offroad, holding the gas in a hole once paid more than a clean win.
- **Screenshot every new slope.** For ground laid flat with `rotation.x = -PI/2`, world z = position.z − y. Offroad got it backwards twice, and a ski game will be all slopes.
- **Hide startup work behind a loading screen** so the title never stalls.
- **Use real recordings for anything that has to sound real.** A code-made monster-truck rev sounded bad.
- **Keep the 3D on display.** Menus mustn't cover the stars of the game.
- **Make names easy to change in one place.** Michael's names come fast and change.
- Take Playwright screenshots (playwright-core + the installed Chrome) before handing a build to the phone.
- Edit files with the edit tools, not shell rewrites, which mangled line endings before.
- Music loads in the background and never blocks start. Fades run on timers. Keep volumes gentle. Watch the difficulty ramp.
- Slow phones: step effects down (snow particles, like offroad's mud).

## music and voices

**Michael makes the music himself in ElevenLabs.** Never call the music API for him. You write prompts when he asks: style, BPM, and lyrics with [Verse]/[Hook] tags. Never name a real artist; describe the sound. Songs drop into `src/radio/<station>--<title>.mp3` (level them with ffmpeg loudnorm, as offroad's CLAUDE.md shows) and the radio finds them. Voices: ElevenLabs (`ELEVENLABS_API_KEY`); Michael picks the voice and you make the lines through the API. Record everything in `ASSETS.md`. A loud announcer and a crowd would suit a winter games.

## later in the build

- Ask Michael whether it's headed for the app stores (sloth-splash has the Capacitor setup).
- Every Scofti game has a quick bonus round that teases the next game. Near the end, ask Michael what it is, and build it as a module that lifts out.
- Michael wants a **clip mode for Shorts** in offroad (a hidden `?clip=1` that hides the HUD and adds film-style cameras). Plan for one here from the start, so the cameras and HUD are easy to switch.

## how Michael works

He's new to game making, so use plain words and give one clear recommendation. Ask questions in plain chat with numbered options; a bare number is his pick. Pop-up question boxes and plan-approval prompts get rejected. He prefers lowercase. He tests on his phone, one change at a time, and drops files (voices, music, art) on his Desktop. He reviews every push.
