import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLiveEventGate } from '../src/adventure/liveEventGate.mjs';

const provider = fs.readFileSync(new URL('../src/runtime/experience/ExperienceProvider.jsx', import.meta.url), 'utf8');
const player = fs.readFileSync(new URL('../src/runtime/experience/PlayerExperience.jsx', import.meta.url), 'utf8');
const bridge = fs.readFileSync(new URL('../src/experience/AbilityFeedbackBridge.jsx', import.meta.url), 'utf8');

test('high-churn broadcasts write per-event records instead of hot shared documents', () => {
  for (const source of [provider, player, bridge]) {
    assert.doesNotMatch(source, /config['\"]\s*,\s*['\"](?:cosmic_event|combat_action)['\"]/);
  }
  assert.match(provider, /collection\(db,'combat_action_events'\).*limit\(30\)/s);
});

test('twenty simultaneous unique actions all pass the first live collection update', () => {
  const gate = createLiveEventGate();
  const server = { metadata: { fromCache: false } };
  assert.deepEqual(gate(server, []), []);
  const events = Array.from({ length: 20 }, (_, i) => ({
    key: `action_${i}`,
    value: { id: `action_${i}`, ts: 1234, abilityName: `Action ${i}` },
  }));
  assert.deepEqual(gate(server, events), events);
  assert.deepEqual(gate(server, events), []);
});
