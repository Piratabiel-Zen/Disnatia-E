import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createAccessRoster, readAccessRoster, writeAccessRoster } from '../src/experience/accessRosterCache.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test('access roster cache exposes only safe preview fields', () => {
  const roster = createAccessRoster([{ id:'sheet-1', nome:'Elyon', classe:'magos', senha:'segredo', hp:18, token:'nao-cachear' }], () => 24);
  assert.equal(roster.length, 1);
  assert.equal(roster[0].passwordProtected, true);
  assert.equal(roster[0].maxHp, 24);
  assert.equal('senha' in roster[0], false);
  assert.equal('token' in roster[0], false);
});

test('cached roster is immediately readable but marked non-authoritative', () => {
  const storage = memoryStorage();
  writeAccessRoster([{ id:'sheet-2', nome:'Kenai', classe:'corvos' }], () => 20, storage);
  const cached = readAccessRoster(storage);
  assert.equal(cached[0].nome, 'Kenai');
  assert.equal(cached[0]._cached, true);
});

test('production pipeline applies the visible update proof last', () => {
  const vite = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
  const cinematic = vite.indexOf('cinematic-combat-vitals-final-patch.mjs');
  const visible = vite.indexOf('visible-update-proof-patch.mjs');
  assert.ok(cinematic >= 0 && visible > cinematic);
});
