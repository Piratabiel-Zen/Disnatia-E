import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const patch=fs.readFileSync(new URL('../scripts/live-dice-necromancer-summons-final-patch.mjs',import.meta.url),'utf8');
const literal=patch.slice(patch.indexOf('const summonRuntime = ')+22,patch.indexOf('\n\nkit = replaceRange(',patch.indexOf('const summonRuntime = '))).trim().replace(/;$/,'');
const runtime=vm.runInNewContext(literal);
function harness(){
  const data=new Map();const summons=[];
  const selectedSheet={id:'necro',nome:'Necromante'};
  const doc=(_db,...parts)=>parts.join('/');
  const set=(key,value)=>{data.set(key,{...data.get(key),...value});if(key.startsWith('combat_summons/')){const i=summons.findIndex(row=>row.summonDocId===key.split('/')[1]);const row={...data.get(key),summonDocId:key.split('/')[1]};if(i>=0)summons[i]=row;else summons.push(row);}};
  const transaction={get:async key=>({exists:()=>data.has(key),data:()=>data.get(key)}),set};
  const names=['useCallback','selectedSheet','selectedClass','combat','combatState','summons','db','doc','runTransaction','setDoc','addJournal','nowId','masterMode'];
  const factory=new Function(...names,runtime+';return {useSummonAbility,updateSummonHp,updateSummonVc,useSummonAction,storeSummon};');
  const api=factory(fn=>fn,selectedSheet,{color:'#aaa'},{active:false},{round:1},summons,{},doc,async(_db,fn)=>fn(transaction),async(k,v)=>set(k,v),async()=>{},()=>String(Math.random()),false);
  return {api,data,summons};
}
test('revealed summon retains configured HP, edits resources outside turns, stores and reopens',async()=>{
  const {api,summons,data}=harness();
  const summon={id:'one',nome:'Corvo',revealed:true,hp:40,hp_bonus:7,forca:8,ataques:[{nome:'Bicada',custo:1}]};
  assert.equal(await api.useSummonAbility({},summon),true);
  const id=summons[0].id;
  assert.equal(summons[0].hp,47);assert.equal(summons[0].forca,8);
  assert.equal(await api.updateSummonHp(id,-7,47),true);assert.equal(summons[0].hp,40);
  await api.updateSummonVc(id,-1);assert.equal(summons[0].vigos,2);
  assert.equal(await api.useSummonAction(id,{nome:'Bicada',custo:1}),true);assert.equal(summons[0].vigos,1);
  await api.updateSummonVc(id,1);assert.equal(summons[0].vigos,2);
  await api.storeSummon(id);assert.equal(summons[0].active,false);
  await api.useSummonAbility({},summon);assert.equal(summons[0].active,true);assert.equal(summons[0].hp,40);assert.equal(summons[0].vigos,2);
  assert.ok(data.has('config/cosmic_event'));
});
test('hidden summons and another player’s resources remain protected',async()=>{
  const {api,summons}=harness();
  assert.equal(await api.useSummonAbility({},{revealed:false}),false);
  summons.push({id:'other',ownerSheetId:'other',summonDocId:'other',active:true});
  assert.equal(await api.updateSummonHp('other',1),false);
  assert.equal(await api.updateSummonVc('other',1),false);
  assert.equal(await api.storeSummon('other'),false);
});
