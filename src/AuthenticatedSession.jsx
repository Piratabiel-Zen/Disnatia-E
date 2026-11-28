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
import ChaveDaNoite from './features/oneshot/ChaveDaNoite.jsx';
import Assombracao from './features/oneshot/Assombracao.jsx';
// A pele do grimório. Presa a html[data-tema-mesa="mortalha"], então carregar
// aqui não toca na Dinastia E nem no CAIN.
import './features/oneshot/mortalha-casca.css';
import { sistemaDe, termo } from './core/sistemas/index.mjs';
import AvisoDaCacada from './features/oneshot/AvisoDaCacada.jsx';
import { useCacadaDaMesa } from './features/oneshot/useCacadaDaMesa.js';
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
import { nomeEmDuasTintas } from './adventure/nomeEmDuasTintas.mjs';


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
  // O som da noite é do One Shot Terror. Montá-lo em toda mesa penduraria
  // uma alavanca de ambiente em campanhas que não a pediram.
  //
  // A névoa saiu daqui: ela é camada do CENÁRIO agora, desenhada dentro da
  // casca da sessão. Fora dela, nascia atrás do fundo opaco da casca e não
  // aparecia por mais que a chave fosse ligada.
  const temNevoa = Boolean(sistemaDe(campaign)?.nevoa);

  /* A CAÇADA É DA SESSÃO INTEIRA, não do mapa.
     O contador vivia dentro do mapa de combate, e por isso só existia
     para quem estava com o mapa aberto — no celular, onde o mapa nem é
     carregado, nunca existia. Um relógio que metade da mesa não vê não
     cria aperto nenhum. */
  const { cacada, desvio: desvioDaCacada } = useCacadaDaMesa(sistemaDe(campaign)?.id === 'oneshot');

  /* O botão "Leve" sempre escreveu `data-quality` na raiz (ver
     usePerformance): o que faltava era CSS desta mesa lendo esse sinal. O
     fundo cósmico lia, e nesta mesa o cósmico não existe — o cenário da
     casa toma o lugar dele. Então o botão não mudava nada justamente onde
     a máquina mais sofre: a mesa com chuva, escuridão, névoa, sombras e
     uma luz por efeito, todas do tamanho da tela.

     Cheguei a criar um segundo atributo (`data-qualidade="leve"`) para
     isso. Era errado: dois nomes para a mesma chave, e o CSS antigo
     continuava esperando o primeiro. O corte do modo Leve mora agora em
     `html[data-quality="light"]`, junto com o resto. */
  const headerRef=useRef(null);
  useHeaderClearance(headerRef);
  return(
    <ExperienceProvider key={`${access.role}:${playerSheetId || access.visitorId || 'master'}`} tab={tab} masterMode={masterMode} playerSheetId={playerSheetId} access={access}>
      <BarraDePrevia previa={previa} />
      {temNevoa && <ChaveDaNoite />}
      {/* A assombração mora na casca e não numa aba: a tela tem que escurecer
          esteja a pessoa onde estiver — a graça é pegar quem estava mexendo
          na ficha. Só nas mesas que têm névoa, que são as de uma noite. */}
      {temNevoa && <Assombracao uid={access?.uid || ''} />}
      {/* No mapa a faixa some: lá o contador grande já está em cena, e
          dois relógios com o mesmo número é pior que nenhum. */}
      <AvisoDaCacada cacada={cacada} desvio={desvioDaCacada} escondido={tab === 'mapabatalha'} />
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
                <h1>{nomeEmDuasTintas(campaign?.name || 'Dinastia E')}</h1>
                <small>{campaign?.world ? `${campaign.world} · ` : ''}{termo(campaign, tab, TAB_LABELS[tab] || 'Livro do Mundo')}</small>
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
        {/* O CONSOLE DE COMBATE FOI RETIRADO.
            Iniciativa, rodadas e turnos nunca foram usados em mesa
            nenhuma daqui: as três mesas resolvem conflito na conversa e
            no dado solto. O que ele fazia era ocupar o canto da tela do
            Mestre com botões que ele nunca aperta — e numa cena de terror
            a tela do Mestre é onde ele olha para narrar.

            O que move o combate (`config/combat`) continua existindo e
            dormente: com o console fora, nada liga `active`, e os
            lugares que ainda escutam esse documento simplesmente nunca
            acordam. Arrancar o documento inteiro mexeria no som
            ambiente, no dado e no registro da sessão de uma vez — risco
            grande para apagar algo que já não aparece. */}
        <DiceWidget access={access}/>
        <GameExperience3 access={access} masterMode={masterMode} tab={tab} onNavigate={navigate}/>
      </div>
    </ExperienceProvider>
  );
}
