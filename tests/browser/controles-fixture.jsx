import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import '../../src/features/mapa-batalha/tokens-vivos.css';

function Token({ tamanho }) {
  const [ang, setAng] = useState(0);
  const dispSize = tamanho;
  return (
    <div style={{position:'relative',width:dispSize,height:dispSize,margin:'90px 60px 40px'}}>
      <div style={{width:'100%',height:'100%',borderRadius:'50%',border:'2px solid #A855F7',
                   background:'radial-gradient(circle at 40% 35%,#3A2A55,#140C26)',
                   display:'grid',placeItems:'center',fontSize:dispSize*.4,
                   transform:`rotate(${ang}deg)`}}>🧙</div>
      <div style={{position:'absolute',left:'50%',top:dispSize+6,transform:'translateX(-50%)',
                   color:'#C8B8A0',fontFamily:'Cinzel,serif',fontSize:11,whiteSpace:'nowrap'}}>Ignácio</div>
      <div className="battlemap-token-controles"
           style={{position:'absolute',left:'50%',top:-Math.max(4,Math.min(9,dispSize*.07)),
                   transform:'translate(-50%,-100%)',
                   '--tamanho':`${Math.max(23,Math.min(30,dispSize*.28))}px`,zIndex:31}}>
        <button type="button" onClick={()=>setAng(a=>a-45)}>↺</button>
        <div className="battlemap-facing-dial" data-girando="nao">
          <i style={{transform:`rotate(${ang}deg)`}} />
        </div>
        <button type="button" onClick={()=>setAng(a=>a+45)}>↻</button>
        <button type="button" className="battlemap-flip-dial" data-spinning="false"><span>⇋</span></button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <div style={{display:'flex',alignItems:'flex-start',background:'#0B0718',minHeight:'100vh'}}>
    <Token tamanho={70} />
    <Token tamanho={110} />
    <div style={{position:'relative',width:70,height:70,margin:'90px 60px'}}>
      <div style={{width:'100%',height:'100%',borderRadius:'50%',border:'2px solid #A855F7',
                   background:'#140C26',display:'grid',placeItems:'center',fontSize:28}}>🧙</div>
      <div className="battlemap-token-controles"
           style={{position:'absolute',left:'50%',top:-5,transform:'translate(-50%,-100%)',
                   '--tamanho':'26px',zIndex:31}}>
        <button type="button">↺</button>
        <div className="battlemap-facing-dial" data-girando="sim"><i style={{transform:'rotate(135deg)'}} /></div>
        <button type="button">↻</button>
        <button type="button" className="battlemap-flip-dial"><span>⇋</span></button>
        <b className="battlemap-token-angulo">135°</b>
      </div>
    </div>
  </div>
);
