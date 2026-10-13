# SCOFTI 500 assets

Everything ships with the game; nothing loads from other sites.

## art
- **Car models** (`public/models/car-*.glb`): Meshy, made from Michael's car sheets (`art/reference/`), lettering repainted by `art/meshy/fix-lettering.mjs`. The car pictures in `public/img/cars/` are from the same sheets.
- **Drivers** (`public/img/drivers/`): cut from Michael's character sheets (`raven-sheet.png`, `reba-sheet.png`, `lynx-sheet.png`, `maia-sheet.png`, `paige-sheet.png`, and the solo shots `paige-solo.png`, `reba-solo.png`, `lynx-solo.png`, `maia-solo.png`); Heather from `heather-sheet.png` (`public/img/heather*.{jpg,webp}`); full-body pictures cut out of the sheets (background removed).
- **Title art** (`public/img/welcome-*.jpg`): Michael's. **Covers** (`cover.jpg`, `cover-portrait.jpg`): the title art with the drivers lined up across the bottom, made by `art/make-covers.mjs` (run it again when a driver's picture changes).
- **Big-screen ads** (`public/img/promo/`): art from Scofti's own games (Offroad, Winter Games, Sloth Splash, Void Signal) and the ScofTV crew faces, copied from scofti-winter-games.
- Everything else in 3D (the tracks, stands, infield, crews, campers) is built in code.

## sound
- **Songs** (`src/radio/thunder--*.mp3`): by SCOFTI, made in ElevenLabs Music, leveled with ffmpeg loudnorm: "Lipstick, Smoke and Gasoline", "Big Boys' Table", "Trading Paint", "Against the Tide", "Maya's Blueprint" (two versions).
- **Voices** (`public/audio/radio/`, made by `tools/voices.ts`, ElevenLabs text to speech):
  - spotter: "Chris" (iP95p4xoKVk53GoZ742B), ElevenLabs library
  - crew chief: "Austin Knox" (Bj9UqZbhQsanLzgalpEG), ElevenLabs library
  - announcer: Michael's Voice Design announcer (fBRhBCYyrzF7JBCdE4Nt)
  - Reba: "SCOFTI CON daisy", Michael's Voice Design (VDCzHcQzuGC8lVW8vjyr)
  - Heather (trackside correspondent): Michael's Voice Design (oHonHW1uTkyY2RUCyRYY)
  - Raven: "Blue - Neutral, Vocal Fry, Commentator" (kfU9VUUMjY4PWNoUfZ45), ElevenLabs library
  - Maia: "Eryn - Strong Female Military Commander" (wa4sQVgbDDzUDEzJwch3), ElevenLabs library
  - Lynx: "Marie - Young & Optimistic" (ijbjxuucMt4vnA0kA9IO), ElevenLabs library
  - Paige: "Jessa - Easygoing and Effortless" (yj30vwTGJxSHezdAGsv9), ElevenLabs library
- **Engine, field, tires, wall, crowd, air guns** (`src/race/sound.ts`): made in code with Web Audio.

## fonts (bundled through Fontsource, SIL Open Font License)
- Permanent Marker (SCOFTI only), Racing Sans One, Lilita One.

## saved in the browser (localStorage)
`scofti500:driver`, `scofti500:car`, `scofti500:paint`, `scofti500:suit`, `scofti500:chips`, `scofti500:upgrades`, `scofti500:track`, `scofti500:laps`, `scofti500:mode`, `scofti500:camera`, `scofti500:music`
