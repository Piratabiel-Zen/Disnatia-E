// O bilhete dos dois lados: o painel do Mestre e o papel que chega.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import BilheteSecreto from '../../src/features/oneshot/BilheteSecreto.jsx';
import EntregarBilhete from '../../src/features/oneshot/EntregarBilhete.jsx';
import { bilheteParaEntregar } from '../../src/features/oneshot/bilhete.mjs';

const FICHAS=[{id:'f1',nome:'Mika'},{id:'f2',nome:'Takuro'},{id:'f3',nome:'Hiroshi'}];

function Demo(){
  const [bilhetes,setBilhetes]=useState([]);
  const [euSou,setEuSou]=useState('f1');
  const entregar=(para,texto)=>{
    const b=bilheteParaEntregar({para,texto});
    if(b) setBilhetes(l=>[...l,{id:'b'+l.length,...b}]);
  };
  return <div style={{padding:12,minHeight:'100vh',color:'#D7CDBA',fontFamily:'system-ui'}}>
    <div style={{display:'flex',gap:6,marginBottom:10}}>
      {FICHAS.map(f=><button key={f.id} id={'eu-'+f.id} onClick={()=>setEuSou(f.id)}
        style={{padding:'5px 9px',fontSize:11,background:euSou===f.id?'#6B1B24':'#1B1612',color:'#D7CDBA',border:'1px solid #3A2E22',cursor:'pointer'}}>
        sou {f.nome}</button>)}
      <button id="limpar" onClick={()=>setBilhetes([])}
        style={{padding:'5px 9px',fontSize:11,background:'#1B1612',color:'#D7CDBA',border:'1px solid #3A2E22',cursor:'pointer'}}>limpar</button>
      <span id="conta" style={{fontSize:11,alignSelf:'center'}}>{bilhetes.length} na mesa</span>
    </div>
    <div id="palco" style={{position:'relative',width:'100%',height:520,background:'#140F0C',border:'1px solid #3A2E22'}}>
      <EntregarBilhete sheets={FICHAS} bilhetes={bilhetes} aoEntregar={entregar}
        aoReescrever={(id,texto)=>setBilhetes(l=>l.map(b=>b.id===id?{...b,texto,aberto:false}:b))}
        aoApagar={id=>setBilhetes(l=>l.filter(b=>b.id!==id))}/>
      <BilheteSecreto bilhetes={bilhetes} sheetId={euSou}
        aoAbrir={id=>setBilhetes(l=>l.map(b=>b.id===id?{...b,aberto:true}:b))}/>
    </div>
  </div>;
}
createRoot(document.getElementById('root')).render(<Demo/>);
