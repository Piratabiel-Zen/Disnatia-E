// A PÁGINA INICIAL NO CORTE DA REFERÊNCIA
//
// Mesma estrutura que o app monta: barra, fita, e a sessão com o
// pergaminho à esquerda e o quadro do lugar à direita. Serve para medir o
// arranjo e para olhar — a referência que Gabriel mandou é uma imagem, e
// comparar imagem com imagem é a única checagem que vale aqui.
import { createRoot } from 'react-dom/client';
import '../../src/experience/experience.css';
import '../../src/adventure/adventure.css';
import '../../src/adventure/sessao.css';
import '../../src/features/oneshot/mortalha-casca.css';
import { nomeEmDuasTintas } from '../../src/adventure/nomeEmDuasTintas.mjs';

const ABAS = [
  ['✦', 'Sessão atual'], ['🔖', 'Cenário do horror'], ['📄', 'Fichas'],
  ['📌', 'Mural'], ['☾', 'Aparições'], ['§', 'Regras'], ['✸', 'Talentos'],
];

function Demo() {
  return <div className="adventure-shell immersive-stage">
    <header className="immersive-topbar">
      <div className="brand-line">
        <span className="brand-mark">✦</span>
        <div><h1>{nomeEmDuasTintas('Relatos do Macabro')}</h1><small>Terra · Cenário do horror</small></div>
      </div>
      <div className="top-actions">
        <button className="live-status">● Tempo real</button>
        <button className="ad-quality">♛ Leve</button>
        <button>Ⓜ Mestre</button>
        <button>⚿ Senha da mesa</button>
        <button>🔒 Senha de mestre</button>
      </div>
    </header>
    <nav className="grim-nav">
      {ABAS.map(([ic, a], i) => (
        <button key={a} className={'grim-link' + (i === 0 ? ' active' : '')}>
          <span className="grim-icon">{ic}</span>{a}
        </button>
      ))}
    </nav>

    <div className="immersive-content page-stage-session">
    <div className="sessao-home">
      <div className="sessao-ceu" aria-hidden="true"><i /><i /></div>
      <header className="sessao-titulo">
        <span className="sessao-kicker">Relatos do Macabro</span>
        <h2>A visita ao vovô</h2>
        <p>O reencontro para toda vida, uma lembrança que vai de hoje até o túmulo…</p>
      </header>
      <div className="sessao-frentes">
        <section className="sessao-frente ad-party">
          <h3 className="ad-location">Mansão dos Nakamura</h3>
          <div className="ad-party-viewport"><div className="ad-party-row">
            {['Yes —'].map(n => (
              <div className="sessao-integrante" key={n}>
                <button className="ad-companion noite">
                  <span className="ad-portrait"><span className="ad-portrait-fallback">{n[0]}</span></span>
                  <span className="ad-companion-name">{n}</span>
                  <span className="ad-companion-class">Companheiro</span>
                </button>
              </div>
            ))}
          </div></div>
        </section>
      </div>
      <div className="sessao-acoes">
        <button className="sessao-acao-principal">Dirigir a sessão →</button>
        <button className="sessao-acao">Diário</button>
        <button className="sessao-acao">Dividir em dois grupos</button>
      </div>
    </div>
    </div>
  </div>;
}

document.documentElement.dataset.temaMesa = 'mortalha';
createRoot(document.getElementById('root')).render(<Demo />);
