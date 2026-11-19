// O selo de acesso restrito sobre o registro, nas cores da Estrela de Absinto.
import { createRoot } from 'react-dom/client';
import SeloDeAcessoRestrito from '../../src/features/cain/SeloDeAcessoRestrito.jsx';

const veneziano = {
  '--fundo-mesa': '#070910', '--superficie-mesa': '#0F1320', '--linha-mesa': '#232C42',
  '--contraste-mesa': '#8CA0C4', '--contraste-claro-mesa': '#C3D0E6', '--ink-mesa': '#D4D7E0',
};
for (const [k, v] of Object.entries(veneziano)) document.documentElement.style.setProperty(k, v);

createRoot(document.getElementById('root')).render(
  <div style={{ background: '#070910', minHeight: '100vh' }}>
    <SeloDeAcessoRestrito nome="Kennedy Flanders" aoFechar={() => {}} />
  </div>,
);
