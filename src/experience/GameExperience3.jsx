import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../core/firebase';
import { getSheetMaxHp, STATUS_LIST } from '../data/gameData';
import { useExperience } from './ExperienceKit';
import './game-experience-3.css';

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
function listAbilities(cls){
  const buckets=[cls?.normal,cls?.especial,cls?.special,cls?.campanha,cls?.campaign];
  const rows=[];
  buckets.forEach(bucket=>{
    if(Array.isArray(bucket)) rows.push(...bucket);
    else if(bucket && typeof bucket==='object') rows.push(bucket);
  });
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
  return <span className={`g3-portrait g3-portrait-${size} ${active?'active':''}`} style={{'--g3-c':entity?.color||'#a855f7'}}>
    {entity?.foto||entity?.photo ? <img src={entity.foto||entity.photo} alt=""/> : <b>{initials(name)}</b>}
  </span>;
}

function Meter({label,value,max,className=''}){
  const safeMax=Math.max(1,Number(max)||1);
  const pct=clamp((Number(value||0)/safeMax)*100,0,100);
  return <div className={`g3-meter ${className}`}><span>{label}</span><i><em style={{width:`${pct}%`}}/></i><b>{Number(value||0)}/{safeMax}</b></div>;
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
    <span className="g3-presence-label"><i/> {rows.length} online</span>
    <div className="g3-presence-avatars">
      {rows.slice(0,8).map(row=><span key={row.id} className={`g3-presence-avatar ${row.role==='master'?'master':''}`} title={`${row.name||'Jogador'} · ${row.tab||'sessão'}`}>
        {row.photo?<img src={row.photo} alt=""/>:<b>{row.role==='master'?'✦':initials(row.name)}</b>}
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

function ActionBar({mode,selectedSheet,selectedClass,combat,combatState,onNavigate,onAbility,onOpenSheet,onOpenInventory}){
  const abilities=useMemo(()=>listAbilities(selectedClass).slice(0,4),[selectedClass]);
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
      <Portrait entity={{...selectedSheet,color:selectedClass?.color}} size="lg" active={myTurn}/>
      <span><b>{selectedSheet.nome||'Personagem'}</b><small>{myTurn?'✦ SEU TURNO':combatUi?`Vez de ${current?.nome||'—'}`:'Pronto para explorar'}</small></span>
    </button>
    <div className="g3-action-meters"><Meter label="❤" value={hp} max={maxHp} className="hp"/><Meter label="✦" value={vc} max={maxVc} className="vc"/></div>
    {combatUi?<div className="g3-hotbar">
      {abilities.length?abilities.map((ability,index)=>{
        const key=abilityKey(ability);
        const cd=Number(selectedSheet.cooldowns?.[key]||0);
        const cost=abilityCost(ability);
        const disabled=cd>0||vc<cost;
        return <button key={key} disabled={disabled} onClick={()=>onAbility(ability)} title={ability.desc||ability.descricao||abilityName(ability)}>
          <kbd>{['Q','W','E','R'][index]}</kbd><span>{abilityName(ability)}</span><small>{cd>0?`CD ${cd}`:cost?`${cost} VC`:'AÇÃO'}</small>{cd>0&&<i style={{'--cd':Math.min(1,cd/6)}}/>}
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
    <button className={panel==='sheet'?'active':''} onClick={()=>toggle('sheet')} title="Ficha rápida"><span>◆</span><small>Ficha</small></button>
    <button className={panel==='inventory'?'active':''} onClick={()=>toggle('inventory')} title="Inventário"><span>🗝</span><small>Itens</small></button>
    <button className={panel==='journal'?'active':''} onClick={()=>toggle('journal')} title="Diário Vivo"><span>🗒</span><small>Diário</small></button>
    {tab==='mapabatalha'&&<button onClick={onPing} title="Abrir roda de ping"><span>◎</span><small>Ping</small></button>}
    {masterMode&&<button className={panel==='director'?'active':''} onClick={()=>toggle('director')} title="Direção da sessão"><span>✦</span><small>Direção</small></button>}
    <div className="g3-rail-separator"/>
    <button className="g3-preset-button" onClick={()=>setPreset(preset==='standard'?'tactical':preset==='tactical'?'cinematic':'standard')} title={`HUD: ${HUD_PRESETS[preset]?.label||'Padrão'}`}><span>{HUD_PRESETS[preset]?.icon||'✦'}</span><small>HUD</small></button>
    <button onClick={()=>onNavigate('session')} title="Sessão atual"><span>⌂</span><small>Sessão</small></button>
  </div>;
}

function CharacterDrawer({sheet,cls,onClose,onNavigate,onAbility}){
  if(!sheet) return <DrawerShell title="Ficha rápida" kicker="PERSONAGEM" onClose={onClose}><div className="g3-empty">Nenhuma ficha selecionada.</div></DrawerShell>;
  const maxHp=getSheetMaxHp(sheet);
  const maxVc=Math.max(8,Number(sheet.vigos_max||sheet.maxVigos||8));
  const statuses=activeStatusEntries(sheet);
  const abilities=listAbilities(cls);
  const attrs=[['FOR','forca'],['AGI','agilidade'],['INT','inteligencia'],['PER','percepcao'],['VIG','vigor'],['CAR','carisma']].filter(([,key])=>sheet[key]!=null);
  return <DrawerShell title={sheet.nome||'Personagem'} kicker={cls?.name||'FICHA RÁPIDA'} onClose={onClose}>
    <div className="g3-sheet-hero"><Portrait entity={{...sheet,color:cls?.color}} size="xl"/><div><h3>{sheet.nome||'Sem nome'}</h3><p>{cls?.name||'Classe personalizada'} · Nível {sheet.nivel||1}</p><Meter label="❤" value={sheet.hp||0} max={maxHp} className="hp"/><Meter label="✦" value={sheet.vigos||0} max={maxVc} className="vc"/></div></div>
    {attrs.length>0&&<section className="g3-drawer-section"><header>ATRIBUTOS</header><div className="g3-attrs">{attrs.map(([label,key])=><div key={key}><small>{label}</small><b>{sheet[key]}</b></div>)}</div></section>}
    <section className="g3-drawer-section"><header>STATUS</header>{statuses.length?<div className="g3-statuses">{statuses.map(s=><span key={s.id} style={{'--g3-c':s.color}}>{s.icon} {s.label}</span>)}</div>:<div className="g3-muted">Nenhuma condição ativa.</div>}</section>
    <section className="g3-drawer-section"><header>HABILIDADES</header><div className="g3-ability-list">{abilities.slice(0,8).map(a=>{const key=abilityKey(a);const cd=Number(sheet.cooldowns?.[key]||0);return <button key={key} onClick={()=>onAbility(a)} disabled={cd>0}><span><b>{abilityName(a)}</b><small>{a.desc||a.descricao||'Ação da ficha'}</small></span><em>{cd?`CD ${cd}`:abilityCost(a)?`${abilityCost(a)} VC`:'USAR'}</em></button>})}</div></section>
    <button className="g3-primary-wide" onClick={()=>onNavigate('fichas')}>Abrir ficha completa →</button>
  </DrawerShell>;
}

function DrawerShell({title,kicker,onClose,children,className=''}){
  return <aside className={`g3-right-drawer ${className}`}><header className="g3-drawer-head"><div><small>{kicker}</small><h2>{title}</h2></div><button onClick={onClose}>✕</button></header><div className="g3-drawer-scroll">{children}</div></aside>;
}

function JournalDrawer3({journal,masterMode,addJournal,onClose}){
  const [text,setText]=useState('');
  const add=async()=>{if(!text.trim())return;await addJournal(text,'story',{memory:true,icon:'✦',color:'#d6a7ff'});setText('');};
  return <DrawerShell title="Diário Vivo" kicker="TIMELINE DA CAMPANHA" onClose={onClose} className="g3-journal-drawer">
    {masterMode&&<div className="g3-inline-form"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="Registrar uma memória..."/><button onClick={add}>Inscrever</button></div>}
    <div className="g3-journal-timeline">{journal.length?journal.map(item=><article key={item.id} className={item.memory?'memory':''}><i style={{'--g3-c':item.color||'#a855f7'}}>{item.icon||'•'}</i><div><p>{item.text}</p><small>{item.round?`Rodada ${item.round} · `:''}{new Date(item.ts||Date.now()).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small></div></article>):<div className="g3-empty">A campanha ainda não deixou registros.</div>}</div>
  </DrawerShell>;
}

function InventoryDrawer({items,sheets,selectedSheet,masterMode,onClose,onCreate,onTransfer}){
  const [dragId,setDragId]=useState('');
  const [form,setForm]=useState({name:'',icon:'◆',description:'',ownerSheetId:'group'});
  const ownId=String(selectedSheet?.id||'');
  const visible=items.filter(item=>masterMode||String(item.ownerSheetId||'group')==='group'||String(item.ownerSheetId||'')===ownId);
  const create=async()=>{if(!form.name.trim())return;await onCreate(form);setForm({name:'',icon:'◆',description:'',ownerSheetId:form.ownerSheetId||'group'});};
  return <DrawerShell title="Itens de Campanha" kicker="INVENTÁRIO VISUAL" onClose={onClose} className="g3-inventory-drawer">
    {masterMode&&<section className="g3-item-create"><header>CRIAR ITEM</header><div className="g3-icon-picker">{ITEM_ICONS.map(icon=><button key={icon} className={form.icon===icon?'active':''} onClick={()=>setForm(v=>({...v,icon}))}>{icon}</button>)}</div><input value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} placeholder="Nome do item"/><textarea rows={2} value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))} placeholder="Descrição curta"/><select value={form.ownerSheetId} onChange={e=>setForm(v=>({...v,ownerSheetId:e.target.value}))}><option value="group">Grupo</option>{sheets.map(s=><option key={s.id} value={s.id}>{s.nome||'Personagem'}</option>)}</select><button onClick={create}>Criar item</button></section>}
    <section className="g3-drawer-section"><header>ITENS DISPONÍVEIS</header><div className="g3-item-grid">{visible.length?visible.map(item=>{
      const canDrag=masterMode||String(item.ownerSheetId||'')===ownId;
      const owner=sheets.find(s=>String(s.id)===String(item.ownerSheetId));
      return <article key={item.id} draggable={canDrag} onDragStart={()=>canDrag&&setDragId(item.id)} onDragEnd={()=>setDragId('')} className={canDrag?'draggable':''}><span>{item.icon||'◆'}</span><div><b>{item.name||'Item'}</b><p>{item.description||'Item de campanha'}</p><small>{String(item.ownerSheetId)==='group'?'Grupo':owner?.nome||'Sem portador'}</small></div></article>;
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
  return <div className="g3-handout-backdrop"><article className="g3-handout"><header><div><small>REVELAÇÃO DO MESTRE</small><h2>{handout.title||'Documento revelado'}</h2></div><button onClick={masterMode?onHide:onDismiss}>✕</button></header>{handout.imageUrl&&<img src={handout.imageUrl} alt={handout.title||'Handout'} />}{handout.body&&<p>{handout.body}</p>}<footer><span>✦ Dinastia E</span><button onClick={onDismiss}>Guardar revelação</button></footer></article></div>;
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
  return <div className="g3-boss-cinematic"><div className="g3-cinematic-bars"/>{boss.imageUrl&&<img src={boss.imageUrl} alt=""/>}<div className="g3-boss-shade"/><div className="g3-boss-title"><small>{boss.kicker||'UMA PRESENÇA DESPERTA'}</small><h1>{boss.name||'CHEFE'}</h1><p>{boss.subtitle||''}</p><i/><b>{boss.phase||'CONFRONTO INICIADO'}</b></div></div>;
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

function DirectorPanel({game,session,combat,combatState,masterMode,onClose,onPatchGame,onNavigate,onUpdateSession,onStartSession,onEndSession,onNextTurn,onEndCombat,onSoundscape,onCosmic,onAtlas,onJournal,onCreateItem,sheets}){
  const [tab,setTab]=useState('scene');
  const [scene,setScene]=useState({title:'',subtitle:'',location:'',objective:''});
  const [npc,setNpc]=useState({name:'',subtitle:'',portrait:'',mood:'neutral',text:''});
  const [handout,setHandout]=useState({title:'',imageUrl:'',body:''});
  const [boss,setBoss]=useState({name:'',subtitle:'',imageUrl:'',kicker:'UMA PRESENÇA DESPERTA'});
  const [discovery,setDiscovery]=useState({type:'discovery',title:'',subtitle:''});
  const [atlas,setAtlas]=useState({name:'',status:'rumor',note:''});
  const [item,setItem]=useState({name:'',icon:'◆',description:'',ownerSheetId:'group'});

  useEffect(()=>setScene({title:session?.title||'',subtitle:session?.subtitle||'',location:session?.location||'',objective:session?.objective||''}),[session?.title,session?.subtitle,session?.location,session?.objective]);
  useEffect(()=>{
    const focus=game?.npcFocus;
    if(focus?.name) setNpc({name:focus.name||'',subtitle:focus.subtitle||'',portrait:focus.portrait||'',mood:focus.mood||'neutral',text:focus.text||''});
  },[game?.npcFocus?.name]);

  if(!masterMode) return null;
  const revealNpc=()=>onPatchGame({npcFocus:{...npc,visible:true,updatedAt:Date.now()}});
  const hideNpc=()=>onPatchGame({npcFocus:{...(game?.npcFocus||{}),visible:false,updatedAt:Date.now()}});
  const revealHandout=()=>onPatchGame({handout:{...handout,id:nowId('handout'),visible:true,createdAt:Date.now()}});
  const revealBoss=()=>onPatchGame({bossReveal:{...boss,id:nowId('boss'),createdAt:Date.now(),expiresAt:Date.now()+8500}});
  const revealDiscovery=()=>onPatchGame({discovery:{...discovery,id:nowId('discovery'),createdAt:Date.now(),expiresAt:Date.now()+5200}});
  const saveScene=()=>onUpdateSession(scene);
  const addAtlas=async()=>{if(!atlas.name.trim())return;await onAtlas(atlas);setAtlas({name:'',status:'rumor',note:''});};
  const createItem=async()=>{if(!item.name.trim())return;await onCreateItem(item);setItem({name:'',icon:'◆',description:'',ownerSheetId:item.ownerSheetId||'group'});};

  const nav=[['scene','Cena','◈'],['npc','NPC','👤'],['reveal','Revelar','✦'],['combat','Combate','⚔'],['world','Mundo','🌍'],['items','Itens','◆']];
  return <DrawerShell title="Game Director" kicker="MESTRE · DIREÇÃO AO VIVO" onClose={onClose} className="g3-director">
    <nav className="g3-director-tabs">{nav.map(([id,label,icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><span>{icon}</span>{label}</button>)}</nav>
    {tab==='scene'&&<div className="g3-director-section"><h3>Estado do mundo</h3><div className="g3-mode-grid">{Object.entries(WORLD_MODES).map(([key,value])=><button key={key} className={(game?.worldMode||'exploration')===key?'active':''} onClick={()=>onPatchGame({worldMode:key})}><span>{value.icon}</span><b>{value.label}</b><small>{value.hint}</small></button>)}</div><h3>Contexto da sessão</h3><label>Título<input value={scene.title} onChange={e=>setScene(v=>({...v,title:e.target.value}))}/></label><label>Subtítulo<input value={scene.subtitle} onChange={e=>setScene(v=>({...v,subtitle:e.target.value}))}/></label><label>Local atual<input value={scene.location} onChange={e=>setScene(v=>({...v,location:e.target.value}))}/></label><label>Objetivo<textarea rows={3} value={scene.objective} onChange={e=>setScene(v=>({...v,objective:e.target.value}))}/></label><div className="g3-director-row"><button onClick={saveScene}>Salvar contexto</button>{session?.active?<button className="danger" onClick={onEndSession}>Encerrar sessão</button>:<button className="primary" onClick={()=>onStartSession(scene)}>Iniciar sessão</button>}</div><h3>Ambiente sincronizado</h3><div className="g3-env-grid">{Object.entries(ENVIRONMENTS).map(([key,e])=><button key={key} className={(game?.environment?.type||'none')===key?'active':''} onClick={()=>onPatchGame({environment:{type:key,intensity:Number(game?.environment?.intensity||45)}})}>{e.icon}<small>{e.label}</small></button>)}</div><label>Intensidade<input type="range" min="0" max="100" value={Number(game?.environment?.intensity||45)} onChange={e=>onPatchGame({environment:{type:game?.environment?.type||'none',intensity:Number(e.target.value)}})}/></label><h3>Soundscape rápido</h3><div className="g3-soundscape-row">{[['silencio','◌'],['catedral','⛪'],['tempestade','⛈'],['fogueira','🔥'],['vazio','🌌'],['ruinas','🏚']].map(([key,icon])=><button key={key} onClick={()=>onSoundscape(key)}>{icon}<small>{key}</small></button>)}</div></div>}
    {tab==='npc'&&<div className="g3-director-section"><h3>NPC em foco</h3><label>Nome<input value={npc.name} onChange={e=>setNpc(v=>({...v,name:e.target.value}))} placeholder="Christina Pendragon"/></label><label>Título / função<input value={npc.subtitle} onChange={e=>setNpc(v=>({...v,subtitle:e.target.value}))} placeholder="Xerife de Pequeninis"/></label><label>Retrato (URL)<input value={npc.portrait} onChange={e=>setNpc(v=>({...v,portrait:e.target.value}))} placeholder="https://..."/></label><label>Postura<select value={npc.mood} onChange={e=>setNpc(v=>({...v,mood:e.target.value}))}><option value="friendly">Amigável</option><option value="neutral">Neutra</option><option value="suspicious">Suspeita</option><option value="hostile">Hostil</option><option value="unknown">Desconhecida</option></select></label><label>Frase / contexto<textarea rows={4} value={npc.text} onChange={e=>setNpc(v=>({...v,text:e.target.value}))} placeholder="Uma frase curta para colocar o personagem em cena..."/></label><div className="g3-director-row"><button className="primary" onClick={revealNpc}>Colocar em cena</button><button onClick={hideNpc}>Retirar foco</button></div></div>}
    {tab==='reveal'&&<div className="g3-director-section"><h3>Handout para toda a mesa</h3><label>Título<input value={handout.title} onChange={e=>setHandout(v=>({...v,title:e.target.value}))}/></label><label>Imagem (URL)<input value={handout.imageUrl} onChange={e=>setHandout(v=>({...v,imageUrl:e.target.value}))}/></label><label>Texto<textarea rows={3} value={handout.body} onChange={e=>setHandout(v=>({...v,body:e.target.value}))}/></label><button className="primary" onClick={revealHandout}>Revelar ao grupo</button><h3>Entrada de chefe</h3><label>Nome<input value={boss.name} onChange={e=>setBoss(v=>({...v,name:e.target.value}))}/></label><label>Epíteto<input value={boss.subtitle} onChange={e=>setBoss(v=>({...v,subtitle:e.target.value}))}/></label><label>Arte (URL)<input value={boss.imageUrl} onChange={e=>setBoss(v=>({...v,imageUrl:e.target.value}))}/></label><button className="danger" onClick={revealBoss}>⚔ Revelar chefe</button><h3>Descoberta</h3><label>Tipo<select value={discovery.type} onChange={e=>setDiscovery(v=>({...v,type:e.target.value}))}>{Object.entries(DISCOVERY_TYPES).map(([key,v])=><option key={key} value={key}>{v.label}</option>)}</select></label><label>Título<input value={discovery.title} onChange={e=>setDiscovery(v=>({...v,title:e.target.value}))}/></label><label>Complemento<input value={discovery.subtitle} onChange={e=>setDiscovery(v=>({...v,subtitle:e.target.value}))}/></label><button onClick={revealDiscovery}>Manifestar descoberta</button></div>}
    {tab==='combat'&&<div className="g3-director-section"><h3>Direção de combate</h3><div className={`g3-combat-status ${combat?.active?'live':''}`}><span/><div><small>{combat?.active?'COMBATE ATIVO':'SEM COMBATE'}</small><b>{combat?.active?`Rodada ${combatState?.round||1}`:'Prepare os participantes no mapa tático.'}</b></div></div><button className="g3-primary-wide" onClick={()=>onNavigate('mapabatalha')}>Abrir mapa e controle tático →</button>{combat?.active&&<div className="g3-director-row"><button className="primary" onClick={onNextTurn}>Próximo turno ▶</button><button className="danger" onClick={onEndCombat}>Encerrar combate</button></div>}<h3>Evento rápido</h3><div className="g3-event-row"><button onClick={()=>onCosmic('danger','⚠ O perigo se aproxima')}>⚠ Perigo</button><button onClick={()=>onCosmic('critical','✹ O destino se rompe')}>✹ Impacto</button><button onClick={()=>onCosmic('void','◉ O vazio observa')}>◉ Vazio</button></div></div>}
    {tab==='world'&&<div className="g3-director-section"><h3>Registrar no Atlas</h3><label>Local<input value={atlas.name} onChange={e=>setAtlas(v=>({...v,name:e.target.value}))}/></label><label>Estado<select value={atlas.status} onChange={e=>setAtlas(v=>({...v,status:e.target.value}))}><option value="unknown">Desconhecido</option><option value="rumor">Rumor</option><option value="descoberto">Descoberto</option><option value="visitado">Visitado</option><option value="concluido">Concluído</option><option value="corrompido">Corrompido</option><option value="destruido">Destruído</option></select></label><label>Nota<textarea rows={4} value={atlas.note} onChange={e=>setAtlas(v=>({...v,note:e.target.value}))}/></label><button className="primary" onClick={addAtlas}>Inscrever no Atlas</button><h3>Memória rápida</h3><button onClick={()=>onJournal(`O grupo registrou um marco em ${session?.location||'Cosmum'}.`,'story',{memory:true,icon:'◇',color:'#c8a8e8'})}>◇ Marcar o momento atual como memória</button></div>}
    {tab==='items'&&<div className="g3-director-section"><h3>Novo item de campanha</h3><div className="g3-icon-picker">{ITEM_ICONS.map(icon=><button key={icon} className={item.icon===icon?'active':''} onClick={()=>setItem(v=>({...v,icon}))}>{icon}</button>)}</div><label>Nome<input value={item.name} onChange={e=>setItem(v=>({...v,name:e.target.value}))}/></label><label>Descrição<textarea rows={3} value={item.description} onChange={e=>setItem(v=>({...v,description:e.target.value}))}/></label><label>Portador<select value={item.ownerSheetId} onChange={e=>setItem(v=>({...v,ownerSheetId:e.target.value}))}><option value="group">Grupo</option>{sheets.map(s=><option key={s.id} value={s.id}>{s.nome||'Personagem'}</option>)}</select></label><button className="primary" onClick={createItem}>Criar e registrar item</button></div>}
  </DrawerShell>;
}

function MasterQuickBar({onOpen,onNavigate,onPatchGame,currentMode}){
  return <div className="g3-master-quickbar"><button onClick={()=>onOpen('scene')} title="Direção da cena">✦</button><button onClick={()=>onNavigate('mapabatalha')} title="Combate">⚔</button><button onClick={()=>onOpen('npc')} title="NPC em foco">👤</button><button onClick={()=>onOpen('reveal')} title="Revelações">◇</button><button className={currentMode==='danger'?'active':''} onClick={()=>onPatchGame({worldMode:currentMode==='danger'?'exploration':'danger'})} title="Alternar perigo">⚠</button></div>;
}

export default function GameExperience3({access,masterMode,tab,onNavigate}){
  const {
    sheets,selectedSheet,selectedClass,combat,combatState,session,journal,
    updateSession,startSession,endSession,nextTurn,endCombat,applySoundscapePreset,triggerCosmicEvent,
    addAtlasDiscovery,addJournal,useQuickAbility,
  }=useExperience();

  const [game,setGame]=useState({worldMode:'exploration',environment:{type:'none',intensity:45}});
  const [presence,setPresence]=useState([]);
  const [items,setItems]=useState([]);
  const [enemies,setEnemies]=useState([]);
  const [panel,setPanel]=useState('');
  const [directorTab,setDirectorTab]=useState('scene');
  const [preset,setPresetState]=useState(()=>readStorage('dinastia_hud_preset','standard'));
  const [targeting,setTargeting]=useState(null);
  const [feedback,setFeedback]=useState([]);
  const [pingOpen,setPingOpen]=useState(false);
  const [bossVisible,setBossVisible]=useState(false);
  const [discoveryVisible,setDiscoveryVisible]=useState(false);
  const [dismissedHandout,setDismissedHandout]=useState('');
  const prevEntitiesRef=useRef(new Map());
  const entityPrimedRef=useRef(false);

  const patchGame=useCallback(async patch=>{
    await setDoc(doc(db,'config',GAME_DOC),{...patch,updatedAt:Date.now()},{merge:true});
  },[]);

  useEffect(()=>{
    const u1=onSnapshot(doc(db,'config',GAME_DOC),snap=>setGame(snap.exists()?{worldMode:'exploration',environment:{type:'none',intensity:45},...(snap.data()||{})}:{worldMode:'exploration',environment:{type:'none',intensity:45}}));
    const u2=onSnapshot(collection(db,'presence'),snap=>setPresence(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const u3=onSnapshot(collection(db,'campaign_items'),snap=>setItems(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>Number(b.updatedAt||b.createdAt||0)-Number(a.updatedAt||a.createdAt||0))));
    const u4=onSnapshot(collection(db,'enemies'),snap=>setEnemies(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>{u1();u2();u3();u4();};
  },[]);

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
          if(diff!==0) pushFeedback({kind:diff>0?'heal':'damage',icon:diff>0?'✚':'✦',name:entity.nome||'Combatente',text:diff>0?'recuperou vida':'sofreu dano',value:`${diff>0?'+':''}${diff}`});
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
    const boss=game?.bossReveal;
    if(!boss?.id||Date.now()>Number(boss.expiresAt||0)){setBossVisible(false);return;}
    setBossVisible(true);
    const timer=window.setTimeout(()=>setBossVisible(false),Math.max(250,Number(boss.expiresAt)-Date.now()));
    return()=>window.clearTimeout(timer);
  },[game?.bossReveal?.id,game?.bossReveal?.expiresAt]);

  useEffect(()=>{
    const event=game?.discovery;
    if(!event?.id||Date.now()>Number(event.expiresAt||0)){setDiscoveryVisible(false);return;}
    setDiscoveryVisible(true);
    const timer=window.setTimeout(()=>setDiscoveryVisible(false),Math.max(250,Number(event.expiresAt)-Date.now()));
    return()=>window.clearTimeout(timer);
  },[game?.discovery?.id,game?.discovery?.expiresAt]);

  const effectiveMode=game?.worldMode==='cinematic'?'cinematic':combat?.active?'combat':(game?.worldMode||'exploration');
  const setPreset=value=>{setPresetState(value);writeStorage('dinastia_hud_preset',value);};

  const executeAbility=useCallback(async(ability,target)=>{
    const ok=await useQuickAbility(ability);
    if(!ok){pushFeedback({kind:'warning',icon:'⚠',name:abilityName(ability),text:'Sem Vigor suficiente ou habilidade em cooldown.'});setTargeting(null);return;}
    if(target) await addJournal(`${selectedSheet?.nome||'Personagem'} definiu ${target.nome||'combatente'} como alvo de ${abilityName(ability)}.`,'ability',{icon:'⌖',color:selectedClass?.color||'#a855f7'});
    pushFeedback({kind:'ability',icon:'⚡',name:abilityName(ability),text:target?`Alvo: ${target.nome||'combatente'}`:'Ação manifestada'});
    setTargeting(null);
  },[useQuickAbility,addJournal,selectedSheet?.nome,selectedClass?.color,pushFeedback]);

  const chooseAbility=useCallback(ability=>{
    if(!ability)return;
    const init=Array.isArray(combatState?.initiative)?combatState.initiative:[];
    if(combat?.active&&init.length) setTargeting(ability);
    else executeAbility(ability,null);
  },[combat?.active,combatState?.initiative,executeAbility]);

  useEffect(()=>{
    if(access?.role!=='player'||!combat?.active)return;
    const abilities=listAbilities(selectedClass).slice(0,4);
    const onKey=e=>{
      if(e.ctrlKey||e.metaKey||e.altKey)return;
      const tag=String(e.target?.tagName||'').toLowerCase();
      if(['input','textarea','select'].includes(tag)||e.target?.isContentEditable)return;
      const idx={q:0,w:1,e:2,r:3}[String(e.key||'').toLowerCase()];
      if(idx==null||!abilities[idx])return;
      e.preventDefault();chooseAbility(abilities[idx]);
    };
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[access?.role,combat?.active,selectedClass,chooseAbility]);

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

  const completeObjective=useCallback(async()=>{
    const title=session?.objective||'Objetivo';
    if(!title)return;
    await addJournal(`Objetivo concluído: ${title}`,'objective',{icon:'✓',color:'#53f1a6',memory:true});
    await patchGame({discovery:{id:nowId('objective'),type:'objective',title,subtitle:session?.location||'',createdAt:Date.now(),expiresAt:Date.now()+5000}});
    await updateSession({objective:''});
  },[session?.objective,session?.location,addJournal,patchGame,updateSession]);

  const openDirector=tabId=>{setDirectorTab(tabId||'scene');setPanel('director');};
  const handout=game?.handout?.visible&&String(game?.handout?.id||'')!==dismissedHandout?game.handout:null;
  const genericCinematic=effectiveMode==='cinematic'&&!bossVisible;

  return <div className={`game3-root game3-mode-${effectiveMode} game3-preset-${preset} game3-tab-${tab}`} data-game3-mode={effectiveMode}>
    <WorldParticles type={game?.environment?.type||'none'} intensity={game?.environment?.intensity||45}/>
    <TopContext mode={effectiveMode} session={session} presence={activePresence} combat={combat} combatState={combatState} selectedSheet={selectedSheet} masterMode={masterMode} onCompleteObjective={completeObjective}/>
    <UtilityRail tab={tab} panel={panel} setPanel={setPanel} masterMode={masterMode} onNavigate={onNavigate} preset={preset} setPreset={setPreset} onPing={()=>setPingOpen(true)}/>
    {masterMode&&<MasterQuickBar onOpen={openDirector} onNavigate={onNavigate} onPatchGame={patchGame} currentMode={game?.worldMode||'exploration'}/>} 
    <ActionBar mode={effectiveMode} selectedSheet={selectedSheet} selectedClass={selectedClass} combat={combat} combatState={combatState} onNavigate={onNavigate} onAbility={chooseAbility} onOpenSheet={()=>setPanel('sheet')} onOpenInventory={()=>setPanel('inventory')}/>

    {panel==='sheet'&&<CharacterDrawer sheet={selectedSheet} cls={selectedClass} onClose={()=>setPanel('')} onNavigate={onNavigate} onAbility={chooseAbility}/>} 
    {panel==='journal'&&<JournalDrawer3 journal={journal} masterMode={masterMode} addJournal={addJournal} onClose={()=>setPanel('')}/>} 
    {panel==='inventory'&&<InventoryDrawer items={items} sheets={sheets} selectedSheet={selectedSheet} masterMode={masterMode} onClose={()=>setPanel('')} onCreate={createItem} onTransfer={transferItem}/>} 
    {panel==='director'&&<DirectorPanel key={directorTab} game={game} session={session} combat={combat} combatState={combatState} masterMode={masterMode} onClose={()=>setPanel('')} onPatchGame={patchGame} onNavigate={onNavigate} onUpdateSession={updateSession} onStartSession={startSession} onEndSession={endSession} onNextTurn={nextTurn} onEndCombat={endCombat} onSoundscape={applySoundscapePreset} onCosmic={triggerCosmicEvent} onAtlas={addAtlasDiscovery} onJournal={addJournal} onCreateItem={createItem} sheets={sheets}/>} 

    <NpcFocus npc={game?.npcFocus}/>
    <FeedbackStack rows={feedback}/>
    {discoveryVisible&&<DiscoveryToast event={game?.discovery}/>} 
    <TargetingOverlay targeting={targeting} combatState={combatState} onChoose={target=>executeAbility(targeting,target)} onCancel={()=>setTargeting(null)}/>
    <PingWheel open={pingOpen} onClose={()=>setPingOpen(false)}/>
    {handout&&<HandoutOverlay handout={handout} masterMode={masterMode} onDismiss={()=>setDismissedHandout(String(handout.id||''))} onHide={()=>patchGame({handout:{...handout,visible:false}})}/>} 
    {bossVisible&&<BossCinematic boss={game?.bossReveal}/>} 
    {genericCinematic&&<GenericCinematic session={session} masterMode={masterMode} onExit={()=>patchGame({worldMode:'exploration'})}/>} 
  </div>;
}

export { WORLD_MODES, ENVIRONMENTS, PING_TYPES, HUD_PRESETS };
