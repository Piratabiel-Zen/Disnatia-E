import { lazy, Suspense, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./core/firebase";
import { ATMOSPHERES } from "./data/gameData";

import "./styles/global.css";
import "./styles/livro.css";

import StarField from "./shell/StarField";
import { ToastContainer } from "./core/toast";
import PublicDiceOverlay from "./shell/PublicDiceOverlay";
import ConnectionStatus from "./shell/ConnectionStatus";
import MasterToggle from "./shell/MasterToggle";
import AmbientSoundPlayer from "./shell/AmbientSoundPlayer";
import PlayerCombatBanner from "./shell/PlayerCombatBanner";
import DiceWidget from "./shell/DiceWidget";

// Cada aba vira um chunk independente. O browser baixa apenas o que a pessoa abre.
const pageLoaders = {
  prologo:      () => import("./features/prologue/ProloguePage"),
  classes:      () => import("./features/classes/ClassesPage"),
  fichas:       () => import("./features/sheets/SheetsPage"),
  personagens:  () => import("./features/personagens/PersonagensPage"),
  inimigos:     () => import("./features/inimigos/InimigosPage"),
  bestiario:    () => import("./features/bestiario/BestiarioPage"),
  regras:       () => import("./features/regras/RegrasPage"),
  livro:        () => import("./features/livro/LivroPage"),
  cronicas:     () => import("./features/cronicas/CronicasPage"),
  mapamundi:    () => import("./features/mapa-mundi/MapaMundiPage"),
  mapabatalha:  () => import("./features/mapa-batalha/BattleMapPage"),
};

const LazyPages = Object.fromEntries(
  Object.entries(pageLoaders).map(([key, loader]) => [key, lazy(loader)])
);

const TABS = [
  {id:'prologo',     label:'Prólogo',            icon:'📜'},
  {id:'classes',     label:'Classes',            icon:'⚔️'},
  {id:'fichas',      label:'Fichas',             icon:'📋'},
  {id:'personagens', label:'Personagens',        icon:'👤'},
  {id:'inimigos',    label:'Inimigos',           icon:'💀'},
  {id:'bestiario',   label:'Bestiário',          icon:'🐉'},
  {id:'regras',      label:'Regras',             icon:'📖'},
  {id:'livro',       label:'Livro da Mandíbula', icon:'✦'},
  {id:'cronicas',    label:'Crônicas',           icon:'🗒️'},
  {id:'mapamundi',   label:'Mapa Múndi',         icon:'🌍'},
  {id:'mapabatalha', label:'Mapa de Batalha',    icon:'🗡️'},
];

function PageSkeleton(){
  return (
    <div className="lazy-page-skeleton">
      <div><span className="lazy-page-dot"/> Abrindo registro...</div>
    </div>
  );
}

export default function App(){
  const [tab,setTab]=useState('prologo');
  const [masterMode,setMasterMode]=useState(false);
  const [atmosphere,setAtmosphere]=useState('neutro');

  // Único listener de atmosfera fica no shell global.
  useEffect(()=>{
    const unsub=onSnapshot(doc(db,'config','atmosphere'),snap=>{
      if(snap.exists()) setAtmosphere(snap.data().key||'neutro');
    });
    return()=>unsub();
  },[]);

  const atm = ATMOSPHERES[atmosphere] || ATMOSPHERES.neutro;
  const lockPageScroll = tab === 'mapabatalha';
  const ActivePage = LazyPages[tab] || LazyPages.prologo;

  // Pré-carrega a aba quando o usuário demonstra intenção (hover/foco/toque).
  const prefetch = id => {
    const loader = pageLoaders[id];
    if (loader) loader().catch(()=>{});
  };

  return(
    <div style={{height:'100vh',overflow:'hidden',display:'flex',flexDirection:'column',background:atm.bg,color:'#C8B8A0',fontFamily:"'Crimson Text',Georgia,serif",position:'relative',transition:'background 1.2s'}}>
      <StarField atmosphere={atmosphere}/>
      <ToastContainer/>
      <PublicDiceOverlay/>
      <ConnectionStatus/>

      <header style={{position:'relative',zIndex:10,borderBottom:'1px solid rgba(255,255,255,0.05)',background:'linear-gradient(180deg,rgba(8,3,18,0.99),rgba(5,2,12,0.95))',backdropFilter:'blur(8px)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px 10px'}}>
          <div style={{width:80}}/>
          <div style={{textAlign:'center',flex:1}}>
            <div className="header-sub" style={{fontSize:9,letterSpacing:'0.5em',color:'#4A3A5A',fontFamily:'Cinzel,serif',marginBottom:4,textTransform:'uppercase'}}>Cosmum · O Livro da Mandíbula · Vigor Cósmico</div>
            <h1 className="header-title" style={{fontFamily:'Cinzel Decorative,serif',fontSize:22,fontWeight:900,margin:0,letterSpacing:'0.08em',background:'linear-gradient(135deg,#C8A8E8,#E8D8C0,#A855F7)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Dinastia E</h1>
            <div className="header-sub" style={{fontSize:10,color:'#4A3A5A',fontFamily:'Cinzel,serif',marginTop:2,letterSpacing:'0.15em'}}>Livro do Mundo</div>
          </div>
          <div style={{width:180,display:'flex',justifyContent:'flex-end',alignItems:'center',gap:8}}>
            <MasterToggle masterMode={masterMode} setMasterMode={setMasterMode}/>
          </div>
        </div>
      </header>

      <nav style={{position:'relative',zIndex:10,display:'flex',justifyContent:'center',gap:3,padding:'9px 14px',background:'rgba(6,2,14,0.94)',borderBottom:'1px solid rgba(255,255,255,0.04)',flexWrap:'wrap'}}>
        {TABS.map(t=>(
          <button
            key={t.id}
            onClick={()=>setTab(t.id)}
            onMouseEnter={()=>prefetch(t.id)}
            onFocus={()=>prefetch(t.id)}
            onPointerDown={()=>prefetch(t.id)}
            style={{padding:'6px 12px',borderRadius:6,cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:'0.06em',border:tab===t.id?`1px solid ${atm.accent}66`:'1px solid transparent',background:tab===t.id?`${atm.accent}14`:'transparent',color:tab===t.id?atm.accent:'#5A4A6A',transition:'all 0.3s'}}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      <main className={lockPageScroll ? 'main-locked' : ''} style={{flex:1,overflowY:lockPageScroll?'hidden':'auto',position:'relative',zIndex:10,scrollBehavior:'smooth',display:lockPageScroll?'flex':'block',flexDirection:'column'}}>
        <div key={tab} style={lockPageScroll?{animation:'pageTurn 0.5s cubic-bezier(0.2,0.8,0.2,1)',flex:1,minHeight:0,display:'flex',flexDirection:'column'}:{animation:'pageTurn 0.5s cubic-bezier(0.2,0.8,0.2,1)'}}>
          <Suspense fallback={<PageSkeleton/>}>
            <ActivePage masterMode={masterMode}/>
          </Suspense>
        </div>
      </main>

      <AmbientSoundPlayer masterMode={masterMode}/>
      <PlayerCombatBanner/>
      <DiceWidget/>
    </div>
  );
}
