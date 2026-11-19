// city.js — Wilwatikta: the data. Six districts, streets, buildings, cars,
// crew, missions, radio. All placement uses a seeded RNG so every run of
// the game builds the same city.

'use strict';

// Deterministic RNG (mulberry32) — the city never changes between runs.
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The six districts tile the whole map with no gaps and no overlaps:
// the middle band's west and east strips belong to Segara and Emas, so
// the big map and the minimap never show dark uncovered bands.
const DISTRICTS = [
  { id: 'segara', name: 'PELABUHAN SEGARA', color: '#3f7fd0', x0: -72, z0: -72, x1: -24, z1: 24,
    blurb: 'Pelabuhan dan gudang tua di tepi laut Jawa.' },
  { id: 'batik', name: 'KAMPUNG BATIK', color: '#8a5fd0', x0: -24, z0: -72, x1: 24, z1: -24,
    blurb: 'Gang batik, bengkel, dan rumah warna-warni.' },
  { id: 'emas', name: 'LORONG EMAS', color: '#e0a91c', x0: 24, z0: -72, x1: 72, z1: 24,
    blurb: 'Kasino, klub malam, dan uang cepat.' },
  { id: 'alun', name: 'ALUN-ALUN', color: '#4a8fd0', x0: -24, z0: -24, x1: 24, z1: 24,
    blurb: 'Jantung kota: kantor WPD dan balai kota.' },
  { id: 'kidul', name: 'PANTAI KIDUL', color: '#2fae8f', x0: -72, z0: 24, x1: 0, z1: 72,
    blurb: 'Pantai selatan, jalan layang, dan balapan liar.' },
  { id: 'senja', name: 'PASAR SENJA', color: '#e07a2e', x0: 0, z0: 24, x1: 72, z1: 72,
    blurb: 'Pasar malam, showroom, dan safehouse.' },
];

const STREET_NAMES = [
  'Jl. Segara Anakan', 'Jl. Dermaga', 'Jl. Batik Tulis', 'Jl. Kenanga',
  'Jl. Pantai Kidul', 'Jl. Pasar Senja', 'Jl. Lorong Emas', 'Jl. Alun-Alun',
  'Jl. Gamelan', 'Jl. Kampung Batik', 'Jl. Pelabuhan', 'Jl. Merdeka',
];

const CARS = [
  { name: 'GARUDA GT', color: '#c0272d', top: 240, desc: 'Sport merah, mesin V8.' },
  { name: 'KENCANA S', color: '#d8b13a', top: 190, desc: 'Sedan emas, nyaman dan cepat.' },
  { name: 'ARJUNA', color: '#2e6fd0', top: 175, desc: 'Coupe biru, lincah di tikungan.' },
  { name: 'SRIKANDI', color: '#7a3fd0', top: 165, desc: 'Hatchback ungu, favorit anak muda.' },
  { name: 'GATOTKACA', color: '#3a3f4a', top: 150, desc: 'SUV hitam, tangguh dan berat.' },
  { name: 'BIMA', color: '#e8e8e8', top: 160, desc: 'Van putih, muat banyak barang.' },
];

const CREW = [
  { name: 'SUGENG', role: 'YOU', color: '#f28c28', hire: 0, key: '' },
  { name: 'AGUS', role: 'DRIVER · GETAWAY', color: '#e0527a', hire: 200, key: 'Z' },
  { name: 'WANTO', role: 'ENFORCER', color: '#4a90e0', hire: 500, key: 'X' },
  { name: 'BAMBANG', role: 'MECHANIC · BENGKEL', color: '#e0a91c', hire: 350, key: 'H' },
  { name: 'RATNA', role: 'LOOKOUT', color: '#2fae8f', hire: 300, key: 'C' },
  { name: 'SLAMET', role: 'GUNMAN', color: '#e05252', hire: 400, key: 'V' },
];

const MISSIONS = [
  { n: 1, name: 'Selamat Datang', pay: 300, done: true, obj: 'Temui Agus di Alun-Alun.', dlg: 'Selamat datang di Wilwatikta, Sugeng. Kota ini milik yang berani.' },
  { n: 2, name: 'Hot Wheels', pay: 450, done: true, obj: 'Curi Kencana S di Pasar Senja.', dlg: 'Mobil itu milik bos kasino. Ambil diam-diam, jangan ribut.' },
  { n: 3, name: 'Antar Paket', pay: 400, done: true, obj: 'Antar paket ke Pelabuhan Segara.', dlg: 'Jangan buka paketnya. Jangan tanya isinya. Antar saja.' },
  { n: 4, name: 'Tagihan Pasar', pay: 550, done: true, obj: 'Tagih utang di Pasar Senja.', dlg: 'Pedagang itu menunggak tiga bulan. Buat dia ingat.' },
  { n: 5, name: 'Mata-Mata', pay: 500, done: true, obj: 'Awasi gudang WPD dari kejauhan.', dlg: 'WPD mengawasi kita. Sekarang giliran kita mengawasi mereka.' },
  { n: 6, name: 'Balapan Senja', pay: 700, done: false, obj: 'Checkpoint 1 of 4: Kalahkan 3 pembalap di Pantai Kidul.', dlg: 'Balapannya dari Pantai Kidul. Jangan rem di tikungan.' },
  { n: 7, name: 'Gudang Segara', pay: 650, done: false, obj: 'Bersihkan area gudang: 4 musuh tersisa di Pelabuhan Segara.', dlg: 'WPD datang dari utara. Bersihkan gudang, cepat!' },
  { n: 8, name: 'Kabur dari WPD', pay: 600, done: false, obj: 'Lepas dari kejaran 2 unit WPD.', dlg: 'Bintangmu naik, Sugeng. Jangan berhenti sekarang!' },
  { n: 9, name: 'Heat Wave', pay: 750, done: false, obj: 'Bakar gudang saingan di Lorong Emas.', dlg: 'Api itu pesan. Pastikan semua orang membacanya.' },
  { n: 10, name: 'Kencana Hilang', pay: 700, done: false, obj: 'Temukan Kencana S yang dicuri.', dlg: 'Mobil kesayanganku hilang. Cari sampai ketemu.' },
  { n: 11, name: 'Double Cross', pay: 900, done: false, obj: 'Hadapi pengkhianat di Kampung Batik.', dlg: 'Seseorang menjual kita. Cari tahu siapa.' },
  { n: 12, name: 'The Last Ride', pay: 1200, done: false, obj: 'Pelarian terakhir melintasi kota.', dlg: 'Satu pelarian terakhir, Sugeng. Setelah ini, kota ini milikmu.' },
];

const RADIO = [
  { name: 'GAMELAN FM 101.1', track: 'Bonang Malam — Gamelan Wilwatikta' },
  { name: 'RADIO WILWATIKTA', track: 'Saron Senja — Orkes Pantai Kidul' },
];

const POIS = [
  { icon: 'W', label: 'Warehouse', x: -48, z: -48, d: 'segara' },
  { icon: 'D', label: 'Docks', x: -48, z: -8, d: 'segara' },
  { icon: 'C', label: 'Casino', x: 60, z: -12, d: 'emas' },
  { icon: 'M', label: 'Mansion', x: -6, z: -6, d: 'alun' },
  { icon: 'G', label: 'Bengkel Bambang', x: 14, z: -4, d: 'alun' },
  { icon: 'P', label: 'Kantor WPD', x: -14, z: 12, d: 'alun' },
  { icon: 'S', label: 'Showroom', x: 56, z: 40, d: 'senja' },
  { icon: 'S', label: 'Safehouse', x: 12, z: 44, d: 'senja' },
];

const BUILDING_COLORS = ['#5a6a80', '#6a5a7a', '#7a6a4a', '#4a6a6a', '#8a6a5a', '#5a5a6a', '#3f5a7a', '#7a4a5a'];
const WINDOW_LIT = '#ffe9a8';
const WINDOW_DARK = '#2a3648';

// Build the static city layout once (seeded, deterministic).
function buildCityLayout() {
  const r = rng(1998);
  const buildings = [];
  const palms = [];
  const lamps = [];
  // city blocks: 24m pitch, roads on the block edges.
  for (let bx = -3; bx < 3; bx++) for (let bz = -3; bz < 3; bz++) {
    const cx = bx * 24 + 12, cz = bz * 24 + 12;
    // the two hero blocks keep their landmarks to themselves: no random
    // building may overlap the WPD tower or the casino.
    const heroBlock = (bx === -1 && bz === 0) || (bx === 2 && bz === -1);
    if (heroBlock) continue;
    // one or two buildings per block, kept well inside the block so no
    // facade crowds the road (roads run on the block edges).
    const n = 1 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const w = 7 + r() * 5, d = 7 + r() * 5;
      const h = 6 + r() * r() * 26;
      const ox = (r() - 0.5) * 6, oz = (r() - 0.5) * 6;
      buildings.push({
        x: cx + ox, z: cz + oz, w, d, h,
        color: BUILDING_COLORS[Math.floor(r() * BUILDING_COLORS.length)],
        floors: Math.max(2, Math.floor(h / 3.2)),
        lit: 0.45 + r() * 0.4,
      });
    }
    // palms and lamps stay inside the block, off the road corridor.
    if (r() < 0.8) palms.push({ x: cx - 7, z: cz - 7, h: 5 + r() * 2.5 });
    if (r() < 0.6) palms.push({ x: cx + 7, z: cz + 7, h: 5 + r() * 2 });
    lamps.push({ x: cx - 9, z: cz - 9 });
    lamps.push({ x: cx + 9, z: cz + 9 });
  }
  // a few hero buildings: the WPD tower and the casino, taller and distinct.
  // the WPD tower stands in Alun-Alun proper (its home district), clear
  // of the roads on the block edges.
  buildings.push({ x: -14, z: 12, w: 14, d: 14, h: 34, color: '#2f4a7a', floors: 10, lit: 0.8, hero: 'WPD' });
  buildings.push({ x: 60, z: -12, w: 14, d: 12, h: 22, color: '#8a6a1c', floors: 6, lit: 0.9, hero: 'CASINO' });
  return { buildings, palms, lamps };
}

function districtAt(x, z) {
  for (const d of DISTRICTS) if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  return DISTRICTS[3];
}
