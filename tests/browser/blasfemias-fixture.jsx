// A aba Agendas e blasfêmias, para olhar a grade fechada e o painel aberto.
import { createRoot } from 'react-dom/client';
import BlasfemiasPage from '../../src/features/cain/BlasfemiasPage';

// Mesa veneziana: vermelho escuro, azul marinho, preto. É nessas cores que a
// tela vai ser usada de verdade, então é nelas que se olha.
const veneziano = {
  '--fundo-mesa': '#070910', '--superficie-mesa': '#0F1320', '--linha-mesa': '#232C42',
  '--contraste-mesa': '#8CA0C4', '--contraste-claro-mesa': '#C3D0E6', '--ink-mesa': '#D4D7E0',
};
for (const [k, v] of Object.entries(veneziano)) document.documentElement.style.setProperty(k, v);

createRoot(document.getElementById('root')).render(
  <div style={{ background: '#070910', minHeight: '100vh', padding: 18 }}>
    <BlasfemiasPage />
  </div>,
);
