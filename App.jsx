import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, collection, deleteDoc, getDoc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAnaJjwoJ6YgGrR5pIoPrTIj7PculaIfyA",
  authDomain: "dinastia-e-a4b28.firebaseapp.com",
  projectId: "dinastia-e-a4b28",
  storageBucket: "dinastia-e-a4b28.firebasestorage.app",
  messagingSenderId: "855332392669",
  appId: "1:855332392669:web:9fc06c8f633bb8cce89534",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

function compressImage(dataUrl, maxW=900, maxH=900, quality=0.72){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.width,h=img.height;
      if(w>maxW||h>maxH){const r=Math.min(maxW/w,maxH/h);w=Math.round(w*r);h=Math.round(h*r);}
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      resolve(canvas.toDataURL('image/jpeg',quality));
    };
    img.onerror=()=>resolve(dataUrl);
    img.src=dataUrl;
  });
}

// Versão PNG — preserva fundo transparente, usada nos tokens do mapa de batalha
function compressImagePNG(dataUrl, maxW=320, maxH=320){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.width,h=img.height;
      if(w>maxW||h>maxH){const r=Math.min(maxW/w,maxH/h);w=Math.round(w*r);h=Math.round(h*r);}
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror=()=>resolve(dataUrl);
    img.src=dataUrl;
  });
}

function compressImageSmall(dataUrl){
  return compressImage(dataUrl, 700, 700, 0.55);
}

const GLOBAL_CSS=`
@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
html,body,#root{margin:0;padding:0;height:100%;background:#04060F;}
*{box-sizing:border-box;}
.main-locked{overflow-y:hidden!important;}
::-webkit-scrollbar{width:5px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(155,89,182,0.4);border-radius:3px;}

@keyframes pageTurn {
  0% { opacity: 0; transform: translateY(12px) scale(0.99); filter: blur(3px); }
  100% { opacity: 1; transform: none; filter: blur(0); }
}
@keyframes diceRollAnim {
  0% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(-25deg) scale(1.15); }
  50% { transform: rotate(25deg) scale(1.15); }
  75% { transform: rotate(-15deg) scale(1.05); }
  100% { transform: rotate(0deg) scale(1); }
}
@keyframes diceTumble{
  0%{transform:rotate(0deg) scale(1);}
  20%{transform:rotate(140deg) scale(1.1);}
  45%{transform:rotate(230deg) scale(0.92);}
  70%{transform:rotate(320deg) scale(1.06);}
  100%{transform:rotate(420deg) scale(1);}
}
@keyframes diceSettle{
  0%{transform:translateY(-14px) scale(1.18);}
  55%{transform:translateY(3px) scale(0.95);}
  75%{transform:translateY(-2px) scale(1.03);}
  100%{transform:translateY(0) scale(1);}
}
@keyframes trayShake{
  0%,100%{transform:translateX(0);}
  25%{transform:translateX(-2px);}
  75%{transform:translateX(2px);}
}
@keyframes shimmer{0%,100%{opacity:0.4}50%{opacity:1}}
@keyframes revealCoord{from{opacity:0;letter-spacing:0.6em}to{opacity:1;letter-spacing:0.25em}}
@keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}}
@keyframes attrPulse{0%,100%{box-shadow:0 0 0 0 rgba(168,85,247,0.7);transform:scale(1);}50%{box-shadow:0 0 0 5px rgba(168,85,247,0);transform:scale(1.18);}}
@keyframes bannerGlow{0%,100%{box-shadow:0 0 16px rgba(168,85,247,0.4),0 0 32px rgba(168,85,247,0.15);}50%{box-shadow:0 0 24px rgba(168,85,247,0.7),0 0 48px rgba(168,85,247,0.3);}}
@keyframes pinDrop{0%{transform:translateY(-10px) scale(0.5);opacity:0;}100%{transform:translateY(0) scale(1);opacity:1;}}
@keyframes cooldownIn{0%{opacity:0;transform:scale(0.85);}100%{opacity:1;transform:scale(1);}}
@keyframes toastIn{0%{opacity:0;transform:translateX(-50%) translateY(20px) scale(0.92);}100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}}
@keyframes toastOut{0%{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}100%{opacity:0;transform:translateX(-50%) translateY(-12px) scale(0.94);}}
@keyframes levelUpBurst{0%{opacity:0;transform:scale(0.5);}60%{opacity:1;transform:scale(1.08);}100%{opacity:1;transform:scale(1);}}
@keyframes particleFly{0%{opacity:1;transform:translate(0,0) scale(1);}100%{opacity:0;transform:translate(var(--px),var(--py)) scale(0);}}
@keyframes combatPulse{0%,100%{box-shadow:0 0 0 0 rgba(232,25,60,0.5);}50%{box-shadow:0 0 0 8px rgba(232,25,60,0);}}
@keyframes turnArrow{0%{transform:translateX(-4px);}100%{transform:translateX(4px);}}
@keyframes atmosphereShift{0%{opacity:0;}100%{opacity:1;}}

input,textarea,select{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.11);color:#C8B8A0;border-radius:6px;font-family:'Crimson Text',Georgia,serif;font-size:15px;padding:6px 10px;outline:none;transition:border-color 0.2s;}
input:focus,textarea:focus,select:focus{border-color:rgba(155,89,182,0.55);}
input[type=number]::-webkit-inner-spin-button{opacity:1;}
select option{background:#0E1020;}
button{font-family:'Crimson Text',Georgia,serif;}
.prologue-grid{display:grid;grid-template-columns:360px 1fr;gap:28px;align-items:start;}
.prologue-cover{position:relative;border-radius:16px;overflow:hidden;border:1px solid rgba(168,85,247,0.25);background:radial-gradient(circle at 30% 20%,rgba(168,85,247,0.18),transparent 60%),#04060F;height:420px;cursor:pointer;box-shadow:0 10px 40px rgba(168,85,247,0.12);flex-shrink:0;}
.prologue-image-wrapper{position:absolute;inset:0;width:100%;height:100%;overflow:hidden;border-radius:inherit;}
.prologue-image-wrapper img{width:100%;height:100%;display:block;object-fit:cover;object-position:center;}
.prologue-cover-placeholder{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:30px;text-align:center;}
.prologue-title-card{margin-bottom:20px;}
.classes-grid{display:grid;grid-template-columns:230px 1fr;gap:22px;align-items:start;}
.classes-list{display:flex;flex-direction:column;gap:7px;}
.classes-list-item{display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:10px;cursor:pointer;transition:all 0.2s;text-align:left;}
.class-detail-grid{display:grid;grid-template-columns:280px 1fr;gap:20px;align-items:start;}
.class-illustration{position:relative;border-radius:16px;overflow:hidden;height:380px;background:#04060F;cursor:pointer;flex-shrink:0;}
.class-image-wrapper{position:absolute;inset:0;width:100%;height:100%;overflow:hidden;border-radius:inherit;}
.class-image-wrapper img{width:100%;height:100%;display:block;object-fit:cover;object-position:center;}
.class-illustration-placeholder{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center;}

@media(max-width:600px){
  .classes-grid{grid-template-columns:1fr!important;}
  .class-detail-grid{grid-template-columns:1fr!important;}
  .class-illustration{height:220px!important;}
  .main-locked{overflow-y:auto!important;}
  .attrs-personality-row{grid-template-columns:1fr!important;}
  .header-sub{display:none!important;}
  .header-title{font-size:18px!important; margin-left: 20px!important;}
  .attr-dots{flex-wrap:wrap;}
  .attr-dots button{width:12px!important;height:12px!important;}
  .vigos-dots button{width:18px!important;height:18px!important;}
  .sheet-stats-grid{grid-template-columns:1fr 1fr!important;}
  .enemy-stats-grid{grid-template-columns:1fr 1fr!important;}
  .sheet-specials-row{flex-direction:column!important;align-items:flex-start!important;}
  .attr-label{min-width:72px!important;font-size:10px!important;}
  .nome-classe-row{flex-direction:column!important;align-items:stretch!important;}
  .nome-classe-row>div,.nome-classe-row select{width:100%!important;}
  nav{overflow-x:auto;flex-wrap:nowrap!important;justify-content:flex-start!important;padding:7px 10px!important;}
  nav button{flex-shrink:0;white-space:nowrap;}
  .sheet-tabs-nav{overflow-x:auto;flex-wrap:nowrap!important;}
  .sheet-tabs-nav button{flex-shrink:0;}
  .equip-grid{grid-template-columns:1fr!important; gap: 16px!important;}
  .equip-slot-inputs { flex-direction: column !important; gap: 6px !important; }
  .equip-slot-inputs input { width: 100% !important; flex: none !important; }
  .prologue-grid{grid-template-columns:1fr!important;}
  .prologue-cover{height:220px!important;}
  .floating-sheet{left:8px!important; top:8px!important; width:calc(100vw - 16px)!important; max-height:calc(100vh - 16px)!important;}
  .battlemap-bottombar{left:8px!important; max-width:calc(100vw - 16px)!important;}
  .battlemap-zoom-controls{right:8px!important;}
}
@media(max-width:400px){
  .sheet-stats-grid{grid-template-columns:1fr!important;}
  .enemy-stats-grid{grid-template-columns:1fr!important;}
  .attr-dots button{width:11px!important;height:11px!important;}
}
`;

const SHEET_COLORS={fogo:'#1EC8FF',escarlate:'#E8193C',corvos:'#E8A020',magos:'#A855F7',marfim:'#4ADE80',necromante:'#6E6E80',bardo:'#FFD86B',arcanjo:'#5B2C8C',personalizado:'#C0C0C0'};
const SHEET_GLOWS={fogo:'rgba(30,200,255,0.16)',escarlate:'rgba(232,25,60,0.16)',corvos:'rgba(232,160,32,0.16)',magos:'rgba(168,85,247,0.16)',marfim:'rgba(74,222,128,0.16)',necromante:'rgba(110,110,128,0.18)',bardo:'rgba(255,216,107,0.18)',arcanjo:'rgba(91,44,140,0.2)',personalizado:'rgba(192,192,192,0.16)'};
const MASTER_PIN='dinastia';

// ─── 🌦️ ATMOSPHERE SYSTEM ────────────────────────────────────────────────────
const ATMOSPHERES = {
  neutro:    { label: 'Neutro',      icon: '🌌', accent: '#A855F7', bg: '#04060F', starColor: null },
  combate:   { label: 'Combate',     icon: '⚔️',  accent: '#E8193C', bg: '#0F0408', starColor: '#FF4444' },
  misterio:  { label: 'Mistério',    icon: '🌫️',  accent: '#6A5AF7', bg: '#040812', starColor: '#6A8AFF' },
  exploracao:{ label: 'Exploração',  icon: '🌿',  accent: '#4ADE80', bg: '#040F08', starColor: '#4ADE80' },
  descanso:  { label: 'Descanso',    icon: '🌙',  accent: '#E8A020', bg: '#080604', starColor: '#FFD070' },
  tensao:    { label: 'Tensão',      icon: '⚡',  accent: '#FF6B35', bg: '#0F0600', starColor: '#FF8C42' },
};

function AtmosphereWidget({ masterMode, atmosphere, onSet }) {
  const [open, setOpen] = useState(false);
  const atm = ATMOSPHERES[atmosphere] || ATMOSPHERES.neutro;

  if (!masterMode && atmosphere === 'neutro') return null;

  return (
    <div style={{ position: 'fixed', top: 14, left: 16, zIndex: 200 }}>
      {!open && (
        <button
          onClick={() => masterMode && setOpen(true)}
          title={`Atmosfera: ${atm.label}`}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            cursor: masterMode ? 'pointer' : 'default',
            border: `1px solid ${atm.accent}55`, background: `${atm.accent}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, backdropFilter: 'blur(6px)',
            boxShadow: atmosphere !== 'neutro' ? `0 0 12px ${atm.accent}44` : 'none',
            transition: 'all 0.3s',
          }}
        >
          {atm.icon}
        </button>
      )}

      {open && masterMode && (
        <div style={{ background: 'rgba(10,12,28,0.97)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 14, padding: 14, width: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontFamily: 'Cinzel,serif', fontSize: 12, color: '#C8A8E8', letterSpacing: '0.1em' }}>Atmosfera</span>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#5A5070', cursor: 'pointer', fontSize: 13 }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {Object.entries(ATMOSPHERES).map(([key, a]) => (
              <button key={key} onClick={() => { onSet(key); setOpen(false); pushToast(`Atmosfera: ${a.label}`, a.icon, a.accent); }} style={{
                padding: '7px 10px', borderRadius: 8, border: `1px solid ${atmosphere === key ? a.accent + '66' : 'rgba(255,255,255,0.06)'}`,
                background: atmosphere === key ? `${a.accent}18` : 'rgba(255,255,255,0.02)',
                color: atmosphere === key ? a.accent : '#8A7A9A', cursor: 'pointer',
                fontFamily: 'Cinzel,serif', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.2s', textAlign: 'left',
              }}>
                <span>{a.icon}</span><span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 🔔 TOAST NOTIFICATION SYSTEM ────────────────────────────────────────────
const toastListeners = [];
function emitToast(msg, icon='✦', color='#C8A8E8') {
  toastListeners.forEach(fn => fn({ msg, icon, color, id: Date.now() + Math.random() }));
}

function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    const handler = (t) => {
      setToasts(prev => [...prev.slice(-3), { ...t, dying: false }]);
      setTimeout(() => {
        setToasts(prev => prev.map(x => x.id === t.id ? { ...x, dying: true } : x));
        setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 500);
      }, 3500);
    };
    toastListeners.push(handler);
    return () => { const i = toastListeners.indexOf(handler); if (i > -1) toastListeners.splice(i, 1); };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'lastToast'), snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (!d.msg || !d.ts) return;
      if (Date.now() - d.ts > 4000) return;
      const t = { msg: d.msg, icon: d.icon || '✦', color: d.color || '#C8A8E8', id: d.ts + Math.random() };
      setToasts(prev => [...prev.slice(-3), { ...t, dying: false }]);
      setTimeout(() => {
        setToasts(prev => prev.map(x => x.id === t.id ? { ...x, dying: true } : x));
        setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 500);
      }, 3500);
    });
    return () => unsub();
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: 'rgba(8,10,24,0.97)', border: `1px solid ${t.color}55`,
          borderRadius: 12, padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: `0 4px 24px rgba(0,0,0,0.7), 0 0 16px ${t.color}33`,
          animation: t.dying ? 'toastOut 0.4s ease forwards' : 'toastIn 0.4s cubic-bezier(0.2,0.8,0.2,1) forwards',
          backdropFilter: 'blur(12px)', minWidth: 220, maxWidth: 340,
          transform: 'translateX(-50%)',
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{t.icon}</span>
          <span style={{ fontFamily: 'Cinzel,serif', fontSize: 13, color: t.color, letterSpacing: '0.04em', lineHeight: 1.4 }}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

async function pushToast(msg, icon='✦', color='#C8A8E8') {
  try {
    await setDoc(doc(db, 'config', 'lastToast'), { msg, icon, color, ts: Date.now() });
  } catch(e) { console.error(e); }
}
// Registra ação de habilidade no log do combate (funciona de qualquer componente)
async function logAbilityUsed(characterName, abilityName, cost, color = '#C8A8E8') {
  try {
    const snap = await getDoc(doc(db, 'config', 'combat_state'));
    if (!snap.exists()) return;
    const d = snap.data();
    if (!d.round) return; // combate não está ativo
    const entry = {
      msg: `${characterName} usou ${abilityName}${cost > 0 ? ` (−${cost} VC)` : ''}`,
      color, icon: '⚡', ts: Date.now(), round: d.round || 1
    };
    const newLog = [...(d.log || []), entry].slice(-60);
    await updateDoc(doc(db, 'config', 'combat_state'), { log: newLog });
  } catch (e) { /* silencioso fora do combate */ }
}
// ─── ✨ LEVEL UP SCREEN ───────────────────────────────────────────────────────
function LevelUpScreen({ data, onClose }) {
  const [phase, setPhase] = useState('burst');
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 400);
    const t2 = setTimeout(() => setPhase('fade'), 4000);
    const t3 = setTimeout(() => onClose(), 4600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  const color = data.color || '#A855F7';
  const particles = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * Math.PI * 2;
    const dist = 80 + Math.random() * 120;
    return { px: `${Math.cos(angle) * dist}px`, py: `${Math.sin(angle) * dist}px`, delay: Math.random() * 0.6 };
  });
  return (
    <div style={{ position:'fixed',inset:0,zIndex:9998,background:phase==='fade'?'rgba(0,0,0,0)':'rgba(0,0,0,0.88)',display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.6s',pointerEvents:phase==='fade'?'none':'auto' }} onClick={onClose}>
      <div style={{ position:'relative',textAlign:'center' }}>
        {particles.map((p,i)=>(
          <div key={i} style={{ position:'absolute',top:'50%',left:'50%',width:6,height:6,borderRadius:'50%',background:color,boxShadow:`0 0 6px ${color}`,'--px':p.px,'--py':p.py,animation:`particleFly 1.2s ease-out ${p.delay}s forwards` }}/>
        ))}
        <div style={{ animation:'levelUpBurst 0.6s cubic-bezier(0.2,0.8,0.2,1) forwards',opacity:phase==='fade'?0:1,transition:'opacity 0.6s' }}>
          <div style={{ fontSize:14,letterSpacing:'0.5em',color:`${color}AA`,fontFamily:'Cinzel,serif',marginBottom:16,textTransform:'uppercase' }}>Ascensão Cósmica</div>
          <div style={{ fontFamily:'Cinzel Decorative,serif',fontSize:36,fontWeight:900,color,textShadow:`0 0 40px ${color}, 0 0 80px ${color}66`,marginBottom:12,lineHeight:1.2 }}>{data.nome}</div>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:16,marginBottom:20 }}>
            <div style={{ width:60,height:1,background:`linear-gradient(90deg,transparent,${color})` }}/>
            <div style={{ fontFamily:'Cinzel,serif',fontSize:22,color:'#E8D8C0',letterSpacing:'0.1em' }}>Nível {data.nivel}</div>
            <div style={{ width:60,height:1,background:`linear-gradient(90deg,${color},transparent)` }}/>
          </div>
          <div style={{ fontSize:13,color:'rgba(255,255,255,0.4)',fontFamily:'Cinzel,serif',letterSpacing:'0.2em' }}>
            ✦ {data.nivel<=3?'Aprendiz Cósmico':data.nivel<=6?'Portador do Destino':data.nivel<=9?'Arauto do Fim':data.nivel<=14?'Guardião Estelar':data.nivel<=19?'Ascendente':data.nivel<=24?'Transcendente':data.nivel<=29?'Arauto Supremo':'Lenda Cósmica'} ✦
          </div>
        </div>
      </div>
    </div>
  );
}
function hpColor(hp, maxHp) {
  if (hp <= 0) return '#555555'; // Cinza (Morto)
  const pct = hp / Math.max(1, maxHp);
  if (pct > 0.6) return '#4ADE80'; // Verde (>60%)
  if (pct > 0.3) return '#E8A020'; // Amarelo (30% - 60%)
  return '#E8193C'; // Vermelho (<30%)
}
// ─── ⚔️ MODO COMBATE ─────────────────────────────────────────────────────────
function CombatMode({ sheets, enemies, onClose, masterMode }) {
  const [round, setRound] = useState(1);
  const [turnIdx, setTurnIdx] = useState(0);
  const [initiative, setInitiative] = useState([]);
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
  const unsub = onSnapshot(doc(db, 'config', 'combat_dice'), snap => {
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
    maxHp: (s.hp || 0) + (s.hp_bonus || 0),
    color: SHEET_COLORS[s.classe] || '#A855F7',
    foto: s.foto || '',
    agiBonus: Math.floor((s.agilidade || 0) / 2),
    perBonus: Math.floor((s.percepcao || 0) / 2),
    status: s.status || {},
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
  })),
];
  
  const persist = async (newInit, newRound, newTurnIdx, newLog) => {
    if (!loadedRef.current) return;
    try { await setDoc(doc(db, 'config', 'combat_state'), { initiative: newInit ?? initiative, round: newRound ?? round, turnIdx: newTurnIdx ?? turnIdx, log: (newLog ?? log).slice(-60) }); } catch (e) { console.error(e); }
  };

  const addLog = (msg, color = '#C8B8A0', icon = '▸') => {
    const newLog = [...log, { msg, color, icon, ts: Date.now(), round }].slice(-60);
    setLog(newLog); return newLog;
  };

  const rollInitiative = async () => {
    setRolling(true);
    // ALERTA GLOBAL DO COMEÇO DO COMBATE:
    pushToast('⚔️ O Combate foi Iniciado!', '⚔️', '#E8193C');
    
    setTimeout(async () => {
      const rolled = buildCombatants().map(c => ({ ...c, roll: Math.floor(Math.random() * 20) + 1 + c.agiBonus }));
      rolled.sort((a, b) => {
        if (b.roll !== a.roll) return b.roll - a.roll;
        if (b.perBonus !== a.perBonus) return b.perBonus - a.perBonus; // Desempate por Percepção
        return a.type === 'player' ? -1 : 1;
      });

      const newLog = addLog(`🎲 Iniciativa rolada! ${rolled[0]?.nome} age primeiro (${rolled[0]?.roll})`, '#A855F7', '🎲');
      setInitiative(rolled); setTurnIdx(0); setRound(1); setRolling(false);
      try { await setDoc(doc(db, 'config', 'combat'), { active: true, round: 1, currentNome: rolled[0]?.nome || '', currentColor: rolled[0]?.color || '#E8193C', currentType: rolled[0]?.type || 'player' }); } catch (_) {}
      persist(rolled, 1, 0, newLog);
    }, 900);
  };

  const moveInitiative = (idx, dir) => {
    if (!masterMode) return;
    const newInit = [...initiative];
    if (dir === -1 && idx > 0) [newInit[idx - 1], newInit[idx]] = [newInit[idx], newInit[idx - 1]];
    else if (dir === 1 && idx < newInit.length - 1) [newInit[idx + 1], newInit[idx]] = [newInit[idx], newInit[idx + 1]];
    else return;
    setInitiative(newInit);
    persist(newInit, round, turnIdx, log);
  };

  const nextTurn = async () => {
    const next = (turnIdx + 1) % initiative.length;
    const newRound = next === 0 ? round + 1 : round;
    if (next === 0) setRound(newRound);
    setTurnIdx(next);
    const c = initiative[next];
    const newLog = addLog(`Vez de ${c?.nome}${next === 0 ? ` — Rodada ${newRound} começa!` : ''}`, c?.color || '#C8B8A0', '▶');
    try { await setDoc(doc(db, 'config', 'combat'), { active: true, round: newRound, currentNome: c?.nome || '', currentColor: c?.color || '#E8193C', currentType: c?.type || 'player' }); } catch (_) {}
    persist(initiative, newRound, next, newLog);
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
      try { await setDoc(doc(db, 'config', 'combat_dice'), result); } catch (e) {}
      const newLog = addLog(`${result.roller} rolou D${diceSides}${diceBonus ? ` +${diceBonus}` : ''}: ${total}${isCrit ? ' — CRÍTICO!' : isFail ? ' — FALHA CRÍTICA!' : ''}`, isCrit ? '#4ADE80' : isFail ? '#E8193C' : '#C8A8E8', isCrit ? '🌟' : isFail ? '💀' : '🎲');
      persist(initiative, round, turnIdx, newLog);
    }, 700);
  };

const handleClose = () => {
  onClose();
  setDoc(doc(db, 'config', 'combat'), { active: false }).catch(() => {});
};

  const current = initiative[turnIdx];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9990, background: 'rgba(4,6,15,0.98)', display: 'flex', flexDirection: 'column', backdropFilter: 'blur(4px)', fontFamily: "'Cinzel',serif" }}>
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
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: isDead ? 0.38 : 1, position: 'relative' }}>
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
const STATUS_LIST = [
  { id: 'envenenado',  label: 'Envenenado',   icon: '☠',  color: '#4ADE80' },
  { id: 'sangrando',   label: 'Sangrando',    icon: '🩸', color: '#E8193C' },
  { id: 'atordoado',   label: 'Atordoado',    icon: '💫', color: '#E8A020' },
  { id: 'queimando',   label: 'Queimando',    icon: '🔥', color: '#FF6B35' },
  { id: 'congelado',   label: 'Congelado',    icon: '✦',  color: '#1EC8FF' },
  { id: 'amaldicado',  label: 'Amaldicado',   icon: '💀', color: '#A855F7' },
  { id: 'invisivel',   label: 'Invisivel',    icon: '👻', color: '#C8B8A0' },
  { id: 'protegido',   label: 'Protegido',    icon: '🛡', color: '#4ADE80' },
];

const CLASSES=[
  {id:'personalizado',alcance:'—',name:'Personalizado',icon:'⚙️',color:'#C0C0C0',glow:'rgba(192,192,192,0.16)',role:'Classe Personalizada · Definida pelo Mestre',lore:`Esta ficha possui uma classe personalizada, criada exclusivamente pelo Mestre para este personagem. Suas habilidades, origem e poderes são únicos e revelados ao longo da campanha.`,passive:{name:'—',desc:'Habilidades definidas pelo Mestre.'},normal:[],specials:[]},
  {id:'fogo',alcance:'1m',name:'Assassinos do Fogo Azul',icon:'🔥',color:'#1EC8FF',glow:'rgba(30,200,255,0.16)',role:'Assassino · DPS Furtivo',lore:`Nos antigos e brutais campos de batalha, onde a morte era constante, alguns guerreiros descobriram como sobreviver canalizando a energia vital que emanava dos corpos caídos. Eles absorviam não apenas a vida esvaída, mas a pura vontade de lutar e a fúria dos mortos. Esta energia manifestou-se como uma chama azul incandescente que queima dentro deles, fortalecendo músculos e reflexos a níveis sobre-humanos, permitindo-lhes mover-se com velocidade letal e desferir ataques devastadores antes mesmo de serem notados.`,passive:{name:'Energia Vital',desc:'A cada 3 rodadas ganha 2 pontos para incluir em quaisquer bônus de ação. +1 ponto armazenado por inimigo abatido (acumulativo), podendo ser usado a qualquer momento.'},normal:[{name:'Esquiva da Catedral',cost:2,cooldown:'4 rodadas',desc:'Esquiva de qualquer ataque ficando translúcido e completamente intangível, mesmo fora do seu turno. Não pode ser usada novamente por 4 rodadas.'},{name:'Golpe Cintilante',cost:2,cooldown:'3 rodadas', dano: '1D8 + Agilidade' ,desc:'Embui um objeto com chamas de plasma e efetua uma estocada veloz que atravessa o alvo, fazendo-o sangrar (caso não tenha um objeto, usa suas proprias mãos): −2 de vida por rodada por 3 rodadas consecutivas.'},{name:'Over Hit',cost:2,cooldown:'3 rodadas',desc:'+3 em quaisquer atributos por 2 rodadas. Sua proxima utilização apenas pode ser utilizada em um atributo diferente do anterior até o final do combate.'}],specials:[{name:'Olho da Mente',cost:3,cooldown:'4 rodadas',desc:'Vê os pontos fracos do oponente por membros do corpo, causando 2× o dano em uma parte específica escolhida (acertos na cabeça só acertam caso a precisão seja de 18-20, causando 3x o dano).',req:3},{name:'Fúria Flamejante',cost:3,cooldown:'5 rodadas',desc:'Envolve-se em chamas azuis: +1 alcance, +3 dano e precisão, +3 dano em área/rodada. Ao inicio da 3° rodada que estivar com a habilidade ativa concecutivamente, fazendo com que seu corpo fique com o calor muito elevado o usuário superaquece, desativando a habilidade.',req:7}]},
  {id:'escarlate',alcance:'1m',name:'Cavaleiros Escarlate',icon:'🛡️',color:'#E8193C',glow:'rgba(232,25,60,0.16)',role:'Tanque · Protetor',lore:`A sua linhagem remonta a eras esquecidas, a povos que realizavam trabalhos braçais extremos nas profundezas da terra. Durante escavações, descobriram um minério enigmático: um rubi de cor escarlate incrivelmente denso. A exposição contínua e o suor derramado sobre o rubi criaram uma osmose biológica e mágica. O mineral fundiu-se com a genética destes trabalhadores, fazendo com que a sua própria pele se tornasse espessa, rígida e quase tão impenetrável quanto a rocha que outrora mineravam.`,passive:{name:'Pele de Rubi',desc:'Quando sem o escudo escarlate, a pele endurece. Ganha atributos bônus de defesa de acordo com a quantidade de inimigos ao redor (+1 de defesa por inimigo).'},normal:[{name:'Reflexo Escarlate',cost:2,cooldown:'3 rodadas',desc:'Se posiciona em frente a um ataque de disparo e reflete 0,5× o dano recebido utilizando um escudo.'},{name:'Lança Defensiva',cost:2,cooldown:'1 rodada', dano : '1D6 + Força' , desc:'Arremessa o escudo no inimigo. Com resultado D18–20, pode atingir múltiplos inimigos. O escudo retorna à mão automaticamente.'},{name:'Investida Ágil',cost:2,cooldown:'2 rodadas', dano: '+4 de Dano ou Chance de Esquiva',desc:'Troca resistência por velocidade: você avança até 3 passos em 1 ação. Esse impulso súbito pode ser focado em um ataque ou em evasão. Ofensiva: O peso da investida garante +4 de Dano no seu ataque durante este avanço. Evasão: Tenta escapar de um ataque inimigo no último segundo. O inimigo rola 1d10; se tirar 1, 2 ou 3 (30% de chance), ele erra o golpe. O esforço extremo desestabiliza sua base. Independentemente da escolha, você sofre -3 de Defesa por 3 rodadas imediatamente após o uso.'}],specials:[{name:'Provocação Extrema',cost:3,cooldown:'4 rodadas',desc:'Todos os inimigos ao redor focam em você na proxima rodada. Todo dano recebido é reduzido em 50% enquanto o efeito durar (2 rodadas).',req:3},{name:'Modo Berserker',cost:3,cooldown:'4 rodadas', dano: '+3 de Força + Pontos de Durabilidade', desc:'Troca toda a resistência por dano, força e alcance massivos. Fica imparável — mas exausto, gastando mais 1VC para realizar ações na proxima rodada.',req:7}]},
  {id:'corvos',alcance:'5m',name:'Corvos do Horizonte',icon:'🐦‍⬛',color:'#E8A020',glow:'rgba(232,160,32,0.16)',role:'Atirador · Precisão Absoluta',lore:`Os primeiros caçadores desta linhagem desenvolveram uma ligação espiritual e simbiótica com as aves de rapina, especialmente os grandes corvos e gaviões. Esta conexão transcendeu a amizade, alterando os próprios sentidos destes caçadores. A sua visão tornou-se microscópica e letal, calculando ventos, distâncias e trajetórias instintivamente. Este dom genético foi passado de geração em geração, garantindo uma precisão de quase 100% com machados, flechas ou armas de fogo.`,passive:{name:'Visão do Gavião',desc:'Nunca sofre penalidade por distância. Ataques à longa distância ganham +2 no dado de precisão automaticamente. Além disso, a cada 2 ataques, seu próximo terá um acerto garantido.'},normal:[{name:'Sniper Americano',cost:2,cooldown:'—',desc:'Garante acerto em alvos de 5–10 metros sempre. Custo: causa apenas 0,50× do dano normal.'},{name:'Saque Rápido',cost:2,cooldown:'2 rodadas',desc:'Realiza um ataque a qualquer momento, mesmo fora do turno. Precisão reduzida em 3 pontos neste disparo.'},{name:'Foco Absoluto',cost:2,cooldown:'2 rodadas',desc:'Fica 1 rodada inteira sem atacar, apenas focando em um alvo. Garante acerto crítico automático na próxima rodada caso acerte.'}],specials:[{name:'Precisão Celestial',cost:3,cooldown:'4 rodadas',desc:'Disparo crítico perfurante no primeiro alvo e nos demais que estejam na mesma trajetória. O(s) inimigo(s) atingido(s) perde −2 de vida por rodada pelos 3 turnos seguintes.',req:3},{name:'Chuva Mortal',cost:3,cooldown:'5 rodadas', dano: '3D8',desc:'Canaliza calmamente sua arma atual com uma precisão fora do comum, disparando múltiplos acertos simultâneos em uma área de 10–13 metros ao redor. Não atinge aliados.',req:7}]},
  {id:'magos',alcance:'5m',name:'Magos do Prólogo do Céu',icon:'☄️',color:'#A855F7',glow:'rgba(168,85,247,0.16)',role:'Vidente · Mago Cósmico',lore:`Outrora humanos comuns, o seu destino mudou quando uma pena celestial caiu dos céus. O primeiro a tocá-la teve a sua mente expandida além da compreensão mortal, despertando o dom absoluto da clarividência. Ele não controlava o tempo, mas conseguia observá-lo. Ao ver os fragmentos do futuro da humanidade, fundou esta ordem mágica e escreveu as suas visões no lendário Livro da Mandíbula. Transmitem o conhecimento cósmico através de diagramas sagrados, cânticos e uma profunda ligação com as anomalias do universo.`,passive:{name:'Visão Profética',desc:'Podem ver brevemente acontecimentos futuros ou preverem eventos por pistas do cenário, concedendo pontos bônus de combate ao grupo (+2 no atributo escolhido até o final do combate).'},normal:[{name:'Fortitude Ígnia',cost:2,cooldown:'1× por combate',desc:'Um personagem aliado recebe +3 de defesa por 2 rodadas. 1 uso por combate por jogador.'},{name:'Fluxo de Magia',cost:2,cooldown:'4 rodadas',desc:'Distribui parte da sua magia entre aliados em até 2m ao redor, buffando o dano deles em +2 por 4 rodadas.'},{name:'Telecinese',cost:2,cooldown:'variável', dano : '1D4|1D6|1D8|1D12|1D20 + Inteligência',desc:'Controla objetos ao redor e os arremessa contra inimigos. Tempo varia conforme o objeto. Pessoas só com consentimento.'}],specials:[{name:'Recuperação Divina',cost:3,cooldown:'7 rodadas',desc:'Remove todos os efeitos negativos de todos os aliados e cura em +8 pontos de vida.',req:3},{name:'Flecha do Último Guardião',cost:3,cooldown:'5 rodadas', dano : '2D12 + Inteligência', desc:'Invoca um arco gigante que dispara uma flecha com atributos de qualquer elemento escolhido, causando dano massivo em área (1d12).',req:7}]},
  {id:'marfim',alcance:'1m',name:'Cientistas de Marfim',icon:'🧪',color:'#4ADE80',glow:'rgba(212,197,169,0.16)',role:'Inventor · Gênio Adaptável',lore:`A origem desta linhagem começou com o primeiro grande alquimista da história. Através de anos de experimentação, ele sintetizou a "Pedra de Marfim" — o que as lendas chamam de Pedra Filosofal. Este objeto concedeu-lhe o conhecimento absoluto sobre física, química e tudo ainda por descobrir. Esta iluminação alterou o seu DNA. Todos os descendentes nascem com QI astronômico — um deles foi Nikola Tesla — criando maravilhas tecnológicas com sucata e compostos simples.`,passive:{name:'Percepção Elevada',desc:'Tem percepção acima do comum: pode revelar objetos escondidos no cenário e seus itens são utilizados das formas mais eficazes possiveis, ganhando +1 em qualquer atributo.'},normal:[{name:'Material de Pesquisa',cost:2,cooldown:'2 rodadas',desc:'Sempre carregado. Permite juntar 2 a 3 itens do cenário e combiná-los em um novo item.'},{name:'Seringa da Juventude',cost:2,cooldown:'3 rodadas',desc:'Aplica uma seringa que cura 2 de vida ao alvo e concede +2 Vigor Cósmico a ele e restaura o tempo de recarga de uma das suas habilidades em 2 rodadas. Caso o Cientista use a seringa em si mesmo, ele ira se curar 3 de vida, ganhará 3 de Vigo Cósmico e tera uma de suas habilidades resturada em 3 rodadas exceto "Seringa da Juventude".'},{name:'QI Distorcido',cost:2,cooldown:'1× por arma',desc:'Melhora qualquer arma concedendo mais alcance, dano ou precisão. 1 uso por arma por combate.'}],specials:[{name:'O 1° Alquimista',cost:3,cooldown:'4 rodadas', dano: '1D6 + Inteligência',desc:'Combina 4 a 5 itens criando algo novo e poderoso. Pode também disparar 1 tiro de tesla caso tenha algum objeto metalico ou condutor de energia, atordoando o alvo por 1 rodada.',req:3},{name:'Anti-Matéria',cost:3,cooldown:'6 rodadas', dano: '2D10 + Inteligência', desc:'Transcende, invocando 1mg de antimatéria: dano crítico garantido + efeitos negativos (lentidão, tontura, lepra degenerativa - demora 4 rounds para a lepra fazer efeito, degenerando uma parte do corpo do oponente).',req:7}]},
  {id:'necromante',alcance:'2m',name:'Necromantes das Cinzas Eternas',icon:'💀',color:'#6E6E80',glow:'rgba(110,110,128,0.18)',role:'Necromante · Controlador Sombrio',lore:`Nascidos à sombra de campos de batalha esquecidos, os Necromantes aprenderam a ouvir o silêncio que resta após a morte. Não dominam a vida — dominam o que fica depois dela. Cada osso, cada última respiração, cada eco de dor guardado num campo de batalha é, para eles, uma ferramenta. Dizem que o primeiro Necromante não escolheu seu dom: ele apenas parou de temer os mortos, e os mortos, em troca, pararam de temê-lo.`,passive:{name:'Passos dos que já Se Foram',desc:'Sempre que anda ou se movimenta, o Necromante não faz nenhum barulho — uma névoa negra envolve a sola de seus pés, amortecendo sempre sua passada.'},normal:[{name:'Metamorfose Negra',cost:2,cooldown:'3 rodadas',dano:'+4 de Dano',desc:'Ao causar dano em um inimigo, imbui magia negra em um item — seja em si mesmo ou em um objeto — causando +4 de dano e curando todo esse dano causado, podendo direcionar a cura para si mesmo ou para outra pessoa. Caso o inimigo esteja sangrando no local atingido, o valor da cura é dobrado.'},{name:'Animar os Mortos',cost:2,cooldown:'4 rodadas',desc:'Conjura monstros ou seres de ameaça baixa ou média que foram mortos por ele, ou que morreram naquele local, para se juntarem à batalha ao seu lado — porém com sua energia (vida e atributos) reduzida pela metade.'},{name:'Corte do Silêncio',cost:2,cooldown:'3 rodadas',dano:'3 de dano por rodada',desc:'Desfere um corte que marca o alvo com uma runa negra. Caso acerte, o membro atingido fica inutilizado por 2 rodadas, e durante esse mesmo período o alvo sofre 3 de dano por rodada.'}],specials:[{name:'Grito das Lamentações',cost:3,cooldown:'5 rodadas',desc:'Invoca as almas dos que foram mortos naquele local, criando gritos avassaladores que danificam todos os alvos atingidos, deixando-os com −3 de precisão por 2 rodadas.',req:3},{name:'Invocação dos Lordes',cost:3,cooldown:'6 rodadas',desc:'Conjura um inimigo de classe alta, ainda com metade da vida, para lutar ao seu lado. Se o Necromante rolar 1D20 e tirar 17 ou mais (escalando com sua Inteligência), ganha uma segunda invocação gratuita de classe média.',req:7}]},
  {id:'bardo',alcance:'4m',name:'Bardos da Luz',icon:'🎶',color:'#FFD86B',glow:'rgba(255,216,107,0.18)',role:'Bardo · Suporte Encantador',lore:`No passado, estes bardos aprenderam a extrair a vontade e o poder mágico guardados em canções antigas, canalizando-os em magias poderosas — feitas, acima de tudo, para erguer seus companheiros. Não costumavam ser os mais fortes em combate direto, e sim os que mantinham o grupo de pé, de corpo e de espírito. Alegres por natureza, tornaram-se indispensáveis em qualquer jornada: onde a esperança faltava, uma canção deles sempre encontrava um jeito de acender de novo.`,passive:{name:'Canção que Cura',desc:'A cada rodada, caso cante uma frase em voz alta, cura um aliado escolhido em 2 pontos de vida.'},normal:[{name:'Inspiração Bárdica',cost:2,cooldown:'2 rodadas',dano:'+2 a +5 (bônus)',desc:'O Bardo usa uma palavra inspiradora — que deve ser dita em voz alta no momento do uso — para conceder um bônus de +2, +3, +4 ou +5 a um aliado, escolhido entre Dano, Precisão ou Inteligência.'},{name:'Charme Natural',cost:2,cooldown:'3 rodadas',dano: '1D20 + Sorte',desc:'Encanta um NPC, fazendo com que ele aja a favor do que o Bardo deseja com mais facilidade. Role 2D20 — é preciso tirar 12 ou mais em ao menos um dos dados.'},{name:'Palavras Cortantes',cost:2,cooldown:'2 rodadas',dano:'2D4 de dano -3 (Precisão ou Durabilidade)',desc:'Zomba e xinga um inimigo, fazendo sua magia entrar na mente do adversário: causa dano e retira 3 pontos de Precisão ou Durabilidade, à escolha do Bardo.'}],specials:[{name:'Contra-Canção',cost:3,cooldown:'4 rodadas',desc:'Devolve por completo um ataque ou dano que um inimigo tenha causado. Pode ser usado a qualquer momento, mesmo fora do próprio turno, desde que haja Vigor Cósmico disponível — inclusive redirecionando danos causados a um aliado no momento.',req:3},{name:'Double Chance',cost:3,cooldown:'3 rodadas',desc:'Caso erre um ataque ou tire um resultado baixo no dado de dano, rola mais dois dados extras e usa sempre o maior resultado entre eles. Pode ser usado para si mesmo ou para um aliado, no momento da ação dele.',req:7}]},
  {id:'arcanjo',alcance:'3m',name:'Arcanjos da Escuridão',icon:'🪽',color:'#5B2C8C',glow:'rgba(91,44,140,0.2)',role:'Arcanjo Caído · Guerreiro Alado',lore:`Certo dia, uma pena celestial caiu dos céus — mas não era uma pena comum. Era negra, como de um anjo caído ou de uma criatura desconhecida pelos homens. Ao entrar em contato com uma criança pequena, fez com ela uma simbiose quase instantânea: asas transparentes e negras começaram a brotar de seu corpo. A partir daí, ela passou a voar pelos céus, provocando ventanias absurdas — fenômenos que os homens daquela época confundiram com desastres naturais, e que muitos passaram a temer, e venerar, como sinal de uma divindade.`,passive:{name:'Asas do Vazio',desc:'Pode conjurar asas negras e translúcidas que permitem voar até 7 metros de distância por 6 segundos. Após conjuradas, não podem ser invocadas novamente por 1 minuto.'},normal:[{name:'Lanças da Dor',cost:2,cooldown:'2 rodadas',dano:'1D6 + Força',desc:'Lança penas negras que cravam no corpo do alvo, causando dano e deixando penas encravadas no local atingido. Caso acerte um segundo ataque no mesmo local, causara +4 de dano extra, e deixará o alvo amaldiçoado (condição para acertar novamente é narrativamente estar a queima roupa, o inimigo estar atortoado ou caso tire um 17 em 1D20 puro).'},{name:'Ventos do Livro',cost:2,cooldown:'3 rodadas',dano:'1D8 + Força',desc:'Cria uma rajada de vento com as asas, que empurra e desestabiliza os inimigos atingidos, deixando-os com −2 de Precisão na rodada seguinte.'},{name:'Correntes do Silêncio',cost:2,cooldown:'2 rodadas',dano:'2D4 + Inteligência',desc:'Prende correntes invisíveis em um aliado ou inimigo, podendo puxá-lo até si ou se puxar até ele, dependendo do teste de Força realizado. Causa um pequeno dano no processo.'}],specials:[{name:'Rasante dos Deuses',cost:3,cooldown:'4 rodadas',dano:'2D8 + Agilidade',desc:'Abre as asas e voa rapidamente por entre todos os inimigos em seu caminho, cortando cada um deles e se deslocando em até 10 metros.',req:3},{name:'Furacão da Divindade',cost:3,cooldown:'5 rodadas',dano:'2D6 + Agilidade',desc:'Cria um pequeno tornado brilhante que puxa tudo ao redor, reduzindo em 4 a Durabilidade do inimigo. Em um teste de 1D10, resultado 8, 9 ou 10 desarma o inimigo — exceto se ele estiver usando um artefato.',req:7}]},
];

const PROLOGUE=[{type:'intro',text:'No início, não existia nada.'},{type:'pause',text:'E do nada ele surgiu — quem o nomeou? Ele mesmo.'},{type:'title',text:'*$!6;^@$+6~=´} (JhonKenteiker)'},{type:'body',text:'Jhon viu diante de si um universo vasto, lindo, porém vazio. E assim decidiu criar o sistema solar, e dele o mundo mais belo — nomeando-o Cosmum, a Terra dos mortais.'},{type:'body',text:'Nisso, ele criou as primeiras criaturas: já fortes, ágeis, adaptáveis, sobreviventes em qualquer cenário. Os dinossauros. Porém viu que dar-lhes tantas vantagens foi um erro.'},{type:'highlight',text:'E nisso ele criou o primeiro conceito de Reinício.'},{type:'body',text:'Uma grande bola de fogo atingiu o planeta, criando eventos irreversíveis e mudanças eternas. Do silêncio das cinzas surgiram os primeiros seres. Eles evoluíram. E a partir disso, o ser humano surgiu — não tão forte quanto os dinossauros, porém com uma capacidade cognitiva incomparável.'},{type:'divider',text:'— — —'},{type:'body',text:'Mas Jhon pensa novamente em reciclar o mundo. Pois viu que, ao passar dos anos, nenhum avanço significativo ocorreu. Fazendo-o questionar: devo começar tudo de novo?'},{type:'warning',text:'E além disso... uma catástrofe se aproxima.'},{type:'body',text:'Ninguém sabe o que. Só sabe que está chegando. Pois o Livro da Mandíbula — como o calendário maia — a previa. Dizendo que quatro estrelas ficariam brilhantes sobre os céus, tanto de dia quanto de noite, e se aproximariam a cada dia.'},{type:'finale',text:'O objetivo dos personagens não é apenas sobreviver. É provar seu valor para continuarem existindo. É parar. É compreender. É decifrar a profecia antes que o Reinício seja decretado novamente — desta vez, para sempre.'}];
const MILESTONES=[{year:'~400.000 AC',event:'Descoberta e controle do fogo',icon:'🔥'},{year:'~10.000 AC',event:'Revolução agrícola — os humanos se tornam sedentários',icon:'🌾'},{year:'~3.500 AC',event:'Surgimento das primeiras civilizações: Mesopotâmia e Egito',icon:'🏛️'},{year:'~3.000 AC',event:'Invenção da escrita cuneiforme',icon:'📜'},{year:'~500 AC',event:'Apogeu dos grandes impérios: Persa, Grego, Romano',icon:'⚔️'},{year:'Séc. XV',event:'Era das grandes navegações e descobrimento dos continentes',icon:'🌊'},{year:'Séc. XVIII',event:'Revolução Industrial — a máquina a vapor muda o mundo',icon:'⚙️'},{year:'1905',event:'Albert Einstein publica a Teoria da Relatividade',icon:'🧠'},{year:'1945',event:'Era Atômica — o poder de destruição da humanidade se torna real',icon:'☢️'},{year:'1969',event:'O primeiro ser humano pisa na Lua',icon:'🌕'},{year:'1990s',event:'Era digital — a internet conecta a humanidade globalmente',icon:'💻'},{year:'Séc. XXI',event:'Inteligência artificial: a humanidade cria inteligência',icon:'🤖'},{year:'AGORA',event:'Quatro estrelas aparecem nos céus de Cosmum. Elas se aproximam.',icon:'✦',prophecy:true}];
const ENTITIES_DATA=[{id:'homem-agua',name:'Homem Água',icon:'💧',revealed:true,lore:`Era um homem comum chamado David, que vivia por volta de 1544, com seu amigo Billy Laranjais. Um dia como qualquer outro, uma lágrima celestial caiu dos céus — era de JhonKenteiker. Ninguém sabe o motivo daquela lágrima ter caído, mas ao entrar em contato com o corpo de David, tornou-o extremamente poderoso, expelindo água de seu corpo e a controlando de forma quase que divina.\n\nAo ver isso, Billy teve uma ideia, movido pela ganância. Ele atraiu seu amigo até um local, onde o prendeu e ficou drenando toda sua água, dia após dia. Com isso, Billy criou uma fortuna e o parque temático para esconder seu pecado — conhecido como "Thermas dos Laranjais".\n\nApós isso, a cada 200 a 300 anos o Homem Água não morre, mas reencarna sua essência em outro hospedeiro. Quando isso acontece, todos os Cavaleiros dos Laranjais — descendentes diretos de Billy — são acionados para capturar a criança assim que nasce, e colocá-la na prisão que um dia foi de David, para drenar sua água até que o ciclo comece outra vez.`,fisico:`Um ser formado completamente pela água mais pura já vista — transparente, límpida, quase luminosa. Seus olhos são os únicos traços aparentes: dois pontos visíveis dentro de uma forma humana inteiramente aquosa. Não possui cor, não possui sombra. Apenas água com vontade própria.`},{id:'cabecas-azuis',name:'Os Cabeças Azuis',icon:'🔵',revealed:true,lore:`No ano de 830 d.C., uma entidade senciente de vontade própria e poder imensurável despertou. Embora fosse poderosa, ela se sentia incompleta em sua solidão. Foi então que seduziu o primeiro humano — um homem cujo nome original foi apagado da história, restando apenas o "Chamado" que ressoa em sua mente.\n\nA entidade convenceu este primeiro hospedeiro de que a individualidade era um fardo e que pertencer a um único ser pensante, abrindo mão da própria dignidade e vontade, seria o maior prazer de uma vida. Ao longo dos séculos, mais e mais humanos foram abduzidos e assimilados.\n\nHoje, eles não são mais indivíduos, mas componentes de uma Mente Coletiva. Funcionam como um "software" biológico: cada novo humano assimilado serve como processamento e memória, fazendo com que a entidade cresça em inteligência e alcance a cada segundo.`,fisico:`Seres finos, quase esqueléticos, com uma cabeça desproporcional e grande. Não possuem boca nem nariz — apenas um único olho no centro do rosto, brilhando na cor de safira profunda. Sua presença, embora não seja aterrorizante, é completamente desconfortável. Como se algo essencial estivesse faltando onde deveria haver um rosto.`},{id:'homem-leite',name:'O Homem de Leite',icon:'◌',revealed:false,lore:'',fisico:''},{id:'ventus',name:'Ventus o Rei dus Tempus',icon:'🌪️',revealed:false,lore:'',fisico:''},{id:'sixseven',name:'O 67 (SixSeven)',icon:'⚡',revealed:false,lore:'',fisico:''},{id:'unknown',name:'???',icon:'◈',revealed:false,lore:'',fisico:''}];
const ARTEFATOS_DATA=[{id:'artefato-1',name:'O Cristal Cristalizado da Gota de Água',icon:'💎',lore:`Ela é um artefato muito poderoso, expelido do corpo do próprio Homem Água. O usuário que o carrega ganha.... (o livro não descreve)`,fisico:`Localização: Desconhecida\nOrigem: Corpo do Homem Água`},{id:'artefato-2',name:'Sandaliers Six',icon:'👟',lore:`Quem possui esse artefato pode estar onde bem entender, espaço e tempo não o param, podendo se movimentar de forma livre em qualquer momento, um teleporte instantâneo.`,fisico:`Localização: Desconhecida\nOrigem: Desconhecida`},{id:'artefato-3',name:'Artefato III',icon:'◆',lore:'',fisico:''},{id:'artefato-4',name:'Artefato IV',icon:'◆',lore:'',fisico:''},{id:'artefato-5',name:'Artefato V',icon:'◆',lore:'',fisico:''},{id:'artefato-6',name:'Artefato VI',icon:'◆',lore:'',fisico:''}];
const RULES_DATA=[
  {
    icon:'⚔️',
    title:'Estrutura do Turno & Iniciativa',
    body:`O combate em Dinastia E é por turnos. A ordem de iniciativa agora é dinâmica e definida rolando 1D20 + Bônus de Agilidade.\n\nDesempates de Iniciativa:\nCaso dois combatentes tirem o mesmo valor, o desempate é feito pelo atributo Percepção. Se o empate persistir, o Jogador tem prioridade sobre o Inimigo.\n\nO Mestre também pode definir ou alterar a ordem manualmente. A fila de turnos fica sempre visível no lado esquerdo da tela durante o combate.`
  },
  {
    icon:'⚡',
    title:'Ataques de Oportunidade (Surpresa)',
    body:`O posicionamento é vital em Dinastia E. Caso um personagem ou inimigo dê as costas para um oponente ou tente fugir de um combate corpo-a-corpo de forma imprudente, ele sofrerá um Ataque de Oportunidade.\n\nEsse ataque é uma reação imediata e gratuita do atacante contra quem deu as costas, ocorrendo fora do seu turno normal. O Mestre pode acionar esse ataque diretamente no painel de combate.`
  },
  {
    icon:'🎲',
    title:'Os Dados e Rolagens Públicas',
    body:`Agora as rolagens de dados podem ser feitas diretamente pelo site no painel de "Dado Público". O resultado, incluindo bônus, acertos críticos e falhas, aparece na tela de todos que estiverem na sala.\n\n1D20 — Dado de Precisão:\n• 1–5 → Falha Crítica. A ação falha com consequências.\n• 6–10 → Falha. A ação não surte efeito.\n• 11–15 → Sucesso Parcial. Funciona, mas não perfeitamente.\n• 16–19 → Sucesso. A ação ocorre como planejado.\n• 20 → Sucesso Crítico. Role o dado de dano duas vezes.\n\n1D4 / 1D6 / 1D8 / 1D12 / 1D20 — Dado de Dano:\nUsado após um ataque bem-sucedido.`
  },
  {
    icon:'🎯',
    title:'Tipos de Ação e Custos',
    body:`Em seu turno, cada personagem possui 5 Vigor Cósmico (VC). A cada turno, ele recupera automaticamente +2 Vigor Cósmico.\n\nAções possíveis em combate:\n\n⚔️ Ataque Normal — 2 VC\nExecuta um dos ataques normais da classe.\n\n✨ Ataque Especial — 3 VC\nExecuta um dos ataques especiais (só podem ser usados a partir da 2° rodada, ou quando o personagem estiver com 5 de vida).\n\n🏃 Movimento — 1 VC\nMove-se para nova posição no campo de batalha.\n\n🛡️ Esquiva — 1 VC\nTenta esquivar de um ataque. Role 1D20 — se ≥11, esquiva com sucesso.\n\n💬 Ação de Campo — 1 VC\nQualquer ação de esforço: carregar aliado, empurrar objeto, etc.\n\n🔍 Percepção — 0 VC\nObservar ambiente ou inimigo. Sem custo.`
  },
  {
    icon:'📊',
    title:'Bônus de Atributos',
    body:`A cada 2 pontos em um atributo, o personagem ganha +1 de ponto bônus na ação correspondente:\n\n⚔️ Força: +1 Bônus em Dano físico e Ataques corpo-a-corpo.\n🛡️ Durabilidade: +1 Bônus em Resistência e Defesas.\n⚡ Agilidade: +1 Bônus em Esquivas, Ataques a Distância e +1 Bônus na Iniciativa.\n🧠 Inteligência: +1 Bônus em Ataques Mágicos e Científicos.\n🏹 Percepção: +1 Bônus em Ataques Surpresa e usado como critério de desempate na Iniciativa.`
  },
  {
    icon:'❤️',
    title:'Cores e Estado de Vida (HP)',
    body:`A interface do combate indica visualmente a saúde atual do combatente através das cores da barra de vida:\n\n🟢 Verde (Saudável): Acima de 60% de HP.\n🟡 Amarelo (Ferido): Entre 30% e 60% de HP.\n🔴 Vermelho (Crítico): Abaixo de 30% de HP.\n⚫ Cinza e foto escura (Abatido): 0 HP (Morto).`
  },
  {
    icon:'🔄',
    title:'Teste de Reflexo',
    body:`Quando um personagem possui pelo menos 1 Vigor Cósmico disponível, ele pode realizar um Teste de Reflexo ao ser alvo de um ataque.\n\n🛡️ Custo: 1 VC\n🎲 Role 1D20 — se o resultado for 16 ou mais, o personagem esquiva completamente do ataque.\n\n⚠️ Limitação: O Teste de Reflexo só pode ser utilizado 1 vez por combate por personagem.`
  },
  {
    icon:'💎',
    title:'Crítico de Itens',
    body:`Quando um item (arma, artefato, equipamento) acerta um golpe crítico (resultado 20 no D20), o dano não é rolado normalmente.\n\n✦ Regra: O item causa automaticamente o dano máximo garantido do seu dado de dano.\n\nExemplos:\n• Item com 1D6 de dano → Crítico = 6 de dano garantido\n• Item com 1D8 + 2 de dano → Crítico = 8 + 2 = 10 de dano garantido\n• Item com 2D6 de dano → Crítico = 12 de dano garantido\n\nEssa regra se aplica exclusivamente a itens e equipamentos. Habilidades de classe seguem suas próprias regras de crítico.`
  },
  {
    icon:'✦',
    title:'Progressão & XP',
    body:`O nível máximo é 30.\n\nTítulos por Nível:\n• Nível 1–3 → Aprendiz Cósmico\n• Nível 4–6 → Portador do Destino\n• Nível 7–9 → Arauto do Fim\n• Nível 10–14 → Guardião Estelar\n• Nível 15–19 → Ascendente\n• Nível 20–24 → Transcendente\n• Nível 25–29 → Arauto Supremo\n• Nível 30 → Lenda Cósmica\n\nDesbloqueio de Especiais:\n• Especial I — desbloqueado no Nível 3\n• Especial II — desbloqueado no Nível 7\n\nAo alcançar os níveis 4, 10, 15, 20, 25 e 30, o personagem desbloqueia uma habilidade nova, definida em conjunto com o Mestre.`
  }
];
function StarField({atmosphere='neutro'}){const ref=useRef(null);useEffect(()=>{const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');let raf;const resize=()=>{canvas.width=canvas.offsetWidth;canvas.height=canvas.offsetHeight;};resize();window.addEventListener('resize',resize);const stars=Array.from({length:200},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.2+0.2,phase:Math.random()*Math.PI*2,spd:Math.random()*0.025+0.008}));const ps=[{x:0.10,y:0.04,c:'#1EC8FF'},{x:0.87,y:0.05,c:'#E8A020'},{x:0.48,y:0.025,c:'#A855F7'},{x:0.70,y:0.06,c:'#E8193C'}];let t=0;const draw=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);t+=0.007;const atm=ATMOSPHERES[atmosphere]||ATMOSPHERES.neutro;const sc=atm.starColor;stars.forEach(s=>{const a=0.2+0.5*Math.sin(t*s.spd*50+s.phase);ctx.beginPath();ctx.arc(s.x*canvas.width,s.y*canvas.height,s.r,0,Math.PI*2);ctx.fillStyle=sc?`${sc}${Math.round(a*255).toString(16).padStart(2,'0')}`:`rgba(255,255,255,${a})`;ctx.fill();});ps.forEach((s,i)=>{const a=0.55+0.45*Math.sin(t*1.1+i*0.8),px=s.x*canvas.width,py=s.y*canvas.height;ctx.save();ctx.shadowColor=s.c;ctx.shadowBlur=14*a;ctx.globalAlpha=a;ctx.beginPath();ctx.arc(px,py,2.8,0,Math.PI*2);ctx.fillStyle=s.c;ctx.fill();ctx.restore();ctx.save();ctx.globalAlpha=a*0.4;ctx.strokeStyle=s.c;ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(px-8,py);ctx.lineTo(px+8,py);ctx.stroke();ctx.beginPath();ctx.moveTo(px,py-8);ctx.lineTo(px,py+8);ctx.stroke();ctx.restore();});raf=requestAnimationFrame(draw);};draw();return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);};},[atmosphere]);return <canvas ref={ref} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none'}}/>;}

function RestrictedAccess({ title, text }) {
  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'80px 24px',textAlign:'center'}}>
      <div style={{fontSize:48,marginBottom:16,opacity:0.6}}>🔒</div>
      <h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:24,color:'#E8193C',fontWeight:700,margin:0,textShadow:'0 0 20px rgba(232,25,60,0.4)'}}>{title}</h2>
      <div style={{fontSize:14,color:'#9A8A7A',marginTop:12,fontFamily:'Cinzel,serif',letterSpacing:'0.05em'}}>{text}</div>
      <div style={{fontSize:12,color:'#5A4A5A',marginTop:8}}>Ative o Modo Mestre no topo da tela usando a senha para acessar.</div>
    </div>
  );
}

const SOUND_CATEGORIES = [
  { id: 'calmaria', label: 'Calmaria', icon: '🌤️', color: '#4ADE80' },
  { id: 'dialogos', label: 'Tristeza', icon: '🌧️', color: '#1EC8FF' },
  { id: 'ambiente', label: 'Ambiente', icon: '🌫️', color: '#A855F7' },
  { id: 'enigmas', label: 'Enigmas', icon: '🧩', color: '#E8A020' },
  { id: 'combate', label: 'Combate', icon: '⚔️', color: '#E8193C' },
  { id: 'terror', label: 'Terror', icon: '💀', color: '#6E6E80' },
  { id: 'sfx', label: 'Sound Effects', icon: '🔊', color: '#FF6B9D' },
];

function AmbientSoundPlayer({ masterMode }) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('calmaria');
  const [playlists, setPlaylists] = useState({});
  const [current, setCurrent] = useState(null);
  const [userMuted, setUserMuted] = useState(false);
  const [volume, setVolume] = useState(50);
  const [novoNome, setNovoNome] = useState('');
  const [novoLink, setNovoLink] = useState('');
  const iframeRef = useRef(null);
  const lastTs = useRef(0);
  const [combatActive, setCombatActive] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'combat'), snap => {
      if (snap.exists()) setCombatActive(snap.data().active || false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'ambient_playlists'), snap => {
      if (snap.exists()) setPlaylists(snap.data() || {});
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'ambient'), snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      setCurrent(d);
      if (d.ts && d.ts !== lastTs.current) {
        lastTs.current = d.ts;
        setUserMuted(false);
      }
    });
    return () => unsub();
  }, []);

  const extractId = (url) => {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return m ? m[1] : url.trim();
  };

  const sendCmd = (func, args = []) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args }), '*'
      );
    } catch (_) {}
  };

  const handleVolumeChange = (e) => { const v = Number(e.target.value); setVolume(v); sendCmd('setVolume', [v]); };

  const playTrack = async (track, categoria) => {
    try {
      await setDoc(doc(db, 'config', 'ambient'), {
        videoId: track.videoId, nome: track.nome, categoria, playing: true, ts: Date.now(),
      });
      const catColor = SOUND_CATEGORIES.find(c => c.id === categoria)?.color || '#4ADE80';
      pushToast(`🎵 Tocando agora: ${track.nome}`, '🎵', catColor);
    } catch (e) { console.error(e); }
  };

  const stopAll = async () => {
    try { await setDoc(doc(db, 'config', 'ambient'), { videoId: '', nome: '', categoria: '', playing: false, ts: Date.now() }); } catch (e) {}
  };

  const addTrack = async () => {
    const id = extractId(novoLink.trim());
    if (!id || !novoNome.trim()) return;
    const atuais = playlists[activeCategory] || [];
    const nova = { id: Date.now(), nome: novoNome.trim(), videoId: id };
    const updated = { ...playlists, [activeCategory]: [...atuais, nova] };
    await setDoc(doc(db, 'config', 'ambient_playlists'), updated);
    setNovoNome(''); setNovoLink('');
  };

  const deleteTrack = async (categoria, trackId) => {
    const atuais = playlists[categoria] || [];
    const updated = { ...playlists, [categoria]: atuais.filter(t => t.id !== trackId) };
    await setDoc(doc(db, 'config', 'ambient_playlists'), updated);
  };

  const isPlaying = current?.playing && current?.videoId && !userMuted;
  const embedSrc = current?.videoId ? `https://www.youtube.com/embed/${current.videoId}?autoplay=1&loop=1&playlist=${current.videoId}&enablejsapi=1&controls=0` : '';
  const volIcon = userMuted ? '🔇' : volume === 0 ? '🔇' : volume < 40 ? '🔈' : volume < 75 ? '🔉' : '🔊';
  const catInfo = SOUND_CATEGORIES.find(c => c.id === current?.categoria);

  return (
    <div style={{ position: 'fixed', top: 90, left: 16, zIndex: 100 }}>
      {isPlaying && embedSrc && (
        <div style={{ position: 'fixed', bottom: -400, left: -400, width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
          <iframe ref={iframeRef} src={embedSrc} width="1" height="1" allow="autoplay; encrypted-media" onLoad={() => setTimeout(() => sendCmd('setVolume', [volume]), 1800)} />
        </div>
      )}
      {!open && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {current?.videoId && (
            <button onClick={() => setUserMuted(m => !m)} title={userMuted ? 'Ativar som' : 'Silenciar para mim'} style={{ width: 48, height: 48, borderRadius: '50%', background: isPlaying ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isPlaying ? 'rgba(74,222,128,0.55)' : 'rgba(255,255,255,0.14)'}`, color: isPlaying ? '#4ADE80' : '#7A6A8A', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(6px)', boxShadow: isPlaying ? '0 0 18px rgba(74,222,128,0.28)' : 'none', transition: 'all 0.3s', animation: isPlaying ? 'pulse 2.5s ease-in-out infinite' : 'none' }}>{volIcon}</button>
          )}
          {current?.videoId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(10,12,28,0.92)', border: `1px solid ${catInfo ? catInfo.color+'44' : 'rgba(74,222,128,0.25)'}`, borderRadius: 24, padding: '6px 14px', backdropFilter: 'blur(8px)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', maxWidth: 220 }}>
              <span style={{ fontSize: 13 }}>{catInfo?.icon || '🎵'}</span>
              <span style={{ fontSize: 11, color: catInfo?.color || '#4ADE80', fontFamily: 'Cinzel,serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{current.nome || 'Som ambiente'}</span>
              {isPlaying && (
                <input type="range" min={0} max={100} step={5} value={volume} onChange={handleVolumeChange} style={{ width: 60, accentColor: catInfo?.color || '#4ADE80', cursor: 'pointer', border: 'none', background: 'transparent', padding: 0 }} />
              )}
            </div>
          )}
          {masterMode && (
            <button onClick={() => setOpen(true)} title="Playlists de ambiente" style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#5A5070', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(5px)', transition: 'all 0.2s' }}>🎼</button>
          )}
        </div>
      )}
      {open && masterMode && (
        <div style={{ position: 'fixed', top: 20, bottom: 20, left: 16, width: 'min(380px, calc(100vw - 32px))', background: 'rgba(8,10,24,0.98)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 16, padding: 16, display:'flex', flexDirection:'column', boxShadow: '0 10px 40px rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 150 }}>          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink:0 }}>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: 13, color: '#4ADE80', letterSpacing: '0.1em' }}>🎼 Playlists de Ambiente</div>
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: '#5A5070', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12, flexShrink:0 }}>
            {SOUND_CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setActiveCategory(c.id)} style={{
                padding: '5px 10px', borderRadius: 16, fontFamily: 'Cinzel,serif', fontSize: 10.5, letterSpacing:'0.03em',
                border: `1px solid ${activeCategory === c.id ? c.color + '77' : 'rgba(255,255,255,0.09)'}`,
                background: activeCategory === c.id ? `${c.color}18` : 'rgba(255,255,255,0.02)',
                color: activeCategory === c.id ? c.color : '#6A5A7A', cursor: 'pointer', transition:'all 0.15s',
              }}>{c.icon} {c.label}</button>
            ))}
          </div>

          <div style={{ overflowY: 'auto', flex:1, marginBottom: 10, display:'flex', flexDirection:'column', gap:9 }}>
            {(playlists[activeCategory] || []).length === 0 && (
              <div style={{ fontSize: 11, color: '#4A4050', fontFamily: 'Cinzel,serif', textAlign: 'center', padding: '14px 0', fontStyle:'italic' }}>Nenhuma música nesta categoria ainda.</div>
            )}
            {(playlists[activeCategory] || []).map(track => {
              const isCurrent = current?.videoId === track.videoId && current?.playing;
              const catColor = SOUND_CATEGORIES.find(c=>c.id===activeCategory)?.color || '#4ADE80';
              return (
                <div key={track.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:9, background: isCurrent ? `${catColor}18` : 'rgba(255,255,255,0.03)', border:`1px solid ${isCurrent ? catColor+'55' : 'rgba(255,255,255,0.07)'}` }}>
                  <button onClick={() => playTrack(track, activeCategory)} title="Tocar para todos" style={{ background:'none', border:'none', color: isCurrent ? catColor : '#8A7A6A', cursor:'pointer', fontSize:17, flexShrink:0 }}>{isCurrent ? '▶' : '▷'}</button>
                  <span style={{ flex:1, fontSize:13, color: isCurrent ? catColor : '#C8B8A0', fontFamily:'Cinzel,serif', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{track.nome}</span>
                  <button onClick={() => deleteTrack(activeCategory, track.id)} style={{ background:'none', border:'none', color:'rgba(232,25,60,0.5)', cursor:'pointer', fontSize:13, flexShrink:0, padding:4 }}>✕</button>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, flexShrink:0 }}>
            <label style={{ fontSize: 9, letterSpacing: '0.25em', color: 'rgba(74,222,128,0.65)', fontFamily: 'Cinzel,serif', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Adicionar Música — {SOUND_CATEGORIES.find(c=>c.id===activeCategory)?.label}</label>
            <input value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Nome da música/tema..." style={{ width: '100%', fontSize: 12, marginBottom: 6 }} />
            <input value={novoLink} onChange={e => setNovoLink(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTrack()} placeholder="Link do YouTube..." style={{ width: '100%', fontSize: 12, marginBottom: 8 }} />
            <button onClick={addTrack} disabled={!novoNome.trim() || !novoLink.trim()} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(74,222,128,0.45)', background: 'rgba(74,222,128,0.12)', color: '#4ADE80', cursor: (novoNome.trim()&&novoLink.trim()) ? 'pointer' : 'not-allowed', fontFamily: 'Cinzel,serif', fontSize: 12, letterSpacing: '0.08em', opacity: (novoNome.trim()&&novoLink.trim()) ? 1 : 0.4 }}>✦ Adicionar à Playlist</button>
          </div>

          {current?.videoId && (
            <button onClick={stopAll} style={{ marginTop: 10, width: '100%', padding: '7px', borderRadius: 8, border: '1px solid rgba(232,25,60,0.3)', background: 'rgba(232,25,60,0.08)', color: '#E8193C', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 11, flexShrink:0 }}>⏹ Parar música para todos</button>
          )}

          <div style={{ marginTop: 10, fontSize: 9, color: '#4A4050', fontFamily: 'Cinzel,serif', lineHeight: 1.6, flexShrink:0 }}>Ao tocar, todos ouvem automaticamente. Cada jogador pode silenciar só pra si no botão de volume.</div>
        </div>
      )}
    </div>
  );
}

function MapaMundiSection({ masterMode }) {
  const [mapImg, setMapImg] = useState('');
  const [pins, setPins] = useState([]);
  const [selectedPin, setSelectedPin] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const mapRef = useRef(null);
  const fileRef = useRef(null);
  const saveTimeout = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'mapamundi'), snap => {
      if (snap.exists()) { const d = snap.data(); setMapImg(d.img || ''); setPins(d.pins || []); }
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  const saveAll = async (newImg, newPins) => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try { await setDoc(doc(db, 'config', 'mapamundi'), { img: newImg, pins: newPins }); } catch (e) { console.error(e); }
    }, 800);
  };

  const handleMapUpload = async e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => { const compressed = await compressImage(ev.target.result, 1400, 1400, 0.78); setMapImg(compressed); saveAll(compressed, pins); };
    reader.readAsDataURL(file); e.target.value = '';
  };

  const handleMapClick = e => {
    if (!masterMode || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newPin = { id: Date.now(), x, y, titulo: 'Novo Local', descricao: '' };
    const newPins = [...pins, newPin];
    setPins(newPins); setSelectedPin(newPin.id); saveAll(mapImg, newPins);
  };

  const updatePin = (id, data) => { const newPins = pins.map(p => p.id === id ? { ...p, ...data } : p); setPins(newPins); saveAll(mapImg, newPins); };
  const deletePin = id => { const newPins = pins.filter(p => p.id !== id); setPins(newPins); if (selectedPin === id) setSelectedPin(null); saveAll(mapImg, newPins); };
  const selPin = pins.find(p => p.id === selectedPin);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 16px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.4em', color: '#7B6D8A', fontFamily: 'Cinzel,serif', marginBottom: 13, textTransform: 'uppercase' }}>O Mundo de Cosmum</div>
        <h2 style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 23, color: '#E8D8C0', fontWeight: 700, margin: 0 }}>Mapa Múndi</h2>
        <div style={{ fontSize: 12, color: '#4A4050', marginTop: 9, fontFamily: 'Cinzel,serif' }}>{masterMode ? '🗺 Clique no mapa para criar marcadores · Sincronizado em tempo real' : '🗺 Explore os marcadores clicando neles'}</div>
        <div style={{ width: 60, height: 1, background: 'linear-gradient(90deg,transparent,rgba(232,160,32,0.6),transparent)', margin: '16px auto 0' }} />
      </div>
      {!loaded && <div style={{ textAlign: 'center', color: '#5A5070', fontFamily: 'Cinzel,serif', fontSize: 13, padding: 40 }}>Carregando o mapa...</div>}
      {loaded && !mapImg && (
        <div style={{ textAlign: 'center', padding: 60, border: '1px dashed rgba(232,160,32,0.25)', borderRadius: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.3 }}>🗺️</div>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 14, color: '#6A5A7A', marginBottom: 16 }}>{masterMode ? 'Envie o mapa do mundo para começar.' : 'O Mestre ainda não enviou o mapa do mundo.'}</div>
          {masterMode && <button onClick={() => fileRef.current?.click()} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid rgba(232,160,32,0.4)', background: 'rgba(232,160,32,0.1)', color: '#E8A020', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 13, letterSpacing: '0.08em' }}>📁 Enviar Mapa</button>}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleMapUpload} style={{ display: 'none' }} />
        </div>
      )}
      {loaded && mapImg && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {masterMode && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => fileRef.current?.click()} style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid rgba(232,160,32,0.35)', background: 'rgba(232,160,32,0.08)', color: '#E8A020', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 11, letterSpacing: '0.06em' }}>🗺 Trocar Mapa</button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleMapUpload} style={{ display: 'none' }} />
              <div style={{ fontSize: 11, color: '#5A5070', fontFamily: 'Cinzel,serif', display: 'flex', alignItems: 'center', paddingRight: 4 }}>{pins.length} marcador{pins.length !== 1 ? 'es' : ''} · clique no mapa para adicionar</div>
            </div>
          )}
          <div ref={mapRef} onClick={handleMapClick} style={{ position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(232,160,32,0.25)', cursor: masterMode ? 'crosshair' : 'default', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
            <img src={mapImg} alt="mapa mundi" style={{ width: '100%', display: 'block', maxHeight: 600, objectFit: 'contain', background: '#04060F' }} />
            {pins.map(pin => (
              <div key={pin.id} onClick={e => { e.stopPropagation(); setSelectedPin(selectedPin === pin.id ? null : pin.id); }} style={{ position: 'absolute', left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%, -100%)', cursor: 'pointer', zIndex: 5, animation: 'pinDrop 0.4s cubic-bezier(0.2,0.8,0.2,1)' }}>
                <div style={{ background: selectedPin === pin.id ? '#E8A020' : 'rgba(232,160,32,0.85)', border: `2px solid ${selectedPin === pin.id ? '#fff' : 'rgba(232,160,32,0.6)'}`, borderRadius: '50% 50% 50% 0', width: 22, height: 22, transform: 'rotate(-45deg)', boxShadow: '0 2px 8px rgba(0,0,0,0.6)', transition: 'all 0.2s' }} />
              </div>
            ))}
          </div>
          {selectedPin && selPin && (
            <div style={{ border: '1px solid rgba(232,160,32,0.3)', borderRadius: 12, background: 'rgba(10,12,28,0.95)', padding: 18, animation: 'pageTurn 0.3s ease' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  {masterMode ? (<>
                    <div style={{ marginBottom: 10 }}><label style={{ fontSize: 10, letterSpacing: '0.3em', color: 'rgba(232,160,32,0.7)', fontFamily: 'Cinzel,serif', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Nome do Local</label><input value={selPin.titulo} onChange={e => updatePin(selPin.id, { titulo: e.target.value })} style={{ width: '100%', fontFamily: 'Cinzel,serif', fontSize: 14 }} /></div>
                    <div><label style={{ fontSize: 10, letterSpacing: '0.3em', color: 'rgba(232,160,32,0.7)', fontFamily: 'Cinzel,serif', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Descrição</label><textarea value={selPin.descricao} onChange={e => updatePin(selPin.id, { descricao: e.target.value })} placeholder="Descreva este local..." rows={3} style={{ width: '100%', resize: 'vertical', lineHeight: 1.7 }} /></div>
                  </>) : (<>
                    <div style={{ fontFamily: 'Cinzel,serif', fontSize: 16, color: '#E8A020', fontWeight: 700, marginBottom: 8 }}>{selPin.titulo}</div>
                    <div style={{ fontSize: 14, color: '#9A8A7A', lineHeight: 1.8, fontStyle: 'italic', whiteSpace: 'pre-line' }}>{selPin.descricao || <span style={{ color: '#4A4050' }}>Este local ainda não possui descrição.</span>}</div>
                  </>)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button onClick={() => setSelectedPin(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#5A5070', borderRadius: 5, cursor: 'pointer', padding: '3px 8px', fontSize: 11 }}>✕</button>
                  {masterMode && <button onClick={() => deletePin(selPin.id)} style={{ background: 'rgba(232,25,60,0.1)', border: '1px solid rgba(232,25,60,0.3)', color: '#E8193C', borderRadius: 5, cursor: 'pointer', padding: '3px 8px', fontSize: 11 }}>🗑</button>}
                </div>
              </div>
            </div>
          )}
          {pins.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.3em', color: '#5A5070', fontFamily: 'Cinzel,serif', marginBottom: 10, textTransform: 'uppercase' }}>Locais Marcados</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {pins.map(pin => (
                  <button key={pin.id} onClick={() => setSelectedPin(selectedPin === pin.id ? null : pin.id)} style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${selectedPin === pin.id ? 'rgba(232,160,32,0.6)' : 'rgba(232,160,32,0.2)'}`, background: selectedPin === pin.id ? 'rgba(232,160,32,0.15)' : 'rgba(255,255,255,0.02)', color: selectedPin === pin.id ? '#E8A020' : '#7A6A5A', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 11, transition: 'all 0.2s' }}>📍 {pin.titulo}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 🗡️ MAPA DE BATALHA — múltiplos mapas pré-salvos + tokens arrastáveis ────
const TOKEN_TYPES = {
  jogador: { label: 'Jogador', color: '#4ADE80', ring: 'rgba(74,222,128,0.6)' },
  inimigo: { label: 'Inimigo', color: '#E8193C', ring: 'rgba(232,25,60,0.6)' },
};
const newToken = id => ({ id, nome: '', foto: '', tipo: 'jogador', x: 50, y: 50, size: 70, locked: false });
const newBattleMap = id => ({ id, nome: 'Novo Mapa', img: '', tokens: [] });

function EquipMiniList({ sheet, color }) {
  const slots = [
    { key: 'equip_mao_esq', label: 'Mão Esq.' },
    { key: 'equip_mao_dir', label: 'Mão Dir.' },
    { key: 'equip_corpo',   label: 'Corpo' },
  ];
  return (
    <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {slots.map(s => {
        const d = sheet[s.key] || {};
        const icon = resolveEquipIcon(d.tipo || '');
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 7, background: `${color}08`, border: `1px solid ${color}20` }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: 9, color: `${color}99`, fontFamily: 'Cinzel,serif', letterSpacing: '0.04em', flexShrink: 0, minWidth: 46 }}>{s.label}</span>
            <span style={{ fontSize: 11, color: '#C8B8A0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nome || '—'}</span>
            {d.dano && <span style={{ fontSize: 10, color: 'rgba(255,200,80,0.85)', fontFamily: 'Cinzel,serif', background: 'rgba(255,200,80,0.08)', border: '1px solid rgba(255,200,80,0.22)', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>⚔ {d.dano}</span>}
          </div>
        );
      })}
    </div>
  );
}

function BattleMapCharPanel({ sheet, customAbilities, onSaveCustomAbilities, onChangeSheet }) {
  const cls = CLASSES.find(c => c.id === sheet.classe) || CLASSES[0];
  const sheetColor = SHEET_COLORS[sheet.classe] || cls.color;
  const f = (k, v) => onChangeSheet({ ...sheet, [k]: v });
  const hp = sheet.hp || 0;
  const hpBonus = sheet.hp_bonus || 0;
  const attrPoints = sheet.attrPoints || 0;
  const sheetCooldowns = sheet.cooldowns || {};
  const handleUpdateCooldown = (abilityId, turns) => f('cooldowns', { ...sheetCooldowns, [abilityId]: turns });
  const handleSpendPoint = (attrKey, newVal) => {
    if (attrPoints <= 0) return;
    onChangeSheet({ ...sheet, [attrKey]: newVal, attrPoints: attrPoints - 1 });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
        {sheet.foto
          ? <img src={sheet.foto} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', border: `1.5px solid ${sheetColor}55`, flexShrink: 0 }} />
          : <div style={{ width: 36, height: 36, borderRadius: 8, background: `${sheetColor}15`, border: `1.5px dashed ${sheetColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{cls.icon}</div>}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 13, fontWeight: 700, color: sheetColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sheet.nome || 'Sem nome'}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cinzel,serif' }}>{cls.icon} {cls.name} · Nv {sheet.nivel || 1}</div>
        </div>
      </div>

      <EquipMiniList sheet={sheet} color={sheetColor} />

      <div style={{ background: 'rgba(232,25,60,0.06)', border: '1px solid rgba(232,25,60,0.18)', borderRadius: 12, padding: '11px 12px', marginBottom: 12 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.25em', color: '#E8193C', fontFamily: 'Cinzel,serif', marginBottom: 8, textTransform: 'uppercase', textAlign: 'center' }}>❤️ Vida</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
          <button onClick={() => f('hp', Math.max(0, hp - 1))} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(232,25,60,0.4)', background: 'rgba(232,25,60,0.15)', color: '#E8193C', cursor: 'pointer', fontSize: 17, lineHeight: 1, padding: 0 }}>−</button>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 27, fontWeight: 900, color: hpColor(hp, hp + hpBonus || 1), minWidth: 44, textAlign: 'center' }}>{hp}</div>
          <button onClick={() => f('hp', hp + 1)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.15)', color: '#4ADE80', cursor: 'pointer', fontSize: 17, lineHeight: 1, padding: 0 }}>+</button>
        </div>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[-10, -5].map(v => <button key={v} onClick={() => f('hp', Math.max(0, hp + v))} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(232,25,60,0.3)', background: 'rgba(232,25,60,0.1)', color: '#E8193C', cursor: 'pointer', fontSize: 10 }}>{v}</button>)}
          {[5, 10].map(v => <button key={v} onClick={() => f('hp', hp + v)} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.1)', color: '#4ADE80', cursor: 'pointer', fontSize: 10 }}>+{v}</button>)}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.25em', color: sheetColor, fontFamily: 'Cinzel,serif', marginBottom: 6, textTransform: 'uppercase' }}>Vigor Cósmico</div>
        <VigosWithLocked value={sheet.vigos || 0} nivel={sheet.nivel || 1} color={sheetColor} onChange={v => f('vigos', v)} />
      </div>

      <StatusPanel sheet={sheet} onChange={onChangeSheet} />

      {attrPoints > 0 && (
        <div style={{ marginBottom: 12, padding: '9px 10px', border: '1px solid rgba(168,85,247,0.5)', borderRadius: 9, background: 'rgba(168,85,247,0.08)', animation: 'bannerGlow 2s ease-in-out infinite', fontSize: 11, color: '#C8A8E8', fontFamily: 'Cinzel,serif', lineHeight: 1.5 }}>
          ✨ {attrPoints} ponto{attrPoints > 1 ? 's' : ''} de atributo disponíve{attrPoints > 1 ? 'is' : 'l'}! Use na aba "Fichas" para distribuir.
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.25em', color: '#5A5070', fontFamily: 'Cinzel,serif', marginBottom: 7, textTransform: 'uppercase' }}>Bônus de Atributos</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
          {ATTRS.map(a => {
            const bonus = Math.floor((sheet[a.key] || 0) / 2);
            return (
              <div key={a.key} style={{ textAlign: 'center', padding: '7px 4px', borderRadius: 8, background: `${a.color}0D`, border: `1px solid ${a.color}28` }}>
                <div style={{ fontSize: 8, fontFamily: 'Cinzel,serif', color: a.color, letterSpacing: '0.03em', marginBottom: 3, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.label}</div>
                <div style={{ fontSize: 15, fontFamily: 'Cinzel,serif', fontWeight: 700, color: bonus > 0 ? a.color : 'rgba(255,255,255,0.15)' }}>{bonus > 0 ? `+${bonus}` : '—'}</div>
              </div>
            );
          })}
        </div>
      </div>

      {cls.id !== 'personalizado' && (
        <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {cls.specials.map((sp, i) => {
            const key = i === 0 ? 'especial1' : 'especial2';
            const unlocked = sheet[key];
            const canUnlock = i === 0 ? sheet.nivel >= 3 : sheet.nivel >= 7;
            return (
              <button key={i} onClick={() => f(key, !unlocked)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 7, border: `1px solid ${unlocked ? sheetColor + '55' : 'rgba(255,255,255,0.09)'}`, background: unlocked ? `${sheetColor}14` : 'rgba(255,255,255,0.02)', cursor: canUnlock ? 'pointer' : 'not-allowed', opacity: canUnlock ? 1 : 0.5, transition: 'all 0.2s', textAlign: 'left' }}>
                <span style={{ fontSize: 11 }}>{unlocked ? '✦' : '○'}</span>
                <div>
                  <div style={{ fontSize: 10.5, color: unlocked ? sheetColor : '#6A5A6A', fontFamily: 'Cinzel,serif' }}>{sp.name}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)' }}>Nível {sp.req}+</div>
                </div>
              </button>
            );
          })}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 7, border: `1px solid ${sheetColor}33`, background: `${sheetColor}0A` }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: 'Cinzel,serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Alcance</span>
            <span style={{ fontSize: 13, fontFamily: 'Cinzel,serif', color: sheetColor, fontWeight: 700 }}>{cls.alcance}</span>
          </div>
        </div>
      )}

      <HabilidadesPanel
        cls={cls}
        sheet={sheet}
        customAbilities={customAbilities || []}
        masterMode={false}
        onSaveCustomAbilities={onSaveCustomAbilities}
        sheetCooldowns={sheetCooldowns}
        onUpdateCooldown={handleUpdateCooldown}
        currentVigos={sheet.vigos ?? 0}
        onSpendVC={(cost) => f('vigos', Math.max(0, (sheet.vigos ?? 0) - cost))}
        characterName={sheet.nome || 'Personagem'}
      />

      </div>
  );
}

function BattleMapSection({ masterMode }) {
  const [maps, setMaps] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [draggingId, setDraggingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formNome, setFormNome] = useState('');
  const [formTipo, setFormTipo] = useState('jogador');
  const [formFoto, setFormFoto] = useState('');
  const [showMapNameEdit, setShowMapNameEdit] = useState(false);
  const [barOpen, setBarOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [baseSize, setBaseSize] = useState({ w: 0, h: 0 });
  const frameRef = useRef(null);
  const naturalSizeRef = useRef({ w: 0, h: 0 });
  const recomputeFit = () => {
    const frame = frameRef.current;
    const nat = naturalSizeRef.current;
    if (!frame || !nat.w || !nat.h) return;
    const frameW = frame.clientWidth;
    const frameH = frame.clientHeight;
    if (!frameW || !frameH) return;
    const scale = Math.min(frameW / nat.w, frameH / nat.h);
    setBaseSize({ w: nat.w * scale, h: nat.h * scale });
  };
  const handleMapImgLoad = (e) => {
    naturalSizeRef.current = { w: e.target.naturalWidth, h: e.target.naturalHeight };
    recomputeFit();
  };
  const mapRef = useRef(null);
  const fileRef = useRef(null);
  const tokenFileRef = useRef(null);
  const moved = useRef(false);
  const mapsRef = useRef([]);
  const saveTimeout = useRef({});
  const lastTokenWriteRef = useRef({});

  const [sheets, setSheets] = useState([]);
  const [customAbilities, setCustomAbilities] = useState({});
  const [floatingSheets, setFloatingSheets] = useState([]); // {sheetId, x, y, z}
  const zTopRef = useRef(60);
  const [unlockedIds, setUnlockedIds] = useState({});
  const [pwTarget, setPwTarget] = useState(null);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);

  useEffect(() => { mapsRef.current = maps; }, [maps]);

  useEffect(() => {
    setZoom(1);
    recomputeFit();
    const t = setTimeout(recomputeFit, 150);
    window.addEventListener('resize', recomputeFit);
    return () => { clearTimeout(t); window.removeEventListener('resize', recomputeFit); };
  }, [editingId, activeId, masterMode]);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'battlemaps'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMaps(data); setLoaded(true);
    });
    const u2 = onSnapshot(doc(db, 'config', 'battlemap_active'), snap => {
      if (snap.exists()) setActiveId(snap.data().activeId || '');
    });
    const u3 = onSnapshot(collection(db, 'sheets'), snap => {
      setSheets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const u4 = onSnapshot(doc(db, 'config', 'customAbilities'), snap => {
      if (snap.exists()) setCustomAbilities(snap.data() || {});
    });
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  useEffect(() => {
    if (!masterMode) return;
    if (!editingId && activeId) setEditingId(activeId);
    if (!editingId && !activeId && maps.length > 0) setEditingId(maps[0].id);
  }, [masterMode, activeId, maps, editingId]);

  const currentMapId = masterMode ? (editingId || activeId) : activeId;
  const currentMap = maps.find(m => String(m.id) === String(currentMapId));

  const persistMap = (mapId, data) => {
    clearTimeout(saveTimeout.current[mapId]);
    saveTimeout.current[mapId] = setTimeout(async () => {
      try { await setDoc(doc(db, 'battlemaps', String(mapId)), data); } catch (e) { console.error(e); }
    }, 450);
  };

  const updCurrentMap = (patch) => {
    if (!currentMap) return;
    const updated = { ...currentMap, ...patch };
    setMaps(prev => prev.map(m => m.id === currentMap.id ? updated : m));
    persistMap(currentMap.id, updated);
  };

  const addMap = () => {
    const m = newBattleMap(Date.now());
    setDoc(doc(db, 'battlemaps', String(m.id)), m);
    setEditingId(String(m.id));
  };
  const deleteMap = async (id) => {
    await deleteDoc(doc(db, 'battlemaps', String(id)));
    if (activeId === String(id)) await setDoc(doc(db, 'config', 'battlemap_active'), { activeId: '' });
    if (editingId === String(id)) setEditingId('');
  };
  const activateMap = async (id) => {
    await setDoc(doc(db, 'config', 'battlemap_active'), { activeId: String(id) });
    pushToast('Mapa liberado para os jogadores!', '🗡️', '#E8193C');
  };
  const deactivateMap = async () => {
    await setDoc(doc(db, 'config', 'battlemap_active'), { activeId: '' });
  };

  const handleMapUpload = e => {
    const file = e.target.files[0]; if (!file || !currentMap) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const compressed = await compressImage(ev.target.result, 1400, 1400, 0.78);
      updCurrentMap({ img: compressed });
    };
    reader.readAsDataURL(file); e.target.value = '';
  };

  const handleTokenPhoto = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const compressed = await compressImagePNG(ev.target.result, 320, 320);
      setFormFoto(compressed);
    };
    reader.readAsDataURL(file); e.target.value = '';
  };

  const addToken = () => {
    if (!formNome.trim() || !formFoto || !currentMap) return;
    const nt = { ...newToken(Date.now()), nome: formNome.trim(), tipo: formTipo, foto: formFoto };
    updCurrentMap({ tokens: [...(currentMap.tokens || []), nt] });
    setFormNome(''); setFormFoto(''); setShowAddForm(false);
  };

  const updateToken = (id, data) => {
    if (!currentMap) return;
    updCurrentMap({ tokens: (currentMap.tokens || []).map(t => t.id === id ? { ...t, ...data } : t) });
  };
  const deleteToken = id => {
    if (!currentMap) return;
    updCurrentMap({ tokens: (currentMap.tokens || []).filter(t => t.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const onTokenPointerDown = (e, token) => {
    if (token.locked && !masterMode) return;
    e.stopPropagation();
    moved.current = false;
    setDraggingId(token.id);
  };

  useEffect(() => {
    if (!draggingId || !currentMap) return;
    const mapIdAtDragStart = currentMap.id;
    const TOKEN_THROTTLE_MS = 100;

    const throttledTokenWrite = (mapObj) => {
      const now = Date.now();
      const last = lastTokenWriteRef.current[mapIdAtDragStart] || 0;
      clearTimeout(saveTimeout.current['tok_' + mapIdAtDragStart]);
      if (now - last >= TOKEN_THROTTLE_MS) {
        lastTokenWriteRef.current[mapIdAtDragStart] = now;
        setDoc(doc(db, 'battlemaps', String(mapIdAtDragStart)), mapObj).catch(e => console.error(e));
      } else {
        saveTimeout.current['tok_' + mapIdAtDragStart] = setTimeout(() => {
          lastTokenWriteRef.current[mapIdAtDragStart] = Date.now();
          setDoc(doc(db, 'battlemaps', String(mapIdAtDragStart)), mapObj).catch(e => console.error(e));
        }, TOKEN_THROTTLE_MS - (now - last));
      }
    };

    const move = (e) => {
      if (!mapRef.current) return;
      moved.current = true;
      const rect = mapRef.current.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      let x = ((clientX - rect.left) / rect.width) * 100;
      let y = ((clientY - rect.top) / rect.height) * 100;
      x = Math.min(100, Math.max(0, x));
      y = Math.min(100, Math.max(0, y));
      setMaps(prev => {
        const updated = prev.map(m => m.id === mapIdAtDragStart ? { ...m, tokens: (m.tokens || []).map(t => t.id === draggingId ? { ...t, x, y } : t) } : m);
        const changedMap = updated.find(m => m.id === mapIdAtDragStart);
        if (changedMap) throttledTokenWrite(changedMap);
        return updated;
      });
    };
    const up = () => {
      clearTimeout(saveTimeout.current['tok_' + mapIdAtDragStart]);
      const latest = mapsRef.current.find(m => m.id === mapIdAtDragStart);
      if (latest) {
        lastTokenWriteRef.current[mapIdAtDragStart] = Date.now();
        setDoc(doc(db, 'battlemaps', String(mapIdAtDragStart)), latest).catch(e => console.error(e));
      }
      if (!moved.current) setSelectedId(prevSel => prevSel === draggingId ? null : draggingId);
      setDraggingId(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [draggingId, currentMap]);

  const selectedToken = (currentMap?.tokens || []).find(t => t.id === selectedId);

  const saveSheet = sheet => {
    clearTimeout(saveTimeout.current['sheet_' + sheet.id]);
    saveTimeout.current['sheet_' + sheet.id] = setTimeout(async () => {
      try { await setDoc(doc(db, 'sheets', String(sheet.id)), sheet); } catch (e) { console.error(e); }
    }, 700);
  };
  const updSheet = (id, data) => { setSheets(prev => prev.map(s => s.id === id ? data : s)); saveSheet(data); };
  const saveCustomAb = async (sheetId, novas) => {
    const updated = { ...customAbilities, [sheetId]: novas };
    try { await setDoc(doc(db, 'config', 'customAbilities'), updated); setCustomAbilities(updated); } catch (e) { console.error(e); }
  };

  const toggleFloatingSheet = (sid) => {
    setFloatingSheets(prev => {
      const exists = prev.find(p => p.sheetId === sid);
      if (exists) return prev.filter(p => p.sheetId !== sid);
      zTopRef.current += 1;
      const idx = prev.length;
      const baseX = 90 + (idx % 4) * 40;
      const baseY = 70 + (idx % 4) * 40;
      return [...prev, { sheetId: sid, x: baseX, y: baseY, z: zTopRef.current }];
    });
  };
  const bringFloatingToFront = (sid) => {
    zTopRef.current += 1;
    const z = zTopRef.current;
    setFloatingSheets(prev => prev.map(p => p.sheetId === sid ? { ...p, z } : p));
  };
  const moveFloatingSheet = (sid, x, y) => {
    setFloatingSheets(prev => prev.map(p => p.sheetId === sid ? { ...p, x, y } : p));
  };
  const closeFloatingSheet = (sid) => {
    setFloatingSheets(prev => prev.filter(p => p.sheetId !== sid));
  };
  const handleSelectSheet = (s) => {
    const sid = String(s.id);
    if (masterMode || !s.senha || unlockedIds[sid]) { toggleFloatingSheet(sid); return; }
    setPwTarget(sid); setPwInput(''); setPwError(false);
  };
  const tryPassword = () => {
    const s = sheets.find(x => String(x.id) === pwTarget);
    if (s && pwInput === s.senha) {
      setUnlockedIds(prev => ({ ...prev, [pwTarget]: true }));
      toggleFloatingSheet(pwTarget);
      setPwTarget(null); setPwInput('');
    } else {
      setPwError(true); setPwInput('');
      setTimeout(() => setPwError(false), 600);
    }
  };

  const quickAddSheet = () => {
    if (sheets.length >= 15) return;
    const s = newSheet(Date.now());
    setDoc(doc(db, 'sheets', String(s.id)), s);
    toggleFloatingSheet(String(s.id));
  };

  const zoomBtnStyle = { width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', color: '#C8B8A0', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 8px 8px' }}>

      {/* CABEÇALHO COMPACTO */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px', flexShrink: 0 }}>
        <span style={{ fontSize: 14 }}>🗡️</span>
        <h2 style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 14, color: '#E8D8C0', fontWeight: 700, margin: 0, letterSpacing: '0.04em' }}>Mapa de Batalha</h2>
        {currentMap?.nome && <span style={{ fontSize: 11, color: '#5A5070', fontFamily: 'Cinzel,serif' }}>· {currentMap.nome}</span>}
      </div>

      {pwTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9980, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }} onClick={() => setPwTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(10,12,28,0.98)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: 16, padding: 28, width: 300, textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <div style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 16, color: '#C8A8E8', marginBottom: 6 }}>Ficha Protegida</div>
            <div style={{ fontSize: 12, color: '#5A5070', fontFamily: 'Cinzel,serif', marginBottom: 18 }}>Digite a senha para acessar esta ficha.</div>
            <input type="password" value={pwInput} onChange={e => setPwInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && tryPassword()} placeholder="Senha..." autoFocus style={{ width: '100%', textAlign: 'center', marginBottom: 12, fontSize: 16, border: `1px solid ${pwError ? 'rgba(232,25,60,0.7)' : 'rgba(168,85,247,0.4)'}`, transition: 'border-color 0.3s' }} />
            {pwError && <div style={{ fontSize: 12, color: '#E8193C', fontFamily: 'Cinzel,serif', marginBottom: 10 }}>Senha incorreta.</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPwTarget(null)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#5A5070', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 12 }}>Cancelar</button>
              <button onClick={tryPassword} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.5)', background: 'rgba(168,85,247,0.12)', color: '#C8A8E8', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 12, fontWeight: 600 }}>Entrar</button>
            </div>
          </div>
        </div>
      )}

      {!loaded && <div style={{ textAlign: 'center', color: '#5A5070', fontFamily: 'Cinzel,serif', fontSize: 13, padding: 40 }}>Carregando o campo de batalha...</div>}

      {loaded && (
        <div style={{ position: 'relative', flex: 1, minHeight: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(232,25,60,0.25)', boxShadow: '0 4px 24px rgba(0,0,0,0.6)', background: '#04060F' }}>

          {/* BARRA FLUTUANTE DO MESTRE — não empurra o mapa */}
          {masterMode && (
            <div style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 40, display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'none' }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', pointerEvents: 'auto' }}>
                {maps.map(m => {
                  const isEditing = String(m.id) === String(editingId || activeId);
                  const isActive = String(m.id) === String(activeId);
                  return (
                    <button key={m.id} onClick={() => setEditingId(String(m.id))} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8,
                      border: `1px solid ${isEditing ? 'rgba(232,25,60,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      background: isEditing ? 'rgba(232,25,60,0.15)' : 'rgba(4,6,15,0.7)',
                      color: isEditing ? '#E8193C' : '#C8B8A0', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10,
                      backdropFilter: 'blur(6px)',
                    }}>
                      {isActive && <span title="Visível para jogadores" style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 5px #4ADE80', flexShrink: 0 }} />}
                      {m.nome || 'Mapa'}
                    </button>
                  );
                })}
                <button onClick={addMap} style={{ padding: '5px 10px', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.2)', background: 'rgba(4,6,15,0.7)', color: '#8A7A9A', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10, backdropFilter: 'blur(6px)' }}>+ Novo Mapa</button>
              </div>

              {currentMap && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', pointerEvents: 'auto' }}>
                  {showMapNameEdit ? (
                    <input value={currentMap.nome} onChange={e => updCurrentMap({ nome: e.target.value })} onBlur={() => setShowMapNameEdit(false)} onKeyDown={e => e.key === 'Enter' && setShowMapNameEdit(false)} autoFocus style={{ fontSize: 11, fontFamily: 'Cinzel,serif', width: 140 }} />
                  ) : (
                    <button onClick={() => setShowMapNameEdit(true)} style={{ ...zoomBtnStyle, width: 'auto', padding: '5px 9px', background: 'rgba(4,6,15,0.7)', backdropFilter: 'blur(6px)' }}>✎ Renomear</button>
                  )}
                  <button onClick={() => fileRef.current?.click()} style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid rgba(232,25,60,0.3)', background: 'rgba(232,25,60,0.12)', color: '#E8193C', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10, backdropFilter: 'blur(6px)' }}>🗺 {currentMap.img ? 'Trocar' : 'Enviar'} Imagem</button>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleMapUpload} style={{ display: 'none' }} />
                  <button onClick={() => setShowAddForm(o => !o)} style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.12)', color: '#4ADE80', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10, backdropFilter: 'blur(6px)' }}>+ Token</button>
                  {String(activeId) === String(currentMap.id)
                    ? <button onClick={deactivateMap} style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid rgba(232,160,32,0.35)', background: 'rgba(232,160,32,0.12)', color: '#E8A020', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10, backdropFilter: 'blur(6px)' }}>🙈 Ocultar</button>
                    : <button onClick={() => activateMap(currentMap.id)} style={{ padding: '5px 9px', borderRadius: 7, border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.15)', color: '#4ADE80', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10, fontWeight: 700, backdropFilter: 'blur(6px)' }}>👁 Revelar</button>
                  }
                  <button onClick={() => deleteMap(currentMap.id)} style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid rgba(232,25,60,0.25)', background: 'rgba(4,6,15,0.7)', color: '#7A4040', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10, backdropFilter: 'blur(6px)' }}>🗑</button>
                </div>
              )}
            </div>
          )}

          {/* FORM DE NOVO TOKEN — flutuante */}
          {showAddForm && masterMode && currentMap && (
            <div style={{ position: 'absolute', top: 70, left: 10, zIndex: 41, width: 300, border: '1px solid rgba(74,222,128,0.3)', borderRadius: 12, background: 'rgba(8,10,20,0.96)', backdropFilter: 'blur(10px)', padding: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.6)' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.3em', color: '#4ADE80', fontFamily: 'Cinzel,serif', marginBottom: 10, textTransform: 'uppercase' }}>Novo Token</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div onClick={() => tokenFileRef.current?.click()} style={{ width: 60, height: 60, borderRadius: 10, border: '1px dashed rgba(255,255,255,0.15)', background: formFoto ? `url(${formFoto}) center/contain no-repeat` : 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  {!formFoto && <span style={{ fontSize: 20, opacity: 0.3 }}>🖼️</span>}
                </div>
                <input ref={tokenFileRef} type="file" accept="image/png" onChange={handleTokenPhoto} style={{ display: 'none' }} />
                <div style={{ flex: 1 }}>
                  <input value={formNome} onChange={e => setFormNome(e.target.value)} placeholder="Nome do token..." style={{ width: '100%', fontSize: 12, marginBottom: 6 }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    {Object.entries(TOKEN_TYPES).map(([key, t]) => (
                      <button key={key} onClick={() => setFormTipo(key)} style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: `1px solid ${formTipo === key ? t.color + '77' : 'rgba(255,255,255,0.1)'}`, background: formTipo === key ? `${t.color}18` : 'rgba(255,255,255,0.02)', color: formTipo === key ? t.color : '#6A5A7A', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10 }}>{t.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={addToken} disabled={!formNome.trim() || !formFoto} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid rgba(74,222,128,0.45)', background: (formNome.trim() && formFoto) ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.02)', color: (formNome.trim() && formFoto) ? '#4ADE80' : '#5A5070', cursor: (formNome.trim() && formFoto) ? 'pointer' : 'not-allowed', fontFamily: 'Cinzel,serif', fontSize: 11 }}>✦ Adicionar</button>
                <button onClick={() => { setShowAddForm(false); setFormNome(''); setFormFoto(''); }} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#5A5070', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 11 }}>Cancelar</button>
              </div>
            </div>
          )}

          {/* ESTADOS VAZIOS — centralizados dentro do mapa */}
          {!currentMap && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.3 }}>🗺️</div>
              <div style={{ fontFamily: 'Cinzel,serif', fontSize: 14, color: '#6A5A7A', marginBottom: 16 }}>
                {masterMode ? 'Crie um novo mapa para começar.' : 'O Mestre ainda não revelou nenhum mapa de batalha.'}
              </div>
              {masterMode && maps.length === 0 && <button onClick={addMap} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid rgba(232,25,60,0.4)', background: 'rgba(232,25,60,0.1)', color: '#E8193C', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 13, letterSpacing: '0.08em' }}>+ Criar Primeiro Mapa</button>}
            </div>
          )}

          {currentMap && !currentMap.img && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.3 }}>🖼️</div>
              <div style={{ fontFamily: 'Cinzel,serif', fontSize: 14, color: '#6A5A7A', marginBottom: 16 }}>{masterMode ? 'Envie a imagem deste mapa.' : 'Este mapa ainda não possui uma imagem.'}</div>
              {masterMode && <button onClick={() => fileRef.current?.click()} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid rgba(232,25,60,0.4)', background: 'rgba(232,25,60,0.1)', color: '#E8193C', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 13, letterSpacing: '0.08em' }}>📁 Enviar Imagem</button>}
            </div>
          )}

          {/* MAPA — ocupa 100% da área disponível */}
          {currentMap && currentMap.img && (
            <div ref={frameRef} style={{ position: 'absolute', inset: 0, display: zoom > 1 ? 'block' : 'flex', alignItems: zoom > 1 ? undefined : 'center', justifyContent: zoom > 1 ? undefined : 'center', overflow: zoom > 1 ? 'auto' : 'hidden' }}>
              <div
                ref={mapRef}
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  width: baseSize.w ? baseSize.w * zoom : '100%',
                  height: baseSize.h ? baseSize.h * zoom : '100%',
                  userSelect: 'none', touchAction: 'none',
                }}
              >
                <img src={currentMap.img} alt="mapa de batalha" draggable={false} onLoad={handleMapImgLoad} style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} />
                {(currentMap.tokens || []).map(token => {
                  const info = TOKEN_TYPES[token.tipo] || TOKEN_TYPES.jogador;
                  const isSelected = selectedId === token.id;
                  const canDrag = masterMode || !token.locked;
                  const dispSize = (token.size || 70) * zoom;
                  return (
                    <div
                      key={token.id}
                      onPointerDown={e => canDrag && onTokenPointerDown(e, token)}
                      onTouchStart={e => canDrag && onTokenPointerDown(e, token)}
                      style={{
                        position: 'absolute', left: `${token.x}%`, top: `${token.y}%`,
                        transform: 'translate(-50%, -50%)', cursor: canDrag ? 'grab' : 'not-allowed',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 * zoom,
                        zIndex: draggingId === token.id ? 20 : isSelected ? 15 : 5,
                        touchAction: 'none',
                      }}
                    >
                     <div style={{
                      width: dispSize, height: dispSize, borderRadius: '50%',
                      border: draggingId === token.id ? `2px solid ${info.ring}` : isSelected ? '2px solid #fff' : '2px solid transparent',
                      boxShadow: draggingId === token.id ? `0 0 14px ${info.color}` : isSelected ? `0 0 14px ${info.color}` : '0 2px 8px rgba(0,0,0,0.4)',
                      background: 'transparent', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: draggingId === token.id ? 'none' : 'box-shadow 0.2s, border-color 0.2s',
                     }}>
                        {token.foto
                          ? <img src={token.foto} alt="" draggable={false} style={{ width: '92%', height: '92%', objectFit: 'contain', pointerEvents: 'none' }} />
                          : <span style={{ fontSize: dispSize * 0.4 }}>{token.tipo === 'inimigo' ? '💀' : '🧙'}</span>}
                      </div>
                      <div style={{ fontSize: 10 * zoom, fontFamily: 'Cinzel,serif', color: info.color, background: 'rgba(4,6,15,0.75)', borderRadius: 5 * zoom, padding: `${1 * zoom}px ${7 * zoom}px`, whiteSpace: 'nowrap', maxWidth: 90 * zoom, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {token.nome}{token.locked && ' 🔒'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PAINEL DO TOKEN SELECIONADO — flutuante, canto superior direito */}
          {selectedToken && masterMode && (
            <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 41, width: 280, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, background: 'rgba(10,12,28,0.96)', padding: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${(TOKEN_TYPES[selectedToken.tipo] || TOKEN_TYPES.jogador).color}55`, flexShrink: 0 }}>
                  {selectedToken.foto && <img src={selectedToken.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                </div>
                <input value={selectedToken.nome} onChange={e => updateToken(selectedToken.id, { nome: e.target.value })} style={{ flex: 1, fontFamily: 'Cinzel,serif', fontSize: 12 }} />
                <button onClick={() => setSelectedId(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#5A5070', borderRadius: 5, cursor: 'pointer', padding: '3px 8px', fontSize: 11 }}>✕</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 10, color: '#7B6D8A', fontFamily: 'Cinzel,serif' }}>Tamanho</span>
                <input type="range" min={40} max={120} step={5} value={selectedToken.size || 70} onChange={e => updateToken(selectedToken.id, { size: Number(e.target.value) })} style={{ flex: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => updateToken(selectedToken.id, { locked: !selectedToken.locked })} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: `1px solid ${selectedToken.locked ? 'rgba(232,160,32,0.4)' : 'rgba(255,255,255,0.1)'}`, background: selectedToken.locked ? 'rgba(232,160,32,0.1)' : 'rgba(255,255,255,0.02)', color: selectedToken.locked ? '#E8A020' : '#8A7A6A', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 11 }}>{selectedToken.locked ? '🔒 Travado' : '🔓 Livre'}</button>
                <button onClick={() => deleteToken(selectedToken.id)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(232,25,60,0.3)', background: 'rgba(232,25,60,0.08)', color: '#E8193C', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 11 }}>🗑</button>
              </div>
            </div>
          )}

          {/* CONTROLE DE ZOOM — canto inferior direito, compacto */}
          {currentMap?.img && (
            <div className="battlemap-zoom-controls" style={{ position: 'absolute', right: 16, bottom: barOpen ? 96 : 20, transition: 'bottom .25s ease', zIndex: 40, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(6,8,18,0.82)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '6px 8px', backdropFilter: 'blur(8px)', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
              <span style={{ fontSize: 12 }}>🔍</span>
              <button onClick={() => setZoom(z => Math.max(1, +(z - 0.25).toFixed(2)))} style={zoomBtnStyle}>−</button>
              <span style={{ fontSize: 11, color: '#C8B8A0', fontFamily: 'Cinzel,serif', minWidth: 36, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))} style={zoomBtnStyle}>+</button>
              <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />
              <button onClick={() => setZoom(1)} title="Ajustar à tela" style={zoomBtnStyle}>⤢</button>
            </div>
          )}

          {/* FICHAS FLUTUANTES */}
          {floatingSheets.map(p => {
            const sheet = sheets.find(s => String(s.id) === p.sheetId);
            if (!sheet) return null;
            const cls = CLASSES.find(c => c.id === sheet.classe) || CLASSES[0];
            const sc = SHEET_COLORS[sheet.classe] || cls.color;
            return (
              <FloatingSheetPanel
                key={p.sheetId}
                sheet={sheet}
                color={sc}
                pos={p}
                zIndex={p.z}
                customAbilities={customAbilities[sheet.id] || []}
                onSaveCustomAbilities={(novas) => saveCustomAb(sheet.id, novas)}
                onChangeSheet={(d) => updSheet(sheet.id, d)}
                onDrag={(x, y) => moveFloatingSheet(p.sheetId, x, y)}
                onFocus={() => bringFloatingToFront(p.sheetId)}
                onClose={() => closeFloatingSheet(p.sheetId)}
              />
            );
          })}

          {/* BARRA INFERIOR DE FICHAS */}
          {/* BOTÃO DE FICHAS — apenas ícone; ao clicar, expande a barra */}
          {!barOpen && (
            <button onClick={() => setBarOpen(true)} title="Fichas" className="battlemap-bottombar" style={{
              position: 'absolute', left: 16, bottom: 16, zIndex: 45,
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(6,8,18,0.85)', border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, cursor: 'pointer', color: '#C8A8E8',
            }}>👥</button>
          )}

          {barOpen && (
            <div className="battlemap-bottombar" style={{
              position: 'absolute', left: 16, bottom: 16, zIndex: 45, maxWidth: 'calc(100% - 32px)',
              background: 'rgba(6,8,18,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
            }}>
              <button onClick={() => setBarOpen(false)} title="Recolher" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#C8A8E8', fontSize: 15, cursor: 'pointer', padding: '4px 6px', flexShrink: 0 }}>👥</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', maxWidth: '75vw', paddingBottom: 2 }}>
                {sheets.length === 0 && <div style={{ fontSize: 11, color: '#4A4050', fontFamily: 'Cinzel,serif', fontStyle: 'italic', padding: '0 8px' }}>Nenhuma ficha criada.</div>}
                {sheets.map(s => {
                  const cls = CLASSES.find(c => c.id === s.classe) || CLASSES[0];
                  const sc = SHEET_COLORS[s.classe] || cls.color;
                  const locked = !masterMode && s.senha && !unlockedIds[String(s.id)];
                  const isOpen = floatingSheets.some(p => p.sheetId === String(s.id));
                  return (
                    <button key={s.id} onClick={() => handleSelectSheet(s)} style={{
                      display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, padding: '4px 10px 4px 4px',
                      borderRadius: 20, border: `1px solid ${isOpen ? sc + 'AA' : sc + '33'}`,
                      background: isOpen ? `${sc}22` : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: isOpen ? `0 0 10px ${sc}55` : 'none',
                    }}>
                      {s.foto
                        ? <img src={s.foto} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${sc}88`, filter: locked ? 'grayscale(70%)' : 'none' }} />
                        : <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${sc}20`, border: `1.5px solid ${sc}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{locked ? '🔒' : cls.icon}</div>}
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontFamily: 'Cinzel,serif', fontSize: 11, fontWeight: 700, color: isOpen ? sc : '#C8B8A0', whiteSpace: 'nowrap' }}>{s.nome || 'Sem nome'}</div>
                        <div style={{ fontSize: 9, color: '#5A5070' }}>NV {s.nivel || 1}</div>
                      </div>
                    </button>
                  );
                })}
                {masterMode && sheets.length < 15 && (
                  <button onClick={quickAddSheet} title="Adicionar Ficha" style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.02)', color: '#8A7A9A', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function FloatingSheetPanel({ sheet, color, pos, zIndex, customAbilities, onSaveCustomAbilities, onChangeSheet, onDrag, onFocus, onClose }) {
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0, px: 0, py: 0 });

  const onHeaderDown = (e) => {
    onFocus();
    draggingRef.current = true;
    movedRef.current = false;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startRef.current = { x: pos.x, y: pos.y, px: clientX, py: clientY };
  };

  useEffect(() => {
    const move = (e) => {
      if (!draggingRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - startRef.current.px;
      const dy = clientY - startRef.current.py;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
      let nx = startRef.current.x + dx;
      let ny = startRef.current.y + dy;
      nx = Math.min(window.innerWidth - 60, Math.max(-260, nx));
      ny = Math.min(window.innerHeight - 40, Math.max(0, ny));
      onDrag(nx, ny);
    };
    const up = () => {
      if (draggingRef.current && !movedRef.current) onClose();
      draggingRef.current = false;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [onDrag, onClose]);

  return (
    <div className="floating-sheet" onPointerDown={onFocus} style={{ position: 'fixed', left: pos.x, top: pos.y, width: 320, maxHeight: '68vh', zIndex, background: 'rgba(8,10,22,0.98)', border: `1px solid ${color}55`, borderRadius: 12, boxShadow: '0 14px 44px rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        onPointerDown={onHeaderDown}
        onTouchStart={onHeaderDown}
        style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, background: `${color}14`, borderBottom: `1px solid ${color}33`, cursor: 'grab', userSelect: 'none', flexShrink: 0 }}
      >
        <span style={{ fontSize: 13, color }}>⠿</span>
        <span style={{ flex: 1, fontFamily: 'Cinzel,serif', fontSize: 12.5, color, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sheet.nome || 'Sem nome'}</span>
        <button onClick={onClose} onPointerDown={e => e.stopPropagation()} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: '#8A7A6A', cursor: 'pointer', fontSize: 11, padding: '2px 7px', borderRadius: 5 }}>✕</button>
      </div>
      <div style={{ overflowY: 'auto', padding: 13, flex: 1 }}>
        <BattleMapCharPanel
          sheet={sheet}
          customAbilities={customAbilities}
          onSaveCustomAbilities={onSaveCustomAbilities}
          onChangeSheet={onChangeSheet}
        />
      </div>
    </div>
  );
}

function DiceTrayVisual({ sides, finalValue, rollTs, color, onSettled }) {
  const [display, setDisplay] = useState(finalValue);
  const [phase, setPhase] = useState('idle');
  const lastTs = useRef(0);

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
    <div style={{ width: 82, height: 62, borderRadius: 10, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.55)', animation: phase === 'rolling' ? 'trayShake 0.35s ease-in-out infinite' : 'none', margin: '0 auto' }}>
      <div style={{
        width: 38, height: sides === 8 ? 38 : 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(145deg, ${color}33, ${color}11)`, border: `1.5px solid ${color}88`,
        color, fontFamily: 'Cinzel,serif', fontWeight: 900, fontSize: 15,
        animation: phase === 'rolling' ? 'diceTumble 0.5s linear infinite' : phase === 'settled' ? 'diceSettle 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
        ...shapeStyle,
      }}>
        <span style={{ transform: sides === 8 ? 'rotate(-45deg)' : 'none' }}>{display}</span>
      </div>
    </div>
  );
}

function DiceWidget() {
  const [open, setOpen] = useState(false);
  const [dice, setDice] = useState(20);
  const [bonus, setBonus] = useState(0);
  const [result, setResult] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [combatActive, setCombatActive] = useState(false);
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'combat'), snap => {
      if (snap.exists()) setCombatActive(snap.data().active || false);
    });
    return () => unsub();
  }, []);

  const roll = async () => {
    const base = Math.floor(Math.random() * dice) + 1;
    const total = base + Number(bonus);
    const isCrit = dice === 20 && base === 20;
    const isFail = dice === 20 && base === 1;
    const res = { base, total, sides: dice, bonus: Number(bonus), isCrit, isFail, ts: Date.now(), roller: 'Jogador' };
    setResult(res);
    setRevealed(false);
    try { await setDoc(doc(db, 'config', 'combat_dice'), res); } catch (e) {}
  };

  return (
    <div className="dice-widget" style={{position:'fixed', bottom: combatActive ? 96 : 24, right:16, zIndex:100, transition:'bottom 0.4s cubic-bezier(0.2,0.8,0.2,1)'}}>
      {!open && <button onClick={()=>setOpen(true)} style={{width:56, height:56, borderRadius:'50%', background:'rgba(168,85,247,0.15)', border:'1px solid rgba(168,85,247,0.4)', color:'#C8A8E8', fontSize:26, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 0 20px rgba(168,85,247,0.2)', backdropFilter:'blur(5px)', transition:'all 0.3s'}}>🎲</button>}
      {open && (
        <div style={{background:'rgba(10,12,28,0.95)', border:'1px solid rgba(168,85,247,0.4)', borderRadius:16, padding:16, width:260, boxShadow:'0 10px 40px rgba(0,0,0,0.8)', backdropFilter:'blur(10px)'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
            <div style={{fontFamily:'Cinzel,serif', fontSize:13, color:'#C8A8E8', letterSpacing:'0.1em'}}>Rolagem Cósmica</div>
            <button onClick={()=>setOpen(false)} style={{background:'transparent', border:'none', color:'#5A5070', cursor:'pointer', fontSize:14}}>✕</button>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6, marginBottom:12}}>
            {[4,6,8,10,12,20].map(d => <button key={d} onClick={()=>{setDice(d);setResult(null);}} style={{padding:'6px 0', borderRadius:6, border:`1px solid ${dice===d?'rgba(168,85,247,0.6)':'rgba(255,255,255,0.1)'}`, background:dice===d?'rgba(168,85,247,0.2)':'rgba(255,255,255,0.03)', color:dice===d?'#fff':'#9A8A7A', fontFamily:'Cinzel,serif', fontSize:12, cursor:'pointer', transition:'all 0.2s'}}>D{d}</button>)}
          </div>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16}}>
            <label style={{fontSize:11, color:'#7B6D8A', fontFamily:'Cinzel,serif'}}>Bônus</label>
            <input type="number" value={bonus} onChange={e=>setBonus(Number(e.target.value))} style={{flex:1, textAlign:'center', padding:'4px', fontSize:14}} />
          </div>
          <button onClick={roll} style={{width:'100%', padding:'10px', borderRadius:8, border:'1px solid rgba(168,85,247,0.5)', background:'rgba(168,85,247,0.15)', color:'#fff', fontFamily:'Cinzel,serif', fontSize:14, fontWeight:600, cursor:'pointer', transition:'all 0.2s', display:'flex', justifyContent:'center', alignItems:'center', gap:8}}>
            🎲 Rolar D{dice}
          </button>
          {result && (
            <div style={{marginTop:16, paddingTop:16, borderTop:'1px dashed rgba(255,255,255,0.1)', textAlign:'center'}}>
              <DiceTrayVisual sides={result.sides} finalValue={result.base} rollTs={result.ts} color={result.isCrit?'#4ADE80':result.isFail?'#E8193C':'#C8A8E8'} onSettled={()=>setRevealed(true)} />
              <div style={{fontSize:11, color:'#7B6D8A', fontFamily:'Cinzel,serif', margin:'10px 0 4px'}}>Resultado (D{result.sides} {result.bonus?`+ ${result.bonus}`:''})</div>
              <div style={{minHeight:38, display:'flex', justifyContent:'center', alignItems:'baseline', gap:8, opacity: revealed?1:0, transition:'opacity 0.25s'}}>
                <span style={{fontSize:32, fontFamily:'Cinzel,serif', color:result.isCrit?'#4ADE80':result.isFail?'#E8193C':'#C8A8E8', fontWeight:700}}>{result.total}</span>
                {result.bonus !== 0 && <span style={{fontSize:12, color:'#5A5070'}}>({result.base} {result.bonus>=0?'+':''} {result.bonus})</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PrologueSection({ masterMode }) {
  const [capa, setCapa] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'prologue_cover'), snap => {
      if (snap.exists()) setCapa(snap.data().img || '');
    });
    return () => unsub();
  }, []);

  const handleUpload = e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    const compressed = await compressImage(ev.target.result, 900, 1200, 0.78);
    setCovers(prev => ({ ...prev, [cls.id]: compressed }));
    try {
      await setDoc(doc(db, 'class_covers', cls.id), { img: compressed });
    } catch (err) {
      alert('Erro ao salvar a imagem desta classe. Tente uma imagem menor.');
      console.error(err);
    }
  };
  reader.readAsDataURL(file); e.target.value = '';
};

  return (
    <div style={{maxWidth:1040,margin:'0 auto',padding:'40px 24px 80px'}}>
      <div style={{textAlign:'center',marginBottom:36}}>
        <div style={{fontSize:11,letterSpacing:'0.4em',color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:14,textTransform:'uppercase'}}>O Começo de Tudo</div>
        <h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:27,color:'#E8D8C0',fontWeight:700,margin:0,textShadow:'0 0 40px rgba(168,85,247,0.4)'}}>Prólogo</h2>
        <div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(168,85,247,0.6),transparent)',margin:'18px auto 0'}}/>
      </div>

      <div className="prologue-grid">
        {/* CAPA / ILUSTRAÇÃO */}
        <div className="prologue-cover" onClick={() => masterMode && fileRef.current?.click()}>
  {capa ? (
    <div className="prologue-image-wrapper">
      <img src={capa} alt="capa do prólogo" style={{ objectPosition: 'center' }} />
    </div>
  ) : (
    <div className="prologue-cover-placeholder">
      <div style={{fontSize:44,opacity:0.25}}>📖</div>
      <div style={{fontSize:12,color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',letterSpacing:'0.06em'}}>
        {masterMode ? 'Toque para enviar a ilustração do prólogo' : 'Nenhuma ilustração enviada ainda'}
      </div>
    </div>
  )}
  {masterMode && capa && (
    <div style={{position:'absolute',top:10,right:10,padding:'4px 10px',borderRadius:6,background:'rgba(0,0,0,0.6)',border:'1px solid rgba(168,85,247,0.3)',color:'#C8A8E8',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.08em',zIndex:2}}>🖼 Trocar imagem</div>
  )}
  {masterMode && <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{display:'none'}}/>}
</div>

        {/* NARRATIVA */}
        <div>
          <div className="prologue-title-card">
            <h3 style={{fontFamily:'Cinzel Decorative,serif',fontSize:19,color:'#E8D8C0',fontWeight:700,margin:0,letterSpacing:'0.03em'}}>O Despertar do Cosmum</h3>
          </div>
          <div style={{lineHeight:1.9,fontSize:16}}>
            {PROLOGUE.map((p, i) => {
              if (p.type === 'title') return <div key={i} style={{textAlign:'center',margin:'30px 0',fontFamily:'Cinzel,serif',fontSize:19,color:'#E8D8C0',fontWeight:700,letterSpacing:'0.05em',textShadow:'0 0 30px rgba(168,85,247,0.5)'}}>{p.text}</div>;
              if (p.type === 'highlight') return <div key={i} style={{margin:'26px 0',padding:'15px 22px',borderLeft:'2px solid #A855F7',background:'rgba(168,85,247,0.08)',borderRadius:'0 8px 8px 0',fontFamily:'Cinzel,serif',color:'#C8A8E8',fontSize:15}}>{p.text}</div>;
              if (p.type === 'warning') return <div key={i} style={{margin:'26px 0',padding:'15px 22px',borderLeft:'2px solid #E8193C',background:'rgba(232,25,60,0.08)',borderRadius:'0 8px 8px 0',fontFamily:'Cinzel,serif',color:'#F09090',fontSize:15}}>{p.text}</div>;
              if (p.type === 'finale') return <div key={i} style={{margin:'36px 0 0',padding:'22px',border:'1px solid rgba(168,85,247,0.25)',borderRadius:12,background:'rgba(168,85,247,0.05)',fontFamily:'Cinzel,serif',color:'#C0A8D8',fontSize:15,lineHeight:1.9,textAlign:'center'}}>{p.text}</div>;
              if (p.type === 'divider') return <div key={i} style={{textAlign:'center',margin:'28px 0',color:'rgba(255,255,255,0.14)',letterSpacing:'0.4em',fontSize:12}}>{p.text}</div>;
              if (p.type === 'intro' || p.type === 'pause') return <p key={i} style={{margin:'0 0 18px',color:'#B0A090',fontStyle:p.type==='pause'?'italic':'normal',fontSize:p.type==='intro'?17:15}}>{p.text}</p>;
              return <p key={i} style={{margin:'0 0 18px',color:'#9A8A7A'}}>{p.text}</p>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
function ClassCard({cls}){const[open,setOpen]=useState(false);return(<div onClick={()=>setOpen(o=>!o)} style={{border:`1px solid ${open?cls.color+'55':'rgba(255,255,255,0.08)'}`,borderRadius:12,background:open?'rgba(10,12,28,0.95)':'rgba(8,10,22,0.8)',marginBottom:13,cursor:'pointer',transition:'all 0.3s',boxShadow:open?`0 0 28px ${cls.glow}`:'none',overflow:'hidden'}}><div style={{padding:'15px 20px',display:'flex',alignItems:'center',gap:13}}><span style={{fontSize:24}}>{cls.icon}</span><div style={{flex:1}}><div style={{fontFamily:'Cinzel,serif',fontSize:14,fontWeight:700,color:cls.color,letterSpacing:'0.03em'}}>{cls.name}</div><div style={{fontSize:11,color:'#7B6D8A',marginTop:3,fontFamily:'Cinzel,serif',letterSpacing:'0.06em'}}>{cls.role}</div></div><div style={{color:'rgba(255,255,255,0.22)',fontSize:12,transform:open?'rotate(90deg)':'none',transition:'transform 0.3s'}}>▶</div></div>{open&&(<div onClick={e=>e.stopPropagation()} style={{padding:'0 20px 20px'}}><div style={{width:'100%',height:1,background:`linear-gradient(90deg,${cls.color}44,transparent)`,marginBottom:16}}/><p style={{fontSize:14,color:'#9A8A7A',lineHeight:1.85,fontStyle:'italic',margin:'0 0 20px'}}>{cls.lore}</p><div style={{marginBottom:16}}><div style={{fontSize:10,letterSpacing:'0.35em',color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Passiva</div><div style={{background:`${cls.color}0D`,border:`1px solid ${cls.color}28`,borderRadius:8,padding:'10px 13px'}}><div style={{fontFamily:'Cinzel,serif',fontSize:13,color:cls.color,fontWeight:600,marginBottom:4}}>{cls.passive.name}</div><div style={{fontSize:13,color:'#8A7A6A',lineHeight:1.7}}>{cls.passive.desc}</div></div></div><div style={{marginBottom:16}}><div style={{fontSize:10,letterSpacing:'0.35em',color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Ataques Normais — 2 VC cada</div><div style={{display:'flex',flexDirection:'column',gap:6}}>{cls.normal.map((a,i)=>(<div key={i} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'9px 12px',display:'flex',gap:10,alignItems:'flex-start'}}><div style={{flex:1}}><div style={{fontFamily:'Cinzel,serif',fontSize:12,color:'#C8B8A0',fontWeight:600,marginBottom:3}}>{a.name}</div><div style={{fontSize:13,color:'#7A6A5A',lineHeight:1.65}}>{a.desc}</div></div><div style={{flexShrink:0,textAlign:'right'}}><div style={{fontSize:11,color:`${cls.color}BB`,fontFamily:'Cinzel,serif'}}>2 VC</div><div style={{fontSize:10,color:'rgba(255,255,255,0.18)',marginTop:2}}>⏱ {a.cooldown}</div></div></div>))}</div></div><div><div style={{fontSize:10,letterSpacing:'0.35em',color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Especiais — 3 VC cada</div><div style={{display:'flex',flexDirection:'column',gap:6}}>{cls.specials.map((a,i)=>(<div key={i} style={{background:`${cls.color}09`,border:`1px solid ${cls.color}22`,borderRadius:8,padding:'9px 12px',display:'flex',gap:10,alignItems:'flex-start'}}><div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}><span style={{fontSize:11,color:cls.color}}>✦</span><span style={{fontFamily:'Cinzel,serif',fontSize:12,color:'#C8B8A0',fontWeight:600}}>{a.name}</span></div><div style={{fontSize:13,color:'#7A6A5A',lineHeight:1.65}}>{a.desc}</div></div><div style={{flexShrink:0,textAlign:'right'}}><div style={{fontSize:11,color:`${cls.color}BB`,fontFamily:'Cinzel,serif'}}>3 VC</div><div style={{fontSize:10,color:'rgba(255,255,255,0.18)',marginTop:2}}>⏱ {a.cooldown}</div><div style={{fontSize:10,color:'rgba(255,255,255,0.16)',marginTop:2}}>Nív {a.req}+</div></div></div>))}</div></div></div>)}</div>);}
function ClassesSection({ masterMode }) {
  const [activeId, setActiveId] = useState(CLASSES[0].id);
  const [covers, setCovers] = useState({});
  const fileRef = useRef(null);

  useEffect(() => {
  const unsub = onSnapshot(collection(db, 'class_covers'), snap => {
    const data = {};
    snap.docs.forEach(d => { data[d.id] = d.data().img || ''; });
    setCovers(data);
  });
  return () => unsub();
}, []);

  const cls = CLASSES.find(c => c.id === activeId) || CLASSES[0];
  const cover = covers[cls.id] || '';

  const handleUpload = e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    const compressed = await compressImage(ev.target.result, 900, 1200, 0.78);
    setCovers(prev => ({ ...prev, [cls.id]: compressed }));
    try {
      await setDoc(doc(db, 'class_covers', cls.id), { img: compressed });
    } catch (err) {
      alert('Erro ao salvar a imagem desta classe. Tente uma imagem menor.');
      console.error(err);
    }
  };
  reader.readAsDataURL(file); e.target.value = '';
};

  const habilidades = [
    cls.passive?.name,
    ...(cls.normal || []).map(a => a.name),
    ...(cls.specials || []).map(a => a.name),
  ].filter(Boolean);

  return (
    <div style={{maxWidth:1040,margin:'0 auto',padding:'40px 24px 80px'}}>
      <div style={{textAlign:'center',marginBottom:32}}>
        <div style={{fontSize:11,letterSpacing:'0.4em',color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:13,textTransform:'uppercase'}}>As Cinco Linhagens</div>
        <h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:23,color:'#E8D8C0',fontWeight:700,margin:0}}>Classes</h2>
        <div style={{fontSize:12,color:'#4A4050',marginTop:9,fontFamily:'Cinzel,serif'}}>Selecione uma classe para ver detalhes e habilidades</div>
        <div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(232,160,32,0.6),transparent)',margin:'16px auto 0'}}/>
      </div>

      <div className="classes-grid">
        {/* LISTA DE CLASSES */}
        <div className="classes-list">
          {CLASSES.map(c => {
            const active = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className="classes-list-item"
                style={{
                  border: `1px solid ${active ? c.color + '55' : 'rgba(255,255,255,0.07)'}`,
                  background: active ? `${c.color}14` : 'rgba(255,255,255,0.02)',
                  boxShadow: active ? `0 0 16px ${c.glow}` : 'none',
                }}
              >
                <span style={{fontSize:18,flexShrink:0}}>{c.icon}</span>
                <span style={{fontFamily:'Cinzel,serif',fontSize:12.5,fontWeight:700,color:active?c.color:'#8A7A8A',lineHeight:1.3}}>{c.name}</span>
              </button>
            );
          })}
        </div>

        {/* DETALHE DA CLASSE */}
        <div className="class-detail-grid">
          {/* ILUSTRAÇÃO */}
          <div className="class-illustration" onClick={() => masterMode && fileRef.current?.click()} style={{border:`1px solid ${cls.color}33`,boxShadow:`0 10px 40px ${cls.glow}`}}>
  {cover ? (
    <div className="class-image-wrapper">
      <img src={cover} alt={cls.name} style={{ objectPosition: cls.objectPosition || 'center' }} />
    </div>
  ) : (
    <div className="class-illustration-placeholder">
      <span style={{fontSize:40,opacity:0.3}}>{cls.icon}</span>
      <div style={{fontSize:11,color:'rgba(255,255,255,0.2)',fontFamily:'Cinzel,serif',letterSpacing:'0.06em'}}>
        {masterMode ? 'Toque para enviar a ilustração' : 'Nenhuma ilustração enviada'}
      </div>
    </div>
  )}
  {masterMode && cover && (
    <div style={{position:'absolute',top:10,right:10,padding:'4px 10px',borderRadius:6,background:'rgba(0,0,0,0.6)',border:`1px solid ${cls.color}44`,color:cls.color,fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.08em',zIndex:2}}>🖼 Trocar</div>
  )}
  {masterMode && <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{display:'none'}}/>}
</div>

          {/* INFO */}
          <div>
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:'Cinzel Decorative,serif',fontSize:19,color:cls.color,fontWeight:700,letterSpacing:'0.02em',marginBottom:6,textShadow:`0 0 24px ${cls.glow}`}}>{cls.name}</div>
              <div style={{fontSize:11,color:'#7B6D8A',fontFamily:'Cinzel,serif',letterSpacing:'0.06em'}}>{cls.role}</div>
            </div>

            <p style={{fontSize:13.5,color:'#9A8A7A',lineHeight:1.85,fontStyle:'italic',margin:'0 0 22px'}}>{cls.lore}</p>

            <div style={{marginBottom:20}}>
              <div style={{fontSize:10,letterSpacing:'0.35em',color:'rgba(255,255,255,0.25)',fontFamily:'Cinzel,serif',marginBottom:10,textTransform:'uppercase'}}>Habilidades</div>
              <div style={{display:'flex',flexDirection:'column',gap:7}}>
                {habilidades.map((nome, i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:9}}>
                    <span style={{fontSize:10,color:cls.color}}>◆</span>
                    <span style={{fontSize:13,color:'#C8B8A0',fontFamily:'Cinzel,serif'}}>{nome}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{border:`1px solid ${cls.color}28`,borderRadius:10,background:`${cls.color}09`,padding:'14px 16px'}}>
              <div style={{fontSize:10,letterSpacing:'0.3em',color:cls.color,fontFamily:'Cinzel,serif',marginBottom:8,textTransform:'uppercase'}}>Características</div>
              <div style={{fontSize:13,color:'#8A7A6A',lineHeight:1.75}}>{cls.passive?.desc}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SHEET_TABS = [
  { id: 'geral',   label: 'Visão Geral',  icon: '🧙' },
  { id: 'combate', label: 'Combate',      icon: '⚔️' },
  { id: 'lore',    label: 'Lore & Itens', icon: '📜' },
];

const SPACING = 16;

const ATTRS = [
  { key: 'forca',       label: 'Força',        color: '#E8193C' },
  { key: 'agilidade',   label: 'Agilidade',    color: '#E8A020' },
  { key: 'durabilidade',label: 'Durabilidade', color: '#1EC8FF' },
  { key: 'inteligencia',label: 'Inteligência', color: '#A855F7' },
  { key: 'percepcao',   label: 'Percepção',    color: '#D4C5A9' },
  { key: 'sorte',       label: 'Sorte',        color: '#F0C040' },
];

function PersonalityTags({ value, color, onChange }) {
  const [input, setInput] = useState('');
  const tags = Array.isArray(value) ? value : [];
  const maxTags = 4;

  const addTag = () => {
    const t = input.trim();
    if (!t || tags.length >= maxTags) return;
    if (tags.some(x => x.toLowerCase() === t.toLowerCase())) { setInput(''); return; }
    onChange([...tags, t]);
    setInput('');
  };
  const removeTag = (i) => onChange(tags.filter((_, idx) => idx !== i));

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8, minHeight: 26 }}>
        {tags.length === 0 && (
          <span style={{ fontSize: 12, color: '#4A4050', fontStyle: 'italic', fontFamily: 'Cinzel,serif' }}>
            Nenhum traço definido.
          </span>
        )}
        {tags.map((t, i) => (
          <span key={i} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20,
            border: `1px solid ${color}55`, background: `${color}18`, color,
            fontFamily: 'Cinzel,serif', fontSize: 11, letterSpacing: '0.03em',
          }}>
            {t}
            <button onClick={() => removeTag(i)} style={{ background: 'none', border: 'none', color: `${color}99`, cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1 }}>✕</button>
          </span>
        ))}
      </div>
      {tags.length < maxTags && (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            placeholder="Ex: Bravo, Calmo, Sarcástico..."
            maxLength={18}
            style={{ flex: 1, fontSize: 12 }}
          />
          <button onClick={addTag} disabled={!input.trim()} style={{
            padding: '5px 12px', borderRadius: 6, border: `1px solid ${color}55`,
            background: input.trim() ? `${color}18` : 'rgba(255,255,255,0.02)',
            color: input.trim() ? color : '#5A5070',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            fontFamily: 'Cinzel,serif', fontSize: 11, whiteSpace: 'nowrap',
          }}>+ Adicionar</button>
        </div>
      )}
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', marginTop: 6, fontFamily: 'Cinzel,serif' }}>
        {tags.length}/{maxTags} traços
      </div>
    </div>
  );
}
function AttrDots({ value, color, onChange, masterMode, attrPoints = 0, onSpendPoint }) {
  return (
    <div className="attr-dots" style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: 10 }).map((_, i) => {
        const filled = i < value;
        const isPulsingNext = !masterMode && attrPoints > 0 && i === value && value < 10;
        return (
          <button key={i} onClick={() => { if (masterMode) { onChange(i < value ? (i === value - 1 ? 0 : i + 1) : i + 1); } else { if (isPulsingNext && onSpendPoint) { onSpendPoint(i + 1); } } }}
            title={isPulsingNext ? `Gastar 1 Ponto de Atributo (+1)` : filled && masterMode ? 'Reduzir' : ''}
            style={{ width: 15, height: 15, borderRadius: '50%', border: `1.5px solid ${filled ? color : isPulsingNext ? color : 'rgba(255,255,255,0.12)'}`, background: filled ? color + '44' : isPulsingNext ? color + '22' : 'transparent', cursor: (masterMode || isPulsingNext) ? 'pointer' : 'default', transition: 'all 0.15s', padding: 0, flexShrink: 0, animation: isPulsingNext ? 'attrPulse 1.2s ease-in-out infinite' : 'none' }} />
        );
      })}
    </div>
  );
}

function VigosDots({value,max,color,onChange}){return(<div className="vigos-dots" style={{display:'flex',gap:6,flexWrap:'wrap'}}>{Array.from({length:max}).map((_,i)=>(<button key={i} onClick={()=>onChange(i<value?(i===value-1?0:i+1):i+1)} style={{width:22,height:22,borderRadius:'50%',border:`1.5px solid ${i<value?color:'rgba(255,255,255,0.13)'}`,background:i<value?color+'33':'transparent',cursor:'pointer',transition:'all 0.2s',padding:0,boxShadow:i<value?`0 0 5px ${color}55`:'none'}}>{i<value&&<span style={{display:'block',width:8,height:8,borderRadius:'50%',background:color,margin:'auto'}}/>}</button>))}</div>);}

function VigosWithLocked({value,nivel,color,onChange}){
  const unlocked1=nivel>=8,unlocked2=nivel>=18;
  const normal=Array.from({length:5}).map((_,i)=>(
    <button key={i} onClick={()=>onChange(i<value?(i===value-1?0:i+1):i+1)} style={{width:22,height:22,borderRadius:'50%',border:`1.5px solid ${i<value?color:'rgba(255,255,255,0.13)'}`,background:i<value?color+'33':'transparent',cursor:'pointer',transition:'all 0.2s',padding:0,boxShadow:i<value?`0 0 5px ${color}55`:'none'}}>
      {i<value&&<span style={{display:'block',width:8,height:8,borderRadius:'50%',background:color,margin:'auto'}}/>}
    </button>
  ));
  const slot=(idx,lockLvl)=>unlocked1&&idx===6||unlocked2&&idx===7
    ?<button onClick={()=>onChange(value===idx?idx-1:idx)} style={{width:22,height:22,borderRadius:'50%',border:`1.5px solid ${value>=idx?color:'rgba(255,255,255,0.13)'}`,background:value>=idx?color+'33':'transparent',cursor:'pointer',transition:'all 0.2s',padding:0,boxShadow:value>=idx?`0 0 5px ${color}55`:'none'}}>
        {value>=idx&&<span style={{display:'block',width:8,height:8,borderRadius:'50%',background:color,margin:'auto'}}/>}
      </button>
    :<div title={`Desbloqueado no Nível ${lockLvl}`} style={{width:22,height:22,borderRadius:'50%',border:'1.5px solid rgba(255,200,0,0.28)',background:'rgba(255,200,0,0.04)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'rgba(255,200,0,0.45)',cursor:'default'}}>🔒</div>;
  return(
    <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
      {normal}
      <div style={{width:1,height:16,background:'rgba(255,255,255,0.1)',margin:'0 2px'}}/>
      {slot(6,8)}{slot(7,18)}
    </div>
  );
}

function StatusPanel({ sheet, onChange }) {
  const activeStatus = sheet.status || {};
  const toggle = (s) => {
    const nowActive = !activeStatus[s.id];
    const updated = { ...activeStatus, [s.id]: nowActive };
    onChange({ ...sheet, status: updated });
    if (nowActive) pushToast(`${sheet.nome || 'Personagem'} ficou ${s.label}`, s.icon, s.color);
    else pushToast(`${sheet.nome || 'Personagem'} não está mais ${s.label}`, s.icon, 'rgba(200,184,160,0.8)');
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.3em', color: '#5A5070', fontFamily: 'Cinzel,serif', marginBottom: 9, textTransform: 'uppercase' }}>
        <span style={{ color: '#E8193C' }}>🩸</span> Status Ativos
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {STATUS_LIST.map(s => {
          const active = !!activeStatus[s.id];
          return (
            <button key={s.id} onClick={() => toggle(s)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, border: `1px solid ${active ? s.color + '66' : 'rgba(255,255,255,0.08)'}`, background: active ? s.color + '18' : 'rgba(255,255,255,0.02)', color: active ? s.color : '#5A5070', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Cinzel,serif', fontSize: 11, boxShadow: active ? `0 0 8px ${s.color}33` : 'none' }}>
              <span style={{ fontSize: 12 }}>{s.icon}</span>{s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
// ─── 📊 BÔNUS DE ATRIBUTOS (compacto, somente leitura — usado na aba Combate) ──
function AttrBonusStrip({ sheet }) {
  const attrBonus = val => Math.floor(val / 2);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(82px,1fr))', gap: 7 }}>
      {ATTRS.map(a => {
        const bonus = attrBonus(sheet[a.key] || 0);
        return (
          <div key={a.key} style={{ textAlign: 'center', padding: '8px 6px', borderRadius: 8, background: `${a.color}0D`, border: `1px solid ${a.color}28` }}>
            <div style={{ fontSize: 9, fontFamily: 'Cinzel,serif', color: a.color, letterSpacing: '0.04em', marginBottom: 4, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.label}</div>
            <div style={{ fontSize: 18, fontFamily: 'Cinzel,serif', fontWeight: 700, color: bonus > 0 ? a.color : 'rgba(255,255,255,0.15)' }}>{bonus > 0 ? `+${bonus}` : '—'}</div>
          </div>
        );
      })}
    </div>
  );
}

function resolveEquipIcon(tipo=''){
  const t = tipo.toLowerCase();

  // ── Espadas e lâminas ──────────────────────────────────────────
  if(t.includes('espada')||t.includes('sabre')||t.includes('lâmina')||t.includes('lamina')||
     t.includes('katana')||t.includes('claymore')||t.includes('florete')||t.includes('rapieira')||
     t.includes('espadão')||t.includes('espadao')||t.includes('montante')) return '\u2694\uFE0F';

  // ── Adagas e facas ─────────────────────────────────────────────
  if(t.includes('adaga')||t.includes('faca')||t.includes('punhal')||t.includes('navalha')||
     t.includes('kunai')||t.includes('sai')||t.includes('estilete')||t.includes('bisturi')) return '\uD83D\uDDE1\uFE0F';

  // ── Machados ───────────────────────────────────────────────────
  if(t.includes('machado')||t.includes('alabarda')||t.includes('cimitarra')) return '\uD83E\uFA93';

  // ── Martelos e maças ───────────────────────────────────────────
  if(t.includes('martelo')||t.includes('maça')||t.includes('maca')||t.includes('clava')||
     t.includes('mangual')||t.includes('tacape')) return '\uD83D\uDD28';

  // ── Lanças e hastes ────────────────────────────────────────────
  if(t.includes('lança')||t.includes('lanca')||t.includes('tridente')||t.includes('zagaia')||
     t.includes('glaive')||t.includes('partisana')) return '\uD83E\uDEB1';

  // ── Arcos e bestas ─────────────────────────────────────────────
  if(t.includes('arco')||t.includes('besta')||t.includes('flechas')||t.includes('flecha')||
     t.includes('aljava')) return '\uD83C\uDFF9';

  // ── Armas de fogo ──────────────────────────────────────────────
  if(t.includes('pistola')||t.includes('rifle')||t.includes('fuzil')||t.includes('sniper')||
     t.includes('revólver')||t.includes('revolver')||t.includes('espingarda')||
     t.includes('metralhadora')||t.includes('carabina')) return '\uD83D\uDD2B';

  // ── Cajados e varinhas ─────────────────────────────────────────
  if(t.includes('cajado')||t.includes('varinha')||t.includes('cetro')||t.includes('báculo')||
     t.includes('baculo')||t.includes('bordão')||t.includes('bordao')) return '\uD83E\uDE84';

  // ── Orbes e cristais mágicos ───────────────────────────────────
  if(t.includes('orbe')||t.includes('cristal')||t.includes('gema')||t.includes('pedra arcana')||
     t.includes('esfera mágica')||t.includes('esfera magica')) return '\uD83D\uDD2E';

  // ── Shurikens ─────────────────────────────────────────────────
  if(t.includes('shuriken')||t.includes('estrela ninja')||t.includes('chakram')) return '\u2B50';

  // ── Bombas e explosivos ────────────────────────────────────────
  if(t.includes('bomba')||t.includes('granada')||t.includes('dinamite')||t.includes('explosivo')) return '\uD83D\uDCA3';

  // ── Escudos ────────────────────────────────────────────────────
  if(t.includes('escudo')||t.includes('broquel')||t.includes('aegis')||t.includes('égide')||
     t.includes('egide')) return '\uD83D\uDEE1\uFE0F';

  // ── Armaduras ─────────────────────────────────────────────────
  if(t.includes('armadura')||t.includes('cota')||t.includes('loriga')||t.includes('peitoral')||
     t.includes('colete')||t.includes('gibão')||t.includes('gibao')) return '\uD83E\uDDBA';

  // ── Capacetes e elmos ──────────────────────────────────────────
  if(t.includes('capacete')||t.includes('elmo')||t.includes('chapéu')||t.includes('chapeu')||
     t.includes('coroa')||t.includes('tiara')||t.includes('tricórnio')||t.includes('tricornio')) return '\u26D1\uFE0F';

  // ── Luvas ──────────────────────────────────────────────────────
  if(t.includes('luva')||t.includes('manopla')||t.includes('vambrace')) return '\uD83E\uDDE4';

  // ── Botas e calçados ───────────────────────────────────────────
  if(t.includes('bota')||t.includes('sandália')||t.includes('sandalia')||t.includes('sapato')||
     t.includes('calçado')||t.includes('calcado')||t.includes('greave')) return '\uD83D\uDC62';

  // ── Mantos e roupas ────────────────────────────────────────────
  if(t.includes('manto')||t.includes('capa')||t.includes('robe')||t.includes('túnica')||
     t.includes('tunica')||t.includes('traje')||t.includes('veste')||t.includes('sobretudo')) return '\uD83E\uDDE5';

  // ── Poções e elixires ──────────────────────────────────────────
  if(t.includes('poção')||t.includes('pocao')||t.includes('elixir')||t.includes('antídoto')||
     t.includes('antidoto')||t.includes('frasco')||t.includes('ampola')) return '\uD83E\uDDEA';

  // ── Venenos ────────────────────────────────────────────────────
  if(t.includes('veneno')||t.includes('toxina')||t.includes('peçonha')||t.includes('peconha')) return '\u2620\uFE0F';

  // ── Anéis ──────────────────────────────────────────────────────
  if(t.includes('anel')) return '\uD83D\uDC8D';

  // ── Colares e amuletos ─────────────────────────────────────────
  if(t.includes('colar')||t.includes('amuleto')||t.includes('medalha')||t.includes('pingente')||
     t.includes('corrente de ouro')) return '\uD83D\uDCFF';

  // ── Brincos ────────────────────────────────────────────────────
  if(t.includes('brinco')) return '\uD83D\uDC8E';

  // ── Talismãs e runas ───────────────────────────────────────────
  if(t.includes('talismã')||t.includes('talisma')||t.includes('runa')||t.includes('olho mágico')||
     t.includes('olho magico')||t.includes('sigilo')) return '\uD83E\uDDFF';

  // ── Grimórios e livros ─────────────────────────────────────────
  if(t.includes('grimório')||t.includes('grimorio')||t.includes('tomo')||t.includes('livro arcano')||
     t.includes('spellbook')||t.includes('codex')) return '\uD83D\uDCDA';

  // ── Pergaminhos ────────────────────────────────────────────────
  if(t.includes('pergaminho')||t.includes('rolo')||t.includes('papiro')) return '\uD83D\uDCDC';

  // ── Tochas e lanternas ─────────────────────────────────────────
  if(t.includes('tocha')||t.includes('lanterna')||t.includes('lampião')||t.includes('lampiao')) return '\uD83D\uDD26';

  // ── Velas ──────────────────────────────────────────────────────
  if(t.includes('vela')||t.includes('candelabro')) return '\uD83D\uDD6F\uFE0F';

  // ── Correntes e algemas ────────────────────────────────────────
  if(t.includes('corrente')||t.includes('algema')||t.includes('acorrentado')) return '\u26D3\uFE0F';

  // ── Chicotes ───────────────────────────────────────────────────
  if(t.includes('chicote')||t.includes('açoite')||t.includes('acoite')||t.includes('flagelo')) return '\uD83E\uDEB6';

  // ── Cordas e ganchos ───────────────────────────────────────────
  if(t.includes('corda')||t.includes('lasso')||t.includes('laço')||t.includes('laco')) return '\uD83E\uDEA2';
  if(t.includes('gancho')||t.includes('arpão')||t.includes('arpao')) return '\uD83E\uDE9D';

  // ── Chaves ─────────────────────────────────────────────────────
  if(t.includes('chave')) return '\uD83D\uDDDD\uFE0F';

  // ── Lunetas e instrumentos de observação ───────────────────────
  if(t.includes('luneta')||t.includes('binóculo')||t.includes('binoculo')||
     t.includes('telescópio')||t.includes('telescopio')) return '\uD83D\uDD2D';

  // ── Lupas ──────────────────────────────────────────────────────
  if(t.includes('lupa')||t.includes('monóculo')||t.includes('monoculo')) return '\uD83D\uDD0D';

  // ── Seringas e instrumentos médicos ───────────────────────────
  if(t.includes('seringa')||t.includes('injeção')||t.includes('injecao')) return '\uD83D\uDC89';

  // ── Ferramentas ────────────────────────────────────────────────
  if(t.includes('chave inglesa')||t.includes('ferramenta')||t.includes('alicate')||
     t.includes('engrenagem')) return '\uD83D\uDD27';
  if(t.includes('tesoura')||t.includes('faca de corte')) return '\u2702\uFE0F';

  // ── Instrumentos musicais (bardos) ────────────────────────────
  if(t.includes('alaúde')||t.includes('alaud')||t.includes('flauta')||t.includes('harpa')||
     t.includes('violão')||t.includes('violao')||t.includes('instrumento')||t.includes('lira')) return '\uD83C\uDFB5';

  // ── Moedas e tesouros ──────────────────────────────────────────
  if(t.includes('moeda')||t.includes('ouro')||t.includes('tesouro')||t.includes('bolsa de ouro')||
     t.includes('pepita')) return '\uD83D\uDCB0';

  // ── Bússola e mapa ─────────────────────────────────────────────
  if(t.includes('bússola')||t.includes('bussola')||t.includes('compasso')) return '\uD83E\uDDED';
  if(t.includes('mapa')||t.includes('carta náutica')||t.includes('carta nautica')) return '\uD83D\uDDFA\uFE0F';

  // ── Máscaras ───────────────────────────────────────────────────
  if(t.includes('máscara')||t.includes('mascara')||t.includes('capuz')) return '\uD83C\uDFAD';

  // ── Ossos e itens de necromancia ───────────────────────────────
  if(t.includes('osso')||t.includes('crânio')||t.includes('cranio')||t.includes('caveira')||
     t.includes('fêmur')||t.includes('femur')) return '\uD83D\uDC80';

  // ── Penas e asas ───────────────────────────────────────────────
  if(t.includes('pena')||t.includes('pluma')||t.includes('asa')||t.includes('asas')) return '\uD83E\uDEB6';

  // ── Garras e presas ────────────────────────────────────────────
  if(t.includes('garra')||t.includes('presa')||t.includes('dente')) return '\uD83E\uDDB7';

  // ── Bolsas e mochilas ──────────────────────────────────────────
  if(t.includes('mochila')||t.includes('bolsa')||t.includes('sacola')||t.includes('saco')) return '\uD83C\uDF92';

  // ── Sinos e alarmes ────────────────────────────────────────────
  if(t.includes('sino')||t.includes('campainha')||t.includes('alarme')) return '\uD83D\uDD14';

  // ── Bandeiras e estandartes ────────────────────────────────────
  if(t.includes('bandeira')||t.includes('estandarte')||t.includes('pendão')||t.includes('pendao')) return '\uD83D\uDEA9';

  // ── Âncoras ────────────────────────────────────────────────────
  if(t.includes('âncora')||t.includes('ancora')) return '\u2693';

  // ── Foices ────────────────────────────────────────────────────
  if(t.includes('foice')||t.includes('gadanho')) return '\uD83C\uDF3E';

  // ── Ninjas e furtividade ───────────────────────────────────────
  if(t.includes('fumaça')||t.includes('fumaca')||t.includes('bomba de fumaça')) return '\uD83D\uDCA8';

  // ── Default ───────────────────────────────────────────────────
  return '\uD83D\uDCE6';
}

function CompactEquipSlot({label, color, data, onChange, placeholder}){
  const d={nome:'',dano:'',tipo:placeholder,...(data||{})};
  const dynIcon=resolveEquipIcon(d.tipo||placeholder);
  return(
    <div style={{background:`${color}07`,border:`1px solid ${color}20`,borderRadius:9,padding:'9px 11px',display:'flex',flexDirection:'column',gap:6}}>
      <div style={{fontSize:8,letterSpacing:'0.3em',color:`${color}99`,fontFamily:'Cinzel,serif',textTransform:'uppercase',marginBottom:1}}>{label}</div>
      <div style={{display:'flex',alignItems:'center',gap:7}}><span style={{fontSize:17,flexShrink:0,lineHeight:1}}>{dynIcon}</span><input value={d.nome} onChange={e=>onChange({...d,nome:e.target.value})} placeholder="Nome do item..." style={{flex:1,fontSize:13,padding:'4px 7px'}}/></div>
      <div className="equip-slot-inputs" style={{display:'flex',gap:6}}>
        <input value={d.dano} onChange={e=>onChange({...d,dano:e.target.value})} placeholder="Dano / Ex: 1D6" style={{flex:1,fontSize:12,padding:'3px 7px',color:'rgba(255,200,80,0.85)'}}/>
        <input value={d.tipo} onChange={e=>onChange({...d,tipo:e.target.value})} placeholder={placeholder} style={{flex:1,fontSize:12,padding:'3px 7px',color:'rgba(200,184,160,0.6)'}}/>
      </div>
    </div>
  );
}

function CharSilhouette({color}){
  const head=<ellipse cx="30" cy="11" rx="7" ry="8" stroke={color} strokeWidth="1.2" fill="none"/>;
  const neck=<line x1="30" y1="19" x2="30" y2="25" stroke={color} strokeWidth="1.2"/>;
  const torso=<path d="M17 33 L15 60 Q15 63 19 63 L41 63 Q45 63 45 60 L43 33" stroke={color} strokeWidth="1.2" fill="none"/>;
  const belt=<line x1="16" y1="57" x2="44" y2="57" stroke={color} strokeWidth="1.3" strokeDasharray="3 2"/>;
  const legs=<><path d="M22 63 L19 88 L18 102" stroke={color} strokeWidth="1.2" fill="none"/><path d="M38 63 L41 88 L42 102" stroke={color} strokeWidth="1.2" fill="none"/></>;
  const boots=<><path d="M18 102 Q16 106 13 106 Q11 106 12 104 L14 102 L20 101" stroke={color} strokeWidth="1" fill="none"/><path d="M42 102 Q44 106 47 106 Q49 106 48 104 L46 102 L40 101" stroke={color} strokeWidth="1" fill="none"/></>;
  const shoulders=<path d="M14 32 Q18 26 30 25 Q42 26 46 32" stroke={color} strokeWidth="1.2" fill="none"/>;
  const arms=<><path d="M17 33 L9 49 L11 55" stroke={color} strokeWidth="1.2" fill="none"/><path d="M43 33 L51 49 L49 55" stroke={color} strokeWidth="1.2" fill="none"/></>;
  const weapons=<><line x1="8" y1="44" x2="8" y2="66" stroke={color} strokeWidth="1.6" strokeLinecap="round"/><line x1="5" y1="51" x2="11" y2="51" stroke={color} strokeWidth="1.2"/><line x1="52" y1="44" x2="52" y2="66" stroke={color} strokeWidth="1.6" strokeLinecap="round"/><line x1="49" y1="51" x2="55" y2="51" stroke={color} strokeWidth="1.2"/></>;
  return <svg width="66" height="116" viewBox="0 0 66 116" fill="none" xmlns="http://www.w3.org/2000/svg" style={{opacity:0.32,flexShrink:0}}>{head}{neck}{shoulders}{torso}{belt}{arms}{weapons}{legs}{boots}</svg>;
}

function CollapsibleSection({ icon, label, color = '#A855F7', badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: SPACING, border: `1px solid ${open ? color + '33' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, background: open ? `${color}08` : 'rgba(255,255,255,0.02)', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 15, color }}>{icon}</span>
        <span style={{ fontFamily: 'Cinzel,serif', fontSize: 13, color: '#C8B8A0', fontWeight: 600, flex: 1 }}>{label}</span>
        {badge}
        <span style={{ color: `${color}88`, fontSize: 11, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }}>▶</span>
      </button>
      {open && <div style={{ padding: '0 14px 14px' }}><div style={{ height: 8 }} />{children}</div>}
    </div>
  );
}

function EquipamentoPanel({sheet, onChange, sheetColor}){
  const f=(slot,val)=>onChange({...sheet,[slot]:val});
  return(
    <>
      <div className="equip-grid" style={{display:'grid',gridTemplateColumns:'1fr 90px 1fr',gap:12,alignItems:'start',justifyContent:'center',marginBottom:10}}>
        <div style={{minWidth:0}}><CompactEquipSlot label="Mão Esquerda" color={sheetColor} data={sheet.equip_mao_esq} onChange={v=>f('equip_mao_esq',v)} placeholder="Espada / Arma"/></div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,justifySelf:'center'}}><CharSilhouette color={sheetColor}/><div style={{fontSize:7,color:sheetColor+'55',fontFamily:'Cinzel,serif',letterSpacing:'0.1em',textAlign:'center',textTransform:'uppercase'}}>ESQ · DIR</div></div>
        <div style={{minWidth:0}}><CompactEquipSlot label="Mão Direita" color={sheetColor} data={sheet.equip_mao_dir} onChange={v=>f('equip_mao_dir',v)} placeholder="Escudo / Arma"/></div>
      </div>
      <CompactEquipSlot label="Corpo" color={sheetColor} data={sheet.equip_corpo} onChange={v=>f('equip_corpo',v)} placeholder="Armadura / Roupa"/>
    </>
  );
}

// ─── 💎 ARTEFATO PANEL (na ficha do personagem) ───────────────────────────────
function ArtefatoFichaPanel({ sheet, onChange, sheetColor, revealedArtefatos, artefatosHabs, showHeader = true }) {
  const selectedId = sheet.artefato_id || '';
  const selectedArt = revealedArtefatos.find(a => a.id === selectedId);
  const habs = selectedArt ? (artefatosHabs[selectedId] || []) : [];
  const [showHabs, setShowHabs] = useState(false);

  return (
    <div style={{ marginBottom: showHeader ? 16 : 0 }}>
      {showHeader && (
        <div style={{ fontSize: 10, letterSpacing: '0.3em', color: '#5A5070', fontFamily: 'Cinzel,serif', marginBottom: 10, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#E8A020' }}>◆</span> Artefato Portado
        </div>
      )}
      {revealedArtefatos.length === 0 ? (
        <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px dashed rgba(232,160,32,0.15)', color: '#4A4050', fontFamily: 'Cinzel,serif', fontSize: 12, textAlign: 'center' }}>
          Nenhum artefato revelado ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: selectedArt ? 10 : 0 }}>
          <button
            onClick={() => onChange({ ...sheet, artefato_id: '' })}
            style={{
              padding: '6px 12px', borderRadius: 20, fontFamily: 'Cinzel,serif', fontSize: 11,
              border: `1px solid ${!selectedId ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
              background: !selectedId ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
              color: !selectedId ? '#C8B8A0' : '#5A5070', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >Nenhum</button>
          {revealedArtefatos.map(art => {
            const active = selectedId === art.id;
            return (
              <button key={art.id} onClick={() => onChange({ ...sheet, artefato_id: active ? '' : art.id })} style={{
                padding: '6px 12px', borderRadius: 20, fontFamily: 'Cinzel,serif', fontSize: 11,
                border: `1px solid ${active ? 'rgba(232,160,32,0.6)' : 'rgba(232,160,32,0.2)'}`,
                background: active ? 'rgba(232,160,32,0.15)' : 'rgba(255,255,255,0.02)',
                color: active ? '#E8A020' : '#7A6A5A', cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: active ? '0 0 10px rgba(232,160,32,0.25)' : 'none',
              }}>
                {art.icon} {art.name}
              </button>
            );
          })}
        </div>
      )}

      {selectedArt && (
        <div style={{ border: '1px solid rgba(232,160,32,0.25)', borderRadius: 10, background: 'rgba(232,160,32,0.04)', overflow: 'hidden' }}>
          <button onClick={() => setShowHabs(o => !o)} style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: 18 }}>{selectedArt.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Cinzel,serif', fontSize: 12, color: '#E8A020', fontWeight: 700 }}>{selectedArt.name}</div>
              {habs.length > 0 && <div style={{ fontSize: 10, color: 'rgba(232,160,32,0.5)', fontFamily: 'Cinzel,serif' }}>{habs.length} poder{habs.length > 1 ? 'es' : ''} registrado{habs.length > 1 ? 's' : ''}</div>}
            </div>
            <span style={{ color: 'rgba(232,160,32,0.4)', fontSize: 11, transform: showHabs ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }}>▶</span>
          </button>
          {showHabs && (
            <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(232,160,32,0.1)' }}>
              {habs.length === 0 ? (
                <div style={{ padding: '12px 0', textAlign: 'center', fontSize: 12, color: '#5A5070', fontFamily: 'Cinzel,serif', fontStyle: 'italic' }}>
                  Nenhum poder registrado para este artefato ainda.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {habs.map((h, i) => (
                    <div key={i} style={{ background: 'rgba(232,160,32,0.06)', border: '1px solid rgba(232,160,32,0.18)', borderRadius: 8, padding: '9px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color: '#E8A020' }}>✦</span>
                        <span style={{ fontFamily: 'Cinzel,serif', fontSize: 12, color: '#C8B8A0', fontWeight: 600 }}>{h.nome}</span>
                        {h.custo > 0 && <span style={{ fontSize: 10, color: 'rgba(232,160,32,0.7)', fontFamily: 'Cinzel,serif' }}>{h.custo} VC</span>}
                        {h.dano && <span style={{ fontSize: 10, color: 'rgba(255,200,80,0.85)', fontFamily: 'Cinzel,serif', background: 'rgba(255,200,80,0.08)', border: '1px solid rgba(255,200,80,0.22)', borderRadius: 4, padding: '1px 6px' }}>⚔ {h.dano}</span>}
                        {h.cooldown && h.cooldown !== '—' && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'Cinzel,serif' }}>⏱ {h.cooldown}</span>}
                      </div>
                      {h.descricao && <div style={{ fontSize: 13, color: '#7A6A5A', lineHeight: 1.65 }}>{h.descricao}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const newCustomAbility=()=>({id:Date.now()+Math.random(),nome:'',custo:2,cooldown:'—',dano:'',descricao:'',tipoHab:'normal',req:1});

function CooldownBadge({ abilityId, cooldownText, sheetCooldowns, onUpdate, abilityCost, currentVigos, onSpendVC, abilityName, characterName }) {
  const cd = sheetCooldowns?.[abilityId] || 0;
  const isActive = cd > 0;
  const cost = abilityCost || 0;
  const hasCooldown = cooldownText && cooldownText !== '—' && cooldownText !== '';
  const hasEnoughVC = cost === 0 || (currentVigos >= cost);

  const activate = (e) => {
    e.stopPropagation();
    if (!hasEnoughVC) return;
    if (hasCooldown) {
      const parsed = parseInt(String(cooldownText).replace(/\D/g, '')) || 1;
      onUpdate(abilityId, parsed);
    }
    if (onSpendVC && cost > 0) onSpendVC(cost);
    if (abilityName && characterName) {
      logAbilityUsed(characterName, abilityName, cost);
    }
  };

  const decrement = (e) => { e.stopPropagation(); onUpdate(abilityId, Math.max(0, cd - 1)); };
  const reset = (e) => { e.stopPropagation(); onUpdate(abilityId, 0); };

  if (!isActive) {
    if (!hasEnoughVC) {
      return (
        <span style={{
          fontSize: 9, padding: '2px 8px', borderRadius: 4,
          border: '1px solid rgba(232,25,60,0.3)', background: 'rgba(232,25,60,0.07)',
          color: 'rgba(232,25,60,0.75)', fontFamily: 'Cinzel,serif', letterSpacing: '0.05em',
        }}>
          Vigor insuficiente
        </span>
      );
    }
    return (
      <button onClick={activate} title={`Usar — gasta ${cost} VC`} style={{
        fontSize: 9, padding: '2px 7px', borderRadius: 4, cursor: 'pointer',
        border: '1px solid rgba(255,200,0,0.2)', background: 'rgba(255,200,0,0.05)',
        color: 'rgba(255,200,0,0.55)', fontFamily: 'Cinzel,serif', letterSpacing: '0.08em', transition: 'all 0.2s',
      }}>⚡ Usar</button>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(232,100,0,0.14)', border: '1px solid rgba(232,100,0,0.4)', borderRadius: 6, padding: '3px 7px', animation: 'cooldownIn 0.25s ease' }}>
      <span style={{ fontSize: 10 }}>⏳</span>
      <span style={{ fontSize: 11, fontFamily: 'Cinzel,serif', color: '#E86420', fontWeight: 700 }}>{cd}</span>
      <span style={{ fontSize: 9, color: 'rgba(232,100,0,0.7)' }}>turno{cd !== 1 ? 's' : ''}</span>
      <button onClick={decrement} title="-1 turno" style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#E8A020', cursor: 'pointer', borderRadius: 3, fontSize: 11, padding: '0 4px', lineHeight: 1.4 }}>−</button>
      <button onClick={reset} title="Remover cooldown" style={{ background: 'none', border: 'none', color: 'rgba(232,25,60,0.5)', cursor: 'pointer', fontSize: 9, padding: '0 2px' }}>✕</button>
    </div>
  );
}

function HabilidadesPanel({cls, sheet, customAbilities, masterMode, onSaveCustomAbilities, sheetCooldowns, onUpdateCooldown, currentVigos, onSpendVC, characterName}) {
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState(newCustomAbility());
  const nivel = Number(sheet?.nivel) || 1;
  const classCustom = Array.isArray(customAbilities) ? customAbilities.filter(Boolean) : [];

  const handleSave=()=>{
  if(!form.nome.trim())return;
    const updated=[...classCustom,{...form,id:Date.now()}];
    onSaveCustomAbilities(updated);setForm(newCustomAbility());
  };
  const handleDelete=(abilityId)=>{
    const updated=classCustom.filter(a=>a.id!==abilityId);
    onSaveCustomAbilities(updated);
  };

  const color=cls.color;
  const tipoLabel={normal:'Normal',especial:'Especial',passiva:'Passiva'};
  const tipoBadgeColor={normal:'rgba(255,255,255,0.5)',especial:color,passiva:'rgba(168,85,247,0.8)'};

  const abilityRow=(a,isSpecial,isCustom,locked)=>{
    if(!a) return null;
    const danoValue=String(a.dano||a.roll||'');
    const abilityId = String(a.id||a.name||'');
    const isPassiva = isCustom && a.tipoHab === 'passiva';
    const cdText = a.cooldown || a.tempo || '—';
    const hasCd = cdText && cdText !== '—' && cdText !== '';
    return(
    <div key={abilityId} style={{ background:isSpecial||isCustom?`${color}09`:'rgba(255,255,255,0.02)', border:`1px solid ${isSpecial||isCustom?color+'22':'rgba(255,255,255,0.06)'}`, borderRadius:8,padding:'9px 12px',display:'flex',gap:10,alignItems:'flex-start', opacity:locked?0.45:1, position:'relative', transition: 'opacity 0.2s' }}>
      {(sheetCooldowns?.[abilityId]||0) > 0 && !isPassiva && <div style={{ position:'absolute',inset:0,borderRadius:8,pointerEvents:'none', background:'rgba(232,100,0,0.06)', border:'1px solid rgba(232,100,0,0.25)', zIndex:0 }}/>}
      <div style={{flex:1,position:'relative',zIndex:1}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3,flexWrap:'wrap'}}>
          {(isSpecial||isCustom)&&<span style={{fontSize:10,color}}>✦</span>}
          <span style={{fontFamily:'Cinzel,serif',fontSize:12,color:'#C8B8A0',fontWeight:600}}>{String(a.name||a.nome||'')}</span>
          {locked&&<span style={{fontSize:9,color:'rgba(255,200,0,0.5)',fontFamily:'Cinzel,serif'}}>🔒 Nv {Number(a.req)||1}+</span>}
          {isCustom&&a.tipoHab&&<span style={{fontSize:8,color:tipoBadgeColor[a.tipoHab]||color,fontFamily:'Cinzel,serif',letterSpacing:'0.12em',background:`${color}14`,borderRadius:3,padding:'1px 5px',border:`1px solid ${color}33`}}>{(tipoLabel[a.tipoHab]||'Nova').toUpperCase()}</span>}
          {danoValue&&<span style={{fontSize:10,color:'rgba(255,200,80,0.85)',fontFamily:'Cinzel,serif',letterSpacing:'0.05em',background:'rgba(255,200,80,0.08)',border:'1px solid rgba(255,200,80,0.22)',borderRadius:4,padding:'1px 6px'}}>⚔ {danoValue}</span>}
        </div>
        <div style={{fontSize:13,color:'#7A6A5A',lineHeight:1.65}}>{String(a.desc||a.descricao||'')}</div>
      </div>
      <div style={{flexShrink:0,textAlign:'right',display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,position:'relative',zIndex:1}}>
        <div style={{fontSize:11,color:`${color}BB`,fontFamily:'Cinzel,serif'}}>{Number(a.cost||a.custo||0)} VC</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.18)'}}>⏱ {cdText}</div>
        {a.req&&!isCustom&&<div style={{fontSize:10,color:'rgba(255,255,255,0.16)'}}>Nív {Number(a.req)||1}+</div>}
        {!locked && !isPassiva && onUpdateCooldown && (
  <CooldownBadge
    abilityId={abilityId}
    cooldownText={cdText}
    sheetCooldowns={sheetCooldowns}
    onUpdate={onUpdateCooldown}
    abilityCost={Number(a.cost || a.custo || 0)}
    currentVigos={currentVigos ?? 0}
    onSpendVC={onSpendVC}
    abilityName={String(a.name || a.nome || '')}
    characterName={characterName || ''}            
  />
)}
        {isCustom&&masterMode&&<button onClick={()=>handleDelete(a.id)} style={{background:'rgba(232,25,60,0.1)',border:'1px solid rgba(232,25,60,0.25)',color:'#E8193C',borderRadius:4,cursor:'pointer',padding:'1px 6px',fontSize:10}}>✕</button>}
      </div>
    </div>
    );
  };

  const TipoBtn=({val,label:l})=>(<button onClick={()=>setForm(f=>({...f,tipoHab:val}))} style={{flex:1,padding:'5px 4px',borderRadius:5,border:`1px solid ${form.tipoHab===val?color+'66':'rgba(255,255,255,0.1)'}`,background:form.tipoHab===val?`${color}18`:'rgba(255,255,255,0.02)',color:form.tipoHab===val?color:'#6A5A7A',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.06em',transition:'all 0.15s'}}>{l}</button>);

  return(
    <div style={{marginBottom:14,border:`1px solid ${open?color+'33':'rgba(255,255,255,0.07)'}`,borderRadius:10,overflow:'hidden',transition:'border-color 0.2s'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:'100%',padding:'12px 16px',display:'flex',alignItems:'center',gap:10,background:open?`${color}08`:'rgba(255,255,255,0.02)',border:'none',cursor:'pointer',textAlign:'left'}}>
        <span style={{fontSize:15,color}}>{cls.icon}</span>
        <span style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#C8B8A0',fontWeight:600,flex:1}}>Habilidades — {cls.name}</span>
        <span style={{fontSize:10,color:`${color}66`,fontFamily:'Cinzel,serif'}}>{classCustom.length>0?`+${classCustom.length} nova${classCustom.length>1?'s':''}`:''}</span>
        <span style={{color:`${color}88`,fontSize:11,transform:open?'rotate(90deg)':'none',transition:'transform 0.3s'}}>▶</span>
      </button>
      {open&&(
        <div style={{padding:'0 14px 14px'}}>
          <div style={{height:8}}/>
          {cls.id !== 'personalizado' && (
  <>
    <div style={{marginBottom:10}}>
      <div style={{fontSize:9,letterSpacing:'0.3em',color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Passiva</div>
      <div style={{background:`${color}0D`,border:`1px solid ${color}28`,borderRadius:8,padding:'9px 12px'}}><div style={{fontFamily:'Cinzel,serif',fontSize:12,color,fontWeight:600,marginBottom:3}}>{cls.passive.name}</div><div style={{fontSize:13,color:'#7A6A5A',lineHeight:1.65}}>{cls.passive.desc}</div></div>
    </div>
    <div style={{marginBottom:10}}>
      <div style={{fontSize:9,letterSpacing:'0.3em',color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Ataques Normais — 2 VC cada</div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>{cls.normal.map(a=>abilityRow(a,false,false,false))}</div>
    </div>
    <div style={{marginBottom:10}}>
      <div style={{fontSize:9,letterSpacing:'0.3em',color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Especiais — 3 VC cada</div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>{cls.specials.map(a=>abilityRow(a,true,false,nivel<a.req))}</div>
    </div>
  </>
)}
{cls.id === 'personalizado' && classCustom.length === 0 && !masterMode && (
  <div style={{padding:'18px',borderRadius:10,border:'1px dashed rgba(192,192,192,0.15)',color:'#5A5070',textAlign:'center',fontFamily:'Cinzel,serif',fontSize:12,marginBottom:10}}>
    As habilidades deste personagem serão reveladas pelo Mestre.
  </div>
)}
{classCustom.length>0&&(
  <div style={{marginBottom:10}}>
    <div style={{fontSize:9,letterSpacing:'0.3em',color:`${color}88`,fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Desbloqueadas pelo Mestre</div>
    <div style={{display:'flex',flexDirection:'column',gap:6}}>{classCustom.map(a=>abilityRow(a,false,true,a.req&&nivel<a.req))}</div>
  </div>
)}
{masterMode&&(
            <div style={{border:`1px solid ${color}30`,borderRadius:10,padding:'14px',background:`${color}05`,marginTop:4}}>
              <div style={{fontSize:9,letterSpacing:'0.35em',color:`${color}AA`,fontFamily:'Cinzel,serif',marginBottom:12,textTransform:'uppercase'}}>✦ Adicionar Habilidade Nova · {cls.name}</div>
              <div style={{display:'flex',flexDirection:'column',gap:9}}>
                <div><label style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.22em'}}>Nome da Habilidade</label><input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Golpe Cósmico" style={{width:'100%'}}/></div>
                <div><label style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.22em'}}>Tipo de Habilidade</label><div style={{display:'flex',gap:6}}><TipoBtn val="normal" label="Normal"/><TipoBtn val="especial" label="Especial"/><TipoBtn val="passiva" label="Passiva"/></div></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div><label style={{fontSize:9,color:'rgba(255,200,80,0.5)',fontFamily:'Cinzel,serif',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.22em'}}>Dano / Efeito</label><input value={form.dano} onChange={e=>setForm(f=>({...f,dano:e.target.value}))} placeholder="Ex: 1D8, 3D4, +2 vida" style={{width:'100%'}}/></div>
                  <div><label style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.22em'}}>Custo VC</label><input type="number" min={0} value={form.custo} onChange={e=>setForm(f=>({...f,custo:+e.target.value}))} style={{width:'100%'}}/></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div><label style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.22em'}}>Cooldown / Rodadas</label><input value={form.cooldown} onChange={e=>setForm(f=>({...f,cooldown:e.target.value}))} placeholder="Ex: 3 rodadas" style={{width:'100%'}}/></div>
                  <div><label style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.22em'}}>Nível Mínimo</label><input type="number" min={1} max={30} value={form.req} onChange={e=>setForm(f=>({...f,req:+e.target.value}))} style={{width:'100%'}}/></div>
                </div>
                <div><label style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.22em'}}>Descrição</label><textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Descreva o efeito, duração, condições especiais, área de alcance..." rows={3} style={{width:'100%',resize:'vertical',lineHeight:1.7}}/></div>
                <button onClick={handleSave} disabled={!form.nome.trim()} style={{padding:'8px',borderRadius:7,border:`1px solid ${color}55`,background:form.nome.trim()?`${color}20`:'rgba(255,255,255,0.03)',color:form.nome.trim()?color:'#5A5070',cursor:form.nome.trim()?'pointer':'not-allowed',fontFamily:'Cinzel,serif',fontSize:12,letterSpacing:'0.1em',fontWeight:600,transition:'all 0.2s'}}>✦ Salvar Habilidade em {cls.name}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const newSummon = id => ({ id, nome: '', hp: 10, hp_bonus: 0, ataques: [] });
const newSummonAttack = () => ({ id: Date.now() + Math.random(), nome: '', dano: '', desc: '' });

function SummonCard({ summon, onChange, onDelete, masterMode, color }) {
  const f = (k, v) => onChange({ ...summon, [k]: v });
  const hp = summon.hp || 0;
  const hpBonus = summon.hp_bonus || 0;
  const [formAtk, setFormAtk] = useState(newSummonAttack());

  const addAtk = () => {
    if (!formAtk.nome.trim()) return;
    f('ataques', [...(summon.ataques || []), { ...formAtk, id: Date.now() }]);
    setFormAtk(newSummonAttack());
  };
  const delAtk = (id) => f('ataques', (summon.ataques || []).filter(a => a.id !== id));

  return (
    <div style={{ border: `1px solid ${color}44`, borderRadius: 12, background: `${color}08`, padding: '14px 16px', marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 9, letterSpacing: '0.25em', color: `${color}AA`, fontFamily: 'Cinzel,serif', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Nome da Invocação</label>
          {masterMode
            ? <input value={summon.nome} onChange={e => f('nome', e.target.value)} placeholder="Ex: Esqueleto Guerreiro" style={{ width: '100%' }} />
            : <div style={{ fontFamily: 'Cinzel,serif', fontSize: 14, color, fontWeight: 700 }}>{summon.nome || 'Sem nome'}</div>}
        </div>
        {masterMode && <button onClick={onDelete} style={{ background: 'rgba(232,25,60,0.1)', border: '1px solid rgba(232,25,60,0.3)', color: '#E8193C', borderRadius: 6, cursor: 'pointer', padding: '6px 10px', fontSize: 11 }}>✕</button>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 12px' }}>
        <button onClick={() => f('hp', Math.max(0, hp - 1))} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(232,25,60,0.4)', background: 'rgba(232,25,60,0.15)', color: '#E8193C', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>−</button>
        <div style={{ textAlign: 'center', minWidth: 60 }}>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 22, fontWeight: 900, color: hpColor(hp, hp + hpBonus || 1) }}>{hp}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>HP {hpBonus > 0 ? `(+${hpBonus})` : ''}</div>
        </div>
        <button onClick={() => f('hp', hp + 1)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.15)', color: '#4ADE80', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>+</button>
        {masterMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <span style={{ fontSize: 9, color: 'rgba(74,222,128,0.6)', fontFamily: 'Cinzel,serif' }}>Bônus</span>
            <button onClick={() => f('hp_bonus', Math.max(0, hpBonus - 1))} style={{ width: 20, height: 20, borderRadius: 5, border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)', color: '#4ADE80', cursor: 'pointer', fontSize: 12, padding: 0 }}>−</button>
            <span style={{ fontSize: 12, color: '#4ADE80', minWidth: 16, textAlign: 'center' }}>{hpBonus}</span>
            <button onClick={() => f('hp_bonus', hpBonus + 1)} style={{ width: 20, height: 20, borderRadius: 5, border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)', color: '#4ADE80', cursor: 'pointer', fontSize: 12, padding: 0 }}>+</button>
          </div>
        )}
      </div>

      <div style={{ fontSize: 9, letterSpacing: '0.25em', color: `${color}AA`, fontFamily: 'Cinzel,serif', marginBottom: 7, textTransform: 'uppercase' }}>Ataques</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: masterMode ? 10 : 0 }}>
        {(summon.ataques || []).length === 0 && (
          <div style={{ fontSize: 11, color: '#4A4050', fontFamily: 'Cinzel,serif', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>Nenhum ataque cadastrado.</div>
        )}
        {(summon.ataques || []).map(a => (
          <div key={a.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 7, padding: '7px 10px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontFamily: 'Cinzel,serif', fontSize: 12, color: '#C8B8A0', fontWeight: 600 }}>{a.nome}</span>
                {a.dano && <span style={{ fontSize: 10, color: 'rgba(255,200,80,0.85)', fontFamily: 'Cinzel,serif', background: 'rgba(255,200,80,0.08)', border: '1px solid rgba(255,200,80,0.22)', borderRadius: 4, padding: '1px 6px' }}>⚔ {a.dano}</span>}
              </div>
              {a.desc && <div style={{ fontSize: 12, color: '#7A6A5A', lineHeight: 1.6 }}>{a.desc}</div>}
            </div>
            {masterMode && <button onClick={() => delAtk(a.id)} style={{ background: 'rgba(232,25,60,0.1)', border: '1px solid rgba(232,25,60,0.25)', color: '#E8193C', borderRadius: 4, cursor: 'pointer', padding: '1px 6px', fontSize: 10, flexShrink: 0 }}>✕</button>}
          </div>
        ))}
      </div>

      {masterMode && (
        <div style={{ border: `1px solid ${color}30`, borderRadius: 8, padding: 10, background: `${color}06` }}>
          <input value={formAtk.nome} onChange={e => setFormAtk(f2 => ({ ...f2, nome: e.target.value }))} placeholder="Nome do ataque..." style={{ width: '100%', fontSize: 12, marginBottom: 6 }} />
          <input value={formAtk.dano} onChange={e => setFormAtk(f2 => ({ ...f2, dano: e.target.value }))} placeholder="Dano (ex: 1D6+2)" style={{ width: '100%', fontSize: 12, marginBottom: 6 }} />
          <textarea value={formAtk.desc} onChange={e => setFormAtk(f2 => ({ ...f2, desc: e.target.value }))} placeholder="Descrição do ataque..." rows={2} style={{ width: '100%', fontSize: 12, resize: 'vertical', marginBottom: 6 }} />
          <button onClick={addAtk} disabled={!formAtk.nome.trim()} style={{ width: '100%', padding: '6px', borderRadius: 6, border: `1px solid ${color}55`, background: formAtk.nome.trim() ? `${color}20` : 'rgba(255,255,255,0.03)', color: formAtk.nome.trim() ? color : '#5A5070', cursor: formAtk.nome.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Cinzel,serif', fontSize: 11 }}>+ Adicionar Ataque</button>
        </div>
      )}
    </div>
  );
}

function InvocacoesPanel({ sheet, onChange, sheetColor, masterMode }) {
  const invocacoes = sheet.invocacoes || [];
  const f = (novas) => onChange({ ...sheet, invocacoes: novas });
  const addSummon = () => { if (invocacoes.length >= 2) return; f([...invocacoes, newSummon(Date.now())]); };
  const updSummon = (id, data) => f(invocacoes.map(s => s.id === id ? data : s));
  const delSummon = (id) => f(invocacoes.filter(s => s.id !== id));

  return (
    <div>
      <div style={{ fontSize: 12, color: '#7A6A8A', fontFamily: 'Cinzel,serif', marginBottom: 14, textAlign: 'center', fontStyle: 'italic' }}>
        Até 2 invocações simultâneas. {masterMode ? 'Cadastre nome, vida e ataques de cada uma.' : 'Fichas definidas pelo Mestre.'}
      </div>
      {invocacoes.map(s => (
        <SummonCard key={s.id} summon={s} onChange={d => updSummon(s.id, d)} onDelete={() => delSummon(s.id)} masterMode={masterMode} color={sheetColor} />
      ))}
      {invocacoes.length < 2 && masterMode && (
        <button onClick={addSummon} style={{ width: '100%', padding: 12, borderRadius: 10, border: `1px dashed ${sheetColor}44`, background: 'rgba(255,255,255,0.01)', color: sheetColor, cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 12, letterSpacing: '0.06em' }}>+ Adicionar Invocação ({invocacoes.length}/2)</button>
      )}
      {invocacoes.length === 0 && !masterMode && (
        <div style={{ textAlign: 'center', padding: 30, border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 12, color: '#5A5070', fontFamily: 'Cinzel,serif', fontSize: 12 }}>Nenhuma invocação definida ainda.</div>
      )}
    </div>
  );
}

const newSheet=id=>({id,nome:'',classe:'fogo',nivel:1,xp:0,hp:10,hp_bonus:0,vigos:5,forca:0,agilidade:0,durabilidade:0,inteligencia:0,percepcao:0,sorte:0,attrPoints:0,especial1:false,especial2:false,lore_personagem:'',notas:'',foto:'',equip_mao_esq:{nome:'',dano:'',tipo:'Espada / Arma'},equip_mao_dir:{nome:'',dano:'',tipo:'Escudo / Arma'},equip_corpo:{nome:'',dano:'',tipo:'Armadura / Roupa'},status:{},senha:'',artefato_id:'', personalidade:[], cooldowns:{}, invocacoes:[]});
function SheetFull({sheet, onChange, masterMode, customAbilities, onSaveCustomAbilities, revealedArtefatos, artefatosHabs}){
  const cls=CLASSES.find(c=>c.id===sheet.classe)||CLASSES[0];
  const sheetColor=SHEET_COLORS[sheet.classe]||cls.color;
  const sheetGlow=SHEET_GLOWS[sheet.classe]||cls.glow;
  const label=v=>v<=3?'Aprendiz Cósmico':v<=6?'Portador do Destino':v<=9?'Arauto do Fim':v<=14?'Guardião Estelar':v<=19?'Ascendente':v<=24?'Transcendente':v<=29?'Arauto Supremo':'Lenda Cósmica';
  const f=(k,v)=>onChange({...sheet,[k]:v});
  const hp=sheet.hp||0; const hpBonus=sheet.hp_bonus||0;
  const attrPoints = sheet.attrPoints || 0;
  const photoInputRef=useRef(null);
  const [levelUpData, setLevelUpData] = useState(null);
  const [sheetTab, setSheetTab] = useState('geral');
  // Cooldowns agora vivem na própria ficha (Firestore) — permite indicador no Modo Mestre
  const sheetCooldowns = sheet.cooldowns || {};
  const handleUpdateCooldown = (abilityId, turns) => { f('cooldowns', { ...sheetCooldowns, [abilityId]: turns }); };
  const sheetTabsList = cls.id==='necromante' ? [...SHEET_TABS,{id:'invocacoes',label:'Invocações',icon:'💀'}] : SHEET_TABS;
  const handlePhotoFile=async e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=async ev=>{const compressed=await compressImage(ev.target.result,900,900,0.75);f('foto',compressed);};reader.readAsDataURL(file);};
  const attrBonus=val=>Math.floor(val/2);

  const handleNivelChange = (newNivel) => {
    const old = sheet.nivel || 1;
    const clamped = Math.min(30, Math.max(1, newNivel));
    if (masterMode && clamped > old) {
      const gained = clamped - old;
      const updated = { ...sheet, nivel: clamped, attrPoints: (sheet.attrPoints || 0) + gained };
      onChange(updated);
      const color = SHEET_COLORS[sheet.classe] || '#A855F7';
      setLevelUpData({ nome: sheet.nome || 'Personagem', nivel: clamped, color });
      pushToast(`${sheet.nome || 'Personagem'} subiu para Nível ${clamped}!`, '⬆️', color);
    } else {
      f('nivel', clamped);
    }
  };

  const handleSpendPoint = (attrKey, newVal) => {
    if (attrPoints <= 0) return;
    onChange({ ...sheet, [attrKey]: newVal, attrPoints: attrPoints - 1 });
  };

  return(
    <div style={{border:`1px solid ${sheetColor}44`,borderRadius:16,overflow:'hidden',background:'rgba(8,10,22,0.95)',boxShadow:`0 6px 32px ${sheetGlow}`}}>
      {levelUpData && <LevelUpScreen data={levelUpData} onClose={() => setLevelUpData(null)} />}
      <div style={{height:4,background:`linear-gradient(90deg,${sheetColor},${sheetColor}44,transparent)`}}/>

      {/* HEADER STICKY — nome + foto pequena + sub-abas, visível durante toda a rolagem */}
      <div style={{position:'sticky',top:0,zIndex:40,background:'rgba(8,10,22,0.97)',backdropFilter:'blur(8px)',borderBottom:`1px solid ${sheetColor}33`}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'9px 16px 7px'}}>
          {sheet.foto
            ? <img src={sheet.foto} alt="" style={{width:30,height:30,borderRadius:7,objectFit:'cover',border:`1.5px solid ${sheetColor}55`,flexShrink:0}}/>
            : <div style={{width:30,height:30,borderRadius:7,background:`${sheetColor}15`,border:`1.5px dashed ${sheetColor}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{cls.icon}</div>
          }
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:'Cinzel,serif',fontSize:13,fontWeight:700,color:sheetColor,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{sheet.nome||'Sem nome'}</div>
            <div style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif'}}>Nv {sheet.nivel||1} · {hp}/{hp+hpBonus} HP</div>
          </div>
          {attrPoints>0 && <span title={`${attrPoints} ponto(s) de atributo pendente(s)`} style={{width:7,height:7,borderRadius:'50%',background:'#A855F7',boxShadow:'0 0 6px #A855F7',animation:'pulse 1.5s ease-in-out infinite',flexShrink:0}}/>}
        </div>
        <div style={{display:'flex',gap:4,padding:'0 10px 8px'}}>
          {sheetTabsList.map(t=>(
            <button key={t.id} onClick={()=>setSheetTab(t.id)} style={{
              flex:1,padding:'6px 8px',borderRadius:7,cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:'0.03em',
              border:sheetTab===t.id?`1px solid ${sheetColor}66`:'1px solid rgba(255,255,255,0.07)',
              background:sheetTab===t.id?`${sheetColor}16`:'rgba(255,255,255,0.02)',
              color:sheetTab===t.id?sheetColor:'#6A5A7A',transition:'all 0.2s',
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
      </div>

      {sheetTab==='geral' && (
        <div onClick={()=>photoInputRef.current?.click()} style={{position:'relative',width:'100%',cursor:'pointer',background:'#04060F',overflow:'hidden',minHeight:sheet.foto?0:130}}>
          {sheet.foto?<img src={sheet.foto} alt="personagem" style={{width:'100%',display:'block',objectFit:'contain',background:'#04060F'}}/>:<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'36px 20px',gap:10}}><div style={{fontSize:40,opacity:0.15}}>📷</div><div style={{fontSize:12,color:'rgba(255,255,255,0.18)',fontFamily:'Cinzel,serif',letterSpacing:'0.08em',textAlign:'center'}}>Toque para adicionar a foto do personagem</div></div>}
          {sheet.foto&&<div style={{position:'absolute',bottom:0,left:0,right:0,height:'30%',background:'linear-gradient(to bottom,transparent,rgba(4,6,15,0.95))',pointerEvents:'none'}}/>}
          {sheet.foto&&<div style={{position:'absolute',bottom:16,left:20,right:20}}><div style={{fontFamily:'Cinzel Decorative,serif',fontSize:22,fontWeight:700,color:sheetColor,textShadow:`0 0 24px ${sheetColor}88`}}>{sheet.nome||'Sem nome'}</div><div style={{fontSize:12,color:'rgba(255,255,255,0.55)',marginTop:4,fontFamily:'Cinzel,serif'}}>{cls.icon} {cls.name} · Nv {sheet.nivel} · {label(sheet.nivel)}</div></div>}
        </div>
      )}
      <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoFile} style={{display:'none'}}/>

      <div style={{padding:'18px'}}>

        {sheetTab==='geral' && (<>
        {attrPoints > 0 && (
          <div style={{ marginBottom: SPACING, padding: '14px 18px', border: '1px solid rgba(168,85,247,0.5)', borderRadius: 12, background: 'rgba(168,85,247,0.08)', animation: 'bannerGlow 2s ease-in-out infinite', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>✨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Cinzel,serif', fontSize: 13, color: '#C8A8E8', fontWeight: 700, marginBottom: 2 }}>{attrPoints} Ponto{attrPoints > 1 ? 's' : ''} de Atributo disponíve{attrPoints > 1 ? 'is' : 'l'}!</div>
              <div style={{ fontSize: 12, color: '#7A6A9A' }}>Clique na próxima bolinha de um atributo para gastar um ponto.</div>
            </div>
            {masterMode && <button onClick={() => f('attrPoints', Math.max(0, attrPoints - 1))} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(232,25,60,0.3)', background: 'rgba(232,25,60,0.08)', color: '#E8193C', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10 }}>−1</button>}
          </div>
        )}

        <div className="nome-classe-row" style={{display:'flex',gap:10,alignItems:'flex-end',marginBottom:SPACING,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:120}}><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Nome</label><input value={sheet.nome} onChange={e=>f('nome',e.target.value)} placeholder="Nome do personagem" style={{width:'100%'}}/></div>
          <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Classe</label><select value={sheet.classe} onChange={e=>f('classe',e.target.value)}>{CLASSES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>
          {masterMode&&<button onClick={()=>onChange(null)} style={{background:'rgba(232,25,60,0.12)',border:'1px solid rgba(232,25,60,0.35)',color:'#E8193C',borderRadius:6,cursor:'pointer',padding:'6px 11px',fontSize:12}}>✕ Excluir</button>}
        </div>

        <div className="sheet-stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(138px,1fr))',gap:8,marginBottom:SPACING}}>

          <div style={{gridColumn:'1 / -1', background:'rgba(232,25,60,0.06)', border:'1px solid rgba(232,25,60,0.18)', borderRadius:14, padding:'20px 18px'}}>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:'#E8193C',fontFamily:'Cinzel,serif',marginBottom:16,textTransform:'uppercase',textAlign:'center'}}>
              ❤️ Pontos de Vida
            </div>

            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:20,marginBottom:16}}>
              <button onClick={()=>f('hp',Math.max(0,hp-1))} style={{width:44,height:44,borderRadius:10,border:'1px solid rgba(232,25,60,0.45)',background:'rgba(232,25,60,0.18)',color:'#E8193C',cursor:'pointer',fontSize:26,lineHeight:1,padding:0,transition:'all 0.15s'}}>−</button>
              <div style={{textAlign:'center',minWidth:80}}>
                <div style={{fontFamily:'Cinzel,serif',fontSize:52,fontWeight:900,lineHeight:1,color:hpColor(hp,30),textShadow:`0 0 28px ${hpColor(hp,30)}88, 0 0 6px ${hpColor(hp,30)}44`,transition:'color 0.4s, text-shadow 0.4s'}}>{hp}</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginTop:4,letterSpacing:'0.08em'}}>{Math.round(Math.min(100,(hp/Math.max(1,hp+hpBonus))*100))}% de vida</div>
              </div>
              <button onClick={()=>f('hp',hp+1)} style={{width:44,height:44,borderRadius:10,border:'1px solid rgba(74,222,128,0.45)',background:'rgba(74,222,128,0.18)',color:'#4ADE80',cursor:'pointer',fontSize:26,lineHeight:1,padding:0,transition:'all 0.15s'}}>+</button>
            </div>

            <div style={{height:8,background:'rgba(255,255,255,0.06)',borderRadius:6,marginBottom:14,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${Math.min(100,(hp/Math.max(1,hp+hpBonus))*100)}%`,background:`linear-gradient(90deg,${hpColor(hp,30)},${hpColor(hp,30)}99)`,borderRadius:6,transition:'width 0.4s ease, background 0.4s ease',boxShadow:`0 0 8px ${hpColor(hp,30)}66`}}/>
            </div>

            <div style={{display:'flex',gap:5,flexWrap:'wrap',justifyContent:'center',marginBottom:14}}>
              {[-15,-10,-5].map(v=>(
                <button key={v} onClick={()=>f('hp',Math.max(0,hp+v))} style={{padding:'5px 10px',borderRadius:7,border:'1px solid rgba(232,25,60,0.3)',background:'rgba(232,25,60,0.1)',color:'#E8193C',cursor:'pointer',fontSize:12,fontWeight:'bold',letterSpacing:'0.04em'}}>{v}</button>
              ))}
              <div style={{width:10}}/>
              {[+5,+10,+15].map(v=>(
                <button key={v} onClick={()=>f('hp',hp+v)} style={{padding:'5px 10px',borderRadius:7,border:'1px solid rgba(74,222,128,0.3)',background:'rgba(74,222,128,0.1)',color:'#4ADE80',cursor:'pointer',fontSize:12,fontWeight:'bold',letterSpacing:'0.04em'}}>+{v}</button>
              ))}
            </div>

            <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:14,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontSize:9,letterSpacing:'0.25em',color:'rgba(74,222,128,0.6)',fontFamily:'Cinzel,serif',textTransform:'uppercase'}}>🛡 Vida Bônus</div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <button onClick={()=>f('hp_bonus',Math.max(0,hpBonus-1))} style={{width:26,height:26,borderRadius:6,border:'1px solid rgba(74,222,128,0.28)',background:'rgba(74,222,128,0.07)',color:'#4ADE80',cursor:'pointer',fontSize:16,lineHeight:1,padding:0}}>−</button>
                <span style={{fontFamily:'Cinzel,serif',fontSize:20,fontWeight:700,color:'#4ADE80',minWidth:28,textAlign:'center'}}>{hpBonus}</span>
                <button onClick={()=>f('hp_bonus',hpBonus+1)} style={{width:26,height:26,borderRadius:6,border:'1px solid rgba(74,222,128,0.28)',background:'rgba(74,222,128,0.07)',color:'#4ADE80',cursor:'pointer',fontSize:16,lineHeight:1,padding:0}}>+</button>
              </div>
            </div>
          </div>

          <div style={{background:'rgba(232,160,32,0.07)',border:'1px solid rgba(232,160,32,0.2)',borderRadius:10,padding:'10px 12px'}}>
            <div style={{fontSize:9,letterSpacing:'0.25em',color:'#E8A020',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Nível · XP</div>
            {masterMode ? (
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <input type="number" min={1} max={30} value={sheet.nivel} onChange={e=>handleNivelChange(+e.target.value)} style={{width:40,textAlign:'center',fontSize:13}}/>
                <span style={{color:'rgba(255,255,255,0.14)',fontSize:10}}>Nv</span>
                <input type="number" min={0} value={sheet.xp} onChange={e=>f('xp',+e.target.value)} style={{width:58,textAlign:'center',fontSize:13}}/>
                <span style={{fontSize:10,color:'rgba(255,255,255,0.18)'}}>XP</span>
              </div>
            ) : (
              <div style={{display:'flex',alignItems:'baseline',gap:8}}>
                <span style={{fontFamily:'Cinzel,serif',fontSize:22,fontWeight:700,color:'#E8A020'}}>{sheet.nivel || 1}</span>
                <span style={{fontSize:11,color:'rgba(232,160,32,0.5)',fontFamily:'Cinzel,serif'}}>Nível</span>
                <span style={{fontFamily:'Cinzel,serif',fontSize:15,fontWeight:600,color:'rgba(232,160,32,0.7)',marginLeft:6}}>{sheet.xp || 0}</span>
                <span style={{fontSize:10,color:'rgba(232,160,32,0.4)',fontFamily:'Cinzel,serif'}}>XP</span>
              </div>
            )}
            <div style={{fontSize:9,color:'#7A6A5A',marginTop:3,fontFamily:'Cinzel,serif'}}>{label(sheet.nivel)}</div>
            {masterMode && attrPoints > 0 && <div style={{marginTop:6,fontSize:10,color:'#A855F7',fontFamily:'Cinzel,serif'}}>✨ +{attrPoints} pts pendentes</div>}
          </div>
        </div>
          
        <div className="attrs-personality-row" style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:18,marginBottom:SPACING,alignItems:'start'}}>
          <div>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:9,textTransform:'uppercase'}}>Atributos</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {ATTRS.map(a=>{
                const bonus=attrBonus(sheet[a.key]||0);
                return(
                  <div key={a.key} style={{display:'flex',alignItems:'center',gap:8}}>
                    <span className="attr-label" style={{fontSize:11,fontFamily:'Cinzel,serif',color:a.color,minWidth:92,letterSpacing:'0.03em'}}>{a.label}</span>
                    <AttrDots value={sheet[a.key]||0} color={a.color} onChange={v=>{ if(masterMode) f(a.key,v); }} masterMode={masterMode} attrPoints={attrPoints} onSpendPoint={(newVal) => handleSpendPoint(a.key, newVal)}/>
                    <span style={{fontSize:11,color:'rgba(255,255,255,0.22)',minWidth:16,textAlign:'right'}}>{sheet[a.key]||0}</span>
                    <span style={{fontSize:11,fontFamily:'Cinzel,serif',fontWeight:700,color:bonus>0?a.color:'rgba(255,255,255,0.12)',minWidth:26,textAlign:'center',background:bonus>0?`${a.color}15`:'transparent',borderRadius:4,padding:'1px 4px',border:bonus>0?`1px solid ${a.color}33`:'1px solid transparent',transition:'all 0.2s'}}>{bonus>0?`+${bonus}`:'—'}</span>
                  </div>
                );
              })}
            </div>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.15)',marginTop:6,fontFamily:'Cinzel,serif',letterSpacing:'0.05em'}}>a cada 2 pontos = +1 bônus</div>
          </div>

          <div>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:9,textTransform:'uppercase'}}>Personalidade</div>
            <PersonalityTags value={sheet.personalidade} color={sheetColor} onChange={v=>f('personalidade',v)}/>
          </div>
        </div>
        </>)}

                {sheetTab==='combate' && (<>
        {/* Vigor Cósmico — visível de imediato, sem precisar voltar pra Visão Geral */}
        <div style={{marginBottom:SPACING}}>
          <div style={{background:`${sheetColor}09`,border:`1px solid ${sheetColor}24`,borderRadius:10,padding:'10px 12px',maxWidth:220}}>
            <div style={{fontSize:9,letterSpacing:'0.25em',color:sheetColor,fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Vigor Cósmico</div>
            <VigosWithLocked value={sheet.vigos||0} nivel={sheet.nivel||1} color={sheetColor} onChange={v=>f('vigos',v)}/>
            <div style={{fontSize:9,color:'rgba(255,255,255,0.18)',marginTop:4}}>+2 por turno</div>
            {sheet.nivel>=8&&sheet.nivel<18&&<div style={{fontSize:8,color:'rgba(255,200,0,0.5)',marginTop:2,fontFamily:'Cinzel,serif'}}>✦ +1 VC (Nv 8)</div>}
            {sheet.nivel>=18&&<div style={{fontSize:8,color:'rgba(255,200,0,0.5)',marginTop:2,fontFamily:'Cinzel,serif'}}>✦ +2 VC (Nv 8 e 18)</div>}
          </div>
        </div>

        {/* Status Ativos — pra ver de cara se está envenenado, sangrando, atordoado etc. */}
        <StatusPanel sheet={sheet} onChange={onChange} />

        {/* Bônus de Atributos — leitura rápida pra rolagens; editar continua em Visão Geral */}
        <div style={{marginBottom:SPACING}}>
          <div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:9,textTransform:'uppercase'}}>Bônus de Atributos</div>
          <AttrBonusStrip sheet={sheet}/>
        </div>
        <div style={{marginBottom:SPACING}}>
          <div className="sheet-specials-row" style={{display:'flex',alignItems:'center',gap:12,marginBottom:9,flexWrap:'wrap'}}>
            {cls.id !== 'personalizado' && (
              <div style={{display:'flex',gap:9,flexWrap:'wrap',flex:1}}>
                {cls.specials.map((sp,i)=>{const key=i===0?'especial1':'especial2';const unlocked=sheet[key];const canUnlock=i===0?sheet.nivel>=3:sheet.nivel>=7;return(<button key={i} onClick={()=>f(key,!unlocked)} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 12px',borderRadius:7,border:`1px solid ${unlocked?sheetColor+'55':'rgba(255,255,255,0.09)'}`,background:unlocked?`${sheetColor}14`:'rgba(255,255,255,0.02)',cursor:canUnlock?'pointer':'not-allowed',opacity:canUnlock?1:0.5,transition:'all 0.2s'}}><span style={{fontSize:12}}>{unlocked?'✦':'○'}</span><div style={{textAlign:'left'}}><div style={{fontSize:11,color:unlocked?sheetColor:'#6A5A6A',fontFamily:'Cinzel,serif'}}>{sp.name}</div><div style={{fontSize:10,color:'rgba(255,255,255,0.18)'}}>Nível {sp.req}+{!canUnlock&&` (Atual: ${sheet.nivel})`}</div></div></button>);})}
              </div>
            )}
            <div style={{flexShrink:0,padding:'8px 14px',borderRadius:8,border:`1px solid ${sheetColor}33`,background:`${sheetColor}0A`,textAlign:'center'}}>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.25)',fontFamily:'Cinzel,serif',letterSpacing:'0.15em',marginBottom:3,textTransform:'uppercase'}}>Alcance</div>
              <div style={{fontSize:16,fontFamily:'Cinzel,serif',color:sheetColor,fontWeight:700}}>{cls.alcance}</div>
            </div>
          </div>
        </div>

        <HabilidadesPanel
          cls={cls}
          sheet={sheet}
          customAbilities={customAbilities}
          masterMode={masterMode}
          onSaveCustomAbilities={onSaveCustomAbilities}
          sheetCooldowns={sheetCooldowns}
          onUpdateCooldown={handleUpdateCooldown}
          currentVigos={sheet.vigos ?? 0}
          onSpendVC={(cost) => f('vigos', Math.max(0, (sheet.vigos ?? 0) - cost))}
          characterName={sheet.nome || 'Personagem'}
        />

        <CollapsibleSection icon="⚔" label="Equipamentos" color={sheetColor}>
          <EquipamentoPanel sheet={sheet} onChange={onChange} sheetColor={sheetColor}/>
        </CollapsibleSection>
        </>)}

        {sheetTab==='lore' && (<>
        <CollapsibleSection icon="◆" label="Artefato Portado" color="#E8A020">
          <ArtefatoFichaPanel
            sheet={sheet}
            onChange={onChange}
            sheetColor={sheetColor}
            revealedArtefatos={revealedArtefatos || []}
            artefatosHabs={artefatosHabs || {}}
            showHeader={false}
          />
        </CollapsibleSection>

        <CollapsibleSection icon="🎒" label="Itens & Inventário" color={sheetColor}>
          <textarea value={sheet.notas||''} onChange={e=>f('notas',e.target.value)} placeholder="Liste outros itens carregados pelo personagem..." rows={3} style={{width:'100%',resize:'vertical'}}/>
        </CollapsibleSection>

        <CollapsibleSection
          icon="✦"
          label="Lore do Personagem"
          color={sheetColor}
          badge={!masterMode && sheet.lore_personagem ? <span style={{fontSize:9,color:sheetColor+'66',letterSpacing:'0.1em'}}>SOMENTE LEITURA</span> : null}
        >
          {masterMode ? (
            <textarea
              value={sheet.lore_personagem||''}
              onChange={e=>f('lore_personagem',e.target.value)}
              placeholder="Escreva aqui a história, origem, motivações e segredos do personagem..."
              rows={7}
              style={{width:'100%',resize:'vertical',lineHeight:1.85}}
            />
          ) : sheet.lore_personagem ? (
            <div style={{
              fontSize:15, color:'#B8A898', lineHeight:2,
              whiteSpace:'pre-wrap', fontFamily:"'Crimson Text',Georgia,serif",
              padding:'16px 18px',
              background:`${sheetColor}06`,
              borderRadius:10,
              border:`1px solid ${sheetColor}22`,
              borderLeft:`3px solid ${sheetColor}55`,
            }}>
              {sheet.lore_personagem}
            </div>
          ) : (
            <div style={{
              fontSize:13, color:'#4A4050', fontStyle:'italic',
              fontFamily:'Cinzel,serif', textAlign:'center',
              padding:'24px 0', border:'1px dashed rgba(255,255,255,0.05)',
              borderRadius:10,
            }}>
              A história deste personagem ainda não foi escrita pelo Mestre.
            </div>
          )}
        </CollapsibleSection>

        <div style={{marginTop:SPACING,paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.05)'}}>
          {masterMode ? (
            <div>
              <div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>🔒 Senha da Ficha</div>
              <div style={{display:'flex',gap:8}}>
                <input type="password" value={sheet.senha||''} onChange={e=>f('senha',e.target.value)} placeholder="Definir senha do jogador..." style={{flex:1,fontSize:13}}/>
                {sheet.senha && <button onClick={()=>f('senha','')} style={{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(232,25,60,0.3)',background:'rgba(232,25,60,0.08)',color:'#E8193C',cursor:'pointer',fontSize:11}}>Resetar</button>}
              </div>
              <div style={{fontSize:10,color:'#4A4050',marginTop:5,fontFamily:'Cinzel,serif'}}>O Mestre pode resetar a senha. Jogadores precisam dela para abrir a ficha.</div>
            </div>
          ) : (
            sheet.senha ? <div style={{fontSize:11,color:'#4A4050',fontFamily:'Cinzel,serif',textAlign:'center'}}>🔒 Ficha protegida por senha.</div> : null
          )}
        </div>
        </>)}

        {sheetTab==='invocacoes' && cls.id==='necromante' && (
          <InvocacoesPanel sheet={sheet} onChange={onChange} sheetColor={sheetColor} masterMode={masterMode}/>
        )}

      </div>
    </div>
  );
}

function SheetsSection({masterMode}){
  const[sheets,setSheets]=useState([]);const[loaded,setLoaded]=useState(false);const[activeId,setActiveId]=useState(null);
  const[customAbilities,setCustomAbilities]=useState({});
  const[unlockedIds,setUnlockedIds]=useState({});
  const[pwInput,setPwInput]=useState('');const[pwTarget,setPwTarget]=useState(null);const[pwError,setPwError]=useState(false);
  const[combatOpen,setCombatOpen]=useState(false);
  const[enemies,setEnemies]=useState([]);
  const [artefatosUnlockedState, setArtefatosUnlockedState] = useState({});
  const [artefatosHabsState, setArtefatosHabsState] = useState({});
  const saveTimeout=useRef({});

  useEffect(()=>{
    const u1=onSnapshot(collection(db,'sheets'),snap=>{const data=snap.docs.map(d=>({id:d.id,...d.data()}));setSheets(data);setLoaded(true);});
    const u2=onSnapshot(doc(db,'config','customAbilities'),snap=>{if(snap.exists())setCustomAbilities(snap.data()||{});});
    const u3=onSnapshot(collection(db,'enemies'),snap=>{setEnemies(snap.docs.map(d=>({id:d.id,...d.data()})));});
    const u4=onSnapshot(doc(db,'config','artefatos'),snap=>{if(snap.exists())setArtefatosUnlockedState(snap.data().unlocked||{});});
    const u5=onSnapshot(doc(db,'config','artefatos_habilidades'),snap=>{if(snap.exists())setArtefatosHabsState(snap.data()||{});});
    return()=>{u1();u2();u3();u4();u5();};
  },[]);

  const revealedArtefatos = ARTEFATOS_DATA.filter(a => artefatosUnlockedState[a.id]);

  const saveSheet=sheet=>{clearTimeout(saveTimeout.current[sheet.id]);saveTimeout.current[sheet.id]=setTimeout(async()=>{try{await setDoc(doc(db,'sheets',String(sheet.id)),sheet);}catch(e){console.error('Erro ao salvar ficha:',e);}},900);};
  const add=()=>{if(sheets.length>=15)return;const s=newSheet(Date.now());setDoc(doc(db,'sheets',String(s.id)),s);setActiveId(String(s.id));setUnlockedIds(prev=>({...prev,[String(s.id)]:true}));};
  const upd=(id,data)=>{if(data===null){deleteDoc(doc(db,'sheets',String(id)));setActiveId(null);return;}setSheets(prev=>prev.map(s=>s.id===id?data:s));saveSheet(data);};
  const saveCustom=async(data)=>{try{await setDoc(doc(db,'config','customAbilities'),data);setCustomAbilities(data);}catch(e){console.error('Erro ao salvar habilidades:',e);}};

  const handleTabClick = (s) => {
    const sid = String(s.id);
    if (activeId === sid) { setActiveId(null); return; }
    if (masterMode || !s.senha || unlockedIds[sid]) { setActiveId(sid); return; }
    setPwTarget(sid); setPwInput(''); setPwError(false);
  };

  const tryPassword = () => {
    const s = sheets.find(x => String(x.id) === pwTarget);
    if (s && pwInput === s.senha) {
      setUnlockedIds(prev=>({...prev,[pwTarget]:true}));
      setActiveId(pwTarget);
      setPwTarget(null); setPwInput('');
    } else {
      setPwError(true); setPwInput('');
      setTimeout(()=>setPwError(false),600);
    }
  };

  const activeSheet=sheets.find(s=>String(s.id)===activeId);
  return(
    <div style={{maxWidth:820,margin:'0 auto',padding:'24px 14px 80px'}}>
      <div style={{textAlign:'center',marginBottom:20}}>
        <div style={{fontSize:11,letterSpacing:'0.4em',color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:10,textTransform:'uppercase'}}>Os Portadores do Destino</div>
        <h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:22,color:'#E8D8C0',fontWeight:700,margin:0}}>Fichas dos Personagens</h2>
        <div style={{fontSize:11,color:'#4A4050',marginTop:6,fontFamily:'Cinzel,serif'}}>✦ Selecione uma ficha · Sincronizado em tempo real</div>
        <div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(30,200,255,0.6),transparent)',margin:'12px auto 0'}}/>
      </div>
      {!loaded&&<div style={{textAlign:'center',color:'#5A5070',fontFamily:'Cinzel,serif',fontSize:13,padding:40}}>Conectando ao cosmos...</div>}
      {combatOpen && <CombatMode sheets={sheets} enemies={enemies} onClose={()=>setCombatOpen(false)} masterMode={masterMode}/>}
      {pwTarget && (
        <div style={{position:'fixed',inset:0,zIndex:9980,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(6px)'}} onClick={()=>setPwTarget(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:'rgba(10,12,28,0.98)',border:'1px solid rgba(168,85,247,0.4)',borderRadius:16,padding:28,width:300,textAlign:'center',boxShadow:'0 10px 40px rgba(0,0,0,0.8)'}}>
            <div style={{fontSize:32,marginBottom:12}}>🔒</div>
            <div style={{fontFamily:'Cinzel Decorative,serif',fontSize:16,color:'#C8A8E8',marginBottom:6}}>Ficha Protegida</div>
            <div style={{fontSize:12,color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:18}}>Digite a senha para acessar esta ficha.</div>
            <input type="password" value={pwInput} onChange={e=>setPwInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&tryPassword()} placeholder="Senha..." autoFocus style={{width:'100%',textAlign:'center',marginBottom:12,fontSize:16,border:`1px solid ${pwError?'rgba(232,25,60,0.7)':'rgba(168,85,247,0.4)'}`,transition:'border-color 0.3s'}}/>
            {pwError&&<div style={{fontSize:12,color:'#E8193C',fontFamily:'Cinzel,serif',marginBottom:10}}>Senha incorreta.</div>}
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setPwTarget(null)} style={{flex:1,padding:'9px',borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'#5A5070',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12}}>Cancelar</button>
              <button onClick={tryPassword} style={{flex:1,padding:'9px',borderRadius:8,border:'1px solid rgba(168,85,247,0.5)',background:'rgba(168,85,247,0.12)',color:'#C8A8E8',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12,fontWeight:600}}>Entrar</button>
            </div>
          </div>
        </div>
      )}
      {loaded&&(<>
        <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center',flexWrap:'wrap'}}>
          <div className="sheet-tabs-nav" style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:2,flex:1}}>
            {sheets.map(s=>{
              const cls=CLASSES.find(c=>c.id===s.classe)||CLASSES[0];
              const sc=SHEET_COLORS[s.classe]||cls.color;
              const isActive=String(s.id)===activeId;
              const hasPts=(s.attrPoints||0)>0;
              const locked=!masterMode&&s.senha&&!unlockedIds[String(s.id)];
              const noSenha = masterMode && !s.senha;
              const hasCooldown = masterMode && Object.values(s.cooldowns||{}).some(v=>v>0);
              return(<button key={s.id} onClick={()=>handleTabClick(s)} style={{display:'flex',alignItems:'center',gap:7,padding:'8px 14px',borderRadius:10,border:`1px solid ${isActive?sc+'66':sc+'28'}`,background:isActive?`${sc}15`:'rgba(255,255,255,0.02)',cursor:'pointer',transition:'all 0.2s',flexShrink:0,whiteSpace:'nowrap',position:'relative'}}>
                {s.foto?<img src={s.foto} alt="" style={{width:30,height:30,borderRadius:6,objectFit:'cover',border:`1.5px solid ${sc}44`,filter:locked?'grayscale(60%)':'none'}}/>:<div style={{width:30,height:30,borderRadius:6,background:`${sc}15`,border:`1.5px dashed ${sc}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>{locked?'🔒':cls.icon}</div>}
                <div style={{textAlign:'left'}}>
                  <div style={{fontFamily:'Cinzel,serif',fontSize:12,fontWeight:700,color:isActive?sc:'#8A7A8A'}}>{s.nome||'Sem nome'}</div>
                  <div style={{fontSize:10,color:'#5A5070',fontFamily:'Cinzel,serif'}}>Nv {s.nivel||1}{locked?' · 🔒':''}</div>
                </div>
                {(hasPts||noSenha||hasCooldown)&&(
                  <div style={{position:'absolute',top:4,right:4,display:'flex',flexDirection:'column',gap:3}}>
                    {hasPts&&<span title={`${s.attrPoints} ponto(s) de atributo pendente(s)`} style={{width:8,height:8,borderRadius:'50%',background:'#A855F7',boxShadow:'0 0 6px #A855F7',animation:'pulse 1.5s ease-in-out infinite'}}/>}
                    {noSenha&&<span title="Sem senha definida" style={{width:8,height:8,borderRadius:'50%',background:'#E8A020',boxShadow:'0 0 6px #E8A020',animation:'pulse 1.5s ease-in-out infinite'}}/>}
                    {hasCooldown&&<span title="Habilidade(s) em cooldown" style={{width:8,height:8,borderRadius:'50%',background:'#E86420',boxShadow:'0 0 6px #E86420',animation:'pulse 1.5s ease-in-out infinite'}}/>}
                  </div>
                )}
              </button>);
            })}
            {sheets.length<15&&(<button onClick={add} style={{padding:'8px 16px',borderRadius:10,border:'1px dashed rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.01)',color:'#6A5A7A',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:'0.06em',flexShrink:0,transition:'border-color 0.2s'}}>+ Novo Personagem</button>)}
          </div>
          {masterMode && (
            <button onClick={()=>setCombatOpen(true)} title="Modo Combate" style={{ padding:'8px 14px',borderRadius:10,border:'1px solid rgba(232,25,60,0.35)', background:'rgba(232,25,60,0.08)',color:'#E8193C',cursor:'pointer', fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:'0.06em',flexShrink:0, display:'flex',alignItems:'center',gap:6 }}>⚔️ Combate</button>
          )}
        </div>
        {activeSheet
          ?<SheetFull
              sheet={activeSheet}
              onChange={d=>upd(activeSheet.id,d)}
              masterMode={masterMode}
              customAbilities={customAbilities[activeSheet.id] || []}
              onSaveCustomAbilities={(novas) => saveCustom({ ...customAbilities, [activeSheet.id]: novas })}
              revealedArtefatos={revealedArtefatos}
              artefatosHabs={artefatosHabsState}
            />
          :<div style={{textAlign:'center',padding:44,border:'1px dashed rgba(255,255,255,0.06)',borderRadius:14}}><div style={{fontSize:32,marginBottom:10,opacity:0.2}}>📋</div><div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#6A5A7A'}}>Selecione um personagem acima para ver sua ficha.</div></div>
        }
      </>)}
    </div>
  );
}

const ENEMY_COLOR='#FF4444';
const ENEMY_GLOW='rgba(255,68,68,0.18)';
const newEnemySkill=()=>({id:Date.now()+Math.random(),nome:'',descricao:'',dano:'',custo:0,cooldown:'—',tipoHab:'normal'});
const newEnemy=id=>({id,nome:'',tipo:'',hp:10,hp_bonus:0,vigos:10,alcance:'',forca:0,agilidade:0,durabilidade:0,inteligencia:0,percepcao:0,sorte:0,foto:'',habilidades:[newEnemySkill()],notas:'',status:{}});

function EnemyHabilidadesPanel({ enemy, onChange }) {
  const habilidades = enemy.habilidades || [];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(newEnemySkill());
  const [enemyCooldowns, setEnemyCooldowns] = useState({});
  const handleSpendVC = (cost) => {
  onChange({ ...enemy, vigos: Math.max(0, (enemy.vigos || 0) - cost) });
};
  const color = ENEMY_COLOR;
  const tipoLabel = { normal: 'Normal', especial: 'Especial', passiva: 'Passiva' };
  const tipoBadgeColor = { normal: 'rgba(255,255,255,0.5)', especial: color, passiva: 'rgba(168,85,247,0.8)' };

  const handleSave = () => {
    if (!form.nome.trim()) return;
    onChange({ ...enemy, habilidades: [...habilidades, { ...form, id: Date.now() }] });
    setForm(newEnemySkill());
  };
  const handleDelete = (id) => { onChange({ ...enemy, habilidades: habilidades.filter(h => h.id !== id) }); };
  const handleUpdateCooldown = (abilityId, turns) => { setEnemyCooldowns(prev => ({ ...prev, [abilityId]: turns })); };

  const TipoBtn = ({ val, label: l }) => (
    <button onClick={() => setForm(f => ({ ...f, tipoHab: val }))} style={{ flex: 1, padding: '5px 4px', borderRadius: 5, border: `1px solid ${form.tipoHab === val ? color + '66' : 'rgba(255,255,255,0.1)'}`, background: form.tipoHab === val ? `${color}18` : 'rgba(255,255,255,0.02)', color: form.tipoHab === val ? color : '#6A5A7A', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 10, letterSpacing: '0.06em', transition: 'all 0.15s' }}>{l}</button>
  );

  const abilityRow = (h) => {
    const isPassiva = h.tipoHab === 'passiva';
    const isEspecial = h.tipoHab === 'especial';
    const cdText = h.cooldown || '—';
    const hasCd = cdText && cdText !== '—';
    const cdVal = enemyCooldowns[String(h.id)] || 0;
    return (
      <div key={h.id} style={{ background: isEspecial ? `${color}09` : 'rgba(255,255,255,0.02)', border: `1px solid ${isEspecial ? color + '22' : 'rgba(255,100,100,0.1)'}`, borderRadius: 8, padding: '9px 12px', display: 'flex', gap: 10, alignItems: 'flex-start', position: 'relative' }}>
        {cdVal > 0 && !isPassiva && <div style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'rgba(232,100,0,0.06)', border: '1px solid rgba(232,100,0,0.25)', pointerEvents: 'none' }} />}
        <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
            {isEspecial && <span style={{ fontSize: 10, color }}>✦</span>}
            <span style={{ fontFamily: 'Cinzel,serif', fontSize: 12, color: '#C8B8A0', fontWeight: 600 }}>{h.nome || '(sem nome)'}</span>
            {h.tipoHab && <span style={{ fontSize: 8, color: tipoBadgeColor[h.tipoHab] || color, fontFamily: 'Cinzel,serif', letterSpacing: '0.12em', background: `${color}14`, borderRadius: 3, padding: '1px 5px', border: `1px solid ${color}33` }}>{(tipoLabel[h.tipoHab] || 'Normal').toUpperCase()}</span>}
            {h.dano && <span style={{ fontSize: 10, color: 'rgba(255,200,80,0.85)', fontFamily: 'Cinzel,serif', background: 'rgba(255,200,80,0.08)', border: '1px solid rgba(255,200,80,0.22)', borderRadius: 4, padding: '1px 6px' }}>⚔ {h.dano}</span>}
          </div>
          {h.descricao && <div style={{ fontSize: 13, color: '#7A6A5A', lineHeight: 1.65 }}>{h.descricao}</div>}
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, color: `${color}BB`, fontFamily: 'Cinzel,serif' }}>{h.custo || 0} VC</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>⏱ {cdText}</div>
          {!isPassiva && (
  <CooldownBadge
    abilityId={String(h.id)}
    cooldownText={cdText}
    sheetCooldowns={enemyCooldowns}
    onUpdate={handleUpdateCooldown}
    abilityCost={Number(h.custo || 0)}
    currentVigos={enemy.vigos ?? 0}
    onSpendVC={handleSpendVC}
  />
)}
          <button onClick={() => handleDelete(h.id)} style={{ background: 'rgba(232,25,60,0.1)', border: '1px solid rgba(232,25,60,0.25)', color: '#E8193C', borderRadius: 4, cursor: 'pointer', padding: '1px 6px', fontSize: 10 }}>✕</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: 14, border: `1px solid ${open ? color + '33' : 'rgba(255,100,100,0.1)'}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, background: open ? `${color}08` : 'rgba(255,255,255,0.02)', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 15, color }}>⚔️</span>
        <span style={{ fontFamily: 'Cinzel,serif', fontSize: 13, color: '#C8B8A0', fontWeight: 600, flex: 1 }}>Habilidades & Ataques</span>
        <span style={{ fontSize: 10, color: `${color}66`, fontFamily: 'Cinzel,serif' }}>{habilidades.length > 0 ? `${habilidades.length} habilidade${habilidades.length > 1 ? 's' : ''}` : ''}</span>
        <span style={{ color: `${color}88`, fontSize: 11, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s' }}>▶</span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          <div style={{ height: 8 }} />
          {habilidades.length === 0 && <div style={{ padding: 14, borderRadius: 10, border: '1px dashed rgba(255,255,255,0.08)', color: '#6A4A4A', textAlign: 'center', fontFamily: 'Cinzel,serif', fontSize: 11, marginBottom: 10 }}>Nenhuma habilidade cadastrada.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: habilidades.length > 0 ? 12 : 0 }}>{habilidades.map(h => abilityRow(h))}</div>
          <div style={{ border: `1px solid ${color}30`, borderRadius: 10, padding: '14px', background: `${color}05` }}>
            <div style={{ fontSize: 9, letterSpacing: '0.35em', color: `${color}AA`, fontFamily: 'Cinzel,serif', marginBottom: 12, textTransform: 'uppercase' }}>✦ Adicionar Habilidade</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div><label style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cinzel,serif', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.22em' }}>Nome</label><input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Garra Sombria" style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cinzel,serif', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.22em' }}>Tipo</label><div style={{ display: 'flex', gap: 6 }}><TipoBtn val="normal" label="Normal" /><TipoBtn val="especial" label="Especial" /><TipoBtn val="passiva" label="Passiva" /></div></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><label style={{ fontSize: 9, color: 'rgba(255,200,80,0.5)', fontFamily: 'Cinzel,serif', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.22em' }}>Dano / Efeito</label><input value={form.dano} onChange={e => setForm(f => ({ ...f, dano: e.target.value }))} placeholder="Ex: 1D8+2" style={{ width: '100%' }} /></div>
                <div><label style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cinzel,serif', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.22em' }}>Custo VC</label><input type="number" min={0} value={form.custo} onChange={e => setForm(f => ({ ...f, custo: +e.target.value }))} style={{ width: '100%' }} /></div>
              </div>
              <div><label style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cinzel,serif', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.22em' }}>Cooldown</label><input value={form.cooldown} onChange={e => setForm(f => ({ ...f, cooldown: e.target.value }))} placeholder="Ex: 3 rodadas" style={{ width: '100%' }} /></div>
              <div><label style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cinzel,serif', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.22em' }}>Descrição</label><textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Efeito, alcance, condições..." rows={3} style={{ width: '100%', resize: 'vertical', lineHeight: 1.7 }} /></div>
              <button onClick={handleSave} disabled={!form.nome.trim()} style={{ padding: '8px', borderRadius: 7, border: `1px solid ${color}55`, background: form.nome.trim() ? `${color}20` : 'rgba(255,255,255,0.03)', color: form.nome.trim() ? color : '#5A5070', cursor: form.nome.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Cinzel,serif', fontSize: 12, letterSpacing: '0.1em', fontWeight: 600, transition: 'all 0.2s' }}>✦ Salvar Habilidade</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function EnemyCard({enemy,onChange,onDelete,masterMode,revealedArtefatos,artefatosHabs}){
  const f=(k,v)=>onChange({...enemy,[k]:v});
  const hp=enemy.hp||0;const hpBonus=enemy.hp_bonus||0;
  const hpBarPct=Math.min(100,(hp/Math.max(50,hp))*100);
  const hpBonusBarPct=Math.min(100,(hpBonus/Math.max(20,hpBonus))*100);
  const photoRef=useRef(null);
  const handlePhoto=async e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=async ev=>{const c=await compressImage(ev.target.result,800,800,0.72);f('foto',c);};reader.readAsDataURL(file);};
  const attrBonus=val=>Math.floor(val/2);
  return(
    <div style={{border:`1px solid ${ENEMY_COLOR}44`,borderRadius:14,overflow:'hidden',background:'rgba(12,6,6,0.95)',marginBottom:18,boxShadow:`0 4px 24px ${ENEMY_GLOW}`}}>
      <div style={{height:3,background:`linear-gradient(90deg,${ENEMY_COLOR},transparent)`}}/>
<div onClick={()=>photoRef.current?.click()} style={{position:'relative',width:'100%',cursor:'pointer',background:'#04060F',overflow:'hidden',minHeight:enemy.foto?0:130}}>
  {enemy.foto
    ?<img src={enemy.foto} alt="inimigo" style={{width:'100%',display:'block',objectFit:'contain',background:'#04060F'}}/>
    :<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'36px 20px',gap:10}}>
      <div style={{fontSize:40,opacity:0.15}}>📷</div>
      <div style={{fontSize:12,color:'rgba(255,255,255,0.18)',fontFamily:'Cinzel,serif',letterSpacing:'0.08em',textAlign:'center'}}>Toque para adicionar a foto do inimigo</div>
    </div>
  }
  {enemy.foto&&<div style={{position:'absolute',bottom:0,left:0,right:0,height:'30%',background:'linear-gradient(to bottom,transparent,rgba(12,6,6,0.95))',pointerEvents:'none'}}/>}
  {enemy.foto&&<div style={{position:'absolute',bottom:16,left:20,right:20}}>
    <div style={{fontFamily:'Cinzel Decorative,serif',fontSize:22,fontWeight:700,color:ENEMY_COLOR,textShadow:`0 0 24px rgba(255,68,68,0.5)`}}>{enemy.nome||''}</div>
    {enemy.tipo&&<div style={{fontSize:12,color:'rgba(255,100,100,0.55)',marginTop:4,fontFamily:'Cinzel,serif'}}>{enemy.tipo}</div>}
  </div>}
  <input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}}/>
</div>
      <div style={{padding:'16px 18px'}}>
        <div style={{display:'flex',gap:10,alignItems:'flex-end',marginBottom:16,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:130}}><label style={{fontSize:10,letterSpacing:'0.3em',color:'#7A4040',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Nome do Inimigo</label><input value={enemy.nome} onChange={e=>f('nome',e.target.value)} placeholder="Nome do inimigo..." style={{width:'100%'}}/></div>
          <div style={{flex:1,minWidth:110}}><label style={{fontSize:10,letterSpacing:'0.3em',color:'#7A4040',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Tipo / Origem</label><input value={enemy.tipo} onChange={e=>f('tipo',e.target.value)} placeholder="Ex: Humano, Entidade..." style={{width:'100%'}}/></div>
          {masterMode&&<button onClick={onDelete} style={{background:'rgba(232,25,60,0.1)',border:'1px solid rgba(232,25,60,0.3)',color:'#E8193C',borderRadius:6,cursor:'pointer',padding:'6px 11px',fontSize:12}}>✕</button>}
        </div>
        <div className="enemy-stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:9,marginBottom:16}}>
          
          <div style={{gridColumn:'1 / -1', background:'rgba(232,25,60,0.06)', border:'1px solid rgba(232,25,60,0.18)', borderRadius:14, padding:'20px 18px'}}>
  <div style={{fontSize:10,letterSpacing:'0.3em',color:'#E8193C',fontFamily:'Cinzel,serif',marginBottom:16,textTransform:'uppercase',textAlign:'center'}}>
    ❤️ Pontos de Vida
  </div>

  {/* Número grande com glow dinâmico */}
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:20,marginBottom:16}}>
    <button onClick={()=>f('hp',Math.max(0,hp-1))} style={{width:44,height:44,borderRadius:10,border:'1px solid rgba(232,25,60,0.45)',background:'rgba(232,25,60,0.18)',color:'#E8193C',cursor:'pointer',fontSize:26,lineHeight:1,padding:0,transition:'all 0.15s'}}>−</button>
    <div style={{textAlign:'center',minWidth:80}}>
      <div style={{fontFamily:'Cinzel,serif',fontSize:52,fontWeight:900,lineHeight:1,color:hpColor(hp,30),textShadow:`0 0 28px ${hpColor(hp,30)}88, 0 0 6px ${hpColor(hp,30)}44`,transition:'color 0.4s, text-shadow 0.4s'}}>{hp}</div>
      <div style={{fontSize:11,color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginTop:4,letterSpacing:'0.08em'}}>{Math.round(Math.min(100,(hp/Math.max(1,hp+hpBonus))*100))}% de vida</div>
    </div>
    <button onClick={()=>f('hp',hp+1)} style={{width:44,height:44,borderRadius:10,border:'1px solid rgba(74,222,128,0.45)',background:'rgba(74,222,128,0.18)',color:'#4ADE80',cursor:'pointer',fontSize:26,lineHeight:1,padding:0,transition:'all 0.15s'}}>+</button>
  </div>

  {/* Barra de vida com gradiente de cor */}
  <div style={{height:8,background:'rgba(255,255,255,0.06)',borderRadius:6,marginBottom:14,overflow:'hidden'}}>
    <div style={{height:'100%',width:`${Math.min(100,(hp/Math.max(1,hp+hpBonus))*100)}%`,background:`linear-gradient(90deg,${hpColor(hp,30)},${hpColor(hp,30)}99)`,borderRadius:6,transition:'width 0.4s ease, background 0.4s ease',boxShadow:`0 0 8px ${hpColor(hp,30)}66`}}/>
  </div>

  {/* Botões de dano/cura em massa */}
  <div style={{display:'flex',gap:5,flexWrap:'wrap',justifyContent:'center',marginBottom:14}}>
    {[-15,-10,-5].map(v=>(
      <button key={v} onClick={()=>f('hp',Math.max(0,hp+v))} style={{padding:'5px 10px',borderRadius:7,border:'1px solid rgba(232,25,60,0.3)',background:'rgba(232,25,60,0.1)',color:'#E8193C',cursor:'pointer',fontSize:12,fontWeight:'bold',letterSpacing:'0.04em'}}>{v}</button>
    ))}
    <div style={{width:10}}/>
    {[+5,+10,+15].map(v=>(
      <button key={v} onClick={()=>f('hp',hp+v)} style={{padding:'5px 10px',borderRadius:7,border:'1px solid rgba(74,222,128,0.3)',background:'rgba(74,222,128,0.1)',color:'#4ADE80',cursor:'pointer',fontSize:12,fontWeight:'bold',letterSpacing:'0.04em'}}>+{v}</button>
    ))}
  </div>

  {/* Vida Bônus */}
  <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:14,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
    <div style={{fontSize:9,letterSpacing:'0.25em',color:'rgba(74,222,128,0.6)',fontFamily:'Cinzel,serif',textTransform:'uppercase'}}>🛡 Vida Bônus</div>
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <button onClick={()=>f('hp_bonus',Math.max(0,hpBonus-1))} style={{width:26,height:26,borderRadius:6,border:'1px solid rgba(74,222,128,0.28)',background:'rgba(74,222,128,0.07)',color:'#4ADE80',cursor:'pointer',fontSize:16,lineHeight:1,padding:0}}>−</button>
      <span style={{fontFamily:'Cinzel,serif',fontSize:20,fontWeight:700,color:'#4ADE80',minWidth:28,textAlign:'center'}}>{hpBonus}</span>
      <button onClick={()=>f('hp_bonus',hpBonus+1)} style={{width:26,height:26,borderRadius:6,border:'1px solid rgba(74,222,128,0.28)',background:'rgba(74,222,128,0.07)',color:'#4ADE80',cursor:'pointer',fontSize:16,lineHeight:1,padding:0}}>+</button>
    </div>
  </div>
</div>
          
          <div style={{background:`${ENEMY_COLOR}09`,border:`1px solid ${ENEMY_COLOR}28`,borderRadius:10,padding:'12px 14px'}}>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:ENEMY_COLOR,fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Vigor Cósmico</div>
            <VigosDots value={enemy.vigos||0} max={10} color={ENEMY_COLOR} onChange={v=>f('vigos',v)}/>
          </div>
          <div style={{background:`${ENEMY_COLOR}07`,border:`1px solid ${ENEMY_COLOR}22`,borderRadius:10,padding:'12px 14px'}}>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:ENEMY_COLOR,fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Alcance</div>
            <input value={enemy.alcance||''} onChange={e=>f('alcance',e.target.value)} placeholder="Ex: 2m, 10m..." style={{width:'100%'}}/>
          </div>
        </div>
        <StatusPanel sheet={enemy} onChange={onChange}/>
        <div style={{marginBottom:15}}>
          <div style={{fontSize:10,letterSpacing:'0.3em',color:'#7A4040',fontFamily:'Cinzel,serif',marginBottom:9,textTransform:'uppercase'}}>Atributos</div>
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            {ATTRS.map(a=>{const bonus=attrBonus(enemy[a.key]||0);return(<div key={a.key} style={{display:'flex',alignItems:'center',gap:8}}><span className="attr-label" style={{fontSize:11,fontFamily:'Cinzel,serif',color:a.color,minWidth:92}}>{a.label}</span><AttrDots value={enemy[a.key]||0} color={a.color} onChange={v=>f(a.key,v)} masterMode={true}/><span style={{fontSize:11,color:'rgba(255,255,255,0.22)',minWidth:16,textAlign:'right'}}>{enemy[a.key]||0}</span><span style={{fontSize:11,fontFamily:'Cinzel,serif',fontWeight:700,color:bonus>0?a.color:'rgba(255,255,255,0.12)',minWidth:26,textAlign:'center'}}>{bonus>0?`+${bonus}`:'—'}</span></div>);})}
          </div>
        </div>
        <EnemyHabilidadesPanel enemy={enemy} onChange={onChange}/>
        <div style={{height:1,background:'rgba(255,255,255,0.05)',marginBottom:14,marginTop:14}}/>
<ArtefatoFichaPanel
  sheet={enemy}
  onChange={onChange}
  sheetColor={ENEMY_COLOR}
  revealedArtefatos={revealedArtefatos||[]}
  artefatosHabs={artefatosHabs||{}}
/>
        <div><div style={{fontSize:10,letterSpacing:'0.3em',color:'#7A4040',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Notas do Mestre</div><textarea value={enemy.notas||''} onChange={e=>f('notas',e.target.value)} placeholder="Motivações, fraquezas, itens dropados..." rows={3} style={{width:'100%',resize:'vertical'}}/></div>
      </div>
    </div>
  );
}
const newNPC = id => ({ id, nome: '', foto: '', genero: '', idade: '', descricao: '' });

function NPCCard({ npc, onChange, onDelete, masterMode }) {
  const f = (k, v) => onChange({ ...npc, [k]: v });
  const photoRef = useRef(null);
  const handlePhoto = async e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => { const c = await compressImage(ev.target.result, 900, 900, 0.75); f('foto', c); };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ border: '1px solid rgba(168,85,247,0.28)', borderRadius: 14, overflow: 'hidden', background: 'rgba(8,10,22,0.95)', marginBottom: 16, boxShadow: '0 4px 28px rgba(168,85,247,0.07)' }}>
      <div style={{ height: 3, background: 'linear-gradient(90deg,#A855F7,#A855F722,transparent)' }} />

      <div onClick={() => masterMode && photoRef.current?.click()} style={{ position: 'relative', width: '100%', cursor: masterMode ? 'pointer' : 'default', background: 'rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        {npc.foto
          ? <img src={npc.foto} alt={npc.nome} style={{ width: '100%', maxHeight: 360, objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
          : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '28px', opacity: 0.3 }}>
              <span style={{ fontSize: 24 }}>👤</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Cinzel,serif' }}>{masterMode ? 'Toque para adicionar foto' : 'Sem foto disponível'}</span>
            </div>
        }
        {npc.foto && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(8,10,22,0.92))', pointerEvents: 'none' }} />}
        {npc.foto && (
          <div style={{ position: 'absolute', bottom: 14, left: 18 }}>
            <div style={{ fontFamily: 'Cinzel,serif', fontSize: 19, fontWeight: 700, color: '#C8A8E8', textShadow: '0 0 20px rgba(168,85,247,0.7)' }}>{npc.nome || '—'}</div>
            {(npc.genero || npc.idade) && (
              <div style={{ fontSize: 12, color: 'rgba(200,168,232,0.65)', marginTop: 3, fontFamily: 'Cinzel,serif' }}>
                {[npc.genero, npc.idade && `${npc.idade} anos`].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        )}
        {masterMode && <input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />}
      </div>

      <div style={{ padding: '16px 18px' }}>
        {masterMode ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 80px', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 10, letterSpacing: '0.3em', color: '#7A5A8A', fontFamily: 'Cinzel,serif', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Nome</label>
                <input value={npc.nome} onChange={e => f('nome', e.target.value)} placeholder="Nome do personagem..." style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, letterSpacing: '0.3em', color: '#7A5A8A', fontFamily: 'Cinzel,serif', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Gênero</label>
                <select value={npc.genero} onChange={e => f('genero', e.target.value)} style={{ width: '100%' }}>
                  <option value="">—</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Não-binário">Não-binário</option>
                  <option value="Desconhecido">Desconhecido</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, letterSpacing: '0.3em', color: '#7A5A8A', fontFamily: 'Cinzel,serif', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Idade</label>
                <input value={npc.idade} onChange={e => f('idade', e.target.value)} placeholder="Ex: 34" style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, letterSpacing: '0.3em', color: '#7A5A8A', fontFamily: 'Cinzel,serif', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Descrição</label>
              <textarea value={npc.descricao} onChange={e => f('descricao', e.target.value)} placeholder="Papel na história, personalidade, motivações..." rows={4} style={{ width: '100%', resize: 'vertical', lineHeight: 1.8 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onDelete} style={{ background: 'rgba(232,25,60,0.08)', border: '1px solid rgba(232,25,60,0.28)', color: '#E8193C', borderRadius: 6, cursor: 'pointer', padding: '5px 14px', fontSize: 11, fontFamily: 'Cinzel,serif' }}>✕ Remover</button>
            </div>
          </>
        ) : (
          <>
            {!npc.foto && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontFamily: 'Cinzel,serif', fontSize: 17, fontWeight: 700, color: '#C8A8E8', marginBottom: 4 }}>{npc.nome || 'Desconhecido'}</div>
                {(npc.genero || npc.idade) && (
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {npc.genero && <span style={{ fontSize: 11, color: '#A855F7', fontFamily: 'Cinzel,serif', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.22)', borderRadius: 12, padding: '3px 10px' }}>{npc.genero}</span>}
                    {npc.idade && <span style={{ fontSize: 11, color: '#C8B8A0', fontFamily: 'Cinzel,serif', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '3px 10px' }}>{npc.idade} anos</span>}
                  </div>
                )}
              </div>
            )}
            {npc.foto && (npc.genero || npc.idade) && (
              <div style={{ display: 'flex', gap: 7, marginBottom: 10, flexWrap: 'wrap' }}>
                {npc.genero && <span style={{ fontSize: 11, color: '#A855F7', fontFamily: 'Cinzel,serif', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.22)', borderRadius: 12, padding: '3px 10px' }}>{npc.genero}</span>}
                {npc.idade && <span style={{ fontSize: 11, color: '#C8B8A0', fontFamily: 'Cinzel,serif', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '3px 10px' }}>{npc.idade} anos</span>}
              </div>
            )}
            {npc.descricao
              ? <div style={{ fontSize: 14, color: '#9A8A7A', lineHeight: 1.85, fontStyle: 'italic', whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>{npc.descricao}</div>
              : <div style={{ fontSize: 13, color: '#4A4050', fontStyle: 'italic', fontFamily: 'Cinzel,serif' }}>Nenhuma descrição disponível.</div>
            }
          </>
        )}
      </div>
    </div>
  );
}

function PersonagensSection({ masterMode }) {
  const [npcs, setNpcs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'npcs'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => b.id - a.id);
      setNpcs(data);
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  const save = npc => {
    clearTimeout(saveTimeout.current[npc.id]);
    saveTimeout.current[npc.id] = setTimeout(async () => {
      try { await setDoc(doc(db, 'npcs', String(npc.id)), npc); } catch (e) { console.error(e); }
    }, 800);
  };

  const add = () => { const n = newNPC(Date.now()); setDoc(doc(db, 'npcs', String(n.id)), n); };
  const upd = (id, data) => { setNpcs(prev => prev.map(n => n.id === id ? data : n)); save(data); };
  const del = async id => { await deleteDoc(doc(db, 'npcs', String(id))); };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.4em', color: '#7B5A9A', fontFamily: 'Cinzel,serif', marginBottom: 13, textTransform: 'uppercase' }}>Os Habitantes de Cosmum</div>
        <h2 style={{ fontFamily: 'Cinzel Decorative,serif', fontSize: 23, color: '#E8D8C0', fontWeight: 700, margin: 0 }}>Personagens</h2>
        <div style={{ fontSize: 12, color: '#4A4050', marginTop: 9, fontFamily: 'Cinzel,serif' }}>Personagens encontrados ao longo da jornada</div>
        <div style={{ width: 60, height: 1, background: 'linear-gradient(90deg,transparent,rgba(168,85,247,0.6),transparent)', margin: '16px auto 0' }} />
      </div>
      {!loaded && <div style={{ textAlign: 'center', color: '#5A5070', fontFamily: 'Cinzel,serif', fontSize: 13, padding: 40 }}>Conectando ao cosmos...</div>}
      {loaded && masterMode && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
          <button onClick={add} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.1)', color: '#C8A8E8', cursor: 'pointer', fontFamily: 'Cinzel,serif', fontSize: 12, letterSpacing: '0.08em' }}>+ Adicionar Personagem</button>
        </div>
      )}
      {loaded && npcs.length === 0 && (
        <div style={{ textAlign: 'center', padding: 44, border: '1px dashed rgba(168,85,247,0.15)', borderRadius: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.25 }}>👤</div>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 13, color: '#6A5A7A' }}>
            {masterMode ? 'Clique em "+ Adicionar Personagem" para começar.' : 'Nenhum personagem registrado ainda.'}
          </div>
        </div>
      )}
      {npcs.map(npc => (
        <NPCCard key={npc.id} npc={npc} onChange={d => upd(npc.id, d)} onDelete={() => del(npc.id)} masterMode={masterMode} />
      ))}
    </div>
  );
}
function EnemiesSection({masterMode}){
  if(!masterMode) return <RestrictedAccess title="Acesso Restrito ao Mestre" text="As fichas dos inimigos estão ocultas nas sombras. Apenas o mestre possui este conhecimento." />;
  const[enemies,setEnemies]=useState([]);
  const[loaded,setLoaded]=useState(false);
  const[artefatosUnlockedState,setArtefatosUnlockedState]=useState({});
  const[artefatosHabsState,setArtefatosHabsState]=useState({});
  const saveTimeout=useRef({});

  useEffect(()=>{
    const u1=onSnapshot(collection(db,'enemies'),snap=>{
      const data=snap.docs.map(d=>({id:d.id,...d.data()}));
      setEnemies(data);setLoaded(true);
    });
    const u2=onSnapshot(doc(db,'config','artefatos'),snap=>{
      if(snap.exists())setArtefatosUnlockedState(snap.data().unlocked||{});
    });
    const u3=onSnapshot(doc(db,'config','artefatos_habilidades'),snap=>{
      if(snap.exists())setArtefatosHabsState(snap.data()||{});
    });
    return()=>{u1();u2();u3();};
  },[]);

  const revealedArtefatos = ARTEFATOS_DATA.filter(a => artefatosUnlockedState[a.id]);

  const saveEnemy=enemy=>{clearTimeout(saveTimeout.current[enemy.id]);saveTimeout.current[enemy.id]=setTimeout(async()=>{try{await setDoc(doc(db,'enemies',String(enemy.id)),enemy);}catch(e){console.error(e);}},900);};
  const add=()=>{if(enemies.length>=6)return;const e=newEnemy(Date.now());setDoc(doc(db,'enemies',String(e.id)),e);};
  const upd=(id,data)=>{setEnemies(prev=>prev.map(e=>e.id===id?data:e));saveEnemy(data);};
  const del=async id=>{await deleteDoc(doc(db,'enemies',String(id)));};

  return(
    <div style={{maxWidth:760,margin:'0 auto',padding:'40px 24px 80px'}}>
      <div style={{textAlign:'center',marginBottom:32}}>
        <div style={{fontSize:11,letterSpacing:'0.4em',color:'#7A4040',fontFamily:'Cinzel,serif',marginBottom:13,textTransform:'uppercase'}}>As Forças das Trevas</div>
        <h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:23,color:'#E8D8C0',fontWeight:700,margin:0}}>Fichas dos Inimigos</h2>
        <div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(232,68,68,0.6),transparent)',margin:'14px auto 0'}}/>
      </div>
      {!loaded&&<div style={{textAlign:'center',color:'#5A5070',fontFamily:'Cinzel,serif',fontSize:13,padding:40}}>Conectando ao cosmos...</div>}
      {loaded&&enemies.length===0&&(
        <div style={{textAlign:'center',padding:38,border:'1px dashed rgba(232,68,68,0.15)',borderRadius:12}}>
          <div style={{fontSize:30,marginBottom:10}}>⚔️</div>
          <div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#6A4A4A'}}>Nenhum inimigo registrado.</div>
        </div>
      )}
      {enemies.map(e=>
        <EnemyCard
          key={e.id}
          enemy={e}
          onChange={d=>upd(e.id,d)}
          onDelete={()=>del(e.id)}
          masterMode={masterMode}
          revealedArtefatos={revealedArtefatos}
          artefatosHabs={artefatosHabsState}
        />
      )}
      {loaded&&enemies.length<6&&masterMode&&(
        <button onClick={add} style={{width:'100%',padding:13,borderRadius:10,border:'1px dashed rgba(232,68,68,0.15)',background:'rgba(255,255,255,0.01)',color:'#7A4040',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12,letterSpacing:'0.08em'}}>
          + Adicionar Inimigo ({enemies.length}/6)
        </button>
      )}
    </div>
  );
}
const newBestiary = id => ({ id, nome: '', foto: '', descricao: '', nivelAmeaca: 'Médio' });

function BestiarioCard({ item, onChange, onDelete, masterMode }) {
  const f = (k,v) => onChange({...item, [k]:v});
  const photoRef = useRef(null);
  const handlePhoto = async e => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = async ev => { const c = await compressImage(ev.target.result, 800, 800, 0.72); f('foto', c); };
    reader.readAsDataURL(file);
  };
  const ameacaCores = {"Baixo":"#4ADE80","Médio":"#E8A020","Alto":"#E8193C","Supremo":"#A855F7","Catastrófico":"#1EC8FF"};
  const corBase = ameacaCores[item.nivelAmeaca] || "#E8A020";
  return (
    <div style={{border:`1px solid ${corBase}44`,borderRadius:14,overflow:'hidden',background:'rgba(12,6,6,0.95)',marginBottom:18}}>
      <div style={{height:3,background:`linear-gradient(90deg,${corBase},transparent)`}}/>
      <div onClick={()=>masterMode&&photoRef.current?.click()} style={{position:'relative',width:'100%',cursor:masterMode?'pointer':'default',background:'rgba(0,0,0,0.4)',overflow:'hidden'}}>
        {item.foto?<img src={item.foto} alt="monstro" style={{width:'100%',maxHeight:350,objectFit:'cover',objectPosition:'center',display:'block'}}/>:<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'30px',opacity:0.35}}><span style={{fontSize:22}}>📷</span><span style={{fontSize:11,color:'rgba(255,255,255,0.5)',fontFamily:'Cinzel,serif'}}>{masterMode?'Toque para adicionar a foto':'Nenhuma imagem catalogada'}</span></div>}
        {item.foto&&<div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 55%,rgba(12,6,6,0.9))',pointerEvents:'none'}}/>}
        {item.foto&&item.nome&&<div style={{position:'absolute',bottom:10,left:16,fontFamily:'Cinzel,serif',fontSize:18,fontWeight:700,color:corBase}}>{item.nome}</div>}
        {masterMode&&<input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}}/>}
      </div>
      <div style={{padding:'16px 18px'}}>
        <div style={{display:'flex',gap:10,alignItems:'flex-end',marginBottom:16,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:130}}>
            <label style={{fontSize:10,letterSpacing:'0.3em',color:corBase,fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Nome da Criatura</label>
            {masterMode?<input value={item.nome} onChange={e=>f('nome',e.target.value)} placeholder="Ex: Besta das Sombras..." style={{width:'100%'}}/>:<div style={{fontSize:15,color:'#E8D8C0',fontFamily:'Cinzel,serif',fontWeight:600}}>{item.nome||'Desconhecida'}</div>}
          </div>
          <div style={{width:140}}>
            <label style={{fontSize:10,letterSpacing:'0.3em',color:corBase,fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Ameaça</label>
            {masterMode?<select value={item.nivelAmeaca} onChange={e=>f('nivelAmeaca',e.target.value)} style={{width:'100%',color:corBase,fontWeight:'bold'}}><option value="Baixo">Baixo</option><option value="Médio">Médio</option><option value="Alto">Alto</option><option value="Supremo">Supremo</option><option value="Catastrófico">Catastrófico</option></select>:<div style={{fontSize:14,color:corBase,fontWeight:'bold',fontFamily:'Cinzel,serif'}}>{item.nivelAmeaca}</div>}
          </div>
          {masterMode&&<button onClick={onDelete} style={{background:'rgba(232,25,60,0.1)',border:'1px solid rgba(232,25,60,0.3)',color:'#E8193C',borderRadius:6,cursor:'pointer',padding:'6px 11px',fontSize:12}}>✕ Excluir</button>}
        </div>
        <div>
          <label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Descrição & Comportamento</label>
          {masterMode?<textarea value={item.descricao} onChange={e=>f('descricao',e.target.value)} placeholder="Descreva os hábitos, aparência e táticas..." rows={5} style={{width:'100%',resize:'vertical',lineHeight:1.7}}/>:<div style={{fontSize:14,color:'#9A8A7A',lineHeight:1.85,whiteSpace:'pre-wrap',fontStyle:'italic',background:'rgba(255,255,255,0.02)',padding:'12px',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.05)'}}>{item.descricao||'Nenhum registro sobre esta criatura.'}</div>}
        </div>
      </div>
    </div>
  );
}

function BestiarioSection({ masterMode }) {
  const [bestiario, setBestiario] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAmeaca, setFilterAmeaca] = useState('Todas');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'bestiario'), snap => {
      setBestiario(snap.docs.map(d => ({id:d.id,...d.data()}))); setLoaded(true);
    });
    return () => unsub();
  }, []);

  const saveItem = item => {
    clearTimeout(saveTimeout.current[item.id]);
    saveTimeout.current[item.id] = setTimeout(async () => {
      try { await setDoc(doc(db,'bestiario',String(item.id)),item); } catch(e) { console.error(e); }
    }, 800);
  };

  const add = () => { const item = newBestiary(Date.now()); setDoc(doc(db,'bestiario',String(item.id)),item); };
  const upd = (id, data) => { setBestiario(prev => prev.map(b => b.id===id?data:b)); saveItem(data); };
  const del = async id => { await deleteDoc(doc(db,'bestiario',String(id))); };

  const pesosAmeaca = {"Baixo":1,"Médio":2,"Alto":3,"Supremo":4,"Catastrófico":5};
  const filtered = bestiario.filter(item => {
    return (item.nome||'').toLowerCase().includes(searchTerm.toLowerCase()) && (filterAmeaca==='Todas'||item.nivelAmeaca===filterAmeaca);
  }).sort((a,b) => (pesosAmeaca[a.nivelAmeaca]||0)-(pesosAmeaca[b.nivelAmeaca]||0));

  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'40px 24px 80px'}}>
      <div style={{textAlign:'center',marginBottom:32}}>
        <div style={{fontSize:11,letterSpacing:'0.4em',color:'#E8A020',fontFamily:'Cinzel,serif',marginBottom:13,textTransform:'uppercase'}}>O Compêndio das Aberrações</div>
        <h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:23,color:'#E8D8C0',fontWeight:700,margin:0}}>Bestiário</h2>
        <div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(232,160,32,0.6),transparent)',margin:'14px auto 0'}}/>
      </div>
      {!loaded&&<div style={{textAlign:'center',color:'#5A5070',fontFamily:'Cinzel,serif',fontSize:13,padding:40}}>Abrindo o tomo...</div>}
      {loaded&&masterMode&&<div style={{display:'flex',justifyContent:'flex-end',marginBottom:18}}><button onClick={add} style={{padding:'8px 20px',borderRadius:8,border:'1px solid rgba(232,160,32,0.4)',background:'rgba(232,160,32,0.1)',color:'#E8D8C0',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12}}>+ Catalogar Criatura</button></div>}
      {loaded&&bestiario.length>0&&(
        <div style={{display:'flex',gap:12,marginBottom:24,flexWrap:'wrap',background:'rgba(255,255,255,0.02)',padding:'14px',borderRadius:'12px',border:'1px solid rgba(232,160,32,0.15)'}}>
          <div style={{flex:1,minWidth:200}}><input type="text" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Nome da criatura..." style={{width:'100%',background:'rgba(0,0,0,0.4)'}}/></div>
          <div style={{width:160,flexShrink:0}}><select value={filterAmeaca} onChange={e=>setFilterAmeaca(e.target.value)} style={{width:'100%',background:'rgba(0,0,0,0.4)'}}><option value="Todas">Todas as Ameaças</option><option value="Baixo">Baixo</option><option value="Médio">Médio</option><option value="Alto">Alto</option><option value="Supremo">Supremo</option><option value="Catastrófico">Catastrófico</option></select></div>
        </div>
      )}
      {loaded&&bestiario.length===0&&<div style={{textAlign:'center',padding:38,border:'1px dashed rgba(232,160,32,0.2)',borderRadius:12}}><div style={{fontSize:30,marginBottom:10}}>🐉</div><div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#8A7A6A'}}>Nenhuma criatura catalogada.</div></div>}
      {filtered.map(item=><BestiarioCard key={item.id} item={item} onChange={d=>upd(item.id,d)} onDelete={()=>del(item.id)} masterMode={masterMode}/>)}
    </div>
  );
}
function RulesSection(){const[open,setOpen]=useState(0);return(<div style={{maxWidth:720,margin:'0 auto',padding:'40px 24px 80px'}}><div style={{textAlign:'center',marginBottom:32}}><div style={{fontSize:11,letterSpacing:'0.4em',color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:13,textTransform:'uppercase'}}>As Leis do Cosmos</div><h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:23,color:'#E8D8C0',fontWeight:700,margin:0}}>Manual de Regras</h2><div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(232,160,32,0.6),transparent)',margin:'16px auto 0'}}/></div>{RULES_DATA.map((r,i)=>(<div key={i} style={{marginBottom:9,border:'1px solid rgba(255,255,255,0.07)',borderRadius:11,overflow:'hidden',background:'rgba(8,10,22,0.8)'}}><button onClick={()=>setOpen(open===i?-1:i)} style={{width:'100%',padding:'14px 18px',display:'flex',alignItems:'center',gap:12,background:'none',border:'none',cursor:'pointer',textAlign:'left'}}><span style={{fontSize:16}}>{r.icon}</span><span style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#C8B8A0',fontWeight:600,flex:1}}>{r.title}</span><span style={{color:'rgba(255,255,255,0.2)',transform:open===i?'rotate(90deg)':'none',transition:'transform 0.3s'}}>▶</span></button>{open===i&&(<div style={{padding:'0 18px 16px',borderTop:'1px solid rgba(255,255,255,0.05)',animation:'pageTurn 0.3s ease'}}><div style={{height:10}}/>{r.body.split('\n').map((line,j)=>{if(!line.trim())return <div key={j} style={{height:6}}/>;const isBullet=line.startsWith('•');const isHead=!isBullet&&line.length<60&&!line.includes('→')&&line.endsWith(':');return <p key={j} style={{margin:'0 0 5px',fontSize:14,lineHeight:1.8,color:isHead?'#C8B8A0':isBullet?'#9A8A7A':'#8A7A6A',fontFamily:isHead?'Cinzel,serif':'inherit',fontWeight:isHead?600:400,paddingLeft:isBullet?12:0}}>{line}</p>;})}</div>)}</div>))}</div>);}
const newMasterPage=id=>({id,titulo:'',dataAquisicao:new Date().toLocaleDateString('pt-BR'),descricao:''});
// ─── PÁGINAS DO MESTRE NO LIVRO DA MANDÍBULA ─────────────────────────────────
function MasterPagesBook({masterMode}){
  const[pages,setPages]=useState([]);const[loaded,setLoaded]=useState(false);const[open,setOpen]=useState(null);
  const saveTimeout=useRef({});
  useEffect(()=>{const unsub=onSnapshot(collection(db,'livro_pages'),snap=>{const data=snap.docs.map(d=>({id:d.id,...d.data()}));data.sort((a,b)=>b.id-a.id);setPages(data);setLoaded(true);});return()=>unsub();},[]);
  const save=p=>{clearTimeout(saveTimeout.current[p.id]);saveTimeout.current[p.id]=setTimeout(async()=>{try{await setDoc(doc(db,'livro_pages',String(p.id)),p);}catch(e){console.error(e);}},700);};
  const add=()=>{const p=newMasterPage(Date.now());setDoc(doc(db,'livro_pages',String(p.id)),p);setOpen(p.id);};
  const upd=(id,data)=>{setPages(prev=>prev.map(p=>p.id===id?data:p));save(data);};
  const del=async id=>{await deleteDoc(doc(db,'livro_pages',String(id)));if(open===id)setOpen(null);};

  return(
    <div>
      <div style={{marginBottom:20,padding:'14px 18px',border:'1px solid rgba(168,85,247,0.18)',borderRadius:10,background:'rgba(168,85,247,0.05)',fontFamily:'Crimson Text,Georgia,serif',fontSize:14,color:'#9A8A9A',lineHeight:1.8,fontStyle:'italic',textAlign:'center'}}>
        "Páginas escritas pelos escribas do Mestre — registros do que o grupo descobriu, ganhou ou testemunhou ao longo de sua jornada."
      </div>
      {masterMode&&<div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}><button onClick={add} style={{padding:'8px 20px',borderRadius:8,border:'1px solid rgba(168,85,247,0.4)',background:'rgba(168,85,247,0.1)',color:'#C8A8E8',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12,letterSpacing:'0.08em'}}>+ Nova Página</button></div>}
      {!loaded&&<div style={{textAlign:'center',color:'#5A5070',fontFamily:'Cinzel,serif',fontSize:13,padding:30}}>Conectando ao cosmos...</div>}
      {loaded&&pages.length===0&&<div style={{textAlign:'center',padding:38,border:'1px dashed rgba(168,85,247,0.18)',borderRadius:12}}><div style={{fontSize:30,marginBottom:10}}>📖</div><div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#6A5A7A'}}>Nenhuma página adicionada ainda.</div><div style={{fontSize:12,marginTop:5,color:'#4A4050'}}>{masterMode?'Clique em "+ Nova Página" para começar.':'Aguarde o Mestre registrar novas descobertas.'}</div></div>}
      {pages.map(page=>(
        <div key={page.id} style={{border:'1px solid rgba(168,85,247,0.15)',borderRadius:11,marginBottom:11,overflow:'hidden',background:'rgba(8,10,22,0.85)'}}>
          <div onClick={()=>setOpen(open===page.id?null:page.id)} style={{padding:'13px 17px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',userSelect:'none'}}>
            <span style={{fontSize:17}}>📖</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#C8A8E8',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{page.titulo||'(Sem título)'}</div>
              <div style={{fontSize:11,color:'#5A5070',marginTop:2,fontFamily:'Cinzel,serif',letterSpacing:'0.03em'}}>📅 {page.dataAquisicao}</div>
            </div>
            <div style={{display:'flex',gap:7}}>
              {masterMode&&<button onClick={e=>{e.stopPropagation();del(page.id);}} style={{background:'rgba(232,25,60,0.09)',border:'1px solid rgba(232,25,60,0.22)',color:'#E8193C',borderRadius:5,cursor:'pointer',padding:'3px 8px',fontSize:11}}>✕</button>}
              <span style={{color:'rgba(168,85,247,0.4)',fontSize:11,transform:open===page.id?'rotate(90deg)':'none',transition:'transform 0.3s',display:'flex',alignItems:'center'}}>▶</span>
            </div>
          </div>
          {open===page.id&&(
            <div style={{padding:'0 17px 17px',borderTop:'1px solid rgba(168,85,247,0.1)',animation:'pageTurn 0.3s ease'}}>
              <div style={{height:11}}/>
              {masterMode?(<>
                <div style={{display:'grid',gridTemplateColumns:'1fr 140px',gap:10,marginBottom:11}}>
                  <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Título</label><input value={page.titulo||''} onChange={e=>upd(page.id,{...page,titulo:e.target.value})} placeholder="Ex: O Pacto com o Homem Água..." style={{width:'100%'}}/></div>
                  <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Data</label><input value={page.dataAquisicao||''} onChange={e=>upd(page.id,{...page,dataAquisicao:e.target.value})} style={{width:'100%'}}/></div>
                </div>
                <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Descritivo</label><textarea value={page.descricao||''} onChange={e=>upd(page.id,{...page,descricao:e.target.value})} rows={6} style={{width:'100%',resize:'vertical',lineHeight:1.85}}/></div>
                <div style={{marginTop:7,fontSize:11,color:'#4A4050',textAlign:'right',fontFamily:'Cinzel,serif'}}>salvo automaticamente</div>
              </>):(
                <div style={{fontSize:14,color:'#9A8A7A',lineHeight:1.85,fontStyle:'italic',whiteSpace:'pre-line'}}>{page.descricao||<span style={{color:'#4A4050'}}>Esta página ainda não foi escrita.</span>}</div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── LIVRO DA MANDÍBULA ───────────────────────────────────────────────────────
function LibroSection({masterMode}){
  const[page,setPage]=useState(0);const[unlocked,setUnlocked]=useState({});const[artefatosUnlocked,setArtefatosUnlocked]=useState({});const[coordRevealed,setCoordRevealed]=useState(false);
  const[artefatosHabs,setArtefatosHabs]=useState({});
  const[formHab,setFormHab]=useState({});

  useEffect(()=>{
    const u1=onSnapshot(doc(db,'config','entities'),snap=>{if(snap.exists())setUnlocked(snap.data().unlocked||{});});
    const u2=onSnapshot(doc(db,'config','artefatos'),snap=>{if(snap.exists())setArtefatosUnlocked(snap.data().unlocked||{});});
    const u3=onSnapshot(doc(db,'config','prophecy'),snap=>{if(snap.exists())setCoordRevealed(snap.data().coordRevealed||false);});
    const u4=onSnapshot(doc(db,'config','artefatos_habilidades'),snap=>{if(snap.exists())setArtefatosHabs(snap.data()||{});});
    return()=>{u1();u2();u3();u4();};
  },[]);

  const toggleUnlock=async id=>{const updated={...unlocked,[id]:!unlocked[id]};await setDoc(doc(db,'config','entities'),{unlocked:updated});};
  const toggleArtefato=async id=>{const updated={...artefatosUnlocked,[id]:!artefatosUnlocked[id]};await setDoc(doc(db,'config','artefatos'),{unlocked:updated});};
  const toggleCoord=async()=>{await setDoc(doc(db,'config','prophecy'),{coordRevealed:!coordRevealed});};

  const saveHab=async(artefatoId)=>{
    const novaHab=formHab[artefatoId];
    if(!novaHab||!novaHab.nome)return;
    const atuais=artefatosHabs[artefatoId]||[];
    const nextHabs={...artefatosHabs,[artefatoId]:[...atuais,{...novaHab,id:Date.now()}]};
    await setDoc(doc(db,'config','artefatos_habilidades'),nextHabs);
    setFormHab(prev=>({...prev,[artefatoId]:{nome:'',descricao:'',custo:'',dano:'',cooldown:''}}));
  };
  const deleteHab=async(artefatoId,habId)=>{
    const atuais=artefatosHabs[artefatoId]||[];
    const nextHabs={...artefatosHabs,[artefatoId]:atuais.filter(h=>h.id!==habId)};
    await setDoc(doc(db,'config','artefatos_habilidades'),nextHabs);
  };

  const starC=['#1EC8FF','#E8A020','#A855F7','#E8193C'];
  const isRevealed=(ent,i)=>i<2?true:(unlocked[ent.id]||false);

  return(<div style={{maxWidth:780,margin:'0 auto',padding:'40px 24px 80px'}}><div style={{textAlign:'center',marginBottom:28}}><div style={{fontSize:11,letterSpacing:'0.4em',color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:13,textTransform:'uppercase'}}>O Artefato da Profecia</div><h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:22,color:'#E8D8C0',fontWeight:700,margin:0}}>Livro da Mandíbula</h2><div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(168,85,247,0.6),transparent)',margin:'15px auto 0'}}/></div><div style={{display:'flex',gap:6,marginBottom:26,justifyContent:'center',flexWrap:'wrap'}}>{['📜 Marcos & Profecia','◈ As Seis Entidades','◆ Os 6 Artefatos','📖 Páginas do Mestre'].map((t,i)=>(<button key={i} onClick={()=>setPage(i)} style={{padding:'7px 16px',borderRadius:20,fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:'0.07em',border:page===i?'1px solid rgba(168,85,247,0.5)':'1px solid rgba(255,255,255,0.08)',background:page===i?'rgba(168,85,247,0.12)':'transparent',color:page===i?'#C8A8E8':'#5A4A6A',cursor:'pointer',transition:'all 0.2s'}}>{t}</button>))}</div>
  {page===0&&(<div style={{animation:'pageTurn 0.4s ease'}}><div style={{marginBottom:24,padding:'14px 18px',border:'1px solid rgba(168,85,247,0.18)',borderRadius:10,background:'rgba(168,85,247,0.05)',fontFamily:'Crimson Text,Georgia,serif',fontSize:14,color:'#9A8A9A',lineHeight:1.8,fontStyle:'italic',textAlign:'center'}}>"Escrito na era em que o primeiro Mago do Prólogo tocou a pena celestial — estas páginas registram os passos da humanidade e para onde eles a levam."</div><div style={{position:'relative',paddingLeft:26}}><div style={{position:'absolute',left:7,top:0,bottom:0,width:1,background:'linear-gradient(180deg,rgba(168,85,247,0.4),rgba(232,25,60,0.6))'}}/>{MILESTONES.map((m,i)=>(<div key={i} style={{position:'relative',marginBottom:m.prophecy?0:15,paddingLeft:18}}><div style={{position:'absolute',left:-18,top:5,width:9,height:9,borderRadius:'50%',background:m.prophecy?'#E8193C':'rgba(168,85,247,0.5)',boxShadow:m.prophecy?'0 0 10px #E8193C':undefined,border:`1px solid ${m.prophecy?'#E8193C':'rgba(168,85,247,0.4)'}`}}/><div style={{display:'flex',alignItems:'flex-start',gap:10,padding:'9px 13px',borderRadius:8,background:m.prophecy?'rgba(232,25,60,0.07)':'rgba(255,255,255,0.018)',border:m.prophecy?'1px solid rgba(232,25,60,0.22)':'1px solid rgba(255,255,255,0.04)'}}><span style={{fontSize:15,flexShrink:0}}>{m.icon}</span><div><div style={{fontSize:10,fontFamily:'Cinzel,serif',color:m.prophecy?'#E8193C':'#7B6D8A',letterSpacing:'0.2em',marginBottom:2}}>{m.year}</div><div style={{fontSize:14,color:m.prophecy?'#F09090':'#9A8A7A',lineHeight:1.6,fontFamily:m.prophecy?'Cinzel,serif':'inherit',fontWeight:m.prophecy?600:400}}>{m.event}</div></div></div></div>))}</div><div style={{marginTop:26,padding:'22px',border:'1px solid rgba(232,25,60,0.28)',borderRadius:12,background:'rgba(232,25,60,0.05)'}}><div style={{textAlign:'center',marginBottom:16}}><div style={{fontSize:11,letterSpacing:'0.4em',color:'#E8193C',fontFamily:'Cinzel,serif',marginBottom:12,textTransform:'uppercase'}}>A Profecia</div><div style={{display:'flex',justifyContent:'center',gap:16,marginBottom:14}}>{starC.map((c,i)=>(<div key={i} style={{textAlign:'center'}}><div style={{width:13,height:13,borderRadius:'50%',background:c,boxShadow:`0 0 12px ${c}`,margin:'0 auto 4px',animation:'shimmer 2s ease-in-out infinite',animationDelay:`${i*0.4}s`}}/><div style={{fontSize:9,color:c,fontFamily:'Cinzel,serif'}}>★</div></div>))}</div></div><p style={{fontSize:14,color:'#B09090',lineHeight:1.85,margin:'0 0 20px',textAlign:'center',fontStyle:'italic'}}>"Quatro estrelas surgirão nos céus de Cosmum — visíveis tanto de dia quanto de noite. A cada dia que passa, elas se aproximam. Quando chegarem ao máximo possível de proximidade... algo acontecerá. O que, o Livro não ousou descrever."</p>{!coordRevealed?(<div style={{textAlign:'center',marginTop:8}}><div style={{fontSize:12,color:'rgba(255,255,255,0.2)',fontFamily:'Cinzel,serif',marginBottom:10,letterSpacing:'0.15em'}}>✦ A próxima página permanece selada por uma magia poderosa ✦</div><button onClick={toggleCoord} style={{padding:'9px 24px',borderRadius:8,border:'1px solid rgba(168,85,247,0.4)',background:'rgba(168,85,247,0.08)',color:'#C8A8E8',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12,letterSpacing:'0.1em',transition:'all 0.2s'}}>🔮 Quebrar Selo</button></div>):(<div style={{marginTop:8,padding:'18px',border:'1px solid rgba(168,85,247,0.3)',borderRadius:10,background:'rgba(168,85,247,0.06)',textAlign:'center',animation:'pageTurn 0.8s ease'}}><div style={{fontSize:10,letterSpacing:'0.35em',color:'#A855F7',fontFamily:'Cinzel,serif',marginBottom:12,textTransform:'uppercase'}}>As Coordenadas do Destino</div><div style={{fontFamily:'Cinzel,serif',fontSize:18,color:'#C8A8E8',letterSpacing:'0.25em',animation:'revealCoord 1.2s ease',marginBottom:8}}>45° 30′ 53.6″ N, 25° 22′ 1.8″ E</div><div style={{fontSize:12,color:'#7A6A8A',fontStyle:'italic',lineHeight:1.7}}>"O ponto onde as quatro estrelas convergem. Onde o véu entre o mortal e o absoluto é mais fino."</div><button onClick={toggleCoord} style={{marginTop:14,padding:'5px 14px',borderRadius:6,border:'1px solid rgba(168,85,247,0.25)',background:'transparent',color:'#5A4A6A',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.08em'}}>🔒 Selar novamente</button></div>)}</div></div>)}
  {page===1&&(<div style={{animation:'pageTurn 0.4s ease'}}><div style={{marginBottom:20,textAlign:'center',fontSize:14,color:'#6A5A7A',fontFamily:'Crimson Text,Georgia,serif',fontStyle:'italic'}}>"Seis entidades foram vislumbradas nas páginas finais do Livro. Sua origem, forma e propósito permanecem parcialmente envoltos em sombra."</div><div style={{display:'flex',flexDirection:'column',gap:14}}>{ENTITIES_DATA.map((ent,i)=>{const revealed=isRevealed(ent,i);return(<div key={ent.id} style={{border:`1px solid ${revealed?'rgba(168,85,247,0.22)':'rgba(255,255,255,0.05)'}`,borderRadius:11,background:revealed?'rgba(168,85,247,0.04)':'rgba(255,255,255,0.014)',overflow:'hidden'}}><div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:20}}>{ent.icon}</span><div style={{flex:1}}><div style={{fontFamily:'Cinzel,serif',fontSize:14,color:revealed?'#C8A8E8':'#5A4A6A',fontWeight:600}}>{ent.name}</div><div style={{fontSize:10,color:'#4A4050',letterSpacing:'0.18em',fontFamily:'Cinzel,serif'}}>{revealed?'ENTIDADE REGISTRADA':'TRANCADO — AGUARDANDO O MESTRE'}</div></div>{i>=2&&masterMode&&(<button onClick={()=>toggleUnlock(ent.id)} style={{padding:'5px 12px',borderRadius:5,border:`1px solid ${revealed?'rgba(168,85,247,0.35)':'rgba(232,25,60,0.35)'}`,background:revealed?'rgba(168,85,247,0.07)':'rgba(232,25,60,0.07)',color:revealed?'#C8A8E8':'#F09090',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.08em'}}>{revealed?'🔒 Trancar':'🔓 Revelar'}</button>)}</div>{revealed?(<div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:14}}><div><div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:8,textTransform:'uppercase'}}>Lore / História</div><div style={{fontSize:14,color:'#9A8A7A',lineHeight:1.85,fontStyle:'italic',whiteSpace:'pre-line'}}>{ent.lore||<span style={{color:'#4A4050'}}>Lore ainda não registrado.</span>}</div></div><div style={{height:1,background:'rgba(255,255,255,0.06)'}}/><div><div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:8,textTransform:'uppercase'}}>Características Físicas</div><div style={{fontSize:14,color:'#9A8A7A',lineHeight:1.85,fontStyle:'italic'}}>{ent.fisico||<span style={{color:'#4A4050'}}>Características físicas ainda não registradas.</span>}</div></div></div>):(<div style={{padding:'22px 16px',textAlign:'center'}}><div style={{fontSize:28,marginBottom:8,opacity:0.3}}>🔒</div><div style={{fontSize:13,color:'#4A4050',fontFamily:'Cinzel,serif',letterSpacing:'0.08em'}}>Esta entidade ainda não foi revelada.</div></div>)}</div>);})}</div></div>)}
  {page===2&&(<div style={{animation:'pageTurn 0.4s ease'}}>
    <div style={{marginBottom:20,textAlign:'center',fontSize:14,color:'#6A5A7A',fontFamily:'Crimson Text,Georgia,serif',fontStyle:'italic'}}>"Seis artefatos de poder imensurável foram registrados nas páginas mais antigas do Livro."</div>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {ARTEFATOS_DATA.map((art,i)=>{
        const revealed=artefatosUnlocked[art.id]||false;
        const hasContent=!!(art.lore||art.fisico);
        return(
          <div key={art.id} style={{border:`1px solid ${revealed?'rgba(232,160,32,0.3)':'rgba(255,255,255,0.05)'}`,borderRadius:11,background:revealed?'rgba(232,160,32,0.04)':'rgba(255,255,255,0.014)',overflow:'hidden'}}>
            <div style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:18,opacity:revealed?1:0.3}}>{art.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:'Cinzel,serif',fontSize:13,color:revealed?'#E8D8C0':'#4A4050',fontWeight:600}}>{revealed?art.name:`Artefato ${i+1} — Selado`}</div>
                <div style={{fontSize:10,color:revealed?'rgba(232,160,32,0.6)':'#3A3040',letterSpacing:'0.18em',fontFamily:'Cinzel,serif',marginTop:2}}>{revealed?'ARTEFATO REVELADO':'SELADO POR MAGIA PODEROSA'}</div>
              </div>
              {masterMode&&<button onClick={()=>toggleArtefato(art.id)} style={{padding:'5px 12px',borderRadius:5,border:`1px solid ${revealed?'rgba(232,160,32,0.35)':'rgba(232,25,60,0.25)'}`,background:revealed?'rgba(232,160,32,0.07)':'rgba(232,25,60,0.05)',color:revealed?'#E8A020':'#6A4A4A',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.08em'}}>{revealed?'🔒 Selar':'🔓 Revelar'}</button>}
            </div>
            {!revealed&&(<div style={{padding:'16px',textAlign:'center',borderTop:'1px solid rgba(255,255,255,0.04)'}}><div style={{fontSize:12,color:'#3A3040',fontFamily:'Cinzel,serif',letterSpacing:'0.08em',fontStyle:'italic'}}>Este artefato permanece oculto por uma magia poderosa.</div></div>)}
            {revealed&&(<div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:12,borderTop:'1px solid rgba(232,160,32,0.1)'}}>
              {hasContent?<>
                <div><div style={{fontSize:10,letterSpacing:'0.3em',color:'rgba(232,160,32,0.6)',fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Descrição</div><div style={{fontSize:14,color:'#9A8A7A',lineHeight:1.85,fontStyle:'italic',whiteSpace:'pre-line'}}>{art.lore}</div></div>
                {art.fisico&&(<><div style={{height:1,background:'rgba(232,160,32,0.1)'}}/><div><div style={{fontSize:10,letterSpacing:'0.3em',color:'rgba(232,160,32,0.6)',fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Localização & Origem</div><div style={{fontSize:14,color:'#9A8A7A',lineHeight:1.85,fontStyle:'italic',whiteSpace:'pre-line'}}>{art.fisico}</div></div></>)}
              </>:<div style={{fontSize:13,color:'#7A6A5A',fontStyle:'italic',fontFamily:'Crimson Text,Georgia,serif',lineHeight:1.7}}>Informações sobre este artefato serão reveladas pelo Mestre ao longo da campanha.</div>}
              
              {/* NOVA SEÇÃO: PODERES DO ARTEFATO */}
              <div style={{marginTop:16}}>
                <div style={{fontSize:10,letterSpacing:'0.2em',color:'#E8A020',fontFamily:'Cinzel,serif',marginBottom:10,textTransform:'uppercase'}}>Poderes do Artefato</div>
                {(artefatosHabs[art.id]||[]).map(h=>(
                  <div key={h.id} style={{background:'rgba(232,160,32,0.05)',border:'1px solid rgba(232,160,32,0.2)',borderRadius:8,padding:'10px',marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <span style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#E8D8C0',fontWeight:600}}>{h.nome}</span>
                        {h.custo && <span style={{fontSize:10,color:'#E8A020'}}>{h.custo} VC</span>}
                        {h.dano && <span style={{fontSize:10,color:'#4ADE80'}}>⚔ {h.dano}</span>}
                        {h.cooldown && <span style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>⏱ {h.cooldown}</span>}
                      </div>
                      {masterMode && <button onClick={()=>deleteHab(art.id, h.id)} style={{background:'transparent',border:'1px solid rgba(232,25,60,0.3)',color:'#E8193C',borderRadius:4,padding:'2px 6px',fontSize:10,cursor:'pointer'}}>✕</button>}
                    </div>
                    <div style={{fontSize:12,color:'#9A8A7A',marginTop:4}}>{h.descricao}</div>
                  </div>
                ))}
                {masterMode && (
                  <div style={{background:'rgba(255,255,255,0.02)',padding:12,borderRadius:8,border:'1px dashed rgba(232,160,32,0.3)',marginTop:10}}>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.5)',marginBottom:8,fontFamily:'Cinzel,serif'}}>+ Adicionar Novo Poder</div>
                    <input value={formHab[art.id]?.nome||''} onChange={e=>setFormHab(p=>({...p,[art.id]:{...p[art.id],nome:e.target.value}}))} placeholder="Nome do Poder..." style={{width:'100%',marginBottom:6,fontSize:12}}/>
                    <div style={{display:'flex',gap:6,marginBottom:6}}>
                      <input value={formHab[art.id]?.dano||''} onChange={e=>setFormHab(p=>({...p,[art.id]:{...p[art.id],dano:e.target.value}}))} placeholder="Dano (ex: 1D12)" style={{flex:1,fontSize:12}}/>
                      <input type="number" value={formHab[art.id]?.custo||''} onChange={e=>setFormHab(p=>({...p,[art.id]:{...p[art.id],custo:e.target.value}}))} placeholder="VC" style={{width:60,fontSize:12}}/>
                      <input value={formHab[art.id]?.cooldown||''} onChange={e=>setFormHab(p=>({...p,[art.id]:{...p[art.id],cooldown:e.target.value}}))} placeholder="CD" style={{width:80,fontSize:12}}/>
                    </div>
                    <textarea value={formHab[art.id]?.descricao||''} onChange={e=>setFormHab(p=>({...p,[art.id]:{...p[art.id],descricao:e.target.value}}))} placeholder="Efeito detalhado..." rows={2} style={{width:'100%',marginBottom:6,fontSize:12,resize:'vertical'}}/>
                    <button onClick={()=>saveHab(art.id)} disabled={!formHab[art.id]?.nome} style={{width:'100%',padding:'6px',borderRadius:6,border:'1px solid #E8A020',background:'rgba(232,160,32,0.1)',color:'#E8A020',cursor:formHab[art.id]?.nome?'pointer':'not-allowed',fontFamily:'Cinzel,serif',fontSize:11}}>Salvar Poder</button>
                  </div>
                )}
              </div>
            </div>)}
          </div>
        );
      })}
    </div>
  </div>)}
  {page===3&&<MasterPagesBook masterMode={masterMode}/>}
  </div>);
}

// ─── CRÔNICAS ─────────────────────────────────────────────────────────────────
const newEntry=id=>({id,titulo:'',sessao:'',data:new Date().toLocaleDateString('pt-BR'),conteudo:'',imagens:[]});

function CronicasSection({masterMode}){
  const[entries,setEntries]=useState([]);
  const[loaded,setLoaded]=useState(false);
  const[open,setOpen]=useState(null);
  const saveTimeout=useRef({});
  const[subTab, setSubTab]=useState('cronicas');
  const [openOva, setOpenOva] = useState(null);
  const[ovas, setOvas]=useState([]);               
  const[ovasLoaded, setOvasLoaded]=useState(false);
  const saveOvaTimeout=useRef({});                
  const ovaInputRefs=useRef({});
  const [subTabE, setSubTabE] = useState(false);
const [ecom, setEcom] = useState([]);
const [ecomLoaded, setEcomLoaded] = useState(false);
const [openEcom, setOpenEcom] = useState(null);
const saveEcomTimeout = useRef({});
const ecomInputRefs = useRef({});
  useEffect(() => {
  const unsub1 = onSnapshot(collection(db,'cronicas'), snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data(), imagens: [] }));
    data.sort((a,b) => b.id - a.id);
    setEntries(data);
    setLoaded(true);
  });
  const unsub2 = onSnapshot(collection(db,'cronicas_imgs'), snap => {
    const imgs = {};
    snap.docs.forEach(d => { imgs[d.id] = d.data().imagens || []; });
    setEntries(prev => prev.map(e => ({ ...e, imagens: imgs[String(e.id)] || [] })));
  });
  return () => { unsub1(); unsub2(); };
}, []);
  useEffect(()=>{
  const unsub = onSnapshot(collection(db,'ovas'), snap=>{
    const data = snap.docs.map(d=>({id:d.id,...d.data()}));
    data.sort((a,b)=>b.id-a.id);
    setOvas(data); setOvasLoaded(true);
  });
  return()=>unsub();
},[]);
useEffect(()=>{
  const unsub = onSnapshot(collection(db,'ecom'), snap=>{
    const data = snap.docs.map(d=>({id:d.id,...d.data()}));
    data.sort((a,b)=>b.id-a.id);
    setEcom(data); setEcomLoaded(true);
  });
  return()=>unsub();
},[]);

const newEcom = id => ({id, titulo:'', episodio:'', data: new Date().toLocaleDateString('pt-BR'), conteudo:'', imagens:[]});
const saveEcom = entry => {
  clearTimeout(saveEcomTimeout.current[entry.id]);
  saveEcomTimeout.current[entry.id] = setTimeout(async()=>{
    try { const{imagens,...sem}=entry; await setDoc(doc(db,'ecom',String(entry.id)),sem); if(imagens&&imagens.length>0) await setDoc(doc(db,'ecom',String(entry.id)),entry); }
    catch(e){ alert('Aviso: Entrada muito grande. Tente menos imagens.'); }
  }, 800);
};
const addEcom = () => { const o = newEcom(Date.now()); setDoc(doc(db,'ecom',String(o.id)),o); setOpenEcom(o.id); };
const updEcom = (id,data) => { setEcom(prev=>prev.map(o=>o.id===id?data:o)); saveEcom(data); };
const delEcom = async id => { await deleteDoc(doc(db,'ecom',String(id))); if(openEcom===id) setOpenEcom(null); };
const addEcomImage = async(entry,file)=>{
  const reader = new FileReader();
  reader.onload = async ev=>{
    const compressed = await compressImage(ev.target.result,1000,1000,0.68);
    const imagens = [...(entry.imagens||[]), compressed];
    if(imagens.length>6){ alert('Máximo de 6 imagens.'); return; }
    updEcom(entry.id,{...entry,imagens});
  };
  reader.readAsDataURL(file);
};
const removeEcomImage = (entry,idx) => { const imagens=(entry.imagens||[]).filter((_,i)=>i!==idx); updEcom(entry.id,{...entry,imagens}); };
const newOva = id => ({id, titulo:'', episodio:'', data: new Date().toLocaleDateString('pt-BR'), conteudo:'', imagens:[]});
const saveOva = ova => {
  clearTimeout(saveOvaTimeout.current[ova.id]);
  saveOvaTimeout.current[ova.id] = setTimeout(async()=>{
    try { const{imagens,...sem}=ova; await setDoc(doc(db,'ovas',String(ova.id)),sem); if(imagens&&imagens.length>0) await setDoc(doc(db,'ovas',String(ova.id)),ova); }
    catch(e){ alert('Aviso: OVA muito grande. Tente menos imagens.'); }
  }, 800);
};
const addOva = () => { const o = newOva(Date.now()); setDoc(doc(db,'ovas',String(o.id)),o); setOpenOva(o.id); };
const updOva = (id,data) => { setOvas(prev=>prev.map(o=>o.id===id?data:o)); saveOva(data); };
const delOva = async id => { await deleteDoc(doc(db,'ovas',String(id))); if(openOva===id) setOpenOva(null); };
const addOvaImage = async(ova,file)=>{
  const reader = new FileReader();
  reader.onload = async ev=>{
    const compressed = await compressImage(ev.target.result,1000,1000,0.68);
    const imagens = [...(ova.imagens||[]), compressed];
    if(imagens.length>6){ alert('Máximo de 6 imagens por OVA.'); return; }
    updOva(ova.id,{...ova,imagens});
  };
  reader.readAsDataURL(file);
};
const removeOvaImage = (ova,idx) => { const imagens=(ova.imagens||[]).filter((_,i)=>i!==idx); updOva(ova.id,{...ova,imagens}); };
  const saveEntry = entry => {
  clearTimeout(saveTimeout.current[entry.id]);
  saveTimeout.current[entry.id] = setTimeout(async () => {
    try {
      const { imagens, ...sem } = entry;
      await setDoc(doc(db, 'cronicas', String(entry.id)), sem);
    } catch(e) { console.error('Erro ao salvar crônica:', e); }
  }, 800);
};
const saveEntryImages = async (entryId, imagens) => {
  try {
    await setDoc(doc(db, 'cronicas_imgs', String(entryId)), { imagens: imagens || [] });
  } catch(e) { console.error('Erro ao salvar imagens:', e); alert('Imagem muito grande mesmo após compressão. Tente uma foto menor.'); }
};
const add = () => { const e = newEntry(Date.now()); setDoc(doc(db,'cronicas',String(e.id)),e); setOpen(e.id); };
const upd = (id, data) => {
  setEntries(prev => prev.map(e => e.id === id ? data : e));
  const { imagens, ...sem } = data;
  saveEntry({ ...sem, id });
};
const del = async id => {
  await deleteDoc(doc(db,'cronicas',String(id)));
  await deleteDoc(doc(db,'cronicas_imgs',String(id))).catch(()=>{});
  if(open===id) setOpen(null);
};
const addImage = async (entry, file) => {
  const reader = new FileReader();
  reader.onload = async ev => {
    const compressed = await compressImageSmall(ev.target.result);
    const imagens = [...(entry.imagens||[]), compressed];
    if(imagens.length > 8){ alert('Máximo de 8 imagens por crônica.'); return; }
    const newEntry2 = { ...entry, imagens };
    setEntries(prev => prev.map(e => e.id === entry.id ? newEntry2 : e));
    await saveEntryImages(entry.id, imagens);
  };
  reader.readAsDataURL(file);
};
const removeImage = async (entry, idx) => {
  const imagens = (entry.imagens||[]).filter((_,i) => i !== idx);
  const newEntry2 = { ...entry, imagens };
  setEntries(prev => prev.map(e => e.id === entry.id ? newEntry2 : e));
  await saveEntryImages(entry.id, imagens);
};
  const imgInputRefs=useRef({});
  return(
    <div style={{maxWidth:760,margin:'0 auto',padding:'40px 24px 80px'}}>
      <div style={{textAlign:'center',marginBottom:28}}><div style={{fontSize:11,letterSpacing:'0.4em',color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:13,textTransform:'uppercase'}}>O Registro dos Acontecimentos</div><h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:23,color:'#E8D8C0',fontWeight:700,margin:0}}>Crônicas da Campanha</h2><div style={{fontSize:12,color:'#4A4050',marginTop:9,fontFamily:'Cinzel,serif'}}>Registre os eventos, batalhas, revelações e narrativas de cada sessão</div>
        <div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(232,160,32,0.6),transparent)',margin:'16px auto 0'}}/>
      </div>

      {/* Sub-abas */}
      <div style={{display:'flex',gap:6,justifyContent:'center',marginBottom:24}}>
        {[
          {id:'cronicas', label:'📜 Crônicas'},
          {id:'ovas',     label:'\uD83C\uDFAC OVA(s)'},
          {id:'ecom',     label:'Ecom \u26A1'},
        ].map(st=>(
          <button key={st.id} onClick={()=>setSubTab(st.id)} style={{
            padding:'7px 22px', borderRadius:20, fontFamily:'Cinzel,serif', fontSize:12,
            letterSpacing:'0.07em', cursor:'pointer', transition:'all 0.2s',
            border: subTab===st.id ? '1px solid rgba(168,85,247,0.55)' : '1px solid rgba(255,255,255,0.08)',
            background: subTab===st.id ? 'rgba(168,85,247,0.14)' : 'transparent',
            color: subTab===st.id ? '#C8A8E8' : '#5A4A6A',
          }}>{st.label}</button>
        ))}
      </div>
      {/* ── ABA CRÔNICAS ── */}
      {subTab === 'cronicas' && (<>
        {!loaded && <div style={{textAlign:'center',color:'#5A5070',fontFamily:'Cinzel,serif',fontSize:13,padding:40}}>Conectando ao cosmos...</div>}
        {loaded && (<>
          {masterMode && (
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:18}}>
              <button onClick={add} style={{padding:'8px 20px',borderRadius:8,border:'1px solid rgba(168,85,247,0.4)',background:'rgba(168,85,247,0.1)',color:'#C8A8E8',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12,letterSpacing:'0.08em'}}>+ Nova Crônica</button>
            </div>
          )}
          {entries.length===0&&(<div style={{textAlign:'center',padding:38,border:'1px dashed rgba(255,255,255,0.07)',borderRadius:12}}><div style={{fontSize:30,marginBottom:10}}>📜</div><div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#6A5A7A'}}>Nenhuma crônica registrada.</div></div>)}
          {entries.map(entry=>(
            <div key={entry.id} style={{border:'1px solid rgba(255,255,255,0.08)',borderRadius:11,marginBottom:11,overflow:'hidden',background:'rgba(8,10,22,0.85)'}}>
              <div onClick={()=>setOpen(open===entry.id?null:entry.id)} style={{padding:'13px 17px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',userSelect:'none'}}>
                <span style={{fontSize:15}}>📜</span>
                <div style={{flex:1}}><div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#C8B8A0',fontWeight:600}}>{entry.titulo||'(Sem título)'}</div><div style={{fontSize:11,color:'#5A5070',marginTop:2,display:'flex',gap:10,flexWrap:'wrap'}}>{entry.sessao&&<span>Sessão {entry.sessao}</span>}<span>{entry.data}</span>{entry.conteudo&&<span style={{color:'#4A4050'}}>{entry.conteudo.split(' ').length} palavras</span>}{(entry.imagens||[]).length>0&&<span style={{color:'#4A4050'}}>🖼 {entry.imagens.length}</span>}</div></div>
                <div style={{display:'flex',gap:7}}>
                  {masterMode&&<button onClick={e=>{e.stopPropagation();del(entry.id);}} style={{background:'rgba(232,25,60,0.09)',border:'1px solid rgba(232,25,60,0.22)',color:'#E8193C',borderRadius:5,cursor:'pointer',padding:'3px 8px',fontSize:11}}>✕</button>}
                  <span style={{color:'rgba(255,255,255,0.2)',fontSize:11,transform:open===entry.id?'rotate(90deg)':'none',transition:'transform 0.3s',display:'flex',alignItems:'center'}}>▶</span>
                </div>
              </div>
              {open===entry.id&&(
                <div style={{padding:'0 17px 17px',borderTop:'1px solid rgba(255,255,255,0.05)',animation:'pageTurn 0.3s ease'}}>
                  <div style={{height:11}}/>
                  {masterMode ? (
                    <>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 80px',gap:9,marginBottom:11}}>
                        <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Título</label><input value={entry.titulo||''} onChange={e=>upd(entry.id,{...entry,titulo:e.target.value})} placeholder="Nome desta crônica..." style={{width:'100%'}}/></div>
                        <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Sessão</label><input value={entry.sessao||''} onChange={e=>upd(entry.id,{...entry,sessao:e.target.value})} placeholder="Nº" style={{width:'100%'}}/></div>
                      </div>
                      <div style={{marginBottom:11}}><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Narrativa da Sessão</label><textarea value={entry.conteudo||''} onChange={e=>upd(entry.id,{...entry,conteudo:e.target.value})} rows={10} style={{width:'100%',resize:'vertical',lineHeight:1.85}}/></div>
                      <div style={{marginBottom:10}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:9}}>
                          <label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',textTransform:'uppercase'}}>Imagens</label>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{fontSize:10,color:'#4A4050',fontFamily:'Cinzel,serif'}}>{(entry.imagens||[]).length}/6</span>
                            <button onClick={()=>imgInputRefs.current[entry.id]?.click()} style={{padding:'5px 12px',borderRadius:7,border:'1px solid rgba(168,85,247,0.3)',background:'rgba(168,85,247,0.08)',color:'#C8A8E8',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:11}}>🖼 Adicionar</button>
                            <input ref={el=>imgInputRefs.current[entry.id]=el} type="file" accept="image/*" onChange={e=>{if(e.target.files[0])addImage(entry,e.target.files[0]);e.target.value='';}} style={{display:'none'}}/>
                          </div>
                        </div>
                        {(entry.imagens||[]).length>0?<div style={{display:'flex',flexDirection:'column',gap:10}}>{entry.imagens.map((img,idx)=>(<div key={idx} style={{position:'relative',borderRadius:10,overflow:'hidden',border:'1px solid rgba(255,255,255,0.08)'}}><img src={img} alt="" style={{width:'100%',display:'block',objectFit:'contain',background:'rgba(0,0,0,0.3)'}}/><button onClick={()=>removeImage(entry,idx)} style={{position:'absolute',top:8,right:8,background:'rgba(232,25,60,0.85)',border:'none',color:'#fff',borderRadius:6,cursor:'pointer',padding:'4px 9px',fontSize:12}}>✕</button></div>))}</div>:<div style={{padding:12,borderRadius:10,border:'1px dashed rgba(255,255,255,0.06)',color:'#5A5070',textAlign:'center',fontSize:11,fontFamily:'Cinzel,serif'}}>Nenhuma imagem. (máx 6)</div>}
                      </div>
                      <div style={{fontSize:11,color:'#4A4050',textAlign:'right',fontFamily:'Cinzel,serif'}}>{(entry.conteudo||'').length} caracteres · salvo automaticamente</div>
                    </>
                  ) : (
                    <>
                      {(entry.titulo||entry.sessao)&&(<div style={{marginBottom:16,paddingBottom:14,borderBottom:'1px solid rgba(255,255,255,0.05)'}}>{entry.titulo&&<div style={{fontFamily:'Cinzel,serif',fontSize:16,color:'#C8A8E8',fontWeight:700,marginBottom:4}}>{entry.titulo}</div>}<div style={{display:'flex',gap:14,flexWrap:'wrap'}}>{entry.sessao&&<span style={{fontSize:11,color:'#7B6D8A',fontFamily:'Cinzel,serif'}}>Sessão {entry.sessao}</span>}<span style={{fontSize:11,color:'#5A5070',fontFamily:'Cinzel,serif'}}>{entry.data}</span></div></div>)}
                      {entry.conteudo?<div style={{fontSize:15,color:'#B0A090',lineHeight:1.95,whiteSpace:'pre-wrap',fontFamily:"'Crimson Text',Georgia,serif",marginBottom:16}}>{entry.conteudo}</div>:<div style={{fontSize:13,color:'#4A4050',fontStyle:'italic',fontFamily:'Cinzel,serif',marginBottom:16,textAlign:'center',padding:'20px 0'}}>Esta crônica ainda não possui narrativa.</div>}
                      {(entry.imagens||[]).length>0&&(<div style={{display:'flex',flexDirection:'column',gap:12,marginTop:8}}><div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',textTransform:'uppercase',marginBottom:4}}>Imagens</div>{entry.imagens.map((img,idx)=>(<div key={idx} style={{borderRadius:10,overflow:'hidden',border:'1px solid rgba(255,255,255,0.07)'}}><img src={img} alt="" style={{width:'100%',display:'block',objectFit:'contain',background:'rgba(0,0,0,0.3)'}}/></div>))}</div>)}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </>)}
      </>)}

      {/* ── ABA OVA(s) ── */}
      {subTab === 'ovas' && (<>
        <div style={{marginBottom:20,padding:'12px 18px',border:'1px solid rgba(168,85,247,0.15)',borderRadius:10,background:'rgba(168,85,247,0.04)',fontFamily:"'Crimson Text',Georgia,serif",fontSize:14,color:'#9A8A9A',lineHeight:1.8,fontStyle:'italic',textAlign:'center'}}>
          "Histórias paralelas — episódios que acontecem fora das mesas principais, mas que fazem parte do mesmo mundo."
        </div>
        {!ovasLoaded && <div style={{textAlign:'center',color:'#5A5070',fontFamily:'Cinzel,serif',fontSize:13,padding:40}}>Carregando OVAs...</div>}
        {ovasLoaded && (<>
          {masterMode && (
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:18}}>
              <button onClick={addOva} style={{padding:'8px 20px',borderRadius:8,border:'1px solid rgba(168,85,247,0.4)',background:'rgba(168,85,247,0.1)',color:'#C8A8E8',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12,letterSpacing:'0.08em'}}>{'\uD83C\uDFAC'} + Nova OVA</button>
            </div>
          )}
          {ovas.length===0&&(<div style={{textAlign:'center',padding:38,border:'1px dashed rgba(168,85,247,0.15)',borderRadius:12}}><div style={{fontSize:30,marginBottom:10}}>{'\uD83C\uDFAC'}</div><div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#6A5A7A'}}>Nenhuma OVA registrada.</div><div style={{fontSize:12,marginTop:5,color:'#4A4050'}}>{masterMode?'Clique em "+ Nova OVA" para começar.':'Aguarde o Mestre adicionar histórias paralelas.'}</div></div>)}
          {ovas.map(ova=>(
            <div key={ova.id} style={{border:'1px solid rgba(168,85,247,0.18)',borderRadius:11,marginBottom:11,overflow:'hidden',background:'rgba(10,8,22,0.88)'}}>
              <div onClick={()=>setOpenOva(openOva===ova.id?null:ova.id)} style={{padding:'13px 17px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',userSelect:'none'}}>
                <span style={{fontSize:15}}>{'\uD83C\uDFAC'}</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#C8A8E8',fontWeight:600}}>{ova.titulo||'(Sem título)'}</div>
                  <div style={{fontSize:11,color:'#5A5070',marginTop:2,display:'flex',gap:10,flexWrap:'wrap'}}>
                    {ova.episodio&&<span style={{color:'#7B6D8A',fontFamily:'Cinzel,serif'}}>Ep. {ova.episodio}</span>}
                    <span>{ova.data}</span>
                    {ova.conteudo&&<span style={{color:'#4A4050'}}>{ova.conteudo.split(' ').length} palavras</span>}
                    {(ova.imagens||[]).length>0&&<span style={{color:'#4A4050'}}>🖼 {ova.imagens.length}</span>}
                  </div>
                </div>
                <div style={{display:'flex',gap:7}}>
                  {masterMode&&<button onClick={e=>{e.stopPropagation();delOva(ova.id);}} style={{background:'rgba(232,25,60,0.09)',border:'1px solid rgba(232,25,60,0.22)',color:'#E8193C',borderRadius:5,cursor:'pointer',padding:'3px 8px',fontSize:11}}>✕</button>}
                  <span style={{color:'rgba(168,85,247,0.4)',fontSize:11,transform:openOva===ova.id?'rotate(90deg)':'none',transition:'transform 0.3s',display:'flex',alignItems:'center'}}>▶</span>
                </div>
              </div>
              {openOva===ova.id&&(
                <div style={{padding:'0 17px 17px',borderTop:'1px solid rgba(168,85,247,0.1)',animation:'pageTurn 0.3s ease'}}>
                  <div style={{height:11}}/>
                  {masterMode ? (
                    <>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 80px',gap:9,marginBottom:11}}>
                        <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Título da OVA</label><input value={ova.titulo||''} onChange={e=>updOva(ova.id,{...ova,titulo:e.target.value})} placeholder="Ex: A Noite dos Laranjais..." style={{width:'100%'}}/></div>
                        <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Ep.</label><input value={ova.episodio||''} onChange={e=>updOva(ova.id,{...ova,episodio:e.target.value})} placeholder="Nº" style={{width:'100%'}}/></div>
                      </div>
                      <div style={{marginBottom:11}}><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Narrativa</label><textarea value={ova.conteudo||''} onChange={e=>updOva(ova.id,{...ova,conteudo:e.target.value})} rows={10} style={{width:'100%',resize:'vertical',lineHeight:1.85}}/></div>
                      <div style={{marginBottom:10}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:9}}>
                          <label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',textTransform:'uppercase'}}>Imagens</label>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{fontSize:10,color:'#4A4050',fontFamily:'Cinzel,serif'}}>{(ova.imagens||[]).length}/6</span>
                            <button onClick={()=>ovaInputRefs.current[ova.id]?.click()} style={{padding:'5px 12px',borderRadius:7,border:'1px solid rgba(168,85,247,0.3)',background:'rgba(168,85,247,0.08)',color:'#C8A8E8',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:11}}>🖼 Adicionar</button>
                            <input ref={el=>ovaInputRefs.current[ova.id]=el} type="file" accept="image/*" onChange={e=>{if(e.target.files[0])addOvaImage(ova,e.target.files[0]);e.target.value='';}} style={{display:'none'}}/>
                          </div>
                        </div>
                        {(ova.imagens||[]).length>0?<div style={{display:'flex',flexDirection:'column',gap:10}}>{ova.imagens.map((img,idx)=>(<div key={idx} style={{position:'relative',borderRadius:10,overflow:'hidden',border:'1px solid rgba(255,255,255,0.08)'}}><img src={img} alt="" style={{width:'100%',display:'block',objectFit:'contain',background:'rgba(0,0,0,0.3)'}}/><button onClick={()=>removeOvaImage(ova,idx)} style={{position:'absolute',top:8,right:8,background:'rgba(232,25,60,0.85)',border:'none',color:'#fff',borderRadius:6,cursor:'pointer',padding:'4px 9px',fontSize:12}}>✕</button></div>))}</div>:<div style={{padding:12,borderRadius:10,border:'1px dashed rgba(255,255,255,0.06)',color:'#5A5070',textAlign:'center',fontSize:11,fontFamily:'Cinzel,serif'}}>Nenhuma imagem. (máx 6)</div>}
                      </div>
                      <div style={{fontSize:11,color:'#4A4050',textAlign:'right',fontFamily:'Cinzel,serif'}}>{(ova.conteudo||'').length} caracteres · salvo automaticamente</div>
                    </>
                  ) : (
                    <>
                      {(ova.titulo||ova.episodio)&&(<div style={{marginBottom:16,paddingBottom:14,borderBottom:'1px solid rgba(168,85,247,0.1)'}}>{ova.titulo&&<div style={{fontFamily:'Cinzel,serif',fontSize:16,color:'#C8A8E8',fontWeight:700,marginBottom:4}}>{ova.titulo}</div>}<div style={{display:'flex',gap:14,flexWrap:'wrap'}}>{ova.episodio&&<span style={{fontSize:11,color:'#7B6D8A',fontFamily:'Cinzel,serif'}}>Episódio {ova.episodio}</span>}<span style={{fontSize:11,color:'#5A5070',fontFamily:'Cinzel,serif'}}>{ova.data}</span></div></div>)}
                      {ova.conteudo?<div style={{fontSize:15,color:'#B0A090',lineHeight:1.95,whiteSpace:'pre-wrap',fontFamily:"'Crimson Text',Georgia,serif",marginBottom:16}}>{ova.conteudo}</div>:<div style={{fontSize:13,color:'#4A4050',fontStyle:'italic',fontFamily:'Cinzel,serif',marginBottom:16,textAlign:'center',padding:'20px 0'}}>Esta OVA ainda não possui narrativa.</div>}
                      {(ova.imagens||[]).length>0&&(<div style={{display:'flex',flexDirection:'column',gap:12,marginTop:8}}>{ova.imagens.map((img,idx)=>(<div key={idx} style={{borderRadius:10,overflow:'hidden',border:'1px solid rgba(255,255,255,0.07)'}}><img src={img} alt="" style={{width:'100%',display:'block',objectFit:'contain',background:'rgba(0,0,0,0.3)'}}/></div>))}</div>)}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </>)}
      </>)}
      {/* ── ABA ECOM⚡ ── */}
      {subTab === 'ecom' && (<>
        <div style={{marginBottom:20,padding:'12px 18px',border:'1px solid rgba(255,107,53,0.2)',borderRadius:10,background:'rgba(255,107,53,0.04)',fontFamily:"'Crimson Text',Georgia,serif",fontSize:14,color:'#9A8A9A',lineHeight:1.8,fontStyle:'italic',textAlign:'center'}}>
          "Mesa spin-off — histórias do universo E que acontecem em uma linha narrativa própria."
        </div>
        {!ecomLoaded && <div style={{textAlign:'center',color:'#5A5070',fontFamily:'Cinzel,serif',fontSize:13,padding:40}}>Carregando...</div>}
        {ecomLoaded && (<>
          {masterMode && (
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:18}}>
              <button onClick={addEcom} style={{padding:'8px 20px',borderRadius:8,border:'1px solid rgba(255,107,53,0.4)',background:'rgba(255,107,53,0.1)',color:'#FF6B35',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12,letterSpacing:'0.08em'}}>
                E \u26A1 + Nova Entrada
              </button>
            </div>
          )}
          {ecom.length===0&&(
            <div style={{textAlign:'center',padding:38,border:'1px dashed rgba(255,107,53,0.2)',borderRadius:12}}>
              <div style={{fontSize:30,marginBottom:10}}>\u26A1</div>
              <div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#6A5A7A'}}>Nenhuma história registrada.</div>
              <div style={{fontSize:12,marginTop:5,color:'#4A4050'}}>{masterMode?'Clique em "+ Nova Entrada" para começar.':'Aguarde o Mestre adicionar histórias.'}</div>
            </div>
          )}
          {ecom.map(entry=>(
            <div key={entry.id} style={{border:'1px solid rgba(255,107,53,0.22)',borderRadius:11,marginBottom:11,overflow:'hidden',background:'rgba(14,8,4,0.9)'}}>
              <div onClick={()=>setOpenEcom(openEcom===entry.id?null:entry.id)} style={{padding:'13px 17px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',userSelect:'none'}}>
                <span style={{fontSize:15}}>\u26A1</span>
                <div style={{flex:1}}>
                  <div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#FF6B35',fontWeight:600}}>{entry.titulo||'(Sem título)'}</div>
                  <div style={{fontSize:11,color:'#5A5070',marginTop:2,display:'flex',gap:10,flexWrap:'wrap'}}>
                    {entry.episodio&&<span style={{color:'#FF6B35AA',fontFamily:'Cinzel,serif'}}>Ep. {entry.episodio}</span>}
                    <span>{entry.data}</span>
                    {entry.conteudo&&<span style={{color:'#4A4050'}}>{entry.conteudo.split(' ').length} palavras</span>}
                    {(entry.imagens||[]).length>0&&<span style={{color:'#4A4050'}}>🖼 {entry.imagens.length}</span>}
                  </div>
                </div>
                <div style={{display:'flex',gap:7}}>
                  {masterMode&&<button onClick={e=>{e.stopPropagation();delEcom(entry.id);}} style={{background:'rgba(232,25,60,0.09)',border:'1px solid rgba(232,25,60,0.22)',color:'#E8193C',borderRadius:5,cursor:'pointer',padding:'3px 8px',fontSize:11}}>✕</button>}
                  <span style={{color:'rgba(255,107,53,0.4)',fontSize:11,transform:openEcom===entry.id?'rotate(90deg)':'none',transition:'transform 0.3s',display:'flex',alignItems:'center'}}>▶</span>
                </div>
              </div>
              {openEcom===entry.id&&(
                <div style={{padding:'0 17px 17px',borderTop:'1px solid rgba(255,107,53,0.15)',animation:'pageTurn 0.3s ease'}}>
                  <div style={{height:11}}/>
                  {masterMode ? (
                    <>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 80px',gap:9,marginBottom:11}}>
                        <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Título</label><input value={entry.titulo||''} onChange={e=>updEcom(entry.id,{...entry,titulo:e.target.value})} placeholder="Nome desta história..." style={{width:'100%'}}/></div>
                        <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Ep.</label><input value={entry.episodio||''} onChange={e=>updEcom(entry.id,{...entry,episodio:e.target.value})} placeholder="Nº" style={{width:'100%'}}/></div>
                      </div>
                      <div style={{marginBottom:11}}><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Narrativa</label><textarea value={entry.conteudo||''} onChange={e=>updEcom(entry.id,{...entry,conteudo:e.target.value})} rows={10} style={{width:'100%',resize:'vertical',lineHeight:1.85}}/></div>
                      <div style={{marginBottom:10}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:9}}>
                          <label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',textTransform:'uppercase'}}>Imagens</label>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{fontSize:10,color:'#4A4050',fontFamily:'Cinzel,serif'}}>{(entry.imagens||[]).length}/6</span>
                            <button onClick={()=>ecomInputRefs.current[entry.id]?.click()} style={{padding:'5px 12px',borderRadius:7,border:'1px solid rgba(255,107,53,0.3)',background:'rgba(255,107,53,0.08)',color:'#FF6B35',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:11}}>🖼 Adicionar</button>
                            <input ref={el=>ecomInputRefs.current[entry.id]=el} type="file" accept="image/*" onChange={e=>{if(e.target.files[0])addEcomImage(entry,e.target.files[0]);e.target.value='';}} style={{display:'none'}}/>
                          </div>
                        </div>
                        {(entry.imagens||[]).length>0?<div style={{display:'flex',flexDirection:'column',gap:10}}>{entry.imagens.map((img,idx)=>(<div key={idx} style={{position:'relative',borderRadius:10,overflow:'hidden',border:'1px solid rgba(255,255,255,0.08)'}}><img src={img} alt="" style={{width:'100%',display:'block',objectFit:'contain',background:'rgba(0,0,0,0.3)'}}/><button onClick={()=>removeEcomImage(entry,idx)} style={{position:'absolute',top:8,right:8,background:'rgba(232,25,60,0.85)',border:'none',color:'#fff',borderRadius:6,cursor:'pointer',padding:'4px 9px',fontSize:12}}>✕</button></div>))}</div>:<div style={{padding:12,borderRadius:10,border:'1px dashed rgba(255,255,255,0.06)',color:'#5A5070',textAlign:'center',fontSize:11,fontFamily:'Cinzel,serif'}}>Nenhuma imagem. (máx 6)</div>}
                      </div>
                      <div style={{fontSize:11,color:'#4A4050',textAlign:'right',fontFamily:'Cinzel,serif'}}>{(entry.conteudo||'').length} caracteres · salvo automaticamente</div>
                    </>
                  ) : (
                    <>
                      {(entry.titulo||entry.episodio)&&(<div style={{marginBottom:16,paddingBottom:14,borderBottom:'1px solid rgba(255,107,53,0.15)'}}>{entry.titulo&&<div style={{fontFamily:'Cinzel,serif',fontSize:16,color:'#FF6B35',fontWeight:700,marginBottom:4}}>{entry.titulo}</div>}<div style={{display:'flex',gap:14,flexWrap:'wrap'}}>{entry.episodio&&<span style={{fontSize:11,color:'#FF6B35AA',fontFamily:'Cinzel,serif'}}>Episódio {entry.episodio}</span>}<span style={{fontSize:11,color:'#5A5070',fontFamily:'Cinzel,serif'}}>{entry.data}</span></div></div>)}
                      {entry.conteudo?<div style={{fontSize:15,color:'#B0A090',lineHeight:1.95,whiteSpace:'pre-wrap',fontFamily:"'Crimson Text',Georgia,serif",marginBottom:16}}>{entry.conteudo}</div>:<div style={{fontSize:13,color:'#4A4050',fontStyle:'italic',fontFamily:'Cinzel,serif',marginBottom:16,textAlign:'center',padding:'20px 0'}}>Esta história ainda não possui narrativa.</div>}
                      {(entry.imagens||[]).length>0&&(<div style={{display:'flex',flexDirection:'column',gap:12,marginTop:8}}>{entry.imagens.map((img,idx)=>(<div key={idx} style={{borderRadius:10,overflow:'hidden',border:'1px solid rgba(255,255,255,0.07)'}}><img src={img} alt="" style={{width:'100%',display:'block',objectFit:'contain',background:'rgba(0,0,0,0.3)'}}/></div>))}</div>)}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </>)}
      </>)}
    </div>
  );
}
// ─── CENÁRIOS ─────────────────────────────────────────────────────────────────
const newCenario=id=>({id,nome:'',descricao:'',mapa:'',data:new Date().toLocaleDateString('pt-BR')});

function CenariosSection({masterMode}){
  const[cenarios,setCenarios]=useState([]);const[loaded,setLoaded]=useState(false);const[open,setOpen]=useState(null);const saveTimeout=useRef({});
  useEffect(()=>{const unsub=onSnapshot(collection(db,'cenarios'),snap=>{const data=snap.docs.map(d=>({id:d.id,...d.data()}));data.sort((a,b)=>b.id-a.id);setCenarios(data);setLoaded(true);});return()=>unsub();},[]);
  const save=c=>{clearTimeout(saveTimeout.current[c.id]);saveTimeout.current[c.id]=setTimeout(async()=>{try{await setDoc(doc(db,'cenarios',String(c.id)),c);}catch(e){console.error(e);}},800);};
  const add=()=>{const c=newCenario(Date.now());setDoc(doc(db,'cenarios',String(c.id)),c);setOpen(c.id);};
  const upd=(id,data)=>{setCenarios(prev=>prev.map(c=>c.id===id?data:c));save(data);};
  const del=async id=>{await deleteDoc(doc(db,'cenarios',String(id)));if(open===id)setOpen(null);};
  const handleMap=async(c,e)=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=async ev=>{const compressed=await compressImage(ev.target.result,1200,1200,0.75);upd(c.id,{...c,mapa:compressed});};reader.readAsDataURL(file);e.target.value='';};
  const mapRefs=useRef({});
  return(
    <div style={{maxWidth:800,margin:'0 auto',padding:'40px 16px 80px'}}>
      <div style={{textAlign:'center',marginBottom:28}}><div style={{fontSize:11,letterSpacing:'0.4em',color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:13,textTransform:'uppercase'}}>Os Lugares de Cosmum</div><h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:23,color:'#E8D8C0',fontWeight:700,margin:0}}>Cenários Explorados</h2><div style={{fontSize:12,color:'#4A4050',marginTop:9,fontFamily:'Cinzel,serif'}}>Registre os mapas e locais por onde os personagens passaram</div><div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(168,85,247,0.5),transparent)',margin:'16px auto 0'}}/></div>
      {!loaded&&<div style={{textAlign:'center',color:'#5A5070',fontFamily:'Cinzel,serif',fontSize:13,padding:40}}>Conectando ao cosmos...</div>}
      {loaded&&(<>
{masterMode && (
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:18}}>
            <button onClick={add} style={{padding:'8px 20px',borderRadius:8,border:'1px solid rgba(168,85,247,0.4)',background:'rgba(168,85,247,0.1)',color:'#C8A8E8',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12,letterSpacing:'0.08em'}}>+ Nova Crônica</button>
          </div>
        )}
        {cenarios.length===0&&(<div style={{textAlign:'center',padding:44,border:'1px dashed rgba(255,255,255,0.06)',borderRadius:14}}><div style={{fontSize:32,marginBottom:10,opacity:0.3}}>🗺️</div><div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#6A5A7A'}}>Nenhum cenário registrado.</div></div>)}
        {cenarios.map(c=>(
          <div key={c.id} style={{border:'1px solid rgba(168,85,247,0.14)',borderRadius:14,marginBottom:14,overflow:'hidden',background:'rgba(8,10,22,0.9)'}}>
            <div onClick={()=>setOpen(open===c.id?null:c.id)} style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',userSelect:'none'}}>
              {c.mapa?<img src={c.mapa} alt="" style={{width:54,height:40,borderRadius:7,objectFit:'cover',flexShrink:0,border:'1px solid rgba(168,85,247,0.25)'}}/>:<div style={{width:54,height:40,borderRadius:7,background:'rgba(168,85,247,0.06)',border:'1px dashed rgba(168,85,247,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🗺️</div>}
              <div style={{flex:1,minWidth:0}}><div style={{fontFamily:'Cinzel,serif',fontSize:13,fontWeight:700,color:'#C8A8E8',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.nome||'(Sem nome)'}</div><div style={{fontSize:11,color:'#5A5070',marginTop:2,fontFamily:'Cinzel,serif'}}>{c.data}</div></div>
              <div style={{display:'flex',gap:7}}>{masterMode&&<button onClick={e=>{e.stopPropagation();del(c.id);}} style={{background:'rgba(232,25,60,0.09)',border:'1px solid rgba(232,25,60,0.22)',color:'#E8193C',borderRadius:5,cursor:'pointer',padding:'3px 8px',fontSize:11}}>✕</button>}<span style={{color:'rgba(168,85,247,0.4)',fontSize:11,transform:open===c.id?'rotate(90deg)':'none',transition:'transform 0.3s',display:'flex',alignItems:'center'}}>▶</span></div>
            </div>
            {open===c.id&&(
              <div style={{borderTop:'1px solid rgba(168,85,247,0.1)',animation:'pageTurn 0.3s ease'}}>
                {c.mapa&&(<div style={{position:'relative',cursor:'pointer'}} onClick={()=>mapRefs.current[c.id]?.click()}><img src={c.mapa} alt="mapa" style={{width:'100%',display:'block',maxHeight:500,objectFit:'contain',background:'rgba(0,0,0,0.4)'}}/><div style={{position:'absolute',top:10,right:10,padding:'4px 10px',borderRadius:6,background:'rgba(0,0,0,0.6)',border:'1px solid rgba(168,85,247,0.3)',color:'#C8A8E8',fontFamily:'Cinzel,serif',fontSize:10,cursor:'pointer',letterSpacing:'0.08em'}}>🗺 Trocar mapa</div></div>)}
                <input ref={el=>mapRefs.current[c.id]=el} type="file" accept="image/*" onChange={e=>handleMap(c,e)} style={{display:'none'}}/>
                <div style={{padding:'16px 18px',display:'flex',flexDirection:'column',gap:13}}>
                  {!c.mapa&&(<div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:8,textTransform:'uppercase'}}>Mapa do Cenário</label><div onClick={()=>mapRefs.current[c.id]?.click()} style={{padding:'30px',borderRadius:10,border:'1px dashed rgba(168,85,247,0.25)',background:'rgba(168,85,247,0.03)',textAlign:'center',cursor:'pointer'}}><div style={{fontSize:28,marginBottom:8,opacity:0.3}}>🗺️</div><div style={{fontSize:12,color:'rgba(255,255,255,0.25)',fontFamily:'Cinzel,serif',letterSpacing:'0.08em'}}>Toque para adicionar o mapa do cenário</div></div></div>)}
                  <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Nome do Cenário</label><input value={c.nome||''} onChange={e=>upd(c.id,{...c,nome:e.target.value})} placeholder="Ex: A Taverna dos Três Mundos..." style={{width:'100%'}}/></div>
                  <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Descrição & Notas</label><textarea value={c.descricao||''} onChange={e=>upd(c.id,{...c,descricao:e.target.value})} rows={5} style={{width:'100%',resize:'vertical',lineHeight:1.85}}/></div>
                  <div style={{fontSize:11,color:'#4A4050',textAlign:'right',fontFamily:'Cinzel,serif'}}>salvo automaticamente</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </>)}
    </div>
  );
}

// ─── APP E NAVEGAÇÃO PRINCIPAL ────────────────────────────────────────────────
const TABS=[
  {id:'prologo',    label:'Prólogo',            icon:'📜'},
  {id:'classes',    label:'Classes',            icon:'⚔️'},
  {id:'fichas',     label:'Fichas',             icon:'📋'},
  {id:'personagens',label:'Personagens',        icon:'👤'},  // ← NOVO
  {id:'inimigos',   label:'Inimigos',           icon:'💀'},
  {id:'bestiario',  label:'Bestiário',          icon:'🐉'},
  {id:'regras',     label:'Regras',             icon:'📖'},
  {id:'livro',      label:'Livro da Mandíbula', icon:'✦'},
  {id:'cronicas',   label:'Crônicas',           icon:'🗒️'},
  {id:'mapamundi',  label:'Mapa Múndi',         icon:'🌍'},
  {id:'mapabatalha',label:'Mapa de Batalha',    icon:'🗡️'},
];

function MasterToggle({masterMode,setMasterMode}){
  const[showInput,setShowInput]=useState(false);const[pin,setPin]=useState('');const[shake,setShake]=useState(false);
  const tryUnlock=()=>{if(pin.toLowerCase()===MASTER_PIN){setMasterMode(true);setShowInput(false);setPin('');}else{setShake(true);setTimeout(()=>setShake(false),500);setPin('');}};
  if(masterMode)return(<button onClick={()=>setMasterMode(false)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(232,25,60,0.4)',background:'rgba(232,25,60,0.12)',color:'#E8193C',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.08em',animation:'pulse 2s ease-in-out infinite'}}>🔴 MESTRE</button>);
  return(<div style={{display:'flex',alignItems:'center',gap:6}}>{showInput&&(<div style={{display:'flex',gap:5}}><input type="password" value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==='Enter'&&tryUnlock()} placeholder="senha..." autoFocus style={{width:80,padding:'3px 7px',fontSize:12,border:`1px solid ${shake?'rgba(232,25,60,0.6)':'rgba(255,255,255,0.15)'}`,transition:'border-color 0.3s'}}/><button onClick={tryUnlock} style={{padding:'3px 8px',borderRadius:5,border:'1px solid rgba(168,85,247,0.3)',background:'rgba(168,85,247,0.1)',color:'#C8A8E8',cursor:'pointer',fontSize:11}}>✓</button><button onClick={()=>{setShowInput(false);setPin('');}} style={{padding:'3px 7px',borderRadius:5,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'#5A5070',cursor:'pointer',fontSize:11}}>✕</button></div>)}{!showInput&&(<button onClick={()=>setShowInput(true)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.03)',color:'#5A5070',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.08em'}}>🔒 Mestre</button>)}</div>);
}

function PlayerCombatBanner() {
  const [combat, setCombat] = useState({ active: false });
  const [log, setLog] = useState([]);
  const [lastDice, setLastDice] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const u1 = onSnapshot(doc(db, 'config', 'combat'), snap => {
      if (snap.exists()) setCombat(snap.data());
    });
    const u2 = onSnapshot(doc(db, 'config', 'combat_state'), snap => {
      if (snap.exists() && snap.data().log) setLog(snap.data().log.slice(-8));
    });
    const u3 = onSnapshot(doc(db, 'config', 'combat_dice'), snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (d.ts && Date.now() - d.ts < 15000) setLastDice(d);
    });
    return () => { u1(); u2(); u3(); };
  }, []);

  if (!combat.active) return null;

  const color = combat.currentColor || '#E8193C';

  return (
    <div style={{
      position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)',
      zIndex: 200, maxWidth: 'calc(100vw - 32px)', width: 380,
    }}>
      {/* PAINEL EXPANDIDO — aparece acima do banner */}
      {expanded && (
        <div style={{
          background: 'rgba(6,8,20,0.98)', border: `1px solid ${color}44`,
          borderRadius: 14, padding: '14px 18px', marginBottom: 8,
          backdropFilter: 'blur(14px)',
          boxShadow: `0 4px 28px rgba(0,0,0,0.8), 0 0 20px ${color}18`,
          animation: 'pageTurn 0.3s ease',
          maxHeight: 280, overflowY: 'auto',
        }}>
          <div style={{
            fontSize: 9, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.22)',
            fontFamily: 'Cinzel,serif', marginBottom: 10, textTransform: 'uppercase',
          }}>
            📜 Registro do Combate — Rodada {combat.round || 1}
          </div>

          {/* Dado mais recente */}
          {lastDice && (
            <div style={{
              marginBottom: 10, padding: '8px 12px', borderRadius: 10,
              background: lastDice.isCrit ? 'rgba(74,222,128,0.08)' : lastDice.isFail ? 'rgba(232,25,60,0.08)' : 'rgba(168,85,247,0.06)',
              border: `1px solid ${lastDice.isCrit ? 'rgba(74,222,128,0.3)' : lastDice.isFail ? 'rgba(232,25,60,0.3)' : 'rgba(168,85,247,0.2)'}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>🎲</span>
              <div>
                <div style={{
                  fontFamily: 'Cinzel,serif', fontSize: 20, fontWeight: 900, lineHeight: 1,
                  color: lastDice.isCrit ? '#4ADE80' : lastDice.isFail ? '#E8193C' : '#C8A8E8',
                }}>{lastDice.total}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Cinzel,serif' }}>
                  D{lastDice.sides}{lastDice.bonus ? ` +${lastDice.bonus}` : ''} · {lastDice.roller}
                  {lastDice.isCrit && <span style={{ color: '#4ADE80', marginLeft: 6 }}>🌟 CRÍTICO!</span>}
                  {lastDice.isFail && <span style={{ color: '#E8193C', marginLeft: 6 }}>💀 FALHA!</span>}
                </div>
              </div>
            </div>
          )}

          {/* Log de ações */}
          {log.length === 0 ? (
            <div style={{ fontSize: 12, color: '#4A4050', fontFamily: 'Cinzel,serif', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
              Nenhuma ação registrada ainda.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[...log].reverse().map((entry, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '5px 8px', borderRadius: 7,
                  background: i === 0 ? `${entry.color}14` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${i === 0 ? entry.color + '33' : 'rgba(255,255,255,0.04)'}`,
                  opacity: i === 0 ? 1 : Math.max(0.3, 1 - i * 0.12),
                }}>
                  <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{entry.icon}</span>
                  <span style={{
                    fontSize: 12, fontFamily: 'Cinzel,serif', lineHeight: 1.5, flex: 1,
                    color: i === 0 ? entry.color : 'rgba(200,184,160,0.5)',
                  }}>{entry.msg}</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', flexShrink: 0 }}>R{entry.round}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BANNER PRINCIPAL — sempre visível */}
      <div
        onClick={() => setExpanded(o => !o)}
        style={{
          background: 'rgba(6,8,20,0.97)', border: `1px solid ${color}55`,
          borderRadius: 16, padding: '10px 18px',
          display: 'flex', alignItems: 'center', gap: 10,
          backdropFilter: 'blur(14px)', cursor: 'pointer',
          boxShadow: `0 4px 24px rgba(0,0,0,0.7), 0 0 20px ${color}22`,
          transition: 'all 0.2s', userSelect: 'none',
        }}
      >
        <span style={{ animation: 'turnArrow 0.6s ease-in-out infinite alternate', fontSize: 14, color, flexShrink: 0 }}>▶</span>
        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.28)', fontFamily: 'Cinzel,serif' }}>
            RD {combat.round || 1} · {' '}
          </span>
          <span style={{ fontSize: 13, fontFamily: 'Cinzel,serif', fontWeight: 700, color }}>
            {combat.currentNome || '...'}
          </span>
        </div>
        <span style={{
          fontSize: 8, fontFamily: 'Cinzel,serif', letterSpacing: '0.12em',
          color: combat.currentType === 'enemy' ? '#FF6666' : '#4ADE80',
          background: combat.currentType === 'enemy' ? 'rgba(255,68,68,0.12)' : 'rgba(74,222,128,0.12)',
          border: `1px solid ${combat.currentType === 'enemy' ? 'rgba(255,68,68,0.3)' : 'rgba(74,222,128,0.3)'}`,
          borderRadius: 4, padding: '2px 7px', flexShrink: 0,
        }}>
          {combat.currentType === 'enemy' ? 'INIMIGO' : 'ALIADO'}
        </span>
        {lastDice && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px',
            borderRadius: 8, flexShrink: 0,
            background: lastDice.isCrit ? 'rgba(74,222,128,0.1)' : lastDice.isFail ? 'rgba(232,25,60,0.1)' : 'rgba(168,85,247,0.08)',
            border: `1px solid ${lastDice.isCrit ? 'rgba(74,222,128,0.3)' : lastDice.isFail ? 'rgba(232,25,60,0.3)' : 'rgba(168,85,247,0.2)'}`,
          }}>
            <span style={{ fontSize: 11 }}>🎲</span>
            <span style={{
              fontFamily: 'Cinzel,serif', fontSize: 14, fontWeight: 900,
              color: lastDice.isCrit ? '#4ADE80' : lastDice.isFail ? '#E8193C' : '#C8A8E8',
            }}>{lastDice.total}</span>
          </div>
        )}
        <span style={{
          fontSize: 11, color: `${color}66`, flexShrink: 0,
          transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s',
        }}>▲</span>
      </div>
    </div>
  );
}
// ─── 🎲 OVERLAY PÚBLICO DE DADO (visível para todos, fora do combate) ──────
function PublicDiceOverlay() {
  const [result, setResult] = useState(null);
  const [visible, setVisible] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hideTimer = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'combat_dice'), snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (!d.ts || Date.now() - d.ts > 12000) return;
      setResult(d);
      setVisible(true);
      setRevealed(false);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), 7500);
    });
    return () => unsub();
  }, []);

  if (!visible || !result) return null;

  const isCrit = result.isCrit;
  const isFail = result.isFail;
  const color = isCrit ? '#4ADE80' : isFail ? '#E8193C' : '#C8A8E8';

  return (
    <div style={{
      position:'fixed', bottom: 80, right: 24, zIndex: 9995,
      background:'rgba(8,10,24,0.97)', border:`1px solid ${color}55`,
      borderRadius:16, padding:'16px 20px', minWidth:210,
      boxShadow:`0 6px 32px rgba(0,0,0,0.8), 0 0 24px ${color}33`,
      animation:'pageTurn 0.35s cubic-bezier(0.2,0.8,0.2,1) forwards',
      backdropFilter:'blur(12px)', textAlign:'center',
    }}>
      <div style={{fontSize:10,letterSpacing:'0.3em',color:'rgba(255,255,255,0.25)',fontFamily:'Cinzel,serif',marginBottom:10,textTransform:'uppercase'}}>
        🎲 {result.roller || 'Alguém'} rolou D{result.sides}
      </div>
      <DiceTrayVisual sides={result.sides} finalValue={result.base} rollTs={result.ts} color={color} onSettled={()=>setRevealed(true)} />
      <div style={{minHeight:44, display:'flex',alignItems:'baseline',justifyContent:'center',gap:10, marginTop:10, opacity:revealed?1:0, transition:'opacity 0.25s'}}>
        <span style={{fontFamily:'Cinzel Decorative,serif',fontSize:36,fontWeight:900,color,textShadow:`0 0 20px ${color}88`,lineHeight:1}}>{result.total}</span>
        <div style={{textAlign:'left'}}>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontFamily:'Cinzel,serif'}}>{result.bonus ? `${result.base} + ${result.bonus}` : `base ${result.base}`}</div>
          {(isCrit || isFail) && (
            <div style={{fontSize:10,fontFamily:'Cinzel,serif',color,fontWeight:700,letterSpacing:'0.06em'}}>
              {isCrit ? '🌟 CRÍTICO!' : '💀 FALHA!'}
            </div>
          )}
        </div>
      </div>
      <button onClick={()=>setVisible(false)} style={{position:'absolute',top:8,right:10,background:'none',border:'none',color:'rgba(255,255,255,0.2)',cursor:'pointer',fontSize:12}}>✕</button>
    </div>
  );
}

export default function App(){
  const[tab,setTab]=useState('prologo');
  const[masterMode,setMasterMode]=useState(false);
  const[atmosphere,setAtmosphere]=useState('neutro');

  useEffect(()=>{const s=document.createElement('style');s.textContent=GLOBAL_CSS;document.head.appendChild(s);return()=>s.remove();},[]);

  // Mantendo o sincronismo de atmosfera
  useEffect(()=>{
    const unsub=onSnapshot(doc(db,'config','atmosphere'),snap=>{
      if(snap.exists()) setAtmosphere(snap.data().key||'neutro');
    });
    return()=>unsub();
  },[]);

  const handleSetAtmosphere = async (key) => {
    setAtmosphere(key);
    try { await setDoc(doc(db,'config','atmosphere'),{key}); } catch(e){}
  };

  const atm = ATMOSPHERES[atmosphere] || ATMOSPHERES.neutro;
  const lockPageScroll = tab === 'mapabatalha';

  return(
    <div style={{height:'100vh',overflow:'hidden',display:'flex',flexDirection:'column',background:atm.bg,color:'#C8B8A0',fontFamily:"'Crimson Text',Georgia,serif",position:'relative',transition:'background 1.2s'}}>
      <StarField atmosphere={atmosphere}/>
      <ToastContainer/>
      <PublicDiceOverlay />
      <header style={{position:'relative',zIndex:10,borderBottom:'1px solid rgba(255,255,255,0.05)',background:'linear-gradient(180deg,rgba(4,6,15,0.98),rgba(4,6,15,0.92))',backdropFilter:'blur(8px)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px 10px'}}>
          {/* Espaçador para o widget no desktop/mobile não sobrepor o título */}
          <div style={{width:80}}/>
          <div style={{textAlign:'center',flex:1}}>
            <div className="header-sub" style={{fontSize:9,letterSpacing:'0.5em',color:'#4A3A5A',fontFamily:'Cinzel,serif',marginBottom:4,textTransform:'uppercase'}}>Cosmum · O Livro da Mandíbula · Vigor Cósmico</div>
            <h1 className="header-title" style={{fontFamily:'Cinzel Decorative,serif',fontSize:22,fontWeight:900,margin:0,letterSpacing:'0.08em',background:'linear-gradient(135deg,#C8A8E8,#E8D8C0,#A855F7)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Dinastia E</h1>
            <div className="header-sub" style={{fontSize:10,color:'#4A3A5A',fontFamily:'Cinzel,serif',marginTop:2,letterSpacing:'0.15em'}}>Livro do Mundo</div>
          </div>
          <div style={{width:80,display:'flex',justifyContent:'flex-end'}}>
            <MasterToggle masterMode={masterMode} setMasterMode={setMasterMode}/>
          </div>
        </div>
      </header>
      <nav style={{position:'relative',zIndex:10,display:'flex',justifyContent:'center',gap:3,padding:'9px 14px',background:'rgba(4,6,15,0.9)',borderBottom:'1px solid rgba(255,255,255,0.04)',flexWrap:'wrap'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'6px 12px',borderRadius:6,cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:'0.06em',border:tab===t.id?`1px solid ${atm.accent}66`:'1px solid transparent',background:tab===t.id?`${atm.accent}14`:'transparent',color:tab===t.id?atm.accent:'#5A4A6A',transition:'all 0.3s'}}>
            {t.icon} {t.label}
          </button>
        ))}
      </nav>
      <main className={lockPageScroll ? 'main-locked' : ''} style={{flex:1,overflowY: lockPageScroll ? 'hidden' : 'auto',position:'relative',zIndex:10,scrollBehavior:'smooth', display: lockPageScroll ? 'flex' : 'block', flexDirection:'column'}}>
        <div key={tab} style={lockPageScroll ? {animation:'pageTurn 0.5s cubic-bezier(0.2,0.8,0.2,1)', flex:1, minHeight:0, display:'flex', flexDirection:'column'} : {animation:'pageTurn 0.5s cubic-bezier(0.2,0.8,0.2,1)'}}>
          {tab==='prologo'&&<PrologueSection masterMode={masterMode}/>}
          {tab==='classes'&&<ClassesSection masterMode={masterMode}/>}
          {tab==='fichas'&&<SheetsSection masterMode={masterMode}/>}
          {tab==='personagens'&&<PersonagensSection masterMode={masterMode}/>}
          {tab==='inimigos'&&<EnemiesSection masterMode={masterMode}/>}
          {tab==='bestiario'&&<BestiarioSection masterMode={masterMode}/>}
          {tab==='regras'&&<RulesSection/>}
          {tab==='livro'&&<LibroSection masterMode={masterMode}/>}
          {tab==='cronicas'&&<CronicasSection masterMode={masterMode}/>}
          {tab==='mapamundi'&&<MapaMundiSection masterMode={masterMode}/>}
          {tab==='mapabatalha'&&<BattleMapSection masterMode={masterMode}/>}
        </div>
      </main>

      <AmbientSoundPlayer masterMode={masterMode} />
      <PlayerCombatBanner />
      <DiceWidget />
    </div>
  );
}
