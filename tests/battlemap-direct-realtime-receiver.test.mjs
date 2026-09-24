import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const battle = fs.readFileSync('.generated/src/features/mapa-batalha/BattleMapPage.jsx', 'utf8');
const css = fs.readFileSync('.generated/src/experience/game-experience-3.css', 'utf8');

test('token movement and pings bypass the pooled snapshot transport', () => {
  assert.match(battle, /onSnapshot as liveSnapshot/);
  assert.match(battle, /liveSnapshot\(positionsQuery/);
  assert.match(battle, /liveSnapshot\(doc\(db,'config','battlemap_ping'\)/);
  assert.match(battle, /liveSnapshot\(collection\(db,'battlemap_ping_live'\)/);
  assert.match(battle, /channel: 'motion-v2'/);
  assert.match(battle, /channel: 'position-final-v1'/);
});

test('a fresh first ping is rendered instead of being discarded as bootstrap', () => {
  assert.match(battle, /const isFreshAtSubscribe = row =>/);
  assert.match(battle, /if \(isFreshAtSubscribe\(row\)\) receivePing\(row\)/);
  assert.match(battle, /if \(freshest\) receivePing\(freshest\)/);
});

test('quick sheet portraits keep the photo but hide class ornaments', () => {
  assert.match(css, /QUICK PORTRAIT CLEANUP/);
  assert.match(css, /\.g3-action-character \.g3-portrait\[data-classe\]::before/);
  assert.match(css, /\.g3-sheet-hero \.g3-portrait\[data-classe\]::after/);
  assert.match(css, /overflow:hidden!important/);
});

test('the physical dice implementation is not part of this patch', () => {
  const patch = fs.readFileSync('scripts/battlemap-direct-realtime-receiver-fix-2026-09-24.mjs', 'utf8');
  assert.doesNotMatch(patch, /PhysicalDiceTray|SharedDiceReplay|DiceWidget|public_dice_events/);
});
