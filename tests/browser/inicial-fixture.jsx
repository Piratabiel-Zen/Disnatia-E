// A página inicial da sessão, com as classes que o SessionHome desenha.
import { createRoot } from 'react-dom/client';
import '../../src/adventure/adventure.css';
import '../../src/experience/game-experience-3.css';
import '../../src/features/oneshot/mortalha-casca.css';
document.documentElement.dataset.temaMesa='mortalha';

createRoot(document.getElementById('root')).render(
  <div className="adventure-shell" style={{minHeight:'100vh',background:'#0C0908',padding:24}}>
    <div className="sessao-home">
      <div className="sessao-ceu" aria-hidden="true"><i/><i/></div>
      <header className="sessao-titulo">
        <span className="sessao-kicker">Relatos do Macabro</span>
        <h2>Sua próxima aventura</h2>
        <p>Nem todo horror é ficção. Alguns são relatos que ninguém deveria ter contado.</p>
      </header>
      <div className="sessao-frentes">
        <header className="sessao-local">
          <span className="sessao-local-astro" aria-hidden="true"><i/><i/></span>
          <div className="sessao-local-texto"><strong>Defina o lugar</strong>
            <p>Ninguém nesta frente ainda.</p></div>
        </header>
      </div>
      <div className="sessao-acoes">
        <button className="sessao-acao-principal">Dirigir a sessão →</button>
        <button className="sessao-acao">Diário</button>
        <button className="sessao-acao">Dividir em dois grupos</button>
      </div>
    </div>
  </div>);
