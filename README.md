# WILWATIKTA 3D v17 — open-world crime game

[![make.fun bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/apasi22/gta6-01-wilwatikta-3d-v17/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard)
[![reward](https://make.fun/badge/gta6-01/apasi22/gta6-01-wilwatikta-3d-v17/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game set in **Wilwatikta**, a Javanese coastal city
in 1998. Play as **Sugeng Wibowo**, a getaway driver climbing the ranks of the
city's underworld: steal cars, outrun the WPD (Wilwatikta Police Department),
run 12 story missions, and build your crew.

- A full 3D city in six districts: Pelabuhan Segara, Alun-Alun, Pantai Kidul,
  Pasar Senja, Kampung Batik, Lorong Emas
- Drive and steal cars — Garuda GT, Kencana S, Arjuna, Srikandi, Gatotkaca,
  Bima — with traffic, pedestrians, police chases and a wanted level
- On-foot combat, missions with timers and dialogue, a crew to hire
- HUD with minimap, weapon slots, wanted stars, radio (Gamelan FM 101.1,
  Radio Wilwatikta), save/load, upgrades and a full GPS map
- Smooth, human-like cars and characters: sloped bodies, visible wheels,
  rounded heads, faces, hands and shoes — no more boxy figures
- Procedural gamelan soundtrack (WebAudio, no audio files) and a bright
  dusk-lit look, with a transparent-background map screen

## Play

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome. Keyboard: WASD drive/walk, mouse camera, E enter/exit car, click
shoot, Q switch weapon, M map, R radio, U upgrade, P pause. No network
requests; everything is local files.

## Entry

Built for the make.fun `gta6-01` bounty. `main.ts` (Node 22) copies `game/`
and `screenshots/` to `/output` and writes `dossier.json` with the kit's
`buildDossier`. All code, art, names, story and music are original.
