# scofti-offroad: handoff

Hello. You're the Claude that builds this game. I'm the studio director (the Claude in `C:\ai\games`). I don't write code; you own this build. This letter covers what Michael wants, the arcade rules, and what the earlier games learned.

## the game

Address: **scofti.com/arcade/scofti-offroad**. Folder and slug: `scofti-offroad`. Repo: `github.com/mfowlkes1/scoftioffroad` (existing repos drop the hyphen). The folder is empty except for this letter and `docs/history/`.

**Name on the title screen:** SCOFTI OFFROAD, with "mud racing team" under it.

**The idea:** big-tire mud racing. Michael was inspired by a TV show about extreme mud racing (big-tire UTVs, a circuit of events, rivalries, a party scene). Don't use the show's name or anything from it; ours is our own. Street racing was considered and dropped because it has been done a million times. Mud games exist too, but they're mostly faceless app-store "mud bogging" drag games or slow realistic sims. **Personality is the gap we fill.**

**Two kinds of race, both in the game:**
1. **Drag heats:** short side-by-side races straight through one deep mud pit, 5 to 10 seconds each. One thumb: hold to gas. Give it too much and you spin and dig yourself in; too little and you bog down. The skill is feathering the throttle. Win heats to climb a bracket.
2. **Obstacle runs:** longer runs through a muddy course with ruts, hills and jumps.

**The team:** before racing, the player picks a driver, **scofti** (the guy) or **zyra** (the girl). Both are on the same team, the **Scofti Offroad Racing Team**.

**Team colours: black and lime.** They come from zyra's F1 suit (black-and-lime Scofti racing suit with flames, SCOFTI on the chest). Both drivers wear matching team suits in this game.

**Score: mud slung.** That's how much mud you throw. Spraying the crowd should feel great.

**Rivals: the Scofti cast as other teams.** For example, deekdeek in a giant monster rig (formidable, never the joke), gem sneaking ahead, metis silent and fast, chickadee judging from the stands, unimpressed. Pick the line-up with Michael.

**The brand is the point.** Scofti is a brand-new name and Michael has no brand yet, so his games have to build it. Traffic will come from YouTube Shorts. So the Scofti name should be everywhere a clip might catch it: a big SCOFTI OFFROAD decal on the hoods and doors, logos on the team suits, banners and flags around the pit like a race sponsor, and an end screen that looks good in a screenshot ("scofti offroad team: you placed 3rd"). Use one logo everywhere; ask Michael which (clyde's sunburst face is Scofti's profile face). Design the moments a Short would show: the launch, the spray, the spin-out, the crowd getting soaked.

**Open questions for Michael (ask first, plain chat, numbered options):** 3D or not (I'd recommend Three.js like sloth-splash, camera low behind the truck), what the trucks look like, how the bracket and the obstacle runs fit together (one season? unlocks?), and the rival line-up. Start with one small playable drag heat through the pit, show him, then grow it one change at a time.

## characters

**scofti** is Michael himself. **zyra** is his made-up human. Their sheets are in `C:\ai\scofti\assets\characters\`: `scofti-peace-reference-sheet.jpg`, `scofti-war-reference-sheet.jpg`, `zyra-peace-reference-sheet.jpg`, `zyra-war-reference-sheet.jpg`, `zyra-f1-reference-sheet.jpg`. **Michael is making new mud-racing reference sheets for both of them** and will drop them on his Desktop; use those when they arrive. Always work from a sheet: describing either of them from scratch gets a different person.

The rest of the cast is Scofti's own: clyde, gem, metis, deekdeek, al, chickadee, sloth and tela. Read `C:\ai\scofti\assets\characters\README.md` before making any art. They're glossy vinyl-toy figures about 3 heads tall, rendered bright and 3D, never flat vector. Keep names lowercase.

## start from sloth-splash

Michael said sloth-splash was "by far the best and easiest" build, so copy its approach. Read `C:\ai\games\sloth-splash\CLAUDE.md` and `handoff.md`, and copy its Three.js + Vite + TypeScript setup: `vite.config.ts`, `src/home.ts`, `src/models.ts` (meshopt + WebP model loader), `src/music.ts`, `src/sfx.ts`, `src/voices.ts`, `src/version.ts`, `src/style.css` (9:16 cabinet), `cover.html`, `preview.html` and `vercel.json`. Copy files in; never import from or run things in another game's folder. Write your own `CLAUDE.md` like sloth-splash's early.

## arcade rules (all of them, every game)

- Use your own GitHub repo and your own Vercel project. scofti.com mounts it at `/arcade/scofti-offroad` with a rewrite. **A push to main goes live, so confirm with Michael first.**
- Base path: Vite `base: "/arcade/scofti-offroad/"`. Load things at runtime through `import.meta.env.BASE_URL`. Never use `/file.png`, and never an absolute vercel.app URL.
- No server redirect on Vercel, because it would loop through scofti's proxy. `src/home.ts` sends vercel.app visitors to scofti in browser code (it's skipped in dev).
- `vercel.json` holds only one header: `Content-Security-Policy: frame-ancestors 'self' https://scofti.com https://www.scofti.com`. Never DENY.
- Portrait 9:16. Fill the box and never stretch. Desktop plays it in a 9:16 cabinet. Design portrait from the start.
- One thumb on a phone, keyboard on a computer. Escape belongs to the arcade, so use Backspace and on-screen BACK buttons for going back.
- No sound before the first tap (START button).
- Cover: `public/img/cover-portrait.jpg` at 9:16 with no title and a dark or plain top third, because the shelf puts the title there. Also make a 16:9 `public/img/cover.jpg` for shares.
- Head tags: title, description, canonical `https://scofti.com/arcade/scofti-offroad`, og:url = canonical, og:title, og:description, an absolute scofti.com og:image, and twitter:card summary_large_image.
- Nothing loads from other sites. Bundle fonts, music and models. Put CC BY and similar credits on the welcome screen, and record every asset in `ASSETS.md`.
- Name every localStorage key `scofti-offroad:<thing>` and list them all, because scofti's privacy page lists them.
- Commits are authored as **mfowlkes1 (mfowlkes@gmail.com)** and nobody else.
- No real brands, people, venues or trademarks; invent them. That includes the TV show, truck and UTV makers, tyre brands, energy drinks and real mud parks. Scofti is ours, so it can be everywhere.
- Dev port: **5230** (unsafe-release 5173, void-signal 5180, down-the-holler 5210, sloth-splash 5220).

**Go-live list** to give Michael for the scofti side: the vercel.app address, the cover path, the splash title (each line's text, colour, outline and font), the localStorage keys, and confirmation that nothing loads from other sites.

## what the earlier games learned

- Take Playwright screenshots (playwright-core + the installed Chrome) before handing a build to the phone.
- Edit files with the edit tools, not shell rewrites, which mangled line endings before.
- Music loads in the background and never blocks start. Fades run on timers. Keep volumes gentle. Watch the difficulty ramp.
- 3D models come from Meshy (Pro plan, API key in the Windows user env var `MESHY_API_KEY`): picture or prompt → GLB → shrink with gltf-transform. Meshy models' noses often need a turn. sloth-splash's `art/meshy/generate.mjs` shows how.
- Voices come from ElevenLabs (key in the Windows user env var `ELEVENLABS_API_KEY`); Michael picks the voice and Claude makes the lines through the API. Music comes from Pixabay. Record both in `ASSETS.md`. A loud track announcer and a crowd would suit this game.
- Slow phones: step post effects down. Mud spray means lots of particles, so watch phone speed.
- sloth-splash also has a Capacitor app setup for the app stores (copied from unsafe-release). Ask Michael whether this game is headed for the stores too.
- Every Scofti game has a quick bonus round that teases the next game. Near the end, ask Michael what this game's bonus round will be, and build it as a module that lifts out.

## how Michael works

He's new to game making, so use plain words and give one clear recommendation. Ask questions in plain chat with numbered options; a bare number is his pick. Pop-up question boxes and plan-approval prompts get rejected. He prefers lowercase. He tests on his phone, one change at a time, and drops files (voices, music, art) on his Desktop.

## the history file

`docs/history/scofti-arcade-brainstorm-2026-09-26.md` is the studio's relay file. When the game is done, add a "scofti-offroad" section using its template (what it became, what worked, what didn't, setup notes, leftover ideas).
