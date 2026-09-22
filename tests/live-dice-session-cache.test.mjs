import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveSnapshotGate, isNewLiveDocument } from '../src/experience/liveDiceGate.js';
import {
  mergeSessionContext, readSessionCache, writeSessionCache,
} from '../src/adventure/sessionCache.js';

test('dice snapshots become live only after an authoritative baseline', () => {
  const gate = createLiveSnapshotGate();
  assert.equal(gate.shouldDeliver({ fromCache: true }), false);
  assert.equal(gate.shouldDeliver({ fromCache: false }), false);
  assert.equal(gate.shouldDeliver({ fromCache: false }), true);
  assert.equal(isNewLiveDocument({ type: 'added' }), true);
  assert.equal(isNewLiveDocument({ type: 'modified' }), false);
});

test('a reconnect creates a new silent baseline instead of replaying missed rolls', () => {
  const gate = createLiveSnapshotGate();
  gate.shouldDeliver({ fromCache: false });
  assert.equal(gate.shouldDeliver({ fromCache: false }), true);
  assert.equal(gate.shouldDeliver({ fromCache: true }), false);
  assert.equal(gate.shouldDeliver({ fromCache: false }), false);
  assert.equal(gate.shouldDeliver({ fromCache: false }), true);
});

test('session context is immediately recoverable from a compact browser cache', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  const live = mergeSessionContext({}, {
    active: true,
    title: 'Ecos de Cosmum',
    location: 'Pequeninis',
    objective: 'Encontrar o portal',
    partyFocus: { tab: 'session' },
    updatedAt: 42,
  });
  writeSessionCache(live, storage);
  const restored = readSessionCache(storage);
  assert.equal(restored.location, 'Pequeninis');
  assert.equal(restored.active, true);
  assert.equal(restored.updatedAt, 42);
  assert.equal('partyFocus' in restored, false);
});
