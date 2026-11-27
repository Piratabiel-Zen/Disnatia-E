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
  /* TODAS AS FICHAS DA MESA.
     Houve aqui um filtro que escondia a ficha "sem dono, sem retrato, nome
     padrão" do quadro do grupo. A intenção era tirar um registro
     abandonado de uma mesa específica, e o efeito foi pior que o problema:
     numa mesa em que ninguém ligou a conta ainda — que é toda mesa no
     começo — ele escondia o elenco INTEIRO, e o quadro ficava dizendo
     "Ninguém nesta frente ainda" com cinco fichas cadastradas.

     Ficha que não serve se apaga na aba de Fichas, que é onde isso é
     intencional e reversível. O quadro do lugar mostra quem está na mesa. */
  const frentes = splitParty(sheets, groups);
  const mine = current && String(current.id) === String(playerId);
  const [busy, setBusy] = useState(false);
  // Null para o Mestre e para quem ainda não tem nada escrito na ficha.
  const capitulo = meuCapitulo({ sheets, playerId, groups, masterMode });

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
        <span className="sessao-kicker">{campaign?.name || 'Dinastia E'}</span>
        <h2>{session.title || 'Sua próxima aventura'}</h2>
        {session.subtitle ? <p>{session.subtitle}</p> : null}
      </header>

      {/* A faixa de rodada e turno saiu junto com o console de combate:
          sem quem ligue `combat.active`, ela nunca aparecia — e o código
          que a desenhava só servia para confundir quem lesse. */}

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
