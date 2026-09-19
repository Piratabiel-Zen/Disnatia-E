// Isolated UI fixture. No connection, credentials or writes to the campaign.
// Vite's production entry is index.html; this page is never included in dist.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AdventureView } from '../.generated/src/adventure/AdventureSession';
import { CouncilView } from '../.generated/src/adventure/Council';
import { prepareDecision, recordVote, resolveDecision } from '../src/adventure/sessionModel';
import '../.generated/src/adventure/adventure.css';

const sheets = ['Ignácio Caetano', 'Jansen de Louros', 'Matheus Detel', 'Kenai Ursos', 'Jack Daniels'].map((nome, i) => ({ id: `p${i}`, nome, hp: 22 - i * 3, hp_base: 25, hp_bonus: 5, durabilidade: 4, vigos: 6 }));
const session = { active: true, title: 'Os ecos de Pequeninis', subtitle: 'Além do portão, uma cidade guarda aquilo que o tempo tentou esquecer.', location: 'Pequeninis · Velho Oeste', objective: 'Descobrir o paradeiro de Jason Black e investigar os Devoradores de Ecos.' };

function Preview() {
  const [masterMode, setMaster] = useState(true);
  const [decision, setDecision] = useState(prepareDecision('A guarda bloqueia a passagem. Como vocês querem agir?', 'Conversar com os guardas\nInvestigar a passagem lateral\nAguardar o anoitecer', 'fixture'));
  const [journal, setJournal] = useState([{ id: 'j1', text: 'A companhia chegou a Pequeninis. O poço central está silencioso.', memory: true }, { id: 'j2', text: 'Um nome surgiu na conversa: Jason Black.', icon: '◇' }]);
  const [notice, setNotice] = useState('');
  const [combat, setCombat] = useState(false);
  const onResolve = id => { const result = resolveDecision(decision, decision.id, id); setDecision({ ...decision, ...result }); setJournal([{ id: 'decision', text: result.text, memory: true }, ...journal]); };
  return <div style={{ background: '#0b1217', minHeight: '100vh', padding: '16px 24px', boxSizing: 'border-box' }}>
    <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', color: '#c9b987' }}><span>Prévia isolada · dados fictícios</span><button onClick={() => setMaster(v => !v)}>{masterMode ? 'Ver como jogador' : 'Ver como mestre'}</button><button onClick={() => setCombat(v => !v)}>Alternar combate</button><span role="status">{notice}</span></div>
    <AdventureView session={session} combat={{ active: combat }} combatState={{ round: 3, turnIdx: 0, initiative: [{ id: 'p_p0', type: 'player', nome: sheets[0].nome }] }} sheets={sheets} selectedSheet={sheets[0]} playerId="p0" masterMode={masterMode} journal={journal} activeMap={{ activeId: 'fixture' }} onNavigate={setNotice} onPanel={setNotice} onFocus={setNotice}
      council={<CouncilView decision={decision} masterMode={masterMode} playerId="p0" onPublish={async (q, o) => { setDecision(prepareDecision(q, o, 'fixture2')); return true; }} onVote={id => setDecision({ ...decision, votes: recordVote(decision, decision.id, 'p0', id) })} onResolve={onResolve} onCancel={() => setDecision({ ...decision, status: 'cancelled' })} />} />
  </div>;
}

createRoot(document.getElementById('root')).render(<Preview />);
