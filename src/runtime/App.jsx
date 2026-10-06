import { onSnapshot } from './adventure/sharedSnapshot';
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { doc} from "firebase/firestore";
import { db } from "./core/firebase";
import { ATMOSPHERES } from "./data/gameData";

import "./styles/global.css";
import "./styles/livro.css";
import "./experience/experience.css";
import "./experience/access.css";
import "./experience/realtime.css";
import "./experience/cosmic-living-background.css";
import "./experience/site-polish.css";

import { ToastContainer } from "./core/toast";
import RealtimeBroadcasts from "./experience/RealtimeBroadcasts";
import EnhancedSoundscape from "./experience/EnhancedSoundscape";
import MasterBattleConsole from "./experience/MasterBattleConsole";
import MasterToggle from "./shell/MasterToggle";
import AmbientSoundPlayer from "./shell/AmbientSoundPlayer";
import DiceWidget from "./shell/DiceWidget";
import CosmicLivingBackground from "./experience/CosmicLivingBackground";
import SharedDiceReplay from "./experience/SharedDiceReplay";
import DiceCriticalFx from "./experience/DiceCriticalFx";
import SessionConnection from './adventure/SessionConnection';
import AdventureSession from './adventure/AdventureSession';
import SessionLink from './adventure/SessionLink';
import { usePerformance } from './adventure/usePerformance';
import './adventure/adventure.css';
import AbilityFeedbackBridge from "./experience/AbilityFeedbackBridge";
import { VisitorSessionGuard, VisitorCharacterPicker } from './experience/VisitorSession';
import { PreferenceSurface } from './experience/PlayerComfort';
import InterfaceFeedback from './experience/InterfaceFeedback';
import GameExperience3 from "./experience/GameExperience3.adventure";
import {
  ExperienceProvider,
  ImmersiveNavigation,
  SessionDashboard,
  ExperienceLayer,
} from "./experience/ExperienceKit.generated";
import {
  PlayerAccessGate,
  PlayerIdentityChip,
  loadStoredAccess,
  clearStoredAccess,
} from "./experience/PlayerAccess";

const TAB_LABELS = {
  session:'Sessão Atual', prologo:'Prólogo', classes:'Classes', fichas:'Fichas',
  personagens:'Personagens', inimigos:'Inimigos', bestiario:'Bestiário', regras:'Regras',
  visitantes:'Visitantes', livro:'Livro da Mandíbula', cronicas:'Crônicas', mapamundi:'Mapa Múndi', mapabatalha:'Mapa de Batalha',
};

// MOBILE ALLOWED PAGES 2026-09-10
const MOBILE_ALLOWED_PAGES = new Set(['session','fichas','bestiario','personagens','prologo','classes','cronicas','livro','regras']);
const isMobileViewport = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;

const pageLoaders = {
  visitantes:  () => import('./experience/VisitorsPage'),
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
  const [quality,setQuality]=usePerformance();
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

  const mobileBattleMapBlocked = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
  const navigate = id => {
    if(id==='visitantes'&&access?.role!=='master'&&access?.role!=='visitor')return;
    // MOBILE MAPS HIDDEN 2026-09-15
    if (isMobileViewport() && (id==='mapamundi' || id==='mapabatalha')) return;
    prefetch(id);
    setTab(id);
  };

  useEffect(()=>{
    const keepMobileOutOfMaps = () => {
      if (isMobileViewport() && (tab==='mapamundi' || tab==='mapabatalha')) setTab('session');
    };
    keepMobileOutOfMaps();
    window.addEventListener('resize', keepMobileOutOfMaps);
    return()=>window.removeEventListener('resize', keepMobileOutOfMaps);
  },[tab]);

  const logout = useCallback(() => {
    clearStoredAccess();
    setAccess(null);
    setMasterMode(false);
    setTab('session');
  },[]);

  const accessReady = !!access && (access.role === 'player' || access.role === 'visitor' || masterMode);
  if (!accessReady) {
    return (
      <div style={{height:'100vh',overflow:'hidden',background:atm.bg,color:'#C8B8A0',fontFamily:"'Crimson Text',Georgia,serif",position:'relative',transition:'background 1.2s'}}>
        <CosmicLivingBackground variant="gate" quality={quality}/>
        <ToastContainer/>
        <RealtimeBroadcasts/>
        <EnhancedSoundscape/>
        <PlayerAccessGate access={access} onAccess={setAccess} onLogout={logout} masterMode={masterMode} setMasterMode={setMasterMode}/>
      </div>
    );
  }

  return(
    <ExperienceProvider key={`${access.role}:${playerSheetId || access.visitorId || 'master'}`} tab={tab} masterMode={masterMode} playerSheetId={playerSheetId} access={access}>
      <div className={`adventure-shell access-${access.role} realtime-sync-enabled`} style={{height:'100vh',overflow:'hidden',background:atm.bg,color:'#C8B8A0',fontFamily:"'Crimson Text',Georgia,serif",position:'relative',transition:'background 1.2s'}}>
        <CosmicLivingBackground quality={quality}/>
        <ToastContainer/>
        <RealtimeBroadcasts/>
        <SharedDiceReplay access={access}/>
        <DiceCriticalFx/>
        <VisitorSessionGuard access={access} onLogout={logout}/>
        <PreferenceSurface/><InterfaceFeedback/>
        <SessionLink masterMode={masterMode} onNavigate={navigate}/>
        <AbilityFeedbackBridge/>

        {/* DESKTOP NAV MASTER ROLE 2026-09-11 */}
        <ImmersiveNavigation tab={tab} onNavigate={navigate} onPrefetch={prefetch} accent={atm.accent} masterMode={masterMode}/>

        <div className="immersive-stage">
          <header className="immersive-topbar">
            <div className="brand-line">
              <span className="brand-mark">✦</span>
              <div>
                <h1>Dinastia E</h1>
                <small>Cosmum · {TAB_LABELS[tab] || 'Livro do Mundo'}</small>
              </div>
            </div>
            <div className="top-actions">
              <SessionConnection/>
              <button className="ad-quality" title="Alternar entre fundo estático e atmosfera imersiva com estrelas cadentes" aria-pressed={quality==='light'} onClick={()=>setQuality(quality==='light'?'cinematic':'light')}>{quality==='light'?'◈ Leve':'✦ Imersivo'}</button>
              <AmbientSoundPlayer masterMode={masterMode}/>
              <VisitorCharacterPicker access={access}/>
              <PlayerIdentityChip access={access} onLogout={logout}/>
              {access.role === 'master' && <MasterToggle masterMode={masterMode} setMasterMode={setMasterMode}/>} 
            </div>
          </header>

          <main className={`immersive-content ${lockPageScroll ? 'main-locked' : ''}`}>
            <div key={tab} className={`page-stage page-stage-${tab}`} style={lockPageScroll?{animation:'pageTurn 0.12s cubic-bezier(0.2,0.8,0.2,1)',flex:1,minHeight:0,display:'flex',flexDirection:'column'}:{animation:'pageTurn 0.12s cubic-bezier(0.2,0.8,0.2,1)'}}>
              {tab==='session' ? (
                <AdventureSession onNavigate={navigate} masterMode={masterMode} access={access}/>
              ) : (
                <Suspense fallback={<PageSkeleton/>}>
                  <ActivePage masterMode={masterMode} playerSheetId={playerSheetId} access={access}/>
                </Suspense>
              )}
            </div>
          </main>
        </div>

        <ExperienceLayer onNavigate={navigate}/>
        {access.role==='master' && tab==='mapabatalha' && <MasterBattleConsole/>}
        <DiceWidget access={access}/>
        <GameExperience3 access={access} masterMode={masterMode} tab={tab} onNavigate={navigate}/>
      </div>
    </ExperienceProvider>
  );
}

import './experience/mobile-player-polish.css';
