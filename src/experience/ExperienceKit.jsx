import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  collection, doc, limit, onSnapshot, orderBy, query, setDoc, updateDoc,
} from 'firebase/firestore';
import { db } from '../core/firebase';
import {
  ATMOSPHERES, CLASSES, SHEET_COLORS, STATUS_LIST, getSheetMaxHp,
} from '../data/gameData';

const ExperienceContext = createContext(null);
const JOURNAL_LIMIT = 40;

const NAV_GROUPS = [
  { id:'session', label:'Sessão', icon:'✦', items:[{id:'session',label:'Sessão Atual',icon:'✦'}] },
  { id:'character', label:'Personagem', icon:'◆', items:[{id:'fichas',label:'Fichas',icon:'📋'},{id:'classes',label:'Classes',icon:'⚔️'}] },
  { id:'world', label:'Mundo', icon:'◈', items:[{id:'mapamundi',label:'Mapa Múndi',icon:'🌍'},{id:'personagens',label:'Personagens',icon:'👤'},{id:'bestiario',label:'Bestiário',icon:'🐉'}] },
  { id:'knowledge', label:'Conhecimento', icon:'◇', items:[{id:'livro',label:'Livro da Mandíbula',icon:'✦'},{id:'cronicas',label:'Crônicas',icon:'🗒️'},{id:'regras',label:'Regras',icon:'📖'},{id:'prologo',label:'Prólogo',icon:'📜'}] },
  { id:'table', label:'Mesa', icon:'⚔', items:[{id:'mapabatalha',label:'Mapa de Batalha',icon:'🗡️'},{id:'inimigos',label:'Inimigos',icon:'💀'}] },
];

const SOUNDSCAPE_PRESETS = {
  silencio: { label:'Silêncio', icon:'◌', rain:0, wind:0, fire:0, whispers:0, hum:0 },
  catedral: { label:'Catedral', icon:'⛪', rain:8, wind:24, fire:0, whispers:38, hum:26 },
  tempestade: { label:'Tempestade', icon:'⛈️', rain:68, wind:52, fire:0, whispers:0, hum:8 },
  fogueira: { label:'Fogueira', icon:'🔥', rain:0, wind:15, fire:62, whispers:0, hum:4 },
  vazio: { label:'Vazio Cósmico', icon:'🌌', rain:0, wind:18, fire:0, whispers:28, hum:48 },
  ruinas: { label:'Ruínas', icon:'🏚️', rain:18, wind:34, fire:4, whispers:18, hum:12 },
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

export function ExperienceProvider({ children, tab, masterMode }) {
  const [sheets,setSheets]=useState([]);
  const [combat,setCombat]=useState({active:false});
  const [combatState,setCombatState]=useState({initiative:[],turnIdx:0,round:1,log:[]});
  const [session,setSession]=useState({active:false,title:'',location:'',objective:'',subtitle:''});
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

  useEffect(()=>{
    const unsubscribers=[];
    unsubscribers.push(onSnapshot(collection(db,'sheets'),snap=>setSheets(snap.docs.map(d=>({id:d.id,...d.data()})))));
    unsubscribers.push(onSnapshot(doc(db,'config','combat'),snap=>setCombat(normalizeDoc(snap,{active:false}))));
    unsubscribers.push(onSnapshot(doc(db,'config','combat_state'),snap=>setCombatState(normalizeDoc(snap,{initiative:[],turnIdx:0,round:1,log:[]}))));
    unsubscribers.push(onSnapshot(doc(db,'config','session'),snap=>setSession(normalizeDoc(snap,{active:false,title:'',location:'',objective:'',subtitle:''}))));
    unsubscribers.push(onSnapshot(doc(db,'config','ambient'),snap=>setAmbient(normalizeDoc(snap,{}))));
    unsubscribers.push(onSnapshot(doc(db,'config','soundscape'),snap=>setSoundscapeState({...SOUNDSCAPE_PRESETS.silencio,...normalizeDoc(snap,{})})));
    unsubscribers.push(onSnapshot(doc(db,'config','cosmic_event'),snap=>{ if(snap.exists()) setCosmicEvent(snap.data()); }));
    unsubscribers.push(onSnapshot(doc(db,'config','battlemap_active'),snap=>setActiveMapState(normalizeDoc(snap,{activeId:''}))));
    const journalQuery=query(collection(db,'session_journal'),orderBy('ts','desc'),limit(JOURNAL_LIMIT));
    unsubscribers.push(onSnapshot(journalQuery,snap=>setJournal(snap.docs.map(d=>({id:d.id,...d.data()})))));
    return()=>unsubscribers.forEach(fn=>fn());
  },[]);

  useEffect(()=>{
    if(!(masterMode || tab==='mapabatalha')) { setMaps([]); return; }
    return onSnapshot(collection(db,'battlemaps'),snap=>setMaps(snap.docs.map(d=>({id:d.id,...d.data()}))));
  },[masterMode,tab]);

  useEffect(()=>{
    if(!(masterMode || tab==='mapamundi' || tab==='session')) { setAtlas([]); return; }
    return onSnapshot(collection(db,'atlas_discoveries'),snap=>{
      const rows=snap.docs.map(d=>({id:d.id,...d.data()}));
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
    const value=String(id||'');
    setSelectedSheetIdState(value);
    safeLocalStorage.set('dinastia_player_sheet',value);
  },[]);

  const selectedSheet=useMemo(()=>sheets.find(s=>String(s.id)===String(selectedSheetId))||null,[sheets,selectedSheetId]);
  const selectedClass=useMemo(()=>CLASSES.find(c=>c.id===selectedSheet?.classe)||null,[selectedSheet?.classe]);

  const addJournal=useCallback(async(text,type='story',extra={})=>{
    if(!String(text||'').trim()) return;
    const id=extra.id||nowId('journal');
    await setDoc(doc(db,'session_journal',id),{
      text:String(text).trim(), type, ts:extra.ts||Date.now(), round:extra.round??combatState.round??null,
      memory:!!extra.memory, icon:extra.icon||'', color:extra.color||'', source:extra.source||'site',
    });
  },[combatState.round]);

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
    await setDoc(doc(db,'config','session'),payload,{merge:true});
  },[session.active]);

  const startSession=useCallback(async draft=>{
    const payload={
      active:true,
      title:draft?.title||session.title||'Sessão em andamento',
      subtitle:draft?.subtitle??session.subtitle??'',
      location:draft?.location??session.location??'',
      objective:draft?.objective??session.objective??'',
      startedAt:Date.now(),updatedAt:Date.now(),
    };
    await setDoc(doc(db,'config','session'),payload,{merge:true});
    await addJournal(`Sessão iniciada${payload.title?`: ${payload.title}`:''}.`,'session',{icon:'✦',color:'#A855F7'});
  },[session,addJournal]);

  const endSession=useCallback(async()=>{
    await setDoc(doc(db,'config','session'),{active:false,endedAt:Date.now(),updatedAt:Date.now()},{merge:true});
    await addJournal('A sessão foi encerrada.','session',{icon:'◌',color:'#6A5A7A',memory:true});
  },[addJournal]);

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
    await setDoc(doc(db,'config','cosmic_event'),event);
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
    if(!init.length) return;
    const currentIdx=Number(combatState.turnIdx||0);
    const next=(currentIdx+1)%init.length;
    const newRound=next===0?Number(combatState.round||1)+1:Number(combatState.round||1);
    const target=init[next]||{};
    const entry={msg:`Vez de ${target.nome||'combatente'}${next===0?` — Rodada ${newRound} começa!`:''}`,color:target.color||'#C8B8A0',icon:'▶',ts:Date.now(),round:newRound};
    const nextLog=[...(combatState.log||[]),entry].slice(-60);
    await setDoc(doc(db,'config','combat_state'),{initiative:init,turnIdx:next,round:newRound,log:nextLog},{merge:true});
    await setDoc(doc(db,'config','combat'),{active:true,round:newRound,currentNome:target.nome||'',currentColor:target.color||'#E8193C',currentType:target.type||'player'},{merge:true});
  },[combatState]);

  const endCombat=useCallback(async()=>{
    await setDoc(doc(db,'config','combat'),{active:false,endedAt:Date.now()},{merge:true});
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

  const useQuickAbility=useCallback(async ability=>{
    if(!selectedSheet || !ability) return false;
    const abilityId=String(ability.id||ability.name||ability.nome||'');
    const cost=Number(ability.cost||ability.custo||0);
    const currentVigos=Number(selectedSheet.vigos||0);
    const cooldowns=selectedSheet.cooldowns||{};
    if(Number(cooldowns[abilityId]||0)>0 || currentVigos<cost) return false;
    const turns=parseCooldown(ability.cooldown||ability.tempo);
    await updateDoc(doc(db,'sheets',String(selectedSheet.id)),{
      vigos:Math.max(0,currentVigos-cost),
      cooldowns:{...cooldowns,...(turns>0?{[abilityId]:turns}:{})},
    });
    await addJournal(`${selectedSheet.nome||'Personagem'} usou ${ability.name||ability.nome}.`,'ability',{icon:'⚡',color:selectedClass?.color||'#A855F7'});
    await setDoc(doc(db,'config','cosmic_event'),{
      id:nowId('ability'),type:'ability',text:ability.name||ability.nome||'Habilidade',ts:Date.now(),
      color:selectedClass?.color||'#A855F7',icon:selectedClass?.icon||'⚡',soft:true,
    });
    return true;
  },[selectedSheet,selectedClass,addJournal]);

  const value=useMemo(()=>({
    tab,masterMode,sheets,selectedSheetId,setSelectedSheetId,selectedSheet,selectedClass,
    combat,combatState,session,ambient,soundscape,cosmicEvent,journal,maps,atlas,activeMap,
    updateSession,startSession,endSession,setAtmosphere,setSoundscape,applySoundscapePreset,
    triggerCosmicEvent,setActiveMap,nextTurn,endCombat,addJournal,addAtlasDiscovery,useQuickAbility,
  }),[
    tab,masterMode,sheets,selectedSheetId,setSelectedSheetId,selectedSheet,selectedClass,combat,combatState,
    session,ambient,soundscape,cosmicEvent,journal,maps,atlas,activeMap,updateSession,startSession,endSession,
    setAtmosphere,setSoundscape,applySoundscapePreset,triggerCosmicEvent,setActiveMap,nextTurn,endCombat,
    addJournal,addAtlasDiscovery,useQuickAbility,
  ]);

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

export function useExperience(){
  const value=useContext(ExperienceContext);
  if(!value) throw new Error('useExperience precisa estar dentro de ExperienceProvider');
  return value;
}

export function ImmersiveNavigation({ tab, onNavigate, accent='#A855F7' }){
  const [mobileMenu,setMobileMenu]=useState(false);
  const { combat, selectedSheet }=useExperience();
  const go=id=>{ onNavigate(id); setMobileMenu(false); };
  const mobileMain=[
    {id:'session',label:'Sessão',icon:'✦'},
    {id:'fichas',label:'Ficha',icon:'📋'},
    {id:'mapabatalha',label:'Batalha',icon:'🗡️'},
    {id:'mapamundi',label:'Mundo',icon:'🌍'},
  ];
  return <>
    <aside className="grim-nav">
      <button className="grim-brand" onClick={()=>go('session')} title="Dinastia E"><span>DE</span><b>Dinastia E</b></button>
      <div className="grim-groups">
        {NAV_GROUPS.map(group=><div className="grim-group" key={group.id}>
          <div className="grim-group-title"><span>{group.icon}</span><b>{group.label}</b></div>
          {group.items.map(item=><button key={item.id} onClick={()=>go(item.id)} className={`grim-link ${tab===item.id?'active':''}`} style={{'--accent':accent}} title={item.label}>
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
        {NAV_GROUPS.map(group=><section key={group.id}><h4>{group.icon} {group.label}</h4><div>{group.items.map(item=><button key={item.id} onClick={()=>go(item.id)} className={tab===item.id?'active':''}>{item.icon} {item.label}</button>)}</div></section>)}
      </div>
    </div>}
  </>;
}

export function SessionDashboard({ onNavigate, masterMode }){
  const {
    session,combat,combatState,ambient,selectedSheet,selectedSheetId,setSelectedSheetId,sheets,journal,atlas,activeMap,
  }=useExperience();
  const maxHp=selectedSheet?getSheetMaxHp(selectedSheet):1;
  const hp=Number(selectedSheet?.hp||0);
  const hpPct=clamp((hp/Math.max(1,maxHp))*100,0,100);
  const cls=CLASSES.find(c=>c.id===selectedSheet?.classe);
  const current=combatState?.initiative?.[combatState.turnIdx||0];
  const recent=journal.slice(0,6);
  const enter=()=>onNavigate(combat?.active||activeMap?.activeId?'mapabatalha':'fichas');
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

      <section className="session-card journal-card"><header><span>DIÁRIO VIVO</span><span>{recent.length} registros recentes</span></header><div className="journal-mini">{recent.length?recent.map(item=><div key={item.id}><i style={{background:item.color||'#A855F7'}}>{item.icon||'•'}</i><p>{item.text}</p><time>{item.round?`R${item.round} · `:''}{new Date(item.ts||Date.now()).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time></div>):<div className="empty-state">A sessão ainda não deixou rastros.</div>}</div></section>

      <section className="session-card atlas-card"><header>ATLAS DE DESCOBERTAS</header><div className="atlas-stats"><div><b>{atlasStats.visited}</b><span>Visitados</span></div><div><b>{atlasStats.discovered}</b><span>Descobertos</span></div><div><b>{atlasStats.rumor}</b><span>Rumores</span></div></div><button onClick={()=>onNavigate('mapamundi')}>Abrir Atlas</button></section>

      <section className="session-card soundtrack-card"><header>ATMOSFERA</header><div className={`sound-wave ${ambient?.playing?'playing':''}`}><i/><i/><i/><i/><i/></div><h3>{ambient?.playing?(ambient.nome||'Trilha em reprodução'):'Silêncio entre as estrelas'}</h3><p>{masterMode?'Você controla a atmosfera pela Mesa do Mestre.':'A trilha e o ambiente são sincronizados pelo Mestre.'}</p></section>
    </div>
  </div>;
}

function CombatHud({ onNavigate }){
  const { combat,combatState,selectedSheet,selectedClass,useQuickAbility }=useExperience();
  const [expanded,setExpanded]=useState(false);
  if(!combat?.active||!selectedSheet) return null;
  const maxHp=getSheetMaxHp(selectedSheet); const hp=Number(selectedSheet.hp||0); const hpPct=clamp((hp/Math.max(1,maxHp))*100,0,100);
  const current=combatState?.initiative?.[combatState.turnIdx||0];
  const isMyTurn=current?.type==='player' && String(current?.id||'').replace(/^p_/,'')===String(selectedSheet.id);
  const abilities=(selectedClass?.normal||[]).slice(0,3);
  return <div className={`combat-hud ${expanded?'expanded':''} ${isMyTurn?'my-turn':''}`}>
    <button className="hud-collapse" onClick={()=>setExpanded(x=>!x)}>{expanded?'⌄':'⌃'}</button>
    <div className="hud-character"><div className="hud-portrait" style={{'--c':selectedClass?.color||'#A855F7'}}>{selectedSheet.foto?<img src={selectedSheet.foto}/>:selectedSheet.nome?.[0]}</div><div><b>{selectedSheet.nome}</b><small>{isMyTurn?'✦ SEU TURNO':`Vez de ${current?.nome||'—'}`}</small></div></div>
    <div className="hud-bars"><div><span>❤</span><i><em style={{width:`${hpPct}%`}}/></i><b>{hp}/{maxHp}</b></div><div><span>✦</span><i className="vc"><em style={{width:`${clamp((Number(selectedSheet.vigos||0)/8)*100,0,100)}%`}}/></i><b>{selectedSheet.vigos||0} VC</b></div></div>
    <div className="hud-abilities">{abilities.map(a=>{const key=String(a.id||a.name);const cd=Number(selectedSheet.cooldowns?.[key]||0);const cost=Number(a.cost||0);const disabled=cd>0||Number(selectedSheet.vigos||0)<cost;return <button key={key} disabled={disabled} onClick={()=>useQuickAbility(a)} title={a.desc}><span>{a.name}</span><small>{cd>0?`⏳ ${cd}`:`⚡ ${cost} VC`}</small></button>})}</div>
    <div className="hud-actions"><button onClick={()=>onNavigate('fichas')}>📋</button><button onClick={()=>onNavigate('mapabatalha')}>🗡️</button></div>
  </div>;
}

function TurnRibbon(){
  const { tab,combat,combatState }=useExperience();
  if(!combat?.active||tab!=='mapabatalha'||!combatState?.initiative?.length) return null;
  const list=combatState.initiative; const idx=Number(combatState.turnIdx||0);
  return <div className="turn-ribbon"><div className="turn-round">RODADA <b>{combatState.round||1}</b></div><div className="turn-list">{list.map((c,i)=><div key={c.id||i} className={`turn-chip ${i===idx?'active':''} ${c.type==='enemy'?'enemy':''}`} style={{'--c':c.color||'#A855F7'}}><div>{c.foto?<img src={c.foto}/>:<span>{c.nome?.[0]||'?'}</span>}</div><small>{c.nome||'Combatente'}</small>{i===idx&&<b>AGORA</b>}</div>)}</div></div>;
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
  const { journal,addJournal,masterMode }=useExperience();
  const [open,setOpen]=useState(false); const [text,setText]=useState('');
  const add=async()=>{if(!text.trim())return;await addJournal(text,'story',{memory:true,icon:'✦',color:'#C8A8E8'});setText('');};
  return <><button className="journal-fab" onClick={()=>setOpen(true)} title="Diário Vivo">🗒️</button>{open&&<div className="journal-backdrop" onClick={()=>setOpen(false)}><aside className="journal-drawer" onClick={e=>e.stopPropagation()}><header><div><small>MEMÓRIAS DA MESA</small><h3>Diário Vivo</h3></div><button onClick={()=>setOpen(false)}>✕</button></header>{masterMode&&<div className="journal-add"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()} placeholder="Registrar uma memória..."/><button onClick={add}>Inscrever</button></div>}<div className="journal-timeline">{journal.map(item=><article key={item.id} className={item.memory?'memory':''}><i style={{'--c':item.color||'#A855F7'}}>{item.icon||'•'}</i><div><p>{item.text}</p><small>{item.round?`Rodada ${item.round} · `:''}{new Date(item.ts||Date.now()).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small></div>{item.memory&&<b>MEMÓRIA</b>}</article>)}</div></aside></div>}</>;
}

function AtlasDiscoveryPanel(){
  const { tab,atlas }=useExperience(); const [open,setOpen]=useState(true);
  if(tab!=='mapamundi') return null;
  const order={visitado:0,descoberto:1,rumor:2};
  const items=[...atlas].sort((a,b)=>(order[a.status]??9)-(order[b.status]??9));
  return <aside className={`atlas-overlay ${open?'open':''}`}><button className="atlas-toggle" onClick={()=>setOpen(x=>!x)}>🌍 {open?'Fechar':'Atlas'}</button>{open&&<><header><small>REGISTRO DE EXPLORAÇÃO</small><h3>Descobertas</h3></header><div className="atlas-list">{items.length?items.map(item=><article key={item.id} className={`atlas-${item.status||'rumor'}`}><span>{item.status==='visitado'?'✦':item.status==='descoberto'?'◇':'?'}</span><div><b>{item.name}</b><small>{item.status==='visitado'?'Visitado':item.status==='descoberto'?'Descoberto':'Rumor'}</small>{item.note&&<p>{item.note}</p>}</div></article>):<div className="empty-state">Nenhum local registrado ainda.</div>}</div></>}</aside>;
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
    masterMode,session,startSession,endSession,updateSession,combat,combatState,nextTurn,endCombat,maps,activeMap,setActiveMap,
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
    {section==='battle'&&<div className="master-section"><h3>Controle de Combate</h3><div className="master-status"><span className={combat?.active?'live':''}/><b>{combat?.active?`Combate ativo · Rodada ${combatState.round||1}`:'Sem combate ativo'}</b></div><label>Mapa ativo<select value={activeMap?.activeId||''} onChange={e=>setActiveMap(e.target.value)}><option value="">Nenhum mapa</option>{maps.map(m=><option key={m.id} value={m.id}>{m.nome||m.name||`Mapa ${m.id}`}</option>)}</select></label><div className="master-row"><button className="primary" disabled={!combat?.active} onClick={nextTurn}>Próximo turno ▶</button><button className="danger" disabled={!combat?.active} onClick={endCombat}>Encerrar combate</button></div></div>}
    {section==='ambience'&&<div className="master-section"><h3>Atmosfera do Mundo</h3><div className="atmosphere-grid">{Object.entries(ATMOSPHERES).map(([key,a])=><button key={key} onClick={()=>setAtmosphere(key)} style={{'--c':a.accent}}>{a.icon}<span>{a.label}</span></button>)}</div><h3>Soundscape</h3><div className="preset-grid">{Object.entries(SOUNDSCAPE_PRESETS).map(([key,p])=><button key={key} className={soundscape.preset===key?'active':''} onClick={()=>applySoundscapePreset(key)}>{p.icon}<span>{p.label}</span></button>)}</div>{[['rain','Chuva','🌧️'],['wind','Vento','🌬️'],['fire','Fogueira','🔥'],['whispers','Sussurros','〰'],['hum','Cosmum','◉']].map(([key,label,icon])=><label className="sound-slider" key={key}><span>{icon} {label}</span><input type="range" min="0" max="100" value={Number(soundscape[key]||0)} onChange={e=>setSoundscape({[key]:Number(e.target.value),preset:'custom',label:'Personalizado'})}/><b>{Number(soundscape[key]||0)}%</b></label>)}</div>}
    {section==='event'&&<div className="master-section"><h3>Eventos Cósmicos</h3><div className="event-types">{Object.entries(EVENT_TYPES).map(([key,e])=><button key={key} className={eventType===key?'active':''} onClick={()=>setEventType(key)} style={{'--c':e.color}}><span>{e.icon}</span>{e.label}</button>)}</div><label>Mensagem<input value={eventText} onChange={e=>setEventText(e.target.value)} placeholder="O que todos devem ver?"/></label><button className="primary" onClick={()=>triggerCosmicEvent(eventType,eventText||EVENT_TYPES[eventType]?.label)}>Manifestar para todos</button></div>}
    {section==='atlas'&&<div className="master-section"><h3>Registrar Descoberta</h3><label>Local<input value={atlasForm.name} onChange={e=>setAtlasForm(v=>({...v,name:e.target.value}))}/></label><label>Estado<select value={atlasForm.status} onChange={e=>setAtlasForm(v=>({...v,status:e.target.value}))}><option value="rumor">Rumor</option><option value="descoberto">Descoberto</option><option value="visitado">Visitado</option></select></label><label>Nota<textarea rows={4} value={atlasForm.note} onChange={e=>setAtlasForm(v=>({...v,note:e.target.value}))}/></label><button className="primary" onClick={addAtlas}>Inscrever no Atlas</button></div>}
    {section==='journal'&&<div className="master-section"><h3>Memória da Sessão</h3><label>Registro<textarea rows={5} value={memory} onChange={e=>setMemory(e.target.value)} placeholder="Algo que merece permanecer nas Crônicas..."/></label><button className="primary" onClick={addMemory}>Marcar como memória</button></div>}
  </div></aside></div>}</>;
}

export function ExperienceLayer({ onNavigate }){
  return <>
    <CharacterStateAura/>
    <TurnRibbon/>
    <CombatHud onNavigate={onNavigate}/>
    <CosmicEventLayer/>
    <JournalDrawer/>
    <AtlasDiscoveryPanel/>
    <SoundscapeLayer/>
    <MasterConsole/>
  </>;
}

export { NAV_GROUPS, SOUNDSCAPE_PRESETS, EVENT_TYPES };
