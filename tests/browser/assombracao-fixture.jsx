// A assombração sem rede: injeta o aviso direto, como se tivesse chegado.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { estagioDaAssombracao } from '../../src/features/oneshot/assombracao.mjs';
import { avisoDeAssombracao } from '../../src/features/oneshot/assombracao.mjs';
import '../../src/features/oneshot/assombracao.css';

const coisa='data:image/svg+xml;base64,'+btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="700">
<rect width="500" height="700" fill="#0a0a0c"/>
<ellipse cx="250" cy="220" rx="96" ry="128" fill="#5a5048"/>
<ellipse cx="215" cy="205" rx="15" ry="22" fill="#08070a"/>
<ellipse cx="285" cy="205" rx="15" ry="22" fill="#08070a"/>
<path d="M190 300 Q250 340 310 300" stroke="#08070a" stroke-width="9" fill="none"/>
<path d="M120 700 Q250 420 380 700 Z" fill="#3a332e"/></svg>`);

function Demo(){
  const [aviso,setAviso]=useState(null);
  const [estagio,setEstagio]=useState(null);
  useEffect(()=>{
    if(!aviso)return;
    let id;
    const passo=()=>{const e=estagioDaAssombracao(aviso);setEstagio(e);
      if(e)id=requestAnimationFrame(passo); else setAviso(null);};
    id=requestAnimationFrame(passo);
    return ()=>cancelAnimationFrame(id);
  },[aviso]);
  const disparar=(intensidade,duracao)=>setAviso(
    avisoDeAssombracao({aparicao:{titulo:'A mulher no corredor',imagem:coisa},intensidade,duracao}));
  return <div style={{padding:24,minHeight:'100vh',background:'#15110E',color:'#D7CDBA',fontFamily:'Cinzel,serif'}}>
    <h1>Assombração</h1>
    <input id="campo" placeholder="digite aqui durante a assombração"
      style={{padding:8,width:320,background:'#1B1612',color:'#D7CDBA',border:'1px solid #3A2E22'}}/>
    <div style={{display:'flex',gap:8,marginTop:14,flexWrap:'wrap'}}>
      <button id="d-vulto" onClick={()=>disparar('vulto','relance')} style={{padding:'7px 12px'}}>vulto/relance</button>
      <button id="d-presenca" onClick={()=>disparar('presenca','demora')} style={{padding:'7px 12px'}}>presença/demora</button>
      <button id="d-encarar" onClick={()=>disparar('encarar','fica')} style={{padding:'7px 12px'}}>encarar/fica</button>
    </div>
    {aviso&&estagio&&(
      <div className="asb" data-fase={estagio.fase} data-intensidade={estagio.intensidade}
        aria-hidden="true" style={{'--asb-veu':estagio.veu,'--asb-nitidez':estagio.nitidez}}>
        <span className="asb-escuro"/>
        <img className="asb-coisa" src={aviso.imagem} alt=""
          style={{opacity:estagio.nitidez,transform:`scale(${estagio.escala*(0.97+estagio.presenca*0.03)})`}}/>
      </div>)}
  </div>;
}
createRoot(document.getElementById('root')).render(<Demo/>);
