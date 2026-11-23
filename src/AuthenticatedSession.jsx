import { lazy, Suspense, useRef } from 'react';
import useHeaderClearance from './experience/useHeaderClearance';
import './experience/interface-clearance.css';
import { ToastContainer } from './core/toast';
import RealtimeBroadcasts from './experience/RealtimeBroadcasts';
import MasterToggle from './shell/MasterToggle';
import CampaignPasswordButton from './shell/CampaignPasswordButton';
import LiveStatus from './shell/LiveStatus';
import AmbientSoundPlayer from './shell/AmbientSoundPlayer';
import BarraDePrevia from './features/acesso/BarraDePrevia.jsx';
import Mortalha from './features/oneshot/Mortalha.jsx';
import ChaveDaNoite from './features/oneshot/ChaveDaNoite.jsx';
import { sistemaDe } from './core/sistemas/index.mjs';
import { useMembro } from './features/acesso/useMembro';
import DiceWidget from './shell/DiceWidget';
import CosmicLivingBackground from './experience/CosmicLivingBackground';
import CenarioDaMesa from './experience/CenarioDaMesa';
import { cenarioDaMesa } from './core/atmosferaDaMesa.mjs';
import SharedDiceReplay from './experience/SharedDiceReplay';
import DiceCriticalFx from './experience/DiceCriticalFx';
import ConnectionHealth from './experience/ConnectionHealth';
import AdventureSession from './adventure/AdventureSession';
import SessionLink from './adventure/SessionLink';
import AbilityFeedbackBridge from './experience/AbilityFeedbackBridge';
import { VisitorSessionGuard, VisitorCharacterPicker } from './experience/VisitorSession';
import { PreferenceSurface } from './experience/PlayerComfort';
import InterfaceFeedback from './experience/InterfaceFeedback';
import GameExperience3 from './experience/GameExperience3';
import { ExperienceProvider, ImmersiveNavigation, ExperienceLayer } from './experience/ExperienceKit';
import { PlayerIdentityChip } from './experience/PlayerAccess';

const MasterBattleConsole = lazy(() => import('./experience/MasterBattleConsole'));

function PageSkeleton(){
  return (
    <div className="lazy-page-skeleton">
      <div><span className="lazy-page-dot"/> Abrindo registro...</div>
    </div>
  );
}

export default function AuthenticatedSession({access,playerSheetId,tab,masterMode,quality,setQuality,atm,logout,navigate,prefetch,lockPageScroll,ActivePage,setMasterMode,TAB_LABELS,campaign,onLeaveCampaign}){
  // A prévia de jogador vale para a mesa inteira, então o aviso dela mora
  // aqui e não numa aba: quem esquece que está em prévia conclui que o site
  // escondeu dele um documento que ele mesmo criou.
  const { previa } = useMembro();
  // Névoa e som da noite são do One Shot Terror. Montá-los em toda mesa
  // penduraria duas alavancas de ambiente em campanhas que não as pediram.
  const temNevoa = Boolean(sistemaDe(campaign)?.nevoa);
  const headerRef=useRef(null);
  useHeaderClearance(headerRef);
  return(
    <ExperienceProvider key={`${access.role}:${playerSheetId || access.visitorId || 'master'}`} tab={tab} masterMode={masterMode} playerSheetId={playerSheetId} access={access}>
      <BarraDePrevia previa={previa} />
      {temNevoa && <Mortalha mestre={masterMode} />}
      {temNevoa && <ChaveDaNoite />}
      <div className={`adventure-shell access-${access.role} realtime-sync-enabled`} style={{height:'100vh',overflow:'hidden',background:atm.bg,color:'var(--ink-mesa,#C8B8A0)',fontFamily:"'Crimson Text',Georgia,serif",position:'relative',transition:'background 1.2s'}}>
        {/* A parede da mesa vem antes de tudo e o céu cósmico some onde ela
            existe: duas paisagens sobrepostas não é clima, é sujeira. */}
        <CenarioDaMesa campaign={campaign}/>
        {!cenarioDaMesa(campaign) && <CosmicLivingBackground quality={quality}/>}
        <ToastContainer/>
        <RealtimeBroadcasts/>
        <SharedDiceReplay access={access}/>
        <DiceCriticalFx/>
        <ConnectionHealth/>
        <VisitorSessionGuard access={access} onLogout={logout}/>
        <PreferenceSurface/><InterfaceFeedback/>
        <SessionLink masterMode={masterMode} onNavigate={navigate}/>
        <AbilityFeedbackBridge/>

        {/* DESKTOP NAV MASTER ROLE 2026-09-11 */}
        <ImmersiveNavigation tab={tab} onNavigate={navigate} onPrefetch={prefetch} accent={atm.accent} masterMode={masterMode} campaign={campaign} onLeaveCampaign={onLeaveCampaign}/>

        <div className="immersive-stage">
          <header ref={headerRef} className="immersive-topbar">
            <div className="brand-line">
              <span className="brand-mark">✦</span>
              <div>
                <h1>{campaign?.name || 'Dinastia E'}</h1>
                <small>{campaign?.world ? `${campaign.world} · ` : ''}{TAB_LABELS[tab] || 'Livro do Mundo'}</small>
              </div>
            </div>
            <div className="top-actions">
              <LiveStatus/>
              <button className="ad-quality" title="Alternar entre fundo estático e atmosfera imersiva com estrelas cadentes" aria-pressed={quality==='light'} onClick={()=>setQuality(quality==='light'?'cinematic':'light')}>{quality==='light'?'◈ Leve':'✦ Imersivo'}</button>
              {tab!=='mesaImersiva'&&<AmbientSoundPlayer masterMode={masterMode}/>}
              <VisitorCharacterPicker access={access}/>
              <PlayerIdentityChip access={access} onLogout={logout}/>
              {access.role === "master" && masterMode && <><CampaignPasswordButton campaign={campaign}/><CampaignPasswordButton campaign={campaign} tipo="mestre"/></>}
              {access.role === 'master' && <MasterToggle masterMode={masterMode} setMasterMode={setMasterMode} campaign={campaign}/>} 
            </div>
          </header>

          <main className={`immersive-content ${lockPageScroll ? 'main-locked' : ''}`}>
            <div key={tab} className={`page-stage page-stage-${tab}`} style={lockPageScroll?{animation:'pageTurn 0.12s cubic-bezier(0.2,0.8,0.2,1)',flex:1,minHeight:0,display:'flex',flexDirection:'column'}:{animation:'pageTurn 0.12s cubic-bezier(0.2,0.8,0.2,1)'}}>
              {tab==='session' ? (
                <AdventureSession onNavigate={navigate} masterMode={masterMode} access={access}/>
              ) : (
                <Suspense fallback={<PageSkeleton/>}>
                  <ActivePage masterMode={masterMode} playerSheetId={playerSheetId} access={access} onNavigate={navigate}/>
                </Suspense>
              )}
            </div>
          </main>
        </div>

        <ExperienceLayer onNavigate={navigate}/>
        {access.role==='master' && tab==='mapabatalha' && <Suspense fallback={null}><MasterBattleConsole/></Suspense>}
        <DiceWidget access={access}/>
        <GameExperience3 access={access} masterMode={masterMode} tab={tab} onNavigate={navigate}/>
      </div>
    </ExperienceProvider>
  );
}
