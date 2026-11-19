// O palco do tocador: visível enquanto não há som confirmado.
import { createRoot } from 'react-dom/client';
import '../../src/styles/global.css';
createRoot(document.getElementById('root')).render(
  <div style={{background:'#070910',minHeight:'100vh'}}>
    <div className="ambient-palco">
      <div className="ambient-palco-aviso">
        <b>Aperte o play para ouvir a mesa</b>
        <small>O navegador só libera som depois de um toque seu. Depois disso ele some.</small>
      </div>
      <div className="ambient-palco-quadro">
        <div style={{width:246,height:139,background:'#111',display:'grid',placeItems:'center',color:'#666',font:'12px monospace'}}>player do YouTube</div>
      </div>
    </div>
    <div className="ambient-erro" style={{bottom:280}}>
      <b>Tema do combate não tocou</b>
      <span>Este vídeo não permite reprodução fora do YouTube — é comum em clipe de gravadora. Procure outra versão da mesma música.</span>
      <button type="button">Entendi</button>
    </div>
  </div>);
