import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);
const must = (condition, message) => {
  if (!condition) throw new Error(`Cinematic combat/vitals patch: ${message}`);
};
const replaceOnce = (source, before, after, label) => {
  must(source.includes(before), `${label} não encontrado`);
  return source.replace(before, after);
};
const replaceSection = (source, startMarker, endMarker, replacement, label) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  must(start >= 0 && end > start, `${label} não encontrado`);
  return source.slice(0, start) + replacement + source.slice(end);
};
const appendOnce = (source, marker, block) => source.includes(marker) ? source : `${source.trimEnd()}\n\n${block.trim()}\n`;

// ---------------------------------------------------------------------------
// 1, 3, 4, 7, 8 — HUD: dano flutuante, morte, hotkeys, orbes e retratos.
// ---------------------------------------------------------------------------
const gameFile = 'src/experience/GameExperience3.adventure.jsx';
let game = read(gameFile);
game = replaceOnce(
  game,
  "import { useCallback, useEffect, useMemo, useRef, useState } from 'react';",
  "import { useCallback, useEffect, useMemo, useRef, useState } from 'react';\nimport * as ReactDOM from 'react-dom';",
  'import de ReactDOM',
);

const portraitAndVitals = `function Portrait({entity,size='md',active=false}){
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
  const text=(Number(event?.diff||0)>0?'+':'\u2212')+value;
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
        window.dispatchEvent(new CustomEvent('dinastia:cosmic-live',{detail:{id:'death_'+entityId+'_'+String(detail.ts||Date.now()),type:'death',icon:'\\uD83D\\uDC80',text:String(detail.name||'Combatente')+' caiu em combate',color:'#E8193C',soft:false,ts:Number(detail.ts||Date.now())}}));
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
`;
game = replaceSection(game, 'function Portrait(', '\n\nfunction WorldParticles(', portraitAndVitals, 'bloco Portrait/Meter');

game = replaceOnce(
  game,
  `    <button className="g3-action-character" onClick={onOpenSheet} title="Ficha rápida">
      <Portrait entity={{...selectedSheet,color:selectedClass?.color}} size="lg" active={myTurn}/>
      <span><b>{selectedSheet.nome||'Personagem'}</b><small>{myTurn?'✦ SEU TURNO':combatUi?\`Vez de \${current?.nome||'—'}\`:'Pronto para explorar'}</small></span>
    </button>
    <div className="g3-action-meters"><Meter label="❤" value={hp} max={maxHp} className="hp"/><Meter label="✦" value={vc} max={maxVc} className="vc"/></div>`,
  `    <button className="g3-action-character" onClick={onOpenSheet} title="Ficha rápida">
      {combatUi&&<HpOrb value={hp} max={maxHp} color="#E8193C" label="HP"/>}
      <Portrait entity={{...selectedSheet,color:selectedClass?.color}} size="lg" active={myTurn}/>
      {combatUi&&<VcOrb value={vc} max={maxVc} color="#a855f7" label="VC"/>}
      <span><b>{selectedSheet.nome||'Personagem'}</b><small>{myTurn?'✦ SEU TURNO':combatUi?\`Vez de \${current?.nome||'—'}\`:'Pronto para explorar'}</small></span>
    </button>
    {!combatUi&&<div className="g3-action-meters"><Meter label="❤" value={hp} max={maxHp} className="hp"/><Meter label="✦" value={vc} max={maxVc} className="vc"/></div>}`,
  'orbes no ActionBar',
);
game = replaceOnce(game, '{abilities.length?abilities.map((ability,index)=>{', '{abilities.length?abilities.slice(0,4).map((ability,index)=>{', 'limite do hotbar');
game = replaceOnce(game, "<kbd>{['Q','W','E','R'][index]||String(index+1)}</kbd>", '<kbd>{index+1}</kbd>', 'labels numéricos do hotbar');

const oldHotkeysStart = "  useEffect(()=>{\n    if(access?.role!=='player'||!combat?.active)return;\n    const abilities=listAbilities(selectedClass,selectedSheet);";
const oldHotkeysEnd = "\n\n  const createItem=useCallback(async form=>{";
const hotkeys = `  const activeTurn=Array.isArray(combatState?.initiative)?combatState.initiative[Number(combatState?.turnIdx||0)]:null;
  const isMyTurn=activeTurn?.type==='player'&&String(activeTurn?.id||'').replace(/^p_/,'')===String(selectedSheet?.id||'');

  useEffect(()=>{
    if(access?.role!=='player'||effectiveMode!=='combat'||!isMyTurn)return undefined;
    const abilities=listAbilities(selectedClass,selectedSheet).slice(0,4);
    const onKey=e=>{
      if(e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
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
  },[access?.role,effectiveMode,isMyTurn,selectedClass,selectedSheet,chooseAbility]);`;
game = replaceSection(game, oldHotkeysStart, oldHotkeysEnd, hotkeys, 'atalhos do hotbar');

game = replaceOnce(
  game,
  "    <WorldParticles type={game?.environment?.type||'none'} intensity={game?.environment?.intensity||45}/>",
  "    <WorldParticles type={game?.environment?.type||'none'} intensity={game?.environment?.intensity||45}/>\n    <CombatVitalFx ownSheetId={access?.role==='player'?String(access?.sheetId||selectedSheet?.id||''):''}/>",
  'montagem dos efeitos de HP',
);

// Inimigos não passam pelo listener de sheets; reaproveita o listener já ativo
// apenas na superfície de combate para que eles também recebam números visuais.
game = replaceOnce(
  game,
  "          if(diff!==0) pushFeedback({kind:diff>0?'heal':'damage',icon:diff>0?'✚':'✦',name:entity.nome||'Combatente',text:diff>0?'recuperou vida':'sofreu dano',value:`${diff>0?'+':''}${diff}`});",
  "          if(diff!==0){\n            pushFeedback({kind:diff>0?'heal':'damage',icon:diff>0?'✚':'✦',name:entity.nome||'Combatente',text:diff>0?'recuperou vida':'sofreu dano',value:`${diff>0?'+':''}${diff}`});\n            if(entity._kind==='enemy')window.dispatchEvent(new CustomEvent('dinastia:hp-change',{detail:{id:nowId('enemy_hp'),entityId:String(entity.id||'').replace(/^e_/,''),name:entity.nome||'Inimigo',diff,critical:diff<0&&Boolean(entity.lastDamageCritical||entity.lastHpChange?.critical||entity.lastDamage?.critical),death:Number(prev.hp)>0&&Number(entity.hp||0)<=0,ts:Date.now()}}));\n          }",
  'eventos de HP de inimigos',
);
write(gameFile, game);

// O único listener de fichas passa a comparar HP sem abrir uma segunda assinatura
// do Firestore. O evento DOM alimenta o HUD e mantém a leitura de rede única.
const kitFile = 'src/experience/ExperienceKit.generated.jsx';
let kit = read(kitFile);
kit = replaceOnce(
  kit,
  "  const lastCombatLogTsRef=useRef(0);",
  "  const lastCombatLogTsRef=useRef(0);\n  const sheetHpRef=useRef(new Map());\n  const sheetHpPrimedRef=useRef(false);",
  'refs de HP das fichas',
);
kit = replaceOnce(
  kit,
  "    unsubscribers.push(onSnapshot(collection(db,'sheets'),snap=>setSheets(snap.docs.map(d=>({id:d.id,...d.data()})))));",
  `    unsubscribers.push(onSnapshot(collection(db,'sheets'),snap=>{
      const rows=snap.docs.map(d=>({id:d.id,...d.data()}));
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
    }));`,
  'listener de HP das fichas',
);
write(kitFile, kit);

// ---------------------------------------------------------------------------
// 2 e 3 — Canal cósmico: anúncios de turno e morte, sem replay histórico.
// ---------------------------------------------------------------------------
const realtimeFile = 'src/experience/RealtimeBroadcasts.jsx';
let realtime = read(realtimeFile);
const hookStart = 'function useDurableChannel({ collectionName, kind, ttl }) {';
const hookEnd = '\n\nfunction DiceBroadcastQueue({ events }) {';
const durableHook = `function useDurableChannel({ collectionName, kind, ttl }) {
  const [events, setEvents] = useState([]);
  const seenRef = useRef(new Set());
  const primedRef = useRef(false);

  const ingest = useCallback((payload) => {
    if (!payload) return;
    const id = eventId(payload, kind);
    if (!id || seenRef.current.has(id)) return;
    seenRef.current.add(id);
    if (seenRef.current.size > 300) seenRef.current = new Set(Array.from(seenRef.current).slice(-180));
    const row = { ...payload, _rtId: id, _receivedAt: Date.now() };
    setEvents(prev => [...prev, row].sort((a,b) => Number(a._receivedAt||0)-Number(b._receivedAt||0)).slice(-40));
    window.setTimeout(() => setEvents(prev => prev.filter(item => item._rtId !== id)), ttl);
  }, [kind, ttl]);

  useEffect(() => {
    primedRef.current = false;
    const feedQuery = query(collection(db, collectionName), orderBy('ts', 'desc'), limit(20));
    return onSnapshot(feedQuery, { includeMetadataChanges:true }, snap => {
      if (!primedRef.current) {
        primedRef.current = true;
        snap.docs.forEach(d => seenRef.current.add(eventId({ _feedId:d.id, ...(d.data()||{}) }, kind)));
        return;
      }
      snap.docChanges().forEach(change => {
        if (change.type !== 'added') return;
        const payload={ _feedId:change.doc.id, ...(change.doc.data()||{}) };
        if(Date.now()-Number(payload.ts||0)>Math.min(ttl,8000))return;
        ingest(payload);
      });
    }, error => console.error('Falha no feed realtime:', collectionName, error));
  }, [collectionName, ingest, kind, ttl]);

  useEffect(()=>{
    if(kind!=='cosmic')return undefined;
    const receive=customEvent=>ingest(customEvent.detail);
    window.addEventListener('dinastia:cosmic-live',receive);
    return()=>window.removeEventListener('dinastia:cosmic-live',receive);
  },[ingest,kind]);

  return events;
}`;
realtime = replaceSection(realtime, hookStart, hookEnd, durableHook, 'hook realtime');

const cosmicStart = 'function CosmicBroadcastQueue({ events }) {';
const cosmicEnd = '\n\nexport default function RealtimeBroadcasts() {';
const cosmicQueue = `function CosmicBroadcastQueue({ events }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const queuedRef = useRef(new Set());

  useEffect(() => {
    const fresh = events.filter(e => e?._rtId && !queuedRef.current.has(e._rtId));
    if (!fresh.length) return;
    fresh.forEach(e => queuedRef.current.add(e._rtId));
    if (queuedRef.current.size > 240) queuedRef.current = new Set(Array.from(queuedRef.current).slice(-160));
    setQueue(prev => [...prev, ...fresh].sort((a,b) => Number(a.ts||0)-Number(b.ts||0)));
  }, [events]);

  useEffect(() => {
    if (current || !queue.length) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
  }, [current, queue]);

  useEffect(() => {
    if (!current) return undefined;
    const duration=current.type==='turn_announce'?2000:current.type==='death'?3500:current.soft?1900:current.type==='critical'?4200:3400;
    const timer = window.setTimeout(() => setCurrent(null), duration);
    return () => window.clearTimeout(timer);
  }, [current?._rtId]);

  if (!current) return null;
  const color = current.color || '#A855F7';
  if(current.type==='turn_announce')return (
    <div className="realtime-cosmic-event rt-turn_announce" style={{ '--event-color': color }} aria-live="assertive">
      <div className="rt-turn-letterbox top"/><div className="rt-turn-letterbox bottom"/><div className="rt-turn-flash"/>
      <div className="rt-turn-copy"><small>PR\u00D3XIMO TURNO</small><strong>{current.text||'Combatente'}</strong><span>{current.subtitle||'Aventureiro'}</span></div>
    </div>
  );
  return (
    <div className={'realtime-cosmic-event rt-'+(current.type||'message')+(current.soft?' soft':'')} style={{ '--event-color': color }} aria-live={current.type==='death'?'assertive':'polite'}>
      <div className="rt-cosmic-grid"/><div className="rt-cosmic-ring"/>
      <div className="rt-cosmic-message"><span>{current.icon||'\u2726'}</span><strong>{current.text||'O mundo foi alterado.'}</strong></div>
    </div>
  );
}`;
realtime = replaceSection(realtime, cosmicStart, cosmicEnd, cosmicQueue, 'CosmicBroadcastQueue');
write(realtimeFile, realtime);

// O componente existia apenas no portão de login; durante a sessão o canal
// cósmico precisa continuar montado para todos os clientes autenticados.
const appFile = 'src/App.generated.jsx';
let app = read(appFile);
const authShell = `        <ToastContainer/>
        <SharedDiceReplay access={access}/>`;
app = replaceOnce(app, authShell, `        <ToastContainer/>
        <RealtimeBroadcasts/>
        <SharedDiceReplay access={access}/>`, 'RealtimeBroadcasts autenticado');
write(appFile, app);

// ---------------------------------------------------------------------------
// 2 — Publicação sincronizada de turno pelos controles do Mestre.
// ---------------------------------------------------------------------------
kit = read(kitFile);
kit = replaceOnce(
  kit,
  'collection, deleteDoc, doc, limit, orderBy, query, setDoc, updateDoc,',
  'collection, deleteDoc, doc, limit, orderBy, query, serverTimestamp, setDoc, updateDoc,',
  'serverTimestamp no ExperienceKit',
);
kit = replaceOnce(
  kit,
  "    const nextLog=[...(combatState.log||[]),...entries].slice(-60);\n    await Promise.all([",
  "    const nextLog=[...(combatState.log||[]),...entries].slice(-60);\n    const turnEvent={id:'turn_'+ts+'_'+next,type:'turn_announce',icon:'\\u2694',text:current.nome||'Combatente',subtitle:current.className||current.classeName||current.classe||(current.type==='enemy'?'Inimigo':'Aventureiro'),color:current.color||'#A855F7',soft:false,ts,publishedAt:serverTimestamp()};\n    window.dispatchEvent(new CustomEvent('dinastia:cosmic-live',{detail:turnEvent}));\n    await Promise.all([",
  'payload de turno no ExperienceKit',
);
kit = replaceOnce(
  kit,
  "      setDoc(doc(db,'config','combat'),{active:true,round:newRound,currentNome:current.nome||'',currentColor:current.color||'#E8193C',currentType:current.type||'player',updatedAt:ts},{merge:true}),\n    ]);",
  "      setDoc(doc(db,'config','combat'),{active:true,round:newRound,currentNome:current.nome||'',currentColor:current.color||'#E8193C',currentType:current.type||'player',updatedAt:ts},{merge:true}),\n      setDoc(doc(db,'cosmic_events',turnEvent.id),turnEvent,{merge:true}),\n    ]);",
  'gravação do anúncio no ExperienceKit',
);
write(kitFile, kit);

const masterFile = 'src/experience/MasterBattleConsole.jsx';
let master = read(masterFile);
master = replaceOnce(
  master,
  "import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';",
  "import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';",
  'serverTimestamp no console do Mestre',
);
master = replaceOnce(
  master,
  "    status:sheet.status || {},",
  "    status:sheet.status || {},\n    classe:sheet.classe || '',\n    className:sheet.className || sheet.classeNome || sheet.classe || 'Aventureiro',",
  'classe na iniciativa de jogadores',
);
master = replaceOnce(
  master,
  "    status:enemy.status || {},",
  "    status:enemy.status || {},\n    className:enemy.className || enemy.tipo || 'Inimigo',",
  'classe na iniciativa de inimigos',
);
master = replaceOnce(
  master,
  "    const log=[...(state.log||[]),entry].slice(-60);\n    setBusy(true);",
  "    const log=[...(state.log||[]),entry].slice(-60);\n    const turnEvent={id:'turn_'+ts+'_'+safe,type:'turn_announce',icon:'\\u2694',text:target.nome||'Combatente',subtitle:target.className||target.classeName||target.classe||(target.type==='enemy'?'Inimigo':'Aventureiro'),color:target.color||'#A855F7',soft:false,ts,publishedAt:serverTimestamp()};\n    window.dispatchEvent(new CustomEvent('dinastia:cosmic-live',{detail:turnEvent}));\n    setBusy(true);",
  'payload de seleção manual de turno',
);
master = replaceOnce(
  master,
  "        setDoc(doc(db,'config','combat'),{active:true,round,currentNome:target.nome||'',currentColor:target.color||ENEMY_COLOR,currentType:target.type||'player',updatedAt:ts},{merge:true}),\n      ]);",
  "        setDoc(doc(db,'config','combat'),{active:true,round,currentNome:target.nome||'',currentColor:target.color||ENEMY_COLOR,currentType:target.type||'player',updatedAt:ts},{merge:true}),\n        setDoc(doc(db,'cosmic_events',turnEvent.id),turnEvent,{merge:true}),\n      ]);",
  'gravação da seleção manual de turno',
);
master = replaceOnce(
  master,
  "    const log=[...(state.log||[]),...entries].slice(-60);\n    setBusy(true);",
  "    const log=[...(state.log||[]),...entries].slice(-60);\n    const turnEvent={id:'turn_'+ts+'_'+next,type:'turn_announce',icon:'\\u2694',text:target.nome||'Combatente',subtitle:target.className||target.classeName||target.classe||(target.type==='enemy'?'Inimigo':'Aventureiro'),color:target.color||'#A855F7',soft:false,ts,publishedAt:serverTimestamp()};\n    window.dispatchEvent(new CustomEvent('dinastia:cosmic-live',{detail:turnEvent}));\n    setBusy(true);",
  'payload de próximo turno no console do Mestre',
);
master = replaceOnce(
  master,
  "        setDoc(doc(db,'config','combat'),{active:true,round:newRound,currentNome:target.nome||'',currentColor:target.color||ENEMY_COLOR,currentType:target.type||'player',updatedAt:ts},{merge:true}),\n      ]);",
  "        setDoc(doc(db,'config','combat'),{active:true,round:newRound,currentNome:target.nome||'',currentColor:target.color||ENEMY_COLOR,currentType:target.type||'player',updatedAt:ts},{merge:true}),\n        setDoc(doc(db,'cosmic_events',turnEvent.id),turnEvent,{merge:true}),\n      ]);",
  'gravação do próximo turno no console do Mestre',
);
write(masterFile, master);

// O modo de combate legado ainda pode avançar turnos pela tela de fichas. Ele
// publica o mesmo contrato para não criar uma rota silenciosa fora do HUD novo.
const legacyCombatFile = 'src/features/sheets/CombatMode.jsx';
let legacyCombat = read(legacyCombatFile);
legacyCombat = replaceOnce(
  legacyCombat,
  'import { doc,setDoc,updateDoc } from "firebase/firestore";',
  'import { doc,serverTimestamp,setDoc,updateDoc } from "firebase/firestore";',
  'serverTimestamp no combate legado',
);
legacyCombat = replaceOnce(
  legacyCombat,
  "    status: s.status || {},",
  "    status: s.status || {},\n    classe: s.classe || '',\n    className: s.className || s.classeNome || s.classe || 'Aventureiro',",
  'classe do jogador no combate legado',
);
legacyCombat = replaceOnce(
  legacyCombat,
  "    status: e.status || {},",
  "    status: e.status || {},\n    className: e.className || e.tipo || 'Inimigo',",
  'classe do inimigo no combate legado',
);
const legacyNextTurn = `  const nextTurn = async () => {
    if(!initiative.length||rolling)return;
    setPreparedAction('');
    const next=(turnIdx+1)%initiative.length;
    const newRound=next===0?round+1:round;
    let syncedInit=initiative,automation=null;
    if(next===0){
      try{
        automation=await applyRoundAutomation({initiative,round:newRound,combatKey:String(log?.[0]?.ts||'combat')});
        if(automation?.effects?.length){
          const hp=new Map(automation.effects.filter(x=>x.damage>0).map(x=>[String(x.combatantId),Number(x.hpAfter)]));
          syncedInit=initiative.map(c=>hp.has(String(c.id))?{...c,hp:hp.get(String(c.id))}:c);
          setInitiative(syncedInit);
        }
        if(automation?.applied)pushToast('Rodada '+newRound+': cooldowns \\u22121 e +2 Vigor C\\u00F3smico','\\u2726','#A855F7');
      }catch(error){console.error('Falha ao automatizar a rodada:',error);}
    }
    if(next===0)setRound(newRound);
    setTurnIdx(next);
    const combatant=syncedInit[next]||{};
    const ts=Date.now();
    let newLog=addLog('Vez de '+(combatant.nome||'combatente')+(next===0?' \\u2014 Rodada '+newRound+' come\\u00E7a!':''),combatant.color||'#C8B8A0','\\u25B6');
    if(next===0&&automation?.applied){
      newLog=[...newLog,{msg:'\\u2726 Cooldowns \\u22121 \\u00B7 +2 VC \\u00B7 status processados',color:'#A855F7',icon:'\\u2726',ts,round:newRound}].slice(-60);
      setLog(newLog);
    }
    const turnEvent={id:'turn_'+ts+'_'+next,type:'turn_announce',icon:'\\u2694',text:combatant.nome||'Combatente',subtitle:combatant.className||combatant.classeName||combatant.classe||(combatant.type==='enemy'?'Inimigo':'Aventureiro'),color:combatant.color||'#A855F7',soft:false,ts,publishedAt:serverTimestamp()};
    window.dispatchEvent(new CustomEvent('dinastia:cosmic-live',{detail:turnEvent}));
    try{
      await Promise.all([
        setDoc(doc(db,'config','combat'),{active:true,round:newRound,currentNome:combatant.nome||'',currentColor:combatant.color||'#E8193C',currentType:combatant.type||'player',updatedAt:ts},{merge:true}),
        setDoc(doc(db,'cosmic_events',turnEvent.id),turnEvent,{merge:true}),
      ]);
    }catch(_){}
    await persist(syncedInit,newRound,next,newLog);
  };`;
legacyCombat = replaceSection(legacyCombat, '  const nextTurn = async () => {', '\n\n  const triggerOpportunityAttack', legacyNextTurn, 'nextTurn do combate legado');
write(legacyCombatFile, legacyCombat);

// ---------------------------------------------------------------------------
// 5, 7 e 8 — CSS do HUD final.
// ---------------------------------------------------------------------------
const gameCssFile = 'src/experience/game-experience-3.css';
let gameCss = read(gameCssFile);
const gameCssBlock = `/* CINEMATIC COMBAT VITALS 2026-09-22 */
.g3-feedback-stack{right:78px!important;top:210px!important}
.g3-floating-damage{position:fixed;z-index:var(--g3-z-cinematic,900);pointer-events:none;transform:translate(-50%,-50%);font:900 25px/1 'Cinzel Decorative','Cinzel',serif;color:#E8193C;text-shadow:0 2px 3px #000,0 0 14px color-mix(in srgb,currentColor 62%,transparent);animation:floatDmg 1.2s cubic-bezier(.18,.72,.2,1) forwards;will-change:transform,opacity}
.g3-floating-damage.heal{color:#4ADE80}.g3-floating-damage.critical{color:#FFD700;font-size:35px;filter:drop-shadow(0 0 8px rgba(255,215,0,.65))}
@keyframes floatDmg{0%{opacity:0;transform:translate(-50%,-20%) scale(.72)}16%{opacity:1;transform:translate(-50%,-55%) scale(1.08)}72%{opacity:1}100%{opacity:0;transform:translate(-50%,-150%) scale(.94)}}
.g3-player-fallen .adventure-shell{animation:g3DeathGrayscale 3s ease both}
@keyframes g3DeathGrayscale{0%{filter:grayscale(0)}18%,76%{filter:grayscale(1)}100%{filter:grayscale(0)}}

.g3-actionbar.combat{grid-template-columns:minmax(220px,260px) minmax(260px,1fr) auto!important}
.g3-actionbar.combat .g3-action-character{display:grid;grid-template-columns:42px 48px 42px minmax(0,1fr);gap:6px;align-items:center;min-width:0;padding:4px 8px}
.g3-resource-orb{position:relative;width:42px;height:54px;display:grid;place-items:center;flex:0 0 auto;color:#f6edf7;filter:drop-shadow(0 5px 8px rgba(0,0,0,.52));isolation:isolate}
.g3-resource-orb svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.g3-orb-shell{fill:#05030a;stroke:color-mix(in srgb,var(--orb-color) 70%,#d7c9dc);stroke-width:2;filter:drop-shadow(0 0 5px color-mix(in srgb,var(--orb-color) 33%,transparent))}.g3-orb-depth{fill:#08050d;stroke:rgba(255,255,255,.1);stroke-width:1}.g3-orb-liquid,.g3-orb-wave{fill:var(--orb-color)}.g3-orb-liquid{transition:y .42s cubic-bezier(.2,.8,.2,1),height .42s cubic-bezier(.2,.8,.2,1);opacity:.88}.g3-orb-wave{opacity:.82;animation:orbWave 2.2s linear infinite;transform-box:fill-box;transform-origin:center}.g3-orb-glint{fill:rgba(255,255,255,.21);transform:rotate(-24deg);transform-origin:30px 30px}.g3-resource-orb b{position:relative;z-index:2;margin-top:4px;font:800 9px/1 'Cinzel',serif;text-shadow:0 1px 4px #000}.g3-resource-orb small{position:absolute;z-index:2;left:50%;bottom:1px;transform:translateX(-50%);font:800 5px/1 'Cinzel',serif;letter-spacing:.08em;color:#d9cadf;text-shadow:0 1px 3px #000}.g3-resource-orb.vc{--orb-color:#a855f7}
@keyframes orbWave{0%{transform:translateX(-10px)}50%{transform:translateX(0)}100%{transform:translateX(-10px)}}

.g3-portrait-lg,.g3-portrait-xl{position:relative;overflow:visible!important;isolation:isolate}.g3-portrait-lg>img,.g3-portrait-lg>b,.g3-portrait-xl>img,.g3-portrait-xl>b{position:relative;z-index:1}.g3-portrait-lg[data-classe]::before,.g3-portrait-xl[data-classe]::before{content:'';position:absolute;inset:-7px;z-index:2;pointer-events:none;background-color:var(--g3-c);background-image:var(--g3-ornament-image);background-blend-mode:multiply;background-position:center;background-repeat:no-repeat;background-size:100% 100%;-webkit-mask-image:var(--g3-ornament-image);mask-image:var(--g3-ornament-image);-webkit-mask-position:center;mask-position:center;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-size:100% 100%;mask-size:100% 100%;filter:drop-shadow(0 0 5px color-mix(in srgb,var(--g3-c) 52%,transparent))}.g3-portrait-lg[data-classe]::after,.g3-portrait-xl[data-classe]::after{content:'';position:absolute;inset:-3px;z-index:0;border:1px solid color-mix(in srgb,var(--g3-c) 62%,transparent);border-radius:30% 30% 42% 42%;box-shadow:inset 0 0 8px color-mix(in srgb,var(--g3-c) 18%,transparent),0 0 10px color-mix(in srgb,var(--g3-c) 14%,transparent);pointer-events:none}
.g3-portrait[data-classe="fogo" i]{--g3-ornament-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='none' stroke='%23fff' stroke-width='4' stroke-linecap='round'%3E%3Cpath d='M18 78C5 57 20 46 16 27c15 8 18 19 16 31M82 78c13-21-2-32 2-51-15 8-18 19-16 31M29 14c5 9 12 11 21 5 9 6 16 4 21-5'/%3E%3Cpath d='M31 88l19 7 19-7'/%3E%3C/g%3E%3C/svg%3E")}
.g3-portrait[data-classe="escarlate" i]{--g3-ornament-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='none' stroke='%23fff' stroke-width='3'%3E%3Cpath d='M19 18C9 33 8 42 19 47c11-5 10-14 0-29zM81 18c-10 15-11 24 0 29 11-5 10-14 0-29z'/%3E%3Cpath d='M22 76c8 12 17 18 28 19 11-1 20-7 28-19M28 10h44'/%3E%3C/g%3E%3C/svg%3E")}
.g3-portrait[data-classe="corvos" i]{--g3-ornament-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='none' stroke='%23fff' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='M11 68c13-5 22-17 25-36-14 8-21 21-25 36zm78 0c-13-5-22-17-25-36 14 8 21 21 25 36z'/%3E%3Cpath d='M18 59l15-9M82 59l-15-9M30 89l20 7 20-7'/%3E%3C/g%3E%3C/svg%3E")}
.g3-portrait[data-classe="magos" i]{--g3-ornament-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='none' stroke='%23fff' stroke-width='3'%3E%3Cpath d='M50 4l4 10 11 1-9 7 3 11-9-6-9 6 3-11-9-7 11-1zM15 45l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1zM85 45l3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z'/%3E%3Cpath d='M28 88c14 8 30 8 44 0'/%3E%3C/g%3E%3C/svg%3E")}
.g3-portrait[data-classe="marfim" i]{--g3-ornament-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cg fill='none' stroke='%23fff' stroke-width='3'%3E%3Cpath d='M50 3l10 14-10 12-10-12zM12 35l11-9 9 13-12 11zM88 35l-11-9-9 13 12 11zM25 87l10-13 15 21 15-21 10 13'/%3E%3Cpath d='M18 56l5 19M82 56l-5 19'/%3E%3C/g%3E%3C/svg%3E")}

@media(max-width:900px){.g3-feedback-stack{right:8px!important;top:auto!important;bottom:160px!important}.g3-actionbar.combat{grid-template-columns:118px minmax(0,1fr) 28px!important}.g3-actionbar.combat .g3-action-character{grid-template-columns:30px 36px 30px!important;gap:2px!important;padding:3px!important}.g3-actionbar.combat .g3-action-character>span:last-child{display:none!important}.g3-resource-orb{width:30px;height:39px}.g3-resource-orb b{font-size:7px}.g3-resource-orb small{font-size:4px}.g3-hotbar{min-width:0}}
@media(prefers-reduced-motion:reduce){.g3-floating-damage,.g3-orb-wave,.g3-player-fallen .adventure-shell{animation-duration:.01ms!important;animation-iteration-count:1!important}}
`;
gameCss = appendOnce(gameCss, 'CINEMATIC COMBAT VITALS 2026-09-22', gameCssBlock);
write(gameCssFile, gameCss);

// ---------------------------------------------------------------------------
// 2 e 3 — CSS cinematográfico do canal realtime.
// ---------------------------------------------------------------------------
const realtimeCssFile = 'src/experience/realtime.css';
let realtimeCss = read(realtimeCssFile);
const realtimeCssBlock = `/* TURN + DEATH CINEMATICS 2026-09-22 */
.realtime-cosmic-event.rt-turn_announce{z-index:var(--g3-z-cinematic,900);display:block;background:transparent;animation:turnAnnounce 2s cubic-bezier(.2,.8,.2,1) forwards}.rt-turn-letterbox{position:absolute;left:0;right:0;height:clamp(58px,10vh,108px);background:#000;box-shadow:0 0 24px rgba(0,0,0,.9)}.rt-turn-letterbox.top{top:0}.rt-turn-letterbox.bottom{bottom:0}.rt-turn-flash{position:absolute;inset:36% 0;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--event-color) 34%,transparent),transparent);filter:blur(12px);animation:rtTurnFlash 2s ease both}.rt-turn-copy{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(860px,88vw);padding:17px 26px;text-align:center;border-block:1px solid color-mix(in srgb,var(--event-color) 50%,transparent);background:linear-gradient(90deg,transparent,rgba(1,2,7,.88) 18%,rgba(1,2,7,.88) 82%,transparent);box-shadow:0 0 34px color-mix(in srgb,var(--event-color) 16%,transparent)}.rt-turn-copy small,.rt-turn-copy span{display:block;font:700 8px/1 'Cinzel',serif;letter-spacing:.34em;color:color-mix(in srgb,var(--event-color) 72%,#ddd)}.rt-turn-copy strong{display:block;margin:8px 0 7px;font:800 clamp(24px,3.2vw,32px)/1 'Cinzel Decorative','Cinzel',serif;letter-spacing:.06em;color:#f3eaf3;text-shadow:0 0 20px color-mix(in srgb,var(--event-color) 52%,transparent)}
.realtime-cosmic-event.rt-death{z-index:var(--g3-z-cinematic,900);background:radial-gradient(circle at center,rgba(232,25,60,.27),rgba(38,2,9,.72) 38%,rgba(1,2,7,.95) 100%);animation:rtDeath 3.5s cubic-bezier(.2,.8,.2,1) forwards}.realtime-cosmic-event.rt-death .rt-cosmic-ring{border-color:#E8193C;box-shadow:0 0 78px rgba(232,25,60,.36),inset 0 0 42px rgba(232,25,60,.2)}.realtime-cosmic-event.rt-death .rt-cosmic-message strong{font-family:'Cinzel Decorative','Cinzel',serif;font-size:clamp(15px,2vw,26px);color:#f2d8dc}.realtime-cosmic-event.rt-death .rt-cosmic-message span{color:#E8193C}
@keyframes turnAnnounce{0%{opacity:0;clip-path:inset(49% 0)}12%{opacity:1;clip-path:inset(0)}76%{opacity:1}100%{opacity:0;clip-path:inset(49% 0)}}@keyframes rtTurnFlash{0%,100%{opacity:0;transform:scaleX(.2)}18%{opacity:1;transform:scaleX(1)}60%{opacity:.42}}@keyframes rtDeath{0%{opacity:0}12%,72%{opacity:1}100%{opacity:0}}
@media(max-width:600px){.rt-turn-letterbox{height:54px}.rt-turn-copy{padding:13px 12px}.rt-turn-copy strong{font-size:20px}}
@media(prefers-reduced-motion:reduce){.realtime-cosmic-event.rt-turn_announce,.rt-turn-flash,.realtime-cosmic-event.rt-death{animation-duration:.01ms!important;animation-iteration-count:1!important}}
`;
realtimeCss = appendOnce(realtimeCss, 'TURN + DEATH CINEMATICS 2026-09-22', realtimeCssBlock);
write(realtimeCssFile, realtimeCss);

// ---------------------------------------------------------------------------
// 6 — Blur apenas no card de sessão; demais painéis seguem leves.
// ---------------------------------------------------------------------------
const polishFile = 'src/experience/site-polish.css';
let polish = read(polishFile);
const polishStart = '/* Superfícies: profundidade por contraste/borda, não por blur de GPU. */';
const polishEnd = '\n\n/* Evita transition:all inline em botões, que pode animar propriedades de layout. */';
const polishedSurfaces = `/* Superfícies: blur seletivo apenas no card principal da sessão. */
.chronicles-panel,.enemy-sheet-panel,.access-panel,.floating-sheet,.journal-drawer,.master-battle-console{
  -webkit-backdrop-filter:none!important;
  backdrop-filter:none!important;
  box-shadow:0 16px 42px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.018)!important;
}
.session-card{
  -webkit-backdrop-filter:blur(8px)!important;
  backdrop-filter:blur(8px)!important;
  box-shadow:0 16px 42px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.018)!important;
  border-color:rgba(190,155,226,.075)!important;
  background:linear-gradient(145deg,rgba(10,7,20,.88),rgba(5,3,12,.90))!important;
}`;
polish = replaceSection(polish, polishStart, polishEnd, polishedSurfaces, 'superfícies do site-polish');
write(polishFile, polish);

for (const [file, markers] of [
  [gameFile, ['ReactDOM.createPortal','function HpOrb','function VcOrb','dinastia:hp-change','<kbd>{index+1}</kbd>']],
  [kitFile, ["onSnapshot(collection(db,'sheets')", "type:'turn_announce'", "publishedAt:serverTimestamp()"]],
  [realtimeFile, ["current.type==='death'?3500", 'rt-turn_announce', 'dinastia:cosmic-live']],
  [masterFile, ["type:'turn_announce'", "setDoc(doc(db,'cosmic_events'"]],
  [legacyCombatFile, ["type:'turn_announce'", "publishedAt:serverTimestamp()"]],
  [gameCssFile, ['@keyframes floatDmg','@keyframes orbWave','data-classe="fogo"','bottom:160px!important']],
  [realtimeCssFile, ['@keyframes turnAnnounce','.realtime-cosmic-event.rt-death']],
  [polishFile, ['backdrop-filter:blur(8px)!important']],
]) {
  const value=read(file);
  markers.forEach(marker=>must(value.includes(marker), `${marker} ausente em ${file}`));
}

console.log('Cinematic combat/vitals final patch applied.');
