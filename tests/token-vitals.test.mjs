import test from 'node:test';
import assert from 'node:assert/strict';
import {enemyTokenVitals,initializeEnemyToken,hasIndividualHp} from '../src/adventure/tokenVitals.mjs';
test('six enemy instances freeze independent health without changing their template',()=>{
 const template={hp:35,maxHp:40};
 const tokens=Array.from({length:6},(_,id)=>initializeEnemyToken({id,enemyId:'same',tipo:'inimigo',hp:0,maxHp:0},template));
 tokens[0]={...tokens[0],hp:12};
 assert.deepEqual(tokens.map(token=>enemyTokenVitals(token,{hp:1,maxHp:2}).hp),[12,35,35,35,35,35]);
 assert.deepEqual(template,{hp:35,maxHp:40});assert.equal(enemyTokenVitals(tokens[0],template).maxHp,40);
});
test('legacy manual HP, dead enemies and templates with zero HP are preserved',()=>{
 const token=initializeEnemyToken({id:'old',enemyId:'same',hp:0,maxHp:22},{hp:30,maxHp:30});
 assert.equal(token.hp,0);assert.equal(token.maxHp,22);
 assert.equal(initializeEnemyToken({enemyId:'same',hp:0,maxHp:0},{hp:0,maxHp:40}).hp,0);
 assert.equal(initializeEnemyToken(token,{hp:50,maxHp:50}),token);
 assert.equal(enemyTokenVitals({...token,hp:Infinity},null).hp,0);
});
test('player sheets stay linked, enemy tokens based on player sheets get independent health',()=>{
 assert.equal(hasIndividualHp({tipo:'jogador',sheetId:'player'}),false);
 const player={tipo:'jogador',sheetId:'player'};assert.equal(initializeEnemyToken(player,{hp:20,maxHp:30}),player);
 assert.equal(initializeEnemyToken({tipo:'inimigo',sheetId:'npc'},{hp:20,maxHp:30}).hp,20);
 const missing={enemyId:'not-loaded',hp:0,maxHp:0};assert.equal(initializeEnemyToken(missing,null),missing);
});
