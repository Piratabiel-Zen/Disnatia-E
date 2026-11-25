// O painel de senhas do Mestre, com um "banco" de mentira ao lado para dar
// para ver EXATAMENTE o que seria gravado em cada ficha.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import SenhasDasFichas from '../../src/features/sheets/SenhasDasFichas.jsx';
import { conferirSenha } from '../../src/features/sheets/senhaDaFicha.mjs';

function Demo(){
  const [fichas,setFichas]=useState([
    {id:'f1',nome:'Mika'},
    {id:'f2',nome:'Takuro',senha:'texto-puro-antigo'},
    {id:'f3',nome:'Hiroshi'},
  ]);
  const [tentativa,setTentativa]=useState('');
  const [resposta,setResposta]=useState('');
  const gravar=async(id,campos)=>setFichas(l=>l.map(f=>f.id===id?{...f,...campos}:f));
  const testar=async()=>{
    const f=fichas.find(x=>x.id==='f1');
    setResposta(await conferirSenha(f,tentativa)?'abriu':'recusou');
  };
  return <div>
    <SenhasDasFichas fichas={fichas} aoGravar={gravar}/>
    <div style={{maxWidth:620,margin:'0 auto',color:'#8A8784',fontFamily:'monospace',fontSize:11}}>
      <div style={{display:'flex',gap:6,marginBottom:10}}>
        <input id="tentativa" value={tentativa} onChange={e=>setTentativa(e.target.value)}
          placeholder="tentar abrir a Mika" style={{flex:1,padding:6,background:'#09090A',border:'1px solid #242427',color:'#C8C6C2'}}/>
        <button id="testar" onClick={testar} style={{padding:'6px 12px',background:'transparent',border:'1px solid #35353A',color:'#8A8784',cursor:'pointer'}}>testar</button>
        <span id="resposta">{resposta}</span>
      </div>
      <pre id="banco">{JSON.stringify(fichas,null,1)}</pre>
    </div>
  </div>;
}
createRoot(document.getElementById('root')).render(<Demo/>);
