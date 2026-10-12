# Scofti Winter Games

Scofti arcade game. Lives at **scofti.com/arcade/scofti-winter-games** (unlisted while in development: not on the
shelf, `noindex` in `index.html`; drop that at launch). Repo `github.com/mfowlkes1/scoftiwintergames` (private,
created 2026-10-05). Vercel: **https://scoftiwintergames.vercel.app** (serves the build at its root; scofti
rewrites `/arcade/scofti-winter-games/*` to it, like offroad). `handoff.md` holds the original brief from the studio director.

Title screen: **SCOFTI WINTER GAMES** (subline still to pick with Michael).

## The game

Not designed yet. Michael already knows what he wants; ask him (events, who you play as, rivals, how events fit
together, the place, score/team names and colours) before building. Then one small playable event, grown one
change at a time. It follows Scofti Offroad's approach in every way (`docs/history/scofti-offroad-notes-2026-10-05.md`).

**Title screen (v1.0.0.3)**, like void-signal's: Michael's key art fills the screen (`title-wide.jpg` on wide
screens, `title-tall.jpg` on tall, picked by `(max-aspect-ratio: 1/1)`), SCOFTI ARCADE + the title top-left
(top-centre on a phone), START bottom-right (full width on a phone), CREDITS + build number bottom-left, ♪ and
✕ top-right. CREDITS rolls film-style (all credited to Scofti, like offroad). START (also the first tap that
allows sound) shows the 3D night snow scene with the props and "events coming soon"; BACK / Backspace returns.

## Athletes and teams (Michael's winter sheets in `art/reference/`)

- **zyra**: Scofti team, black with lime flames, SCOFTI on chest and back (`zyra-winter-sheet.png`).
- **deekdeek**: **team Whalers**, navy/white/ice blue puffer suit, WHALERS lettering only. **No whale logo**
  (Michael: "if they know they know") (`deekdeek-winter-sheet.png`).
- **chickadee**: Scofti team, black/teal jacket, spectacles, collar tag, snowboard (`chickadee-winter-sheet.png`).
- **clyde**: Scofti snowboard mascot, sunburst head, teal camo, camo SCOFTI board (`clyde-winter-sheet.png`).
- **tela**: **the ultimate boss to reach** (Michael). White/grey camo snowboarder, blonde braids
  (`tela-winter-sheet.png`; first concept `tela-winter-concept.png`). Taller, less toy-like than the others.
- **sloth**: Scofti team, black/teal mountain-pattern jacket, goggles, backpack; snowboards and skis
  (`sloth-winter-sheet.png`).
- **si**: the winter games mascot, iridescent bubble head, navy beanie + goggles, SI lettering
  (`si-mascot-sheet.png`). Michael: "GOLD", the premium unlock that costs a lot of tokens to buy.
  Redo the bubble head's shimmer in code (MeshPhysicalMaterial iridescence + clearcoat), not Meshy's texture.

**Roster (Michael, 2026-10-05):** that's the whole cast. **Playable from the start: sloth, deekdeek (Whalers),
clyde.** Everyone else is earned; how each is earned is still to work out. tela is the last one to reach; si
costs a lot of tokens.

**tela beyond this game:** she gets her **own snowboarding spin-off**, so she's the natural tease for the next
game (the bonus round). Her single picture (`tela-winter-concept.png`) might be the **game cover**: it's tall,
so the title would need space at the top (the shelf puts the title in the top third). Later.

## Stack

Vite + TypeScript + Three.js, copied from scofti-offroad. `npm run dev` → http://localhost:5240/arcade/scofti-winter-games/
(also on the LAN address Vite prints, for Michael's phone).

- `src/main.ts`: renderer, 3D scene (behind the title now; the ski jump's stadium next), flow title → pick → event, ✕, ♪.
- `src/pick.ts`: PICK YOUR ATHLETE, bold 2D cards like offroad / sloth-splash (Michael: menus are 2D and bold, 3D is for the event). Card art cut from the winter sheets by `tools/cut-portraits.mjs` → `public/img/athletes/<id>-face.webp` / `-hero.webp`.
- `src/music.ts`: offroad's radio, one station (aurora), one song for now. **Players only get sound on/off (♪), no song or station choice, no title shown** (Michael). **Add a song**: `ffmpeg -i in.mp3 -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 44100 -b:a 128k src/radio/<station>--<title>.mp3` (ffmpeg: WinGet Gyan.FFmpeg). Found automatically.
- `src/models.ts`: `model(name, height)` loads `public/models/<name>.glb` (meshopt + WebP). Shrink new ones with `npx gltf-transform optimize in.glb public/models/out.glb --compress meshopt --texture-compress webp --texture-size 2048` (512–1024 for props).
- `gallery.html` (dev only): `?m=a,b,c&yaw=0.4` lines models up; `node tools/gallery-shot.mjs out.png "m=..."` screenshots it.
- **The SKI JUMP** (first event, Michael: "jump from behind… like I'm looking through their goggles"):
  `src/game/jumpPhysics.ts` (pure numbers; tune with `node tools/jump-sim.ts`), `src/game/jump.ts` (hill, stadium,
  athlete on SCOFTI skis, CHASE cam behind + GOGGLES cam with a goggle-frame overlay, C / 👓 to switch). One thumb:
  hold to tuck (needle in the green), let go in the takeoff zone (later = bigger pop; you leave at the lip; never
  letting go = LATE), in the air hold/let go to stay in the green, land in the green or wipe out. Distance + style
  → tokens. Sim (5 seeds): expert ~145 m / 180 tokens, sloppy ~108 m, holding the whole way ~47 m and a wipeout.
  `tools/jump-bot.mjs` plays it in the real game and screenshots each moment (`?bot` lets slow headless
  browsers take bigger time steps).
- **The LUGE** (second event, Michael: "a bad ass luge"; goggle cam not wanted here): `src/game/lugePhysics.ts`
  (pure numbers, `node tools/luge-sim.ts`), `src/game/luge.ts` (a 700 m ice half-pipe built from `PIECES`: esses,
  a 270° circle, a chicane; SCOFTI boards on both lips; the athlete lying back on a SCOFTI sled; chase cam behind
  the head). Tap fast to paddle off, then speed throws you up the wall in curves: hold to stay low, keep the needle
  in the green (the racing line). Too low scrubs, over the lip = WALL! (−30% speed). Time → tokens (+25% clean).
  Sim: expert ~32 s / 246 tokens, sloppy ~36 s / 157, holding all the way ~44 s / 53. `tools/luge-bot.mjs`;
  `?side` (dev) looks at the rider from the side with the ice hidden.
- **The HALFPIPE** (third event): `src/game/pipePhysics.ts` (pure numbers, `node tools/pipe-sim.ts`),
  `src/game/halfpipe.ts` (a snow superpipe down the mountain, blue-tinted walls and coping, SCOFTI boards on the decks,
  billboards, crowd at the bottom; the athlete on a camo SCOFTI board; chase cam). Tap to drop in; hold on the
  curves to pump, let go at the lip to pop, hold in the air to spin, let go lined up (gauge green) to land clean
  (off-line = sketchy / SLAM). Still holding from the pump when you leave the lip does NOT spin (Michael scored 0.0
  when it did): only a fresh press in the air spins. A straight air scores on its own. Holding all the way ~39. 6 hits, score out of 100, ×2.4 tokens. Sim: expert ~80 (720s),
  good ~65, safe 180s ~39, holding all the way = 0. `tools/pipe-bot.mjs` (its best: 1080 on a 7 m air, 99.9).
- **SNOWMOBILE BIG AIR** (fourth event, Michael: "one more extreme sport where we can just send it"):
  `src/game/sledPhysics.ts` (`node tools/sled-sim.ts`), `src/game/sled.ts` (monster SCOFTI kicker, landing hill,
  crowd, THANK YOU board at the bottom; the athlete seated on the Meshy snowmobile, `sled` pose; chase cam swings
  to the side in the air). 3 jumps: hold the throttle with the revs in the green (offroad's feel), off the lip,
  then a fresh press backflips, let go in the green and the rider eases onto the landing slope; casing the table
  or landing way off = YARD SALE. Sim: expert triples at 80 km/h ~400 / 179 tokens, good doubles ~260, safe
  singles ~170, holding all the way ~110. `tools/sled-bot.mjs`. Ending (Michael: "does not end smooth"): the last
  jump rides out (the outrun brakes harder the further you go), skids sideways to a stop under the big ScofTV board,
  camera behind-side looking down at the board, then the result. Between jumps a quick fade through white. The outrun
  brakes as hard as it must to stop by `STOP_X` (short landings used to overshoot under the board). Approach crowd
  (Michael: crowds leading up to the jump): 4 rows each side behind a SCOFTI fence, a wave following you on the gas.
- **Big end-of-run boards, one of a kind per track** (Michael; `src/bigboards.ts` + `thankYouBoard` in ads.ts, all
  animated): halfpipe = THANK YOU · love SCOFTI; snowmobile = ScofTV "WANT MORE OF US?" with sloth, tela and deekdeek
  (Michael: "us", a couple of characters with her, not so sexual); ski jump = SCOFTI ARCADE cycling the game covers
  ("play free at scofti.com/arcade"); luge = I am Easy to Use "YOUR AD HERE" with tela.
- **Roadside billboards mix freely** on every track (`roadsideTexture` in ads.ts: studio ad, Offroad, Sloth Splash,
  ScofTV). Covers copied (never linked) into `public/img/promo/`.
- **Halfpipe flips** (Michael: "every now and then they should do flips, or real crazy tricks"): on big airs (>1.1 s)
  35% of the time (tela 85%) the rider corks: a flip about their middle (`flipper` group) eased to finish at 85% of the
  air so it never costs the landing. Names: BACKFLIP / DOUBLE BACKFLIP (no spin), CORK / DOUBLE CORK + spin. Clean = +35%
  points per flip.
- **Halfpipe ending** (Michael: "a more bad ass snowboard ending… get tela in there"): after hit 6 you bomb down the
  middle at the giant animated THANK YOU · love, SCOFTI billboard (`thankYouBoard()` in ads.ts: the title art panning,
  light sweep, twinkles), hockey-stop beside tela on her pink-ringed podium (rigged, `boss` pose, cheers), the camera
  swings round, fireworks, then the score. Result card: 👀 WATCH TELA'S RECORD RUN (autopilot in halfpipe.ts, broadcast
  cam in the air; her score saved as `scofti-winter-games:tela-record` and shown on yours). Shaky landings say SHAKY (Michael: never the word skibidi anywhere).
- **REC mode for videos** (`src/rec.ts`): open with `?rec` → ● REC button bottom-left; it records the tab (game, HUD,
  menus, music; no browser bars) via tab capture at up to 1920×1080 60 fps, ~14 Mbps, saves MP4 (WebM if not supported)
  to Downloads on stop. While recording the button hides; stop with ` or the faint dot top-left (or Chrome's Stop
  sharing). `?rec&clean` hides the HUD while recording. REC mode also lists the songs (♪ buttons): one tap plays that song
  from its first second (`playSong` in music.ts), for videos.
- **Record holders** (Michael): every result card shows the event's holder big on the left with their name and a
  gold badge (`HOLDERS` in main.ts): halfpipe = tela 👑 PARK BEST (her real record-run score), ski jump = deekdeek
  🐋 HILL RECORD 152.5 m, luge = SI 🧊 TRACK RECORD 30.85 s, snowmobile = chickadee 🔥 BIG AIR RECORD 420. Beat it →
  "YOU BEAT …!". Wide pictures get `.tela-card.wide`. tela is no longer on a podium at the halfpipe finish.
- **SKI SHOP / SNACK BAR** (`src/gear.ts`, `src/snacks.ts`, `src/shop.ts`; buttons on PICK YOUR EVENT): gear in 3 levels
  (Glacier Glide Skis → jump, Blue Ice Runners → luge, Camo Pop Board → halfpipe, Iris-Shift Goggles → all) and
  snacks (3 boost one run: Hot Cocoa wider green, Maple Snow Taffy faster, Big Twist Pretzel more pop; the rest just
  for fun with a line). Each physics file exports `tune` {drag, zone, pop}; main.ts sets it before every start.
- **Ads** (`src/ads.ts`, Michael: "I'll turn these entire games into sellable ads"): billboards for his studio
  **I am Easy to Use** (iameasytouse.com, "YOUR AD HERE", its teal/magenta/blue, tela on some, on the end nearest
  the track) and for Scofti's own games (Scofti Offroad: black/lime, its rides, PLAY NOW). Luge: 3 big billboards on
  legs beside the track (`BILLBOARDS` in luge.ts, ~one every 10 s at speed, gone in 1–2 s) plus every 35th side
  board. Words/colours/faces all in ads.ts. `?at=<metres>` (dev) starts the luge partway down;
  `node tools/luge-at.mjs <out> <metres>` screenshots there.
- **Flow:** title → PICK YOUR ATHLETE → PICK YOUR EVENT (poster cards: real shots from each event, made by `node tools/event-art.mjs` → `public/img/events/<id>.webp`; re-run it when an event changes looks; spinning light rays, token chip, bests) → play → result (AGAIN / EVENTS).
- **Basic first, trick out later** (Michael, 2026-10-05). Later list: ski jump — rivals' distances, crowd sound,
  telemark judging, wind flags, replays; halfpipe — named grabs, rivals' scores, judges' cards, a goggle cam?; luge — split times, rivals' ghosts, more tracks, ice sparks on the wall,
  head-cam option, announcer; all — sounds (whoosh, ice hiss, crowd), the other athletes rigged.
- `src/rig.ts`: poses (stand, tuck, fly, land, crash, cheer) for Meshy auto-rigged athletes; `mix()` blends two.
  Rigged so far: sloth, deekdeek (`art/meshy/rig.mjs`, task IDs in `tasks.json`; `public/models/<id>-rigged.glb`).
  `pose.html` (dev only) shows every pose on a rig.
- `src/home.ts`: sends vercel.app visitors to scofti in browser code (skipped in dev and the test build).
- `src/version.ts`: build number, v1.0.0.N. **Only bump it when Michael says** (not every push).
- `npm run build:test` builds at base `/` into `dist-test` for a private preview link.
- `tools/shot.mjs`: Playwright (playwright-core + installed Chrome) screenshots at 390x844 and 1920x1080.
  Run `npx vite preview --port 5240` first, then `node tools/shot.mjs <out-dir>`.

## Fit any screen (from day one)

The canvas fills the window; no 9:16 box. The camera widens and pulls back on tall screens. Text and buttons pin
to corners. Menu panels: beside the action on wide screens, below it on phones; keep the 3D on display.
Screenshot both sizes before every handoff to Michael.

## Arcade rules

- Vite `base: "/arcade/scofti-winter-games/"`; load runtime files through `import.meta.env.BASE_URL`.
- `vercel.json` holds only the frame-ancestors header. No server redirects.
- One thumb on a phone, keyboard on a computer. Escape belongs to the arcade; Backspace / on-screen BACK.
- No sound before the first tap (START).
- Nothing loads from other sites; bundle fonts, music and models; record every asset in `ASSETS.md`.
- localStorage keys are `scofti-winter-games:<thing>`. **Keys in use:** `scofti-winter-games:athlete` (the athlete picked), `scofti-winter-games:tokens` (token count), `scofti-winter-games:unlocked` (athletes unlocked with tokens, comma-separated), `scofti-winter-games:best-jump` (best ski jump, metres), `scofti-winter-games:best-luge` (fastest luge run, seconds), `scofti-winter-games:best-pipe` (best halfpipe score), `scofti-winter-games:gear` (gear levels), `scofti-winter-games:snacks` (snack bag + next-run boost), `scofti-winter-games:tela-record` (tela's record halfpipe score), `scofti-winter-games:best-sled` (best snowmobile score).
- The Permanent Marker brush font is only for the word SCOFTI.
- Commits authored as mfowlkes1 <mfowlkes@gmail.com>. **A push to main goes live; ask Michael first.**
- No real brands, venues, athletes or the real winter games' marks.
- Dev port 5240.
