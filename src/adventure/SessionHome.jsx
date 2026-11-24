import { useState } from 'react';
import { setDoc } from 'firebase/firestore';
import { activeCampaign, campaignTheme, docIn } from '../core/campaign';
import { colecaoDeFichas } from '../core/sistemas/index.mjs';
import { GROUP_KEYS, groupOf, readGroups, splitParty } from './grupos.mjs';
import { meuCapitulo } from './meuCapitulo.mjs';
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

/* O CAPÍTULO DO JOGADOR
   Vem depois de tudo, e só para quem joga. A ordem dentro dele segue a
   pergunta que o jogador faz ao sentar: quem sou eu, de que lado estou, o que
   eu quero. A lore entra resumida porque a tela inicial é um relance — quem
   quiser o texto inteiro abre com um toque, sem sair da tela. */
function MeuCapitulo({ capitulo, onPanel }) {
  const [aberto, setAberto] = useState(false);
  const { nome, lore, tracos, objetivos, frente } = capitulo;

  return (
    <section className="sessao-capitulo" aria-label={nome ? `Seu personagem, ${nome}` : 'Seu personagem'}>
      <header className="sessao-capitulo-topo">
        <div className="sessao-capitulo-quem">
          <span className="sessao-capitulo-rotulo">Seu personagem</span>
          {nome ? <strong>{nome}</strong> : null}
        </div>
        {frente.dividida && frente.nome ? (
          <span className={`sessao-capitulo-frente frente-${frente.chave}`}>
            <i aria-hidden="true" />
            <span>
              <small>Você está no</small>
              <b>{frente.nome}</b>
            </span>
            {frente.local ? <em>{frente.local}</em> : null}
          </span>
        ) : null}
      </header>

      <div className="sessao-capitulo-corpo">
      {lore.resumo ? (
        <div className="sessao-capitulo-lore">
          <p>{aberto ? lore.inteiro : lore.resumo}</p>
          {lore.cortado && (
            <button type="button" className="sessao-capitulo-mais" onClick={() => setAberto(v => !v)}>
              {aberto ? 'Recolher' : 'Ler a história inteira'}
            </button>
          )}
        </div>
      ) : null}

      {(tracos.length > 0 || objetivos.length > 0) && (
        <div className="sessao-capitulo-grade">
          {tracos.length > 0 && (
            <div className="sessao-capitulo-campo">
              <span className="sessao-capitulo-rotulo">Personalidade</span>
              <ul className="sessao-capitulo-tracos">
                {tracos.map(traco => <li key={traco}>{traco}</li>)}
              </ul>
            </div>
          )}
          {objetivos.length > 0 && (
            <div className="sessao-capitulo-campo">
              <span className="sessao-capitulo-rotulo">Seus objetivos</span>
              <ol className="sessao-capitulo-objetivos">
                {objetivos.map(objetivo => (
                  <li key={objetivo}><i aria-hidden="true">◇</i><span>{objetivo}</span></li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
      </div>

      <button type="button" className="sessao-capitulo-ficha" onClick={() => onPanel('sheet')}>
        {tracos.length || objetivos.length ? 'Abrir minha ficha' : 'Escrever na minha ficha'} →
      </button>
    </section>
  );
}

export default function SessionHome({
  session, combat, combatState, sheets, playerId, masterMode, current, onPanel, onNavigate, activeMap, children,
}) {
  const campaign = activeCampaign();
  const theme = campaignTheme(campaign);
  const groups = readGroups(session);
  /* FICHA QUE NINGUÉM ABRIU NÃO É INTEGRANTE DO GRUPO.
     Uma mesa acumula fichas criadas e abandonadas — nome padrão, sem dono,
     sem retrato, nada escrito. Elas apareciam no quadro do lugar como se
     fosse gente, e o Mestre olhava para um "Aventureiro" que não existe em
     cena nenhuma.

     A ficha NÃO é apagada: continua inteira no banco e na aba de fichas,
     que é onde se apaga de propósito. Isto aqui é só o quadro do grupo
     deixando de contar como presente quem nunca chegou. */
  const naMesa = (sheets || []).filter(f => {
    if (!f) return false;
    if (f.dono || f.ownerId || f.visitorId || f.playerId) return true;
    if (f.foto) return true;
    const nome = String(f.nome || '').trim().toLowerCase();
    return Boolean(nome) && nome !== 'aventureiro' && nome !== 'personagem';
  });
  const frentes = splitParty(naMesa, groups);
  const mine = current && String(current.id) === String(playerId);
  const [busy, setBusy] = useState(false);
  // Null para o Mestre e para quem ainda não tem nada escrito na ficha.
  const capitulo = meuCapitulo({ sheets: naMesa, playerId, groups, masterMode });

  const saveGroups = async next => {
    if (!masterMode || busy) return;
    setBusy(true);
    try { await session.update({ grupos: next }); } finally { setBusy(false); }
  };
  const moveSheet = async (sheetId, grupo) => {
    if (!masterMode) return;
    // Grava na coleção de fichas DESTA mesa: numa mesa de CAIN, mover de
    // grupo escrevia num documento de 'sheets' que nem existe mais ali.
    try { await setDoc(docIn(colecaoDeFichas(activeCampaign()), String(sheetId)), { grupo }, { merge: true }); } catch (_) {}
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

      {capitulo ? <MeuCapitulo capitulo={capitulo} onPanel={onPanel} /> : null}
    </div>
  );
}
