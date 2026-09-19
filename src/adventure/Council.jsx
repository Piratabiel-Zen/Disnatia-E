import { useEffect, useState } from 'react';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../core/firebase';
import { onSnapshot } from './sharedSnapshot';
import { prepareDecision, recordVote, resolveDecision } from './sessionModel';

const decisionRef = () => doc(db, 'config', 'party_decision');

export function CouncilView({ decision, masterMode, playerId, busy, error, onPublish, onVote, onResolve, onCancel, onEdit }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState('');
  const [editing, setEditing] = useState(false);
  const open = decision?.status === 'open';
  const mine = decision?.votes?.[playerId];
  const voteCount = Object.keys(decision?.votes || {}).length;
  const publish = async event => {
    event.preventDefault();
    if (await onPublish(question, options)) { setEditing(false); setQuestion(''); setOptions(''); }
  };
  return <section className="ad-panel ad-council" aria-labelledby="council-heading">
    <div className="ad-section-head"><div><span className="ad-eyebrow">O DESTINO É DO GRUPO</span><h3 id="council-heading">Conselho da companhia</h3></div><span aria-hidden="true" className="ad-seal">◇</span></div>
    {error && <p className="ad-error" role="alert">{error}</p>}
    {decision && !editing ? <>
      <p className="ad-question">{decision.question}</p>
      <div className="ad-choices">{decision.options?.map((option, i) => {
        const votes = Object.values(decision.votes || {}).filter(id => id === option.id).length;
        const chosen = decision.result === option.id;
        return <div className={`ad-choice-row ${chosen ? 'resolved' : ''}`} key={option.id}>
          <button className={`ad-choice ${mine === option.id ? 'selected' : ''}`} aria-pressed={mine === option.id} disabled={!open || busy || !playerId || masterMode} onClick={() => onVote(option.id)}>
            <span className="ad-choice-number">{i + 1}</span><span>{option.label}</span><span className="ad-vote-count">{chosen ? '✓ Escolhida' : `${votes} ${votes === 1 ? 'voto' : 'votos'}`}</span>
          </button>
          {masterMode && open && <button className="ad-resolve" disabled={busy} onClick={() => onResolve(option.id)} aria-label={`Resolver com: ${option.label}`}>Escolher</button>}
        </div>;
      })}</div>
      <p className="ad-muted" role="status">{open ? `${voteCount} ${voteCount === 1 ? 'aventureiro opinou' : 'aventureiros opinaram'}. ${masterMode ? 'Você decide o desfecho.' : mine ? 'Sua escolha foi registrada. Você pode mudar seu voto.' : 'Escolha como deseja agir. O mestre decide o desfecho.'}` : decision.status === 'resolved' ? 'Desfecho registrado no Diário Vivo.' : 'Decisão encerrada pelo mestre.'}</p>
      {masterMode && <button className="ad-text-button" disabled={busy} onClick={open ? onCancel : () => { setEditing(true); onEdit?.(); }}>{open ? 'Encerrar sem desfecho' : 'Abrir uma nova decisão'}</button>}
    </> : masterMode && editing ? <form onSubmit={publish} className="ad-form">
      <label>Pergunta ao grupo<input autoFocus maxLength={240} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Como vocês atravessam o portão?" required /></label>
      <label>Opções, uma por linha<textarea rows={4} value={options} maxLength={966} onChange={e => setOptions(e.target.value)} placeholder={'Negociar com a guarda\nProcurar uma passagem escondida\nEnfrentar os sentinelas'} required /></label>
      <small>De 2 a 6 caminhos. Os jogadores votam; você narra as consequências.</small>
      <div className="ad-button-row"><button className="ad-primary" disabled={busy}>{busy ? 'Publicando…' : 'Apresentar ao grupo'}</button><button type="button" onClick={() => setEditing(false)}>Voltar</button></div>
    </form> : <div className="ad-empty"><p>Cada escolha escreve um novo caminho.</p><span>{masterMode ? 'Apresente uma situação, ouça o grupo e registre o desfecho.' : 'Quando o mestre apresentar uma decisão, suas opções aparecerão aqui.'}</span>{masterMode && <button className="ad-primary" onClick={() => setEditing(true)}>Apresentar uma decisão</button>}</div>}
  </section>;
}

export default function Council({ masterMode, playerId }) {
  const [decision, setDecision] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => onSnapshot(decisionRef(), snap => setDecision(snap.exists() ? snap.data() : null), () => setError('Não foi possível carregar as decisões. Confira sua conexão e o acesso à campanha.')), []);
  const act = async fn => {
    if (busy) return false;
    if (!navigator.onLine) { setError('Reconecte-se para participar da decisão.'); return false; }
    setBusy(true); setError('');
    try { await fn(); return true; } catch (err) {
      setError(err.code ? 'Não foi possível confirmar no servidor. Tente novamente quando a conexão estiver disponível.' : err.message);
      return false;
    } finally { setBusy(false); }
  };
  const publish = (question, lines) => act(async () => {
    if (!masterMode) throw new Error('Apenas o mestre pode apresentar decisões.');
    const next = prepareDecision(question, lines, crypto.randomUUID());
    await runTransaction(db, async tx => {
      const snap = await tx.get(decisionRef());
      if (snap.data()?.status === 'open') throw new Error('Encerre a decisão atual antes de abrir outra.');
      tx.set(decisionRef(), { ...next, updatedAt: serverTimestamp() });
    });
  });
  const vote = optionId => act(() => runTransaction(db, async tx => {
    if (masterMode) throw new Error('O mestre define o desfecho.');
    const snap = await tx.get(decisionRef());
    tx.update(decisionRef(), { votes: recordVote(snap.data(), decision?.id, playerId, optionId), updatedAt: serverTimestamp() });
  }));
  const resolve = optionId => act(() => runTransaction(db, async tx => {
    if (!masterMode) throw new Error('Apenas o mestre pode resolver decisões.');
    const snap = await tx.get(decisionRef());
    const result = resolveDecision(snap.data(), decision?.id, optionId);
    tx.update(decisionRef(), { status: result.status, result: result.result, updatedAt: serverTimestamp() });
    tx.set(doc(db, 'session_journal', `decision_${decision.id}`), { text: result.text, type: 'story', source: 'party-decision', icon: '◇', color: '#c6a66b', memory: true, ts: Date.now(), committedAt: serverTimestamp() });
  }));
  const cancel = () => act(() => runTransaction(db, async tx => {
    if (!masterMode) throw new Error('Apenas o mestre pode encerrar decisões.');
    const snap = await tx.get(decisionRef());
    if (snap.data()?.id !== decision?.id || snap.data()?.status !== 'open') throw new Error('A decisão já mudou.');
    tx.update(decisionRef(), { status: 'cancelled', updatedAt: serverTimestamp() });
  }));
  return <CouncilView decision={decision} masterMode={masterMode} playerId={playerId} busy={busy} error={error} onPublish={publish} onVote={vote} onResolve={resolve} onCancel={cancel} onEdit={() => setError('')} />;
}
