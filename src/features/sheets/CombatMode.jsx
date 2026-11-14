import { onSnapshot } from '../../adventure/sharedSnapshot';
import { useEffect,useRef,useState } from "react";
import { collection,doc,serverTimestamp,setDoc,updateDoc } from "firebase/firestore";
import { db } from "../../core/firebase";
import { applyRoundAutomation } from "../../experience/combatRoundEngine";
import { pushToast } from "../../core/toast";
import { hpColor } from "../../core/ui";
import { publishDiceResult } from "../../core/combatEvents";
import { SHEET_COLORS,STATUS_LIST,getSheetMaxHp } from "../../data/gameData";
const ENEMY_COLOR='#FF4444';
export default function CombatMode({ sheets, enemies, onClose, masterMode }) {
  const [round, setRound] = useState(1);
  const [turnIdx, setTurnIdx] = useState(0);
  const [initiative, setInitiative] = useState([]);
  const [releasedSummons, setReleasedSummons] = useState([]);
  const [rolling, setRolling] = useState(false);
  const [log, setLog] = useState([]);
  const loadedRef = useRef(false);
  const [diceResult, setDiceResult] = useState(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceSides, setDiceSides] = useState(20);
  const [diceBonus, setDiceBonus] = useState(0);
  const [showDice, setShowDice] = useState(false);
  const [surpriseTarget, setSurpriseTarget] = useState(null);
  const [surpriseAttacker, setSurpriseAttacker] = useState(null);
  const [showSurprisePanel, setShowSurprisePanel] = useState(false);
  const logRef = useRef(null);
  const [turnTimerEnabled, setTurnTimerEnabled] = useState(false);
  const [turnTimerSeconds, setTurnTimerSeconds] = useState(60);
  const [turnTimeLeft, setTurnTimeLeft] = useState(60);
  const [timerPaused, setTimerPaused] = useState(false);
  const [preparedAction, setPreparedAction] = useState('');
  const lastAction = [...log].reverse().find(x => x?.icon === '⚡' || x?.icon === '▸');

  useEffect(() => {
    if (!turnTimerEnabled || timerPaused || initiative.length === 0) return;
    const iv = setInterval(() => setTurnTimeLeft(v => {
      if (v <= 1) { pushToast('Tempo do turno encerrado!', '⏰', '#E8193C'); return turnTimerSeconds; }
      return v - 1;
    }), 1000);
    return () => clearInterval(iv);
  }, [turnTimerEnabled, timerPaused, turnTimerSeconds, initiative.length]);

  useEffect(() => { setTurnTimeLeft(turnTimerSeconds); }, [turnIdx, round, turnTimerSeconds]);

const syncStatusToSheet = async (combatant, statusId, active) => {
  if (!masterMode) return;
  try {
    const collectionName = combatant.type === 'player' ? 'sheets' : 'enemies';
    const entityId = combatant.id.replace(combatant.type === 'player' ? 'p_' : 'e_', '');
    const ref = doc(db, collectionName, String(entityId));
    await updateDoc(ref, { [`status.${statusId}`]: active });
    const s = STATUS_LIST.find(s => s.id === statusId);
    if (s) pushToast(`${combatant.nome}: ${active ? s.label : `Sem ${s.label}`}`, s.icon, active ? s.color : '#888');
  } catch(e) { console.error('Erro ao sincronizar status:', e); }
};
const [selectedPlayers, setSelectedPlayers] = useState(sheets.map(s => s.id));
const [selectedEnemies, setSelectedEnemies] = useState(enemies.map(e => e.id));
const [showSelector, setShowSelector] = useState(true);
const initialLoadDone = useRef(false);

useEffect(() => {
  const unsub = onSnapshot(doc(db, 'config', 'combat_state'), snap => {
    if (!snap.exists()) return;
    const d = snap.data();
    if (d.initiative !== undefined) setInitiative(d.initiative);
    if (d.round !== undefined) setRound(d.round);
    if (d.turnIdx !== undefined) setTurnIdx(d.turnIdx);
    if (d.log !== undefined) setLog(d.log);
    loadedRef.current = true;
  });
  return () => unsub();
}, []);

useEffect(() => {
  const unsub = onSnapshot(collection(db, 'combat_summons'), snap => {
    setReleasedSummons(snap.docs.map(item => ({ summonDocId:item.id, ...item.data() })).filter(item => item.active !== false));
  });
  return () => unsub();
}, []);

useEffect(() => {
  const unsub = onSnapshot(doc(db, 'config', 'public_dice_roll'), snap => {
    if (!snap.exists()) return;
    const d = snap.data();
    if (!d.ts || Date.now() - d.ts > 8000) return;
    setDiceResult(d);
  });
  return () => unsub();
}, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

const buildCombatants = () => [
  ...sheets.filter(s => selectedPlayers.includes(s.id)).map(s => ({
    id: `p_${s.id}`,
    nome: s.nome || 'Personagem',
    type: 'player',
    hp: s.hp || 0,
    maxHp: getSheetMaxHp(s),
    color: SHEET_COLORS[s.classe] || '#A855F7',
    foto: s.foto || '',
    agiBonus: Math.floor((s.agilidade || 0) / 2),
    perBonus: Math.floor((s.percepcao || 0) / 2),
    status: s.status || {},
    classe: s.classe || '',
    className: s.className || s.classeNome || s.classe || 'Aventureiro',
  })),
  ...enemies.filter(e => selectedEnemies.includes(e.id)).map(e => ({
    id: `e_${e.id}`,
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
    id: summon.id || `s_${summon.summonDocId}`,
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
];
  
  const persist = async (newInit, newRound, newTurnIdx, newLog) => {
    const ts=Date.now();
    try {
      await setDoc(doc(db,'config','combat_state'),{
        initiative:newInit ?? initiative,
        round:newRound ?? round,
        turnIdx:newTurnIdx ?? turnIdx,
        log:(newLog ?? log).slice(-60),
        updatedAt:ts,
        revision:ts,
      },{merge:true});
      loadedRef.current=true;
      return true;
    } catch(e){ console.error('Erro ao sincronizar estado do combate:',e); return false; }
  };

  const addLog = (msg, color = '#C8B8A0', icon = '▸') => {
    const newLog = [...log, { msg, color, icon, ts: Date.now(), round }].slice(-60);
    setLog(newLog); return newLog;
  };

  const rollInitiative = async () => {
    if(rolling)return;
    setRolling(true);
    pushToast('⚔️ O Combate foi Iniciado!','⚔️','#E8193C');
    try{
      const rolled=buildCombatants().map(c=>({...c,roll:Math.floor(Math.random()*20)+1+c.agiBonus}));
      rolled.sort((a,b)=>b.roll!==a.roll?b.roll-a.roll:b.perBonus!==a.perBonus?b.perBonus-a.perBonus:(a.type==='player'?-1:1));
      if(!rolled.length){pushToast('Selecione ao menos um combatente.','⚠️','#E8A020');return;}
      const ts=Date.now();
      const newLog=[...log,{msg:`🎲 Iniciativa rolada! ${rolled[0]?.nome} age primeiro (${rolled[0]?.roll})`,color:'#A855F7',icon:'🎲',ts,round:1}].slice(-60);
      setInitiative(rolled);setTurnIdx(0);setRound(1);setLog(newLog);setShowSelector(false);
      await Promise.all([
        setDoc(doc(db,'config','combat_state'),{initiative:rolled,round:1,turnIdx:0,log:newLog,updatedAt:ts,revision:ts},{merge:true}),
        setDoc(doc(db,'config','combat'),{active:true,round:1,currentNome:rolled[0]?.nome||'',currentColor:rolled[0]?.color||'#E8193C',currentType:rolled[0]?.type||'player',startedAt:ts,updatedAt:ts,revision:ts},{merge:true}),
      ]);
      loadedRef.current=true;
    }catch(error){
      console.error('Falha ao iniciar combate:',error);
      pushToast('Falha ao sincronizar o combate. Tente novamente.','⚠️','#E8193C');
    }finally{setRolling(false);}
  };

  const moveInitiativeTo = async (fromIndex,toIndex) => {
    if(!masterMode||fromIndex===toIndex)return;
    const list=[...initiative];
    if(fromIndex<0||toIndex<0||fromIndex>=list.length||toIndex>=list.length)return;
    const currentId=String(list[turnIdx]?.id||'');
    const [moved]=list.splice(fromIndex,1);list.splice(toIndex,0,moved);
    const nextIdx=Math.max(0,list.findIndex(c=>String(c.id)===currentId));
    setInitiative(list);setTurnIdx(nextIdx);
    await persist(list,round,nextIdx,log);
  };

  const moveInitiative = (idx, dir) => {
    if (!masterMode) return;const newInit=[...initiative];const currentId=String(newInit[turnIdx]?.id||'');
    if(dir===-1&&idx>0)[newInit[idx-1],newInit[idx]]=[newInit[idx],newInit[idx-1]];else if(dir===1&&idx<newInit.length-1)[newInit[idx+1],newInit[idx]]=[newInit[idx],newInit[idx+1]];else return;
    const nextIdx=Math.max(0,newInit.findIndex(c=>String(c.id)===currentId));setInitiative(newInit);setTurnIdx(nextIdx);persist(newInit,round,nextIdx,log);
  };

  const nextTurn = async () => {
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
        if(automation?.applied)pushToast('Rodada '+newRound+': cooldowns \u22121 e +2 Vigor C\u00F3smico','\u2726','#A855F7');
      }catch(error){console.error('Falha ao automatizar a rodada:',error);}
    }
    if(next===0)setRound(newRound);
    setTurnIdx(next);
    const combatant=syncedInit[next]||{};
    const ts=Date.now();
    let newLog=addLog('Vez de '+(combatant.nome||'combatente')+(next===0?' \u2014 Rodada '+newRound+' come\u00E7a!':''),combatant.color||'#C8B8A0','\u25B6');
    if(next===0&&automation?.applied){
      newLog=[...newLog,{msg:'\u2726 Cooldowns \u22121 \u00B7 +2 VC \u00B7 status processados',color:'#A855F7',icon:'\u2726',ts,round:newRound}].slice(-60);
      setLog(newLog);
    }
    const turnEvent={id:'turn_'+ts+'_'+next,type:'turn_announce',icon:'\u2694',text:combatant.nome||'Combatente',subtitle:combatant.className||combatant.classeName||combatant.classe||(combatant.type==='enemy'?'Inimigo':'Aventureiro'),color:combatant.color||'#A855F7',soft:false,ts,publishedAt:serverTimestamp()};
    window.dispatchEvent(new CustomEvent('dinastia:cosmic-live',{detail:turnEvent}));
    try{
      await Promise.all([
        setDoc(doc(db,'config','combat'),{active:true,round:newRound,currentNome:combatant.nome||'',currentColor:combatant.color||'#E8193C',currentType:combatant.type||'player',updatedAt:ts},{merge:true}),
        setDoc(doc(db,'cosmic_events',turnEvent.id),turnEvent,{merge:true}),
      ]);
    }catch(_){}
    await persist(syncedInit,newRound,next,newLog);
  };

  const triggerOpportunityAttack = async () => {
    if (!surpriseAttacker || !surpriseTarget) return;
    const atk = initiative.find(c => c.id === surpriseAttacker);
    const tgt = initiative.find(c => c.id === surpriseTarget);
    if (!atk || !tgt) return;
    const newLog = addLog(`⚡ ATAQUE DE OPORTUNIDADE! ${atk.nome} ataca ${tgt.nome} (${tgt.nome} tentou fugir!)`, '#FF6B35', '⚡');
    setShowSurprisePanel(false); setSurpriseAttacker(null); setSurpriseTarget(null);
    persist(initiative, round, turnIdx, newLog);
    pushToast(`⚡ Ataque de Oportunidade! ${atk.nome} → ${tgt.nome}`, '⚡', '#FF6B35'); // Dispara aviso global
  };

  const rollDice = async () => {
    setDiceRolling(true);
    setTimeout(async () => {
      const base = Math.floor(Math.random() * diceSides) + 1;
      const total = base + Number(diceBonus);
      const isCrit = diceSides === 20 && base === 20; const isFail = diceSides === 20 && base === 1;
      const result = { base, total, sides: diceSides, bonus: Number(diceBonus), roller: masterMode ? 'Mestre' : 'Jogador', ts: Date.now(), isCrit, isFail };
      setDiceResult(result); setDiceRolling(false);
      try { await publishDiceResult(result); } catch (e) { console.error('Erro ao publicar dado:', e); }
      const newLog = addLog(`${result.roller} rolou D${diceSides}${diceBonus ? ` +${diceBonus}` : ''}: ${total}${isCrit ? ' — CRÍTICO!' : isFail ? ' — FALHA CRÍTICA!' : ''}`, isCrit ? '#4ADE80' : isFail ? '#E8193C' : '#C8A8E8', isCrit ? '🌟' : isFail ? '💀' : '🎲');
      persist(initiative, round, turnIdx, newLog);
    }, 250);
  };

const handleClose = () => { onClose(); };

  const current = initiative[turnIdx];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9990, background: 'rgba(4,6,15,0.98)', display: 'flex', flexDirection: 'column', backdropFilter:'none', fontFamily: "'Cinzel',serif" }}>
      {showSelector && (
  <div style={{ padding: '12px 18px', background: 'rgba(232,160,32,0.05)', borderBottom: '1px solid rgba(232,160,32,0.2)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
    <div>
      <div style={{ fontSize: 10, color: '#E8A020', fontFamily: 'Cinzel,serif', marginBottom: 6 }}>JOGADORES</div>
      {sheets.map(s => (
        <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer', fontSize: 12, color: '#C8B8A0' }}>
          <input type="checkbox" checked={selectedPlayers.includes(s.id)}
            onChange={e => setSelectedPlayers(prev => e.target.checked ? [...prev, s.id] : prev.filter(x => x !== s.id))} />
          {s.nome || 'Personagem'}
        </label>
      ))}
    </div>
    <div>
      <div style={{ fontSize: 10, color: '#FF4444', fontFamily: 'Cinzel,serif', marginBottom: 6 }}>INIMIGOS</div>
      {enemies.map(e => (
        <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer', fontSize: 12, color: '#C8B8A0' }}>
          <input type="checkbox" checked={selectedEnemies.includes(e.id)}
            onChange={ev => setSelectedEnemies(prev => ev.target.checked ? [...prev, e.id] : prev.filter(x => x !== e.id))} />
          {e.nome || 'Inimigo'}
        </label>
      ))}
    </div>
  </div>
)}
      {/* HEADER */}
      <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(232,25,60,0.3)', background: 'rgba(232,25,60,0.06)', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>⚔️</span>
          <div>
            <div style={{ fontSize: 15, color: '#E8193C', fontWeight: 700 }}>Modo Combate</div>
            <div style={{ fontSize: 11, color: 'rgba(232,25,60,0.5)', letterSpacing: '0.15em' }}>Rodada {round} · {initiative.length} combatentes</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {masterMode && (
  <>
    <button onClick={() => setShowSelector(o => !o)} style={btnStyle('#E8A020')}>
      ⚙️ Participantes
    </button>

    {initiative.length === 0 && (
      <button
        onClick={() => {
          setLog([]);
          setRound(1);
          setTurnIdx(0);
          setInitiative([]);
          setDoc(doc(db, 'config', 'combat_state'), {
            initiative: [], round: 1, turnIdx: 0, log: []
          }).catch(() => {});
        }}
        style={btnStyle('rgba(255,255,255,0.15)')}
      >
        🗑 Limpar Registro
      </button>
    )}

    <button onClick={rollInitiative} disabled={rolling} style={btnStyle('#A855F7')}>
      {rolling ? '🎲 Rolando...' : '🎲 Rolar Iniciativa'}
    </button>

    {initiative.length > 0 && (
      <>
        <button onClick={() => setShowSurprisePanel(p => !p)} style={btnStyle('#FF6B35')}>⚡ Oportunidade</button>
        <button onClick={nextTurn} style={{ ...btnStyle('#E8193C'), animation: 'combatPulse 2s ease-in-out infinite', fontWeight: 700 }}>Próximo Turno ▶</button>
      </>
    )}
  </>
)}
          <button onClick={() => setShowDice(p => !p)} style={btnStyle('#4ADE80')}>🎲 {showDice ? 'Fechar Dado' : 'Dado Público'}</button>
          {masterMode && (
            <button onClick={async () => {
              await setDoc(doc(db, 'config', 'combat'), { active: false });
              await setDoc(doc(db, 'config', 'combat_state'), { initiative: [], round: 1, turnIdx: 0, log: [] });
              onClose();
            }} style={{ ...btnStyle('#E8193C'), fontWeight: 700, border: '1px solid rgba(232,25,60,0.6)' }}>
              ⚔️ Fim do Combate
            </button>
          )}
          <button onClick={handleClose} style={btnStyle('rgba(255,255,255,0.2)')}>✕ Fechar</button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* FILA VERTICAL (ESQUERDA) */}
        <div style={{ width: 100, background: 'rgba(0,0,0,0.4)', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', overflowY: 'auto', gap: 16, flexShrink: 0 }}>
          {initiative.length === 0 && <div style={{color: '#555', fontSize: 10, textAlign:'center'}}>Vazio</div>}
          {initiative.map((c, idx) => {
            const isActive = idx === turnIdx;
            const isDead = c.hp <= 0;
            const hpC = hpColor(c.hp, c.maxHp);

            return (
              <div key={c.id} draggable={masterMode} onDragStart={e=>{if(!masterMode)return;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(idx));e.currentTarget.style.opacity='.45'}} onDragEnd={e=>{e.currentTarget.style.opacity=isDead?'.38':'1'}} onDragOver={e=>{if(masterMode)e.preventDefault()}} onDrop={e=>{if(!masterMode)return;e.preventDefault();const from=Number(e.dataTransfer.getData('text/plain'));if(Number.isInteger(from))moveInitiativeTo(from,idx)}} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: isDead ? 0.38 : 1, position: 'relative', cursor:masterMode?'grab':'default', transition:'transform .18s ease, opacity .18s ease' }}>
                {masterMode && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: -4 }}>
                    <button onClick={() => moveInitiative(idx, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', color: idx === 0 ? 'transparent' : '#888', cursor: 'pointer', fontSize: 16, padding: 0 }}>▲</button>
                    <button onClick={() => moveInitiative(idx, 1)} disabled={idx === initiative.length - 1} style={{ background: 'none', border: 'none', color: idx === initiative.length - 1 ? 'transparent' : '#888', cursor: 'pointer', fontSize: 16, padding: 0 }}>▼</button>
                  </div>
                )}
                <div style={{
                  width: isActive ? 60 : 48, height: isActive ? 60 : 48, borderRadius: '50%',
                  border: `3px solid ${hpC}`, boxShadow: isActive ? `0 0 16px ${hpC}` : 'none',
                  overflow: 'hidden', background: c.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s'
                }}>
                  {c.foto ? <img src={c.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isDead ? 'grayscale(1)' : 'none' }} /> : <span style={{ fontSize: 20 }}>{c.type === 'enemy' ? '💀' : '⚔️'}</span>}
                </div>
                <div style={{ fontSize: 9, color: isActive ? hpC : '#777', fontWeight: isActive ? 700 : 400, maxWidth: 80, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isActive ? '▶ VEZ' : `#${idx + 1}`}
                  {/* Status rápido — apenas para o mestre */}
{masterMode && (
  <div style={{display:'flex',flexWrap:'wrap',gap:3,justifyContent:'center',maxWidth:88}}>
    {STATUS_LIST.map(s => {
      const active = !!(c.status?.[s.id]);
      return (
        <button
          key={s.id}
          title={`${active?'Remover':'Aplicar'}: ${s.label}`}
          onClick={() => {
            // Atualiza localmente na initiative
            const newInit = initiative.map(x =>
              x.id === c.id
                ? { ...x, status: { ...(x.status||{}), [s.id]: !active } }
                : x
            );
            setInitiative(newInit);
            persist(newInit, round, turnIdx, log);
            // Sincroniza com a ficha no Firebase
            syncStatusToSheet(c, s.id, !active);
          }}
          style={{
            width: 18, height: 18, borderRadius: '50%', padding: 0, border: 'none',
            background: active ? `${s.color}44` : 'rgba(255,255,255,0.05)',
            fontSize: 10, cursor: 'pointer', lineHeight: 1,
            boxShadow: active ? `0 0 5px ${s.color}88` : 'none',
            transition: 'all 0.2s', flexShrink: 0,
            filter: active ? 'none' : 'grayscale(1) opacity(0.35)',
          }}
        >{s.icon}</button>
      );
    })}
  </div>
)}
                </div>
              </div>
            );
          })}
        </div>

        {/* ÁREA PRINCIPAL E LOG (DIREITA) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* TURNO ATUAL INFO */}
          {current && (
            <div style={{ padding: '8px 18px', background: `${current.color}18`, borderBottom: `1px solid ${current.color}33`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, animation: 'turnArrow 0.6s ease-in-out infinite alternate' }}>▶</span>
              <span style={{ fontSize: 14, color: current.color, fontWeight: 700 }}>Vez de: {current.nome}</span>
              {current.roll > 0 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Ini: {current.roll} {current.agiBonus > 0 && `(D20 +${current.agiBonus})`}</span>}
            </div>
          )}

          {/* PAINEL SURPRESA */}
          {showSurprisePanel && masterMode && (
            <div style={{ padding: '12px 18px', background: 'rgba(255,107,53,0.08)', borderBottom: '1px solid rgba(255,107,53,0.3)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#FF6B35', fontWeight: 700 }}>⚡ Ataque de Oportunidade</span>
              <select value={surpriseAttacker || ''} onChange={e => setSurpriseAttacker(e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }}><option value="">Quem ataca...</option>{initiative.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
              <span style={{ color: '#FF6B35' }}>→</span>
              <select value={surpriseTarget || ''} onChange={e => setSurpriseTarget(e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }}><option value="">Quem deu as costas...</option>{initiative.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
              <button onClick={triggerOpportunityAttack} disabled={!surpriseAttacker || !surpriseTarget || surpriseAttacker === surpriseTarget} style={{ ...btnStyle('#FF6B35'), opacity: (!surpriseAttacker || !surpriseTarget || surpriseAttacker === surpriseTarget) ? 0.35 : 1 }}>⚡ Confirmar</button>
            </div>
          )}

          {/* AÇÕES RÁPIDAS E CRONÔMETRO */}
          {initiative.length > 0 && (
            <div style={{padding:'9px 18px',background:'rgba(168,85,247,.045)',borderBottom:'1px solid rgba(168,85,247,.14)',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <span style={{fontSize:10,color:'#8E72AD',letterSpacing:'.15em'}}>AÇÕES RÁPIDAS</span>
              <button onClick={()=>{const nl=addLog(`${current?.nome||'Personagem'} preparou uma ação${preparedAction?`: ${preparedAction}`:''}.`,'#E8A020','🛡');persist(initiative,round,turnIdx,nl);pushToast('Ação preparada','🛡','#E8A020');}} style={btnStyle('#E8A020')}>🛡 Preparar ação</button>
              <input value={preparedAction} onChange={e=>setPreparedAction(e.target.value)} placeholder="Ex: atacar quando se aproximar" style={{width:210,fontSize:11,padding:'5px 8px'}}/>
              <button disabled={!lastAction} onClick={()=>{if(!lastAction)return;const nl=addLog(`↻ ${lastAction.msg}`,'#C8A8E8','↻');persist(initiative,round,turnIdx,nl);}} style={{...btnStyle('#A855F7'),opacity:lastAction?1:.35}}>↻ Repetir última</button>
              <button onClick={()=>setTurnTimerEnabled(v=>!v)} style={btnStyle(turnTimerEnabled?'#4ADE80':'rgba(255,255,255,.18)')}>⏱ {turnTimerEnabled?'Timer ativo':'Ativar timer'}</button>
              {turnTimerEnabled && <>
                <select value={turnTimerSeconds} onChange={e=>setTurnTimerSeconds(Number(e.target.value))} style={{fontSize:11,padding:'4px 7px'}}><option value={30}>30s</option><option value={60}>60s</option><option value={90}>90s</option><option value={120}>120s</option></select>
                <span style={{fontFamily:'Cinzel,serif',fontSize:15,fontWeight:800,color:turnTimeLeft<=10?'#E8193C':'#C8A8E8',minWidth:42,textAlign:'center'}}>{Math.floor(turnTimeLeft/60)}:{String(turnTimeLeft%60).padStart(2,'0')}</span>
                <button onClick={()=>setTimerPaused(v=>!v)} style={btnStyle('#6A5AF7')}>{timerPaused?'▶':'⏸'}</button>
                <button onClick={()=>setTurnTimeLeft(turnTimerSeconds)} style={btnStyle('#6A5AF7')}>↺</button>
              </>}
            </div>
          )}

          {/* DADO PUBLICO */}
          {showDice && (
            <div style={{ padding: '12px 18px', background: 'rgba(74,222,128,0.05)', borderBottom: '1px solid rgba(74,222,128,0.18)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'rgba(74,222,128,0.6)' }}>🎲 DADO PÚBLICO</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[4, 6, 8, 10, 12, 20].map(d => (
                  <button key={d} onClick={() => setDiceSides(d)} style={{ padding: '4px 9px', borderRadius: 5, fontSize: 11, cursor: 'pointer', border: `1px solid ${diceSides === d ? 'rgba(74,222,128,0.55)' : 'rgba(255,255,255,0.09)'}`, background: diceSides === d ? 'rgba(74,222,128,0.14)' : 'rgba(255,255,255,0.02)', color: diceSides === d ? '#4ADE80' : '#6A6A6A' }}>D{d}</button>
                ))}
              </div>
              <input type="number" value={diceBonus} onChange={e => setDiceBonus(Number(e.target.value))} style={{ width: 46, fontSize: 12, textAlign: 'center', padding: '3px 5px' }} placeholder="Bônus" />
              <button onClick={rollDice} disabled={diceRolling} style={{ ...btnStyle('#4ADE80'), fontWeight: 700 }}>{diceRolling ? 'Rolando...' : `Rolar D${diceSides}`}</button>
              {diceResult && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 10, background: diceResult.isCrit ? 'rgba(74,222,128,0.1)' : diceResult.isFail ? 'rgba(232,25,60,0.1)' : 'rgba(168,85,247,0.08)' }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: diceResult.isCrit ? '#4ADE80' : diceResult.isFail ? '#E8193C' : '#C8A8E8' }}>{diceResult.total}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Crimson Text,serif' }}>D{diceResult.sides} · {diceResult.roller}</span>
                </div>
              )}
            </div>
          )}

          {/* LOG */}
          <div style={{ padding: '8px 18px 4px', fontSize: 9, letterSpacing: '0.28em', color: '#3A3050', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>📜 Registro de Combate</div>
          <div ref={logRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 18px 28px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {log.map((entry, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 10px', borderRadius: 6, background: i === log.length - 1 ? 'rgba(255,255,255,0.03)' : 'transparent', borderLeft: `2px solid ${i === log.length - 1 ? entry.color + '66' : 'transparent'}` }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>{entry.icon}</span>
                <span style={{ fontSize: 13, color: i === log.length - 1 ? entry.color : 'rgba(200,184,160,0.35)', lineHeight: 1.5, flex: 1 }}>{entry.msg}</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.1)' }}>R{entry.round}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
 function btnStyle(color) {
  return {
    padding: '7px 14px', borderRadius: 8,
    border: `1px solid ${color}55`,
    background: `${color}18`,
    color: color.startsWith('rgba') ? '#6A5A7A' : color,
    cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 11,
    letterSpacing: '0.06em', transition: 'all 0.2s',
  };
}

// ─── DADOS / CONSTANTES ───────────────────────────────────────────────────────
