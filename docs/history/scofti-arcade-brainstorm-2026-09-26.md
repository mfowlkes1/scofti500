# Next Scofti Arcade game: concept brainstorm

## Context
Unsafe Release is live and will keep growing. The user wants to brainstorm a
second game for the Scofti Arcade, to be built with another Claude session.
This is a concept brief, not code: pick a direction, then hand the chosen
concept plus the "carry over" section below to the new session.

## What worked on Unsafe Release (design around these)
- A name that's a real term with a double meaning (a racing penalty that is
  also the whole mechanic).
- One thumb: tap to commit, swipe to dodge. Short runs, instant retry.
- A tense timing moment at its heart (pick the gap), not just reflexes.
- Voices on the radio (ElevenLabs) and a song per level (Pixabay) give it life.
- Special levels tied to real events and dates (Fortress Bay race weekend).
- A second mode for a different itch (PR run: no traffic, pure speed).
- Built by playing on the phone and asking for one change at a time.

## Chosen: QUICK RELEASE
The name: on a carrier catapult the jet is held by a holdback bar that
releases the instant the catapult fires. Launch off the deck, then a
side-scrolling shooter in the spirit of the 1981 arcade classic Defender
(genre inspiration only: invent our own ships, enemies, names and look).

**The loop (mirrors Unsafe Release's box → stint → pit stop):**
1. **Cat shot**: on the catapult, engines at full power, the shooter (deck
   crew) crouches and gives the signal. Let go of the screen on the signal
   for a perfect launch; too early and you're held, too late and you lose
   speed off the bow and sink toward the waves.
2. **Mission**: fly right over sea and coastline, a radar strip across the
   top showing everything around you. Two thumbs in landscape: the left
   thumb drags to climb and dive, the right thumb holds to fire guns and
   lifting it launches a missile (the "release" again). Shoot down invented enemy drones; rescue something
   worth protecting (e.g. downed pilots in life rafts, Defender's humanoids
   reimagined).
3. **Bingo fuel**: the radio calls you home. Turn back to the carrier and
   land: line up the glide slope, catch a wire (hook one of three arrestor
   wires; miss them all and it's a bolter: go around). Landing is the
   skill moment, like the pit release.
4. Refuel and rearm, back on the catapult, launch again. Each launch a bit
   tougher.

**Radio** (ElevenLabs): the Air Boss and the landing officer ("paddles"
calling "on glide slope... a little high... cut, cut!"), your call sign,
and a wingman. Lines for launch, kills, rescues, low fuel, bolters.

**Second mode** (like the PR run): Endless Patrol, no carrier returns,
just survive and score.

**Event levels**: Fleet Week, July 4th, airshow weekends, Veterans Day;
Arctic carrier ops in winter, typhoon season storms.

**Look**: dark sky, bright vector-like lines and glowing sprites nodding
to the arcade era, but our own jets and enemies.

**Screen: landscape, side-scrolling** (decided). Upright would play like
Unsafe Release with guns; sideways is what makes this its own game.
- Web pages can't force rotation (iPhones never allow it), so held upright
  the game shows a "turn your phone sideways" screen until it's rotated.
- Fixed landscape playfield (e.g. 800×450) scaled to fit, the mirror of
  Unsafe Release's 450×800.
- Suits the desktop arcade cabinet; a future app build can lock landscape.
- Carrier seen side-on: catapult shot off the bow, landing hooks a wire.

**Other names the user liked for later in the series**: Early Release,
Full Release, Dark Release.

## The Release series (user's direction)
Every game is named "<something> Release", and in every one the key action
is literally releasing: letting go of the screen at the right moment.
Unsafe Release fits already (release from the box). Shortlist:

- **Emergency Release**: fly a jet low through a canyon holding the screen;
  let go to eject, then steer the parachute onto the landing target. The
  later you eject, the more points, the less room to land. Tower radio.
  Events: airshows.
- **Catch & Release** (not on the list, but the best-known one): fishing.
  Hold to reel in, let go when the fish pulls or the line snaps; land it,
  then release it back for points. Calm but tense. Events: fishing seasons,
  holidays at the lake.
- **Early Release**: school's out! Hold to charge a sprint down the halls,
  let go to burst past teachers, mop buckets and hall monitors at the final
  bell. Events: last day of school, snow days, summer.
- **Accidental Release**: the zoo gates opened by mistake. Hold to line up
  a net or lasso, let go to throw and catch the escaped animals before they
  reach the exit. Chickadee could be the one who pecked the button.
- **Liability Release**: sign the waiver, then do the stunt. Hold to build
  speed toward the ramp, let go at the lip to launch; land clean. The waiver
  gag gets funnier every crash. Events: extreme-sports weekends.
- **Controlled Release**: a harbour crane; hold to lower, let go to drop
  containers onto a rocking ship, stacking as high as you dare.

## Earlier concepts (not "Release" names)

1. **Hold Short** (aviation: "hold short of the runway")
   Taxi planes across a busy runway between landings and take-offs. Tap to
   cross when the gap is right; the tower talks you through it.
   Events: airshows, holiday travel rush. Closest in feel to Unsafe Release.

2. **Dead Air** (radio: silence on air)
   You're the DJ keeping a station on air: swipe the next song, ad or jingle
   in before the current one runs out. Callers, a grumpy producer in your ear.
   Voice-heavy, perfect for ElevenLabs. Events: holidays, big match days.

3. **Offside Trap** (football)
   You're the back line: tap to step up at the exact moment the striker runs,
   catching them offside. Mistime it and they're through on goal.
   Events: cup finals, derby days, tournaments.

4. **Crumb Run**, starring Chickadee (a Scofti character you own)
   A side-scrolling runner: Chickadee darts through the city grabbing crumbs,
   dodging pigeons, cats and windows. Al on the "radio" cheering her on.
   Events: seasons, holidays, city themes. Horizontal endless runner.

5. **Last Orders** (pub: "last orders at the bar")
   Slide drinks down the bar to the right customers before closing time;
   flick strength decides where it stops. Rush builds, regulars heckle.
   Events: St Patrick's Day, New Year's Eve, match nights.

6. **Mind the Gap** (London Underground)
   Dash along platforms and through closing train doors, timing each leap.
   The announcer's voice warns you. Events: city rush hours, holidays.

## Carry over to the new session (put in its CLAUDE.md)
- Stack: Phaser 4 + Vite + TypeScript, browser only, static output.
- Served under a sub-path: scofti.com/arcade/<game-name>, its own Vercel
  project, rewritten by scofti.com. Vite `base` set to that path; never
  reference assets as `/file.png`.
- Keep it on scofti: `src/home.ts` host lock + `vercel.json`
  frame-ancestors (copy from Unsafe Release).
- Dev-only URL options for testing setups side by side (`src/devOptions.ts`).
- Audio: music downloads in the background (never blocks start), a mute that
  persists, fades on timers not scene tweens, gentle default volumes.
- Voices: ElevenLabs API, key in the Windows user env var
  ELEVENLABS_API_KEY (read from HKCU\Environment); record in ASSETS.md.
- ASSETS.md for every third-party file and its licence.
- No real brands, teams, people or venues; invent them.
- Commits authored as mfowlkes1; pushes to main go live, so confirm first.
- Screenshots with Playwright (playwright-core + installed Chrome) to check
  visuals before handing to the phone.

---

## Added later: the "Open the..." games

**Scofti is the property.** The games live in the Scofti Arcade on
scofti.com; a game's own domain is a bonus, not its home. Domains the user
already owns: **openthetunnel** and **openthehole**. A third,
**openthetap.com**, would finish the joke (a wink at AI companies "opening
the token tap") but probably won't be bought. Random ideas to pass along,
nothing decided.

### Open the Tunnel: a Dig Dug-style digger
- Dig through layered earth, carving tunnels as you go. Enemies roam the
  tunnels you open; dig under a rock and it drops on whatever's below.
- One thumb: drag to dig in any direction.
- Twist that fits the name: each level has one tunnel to open through to
  the surface or the next chamber (a spring, a vault, a lost mine). Breaking
  through floods the tunnels and washes enemies out, so you plan your route
  before you open it.
- Chickadee as the lookout above ground calling warnings.

### Open the Hole: a black hole shooter
- Defender's energy, but played into the centre of the phone: a black hole
  sits in the middle of the screen and everything spirals in toward it.
  You orbit around the edge (drag around the rim), shooting inward at ships
  and debris before they're swallowed or break out and hit you.
- The hole grows as it feeds: the playfield shrinks, the pull gets
  stronger, and your orbit tightens. Survive as long as you can.
- The "open" twist: power up to punch the hole open into a wormhole and
  warp to the next sector.
- Works upright or sideways because it's circular, so it's phone-friendly
  either way.

### Open the Tap (only if the domain is ever bought)
- A tap sprays "tokens" and you catch them in buckets before the office
  floods; a suit keeps running in to open it wider. Invented headlines
  between levels. Pure satire, all made-up names.

## The third RELEASE game

After Unsafe Release (racing) and Quick Release (carrier jet), options for
number three from the names liked earlier:

- **Dark Release** (favourite for a trilogy finale): a night-time heist or
  prison-break stealth game. Everything happens in the dark; hold to wait
  in the shadows, let go to dash when the searchlight sweeps past. The
  "release" is a timed dash, like the pit gap in Unsafe Release. Mood: moody
  synth music, whispered radio from your getaway driver.
- **Early Release**: school's out at the final bell. Hold to charge a sprint,
  let go to burst past teachers, mop buckets and hall monitors. Light and
  funny; good for summer and snow-day events.
- **Full Release**: a pressure game: build up pressure (a pinball plunger, a
  champagne cork, a dam gate) by holding, and let go at exactly the right
  amount. Short, satisfying, one-thumb; very replayable.

A tidy trilogy: **Unsafe** (tension), **Quick** (speed and action),
**Dark** (stealth and nerve).

---

## The relay: pass this file from game to game

This file is the baton. Each game's Claude session reads it first and,
when that game is done, **adds its own section below** before it's handed
on. Sessions don't share memory, so this is how each new one starts with
the history of the ones before: what worked, what didn't, and how the user
likes to work.

**How the user works** (from Unsafe Release):
- New to game making; wants plain-language explanations and a clear
  recommendation, not a list of options.
- Tests on the phone constantly and asks for one change at a time; expects
  quick pushes to see it live.
- Answers questions in plain chat; pop-up question boxes and plan-approval
  prompts get rejected. Ask with numbered options in text, and treat a bare
  number as the pick.
- Generates voices with ElevenLabs and finds music on Pixabay, dropping
  files on the desktop; copy them in, then delete the desktop copies.
- Loves tie-ins to real events (a special level on race day).
- All games are portrait (9:16, phone upright) until further notice
  (decided after Void Signal). No "turn your phone sideways" screens.

**Template for each game's section:**

### <Game name> (<dates>)
- What it became: a few lines on the finished game.
- What worked: mechanics, tools and habits worth repeating.
- What didn't: mistakes, dead ends, things to avoid.
- Setup notes: anything the next project should copy.
- Ideas left over for later games.

### Unsafe Release (September 2026)
- What it became: a racing runner at scofti.com/arcade/unsafe-release.
  Release from the pit box into a gap, pit stops every 15 s, three tracks
  that rotate (day, neon night, a race-weekend bonus with a squeeze),
  lives, team radio between the driver and engineer, and a PR run mode.
- What worked: one-thumb play; the tense release moment; ElevenLabs radio
  through a headset effect; a song per track; date-based event levels;
  dev address options to test setups side by side; Playwright screenshots
  to check visuals before the user looks.
- What didn't: guessing at visuals without screenshots; shell edits that
  mangled line breaks (use a proper edit tool); a difficulty ramp that made
  the second release far too hard; the phone's built-in voice (replaced by
  ElevenLabs).
- Setup notes: see "Carry over to the new session" above.

### Void Signal (September 2026)
- What it became: not Quick Release. A 3D behind-the-ship shooter at
  scofti.com/arcade/void-signal, in a cel-shaded cartoon look (toon
  shading, thick outlines, purple sky). Welcome screen, pick a pilot (Gem
  or Muta, Scofti's own characters), their voiced briefing with the words
  lighting up, LAUNCH, a warp-speed jump (star streaks, twist, white flash,
  boom), then a low flight down an alien valley shooting saucers. Score
  with a multiplier up to x8 that resets when you're hit or a saucer gets
  past, a shield that recharges, a best score, and a mothership on the
  radio. Portrait and one thumb: drag anywhere to fly, the guns fire while
  the thumb is down.
- What worked: the whole flow (cover → pilot → briefing → warp → flight)
  built in one day; free CC BY ships and saucers from poly.pizza, repainted
  in each pilot's colour in code, with credits on the welcome screen;
  Scofti's own characters as pilots; ElevenLabs briefings with the text
  lighting up in time; synthesised sound effects in code instead of files;
  a layout that fills any box (tall for a phone, wide for a 16:9 cabinet
  or a sideways phone); doing the portrait switch in two steps (flight
  first, then the welcome screens) so each could be checked on the phone.
- What didn't: starting in Phaser, landscape, with a "turn your phone
  sideways" screen. Phaser was dropped for Three.js the same day once the
  look went 3D, and landscape was dropped for portrait because a phone is
  held upright. Decide the stack and the screen shape from the look and
  from how the phone is held before writing code. The carrier loop from
  the brief (cat shot, landing, wires) never got built.
- Setup notes: Three.js + Vite + TypeScript replaces Phaser for 3D games.
  Keep the outline + toon helpers in `src/game/models.ts`, the `?pilot=`
  and `&warp=1` dev options to skip straight to the part being tested, and
  Escape left free for the arcade to close the cabinet (Backspace and a
  BACK button step back instead). Add og/twitter share tags before
  handoff. Source art stays in `art/`, smaller JPEG copies go in
  `public/img/`.
- Ideas left over for later games: the colonists being abducted (in the
  story but not the game yet: shoot the saucer, catch the falling
  colonist); Al and Clyde as pilots (cards already drawn), Chickadee and
  DeekDeek (prompts, no art); the short edit of the flight music; the
  Quick Release carrier game is still unmade.

---

## The Release trilogy, and the first word as a franchise

**The trilogy is about releasing our first games.** Three games, each named
"<word> Release", and together they're a wink at shipping software: the
first games Scofti releases are about releases.

1. **Unsafe Release** (out now): racing. Released from the box into danger;
   the release that goes wrong.
2. **Quick Release**: the carrier jet shooter (as above). The release that
   has to be instant.
3. **Early Release**: the meta one. A game that plays like it was shipped
   too early: placeholder art, a missing texture here and there, "coming
   soon" signs, bugs that literally crawl across the level and eat the
   floor. You're the tester rushing to reach the release gate before the
   bugs take over; each level ends with fake patch notes ("Fixed: floor.
   Known issue: floor"). The joke lands because it's Scofti's own first
   release. Scenario alternative: school's out at the final bell (keep in
   the pocket).

**The first word as the constant.** Each trilogy word can lead its own
family: same first word, new second word, new game. One word becomes a
brand, and the doors open wide.

- **Unsafe ...** (motorsport penalties and danger, the racing family)
  - *Unsafe Rejoin*: spun off the track, get back on without hitting
    anyone (a real racing penalty, the sequel to Unsafe Release).
  - *Unsafe Distance*: tailgating on a highway at night, hold the gap.
  - *Unsafe Landing*: bring a damaged plane down on a short runway.
- **Quick ...** (speed and reflexes, the action family)
  - *Quick Draw*: a western duel, let go the instant the bell rings.
  - *Quicksand*: sinking; tap to climb out while the sand pulls you down.
  - *Quick Change*: a pit crew game, change all four tyres against the
    clock (ties back to Unsafe Release).
  - *Quicksilver*: a liquid-metal runner that splits and merges.
- **Early ...** (starting before you're ready, the comedy family)
  - *Early Access*: the bugs-and-placeholders joke taken further, the game
    "updates" itself mid-level.
  - *Early Bird*: starring Chickadee, catch the worm before the other
    birds wake up (a Scofti character you own).
  - *Early Warning*: a radar operator spotting threats on a glowing screen
    (a cousin of Quick Release).

**Why this works:** the series is easy to explain (every title is a phrase
people already know), each family has its own feel, and there's always a
next game with an obvious name. Release stays the headline trilogy; the
families are what comes after.
