import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const vite = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
const patch = fs.readFileSync(new URL('../scripts/live-dice-necromancer-summons-final-patch.mjs', import.meta.url), 'utf8');

test('the session-only replay and summon patch follows realtime fixes', () => {
  const current = vite.indexOf('live-dice-necromancer-summons-final-patch.mjs');
  const previous = vite.indexOf('battlemap-direct-realtime-receiver-fix-2026-09-24.mjs');
  assert.ok(current > previous);
  assert.ok(vite.indexOf('chronicles-mobile-reliability-patch.mjs') > current);
});

test('historical dice are rejected both when queued and before playback', () => {
  assert.match(patch, /isLiveDicePayload\(payload/);
  assert.match(patch, /liveQueue = queue\.filter/);
  assert.match(patch, /slice\(-5\)/);
});

test('summons require a master reveal and expose HP, actions and editable three VC', () => {
  assert.match(patch, /summon\.revealed!==true/);
  assert.match(patch, /Revelar/);
  assert.match(patch, /Liberar/);
  assert.match(patch, /vigos:3,maxVigos:3/);
  assert.match(patch, /const updateSummonHp=useCallback/);
  assert.match(patch, /const updateSummonVc=useCallback/);
  assert.match(patch, /const useSummonAction=useCallback/);
});

test('a revealed summon can be released outside combat and persists for future initiative', () => {
  assert.doesNotMatch(patch, /summon\.revealed!==true\|\|!combat\?\.active/);
  assert.match(patch, /const canRelease=Boolean\(!activeSummon&&!busy\)/);
  assert.match(patch, /Autorizada pelo Mestre\. Pode ser liberada agora/);
  assert.match(patch, /collection\(db,'combat_summons'\)/);
  assert.match(patch, /releasedSummons\.filter/);
  assert.match(patch, /const actionsAvailable=Boolean\(activeSummon\)/);
  assert.doesNotMatch(patch, /!masterMode&&combat\?\.active&&!isTurn/);
});

test('release is announced globally with a dedicated pulsing cinematic', () => {
  assert.match(patch, /type:'summon_release'/);
  assert.match(patch, /title:'INVOCAÇÃO FEITA'/);
  assert.match(patch, /rt-summon_release/);
  assert.match(patch, /summon-release-button is-pulsing/);
});

test('summon HP matches the master value and existing active summons can migrate', () => {
  assert.match(patch, /Math\.floor\(Number\(summon\.hp\|\|10\)\+Math\.max\(0,Number\(summon\.hp_bonus\|\|0\)\)\)/);
  assert.doesNotMatch(patch, /hp_bonus\|\|0\)\)\*\.5/);
  assert.match(patch, /updateSummonHp\(activeSummon\.id,delta,configuredMaxHp\)/);
  assert.match(patch, /wasFull&&maxHp>Number\(current\.maxHp\|\|1\)/);
});

test('necromancer can freely edit VC, use actions and store the released summon', () => {
  assert.match(patch, /adjustVc\(-1\)/);
  assert.match(patch, /adjustVc\(1\)/);
  assert.match(patch, /const storeSummon=useCallback/);
  assert.match(patch, /active:false,storedAt:now/);
  assert.match(patch, /summon-store-button/);
  assert.match(patch, /'Guardar'/);
});
