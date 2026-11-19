// game.js — the main loop: input, camera, simulation, staging for the
// four screenshots, and the playtest hooks. The game runs on a seeded,
// deterministic city; the loop itself is real-time, the screenshots are
// frozen dioramas of it.

'use strict';

const Game = {
  canvas: null, renderer: null, state: null, ms: null, input: {},
  sun: null, shot: null, errors: [], time: 0, floaters: [],
};

function el(id) { return document.getElementById(id); }

function newState(shot) {
  const r = rng(777);
  const player = newPlayer();
  const traffic = buildTraffic(r);
  const police = buildPolice();
  const peds = buildPedestrians(r);
  const heli = buildHeliState();
  const ms = missionState();
  return { player, traffic, police, peds, heli, ms, r,
    checkpoint: { x: 0, z: 70 }, shot: shot || null, paused: false,
    mapOpen: false, upgradeOpen: false, started: false, radio: 0,
    owned: [], speed: 0 };
}

function cameraFor(state) {
  const p = state.player;
  const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
  if (state.shot === 'title') {
    // title: the hero stands centre-frame, front-facing, pistol out.
    return { eye: [0.5, 1.85, 4.6], target: [0, 1.15, 0] };
  }
  if (state.shot === 'map') {
    return { eye: [0, 95, 55], target: [0, 0, 0] };
  }
  if (p.inCar) {
    // the chase camera sits further back and higher than a close follow,
    // so the car reads as a car and the street opens up ahead of it.
    return {
      eye: [p.x - fx * 13.5, 5.0, p.z - fz * 13.5],
      target: [p.x + fx * 8, 1.4, p.z + fz * 8],
    };
  }
  return {
    eye: [p.x - fx * 6, 3.0, p.z - fz * 6],
    target: [p.x + fx * 4, 1.3, p.z + fz * 4],
  };
}

// Project a world point to screen pixels (for HIT! floaters).
function project(cam, x, y, z) {
  const proj = mPerspective(1.05, 1280 / 720, 0.5, 400);
  const view = mLookAt(cam.eye, cam.target, [0, 1, 0]);
  const m = mMul(proj, view);
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (w <= 0.01) return null;
  const px = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  const py = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  return [ (px * 0.5 + 0.5) * 1280, (0.5 - py * 0.5) * 720 ];
}

function addFloater(text, x, y, z) {
  const cam = cameraFor(Game.state);
  const s = project(cam, x, y, z);
  if (!s) return;
  const d = document.createElement('div');
  d.className = 'floater';
  d.textContent = text;
  d.style.left = s[0] + 'px';
  d.style.top = s[1] + 'px';
  document.getElementById('fx').appendChild(d);
  // in a frozen screenshot the floaters must stay put; in live play they
  // fade after a beat. (A timed removal once raced the capture.)
  if (!Game.state.shot) setTimeout(() => d.remove(), 1400);
  Game.floaters.push(d);
}

function actorsFor(state) {
  const cars = [];
  // the player's Garuda GT (smooth, red, the hero car).
  if (state.player.inCar) {
    cars.push({ x: state.player.x, z: state.player.z, heading: state.player.heading,
      spec: { body: hex('#c0272d'), glass: GLASS } });
  }
  for (const t of state.traffic) cars.push({ x: t.x, z: t.z, heading: t.heading, spec: t.spec });
  for (const p of state.police) cars.push({ x: p.x, z: p.z, heading: p.heading, spec: p.spec });
  const people = [];
  if (!state.player.inCar) {
    people.push({ x: state.player.x, z: state.player.z, heading: state.player.heading,
      spec: heroSpec('stand') });
  }
  for (const p of state.peds) people.push({ x: p.x, z: p.z, heading: p.heading, spec: p.spec });
  if (state.shot === 'night') {
    // four gang enemies ahead of the hero, aiming back at him.
    const spots = [[-28, -32, 3.1], [-22, -30, 3.0], [-26, -26, 3.3], [-20, -34, 2.9]];
    for (const s of spots) people.push({ x: s[0], z: s[1], heading: s[2], spec: enemySpec() });
  }
  if (state.shot === 'title') {
    // the title hero: front-facing, pistol raised, Garuda GT parked behind.
    people.push({ x: 0, z: 0, heading: -0.55, spec: heroSpec('aim') });
    cars.push({ x: 3.2, z: -2.5, heading: 0.35,
      spec: { body: hex('#c0272d'), glass: GLASS } });
  }
  return { cars, people, heli: state.heli,
    checkpoint: state.shot === 'chase' ? state.checkpoint : null };
}

function updateHud() {
  const s = Game.state, p = s.player;
  el('cash').textContent = '$' + p.cash.toLocaleString('en-US');
  el('stars').textContent = '★'.repeat(p.wanted) + '☆'.repeat(5 - p.wanted);
  el('speed').textContent = String(Math.round(Math.abs(p.speed) * 3.6));
  el('carname').textContent = p.inCar ? CARS[p.car].name : 'SUGENG WIBOWO — ON FOOT';
  el('gear').textContent = p.inCar ? 'G' + Math.max(1, Math.min(5, Math.ceil(Math.abs(p.speed) / 6))) : 'JALAN';
  el('condlabel').textContent = p.inCar ? 'CONDITION' : 'HEALTH';
  el('condfill').style.width = (p.inCar ? 92 : p.health) + '%';
  el('mhealthfill').style.width = p.health + '%';
  // the mission panel always shows the CURRENT mission, never a stale one.
  const cur = currentMission(s.ms), nxt = nextMission(s.ms);
  el('mname').textContent = 'MISSION ' + cur.n + '/12 — ' + cur.name.toUpperCase();
  el('mobj').textContent = cur.obj;
  el('mnext').textContent = 'NEXT: ' + nxt.name.toUpperCase();
  el('mdisp').textContent = s.ms.dispatch + ' — ' + s.ms.spotlight;
  el('mbarfill').style.width = Math.round((s.ms.checkpoint - 1) / Math.max(1, s.ms.checkpoints) * 100) + '%';
  el('mtimer').textContent = formatTime(s.ms.timeLeft);
  el('mdist').textContent = '▲ ' + Math.round(s.ms.distance) + 'm';
  const d = districtAt(p.x, p.z);
  el('district').textContent = d.name;
  el('street').textContent = STREET_NAMES[Math.abs(Math.floor(p.x / 24) + Math.floor(p.z / 24) * 3) % STREET_NAMES.length];
  drawMinimap(p, s.checkpoint);
}

function frame(t) {
  const dt = Math.min(0.05, (t - Game.time) / 1000 || 0.016);
  Game.time = t;
  const s = Game.state;
  if (!s.paused && !s.shot && s.started) {
    stepPlayer(s.player, Game.input, dt);
    stepActors(s, dt);
    AudioSys.setEngine(Math.abs(s.player.speed), 28);
    s.ms.timeLeft -= dt;
    s.ms.distance = Math.max(4, Math.hypot(s.checkpoint.x - s.player.x, s.checkpoint.z - s.player.z) * 2.4);
  }
  const cam = cameraFor(s);
  drawScene(Game.renderer, cam, Game.sun, actorsFor(s));
  updateHud();
  if (s.shot) window.__shotReady = true;
  requestAnimationFrame(frame);
}

function stageShot(shot) {
  const s = Game.state;
  s.shot = shot;
  s.started = true;
  if (shot === 'chase') {
    // chase starts in Alun-Alun on the open x=0 road, checkpoint ahead
    // in Pantai Kidul; the heli and two WPD units are in frame.
    s.player.inCar = true; s.player.x = 0; s.player.z = 8; s.player.heading = 0;
    s.player.speed = 27; s.player.wanted = 3;
    s.ms.index = 5; s.ms.timeLeft = 193; s.ms.distance = 168;
    s.ms.dispatch = 'WPD DISPATCH: 2 unit mengejar — HELI 2';
    s.ms.spotlight = 'SPOTLIGHT — PANTAI KIDUL';
    // the heli hangs over the road itself, low and far up the street:
    // the road corridor is the only clear sky — the buildings on both
    // sides (and the WPD tower on the left) hide anything off-axis, and
    // the weapon slots hide anything high and centred.
    s.heli = { x: 0, y: 12, z: 40, heading: 0.6 };
    s.police[0].x = -8; s.police[0].z = 24; s.police[0].heading = 0;
    s.police[1].x = 10; s.police[1].z = 26; s.police[1].heading = 0;
    Game.sun = SUN_DUSK;
  } else if (shot === 'title') {
    s.player.inCar = false;
    Game.sun = SUN_NIGHT;
    el('title').classList.remove('hidden');
    el('hud').style.display = 'none';
  } else if (shot === 'night') {
    // night shootout in Pelabuhan Segara, on the x=-25 road: the hero
    // walks toward four gang enemies, heli searchlight overhead.
    // (x=-25, not -24: the road centreline is the district boundary, and
    // the hero must stand inside Segara, not on the Batik line.)
    s.player.inCar = false; s.player.x = -25; s.player.z = -48; s.player.heading = 0;
    s.player.health = 95; s.ms.index = 6; s.ms.timeLeft = 235; s.ms.distance = 28;
    s.ms.dispatch = 'WPD DISPATCH: 1 unit mengejar — HELI 2';
    s.ms.spotlight = 'SPOTLIGHT — PELABUHAN SEGARA';
    s.heli = { x: -8, y: 15, z: -16, heading: 2.4 };
    el('dlg-who').textContent = 'WANTO';
    el('dlg-role').textContent = 'KOMISARIS · WPD';
    el('dlg-text').textContent = 'WPD datang dari utara. Bersihkan gudang, cepat!';
    Game.sun = SUN_NIGHT;
    setTimeout(() => { addFloater('HIT! -12 HP', -28, 2.4, -32); addFloater('HIT! -5 HP', -22, 2.4, -30); }, 500);
  } else if (shot === 'map') {
    s.mapOpen = true;
    el('bigmap').classList.remove('hidden');
    fillMissionList();
    drawBigMap(s.player, s.checkpoint);
    Game.sun = SUN_DUSK;
  }
  if (shot !== 'title') el('title').classList.add('hidden');
  if (shot === 'map') el('hud').style.display = 'none';
}

function bindInput() {
  const keys = {};
  const map = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
  window.addEventListener('keydown', e => {
    if (map[e.code]) { Game.input[map[e.code]] = true; e.preventDefault(); }
    if (e.code === 'KeyM') toggleMap();
    if (e.code === 'KeyU') toggleUpgrade();
    if (e.code === 'KeyP') togglePause();
    if (e.code === 'KeyR') cycleRadio();
    if (e.code === 'KeyQ') cycleWeapon();
    if (e.code === 'KeyE') toggleCar();
    if (e.code === 'Enter' && !Game.state.started) startGame();
  });
  window.addEventListener('keyup', e => { if (map[e.code]) Game.input[map[e.code]] = false; });
  window.addEventListener('mousedown', e => {
    if (!Game.state.started || Game.state.paused) return;
    AudioSys.blip(880);
    const p = Game.state.player;
    if (!p.inCar && p.weapon > 0 && p.ammo[p.weapon] > 0) {
      p.ammo[p.weapon]--;
      const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
      addFloater('HIT! -12 HP', p.x + fx * 8, 2.2, p.z + fz * 8);
    }
  });
  document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'play') startGame();
    if (a === 'save') { saveGame(Game.state.player, Game.state.ms, Game.state.owned) && AudioSys.blip(990); }
    if (a === 'load') { const s = loadGame(); if (s) { Game.state.player.cash = s.cash; Game.state.player.rep = s.rep; } }
    if (a === 'end') location.reload();
    if (a === 'closemap') toggleMap();
    if (a === 'totitle') location.reload();
    if (a === 'closeup') toggleUpgrade();
    if (a === 'continue') el('passed').classList.add('hidden');
  }));
  document.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', () => {
    const u = UPGRADES.find(x => x.id === b.dataset.up);
    const p = Game.state.player;
    if (u && p.cash >= u.cost && !Game.state.owned.includes(u.id)) {
      p.cash -= u.cost; Game.state.owned.push(u.id); AudioSys.blip(990);
      b.textContent = 'DIBELI ✓'; b.disabled = true; updateHud();
    }
  }));
}

function startGame() {
  AudioSys.init(); AudioSys.startMusic();
  Game.state.started = true;
  el('title').classList.add('hidden');
  el('hud').style.display = 'block';
}
function toggleMap() {
  const s = Game.state;
  if (!s.started) return;
  s.mapOpen = !s.mapOpen;
  el('bigmap').classList.toggle('hidden', !s.mapOpen);
  el('hud').style.display = s.mapOpen ? 'none' : 'block';
  if (s.mapOpen) { fillMissionList(); drawBigMap(s.player, s.checkpoint); }
}
function toggleUpgrade() {
  const s = Game.state;
  if (!s.started) return;
  s.upgradeOpen = !s.upgradeOpen;
  el('upgrade').classList.toggle('hidden', !s.upgradeOpen);
  if (s.upgradeOpen) fillMissionList();
}
function togglePause() {
  const s = Game.state;
  if (!s.started) return;
  s.paused = !s.paused;
  el('pause').classList.toggle('hidden', !s.paused);
}
function cycleRadio() {
  const s = Game.state;
  s.radio = (s.radio + 1) % RADIO.length;
  const rb = document.querySelector('#radio b');
  const rs = document.querySelector('#radio span');
  if (rb) rb.textContent = '♪ ' + RADIO[s.radio].name;
  if (rs) rs.textContent = RADIO[s.radio].track;
  AudioSys.blip(660);
}
function cycleWeapon() {
  const p = Game.state.player;
  p.weapon = (p.weapon + 1) % 3;
  const names = ['FIST · ∞', 'PISTOL · 12/60', 'SMG TAWON · 32/160 ROUNDS'];
  el('weapon-name').textContent = names[p.weapon];
  document.querySelectorAll('.wslot').forEach(w => w.classList.toggle('active', +w.dataset.n === p.weapon));
}
function toggleCar() {
  const p = Game.state.player;
  p.inCar = !p.inCar;
  AudioSys.blip(p.inCar ? 520 : 440);
}

window.addEventListener('error', e => { Game.errors.push(String(e.message)); });

function boot() {
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  Game.canvas = document.getElementById('gl');
  Game.renderer = createRenderer(Game.canvas);
  buildStaticMesh();
  Game.state = newState(shot);
  Game.sun = SUN_DUSK;
  Game.ms = Game.state.ms;
  buildHud(document.getElementById('app'));
  fillMissionList();
  bindInput();
  if (shot) stageShot(shot);
  else { el('hud').style.display = 'none'; }
  window.__game = Game;
  requestAnimationFrame(frame);
}
document.addEventListener('DOMContentLoaded', boot);
