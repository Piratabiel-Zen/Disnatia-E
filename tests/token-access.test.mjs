import test from 'node:test';
import assert from 'node:assert/strict';
import { canControlToken } from '../src/adventure/tokenAccess.mjs';

test('only the assigned character can move an unlocked token, while the master can move every token', () => {
  const owned = { id:'kenai-token', sheetId:'kenai', controllerSheetId:'kenai' };
  assert.equal(canControlToken(owned,{sheetId:'kenai'}),true);
  assert.equal(canControlToken(owned,{sheetId:'ignacio'}),false);
  assert.equal(canControlToken({id:'manual'}, {sheetId:'kenai'}),false);
  assert.equal(canControlToken({id:'locked',sheetId:'kenai',locked:true},{sheetId:'kenai'}),false);
  assert.equal(canControlToken({id:'locked',locked:true},{masterMode:true}),true);
});

test('legacy linked player tokens inherit their linked sheet as controller', () => {
  assert.equal(canControlToken({ id:'legacy', sheetId:'kenai' }, { sheetId:'kenai' }), true);
});

test('visitor may move tokens assigned to any of their own character sheets only', () => {
  const visitorSheets = new Set(['guest-char-1', 'guest-char-2']);
  assert.equal(canControlToken({ id:'guest-token', controllerSheetId:'guest-char-2' }, { sheetIds:visitorSheets }), true);
  assert.equal(canControlToken({ id:'other-token', controllerSheetId:'other-visitor-char' }, { sheetIds:visitorSheets }), false);
  assert.equal(canControlToken({ id:'unassigned-token' }, { sheetIds:visitorSheets }), false);
});
