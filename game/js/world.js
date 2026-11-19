// world.js — the city, assembled into meshes and drawn. The static city
// (ground, roads, district plates, buildings with lit windows, palms, lamps)
// is built once; cars, people and the helicopter are drawn per frame.

'use strict';

const WORLD = { staticMesh: null, layout: null, sunDusk: null, sunNight: null };

function buildStaticMesh() {
  const layout = buildCityLayout();
  WORLD.layout = layout;
  const m = newMesh();
  const asphalt = hex('#3d3a38'), roadLine = hex('#c8a83a');
  // ground: one big slab, asphalt grey, bright enough to read at dusk.
  box(m, 0, -0.15, 0, 160, 0.3, 160, asphalt);
  // district ground plates: each district tints its ground so the city reads
  // as six coloured quarters from above and from the minimap.
  for (const d of DISTRICTS) {
    const w = d.x1 - d.x0, h = d.z1 - d.z0;
    box(m, (d.x0 + d.x1) / 2, 0.02, (d.z0 + d.z1) / 2, w - 1, 0.06, h - 1,
      shade(hex(d.color), 0.32));
  }
  // roads: dark strips on every grid line, with yellow centre dashes.
  for (let i = -3; i <= 3; i++) {
    const p = i * 24;
    box(m, p, 0.06, 0, 7, 0.08, 160, hex('#2c2a29'));
    box(m, 0, 0.06, p, 160, 0.08, 7, hex('#2c2a29'));
    for (let d = -70; d < 72; d += 8) {
      box(m, p, 0.1, d, 0.35, 0.03, 2.4, roadLine);
      box(m, d, 0.1, p, 2.4, 0.03, 0.35, roadLine);
    }
  }
  // grass verges at the four corners of the map.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(m, sx * 66, 0.08, sz * 66, 14, 0.1, 14, hex('#3f7a3a'));
  }
  // buildings with lit windows.
  for (const b of layout.buildings) {
    const col = hex(b.color);
    box(m, b.x, b.h / 2, b.z, b.w, b.h, b.d, col);
    // roof cap, slightly lighter.
    box(m, b.x, b.h + 0.15, b.z, b.w - 0.6, 0.3, b.d - 0.6, shade(col, 1.25));
    // windows on the two long faces; lit ones glow warm yellow.
    const floors = Math.min(b.floors, 8);
    const cols = Math.max(2, Math.floor(b.w / 3));
    const r = rng(Math.floor(b.x * 7 + b.z * 13 + b.h));
    for (let f = 0; f < floors; f++) {
      for (let c = 0; c < cols; c++) {
        const wy = 2.2 + f * 3.1;
        if (wy > b.h - 1) continue;
        const wx = b.x - b.w / 2 + (c + 0.5) * (b.w / cols);
        const lit = r() < b.lit;
        const wc = lit ? hex(WINDOW_LIT) : hex(WINDOW_DARK);
        box(m, wx, wy, b.z + b.d / 2 + 0.04, 1.3, 1.7, 0.06, wc);
        box(m, wx, wy, b.z - b.d / 2 - 0.04, 1.3, 1.7, 0.06, wc);
      }
    }
    if (b.hero === 'WPD') {
      box(m, b.x, b.h + 1.2, b.z, 6, 0.5, 6, hex('#2456a8')); // blue beacon base
      sphere(m, b.x, b.h + 1.8, b.z, 0.7, hex('#3f7dff'), 6, 8);
    }
    if (b.hero === 'CASINO') {
      box(m, b.x, b.h + 0.8, b.z + b.d / 2 + 0.2, 10, 1.2, 0.3, hex('#ffe14d'));
    }
  }
  // palms and lamps.
  for (const p of layout.palms) {
    const pm = buildPalm(p.h);
    mergeMesh(m, pm, mTranslate(p.x, 0, p.z));
  }
  for (const l of layout.lamps) {
    cylinder(m, l.x, 2.2, l.z, 0.09, 4.4, hex('#2a2d33'), 6, 'y');
    sphere(m, l.x, 4.5, l.z, 0.28, hex('#ffe9a8'), 6, 8);
    box(m, l.x, 4.5, l.z, 0.9, 0.12, 0.12, hex('#2a2d33'));
  }
  // sea to the south: a blue strip beyond the harbour wall.
  box(m, 0, -0.05, -84, 170, 0.2, 16, hex('#2a5a8a'));
  box(m, 0, 0.4, -76, 170, 0.8, 1.2, hex('#6a6a6a')); // harbour wall
  WORLD.staticMesh = m;
}

// Merge a mesh into another under a model matrix.
function mergeMesh(dst, src, model) {
  const n = src.pos.length / 3;
  for (let i = 0; i < n; i++) {
    const p = mApply(model, [src.pos[i * 3], src.pos[i * 3 + 1], src.pos[i * 3 + 2]]);
    dst.pos.push(p[0], p[1], p[2]);
    dst.nor.push(src.nor[i * 3], src.nor[i * 3 + 1], src.nor[i * 3 + 2]);
    dst.col.push(src.col[i * 3], src.col[i * 3 + 1], src.col[i * 3 + 2]);
  }
}

// Two lighting moods: bright dusk (the v13 look) and night.
const SUN_DUSK = {
  dir: [0.45, 0.75, 0.35], col: [1.0, 0.82, 0.62], amb: [0.52, 0.48, 0.55],
  fog: [0.62, 0.42, 0.62], fogNear: 60, fogFar: 220, sky: [0.58, 0.34, 0.62],
};
const SUN_NIGHT = {
  // night stays readable: a blue dusk, never the murk of a dark build.
  dir: [0.3, 0.8, 0.2], col: [0.85, 0.9, 1.15], amb: [0.5, 0.52, 0.62],
  fog: [0.24, 0.24, 0.42], fogNear: 50, fogFar: 200, sky: [0.24, 0.24, 0.44],
};

// Mesh cache: car, person and heli geometry is built once per spec and
// reused every frame, so the frame loop never rebuilds the same shapes.
const meshCache = new Map();
function cachedMesh(key, build) {
  let m = meshCache.get(key);
  if (!m) { m = build(); meshCache.set(key, m); }
  return m;
}

function drawScene(renderer, cam, sun, actors) {
  const proj = mPerspective(1.05, 1280 / 720, 0.5, 400);
  const view = mLookAt(cam.eye, cam.target, [0, 1, 0]);
  renderer.begin(proj, view, sun.sky);
  renderer.draw(WORLD.staticMesh, mIdentity(), sun);
  // checkpoint beam: a tall golden column over the objective.
  if (actors.checkpoint) {
    const bm = newMesh();
    cylinder(bm, actors.checkpoint.x, 16, actors.checkpoint.z, 1.1, 32, hex('#ffe14d'), 10, 'y');
    cylinder(bm, actors.checkpoint.x, 0.3, actors.checkpoint.z, 2.4, 0.5, hex('#ffe14d'), 12, 'y');
    renderer.draw(bm, mIdentity(), sun);
  }
  // cars.
  for (const c of actors.cars) {
    const mesh = cachedMesh('car:' + JSON.stringify(c.spec), () => buildCar(c.spec));
    const model = mMul(mTranslate(c.x, 0, c.z), mRotY(c.heading));
    renderer.draw(mesh, model, sun);
  }
  // people.
  for (const p of actors.people) {
    const mesh = cachedMesh('person:' + JSON.stringify(p.spec), () => buildPerson(p.spec));
    const model = mMul(mTranslate(p.x, 0, p.z), mRotY(p.heading));
    renderer.draw(mesh, model, sun);
  }
  // helicopter, tilted into its turn, rotor blurred by two crossed blades.
  if (actors.heli) {
    const mesh = cachedMesh('heli', buildHeli);
    const model = mMul(mMul(mTranslate(actors.heli.x, actors.heli.y, actors.heli.z),
      mRotY(actors.heli.heading)), mRotZ(0.12));
    renderer.draw(mesh, model, sun);
  }
}
