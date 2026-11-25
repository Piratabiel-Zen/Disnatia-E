import { memo, useEffect, useState } from 'react';
import SessionHome from './SessionHome';
import { useExperience } from '../experience/ExperienceKit';
import { CLASSES, getSheetMaxHp } from '../data/gameData';
import { onSnapshot } from './sharedSnapshot';
import { activeCampaign, col } from '../core/campaign';
import { colecaoDeFichas, sistemaDe } from '../core/sistemas/index.mjs';
import { caixasDoTalisma, resumoDoTalisma, talismaDoExorcista }
  from '../features/mapa-batalha/talismaDeToken.mjs';
import Council from './Council';
import '../features/mapa-batalha/talisma.css';

export function openAdventurePanel(panel) {
  window.dispatchEvent(new CustomEvent('dinastia:adventure-panel', { detail: { panel } }));
}

const Portrait = memo(function Portrait({ sheet, own, active, onOpen }) {
  const cls = CLASSES.find(c => c.id === sheet.classe);
  const max = Math.max(1, getSheetMaxHp(sheet));
  const hp = Math.max(0, Number(sheet.hp) || 0);
  return <button className={`ad-companion ${own ? 'own' : ''} ${active ? 'active-turn' : ''}`} onClick={onOpen} disabled={!onOpen} title={`${sheet.nome || 'Aventureiro'} · ${hp}/${max} PV`}>
    <span className="ad-portrait"><span className="ad-portrait-fallback" aria-hidden="true">{String(sheet.nome || '?').slice(0, 1)}</span>{sheet.foto ? <img src={sheet.foto} alt="" width="76" height="86" loading="eager" decoding="async" draggable="false" /> : null}<span className="ad-portrait-rune" aria-hidden="true">{cls?.icon || '◆'}</span></span>
    <span className="ad-companion-name">{sheet.nome || 'Aventureiro'}</span>
    <span className="ad-companion-class">{active ? 'Turno atual' : own ? 'Seu personagem' : cls?.name || cls?.nome || 'Companheiro'}</span>
    <span className="ad-hp-track"><i style={{ width: `${Math.min(100, hp / max * 100)}%` }} /></span>
    <span className="ad-companion-hp">{hp} / {max} PV</span>
  </button>;
});



/* O RETRATO DA NOITE
   A companhia de uma mesa de terror não tem classe nem pontos de vida com
   esse nome. O cartão da Dinastia E chamava quem não tinha nome de
   "Aventureiro" e quem não tinha classe de "Companheiro" — dois rótulos
   inventados por outro sistema, aparecendo como se fossem o personagem.

   Aqui o nome é o nome que está na ficha, e nada mais é inventado: quando
   não há nome, isso é dito. Debaixo dele, os três medidores que esta mesa
   realmente usa. */
const RetratoDaNoite = memo(function RetratoDaNoite({ ficha, own, active, onOpen }) {
  const vida = Math.max(0, Number(ficha.pv) || 0);
  const vidaMax = Math.max(1, Number(ficha.pvMaximo) || Number(ficha.pv) || 1);
  return <button
    className={`ad-companion noite ${own ? 'own' : ''} ${active ? 'active-turn' : ''}`}
    onClick={onOpen} disabled={!onOpen}
    title={ficha.nome || 'ficha sem nome'}
  >
    <span className="ad-portrait">
      <span className="ad-portrait-fallback" aria-hidden="true">
        {String(ficha.nome || '?').slice(0, 1)}
      </span>
      {ficha.foto ? <img src={ficha.foto} alt="" width="76" height="86" loading="eager" decoding="async" draggable="false" /> : null}
    </span>
    <span className="ad-companion-name" data-sem={ficha.nome ? undefined : ''}>
      {ficha.nome || 'sem nome'}
    </span>
    <span className="ad-noite-medidas">
      <i data-m="vida">{vida}/{vidaMax}</i>
      <i data-m="pavor">{Number(ficha.pavor) || 0}</i>
      <i data-m="sanidade">{Number(ficha.sanidade) || 0}</i>
    </span>
  </button>;
});

/* O RETRATO DO EXORCISTA
   A companhia de uma mesa de CAIN não tem classe nem pontos de vida. O que
   se precisa saber de relance, no meio de uma caçada, é a categoria e quanto
   o talismã de execução daquele corpo ainda aguenta. */
const RetratoExorcista = memo(function RetratoExorcista({ ficha, own, onOpen }) {
  const talisma = talismaDoExorcista(ficha);
  return <button
    className={`ad-companion ${own ? 'own' : ''}`} onClick={onOpen} disabled={!onOpen}
    title={`${ficha.nome || 'Exorcista'} · talismã ${resumoDoTalisma(talisma)}`}
  >
    <span className="ad-portrait">
      <span className="ad-portrait-fallback" aria-hidden="true">{String(ficha.nome || '?').slice(0, 1)}</span>
      {ficha.foto ? <img src={ficha.foto} alt="" width="76" height="86" loading="eager" decoding="async" draggable="false" /> : null}
      <span className="ad-portrait-rune" aria-hidden="true">{ficha.categoria || 'I'}</span>
    </span>
    <span className="ad-companion-name">{ficha.nome || 'Exorcista'}</span>
    <span className="ad-companion-class">
      {own ? 'Seu exorcista' : (ficha.blasfemia || `Categoria ${ficha.categoria || 'I'}`)}
    </span>
    <span className="token-talisma" data-critico={talisma.critico ? 'sim' : 'nao'} style={{ '--escala': 1, '--largura': '100%' }}>
      {caixasDoTalisma(talisma).map((estado, i) => <i key={i} data-estado={estado} />)}
    </span>
  </button>;
});

export function AdventureView({ session, combat, combatState, sheets, playerId, masterMode, activeMap, onNavigate, onPanel, updateSession }) {
  // A COMPANHIA VEM DA COLEÇÃO DO SISTEMA DA MESA.
  //
  // O provedor de experiência lê sempre 'sheets', que é da Dinastia E. Numa
  // mesa de CAIN isso trazia à tela qualquer ficha de teste que tivesse
  // sobrado ali — o "Aventureiro, Assassinos do Fogo Azul" que aparecia no
  // meio de uma mesa de exorcismo sem ninguém entender de onde vinha.
  const mesa = activeCampaign();
  const ehCain = sistemaDe(mesa).id === 'cain';
  const ehNoite = sistemaDe(mesa).id === 'oneshot';
  const [fichasDoSistema, setFichasDoSistema] = useState([]);
  useEffect(() => {
    if (!ehCain) return undefined;
    return onSnapshot(col(colecaoDeFichas(mesa)), snap => {
      setFichasDoSistema(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    }, () => {});
  }, [ehCain, mesa?.id]);
  const elenco = ehCain ? fichasDoSistema : sheets;
  const current = combatState?.initiative?.[combatState.turnIdx || 0];
  const currentId = current ? String(current.id).replace(/^p_/, '') : '';
  return <div className="adventure-page">
    <SessionHome
      session={{ ...session, update: updateSession }}
      combat={combat}
      combatState={combatState}
      sheets={elenco}
      playerId={playerId}
      masterMode={masterMode}
      current={current ? { ...current, id: currentId } : null}
      activeMap={activeMap}
      onPanel={onPanel}
      onNavigate={onNavigate}
    >
      {sheet => (ehNoite
        ? <RetratoDaNoite
            ficha={sheet}
            own={String(sheet.id) === playerId}
            active={current?.type === 'player' && currentId === String(sheet.id)}
            onOpen={masterMode || String(sheet.id) === playerId ? () => onPanel('sheet', sheet.id) : null}
          />
        : ehCain
        ? <RetratoExorcista
            ficha={sheet}
            own={String(sheet.id) === playerId}
            onOpen={masterMode || String(sheet.id) === playerId ? () => onNavigate('fichas') : null}
          />
        : <Portrait
            sheet={sheet}
            own={String(sheet.id) === playerId}
            active={current?.type === 'player' && currentId === String(sheet.id)}
            onOpen={masterMode || String(sheet.id) === playerId ? () => onPanel('sheet', sheet.id) : null}
          />)}
    </SessionHome>
  </div>;
}

export default function AdventureSession({ onNavigate, masterMode, access }) {
  const experience = useExperience();
  const [focusBusy, setFocusBusy] = useState(false);
  const [focusError, setFocusError] = useState('');
  const playerId = String(access?.sheetId || '');
  const onPanel = (panel, sheetId) => {
    if (masterMode && sheetId) experience.setSelectedSheetId(sheetId);
    openAdventurePanel(panel);
  };
  const onFocus = async tab => {
    if (!masterMode || focusBusy) return;
    setFocusBusy(true); setFocusError('');
    try {
      if (!navigator.onLine) throw new Error('offline');
      await experience.updateSession({ partyFocus: { id: crypto.randomUUID(), tab } });
      onNavigate(tab);
    } catch { setFocusError('Não foi possível reunir o grupo. Confira sua conexão e tente novamente.'); }
    finally { setFocusBusy(false); }
  };
  return <AdventureView {...experience} masterMode={masterMode} playerId={playerId} onNavigate={onNavigate} onPanel={onPanel} onFocus={onFocus} focusBusy={focusBusy} focusError={focusError} council={<Council masterMode={masterMode} playerId={playerId} />} />;
}
