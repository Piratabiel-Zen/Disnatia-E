// Os dezesseis itens: as faces desenhadas, a bolsa da mesa e o objeto na mão.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import FaceDeItem from '../../src/features/oneshot/FaceDeItem.jsx';
import InspetorDeObjeto from '../../src/features/oneshot/InspetorDeObjeto.jsx';
import AchadosDaCasa from '../../src/features/oneshot/AchadosDaCasa.jsx';
import { ITENS, itemComoObjeto } from '../../src/features/oneshot/itensDaCasa.mjs';

function Demo(){
  const [objeto,setObjeto]=useState(null);
  const [achados,setAchados]=useState([{item:ITENS[0].id,em:1},{item:'amuleto-sangue',em:2}]);
  return <div style={{padding:14,background:'#0A0807',minHeight:'100vh',color:'#D7CDBA',fontFamily:'system-ui'}}>
    <h1 style={{fontSize:14,letterSpacing:'.1em'}}>As dezesseis faces</h1>
    <div id="faces" style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:10,maxWidth:1200}}>
      {ITENS.map(i=>(
        <div key={i.id} style={{textAlign:'center'}}>
          <div style={{display:'flex',gap:3}}>
            <span id={'f-'+i.id} style={{display:'block',width:56,height:72,background:'#120D0A'}}>
              <FaceDeItem forma={i.forma} selo={i.selo} lado="frente"/>
            </span>
            <span id={'v-'+i.id} style={{display:'block',width:56,height:72,background:'#120D0A'}}>
              <FaceDeItem forma={i.forma} selo={i.selo} lado="verso"/>
            </span>
          </div>
          <button id={'abrir-'+i.id} onClick={()=>setObjeto(itemComoObjeto(i))}
            style={{marginTop:4,fontSize:9,padding:'3px 5px',background:'#1B1612',color:'#D7CDBA',border:'1px solid #3A2E22',cursor:'pointer',width:'100%'}}>
            {i.numero}. {i.nome}
          </button>
        </div>
      ))}
    </div>

    <h1 style={{fontSize:14,letterSpacing:'.1em',marginTop:22}}>A bolsa (mapa simulado)</h1>
    <div id="palco-mapa" style={{position:'relative',width:'100%',maxWidth:900,height:380,background:'#140F0C',border:'1px solid #3A2E22'}}>
      <AchadosDaCasa achados={achados} mestre idDoMapa="porao"
        aoEntregar={id=>setAchados(a=>[...a,{item:id,em:Date.now()}])}
        aoDevolver={id=>setAchados(a=>a.filter(r=>r.item!==id))}/>
    </div>
    <div style={{marginTop:8,display:'flex',gap:6}}>
      <span id="conta-achados" style={{fontSize:11}}>{achados.length} na bolsa</span>
      <button id="zerar" onClick={()=>setAchados([])} style={{fontSize:11,padding:'3px 7px',background:'#1B1612',color:'#D7CDBA',border:'1px solid #3A2E22',cursor:'pointer'}}>zerar</button>
    </div>

    {objeto && <InspetorDeObjeto objeto={objeto} aoFechar={()=>setObjeto(null)}/>}
  </div>;
}
createRoot(document.getElementById('root')).render(<Demo/>);
