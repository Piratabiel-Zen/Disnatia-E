// A ficha da noite, a caveira que gira e a névoa.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import FichaOneShot from '../../src/features/oneshot/FichaOneShot.jsx';
import SkullMark3D from '../../src/experience/SkullMark3D.jsx';
import { fichaNova } from '../../src/features/oneshot/fichaOneShot.mjs';
import '../../src/features/oneshot/mortalha.css';

function Demo(){
  const [f,setF]=useState(()=>({
    ...fichaNova('Vera Lins'), idade:'34', ocupacao:'enfermeira do turno da noite',
    historico:'Trabalha no hospital há onze anos. Foi a primeira a atender o chamado da rua 7.',
    atributos:{forca:2,agilidade:2,precisao:3,inteligencia:4,percepcao:3,carisma:2,vontade:3,sorte:1},
    pv:4, pavor:3, sanidade:5, sorte:1,
    talento:'Reconheço esse cheiro', talentoResumo:'Sei dizer há quanto tempo alguém está morto.',
  }));
  return <div style={{maxWidth:760,margin:'0 auto',padding:18}}>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
      <SkullMark3D title="A casa da rua 7" />
      <div>
        <div style={{fontFamily:'Cinzel,serif',fontSize:17,letterSpacing:'.18em',color:'#9A9793'}}>A CASA DA RUA 7</div>
        <div style={{fontFamily:'IBM Plex Mono,monospace',fontSize:9,letterSpacing:'.2em',color:'#585654'}}>ONE SHOT TERROR · FICHAS</div>
      </div>
    </div>
    <FichaOneShot ficha={f} aoMudar={setF} podeEditar mestre={false} />
  </div>;
}
createRoot(document.getElementById('root')).render(
  <div style={{background:'#09090A',minHeight:'100vh',position:'relative'}}>
    <div className="mortalha" aria-hidden="true">
      <span className="mortalha-camada um"/><span className="mortalha-camada dois"/><span className="mortalha-camada tres"/>
    </div>
    <div style={{position:'relative',zIndex:1}}><Demo/></div>
  </div>);
