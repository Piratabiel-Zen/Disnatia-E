import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createTokenOutbox, resolveTokenRoster, tokenChanges, tokenRecordId } from '../src/adventure/tokenPersistence.mjs';

test('only changed fields are saved and omitted tokens are never implicit deletes', () => {
  const before = [{ id: 1, foto: 'large-photo', x: 1, hp: 20 }, { id: 2, hp: 10 }];
  assert.deepEqual(tokenChanges(before, [{ ...before[0], x: 9 }]), [{ id: 1, x: 9 }]);
  assert.deepEqual(tokenChanges(before, []), []);
  assert.notEqual(tokenRecordId('a:b', 'c'), tokenRecordId('a', 'b:c'));
});

test('late acknowledgements do not remove a newer local mutation', async () => {
  const outbox = createTokenOutbox();
  let release;
  const writes = [];
  const write = async (key, record) => {
    writes.push(record);
    if (writes.length === 1) await new Promise(resolve => { release = resolve; });
  };
  const first = outbox.enqueue('m', 1, { id: 1, foto: 'photo', x: 1 }, false, write);
  const second = outbox.enqueue('m', 1, { id: 1, x: 9 }, false, write);
  outbox.acknowledge(writes[0]);
  assert.equal(outbox.operations('m')[0].token.x, 9);
  release();
  await Promise.all([first, second]);
  assert.equal(writes.length, 2);
  outbox.acknowledge(writes[1]);
  assert.equal(outbox.status('m').count, 0);
});

test('failed and offline additions remain visible through stale snapshots and route changes', async () => {
  const outbox = createTokenOutbox();
  let fails = true;
  const write = async () => { if (fails) throw new Error('offline'); };
  await assert.rejects(outbox.enqueue('m', 2, { id: 2, foto: 'image', x: 50 }, false, write));
  const oldRoster = [{ id: 1, x: 10 }];
  for (let index = 0; index < 20; index++) {
    assert.deepEqual(resolveTokenRoster(oldRoster, [], outbox.operations('m')).map(token => token.id), [1, 2]);
  }
  assert.equal(outbox.status('m').failed, true);
  fails = false; await outbox.retry('m');
  assert.equal(outbox.status('m').count, 0); // Retry resolved after server acceptance.
});

test('explicit deletion wins over stale legacy rosters and late movement', () => {
  const legacy = [{ id: 1, foto: 'a' }, { id: 2, foto: 'b' }];
  const records = [{ tokenId: '2', token: { id: 2, x: 3 }, deleted: true }];
  assert.deepEqual(resolveTokenRoster(legacy, records, [{ tokenId: '2', token: { id: 2, x: 8 } }]), [legacy[0]]);
});

test('generated writer supports a roster larger than 1 MiB without a map-sized document', async () => {
  const file = '.generated/src/features/mapa-batalha/BattleMapPage.jsx';
  assert.ok(fs.existsSync(file), 'Run the production build before tests');
  const source = fs.readFileSync(file, 'utf8');
  const start = source.indexOf('  const writeLiveTokens = async');
  const end = source.indexOf('  const writeLivePosition', start);
  const outbox = createTokenOutbox();
  const documents = new Map();
  const runTransaction = async (_, action) => action({
    get: async key => ({ exists: () => documents.has(key), data: () => documents.get(key) }),
    set: (key, record) => {
      const prior = documents.get(key) || {};
      const merged = { ...prior, ...record, token: { ...prior.token, ...record.token } };
      if (Buffer.byteLength(JSON.stringify(merged)) > 1048576) throw new Error('document exceeds 1 MiB');
      documents.set(key, merged);
      outbox.acknowledge(merged);
    },
  });
  const tokens = Array.from({ length: 30 }, (_, id) => ({ id, nome: `Enemy ${id}`, foto: 'data:image/png;base64,' + 'a'.repeat(80000), x: id, hp: 10 }));
  assert.ok(Buffer.byteLength(JSON.stringify({ tokens })) > 1048576);
  const writer = new Function('tokenOutbox', 'runTransaction', 'db', 'doc', 'mapTokensRef', 'pushToast', 'localLeaseRef', 'liveClientIdRef', source.slice(start, end) + 'return writeLiveTokens;')
    (outbox, runTransaction, {}, (_, collection, key) => key, { current: { m: tokens } }, () => {}, {current:null}, {current:'test'});
  await writer('m', tokens, true);
  assert.equal(documents.size, 30);
  await writer('m', [{ id: 1, x: 70 }], true);
  assert.equal(documents.get(tokenRecordId('m', 1)).token.foto, tokens[1].foto);
  await writer('m', [], true, ['1']);
  await writer('m', [{ id: 1, x: 99 }], true);
  const records = [...documents.values()];
  assert.equal(resolveTokenRoster(tokens, records).length, 29);
  assert.equal(resolveTokenRoster(tokens, records).some(token => token.id === 1), false);
});

test('generated canonical receiver keeps both clients consistent despite stale legacy lists', async () => {
  const source = fs.readFileSync('.generated/src/features/mapa-batalha/BattleMapPage.jsx', 'utf8');
  const start = source.indexOf('    const u1b = liveSnapshot(');
  const end = source.indexOf('    // Canal leve de sincronização ao vivo.', start);
  assert.ok(start > 0 && end > start);
  const createClient = () => {
    let receive;
    let state = {};
    const outbox = createTokenOutbox();
    const ref = { current: {} };
    const attach = new Function('liveSnapshot', 'collection', 'db', 'tokenOutbox', 'resolveTokenRoster', 'mergeIncomingTokenState', 'setMapTokens', 'mapTokensRef', 'canonicalRosterReadyRef', source.slice(start, end));
    attach((_, options, callback) => { receive = callback; return () => {}; }, () => {}, {}, outbox, resolveTokenRoster, (_, tokens) => tokens, update => { state = update(state); }, ref, {current:false});
    return { outbox, snapshot: rows => receive({ docs: rows.map(([id, data]) => ({ id, data: () => data, metadata: { hasPendingWrites: false, fromCache: false } })) }), roster: () => resolveTokenRoster(state.m || [], [], outbox.operations('m')) };
  };
  const a = createClient(), b = createClient();
  const old = ['m', { tokens: [{ id: 1, foto: 'old', x: 1 }] }];
  for (const client of [a, b]) client.snapshot([old]);
  const added = ['new', { recordType: 'token-v2', mapId: 'm', tokenId: '2', token: { id: 2, foto: 'new', x: 50 } }];
  for (let index = 0; index < 15; index++) {
    for (const client of [a, b]) {
      client.snapshot([old, added]);
      assert.deepEqual(client.roster().map(token => token.id), [1, 2]);
    }
  }
  await assert.rejects(a.outbox.enqueue('m', 3, { id: 3, foto: 'pending' }, false, async () => { throw new Error('offline'); }));
  a.snapshot([old, added]);
  assert.deepEqual(a.roster().map(token => token.id), [1, 2, 3]);
  const deleted = ['new', { ...added[1], deleted: true }];
  for (const client of [a, b]) client.snapshot([old, deleted]);
  assert.deepEqual(b.roster().map(token => token.id), [1]);
  assert.deepEqual(a.roster().map(token => token.id), [1, 3]);
});

test('token identity comes from its record, while separate instances of the same enemy stay separate',()=>{
  const legacy=[{id:'a',enemyId:'glass',nome:'Vidro'},{id:'b',enemyId:'glass',nome:'Vidro'}];
  const result=resolveTokenRoster(legacy,[{tokenId:'a',token:{id:'b',hp:7}}]);
  assert.deepEqual(result.map(token=>token.id),['a','b']);
  assert.equal(result[0].hp,7);
  assert.equal(resolveTokenRoster(legacy,[],[{tokenId:'a',token:{id:'b',hp:5}}])[0].id,'a');
});

test('authoritative snapshots replace boot ghosts and do not resurrect deleted or absent instances',async()=>{
  const source=fs.readFileSync('.generated/src/features/mapa-batalha/BattleMapPage.jsx','utf8');
  const start=source.indexOf('    const u1b = liveSnapshot('),end=source.indexOf('    // Canal leve de sincronização ao vivo.',start);
  const clients=Array.from({length:7},()=>{
    let receive,state={m:[{id:'ghost',nome:'Old boot copy'}]};const ref={current:state},outbox=createTokenOutbox();
    new Function('liveSnapshot','collection','db','tokenOutbox','resolveTokenRoster','mergeIncomingTokenState','setMapTokens','mapTokensRef','canonicalRosterReadyRef',source.slice(start,end))
      ((_,options,callback)=>{receive=callback;return()=>{};},()=>{}, {},outbox,resolveTokenRoster,(_,tokens)=>tokens,update=>{state=update(state);},ref,{current:false});
    return {outbox,roster:()=>state.m,snapshot:(rows,cached=false)=>receive({metadata:{fromCache:cached},docs:rows.map(([id,data])=>({id,data:()=>data,metadata:{hasPendingWrites:false,fromCache:cached}}))})};
  });
  const roster=Array.from({length:8},(_,id)=>({id:String(id),enemyId:id<6?'glass':'vampire',nome:id<6?'Vidro':'Vampiro',x:id*8,y:50}));
  const legacy=['m',{tokens:roster}];
  for(const client of clients){
    client.snapshot([legacy]);assert.deepEqual(client.roster(),roster);
    client.snapshot([['m',{tokens:[]}]],true);assert.equal(client.roster().length,8);
    client.snapshot([legacy,['v2',{recordType:'token-v2',mapId:'m',tokenId:'4',token:{id:'4'},deleted:true}]]);
    assert.equal(client.roster().length,7);assert.ok(!client.roster().some(t=>t.id==='4'));
    client.snapshot([]);assert.deepEqual(client.roster(),[]);
  }
  await assert.rejects(clients[0].outbox.enqueue('m','pending',{id:'pending',nome:'New instance'},false,async()=>{throw Error('offline');}));
  clients[0].snapshot([]);assert.deepEqual(clients[0].roster().map(t=>t.id),['pending']);
});

test('a rapid double activation of the library creates one token; later intentional additions stay distinct',async()=>{
  const source=fs.readFileSync('.generated/src/features/mapa-batalha/BattleMapPage.jsx','utf8');
  const start=source.indexOf('  const addLibraryToken = async (tpl) => {'),end=source.indexOf('  const deleteLibraryToken',start);
  let release,state={},selected;const writes=[],ref={current:{m:[]}};
  const add=new Function('currentMap','addingLibraryTokenRef','initializeEnemyToken','newToken','enemyTemplateForToken','mapTokensRef','setMapTokens','writeLiveTokens','setSelectedId','setShowTokenLibrary',source.slice(start,end)+'return addLibraryToken;')
    ({id:'m',tokens:[]},{current:false},token=>token,id=>({id}),()=>({}),ref,fn=>{state=fn(state);},async(mapId,tokens)=>{writes.push(tokens);if(writes.length===1)await new Promise(resolve=>{release=resolve;});},id=>{selected=id;},()=>{});
  const first=add({nome:'Vampiro',enemyId:'vampire'});await add({nome:'Vampiro',enemyId:'vampire'});
  assert.equal(writes.length,1);assert.equal(state.m.length,1);assert.equal(selected,state.m[0].id);
  release();await first;await add({nome:'Vampiro',enemyId:'vampire'});
  assert.equal(writes.length,2);assert.equal(state.m.length,2);assert.notEqual(state.m[0].id,state.m[1].id);
});
