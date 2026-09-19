import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnapshotPool } from '../src/adventure/snapshotPool.js';
import { prepareDecision, recordVote, resolveDecision, focusDestination } from '../src/adventure/sessionModel.js';

const tick = () => new Promise(resolve => queueMicrotask(resolve));
function transport() {
  const listeners = [];
  const listen = createSnapshotPool((ref, options, next, error) => {
    const row = { ref, options, next, error, closed: 0 }; listeners.push(row);
    return () => { row.closed++; };
  }, (a, b) => a.path === b.path);
  return { listeners, listen };
}

test('six consumers share one transport and each receives live updates', async () => {
  const { listeners, listen } = transport(); const results = Array.from({ length: 6 }, () => []);
  const stop = results.map(list => listen({ path: 'config/combat' }, snap => list.push(snap)));
  assert.equal(listeners.length, 1);
  listeners[0].next({ round: 2 });
  results.forEach(list => assert.deepEqual(list, [{ round: 2 }]));
  stop.slice(0, 5).forEach(fn => fn()); await tick(); assert.equal(listeners[0].closed, 0);
  stop[5](); await tick(); assert.equal(listeners[0].closed, 1);
});

test('StrictMode cleanup/remount reuses transport, without stale cached delivery', async () => {
  const { listeners, listen } = transport();
  const stop = listen({ path: 'config/session' }, () => {});
  listeners[0].next({ revision: 1 }); stop();
  const received = []; const stop2 = listen({ path: 'config/session' }, snap => received.push(snap));
  listeners[0].next({ revision: 2 }); await tick();
  assert.equal(listeners.length, 1); assert.deepEqual(received, [{ revision: 2 }]);
  stop2(); await tick(); assert.equal(listeners[0].closed, 1);
});

test('different query identities and metadata options never share an incorrect stream', () => {
  const { listeners, listen } = transport();
  listen({ path: 'a' }, () => {}); listen({ path: 'b' }, () => {});
  listen({ path: 'a' }, { includeMetadataChanges: true }, () => {});
  assert.equal(listeners.length, 3);
});

test('listener failure reaches all consumers and allows a fresh retry', () => {
  const { listeners, listen } = transport(); const errors = [];
  listen({ path: 'a' }, () => {}, e => errors.push(e));
  listen({ path: 'a' }, () => {}, e => errors.push(e));
  listeners[0].error(new Error('offline'));
  assert.equal(errors.length, 2); listen({ path: 'a' }, () => {}); assert.equal(listeners.length, 2);
});

test('decision validation rejects duplicate-only options and limits payload', () => {
  assert.throws(() => prepareDecision('Portão?', 'Entrar\nEntrar', 'a'));
  const decision = prepareDecision('x'.repeat(400), 'a\nb\nc\nd\ne\nf\ng', 'a');
  assert.equal(decision.question.length, 240); assert.equal(decision.options.length, 6);
});

test('six votes merge against the latest state; a revote counts once', () => {
  let state = prepareDecision('Caminho?', 'Norte\nSul', 'a');
  for (let i = 0; i < 6; i++) state = { ...state, votes: recordVote(state, 'a', `player-${i}`, String(i % 2)) };
  state.votes = recordVote(state, 'a', 'player-0', '1');
  assert.equal(Object.keys(state.votes).length, 6);
  assert.equal(Object.values(state.votes).filter(x => x === '1').length, 4);
});

test('stale votes and repeated resolutions cannot affect a closed or replacement decision', () => {
  const state = prepareDecision('Caminho?', 'Norte\nSul', 'a');
  assert.throws(() => recordVote(state, 'old', 'p', '0'));
  assert.throws(() => recordVote(state, 'a', 'p', '9'));
  const result = resolveDecision(state, 'a', '0');
  assert.equal(result.text, 'Caminho? → Norte');
  assert.throws(() => recordVote({ ...state, ...result }, 'a', 'p', '1'));
  assert.throws(() => resolveDecision({ ...state, ...result }, 'a', '0'));
});

test('shared focus respects mobile exclusions and rejects unknown/private destinations', () => {
  assert.equal(focusDestination({ tab: 'mapabatalha' }, true), 'session');
  assert.equal(focusDestination({ tab: 'mapabatalha' }, false), 'mapabatalha');
  assert.equal(focusDestination({ tab: 'cronicas' }, true), 'cronicas');
  assert.equal(focusDestination({ tab: 'inimigos' }, false), null);
});
