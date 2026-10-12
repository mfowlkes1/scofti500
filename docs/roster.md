# scofti500 roster: drivers, cars, crew, voices

Draft 1 (2026-10-12). Every name, number and colour here is a first pass for Michael to change.
The game reads them from one place later (`src/roster.ts`), so changing a name is one edit.

Feel: Days of Thunder. Rookie hotshot, a hard veteran rival, a wise crew chief in your ear,
a dry spotter, the champion to beat. Mood only: no movie names, no real teams, sponsors, makers or tracks.

## drivers and cars

| driver | role in the story | car | number | livery | team / sponsor (invented) |
|---|---|---|---|---|---|
| **scofti** | you. the rookie hotshot | #17 | 17 | black + neon lime, brushed SCOFTI wrap (`scofti-17-car-sheet.png`) | Scofti Racing |
| **zyra** | your teammate, the secret weapon. second pick | #71 | 71 | the #17 flipped: neon lime body, black flames, gold windows (her F1 suit) | Scofti Racing |
| **deekdeek** | the hard veteran rival. trades paint all race, friends by the end | #99 | 99 | crimson + gold trim, like his bökh jacket. no whale logo | Whalers Racing |
| **gem** | the sneak. steals your draft and slips past low | #4 | 4 (his four-point star) | navy + pale-blue stripes, black hood, star on the roof | Midnight Movers ("we move it while you sleep") |
| **metis** | the quiet one. never makes a mistake, never says a word | #8 | 8 (infinity on its side) | matte black, one cyan stripe, cyan number | Black Bob Racing |
| **clyde** | the clean, friendly one. always gives you room | #12 | 12 | cream + amber sunburst on the hood | Sunburst Lab Motorsports |
| **tela** | the champion. last car to beat | #1 | 1 | white + grey camo, pink number ring | Snowline Racing |

Pack cars (no character, fill the field to ~16): invented teams with a wink, kid clean, e.g.
Lucky Biscuit #22 (red/cream), Gas-N-Go-Go #31 (orange/blue), Big Rig Tyre Co #44 (yellow/black),
Possum Pete's BBQ #57 (brown/orange), Hot Lap Pizza #63 (red/green), Cloud Nine Mattress #9 (sky blue/white).

## the crew (the voices in your ear)

| who | job | how they sound |
|---|---|---|
| **al** | crew chief. the calm voice that talks you through the race | slow, warm, been there. "easy into three." "save it, save it." "now. go now." |
| **chickadee** | spotter, up on the grandstand roof | dry, clipped, unimpressed. "clear high." "car low." "still there." "you're clear. don't make me say it twice." |
| **sloth** | pit crew, jack man | barely talks. a thumbs up |
| **si** | pace car driver; gold car later as the premium unlock | no lines |

## the announcer (booth, over the speakers)

**Earl "the Voice" Puckett.** Voice only, no character art needed. Old-school speedway announcer:
big, booming, southern, loves every second. He calls the start, the big passes, the wrecks and the finish.
"GENTLEMEN... AND LADIES... START. YOUR. ENGINES!" · "three wide into turn one!" · "they're rubbin'... and that's racin'!"
· "WHITE FLAG! one to go!" · "SCOFTI WINS THE SCOFTI 500!"
(Alternative: al as announcer, and the crew chief becomes metis.)

## GPT prompts for the sheets

### driver sheet (one per driver; attach their existing reference sheet)
```
This exact character from the attached reference sheet, same face, same body, same proportions, same glossy 3D
vinyl-toy style. New outfit: a stock car racing firesuit in [COLOURS], with [NUMBER] on the chest and sleeves,
matching gloves and boots, and an open-face racing helmet held under one arm. Character reference sheet layout:
front, back, left and right full-body views, three expression heads ([EXPRESSIONS]), and one pose: [POSE].
Bright, bold, rendered 3D in a bright race garage. No real brand names or logos; any patches are blank shapes.
```
scofti and zyra already have driver sheets. For the rest, colours and number come from the table above.

### car sheet (one per car; attach `scofti-17-car-sheet.png` for the layout and body)
```
The same stock car body and the same sheet layout as the attached #17 reference (front, rear, left, right, top,
three-quarter views), with a new paint scheme: [LIVERY], race number [NUMBER] in big bold digits on both doors
and the roof. Glossy, clean, realistic paint, studio lighting on a plain dark background. No car maker badges,
no real brand names, no sponsor logos; sponsor areas are plain colour blocks.
```
