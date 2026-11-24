// O armário, com os dois finais forçados para dar para ver os dois.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Esconderijo from '../../src/features/oneshot/Esconderijo.jsx';
import { cacadaParaComecar, estadoDaCacada } from '../../src/features/oneshot/cacada.mjs';

const T0=Date.now();
const emSegundo=s=>estadoDaCacada(
  cacadaParaComecar({mapa:'terreo',segundos:20,agora:T0}),
  {agora:T0+s*1000,mapaAtual:'terreo'});

function Demo(){
  const [dentro,setDentro]=useState(null);
  const [fim,setFim]=useState('');
  const entrar=s=>{ setFim(''); setDentro({cacada:emSegundo(s),chave:Date.now()}); };
  return <div style={{padding:12,color:'#D7CDBA',fontFamily:'system-ui'}}>
    <div style={{display:'flex',gap:6,marginBottom:10}}>
      <button id="cedo" onClick={()=>entrar(1)}
        style={{padding:'5px 9px',fontSize:11,background:'#1B1612',color:'#D7CDBA',border:'1px solid #3A2E22',cursor:'pointer'}}>esconder cedo (1s)</button>
      <button id="tarde" onClick={()=>entrar(19)}
        style={{padding:'5px 9px',fontSize:11,background:'#1B1612',color:'#D7CDBA',border:'1px solid #3A2E22',cursor:'pointer'}}>esconder tarde (19s)</button>
      <span id="fim" style={{fontSize:11,alignSelf:'center'}}>{fim}</span>
    </div>
    {dentro && <Esconderijo key={dentro.chave} cacada={dentro.cacada}
      aoTerminar={r=>setFim(r.passou?'passou':'pego')}
      aoFechar={()=>setDentro(null)}/>}
  </div>;
}
createRoot(document.getElementById('root')).render(<Demo/>);
