# Meridian Courier

[![Make.fun competition](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![Make.fun rank](https://make.fun/badge/best-flight-game-20261126-0057/Nadanese93/best-flight-game/rank.svg)](https://make.fun/c/best-flight-game-20261126-0057)
[![Make.fun reward](https://make.fun/badge/best-flight-game-20261126-0057/Nadanese93/best-flight-game/reward.svg)](https://make.fun/c/best-flight-game-20261126-0057)

A complete original flight game for the make.fun best flight game bounty.
Fly the mail run across a procedurally built valley in a small propeller
courier plane: thread the rings, land on short strips, and mind the fuel.

## Play

Serve `game/` with any static server, then open `index.html` in desktop
Chrome. No build step, no network request, no libraries — vanilla
JavaScript with a hand-rolled 3D projection onto a 2D canvas.

```sh
node serve.ts
```

Then open the address it prints and fly.

## Controls

- **W / S or Up / Down** — pitch
- **A / D or Left / Right** — roll and turn
- **Shift / Ctrl or + / -** — throttle up / down
- **Space** — flaps (brake)
- **Mouse** — steer gently; **click** — throttle boost
- **C** — camera: chase → cockpit → trail. Cockpit view puts you in the
  pilot's seat, over the nose and spinning prop, with a lit instrument
  panel (artificial horizon, altimeter, airspeed, heading, throttle, fuel)
- **M** — mute, **P** — pause, **R** — restart
- **1 / 2 / 3** — pick a mission on the start screen, **Enter** — fly

## Missions

1. **Ring Run** — fly through 8 rings in order before the fuel runs dry.
2. **Island Hop** — land clean on both short strips: Meridian Field, then
   Pine Hollow. Touch-and-go between them.
3. **Storm Courier** — six rings on a long course with tight fuel.

Fuel burns with throttle, a hard landing or a terrain strike ends the
sortie, and a clean landing pays. Rings pay 250 points, clean landings
500, with time and fuel bonuses on the mission-complete screen.

## Screenshots

Deterministic scenes, rendered from the game itself:

- `?shot=start` — title screen over the valley
- `?shot=play` — mid-flight through a ring, HUD lit
- `?shot=play&cam=cockpit` — the same scene from the cockpit
- `?shot=land` — final approach to the runway
- `?shot=complete` — mission-complete score breakdown

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to
  the output directory and writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `game/index.html` — the page; `game/styles.css` — page chrome
- `game/src/main.js` — game loop, state machine, world rendering
- `game/src/terrain.js` — heightfield, river, town, runways
- `game/src/projection.js` — the 3D camera
- `game/src/plane.js` — flight physics and the plane model
- `game/src/missions.js` — missions, rings, landings, scoring
- `game/src/hud.js` — instruments and screens
- `game/src/cockpit.js` — cockpit view: canopy frame, nose, prop, panel dials
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised WebAudio sound
- `game/src/random.js` — seeded random numbers
- `game/src/shots.js` — deterministic screenshot scenes

## License

MIT — see `LICENSE`.
