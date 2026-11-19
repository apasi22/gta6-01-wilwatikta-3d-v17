// missions.js — story progress: the 12-mission campaign, checkpoints,
// dialogue, the upgrade shop, and save/load. The story is Sugeng's rise
// from getaway driver to the man who owns Wilwatikta.

'use strict';

const UPGRADES = [
  { id: 'brakes', name: 'Rem Cakram', cost: 800, desc: 'Rem lebih pakem, tikungan lebih tajam.' },
  { id: 'engine', name: 'Mesin V8', cost: 1500, desc: 'Top speed naik ke 320 km/h.' },
  { id: 'armor', name: 'Bodi Anti Peluru', cost: 1200, desc: 'Mobil tahan tembakan WPD lebih lama.' },
  { id: 'shotgun', name: 'Shotgun — Slot 3', cost: 900, desc: 'Buka slot senjata 3: Shotgun.' },
  { id: 'rifle', name: 'Rifle — Slot 4', cost: 1400, desc: 'Buka slot senjata 4: Rifle.' },
  { id: 'crew', name: 'Kru Penuh', cost: 2000, desc: 'Semua kru ikut dalam misi terakhir.' },
];

function missionState() {
  return {
    index: 5, // mission 6 of 12, the current job
    checkpoint: 1, checkpoints: 4, timeLeft: 193,
    distance: 168, next: 'GUDANG SEGARA',
    dispatch: 'WPD DISPATCH: 2 unit mengejar — HELI 2',
    spotlight: 'SPOTLIGHT — PANTAI KIDUL',
    dialogue: { who: 'BAMBANG', role: 'MECHANIC · BENGKEL',
      text: 'Your Garuda needs new brakes. Come by the bengkel.' },
  };
}

function currentMission(ms) { return MISSIONS[ms.index]; }
function nextMission(ms) { return MISSIONS[Math.min(ms.index + 1, MISSIONS.length - 1)]; }

function formatTime(s) {
  s = Math.max(0, Math.ceil(s));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function saveGame(player, ms, owned) {
  try {
    localStorage.setItem('wilwatikta-save-v17', JSON.stringify({
      cash: player.cash, rep: player.rep, mission: ms.index,
      owned, time: Date.now(),
    }));
    return true;
  } catch (e) { return false; }
}
function loadGame() {
  try {
    const raw = localStorage.getItem('wilwatikta-save-v17');
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

// Mission-complete overlay content, shown after a checkpoint run.
function missionPassed(ms) {
  const m = currentMission(ms);
  return {
    title: 'MISSION PASSED',
    name: m.name,
    pay: '$' + m.pay,
    rep: '+120 REP',
    next: nextMission(ms).name,
  };
}
