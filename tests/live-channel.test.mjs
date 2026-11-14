import test from 'node:test';
import assert from 'node:assert/strict';
import { __resetLiveChannelForTests, liveChannelReady, liveChannelConnected, publishTokenMotion, subscribeTokenMotion, publishPing, subscribePing } from '../src/core/liveChannel.js';

// SDK falso: guarda os valores por caminho e dispara onValue como o Realtime Database.
function fakeSdk({ connect = true } = {}) {
  const values = new Map();
  const watchers = new Map();
  const emit = path => { for (const cb of watchers.get(path) || []) cb({ val: () => values.get(path) ?? null }); };
  const setValue = (path, value) => {
    values.set(path, value);
    emit(path);
    const parent = path.split('/').slice(0, -1).join('/');
    if (parent) { const tree = {}; for (const [k, v] of values) if (k.startsWith(parent + '/')) tree[k.slice(parent.length + 1)] = v; values.set(parent, tree); emit(parent); }
  };
  const sdk = {
    getDatabase: () => ({}),
    ref: (_, path) => ({ path }),
    serverTimestamp: () => 1000,
    onValue: (ref, cb) => { if (!watchers.has(ref.path)) watchers.set(ref.path, new Set()); watchers.get(ref.path).add(cb); queueMicrotask(() => cb({ val: () => values.get(ref.path) ?? null })); return () => watchers.get(ref.path).delete(cb); },
    set: async (ref, value) => setValue(ref.path, value),
    remove: async ref => { values.delete(ref.path); emit(ref.path); },
  };
  values.set('.info/connected', connect);
  return { sdk, values, setValue };
}

test('conecta e publica pelo canal vivo quando o banco responde', async () => {
  const fake = fakeSdk();
  __resetLiveChannelForTests(async () => fake.sdk);
  assert.equal(await liveChannelReady(200), true);
  assert.equal(liveChannelConnected(), true);
  assert.equal(await publishTokenMotion('m', 't1', { x: 10, y: 20, seq: 1, clientId: 'a' }), true);
  assert.deepEqual(fake.values.get('live/maps/m/tokens/t1'), { x: 10, y: 20, seq: 1, clientId: 'a', updatedAt: 1000 });
});

test('cai no Firestore quando o banco não conecta a tempo', async () => {
  const fake = fakeSdk({ connect: false });
  __resetLiveChannelForTests(async () => fake.sdk);
  assert.equal(await liveChannelReady(50), false);
  assert.equal(await publishTokenMotion('m', 't1', { x: 1, y: 1 }), false);
  assert.equal(await publishPing({ id: 'p1' }), false);
});

test('cai no Firestore quando o SDK não carrega', async () => {
  __resetLiveChannelForTests(async () => { throw new Error('sem rede'); });
  assert.equal(await liveChannelReady(200), false);
  assert.equal(liveChannelConnected(), false);
});

test('o estado já gravado é ignorado e cada versão nova chega uma única vez', async () => {
  const fake = fakeSdk();
  __resetLiveChannelForTests(async () => fake.sdk);
  await liveChannelReady(200);
  fake.setValue('live/maps/m/tokens/stale', { x: 5, y: 5, seq: 3, clientId: 'b', updatedAt: 1 });
  const received = [];
  const stop = subscribeTokenMotion('m', (tokenId, data) => received.push([tokenId, data.x, data.seq]));
  await new Promise(r => setTimeout(r, 10));
  assert.deepEqual(received, []); // posição antiga não sobrescreve a canônica do Firestore
  await publishTokenMotion('m', 't1', { x: 40, y: 1, seq: 1, clientId: 'a' });
  await publishTokenMotion('m', 't1', { x: 41, y: 1, seq: 2, clientId: 'a' });
  await publishTokenMotion('m', 't1', { x: 41, y: 1, seq: 2, clientId: 'a' }); // repetição idêntica
  await new Promise(r => setTimeout(r, 10));
  assert.deepEqual(received, [['t1', 40, 1], ['t1', 41, 2]]);
  stop();
  await publishTokenMotion('m', 't1', { x: 99, y: 1, seq: 3, clientId: 'a' });
  await new Promise(r => setTimeout(r, 10));
  assert.equal(received.length, 2);
});

test('pings: o último ping gravado não é reexibido ao entrar no mapa', async () => {
  const fake = fakeSdk();
  __resetLiveChannelForTests(async () => fake.sdk);
  await liveChannelReady(200);
  fake.setValue('live/ping', { id: 'old', mapId: 'm' });
  const seen = [];
  subscribePing(ping => seen.push(ping.id));
  await new Promise(r => setTimeout(r, 10));
  assert.deepEqual(seen, []);
  await publishPing({ id: 'novo', mapId: 'm', x: 1, y: 2 });
  await new Promise(r => setTimeout(r, 10));
  assert.deepEqual(seen, ['novo']);
});
