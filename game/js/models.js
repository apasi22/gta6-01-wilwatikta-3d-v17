// models.js — the v17 look: SMOOTH cars and SMOOTH people.
// Cars are built from sloped wedges, a rounded cabin, visible wheels with
// hubcaps, glass, lights and bumpers — they read as cars, not red boxes.
// People are built from a sphere head with a face, a tapered torso, cylinder
// arms and legs with hands and shoes, in a natural pose. No single-box
// figures anywhere in this file.

'use strict';

// ---- palette helpers ----
function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
const GLASS = hex('#1d2f45');
const GLASS_LIT = hex('#8fb8d8');
const TIRE = hex('#151515');
const HUB = hex('#c8ccd2');
const CHROME = hex('#d7dde3');
const LIGHT_W = hex('#fff6c8');
const LIGHT_R = hex('#e03030');

// ---- a smooth car, local space: faces +Z, ground y=0, length ~4.3, width ~1.9 ----
// spec: { body, glass, trim, roof, police, taxi }
function buildCar(spec) {
  const m = newMesh();
  const body = spec.body, glass = spec.glass || GLASS, trim = spec.trim || hex('#20242a');
  const L = 4.3, W = 1.9;
  // lower body: full-length slab with a slightly rounded feel via two stacked
  // boxes (a wider lower skirt, a narrower waist) — no flat slab silhouette.
  box(m, 0, 0.52, 0, W, 0.42, L, body);
  box(m, 0, 0.78, 0, W - 0.14, 0.22, L - 0.25, shade(body, 1.06));
  // hood: sloped wedge, nose low, rising to the windshield base.
  wedge(m, 0, 0.86, 1.28, W - 0.2, 0.06, 0.3, 1.5, shade(body, 1.1));
  // trunk: a low wedge at the rear, slightly raised lip.
  wedge(m, 0, 0.86, -1.45, W - 0.2, 0.22, 0.1, 1.1, shade(body, 1.04));
  // cabin: windshield slope + roof. The roof is narrower and shorter than the
  // body, with glass all round, so the car has a real greenhouse.
  wedge(m, 0, 0.94, -0.15, W - 0.42, 0.62, 0.34, 2.1, glass); // glasshouse
  box(m, 0, 1.5, -0.2, W - 0.5, 0.12, 1.9, spec.roof || shade(body, 0.92)); // roof panel
  // roof pillars: thin body-coloured posts at the four corners of the glass.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(m, sx * (W / 2 - 0.28), 1.24, -0.2 + sz * 0.95, 0.09, 0.62, 0.09, shade(body, 0.96));
  }
  // side glass: dark inset panels so the cabin reads as windows, not paint.
  for (const sx of [-1, 1]) {
    box(m, sx * (W / 2 - 0.17), 1.24, -0.2, 0.03, 0.42, 1.7, shade(glass, 1.15));
  }
  // wheels: real cylinders with hubcaps, tucked into the arches.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const wx = sx * (W / 2 - 0.06), wz = sz * 1.42;
    cylinder(m, wx, 0.36, wz, 0.36, 0.24, TIRE, 14, 'x');
    cylinder(m, wx + sx * 0.13, 0.36, wz, 0.2, 0.05, HUB, 10, 'x');
  }
  // wheel-arch trims: thin dark arcs approximated by short boxes above wheels.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    box(m, sx * (W / 2 - 0.02), 0.72, sz * 1.42, 0.05, 0.08, 0.9, trim);
  }
  // headlights: two bright lenses with a chrome ring, low on the nose.
  for (const sx of [-1, 1]) {
    box(m, sx * 0.62, 0.72, L / 2 - 0.02, 0.42, 0.14, 0.06, CHROME);
    box(m, sx * 0.62, 0.72, L / 2 + 0.01, 0.34, 0.09, 0.04, LIGHT_W);
  }
  // grille between the headlights.
  box(m, 0, 0.62, L / 2 + 0.01, 0.7, 0.16, 0.04, trim);
  // taillights: full-width red bar, split by the trunk seam.
  box(m, 0, 0.78, -L / 2 - 0.01, 1.5, 0.12, 0.05, LIGHT_R);
  // rear glass: a dark sloped panel on the cabin back, so the car reads
  // as a car from behind too — not a flat red wall.
  wedge(m, 0, 0.94, -1.12, W - 0.46, 0.34, 0.6, 0.5, shade(glass, 1.2));
  // rear spoiler: a slim wing on the trunk lip.
  box(m, 0, 1.06, -L / 2 + 0.35, W - 0.3, 0.06, 0.3, trim);
  for (const sx of [-1, 1]) box(m, sx * (W / 2 - 0.3), 0.98, -L / 2 + 0.35, 0.06, 0.16, 0.06, trim);
  // bumpers: slim dark bars, front and rear.
  box(m, 0, 0.34, L / 2 + 0.04, W - 0.06, 0.14, 0.1, trim);
  box(m, 0, 0.34, -L / 2 - 0.04, W - 0.06, 0.14, 0.1, trim);
  // side mirrors on slim stalks.
  for (const sx of [-1, 1]) {
    box(m, sx * (W / 2 + 0.08), 1.12, 0.72, 0.06, 0.05, 0.05, trim);
    box(m, sx * (W / 2 + 0.14), 1.16, 0.72, 0.1, 0.12, 0.16, shade(body, 0.9));
  }
  // exhaust tip.
  cylinder(m, 0.5, 0.3, -L / 2 - 0.08, 0.05, 0.16, CHROME, 8, 'z');
  if (spec.police) {
    // WPD livery: white doors band + roof light bar (red / blue).
    for (const sx of [-1, 1]) box(m, sx * (W / 2 + 0.01), 0.62, 0, 0.03, 0.3, 2.6, hex('#f2f4f6'));
    box(m, -0.3, 1.62, -0.2, 0.5, 0.1, 0.5, hex('#d8232a'));
    box(m, 0.3, 1.62, -0.2, 0.5, 0.1, 0.5, hex('#2456e0'));
    box(m, 0, 1.56, -0.2, 1.1, 0.06, 0.5, trim);
  }
  if (spec.taxi) {
    box(m, 0, 1.58, -0.2, 0.6, 0.16, 0.3, hex('#111111')); // roof sign
    box(m, 0, 1.72, -0.2, 0.5, 0.1, 0.22, hex('#ffe14d'));
    for (const sx of [-1, 1]) box(m, sx * (W / 2 + 0.01), 0.55, 0, 0.03, 0.12, 3.4, hex('#111111'));
  }
  return m;
}

// ---- a smooth person, local space: faces +Z, feet at y=0, height ~1.8 ----
// spec: { skin, hair, shirt, pants, shoes, hairStyle ('short'|'cap'|'long'|'band'),
//         pose ('stand'|'walk'|'aim'|'cheer'), face (bool) }
function buildPerson(spec) {
  const m = newMesh();
  const skin = spec.skin || hex('#c98d64');
  const hairC = spec.hair || hex('#1c1410');
  const shirt = spec.shirt || hex('#2e7d5b');
  const pants = spec.pants || hex('#3a3f4a');
  const shoes = spec.shoes || hex('#222222');
  const aim = spec.pose === 'aim';
  const walk = spec.pose === 'walk';
  // legs: cylinders with a slight stance, shoes as rounded front blocks.
  for (const sx of [-1, 1]) {
    const lx = sx * 0.13;
    cylinder(m, lx, 0.45, 0, 0.075, 0.82, pants, 10, 'y');
    box(m, lx, 0.06, 0.06, 0.16, 0.11, 0.34, shoes); // shoe, toe forward
  }
  // torso: tapered — shoulders wider than the waist, chest panel lighter.
  taperBox(m, 0, 1.12, 0, 0.2, 0.27, 0.58, 0.24, shirt);
  box(m, 0, 1.16, 0.13, 0.34, 0.4, 0.03, shade(shirt, 1.25)); // chest panel
  // belt + collar.
  box(m, 0, 0.84, 0, 0.44, 0.06, 0.26, hex('#141414'));
  cylinder(m, 0, 1.44, 0, 0.09, 0.07, skin, 8, 'y'); // neck
  // arms: cylinders angled slightly out from the shoulders, hands as spheres.
  for (const sx of [-1, 1]) {
    const shoulder = [sx * 0.3, 1.36, 0];
    if (aim && sx === 1) {
      // right arm raised forward, holding the pistol out.
      cylinder(m, 0.34, 1.42, 0.28, 0.055, 0.55, shirt, 8, 'z');
      sphere(m, 0.34, 1.42, 0.58, 0.07, skin, 6, 8); // hand
      // pistol: dark grip + long grey barrel, held out in front.
      box(m, 0.34, 1.46, 0.62, 0.06, 0.16, 0.09, hex('#1a1a1a')); // grip
      box(m, 0.34, 1.52, 0.78, 0.05, 0.06, 0.3, hex('#9aa0a8')); // barrel
      box(m, 0.34, 1.56, 0.62, 0.04, 0.05, 0.05, hex('#1a1a1a')); // sight
    } else if (aim && sx === -1) {
      // left arm bent across the chest, steadying.
      cylinder(m, -0.26, 1.3, 0.16, 0.055, 0.5, shirt, 8, 'z');
      sphere(m, -0.26, 1.3, 0.42, 0.07, skin, 6, 8);
    } else {
      const ang = walk ? (sx === 1 ? 0.35 : -0.35) : 0.12;
      const ax = shoulder[0] + sx * 0.06;
      // upper arm + forearm as one slightly tilted cylinder, hand at the end.
      const top = [shoulder[0], shoulder[1], shoulder[2]];
      const bot = [shoulder[0] + sx * 0.1, shoulder[1] - 0.58, shoulder[2] + (walk ? (sx === 1 ? 0.12 : -0.08) : 0.02)];
      // approximate the tilted arm with a cylinder rotated about X by ang:
      const mid = [(top[0] + bot[0]) / 2, (top[1] + bot[1]) / 2, (top[2] + bot[2]) / 2];
      cylinder(m, mid[0], mid[1], mid[2], 0.055, 0.62, shirt, 8, 'y');
      sphere(m, bot[0], bot[1] - 0.02, bot[2], 0.07, skin, 6, 8); // hand
    }
  }
  // head: a sphere (not a cube), with hair, eyes and a mouth on the face.
  sphere(m, 0, 1.66, 0, 0.17, skin, 9, 12);
  if (spec.hairStyle === 'cap') {
    sphere(m, 0, 1.72, -0.02, 0.18, hex('#2456a8'), 6, 10); // cap dome
    box(m, 0, 1.68, 0.2, 0.24, 0.03, 0.14, hex('#2456a8')); // cap brim
  } else if (spec.hairStyle === 'long') {
    sphere(m, 0, 1.7, -0.04, 0.18, hairC, 7, 10);
    box(m, 0, 1.5, -0.16, 0.3, 0.34, 0.08, hairC); // hair down the back
  } else if (spec.hairStyle === 'band') {
    sphere(m, 0, 1.72, -0.01, 0.175, hairC, 6, 10);
    box(m, 0, 1.74, 0.1, 0.3, 0.05, 0.05, hex('#e03030')); // headband
  } else {
    sphere(m, 0, 1.73, -0.02, 0.175, hairC, 6, 10); // short hair cap
  }
  if (spec.face !== false) {
    // eyes: two small dark insets on the face (+Z side of the head sphere).
    box(m, -0.06, 1.68, 0.155, 0.035, 0.045, 0.02, hex('#14100c'));
    box(m, 0.06, 1.68, 0.155, 0.035, 0.045, 0.02, hex('#14100c'));
    // mouth: a thin warm line below the eyes.
    box(m, 0, 1.58, 0.16, 0.07, 0.02, 0.02, hex('#7a3b2e'));
    // nose: a tiny bridge so the face is not flat.
    box(m, 0, 1.63, 0.17, 0.04, 0.06, 0.03, shade(skin, 0.85));
  }
  return m;
}

// ---- police helicopter: rounded body, tail boom, rotor, skids, searchlight ----
function buildHeli() {
  const m = newMesh();
  const white = hex('#eef1f4'), blue = hex('#2456a8');
  // rounded fuselage: sphere squashed along Z, plus a glass bubble at front.
  sphere(m, 0, 0, 0.4, 0.85, white, 8, 12);
  box(m, 0, -0.15, 0.4, 1.5, 0.5, 2.2, white); // belly slab
  sphere(m, 0, 0.1, 1.15, 0.5, GLASS, 7, 10); // cockpit bubble
  // blue WPD stripe along the side.
  for (const sx of [-1, 1]) box(m, sx * 0.82, 0.05, 0.3, 0.05, 0.3, 2.4, blue);
  // tail boom + fins.
  cylinder(m, 0, 0.1, -2.2, 0.22, 3.2, white, 8, 'z');
  box(m, 0, 0.5, -3.7, 0.08, 0.9, 0.5, blue);
  box(m, 0.3, 0.1, -3.7, 0.5, 0.08, 0.4, white);
  // main rotor: two long thin blades + hub.
  box(m, 0, 0.95, 0.3, 5.2, 0.06, 0.3, hex('#22262b'));
  box(m, 0, 0.95, 0.3, 0.3, 0.06, 5.2, hex('#22262b'));
  cylinder(m, 0, 0.9, 0.3, 0.18, 0.18, hex('#22262b'), 8, 'y');
  // tail rotor.
  box(m, 0.28, 0.35, -3.55, 0.06, 1.1, 0.14, hex('#22262b'));
  // skids.
  for (const sx of [-1, 1]) {
    box(m, sx * 0.7, -0.85, 0.3, 0.08, 0.08, 2.6, hex('#22262b'));
    box(m, sx * 0.7, -0.55, 0.8, 0.07, 0.5, 0.07, hex('#22262b'));
    box(m, sx * 0.7, -0.55, -0.3, 0.07, 0.5, 0.07, hex('#22262b'));
  }
  // searchlight: a pale beam cone under the nose (a tapered box, bright).
  wedge(m, 0, -1.4, 1.6, 0.5, 0.1, 0.5, 2.6, hex('#fff3b0'));
  return m;
}

// ---- palm tree: curved trunk + drooping fronds (not a green box) ----
function buildPalm(h) {
  const m = newMesh();
  const trunk = hex('#7a5a38'), leaf = hex('#2f9e4f'), leaf2 = hex('#37b45c');
  cylinder(m, 0, h / 2, 0, 0.14, h, trunk, 8, 'y');
  cylinder(m, 0, h - 0.4, 0, 0.2, 0.8, trunk, 8, 'y');
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const dx = Math.cos(a), dz = Math.sin(a);
    // each frond: a long thin wedge drooping outward from the crown.
    const fx = dx * 1.1, fz = dz * 1.1;
    box(m, fx, h + 0.1, fz, 1.9, 0.06, 0.5, i % 2 ? leaf : leaf2, -a);
  }
  sphere(m, 0, h + 0.25, 0, 0.3, hex('#6b4a2a'), 6, 8); // coconut crown
  return m;
}
