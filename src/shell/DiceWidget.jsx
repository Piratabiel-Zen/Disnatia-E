import { onSnapshot } from '../adventure/sharedSnapshot';
import { useEffect,useRef,useState } from "react";
import { doc} from "firebase/firestore";
import { db } from "../core/firebase";
import { publishDiceResult } from "../core/combatEvents";
import { CLASSES } from "../data/gameData";
import PhysicalDiceTray from "../experience/PhysicalDiceTray";
export function DiceTrayVisual({ sides, finalValue, rollTs, color, onSettled }) {
  const [display, setDisplay] = useState(finalValue);
  const [phase, setPhase] = useState('idle');
  const lastTs = useRef(0);
  const lastAmbientRevisionRef = useRef(0);

  useEffect(() => {
    if (!rollTs || rollTs === lastTs.current) return;
    lastTs.current = rollTs;
    setPhase('rolling');
    let ticks = 0;
    const iv = setInterval(() => {
      setDisplay(1 + Math.floor(Math.random() * sides));
      ticks++;
      if (ticks >= 14) {
        clearInterval(iv);
        setDisplay(finalValue);
        setPhase('settled');
        if (onSettled) onSettled();
      }
    }, 55);
    return () => clearInterval(iv);
  }, [rollTs, sides, finalValue]);

  const shapeStyle = (() => {
    switch (sides) {
      case 4: return { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' };
      case 8: return { transform: 'rotate(45deg)' };
      case 10: return { clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' };
      case 12: return { clipPath: 'polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)' };
      case 20: return { borderRadius: '50%' };
      default: return { borderRadius: 9 };
    }
  })();

  return (
    <div style={{ width: 116, height: 88, borderRadius: 18, background: 'radial-gradient(circle at 50% 35%,rgba(168,85,247,.12),rgba(0,0,0,.58) 68%)', border: '1px solid rgba(168,85,247,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 3px 18px rgba(0,0,0,0.72),0 8px 20px rgba(0,0,0,.35)', animation: phase === 'rolling' ? 'trayShake 0.28s ease-in-out infinite, diceGlowPulse .8s ease-in-out infinite' : 'diceGlowPulse 2.8s ease-in-out infinite', margin: '0 auto', position:'relative', overflow:'hidden' }}>
      <div style={{
        width: 54, height: sides === 8 ? 54 : 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(145deg, ${color}33, ${color}11)`, border: `1.5px solid ${color}88`,
        color, fontFamily: 'Cinzel,serif', fontWeight: 900, fontSize: 19, textShadow:`0 0 10px ${color}99`,
        animation: phase === 'rolling' ? 'diceTumble 0.5s linear infinite' : phase === 'settled' ? 'diceSettle 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
        ...shapeStyle,
      }}>
        <span style={{ transform: sides === 8 ? 'rotate(-45deg)' : 'none' }}>{display}</span>
      </div>
    </div>
  );
}

function DiceWidget({ access }) {
  const [open, setOpen] = useState(false);
  const [dice, setDice] = useState(20);
  const [count, setCount] = useState(1);
  const [bonus, setBonus] = useState(0);
  const [result, setResult] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [physicalRolling, setPhysicalRolling] = useState(false);
  const [combatActive, setCombatActive] = useState(false);
  const [rollerProfile, setRollerProfile] = useState({
    name: access?.name || (access?.role === 'master' ? 'Mestre' : 'Jogador'),
    color: access?.color || (access?.role === 'master' ? '#E8A020' : '#C8A8E8'),
    classId: access?.classId || '',
    className: access?.className || '',
  });

  useEffect(() => {
    if (access?.role !== 'player' || !access?.sheetId) {
      setRollerProfile({
        name: access?.name || (access?.role === 'master' ? 'Mestre' : 'Jogador'),
        color: access?.color || (access?.role === 'master' ? '#E8A020' : '#C8A8E8'),
        classId: access?.classId || '',
        className: access?.className || '',
      });
      return undefined;
    }
    const unsub = onSnapshot(doc(db, 'sheets', String(access.sheetId)), snap => {
      const sheet = snap.exists() ? (snap.data() || {}) : {};
      const classId = sheet.classe || access?.classId || '';
      const cls = CLASSES.find(c => String(c.id) === String(classId));
      setRollerProfile({
        name: sheet.nome || access?.name || 'Jogador',
        color: cls?.color || access?.color || '#C8A8E8',
        classId,
        className: cls?.name || access?.className || '',
      });
    }, () => {});
    return () => unsub();
  }, [access?.role, access?.sheetId, access?.name, access?.color, access?.classId, access?.className]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'combat'), snap => {
      if (snap.exists()) setCombatActive(snap.data().active || false);
    });
    return () => unsub();
  }, []);
  useEffect(() => {
    const openFromHud = () => setOpen(true);
    window.addEventListener('dinastia:open-dice', openFromHud);
    return () => window.removeEventListener('dinastia:open-dice', openFromHud);
  }, []);

  const roll = async () => {
    if (physicalRolling) return;
    setPhysicalRolling(true);
    const safeCount = Math.min(5, Math.max(1, Number(count) || 1));
    const values = Array.from({ length: safeCount }, () => Math.floor(Math.random() * dice) + 1);
    const base = values.reduce((sum, value) => sum + value, 0);
    const total = base + Number(bonus);
    const isCrit = dice === 20 && safeCount === 1 && values[0] === 20;
    const isFail = dice === 20 && safeCount === 1 && values[0] === 1;
    let sourceClientId = 'dice-client';
    try {
      // O identificador precisa ser por ABA, não por navegador inteiro. Assim duas
      // fichas abertas em abas diferentes do mesmo computador veem o replay mútuo.
      sourceClientId = sessionStorage.getItem('dinastia-dice-tab-id') || `dice_tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem('dinastia-dice-tab-id', sourceClientId);
    } catch (_) {}
    const rollId = 'roll_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    try { sessionStorage.setItem('dinastia-local-dice-roll-id', rollId); } catch (_) {}
    const res = {
      rollId, base, values, count: safeCount, total, sides: dice, bonus: Number(bonus), isCrit, isFail, ts: Date.now(),
      roller: access?.role === 'master' ? 'Mestre' : (rollerProfile.name || access?.name || 'Jogador'),
      rollerColor: access?.role === 'master' ? (access?.color || '#E8A020') : (rollerProfile.color || '#C8A8E8'),
      rollerClass: rollerProfile.classId || '',
      rollerClassName: rollerProfile.className || '',
      rollerSheetId: access?.sheetId ? String(access.sheetId) : '',
      rollerRole: access?.role === 'master' ? 'master' : 'player',
      audience: 'table',
      sourceClientId,
    };
    setResult(res);
    setRevealed(false);
    // O autor vê o crítico sem esperar o percurso de rede; o rollId evita duplicar
    // o efeito quando o mesmo evento retorna pelo Firebase.
    window.dispatchEvent(new CustomEvent('dinastia:dice-live', { detail: res }));
    try { await publishDiceResult(res); } catch (e) { console.error('Erro ao publicar dado:', e); }
  };

  return (
    <div className={`dice-widget ${open?'open':''}`} style={{position:'fixed', bottom: combatActive ? 96 : 24, right:16, zIndex:100, transition:'bottom 0.4s cubic-bezier(0.2,0.8,0.2,1)'}}>
      {!open && <button onClick={()=>setOpen(true)} style={{width:56, height:56, borderRadius:'50%', background:'rgba(168,85,247,0.15)', border:'1px solid rgba(168,85,247,0.4)', color:'#C8A8E8', fontSize:26, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 0 20px rgba(168,85,247,0.2)', backdropFilter:'none', transition:'all 0.3s'}}>🎲</button>}
      {open && (
        <div style={{background:'rgba(10,12,28,0.95)', border:'1px solid rgba(168,85,247,0.4)', borderRadius:16, padding:16, width:'min(360px, calc(100vw - 32px))', boxShadow:'0 10px 40px rgba(0,0,0,0.8)', backdropFilter:'none'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
            <div style={{fontFamily:'Cinzel,serif', fontSize:13, color:'#C8A8E8', letterSpacing:'0.1em'}}>Rolagem Cósmica</div>
            <button onClick={()=>{setOpen(false);setPhysicalRolling(false);}} style={{background:'transparent', border:'none', color:'#5A5070', cursor:'pointer', fontSize:14}}>✕</button>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6, marginBottom:12}}>
            {[4,6,8,10,12,20].map(d => <button key={d} onClick={()=>{setDice(d);setResult(null);}} style={{padding:'6px 0', borderRadius:6, border:`1px solid ${dice===d?'rgba(168,85,247,0.6)':'rgba(255,255,255,0.1)'}`, background:dice===d?'rgba(168,85,247,0.2)':'rgba(255,255,255,0.03)', color:dice===d?'#fff':'#9A8A7A', fontFamily:'Cinzel,serif', fontSize:12, cursor:'pointer', transition:'all 0.2s'}}>D{d}</button>)}
          </div>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
            <label style={{fontSize:11, color:'#7B6D8A', fontFamily:'Cinzel,serif'}}>Quantidade</label>
            <div style={{display:'flex', gap:5, marginLeft:'auto'}}>
              {[1,2,3,4,5].map(n => <button key={n} onClick={()=>{if(!physicalRolling){setCount(n);setResult(null);}}} style={{width:31,height:28,borderRadius:7,border:`1px solid ${count===n?'rgba(168,85,247,.65)':'rgba(255,255,255,.1)'}`,background:count===n?'rgba(168,85,247,.2)':'rgba(255,255,255,.03)',color:count===n?'#fff':'#8A7A92',fontFamily:'Cinzel,serif',cursor:'pointer'}}>{n}</button>)}
            </div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16}}>
            <label style={{fontSize:11, color:'#7B6D8A', fontFamily:'Cinzel,serif'}}>Bônus</label>
            <input type="number" value={bonus} onChange={e=>setBonus(Number(e.target.value))} style={{flex:1, textAlign:'center', padding:'4px', fontSize:14}} />
          </div>
          <button onClick={roll} disabled={physicalRolling} style={{width:'100%', padding:'10px', borderRadius:8, border:'1px solid rgba(168,85,247,0.5)', background:'rgba(168,85,247,0.15)', color:'#fff', fontFamily:'Cinzel,serif', fontSize:14, fontWeight:600, cursor:'pointer', transition:'all 0.2s', display:'flex', justifyContent:'center', alignItems:'center', gap:8}}>
            {physicalRolling ? '✦ Dados em movimento…' : `🎲 Rolar ${count > 1 ? `${count}D${dice}` : `D${dice}`}`}
          </button>
          {result && (
            <div style={{marginTop:16, paddingTop:16, borderTop:'1px dashed rgba(255,255,255,0.1)', textAlign:'center'}}>
              <PhysicalDiceTray
                sides={result.sides}
                finalValue={Array.isArray(result.values) ? result.values[0] : result.base}
                finalValues={result.values}
                rollTs={result.ts}
                color={rollerProfile.color || (result.isCrit?'#4ADE80':result.isFail?'#E8193C':'#C8A8E8')}
                total={result.total}
                bonus={result.bonus}
                onSettled={()=>{setRevealed(true);setPhysicalRolling(false);}}
              />


            </div>
          )}
        </div>
      )}
    </div>
  );
}


export default DiceWidget;
