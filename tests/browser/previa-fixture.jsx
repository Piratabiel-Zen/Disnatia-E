// A fileira de fichas vista pelo Admin, e a mesma fileira em prévia.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import SeloDeAcessoRestrito from '../../src/features/cain/SeloDeAcessoRestrito.jsx';
import BarraDePrevia from '../../src/features/acesso/BarraDePrevia.jsx';
import { membroEfetivo } from '../../src/features/acesso/previaDeJogador.mjs';
import { podeAbrirFicha } from '../../src/core/acesso.mjs';
import '../../src/features/cain/fichas-cain.css';

const v = { '--fundo-mesa':'#070910','--superficie-mesa':'#0F1320','--linha-mesa':'#232C42',
  '--contraste-mesa':'#8CA0C4','--contraste-claro-mesa':'#C3D0E6','--ink-mesa':'#D4D7E0' };
for (const [k,val] of Object.entries(v)) document.documentElement.style.setProperty(k,val);

const fichas = [
  { id:'f1', nome:"Dominic D'Coco", dono:'u-ana', categoria:'I' },
  { id:'f2', nome:'Kennedy Flanders', dono:'u-bob', categoria:'II' },
  { id:'f3', nome:'Rascunho do Admin', dono:'', categoria:'I' },
];
const admin = { uid:'u-admin', papel:'mestre' };
const previa = { fichaId:'f1', nome:"Dominic D'Coco", uid:'u-ana' };

function Demo(){
  const [recusada,setRecusada]=useState(null);
  const membro = membroEfetivo(admin, previa);
  return <div className="registro">
    <BarraDePrevia previa={previa} />
    <header className="registro-barra"><div><h2>Registro de exorcistas</h2>
      <p>Você abre e edita a ficha entregue a você. As outras estão seladas.</p></div></header>
    <ul className="registro-fileira">{fichas.map(f=>{
      const podeAbrir = podeAbrirFicha(f, membro, '');
      return <li key={f.id}>
        <button type="button" className="registro-cartao" style={{'--cor':'#8CA0C4'}}
          data-selada={podeAbrir?'nao':'sim'} onClick={()=>!podeAbrir&&setRecusada(f)}>
          <span className="registro-retrato"><i>{f.categoria}</i></span>
          <span className="registro-nome"><b>{f.nome}</b><em>em campo</em></span>
          {podeAbrir && <span className="registro-selo">sua</span>}
        </button>
      </li>;})}</ul>
    {recusada && <SeloDeAcessoRestrito nome="Kennedy Flanders" aoFechar={()=>setRecusada(null)} />}
  </div>;
}
createRoot(document.getElementById('root')).render(
  <div style={{background:'#070910',minHeight:'100vh',padding:'60px 20px 20px'}}><Demo/></div>);
