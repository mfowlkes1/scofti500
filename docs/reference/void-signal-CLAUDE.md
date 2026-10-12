# Void Signal

A 3D behind-the-ship shooter for the Scofti Arcade: you skim a moon in
space and weave through cities at night, shooting saucers that are
abducting the locals. The look aims at the cover art. From 2026-09-29 the
user wants the places **as lifelike as possible** (NASA photos, Meshy
`realistic` models) unless it burns tokens or credits too fast; the ships
and characters keep their glossy animated-movie finish. It started
cel-shaded, then went animated-movie, then lifelike. `src/game/look.ts`
holds the film pass and steps it down on slow phones.
Our own ships, aliens and names. The design is still moving; ask the user
rather than assume.

**The flow:** welcome (cover + START) → choose a pilot → that pilot's
briefing (their voice, words lighting up) → LAUNCH → warp-speed jump (star
streaks, twist, white flash, boom) → the flight: skimming a dark cratered
moon with Earth in the sky, Clyde (flight control) on the radio, the other
pilot calling you into formation, a dive through the clouds, then a neon
city at night (Chinese style) where you weave between towers and shoot
saucers carrying off the locals (sloths and possums).

**The loop (built 2026-09-29):** the run goes round. Space (30 s) →
Clyde recalls you → the mothership hangar from the cover (repair, KEEP
FLYING or SWAP PILOT) → launch → a city (Dubai and the Chinese city take
turns, 45 s) → climb back to space, a bit faster each lap. After level 2 (laps 1–2),
just before parking, a **SIMPLE SLOTH** bonus round: the sloth rides an
endless water slide toward the camera (belly on show) until it falls off;
a huge splash, then his claws wipe the screen like windshield wipers into
the hangar. Simple Sloth is meant to become the user's next game;
`src/game/slide.ts` is written to lift out for it.

**Bonus rounds (2026-09-29, for testing):** every trip home is a bonus round,
taking turns: FENNARIO STATION (`src/game/fennario.ts`, a retro Frogger-style
turtle crossing train tracks to a little station; the user's Grateful Dead nod,
but never "Terrapin Station" or the band's turtles), then SIMPLE SLOTH. Every level
is 20 s for now, for recording a run (were 30 s in space, 45 s in a city). Dying restarts the
part you were in (space or the city, each a checkpoint), never further
back, until the last ship is gone.

**Pilots:** the player chooses between **Gem** and **Metis** (so far; Metis
was called Muta until 2026-09-29, the stand-in for Meta, named for the Greek
goddess of wisdom whom Zeus swallowed). Al and
Clyde have pilot cards in `art/` kept for later; Chickadee and DeekDeek have
prompts but no art yet. The characters are Scofti's own; their sheets and
rules are in `C:\ai\scofti\assets\characters\README.md`.

## Stack and layout

Three.js + Vite + TypeScript, browser only, static output. Portrait (9:16, a
phone held upright), full screen. It fills whatever box it's given: the
flight's camera, view width and lane adjust to the shape, and the welcome
screens have a tall layout (`max-aspect-ratio: 1/1`) and a wide one, so it
also plays in a 16:9 cabinet or on a sideways phone. Dev server runs on port 5180 (Unsafe Release uses 5173).

Where things live: `src/splash.ts` + `index.html` (welcome, pilot choice,
briefing), `src/pilot.ts` (pilots, colours, briefing text),
`src/game/warp.ts` (the jump), `src/game/Game.ts` (the flight, the loop
and HUD), `src/game/world.ts` (the moon, sky, both cities),
`src/game/space.ts` (Earth and stars), `src/game/mothership.ts` (the
mothership outside and the hangar), `src/game/slide.ts` (SIMPLE SLOTH), `src/game/models.ts` (ships,
saucers, props built from shapes; outline + toon helpers),
`src/game/input.ts` (one thumb: a flight stick appears where it lands,
tilt moves the ship steadily and it stays put on release, fires while it's
down; arrows/WASD + Space; a HUD button hides or shows the stick, remembered,
with a tip pointing at it on the first 3 flights), `src/sfx.ts` (synthesised sounds, mute),
`src/install.ts` + `public/manifest.webmanifest` + `public/sw.js` (installable
on a phone's home screen; the INSTALL button is switched off for now with
`SHOW_BUTTON` in install.ts; the helper keeps an
offline copy, fresh code when online, big files saved on first use; bump
its CACHE name to throw old saved files away), `src/credits.ts` (credits
page and version), `public/privacy.html`, `docs/store/` (store kit: listing
text, icons, screenshots, submission checklist), `src/devOptions.ts`
(`?pilot=gem`, `&warp=1`, `&scene=hangar|city|slide|fennario`, `&lap=2`), `src/home.ts` (keeps it on
scofti.com). Every third-party or generated file is recorded in `ASSETS.md`.

## Where it lives

It ships to **scofti.com/arcade/void-signal** as its own Vercel project, which
scofti.com rewrites. **The game is served under a sub-path, not a domain
root:** Vite `base` is `/arcade/void-signal/`; never reference an asset as
`/something.png`.

## Rules

- No real brands, people, venues or trademarked names; invent them.
- Commits are authored as mfowlkes1. Pushes to main go live: confirm first.
- Voices: ElevenLabs, key in the Windows user env var ELEVENLABS_API_KEY
  (HKCU\Environment). Music from Pixabay. Record both in ASSETS.md.
- Audio: music loads in the background (never blocks start), mute persists,
  fades on timers, gentle default volumes.
- Check visuals with Playwright screenshots (playwright-core + installed
  Chrome) before handing to the phone.
- Edit files with the edit tools, not shell rewrites (they mangled line
  endings on Unsafe Release).

## The history file

`docs/history/scofti-arcade-brainstorm-2026-09-26.md` is the brainstorm this
game started from. At the end, add a "Void Signal" section to it using its
relay template (what it became, what worked, what didn't).

## How the user works

New to game making: plain language and one clear recommendation. Tests on the
phone and asks for one change at a time. Ask questions in plain chat with
numbered options (a bare number is the pick); pop-up question boxes and
plan-approval prompts get rejected.
