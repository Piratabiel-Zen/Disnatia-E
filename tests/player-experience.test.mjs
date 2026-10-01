import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePreferences, abilityAvailability } from '../src/adventure/playerPreferences.mjs';
import { createSyncState } from '../src/adventure/syncState.mjs';
import { createLeaseTracker } from '../src/adventure/tokenLease.mjs';

test('local preferences clamp volume and reject invalid or corrupted choices', () => {
  assert.deepEqual(normalizePreferences({ effects: 'broken', textSize: 'large', music: 900, ambience: -20, interface: 'x' }), { effects: 'normal', textSize: 'large', music: 100, ambience: 0, interface: 40 });
});
test('mouse and shortcuts share level, turn, cooldown, resource and busy constraints', () => {
  const skill = { id: 'fire', cost: 3, req: 2 };
  const sheet = { nivel: 2, vigos: 3 };
  assert.equal(abilityAvailability(skill, sheet, { combat: true, myTurn: false }), 'Aguarde seu turno');
  assert.equal(abilityAvailability(skill, sheet, { busy: true }), 'Enviando ação');
  assert.equal(abilityAvailability(skill, { ...sheet, cooldowns: { fire: 2 } }), 'Em recarga: 2 turno(s)');
  assert.equal(abilityAvailability(skill, { ...sheet, vigos: 2 }), 'VC insuficiente');
  assert.equal(abilityAvailability({ ...skill, tipoHab: 'passiva' }, sheet), 'Habilidade passiva');
  assert.equal(abilityAvailability(skill, sheet), '');
});
test('connection stays pending until every active source acknowledges, and disposes errors', () => {
  const sync = createSyncState();
  sync.update('sheet', { pending: true }); sync.update('map', { pending: true });
  assert.equal(sync.getSnapshot().pending, 2);
  sync.update('sheet', { pending: false }); assert.equal(sync.getSnapshot().state, 'saving');
  sync.update('map', { pending: false }); assert.equal(sync.getSnapshot().state, 'live');
  sync.update('map', { error: 'permission-denied' }); assert.equal(sync.getSnapshot().state, 'error');
  sync.remove('map'); assert.equal(sync.getSnapshot().state, 'live');
});
test('token control expires without clock synchronization and duplicate snapshots cannot renew it', () => {
  let elapsed = 0; const leases = createLeaseTracker(() => elapsed);
  const row = { clientId: 'player-a', name: 'Jack', active: true, version: 'a1', updatedAt: 99999999999999 };
  leases.observe('map:token', row); assert.equal(leases.owner('map:token', 'player-b').name, 'Jack');
  assert.equal(leases.owner('map:token', 'player-a'), null);
  elapsed = 5000; leases.observe('map:token', row); elapsed = 6501;
  assert.equal(leases.owner('map:token', 'player-b'), null);
  leases.observe('map:token', { ...row, version: 'a2' }); assert.ok(leases.owner('map:token', 'player-b'));
  leases.observe('map:token', { ...row, active: false }); assert.equal(leases.owner('map:token', 'player-b'), null);
});
