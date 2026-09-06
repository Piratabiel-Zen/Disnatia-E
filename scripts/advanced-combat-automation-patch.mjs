import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (rel, value) => fs.writeFileSync(path.join(root, rel), value);

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Advanced combat patch falhou: ${label}`);
  return source.replace(before, after);
}

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Advanced combat patch falhou: início ausente em ${label}`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`Advanced combat patch falhou: fim ausente em ${label}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

// ── 1) MOBILE: MAPA DE BATALHA NÃO É CARREGADO NEM ACESSÍVEL ────────────────
const appFile = 'src/App.generated.jsx';
let app = read(appFile);
app = replaceRequired(
  app,
  `  const navigate = id => {\n    prefetch(id);\n    setTab(id);\n  };`,
  `  const mobileBattleMapBlocked = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;\n\n  const navigate = id => {\n    if (id === 'mapabatalha' && mobileBattleMapBlocked()) return;\n    prefetch(id);\n    setTab(id);\n  };\n\n  useEffect(() => {\n    const protectMobile = () => {\n      if (mobileBattleMapBlocked() && tab === 'mapabatalha') setTab('session');\n    };\n    protectMobile();\n    window.addEventListener('resize', protectMobile);\n    return () => window.removeEventListener('resize', protectMobile);\n  }, [tab]);`,
  'bloqueio real do mapa de batalha no mobile'
);
write(appFile, app);

// ── 2) EXPERIENCE KIT: TURNO GLOBAL, AUTOMAÇÃO DE RODADA E INVOCAÇÕES ───────
const expFile = 'src/experience/ExperienceKit.generated.jsx';
let exp = read(expFile);
exp = replaceRequired(
  exp,
  `import { db } from '../core/firebase';`,
  `import { db } from '../core/firebase';\nimport { applyRoundAutomation } from './combatRoundEngine';`,
  'import do motor de rodada'
);

const nextTurnStart = '  const nextTurn=useCallback(async()=>{';
const nextTurnEnd = '\n\n  const endCombat=useCallback';
const automatedNextTurn = `  const nextTurn=useCallback(async()=>{\n    const init=Array.isArray(combatState.initiative)?combatState.initiative:[];\n    if(!init.length) return;\n    const currentIdx=Number(combatState.turnIdx||0);\n    const next=(currentIdx+1)%init.length;\n    const newRound=next===0?Number(combatState.round||1)+1:Number(combatState.round||1);\n    const combatKey=String(combat?.startedAt||combatState?.log?.[0]?.ts||'combat');\n    let syncedInit=init;\n    let automation=null;\n    if(next===0){\n      try{\n        automation=await applyRoundAutomation({initiative:init,round:newRound,combatKey});\n        if(automation?.effects?.length){\n          const hpById=new Map(automation.effects.filter(e=>e.damage>0).map(e=>[String(e.combatantId),Number(e.hpAfter)]));\n          syncedInit=init.map(c=>hpById.has(String(c.id))?{...c,hp:hpById.get(String(c.id))}:c);\n        }\n      }catch(error){console.error('Falha na automação de rodada:',error);}\n    }\n    const target=syncedInit[next]||{};\n    const ts=Date.now();\n    const entries=[];\n    if(next===0&&automation?.applied){\n      const damaged=(automation.effects||[]).filter(e=>e.damage>0);\n      entries.push({msg:\`✦ Rodada ${'${newRound}'}: cooldowns −1, +2 VC para os combatentes${'${damaged.length?` · ${damaged.length} sofreram dano de status`:``}'}\`,color:'#A855F7',icon:'✦',ts:ts-1,round:newRound});\n    }\n    entries.push({msg:\`Vez de ${'${target.nome||\'combatente\'}'}${'${next===0?` — Rodada ${newRound} começa!`:``}'}\`,color:target.color||'#C8B8A0',icon:'▶',ts,round:newRound});\n    const nextLog=[...(combatState.log||[]),...entries].slice(-60);\n    await Promise.all([\n      setDoc(doc(db,'config','combat_state'),{initiative:syncedInit,turnIdx:next,round:newRound,log:nextLog},{merge:true}),\n      setDoc(doc(db,'config','combat'),{active:true,round:newRound,currentNome:target.nome||'',currentColor:target.color||'#E8193C',currentType:target.type||'player',updatedAt:ts},{merge:true}),\n    ]);\n  },[combatState,combat]);\n\n  const reorderInitiative=useCallback(async(fromIndex,toIndex)=>{\n    const list=Array.isArray(combatState.initiative)?[...combatState.initiative]:[];\n    if(!list.length||fromIndex===toIndex||fromIndex<0||toIndex<0||fromIndex>=list.length||toIndex>=list.length)return;\n    const currentId=String(list[Number(combatState.turnIdx||0)]?.id||'');\n    const [moved]=list.splice(fromIndex,1);\n    list.splice(toIndex,0,moved);\n    const nextIdx=Math.max(0,list.findIndex(c=>String(c.id)===currentId));\n    const current=list[nextIdx]||{};\n    const ts=Date.now();\n    await Promise.all([\n      setDoc(doc(db,'config','combat_state'),{initiative:list,turnIdx:nextIdx,round:Number(combatState.round||1)},{merge:true}),\n      setDoc(doc(db,'config','combat'),{active:true,round:Number(combatState.round||1),currentNome:current.nome||'',currentColor:current.color||'#E8193C',currentType:current.type||'player',updatedAt:ts},{merge:true}),\n    ]);\n  },[combatState]);`;
exp = replaceBetween(exp, nextTurnStart, nextTurnEnd, automatedNextTurn, 'nextTurn automatizado');

// Nova ação específica de invocação: usa a habilidade normal para custo/cooldown
// e materializa a memória configurada pelo Mestre no estado realtime do combate.
const valueMarker = '\n\n  const value=useMemo(()=>({';
const valuePos = exp.indexOf(valueMarker);
if (valuePos < 0) throw new Error('Advanced combat patch falhou: value do ExperienceProvider ausente.');
const summonCallback = `\n\n  const useSummonAbility=useCallback(async(ability,summon)=>{\n    if(!selectedSheet||!summon||!combat?.active)return false;\n    const label=String(ability?.name||ability?.nome||'').toLowerCase();\n    const threat=String(summon?.ameaca||'Baixa').toLowerCase();\n    const animateDead=label.includes('animar os mortos');\n    const summonLords=label.includes('invocação dos lordes')||label.includes('invocacao dos lordes');\n    if(!animateDead&&!summonLords)return false;\n    if(animateDead&&!['baixa','média','media'].includes(threat))return false;\n    if(summonLords&&!['alta','extrema','extremo'].includes(threat))return false;\n\n    const init=Array.isArray(combatState.initiative)?[...combatState.initiative]:[];\n    const activeOwned=init.filter(c=>c.type==='summon'&&String(c.ownerSheetId||'')===String(selectedSheet.id));\n    if(activeOwned.length>=2)return false;\n\n    const used=await useQuickAbility(ability);\n    if(!used)return false;\n\n    const now=Date.now();\n    const summonId=\`summon_${'${selectedSheet.id}'}_${'${now}'}_${'${Math.random().toString(36).slice(2,7)}'}\`;\n    const baseHp=Math.max(1,Number(summon.hp||10)+Math.max(0,Number(summon.hp_bonus||0)));\n    const maxHp=Math.max(1,Math.floor(baseHp*.5));\n    const attrScale=animateDead?.5:1;\n    const scaled=k=>Math.floor(Number(summon?.[k]||0)*attrScale);\n    const combatant={\n      id:\`s_${'${summonId}'}\`,type:'summon',ownerSheetId:String(selectedSheet.id),summonMemoryId:String(summon.id||''),\n      nome:summon.nome||'Invocação',foto:summon.foto||'',color:selectedClass?.color||'#6E6E80',\n      threat:summon.ameaca||'Baixa',hp:maxHp,maxHp,roll:0,status:{},\n      forca:scaled('forca'),agilidade:scaled('agilidade'),durabilidade:scaled('durabilidade'),\n      inteligencia:scaled('inteligencia'),percepcao:scaled('percepcao'),sorte:scaled('sorte'),\n      ataques:Array.isArray(summon.ataques)?summon.ataques:[],\n    };\n    const ownerIdx=init.findIndex(c=>c.type==='player'&&String(c.id||'').replace(/^p_/,'')===String(selectedSheet.id));\n    const insertAt=ownerIdx>=0?ownerIdx+1:init.length;\n    const currentId=String(init[Number(combatState.turnIdx||0)]?.id||'');\n    init.splice(insertAt,0,combatant);\n    const nextTurnIdx=Math.max(0,init.findIndex(c=>String(c.id)===currentId));\n    const logEntry={msg:\`${'${selectedSheet.nome||\'Necromante\'}'} invocou ${'${combatant.nome}'} · Ameaça ${'${combatant.threat}'}\`,color:selectedClass?.color||'#6E6E80',icon:'💀',ts:now,round:Number(combatState.round||1)};\n    const nextLog=[...(combatState.log||[]),logEntry].slice(-60);\n    const event={id:nowId('summon'),type:'ability',text:\`${'${combatant.nome}'} foi invocado\`,ts:now,color:selectedClass?.color||'#6E6E80',icon:'💀',soft:true,source:'summon',sheetId:String(selectedSheet.id)};\n    await Promise.all([\n      setDoc(doc(db,'combat_summons',summonId),{...combatant,active:true,createdAt:now,round:Number(combatState.round||1)}),\n      setDoc(doc(db,'config','combat_state'),{initiative:init,turnIdx:nextTurnIdx,log:nextLog},{merge:true}),\n      setDoc(doc(db,'config','cosmic_event'),event),\n      setDoc(doc(db,'cosmic_events',event.id),event),\n    ]);\n    return true;\n  },[selectedSheet,selectedClass,combat,combatState,useQuickAbility]);`;
exp = exp.slice(0, valuePos) + summonCallback + exp.slice(valuePos);

// Exposição das novas ações no contexto.
exp = replaceRequired(
  exp,
  'triggerCosmicEvent,setActiveMap,nextTurn,endCombat,addJournal,addAtlasDiscovery,useQuickAbility,',
  'triggerCosmicEvent,setActiveMap,nextTurn,reorderInitiative,endCombat,addJournal,addAtlasDiscovery,useQuickAbility,useSummonAbility,',
  'ações novas no value do contexto'
);
exp = replaceRequired(
  exp,
  'setAtmosphere,setSoundscape,applySoundscapePreset,triggerCosmicEvent,setActiveMap,nextTurn,endCombat,',
  'setAtmosphere,setSoundscape,applySoundscapePreset,triggerCosmicEvent,setActiveMap,nextTurn,reorderInitiative,endCombat,',
  'reorder nas dependências do contexto'
);
exp = replaceRequired(
  exp,
  'addJournal,addAtlasDiscovery,useQuickAbility,\n  ]);',
  'addJournal,addAtlasDiscovery,useQuickAbility,useSummonAbility,\n  ]);',
  'useSummonAbility nas dependências do contexto'
);

// HUD: seleção de memória de invocação antes de gastar a habilidade.
exp = exp.replace(
  /const \{ masterMode,combat,combatState,selectedSheet,selectedClass,customAbilities,useQuickAbility \}=useExperience\(\);/,
  `const { masterMode,combat,combatState,selectedSheet,selectedClass,customAbilities,useQuickAbility,useSummonAbility }=useExperience();`
);
exp = replaceRequired(
  exp,
  '  const [expanded,setExpanded]=useState(false);\n  const abilityRailRef=useRef(null);',
  '  const [expanded,setExpanded]=useState(false);\n  const [pendingSummonAbility,setPendingSummonAbility]=useState(null);\n  const abilityRailRef=useRef(null);',
  'estado do seletor de invocação'
);
exp = replaceRequired(
  exp,
  "  const isMyTurn=current?.type==='player' && String(current?.id||'').replace(/^p_/,'')===String(selectedSheet.id);",
  "  const isMyTurn=current?.type==='player' && String(current?.id||'').replace(/^p_/,'')===String(selectedSheet.id);\n  const summonSkillKind=a=>{const n=String(a?.name||a?.nome||'').toLowerCase();return n.includes('animar os mortos')?'low':(n.includes('invocação dos lordes')||n.includes('invocacao dos lordes'))?'high':'';};\n  const summonMemories=Array.isArray(selectedSheet.invocacoes)?selectedSheet.invocacoes:[];\n  const pendingKind=summonSkillKind(pendingSummonAbility);\n  const summonChoices=summonMemories.filter(s=>{const t=String(s?.ameaca||'Baixa').toLowerCase();return pendingKind==='low'?['baixa','média','media'].includes(t):pendingKind==='high'?['alta','extrema','extremo'].includes(t):false;});",
  'memórias compatíveis no HUD'
);
if (!exp.includes('setPendingSummonAbility(a)')) {
  const abilityClick = 'onClick={()=>useQuickAbility(a)}';
  if (!exp.includes(abilityClick)) throw new Error('Advanced combat patch falhou: clique de habilidade do HUD não encontrado.');
  exp = exp.replace(abilityClick, "onClick={()=>{if(summonSkillKind(a))setPendingSummonAbility(a);else useQuickAbility(a)}}");
}

const hudActionsBefore = `    <div className="hud-actions"><button onClick={()=>onNavigate('fichas')}>📋</button><button onClick={()=>onNavigate('mapabatalha')}>🗡️</button></div>\n  </div>;`;
const hudActionsAfter = `    <div className="hud-actions"><button onClick={()=>onNavigate('fichas')}>📋</button><button className="hud-map-action" onClick={()=>onNavigate('mapabatalha')}>🗡️</button></div>\n    {pendingSummonAbility&&<div className="summon-memory-popover" onClick={e=>e.stopPropagation()}>\n      <header><div><small>MEMÓRIA DAS CINZAS</small><b>{pendingSummonAbility.name||pendingSummonAbility.nome}</b></div><button onClick={()=>setPendingSummonAbility(null)}>✕</button></header>\n      <p>{pendingKind==='low'?'Escolha uma invocação de ameaça Baixa ou Média.':'Escolha uma invocação de ameaça Alta ou Extrema.'}</p>\n      <div className="summon-memory-options">{summonChoices.length?summonChoices.map(s=><button key={String(s.id)} onClick={async()=>{const ok=await useSummonAbility(pendingSummonAbility,s);if(ok)setPendingSummonAbility(null);}}><span>💀</span><div><b>{s.nome||'Invocação sem nome'}</b><small>Ameaça {s.ameaca||'Baixa'}</small></div></button>):<em>Nenhuma memória compatível foi preparada pelo Mestre.</em>}</div>\n    </div>}\n  </div>;`;
exp = replaceRequired(exp, hudActionsBefore, hudActionsAfter, 'popup de invocação no HUD');

// Turno/rodada passam a ficar visíveis em qualquer página enquanto o combate estiver ativo.
exp = replaceRequired(
  exp,
  "  if(!combat?.active||tab!=='mapabatalha'||!combatState?.initiative?.length) return null;",
  "  if(!combat?.active||!combatState?.initiative?.length) return null;",
  'TurnRibbon global'
);
exp = replaceRequired(
  exp,
  `  return <div className="turn-ribbon"><div className="turn-round">RODADA <b>{combatState.round||1}</b></div><div className="turn-list">`,
  `  return <div className="turn-ribbon global-turn-ribbon"><div className="turn-round">RODADA <b>{combatState.round||1}</b></div><div className="turn-current-name"><small>AGORA</small><b>{list[idx]?.nome||'—'}</b></div><div className="turn-list">`,
  'nome do combatente atual no topo'
);

// Feedback visual de dano por Envenenado/Sangrando para a ficha autenticada.
const turnRibbonMarker = '\nfunction TurnRibbon(){';
const trPos = exp.indexOf(turnRibbonMarker);
if (trPos < 0) throw new Error('Advanced combat patch falhou: TurnRibbon ausente para efeito de status.');
if (!exp.includes('function CombatStatusDamageFx(){')) {
  const statusFx = `\nfunction CombatStatusDamageFx(){\n  const { selectedSheet }=useExperience();\n  const [event,setEvent]=useState(null);\n  const primedRef=useRef(false);\n  const seenRef=useRef(new Set());\n  useEffect(()=>{\n    if(!selectedSheet?.id)return;\n    primedRef.current=false;seenRef.current=new Set();\n    const q=query(collection(db,'combat_effect_events'),orderBy('ts','desc'),limit(20));\n    const unsub=onSnapshot(q,snap=>{\n      if(!primedRef.current){primedRef.current=true;snap.docs.forEach(d=>seenRef.current.add(d.id));return;}\n      snap.docChanges().forEach(change=>{\n        if(change.type==='removed'||seenRef.current.has(change.doc.id))return;\n        seenRef.current.add(change.doc.id);\n        const row=change.doc.data()||{};\n        if(String(row.sheetId||'')!==String(selectedSheet.id)||Number(row.damage||0)<=0)return;\n        setEvent({...row,_id:change.doc.id});\n      });\n    },()=>{});\n    return()=>unsub();\n  },[selectedSheet?.id]);\n  useEffect(()=>{if(!event)return;const t=setTimeout(()=>setEvent(null),2200);return()=>clearTimeout(t);},[event?._id]);\n  if(!event)return null;\n  return <div className="combat-status-damage-fx" key={event._id}><div><strong>−1 HP</strong><span>{event.reason||'Efeito negativo'}</span><small>O status causou dano no início da nova rodada.</small></div></div>;\n}\n`;
  exp = exp.slice(0, trPos) + statusFx + exp.slice(trPos);
}
exp = replaceRequired(exp, '    <TurnRibbon/>\n    <CombatHud', '    <TurnRibbon/>\n    <CombatStatusDamageFx/>\n    <CombatHud', 'efeito de dano na ExperienceLayer');

// Mestre pode reorganizar a iniciativa também pelo console global.
exp = replaceRequired(
  exp,
  'masterMode,session,startSession,endSession,updateSession,combat,combatState,nextTurn,endCombat,maps,activeMap,setActiveMap,',
  'masterMode,session,startSession,endSession,updateSession,combat,combatState,nextTurn,reorderInitiative,endCombat,maps,activeMap,setActiveMap,',
  'reorder no MasterConsole'
);
const masterMapLabel = `<label>Mapa ativo<select value={activeMap?.activeId||''} onChange={e=>setActiveMap(e.target.value)}><option value="">Nenhum mapa</option>{maps.map(m=><option key={m.id} value={m.id}>{m.nome||m.name||\`Mapa ${'${m.id}'}\`}</option>)}</select></label><div className="master-row">`;
const masterOrder = `<label>Mapa ativo<select value={activeMap?.activeId||''} onChange={e=>setActiveMap(e.target.value)}><option value="">Nenhum mapa</option>{maps.map(m=><option key={m.id} value={m.id}>{m.nome||m.name||\`Mapa ${'${m.id}'}\`}</option>)}</select></label>{combat?.active&&combatState?.initiative?.length>0&&<div className="master-turn-order"><small>ORDEM DA INICIATIVA · ARRASTE LÓGICO</small>{combatState.initiative.map((c,i)=><div key={c.id||i} className={i===Number(combatState.turnIdx||0)?'active':''}><span>{i+1}</span><b>{c.nome||'Combatente'}</b><div><button disabled={i===0} onClick={()=>reorderInitiative(i,i-1)}>↑</button><button disabled={i===combatState.initiative.length-1} onClick={()=>reorderInitiative(i,i+1)}>↓</button></div></div>)}</div>}<div className="master-row">`;
exp = replaceRequired(exp, masterMapLabel, masterOrder, 'ordem manual no console do Mestre');

// Mobile: remove totalmente o mapa da navegação, mantendo desktop intacto.
const mobileStart = exp.indexOf('  const mobileMain=[');
const mobileEnd = exp.indexOf('  ];', mobileStart);
if (mobileStart < 0 || mobileEnd < 0) throw new Error('Advanced combat patch falhou: mobileMain ausente.');
const mobileBlock = `  const mobileMain=[\n    {id:'session',label:'Sessão',icon:'✦'},\n    {id:'fichas',label:'Ficha',icon:'📋'},\n    {id:'mapamundi',label:'Mundo',icon:'🌍'},\n  ];\n  const mobileGroups=NAV_GROUPS.map(group=>({...group,items:group.items.filter(item=>item.id!=='mapabatalha')})).filter(group=>group.items.length);`;
exp = exp.slice(0, mobileStart) + mobileBlock + exp.slice(mobileEnd + 4);
exp = replaceRequired(
  exp,
  `{NAV_GROUPS.map(group=><section key={group.id}><h4>{group.icon} {group.label}</h4><div>{group.items.map(item=><button key={item.id} onClick={()=>go(item.id)} className={tab===item.id?'active':''}>{item.icon} {item.label}</button>)}</div></section>)}`,
  `{mobileGroups.map(group=><section key={group.id}><h4>{group.icon} {group.label}</h4><div>{group.items.map(item=><button key={item.id} onClick={()=>go(item.id)} className={tab===item.id?'active':''}>{item.icon} {item.label}</button>)}</div></section>)}`,
  'menu mobile sem mapa de batalha'
);
write(expFile, exp);

// ── 3) COMBATMODE LEGADO: MESMA AUTOMAÇÃO E REORDENAÇÃO SEGURA ─────────────
const combatFile = 'src/features/sheets/CombatMode.jsx';
let combat = read(combatFile);
combat = replaceRequired(combat, `import { db } from "../../core/firebase";`, `import { db } from "../../core/firebase";\nimport { applyRoundAutomation } from "../../experience/combatRoundEngine";`, 'import do motor no CombatMode');
combat = replaceRequired(
  combat,
  `      try { await setDoc(doc(db, 'config', 'combat'), { active: true, round: 1, currentNome: rolled[0]?.nome || '', currentColor: rolled[0]?.color || '#E8193C', currentType: rolled[0]?.type || 'player' }); } catch (_) {}`,
  `      try { await setDoc(doc(db, 'config', 'combat'), { active: true, round: 1, currentNome: rolled[0]?.nome || '', currentColor: rolled[0]?.color || '#E8193C', currentType: rolled[0]?.type || 'player', startedAt: Date.now(), updatedAt: Date.now() }); } catch (_) {}`,
  'chave única do combate'
);

const moveStart = '  const moveInitiative = (idx, dir) => {';
const moveEnd = '\n\n  const nextTurn = async () => {';
const safeMove = `  const moveInitiative = (idx, dir) => {\n    if (!masterMode) return;\n    const newInit = [...initiative];\n    const currentId = String(newInit[turnIdx]?.id || '');\n    if (dir === -1 && idx > 0) [newInit[idx - 1], newInit[idx]] = [newInit[idx], newInit[idx - 1]];\n    else if (dir === 1 && idx < newInit.length - 1) [newInit[idx + 1], newInit[idx]] = [newInit[idx], newInit[idx + 1]];\n    else return;\n    const nextIdx = Math.max(0, newInit.findIndex(c => String(c.id) === currentId));\n    setInitiative(newInit);\n    setTurnIdx(nextIdx);\n    persist(newInit, round, nextIdx, log);\n  };`;
combat = replaceBetween(combat, moveStart, moveEnd, safeMove, 'reordenação do CombatMode');

const legacyNextStart = '  const nextTurn = async () => {';
const legacyNextEnd = '\n\n  const triggerOpportunityAttack = async () => {';
const legacyNext = `  const nextTurn = async () => {\n    if(!initiative.length)return;\n    setPreparedAction('');\n    const next = (turnIdx + 1) % initiative.length;\n    const newRound = next === 0 ? round + 1 : round;\n    let syncedInit = initiative;\n    let automation = null;\n    if(next===0){\n      try{\n        automation=await applyRoundAutomation({initiative,round:newRound,combatKey:String(log?.[0]?.ts||'combat')});\n        if(automation?.effects?.length){\n          const hpById=new Map(automation.effects.filter(e=>e.damage>0).map(e=>[String(e.combatantId),Number(e.hpAfter)]));\n          syncedInit=initiative.map(c=>hpById.has(String(c.id))?{...c,hp:hpById.get(String(c.id))}:c);\n          setInitiative(syncedInit);\n        }\n        if(automation?.applied) pushToast(\`Rodada ${'${newRound}'}: cooldowns −1 e +2 Vigor Cósmico\`,'✦','#A855F7');\n      }catch(error){console.error('Falha ao automatizar a rodada:',error);}\n    }\n    if (next === 0) setRound(newRound);\n    setTurnIdx(next);\n    const c = syncedInit[next];\n    let newLog = addLog(\`Vez de ${'${c?.nome}'}${'${next === 0 ? ` — Rodada ${newRound} começa!` : ``}'}\`, c?.color || '#C8B8A0', '▶');\n    if(next===0&&automation?.applied){\n      const damaged=(automation.effects||[]).filter(e=>e.damage>0);\n      newLog=[...newLog,{msg:\`✦ Automação da rodada: cooldowns −1, +2 VC${'${damaged.length?` · ${damaged.length} receberam −1 HP por status`:``}'}\`,color:'#A855F7',icon:'✦',ts:Date.now(),round:newRound}].slice(-60);\n      setLog(newLog);\n    }\n    try { await setDoc(doc(db, 'config', 'combat'), { active: true, round: newRound, currentNome: c?.nome || '', currentColor: c?.color || '#E8193C', currentType: c?.type || 'player', updatedAt:Date.now() }, {merge:true}); } catch (_) {}\n    persist(syncedInit, newRound, next, newLog);\n  };`;
combat = replaceBetween(combat, legacyNextStart, legacyNextEnd, legacyNext, 'nextTurn do CombatMode');
write(combatFile, combat);

// ── 4) FICHAS: MEMÓRIAS DE INVOCAÇÃO DO NECROMANTE ─────────────────────────
const componentsFile = 'src/features/sheets/SheetComponents.jsx';
let components = read(componentsFile);
const summonStart = components.indexOf('const newSummon =');
let sheetStart = components.indexOf('const newSheet=', summonStart);
if (sheetStart < 0) sheetStart = components.indexOf('const newSheet =', summonStart);
if (summonStart < 0 || sheetStart < 0) throw new Error('Advanced combat patch falhou: bloco de invocações não encontrado.');
const summonMemoryBlock = `const SUMMON_THREATS=['Baixa','Média','Alta','Extrema'];\nconst summonRequiredAbility=threat=>['Alta','Extrema'].includes(String(threat||'Baixa'))?'Invocação dos Lordes':'Animar os Mortos';\nconst newSummon = id => ({ id, nome:'', ameaca:'Baixa', hp:10, hp_bonus:0, forca:0, agilidade:0, durabilidade:0, inteligencia:0, percepcao:0, sorte:0, ataques:[] });\nconst newSummonAttack = () => ({ id:Date.now()+Math.random(), nome:'', dano:'', desc:'' });\n\nfunction SummonCard({ summon, onChange, onDelete, masterMode, color }) {\n  const f=(k,v)=>onChange({...summon,[k]:v});\n  const [formAtk,setFormAtk]=useState(newSummonAttack());\n  const threat=summon.ameaca||'Baixa';\n  const required=summonRequiredAbility(threat);\n  if(!masterMode){\n    return <div className="summon-memory-slot" style={{'--summon-color':color}}><span>◈ MEMÓRIA DAS CINZAS</span><strong>{summon.nome||'Invocação não nomeada'}</strong><div><b>Ameaça {threat}</b><small>{required}</small></div></div>;\n  }\n  const addAtk=()=>{if(!formAtk.nome.trim())return;f('ataques',[...(summon.ataques||[]),{...formAtk,id:Date.now()}]);setFormAtk(newSummonAttack());};\n  const attrs=[['forca','Força'],['agilidade','Agilidade'],['durabilidade','Durabilidade'],['inteligencia','Inteligência'],['percepcao','Percepção'],['sorte','Sorte']];\n  return <div className="summon-memory-slot master" style={{'--summon-color':color}}>\n    <header><div><span>◈ SLOT DE MEMÓRIA</span><b>{summon.nome||'Nova invocação'}</b></div><button onClick={onDelete}>✕</button></header>\n    <div className="summon-memory-form"><label className="wide">Nome<input value={summon.nome||''} onChange={e=>f('nome',e.target.value)} placeholder="Nome da criatura"/></label><label>Nível de ameaça<select value={threat} onChange={e=>f('ameaca',e.target.value)}>{SUMMON_THREATS.map(x=><option key={x} value={x}>{x}</option>)}</select></label><label>Habilidade necessária<input value={required} readOnly/></label><label>HP base<input type="number" min="1" value={summon.hp??10} onChange={e=>f('hp',Math.max(1,Number(e.target.value)||1))}/></label><label>HP bônus<input type="number" min="0" value={summon.hp_bonus||0} onChange={e=>f('hp_bonus',Math.max(0,Number(e.target.value)||0))}/></label>{attrs.map(([key,label])=><label key={key}>{label}<input type="number" min="0" max="30" value={summon[key]||0} onChange={e=>f(key,Math.max(0,Math.min(30,Number(e.target.value)||0)))}/></label>)}</div>\n    <div className="summon-memory-attacks"><small>ATAQUES / AÇÕES DA INVOCAÇÃO</small>{(summon.ataques||[]).map(a=><div key={a.id}><b>{a.nome}</b><span>{a.dano||'—'}</span><p>{a.desc||''}</p><button onClick={()=>f('ataques',(summon.ataques||[]).filter(x=>x.id!==a.id))}>✕</button></div>)}<div className="summon-memory-add-attack"><input value={formAtk.nome} onChange={e=>setFormAtk(v=>({...v,nome:e.target.value}))} placeholder="Ação / ataque"/><input value={formAtk.dano} onChange={e=>setFormAtk(v=>({...v,dano:e.target.value}))} placeholder="Dano"/><input value={formAtk.desc} onChange={e=>setFormAtk(v=>({...v,desc:e.target.value}))} placeholder="Descrição"/><button onClick={addAtk}>＋</button></div></div>\n  </div>;\n}\n\nfunction InvocacoesPanel({ sheet, onChange, sheetColor, masterMode }) {\n  const invocacoes=Array.isArray(sheet.invocacoes)?sheet.invocacoes:[];\n  const f=novas=>onChange({...sheet,invocacoes:novas});\n  const addSummon=()=>{if(invocacoes.length>=6)return;f([...invocacoes,newSummon(Date.now())]);};\n  const updSummon=(id,data)=>f(invocacoes.map(s=>String(s.id)===String(id)?data:s));\n  const delSummon=id=>f(invocacoes.filter(s=>String(s.id)!==String(id)));\n  return <div className="summon-memory-panel"><div className="summon-memory-help">{masterMode?'Cadastre até 6 memórias. Ameaças Baixa/Média usam Animar os Mortos; Alta/Extrema usam Invocação dos Lordes.':'Estas são as criaturas gravadas na sua memória necromântica. Durante o combate, use a habilidade correspondente para invocá-las.'}</div>{invocacoes.map(s=><SummonCard key={s.id} summon={s} onChange={d=>updSummon(s.id,d)} onDelete={()=>delSummon(s.id)} masterMode={masterMode} color={sheetColor}/>)}{masterMode&&invocacoes.length<6&&<button className="summon-memory-add" onClick={addSummon}>＋ Gravar invocação na memória ({invocacoes.length}/6)</button>}{!masterMode&&!invocacoes.length&&<div className="summon-memory-empty">Nenhuma memória de invocação foi preparada pelo Mestre.</div>}</div>;\n}\n\n`;
components = components.slice(0, summonStart) + summonMemoryBlock + components.slice(sheetStart);
write(componentsFile, components);

// ── 5) CSS / FEEDBACK VISUAL ────────────────────────────────────────────────
const cssFile = 'src/experience/experience.css';
let css = read(cssFile);
const marker='/* ADVANCED COMBAT AUTOMATION · 2026-09-06 */';
if(!css.includes(marker)) css += `\n${marker}\n
.turn-current-name{height:46px;min-width:150px;max-width:220px;padding:7px 12px;border-radius:11px;border:1px solid rgba(168,85,247,.2);background:rgba(6,2,12,.94);backdrop-filter:blur(12px);display:flex;flex-direction:column;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.28),0 0 18px rgba(168,85,247,.06)}
.turn-current-name small{font:700 6px Cinzel,serif;letter-spacing:.22em;color:#76518d}.turn-current-name b{font:800 11px Cinzel,serif;color:#d4c0dc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}
.master-turn-order{margin:12px 0;padding:9px;border:1px solid rgba(168,85,247,.13);border-radius:10px;background:rgba(168,85,247,.035);display:grid;gap:5px;max-height:260px;overflow:auto}.master-turn-order>small{font:700 7px Cinzel,serif;letter-spacing:.15em;color:#76627e;margin:2px 4px 5px}.master-turn-order>div{display:grid;grid-template-columns:22px 1fr auto;align-items:center;gap:7px;padding:6px 7px;border-radius:7px;border:1px solid rgba(255,255,255,.045);background:rgba(255,255,255,.018)}.master-turn-order>div.active{border-color:rgba(168,85,247,.28);background:rgba(168,85,247,.07)}.master-turn-order>div>span{font:700 8px Cinzel,serif;color:#695772;text-align:center}.master-turn-order>div>b{font:700 9px Cinzel,serif;color:#a997ad;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.master-turn-order>div>div{display:flex;gap:3px}.master-turn-order button{width:27px;height:25px;padding:0;border-radius:6px;border:1px solid rgba(168,85,247,.16);background:rgba(168,85,247,.055);color:#9c7caf;cursor:pointer}.master-turn-order button:disabled{opacity:.25;cursor:default}
.combat-status-damage-fx{position:fixed;inset:0;z-index:24000;pointer-events:none;display:grid;place-items:center;animation:statusFxFade 2.2s ease both}.combat-status-damage-fx:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at center,rgba(232,25,60,.11),transparent 34%),radial-gradient(circle at center,transparent 55%,rgba(28,1,8,.2));animation:statusFxPulse 2.2s ease both}.combat-status-damage-fx>div{position:relative;display:flex;flex-direction:column;align-items:center;padding:14px 22px;border-radius:16px;border:1px solid rgba(232,25,60,.25);background:rgba(17,3,8,.82);backdrop-filter:blur(10px);box-shadow:0 12px 42px rgba(0,0,0,.45),0 0 28px rgba(232,25,60,.12);animation:statusFxCard 2.2s cubic-bezier(.18,.72,.2,1) both}.combat-status-damage-fx strong{font:900 clamp(28px,5vw,48px)/1 Cinzel Decorative,Cinzel,serif;color:#ff5570;text-shadow:0 0 20px rgba(232,25,60,.48)}.combat-status-damage-fx span{font:800 10px Cinzel,serif;color:#d78a97;letter-spacing:.14em;text-transform:uppercase;margin-top:7px}.combat-status-damage-fx small{font:9px Crimson Text,serif;color:#80616a;margin-top:5px}
@keyframes statusFxFade{0%{opacity:0}12%,76%{opacity:1}100%{opacity:0}}@keyframes statusFxPulse{0%{opacity:0}18%{opacity:1}100%{opacity:0}}@keyframes statusFxCard{0%{opacity:0;transform:translateY(8px) scale(.88)}15%{opacity:1;transform:translateY(0) scale(1.03)}72%{opacity:1;transform:scale(1)}100%{opacity:0;transform:translateY(-7px) scale(.97)}}
.summon-memory-popover{position:absolute;right:10px;bottom:76px;width:min(340px,calc(100vw - 28px));z-index:250;border:1px solid rgba(110,110,128,.35);border-radius:14px;background:linear-gradient(180deg,rgba(11,10,17,.98),rgba(4,3,8,.98));box-shadow:0 18px 52px rgba(0,0,0,.7),0 0 26px rgba(110,110,128,.11);backdrop-filter:blur(14px);padding:11px}.summon-memory-popover header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(255,255,255,.055);padding-bottom:8px}.summon-memory-popover header small{display:block;font:700 6px Cinzel,serif;letter-spacing:.2em;color:#666371}.summon-memory-popover header b{display:block;font:800 10px Cinzel,serif;color:#b9b5c4;margin-top:3px}.summon-memory-popover header button{border:0;background:transparent;color:#77717e;cursor:pointer}.summon-memory-popover>p{font-size:10px;color:#756f7c;margin:9px 2px}.summon-memory-options{display:grid;gap:6px}.summon-memory-options>button{height:auto!important;min-height:48px!important;display:flex!important;align-items:center;gap:9px;padding:7px 9px!important;border:1px solid rgba(110,110,128,.16)!important;background:rgba(110,110,128,.05)!important;border-radius:9px!important}.summon-memory-options>button>span{font-size:17px!important;overflow:visible!important}.summon-memory-options>button b{display:block;font:700 9px Cinzel,serif;color:#aaa6b3}.summon-memory-options>button small{font:7px Cinzel,serif;color:#77717f}.summon-memory-options>em{padding:12px;text-align:center;font-size:10px;color:#5e5964;border:1px dashed rgba(255,255,255,.07);border-radius:8px}
.summon-memory-panel{display:grid;gap:10px}.summon-memory-help{font-size:11px;line-height:1.55;color:#746d7a;text-align:center;padding:8px 11px;border-radius:9px;background:rgba(110,110,128,.035);border:1px solid rgba(110,110,128,.09)}.summon-memory-slot{border:1px solid color-mix(in srgb,var(--summon-color) 28%,transparent);background:color-mix(in srgb,var(--summon-color) 5%,rgba(5,3,10,.8));border-radius:12px;padding:12px 14px;box-shadow:inset 0 0 24px color-mix(in srgb,var(--summon-color) 3%,transparent)}.summon-memory-slot:not(.master){display:grid;grid-template-columns:1fr auto;gap:5px 12px;align-items:center}.summon-memory-slot:not(.master)>span{grid-column:1/3;font:700 6px Cinzel,serif;letter-spacing:.2em;color:#615b68}.summon-memory-slot:not(.master)>strong{font:800 12px Cinzel,serif;color:color-mix(in srgb,var(--summon-color) 62%,#d8d2dd)}.summon-memory-slot:not(.master)>div{text-align:right}.summon-memory-slot:not(.master)>div b,.summon-memory-slot:not(.master)>div small{display:block;font:7px Cinzel,serif;color:#77717d}.summon-memory-slot.master>header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.summon-memory-slot.master>header span{display:block;font:700 6px Cinzel,serif;letter-spacing:.18em;color:#68616e}.summon-memory-slot.master>header b{display:block;font:800 11px Cinzel,serif;color:#aaa4b0;margin-top:3px}.summon-memory-slot.master>header button{border:1px solid rgba(232,25,60,.18);background:rgba(232,25,60,.05);color:#a35e6b;border-radius:6px;cursor:pointer}.summon-memory-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.summon-memory-form label{font:700 7px Cinzel,serif;color:#69616d}.summon-memory-form label.wide{grid-column:span 2}.summon-memory-form input,.summon-memory-form select{display:block;width:100%;margin-top:4px;min-height:31px;border-radius:7px;border:1px solid rgba(255,255,255,.07);background:rgba(3,2,7,.72);color:#a8a1ad;padding:6px;font-size:10px}.summon-memory-attacks{margin-top:11px;border-top:1px solid rgba(255,255,255,.055);padding-top:9px}.summon-memory-attacks>small{font:700 6px Cinzel,serif;letter-spacing:.16em;color:#625c66}.summon-memory-attacks>div:not(.summon-memory-add-attack){position:relative;margin-top:6px;padding:7px 28px 7px 8px;border-radius:7px;background:rgba(255,255,255,.018);border:1px solid rgba(255,255,255,.045)}.summon-memory-attacks b{font:700 8px Cinzel,serif;color:#9a949f}.summon-memory-attacks span{font-size:9px;color:#8c768f;margin-left:8px}.summon-memory-attacks p{font-size:9px;color:#645e68;margin:3px 0 0}.summon-memory-attacks>div>button{position:absolute;right:5px;top:5px;border:0;background:transparent;color:#85515b;cursor:pointer}.summon-memory-add-attack{display:grid;grid-template-columns:1fr 90px 1.4fr 34px;gap:5px;margin-top:7px}.summon-memory-add-attack input{min-width:0;border-radius:6px;border:1px solid rgba(255,255,255,.06);background:rgba(3,2,7,.7);color:#9d96a2;padding:6px;font-size:9px}.summon-memory-add-attack button{position:static!important;border:1px solid color-mix(in srgb,var(--summon-color) 28%,transparent)!important;background:color-mix(in srgb,var(--summon-color) 8%,transparent)!important;color:var(--summon-color)!important;border-radius:6px!important}.summon-memory-add{width:100%;padding:10px;border-radius:9px;border:1px dashed rgba(110,110,128,.28);background:rgba(110,110,128,.035);color:#85818d;cursor:pointer;font:700 8px Cinzel,serif}.summon-memory-empty{text-align:center;padding:18px;border:1px dashed rgba(255,255,255,.06);border-radius:10px;color:#5c5661;font-size:10px}
@media(max-width:900px){.mobile-dock{grid-template-columns:repeat(4,1fr)!important}.hud-map-action{display:none!important}.turn-current-name{min-width:105px;max-width:135px;height:39px;padding:5px 8px}.turn-current-name b{font-size:8px}.summon-memory-popover{position:fixed;left:10px;right:10px;bottom:144px;width:auto}.summon-memory-form{grid-template-columns:repeat(2,minmax(0,1fr))}.summon-memory-add-attack{grid-template-columns:1fr 72px}.summon-memory-add-attack input:nth-child(3){grid-column:1/2}.summon-memory-add-attack button{grid-column:2/3;grid-row:2}.combat-status-damage-fx>div{max-width:88vw}.global-turn-ribbon{z-index:480}}
@media(max-width:520px){.turn-current-name{display:none}.global-turn-ribbon{top:54px}.summon-memory-slot:not(.master){grid-template-columns:1fr}.summon-memory-slot:not(.master)>span{grid-column:1}.summon-memory-slot:not(.master)>div{text-align:left}}
`;
write(cssFile, css);

// ── 6) SANIDADE DO BUILD ───────────────────────────────────────────────────
const finalApp=read(appFile), finalExp=read(expFile), finalCombat=read(combatFile), finalComponents=read(componentsFile), finalCss=read(cssFile);
for(const [source,marker,label] of [
  [finalApp,'mobileBattleMapBlocked','bloqueio mobile'],
  [finalExp,'applyRoundAutomation','automação de rodada no provider'],
  [finalExp,'reorderInitiative','reordenação realtime'],
  [finalExp,'CombatStatusDamageFx','feedback de status'],
  [finalExp,'useSummonAbility','invocação pelo HUD'],
  [finalExp,'mobileGroups','navegação mobile filtrada'],
  [finalCombat,'applyRoundAutomation','automação no CombatMode'],
  [finalComponents,'SUMMON_THREATS','memórias necromânticas'],
  [finalComponents,'ameaaca', ''],
  [finalCss,'ADVANCED COMBAT AUTOMATION','CSS do lote'],
]){if(label&& !source.includes(marker))throw new Error(`Advanced combat patch incompleto: ${label}`);}
if(finalExp.includes("{id:'mapabatalha',label:'Batalha',icon:'🗡️'},"))throw new Error('Mapa de batalha ainda aparece no dock mobile.');
console.log('Dinastia E: mobile sem mapa, combate realtime automatizado, iniciativa manual e memórias necromânticas aplicados.');
