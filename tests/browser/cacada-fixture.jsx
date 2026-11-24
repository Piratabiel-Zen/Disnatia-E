// A caçada em cima de um mapa de verdade, com o controle do Mestre ao lado.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Cacada from '../../src/features/oneshot/Cacada.jsx';
import ComecarCacada from '../../src/features/oneshot/ComecarCacada.jsx';
import { cacadaParaComecar } from '../../src/features/oneshot/cacada.mjs';
import { mapaPorId } from '../../src/features/oneshot/mapasDaCasa.mjs';

function Demo(){
  const [cacada,setCacada]=useState(null);
  const [mapa,setMapa]=useState('terreo');
  const m=mapaPorId(mapa);
  return <div style={{padding:12,color:'#D7CDBA',fontFamily:'system-ui'}}>
    <div style={{display:'flex',gap:6,marginBottom:10,alignItems:'center'}}>
      <button id="porta" onClick={()=>setMapa(x=>x==='terreo'?'porao':'terreo')}
        style={{padding:'5px 9px',fontSize:11,background:'#1B1612',color:'#D7CDBA',border:'1px solid #3A2E22',cursor:'pointer'}}>
        atravessar a porta</button>
      <span id="mapa" style={{fontSize:11}}>{mapa}</span>
      <button id="rapida" onClick={()=>setCacada(cacadaParaComecar({oQue:'O vulto',mapa,segundos:5}))}
        style={{padding:'5px 9px',fontSize:11,background:'#1B1612',color:'#D7CDBA',border:'1px solid #3A2E22',cursor:'pointer'}}>
        caçada de 5s</button>
      <button id="cerco" onClick={()=>setCacada(cacadaParaComecar({oQue:'A coisa do porão',mapa,modo:'cerco'}))}
        style={{padding:'5px 9px',fontSize:11,background:'#1B1612',color:'#D7CDBA',border:'1px solid #3A2E22',cursor:'pointer'}}>
        cerco</button>
    </div>
    <div id="palco" style={{position:'relative',width:'100%',maxWidth:1100,aspectRatio:'1774/887',overflow:'hidden',border:'1px solid #3A2E22'}}>
      <img src={m.imagem} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>
      <Cacada cacada={cacada} mapaAtual={mapa} mestre aoEscapar={()=>setCacada(c=>c&&{...c,ativa:false})}/>
      <ComecarCacada cacada={cacada} oQuePadrao="O vulto"
        aoComecar={o=>setCacada(cacadaParaComecar({...o,mapa}))}
        aoEncerrar={()=>setCacada(c=>c&&{...c,ativa:false})}/>
    </div>
  </div>;
}
createRoot(document.getElementById('root')).render(<Demo/>);
