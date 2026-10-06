import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleSheets,ownsVisitorSheet,passwordRecord,verifyVisitorPassword} from '../src/adventure/visitorAccess.mjs';
const rows=[{id:'regular'},{id:'a1',audience:'visitor',visitorId:'a'},{id:'a2',visitorId:'a'},{id:'b',audience:'visitor',visitorId:'b'}];
test('visitor sees every owned character and no regular or other visitor sheets',()=>{
 const access={role:'visitor',visitorId:'a'};
 assert.deepEqual(visibleSheets(rows,access).map(sheet=>sheet.id),['a1','a2']);
 assert.equal(ownsVisitorSheet(rows[0],access),false);
 assert.equal(ownsVisitorSheet(rows[3],access),false);
 assert.equal(ownsVisitorSheet(rows[2],access),true);
 assert.deepEqual(visibleSheets(rows,{role:'player'}).map(sheet=>sheet.id),['regular']);
 assert.deepEqual(visibleSheets(rows,{role:'master'},true),rows);
 assert.deepEqual(visibleSheets(rows,{role:'visitor'}),[]);
});
test('visitor passwords are salted, case sensitive and never stored as plaintext',async()=>{
 const first=await passwordRecord('Senha123');const second=await passwordRecord('Senha123');
 assert.notEqual(first.hash,second.hash);assert.equal(JSON.stringify(first).includes('Senha123'),false);
 assert.equal(await verifyVisitorPassword('Senha123',first),true);
 assert.equal(await verifyVisitorPassword('senha123',first),false);
 assert.equal(await verifyVisitorPassword('',{}),false);
});
