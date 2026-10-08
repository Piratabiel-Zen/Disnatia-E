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
import CosmicLivingBackground from "./experience/CosmicLivingBackground";
import { usePerformance } from './adventure/usePerformance';
import './adventure/adventure.css';

import {
  PlayerAccessGate,
  loadStoredAccess,
  clearStoredAccess,
} from "./experience/PlayerAccess";

const AuthenticatedSession = lazy(() => import('./AuthenticatedSession'));

const TAB_LABELS = {
  session:'Sessão Atual', prologo:'Prólogo', classes:'Classes', fichas:'Fichas',
  personagens:'Personagens', inimigos:'Inimigos', bestiario:'Bestiário', regras:'Regras',
  visitantes:'Visitantes', livro:'Livro da Mandíbula', cronicas:'Crônicas', mapamundi:'Mapa Múndi', mapabatalha:'Mapa de Batalha',
};

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

  return <Suspense fallback={<div style={{height:'100vh',background:atm.bg,color:'#C8B8A0'}}><CosmicLivingBackground quality={quality}/><div role="status" className="lazy-page-skeleton">Abrindo a mesa...</div></div>}>
    <AuthenticatedSession access={access} playerSheetId={playerSheetId} tab={tab} masterMode={masterMode} quality={quality} setQuality={setQuality} atm={atm} logout={logout} navigate={navigate} prefetch={prefetch} lockPageScroll={lockPageScroll} ActivePage={ActivePage} setMasterMode={setMasterMode} TAB_LABELS={TAB_LABELS}/>
  </Suspense>;
}

import './experience/mobile-player-polish.css';
