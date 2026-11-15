import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLiveSnapshotGate, isNewLiveDocument } from '../src/experience/liveDiceGate.js';

const kit = fs.readFileSync(new URL('../src/experience/ExperienceKit.jsx', import.meta.url), 'utf8');
const sheets = fs.readFileSync(new URL('../src/features/sheets/SheetComponents.jsx', import.meta.url), 'utf8');
const replay = fs.readFileSync(new URL('../src/experience/SharedDiceReplay.jsx', import.meta.url), 'utf8');
const broadcasts = fs.readFileSync(new URL('../src/experience/RealtimeBroadcasts.jsx', import.meta.url), 'utf8');
const patch = kit + '\n' + sheets + '\n' + replay + '\n' + broadcasts;

test('historical snapshots are silent and new dice do not depend on the device clock', () => {
  const gate = createLiveSnapshotGate();
  assert.equal(gate.shouldDeliver({ fromCache:true }), false);
  assert.equal(gate.shouldDeliver({ fromCache:false }), false);
  assert.equal(gate.shouldDeliver({ fromCache:false }), true);
  assert.equal(isNewLiveDocument({ type:'added', doc:{ ts:1 } }), true);
  assert.equal(isNewLiveDocument({ type:'modified' }), false);
  const realtimePatch = replay;
  assert.match(realtimePatch, /createLiveSnapshotGate\(\)/);
  assert.match(realtimePatch, /isNewLiveDocument\(change\)/);
  assert.doesNotMatch(patch, /isLiveDicePayload\(payload/);
  assert.match(patch, /slice\(-5\)/);
});

test('summons require a master reveal and expose HP, actions and editable three VC', () => {
  assert.match(patch, /summon\.revealed!==true/);
  assert.match(patch, /Revelar/);
  assert.match(patch, /Liberar/);
  assert.match(patch, /maxVigos:3/);
  assert.match(patch, /const updateSummonHp=useCallback/);
  assert.match(patch, /const updateSummonVc=useCallback/);
  assert.match(patch, /const useSummonAction=useCallback/);
});

test('a revealed summon can be released outside combat and persists for future initiative', () => {
  assert.doesNotMatch(patch, /summon\.revealed!==true\|\|!combat\?\.active/);
  assert.match(patch, /const canRelease=Boolean\(!activeSummon&&!busy\)/);
  assert.match(patch, /Autorizada pelo Mestre\. Pode ser liberada agora/);
  assert.match(patch, /collection\(db,'combat_summons'\)/);
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
