import { lazy, Suspense, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./core/firebase";
import { ATMOSPHERES } from "./data/gameData";

import "./styles/global.css";
import "./styles/livro.css";
import "./experience/experience.css";
import "./experience/access.css";
import "./experience/cosmic-living-background.css";

import StarField from "./shell/StarField";
import { ToastContainer } from "./core/toast";
import PublicDiceOverlay from "./shell/PublicDiceOverlay";
import MasterToggle from "./shell/MasterToggle";
import AmbientSoundPlayer from "./shell/AmbientSoundPlayer";
import DiceWidget from "./shell/DiceWidget";
import CosmicLivingBackground from "./experience/CosmicLivingBackground";
import {
  ExperienceProvider,
  ImmersiveNavigation,
  SessionDashboard,
  ExperienceLayer,
} from "./experience/ExperienceKit";
import {
  PlayerAccessGate,
  PlayerIdentityChip,
  loadStoredAccess,
  clearStoredAccess,
} from "./experience/PlayerAccess";

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

function PageSkeleton(){
  return (
    <div className="lazy-page-skeleton">
      <div><span className="lazy-page-dot"/> Abrindo registro...</div>
    </div>
  );
}

export default function App(){
  const [tab,setTab]=useState('session');
  const [masterMode,setMasterMode]=useState(false);
  const [atmosphere,setAtmosphere]=useState('neutro');
  const [access,setAccess]=useState(()=>loadStoredAccess());

  useEffect(()=>{
    const unsub=onSnapshot(doc(db,'config','atmosphere'),snap=>{
      if(snap.exists()) setAtmosphere(snap.data().key||'neutro');
    });
    return()=>unsub();
  },[]);

  const atm = ATMOSPHERES[atmosphere] || ATMOSPHERES.neutro;
  const lockPageScroll = tab === 'mapabatalha';
  const ActivePage = tab === 'session' ? null : (LazyPages[tab] || LazyPages.prologo);
  const playerSheetId = access?.role === 'player' ? String(access.sheetId || '') : '';

  const prefetch = id => {
    const loader = pageLoaders[id];
    if (loader) loader().catch(()=>{});
  };

  const navigate = id => {
    prefetch(id);
    setTab(id);
  };

  const logout = () => {
    clearStoredAccess();
    setAccess(null);
    setMasterMode(false);
    setTab('session');
  };

  const accessReady = !!access && (access.role === 'player' || masterMode);
  if (!accessReady) {
    return (
      <div style={{height:'100vh',overflow:'hidden',background:atm.bg,color:'#C8B8A0',fontFamily:"'Crimson Text',Georgia,serif",position:'relative',transition:'background 1.2s'}}>
        <CosmicLivingBackground variant="gate"/>
        <StarField atmosphere={atmosphere}/>
        <ToastContainer/>
        <PlayerAccessGate access={access} onAccess={setAccess} onLogout={logout} masterMode={masterMode} setMasterMode={setMasterMode}/>
      </div>
    );
  }

  return(
    <ExperienceProvider key={`${access.role}:${playerSheetId || 'master'}`} tab={tab} masterMode={masterMode}>
      <div className={`access-${access.role}`} style={{height:'100vh',overflow:'hidden',background:atm.bg,color:'#C8B8A0',fontFamily:"'Crimson Text',Georgia,serif",position:'relative',transition:'background 1.2s'}}>
        <CosmicLivingBackground/>
        <StarField atmosphere={atmosphere}/>
        <ToastContainer/>
        <PublicDiceOverlay/>

        <ImmersiveNavigation tab={tab} onNavigate={navigate} accent={atm.accent}/>

        <div className="immersive-stage">
          <header className="immersive-topbar">
            <div className="brand-line">
              <span className="brand-mark">✦</span>
              <div>
                <h1>Dinastia E</h1>
                <small>Cosmum · Livro do Mundo · Vigor Cósmico</small>
              </div>
            </div>
            <div className="top-actions">
              <PlayerIdentityChip access={access} onLogout={logout}/>
              {access.role === 'master' && <MasterToggle masterMode={masterMode} setMasterMode={setMasterMode}/>} 
            </div>
          </header>

          <main className={`immersive-content ${lockPageScroll ? 'main-locked' : ''}`}>
            <div key={tab} style={lockPageScroll?{animation:'pageTurn 0.45s cubic-bezier(0.2,0.8,0.2,1)',flex:1,minHeight:0,display:'flex',flexDirection:'column'}:{animation:'pageTurn 0.45s cubic-bezier(0.2,0.8,0.2,1)'}}>
              {tab==='session' ? (
                <SessionDashboard onNavigate={navigate} masterMode={masterMode}/>
              ) : (
                <Suspense fallback={<PageSkeleton/>}>
                  <ActivePage masterMode={masterMode} playerSheetId={playerSheetId}/>
                </Suspense>
              )}
            </div>
          </main>
        </div>

        <ExperienceLayer onNavigate={navigate}/>
        <AmbientSoundPlayer masterMode={masterMode}/>
        <DiceWidget/>
      </div>
    </ExperienceProvider>
  );
}
