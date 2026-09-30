import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);
const must = (condition, message) => {
  if (!condition) throw new Error(`Live dice/summons final patch: ${message}`);
};
const replaceOnce = (source, before, after, label) => {
  must(source.includes(before), `ancora ausente: ${label}`);
  return source.replace(before, after);
};
const replaceRange = (source, start, end, replacement, label) => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  must(from >= 0 && to > from, `bloco ausente: ${label}`);
  return source.slice(0, from) + replacement + source.slice(to);
};

// Replays: baseline autoritativo mais uma janela temporal independente. A
// segunda barreira impede que cache, retomada de aba ou reconexao enfileirem
// documentos historicos como se fossem novos.
const replayFile = 'src/experience/SharedDiceReplay.jsx';
let replay = read(replayFile);
replay = replaceOnce(
  replay,
  "import { createLiveSnapshotGate, isNewLiveDocument } from './liveDiceGate';",
  "import { createLiveSnapshotGate, isLiveDicePayload, isNewLiveDocument } from './liveDiceGate';",
  'import do filtro temporal',
);
replay = replaceOnce(
  replay,
  "  const localSheetId = access?.role === 'player' && access?.sheetId ? String(access.sheetId) : '';",
  "  const localSheetId = access?.role === 'player' && access?.sheetId ? String(access.sheetId) : '';\n  const joinedAtRef = useRef(Date.now());",
  'instante de entrada',
);
replay = replaceOnce(
  replay,
  `  const enqueue = useCallback(payload => {
    if (!payload) return;
    const id = getReplayId(payload);`,
  `  const enqueue = useCallback(payload => {
    if (!payload || !isLiveDicePayload(payload, { joinedAt: joinedAtRef.current })) return;
    const id = getReplayId(payload);`,
  'filtro antes da fila',
);
replay = replaceOnce(
  replay,
  "    setQueue(prev => [...prev, { ...payload, _replayId: id }].slice(-12));",
  "    setQueue(prev => [...prev, { ...payload, _replayId: id }].filter(item => isLiveDicePayload(item, { joinedAt: joinedAtRef.current })).slice(-5));",
  'fila curta e viva',
);
replay = replaceOnce(
  replay,
  `  useEffect(() => {
    if (active || !queue.length) return;
    setActive(queue[0]);
    setQueue(prev => prev.slice(1));
    setSettled(false);
  }, [active, queue]);`,
  `  useEffect(() => {
    if (active || !queue.length) return;
    const liveQueue = queue.filter(item => isLiveDicePayload(item, { joinedAt: joinedAtRef.current }));
    if (!liveQueue.length) {
      setQueue([]);
      return;
    }
    setActive(liveQueue[0]);
    setQueue(liveQueue.slice(1));
    setSettled(false);
  }, [active, queue]);`,
  'expiracao antes da animacao',
);
replay = replaceOnce(
  replay,
  'const guard = window.setTimeout(() => setActive(null), 14000);',
  'const guard = window.setTimeout(() => setActive(null), 9000);',
  'limite de bloqueio',
);
write(replayFile, replay);

const criticalFile = 'src/experience/DiceCriticalFx.jsx';
let critical = read(criticalFile);
critical = replaceOnce(
  critical,
  "import { createLiveSnapshotGate, isNewLiveDocument } from './liveDiceGate';",
  "import { createLiveSnapshotGate, isLiveDicePayload, isNewLiveDocument } from './liveDiceGate';",
  'import temporal do critico',
);
critical = replaceOnce(
  critical,
  '  const seenRef = useRef(new Set());',
  '  const seenRef = useRef(new Set());\n  const joinedAtRef = useRef(Date.now());',
  'entrada do critico',
);
critical = replaceOnce(
  critical,
  `  const ingest = useCallback(data => {
    if (!data) return;`,
  `  const ingest = useCallback(data => {
    if (!data || !isLiveDicePayload(data, { joinedAt: joinedAtRef.current })) return;`,
  'filtro temporal do critico',
);
write(criticalFile, critical);

// Runtime das invocacoes: somente memorias reveladas podem ser liberadas. A
// vida e as acoes sao transacionadas no combat_state; os atributos da memoria
// nunca sao escritos pelo jogador.
const kitFile = 'src/experience/ExperienceKit.generated.jsx';
let kit = read(kitFile);
kit = replaceOnce(
  kit,
  '  collection, deleteDoc, doc, limit, orderBy, query, serverTimestamp, setDoc, updateDoc,',
  '  collection, deleteDoc, doc, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc,',
  'runTransaction no kit',
);
kit = replaceOnce(
  kit,
  '  const [sheets,setSheets]=useState([]);',
  "  const [sheets,setSheets]=useState([]);\n  const [summons,setSummons]=useState([]);",
  'estado persistente das invocacoes',
);
kit = replaceOnce(
  kit,
  "    unsubscribers.push(onSnapshot(doc(db,'config','customAbilities'),snap=>setCustomAbilities(normalizeDoc(snap,{}))));",
  "    unsubscribers.push(onSnapshot(collection(db,'combat_summons'),snap=>setSummons(snap.docs.map(d=>({summonDocId:d.id,...d.data()})).filter(row=>row.active!==false))));\n    unsubscribers.push(onSnapshot(doc(db,'config','customAbilities'),snap=>setCustomAbilities(normalizeDoc(snap,{}))));",
  'listener persistente das invocacoes',
);

const summonRuntime = `  const useSummonAbility=useCallback(async(ability,summon)=>{
    if(!selectedSheet||!summon||summon.revealed!==true)return false;
    const threat=String(summon?.ameaca||'Baixa').toLowerCase();
    const isLord=['alta','extrema','extremo'].includes(threat);
    if(summons.some(c=>c.active!==false&&String(c.ownerSheetId||'')===String(selectedSheet.id)&&String(c.summonMemoryId||'')===String(summon.id||'')))return false;
    const now=Date.now();
    const safeId=value=>String(value||'summon').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80);
    const summonId=\`summon_\${safeId(selectedSheet.id)}_\${safeId(summon.id||summon.nome)}\`;
    const maxHp=Math.max(1,Math.floor(Number(summon.hp||10)+Math.max(0,Number(summon.hp_bonus||0))));
    const scale=1;
    const attr=key=>Math.floor(Number(summon?.[key]||0)*scale);
    const attacks=(Array.isArray(summon.ataques)?summon.ataques:[]).map(action=>({
      ...action,custo:Math.max(0,Math.min(3,Number(action?.custo??1))),
    }));
    const summoned={
      id:\`s_\${summonId}\`,summonDocId:summonId,type:'summon',ownerSheetId:String(selectedSheet.id),
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
            msg:\`\${selectedSheet.nome||'Necromante'} invocou \${summoned.nome} · 3 VC\`,
            color:selectedClass?.color||'#6E6E80',icon:'\\uD83D\\uDC80',ts:now,round:Number(state.round||1),
          }].slice(-60);
          transaction.set(stateRef,{initiative:init,turnIdx:idx,log,updatedAt:now,revision:now},{merge:true});
        }
      }
      return true;
    });
    if(!released)return false;
    const event={
      id:nowId('summon_release'),type:'summon_release',title:'INVOCAÇÃO FEITA',text:summoned.nome,
      subtitle:\`\${selectedSheet.nome||'Necromante'} conjurou a invocação\`,ts:now,
      color:selectedClass?.color||'#6E6E80',icon:'\\uD83D\\uDC80',soft:false,source:'summon-release',sheetId:String(selectedSheet.id),
    };
    await Promise.all([
      addJournal(\`\${summoned.nome} foi invocado por \${selectedSheet.nome||'Necromante'}.\`,'ability',{icon:event.icon,color:event.color,source:'summon-release'}),
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
        msg:\`\${result.name} usou \${result.actionName}\`,color:result.color,
        icon:'\\uD83D\\uDC80',ts:result.now,round:Number(state.round||1),
      }].slice(-60);
      transaction.set(stateRef,{initiative,log,updatedAt:result.now,revision:result.now},{merge:true});
    }).catch(error=>console.warn('Ação usada; espelho da iniciativa indisponível:',error));
    const now=result.now;
    const event={
      id:nowId('summon_action'),type:'ability',text:\`\${result.name} usou \${result.actionName}\`,
      ts:now,color:result.color,icon:'\\uD83D\\uDC80',soft:true,source:'summon-action',sheetId:String(selectedSheet?.id||''),
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
    addJournal(\`\${result.name} foi guardada pelo necromante.\`,'ability',{icon:'\\uD83D\\uDC80',color:record.color||'#6E6E80',source:'summon-store'}).catch(error=>console.warn('Invocação guardada; registro no diário indisponível:',error));
    return true;
  },[summons,masterMode,selectedSheet?.id,addJournal]);`;

kit = replaceRange(
  kit,
  '  const useSummonAbility=useCallback(async(ability,summon)=>{',
  '\n\n  const value=useMemo',
  summonRuntime,
  'runtime das invocacoes',
);
kit = kit.replaceAll(
  'useQuickAbility,useSummonAbility',
  'useQuickAbility,useSummonAbility,updateSummonHp,updateSummonVc,useSummonAction,storeSummon',
);
kit = replaceOnce(
  kit,
  'tab,masterMode,sheets,customAbilities,selectedSheetId',
  'tab,masterMode,sheets,summons,customAbilities,selectedSheetId',
  'invocacoes no contexto',
);
kit = replaceOnce(
  kit,
  'tab,masterMode,sheets,customAbilities,selectedSheetId,setSelectedSheetId',
  'tab,masterMode,sheets,summons,customAbilities,selectedSheetId,setSelectedSheetId',
  'dependencia das invocacoes no contexto',
);
must(kit.includes('vigos:3,maxVigos:3'), 'VC fixo nao aplicado');
must(kit.includes('const updateSummonHp=useCallback'), 'controle de HP ausente');
must(kit.includes('const updateSummonVc=useCallback'), 'controle de VC ausente');
must(kit.includes('const useSummonAction=useCallback'), 'acoes da invocacao ausentes');
must(kit.includes('const storeSummon=useCallback'), 'acao Guardar ausente');
write(kitFile, kit);

// Invocacoes liberadas fora de combate continuam persistentes e entram na
// iniciativa quando o Mestre iniciar o combate posteriormente.
const combatModeFile = 'src/features/sheets/CombatMode.jsx';
let combatMode = read(combatModeFile);
combatMode = replaceOnce(
  combatMode,
  'import { doc,serverTimestamp,setDoc,updateDoc } from "firebase/firestore";',
  'import { collection,doc,serverTimestamp,setDoc,updateDoc } from "firebase/firestore";',
  'collection no modo de combate',
);
combatMode = replaceOnce(
  combatMode,
  '  const [initiative, setInitiative] = useState([]);',
  '  const [initiative, setInitiative] = useState([]);\n  const [releasedSummons, setReleasedSummons] = useState([]);',
  'estado de invocacoes liberadas no combate',
);
combatMode = replaceOnce(
  combatMode,
  `useEffect(() => {
  const unsub = onSnapshot(doc(db, 'config', 'public_dice_roll'), snap => {`,
  `useEffect(() => {
  const unsub = onSnapshot(collection(db, 'combat_summons'), snap => {
    setReleasedSummons(snap.docs.map(item => ({ summonDocId:item.id, ...item.data() })).filter(item => item.active !== false));
  });
  return () => unsub();
}, []);

useEffect(() => {
  const unsub = onSnapshot(doc(db, 'config', 'public_dice_roll'), snap => {`,
  'listener de invocacoes no combate',
);
combatMode = replaceOnce(
  combatMode,
  `  ...enemies.filter(e => selectedEnemies.includes(e.id)).map(e => ({
    id: \`e_\${e.id}\`,
    nome: e.nome || 'Inimigo',
    type: 'enemy',
    hp: e.hp || 0,
    maxHp: (e.hp || 0) + (e.hp_bonus || 0),
    color: ENEMY_COLOR,
    foto: e.foto || '',
    agiBonus: Math.floor((e.agilidade || 0) / 2),
    perBonus: Math.floor((e.percepcao || 0) / 2),
    status: e.status || {},
    className: e.className || e.tipo || 'Inimigo',
  })),
];`,
  `  ...enemies.filter(e => selectedEnemies.includes(e.id)).map(e => ({
    id: \`e_\${e.id}\`,
    nome: e.nome || 'Inimigo',
    type: 'enemy',
    hp: e.hp || 0,
    maxHp: (e.hp || 0) + (e.hp_bonus || 0),
    color: ENEMY_COLOR,
    foto: e.foto || '',
    agiBonus: Math.floor((e.agilidade || 0) / 2),
    perBonus: Math.floor((e.percepcao || 0) / 2),
    status: e.status || {},
    className: e.className || e.tipo || 'Inimigo',
  })),
  ...releasedSummons.filter(summon => summon.active !== false && selectedPlayers.some(id => String(id) === String(summon.ownerSheetId || ''))).map(summon => ({
    ...summon,
    id: summon.id || \`s_\${summon.summonDocId}\`,
    summonDocId: summon.summonDocId,
    type: 'summon',
    hp: Number(summon.hp || 0),
    maxHp: Math.max(1, Number(summon.maxHp || 1)),
    vigos: Math.max(0, Math.min(3, Number(summon.vigos ?? 3))),
    maxVigos: 3,
    agiBonus: Math.floor(Number(summon.agilidade || 0) / 2),
    perBonus: Math.floor(Number(summon.percepcao || 0) / 2),
    className: summon.className || 'Invocação',
  })),
];`,
  'invocacoes persistentes na iniciativa',
);
write(combatModeFile, combatMode);

// O anuncio de liberacao e um evento global proprio: titulo e nome pulsantes,
// independente da pagina atual ou do estado do combate.
const realtimeFile = 'src/experience/RealtimeBroadcasts.jsx';
let realtime = read(realtimeFile);
realtime = replaceOnce(
  realtime,
  "const duration=current.type==='turn_announce'?2000:current.type==='death'?3500:current.soft?1900:current.type==='critical'?4200:3400;",
  "const duration=current.type==='turn_announce'?2000:current.type==='death'?3500:current.type==='summon_release'?4200:current.soft?1900:current.type==='critical'?4200:3400;",
  'duracao do anuncio de invocacao',
);
realtime = replaceOnce(
  realtime,
  `  if(current.type==='turn_announce')return (`,
  `  if(current.type==='summon_release')return (
    <div className="realtime-cosmic-event rt-summon_release" style={{ '--event-color': color }} aria-live="assertive">
      <div className="rt-cosmic-grid"/><div className="rt-cosmic-ring"/>
      <div className="rt-summon-release-copy"><span>{current.icon||'\\uD83D\\uDC80'}</span><small>{current.title||'INVOCAÇÃO FEITA'}</small><strong>{current.text||'Invocação'}</strong>{current.subtitle&&<p>{current.subtitle}</p>}</div>
    </div>
  );
  if(current.type==='turn_announce')return (`,
  'render cinematografico da invocacao',
);
write(realtimeFile, realtime);

const realtimeCssFile = 'src/experience/realtime.css';
let realtimeCss = read(realtimeCssFile);
if(!realtimeCss.includes('/* SUMMON RELEASE CINEMATIC 2026-09-28 */')) realtimeCss += `

/* SUMMON RELEASE CINEMATIC 2026-09-28 */
.rt-summon_release{z-index:var(--g3-z-cinematic,2400);background:radial-gradient(circle at 50% 48%,color-mix(in srgb,var(--event-color) 23%,rgba(11,3,18,.82)) 0,rgba(4,2,9,.92) 38%,rgba(1,2,7,.96) 72%);animation:rtSummonScene 4.2s cubic-bezier(.2,.8,.2,1) both}
.rt-summon_release .rt-cosmic-ring{width:22vmin;height:22vmin;border-width:2px;animation:rtSummonRing 2.2s cubic-bezier(.16,.84,.24,1) infinite}
.rt-summon-release-copy{position:relative;display:grid;justify-items:center;text-align:center;animation:rtSummonCopy 4.2s cubic-bezier(.2,.8,.2,1) both}
.rt-summon-release-copy>span{font-size:clamp(42px,8vw,92px);line-height:1;filter:drop-shadow(0 0 24px color-mix(in srgb,var(--event-color) 72%,transparent));animation:rtSummonIcon 1.05s ease-in-out infinite alternate}
.rt-summon-release-copy>small{margin-top:18px;font:800 clamp(10px,1.1vw,14px) Cinzel,serif;letter-spacing:.42em;color:color-mix(in srgb,var(--event-color) 72%,#fff);text-shadow:0 0 24px var(--event-color);animation:rtSummonTitle 1.1s ease-in-out infinite alternate}
.rt-summon-release-copy>strong{margin-top:10px;max-width:min(880px,86vw);font:800 clamp(28px,5vw,66px) 'Cinzel Decorative',serif;letter-spacing:.06em;color:#f3ebf5;text-shadow:0 3px 18px #000,0 0 32px color-mix(in srgb,var(--event-color) 58%,transparent)}
.rt-summon-release-copy>p{margin:10px 0 0;font:700 clamp(9px,1vw,13px) Cinzel,serif;letter-spacing:.12em;color:#a99daf}
@keyframes rtSummonScene{0%{opacity:0;filter:brightness(.35)}12%,76%{opacity:1;filter:brightness(1)}100%{opacity:0;filter:brightness(.5)}}
@keyframes rtSummonRing{0%{transform:scale(.55);opacity:.1}48%{opacity:.9}100%{transform:scale(4.4);opacity:0}}
@keyframes rtSummonCopy{0%{opacity:0;transform:translateY(24px) scale(.82);filter:blur(9px)}14%,78%{opacity:1;transform:translateY(0) scale(1);filter:blur(0)}100%{opacity:0;transform:translateY(-14px) scale(1.04)}}
@keyframes rtSummonIcon{from{transform:scale(.94)}to{transform:scale(1.08)}}
@keyframes rtSummonTitle{from{opacity:.65;text-shadow:0 0 12px var(--event-color)}to{opacity:1;text-shadow:0 0 32px var(--event-color)}}
@media(prefers-reduced-motion:reduce){.rt-summon_release,.rt-summon_release .rt-cosmic-ring,.rt-summon-release-copy,.rt-summon-release-copy>span,.rt-summon-release-copy>small{animation:none!important}.rt-summon_release{opacity:1}}
`;
write(realtimeCssFile, realtimeCss);

const componentsFile = 'src/features/sheets/SheetComponents.jsx';
let components = read(componentsFile);
components = replaceOnce(
  components,
  'import { logAbilityUsed } from "../../core/combatEvents";',
  'import { logAbilityUsed } from "../../core/combatEvents";\nimport { useExperience } from "../../experience/ExperienceKit.generated";',
  'contexto na ficha',
);

const summonComponents = `const SUMMON_THREATS=['Baixa','Média','Alta','Extrema'];
const SUMMON_ATTRS=[['forca','Força'],['agilidade','Agilidade'],['durabilidade','Durabilidade'],['inteligencia','Inteligência'],['percepcao','Percepção'],['sorte','Sorte']];
const SUMMON_ICON='\\uD83D\\uDC80';
const summonRequiredAbility=threat=>['Alta','Extrema'].includes(String(threat||'Baixa'))?'Invocação dos Lordes':'Animar os Mortos';
const newSummon=id=>({id,nome:'',ameaca:'Baixa',hp:10,hp_bonus:0,forca:0,agilidade:0,durabilidade:0,inteligencia:0,percepcao:0,sorte:0,ataques:[],revealed:false});
const newSummonAttack=()=>({id:Date.now()+Math.random(),nome:'',dano:'',desc:'',custo:1});

function SummonCard({summon,onChange,onDelete,masterMode,color,ownerSheet}){
  const {combatState,summons,useSummonAbility,updateSummonHp,updateSummonVc,useSummonAction,storeSummon}=useExperience();
  const [attackDraft,setAttackDraft]=useState(newSummonAttack());
  const [busy,setBusy]=useState(false);
  const [optimisticVitals,setOptimisticVitals]=useState(null);
  const change=(key,value)=>onChange({...summon,[key]:value});
  const threat=summon.ameaca||'Baixa';
  const required=summonRequiredAbility(threat);
  const initiative=Array.isArray(combatState?.initiative)?combatState.initiative:[];
  const activeRecord=(Array.isArray(summons)?summons:[]).find(row=>row.type==='summon'
    && String(row.ownerSheetId||'')===String(ownerSheet?.id||'')
    && String(row.summonMemoryId||'')===String(summon.id||''));
  const configuredMaxHp=Math.max(1,Math.floor(Number(summon.hp||10)+Math.max(0,Number(summon.hp_bonus||0))));
  const activeSummon=activeRecord?{
    ...activeRecord,
    maxHp:configuredMaxHp,
    hp:Number(activeRecord.hp||0)>=Number(activeRecord.maxHp||1)&&configuredMaxHp>Number(activeRecord.maxHp||1)?configuredMaxHp:Math.min(configuredMaxHp,Number(activeRecord.hp||0)),
  }:null;
  const currentTurn=initiative[Number(combatState?.turnIdx||0)];
  const isSummonTurn=Boolean(activeSummon&&String(currentTurn?.id||'')===String(activeSummon.id||''));
  const actionsAvailable=Boolean(activeSummon);
  const currentVc=Math.max(0,Math.min(3,Number(activeSummon?.vigos??3)));
  const displayedHp=Math.max(0,Math.min(configuredMaxHp,Number(optimisticVitals?.hp??activeSummon?.hp??0)));
  const displayedVc=Math.max(0,Math.min(3,Number(optimisticVitals?.vc??currentVc)));
  useEffect(()=>{
    if(!activeSummon){setOptimisticVitals(null);return;}
    if(optimisticVitals&&Number(activeSummon.hp||0)===optimisticVitals.hp&&Number(activeSummon.vigos??3)===optimisticVitals.vc)setOptimisticVitals(null);
  },[activeSummon?.id,activeSummon?.hp,activeSummon?.vigos,optimisticVitals]);

  const addAttack=()=>{
    if(!attackDraft.nome.trim())return;
    const next={...attackDraft,id:Date.now(),custo:Math.max(0,Math.min(3,Number(attackDraft.custo)||0))};
    change('ataques',[...(summon.ataques||[]),next]);
    setAttackDraft(newSummonAttack());
  };
  const release=async()=>{
    if(busy)return;
    setBusy(true);
    try{
      const accepted=await useSummonAbility({name:required},summon);
      if(!accepted)pushToast('A invocação não pôde ser liberada agora.',SUMMON_ICON,color);
    }catch(error){console.error('Falha ao liberar invocação:',error);pushToast('Falha ao sincronizar a invocação.',SUMMON_ICON,color);}finally{setBusy(false);}
  };
  const adjustHp=async delta=>{
    if(!activeSummon)return;
    const nextHp=Math.max(0,Math.min(configuredMaxHp,displayedHp+Number(delta||0)));
    if(nextHp===displayedHp)return;
    setOptimisticVitals(current=>({hp:nextHp,vc:Number(current?.vc??displayedVc)}));
    try{
      const accepted=await updateSummonHp(activeSummon.id,delta,configuredMaxHp);
      if(!accepted)pushToast('Não foi possível alterar a vida da invocação.',SUMMON_ICON,color);
    }catch(error){console.error('Falha ao alterar HP da invocação:',error);pushToast('Falha ao sincronizar a vida da invocação.',SUMMON_ICON,color);}
  };
  const adjustVc=async delta=>{
    if(!activeSummon)return;
    const nextVc=Math.max(0,Math.min(3,displayedVc+Number(delta||0)));
    if(nextVc===displayedVc)return;
    setOptimisticVitals(current=>({hp:Number(current?.hp??displayedHp),vc:nextVc}));
    try{
      const accepted=await updateSummonVc(activeSummon.id,delta);
      if(!accepted)pushToast('Não foi possível alterar o Vigor Cósmico.',SUMMON_ICON,color);
    }catch(error){console.error('Falha ao alterar VC da invocação:',error);pushToast('Falha ao sincronizar o Vigor Cósmico.',SUMMON_ICON,color);}
  };
  const useAction=async action=>{
    if(!activeSummon||busy)return;
    setBusy(true);
    try{
      const accepted=await useSummonAction(activeSummon.id,action);
      if(!accepted)pushToast('A ação exige vida e VC disponíveis.',SUMMON_ICON,color);
    }catch(error){console.error('Falha ao usar ação da invocação:',error);pushToast('Falha ao sincronizar a ação da invocação.',SUMMON_ICON,color);}finally{setBusy(false);}
  };
  const store=async()=>{
    if(!activeSummon||busy)return;
    setBusy(true);
    try{
      const accepted=await storeSummon(activeSummon.id);
      if(!accepted)pushToast('A invocação não pôde ser guardada.',SUMMON_ICON,color);
    }catch(error){console.error('Falha ao guardar invocação:',error);pushToast('Falha ao sincronizar a invocação.',SUMMON_ICON,color);}finally{setBusy(false);}
  };

  if(masterMode){
    return <div className={'summon-memory-slot master '+(summon.revealed?'is-revealed':'is-hidden')} style={{'--summon-color':color}}>
      <header><div><span>{SUMMON_ICON} SLOT DE MEMÓRIA</span><b>{summon.nome||'Nova invocação'}</b></div><div className="summon-master-actions"><button className="summon-reveal-button" onClick={()=>change('revealed',!summon.revealed)}>{summon.revealed?'Ocultar':'Revelar'}</button><button className="summon-delete-button" onClick={onDelete}>×</button></div></header>
      <div className="summon-reveal-state">{summon.revealed?'Visível para o necromante':'Oculta até o Mestre revelar'} · 3 VC</div>
      <div className="summon-memory-form"><label className="wide">Nome<input value={summon.nome||''} onChange={event=>change('nome',event.target.value)} placeholder="Nome da criatura"/></label><label>Ameaça<select value={threat} onChange={event=>change('ameaca',event.target.value)}>{SUMMON_THREATS.map(item=><option key={item} value={item}>{item}</option>)}</select></label><label>Habilidade necessária<input value={required} readOnly/></label><label>HP base<input type="number" min="1" value={summon.hp??10} onChange={event=>change('hp',Math.max(1,Number(event.target.value)||1))}/></label><label>HP bônus<input type="number" min="0" value={summon.hp_bonus||0} onChange={event=>change('hp_bonus',Math.max(0,Number(event.target.value)||0))}/></label>{SUMMON_ATTRS.map(([key,label])=><label key={key}>{label}<input type="number" min="0" max="30" value={summon[key]||0} onChange={event=>change(key,Math.max(0,Math.min(30,Number(event.target.value)||0)))}/></label>)}</div>
      <div className="summon-memory-attacks"><small>ATAQUES / AÇÕES · VC MÁXIMO 3</small>{(summon.ataques||[]).map(action=><div key={action.id}><b>{action.nome}</b><span>{action.dano||'—'} · {Math.max(0,Math.min(3,Number(action.custo??1)))} VC</span><p>{action.desc||''}</p><button onClick={()=>change('ataques',(summon.ataques||[]).filter(item=>item.id!==action.id))}>×</button></div>)}<div className="summon-memory-add-attack"><input value={attackDraft.nome} onChange={event=>setAttackDraft(value=>({...value,nome:event.target.value}))} placeholder="Ação / ataque"/><input value={attackDraft.dano} onChange={event=>setAttackDraft(value=>({...value,dano:event.target.value}))} placeholder="Dano"/><input type="number" min="0" max="3" value={attackDraft.custo} onChange={event=>setAttackDraft(value=>({...value,custo:Number(event.target.value)}))} aria-label="Custo em VC"/><input value={attackDraft.desc} onChange={event=>setAttackDraft(value=>({...value,desc:event.target.value}))} placeholder="Descrição"/><button onClick={addAttack}>＋</button></div></div>
    </div>;
  }

  if(summon.revealed!==true)return null;
  const canRelease=Boolean(!activeSummon&&!busy);
  return <div className={'summon-memory-slot player-summon-card '+(activeSummon?'is-active':'is-revealed')} style={{'--summon-color':color}}>
    <header><div><span>{SUMMON_ICON} MEMÓRIA REVELADA</span><strong>{summon.nome||'Invocação não nomeada'}</strong></div><div className="summon-threat"><b>Ameaça {threat}</b><small>{required}</small></div></header>
    {activeSummon&&<div className="summon-readonly-stats">{SUMMON_ATTRS.map(([key,label])=><div key={key}><small>{label}</small><b>{summon[key]||0}</b></div>)}</div>}
    <div className={'summon-release-row '+(activeSummon?'summon-store-row':'')}><div><b>{activeSummon?'Invocação em campo':'3 VC ao ser conjurada'}</b><small>{activeSummon?'Guarde para recolher a ficha e conjurar novamente depois.':'Autorizada pelo Mestre. Pode ser liberada agora.'}</small></div><button className={activeSummon?'summon-store-button':'summon-release-button is-pulsing'} onClick={activeSummon?store:release} disabled={activeSummon?busy:!canRelease}>{busy?(activeSummon?'Guardando...':'Liberando...'):(activeSummon?'Guardar':'Liberar')}</button></div>
    {activeSummon&&<div className="summon-live-controls">
      <div className="summon-vitals"><div><small>VIDA</small><span><button onClick={()=>adjustHp(-1)} disabled={displayedHp<=0}>−</button><b>{displayedHp}/{configuredMaxHp}</b><button onClick={()=>adjustHp(1)} disabled={displayedHp>=configuredMaxHp}>+</button></span></div><div><small>VIGOR CÓSMICO</small><span><button onClick={()=>adjustVc(-1)} disabled={displayedVc<=0}>−</button><b>{displayedVc}/3 VC</b><button onClick={()=>adjustVc(1)} disabled={displayedVc>=3}>+</button></span></div></div>
      <div className="summon-turn-state">Invocação liberada · controle do necromante{isSummonTurn?' · turno atual':''}</div>
      <div className="summon-player-actions">{(activeSummon.ataques||[]).map(action=>{const cost=Math.max(0,Math.min(3,Number(action.custo??1)));return <button key={action.id||action.nome} disabled={!actionsAvailable||busy||displayedVc<cost||displayedHp<=0} onClick={()=>useAction(action)}><span><b>{action.nome||'Ação'}</b><small>{action.dano||'Sem dano definido'}</small></span><em>{cost} VC</em>{action.desc&&<p>{action.desc}</p>}</button>})}{!(activeSummon.ataques||[]).length&&<div className="summon-no-actions">O Mestre ainda não cadastrou ações.</div>}</div>
    </div>}
  </div>;
}

function InvocacoesPanel({sheet,onChange,sheetColor,masterMode}){
  const invocations=Array.isArray(sheet.invocacoes)?sheet.invocacoes:[];
  const visible=masterMode?invocations:invocations.filter(summon=>summon.revealed===true);
  const save=next=>onChange({...sheet,invocacoes:next});
  const add=()=>{if(invocations.length<6)save([...invocations,newSummon(Date.now())]);};
  return <div className="summon-memory-panel"><div className="summon-memory-help">{masterMode?'Cadastre a criatura e use Revelar quando o necromante puder conhecê-la.':'Somente memórias reveladas pelo Mestre aparecem aqui. Uma memória autorizada pode ser liberada a qualquer momento.'}</div>{visible.map(summon=><SummonCard key={summon.id} summon={summon} ownerSheet={sheet} masterMode={masterMode} color={sheetColor} onChange={next=>save(invocations.map(item=>String(item.id)===String(summon.id)?next:item))} onDelete={()=>save(invocations.filter(item=>String(item.id)!==String(summon.id)))}/>)}{masterMode&&invocations.length<6&&<button className="summon-memory-add" onClick={add}>＋ Adicionar invocação ({invocations.length}/6)</button>}{!masterMode&&!visible.length&&<div className="summon-memory-empty">Nenhuma invocação foi revelada pelo Mestre.</div>}</div>;
}

`;

components = replaceRange(
  components,
  'const SUMMON_THREATS=',
  'const newSheet',
  summonComponents,
  'componentes das invocacoes',
);
must(components.includes("summon.revealed!==true"), 'segredo do Mestre ausente');
must(components.includes("'Liberar'"), 'botao Liberar ausente');
write(componentsFile, components);

const cssFile = 'src/experience/experience.css';
let css = read(cssFile);
if (!css.includes('/* NECROMANCER SUMMON CONTROL 2026-09-28 */')) css += `
/* NECROMANCER SUMMON CONTROL 2026-09-28 */
.summon-memory-slot.master.is-revealed{box-shadow:inset 3px 0 0 var(--summon-color),0 0 18px color-mix(in srgb,var(--summon-color) 10%,transparent)}
.summon-memory-slot.master.is-hidden{opacity:.82}.summon-master-actions{display:flex;align-items:center;gap:6px}.summon-master-actions button{width:auto!important;min-width:0;border-radius:7px;padding:5px 9px;font:700 8px Cinzel,serif;letter-spacing:.06em}.summon-reveal-button{border:1px solid color-mix(in srgb,var(--summon-color) 45%,transparent);background:color-mix(in srgb,var(--summon-color) 12%,transparent);color:#d7ccd9}.summon-delete-button{border:1px solid rgba(232,25,60,.25);background:rgba(232,25,60,.08);color:#e76b80}.summon-reveal-state{margin:-3px 0 9px;padding:6px 8px;border-radius:7px;background:color-mix(in srgb,var(--summon-color) 7%,transparent);font:700 7px Cinzel,serif;color:#887d8c;letter-spacing:.08em;text-transform:uppercase}
.summon-memory-add-attack{grid-template-columns:minmax(0,1fr) minmax(60px,.55fr) 54px 32px!important}.summon-memory-add-attack input:nth-child(4){grid-column:1/-2}.summon-memory-add-attack button{grid-column:-2;grid-row:1/3}
.player-summon-card{display:block!important;padding:13px;background:linear-gradient(135deg,color-mix(in srgb,var(--summon-color) 9%,rgba(6,5,10,.86)),rgba(6,5,10,.9))}.player-summon-card>header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.06)}.player-summon-card>header span{display:block;font:700 7px Cinzel,serif;color:color-mix(in srgb,var(--summon-color) 72%,#b8aebd);letter-spacing:.12em}.player-summon-card>header strong{display:block;margin-top:4px;font:800 13px Cinzel,serif;color:#ded5df}.summon-threat{text-align:right}.summon-threat b,.summon-threat small{display:block;font:700 7px Cinzel,serif;color:#887f8c}.summon-readonly-stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;margin:10px 0}.summon-readonly-stats>div{padding:6px 3px;border-radius:7px;border:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.018);text-align:center}.summon-readonly-stats small,.summon-readonly-stats b{display:block}.summon-readonly-stats small{overflow:hidden;text-overflow:ellipsis;font:600 6px Cinzel,serif;color:#6f6672}.summon-readonly-stats b{margin-top:3px;font:800 12px Cinzel,serif;color:#bdb3c0}.summon-release-row{display:grid;grid-template-columns:1fr auto;align-items:center;gap:4px 10px;padding:9px;border-radius:9px;border:1px solid color-mix(in srgb,var(--summon-color) 22%,transparent);background:color-mix(in srgb,var(--summon-color) 6%,transparent)}.summon-release-row b,.summon-release-row small{display:block}.summon-release-row b{font:800 9px Cinzel,serif;color:#bdb3c0}.summon-release-row small{margin-top:3px;font-size:9px;color:#746b78}.summon-release-row>button{grid-column:2;grid-row:1;padding:8px 13px;border-radius:8px;border:1px solid color-mix(in srgb,var(--summon-color) 48%,transparent);background:color-mix(in srgb,var(--summon-color) 18%,transparent);color:#eee4ef;font:800 9px Cinzel,serif}.summon-release-row>button:disabled{opacity:.38;cursor:not-allowed}.summon-release-warning{grid-column:1/-1;color:#e7a36b!important}.summon-live-controls{display:grid;gap:8px}.summon-vitals{display:grid;grid-template-columns:1fr 1fr;gap:7px}.summon-vitals>div{padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.055);background:rgba(0,0,0,.2);text-align:center}.summon-vitals small{display:block;margin-bottom:5px;font:700 6px Cinzel,serif;color:#6f6672;letter-spacing:.12em}.summon-vitals span{display:flex;align-items:center;justify-content:center;gap:8px}.summon-vitals b{font:800 12px Cinzel,serif;color:#d0c6d2}.summon-vitals button{width:26px;height:24px;border-radius:6px;border:1px solid rgba(232,25,60,.25);background:rgba(232,25,60,.08);color:#e78394}.summon-vitals button:last-child{border-color:rgba(74,222,128,.25);background:rgba(74,222,128,.08);color:#75d998}.summon-turn-state{padding:6px;text-align:center;border-radius:7px;background:color-mix(in srgb,var(--summon-color) 7%,transparent);font:700 7px Cinzel,serif;color:#8d8291;letter-spacing:.08em;text-transform:uppercase}.summon-player-actions{display:grid;gap:6px}.summon-player-actions>button{display:grid;grid-template-columns:1fr auto;text-align:left;padding:9px;border-radius:8px;border:1px solid color-mix(in srgb,var(--summon-color) 20%,transparent);background:rgba(255,255,255,.02);color:#c7bdca}.summon-player-actions>button span b,.summon-player-actions>button span small{display:block}.summon-player-actions>button span b{font:800 9px Cinzel,serif}.summon-player-actions>button span small{margin-top:3px;font-size:9px;color:#776e7b}.summon-player-actions>button em{font:800 8px Cinzel,serif;color:var(--summon-color);font-style:normal}.summon-player-actions>button p{grid-column:1/-1;margin:6px 0 0;font-size:10px;line-height:1.45;color:#8f8592}.summon-player-actions>button:disabled{opacity:.36;cursor:not-allowed}.summon-no-actions{padding:9px;text-align:center;font-size:9px;color:#6f6672}
@media(max-width:700px){.summon-readonly-stats{grid-template-columns:repeat(3,1fr)}.summon-memory-add-attack{grid-template-columns:1fr 70px!important}.summon-memory-add-attack input:nth-child(3){grid-column:auto!important}.summon-memory-add-attack input:nth-child(4){grid-column:1/-1}.summon-memory-add-attack button{grid-column:2;grid-row:2/4}.summon-vitals{grid-template-columns:1fr}.player-summon-card>header{align-items:stretch;flex-direction:column}.summon-threat{text-align:left}}
`;
if (!css.includes('/* SUMMON RELEASE READY PULSE 2026-09-28 */')) css += `
/* SUMMON RELEASE READY PULSE 2026-09-28 */
.summon-release-button.is-pulsing:not(:disabled){animation:summonReleaseReady 1.25s ease-in-out infinite;will-change:transform,box-shadow}
.summon-store-row{margin-bottom:8px;border-color:color-mix(in srgb,var(--summon-color) 36%,transparent);background:linear-gradient(90deg,color-mix(in srgb,var(--summon-color) 9%,transparent),rgba(0,0,0,.14))}.summon-store-button{border-color:rgba(232,160,32,.46)!important;background:rgba(232,160,32,.1)!important;color:#f0c879!important}
@keyframes summonReleaseReady{0%,100%{transform:scale(1);border-color:color-mix(in srgb,var(--summon-color) 42%,transparent);box-shadow:0 0 0 0 color-mix(in srgb,var(--summon-color) 0%,transparent)}50%{transform:scale(1.055);border-color:color-mix(in srgb,var(--summon-color) 88%,#fff);box-shadow:0 0 0 5px color-mix(in srgb,var(--summon-color) 8%,transparent),0 0 24px color-mix(in srgb,var(--summon-color) 42%,transparent)}}
@media(prefers-reduced-motion:reduce){.summon-release-button.is-pulsing:not(:disabled){animation:none}}
`;
write(cssFile, css);

for (const marker of [
  'isLiveDicePayload(payload',
  'joinedAtRef = useRef(Date.now())',
  'summon.revealed!==true',
  'vigos:3,maxVigos:3',
  'useSummonAction',
  "type:'summon_release'",
  'SUMMON RELEASE READY PULSE 2026-09-28',
  'NECROMANCER SUMMON CONTROL 2026-09-28',
]) {
  const sources = [replay, critical, kit, combatMode, realtime, realtimeCss, components, css];
  must(sources.some(source => source.includes(marker)), `marcador final ausente: ${marker}`);
}

console.log('Dinastia E: replay somente ao vivo e invocacoes revelaveis/controlaveis com 3 VC aplicados.');
