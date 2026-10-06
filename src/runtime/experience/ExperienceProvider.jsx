import { onSnapshot } from '../adventure/sharedSnapshot';
import { createLiveEventGate } from '../adventure/liveEventGate.mjs';
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  collection, deleteDoc, doc, limit, orderBy, query, where, runTransaction, serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore';
import { db } from '../core/firebase';
import { applyRoundAutomation } from './combatRoundEngine';
import {
  ATMOSPHERES, CLASSES, SHEET_COLORS, STATUS_LIST, getSheetMaxHp, ARTEFATOS_DATA,
} from '../data/gameData';
import { mergeSessionContext, readSessionCache, writeSessionCache } from '../adventure/sessionCache';

import {artifactAbilities,artifactUseReason} from '../adventure/artifactRules.mjs';
import { visibleSheets, ownsVisitorSheet } from '../adventure/visitorAccess.mjs';

const ExperienceContext = createContext(null);
const JOURNAL_LIMIT = 40;

const NAV_GROUPS = [
  { id:'session', label:'Sessão', icon:'✦', items:[{id:'session',label:'Sessão Atual',icon:'✦'}] },
  { id:'character', label:'Personagem', icon:'◆', items:[{id:'fichas',label:'Fichas',icon:'📋'},{id:'classes',label:'Classes',icon:'⚔️'}] },
  { id:'world', label:'Mundo', icon:'◈', items:[{id:'mapamundi',label:'Mapa Múndi',icon:'🌍'},{id:'personagens',label:'Personagens',icon:'👤'},{id:'bestiario',label:'Bestiário',icon:'🐉'}] },
  { id:'knowledge', label:'Conhecimento', icon:'◇', items:[{id:'livro',label:'Livro da Mandíbula',icon:'✦'},{id:'cronicas',label:'Crônicas',icon:'🗒️'},{id:'regras',label:'Regras',icon:'📖'},{id:'prologo',label:'Prólogo',icon:'📜'}] },
  { id:'table', label:'Mesa', icon:'⚔', items:[{id:'mapabatalha',label:'Mapa de Batalha',icon:'🗡️'},{id:'inimigos',label:'Inimigos',icon:'💀'},{id:'visitantes',label:'Visitantes',icon:'\u2726'}] },
];

const SOUNDSCAPE_PRESETS = {
  silencio: { label:'Silêncio Ritual', icon:'◌', rain:0, wind:0, fire:0, whispers:0, hum:0, bells:0, drips:0, water:0, insects:0, metal:0, heartbeat:0, arcane:0, thunder:0, crowd:0 },
  catedral: { label:'Catedral Antiga', icon:'⛪', rain:0, wind:6, fire:0, whispers:12, hum:18, bells:48, drips:5, water:0, insects:0, metal:2, heartbeat:0, arcane:10, thunder:0, crowd:0 },
  tempestade: { label:'Tempestade', icon:'⛈️', rain:84, wind:76, fire:0, whispers:0, hum:6, bells:0, drips:0, water:18, insects:0, metal:0, heartbeat:0, arcane:0, thunder:72, crowd:0 },
  fogueira: { label:'Fogueira na Noite', icon:'🔥', rain:0, wind:13, fire:82, whispers:0, hum:2, bells:0, drips:0, water:0, insects:18, metal:0, heartbeat:0, arcane:0, thunder:0, crowd:0 },
  vazio: { label:'Vazio Cósmico', icon:'🌌', rain:0, wind:4, fire:0, whispers:24, hum:62, bells:0, drips:0, water:0, insects:0, metal:0, heartbeat:10, arcane:68, thunder:0, crowd:0 },
  ruinas: { label:'Ruínas Abandonadas', icon:'🏚️', rain:4, wind:38, fire:0, whispers:10, hum:8, bells:0, drips:28, water:5, insects:8, metal:15, heartbeat:0, arcane:0, thunder:0, crowd:0 },
  floresta: { label:'Floresta Noturna', icon:'🌲', rain:2, wind:22, fire:0, whispers:3, hum:1, bells:0, drips:5, water:7, insects:76, metal:0, heartbeat:0, arcane:0, thunder:0, crowd:0 },
  caverna: { label:'Caverna Profunda', icon:'🪨', rain:0, wind:5, fire:0, whispers:5, hum:24, bells:0, drips:72, water:28, insects:0, metal:0, heartbeat:0, arcane:5, thunder:0, crowd:0 },
  masmorra: { label:'Masmorra', icon:'⛓️', rain:0, wind:7, fire:4, whispers:20, hum:16, bells:0, drips:44, water:8, insects:0, metal:38, heartbeat:10, arcane:0, thunder:0, crowd:0 },
  oceano: { label:'Costa Tempestuosa', icon:'🌊', rain:5, wind:48, fire:0, whispers:0, hum:2, bells:0, drips:0, water:86, insects:0, metal:0, heartbeat:0, arcane:0, thunder:8, crowd:0 },
  ritual: { label:'Ritual Cósmico', icon:'🔮', rain:0, wind:5, fire:8, whispers:52, hum:44, bells:16, drips:0, water:0, insects:0, metal:0, heartbeat:42, arcane:78, thunder:0, crowd:0 },
  taverna: { label:'Taverna', icon:'🍺', rain:0, wind:0, fire:38, whispers:0, hum:0, bells:0, drips:0, water:0, insects:0, metal:14, heartbeat:0, arcane:0, thunder:0, crowd:62 },
  batalha: { label:'Campo de Batalha', icon:'⚔️', rain:0, wind:18, fire:10, whispers:0, hum:3, bells:0, drips:0, water:0, insects:0, metal:52, heartbeat:68, arcane:0, thunder:0, crowd:20 },
  cemiterio: { label:'Cemitério', icon:'🪦', rain:3, wind:42, fire:0, whispers:28, hum:9, bells:12, drips:4, water:0, insects:26, metal:0, heartbeat:5, arcane:4, thunder:0, crowd:0 },
  temploTempo: { label:'Templo do Tempo', icon:'⌛', rain:0, wind:3, fire:0, whispers:18, hum:38, bells:28, drips:12, water:0, insects:0, metal:4, heartbeat:8, arcane:82, thunder:0, crowd:0 },
};

const EVENT_TYPES = {
  message:{label:'Mensagem',icon:'✦',color:'#A855F7'},
  critical:{label:'Impacto',icon:'✹',color:'#FFD86B'},
  temporal:{label:'Ruptura Temporal',icon:'6',color:'#53F1A6'},
  void:{label:'Vazio',icon:'◉',color:'#8B5CF6'},
  heal:{label:'Restauração',icon:'✚',color:'#4ADE80'},
  danger:{label:'Perigo',icon:'⚠',color:'#E8193C'},
};

const safeLocalStorage = {
  get(key){ try { return localStorage.getItem(key) || ''; } catch(_) { return ''; } },
  set(key,value){ try { localStorage.setItem(key,value); } catch(_){} },
};

function normalizeDoc(snap, fallback={}) { return snap.exists() ? (snap.data() || fallback) : fallback; }
function clamp(v,min,max){ return Math.min(max,Math.max(min,Number(v)||0)); }
function parseCooldown(value){ const n=parseInt(String(value||'').replace(/\D/g,''),10); return Number.isFinite(n)?n:0; }
function nowId(prefix='evt'){ return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }

export function ExperienceProvider({ children, tab, masterMode, playerSheetId='', access=null }) {
  const [sheets,setSheets]=useState([]);
  const [summons,setSummons]=useState([]);
  const [customAbilities,setCustomAbilities]=useState({});
  const [combat,setCombat]=useState({active:false});
  const [combatState,setCombatState]=useState({initiative:[],turnIdx:0,round:1,log:[]});
  const [session,setSession]=useState(()=>readSessionCache());
  const [ambient,setAmbient]=useState({});
  const [soundscape,setSoundscapeState]=useState({preset:'silencio',...SOUNDSCAPE_PRESETS.silencio,updatedAt:0});
  const [cosmicEvent,setCosmicEvent]=useState(null);
  const [journal,setJournal]=useState([]);
  const [maps,setMaps]=useState([]);
  const [atlas,setAtlas]=useState([]);
  const [activeMap,setActiveMapState]=useState({activeId:''});
  const [selectedSheetId,setSelectedSheetIdState]=useState(()=>safeLocalStorage.get('dinastia_player_sheet'));
  const firstCombatLogRef=useRef(true);
  const lastCombatLogTsRef=useRef(0);
  const sheetHpRef=useRef(new Map());
  const sheetHpPrimedRef=useRef(false);

  useEffect(()=>{
    const unsubscribers=[];
    unsubscribers.push(onSnapshot(access?.role==='visitor'?query(collection(db,'sheets'),where('visitorId','==',String(access.visitorId||'invalid'))):collection(db,'sheets'),snap=>{
      const rows=visibleSheets(snap.docs.map(d=>({id:d.id,...d.data()})),access,masterMode);
      const nextHp=new Map();
      rows.forEach(sheet=>{
        const id=String(sheet.id||'');
        const hp=Number(sheet.hp||0);
        const marker=sheet.lastHpChange||sheet.lastDamage||{};
        const criticalStamp=Number(marker.ts||marker.updatedAt||sheet.hpUpdatedAt||0);
        nextHp.set(id,{hp,criticalStamp});
        const previous=sheetHpRef.current.get(id);
        if(sheetHpPrimedRef.current&&previous&&previous.hp!==hp){
          const diff=hp-previous.hp;
          const critical=diff<0&&Boolean(marker.critical||marker.isCrit||sheet.lastDamageCritical)&&(criticalStamp===0||criticalStamp!==previous.criticalStamp);
          window.dispatchEvent(new CustomEvent('dinastia:hp-change',{detail:{id:nowId('sheet_hp'),entityId:id,name:sheet.nome||'Personagem',diff,critical,death:previous.hp>0&&hp<=0,ts:Date.now()}}));
        }
      });
      sheetHpRef.current=nextHp;
      sheetHpPrimedRef.current=true;
      setSheets(rows);
    }));
    unsubscribers.push(onSnapshot(collection(db,'combat_summons'),snap=>setSummons(snap.docs.map(d=>({summonDocId:d.id,...d.data()})).filter(row=>row.active!==false))));
    unsubscribers.push(onSnapshot(doc(db,'config','customAbilities'),snap=>setCustomAbilities(normalizeDoc(snap,{}))));
    unsubscribers.push(onSnapshot(doc(db,'config','combat'),snap=>setCombat(normalizeDoc(snap,{active:false}))));
    unsubscribers.push(onSnapshot(doc(db,'config','combat_state'),snap=>setCombatState(normalizeDoc(snap,{initiative:[],turnIdx:0,round:1,log:[]}))));
    unsubscribers.push(onSnapshot(doc(db,'config','session'),{includeMetadataChanges:true},snap=>{const next=normalizeDoc(snap,{active:false,title:'',location:'',objective:'',subtitle:''});writeSessionCache(next);setSession(next);}));
    unsubscribers.push(onSnapshot(doc(db,'config','ambient'),snap=>setAmbient(normalizeDoc(snap,{}))));
    unsubscribers.push(onSnapshot(doc(db,'config','soundscape'),snap=>setSoundscapeState({...SOUNDSCAPE_PRESETS.silencio,...normalizeDoc(snap,{})})));
    const cosmicGate = createLiveEventGate();
    unsubscribers.push(onSnapshot(doc(db,'config','cosmic_event'),{includeMetadataChanges:true},snap=>{
      const value = snap.exists() ? snap.data() : null;
      cosmicGate(snap,value?.id ? [{key:String(value.id),value}] : []).forEach(entry=>setCosmicEvent(entry.value));
    }));
    unsubscribers.push(onSnapshot(doc(db,'config','battlemap_active'),snap=>setActiveMapState(normalizeDoc(snap,{activeId:''}))));
    const journalQuery=query(collection(db,'session_journal'),orderBy('ts','desc'),limit(JOURNAL_LIMIT));
    unsubscribers.push(onSnapshot(journalQuery,snap=>setJournal(snap.docs.map(d=>({id:d.id,...d.data()})))));
    return()=>unsubscribers.forEach(fn=>fn());
  },[access?.role,access?.visitorId,masterMode]);

  useEffect(()=>{
    if(!(tab==='mapabatalha' || (masterMode && tab==='session'))) { setMaps([]); return; }
    return onSnapshot(collection(db,'battlemaps'),snap=>setMaps(snap.docs.map(d=>({id:d.id,...d.data()}))));
  },[masterMode,tab]);

  useEffect(()=>{
    if(!(tab==='mapamundi' || tab==='session')) { setAtlas([]); return; }
    return onSnapshot(collection(db,'atlas_discoveries'),snap=>{
      const rows=visibleSheets(snap.docs.map(d=>({id:d.id,...d.data()})),access,masterMode);
      rows.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
      setAtlas(rows);
    });
  },[masterMode,tab]);

  useEffect(()=>{
    if(!sheets.length) return;
    setSelectedSheetIdState(prev=>{
      if(prev && sheets.some(s=>String(s.id)===String(prev))) return String(prev);
      const next=String(sheets[0]?.id||'');
      if(next) safeLocalStorage.set('dinastia_player_sheet',next);
      return next;
    });
  },[sheets]);

  const setSelectedSheetId=useCallback(id=>{
    const value=String(!masterMode&&playerSheetId?playerSheetId:id||'');
    if(access?.role==='visitor'&&!sheets.some(sheet=>String(sheet.id)===value&&ownsVisitorSheet(sheet,access)))return;
    setSelectedSheetIdState(value);
    safeLocalStorage.set('dinastia_player_sheet',value);
  },[masterMode,playerSheetId,access,sheets]);

  const selectedSheet=useMemo(()=>sheets.find(s=>String(s.id)===String(!masterMode&&playerSheetId?playerSheetId:selectedSheetId))||null,[sheets,selectedSheetId,masterMode,playerSheetId]);
  const selectedClass=useMemo(()=>CLASSES.find(c=>c.id===selectedSheet?.classe)||null,[selectedSheet?.classe]);

  const addJournal=useCallback(async(text,type='story',extra={})=>{
    if(!String(text||'').trim()) return;
    const id=extra.id||nowId('journal');
    await setDoc(doc(db,'session_journal',id),{
      text:String(text).trim(), type, ts:extra.ts||Date.now(), round:extra.round??combatState.round??null,
      memory:!!extra.memory, icon:extra.icon||'', color:extra.color||'', source:extra.source||'site',
    });
  },[combatState.round]);

  const updateJournal=useCallback(async(id,text)=>{
    const clean=String(text||'').trim(); if(!masterMode||!id||!clean)return;
    await updateDoc(doc(db,'session_journal',String(id)),{text:clean,editedAt:Date.now()});
  },[masterMode]);

  const deleteJournal=useCallback(async id=>{
    if(!masterMode||!id)return;
    await deleteDoc(doc(db,'session_journal',String(id)));
  },[masterMode]);

  useEffect(()=>{
    if(!masterMode) return;
    const logs=Array.isArray(combatState.log)?combatState.log:[];
    if(!logs.length) return;
    const maxTs=Math.max(...logs.map(x=>Number(x?.ts||0)));
    if(firstCombatLogRef.current){
      firstCombatLogRef.current=false;
      lastCombatLogTsRef.current=maxTs;
      return;
    }
    const fresh=logs.filter(x=>Number(x?.ts||0)>lastCombatLogTsRef.current);
    if(!fresh.length) return;
    fresh.forEach(entry=>{
      const ts=Number(entry.ts||Date.now());
      setDoc(doc(db,'session_journal',`combat_${ts}`),{
        text:entry.msg||'Ação de combate',type:'combat',ts,round:entry.round??combatState.round,
        icon:entry.icon||'⚔',color:entry.color||'#E8193C',source:'combat',memory:false,
      }).catch(()=>{});
    });
    lastCombatLogTsRef.current=maxTs;
  },[combatState.log,combatState.round,masterMode]);

  const updateSession=useCallback(async patch=>{
    const payload={...patch,updatedAt:Date.now()};
    if(patch.active===true && !session.active) payload.startedAt=Date.now();
    const next=mergeSessionContext(session,payload);
    writeSessionCache(next);setSession(next);
    await setDoc(doc(db,'config','session'),payload,{merge:true});
  },[session]);

  const startSession=useCallback(async draft=>{
    const payload={
      active:true,
      title:draft?.title||session.title||'Sessão em andamento',
      subtitle:draft?.subtitle??session.subtitle??'',
      location:draft?.location??session.location??'',
      objective:draft?.objective??session.objective??'',
      startedAt:Date.now(),updatedAt:Date.now(),
    };
    const next=mergeSessionContext(session,payload);
    writeSessionCache(next);setSession(next);
    await setDoc(doc(db,'config','session'),payload,{merge:true});
    await addJournal(`Sessão iniciada${payload.title?`: ${payload.title}`:''}.`,'session',{icon:'✦',color:'#A855F7'});
  },[session,addJournal]);

  const endSession=useCallback(async()=>{
    const payload={active:false,endedAt:Date.now(),updatedAt:Date.now()};
    const next=mergeSessionContext(session,payload);
    writeSessionCache(next);setSession(next);
    await setDoc(doc(db,'config','session'),payload,{merge:true});
    await addJournal('A sessão foi encerrada.','session',{icon:'◌',color:'#6A5A7A',memory:true});
  },[session,addJournal]);

  const setAtmosphere=useCallback(async key=>{
    if(!ATMOSPHERES[key]) return;
    await setDoc(doc(db,'config','atmosphere'),{key,updatedAt:Date.now()},{merge:true});
  },[]);

  const setSoundscape=useCallback(async patch=>{
    const payload={...patch,updatedAt:Date.now()};
    await setDoc(doc(db,'config','soundscape'),payload,{merge:true});
  },[]);

  const applySoundscapePreset=useCallback(async preset=>{
    const value=SOUNDSCAPE_PRESETS[preset];
    if(!value) return;
    await setDoc(doc(db,'config','soundscape'),{...value,preset,updatedAt:Date.now()},{merge:true});
  },[]);

  const triggerCosmicEvent=useCallback(async(type='message',text='')=>{
    const info=EVENT_TYPES[type]||EVENT_TYPES.message;
    const event={id:nowId('cosmic'),type,text:String(text||info.label),ts:Date.now(),color:info.color,icon:info.icon};
    await Promise.all([setDoc(doc(db,'config','cosmic_event'),event),setDoc(doc(db,'cosmic_events',event.id),event,{merge:true})]);
    await addJournal(event.text,'event',{id:`event_${event.id}`,ts:event.ts,icon:event.icon,color:event.color,source:'cosmic'});
  },[addJournal]);

  const setActiveMap=useCallback(async mapId=>{
    const id=String(mapId||'');
    const map=maps.find(m=>String(m.id)===id);
    const revision=Date.now()*1000+Math.floor(Math.random()*1000);
    await setDoc(doc(db,'config','battlemap_active'),{activeId:id,revision,updatedAt:Date.now()});
    await addJournal(id?`Mapa alterado para ${map?.nome||map?.name||'novo cenário'}.`:'Mapa de batalha ocultado.','world',{icon:'🗺️',color:'#8B5CF6'});
  },[maps,addJournal]);

  const nextTurn=useCallback(async()=>{
    const init=Array.isArray(combatState.initiative)?combatState.initiative:[];
    if(!init.length)return;
    const currentIdx=Number(combatState.turnIdx||0);
    const next=(currentIdx+1)%init.length;
    const newRound=next===0?Number(combatState.round||1)+1:Number(combatState.round||1);
    const combatKey=String(combat?.startedAt||combatState?.log?.[0]?.ts||'combat');
    let syncedInit=init,automation=null;
    if(next===0){
      try{
        automation=await applyRoundAutomation({initiative:init,round:newRound,combatKey});
        if(automation?.effects?.length){
          const hp=new Map(automation.effects.filter(x=>x.damage>0).map(x=>[String(x.combatantId),Number(x.hpAfter)]));
          syncedInit=init.map(c=>hp.has(String(c.id))?{...c,hp:hp.get(String(c.id))}:c);
        }
      }catch(error){console.error('Falha na automação de rodada:',error)}
    }
    const current=syncedInit[next]||{};const ts=Date.now();const entries=[];
    if(next===0&&automation?.applied){const damaged=(automation.effects||[]).filter(x=>x.damage>0).length;entries.push({msg:`✦ Rodada ${newRound}: cooldowns −1 · +2 VC${damaged?` · ${damaged} dano(s) de status`:''}`,color:'#A855F7',icon:'✦',ts:ts-1,round:newRound})}
    entries.push({msg:`Vez de ${current.nome||'combatente'}${next===0?` — Rodada ${newRound}`:''}`,color:current.color||'#C8B8A0',icon:'▶',ts,round:newRound});
    const nextLog=[...(combatState.log||[]),...entries].slice(-60);
    const turnEvent={id:'turn_'+ts+'_'+next,type:'turn_announce',icon:'\u2694',text:current.nome||'Combatente',subtitle:current.className||current.classeName||current.classe||(current.type==='enemy'?'Inimigo':'Aventureiro'),color:current.color||'#A855F7',soft:false,ts,publishedAt:serverTimestamp()};
    window.dispatchEvent(new CustomEvent('dinastia:cosmic-live',{detail:turnEvent}));
    await Promise.all([
      setDoc(doc(db,'config','combat_state'),{initiative:syncedInit,turnIdx:next,round:newRound,log:nextLog,updatedAt:ts,revision:ts},{merge:true}),
      setDoc(doc(db,'config','combat'),{active:true,round:newRound,currentNome:current.nome||'',currentColor:current.color||'#E8193C',currentType:current.type||'player',updatedAt:ts},{merge:true}),
      setDoc(doc(db,'cosmic_events',turnEvent.id),turnEvent,{merge:true}),
    ]);
  },[combatState,combat]);

  const reorderInitiative=useCallback(async(fromIndex,toIndex)=>{
    const list=Array.isArray(combatState.initiative)?[...combatState.initiative]:[];
    if(!list.length||fromIndex===toIndex||fromIndex<0||toIndex<0||fromIndex>=list.length||toIndex>=list.length)return;
    const currentId=String(list[Number(combatState.turnIdx||0)]?.id||'');
    const [moved]=list.splice(fromIndex,1);list.splice(toIndex,0,moved);
    const nextIdx=Math.max(0,list.findIndex(c=>String(c.id)===currentId));const current=list[nextIdx]||{};const ts=Date.now();
    await Promise.all([
      setDoc(doc(db,'config','combat_state'),{initiative:list,turnIdx:nextIdx,round:Number(combatState.round||1),updatedAt:ts,revision:ts},{merge:true}),
      setDoc(doc(db,'config','combat'),{active:true,round:Number(combatState.round||1),currentNome:current.nome||'',currentColor:current.color||'#E8193C',currentType:current.type||'player',updatedAt:ts},{merge:true}),
    ]);
  },[combatState]);

  const endCombat=useCallback(async()=>{
    const ts=Date.now();await Promise.all([setDoc(doc(db,'config','combat'),{active:false,endedAt:ts,updatedAt:ts,revision:ts},{merge:true}),setDoc(doc(db,'config','combat_state'),{turnIdx:0,round:1,updatedAt:ts,revision:ts},{merge:true})]);
    await addJournal('Combate encerrado.','combat',{icon:'⚔',color:'#6A5A7A',memory:true});
  },[addJournal]);

  const addAtlasDiscovery=useCallback(async entry=>{
    const name=String(entry?.name||'').trim(); if(!name) return;
    const id=nowId('atlas');
    await setDoc(doc(db,'atlas_discoveries',id),{
      name,status:entry.status||'rumor',note:String(entry.note||''),session:session.title||'',
      createdAt:Date.now(),updatedAt:Date.now(),
    });
    await addJournal(`${name} foi registrado no Atlas como ${entry.status==='visitado'?'visitado':entry.status==='descoberto'?'descoberto':'rumor'}.`,'world',{icon:'🌍',color:'#6D28D9'});
  },[session.title,addJournal]);

  const useQuickAbility=useCallback(async (ability,artifactSheet)=>{
    const actingSheet=ability?._artifactId&&artifactSheet?artifactSheet:selectedSheet;
    if(!actingSheet || !ability) return false;
    if(ability._artifactId&&!masterMode&&String(actingSheet.id)!==String(playerSheetId||selectedSheet?.id))return false;
    const actingClass=CLASSES.find(row=>row.id===actingSheet.classe);
    const level=Number(actingSheet.nivel||1);
    const req=Number(ability.req||1);
    const passive=ability.tipoHab==='passiva';
    if(passive || ability._locked || req>level) return false;
    const abilityId=String(ability.id||ability.name||ability.nome||'');
    let cost=Math.max(0,Number(ability.cost??ability.custo??0)||0);
    let turns=parseCooldown(ability.cooldown||ability.tempo);
    const accepted=await runTransaction(db,async transaction=>{
      const sheetRef=doc(db,'sheets',String(actingSheet.id));
      const snapshot=await transaction.get(sheetRef);
      const stateSnapshot=await transaction.get(doc(db,'config','combat_state'));
      const combatSnapshot=await transaction.get(doc(db,'config','combat'));
      if(!snapshot.exists())return false;
      const latest=snapshot.data();
      if(ability._artifactId){
        const artifact=ARTEFATOS_DATA.find(row=>row.id===ability._artifactId);
        const visibility=await transaction.get(doc(db,'config','artefatos'));
        const powers=await transaction.get(doc(db,'config','artefatos_habilidades'));
        if(!visibility.data()?.unlocked?.[artifact?.id]||artifactUseReason(artifact,latest))return false;
        const registered=artifactAbilities(artifact,powers.data()||{}).find(row=>row.id===abilityId);
        if(!registered||registered.tipoHab==='passiva')return false;
        if(artifact.id==='artefato-2'&&registered.nome==='Intocável'&&(latest.status?.atordoado||latest.status?.incapacitado))return false;
        cost=Math.max(0,Number(registered.cost??registered.custo??0)||0);
        turns=parseCooldown(registered.cooldown||registered.tempo);
      }
      if(combatSnapshot.data()?.active&&!masterMode){
        const state=stateSnapshot.data()||{};
        const actor=state.initiative?.[Number(state.turnIdx||0)];
        if(actor?.type!=='player'||String(actor.id||'').replace(/^p_/,'')!==String(actingSheet.id))return false;
      }
      const vigor=Number(latest.vigos||0),cooldowns=latest.cooldowns||{};
      if(vigor<cost||Number(cooldowns[abilityId]||0)>0)return false;
      transaction.set(sheetRef,{vigos:Math.max(0,vigor-cost),cooldowns:{...cooldowns,...(turns>0?{[abilityId]:turns}:{})}},{merge:true});
      return true;
    });
    if(!accepted)return false;
    const abilityEvent={
      id:nowId('ability'),type:'ability',text:`${actingSheet.nome||'Personagem'} usou ${ability.name||ability.nome||'Habilidade'}`,ts:Date.now(),
      color:actingClass?.color||'#A855F7',icon:actingClass?.icon||'\u2726',soft:true,source:'ability',sheetId:String(actingSheet.id),
    };
    const broadcasts=await Promise.allSettled([
      addJournal(`${actingSheet.nome||'Personagem'} usou ${ability.name||ability.nome}.`,'ability',{icon:'\u2726',color:actingClass?.color||'#A855F7'}),
      setDoc(doc(db,'config','cosmic_event'),abilityEvent),
      setDoc(doc(db,'cosmic_events',abilityEvent.id),abilityEvent,{merge:true}),
    ]);
    if(broadcasts.some(row=>row.status==='rejected'))console.warn('Habilidade utilizada; anúncio aguardando confirmação.');
    return true;
  },[selectedSheet,selectedClass,masterMode,playerSheetId,addJournal]);

  const useSummonAbility=useCallback(async(ability,summon)=>{
    if(!selectedSheet||!summon||summon.revealed!==true)return false;
    const threat=String(summon?.ameaca||'Baixa').toLowerCase();
    const isLord=['alta','extrema','extremo'].includes(threat);
    if(summons.some(c=>c.active!==false&&String(c.ownerSheetId||'')===String(selectedSheet.id)&&String(c.summonMemoryId||'')===String(summon.id||'')))return false;
    const now=Date.now();
    const safeId=value=>String(value||'summon').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80);
    const summonId=`summon_${safeId(selectedSheet.id)}_${safeId(summon.id||summon.nome)}`;
    const maxHp=Math.max(1,Math.floor(Number(summon.hp||10)+Math.max(0,Number(summon.hp_bonus||0))));
    const scale=1;
    const attr=key=>Math.floor(Number(summon?.[key]||0)*scale);
    const attacks=(Array.isArray(summon.ataques)?summon.ataques:[]).map(action=>({
      ...action,custo:Math.max(0,Math.min(3,Number(action?.custo??1))),
    }));
    const summoned={
      id:`s_${summonId}`,summonDocId:summonId,type:'summon',ownerSheetId:String(selectedSheet.id),
      summonMemoryId:String(summon.id||''),nome:summon.nome||'Invocação',foto:summon.foto||'',
      color:selectedClass?.color||'#6E6E80',threat:summon.ameaca||'Baixa',hp:maxHp,maxHp,
      vigos:3,maxVigos:3,roll:0,status:{},forca:attr('forca'),agilidade:attr('agilidade'),
      durabilidade:attr('durabilidade'),inteligencia:attr('inteligencia'),percepcao:attr('percepcao'),
      sorte:attr('sorte'),ataques:attacks,
    };
    const summonRef=doc(db,'combat_summons',summonId);
    const stateRef=doc(db,'config','combat_state');
    const released=await runTransaction(db,async transaction=>{
      const existing=await transaction.get(summonRef);
      const stateSnapshot=combat?.active?await transaction.get(stateRef):null;
      if(existing.exists()&&existing.data()?.active!==false)return false;
      // Guardar nao deve restaurar recursos gastos ao liberar novamente.
      const previous=existing.exists()?existing.data():null;
      if(previous){
        summoned.hp=Math.max(0,Math.min(maxHp,Number(previous.hp??maxHp)));
        summoned.vigos=Math.max(0,Math.min(3,Number(previous.vigos??3)));
      }
      transaction.set(summonRef,{...summoned,active:true,createdAt:previous?.createdAt||now,updatedAt:now,round:Number(combatState.round||1)});
      if(combat?.active){
        const state=stateSnapshot?.exists()?stateSnapshot.data()||{}:{};
        const init=Array.isArray(state.initiative)?[...state.initiative]:[];
        if(!init.some(c=>String(c.id||'')===String(summoned.id))){
          const owner=init.findIndex(c=>c.type==='player'&&String(c.id||'').replace(/^p_/,'')===String(selectedSheet.id));
          const currentId=String(init[Number(state.turnIdx||0)]?.id||'');
          init.splice(owner>=0?owner+1:init.length,0,summoned);
          const idx=currentId?Math.max(0,init.findIndex(c=>String(c.id)===currentId)):0;
          const log=[...(state.log||[]),{
            msg:`${selectedSheet.nome||'Necromante'} invocou ${summoned.nome} · 3 VC`,
            color:selectedClass?.color||'#6E6E80',icon:'\uD83D\uDC80',ts:now,round:Number(state.round||1),
          }].slice(-60);
          transaction.set(stateRef,{initiative:init,turnIdx:idx,log,updatedAt:now,revision:now},{merge:true});
        }
      }
      return true;
    });
    if(!released)return false;
    const event={
      id:nowId('summon_release'),type:'summon_release',title:'INVOCAÇÃO FEITA',text:summoned.nome,
      subtitle:`${selectedSheet.nome||'Necromante'} conjurou a invocação`,ts:now,
      color:selectedClass?.color||'#6E6E80',icon:'\uD83D\uDC80',soft:false,source:'summon-release',sheetId:String(selectedSheet.id),
    };
    await Promise.all([
      addJournal(`${summoned.nome} foi invocado por ${selectedSheet.nome||'Necromante'}.`,'ability',{icon:event.icon,color:event.color,source:'summon-release'}),
      setDoc(doc(db,'config','cosmic_event'),event),
      setDoc(doc(db,'cosmic_events',event.id),event),
    ]);
    return true;
  },[selectedSheet,selectedClass,combat?.active,combatState.round,summons,addJournal]);

  const updateSummonHp=useCallback(async(combatantId,delta,maxHpOverride)=>{
    if(!combatantId||!Number.isFinite(Number(delta)))return false;
    const record=summons.find(row=>String(row.id||'')===String(combatantId));
    if(!record)return false;
    const owns=masterMode||String(record.ownerSheetId||'')===String(selectedSheet?.id||'');
    if(!owns)return false;
    const summonDocId=String(record.summonDocId||record.id||'').replace(/^s_/,'');
    if(!summonDocId)return false;
    const summonRef=doc(db,'combat_summons',summonDocId);
    const stateRef=doc(db,'config','combat_state');
    const result=await runTransaction(db,async transaction=>{
      const summonSnapshot=await transaction.get(summonRef);
      if(!summonSnapshot.exists()||summonSnapshot.data()?.active===false)return false;
      const current={...record,...summonSnapshot.data()};
      const maxHp=Math.max(1,Number(maxHpOverride||current.maxHp||1));
      const wasFull=Number(current.hp||0)>=Number(current.maxHp||1);
      const currentHp=wasFull&&maxHp>Number(current.maxHp||1)?maxHp:Number(current.hp||0);
      const nextHp=Math.max(0,Math.min(maxHp,currentHp+Number(delta)));
      const nextVc=Math.max(0,Math.min(3,Number(current.vigos??3)));
      const now=Date.now();
      transaction.set(summonRef,{hp:nextHp,maxHp,vigos:nextVc,maxVigos:3,updatedAt:now},{merge:true});
      return {nextHp,maxHp,nextVc,now};
    });
    if(!result)return false;
    runTransaction(db,async transaction=>{
      const snapshot=await transaction.get(stateRef);
      const latest=await transaction.get(summonRef);
      if(!latest.exists()||latest.data()?.active===false)return;
      if(!snapshot.exists())return;
      const state=snapshot.data()||{};
      const initiative=Array.isArray(state.initiative)?[...state.initiative]:[];
      const index=initiative.findIndex(row=>row.type==='summon'&&String(row.id)===String(combatantId));
      if(index<0)return;
      initiative[index]={...initiative[index],hp:latest.data().hp,maxHp:latest.data().maxHp,vigos:latest.data().vigos,maxVigos:3};
      transaction.set(stateRef,{initiative,updatedAt:result.now,revision:result.now},{merge:true});
    }).catch(error=>console.warn('HP salvo; espelho da iniciativa indisponível:',error));
    return true;
  },[summons,masterMode,selectedSheet?.id]);

  const updateSummonVc=useCallback(async(combatantId,delta)=>{
    if(!combatantId||!Number.isFinite(Number(delta)))return false;
    const record=summons.find(row=>String(row.id||'')===String(combatantId));
    if(!record)return false;
    const owns=masterMode||String(record.ownerSheetId||'')===String(selectedSheet?.id||'');
    if(!owns)return false;
    const summonDocId=String(record.summonDocId||record.id||'').replace(/^s_/,'');
    if(!summonDocId)return false;
    const summonRef=doc(db,'combat_summons',summonDocId);
    const stateRef=doc(db,'config','combat_state');
    const result=await runTransaction(db,async transaction=>{
      const summonSnapshot=await transaction.get(summonRef);
      if(!summonSnapshot.exists()||summonSnapshot.data()?.active===false)return false;
      const current={...record,...summonSnapshot.data()};
      const nextVc=Math.max(0,Math.min(3,Number(current.vigos??3)+Number(delta)));
      const now=Date.now();
      transaction.set(summonRef,{vigos:nextVc,maxVigos:3,updatedAt:now},{merge:true});
      return {nextVc,now};
    });
    if(!result)return false;
    runTransaction(db,async transaction=>{
      const snapshot=await transaction.get(stateRef);
      const latest=await transaction.get(summonRef);
      if(!latest.exists()||latest.data()?.active===false)return;
      if(!snapshot.exists())return;
      const state=snapshot.data()||{};
      const initiative=Array.isArray(state.initiative)?[...state.initiative]:[];
      const index=initiative.findIndex(row=>row.type==='summon'&&String(row.id)===String(combatantId));
      if(index<0)return;
      initiative[index]={...initiative[index],vigos:latest.data().vigos,maxVigos:3};
      transaction.set(stateRef,{initiative,updatedAt:result.now,revision:result.now},{merge:true});
    }).catch(error=>console.warn('VC salvo; espelho da iniciativa indisponível:',error));
    return true;
  },[summons,masterMode,selectedSheet?.id]);

  const useSummonAction=useCallback(async(combatantId,action)=>{
    if(!combatantId||!action)return false;
    const record=summons.find(row=>String(row.id||'')===String(combatantId));
    if(!record)return false;
    const owns=masterMode||String(record.ownerSheetId||'')===String(selectedSheet?.id||'');
    if(!owns)return false;
    const summonDocId=String(record.summonDocId||record.id||'').replace(/^s_/,'');
    if(!summonDocId)return false;
    const summonRef=doc(db,'combat_summons',summonDocId);
    const stateRef=doc(db,'config','combat_state');
    const result=await runTransaction(db,async transaction=>{
      const summonSnapshot=await transaction.get(summonRef);
      if(!summonSnapshot.exists()||summonSnapshot.data()?.active===false)return null;
      const row={...record,...summonSnapshot.data()};
      if(Number(row.hp||0)<=0)return null;
      const cost=Math.max(0,Math.min(3,Number(action.custo??1)));
      const currentVc=Math.max(0,Math.min(3,Number(row.vigos??3)));
      if(currentVc<cost)return null;
      const nextVc=currentVc-cost;
      const now=Date.now();
      const actionName=String(action.nome||action.name||'Ação');
      transaction.set(summonRef,{vigos:nextVc,maxVigos:3,updatedAt:now},{merge:true});
      return {name:row.nome||'Invocação',actionName,color:row.color||'#6E6E80',nextVc,now};
    });
    if(!result)return false;
    runTransaction(db,async transaction=>{
      const snapshot=await transaction.get(stateRef);
      const latest=await transaction.get(summonRef);
      if(!latest.exists()||latest.data()?.active===false)return;
      if(!snapshot.exists())return;
      const state=snapshot.data()||{};
      const initiative=Array.isArray(state.initiative)?[...state.initiative]:[];
      const index=initiative.findIndex(row=>row.type==='summon'&&String(row.id)===String(combatantId));
      if(index<0)return;
      initiative[index]={...initiative[index],vigos:latest.data().vigos,maxVigos:3};
      const log=[...(state.log||[]),{
        msg:`${result.name} usou ${result.actionName}`,color:result.color,
        icon:'\uD83D\uDC80',ts:result.now,round:Number(state.round||1),
      }].slice(-60);
      transaction.set(stateRef,{initiative,log,updatedAt:result.now,revision:result.now},{merge:true});
    }).catch(error=>console.warn('Ação usada; espelho da iniciativa indisponível:',error));
    const now=result.now;
    const event={
      id:nowId('summon_action'),type:'ability',text:`${result.name} usou ${result.actionName}`,
      ts:now,color:result.color,icon:'\uD83D\uDC80',soft:true,source:'summon-action',sheetId:String(selectedSheet?.id||''),
    };
    const broadcasts=await Promise.allSettled([
      addJournal(event.text,'ability',{icon:event.icon,color:event.color}),
      setDoc(doc(db,'config','cosmic_event'),event),
      setDoc(doc(db,'cosmic_events',event.id),event),
    ]);
    if(broadcasts.some(item=>item.status==='rejected'))console.warn('Ação usada; parte do anúncio global não foi gravada.');
    return true;
  },[summons,masterMode,selectedSheet?.id,addJournal]);

  const storeSummon=useCallback(async combatantId=>{
    if(!combatantId)return false;
    const record=summons.find(row=>String(row.id||'')===String(combatantId));
    if(!record)return false;
    const owns=masterMode||String(record.ownerSheetId||'')===String(selectedSheet?.id||'');
    if(!owns)return false;
    const summonDocId=String(record.summonDocId||record.id||'').replace(/^s_/,'');
    if(!summonDocId)return false;
    const summonRef=doc(db,'combat_summons',summonDocId);
    const stateRef=doc(db,'config','combat_state');
    const combatRef=doc(db,'config','combat');
    const result=await runTransaction(db,async transaction=>{
      const summonSnapshot=await transaction.get(summonRef);
      if(!summonSnapshot.exists()||summonSnapshot.data()?.active===false)return null;
      const now=Date.now();
      transaction.set(summonRef,{active:false,storedAt:now,updatedAt:now},{merge:true});
      return {name:String(record.nome||'Invocação'),now};
    });
    if(!result)return false;
    runTransaction(db,async transaction=>{
      const stateSnapshot=await transaction.get(stateRef);
      if(!stateSnapshot.exists())return;
      const state=stateSnapshot.data()||{};
      const initiative=Array.isArray(state.initiative)?[...state.initiative]:[];
      const index=initiative.findIndex(row=>row.type==='summon'&&String(row.id)===String(combatantId));
      if(index<0)return;
      const currentId=String(initiative[Number(state.turnIdx||0)]?.id||'');
      const nextInitiative=initiative.filter((_,itemIndex)=>itemIndex!==index);
      let nextTurnIdx=currentId===String(combatantId)?Math.min(Math.max(0,index),Math.max(0,nextInitiative.length-1)):nextInitiative.findIndex(row=>String(row.id||'')===currentId);
      if(nextTurnIdx<0)nextTurnIdx=0;
      transaction.set(stateRef,{initiative:nextInitiative,turnIdx:nextTurnIdx,updatedAt:result.now,revision:result.now},{merge:true});
      if(currentId===String(combatantId)){
        const nextCurrent=nextInitiative[nextTurnIdx];
        transaction.set(combatRef,{currentNome:nextCurrent?.nome||'',currentColor:nextCurrent?.color||'#E8193C',currentType:nextCurrent?.type||'',updatedAt:result.now,revision:result.now},{merge:true});
      }
    }).catch(error=>console.warn('Invocação guardada; espelho da iniciativa indisponível:',error));
    addJournal(`${result.name} foi guardada pelo necromante.`,'ability',{icon:'\uD83D\uDC80',color:record.color||'#6E6E80',source:'summon-store'}).catch(error=>console.warn('Invocação guardada; registro no diário indisponível:',error));
    return true;
  },[summons,masterMode,selectedSheet?.id,addJournal]);

  const value=useMemo(()=>({
    tab,masterMode,access,sheets,summons,customAbilities,selectedSheetId,setSelectedSheetId,selectedSheet,selectedClass,
    combat,combatState,session,ambient,soundscape,cosmicEvent,journal,maps,atlas,activeMap,
    updateSession,startSession,endSession,setAtmosphere,setSoundscape,applySoundscapePreset,
    triggerCosmicEvent,setActiveMap,nextTurn,reorderInitiative,endCombat,addJournal,updateJournal,deleteJournal,addAtlasDiscovery,useQuickAbility,useSummonAbility,updateSummonHp,updateSummonVc,useSummonAction,storeSummon,
  }),[
    tab,masterMode,access,sheets,summons,customAbilities,selectedSheetId,setSelectedSheetId,selectedSheet,selectedClass,combat,combatState,
    session,ambient,soundscape,cosmicEvent,journal,maps,atlas,activeMap,updateSession,startSession,endSession,
    setAtmosphere,setSoundscape,applySoundscapePreset,triggerCosmicEvent,setActiveMap,nextTurn,reorderInitiative,endCombat,
    addJournal,updateJournal,deleteJournal,addAtlasDiscovery,useQuickAbility,useSummonAbility,updateSummonHp,updateSummonVc,useSummonAction,storeSummon,
  ]);

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

export function useExperience(){
  const value=useContext(ExperienceContext);
  if(!value) throw new Error('useExperience precisa estar dentro de ExperienceProvider');
  return value;
}

// MOBILE NAVIGATION FIX 2026-09-10
const MOBILE_ALLOWED_NAV_IDS = new Set(['session','fichas','bestiario','personagens','prologo','classes','cronicas','livro','regras']);

// DESKTOP FULL NAV 2026-09-11
export function ImmersiveNavigation({ tab, onNavigate, accent='#A855F7', masterMode=false }){
  const [mobileMenu,setMobileMenu]=useState(false);
  const { combat, selectedSheet, access }=useExperience();
  const desktopGroups = NAV_GROUPS.map(group=>({
    ...group,
    items:group.items.filter(item=>(item.id!=='inimigos'||masterMode)&&(item.id!=='visitantes'||masterMode)).map(item=>access?.role==='visitor'&&item.id==='fichas'?{...item,label:'Meus personagens'}:item),
  })).filter(group=>group.items.length);
  const go=id=>{ onNavigate(id); setMobileMenu(false); };
  // MOBILE CLEAN NAV 2026-09-15
  const mobileMain=[
    {id:'session',label:'Início',icon:'⌂'},
    {id:'fichas',label:access?.role==='visitor'?'Personagens':'Ficha',icon:'📋'},
    {id:'cronicas',label:'Crônicas',icon:'🗒️'},
    {id:'livro',label:'Livro',icon:'✦'},
  ];
  const mobileAllowedGroups20260910 = NAV_GROUPS.map(group=>({ ...group, items:group.items.filter(item=>MOBILE_ALLOWED_NAV_IDS.has(item.id)) })).filter(group=>group.items.length);
  const mobileGroups=desktopGroups.map(g=>({...g,items:g.items.filter(i=>i.id!=='mapabatalha')})).filter(g=>g.items.length);
  return <>
    <aside className="grim-nav">
      <button className="grim-brand" onClick={()=>go('session')} title="Dinastia E"><span>DE</span><b>Dinastia E</b></button>
      <div className="grim-groups">
        {desktopGroups.map(group=><div className="grim-group" key={group.id}>
          <div className="grim-group-title"><span>{group.icon}</span><b>{group.label}</b></div>
          {group.items.map(item=><button key={item.id} onClick={()=>go(item.id)} className={`grim-link ${tab===item.id?'active':''}`} style={{'--accent':accent}} title={item.label} aria-label={item.label}>
            <span className="grim-icon">{item.icon}</span><span className="grim-label">{item.label}</span>
            {item.id==='mapabatalha'&&combat?.active&&<i className="grim-live"/>}
          </button>)}
        </div>)}
      </div>
      <div className="grim-player-mini">
        <div className="grim-avatar">{selectedSheet?.foto?<img src={selectedSheet.foto}/>:<span>{selectedSheet?.nome?.[0]||'?'}</span>}</div>
        <div><b>{selectedSheet?.nome||'Escolha sua ficha'}</b><small>{combat?.active?'Em combate':'Explorando Cosmum'}</small></div>
      </div>
    </aside>

    <nav className="mobile-dock">
      {mobileMain.map(item=><button key={item.id} className={tab===item.id?'active':''} onClick={()=>go(item.id)} style={{'--accent':accent}}><span>{item.icon}</span><small>{item.label}</small>{item.id==='mapabatalha'&&combat?.active&&<i/>}</button>)}
      <button onClick={()=>setMobileMenu(true)}><span>☰</span><small>Menu</small></button>
    </nav>
    {mobileMenu&&<div className="mobile-menu-backdrop" onClick={()=>setMobileMenu(false)}>
      <div className="mobile-menu-sheet" onClick={e=>e.stopPropagation()}>
        <div className="mobile-menu-head"><b>Grimório de Navegação</b><button onClick={()=>setMobileMenu(false)}>✕</button></div>
        {mobileGroups.map(group=><section key={group.id}><h4>{group.icon} {group.label}</h4><div>{/* MOBILE MENU MAP FILTER 2026-09-15 */ group.items.filter(item=>item.id!=='mapamundi'&&item.id!=='mapabatalha').map(item=><button key={item.id} onClick={()=>go(item.id)} className={tab===item.id?'active':''}>{item.icon} {item.label}</button>)}</div></section>)}
      </div>
    </div>}
  </>;
}

export function SessionDashboard({ onNavigate, masterMode }){
  const {
    session,combat,combatState,ambient,selectedSheet,selectedSheetId,setSelectedSheetId,sheets,journal,atlas,activeMap,updateJournal,deleteJournal,
  }=useExperience();
  const maxHp=selectedSheet?getSheetMaxHp(selectedSheet):1;
  const hp=Number(selectedSheet?.hp||0);
  const hpPct=clamp((hp/Math.max(1,maxHp))*100,0,100);
  const cls=CLASSES.find(c=>c.id===selectedSheet?.classe);
  const current=combatState?.initiative?.[combatState.turnIdx||0];
  const recent=journal.slice(0,6);
  const enter=()=>{
    const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
    onNavigate(mobile ? 'fichas' : (combat?.active||activeMap?.activeId?'mapabatalha':'fichas'));
  };
  const atlasStats={visited:atlas.filter(x=>x.status==='visitado').length,discovered:atlas.filter(x=>x.status==='descoberto').length,rumor:atlas.filter(x=>x.status==='rumor').length};

  return <div className="session-page">
    <div className="session-hero">
      <div className="session-sigil">✦</div>
      <div className="session-kicker">{session.active?'SESSÃO EM ANDAMENTO':'LIVRO DO MUNDO'}</div>
      <h2>{session.title||'Dinastia E'}</h2>
      <p>{session.subtitle||session.objective||'O próximo capítulo ainda aguarda para ser escrito.'}</p>
      <div className="session-hero-meta">
        {session.location&&<span>⌖ {session.location}</span>}
        {combat?.active&&<span className="danger">⚔ Rodada {combatState.round||1}</span>}
        {ambient?.playing&&<span>♫ {ambient.nome||'Trilha ativa'}</span>}
      </div>
      <button className="enter-session" onClick={enter}>{session.active?'Entrar na Sessão':'Abrir meu Livro'} <span>→</span></button>
    </div>

    <div className="session-grid">
      <section className="session-card character-card">
        <header><span>SEU PERSONAGEM</span><select value={selectedSheetId||''} onChange={e=>setSelectedSheetId(e.target.value)}>{sheets.map(s=><option key={s.id} value={s.id}>{s.nome||'Personagem'}</option>)}</select></header>
        {selectedSheet?<div className="character-compact">
          <div className="character-portrait" style={{'--c':cls?.color||'#A855F7'}}>{selectedSheet.foto?<img src={selectedSheet.foto}/>:<span>{selectedSheet.nome?.[0]||'?'}</span>}</div>
          <div className="character-info"><h3>{selectedSheet.nome||'Sem nome'}</h3><p>{cls?.name||'Classe personalizada'} · Nv {selectedSheet.nivel||1}</p>
            <div className="hp-track"><i style={{width:`${hpPct}%`}}/></div><div className="stat-row"><span>❤ {hp}/{maxHp}</span><span>✦ {selectedSheet.vigos||0} VC</span></div>
          </div>
          <button onClick={()=>onNavigate('fichas')}>Abrir ficha</button>
        </div>:<div className="empty-state">Nenhuma ficha disponível.</div>}
      </section>

      <section className="session-card objective-card"><header>OBJETIVO ATUAL</header><div className="objective-glyph">◇</div><h3>{session.objective||'Nenhum objetivo foi revelado.'}</h3><p>{session.location?`Local atual: ${session.location}`:'O Mestre ainda não definiu o local atual.'}</p></section>

      <section className="session-card turn-card"><header>ESTADO DA MESA</header>{combat?.active?<><div className="turn-now"><small>AGORA</small><strong>{current?.nome||combat.currentNome||'—'}</strong><span>Rodada {combatState.round||1}</span></div><button onClick={()=>onNavigate('mapabatalha')}>Ir para o combate</button></>:<><div className="peace-orb">◉</div><strong>Sem combate ativo</strong><p>A mesa está em exploração ou narrativa.</p></>}</section>

      <section className="session-card journal-card"><header><span>DIÁRIO VIVO</span><span>{recent.length} registros recentes</span></header><div className="journal-mini">{recent.length?recent.map(item=><div key={item.id}><i style={{background:item.color||'#A855F7'}}>{item.icon||'•'}</i><p>{item.text}</p><time>{item.round?`R${item.round} · `:''}{new Date(item.ts||Date.now()).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}{item.editedAt?' · editado':''}</time>{masterMode&&<span className="journal-mini-actions"><button title="Editar" onClick={async()=>{const next=window.prompt('Editar registro do Diário Vivo:',item.text);if(next!=null&&next.trim())await updateJournal(item.id,next)}}>✎</button><button title="Excluir" onClick={()=>window.confirm('Excluir este registro do Diário Vivo?')&&deleteJournal(item.id)}>✕</button></span>}</div>):<div className="empty-state">A sessão ainda não deixou rastros.</div>}</div></section>

      <section className="session-card atlas-card"><header>ATLAS DE DESCOBERTAS</header><div className="atlas-stats"><div><b>{atlasStats.visited}</b><span>Visitados</span></div><div><b>{atlasStats.discovered}</b><span>Descobertos</span></div><div><b>{atlasStats.rumor}</b><span>Rumores</span></div></div><button onClick={()=>onNavigate('mapamundi')}>Abrir Atlas</button></section>

      <section className="session-card soundtrack-card"><header>ATMOSFERA</header><div className={`sound-wave ${ambient?.playing?'playing':''}`}><i/><i/><i/><i/><i/></div><h3>{ambient?.playing?(ambient.nome||'Trilha em reprodução'):'Silêncio entre as estrelas'}</h3><p>{masterMode?'Você controla a atmosfera pela Mesa do Mestre.':'A trilha e o ambiente são sincronizados pelo Mestre.'}</p></section>
    </div>
  </div>;
}

function CombatResourceOrb({value,max,color,label,className=''}){
  const safeMax=Math.max(1,Number(max)||1);
  const safeValue=clamp(Number(value||0),0,safeMax);
  const pct=clamp((safeValue/safeMax)*100,0,100);
  const surface=55-(pct*.5);
  const clipRef=useRef('combat_orb_'+Math.random().toString(36).slice(2,9));
  return <span className={'combat-resource-orb '+className} style={{'--orb-color':color}} aria-label={label+' '+safeValue+' de '+safeMax}>
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <defs><clipPath id={clipRef.current}><circle cx="30" cy="30" r="25"/></clipPath></defs>
      <circle className="combat-orb-shell" cx="30" cy="30" r="28"/>
      <circle className="combat-orb-depth" cx="30" cy="30" r="25"/>
      <rect className="combat-orb-liquid" x="5" y={surface} width="50" height={55-surface} clipPath={'url(#'+clipRef.current+')'}/>
      <g transform={'translate(0 '+surface+')'} clipPath={'url(#'+clipRef.current+')'}><path className="combat-orb-wave" d="M-18 0 Q-8 -4 2 0 T22 0 T42 0 T62 0 T82 0 V60 H-18 Z"/></g>
      <ellipse className="combat-orb-glint" cx="21" cy="17" rx="8" ry="4"/>
    </svg>
    <b>{safeValue}</b><small>{label}</small>
  </span>;
}

function CombatHotkeys({enabled}){
  useEffect(()=>{
    if(!enabled)return undefined;
    const onKey=event=>{
      if(event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;
      const tag=String(event.target?.tagName||'').toLowerCase();
      if(['input','textarea','select'].includes(tag)||event.target?.isContentEditable)return;
      const index={'1':0,'2':1,'3':2,'4':3}[String(event.key||'')];
      if(index==null)return;
      const buttons=Array.from(document.querySelectorAll('.combat-action-abilities .combat-ability.hud-ability'));
      const button=buttons[index];
      if(!button||button.disabled)return;
      event.preventDefault();
      button.click();
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[enabled]);
  return null;
}

function FloatingDamageLayer(){
  const { selectedSheet }=useExperience();
  const [events,setEvents]=useState([]);
  const timers=useRef(new Set());
  useEffect(()=>{
    const normalize=value=>String(value||'').replace(/^[pe]_/, '');
    const removeLater=(id,delay)=>{
      const timer=window.setTimeout(()=>{
        timers.current.delete(timer);
        setEvents(previous=>previous.filter(item=>item.id!==id));
      },delay);
      timers.current.add(timer);
    };
    const receive=customEvent=>{
      const detail=customEvent?.detail||{};
      const diff=Number(detail.diff||0);
      if(!diff)return;
      const entityId=normalize(detail.entityId);
      const nodes=Array.from(document.querySelectorAll('[data-entity-id],[data-combat-entity-id]')).filter(node=>normalize(node.dataset.entityId||node.dataset.combatEntityId)===entityId);
      const visible=nodes.map(node=>({node,rect:node.getBoundingClientRect()})).filter(item=>item.rect.width>0&&item.rect.height>0&&item.rect.bottom>0&&item.rect.top<window.innerHeight);
      visible.sort((a,b)=>Number(b.node.classList.contains('combat-action-portrait'))-Number(a.node.classList.contains('combat-action-portrait'))||(b.rect.width*b.rect.height)-(a.rect.width*a.rect.height));
      const rect=visible[0]?.rect;
      const id=String(detail.id||nowId('floating_hp'));
      const row={...detail,id,diff,x:rect?rect.left+rect.width/2:window.innerWidth/2,y:rect?Math.max(40,rect.top+rect.height*.16):window.innerHeight*.42};
      setEvents(previous=>[...previous.slice(-7),row]);
      removeLater(id,1300);
      if(detail.death){
        window.dispatchEvent(new CustomEvent('dinastia:cosmic-live',{detail:{id:'death_'+entityId+'_'+String(detail.ts||Date.now()),type:'death',icon:'\uD83D\uDC80',text:String(detail.name||'Combatente')+' caiu em combate',color:'#E8193C',soft:false,ts:Number(detail.ts||Date.now())}}));
        if(entityId&&entityId===normalize(selectedSheet?.id)){
          document.documentElement.classList.add('g3-player-fallen');
          const deathTimer=window.setTimeout(()=>{timers.current.delete(deathTimer);document.documentElement.classList.remove('g3-player-fallen');},3000);
          timers.current.add(deathTimer);
        }
      }
    };
    window.addEventListener('dinastia:hp-change',receive);
    return()=>{
      window.removeEventListener('dinastia:hp-change',receive);
      timers.current.forEach(timer=>window.clearTimeout(timer));
      timers.current.clear();
      document.documentElement.classList.remove('g3-player-fallen');
    };
  },[selectedSheet?.id]);
  if(typeof document==='undefined'||!events.length)return null;
  return createPortal(<div className="combat-floating-damage-layer" aria-live="polite">{events.map(event=>{
    const value=Math.abs(Number(event.diff||0));
    const text=(Number(event.diff||0)>0?'+':'\u2212')+value;
    return <span key={event.id} className={'combat-floating-damage '+(event.diff>0?'heal':'damage')+(event.critical?' critical':'')} style={{left:event.x,top:event.y}}>{text}</span>;
  })}</div>,document.body);
}

function CombatHud({ onNavigate }){
  const { combat,combatState,selectedSheet,selectedClass,useQuickAbility,addJournal,masterMode }=useExperience();
  const [custom,setCustom]=useState([]);
  const [pending,setPending]=useState(null);
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    const root=document.documentElement;
    root.classList.toggle('dinastia-combat-hud',!!combat?.active);
    return()=>root.classList.remove('dinastia-combat-hud');
  },[combat?.active]);

  useEffect(()=>{
    if(!selectedSheet?.id){setCustom([]);return;}
    return onSnapshot(doc(db,'config','customAbilities'),snap=>{
      const data=snap.exists()?(snap.data()||{}):{};
      const rows=Array.isArray(data?.[String(selectedSheet.id)])?data[String(selectedSheet.id)]:[];
      setCustom(rows.filter(Boolean));
    },()=>setCustom([]));
  },[selectedSheet?.id]);

  if(!combat?.active||!selectedSheet) return null;

  const level=Number(selectedSheet.nivel||1);
  const maxHp=getSheetMaxHp(selectedSheet);
  const hp=Number(selectedSheet.hp||0);
  const hpPct=clamp((hp/Math.max(1,maxHp))*100,0,100);
  const vc=Number(selectedSheet.vigos||0);
  const maxVc=Math.max(8,Number(selectedSheet.vigos_max||selectedSheet.maxVigos||8));
  const current=combatState?.initiative?.[Number(combatState.turnIdx||0)];
  const isMyTurn=current?.type==='player'&&String(current?.id||'').replace(/^p_/,'')===String(selectedSheet.id);
  const classNormal=Array.isArray(selectedClass?.normal)?selectedClass.normal:[];
  const classSpecial=Array.isArray(selectedClass?.specials)?selectedClass.specials:[];
  const classAbilities=[...classNormal,...classSpecial].map(a=>({...a,_locked:Number(a.req||0)>level,_source:'class'}));
  const customAbilities=custom
    .filter(a=>String(a?.tipoHab||'').toLowerCase()!=='passiva')
    .map(a=>({...a,name:a.name||a.nome,_locked:Number(a.req||0)>level,_source:'custom'}));
  const abilities=[...classAbilities,...customAbilities];
  const targets=Array.isArray(combatState?.initiative)?combatState.initiative:[];

  const choose=a=>{if(a?._locked)return;setPending(a)};
  const emitAction=async(target)=>{
    if(!pending||busy)return;
    const simple=pending._simple===true;
    const cost=simple?1:Number(pending.cost??pending.custo??0);
    if(vc<cost)return;
    setBusy(true);
    try{
      let accepted=true;
      if(simple){
        await updateDoc(doc(db,'sheets',String(selectedSheet.id)),{vigos:Math.max(0,vc-1)});
      }else{
        accepted=await useQuickAbility(pending);
      }
      if(!accepted)return;
      const ts=Date.now();
      const id=`combat_action_${ts}_${Math.random().toString(36).slice(2,8)}`;
      const abilityName=simple?'Ataque simples':String(pending.name||pending.nome||'Habilidade');
      const targetName=target?.nome||'Sem alvo';
      const event={
        id,type:'combat_action',ts,source:'combat-hud',
        actorId:String(selectedSheet.id),actorName:selectedSheet.nome||'Personagem',
        abilityName,targetId:String(target?.id||''),targetName,targetType:target?.type||'none',
        icon:selectedClass?.icon||'✦',color:selectedClass?.color||'#A855F7',
        simple,cost,round:Number(combatState?.round||1),
      };
      await Promise.all([
        setDoc(doc(db,'config','combat_action'),event,{merge:true}),
        setDoc(doc(db,'combat_action_events',id),event,{merge:true}),
      ]);
      await addJournal?.(`${event.actorName} usou ${abilityName}${target?.nome?` em ${target.nome}`:' sem alvo'}.`,'combat',{
        id,ts,round:event.round,icon:event.icon,color:event.color,source:'combat-action',
      });
      setPending(null);
    }finally{setBusy(false)}
  };

  const simple={name:'Ataque simples',cost:1,desc:'Corte, tiro, chute, soco ou outro ataque básico.',_simple:true,_locked:false};
  return <div className={`combat-action-hud ${isMyTurn?'my-turn':''}`} style={{'--combat-accent':selectedClass?.color||'#A855F7'}}>
    <CombatHotkeys enabled={!masterMode&&isMyTurn}/>
    <div className="combat-action-character">
      <div className="combat-action-orbs">
        <CombatResourceOrb value={hp} max={maxHp} color="#E8193C" label="HP" className="hp"/>
        <div className="combat-action-portrait g3-portrait g3-portrait-lg" data-entity-id={String(selectedSheet.id||'')} data-classe={String(selectedSheet.classe||'').toLowerCase()} title={'Ornamento de '+(selectedClass?.name||'classe')}>{selectedSheet.foto?<img src={selectedSheet.foto} alt=""/>:<span>{selectedClass?.icon||selectedSheet.nome?.[0]||'✦'}</span>}</div>
        <CombatResourceOrb value={vc} max={maxVc} color="#a855f7" label="VC" className="vc"/>
      </div>
      <div className="combat-action-identity"><small>{isMyTurn?'✦ SEU TURNO':`VEZ DE ${current?.nome||'—'}`}</small><b>{selectedSheet.nome||'Personagem'}</b><span>{selectedClass?.icon||'✦'} {selectedClass?.name||'Classe'}</span>{!masterMode&&<span className="combat-hotkey-status">{isMyTurn?'ATALHOS 1\u20134 ATIVOS':'1\u20134 NO SEU TURNO'}</span>}</div>
    </div>

    <div className="combat-action-abilities">
      <button className="combat-ability simple" disabled={vc<1||busy} onClick={()=>choose(simple)}><span>⚔</span><b>Ataque simples</b><small>1 VC</small></button>
      {abilities.map((a,i)=>{
        const key=String(a.id||a.name||a.nome||i);
        const cd=Number(selectedSheet.cooldowns?.[String(a.id||a.name||a.nome||'')]||0);
        const cost=Number(a.cost??a.custo??0);
        const disabled=busy||a._locked||cd>0||vc<cost;
        return <button className="combat-ability hud-ability" key={key} disabled={disabled} onClick={()=>choose(a)} title={a.desc||a.descricao||''} aria-keyshortcuts={i<4?String(i+1):undefined}>
          {i<4&&<kbd>{i+1}</kbd>}<span>{a._source==='custom'?'✦':selectedClass?.icon||'✦'}</span>
          <b>{a.name||a.nome||'Habilidade'}</b>
          <small>{a._locked?`Nv ${a.req}`:cd>0?`⏳ ${cd}`:`${cost} VC`}</small>
        </button>
      })}
    </div>

    <div className="combat-action-side">
      <button onClick={()=>onNavigate?.('fichas')} title="Abrir ficha">📋</button>
      <button onClick={()=>onNavigate?.('mapabatalha')} title="Mapa de batalha">🗡️</button>
    </div>

    {pending&&<div className="combat-target-picker">
      <header><div><small>ESCOLHA O ALVO</small><b>{pending._simple?'Ataque simples':pending.name||pending.nome}</b></div><button onClick={()=>setPending(null)}>✕</button></header>
      <div className="combat-target-grid">
        <button className="no-target" disabled={busy} onClick={()=>emitAction(null)}><span>◇</span><b>Sem alvo</b><small>Ação sem alvo específico</small></button>
        {targets.map((t,i)=><button key={t.id||i} disabled={busy} className={String(t.id||'')===String(current?.id||'')?'current':''} onClick={()=>emitAction(t)}>
          <span className="target-avatar">{t.foto?<img src={t.foto} alt=""/>:t.nome?.[0]||'?'}</span><b>{t.nome||'Combatente'}</b><small>{t.type==='enemy'?'Inimigo':t.type==='summon'?'Invocação':'Personagem'}</small>
        </button>)}
      </div>
    </div>}
  </div>;
}

function CombatActionPulse(){
  const [event,setEvent]=useState(null);
  useEffect(()=>{
    const gate = createLiveEventGate();
    return onSnapshot(doc(db,'config','combat_action'),{includeMetadataChanges:true},snap=>{
      const next = snap.exists() ? snap.data() : null;
      const entries = next?.id ? [{key:String(next.id),value:next}] : [];
      gate(snap,entries).forEach(entry=>setEvent(entry.value));
    },()=>{});
  },[]);
  useEffect(()=>{if(!event?.id)return undefined;const timer=window.setTimeout(()=>setEvent(null),2100);return()=>window.clearTimeout(timer);},[event?.id]);
  if(!event)return null;
  return <div className="combat-action-pulse compact" style={{'--action-color':event.color||'#A855F7'}}>
    <div className="combat-action-wave wave-a"/><div className="combat-action-wave wave-b"/>
    <div className="combat-action-pulse-core"><span className="combat-action-class-icon">{event.icon||'✦'}</span><strong>{event.abilityName||'Habilidade'}</strong></div>
  </div>;
}

function TurnRibbon(){
  const { tab,combat,combatState }=useExperience();
  if(!combat?.active||tab!=='mapabatalha'||!combatState?.initiative?.length) return null;
  const list=Array.isArray(combatState.initiative)?combatState.initiative:[];
  const idx=Math.max(0,Math.min(Number(combatState.turnIdx||0),list.length-1));
  return <div className="turn-ribbon"><div className="turn-round">RODADA <b>{combatState.round||1}</b></div><div className="turn-list">{list.map((c,i)=><div key={c.id||i} className={'turn-chip '+(i===idx?'active ':'')+(c.type==='enemy'?'enemy':'')} style={{'--c':c.color||'#A855F7'}}><div>{c.foto?<img src={c.foto} alt="" decoding="async"/>:<span>{c.nome?.[0]||'?'}</span>}</div><small>{c.nome||'Combatente'}</small>{i===idx&&<b>AGORA</b>}</div>)}</div></div>;
}

function CombatStatusDamageFx(){
  const { selectedSheet }=useExperience();
  const [event,setEvent]=useState(null);
  const primed=useRef(false);
  const seen=useRef(new Set());
  useEffect(()=>{
    if(!selectedSheet?.id)return;
    primed.current=false;seen.current=new Set();
    const q=query(collection(db,'combat_effect_events'),orderBy('ts','desc'),limit(20));
    const unsub=onSnapshot(q,snap=>{
      if(!primed.current){primed.current=true;snap.docs.forEach(d=>seen.current.add(d.id));return;}
      snap.docChanges().forEach(change=>{
        if(change.type==='removed'||seen.current.has(change.doc.id))return;
        seen.current.add(change.doc.id);
        const row=change.doc.data()||{};
        if(String(row.sheetId||'')!==String(selectedSheet.id)||Number(row.damage||0)<=0)return;
        setEvent({...row,_id:change.doc.id});
      });
    },()=>{});
    return()=>unsub();
  },[selectedSheet?.id]);
  useEffect(()=>{if(!event)return;const timer=setTimeout(()=>setEvent(null),2200);return()=>clearTimeout(timer)},[event?._id]);
  if(!event)return null;
  return <div className="combat-status-damage-fx" key={event._id}><div><strong>−1 HP</strong><span>{event.reason||'Efeito negativo'}</span><small>Dano de status da nova rodada</small></div></div>;
}

function CharacterStateAura(){
  const { selectedSheet }=useExperience();
  if(!selectedSheet) return null;
  const max=getSheetMaxHp(selectedSheet); const ratio=Number(selectedSheet.hp||0)/Math.max(1,max);
  const activeStatuses=STATUS_LIST.filter(s=>selectedSheet.status?.[s.id]);
  const dominant=activeStatuses[0];
  const className=ratio<=0.2?'critical':dominant?'statused':ratio<=0.4?'wounded':'';
  if(!className) return null;
  return <div className={`character-state-aura ${className}`} style={{'--state-color':dominant?.color||'#E8193C'}}><span>{ratio<=0.2?'❤ VIDA CRÍTICA':dominant?`${dominant.icon} ${dominant.label}`:'❤ FERIDO'}</span></div>;
}

function CosmicEventLayer(){
  const { cosmicEvent }=useExperience();
  const [visible,setVisible]=useState(false);
  const timer=useRef(null);
  useEffect(()=>{
    if(!cosmicEvent?.id||Date.now()-Number(cosmicEvent.ts||0)>7000) return;
    setVisible(true); clearTimeout(timer.current); timer.current=setTimeout(()=>setVisible(false),cosmicEvent.soft?1600:3300);
    return()=>clearTimeout(timer.current);
  },[cosmicEvent?.id]);
  if(!visible||!cosmicEvent) return null;
  const info=EVENT_TYPES[cosmicEvent.type]||{icon:cosmicEvent.icon||'✦',color:cosmicEvent.color||'#A855F7'};
  return <div className={`cosmic-event cosmic-${cosmicEvent.type||'message'} ${cosmicEvent.soft?'soft':''}`} style={{'--event-color':cosmicEvent.color||info.color}}><div className="cosmic-lines"/><div className="cosmic-ring"/><div className="cosmic-message"><span>{cosmicEvent.icon||info.icon}</span><strong>{cosmicEvent.text||info.label}</strong></div></div>;
}

function JournalDrawer(){
  const { journal,addJournal,updateJournal,deleteJournal,masterMode }=useExperience();
  const [open,setOpen]=useState(false); const [text,setText]=useState(''); const [editingId,setEditingId]=useState(''); const [editingText,setEditingText]=useState('');
  const add=async()=>{if(!text.trim())return;await addJournal(text,'story',{memory:true,icon:'✦',color:'#C8A8E8'});setText('');};
  const beginEdit=item=>{setEditingId(String(item.id));setEditingText(item.text||'');};
  const saveEdit=async()=>{if(!editingId||!editingText.trim())return;await updateJournal(editingId,editingText);setEditingId('');setEditingText('');};
  const remove=async item=>{if(!window.confirm('Excluir este registro do Diário Vivo?'))return;await deleteJournal(item.id);if(String(editingId)===String(item.id)){setEditingId('');setEditingText('');}};
  return <><button className="journal-fab" onClick={()=>setOpen(true)} title="Diário Vivo">🗒️</button>{open&&<div className="journal-backdrop" onClick={()=>setOpen(false)}><aside className="journal-drawer" onClick={e=>e.stopPropagation()}><header><div><small>MEMÓRIAS DA MESA</small><h3>Diário Vivo</h3></div><button onClick={()=>setOpen(false)}>✕</button></header>{masterMode&&<div className="journal-add"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="Registrar uma memória..."/><button onClick={add}>Inscrever</button></div>}<div className="journal-timeline">{journal.map(item=><article key={item.id} className={item.memory?'memory':''}><i style={{'--c':item.color||'#A855F7'}}>{item.icon||'•'}</i><div>{editingId===String(item.id)?<div className="journal-inline-edit"><input value={editingText} onChange={e=>setEditingText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')saveEdit();if(e.key==='Escape'){setEditingId('');setEditingText('')}}} autoFocus/><span><button onClick={saveEdit}>Salvar</button><button onClick={()=>{setEditingId('');setEditingText('')}}>Cancelar</button></span></div>:<><p>{item.text}</p><small>{item.round?`Rodada ${item.round} · `:''}{new Date(item.ts||Date.now()).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}{item.editedAt?' · editado':''}</small></>}</div>{item.memory&&<b>MEMÓRIA</b>}{masterMode&&editingId!==String(item.id)&&<span className="journal-entry-actions"><button title="Editar" onClick={()=>beginEdit(item)}>✎</button><button title="Excluir" onClick={()=>remove(item)}>🗑</button></span>}</article>)}</div></aside></div>}</>;
}

function AtlasDiscoveryPanel(){
  const { tab,atlas,masterMode }=useExperience();
  const [open,setOpen]=useState(true);
  const [editingId,setEditingId]=useState(null);
  const [draft,setDraft]=useState({name:'',status:'rumor',note:''});
  if(tab!=='mapamundi') return null;
  const order={visitado:0,descoberto:1,rumor:2};
  const items=[...atlas].sort((a,b)=>(order[a.status]??9)-(order[b.status]??9));
  const labelStatus=status=>status==='visitado'?'Visitado':status==='descoberto'?'Descoberto':'Rumor';
  const startEdit=item=>{setEditingId(String(item.id));setDraft({name:item.name||'',status:item.status||'rumor',note:item.note||''});};
  const cancelEdit=()=>{setEditingId(null);setDraft({name:'',status:'rumor',note:''});};
  const saveEdit=async item=>{
    const name=String(draft.name||'').trim();
    if(!name)return;
    await setDoc(doc(db,'atlas_discoveries',String(item.id)),{name,status:draft.status||'rumor',note:String(draft.note||''),updatedAt:Date.now()},{merge:true});
    cancelEdit();
  };
  const removeEntry=async item=>{
    if(!window.confirm('Excluir este registro de exploração?'))return;
    await deleteDoc(doc(db,'atlas_discoveries',String(item.id)));
    if(String(editingId)===String(item.id))cancelEdit();
  };
  return <aside className={'atlas-overlay '+(open?'open':'')}>
    <button className="atlas-toggle" onClick={()=>setOpen(x=>!x)}>🌍 {open?'Fechar':'Atlas'}</button>
    {open&&<>
      <header><small>REGISTRO DE EXPLORAÇÃO</small><h3>Descobertas</h3></header>
      <div className="atlas-list">{items.length?items.map(item=>{
        const editing=masterMode&&String(editingId)===String(item.id);
        return <article key={item.id} className={'atlas-'+(item.status||'rumor')+' '+(editing?'editing':'')}>
          {editing?<div className="atlas-edit-form">
            <label>Local<input value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} placeholder="Nome do local"/></label>
            <label>Registro<select value={draft.status} onChange={e=>setDraft(d=>({...d,status:e.target.value}))}><option value="rumor">Rumor</option><option value="descoberto">Descoberto</option><option value="visitado">Visitado</option></select></label>
            <label className="wide">Observação<textarea rows="3" value={draft.note} onChange={e=>setDraft(d=>({...d,note:e.target.value}))} placeholder="Anotação sobre a exploração..."/></label>
            <div className="atlas-edit-actions"><button onClick={()=>saveEdit(item)} disabled={!String(draft.name||'').trim()}>Salvar</button><button onClick={cancelEdit}>Cancelar</button></div>
          </div>:<>
            <span>{item.status==='visitado'?'✦':item.status==='descoberto'?'◇':'?'}</span>
            <div className="atlas-entry-copy"><b>{item.name}</b><small>{labelStatus(item.status)}</small>{item.note&&<p>{item.note}</p>}</div>
            {masterMode&&<div className="atlas-entry-actions"><button onClick={()=>startEdit(item)} title="Editar registro" aria-label="Editar registro">✎</button><button className="danger" onClick={()=>removeEntry(item)} title="Excluir registro" aria-label="Excluir registro">✕</button></div>}
          </>}
        </article>;
      }):<div className="empty-state">Nenhum local registrado ainda.</div>}</div>
    </>}
  </aside>;
}

function SoundscapeLayer(){
  const { soundscape }=useExperience();
  const ctxRef=useRef(null); const nodesRef=useRef({}); const [ready,setReady]=useState(false); const [muted,setMuted]=useState(false);
  const createNoise=(ctx,filterType,freq)=>{
    const length=ctx.sampleRate*2; const buffer=ctx.createBuffer(1,length,ctx.sampleRate); const data=buffer.getChannelData(0);
    for(let i=0;i<length;i++) data[i]=Math.random()*2-1;
    const source=ctx.createBufferSource(); source.buffer=buffer; source.loop=true;
    const filter=ctx.createBiquadFilter(); filter.type=filterType; filter.frequency.value=freq;
    const gain=ctx.createGain(); gain.gain.value=0; source.connect(filter).connect(gain); source.start();
    return {source,filter,gain};
  };
  const ensure=useCallback(()=>{
    if(ctxRef.current){ctxRef.current.resume?.();setReady(true);return;}
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
    const ctx=new AC(); const master=ctx.createGain(); master.gain.value=muted?0:1; master.connect(ctx.destination);
    const rain=createNoise(ctx,'highpass',3600); rain.gain.connect(master);
    const wind=createNoise(ctx,'lowpass',720); wind.gain.connect(master);
    const fire=createNoise(ctx,'bandpass',1200); fire.filter.Q.value=.7; fire.gain.connect(master);
    const whispers=createNoise(ctx,'bandpass',1850); whispers.filter.Q.value=1.8; whispers.gain.connect(master);
    const humOsc=ctx.createOscillator(); humOsc.type='sine'; humOsc.frequency.value=55; const humGain=ctx.createGain();humGain.gain.value=0;humOsc.connect(humGain).connect(master);humOsc.start();
    ctxRef.current=ctx; nodesRef.current={master,rain,wind,fire,whispers,hum:{gain:humGain,source:humOsc}}; setReady(true); ctx.resume?.();
  },[muted]);
  useEffect(()=>{const activate=()=>ensure();window.addEventListener('pointerdown',activate,{once:true});return()=>window.removeEventListener('pointerdown',activate);},[ensure]);
  useEffect(()=>{
    const n=nodesRef.current;if(!ctxRef.current||!n.master)return;
    const t=ctxRef.current.currentTime; const set=(node,value,max)=>node?.gain?.gain?.setTargetAtTime((clamp(value,0,100)/100)*max,t,.45);
    set(n.rain,soundscape.rain,.10); set(n.wind,soundscape.wind,.14); set(n.fire,soundscape.fire,.085); set(n.whispers,soundscape.whispers,.055); set(n.hum,soundscape.hum,.08);
    n.master.gain.setTargetAtTime(muted?0:1,t,.25);
  },[soundscape,muted,ready]);
  const active=['rain','wind','fire','whispers','hum'].some(k=>Number(soundscape?.[k]||0)>0);
  if(!active) return null;
  return <button className={`soundscape-local ${ready?'ready':''}`} onClick={()=>{ensure();setMuted(x=>!x)}} title={muted?'Ativar soundscape':'Silenciar soundscape'}>{muted?'🌫️×':'🌫️'}<span>{soundscape.label||SOUNDSCAPE_PRESETS[soundscape.preset]?.label||'Ambiente'}</span></button>;
}

function MasterConsole(){
  const {
    masterMode,session,startSession,endSession,updateSession,combat,combatState,nextTurn,reorderInitiative,endCombat,maps,activeMap,setActiveMap,
    setAtmosphere,soundscape,setSoundscape,applySoundscapePreset,triggerCosmicEvent,addAtlasDiscovery,addJournal,
  }=useExperience();
  const [open,setOpen]=useState(false); const [section,setSection]=useState('session');
  const [draft,setDraft]=useState({title:'',subtitle:'',location:'',objective:''});
  const [eventText,setEventText]=useState(''); const [eventType,setEventType]=useState('message');
  const [atlasForm,setAtlasForm]=useState({name:'',status:'rumor',note:''}); const [memory,setMemory]=useState('');
  useEffect(()=>setDraft({title:session.title||'',subtitle:session.subtitle||'',location:session.location||'',objective:session.objective||''}),[session.title,session.subtitle,session.location,session.objective]);
  if(!masterMode) return null;
  const saveSession=()=>updateSession(draft);
  const addAtlas=async()=>{await addAtlasDiscovery(atlasForm);setAtlasForm({name:'',status:'rumor',note:''});};
  const addMemory=async()=>{if(!memory.trim())return;await addJournal(memory,'story',{memory:true,icon:'✦',color:'#E8A020'});setMemory('');};
  return <><button className="master-console-fab" onClick={()=>setOpen(true)}>✦ <span>Mesa do Mestre</span></button>{open&&<div className="master-console-backdrop" onClick={()=>setOpen(false)}><aside className="master-console" onClick={e=>e.stopPropagation()}><header><div><small>CONTROLE DE CAMPANHA</small><h2>Mesa do Mestre</h2></div><button onClick={()=>setOpen(false)}>✕</button></header><nav>{[['session','Sessão','✦'],['battle','Combate','⚔'],['ambience','Ambiente','🌌'],['event','Eventos','✹'],['atlas','Atlas','🌍'],['journal','Diário','🗒️']].map(x=><button key={x[0]} className={section===x[0]?'active':''} onClick={()=>setSection(x[0])}><span>{x[2]}</span>{x[1]}</button>)}</nav><div className="master-body">
    {section==='session'&&<div className="master-section"><h3>Sessão Atual</h3><label>Título<input value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))}/></label><label>Subtítulo<input value={draft.subtitle} onChange={e=>setDraft(d=>({...d,subtitle:e.target.value}))}/></label><label>Local<input value={draft.location} onChange={e=>setDraft(d=>({...d,location:e.target.value}))}/></label><label>Objetivo<textarea rows={3} value={draft.objective} onChange={e=>setDraft(d=>({...d,objective:e.target.value}))}/></label><div className="master-row"><button onClick={saveSession}>Salvar contexto</button>{session.active?<button className="danger" onClick={endSession}>Encerrar sessão</button>:<button className="primary" onClick={()=>startSession(draft)}>Iniciar sessão</button>}</div></div>}
    {section==='battle'&&<div className="master-section"><h3>Controle de Combate</h3><div className="master-status"><span className={combat?.active?'live':''}/><b>{combat?.active?`Combate ativo · Rodada ${combatState.round||1}`:'Sem combate ativo'}</b></div><label>Mapa ativo<select value={activeMap?.activeId||''} onChange={e=>setActiveMap(e.target.value)}><option value="">Nenhum mapa</option>{maps.map(m=><option key={m.id} value={m.id}>{m.nome||m.name||`Mapa ${m.id}`}</option>)}</select></label>{combat?.active&&combatState?.initiative?.length>0&&<div className="master-turn-order"><small>ORDEM DA INICIATIVA</small>{combatState.initiative.map((c,i)=><div key={c.id||i} draggable onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(i));e.currentTarget.classList.add('dragging')}} onDragEnd={e=>e.currentTarget.classList.remove('dragging')} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';e.currentTarget.classList.add('drag-over')}} onDragLeave={e=>e.currentTarget.classList.remove('drag-over')} onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drag-over');const from=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(from)&&from!==i)reorderInitiative(from,i)}} className={i===Number(combatState.turnIdx||0)?'active':''}><span>{i+1}</span><b>{c.nome||'Combatente'}</b><div><button disabled={i===0} onClick={()=>reorderInitiative(i,i-1)}>↑</button><button disabled={i===combatState.initiative.length-1} onClick={()=>reorderInitiative(i,i+1)}>↓</button></div></div>)}</div>}<div className="master-row"><button className="primary" disabled={!combat?.active} onClick={nextTurn}>Próximo turno ▶</button><button className="danger" disabled={!combat?.active} onClick={endCombat}>Encerrar combate</button></div></div>}
    {section==='ambience'&&<div className="master-section"><h3>Atmosfera do Mundo</h3><div className="atmosphere-grid">{Object.entries(ATMOSPHERES).map(([key,a])=><button key={key} onClick={()=>setAtmosphere(key)} style={{'--c':a.accent}}>{a.icon}<span>{a.label}</span></button>)}</div><h3>Soundscape</h3><div className="preset-grid">{Object.entries(SOUNDSCAPE_PRESETS).map(([key,p])=><button key={key} className={soundscape.preset===key?'active':''} onClick={()=>applySoundscapePreset(key)}>{p.icon}<span>{p.label}</span></button>)}</div>{[['rain','Chuva','🌧️'],['wind','Vento','🌬️'],['fire','Fogueira','🔥'],['whispers','Sussurros','〰'],['hum','Cosmum','◉']].map(([key,label,icon])=><label className="sound-slider" key={key}><span>{icon} {label}</span><input type="range" min="0" max="100" value={Number(soundscape[key]||0)} onChange={e=>setSoundscape({[key]:Number(e.target.value),preset:'custom',label:'Personalizado'})}/><b>{Number(soundscape[key]||0)}%</b></label>)}</div>}
    {section==='event'&&<div className="master-section"><h3>Eventos Cósmicos</h3><div className="event-types">{Object.entries(EVENT_TYPES).map(([key,e])=><button key={key} className={eventType===key?'active':''} onClick={()=>setEventType(key)} style={{'--c':e.color}}><span>{e.icon}</span>{e.label}</button>)}</div><label>Mensagem<input value={eventText} onChange={e=>setEventText(e.target.value)} placeholder="O que todos devem ver?"/></label><button className="primary" onClick={()=>triggerCosmicEvent(eventType,eventText||EVENT_TYPES[eventType]?.label)}>Manifestar para todos</button></div>}
    {section==='atlas'&&<div className="master-section"><h3>Registrar Descoberta</h3><label>Local<input value={atlasForm.name} onChange={e=>setAtlasForm(v=>({...v,name:e.target.value}))}/></label><label>Estado<select value={atlasForm.status} onChange={e=>setAtlasForm(v=>({...v,status:e.target.value}))}><option value="rumor">Rumor</option><option value="descoberto">Descoberto</option><option value="visitado">Visitado</option></select></label><label>Nota<textarea rows={4} value={atlasForm.note} onChange={e=>setAtlasForm(v=>({...v,note:e.target.value}))}/></label><button className="primary" onClick={addAtlas}>Inscrever no Atlas</button></div>}
    {section==='journal'&&<div className="master-section"><h3>Memória da Sessão</h3><label>Registro<textarea rows={5} value={memory} onChange={e=>setMemory(e.target.value)} placeholder="Algo que merece permanecer nas Crônicas..."/></label><button className="primary" onClick={addMemory}>Marcar como memória</button></div>}
  </div></aside></div>}</>;
}

export function ExperienceLayer({ onNavigate }){
  return <>

    <CharacterStateAura/>

    <CombatActionPulse/>
    <CombatStatusDamageFx/>



    <MasterConsole/>
  </>;
}

export { NAV_GROUPS, SOUNDSCAPE_PRESETS, EVENT_TYPES };
