import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../core/firebase';
import { SHEET_COLORS, getSheetMaxHp } from '../data/gameData';
import './master-battle.css';

const ENEMY_COLOR = '#E8193C';
const asId = value => String(value ?? '');
const bonus = value => Math.floor((Number(value) || 0) / 2);

function makePlayer(sheet) {
  return {
    id:`p_${sheet.id}`,
    type:'player',
    nome:sheet.nome || 'Personagem',
    hp:Number(sheet.hp || 0),
    maxHp:getSheetMaxHp(sheet),
    color:SHEET_COLORS[sheet.classe] || '#A855F7',
    foto:sheet.foto || '',
    agiBonus:bonus(sheet.agilidade),
    perBonus:bonus(sheet.percepcao),
    status:sheet.status || {},
  };
}

function makeEnemy(enemy) {
  const hp = Number(enemy.hp || 0);
  return {
    id:`e_${enemy.id}`,
    type:'enemy',
    nome:enemy.nome || 'Inimigo',
    hp,
    maxHp:Math.max(1, hp + Number(enemy.hp_bonus || 0)),
    color:ENEMY_COLOR,
    foto:enemy.foto || '',
    agiBonus:bonus(enemy.agilidade),
    perBonus:bonus(enemy.percepcao),
    status:enemy.status || {},
  };
}

function Avatar({ item, active=false }) {
  return (
    <span className={`mbc-avatar ${active ? 'active' : ''}`} style={{'--mbc-c':item?.color || '#A855F7'}}>
      {item?.foto ? <img src={item.foto} alt=""/> : <b>{item?.nome?.[0] || '?'}</b>}
    </span>
  );
}

export default function MasterBattleConsole() {
  const [sheets,setSheets]=useState([]);
  const [enemies,setEnemies]=useState([]);
  const [combat,setCombat]=useState({active:false});
  const [state,setState]=useState({initiative:[],round:1,turnIdx:0,log:[]});
  const [selectedPlayers,setSelectedPlayers]=useState([]);
  const [selectedEnemies,setSelectedEnemies]=useState([]);
  const [minimized,setMinimized]=useState(false);
  const [setupOpen,setSetupOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [confirmEnd,setConfirmEnd]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{
    const u1=onSnapshot(collection(db,'sheets'),snap=>setSheets(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const u2=onSnapshot(collection(db,'enemies'),snap=>setEnemies(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const u3=onSnapshot(doc(db,'config','combat'),snap=>setCombat(snap.exists()?(snap.data()||{active:false}):{active:false}));
    const u4=onSnapshot(doc(db,'config','combat_state'),snap=>setState(snap.exists()?(snap.data()||{initiative:[],round:1,turnIdx:0,log:[]}):{initiative:[],round:1,turnIdx:0,log:[]}));
    return()=>{u1();u2();u3();u4();};
  },[]);

  useEffect(()=>{
    if (!selectedPlayers.length && sheets.length) setSelectedPlayers(sheets.map(s=>asId(s.id)));
  },[sheets]);

  useEffect(()=>{
    if (combat.active) { setSetupOpen(false); setConfirmEnd(false); }
  },[combat.active]);

  const initiative=Array.isArray(state.initiative)?state.initiative:[];
  const turnIdx=Math.max(0,Math.min(initiative.length-1,Number(state.turnIdx||0)));
  const current=initiative[turnIdx] || null;
  const round=Number(state.round||combat.round||1);

  const selectedCount=selectedPlayers.length+selectedEnemies.length;
  const latestAction=useMemo(()=>[...(state.log||[])].reverse().find(x=>x?.msg),[state.log]);

  const toggle=(setter,list,id)=>setter(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);

  const startCombat=async()=>{
    if(busy)return;
    const combatants=[
      ...sheets.filter(s=>selectedPlayers.includes(asId(s.id))).map(makePlayer),
      ...enemies.filter(e=>selectedEnemies.includes(asId(e.id))).map(makeEnemy),
    ];
    if(!combatants.length){setError('Selecione ao menos um participante.');return;}
    setBusy(true);setError('');
    try{
      const rolled=combatants.map(c=>({...c,roll:Math.floor(Math.random()*20)+1+c.agiBonus}));
      rolled.sort((a,b)=>{
        if(b.roll!==a.roll)return b.roll-a.roll;
        if(b.perBonus!==a.perBonus)return b.perBonus-a.perBonus;
        return a.type==='player'?-1:1;
      });
      const first=rolled[0];
      const ts=Date.now();
      const log=[{msg:`🎲 Iniciativa rolada! ${first?.nome||'Combatente'} age primeiro (${first?.roll||0})`,color:'#A855F7',icon:'🎲',ts,round:1}];
      await Promise.all([
        setDoc(doc(db,'config','combat_state'),{initiative:rolled,round:1,turnIdx:0,log}),
        setDoc(doc(db,'config','combat'),{active:true,round:1,currentNome:first?.nome||'',currentColor:first?.color||ENEMY_COLOR,currentType:first?.type||'player',startedAt:ts,updatedAt:ts}),
      ]);
      setMinimized(false);
    }catch(err){console.error(err);setError('Não foi possível iniciar o combate.');}
    finally{setBusy(false);}
  };

  const setTurn=async idx=>{
    if(busy||!initiative.length)return;
    const safe=Math.max(0,Math.min(initiative.length-1,idx));
    const target=initiative[safe]||{};
    const ts=Date.now();
    const entry={msg:`Vez de ${target.nome||'combatente'}`,color:target.color||'#C8B8A0',icon:'▶',ts,round};
    const log=[...(state.log||[]),entry].slice(-60);
    setBusy(true);
    try{
      await Promise.all([
        setDoc(doc(db,'config','combat_state'),{...state,initiative,turnIdx:safe,round,log},{merge:true}),
        setDoc(doc(db,'config','combat'),{active:true,round,currentNome:target.nome||'',currentColor:target.color||ENEMY_COLOR,currentType:target.type||'player',updatedAt:ts},{merge:true}),
      ]);
    }finally{setBusy(false);}
  };

  const nextTurn=async()=>{
    if(busy||!initiative.length)return;
    const next=(turnIdx+1)%initiative.length;
    const newRound=next===0?round+1:round;
    const target=initiative[next]||{};
    const ts=Date.now();
    const entry={msg:`Vez de ${target.nome||'combatente'}${next===0?` — Rodada ${newRound} começa!`:''}`,color:target.color||'#C8B8A0',icon:'▶',ts,round:newRound};
    const log=[...(state.log||[]),entry].slice(-60);
    setBusy(true);
    try{
      await Promise.all([
        setDoc(doc(db,'config','combat_state'),{...state,initiative,turnIdx:next,round:newRound,log},{merge:true}),
        setDoc(doc(db,'config','combat'),{active:true,round:newRound,currentNome:target.nome||'',currentColor:target.color||ENEMY_COLOR,currentType:target.type||'player',updatedAt:ts},{merge:true}),
      ]);
    }finally{setBusy(false);}
  };

  const endCombat=async()=>{
    if(!confirmEnd){setConfirmEnd(true);window.setTimeout(()=>setConfirmEnd(false),3500);return;}
    setBusy(true);
    try{
      const ts=Date.now();
      await Promise.all([
        setDoc(doc(db,'config','combat'),{active:false,endedAt:ts,updatedAt:ts},{merge:true}),
        setDoc(doc(db,'config','combat_state'),{initiative:[],round:1,turnIdx:0,log:[]}),
      ]);
      setConfirmEnd(false);setSetupOpen(false);setMinimized(false);
    }finally{setBusy(false);}
  };

  if(minimized){
    return <button className={`mbc-orb ${combat.active?'live':''}`} onClick={()=>setMinimized(false)} title="Abrir controle de combate"><span>⚔</span>{combat.active&&<b>R{round}</b>}</button>;
  }

  return (
    <section className={`master-battle-console ${combat.active?'live':'idle'}`}>
      <header className="mbc-head">
        <div className="mbc-title"><span>⚔</span><div><small>MESTRE · CONTROLE LOCAL</small><b>{combat.active?'Combate em andamento':'Preparar combate'}</b></div></div>
        <div className="mbc-head-actions">
          {combat.active&&<span className="mbc-live-dot">AO VIVO</span>}
          <button onClick={()=>setMinimized(true)} title="Minimizar apenas para você">—</button>
        </div>
      </header>

      {!combat.active ? (
        <div className="mbc-setup">
          <div className="mbc-setup-summary">
            <div><strong>{selectedCount}</strong><span>participantes</span></div>
            <button className="mbc-secondary" onClick={()=>setSetupOpen(v=>!v)}>{setupOpen?'Ocultar seleção':'Escolher participantes'}</button>
            <button className="mbc-primary" disabled={busy||!selectedCount} onClick={startCombat}>{busy?'Preparando...':'🎲 Rolar iniciativa'}</button>
          </div>
          {error&&<div className="mbc-error">{error}</div>}
          {setupOpen&&<div className="mbc-picker">
            <div className="mbc-picker-col"><label>PERSONAGENS <button onClick={()=>setSelectedPlayers(selectedPlayers.length===sheets.length?[]:sheets.map(s=>asId(s.id)))}>todos</button></label>{sheets.map(s=>{const id=asId(s.id);const checked=selectedPlayers.includes(id);return <button key={id} className={checked?'selected':''} onClick={()=>toggle(setSelectedPlayers,selectedPlayers,id)}><Avatar item={{...s,color:SHEET_COLORS[s.classe]||'#A855F7'}}/><span>{s.nome||'Personagem'}</span><i>{checked?'✓':'○'}</i></button>})}</div>
            <div className="mbc-picker-col"><label>INIMIGOS <button onClick={()=>setSelectedEnemies(selectedEnemies.length===enemies.length?[]:enemies.map(e=>asId(e.id)))}>todos</button></label>{enemies.length?enemies.map(e=>{const id=asId(e.id);const checked=selectedEnemies.includes(id);return <button key={id} className={checked?'selected enemy':''} onClick={()=>toggle(setSelectedEnemies,selectedEnemies,id)}><Avatar item={{...e,color:ENEMY_COLOR}}/><span>{e.nome||'Inimigo'}</span><i>{checked?'✓':'○'}</i></button>}):<em>Nenhum inimigo cadastrado.</em>}</div>
          </div>}
        </div>
      ) : (
        <div className="mbc-active">
          <div className="mbc-current">
            <Avatar item={current} active/>
            <div><small>RODADA {round} · TURNO {initiative.length?turnIdx+1:0}/{initiative.length}</small><strong>{current?.nome||'Sem combatente'}</strong>{latestAction?.msg&&<span>{latestAction.msg}</span>}</div>
            <button className="mbc-next" disabled={busy||!initiative.length} onClick={nextTurn}>Próximo <b>▶</b></button>
          </div>
          <div className="mbc-initiative" title="Clique em um combatente para pular diretamente ao turno dele">
            {initiative.map((item,idx)=><button key={item.id||idx} className={`${idx===turnIdx?'active':''} ${item.type==='enemy'?'enemy':''}`} onClick={()=>setTurn(idx)} disabled={busy}><Avatar item={item} active={idx===turnIdx}/><span>{item.nome}</span><small>{item.roll||'—'}</small></button>)}
          </div>
          <div className="mbc-footer"><span>Minimizar este painel não encerra nem oculta o HUD dos jogadores.</span><button className={confirmEnd?'confirm':''} onClick={endCombat} disabled={busy}>{confirmEnd?'Confirmar fim':'Finalizar combate'}</button></div>
        </div>
      )}
    </section>
  );
}
