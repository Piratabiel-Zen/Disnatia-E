// A barra do topo da mortalha com a mesma estrutura do app: marca à
// esquerda do DOM, ações à direita, e a fita logo abaixo. É aqui que o
// título e as pastilhas de latão estavam caindo um em cima do outro.
import { createRoot } from 'react-dom/client';
import '../../src/experience/experience.css';
import '../../src/adventure/adventure.css';
import '../../src/adventure/sessao.css';
import '../../src/features/oneshot/mortalha-casca.css';

const ABAS=['Sessão atual','Cenário do horror','Fichas','Mural','Aparições','Regras','Talentos'];

function Demo(){
  return <div className="adventure-shell immersive-stage">
    <header className="immersive-topbar">
      <div className="brand-line">
        <span className="brand-mark">✦</span>
        <div><h1>Relatos do Macabro</h1><small>Terra · Cenário do horror</small></div>
      </div>
      <div className="top-actions">
        <span className="ad-connection">● Conectado</span>
        <button className="ad-quality">✦ Imersivo</button>
        <button>♪</button>
        <button>Mestre · mesa do mestre</button>
        <button>Senha da mesa</button>
        <button>Senha de mestre</button>
        <button>Mestre</button>
      </div>
    </header>
    <nav className="grim-nav">
      {ABAS.map((a,i)=><button key={a} className={'grim-link'+(i===0?' active':'')}>{a}</button>)}
    </nav>
    <div className="sessao-frente ad-party" style={{margin:18,padding:14}}>
      <div className="ad-party-viewport"><div className="ad-party-row">
        {['Mika','Takuro'].map(n=>(
          <div className="sessao-integrante" key={n}>
            <button className="ad-companion noite">
              <span className="ad-portrait"><span className="ad-portrait-fallback">{n[0]}</span></span>
              <span className="ad-companion-name">{n}</span>
              <span className="ad-companion-class">Seu personagem</span>
            </button>
          </div>
        ))}
      </div></div>
    </div>
  </div>;
}
createRoot(document.getElementById('root')).render(<Demo/>);
