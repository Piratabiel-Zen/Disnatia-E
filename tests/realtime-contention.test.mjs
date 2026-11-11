import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createLiveEventGate } from '../src/adventure/liveEventGate.mjs';

const provider = fs.readFileSync(new URL('../src/runtime/experience/ExperienceProvider.jsx', import.meta.url), 'utf8');
const player = fs.readFileSync(new URL('../src/runtime/experience/PlayerExperience.jsx', import.meta.url), 'utf8');
const bridge = fs.readFileSync(new URL('../src/experience/AbilityFeedbackBridge.jsx', import.meta.url), 'utf8');
const session = fs.readFileSync(new URL('../src/runtime/AuthenticatedSession.jsx', import.meta.url), 'utf8');
const playerExperience = fs.readFileSync(new URL('../src/runtime/experience/PlayerExperience.jsx', import.meta.url), 'utf8');
const legacyExperienceLayer = fs.readFileSync(new URL('../src/experience/GameExperience3.jsx', import.meta.url), 'utf8');
const effects = fs.readFileSync(new URL('../src/experience/realtime.css', import.meta.url), 'utf8');

test('high-churn broadcasts write per-event records instead of hot shared documents', () => {
  for (const source of [provider, player, bridge]) {
    assert.doesNotMatch(source, /config['\"]\s*,\s*['\"](?:cosmic_event|combat_action)['\"]/);
  }
  assert.match(provider, /collection\(db,'combat_action_events'\).*limit\(30\)/s);
  assert.doesNotMatch(session, /SessionConnection|session-connection/);
  assert.doesNotMatch(playerExperience, /collection\(db,'presence'\)|dinastia_presence_tab|Jogadores online/);
  assert.doesNotMatch(legacyExperienceLayer, /collection\(db,'presence'\)|dinastia_presence_tab|Jogadores online|PresenceStrip/);
  assert.match(playerExperience, /panel==='inventory'\?onSnapshot\(collection\(db,'campaign_items'\)/);
  assert.match(legacyExperienceLayer, /panel==='inventory'\?onSnapshot\(collection\(db,'campaign_items'\)/);
  for (const kind of ['normal','especial','combinada']) assert.match(effects, new RegExp(`action-${kind}`));
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
