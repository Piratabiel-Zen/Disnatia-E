// A linha da aparição com os três alcances, e a plateia logo abaixo.
// Monta só o pedaço que decide quem vê — a página inteira precisa de
// Firebase, e o que está sob teste aqui é a escolha, não o banco.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ALCANCES, aparicaoNova, alcanceDa, plateiaDa, comAlcance, alternarPessoa, quemVe,
} from '../../src/features/oneshot/aparicoes.mjs';
import '../../src/features/oneshot/aparicoes.css';

const FICHAS=[{id:'f1',nome:'Mika',dono:'ana'},{id:'f2',nome:'Takuro',dono:'bia'},{id:'f3',nome:'Hiroshi',dono:'caio'}];
const NOMES={ana:'Mika',bia:'Takuro',caio:'Hiroshi'};

function Demo(){
  const [a,setA]=useState(()=>({...aparicaoNova('vulto'),id:'x1',titulo:'A mulher do corredor'}));
  const [chamando,setChamando]=useState(null);
  return <div className="pagina-one-shot apa" style={{padding:16}}>
    <ul className="apa-lista">
      <li data-revelada="nao" data-aberta="sim">
        <button type="button" className="apa-linha">
          <span className="apa-mini apa-mini-vazia">◐</span>
          <span className="apa-nomes"><b>{a.titulo}</b><em id="quemve">{quemVe(a,NOMES)}</em></span>
        </button>
        <div className="apa-alcance" role="group" aria-label="Quem vê">
          {ALCANCES.map(al=>(
            <button key={al.id} type="button" id={'al-'+al.id}
              data-ligado={alcanceDa(a)===al.id?'sim':'nao'} title={al.resumo}
              onClick={()=>{ if(al.id==='alguns') setChamando('x1'); setA(comAlcance(a,al.id)); }}>
              {al.nome}</button>
          ))}
        </div>
      </li>
    </ul>
    <div className="apa-detalhe" style={{marginTop:12}}>
      <div className="apa-plateia"
        data-valendo={alcanceDa(a)==='alguns'?'sim':'nao'}
        data-chamando={chamando==='x1'?'sim':undefined}>
        <span>A plateia</span>
        <div>
          {FICHAS.map(f=>(
            <button key={f.id} type="button" id={'p-'+f.dono}
              data-ligado={plateiaDa(a).includes(f.dono)?'sim':'nao'}
              onClick={()=>{setChamando(null);setA(alternarPessoa(a,f.dono));}}>{f.nome}</button>
          ))}
        </div>
        {alcanceDa(a)!=='alguns'&&plateiaDa(a).length>0&&
          <em className="apa-guardada">Guardada. Vale quando o alcance for <b>Alguns</b>.</em>}
        {alcanceDa(a)==='alguns'&&plateiaDa(a).length===0&&
          <em className="apa-vazia">Alcance <b>Alguns</b> sem ninguém marcado.</em>}
      </div>
    </div>
    <pre id="banco" style={{marginTop:14,color:'#8A8784',fontSize:11,fontFamily:'monospace'}}>
{JSON.stringify({alcance:alcanceDa(a),plateia:plateiaDa(a),liberadoParaTodos:a.liberadoParaTodos,liberadoPara:a.liberadoPara})}
    </pre>
  </div>;
}
createRoot(document.getElementById('root')).render(<Demo/>);
