import { lazy, Suspense } from 'react';
import { ToastContainer } from './core/toast';
import RealtimeBroadcasts from './experience/RealtimeBroadcasts';
import MasterToggle from './shell/MasterToggle';
import AmbientSoundPlayer from './shell/AmbientSoundPlayer';
import DiceWidget from './shell/DiceWidget';
import CosmicLivingBackground from './experience/CosmicLivingBackground';
import SharedDiceReplay from './experience/SharedDiceReplay';
import DiceCriticalFx from './experience/DiceCriticalFx';
import SessionConnection from './adventure/SessionConnection';
import AdventureSession from './adventure/AdventureSession';
import SessionLink from './adventure/SessionLink';
import AbilityFeedbackBridge from './experience/AbilityFeedbackBridge';
import { VisitorSessionGuard, VisitorCharacterPicker } from './experience/VisitorSession';
import { PreferenceSurface } from './experience/PlayerComfort';
import InterfaceFeedback from './experience/InterfaceFeedback';
import GameExperience3 from './experience/GameExperience3.adventure';
import { ExperienceProvider, ImmersiveNavigation, ExperienceLayer } from './experience/ExperienceKit.generated';
import { PlayerIdentityChip } from './experience/PlayerAccess';

const MasterBattleConsole = lazy(() => import('./experience/MasterBattleConsole'));

function PageSkeleton(){
  return (
    <div className="lazy-page-skeleton">
      <div><span className="lazy-page-dot"/> Abrindo registro...</div>
    </div>
  );
}

export default function AuthenticatedSession({access,playerSheetId,tab,masterMode,quality,setQuality,atm,logout,navigate,prefetch,lockPageScroll,ActivePage,setMasterMode,TAB_LABELS}){
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
        {access.role==='master' && tab==='mapabatalha' && <Suspense fallback={null}><MasterBattleConsole/></Suspense>}
        <DiceWidget access={access}/>
        <GameExperience3 access={access} masterMode={masterMode} tab={tab} onNavigate={navigate}/>
      </div>
    </ExperienceProvider>
  );
}
