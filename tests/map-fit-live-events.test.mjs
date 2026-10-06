import test from 'node:test';
import assert from 'node:assert/strict';
import { fitMapWithReference } from '../src/adventure/mapFit.mjs';
import { createLiveEventGate } from '../src/adventure/liveEventGate.mjs';

test('map-relative token proportion survives fullscreen, zoom and exit', () => {
  for (const natural of [{w:1600,h:600},{w:600,h:1600}]) {
    const normal={w:1080,h:530};
    const base=fitMapWithReference(natural,normal,normal);
    const expanded=fitMapWithReference(natural,{w:1920,h:1080},normal);
    for (const zoom of [1,1.25,3]) {
      const tokenWidth=70*zoom*(expanded.w/expanded.normalW);
      assert.ok(Math.abs(tokenWidth/(expanded.w*zoom)-70/base.w)<1e-12);
    }
    assert.deepEqual(fitMapWithReference(natural,normal,normal),base);
  }
});

test('cache, empty cache, initial server history and metadata do not replay', () => {
  for(const cached of [[],[{key:'old',value:{ts:Date.now()+86400000}}]]) {
    const gate=createLiveEventGate();
    const server={metadata:{fromCache:false}},cache={metadata:{fromCache:true}};
    const old={key:'old',value:{ts:0}},live={key:'new',value:{ts:0}};
    assert.deepEqual(gate(cache,cached),[]);
    assert.deepEqual(gate(server,[old]),[]);
    assert.deepEqual(gate(server,[old]),[]);
    assert.deepEqual(gate(cache,[old,live]),[]);
    assert.deepEqual(gate(server,[old,live]),[live]);
    assert.deepEqual(gate(server,[old,live]),[]);
    assert.deepEqual(gate(server,[]),[]);
    assert.deepEqual(gate(server,[old]),[]);
  }
});

test('an initially absent event document receives a subsequent live action', () => {
  const gate=createLiveEventGate(),server={metadata:{fromCache:false}};
  assert.deepEqual(gate(server,[]),[]);
  const entry={key:'fresh',value:{}};
  assert.deepEqual(gate(server,[entry]),[entry]);
});
