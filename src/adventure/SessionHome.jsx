import { useState } from 'react';
import { setDoc } from 'firebase/firestore';
import { activeCampaign, campaignTheme, docIn } from '../core/campaign';
import { GROUP_KEYS, groupOf, readGroups, splitParty } from './grupos.mjs';
import './sessao.css';

// A TELA INICIAL DA SESSÃO
//
// Ela responde três perguntas, nessa ordem: que história é esta, onde a
// companhia está, e quem está lá. Nada mais fica na tela por padrão — diário,
// decisões e direção de cena continuam existindo, mas atrás de um toque.
//
// "Onde a companhia está" é plural de propósito: grupo que se divide é regra
// em mesa de RPG, não exceção. Quando o Mestre liga a segunda frente, a tela
// passa a mostrar dois lugares, cada um com os seus personagens, ligados pela
// mesma linha — dá para ver num relance quem ficou de que lado.

function LocationHead({ frente, único, masterMode, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(frente.local);
  const commit = () => { setEditing(false); if (draft !== frente.local) onRename(draft); };

  return (
    <header className="sessao-local">
      <span className="sessao-local-astro" aria-hidden="true"><i /><i /></span>
      <div className="sessao-local-texto">
        {!único && <small>{frente.nome}</small>}
        {editing ? (
          <input
            className="sessao-local-input"
            value={draft}
            autoFocus
            onChange={event => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={event => {
              if (event.key === 'Enter') commit();
              if (event.key === 'Escape') { setDraft(frente.local); setEditing(false); }
            }}
            placeholder="Onde este grupo está"
          />
        ) : (
          <strong>{frente.local || (masterMode ? 'Defina o lugar' : 'Lugar ainda não revelado')}</strong>
        )}
      </div>
      {masterMode && !editing && (
        <button type="button" className="sessao-local-editar" onClick={() => { setDraft(frente.local); setEditing(true); }}>
          Trocar lugar
        </button>
      )}
    </header>
  );
}

export default function SessionHome({
  session, combat, combatState, sheets, playerId, masterMode, current, onPanel, onNavigate, activeMap, children,
}) {
  const campaign = activeCampaign();
  const theme = campaignTheme(campaign);
  const groups = readGroups(session);
  const frentes = splitParty(sheets, groups);
  const mine = current && String(current.id) === String(playerId);
  const [busy, setBusy] = useState(false);

  const saveGroups = async next => {
    if (!masterMode || busy) return;
    setBusy(true);
    try { await session.update({ grupos: next }); } finally { setBusy(false); }
  };
  const moveSheet = async (sheetId, grupo) => {
    if (!masterMode) return;
    try { await setDoc(docIn('sheets', String(sheetId)), { grupo }, { merge: true }); } catch (_) {}
  };

  return (
    <div className="sessao-home" style={{ '--accent': theme.accent, '--accent-soft': theme.accentSoft }}>
      <div className="sessao-ceu" aria-hidden="true"><i /><i /></div>

      <header className="sessao-titulo">
        <span className="sessao-kicker">{combat.active ? 'O destino se decide agora' : campaign?.name || 'Dinastia E'}</span>
        <h2>{session.title || 'Sua próxima aventura'}</h2>
        {session.subtitle ? <p>{session.subtitle}</p> : null}
      </header>

      {combat.active && (
        <div className={`ad-turn-banner sessao-turno ${mine ? 'mine' : ''}`} role="status">
          <span className="ad-turn-round">Rodada <b>{combatState.round || 1}</b></span>
          <div>
            <span className="ad-eyebrow">{mine ? 'Sua vez de agir' : 'Na linha de frente'}</span>
            <strong>{current?.nome || combat.currentNome || 'Aguardando iniciativa'}</strong>
          </div>
          <button onClick={() => onPanel(masterMode ? 'combat' : 'abilities')}>
            {masterMode ? 'Controlar combate' : 'Ver minhas ações'} →
          </button>
        </div>
      )}

      <div className={`sessao-frentes${groups.ativo ? ' is-dividida' : ''}`}>
        {frentes.map(frente => (
          <section className="sessao-frente ad-party" key={frente.key} aria-label={frente.local || frente.nome}>
            <LocationHead
              frente={frente}
              único={!groups.ativo}
              masterMode={masterMode}
              onRename={local => saveGroups({ ...groups, [frente.key]: { ...groups[frente.key], local } })}
            />
            <div className="ad-party-viewport" aria-label="Integrantes">
              <div className="ad-party-row">
                {frente.sheets.length ? frente.sheets.map(sheet => (
                  <div className="sessao-integrante" key={sheet.id}>
                    {children(sheet)}
                    {masterMode && groups.ativo && (
                      <div className="sessao-mover" role="group" aria-label={`Frente de ${sheet.nome || 'personagem'}`}>
                        {GROUP_KEYS.map(key => (
                          <button
                            key={key}
                            type="button"
                            className={groupOf(sheet, true) === key ? 'is-on' : ''}
                            onClick={() => moveSheet(sheet.id, key)}
                            title={`Mover para ${groups[key].nome}`}
                          >{key.toUpperCase()}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )) : <p className="sessao-vazio" role="status">Ninguém nesta frente ainda.</p>}
              </div>
            </div>
          </section>
        ))}
      </div>

      {session.objective ? (
        <p className="sessao-objetivo"><span aria-hidden="true">◇</span>{session.objective}</p>
      ) : null}

      <div className="sessao-acoes">
        <button className="sessao-acao-principal" onClick={() => (activeMap?.activeId && !masterMode ? onNavigate('mapabatalha') : onPanel(masterMode ? 'director' : 'sheet'))}>
          {masterMode ? 'Dirigir a sessão' : activeMap?.activeId ? 'Entrar na cena' : 'Abrir meu personagem'} →
        </button>
        <button className="sessao-acao" onClick={() => onPanel('journal')}>Diário</button>
        {masterMode && (
          <button
            className="sessao-acao"
            disabled={busy}
            onClick={() => saveGroups({ ...groups, ativo: !groups.ativo })}
          >{groups.ativo ? 'Reunir em um grupo' : 'Dividir em dois grupos'}</button>
        )}
      </div>
    </div>
  );
}
