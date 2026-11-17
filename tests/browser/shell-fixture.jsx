// Reproduz a casca da sessão para conferir que o cenário fica ATRÁS e não
// empurra nada: navegação fixa à esquerda, barra do topo e palco.
import { createRoot } from 'react-dom/client';
import CenarioDaMesa from '../../src/experience/CenarioDaMesa';
import '../../src/experience/experience.css';
import '../../src/experience/game-experience-3.css';
import '../../src/experience/cosmic-living-background.css';
import '../../src/experience/atmosferas-de-mesa.css';

import { CAMPAIGN_THEMES } from '../../src/core/temas.mjs';
const tema = CAMPAIGN_THEMES.veneziano;
const raiz = document.documentElement;
raiz.dataset.temaMesa = 'veneziano';
raiz.style.setProperty('--accent', tema.accent);
raiz.style.setProperty('--accent-soft', tema.accentSoft);
raiz.style.setProperty('--contraste-mesa', tema.contraste);
raiz.style.setProperty('--contraste-claro-mesa', tema.contrasteSoft);
raiz.style.setProperty('--superficie-mesa', tema.superficie);
raiz.style.setProperty('--linha-mesa', tema.linha);
raiz.style.setProperty('--fundo-mesa', tema.bg);
raiz.style.setProperty('--ink-mesa', tema.ink);
const mesa = { id: 'estrela-de-absinto', name: 'Estrela de Absinto', world: 'Terra Dourada' };

createRoot(document.getElementById('root')).render(
  <div className="adventure-shell access-master"
       style={{height:'100vh',overflow:'hidden',background:tema.bg,
               color:'var(--ink-mesa,#C8B8A0)',position:'relative'}}>
    <CenarioDaMesa campaign={mesa} />
    <nav className="grim-nav" style={{'--grim-w':'76px'}}>
      <div style={{padding:12,color:tema.accentSoft,fontFamily:'Cinzel,serif'}}>◈</div>
    </nav>
    <div className="immersive-stage">
      <header className="immersive-topbar">
        <div style={{fontFamily:'Cinzel,serif',letterSpacing:'.12em',color:tema.accentSoft}}>
          ESTRELA DE ABSINTO
        </div>
        <button className="mesa-senha-button" style={{padding:'6px 12px'}}>🔑 Senha da mesa</button>
      </header>
      <div className="immersive-content" style={{padding:'40px 48px'}}>
        <h1 style={{fontFamily:'Cinzel,serif',color:tema.contrasteSoft,margin:0}}>SUA PRÓXIMA AVENTURA</h1>
        <p style={{maxWidth:560,lineHeight:1.7}}>O conteúdo da sessão começa logo abaixo da
           barra do topo, como sempre esteve.</p>
      </div>
    </div>
  </div>
);
