// A barra do topo da mortalha com a mesma estrutura do app: marca à
// esquerda do DOM, ações à direita, e a fita logo abaixo. É aqui que o
// título e as pastilhas de latão estavam caindo um em cima do outro.
import { createRoot } from 'react-dom/client';
import '../../src/experience/experience.css';
import '../../src/features/oneshot/mortalha-casca.css';

const ABAS=['Sessão atual','Cenário do horror','Fichas','Mural','Aparições','Regras','Talentos'];

function Demo(){
  return <div className="immersive-stage">
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
      {ABAS.map(a=><button key={a} className="grim-link">{a}</button>)}
    </nav>
  </div>;
}
createRoot(document.getElementById('root')).render(<Demo/>);
