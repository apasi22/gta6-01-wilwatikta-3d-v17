// hud.js — the whole interface: top bar, weapon slots, circular minimap,
// mission panel, dialogue, the six crew portraits (smooth 2D faces, drawn
// on canvas — rounded heads, hair, eyes, smiles, never cubes), the title
// screen, the TRANSPARENT-background GPS map, upgrade shop and overlays.
// Layout matches v13 exactly: exactly two boxes on the right.

'use strict';

// ---- smooth 2D faces for the crew portraits ----
function drawFace(cv, person, bg) {
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  // rounded background
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.roundRect(0, 0, W, H, 12); ctx.fill();
  const cx = W / 2, cy = H * 0.52, r = W * 0.30;
  // neck + shoulders
  ctx.fillStyle = person.skin;
  ctx.fillRect(cx - r * 0.28, cy + r * 0.8, r * 0.56, r * 0.7);
  ctx.fillStyle = person.shirt;
  ctx.beginPath(); ctx.moveTo(cx - r * 0.95, H); ctx.quadraticCurveTo(cx - r * 0.9, cy + r * 0.85, cx - r * 0.4, cy + r * 0.95);
  ctx.lineTo(cx + r * 0.4, cy + r * 0.95); ctx.quadraticCurveTo(cx + r * 0.9, cy + r * 0.85, cx + r * 0.95, H);
  ctx.closePath(); ctx.fill();
  // head: a smooth circle, never a square.
  ctx.fillStyle = person.skin;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  // hair
  ctx.fillStyle = person.hair;
  ctx.beginPath(); ctx.arc(cx, cy - r * 0.18, r * 0.98, Math.PI, Math.PI * 2); ctx.fill();
  if (person.hairStyle === 'cap') {
    ctx.fillStyle = '#2456a8';
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.25, r * 1.02, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillRect(cx - r, cy - r * 0.35, r * 2, r * 0.22);
  } else if (person.hairStyle === 'long') {
    ctx.fillRect(cx - r * 0.95, cy - r * 0.2, r * 0.3, r * 1.3);
    ctx.fillRect(cx + r * 0.65, cy - r * 0.2, r * 0.3, r * 1.3);
  } else if (person.hairStyle === 'band') {
    ctx.fillStyle = '#e03030';
    ctx.fillRect(cx - r * 0.95, cy - r * 0.55, r * 1.9, r * 0.22);
  }
  // eyes + smile
  ctx.fillStyle = '#14100c';
  ctx.beginPath(); ctx.arc(cx - r * 0.34, cy + r * 0.05, r * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + r * 0.34, cy + r * 0.05, r * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7a3b2e'; ctx.lineWidth = Math.max(2, r * 0.09);
  ctx.beginPath(); ctx.arc(cx, cy + r * 0.42, r * 0.34, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  // ears
  ctx.fillStyle = person.skin;
  ctx.beginPath(); ctx.arc(cx - r, cy + r * 0.1, r * 0.16, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + r, cy + r * 0.1, r * 0.16, 0, Math.PI * 2); ctx.fill();
}

const CREW_FACES = [
  { skin: '#c98d64', hair: '#1c1410', shirt: '#2e7d5b', hairStyle: 'short' },
  { skin: '#8a5a3b', hair: '#0e0a08', shirt: '#e0527a', hairStyle: 'short' },
  { skin: '#e0ac82', hair: '#2a1a10', shirt: '#4a90e0', hairStyle: 'cap' },
  { skin: '#a06a42', hair: '#241812', shirt: '#e0a91c', hairStyle: 'short' },
  { skin: '#d9a06a', hair: '#5a3a1a', shirt: '#2fae8f', hairStyle: 'long' },
  { skin: '#c98d64', hair: '#1c1410', shirt: '#e05252', hairStyle: 'band' },
];

// ---- HUD root ----
function buildHud(root) {
  root.innerHTML = `
  <div id="hud">
    <div id="minimap-wrap">
      <canvas id="minimap" width="220" height="220"></canvas>
      <div id="district">ALUN-ALUN</div>
      <div id="street">Jl. Dermaga</div>
      <div id="repbar"><i></i></div>
      <div id="reptext">REP FIXER · 1320 · LV. 4</div>
    </div>
    <div id="topbar">
      <span id="cash">$12,480</span>
      <span id="stars">★★★☆☆</span>
      <span id="clock">18:41 · DAY 1 1998</span>
    </div>
    <div id="weapons"></div>
    <div id="weapon-name">SMG TAWON · 32/160 ROUNDS</div>
    <div id="radio" class="rbox"><b>♪ GAMELAN FM 101.1</b><span>Bonang Malam — Gamelan Wilwatikta</span><i class="eq"></i></div>
    <div id="speedbox" class="rbox"><b id="carname">GARUDA GT</b><span id="condlabel">CONDITION</span><div class="cond"><i id="condfill" style="width:92%"></i></div><div class="speed"><b id="speed">100</b><span>KM/H</span></div><span id="gear">G5</span></div>
    <div id="mission">
      <div class="k">STORY MISSION</div>
      <div class="mname" id="mname">MISSION 6/12 — BALAPAN SENJA</div>
      <div class="mobj" id="mobj">Checkpoint 1 of 4: PANTAI KIDUL<br>Kalahkan 3 pembalap.</div>
      <div class="mrow"><span id="mtimer">3:13</span><span id="mdist">▲ 168m</span></div>
      <div class="mbar"><i id="mbarfill" style="width:62%"></i></div>
      <div class="mnext" id="mnext">NEXT: GUDANG SEGARA</div>
      <div class="mdisp" id="mdisp">WPD DISPATCH: 2 unit mengejar — HELI 2<br>SPOTLIGHT — PANTAI KIDUL</div>
      <div class="mhealth">HEALTH <i><b id="mhealthfill" style="width:95%"></b></i></div>
    </div>
    <div id="dialog"><canvas id="dlg-face" width="64" height="64"></canvas>
      <div><b id="dlg-who">BAMBANG</b> <span id="dlg-role">MECHANIC · BENGKEL</span>
      <p id="dlg-text">Your Garuda needs new brakes. Come by the bengkel.</p></div>
    </div>
    <div id="crew"></div>
  </div>
  <div id="title" class="overlay">
    <h1>WILWATIKTA</h1>
    <div class="sub">CERITA JALANAN &nbsp;·&nbsp; 1998</div>
    <div class="quote">“Setiap jalan punya harga. Setiap pelarian punya cerita.”</div>
    <div class="btns">
      <button class="btn primary" data-act="play">▶ &nbsp;MULAI</button>
      <button class="btn" data-act="save">💾 &nbsp;SAVE</button>
      <button class="btn" data-act="load">📂 &nbsp;LOAD</button>
      <button class="btn" data-act="end">⏻ &nbsp;END GAME</button>
    </div>
    <div class="foot">WASD GERAK · MOUSE KAMERA · E MASUK MOBIL · KLIK TEMBAK · Q GANTI SENJATA · M PETA · R RADIO · U BENGKEL</div>
    <div class="foot-r">WILWATIKTA 3D · KOTA WILWATIKTA · 1998<br>KARYA ORISINAL · DIBUAT UNTUK MAKE.FUN</div>
  </div>
  <div id="bigmap" class="overlay hidden">
    <div class="bm-head">🗺 PETA WILWATIKTA — GPS AKTIF</div>
    <div class="bm-cols">
      <div class="bm-missions"><div class="k">📜 STORY MISSIONS</div><div id="bm-list"></div>
        <div class="bm-job"><div class="k">CURRENT JOB</div><b id="bm-job">Balapan Senja</b><span id="bm-obj">Checkpoint 1 of 4: KIDUL<br>GPS 202 m</span><span class="dim">M = TUTUP PETA · KLIK IKON UNTUK GPS</span></div>
      </div>
      <div class="bm-map"><canvas id="mapcanvas" width="640" height="560"></canvas></div>
      <div class="bm-stats"><div class="k">📊 STATS</div><div id="bm-stats"></div>
        <div class="ring"><b>42%</b></div>
        <div class="k">LEGENDA</div>
        <div class="legend"><span><i style="background:#ffe14d"></i>Objective / Checkpoint</span>
        <span><i style="background:#4a90e0"></i>WPD / Polisi</span>
        <span><i style="background:#e05252"></i>Musuh / Gang</span>
        <span><i style="background:#2fae8f"></i>Safehouse / Garage</span>
        <span><i style="background:#e07a2e"></i>Crew / Kontak</span></div>
        <button class="btn" data-act="closemap">TUTUP [M]</button>
        <button class="btn" data-act="totitle">TITLE</button>
      </div>
    </div>
  </div>
  <div id="upgrade" class="overlay hidden"><h2>BENGKEL BAMBANG — UPGRADE</h2><div id="up-list"></div>
    <button class="btn primary" data-act="closeup">TUTUP [U]</button></div>
  <div id="passed" class="overlay hidden"><h2>MISSION PASSED</h2><div id="passed-body"></div>
    <button class="btn primary" data-act="continue">LANJUTKAN ▶</button></div>
  <div id="pause" class="overlay hidden"><h2>PAUSED</h2><div class="dim">P = lanjutkan · M = peta · U = bengkel</div></div>`;
  // weapon slots
  const w = document.getElementById('weapons');
  const slots = [
    { n: 0, icon: '✋', name: 'FIST', sub: '∞' },
    { n: 1, icon: '🔫', name: 'PISTOL', sub: '12/60' },
    { n: 2, icon: '🔫', name: 'SMG TAWON', sub: '32/160' },
    { n: 3, icon: '🔫', name: 'SHOTGUN', sub: 'LOCKED' },
    { n: 4, icon: '🔫', name: 'RIFLE', sub: 'LOCKED' },
  ];
  w.innerHTML = slots.map(s => `<div class="wslot${s.n === 2 ? ' active' : ''}" data-n="${s.n}"><i>${s.n}</i><b>${s.icon}</b><span>${s.name}</span><em>${s.sub}</em></div>`).join('');
  // crew portraits
  const c = document.getElementById('crew');
  c.innerHTML = CREW.map((m, i) => `<div class="member"><canvas width="72" height="72" data-i="${i}"></canvas><b>${m.name}</b><span>${m.role === 'YOU' ? 'YOU' : '$' + m.hire + ' HIRE' + (m.key ? ' [' + m.key + ']' : '')}</span></div>`).join('');
  c.querySelectorAll('canvas').forEach(cv => drawFace(cv, CREW_FACES[+cv.dataset.i], CREW[+cv.dataset.i].color));
  drawFace(document.getElementById('dlg-face'), CREW_FACES[3], '#e0a91c');
}

// ---- minimap: circular, six coloured districts, POIs, route, player arrow ----
function drawMinimap(player, checkpoint) {
  const cv = document.getElementById('minimap');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const S = cv.width, C = S / 2;
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.beginPath(); ctx.arc(C, C, C - 4, 0, Math.PI * 2); ctx.clip();
  const scale = S / 150;
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect((d.x0 + 75) * scale, (d.z0 + 75) * scale, (d.x1 - d.x0) * scale, (d.z1 - d.z0) * scale);
  }
  ctx.globalAlpha = 1;
  // roads
  ctx.strokeStyle = 'rgba(20,20,24,0.55)'; ctx.lineWidth = 3;
  for (let i = -3; i <= 3; i++) {
    const p = (i * 24 + 75) * scale;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(S, p); ctx.stroke();
  }
  // POIs
  for (const p of POIS) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc((p.x + 75) * scale, (p.z + 75) * scale, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  // route to the checkpoint
  if (checkpoint) {
    ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo((player.x + 75) * scale, (player.z + 75) * scale);
    ctx.lineTo((checkpoint.x + 75) * scale, (checkpoint.z + 75) * scale);
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#ff2a2a';
    ctx.beginPath(); ctx.arc((checkpoint.x + 75) * scale, (checkpoint.z + 75) * scale, 6, 0, Math.PI * 2); ctx.fill();
  }
  // player arrow
  ctx.save();
  ctx.translate((player.x + 75) * scale, (player.z + 75) * scale);
  ctx.rotate(player.heading);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(C, C, C - 4, 0, Math.PI * 2); ctx.stroke();
}

// ---- big map (transparent background: the 3D scene glows through) ----
function drawBigMap(player, checkpoint) {
  const cv = document.getElementById('mapcanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  const scale = Math.min(W / 150, H / 150);
  const ox = (W - 150 * scale) / 2, oy = (H - 150 * scale) / 2;
  // grid + district colours, translucent so the city shows through.
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.color; ctx.globalAlpha = 0.82;
    ctx.fillRect(ox + (d.x0 + 75) * scale, oy + (d.z0 + 75) * scale, (d.x1 - d.x0) * scale, (d.z1 - d.z0) * scale);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    ctx.fillText(d.name, ox + ((d.x0 + d.x1) / 2 + 75) * scale, oy + (d.z0 + 75) * scale + 18);
  }
  // column / row labels
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '12px Arial';
  for (let i = 0; i < 6; i++) {
    ctx.fillText('ABCDEF'[i], ox + (i * 25 + 12) * scale, oy - 6);
    ctx.fillText(String(i + 1), ox - 10, oy + (i * 25 + 14) * scale);
  }
  // POIs
  for (const p of POIS) {
    const x = ox + (p.x + 75) * scale, y = oy + (p.z + 75) * scale;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
    ctx.fillText(p.icon, x, y + 4);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '10px Arial';
    ctx.fillText(p.label, x, y + 24);
  }
  // route + objective star
  if (checkpoint) {
    ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(ox + (player.x + 75) * scale, oy + (player.z + 75) * scale);
    ctx.lineTo(ox + (checkpoint.x + 75) * scale, oy + (checkpoint.z + 75) * scale);
    ctx.stroke(); ctx.setLineDash([]);
    const x = ox + (checkpoint.x + 75) * scale, y = oy + (checkpoint.z + 75) * scale;
    ctx.fillStyle = '#ff2a2a';
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial';
    ctx.fillText('★', x, y + 4);
    ctx.fillText('OBJECTIVE', x, y + 26);
  }
  // player arrow
  ctx.save();
  ctx.translate(ox + (player.x + 75) * scale, oy + (player.z + 75) * scale);
  ctx.rotate(player.heading);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(8, 9); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function fillMissionList() {
  const el = document.getElementById('bm-list');
  if (!el) return;
  el.innerHTML = MISSIONS.map(m => `<div class="bm-row${m.done ? ' done' : ''}${m.n === 6 ? ' active' : ''}"><span>${m.n}. ${m.name}</span><b>$${m.pay}</b><i>${m.done ? 'DONE ✓' : m.n === 6 ? 'ACTIVE' : '—'}</i></div>`).join('');
  const st = document.getElementById('bm-stats');
  st.innerHTML = `<div class="srow"><span>STORY</span><b>42%</b></div><div class="srow"><span>REP</span><b>FIXER · 1320</b></div><div class="srow"><span>CASH</span><b>$12,480</b></div><div class="srow"><span>TIME</span><b>18:37 · DAY 1</b></div><div class="srow"><span>WANTED</span><b>★★★☆☆</b></div><div class="srow"><span>TAKEDOWNS</span><b>14</b></div><div class="srow"><span>CARS STOLEN</span><b>6</b></div><div class="srow"><span>STUNTS</span><b>$2,150</b></div>`;
  const up = document.getElementById('up-list');
  up.innerHTML = UPGRADES.map(u => `<div class="up-row"><b>${u.name}</b><span>${u.desc}</span><i>$${u.cost}</i><button class="btn small" data-up="${u.id}">BELI</button></div>`).join('');
}
