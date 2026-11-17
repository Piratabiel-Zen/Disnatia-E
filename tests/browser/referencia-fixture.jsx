// As três abas de referência do CAIN, uma embaixo da outra.
import { createRoot } from 'react-dom/client';
import ManualCainPage from '../../src/features/cain/ManualCainPage';
import BlasfemiasPage from '../../src/features/cain/BlasfemiasPage';
import TiposDePecadoPage from '../../src/features/cain/TiposDePecadoPage';

// Pinta a raiz com a paleta da mesa, como o App faz em produção.
import { CAMPAIGN_THEMES } from '../../src/core/temas.mjs';
const tema = CAMPAIGN_THEMES[new URLSearchParams(location.search).get('tema') || 'veneziano'];
const raiz = document.documentElement;
raiz.dataset.temaMesa = new URLSearchParams(location.search).get('tema') || 'veneziano';
raiz.style.setProperty('--accent', tema.accent);
raiz.style.setProperty('--accent-soft', tema.accentSoft);
raiz.style.setProperty('--contraste-mesa', tema.contraste);
raiz.style.setProperty('--contraste-claro-mesa', tema.contrasteSoft);
raiz.style.setProperty('--superficie-mesa', tema.superficie);
raiz.style.setProperty('--linha-mesa', tema.linha);
raiz.style.setProperty('--fundo-mesa', tema.bg);
raiz.style.setProperty('--ink-mesa', tema.ink);
document.body.style.background = tema.bg;

const qual = new URLSearchParams(location.search).get('aba') || 'manual';
const Pagina = qual === 'agendas' ? BlasfemiasPage : qual === 'pecados' ? TiposDePecadoPage : ManualCainPage;

createRoot(document.getElementById('root')).render(<Pagina />);
