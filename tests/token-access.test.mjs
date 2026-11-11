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
