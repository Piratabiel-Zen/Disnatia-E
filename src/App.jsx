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
import "./experience/golpes.css";
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
import { isMobileViewport, blockedOnThisDevice } from "./adventure/viewport.mjs";
import { isUnlocked } from "./core/campaignPassword.mjs";
import { campaignHasTab } from "./core/campaignModules.mjs";
import {
  campaignTheme, clearStoredCampaign, docIn, globalDoc, restoreCampaignFromStorage, setActiveCampaign,
} from "./core/campaign";

const CampaignGate = lazy(() => import('./features/campanhas/CampaignGate'));

const AuthenticatedSession = lazy(() => import('./AuthenticatedSession'));

const TAB_LABELS = {
  session:'Sessão Atual', classes:'Classes', fichas:'Fichas',
  personagens:'Personagens', inimigos:'Inimigos', bestiario:'Bestiário', regras:'Regras',
  visitantes:'Visitantes', livro:'Livro da Mandíbula', cronicas:'Crônicas', mapamundi:'Mapa Múndi', mapabatalha:'Mapa de Batalha',
};



const pageLoaders = {
  visitantes:  () => import('./experience/VisitorsPage'),
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
  // Abas do sistema CAIN.
  investigacao: () => import("./features/investigacao/InvestigacaoPage"),
  documentos:   () => import("./features/documentos/DocumentosPage"),
  pecados:      () => import("./features/pecados/PecadosPage"),
  legal:        () => import("./features/legal/LegalPage"),
};

const LazyPages = Object.fromEntries(
  Object.entries(pageLoaders).map(([key, loader]) => [key, lazy(loader)])
);

export default function App(){
  const [quality,setQuality]=usePerformance();
  const [tab,setTab]=useState('session');
  const [masterMode,setMasterMode]=useState(false);
  const [atmosphere,setAtmosphere]=useState('neutro');
  // A campanha é resolvida antes de tudo: ela decide quais dados o site lê.
  const [campaign,setCampaign]=useState(()=>restoreCampaignFromStorage());
  const [access,setAccess]=useState(()=>(campaign?loadStoredAccess():null));

  useEffect(()=>{
    if(!campaign)return;
    const unsub=onSnapshot(docIn('config','atmosphere'),snap=>{
      if(snap.exists()) setAtmosphere(snap.data().key||'neutro');
    });
    return()=>unsub();
  },[campaign?.id]);

  // A senha da mesa vale também para quem já estava dentro: se o Mestre troca
  // a senha (ou a mesa passa a ter uma), este aparelho volta para o portal.
  useEffect(()=>{
    if(!campaign?.id)return;
    const unsub=onSnapshot(globalDoc('campaigns',campaign.id),snap=>{
      const record={...campaign,...(snap.exists()?snap.data():{}),id:campaign.id};
      if(!isUnlocked(record)){
        clearStoredAccess();clearStoredCampaign();
        setAccess(null);setMasterMode(false);setTab('session');setCampaign(null);
      }
    },()=>{});
    return()=>unsub();
  },[campaign?.id]);

  const theme = campaignTheme(campaign);
  // O tema da mesa vira variável de CSS, para alcançar o site inteiro e não
  // só o fundo: a ficha, o mural e a sessão leem --accent e --accent-soft.
  // Só fora da campanha principal — a Dinastia E tem a cor dela no CSS e não
  // vai mudar de cara por causa disto.
  useEffect(() => {
    const raiz = document.documentElement;
    if (!campaign || campaign.primary !== false) {
      for (const nome of ['--accent', '--accent-soft', '--bronze', '--ink-mesa']) raiz.style.removeProperty(nome);
      raiz.removeAttribute('data-tema-mesa');
      return;
    }
    raiz.style.setProperty('--accent', theme.accent);
    raiz.style.setProperty('--accent-soft', theme.accentSoft);
    if (theme.bronze) raiz.style.setProperty('--bronze', theme.bronze);
    raiz.style.setProperty('--ink-mesa', theme.ink);
    raiz.dataset.temaMesa = temaDaMesa(campaign);
  }, [campaign?.id, campaign?.primary, campaign?.theme, campaign?.name, theme]);
  const baseAtm = ATMOSPHERES[atmosphere] || ATMOSPHERES.neutro;
  // Fora da campanha principal, o tema da mesa manda na cor de fundo e no acento.
  const atm = campaign && campaign.primary === false
    ? { ...baseAtm, bg:theme.bg, accent:theme.accent }
    : baseAtm;
  const lockPageScroll = tab === 'mapabatalha';
  const ActivePage = tab === 'session' ? null : (LazyPages[tab] || LazyPages.livro);
  const playerSheetId = access?.role === 'player' ? String(access.sheetId || '') : '';

  const prefetch = id => {
    const loader = pageLoaders[id];
    if (loader) loader().catch(()=>{});
  };

  const navigate = id => {
    if(id==='visitantes'&&access?.role!=='master'&&access?.role!=='visitor')return;
    // MOBILE MAPS HIDDEN 2026-09-15
    if (blockedOnThisDevice(id, isMobileViewport())) return;
    // Uma aba que esta campanha não tem não abre nem por link nem por foco.
    if (!campaignHasTab(campaign, id)) return;
    prefetch(id);
    setTab(id);
  };

  useEffect(()=>{
    const keepMobileOutOfMaps = () => {
      if (blockedOnThisDevice(tab, isMobileViewport())) setTab('session');
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

  const chooseCampaign = useCallback(record => {
    const chosen = setActiveCampaign(record);
    setMasterMode(false);
    setTab('session');
    setAccess(loadStoredAccess());
    setCampaign(chosen);
  },[]);

  // Voltar para a lista de mesas: desloga da mesa atual e esquece a escolha.
  const leaveCampaign = useCallback(() => {
    clearStoredAccess();
    clearStoredCampaign();
    setAccess(null);
    setMasterMode(false);
    setTab('session');
    setCampaign(null);
  },[]);

  if (!campaign) {
    return (
      <div style={{height:'100vh',overflow:'auto',background:'#07050F',color:'#C8B8A0',fontFamily:"'Crimson Text',Georgia,serif"}}>
        <ToastContainer/>
        <Suspense fallback={<div role="status" className="lazy-page-skeleton">Reunindo as mesas...</div>}>
          <CampaignGate onChoose={chooseCampaign}/>
        </Suspense>
      </div>
    );
  }

  const accessReady = !!access && (access.role === 'player' || access.role === 'visitor' || masterMode);
  if (!accessReady) {
    return (
      <div style={{height:'100vh',overflow:'hidden',background:atm.bg,color:'#C8B8A0',fontFamily:"'Crimson Text',Georgia,serif",position:'relative',transition:'background 1.2s'}}>
        <CosmicLivingBackground variant="gate" quality={quality}/>
        <ToastContainer/>
        <RealtimeBroadcasts/>
        <EnhancedSoundscape/>
        <PlayerAccessGate access={access} onAccess={setAccess} onLogout={logout} masterMode={masterMode} setMasterMode={setMasterMode} campaign={campaign} onLeaveCampaign={leaveCampaign}/>
      </div>
    );
  }

  return <Suspense key={campaign.id} fallback={<div style={{height:'100vh',background:atm.bg,color:'#C8B8A0'}}><CosmicLivingBackground quality={quality}/><div role="status" className="lazy-page-skeleton">Abrindo a mesa...</div></div>}>
    <AuthenticatedSession campaign={campaign} onLeaveCampaign={leaveCampaign} access={access} playerSheetId={playerSheetId} tab={tab} masterMode={masterMode} quality={quality} setQuality={setQuality} atm={atm} logout={logout} navigate={navigate} prefetch={prefetch} lockPageScroll={lockPageScroll} ActivePage={ActivePage} setMasterMode={setMasterMode} TAB_LABELS={TAB_LABELS}/>
  </Suspense>;
}

import './experience/mobile-player-polish.css';
import './experience/mobile-menos-e-mais.css';
import { temaDaMesa } from './core/atmosferaDaMesa.mjs';
