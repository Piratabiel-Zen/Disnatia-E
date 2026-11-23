// A névoa de exploração sobre um mapa real, com clareiras pintadas no clique.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import AtmosferaDaCasa from '../../src/features/oneshot/AtmosferaDaCasa.jsx';
import NevoaDeExploracao from '../../src/features/oneshot/NevoaDeExploracao.jsx';
import { clareiraNova, jaDescoberto } from '../../src/features/oneshot/exploracao.mjs';
import { mapaPorId } from '../../src/features/oneshot/mapasDaCasa.mjs';
import { estagioDoVulto, vultoNovo } from '../../src/features/oneshot/vultoNoMapa.mjs';
import { useEffect, useRef } from 'react';

function Vulto({mapa,vulto}){
  const [e,setE]=useState(null); const q=useRef(0);
  useEffect(()=>{ if(!vulto)return;
    const passo=()=>{const a=estagioDoVulto(vulto);setE(a);
      if(a)q.current=requestAnimationFrame(passo); else setE(null);};
    q.current=requestAnimationFrame(passo); return ()=>cancelAnimationFrame(q.current);
  },[vulto]);
  if(!vulto||!e||vulto.mapa!==mapa)return null;
  return <div className="vul" style={{left:`${vulto.x*100}%`,top:`${vulto.y*100}%`,
    width:`${e.escala*100}%`,aspectRatio:'1 / 1.9',opacity:e.presenca}}><span/></div>;
}

function Demo(){
  const mapa='porao';
  const m=mapaPorId(mapa);
  const [clareiras,setClareiras]=useState([]);
  const [token,setToken]=useState({dono:'u1',x:0.5,y:0.55});
  const [mestre,setMestre]=useState(false);
  const [vulto,setVulto]=useState(null);
  const palco=useRef(null);

  const rel=ev=>{const r=palco.current.getBoundingClientRect();
    return {x:(ev.clientX-r.left)/r.width,y:(ev.clientY-r.top)/r.height};};

  return <div style={{padding:14,background:'#0A0807',minHeight:'100vh',color:'#D7CDBA',fontFamily:'system-ui'}}>
    <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
      <button id="mestre" onClick={()=>setMestre(v=>!v)} style={{padding:'5px 10px'}}>{mestre?'ver como jogador':'ver como mestre'}</button>
      <button id="limpar" onClick={()=>setClareiras([])} style={{padding:'5px 10px'}}>limpar descoberto</button>
      <button id="vulto" onClick={()=>setVulto(vultoNovo({mapa,x:0.3,y:0.4,duracao:'parado',tamanho:'alto'}))} style={{padding:'5px 10px'}}>pôr vulto</button>
      <span id="conta" style={{fontSize:12,alignSelf:'center'}}>clareiras: {clareiras.length}</span>
    </div>
    <div ref={palco} id="palco"
      onClick={ev=>{const p=rel(ev); if(!jaDescoberto(p,clareiras))setClareiras(c=>[...c,clareiraNova(p.x,p.y)]);}}
      onContextMenu={ev=>{ev.preventDefault();const p=rel(ev);setToken(t=>({...t,...p}));}}
      style={{position:'relative',width:'100%',maxWidth:1100,aspectRatio:'1774/887',overflow:'hidden',border:'1px solid #3A2E22',cursor:'crosshair'}}>
      <img id="base" src={m.imagem} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',zIndex:1}}/>
      <AtmosferaDaCasa mapa={mapa} fase="assombracao"/>
      <NevoaDeExploracao mestre={mestre} clareiras={clareiras} tokens={[token]} dono="u1"/>
      <Vulto mapa={mapa} vulto={vulto}/>
      <div id="token" style={{position:'absolute',zIndex:5,left:`${token.x*100}%`,top:`${token.y*100}%`,
        width:18,height:18,marginLeft:-9,marginTop:-9,borderRadius:'50%',
        background:'#C0A86E',border:'2px solid #2A1E16'}}/>
    </div>
    <p style={{fontSize:12,color:'#8A7C68'}}>Clique para revelar. Botão direito move a criança.</p>
  </div>;
}
createRoot(document.getElementById('root')).render(<Demo/>);
