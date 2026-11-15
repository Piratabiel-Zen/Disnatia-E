// A tela inicial da sessão, sem Firebase: serve para ver o layout com a
// companhia junta e dividida em duas frentes.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/global.css';
import '../../src/experience/experience.css';
import '../../src/experience/site-polish.css';
import '../../src/adventure/adventure.css';
import SessionHome from '../../src/adventure/SessionHome';

const SHEETS = [
  { id: '1', nome: 'Ignácio', classe: 'fogo', hp: 18, grupo: 'a' },
  { id: '2', nome: 'Jansen', classe: 'escarlate', hp: 24, grupo: 'a' },
  { id: '3', nome: 'Kenai', classe: 'corvos', hp: 12, grupo: 'b' },
  { id: '4', nome: 'Jack Daniels', classe: 'bardo', hp: 15, grupo: 'b' },
];

function Demo() {
  const params = new URLSearchParams(location.search);
  const [grupos, setGrupos] = useState({
    ativo: params.has('dividido'),
    a: { nome: 'Grupo A', local: 'Catedral Submersa' },
    b: { nome: 'Grupo B', local: 'Estrada de Cinzas' },
  });
  const session = {
    title: 'O Silêncio da Pirâmide',
    subtitle: 'Terceira noite sob a cúpula, e a água continua subindo.',
    objective: 'Encontrar a câmara selada antes que a maré cubra o corredor leste.',
    grupos,
    update: patch => { setGrupos(patch.grupos); return Promise.resolve(); },
  };
  return <div className="adventure-page" style={{ padding: 24, minHeight: '100vh' }}>
    <SessionHome
      session={session}
      combat={{ active: params.has('combate') }}
      combatState={{ round: 3, turnIdx: 0, initiative: [{ id: 'p_2', nome: 'Jansen', type: 'player' }] }}
      sheets={SHEETS}
      playerId="2"
      masterMode={params.has('mestre')}
      current={{ id: '2', nome: 'Jansen', type: 'player' }}
      activeMap={{ activeId: '' }}
      onPanel={() => {}}
      onNavigate={() => {}}
    >
      {sheet => <button className="ad-companion" style={{ width: 118 }}>
        <span className="ad-portrait"><span className="ad-portrait-fallback">{sheet.nome[0]}</span></span>
        <span className="ad-companion-name">{sheet.nome}</span>
        <span className="ad-companion-class">{sheet.classe}</span>
        <span className="ad-hp-track"><i style={{ width: '70%' }} /></span>
        <span className="ad-companion-hp">{sheet.hp} / 24 PV</span>
      </button>}
    </SessionHome>
  </div>;
}
createRoot(document.getElementById('root')).render(<Demo />);
