// actors.js — the living city: the player (on foot or in the Garuda GT),
// traffic, WPD police, pedestrians, the police helicopter, and the wanted
// level that drives them all.

'use strict';

const PLAYER_START = { x: 0, z: 48, heading: Math.PI };

function newPlayer() {
  return {
    x: PLAYER_START.x, z: PLAYER_START.z, heading: PLAYER_START.heading,
    speed: 0, inCar: true, car: 0, health: 95, cash: 12480, rep: 1320,
    wanted: 3, weapon: 2, // 0 fist, 1 pistol, 2 SMG TAWON, 3/4 locked
    ammo: [Infinity, 12, 32, 0, 0], mission: 6, missionTime: 193,
  };
}

// Traffic: cars cruising the grid streets, each with a model spec.
function buildTraffic(r) {
  const out = [];
  const spots = [
    { x: -36, z: 12, h: 0 }, { x: 24, z: -36, h: Math.PI / 2 },
    { x: 48, z: 36, h: Math.PI }, { x: -12, z: -48, h: -Math.PI / 2 },
    { x: 36, z: 0, h: 0 }, { x: -48, z: -12, h: Math.PI / 2 },
    { x: 12, z: 60, h: Math.PI }, { x: 60, z: 12, h: -Math.PI / 2 },
  ];
  for (let i = 0; i < spots.length; i++) {
    const car = CARS[1 + (i % 5)];
    const spec = { body: hex(car.color), glass: GLASS };
    if (i === 2) spec.taxi = true;
    out.push({
      x: spots[i].x, z: spots[i].z, heading: spots[i].h,
      speed: 6 + r() * 4, spec, kind: 'traffic',
    });
  }
  return out;
}

function buildPolice() {
  return [
    { x: -14, z: 30, heading: Math.PI, speed: 11,
      spec: { body: hex('#e8ecf0'), glass: GLASS, police: true }, kind: 'police' },
    { x: 18, z: 34, heading: Math.PI, speed: 10,
      spec: { body: hex('#e8ecf0'), glass: GLASS, police: true }, kind: 'police' },
  ];
}

// Pedestrians: smooth people walking the sidewalks, varied looks.
function buildPedestrians(r) {
  const looks = [
    { skin: hex('#c98d64'), hair: hex('#1c1410'), shirt: hex('#c0392b'), pants: hex('#2a2d33'), hairStyle: 'short' },
    { skin: hex('#8a5a3b'), hair: hex('#0e0a08'), shirt: hex('#2e6fd0'), pants: hex('#3a3f4a'), hairStyle: 'cap' },
    { skin: hex('#e0ac82'), hair: hex('#5a3a1a'), shirt: hex('#e0a91c'), pants: hex('#4a3f2a'), hairStyle: 'long' },
    { skin: hex('#a06a42'), hair: hex('#241812'), shirt: hex('#7a3fd0'), pants: hex('#2a2d33'), hairStyle: 'band' },
    { skin: hex('#d9a06a'), hair: hex('#3a2a1a'), shirt: hex('#2fae8f'), pants: hex('#333a44'), hairStyle: 'short' },
  ];
  const spots = [
    { x: -8, z: 20, h: 0.4 }, { x: 10, z: 16, h: 2.6 }, { x: -20, z: 44, h: 1.2 },
    { x: 6, z: 52, h: -0.6 }, { x: -30, z: 8, h: 1.8 }, { x: 22, z: 28, h: 3.0 },
  ];
  return spots.map((s, i) => ({
    x: s.x, z: s.z, heading: s.h,
    spec: Object.assign({ pose: 'walk' }, looks[i % looks.length]),
    kind: 'ped',
  }));
}

// The hero, on foot: green shirt, grey trousers, short dark hair, face.
function heroSpec(pose) {
  return {
    skin: hex('#c98d64'), hair: hex('#1c1410'), shirt: hex('#2e7d5b'),
    pants: hex('#5a5f6a'), shoes: hex('#3a2a1a'), hairStyle: 'short',
    pose: pose || 'stand', face: true,
  };
}

// Enemies: gang members in red, aiming.
function enemySpec() {
  return {
    skin: hex('#8a5a3b'), hair: hex('#0e0a08'), shirt: hex('#a02020'),
    pants: hex('#222222'), shoes: hex('#111111'), hairStyle: 'band',
    pose: 'aim', face: true,
  };
}

function buildHeliState() {
  return { x: 12, y: 26, z: 96, heading: 0.6 };
}

// One simulation step (dt seconds): traffic cruises, police close in on the
// player, pedestrians stroll, the heli circles. Pure and deterministic.
function stepActors(state, dt) {
  for (const c of state.traffic) {
    c.x += Math.sin(c.heading) * c.speed * dt;
    c.z += Math.cos(c.heading) * c.speed * dt;
    if (c.x > 76 || c.x < -76 || c.z > 76 || c.z < -76) c.heading += Math.PI;
  }
  for (const p of state.police) {
    const dx = state.player.x - p.x, dz = state.player.z - p.z;
    const d = Math.hypot(dx, dz) || 1;
    const want = Math.atan2(dx, dz);
    let dh = want - p.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    p.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, dh));
    p.speed = Math.min(13, p.speed + 2 * dt);
    p.x += Math.sin(p.heading) * p.speed * dt;
    p.z += Math.cos(p.heading) * p.speed * dt;
  }
  for (const p of state.peds) {
    p.x += Math.sin(p.heading) * 1.1 * dt;
    p.z += Math.cos(p.heading) * 1.1 * dt;
    if (Math.abs(p.x) > 70 || Math.abs(p.z) > 70) p.heading += Math.PI / 2;
  }
  const h = state.heli;
  h.heading += 0.25 * dt;
  h.x = state.player.x + Math.sin(h.heading) * 30;
  h.z = state.player.z + Math.cos(h.heading) * 30;
  h.y = 24 + Math.sin(h.heading * 2) * 2;
}

// Player driving: accelerate / brake / steer, clamped to the city.
function stepPlayer(player, input, dt) {
  const accel = input.up ? 14 : input.down ? -10 : 0;
  const max = player.inCar ? 28 : 5;
  player.speed = Math.max(-8, Math.min(max, player.speed + accel * dt));
  if (!input.up && !input.down) player.speed *= Math.max(0, 1 - 1.6 * dt);
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const turnRate = player.inCar ? 1.7 : 2.4;
  player.heading += steer * turnRate * dt * Math.sign(player.speed || 1) * (player.speed < 0 ? -1 : 1);
  player.x += Math.sin(player.heading) * player.speed * dt;
  player.z += Math.cos(player.heading) * player.speed * dt;
  player.x = Math.max(-74, Math.min(74, player.x));
  player.z = Math.max(-74, Math.min(74, player.z));
  if (player.missionTime > 0) player.missionTime -= dt;
}
