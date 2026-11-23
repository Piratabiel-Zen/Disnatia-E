// A mão do Mestre no Cenário do Horror, com as mesmas peças que o mapa monta:
// pincel que ABRE a casa, hora da noite e vulto.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import AtmosferaDaCasa from '../../src/features/oneshot/AtmosferaDaCasa.jsx';
import NevoaDeExploracao from '../../src/features/oneshot/NevoaDeExploracao.jsx';
import { mapaPorId, FASES } from '../../src/features/oneshot/mapasDaCasa.mjs';
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
  const mapaId='terreo';
  const m=mapaPorId(mapaId);
  // As manchas ficam em 0-100, como no pincel do mapa de batalha.
  const [patches,setPatches]=useState([]);
  const [fase,setFase]=useState('assombracao');
  const [modoVulto,setModoVulto]=useState(false);
  const [vulto,setVulto]=useState(null);
  const [mestre,setMestre]=useState(false);
  const palco=useRef(null);
  const brush=12;

  const aoClicar=ev=>{
    const r=palco.current.getBoundingClientRect();
    const x=((ev.clientX-r.left)/r.width)*100, y=((ev.clientY-r.top)/r.height)*100;
    if(modoVulto){ setVulto(vultoNovo({mapa:mapaId,x:x/100,y:y/100,duracao:'parado',tamanho:'alto'}));
      setModoVulto(false); return; }
    setPatches(p=>[...p,{id:`${Date.now()}_${Math.random()}`,x,y,size:brush}]);
  };

  return <div style={{padding:14,background:'#0A0807',minHeight:'100vh',color:'#D7CDBA',fontFamily:'system-ui'}}>
    <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap',alignItems:'center'}}>
      <button id="mestre" onClick={()=>setMestre(v=>!v)} style={{padding:'5px 10px'}}>{mestre?'ver como jogador':'ver como mestre'}</button>
      <select id="fase" value={fase} onChange={e=>setFase(e.target.value)} style={{padding:'4px'}}>
        {FASES.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}
      </select>
      <button id="vulto" onClick={()=>setModoVulto(v=>!v)} style={{padding:'5px 10px'}}>{modoVulto?'clique no cômodo':'Pôr vulto'}</button>
      <span id="conta" style={{fontSize:12}}>manchas: {patches.length}</span>
    </div>
    <div ref={palco} id="palco" onClick={aoClicar}
      style={{position:'relative',width:'100%',maxWidth:1100,aspectRatio:'1774/887',overflow:'hidden',border:'1px solid #3A2E22',cursor:modoVulto?'copy':'crosshair'}}>
      <img id="base" src={m.imagem} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',zIndex:1}}/>
      <AtmosferaDaCasa mapa={mapaId} fase={fase}/>
      <NevoaDeExploracao mestre={mestre}
        clareiras={patches.map(p=>({id:p.id,x:p.x/100,y:p.y/100,r:(p.size||12)/200}))}
        tokens={[]} dono="" aspecto={1774/887}/>
      <Vulto mapa={mapaId} vulto={vulto}/>
    </div>
  </div>;
}
createRoot(document.getElementById('root')).render(<Demo/>);
