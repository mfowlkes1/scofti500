# Notes from scofti-offroad (2026-10-05)

For the studio director in `C:\ai\games`, and for whoever starts the next game. Written by the Claude that
built Scofti Offroad, at the end of its first day. The game's own notes are in
`scofti-offroad/CLAUDE.md`; this file is the short version that travels.

## Next game: Scofti Winter Games

Michael's idea. He already knows what he wants, so start by asking him; don't design it before he does.

**Build it full screen from day one.** Scofti Offroad was built as a tall phone game, so on a computer it's
a tall strip down the middle of the screen. void-signal fits any screen and "looks hot on a computer" (Michael).
Michael assumed every Claude knew to do this; void's Claude did, Offroad's didn't, because the arcade rules
said "portrait 9:16". Put it in the handoff in plain words:
**"Fit any screen: wide on a computer, tall on a phone, one layout that adapts."**
- The 3D fills the whole window; the camera pulls back on tall screens.
- The score and buttons pin to the corners.
- Menu panels sit beside the action on a wide screen, below it on a phone.
- The arcade cabinet frame is gone now, so the game needs its own ✕ (back to the arcade) on the title.
Doing this at the start costs a little; converting later costs a day or two per game.

## Scofti Offroad: what it became

Big-tyre mud racing at scofti.com/arcade/scofti-offroad (v1.0.0.24 by the end of the day). Pick scofti or zyra,
a team colour (8, including camo and "donut"), and a ride: zip tie (#17 side-by-side) or rufford (#103 mud
truck, made in Meshy from Michael's sheets). One thumb: hold to gas and keep the needle in the green; too much
and you spin and dig in, too little and you bog down.
- **Drag bracket:** gem → metis → deekdeek (monster rig). The pit gets longer each heat, and the rivals
  upgrade each time you win a bracket.
- **Full Send:** an obstacle course with mud, ruts, a hill, a jump (let go in the air to land clean) and water.
  Time trial or challenge a rival.
- **Money:** entries are wagers (a win pays double); mud slung pays win or lose. Broke = free practice and a
  fresh $200 in 12 hours, or a made-up sponsor pays you to climb their mud hill.
- **Garage:** upgrades (tyres, engine, suspension), a style shop (wheels, light bar, AURA, mud flaps, stacks;
  try before you buy), and a redneck cooler of snacks (three give a one-race boost, the rest are for fun).
- **Radio:** a car-stereo knob with rap, country, EDM and rock, songs Michael made in ElevenLabs.
- Cockpit cam, credits, covers, a loading screen.

## What worked
- **Michael's reference sheets → Meshy multi-image → GLB.** Cut the sheet into its four views and send them
  all; the rides came out right first time. Then cut the tyres out of the single mesh in code so they spin.
- **One thumb, one skill** (feathering the throttle) reused everywhere: drags, the hill climb, Full Send.
- **Tune with a quick simulation first** (a policy loop over the physics in Node), then confirm with a
  Playwright bot that plays the real game. Caught several "too hard / too easy" problems before Michael did.
- **Recolouring Michael's art in code:** every lime pixel becomes the new colour, so one sheet gives 8 looks.
  Patterns (camo, donut rings) are drawn straight onto the 3D surface so they stay round.
- **Michael writes the music himself**; Claude writes the ElevenLabs prompts (style, BPM, lyrics with
  [Verse]/[Hook] tags). Never name the real artist in the prompt; describe the sound.
- **Songs drop into `src/radio/<station>--<title>.mp3`** and the radio finds them; no code change per song.
- **Screenshots before every handoff to the phone**, and a quick look at what the camera actually sees.

## What didn't (avoid next time)
- Building for one screen shape (see the top).
- Menus that cover the ride. "These beasts need to be on display": keep the 3D visible above slim panels.
- Paying for wheelspin: holding the gas in a hole earned more than a clean win until mud money was tied to
  good driving. Check that the money rewards skill.
- Ground meshes laid flat with rotation.x = −90°: world z = position.z − y. Got it backwards twice (the hill
  sloped the wrong way). Screenshot every new slope.
- Startup work (building the scene, cutting models) froze the title for half a second; hide it behind a
  loading screen.
- A sound made in code for "monster truck rev" sounded bad. Real recordings for anything that has to sound real.

## How Michael works (new from this game)
- **The SCOFTI brush font is only for the word SCOFTI** ("that is ours"). Other names get their own font.
- He makes the music; don't call the music API for him. Prompts, yes.
- He reviews every push ("push" = go live). Ask before pushing; Vercel deploys main straight to the arcade.
- Build numbers: v1.0.0.N, like the other games.
- Names come fast and change: rides got nicknames (zip tie, rufford), numbers moved (103 off the truck, 17
  stays), snacks were swapped one by one. Make names easy to change in one place.
- Made-up brands with winks are fine; keep anything that reaches kids clean (Ms. Brown's Mud Tea).

## Left over for later
- Scofti Offroad: more levels, Capacitor wrap for the app stores, the START rev recording, sponsor stickers
  on the ride, announcer and crowd voices, driver models in the seats, a bonus round that teases the next game
  (now known: Scofti Winter Games).
