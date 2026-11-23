// Os três climas da ação, acionados na mão.
import { createRoot } from 'react-dom/client';
import '../../src/features/oneshot/rolagem-one-shot.css';
const por=c=>{const r=document.documentElement;
  if(c)r.dataset.climaDaAcao=c; else delete r.dataset.climaDaAcao;};
createRoot(document.getElementById('root')).render(
  <div style={{padding:24,color:'#D7CDBA',fontFamily:'Cinzel,serif',minHeight:'100vh',background:'#15110E'}}>
    <h1>Clima da ação</h1>
    <p style={{maxWidth:520,lineHeight:1.6}}>Texto de fundo para dar com o que comparar quando a tela escurece ou treme.</p>
    <div style={{display:'flex',gap:8,marginTop:16}}>
      {['lupa','escuro','tremor'].map(c=>(
        <button key={c} id={'c-'+c} onClick={()=>por(c)}
          style={{padding:'7px 14px',background:'#1B1612',color:'#D7CDBA',border:'1px solid #3A2E22',cursor:'pointer'}}>{c}</button>))}
      <button id="c-off" onClick={()=>por('')} style={{padding:'7px 14px',background:'#1B1612',color:'#8A7C68',border:'1px solid #3A2E22',cursor:'pointer'}}>limpar</button>
    </div>
  </div>);
