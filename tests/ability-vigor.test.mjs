import test from 'node:test';
import assert from 'node:assert/strict';
import {characterMaxVigor} from '../src/adventure/characterResources.mjs';
import {abilityType,replaceCustomAbility} from '../src/adventure/abilityPresentation.mjs';
test('Vigor keeps levels 8 and 18 and adds the third point at 23',()=>{
 for(const [nivel,cap] of [[1,5],[7,5],[8,6],[17,6],[18,7],[22,7],[23,8],[30,8]])assert.equal(characterMaxVigor({nivel}),cap);
 assert.equal(characterMaxVigor({nivel:'23',vigos_max:90}),8);
});
test('Editing keeps identity, cooldown key, custom metadata and other abilities',()=>{
 const original=[{id:123,nome:'Antiga',tipoHab:'normal',lore:'Original'},{id:2,nome:'Outra'}];
 const next=replaceCustomAbility(original,{...original[0],nome:' Nova ',custo:3,req:23,tipoHab:'especial'},'123');
 assert.equal(next.length,2);assert.equal(next[0].id,123);assert.equal(next[0].nome,'Nova');assert.equal(next[0].lore,'Original');assert.deepEqual(next[1],original[1]);assert.equal(original[0].nome,'Antiga');
 assert.throws(()=>replaceCustomAbility([],next[0],123),/removida/);
});
test('Legacy aliases remain consistent after an edit',()=>{
 const next=replaceCustomAbility([{id:1,name:'Old',desc:'Old',cost:2}],{id:1,name:'Old',desc:'Old',cost:2,nome:'Novo',descricao:'Nova descrição',custo:0},1);
 assert.equal(next[0].name,'Novo');assert.equal(next[0].desc,'Nova descrição');assert.equal(next[0].cost,0);
});
test('Ability type supports passive, normal and special metadata',()=>{
 assert.equal(abilityType({tipoHab:'passiva'}),'passiva');assert.equal(abilityType({tipo:'Especial'}),'especial');assert.equal(abilityType({},'especial'),'especial');assert.equal(abilityType({}),'normal');
});
