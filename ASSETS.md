# SCOFTI 500 assets

Everything ships with the game; nothing loads from other sites.

## art
- **Car models** (`public/models/car-*.glb`): Meshy, made from Michael's car sheets (`art/reference/`), lettering repainted by `art/meshy/fix-lettering.mjs`. The car pictures in `public/img/cars/` are from the same sheets.
- **Drivers** (`public/img/drivers/`): cut from Michael's character sheets (`raven-sheet.png`, `reba-sheet.png`, `lynx-sheet.png`, `maia-sheet.png`, `paige-sheet.png`, and the solo shots `paige-solo.png`, `reba-solo.png`); full-body pictures cut out of the sheets (background removed).
- **Title art and covers** (`public/img/welcome-*.jpg`, `cover.jpg`, `cover-portrait.jpg`): Michael's.
- **Big-screen ads** (`public/img/promo/`): art from Scofti's own games (Offroad, Winter Games, Sloth Splash, Void Signal) and the ScofTV crew faces, copied from scofti-winter-games.
- Everything else in 3D (the tracks, stands, infield, crews, campers) is built in code.

## sound
- **Theme song** "Burn It Down" (`src/radio/thunder--burn-it-down.mp3`): Michael, made in ElevenLabs Music; leveled with ffmpeg loudnorm.
- **Voices** (`public/audio/radio/`, made by `tools/voices.ts`, ElevenLabs text to speech):
  - spotter: "Chris" (iP95p4xoKVk53GoZ742B), ElevenLabs library
  - crew chief: "Austin Knox" (Bj9UqZbhQsanLzgalpEG), ElevenLabs library
  - announcer: Michael's Voice Design announcer (fBRhBCYyrzF7JBCdE4Nt)
  - Reba: "SCOFTI CON daisy", Michael's Voice Design (VDCzHcQzuGC8lVW8vjyr)
  - Raven, Lynx, Maia, Paige: voices still to pick (their lines are read by the browser's own voice until then)
- **Engine, field, tires, wall, crowd, air guns** (`src/race/sound.ts`): made in code with Web Audio.

## fonts (bundled through Fontsource, SIL Open Font License)
- Permanent Marker (SCOFTI only), Racing Sans One, Lilita One.

## saved in the browser (localStorage)
`scofti500:driver`, `scofti500:car`, `scofti500:paint`, `scofti500:cash`, `scofti500:upgrades`, `scofti500:track`, `scofti500:laps`, `scofti500:mode`, `scofti500:camera`, `scofti500:music`
