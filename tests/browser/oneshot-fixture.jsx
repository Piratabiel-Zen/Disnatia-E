// A noite da casa: o casarão de fundo com névoa, a ficha com o 3x4, e a
// caveira que gira. A névoa é desenhada DENTRO do cenário, e o quadro aqui
// embaixo tem fundo opaco de propósito — é a casca da sessão imitada, para a
// fixture provar o que o teste não prova: que a névoa aparece mesmo tendo
// uma parede opaca no caminho.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import FichaOneShot from '../../src/features/oneshot/FichaOneShot.jsx';
import SkullMark3D from '../../src/experience/SkullMark3D.jsx';
import CenarioDaMesa from '../../src/experience/CenarioDaMesa.jsx';
import { fichaNova } from '../../src/features/oneshot/fichaOneShot.mjs';

const mesa = { id: 'noite', sistema: 'oneshot', name: 'A casa da rua 7' };

function Demo(){
  const [f,setF]=useState(()=>({
    ...fichaNova('Vera Lins'), idade:'34', ocupacao:'enfermeira do turno da noite',
    historico:'Trabalha no hospital há onze anos. Foi a primeira a atender o chamado da rua 7.',
    atributos:{forca:2,agilidade:2,precisao:3,inteligencia:4,percepcao:3,carisma:2,vontade:3,sorte:1},
    pv:4, pavor:2, sanidade:5, sorte:1,
    retrato:'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iNDAwIj4KPHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiM0YTQ1NDAiLz4KPGVsbGlwc2UgY3g9IjE1MCIgY3k9IjE2MCIgcng9Ijc4IiByeT0iOTYiIGZpbGw9IiM5YzhkN2UiLz4KPGVsbGlwc2UgY3g9IjEyMCIgY3k9IjE0OCIgcng9IjExIiByeT0iNyIgZmlsbD0iIzJiMjYyMiIvPgo8ZWxsaXBzZSBjeD0iMTgwIiBjeT0iMTQ4IiByeD0iMTEiIHJ5PSI3IiBmaWxsPSIjMmIyNjIyIi8+CjxwYXRoIGQ9Ik0xMTggMTk2IFExNTAgMjEyIDE4MiAxOTYiIHN0cm9rZT0iIzJiMjYyMiIgc3Ryb2tlLXdpZHRoPSI1IiBmaWxsPSJub25lIi8+CjxwYXRoIGQ9Ik02MCA0MDAgUTE1MCAyNjggMjQwIDQwMCBaIiBmaWxsPSIjMzAyYzI4Ii8+Cjwvc3ZnPg==',
    talento:'Reconheço esse cheiro', talentoResumo:'Sei dizer há quanto tempo alguém está morto.',
  }));
  // Botões para varrer os estados sem mexer na ficha campo a campo.
  const estados={
    inteiro:{pv:5,pavor:0,sanidade:0},
    meio:{pv:3,pavor:2,sanidade:4},
    fim:{pv:1,pavor:3,sanidade:6},
    morto:{pv:0,pavor:3,sanidade:6},
  };
  return <div style={{maxWidth:760,margin:'0 auto',padding:18}}>
    <div id="estados" style={{display:'flex',gap:6,marginBottom:12}}>
      {Object.entries(estados).map(([nome,v])=>(
        <button key={nome} id={'e-'+nome} type="button" onClick={()=>setF(x=>({...x,...v}))}
          style={{padding:'5px 10px',background:'#121214',color:'#C8C6C2',border:'1px solid #35353A',cursor:'pointer'}}>
          {nome}
        </button>))}
    </div>
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

// `data-tema-mesa` é o que repinta o mural de ouija, e `data-quality` é o que
// liga e desliga a névoa. A fixture declara os dois como a sessão declara.
document.documentElement.dataset.temaMesa = 'mortalha';
document.documentElement.dataset.quality = 'cinematic';

createRoot(document.getElementById('root')).render(
  // A casca da sessão, com o fundo opaco e o `position:relative` que já
  // engoliram a névoa uma vez.
  <div
    className="adventure-shell"
    style={{background:'#09090A',minHeight:'100vh',position:'relative',overflow:'hidden'}}
  >
    <CenarioDaMesa campaign={mesa} />
    <div style={{position:'relative',zIndex:1}}><Demo/></div>
  </div>);
