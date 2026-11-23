// A ficha rápida sobre um mapa, com as cinco cores.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import FichaRapida from '../../src/features/oneshot/FichaRapida.jsx';
import { fichaNova } from '../../src/features/oneshot/fichaOneShot.mjs';
import { mapaPorId } from '../../src/features/oneshot/mapasDaCasa.mjs';

const retrato='data:image/svg+xml;base64,'+btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400">
<rect width="300" height="400" fill="#4a4540"/><ellipse cx="150" cy="160" rx="78" ry="96" fill="#9c8d7e"/>
<ellipse cx="120" cy="148" rx="11" ry="7" fill="#2b2622"/><ellipse cx="180" cy="148" rx="11" ry="7" fill="#2b2622"/>
<path d="M60 400 Q150 268 240 400 Z" fill="#302c28"/></svg>`);

function Demo(){
  const [f,setF]=useState(()=>({
    ...fichaNova('Vera Lins'), idade:'34', ocupacao:'enfermeira do turno da noite', retrato,
    atributos:{forca:2,agilidade:3,precisao:3,inteligencia:4,percepcao:3,carisma:0,vontade:3,sorte:1},
    pv:3, pavor:2, sanidade:4, talento:'protetor', corDaFichaRapida:'preto',
  }));
  return <div style={{position:'relative',width:'100%',height:'100vh',overflow:'hidden',background:'#0A0807'}}>
    <img src={mapaPorId('terreo').imagem} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}/>
    <FichaRapida ficha={f} aoMudarCor={cor=>setF(x=>({...x,corDaFichaRapida:cor}))}/>
  </div>;
}
createRoot(document.getElementById('root')).render(<Demo/>);
