import { memo, useState } from 'react';
import { useExperience } from '../experience/ExperienceKit';
import { CLASSES, getSheetMaxHp } from '../data/gameData';
import Council from './Council';

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

const PartyRoster = memo(function PartyRoster({ sheets, playerId, current, masterMode, onPanel }) {
  return <div className="ad-party-viewport" aria-label="Integrantes da companhia">
    <div className="ad-party-row">
      {sheets.length ? sheets.map(sheet => <Portrait
        key={sheet.id}
        sheet={sheet}
        own={String(sheet.id) === playerId}
        active={current?.type === 'player' && String(current.id).replace(/^p_/, '') === String(sheet.id)}
        onOpen={String(sheet.id) === playerId || masterMode ? () => onPanel('sheet', sheet.id) : undefined}
      />) : <p className="ad-muted ad-party-empty" role="status">Aguardando as fichas da companhia…</p>}
    </div>
  </div>;
});

export function AdventureView({ session, combat, combatState, sheets, selectedSheet, playerId, masterMode, journal, activeMap, onNavigate, onPanel, onFocus, focusBusy, focusError, council }) {
  const current = combatState?.initiative?.[combatState.turnIdx || 0];
  const mine = current?.type === 'player' && String(current.id).replace(/^p_/, '') === playerId;
  const recent = journal.slice(0, 4);
  return <div className="adventure-page">
    <section className={`ad-scene ${combat.active ? 'in-combat' : ''}`} aria-labelledby="ad-title">
      <div className="ad-scene-art" aria-hidden="true"><div className="ad-arch"/><div className="ad-orbit"/><span className="ad-celestial">✦</span></div>
      <div className="ad-scene-copy"><span className="ad-eyebrow">{combat.active ? '⚔ O DESTINO SE DECIDE AGORA' : 'UMA HISTÓRIA ESCRITA EM CONJUNTO'}</span><h2 id="ad-title">{session.title || 'Sua próxima aventura'}</h2><p>{session.subtitle || 'Reúna sua companhia. Toda escolha deixa uma marca em Cosmum.'}</p>
        <div className="ad-location"><span>⌖</span>{session.location || 'Um novo caminho aguarda'}</div>
        {session.objective ? <div className="ad-objective"><span className="ad-objective-icon" aria-hidden="true">◇</span><div><span className="ad-eyebrow">OBJETIVO ATUAL</span><p>{session.objective}</p></div></div> : null}
        <div className="ad-button-row"><button className="ad-primary ad-desktop-only" onClick={() => activeMap?.activeId ? onNavigate('mapabatalha') : onPanel(masterMode ? 'director' : 'sheet')}>{activeMap?.activeId ? 'Entrar na cena' : masterMode ? 'Preparar a sessão' : 'Abrir personagem'} <span>→</span></button><button className="ad-mobile-only ad-primary" onClick={() => onPanel(masterMode ? 'director' : 'sheet')}>{masterMode ? 'Dirigir a sessão' : 'Abrir personagem'} →</button></div>
      </div>
    </section>

    {combat.active && <div className={`ad-turn-banner ${mine ? 'mine' : ''}`} role="status"><span className="ad-turn-round">RODADA <b>{combatState.round || 1}</b></span><div><span className="ad-eyebrow">{mine ? 'SUA VEZ DE AGIR' : 'NA LINHA DE FRENTE'}</span><strong>{current?.nome || combat.currentNome || 'Aguardando iniciativa'}</strong></div><button onClick={() => onPanel(masterMode ? 'combat' : 'abilities')}>{masterMode ? 'Controlar combate' : 'Ver minhas ações'} →</button></div>}

    <section className="ad-party" aria-labelledby="party-heading"><div className="ad-section-head"><h3 id="party-heading">Sua companhia</h3><span className="ad-muted">{sheets.length} {sheets.length === 1 ? 'integrante' : 'integrantes'}</span></div>
      <PartyRoster sheets={sheets} playerId={playerId} current={current} masterMode={masterMode} onPanel={onPanel} />
    </section>

    <div className="ad-lower-grid">{council}<section className="ad-panel ad-journal"><div className="ad-section-head"><h3>Últimos acontecimentos</h3><button className="ad-text-button" onClick={() => onPanel('journal')}>Abrir diário ↗</button></div>{recent.length ? <ol>{recent.map(row => <li key={row.id}><span className="ad-journal-rune" aria-hidden="true">{row.icon || '◇'}</span><div><p>{row.text}</p><small>{row.memory ? 'MEMÓRIA DA COMPANHIA' : row.type === 'combat' ? 'COMBATE' : 'DIÁRIO VIVO'}</small></div></li>)}</ol> : <div className="ad-empty"><p>A jornada ainda guarda seus segredos.</p><span>Descobertas, decisões e acontecimentos aparecerão aqui.</span></div>}</section></div>

    {masterMode && <section className="ad-director-bar"><div><h3>Conduza a próxima cena</h3><p>Reúna os jogadores na mesma tela com um comando.</p></div><div className="ad-button-row"><button disabled={focusBusy} onClick={() => onFocus('session')}>Reunir companhia</button><button className="ad-desktop-only" disabled={focusBusy || !activeMap?.activeId} onClick={() => onFocus('mapabatalha')}>Mostrar cena tática</button><button onClick={() => onPanel('director')} className="ad-primary">Direção de cena →</button></div>{focusError && <p className="ad-error" role="alert">{focusError}</p>}</section>}
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
