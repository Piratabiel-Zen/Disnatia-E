import { onSnapshot } from '../adventure/sharedSnapshot';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as ReactDOM from 'react-dom';
import { collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../core/firebase';
import { compressImage } from '../core/media';
import { remainingLiveEventMs } from './liveEventTiming';
/* GAME DIRECTOR PERSISTENTE + BOSS BROADCAST 2026-09-08 */
import { getSheetMaxHp, STATUS_LIST } from '../data/gameData';
import { useExperience } from './ExperienceKit.generated';
import './game-experience-3.css';
import './player-experience.css';
import SummonCombatRack from './SummonCombatRack';
import TableCameras from './TableCameras';
import {ArtifactPowerControls} from './ArtifactPowers';
import { ComfortPanel, MorePanel, PlayerDock } from './PlayerComfort';
import { abilityAvailability, isTyping } from '../adventure/playerPreferences.mjs';
/* SESSION OPENING CINEMATIC 2026-09-10 */
/* GAME EXPERIENCE 3 POLISH + LIVE EVENTS 2026-09-10 */

const GAME_DOC = 'game_experience_v3';
const PRESENCE_TTL = 75000;

const WORLD_MODES = {
  exploration: { label:'Exploração', icon:'◈', hint:'Mundo aberto e HUD discreto' },
  dialogue: { label:'Diálogo', icon:'◌', hint:'NPC e interpretação em foco' },
  danger: { label:'Perigo', icon:'⚠', hint:'Tensão e alerta visual' },
  combat: { label:'Combate', icon:'⚔', hint:'Ações, alvos e turnos em foco' },
  rest: { label:'Descanso', icon:'☾', hint:'Interface calma e recuperação' },
  cinematic: { label:'Cinemática', icon:'✦', hint:'Oculta a interface e destaca a cena' },
};

const ENVIRONMENTS = {
  none:{label:'Nenhum',icon:'◌'},
  fog:{label:'Névoa',icon:'〰'},
  rain:{label:'Chuva',icon:'⌁'},
  ash:{label:'Cinzas',icon:'✦'},
  snow:{label:'Neve',icon:'❄'},
  sparks:{label:'Faíscas',icon:'✧'},
  darkness:{label:'Escuridão',icon:'◉'},
  cosmic:{label:'Pulsação Cósmica',icon:'◇'},
  storm:{label:'Tempestade',icon:'ϟ'},
};

const PING_TYPES = {
  look:{label:'Olhe aqui',icon:'◎',color:'#b99ad9'},
  danger:{label:'Perigo',icon:'⚠',color:'#ef5872'},
  attack:{label:'Atacar',icon:'⚔',color:'#ff8a62'},
  move:{label:'Mover',icon:'➜',color:'#68d5ff'},
};

const DISCOVERY_TYPES = {
  discovery:{label:'Nova descoberta',icon:'✦'},
  location:{label:'Novo local descoberto',icon:'⌖'},
  memory:{label:'Nova memória',icon:'◇'},
  objective:{label:'Objetivo concluído',icon:'✓'},
  item:{label:'Novo item de campanha',icon:'◆'},
};

const HUD_PRESETS = {
  cinematic:{label:'Cinemático',icon:'◌'},
  standard:{label:'Padrão',icon:'✦'},
  tactical:{label:'Tático',icon:'⚔'},
};

const ITEM_ICONS = ['◆','✦','⚔','🗝','📜','💎','🧪','🪶','🛡','🧿'];

function nowId(prefix='g3'){
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
}
function clamp(value,min,max){ return Math.max(min,Math.min(max,Number(value)||0)); }
function readStorage(key,fallback=''){
  try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; }
}
function writeStorage(key,value){ try { localStorage.setItem(key,value); } catch (_) {} }
function displayName(value){ return String(value||'').trim() || 'Sem nome'; }
function initials(value){
  const words=displayName(value).split(/\s+/).filter(Boolean);
  return (words[0]?.[0]||'?') + (words.length>1?(words[words.length-1]?.[0]||''):'');
}
function listAbilities(cls,sheet){
  const buckets=[
    cls?.normal,cls?.normais,cls?.habilidades,cls?.abilities,cls?.skills,
    cls?.especial,cls?.especiais,cls?.special,cls?.campanha,cls?.campaign,
    sheet?.normal,sheet?.normais,sheet?.habilidades,sheet?.abilities,sheet?.skills,
    sheet?.especial,sheet?.especiais,sheet?.special,sheet?.campanha,sheet?.campaign,
  ];
  const rows=[];
  const pushBucket=bucket=>{
    if(Array.isArray(bucket)) bucket.forEach(pushBucket);
    else if(bucket && typeof bucket==='object'){
      const looksLikeAbility=!!(bucket.id||bucket.name||bucket.nome||bucket.desc||bucket.descricao||bucket.custo!=null||bucket.cost!=null);
      if(looksLikeAbility) rows.push(bucket);
      else Object.values(bucket).forEach(pushBucket);
    }
  };
  buckets.forEach(pushBucket);
  const seen=new Set();
  return rows.filter(a=>{
    if(!a) return false;
    const key=String(a.id||a.name||a.nome||JSON.stringify(a));
    if(seen.has(key)) return false;
    seen.add(key); return true;
  });
}
function abilityKey(a){ return String(a?.id||a?.name||a?.nome||'habilidade'); }
function abilityName(a){ return String(a?.name||a?.nome||'Habilidade'); }
function abilityCost(a){ return Number(a?.cost??a?.custo??0)||0; }
function activeStatusEntries(sheet){
  const status=sheet?.status||{};
  const defs=Array.isArray(STATUS_LIST)?STATUS_LIST:[];
  const known=defs.filter(def=>status?.[def.id]).map(def=>({id:def.id,label:def.label||def.id,icon:def.icon||'•',color:def.color||'#a855f7'}));
  const knownIds=new Set(known.map(x=>x.id));
  Object.entries(status).forEach(([key,value])=>{
    if(value && !knownIds.has(key)) known.push({id:key,label:key,icon:'•',color:'#a855f7'});
  });
  return known;
}

function Portrait({entity,size='md',active=false}){
  const name=entity?.nome||entity?.name||'?';
  const entityId=String(entity?.id||entity?.sheetId||'').replace(/^[pe]_/, '');
  const classe=String(entity?.classe||entity?.classId||'').toLowerCase();
  return <span className={'g3-portrait g3-portrait-'+size+(active?' active':'')} data-entity-id={entityId} data-classe={classe} style={{'--g3-c':entity?.color||'#a855f7'}}>
    {entity?.foto||entity?.photo ? <img src={entity.foto||entity.photo} alt="" decoding="async"/> : <b>{initials(name)}</b>}
  </span>;
}

function Meter({label,value,max,className=''}){
  const safeMax=Math.max(1,Number(max)||1);
  const pct=clamp((Number(value||0)/safeMax)*100,0,100);
  return <div className={'g3-meter '+className}><span>{label}</span><i><em style={{width:pct+'%'}}/></i><b>{Number(value||0)}/{safeMax}</b></div>;
}

function ResourceOrb({value,max,color,label,className=''}){
  const safeMax=Math.max(1,Number(max)||1);
  const safeValue=clamp(Number(value||0),0,safeMax);
  const pct=clamp((safeValue/safeMax)*100,0,100);
  const surface=56-(pct*.52);
  const clipIdRef=useRef('g3_orb_'+Math.random().toString(36).slice(2,9));
  const clipId=clipIdRef.current;
  return <span className={'g3-resource-orb '+className} style={{'--orb-color':color,'--orb-level':pct+'%'}} aria-label={label+' '+safeValue+' de '+safeMax}>
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <defs><clipPath id={clipId}><circle cx="30" cy="30" r="25"/></clipPath></defs>
      <circle className="g3-orb-shell" cx="30" cy="30" r="27"/>
      <circle className="g3-orb-depth" cx="30" cy="30" r="25"/>
      <rect className="g3-orb-liquid" x="5" y={surface} width="50" height={56-surface} clipPath={'url(#'+clipId+')'}/>
      <g transform={'translate(0 '+surface+')'} clipPath={'url(#'+clipId+')'}><path className="g3-orb-wave" d="M-16 0 Q-6 -4 4 0 T24 0 T44 0 T64 0 T84 0 V60 H-16 Z"/></g>
      <ellipse className="g3-orb-glint" cx="22" cy="17" rx="8" ry="4"/>
    </svg>
    <b>{safeValue}</b><small>{label}</small>
  </span>;
}

function HpOrb(props){return <ResourceOrb {...props} className="hp"/>;}
function VcOrb(props){return <ResourceOrb {...props} className="vc"/>;}

function FloatingDamageNumber({event}){
  if(typeof document==='undefined')return null;
  const value=Math.abs(Number(event?.diff||0));
  const text=(Number(event?.diff||0)>0?'+':'−')+value;
  return ReactDOM.createPortal(
    <div className={'g3-floating-damage '+(event?.diff>0?'heal':'damage')+(event?.critical?' critical':'')} style={{left:event.x,top:event.y}} aria-live="polite">{text}</div>,
    document.body,
  );
}

function CombatVitalFx({ownSheetId}){
  const [events,setEvents]=useState([]);
  const timersRef=useRef(new Set());

  useEffect(()=>{
    const removeLater=(callback,delay)=>{
      const timer=window.setTimeout(()=>{timersRef.current.delete(timer);callback();},delay);
      timersRef.current.add(timer);
    };
    const receive=customEvent=>{
      const detail=customEvent?.detail||{};
      const entityId=String(detail.entityId||'').replace(/^[pe]_/, '');
      const portraits=Array.from(document.querySelectorAll('.g3-portrait[data-entity-id]')).filter(node=>node.dataset.entityId===entityId);
      const visible=portraits.map(node=>({node,rect:node.getBoundingClientRect()})).filter(item=>item.rect.width>0&&item.rect.height>0&&item.rect.bottom>0&&item.rect.top<window.innerHeight);
      visible.sort((a,b)=>(b.rect.width*b.rect.height)-(a.rect.width*a.rect.height));
      const rect=visible[0]?.rect;
      const row={...detail,id:detail.id||nowId('hp'),x:rect?rect.left+rect.width/2:window.innerWidth/2,y:rect?Math.max(36,rect.top+rect.height*.18):window.innerHeight*.42};
      if(Number(row.diff||0)!==0){
        setEvents(previous=>[...previous.slice(-7),row]);
        removeLater(()=>setEvents(previous=>previous.filter(item=>item.id!==row.id)),1250);
      }
      if(detail.death){
        window.dispatchEvent(new CustomEvent('dinastia:cosmic-live',{detail:{id:'death_'+entityId+'_'+String(detail.ts||Date.now()),type:'death',icon:'\uD83D\uDC80',text:String(detail.name||'Combatente')+' caiu em combate',color:'#E8193C',soft:false,ts:Number(detail.ts||Date.now())}}));
        if(entityId&&entityId===String(ownSheetId||'')){
          document.documentElement.classList.add('g3-player-fallen');
          removeLater(()=>document.documentElement.classList.remove('g3-player-fallen'),3000);
        }
      }
    };
    window.addEventListener('dinastia:hp-change',receive);
    return()=>{
      window.removeEventListener('dinastia:hp-change',receive);
      timersRef.current.forEach(timer=>window.clearTimeout(timer));
      timersRef.current.clear();
      document.documentElement.classList.remove('g3-player-fallen');
    };
  },[ownSheetId]);

  return <>{events.map(event=><FloatingDamageNumber key={event.id} event={event}/>)}</>;
}


function WorldParticles({type='none',intensity=45}){
  if(type==='none') return null;
  const amount=type==='fog'||type==='darkness'||type==='cosmic'?4:12;
  return <div className={`g3-environment g3-env-${type}`} style={{'--g3-env':clamp(intensity,0,100)/100}} aria-hidden="true">
    {Array.from({length:amount}).map((_,i)=><i key={i} style={{'--i':i,'--x':`${(i*37)%97}%`,'--delay':`${-(i%7)*.73}s`}}/>) }
  </div>;
}

function PresenceStrip({rows}){
  return <div className="g3-presence" aria-label="Jogadores online">
    <span className="g3-presence-label"><i/> {rows.length} online</span><span className="g3-sync-state"><i/> TEMPO REAL</span>
    <div className="g3-presence-avatars">
      {rows.slice(0,8).map(row=><span key={row.id} className={`g3-presence-avatar ${row.role==='master'?'master':''}`} title={`${row.name||'Jogador'} · ${row.tab||'sessão'}`}>
        {row.photo?<img src={row.photo} alt="" decoding="async" loading="lazy"/>:<b>{row.role==='master'?'✦':initials(row.name)}</b>}
      </span>)}
      {rows.length>8&&<span className="g3-presence-more">+{rows.length-8}</span>}
    </div>
  </div>;
}

function TurnStrip({combatState,selectedSheet}){
  const list=Array.isArray(combatState?.initiative)?combatState.initiative:[];
  if(!list.length) return null;
  const idx=clamp(combatState?.turnIdx||0,0,Math.max(0,list.length-1));
  const myId=String(selectedSheet?.id||'');
  return <div className="g3-turn-strip">
    <div className="g3-round"><small>RODADA</small><b>{combatState?.round||1}</b></div>
    <div className="g3-turn-flow">
      {list.map((row,i)=>{
        const mine=row.type==='player'&&String(row.id||'').replace(/^p_/,'')===myId;
        return <div key={row.id||i} className={`g3-turn-node ${i===idx?'active':''} ${mine?'mine':''} ${row.type==='enemy'?'enemy':''}`} style={{'--g3-c':row.color||'#a855f7'}}>
          <Portrait entity={row} size="xs" active={i===idx}/><span>{row.nome||'Combatente'}</span>{i===idx&&<b>AGORA</b>}
        </div>;
      })}
    </div>
  </div>;
}

function TopContext({mode,session,presence,combat,combatState,selectedSheet,masterMode,onCompleteObjective}){
  const modeInfo=WORLD_MODES[mode]||WORLD_MODES.exploration;
  const current=Array.isArray(combatState?.initiative)?combatState.initiative[Number(combatState?.turnIdx||0)]:null;
  return <div className="g3-top-context">
    <div className="g3-context-card">
      <span className={`g3-mode-chip mode-${mode}`}><i>{modeInfo.icon}</i>{modeInfo.label}</span>
      <div className="g3-location"><small>LOCAL ATUAL</small><b>{session?.location||'Entre os véus de Cosmum'}</b></div>
      <div className="g3-objective"><small>OBJETIVO</small><b>{session?.objective||'Nenhum objetivo revelado'}</b>{masterMode&&session?.objective&&<button onClick={onCompleteObjective} title="Concluir objetivo">✓</button>}</div>
      {combat?.active&&<div className="g3-now"><small>AGORA</small><b>{current?.nome||combat.currentNome||'—'}</b></div>}
      <PresenceStrip rows={presence}/>
    </div>
    {combat?.active&&<TurnStrip combatState={combatState} selectedSheet={selectedSheet}/>} 
  </div>;
}

function ActionBar({mode,selectedSheet,selectedClass,combat,combatState,onNavigate,onAbility,onOpenSheet,onOpenInventory,busy,masterMode}){
  const abilities=useMemo(()=>listAbilities(selectedClass,selectedSheet),[selectedClass,selectedSheet]);
  if(!selectedSheet) return null;
  const maxHp=getSheetMaxHp(selectedSheet);
  const hp=Number(selectedSheet.hp||0);
  const vc=Number(selectedSheet.vigos||0);
  const maxVc=Math.max(8,Number(selectedSheet.vigos_max||selectedSheet.maxVigos||8));
  const current=Array.isArray(combatState?.initiative)?combatState.initiative[Number(combatState?.turnIdx||0)]:null;
  const myTurn=current?.type==='player'&&String(current?.id||'').replace(/^p_/,'')===String(selectedSheet.id);
  const combatUi=mode==='combat'||combat?.active;

  return <div className={`g3-actionbar ${combatUi?'combat':''} ${myTurn?'my-turn':''}`}>
    <button className="g3-action-character" onClick={onOpenSheet} title="Ficha rápida">
      {combatUi&&<HpOrb value={hp} max={maxHp} color="#E8193C" label="HP"/>}
      <Portrait entity={{...selectedSheet,color:selectedClass?.color}} size="lg" active={myTurn}/>
      {combatUi&&<VcOrb value={vc} max={maxVc} color="#a855f7" label="VC"/>}
      <span><b>{selectedSheet.nome||'Personagem'}</b><small>{myTurn?'✦ SEU TURNO':combatUi?`Vez de ${current?.nome||'—'}`:'Pronto para explorar'}</small></span>
    </button>
    {!combatUi&&<div className="g3-action-meters"><Meter label="❤" value={hp} max={maxHp} className="hp"/><Meter label="✦" value={vc} max={maxVc} className="vc"/></div>}
    {combatUi?<div className="g3-hotbar">
      <button disabled={!!abilityAvailability({id:'simple-attack',name:'Ataque simples',cost:1},selectedSheet,{combat:combatUi,myTurn:myTurn||masterMode,busy})} onClick={()=>onAbility({id:'simple-attack',name:'Ataque simples',cost:1})} title={abilityAvailability({cost:1},selectedSheet,{combat:combatUi,myTurn:myTurn||masterMode,busy})||'Ataque simples'}><span>Ataque simples</span><small>1 VC</small></button>
      {abilities.length?abilities.slice(0,4).map((ability,index)=>{
        const key=abilityKey(ability);
        const cd=Number(selectedSheet.cooldowns?.[key]||0);
        const cost=abilityCost(ability);
        const reason=abilityAvailability(ability,selectedSheet,{combat:combatUi,myTurn:myTurn||masterMode,busy});
        const disabled=!!reason;
        return <button key={key} disabled={disabled} onClick={()=>onAbility(ability)} title={reason||ability.desc||ability.descricao||abilityName(ability)} aria-keyshortcuts={String(index+1)}>
          <kbd>{index+1}</kbd><span>{abilityName(ability)}</span><small>{reason|| (cost?`${cost} VC`:'AÇÃO')}</small>{cd>0&&<i style={{'--cd':Math.min(1,cd/6)}}/>}
        </button>;
      }):<span className="g3-hotbar-empty">Habilidades rápidas aparecem aqui durante o combate.</span>}
    </div>:<div className="g3-explore-actions">
      <button onClick={()=>onNavigate('mapamundi')}>🌍 <span>Mundo</span></button><button onClick={()=>onNavigate('mapabatalha')}>🗡️ <span>Mapa</span></button><button onClick={onOpenInventory}>◆ <span>Itens</span></button>
    </div>}
    <div className="g3-action-shortcuts"><button onClick={onOpenInventory} title="Inventário">◆</button><button onClick={()=>onNavigate('fichas')} title="Ficha completa">📋</button></div>
  </div>;
}

function UtilityRail({tab,panel,setPanel,masterMode,onNavigate,preset,setPreset,onPing}){
  const toggle=name=>setPanel(panel===name?'':name);
  return <div className="g3-utility-rail">
    <button className={panel==='sheet'?'active':''} onClick={()=>toggle('sheet')} title="Ficha e atributos"><span>◆</span><small>Ficha</small></button>
    <button className={panel==='abilities'?'active':''} onClick={()=>toggle('abilities')} title="Codex de habilidades"><span>⚔</span><small>Habilidades</small></button>
    <button className={panel==='inventory'?'active':''} onClick={()=>toggle('inventory')} title="Inventário"><span>🗝</span><small>Itens</small></button>
    <button className={panel==='journal'?'active':''} onClick={()=>toggle('journal')} title="Diário Vivo"><span>🗒</span><small>Diário</small></button>
    {tab==='mapabatalha'&&<button onClick={onPing} title="Abrir roda de ping"><span>◎</span><small>Ping</small></button>}
    {masterMode&&<button className={panel==='director'?'active':''} onClick={()=>toggle('director')} title="Direção da sessão"><span>✦</span><small>Direção</small></button>}
    <button className={panel==='preferences'?'active':''} onClick={()=>toggle('preferences')} title="Conforto e atalhos"><span>{'\u2699'}</span><small>Conforto</small></button>
    <div className="g3-rail-separator"/>
    <button className="g3-preset-button" onClick={()=>setPreset(preset==='standard'?'tactical':preset==='tactical'?'cinematic':'standard')} title={`HUD: ${HUD_PRESETS[preset]?.label||'Padrão'}`}><span>{HUD_PRESETS[preset]?.icon||'✦'}</span><small>HUD</small></button>
    <button onClick={()=>onNavigate('session')} title="Sessão atual"><span>⌂</span><small>Sessão</small></button>
  </div>;
}

function CharacterDrawer({sheet,cls,onClose,onNavigate}){
  if(!sheet) return <DrawerShell title="Ficha rápida" kicker="PERSONAGEM" onClose={onClose}><div className="g3-empty">Nenhuma ficha selecionada.</div></DrawerShell>;
  const maxHp=getSheetMaxHp(sheet);
  const maxVc=Math.max(8,Number(sheet.vigos_max||sheet.maxVigos||8));
  const statuses=activeStatusEntries(sheet);
  const attrs=[['FOR','forca'],['AGI','agilidade'],['INT','inteligencia'],['PER','percepcao'],['VIG','vigor'],['CAR','carisma']].filter(([,key])=>sheet[key]!=null);
  return <DrawerShell title={sheet.nome||'Personagem'} kicker={cls?.name||'FICHA E ATRIBUTOS'} onClose={onClose}>
    <div className="g3-sheet-hero"><Portrait entity={{...sheet,color:cls?.color}} size="xl"/><div><h3>{sheet.nome||'Sem nome'}</h3><p>{cls?.name||'Classe personalizada'} · Nível {sheet.nivel||1}</p><Meter label="❤" value={sheet.hp||0} max={maxHp} className="hp"/><Meter label="✦" value={sheet.vigos||0} max={maxVc} className="vc"/></div></div>
    {attrs.length>0&&<section className="g3-drawer-section"><header>ATRIBUTOS</header><div className="g3-attrs">{attrs.map(([label,key])=><div key={key}><small>{label}</small><b>{sheet[key]}</b></div>)}</div></section>}
    <section className="g3-drawer-section"><header>STATUS</header>{statuses.length?<div className="g3-statuses">{statuses.map(s=><span key={s.id} style={{'--g3-c':s.color}}>{s.icon} {s.label}</span>)}</div>:<div className="g3-muted">Nenhuma condição ativa.</div>}</section>
    <div className="g3-sheet-note"><span>◆</span><p>A ficha mostra seus atributos, recursos e condições atuais. Abra <b>H</b> para consultar cada habilidade em seu próprio códice.</p></div>
    <button className="g3-primary-wide" onClick={()=>onNavigate('fichas')}>Abrir ficha completa →</button>
  </DrawerShell>;
}

function AbilityDrawer({sheet,cls,customAbilities,onClose,onAbility,combat,myTurn,busy}){
  const [openId,setOpenId]=useState('');
  const base=listAbilities(cls,sheet);
  const extra=Array.isArray(customAbilities?.[String(sheet?.id)])?customAbilities[String(sheet?.id)]:[];
  const abilities=[...base,...extra.map(a=>({...a,_campaign:true}))].filter((a,i,rows)=>rows.findIndex(x=>String(x.id||x.name||x.nome)===String(a.id||a.name||a.nome))===i);
  if(!sheet) return <DrawerShell title="Habilidades" kicker="CÓDICE DA COMPANHIA" onClose={onClose}><div className="g3-empty">Nenhuma ficha selecionada.</div></DrawerShell>;
  return <DrawerShell title="Habilidades" kicker="CÓDICE DA COMPANHIA" onClose={onClose} className="g3-ability-drawer">
    <div className="g3-ability-intro"><div className="g3-ability-sigil" style={{'--g3-c':cls?.color||'#a855f7'}}>{cls?.icon||'⚔'}</div><div><h3>{sheet.nome||'Personagem'}</h3><p>{cls?.name||'Classe personalizada'} · cada poder tem sua própria manifestação.</p></div></div>
    <section className="g3-drawer-section"><header>HABILIDADES DA COMPANHIA · {abilities.length}</header><div className="g3-immersive-abilities">{abilities.length?abilities.map((a,index)=>{
      const id=String(a.id||a.name||a.nome||('ability-'+index)); const expanded=openId===id; const cd=Number(sheet.cooldowns?.[abilityKey(a)]||0); const cost=abilityCost(a); const reason=abilityAvailability(a,sheet,{combat,myTurn,busy});
      const script=String(a.script||a.roteiro||a.lore||a.desc||a.descricao||a.efeito||a.effect||'A energia se reúne ao redor do gesto do personagem, aguardando o instante certo para se manifestar.');
      return <article key={id} className={'g3-immersive-ability '+(expanded?'expanded':'')} style={{'--g3-c':cls?.color||'#a855f7'}}>
        <button className="g3-ability-heading" onClick={()=>setOpenId(expanded?'':id)} aria-expanded={expanded}><span className="g3-ability-index">{String(index+1).padStart(2,'0')}</span><span><b>{abilityName(a)}</b><small>{a._campaign?'Poder da campanha':'Técnica da classe'}{cost?' · '+cost+' VC':''}{cd?' · CD '+cd:''}</small></span><em>{expanded?'−':'+'}</em></button>
        {expanded&&<div className="g3-ability-script"><p>{script}</p><button className="g3-use-ability" disabled={!!reason} title={reason||'Usar esta habilidade'} onClick={()=>onAbility(a)}>{reason||'Manifestar habilidade'}</button></div>}
      </article>;
    }):<div className="g3-empty">Nenhuma habilidade registrada para esta ficha.</div>}</div></section>
    <ArtifactPowerControls sheet={sheet}/>
  </DrawerShell>;
}

function DrawerShell({title,kicker,onClose,children,className=''}){
  const ref=useRef(null);
  useEffect(()=>{const previous=document.activeElement;ref.current?.querySelector('button')?.focus();return()=>{if(previous?.isConnected)previous.focus();}},[]);
  const trap=event=>{if(event.key!=='Tab')return;const nodes=[...ref.current.querySelectorAll('button:not(:disabled),input,select,textarea,[tabindex="0"]')];const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}};
  return <aside ref={ref} role="dialog" aria-label={title} onKeyDown={trap} className={`g3-right-drawer ${className}`}><header className="g3-drawer-head"><div><small>{kicker}</small><h2>{title}</h2></div><button onClick={onClose}>✕</button></header><div className="g3-drawer-scroll">{children}</div></aside>;
}

function JournalDrawer3({journal,masterMode,addJournal,updateJournal,deleteJournal,onClose}){
  const [text,setText]=useState(''); const [editing,setEditing]=useState(''); const [draft,setDraft]=useState('');
  const add=async()=>{if(!text.trim())return;await addJournal(text,'story',{memory:true,icon:'✦',color:'#d6a7ff'});setText('');};
  const begin=item=>{setEditing(String(item.id));setDraft(item.text||'');};
  const save=async()=>{if(editing&&draft.trim()){await updateJournal(editing,draft);setEditing('');setDraft('');}};
  const remove=async id=>{if(window.confirm('Remover este registro do Diário Vivo?'))await deleteJournal(id);};
  return <DrawerShell title="Diário Vivo" kicker="TIMELINE DA CAMPANHA" onClose={onClose} className="g3-journal-drawer">
    {masterMode&&<div className="g3-inline-form"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="Registrar uma memória..."/><button onClick={add}>Inscrever</button></div>}
    <div className="g3-journal-timeline">{journal.length?journal.map(item=><article key={item.id} className={item.memory?'memory':''}><i style={{'--g3-c':item.color||'#a855f7'}}>{item.icon||'•'}</i><div>{editing===String(item.id)?<div className="g3-journal-edit"><textarea rows={3} value={draft} onChange={e=>setDraft(e.target.value)}/><span><button onClick={save}>Salvar</button><button onClick={()=>{setEditing('');setDraft('')}}>Cancelar</button></span></div>:<><p>{item.text}</p><small>{item.round?('Rodada '+item.round+' · '):''}{new Date(item.ts||Date.now()).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}{item.editedAt?' · editado':''}</small>{masterMode&&<div className="g3-journal-actions"><button onClick={()=>begin(item)}>Editar</button><button onClick={()=>remove(item.id)}>Excluir</button></div>}</>}</div></article>):<div className="g3-empty">A campanha ainda não deixou registros.</div>}</div>
  </DrawerShell>;
}

function InventoryDrawer({items,sheets,selectedSheet,masterMode,onClose,onCreate,onUpdate,onDelete,onTransfer}){
  const [dragId,setDragId]=useState(''); const [editId,setEditId]=useState('');
  const [form,setForm]=useState({name:'',icon:'◆',description:'',ownerSheetId:'group'}); const [editForm,setEditForm]=useState(null);
  const ownId=String(selectedSheet?.id||''); const visible=items.filter(item=>masterMode||String(item.ownerSheetId||'group')==='group'||String(item.ownerSheetId||'')===ownId);
  const create=async()=>{if(!form.name.trim())return;await onCreate(form);setForm({name:'',icon:'◆',description:'',ownerSheetId:form.ownerSheetId||'group'});};
  const begin=item=>{setEditId(String(item.id));setEditForm({name:item.name||'',icon:item.icon||'◆',description:item.description||'',ownerSheetId:item.ownerSheetId||'group'});};
  const save=async()=>{if(editId&&editForm?.name?.trim()){await onUpdate(editId,editForm);setEditId('');setEditForm(null);}};
  const remove=async id=>{if(window.confirm('Excluir este item da campanha?'))await onDelete(id);};
  return <DrawerShell title="Itens de Campanha" kicker="INVENTÁRIO VISUAL" onClose={onClose} className="g3-inventory-drawer">
    {masterMode&&<section className="g3-item-create"><header>CRIAR ITEM</header><div className="g3-icon-picker">{ITEM_ICONS.map(icon=><button key={icon} className={form.icon===icon?'active':''} onClick={()=>setForm(v=>({...v,icon}))}>{icon}</button>)}</div><input value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} placeholder="Nome do item"/><textarea rows={2} value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))} placeholder="Descrição curta"/><select value={form.ownerSheetId} onChange={e=>setForm(v=>({...v,ownerSheetId:e.target.value}))}><option value="group">Grupo</option>{sheets.map(s=><option key={s.id} value={s.id}>{s.nome||'Personagem'}</option>)}</select><button onClick={create}>Criar item</button></section>}
    <section className="g3-drawer-section"><header>ITENS DISPONÍVEIS</header><div className="g3-item-grid">{visible.length?visible.map(item=>{
      const canDrag=masterMode||String(item.ownerSheetId||'')===ownId; const owner=sheets.find(s=>String(s.id)===String(item.ownerSheetId));
      return <article key={item.id} draggable={canDrag} onDragStart={()=>canDrag&&setDragId(item.id)} onDragEnd={()=>setDragId('')} className={canDrag?'draggable':''}><span>{item.icon||'◆'}</span><div><b>{item.name||'Item'}</b><p>{item.description||'Item de campanha'}</p><small>{String(item.ownerSheetId)==='group'?'Grupo':owner?.nome||'Sem portador'}</small>{masterMode&&<div className="g3-item-actions"><button onClick={()=>begin(item)}>Editar</button><button onClick={()=>remove(item.id)}>Excluir</button></div>}{editId===String(item.id)&&editForm&&<div className="g3-item-edit"><div className="g3-icon-picker">{ITEM_ICONS.map(icon=><button key={icon} className={editForm.icon===icon?'active':''} onClick={()=>setEditForm(v=>({...v,icon}))}>{icon}</button>)}</div><input value={editForm.name} onChange={e=>setEditForm(v=>({...v,name:e.target.value}))}/><textarea rows={2} value={editForm.description} onChange={e=>setEditForm(v=>({...v,description:e.target.value}))}/><select value={editForm.ownerSheetId} onChange={e=>setEditForm(v=>({...v,ownerSheetId:e.target.value}))}><option value="group">Grupo</option>{sheets.map(s=><option key={s.id} value={s.id}>{s.nome||'Personagem'}</option>)}</select><span><button onClick={save}>Salvar</button><button onClick={()=>{setEditId('');setEditForm(null)}}>Cancelar</button></span></div>}</div></article>;
    }):<div className="g3-empty">Nenhum item visual registrado ainda.</div>}</div></section>
    {dragId&&<section className="g3-transfer-zone"><header>ENTREGAR PARA</header><div><button onDragOver={e=>e.preventDefault()} onDrop={()=>{onTransfer(dragId,'group');setDragId('')}}>✦ Grupo</button>{sheets.map(s=><button key={s.id} onDragOver={e=>e.preventDefault()} onDrop={()=>{onTransfer(dragId,String(s.id));setDragId('')}}><Portrait entity={s} size="xs"/>{s.nome||'Personagem'}</button>)}</div></section>}
  </DrawerShell>;
}

function TargetingOverlay({targeting,combatState,onChoose,onCancel}){
  if(!targeting) return null;
  const list=Array.isArray(combatState?.initiative)?combatState.initiative:[];
  return <div className="g3-target-backdrop" onClick={onCancel}><div className="g3-target-panel" onClick={e=>e.stopPropagation()}>
    <div className="g3-target-reticle">⌖</div><small>SELEÇÃO DE ALVO</small><h2>{abilityName(targeting)}</h2><p>Escolha quem será o foco desta ação.</p>
    <div className="g3-target-list">{list.map(row=><button key={row.id} className={row.type==='enemy'?'enemy':''} onClick={()=>onChoose(row)}><Portrait entity={row} size="sm"/><span><b>{row.nome||'Combatente'}</b><small>{row.type==='enemy'?'Inimigo':'Aliado'}</small></span><em>ALVO</em></button>)}</div>
    <div className="g3-target-footer"><button onClick={()=>onChoose(null)}>Usar sem alvo</button><button onClick={onCancel}>Cancelar</button></div>
  </div></div>;
}

function HandoutOverlay({handout,onDismiss,masterMode,onHide}){
  if(!handout?.visible) return null;
  return <div className="g3-handout-backdrop"><article className="g3-handout"><header><div><small>REVELAÇÃO DO MESTRE</small><h2>{handout.title||'Documento revelado'}</h2></div><button onClick={masterMode?onHide:onDismiss}>✕</button></header>{handout.imageUrl&&<img src={handout.imageUrl} alt={handout.title||'Handout'} decoding="async" />}{handout.body&&<p>{handout.body}</p>}<footer><span>✦ Dinastia E</span><button onClick={onDismiss}>Guardar revelação</button></footer></article></div>;
}

function NpcFocus({npc}){
  if(!npc?.visible) return null;
  return <div className={`g3-npc-focus mood-${npc.mood||'neutral'}`}><Portrait entity={{name:npc.name,photo:npc.portrait,color:'#c8a8e8'}} size="lg"/><div><small>{npc.subtitle||'EM CENA'}</small><h3>{npc.name||'Figura desconhecida'}</h3>{npc.text&&<p>{npc.text}</p>}</div></div>;
}

function DiscoveryToast({event}){
  if(!event) return null;
  const info=DISCOVERY_TYPES[event.type]||DISCOVERY_TYPES.discovery;
  return <div className="g3-discovery-toast"><span>{event.icon||info.icon}</span><div><small>{info.label}</small><h2>{event.title||'Algo foi descoberto'}</h2>{event.subtitle&&<p>{event.subtitle}</p>}</div></div>;
}

function BossCinematic({boss}){
  if(!boss) return null;
  return <div className="g3-boss-cinematic"><div className="g3-cinematic-bars"/>{boss.imageUrl&&<img src={boss.imageUrl} alt="" decoding="async" />}<div className="g3-boss-shade"/><div className="g3-boss-title"><small>{boss.kicker||'UMA PRESENÇA DESPERTA'}</small><h1>{boss.name||'CHEFE'}</h1><p>{boss.subtitle||''}</p><i/><b>{boss.phase||'CONFRONTO INICIADO'}</b></div></div>;
}

function OpeningCinematic({opening,imageUrl,masterMode,onEnd}){
  if(!opening?.active)return null;
  return <div className="g3-opening-cinematic">
    {imageUrl&&<img className="g3-opening-bg" src={imageUrl} alt=""/>}
    <div className="g3-opening-shade"/><div className="g3-opening-stars" aria-hidden="true"><i/><i/><i/><i/><i/></div>
    <div className="g3-opening-copy"><small>DINASTIA E · SESSÃO ATUAL</small><h1>{opening.title||'O mundo desperta'}</h1>{opening.location&&<h2>{opening.location}</h2>}{opening.subtitle&&<p>{opening.subtitle}</p>}{opening.objective&&<div className="g3-opening-objective"><span>OBJETIVO</span><b>{opening.objective}</b></div>}</div>
    {masterMode&&<button className="g3-opening-end" onClick={onEnd}>Encerrar abertura para todos</button>}
  </div>;
}

function GenericCinematic({session,masterMode,onExit}){
  return <div className="g3-generic-cinematic"><div><small>DINASTIA E</small><h1>{session?.title||'O mundo prende a respiração'}</h1><p>{session?.location||session?.subtitle||'Uma nova cena se revela.'}</p></div>{masterMode&&<button onClick={onExit}>Encerrar cinemática</button>}</div>;
}

function FeedbackStack({rows}){
  return <div className="g3-feedback-stack">{rows.map(row=><div key={row.id} className={`g3-feedback ${row.kind||'info'}`}><span>{row.icon||'✦'}</span><div><b>{row.name||row.label||'Dinastia E'}</b><small>{row.text||''}</small></div>{row.value!=null&&row.value!==''&&<em>{row.value}</em>}</div>)}</div>;
}

function PingWheel({open,onClose}){
  if(!open) return null;
  const choose=type=>{
    window.dispatchEvent(new CustomEvent('dinastia:ping-type',{detail:{type}}));
    const button=document.querySelector('.battlemap-ping-button');
    if(button instanceof HTMLElement) button.click();
    onClose();
  };
  return <div className="g3-ping-backdrop" onClick={onClose}><div className="g3-ping-wheel" onClick={e=>e.stopPropagation()}><div className="g3-ping-center">◎<small>PING</small></div>{Object.entries(PING_TYPES).map(([key,p],i)=><button key={key} style={{'--i':i,'--g3-c':p.color}} onClick={()=>choose(key)}><span>{p.icon}</span><b>{p.label}</b></button>)}</div></div>;
}

function DirectorPanel({game,session,combat,combatState,masterMode,onClose,onPatchGame,onNavigate,onUpdateSession,onStartSession,onEndSession,onNextTurn,onEndCombat,onSoundscape,onCosmic,onAtlas,onJournal,onCreateItem,sheets,directorMedia,onSaveMedia,onPreviewFx}){
  const [tab,setTab]=useState('scene');
  const saved=game?.directorDrafts||{};
  const [scene,setScene]=useState(()=>saved.scene||{title:session?.title||'',subtitle:session?.subtitle||'',location:session?.location||'',objective:session?.objective||''});
  const [npc,setNpc]=useState(()=>({name:'',subtitle:'',portrait:'',portraitRef:'',mood:'neutral',text:'',...(saved.npc||{})}));
  const [handout,setHandout]=useState(()=>({title:'',imageUrl:'',imageRef:'',body:'',...(saved.handout||{})}));
  const [boss,setBoss]=useState(()=>({name:'',subtitle:'',imageUrl:'',imageRef:'',kicker:'UMA PRESENÇA DESPERTA',...(saved.boss||{})}));
  const [discovery,setDiscovery]=useState(()=>({type:'discovery',title:'',subtitle:'',...(saved.discovery||{})}));
  const [atlas,setAtlas]=useState(()=>({name:'',status:'rumor',note:'',...(saved.atlas||{})}));
  const [item,setItem]=useState(()=>({name:'',icon:'◆',description:'',ownerSheetId:'group',...(saved.item||{})}));
  const [mediaBusy,setMediaBusy]=useState('');
  const draftTimerRef=useRef(null);

  useEffect(()=>{
    if(saved.scene) return;
    setScene({title:session?.title||'',subtitle:session?.subtitle||'',location:session?.location||'',objective:session?.objective||''});
  },[session?.title,session?.subtitle,session?.location,session?.objective,!!saved.scene]);
  useEffect(()=>{
    if(saved.npc) return;
    const focus=game?.npcFocus;
    if(focus?.name) setNpc({name:focus.name||'',subtitle:focus.subtitle||'',portrait:focus.portrait||'',portraitRef:focus.portraitRef||'',mood:focus.mood||'neutral',text:focus.text||''});
  },[game?.npcFocus?.name,!!saved.npc]);

  useEffect(()=>{
    clearTimeout(draftTimerRef.current);
    draftTimerRef.current=window.setTimeout(()=>{
      onPatchGame({directorDrafts:{scene,npc,handout,boss,discovery,atlas,item,savedAt:Date.now()}}).catch(()=>{});
    },450);
    return()=>clearTimeout(draftTimerRef.current);
  },[scene,npc,handout,boss,discovery,atlas,item,onPatchGame]);

  const mediaUrl=ref=>directorMedia?.[String(ref||'')]?.data||'';
  const clearDirectorMedia=(setter,refField='imageRef')=>setter(v=>({
    ...v,
    [refField]:'',
    ...(refField==='portraitRef'?{portrait:''}:{}),
    ...(refField==='imageRef'?{imageUrl:''}:{}),
  }));
  const attachMedia=async(kind,file,setter,refField='imageRef')=>{
    if(!file)return;
    setMediaBusy(kind);
    try{
      const ref=await onSaveMedia(kind,file);
      if(ref) setter(v=>({...v,[refField]:ref,...(refField==='portraitRef'?{portrait:''}:{imageUrl:''})}));
    }finally{setMediaBusy('');}
  };

  if(!masterMode) return null;
  const revealNpc=()=>onPatchGame({npcFocus:{...npc,visible:true,updatedAt:Date.now()}});
  const hideNpc=()=>onPatchGame({npcFocus:{...(game?.npcFocus||{}),visible:false,updatedAt:Date.now()}});
  const revealHandout=()=>onPatchGame({handout:{...handout,id:nowId('handout'),visible:true,createdAt:Date.now()}});
  const revealBoss=async()=>{
    const id=nowId('boss');
    const createdAt=Date.now();
    const durationMs=8500;
    const payload={...boss,id,visible:true,createdAt,durationMs,expiresAt:createdAt+durationMs};
    await onPatchGame({bossReveal:payload,bossRevealDismissedId:''});
    window.setTimeout(()=>onPatchGame({bossRevealDismissedId:id}).catch(()=>{}),durationMs+900);
  };
  const revealDiscovery=()=>onPatchGame({discovery:{...discovery,id:nowId('discovery'),createdAt:Date.now(),expiresAt:Date.now()+5200}});
  const saveScene=()=>onUpdateSession(scene);
  const revealOpeningScene=async()=>{
    const context={title:scene.title||'',subtitle:scene.subtitle||'',location:scene.location||'',objective:scene.objective||''};
    const id=nowId('opening');
    const startedAt=Date.now();
    const durationMs=12000;
    await Promise.all([
      onUpdateSession(context),
      onPatchGame({openingScene:{
        id,active:true,...context,
        title:context.title||session?.title||'DINASTIA E',
        subtitle:context.subtitle||session?.subtitle||'',
        location:context.location||session?.location||'',
        objective:context.objective||session?.objective||'',
        imageRef:scene.openingImageRef||'',startedAt,durationMs,expiresAt:startedAt+durationMs,
      }}),
    ]);
    window.setTimeout(()=>onPatchGame({openingScene:{id,active:false,endedAt:Date.now()}}).catch(()=>{}),durationMs+900);
  };
  const endOpeningScene=()=>onPatchGame({openingScene:{...(game?.openingScene||{}),active:false,endedAt:Date.now()}});
  const addAtlas=async()=>{if(!atlas.name.trim())return;await onAtlas(atlas);setAtlas({name:'',status:'rumor',note:''});};
  const createItem=async()=>{if(!item.name.trim())return;await onCreateItem(item);setItem({name:'',icon:'◆',description:'',ownerSheetId:item.ownerSheetId||'group'});};

  const nav=[['scene','Cena','◈'],['npc','NPC','👤'],['reveal','Revelar','✦'],['combat','Combate','⚔'],['world','Mundo','🌍'],['items','Itens','◆']];
  return <DrawerShell title="Game Director" kicker="MESTRE · DIREÇÃO AO VIVO" onClose={onClose} className="g3-director">
    <nav className="g3-director-tabs">{nav.map(([id,label,icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><span>{icon}</span>{label}</button>)}</nav><div className="g3-director-autosave"><i/> Preparação salva automaticamente para a próxima mesa</div>
    {tab==='scene'&&<div className="g3-director-section"><h3>Estado do mundo</h3><div className="g3-mode-grid">{Object.entries(WORLD_MODES).map(([key,value])=><button key={key} className={(game?.worldMode||'exploration')===key?'active':''} onClick={()=>onPatchGame({worldMode:key})}><span>{value.icon}</span><b>{value.label}</b><small>{value.hint}</small></button>)}</div><h3>Contexto da sessão</h3><label>Título<input value={scene.title} onChange={e=>setScene(v=>({...v,title:e.target.value}))}/></label><label>Subtítulo<input value={scene.subtitle} onChange={e=>setScene(v=>({...v,subtitle:e.target.value}))}/></label><label>Local atual<input value={scene.location} onChange={e=>setScene(v=>({...v,location:e.target.value}))}/></label><label>Objetivo<textarea rows={3} value={scene.objective} onChange={e=>setScene(v=>({...v,objective:e.target.value}))}/></label><div className="g3-director-row"><button onClick={saveScene}>Salvar contexto</button>{session?.active?<button className="danger" onClick={onEndSession}>Encerrar sessão</button>:<button className="primary" onClick={()=>onStartSession(scene)}>Iniciar sessão</button>}</div><h3>Cena inicial da sessão</h3><div className="g3-opening-editor"><p>Prepare uma abertura cinematográfica para todos. Ela usa o título, subtítulo/local e objetivo acima e permanece na tela até você encerrá-la.</p><label>Imagem de fundo opcional<input type="file" accept="image/*" disabled={mediaBusy==='opening'} onChange={e=>{const f=e.target.files?.[0];attachMedia('opening',f,setScene,'openingImageRef');e.target.value='';}}/></label>{(mediaUrl(scene.openingImageRef))&&<div className="g3-media-preview wide opening"><img src={mediaUrl(scene.openingImageRef)} alt="Prévia da cena inicial"/><span>✓ Fundo da abertura salvo</span><button type="button" className="g3-media-remove" onClick={()=>clearDirectorMedia(setScene,'openingImageRef')}>Retirar imagem</button></div>}<div className="g3-director-row"><button className="primary" onClick={revealOpeningScene}>✦ Exibir cena inicial</button><button className="danger" disabled={!game?.openingScene?.active} onClick={endOpeningScene}>Encerrar abertura</button></div><small className="g3-opening-status">{game?.openingScene?.active?'● CENA INICIAL NO AR PARA TODA A MESA':'○ Preparada e oculta até você revelar'}</small></div><h3>Ambiente sincronizado</h3><div className="g3-env-grid">{Object.entries(ENVIRONMENTS).map(([key,e])=><button key={key} className={(game?.environment?.type||'none')===key?'active':''} onClick={()=>onPatchGame({environment:{type:key,intensity:Number(game?.environment?.intensity||45)}})}>{e.icon}<small>{e.label}</small></button>)}</div><label>Intensidade<input type="range" min="0" max="100" value={Number(game?.environment?.intensity||45)} onChange={e=>onPatchGame({environment:{type:game?.environment?.type||'none',intensity:Number(e.target.value)}})}/></label><h3>Soundscape rápido</h3><div className="g3-soundscape-row">{[['silencio','◌'],['catedral','⛪'],['tempestade','⛈'],['fogueira','🔥'],['vazio','🌌'],['ruinas','🏚']].map(([key,icon])=><button key={key} onClick={()=>onSoundscape(key)}>{icon}<small>{key}</small></button>)}</div></div>}
    {tab==='npc'&&<div className="g3-director-section"><h3>NPC em foco</h3><label>Nome<input value={npc.name} onChange={e=>setNpc(v=>({...v,name:e.target.value}))} placeholder="Christina Pendragon"/></label><label>Título / função<input value={npc.subtitle} onChange={e=>setNpc(v=>({...v,subtitle:e.target.value}))} placeholder="Xerife de Pequeninis"/></label><label>Retrato do NPC<input type="file" accept="image/*" disabled={mediaBusy==='npc'} onChange={e=>{const f=e.target.files?.[0];attachMedia('npc',f,setNpc,'portraitRef');e.target.value='';}}/></label>{(mediaUrl(npc.portraitRef)||npc.portrait)&&<div className="g3-media-preview"><img src={mediaUrl(npc.portraitRef)||npc.portrait} alt="Prévia do NPC"/><span>✓ Retrato salvo</span><button type="button" className="g3-media-remove" onClick={()=>clearDirectorMedia(setNpc,'portraitRef')}>Retirar imagem</button></div>}<label>Postura<select value={npc.mood} onChange={e=>setNpc(v=>({...v,mood:e.target.value}))}><option value="friendly">Amigável</option><option value="neutral">Neutra</option><option value="suspicious">Suspeita</option><option value="hostile">Hostil</option><option value="unknown">Desconhecida</option></select></label><label>Frase / contexto<textarea rows={4} value={npc.text} onChange={e=>setNpc(v=>({...v,text:e.target.value}))} placeholder="Uma frase curta para colocar o personagem em cena..."/></label><div className="g3-director-row"><button className="primary" onClick={revealNpc}>Colocar em cena</button><button onClick={hideNpc}>Retirar foco</button></div></div>}
    {tab==='reveal'&&<div className="g3-director-section"><h3>Handout para toda a mesa</h3><label>Título<input value={handout.title} onChange={e=>setHandout(v=>({...v,title:e.target.value}))}/></label><label>Imagem do handout<input type="file" accept="image/*" disabled={mediaBusy==='handout'} onChange={e=>{const f=e.target.files?.[0];attachMedia('handout',f,setHandout);e.target.value='';}}/></label>{(mediaUrl(handout.imageRef)||handout.imageUrl)&&<div className="g3-media-preview wide"><img src={mediaUrl(handout.imageRef)||handout.imageUrl} alt="Prévia do handout"/><span>✓ Imagem salva</span><button type="button" className="g3-media-remove" onClick={()=>clearDirectorMedia(setHandout)}>Retirar imagem</button></div>}<label>Texto<textarea rows={3} value={handout.body} onChange={e=>setHandout(v=>({...v,body:e.target.value}))}/></label><button className="primary" onClick={revealHandout}>Revelar ao grupo</button><h3>Entrada de chefe</h3><label>Nome<input value={boss.name} onChange={e=>setBoss(v=>({...v,name:e.target.value}))}/></label><label>Epíteto<input value={boss.subtitle} onChange={e=>setBoss(v=>({...v,subtitle:e.target.value}))}/></label><label>Arte do chefe<input type="file" accept="image/*" disabled={mediaBusy==='boss'} onChange={e=>{const f=e.target.files?.[0];attachMedia('boss',f,setBoss);e.target.value='';}}/></label>{(mediaUrl(boss.imageRef)||boss.imageUrl)&&<div className="g3-media-preview wide boss"><img src={mediaUrl(boss.imageRef)||boss.imageUrl} alt="Prévia do chefe"/><span>✓ Arte do chefe salva</span><button type="button" className="g3-media-remove" onClick={()=>clearDirectorMedia(setBoss)}>Retirar imagem</button></div>}<button className="danger" onClick={revealBoss}>⚔ Revelar chefe</button><h3>Descoberta</h3><label>Tipo<select value={discovery.type} onChange={e=>setDiscovery(v=>({...v,type:e.target.value}))}>{Object.entries(DISCOVERY_TYPES).map(([key,v])=><option key={key} value={key}>{v.label}</option>)}</select></label><label>Título<input value={discovery.title} onChange={e=>setDiscovery(v=>({...v,title:e.target.value}))}/></label><label>Complemento<input value={discovery.subtitle} onChange={e=>setDiscovery(v=>({...v,subtitle:e.target.value}))}/></label><button onClick={revealDiscovery}>Manifestar descoberta</button></div>}
    {tab==='combat'&&<div className="g3-director-section"><h3>Direção de combate</h3><div className={`g3-combat-status ${combat?.active?'live':''}`}><span/><div><small>{combat?.active?'COMBATE ATIVO':'SEM COMBATE'}</small><b>{combat?.active?`Rodada ${combatState?.round||1}`:'Prepare os participantes no mapa tático.'}</b></div></div><button className="g3-primary-wide" onClick={()=>onNavigate('mapabatalha')}>Abrir mapa e controle tático →</button>{combat?.active&&<div className="g3-director-row"><button className="primary" onClick={onNextTurn}>Próximo turno ▶</button><button className="danger" onClick={onEndCombat}>Encerrar combate</button></div>}<div className="g3-fx-preview"><div><small>VALIDA\u00C7\u00C3O VISUAL</small><b>Efeitos cinematogr\u00E1ficos</b><span>Mostra turno, cr\u00EDtico e feedback sem alterar a campanha.</span></div><button onClick={onPreviewFx}>Executar pr\u00E9via nesta tela</button></div><h3>Evento rápido</h3><div className="g3-event-row"><button onClick={()=>onCosmic('danger','⚠ O perigo se aproxima')}>⚠ Perigo</button><button onClick={()=>onCosmic('critical','✹ O destino se rompe')}>✹ Impacto</button><button onClick={()=>onCosmic('void','◉ O vazio observa')}>◉ Vazio</button></div></div>}
    {tab==='world'&&<div className="g3-director-section"><h3>Registrar no Atlas</h3><label>Local<input value={atlas.name} onChange={e=>setAtlas(v=>({...v,name:e.target.value}))}/></label><label>Estado<select value={atlas.status} onChange={e=>setAtlas(v=>({...v,status:e.target.value}))}><option value="unknown">Desconhecido</option><option value="rumor">Rumor</option><option value="descoberto">Descoberto</option><option value="visitado">Visitado</option><option value="concluido">Concluído</option><option value="corrompido">Corrompido</option><option value="destruido">Destruído</option></select></label><label>Nota<textarea rows={4} value={atlas.note} onChange={e=>setAtlas(v=>({...v,note:e.target.value}))}/></label><button className="primary" onClick={addAtlas}>Inscrever no Atlas</button><h3>Memória rápida</h3><button onClick={()=>onJournal(`O grupo registrou um marco em ${session?.location||'Cosmum'}.`,'story',{memory:true,icon:'◇',color:'#c8a8e8'})}>◇ Marcar o momento atual como memória</button></div>}
    {tab==='items'&&<div className="g3-director-section"><h3>Novo item de campanha</h3><div className="g3-icon-picker">{ITEM_ICONS.map(icon=><button key={icon} className={item.icon===icon?'active':''} onClick={()=>setItem(v=>({...v,icon}))}>{icon}</button>)}</div><label>Nome<input value={item.name} onChange={e=>setItem(v=>({...v,name:e.target.value}))}/></label><label>Descrição<textarea rows={3} value={item.description} onChange={e=>setItem(v=>({...v,description:e.target.value}))}/></label><label>Portador<select value={item.ownerSheetId} onChange={e=>setItem(v=>({...v,ownerSheetId:e.target.value}))}><option value="group">Grupo</option>{sheets.map(s=><option key={s.id} value={s.id}>{s.nome||'Personagem'}</option>)}</select></label><button className="primary" onClick={createItem}>Criar e registrar item</button></div>}
  </DrawerShell>;
}

function MasterQuickBar({onOpen,onNavigate,onPatchGame,currentMode}){
  return <div className="g3-master-quickbar"><button onClick={()=>onOpen('scene')} title="Direção da cena">✦</button><button onClick={()=>onNavigate('mapabatalha')} title="Combate">⚔</button><button onClick={()=>onOpen('npc')} title="NPC em foco">👤</button><button onClick={()=>onOpen('reveal')} title="Revelações">◇</button><button className={currentMode==='danger'?'active':''} onClick={()=>onPatchGame({worldMode:currentMode==='danger'?'exploration':'danger'})} title="Alternar perigo">⚠</button></div>;
}

export default function GameExperience3({access,masterMode,tab,onNavigate}){
  const {
    sheets,selectedSheet,selectedClass,customAbilities,combat,combatState,session,journal,
    updateSession,startSession,endSession,nextTurn,endCombat,applySoundscapePreset,triggerCosmicEvent,
    addAtlasDiscovery,addJournal,updateJournal,deleteJournal,useQuickAbility,
  }=useExperience();

  // Public UI bridge; never changes roles or authentication.
  useEffect(()=>{
    const open=e=>{
      const panel=e.detail?.panel;
      if(['director','combat'].includes(panel)){
        if(!masterMode)return;
        setDirectorTab(panel==='combat'?'combat':'scene');setPanel('director');
      } else if(['sheet','abilities','inventory','journal'].includes(panel))setPanel(panel);
    };
    const key=e=>{
      if(e.key==='Escape'&&!e.isComposing){setPanel('');setPingOpen(false);setTargeting(null);return;}
      if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.isComposing||isTyping(e))return;
      const panel={c:'sheet',h:'abilities',i:'inventory',j:'journal'}[e.key.toLowerCase()];
      if(panel){e.preventDefault();open({detail:{panel}});}
    };
    window.addEventListener('dinastia:adventure-panel',open);window.addEventListener('keydown',key);
    return()=>{window.removeEventListener('dinastia:adventure-panel',open);window.removeEventListener('keydown',key);};
  },[masterMode,tab]);
  const [game,setGame]=useState({worldMode:'exploration',environment:{type:'none',intensity:45}});
  const [presence,setPresence]=useState([]);
  const [items,setItems]=useState([]);
  const [enemies,setEnemies]=useState([]);
  const [directorMedia,setDirectorMedia]=useState({});
  const [panel,setPanel]=useState('');
  const [abilityBusy,setAbilityBusy]=useState(false);
  const abilityBusyRef=useRef(false);
  const [directorTab,setDirectorTab]=useState('scene');
  const [preset,setPresetState]=useState(()=>readStorage('dinastia_hud_preset','standard'));
  const [targeting,setTargeting]=useState(null);
  const [feedback,setFeedback]=useState([]);
  const [pingOpen,setPingOpen]=useState(false);
  // MOBILE SESSION HUB 2026-09-10
  const [mobileHudOpen,setMobileHudOpen]=useState(false);
  const [bossVisible,setBossVisible]=useState(false);
  const [openingVisible,setOpeningVisible]=useState(false);
  const [gameReady,setGameReady]=useState(false);
  const [discoveryVisible,setDiscoveryVisible]=useState(false);
  const [dismissedHandout,setDismissedHandout]=useState('');
  const prevEntitiesRef=useRef(new Map());
  const entityPrimedRef=useRef(false);

  const patchGame=useCallback(async patch=>{
    await setDoc(doc(db,'config',GAME_DOC),{...patch,updatedAt:Date.now()},{merge:true});
  },[]);

  // SHARED SESSION REALTIME 2026-09-21
  // Um único documento pequeno permanece ativo em todas as páginas. Assim mapa,
  // cena, chefe e estado do mundo não dependem da rota que o jogador está vendo.
  useEffect(()=>onSnapshot(doc(db,'config',GAME_DOC),snap=>{
    setGame(snap.exists()?{worldMode:'exploration',environment:{type:'none',intensity:45},...(snap.data()||{})}:{worldMode:'exploration',environment:{type:'none',intensity:45}});
    setGameReady(true);
  },error=>console.error('Erro no canal global da sessão:',error)),[]);

  // Coleções maiores continuam ligadas apenas nas superfícies que as consomem.
  const g3LiveSurface=['session','mapamundi','mapabatalha'].includes(tab)||!!panel;
  useEffect(()=>{
    if(!g3LiveSurface){
      setPresence([]);setItems([]);setEnemies([]);setDirectorMedia({});
      return undefined;
    }
    const u2=onSnapshot(collection(db,'presence'),snap=>setPresence(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const u3=onSnapshot(collection(db,'campaign_items'),snap=>setItems(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>Number(b.updatedAt||b.createdAt||0)-Number(a.updatedAt||a.createdAt||0))));
    const u4=onSnapshot(collection(db,'enemies'),snap=>setEnemies(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>{u2();u3();u4();};
  },[g3LiveSurface]);

  const liveMediaIds=JSON.stringify([...new Set([
    game?.npcFocus?.visible&&game?.npcFocus?.portraitRef,
    game?.handout?.visible&&game?.handout?.imageRef,
    bossVisible&&game?.bossReveal?.imageRef,
    openingVisible&&game?.openingScene?.imageRef,
  ].filter(Boolean).map(String))].sort());
  useEffect(()=>{
    if(masterMode&&panel==='director')return onSnapshot(collection(db,'director_media'),snap=>{
      setDirectorMedia(Object.fromEntries(snap.docs.map(d=>[d.id,{id:d.id,...d.data()}])));
    });
    const ids=JSON.parse(liveMediaIds);
    setDirectorMedia(prev=>Object.fromEntries(ids.filter(id=>prev[id]).map(id=>[id,prev[id]])));
    const stops=ids.map(id=>onSnapshot(doc(db,'director_media',id),snap=>setDirectorMedia(prev=>({...prev,[id]:snap.exists()?snap.data():null}))));
    return()=>stops.forEach(stop=>stop());
  },[g3LiveSurface,masterMode,panel,liveMediaIds]);

  useEffect(()=>{
    let clientId='';
    try{
      clientId=sessionStorage.getItem('dinastia_presence_tab')||nowId('presence');
      sessionStorage.setItem('dinastia_presence_tab',clientId);
    }catch(_){clientId=nowId('presence');}
    const ref=doc(db,'presence',clientId);
    const push=(online=true)=>setDoc(ref,{
      online,role:access?.role||'player',sheetId:String(access?.sheetId||selectedSheet?.id||''),name:access?.name||selectedSheet?.nome||(access?.role==='master'?'Mestre':'Jogador'),photo:access?.photo||selectedSheet?.foto||'',tab:tab||'session',updatedAt:Date.now(),
    },{merge:true}).catch(()=>{});
    push(true);
    const timer=window.setInterval(()=>push(document.visibilityState!=='hidden'),30000);
    const onFocus=()=>push(true);
    const onVisibility=()=>push(document.visibilityState!=='hidden');
    window.addEventListener('focus',onFocus);document.addEventListener('visibilitychange',onVisibility);
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onVisibility);push(false);};
  },[access?.role,access?.sheetId,access?.name,access?.photo,selectedSheet?.id,selectedSheet?.nome,selectedSheet?.foto,tab]);

  const activePresence=useMemo(()=>{
    const now=Date.now();
    return presence.filter(row=>row.online!==false&&now-Number(row.updatedAt||0)<PRESENCE_TTL).sort((a,b)=>a.role==='master'?-1:b.role==='master'?1:String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
  },[presence]);

  const pushFeedback=useCallback(row=>{
    const entry={id:nowId('feedback'),...row};
    setFeedback(prev=>[...prev.slice(-4),entry]);
    window.setTimeout(()=>setFeedback(prev=>prev.filter(x=>x.id!==entry.id)),2400);
  },[]);

  const saveDirectorMedia=useCallback(async(kind,file)=>{
    if(!file)return '';
    if(!String(file.type||'').startsWith('image/')){pushFeedback({kind:'warning',icon:'⚠',name:'Imagem inválida',text:'Escolha um arquivo de imagem.'});return '';}
    try{
      const raw=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('Falha ao ler imagem'));reader.readAsDataURL(file);});
      let data=await compressImage(raw,1400,1000,.72);
      if(String(data).length>850000)data=await compressImage(raw,1000,760,.60);
      if(String(data).length>950000)throw new Error('Imagem ainda muito grande após compressão');
      const id=`director_${String(kind||'media').replace(/[^a-z0-9_-]/gi,'_')}`;
      await setDoc(doc(db,'director_media',id),{data,name:file.name||'imagem',type:file.type||'image/jpeg',kind:String(kind||'media'),updatedAt:Date.now()},{merge:true});
      pushFeedback({kind:'ability',icon:'✓',name:'Imagem salva',text:'A arte ficou armazenada no Game Director.'});
      return id;
    }catch(error){
      console.error('Erro ao salvar mídia do Game Director:',error);
      pushFeedback({kind:'warning',icon:'⚠',name:'Falha ao salvar imagem',text:'Tente uma imagem menor ou outro formato.'});
      return '';
    }
  },[pushFeedback]);

  useEffect(()=>{
    const entities=[...sheets.map(s=>({...s,_kind:'player'})),...enemies.map(e=>({...e,_kind:'enemy'}))];
    const next=new Map();
    entities.forEach(entity=>{
      const key=`${entity._kind}:${entity.id}`;
      next.set(key,{hp:Number(entity.hp||0),status:entity.status||{},name:entity.nome||'Combatente'});
      if(entityPrimedRef.current){
        const prev=prevEntitiesRef.current.get(key);
        if(prev){
          const diff=Number(entity.hp||0)-Number(prev.hp||0);
          if(diff!==0){
            pushFeedback({kind:diff>0?'heal':'damage',icon:diff>0?'✚':'✦',name:entity.nome||'Combatente',text:diff>0?'recuperou vida':'sofreu dano',value:`${diff>0?'+':''}${diff}`});
            if(entity._kind==='enemy')window.dispatchEvent(new CustomEvent('dinastia:hp-change',{detail:{id:nowId('enemy_hp'),entityId:String(entity.id||'').replace(/^e_/,''),name:entity.nome||'Inimigo',diff,critical:diff<0&&Boolean(entity.lastDamageCritical||entity.lastHpChange?.critical||entity.lastDamage?.critical),death:Number(prev.hp)>0&&Number(entity.hp||0)<=0,ts:Date.now()}}));
          }
          const before=Object.keys(prev.status||{}).filter(k=>prev.status?.[k]);
          const after=Object.keys(entity.status||{}).filter(k=>entity.status?.[k]);
          after.filter(k=>!before.includes(k)).forEach(k=>pushFeedback({kind:'status',icon:'◆',name:entity.nome||'Combatente',text:`Status: ${k}`,value:''}));
        }
      }
    });
    prevEntitiesRef.current=next;
    entityPrimedRef.current=true;
  },[sheets,enemies,pushFeedback]);

  useEffect(()=>{
    if(!gameReady)return;
    const boss=game?.bossReveal;
    const id=String(boss?.id||'');
    const dismissed=String(game?.bossRevealDismissedId||'');
    const remaining=remainingLiveEventMs(boss,8500);
    if(!id||boss?.visible===false||dismissed===id||remaining<=0){setBossVisible(false);return;}
    setBossVisible(true);
    const timer=window.setTimeout(()=>setBossVisible(false),remaining);
    return()=>window.clearTimeout(timer);
  },[gameReady,game?.bossReveal?.id,game?.bossReveal?.visible,game?.bossReveal?.createdAt,game?.bossReveal?.expiresAt,game?.bossReveal?.durationMs,game?.bossRevealDismissedId]);

  useEffect(()=>{
    if(!gameReady)return;
    const opening=game?.openingScene;
    const remaining=remainingLiveEventMs(opening,12000);
    if(!opening?.id||opening?.active===false||remaining<=0){setOpeningVisible(false);return;}
    setOpeningVisible(true);
    const timer=window.setTimeout(()=>setOpeningVisible(false),remaining);
    return()=>window.clearTimeout(timer);
  },[gameReady,game?.openingScene?.id,game?.openingScene?.active,game?.openingScene?.startedAt,game?.openingScene?.expiresAt,game?.openingScene?.durationMs]);

  useEffect(()=>{
    const event=game?.discovery;
    if(!event?.id||Date.now()>Number(event.expiresAt||0)){setDiscoveryVisible(false);return;}
    setDiscoveryVisible(true);
    const timer=window.setTimeout(()=>setDiscoveryVisible(false),Math.max(250,Number(event.expiresAt)-Date.now()));
    return()=>window.clearTimeout(timer);
  },[game?.discovery?.id,game?.discovery?.expiresAt]);

  useEffect(()=>{ if(combat?.active) setMobileHudOpen(true); },[combat?.active]);

  // DESKTOP CONTENT SURFACE RESET 2026-09-12
  useEffect(()=>{
    if(['session','mapamundi','mapabatalha'].includes(tab)) return;
    setPanel('');
    setPingOpen(false);
    setTargeting(null);
  },[tab]);

  const effectiveMode=game?.worldMode==='cinematic'?'cinematic':combat?.active?'combat':(game?.worldMode||'exploration');
  const setPreset=value=>{setPresetState(value);writeStorage('dinastia_hud_preset',value);};

  const activeTurn=Array.isArray(combatState?.initiative)?combatState.initiative[Number(combatState?.turnIdx||0)]:null;
  const isMyTurn=activeTurn?.type==='player'&&String(activeTurn?.id||'').replace(/^p_/,'')===String(selectedSheet?.id||'');

  const executeAbility=useCallback(async(ability,target)=>{
    if(abilityBusyRef.current)return;
    const reason=abilityAvailability(ability,selectedSheet,{combat:!!combat?.active,myTurn:isMyTurn||masterMode});
    if(reason){pushFeedback({kind:'warning',name:abilityName(ability),text:reason});return;}
    abilityBusyRef.current=true;setAbilityBusy(true);
    try {
    const ok=await useQuickAbility(ability);
    if(!ok){pushFeedback({kind:'warning',icon:'⚠',name:abilityName(ability),text:'Sem Vigor suficiente ou habilidade em cooldown.'});setTargeting(null);return;}
    const actionEvent={id:nowId('combat_action'),type:'combat_action',ts:Date.now(),source:'game3-actionbar',actorId:String(selectedSheet?.id||''),actorName:selectedSheet?.nome||'Personagem',abilityName:abilityName(ability),targetId:String(target?.id||''),targetName:target?.nome||'',targetType:target?'combatant':'none',icon:selectedClass?.icon||'⚡',color:selectedClass?.color||'#A855F7',round:Number(combatState?.round||1)};
    const announcements=await Promise.allSettled([setDoc(doc(db,'config','combat_action'),actionEvent,{merge:true}),setDoc(doc(db,'combat_action_events',actionEvent.id),actionEvent,{merge:true})]);
    if(announcements.some(row=>row.status==='rejected'))pushFeedback({kind:'warning',name:'Habilidade utilizada',text:'Parte do anúncio não foi confirmada. Não repita a ação.'});
    if(target) await addJournal(`${selectedSheet?.nome||'Personagem'} definiu ${target.nome||'combatente'} como alvo de ${abilityName(ability)}.`,'ability',{icon:selectedClass?.icon||'⌖',color:selectedClass?.color||'#a855f7'}).catch(()=>{});
    pushFeedback({kind:'ability',icon:actionEvent.icon,color:actionEvent.color,name:abilityName(ability),text:target?`Alvo: ${target.nome||'combatente'}`:'Ação manifestada'});
    setTargeting(null);
    window.dispatchEvent(new CustomEvent('dinastia:action-confirmed'));
    }catch(error){console.error('Falha na ação:',error);pushFeedback({kind:'warning',name:'Ação não confirmada',text:'Confira a conexão antes de tentar novamente.'});}
    finally{abilityBusyRef.current=false;setAbilityBusy(false);}
  },[combat?.active,isMyTurn,masterMode,selectedSheet,useQuickAbility,addJournal,selectedSheet?.id,selectedSheet?.nome,selectedClass?.color,selectedClass?.icon,combatState?.round,pushFeedback]);

  const chooseAbility=useCallback(ability=>{
    if(!ability||abilityBusyRef.current)return;
    const reason=abilityAvailability(ability,selectedSheet,{combat:!!combat?.active,myTurn:isMyTurn||masterMode});
    if(reason){pushFeedback({kind:'warning',name:abilityName(ability),text:reason});return;}
    const init=Array.isArray(combatState?.initiative)?combatState.initiative:[];
    if(combat?.active&&init.length) setTargeting(ability);
    else executeAbility(ability,null);
  },[combat?.active,combatState?.initiative,selectedSheet,isMyTurn,masterMode,pushFeedback,executeAbility]);



  useEffect(()=>{
    if(access?.role!=='player'||effectiveMode!=='combat'||!isMyTurn)return undefined;
    const abilities=listAbilities(selectedClass,selectedSheet).slice(0,4);
    const onKey=e=>{
      if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.isComposing||isTyping(e)||abilityBusyRef.current)return;
      const tag=String(e.target?.tagName||'').toLowerCase();
      if(['input','textarea','select'].includes(tag)||e.target?.isContentEditable)return;
      const idx={'1':0,'2':1,'3':2,'4':3}[String(e.key||'')];
      if(idx==null||!abilities[idx])return;
      const ability=abilities[idx];
      const key=abilityKey(ability);
      const cooldown=Number(selectedSheet?.cooldowns?.[key]||0);
      if(cooldown>0||Number(selectedSheet?.vigos||0)<abilityCost(ability))return;
      e.preventDefault();
      chooseAbility(ability);
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[access?.role,effectiveMode,isMyTurn,combat?.active,selectedClass,selectedSheet,chooseAbility]);

  const createItem=useCallback(async form=>{
    const id=nowId('item');
    await setDoc(doc(db,'campaign_items',id),{name:String(form?.name||'Item').trim(),icon:form?.icon||'◆',description:String(form?.description||''),ownerSheetId:String(form?.ownerSheetId||'group'),createdAt:Date.now(),updatedAt:Date.now()});
    await addJournal(`${form?.name||'Um item'} entrou na campanha.`,'item',{icon:form?.icon||'◆',color:'#d6a7ff'});
    await patchGame({discovery:{id:nowId('item_discovery'),type:'item',title:form?.name||'Novo item',subtitle:'Registrado no inventário da campanha',createdAt:Date.now(),expiresAt:Date.now()+4800}});
  },[addJournal,patchGame]);

  const transferItem=useCallback(async(itemId,ownerSheetId)=>{
    const item=items.find(x=>String(x.id)===String(itemId)); if(!item)return;
    const owner=sheets.find(s=>String(s.id)===String(ownerSheetId));
    await setDoc(doc(db,'campaign_items',String(itemId)),{ownerSheetId:String(ownerSheetId),updatedAt:Date.now()},{merge:true});
    await addJournal(`${item.name||'Item'} foi entregue ${ownerSheetId==='group'?'ao grupo':`a ${owner?.nome||'outro personagem'}`}.`,'item',{icon:item.icon||'◆',color:'#c8a8e8'});
  },[items,sheets,addJournal]);

  const updateItem=useCallback(async(itemId,form)=>{
    if(!masterMode||!itemId||!form?.name?.trim())return;
    await setDoc(doc(db,'campaign_items',String(itemId)),{name:String(form.name).trim(),icon:form.icon||'◆',description:String(form.description||''),ownerSheetId:String(form.ownerSheetId||'group'),updatedAt:Date.now()},{merge:true});
  },[masterMode]);

  const deleteItem=useCallback(async itemId=>{
    if(!masterMode||!itemId)return;
    await deleteDoc(doc(db,'campaign_items',String(itemId)));
  },[masterMode]);

  const completeObjective=useCallback(async()=>{
    const title=session?.objective||'Objetivo';
    if(!title)return;
    await addJournal(`Objetivo concluído: ${title}`,'objective',{icon:'✓',color:'#53f1a6',memory:true});
    await patchGame({discovery:{id:nowId('objective'),type:'objective',title,subtitle:session?.location||'',createdAt:Date.now(),expiresAt:Date.now()+5000}});
    await updateSession({objective:''});
  },[session?.objective,session?.location,addJournal,patchGame,updateSession]);

  const openDirector=tabId=>{setDirectorTab(tabId||'scene');setPanel('director');};
  const handout=game?.handout?.visible&&String(game?.handout?.id||'')!==dismissedHandout?{...game.handout,imageUrl:directorMedia?.[String(game.handout.imageRef||'')]?.data||game.handout.imageUrl||''}:null;
  const genericCinematic=effectiveMode==='cinematic'&&!bossVisible;
  const previewCombatFx=useCallback(()=>{
    const active=Array.isArray(combatState?.initiative)?combatState.initiative[Number(combatState?.turnIdx||0)]:null;
    const entity=active||selectedSheet||{};
    const entityId=String(entity.id||selectedSheet?.id||'').replace(/^[pe]_/, '');
    const color=entity.color||selectedClass?.color||'#a855f7';
    const ts=Date.now();
    window.dispatchEvent(new CustomEvent('dinastia:cosmic-live',{detail:{id:nowId('fx_preview_turn'),type:'turn_announce',icon:'\u2694',text:entity.nome||selectedSheet?.nome||'Combatente',subtitle:entity.className||selectedClass?.name||'Aventureiro',color,soft:false,ts}}));
    window.setTimeout(()=>{
      window.dispatchEvent(new CustomEvent('dinastia:hp-change',{detail:{id:nowId('fx_preview_hp'),entityId,name:entity.nome||selectedSheet?.nome||'Combatente',diff:-7,critical:true,death:false,ts:Date.now()}}));
      pushFeedback({kind:'damage',icon:'\u2726',name:'Cr\u00EDtico de demonstra\u00E7\u00E3o',text:'Pr\u00E9via local, nenhum HP foi alterado.',value:'\u22127'});
    },2150);
  },[combatState?.initiative,combatState?.turnIdx,selectedSheet,selectedClass?.color,selectedClass?.name,pushFeedback]);

  return <div className={`game3-root game3-mode-${effectiveMode} game3-preset-${preset} game3-tab-${tab} ${mobileHudOpen?'g3-mobile-hud-open':'g3-mobile-hud-closed'}`} data-game3-mode={effectiveMode}>
    <SummonCombatRack access={access} tab={tab}/>
    <TableCameras access={access} selectedSheet={selectedSheet} masterMode={masterMode}/>
    <WorldParticles type={game?.environment?.type||'none'} intensity={game?.environment?.intensity||45}/>
    <TopContext mode={effectiveMode} session={session} presence={activePresence} combat={combat} combatState={combatState} selectedSheet={selectedSheet} masterMode={masterMode} onCompleteObjective={completeObjective}/>
    <UtilityRail tab={tab} panel={panel} setPanel={setPanel} masterMode={masterMode} onNavigate={onNavigate} preset={preset} setPreset={setPreset} onPing={()=>setPingOpen(true)}/>
    {!masterMode&&<PlayerDock panel={panel} onPanel={setPanel} onNavigate={onNavigate}/>}
    {masterMode&&<MasterQuickBar onOpen={openDirector} onNavigate={onNavigate} onPatchGame={patchGame} currentMode={game?.worldMode||'exploration'}/>} 
    <ActionBar mode={effectiveMode} selectedSheet={selectedSheet} selectedClass={selectedClass} combat={combat} combatState={combatState} onNavigate={onNavigate} onAbility={chooseAbility} onOpenSheet={()=>setPanel('sheet')} onOpenInventory={()=>setPanel('inventory')} busy={abilityBusy} masterMode={masterMode}/>

    {panel==='preferences'&&<DrawerShell title="Conforto e atalhos" kicker="SUA EXPERIÊNCIA" onClose={()=>setPanel('')}><ComfortPanel/></DrawerShell>}
    {panel==='more'&&<DrawerShell title="Explorar e consultar" kicker="DINASTIA E" onClose={()=>setPanel('')}><MorePanel onNavigate={id=>{setPanel('');onNavigate(id)}} onPreferences={()=>setPanel('preferences')}/></DrawerShell>}
    {panel==='sheet'&&<CharacterDrawer sheet={selectedSheet} cls={selectedClass} onClose={()=>setPanel('')} onNavigate={onNavigate}/>}
    {panel==='abilities'&&<AbilityDrawer sheet={selectedSheet} cls={selectedClass} customAbilities={customAbilities} onClose={()=>setPanel('')} onAbility={chooseAbility} combat={!!combat?.active} myTurn={isMyTurn||masterMode} busy={abilityBusy}/>} 
    {panel==='journal'&&<JournalDrawer3 journal={journal} masterMode={masterMode} addJournal={addJournal} updateJournal={updateJournal} deleteJournal={deleteJournal} onClose={()=>setPanel('')}/>} 
    {panel==='inventory'&&<InventoryDrawer items={items} sheets={sheets} selectedSheet={selectedSheet} masterMode={masterMode} onClose={()=>setPanel('')} onCreate={createItem} onUpdate={updateItem} onDelete={deleteItem} onTransfer={transferItem}/>} 
    {panel==='director'&&<DirectorPanel key={directorTab} game={game} session={session} combat={combat} combatState={combatState} masterMode={masterMode} onClose={()=>setPanel('')} onPatchGame={patchGame} onNavigate={onNavigate} onUpdateSession={updateSession} onStartSession={startSession} onEndSession={endSession} onNextTurn={nextTurn} onEndCombat={endCombat} onSoundscape={applySoundscapePreset} onCosmic={triggerCosmicEvent} onAtlas={addAtlasDiscovery} onJournal={addJournal} onCreateItem={createItem} sheets={sheets} directorMedia={directorMedia} onSaveMedia={saveDirectorMedia} onPreviewFx={previewCombatFx}/>} 

    <NpcFocus npc={game?.npcFocus?{...game.npcFocus,portrait:directorMedia?.[String(game.npcFocus.portraitRef||'')]?.data||game.npcFocus.portrait||''}:null}/>
    <FeedbackStack rows={feedback}/>
    {discoveryVisible&&<DiscoveryToast event={game?.discovery}/>} 
    <TargetingOverlay targeting={targeting} combatState={combatState} onChoose={target=>executeAbility(targeting,target)} onCancel={()=>setTargeting(null)}/>
    <PingWheel open={pingOpen} onClose={()=>setPingOpen(false)}/>
    {handout&&<HandoutOverlay handout={handout} masterMode={masterMode} onDismiss={()=>setDismissedHandout(String(handout.id||''))} onHide={()=>patchGame({handout:{...handout,visible:false}})}/>} 
    {openingVisible&&<OpeningCinematic opening={game.openingScene} imageUrl={directorMedia?.[String(game.openingScene.imageRef||'')]?.data||''} masterMode={masterMode} onEnd={()=>{setOpeningVisible(false);patchGame({openingScene:{...(game?.openingScene||{}),active:false,endedAt:Date.now()}})}}/>}
    {bossVisible&&<BossCinematic boss={{...(game?.bossReveal||{}),imageUrl:directorMedia?.[String(game?.bossReveal?.imageRef||'')]?.data||game?.bossReveal?.imageUrl||''}}/>} 
    {genericCinematic&&<GenericCinematic session={session} masterMode={masterMode} onExit={()=>patchGame({worldMode:'exploration'})}/>} 
  </div>;
}

export { WORLD_MODES, ENVIRONMENTS, PING_TYPES, HUD_PRESETS };
