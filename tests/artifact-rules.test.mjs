import test from 'node:test';
import assert from 'node:assert/strict';
import {artifactUseReason,artifactRequirements,artifactAbilities} from '../src/adventure/artifactRules.mjs';
const art={id:'artefato-2',requisitos:{agilidadeBonus:4,percepcaoBonus:2}};
test('Sandaliers requires natural +4/+2 and ignores equipment and temporary effects',()=>{
  const bearer={artefato_id:art.id,agilidade:8,percepcao:4};
  assert.equal(artifactUseReason(art,bearer),'');
  for(const data of [{agilidade:7},{percepcao:3}])assert.equal(artifactUseReason(art,{...bearer,...data,equip_mao_dir:{agilidade:40,percepcao:40},buffs:{agilidade:20,percepcao:20}}),'Atributos naturais insuficientes');
  assert.match(artifactUseReason(art,{...bearer,artefato_id:''}),/Somente o portador/);
});
test('Existing INT/luck artifact requirements are preserved',()=>{
  const temporal={id:'artefato-3',requisitos:{inteligenciaBonus:3,sorteBonus:2}};
  assert.equal(artifactUseReason(temporal,{artefato_id:temporal.id,inteligencia:6,sorte:4}),'');
  assert.equal(artifactRequirements(temporal,{}).length,2);
  assert.match(artifactUseReason(temporal,{artefato_id:temporal.id,inteligencia:5,sorte:4}),/insuficientes/);
});
test('Custom and built-in powers retain rules and get isolated cooldown identities',()=>{
  const powers=artifactAbilities({...art,builtInPowers:[{id:'base',nome:'Base',custo:2}]},{[art.id]:[{id:123,nome:'Poder',custo:'3',cooldown:'3',descricao:'Original'}]});
  assert.equal(powers.length,2);assert.equal(powers[1].id,'artifact:artefato-2:123');
  assert.equal(powers[1].custo,'3');assert.equal(powers[1].cooldown,'3');assert.equal(powers[1].descricao,'Original');
});
