import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const vite = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
const patch = fs.readFileSync(new URL('../scripts/live-dice-necromancer-summons-final-patch.mjs', import.meta.url), 'utf8');

test('the session-only replay and summon patch is the last modular build step', () => {
  const current = vite.indexOf('live-dice-necromancer-summons-final-patch.mjs');
  const previous = vite.indexOf('battlemap-direct-realtime-receiver-fix-2026-09-24.mjs');
  assert.ok(current > previous);
  assert.equal(vite.indexOf('scripts/', current + 1), -1);
});

test('historical dice are rejected both when queued and before playback', () => {
  assert.match(patch, /isLiveDicePayload\(payload/);
  assert.match(patch, /liveQueue = queue\.filter/);
  assert.match(patch, /slice\(-5\)/);
});

test('summons require a master reveal and expose only HP, actions and three VC', () => {
  assert.match(patch, /summon\.revealed!==true/);
  assert.match(patch, /Revelar/);
  assert.match(patch, /Liberar/);
  assert.match(patch, /vigos:3,maxVigos:3/);
  assert.match(patch, /const updateSummonHp=useCallback/);
  assert.match(patch, /const useSummonAction=useCallback/);
});
