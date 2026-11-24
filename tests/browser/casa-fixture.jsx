// Os sete mapas com a atmosfera por cima, varrendo as três fases da noite.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import AtmosferaDaCasa from '../../src/features/oneshot/AtmosferaDaCasa.jsx';
import { MAPAS, FASES, mapaPorId } from '../../src/features/oneshot/mapasDaCasa.mjs';

function Demo(){
  const [mapa,setMapa]=useState('patio');
  const [fase,setFase]=useState('estranheza');
  const [apagao,setApagao]=useState(false);
  const [pressao,setPressao]=useState(0);
  const m=mapaPorId(mapa);
  return <div style={{padding:14,background:'#0A0807',minHeight:'100vh',color:'#D7CDBA',fontFamily:'system-ui'}}>
    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
      {MAPAS.map(x=><button key={x.id} id={'m-'+x.id} onClick={()=>setMapa(x.id)}
        style={{padding:'5px 9px',fontSize:11,background:mapa===x.id?'#3A2E22':'#1B1612',color:'#D7CDBA',border:'1px solid #3A2E22',cursor:'pointer'}}>{x.nome}</button>)}
    </div>
    <div style={{display:'flex',gap:6,marginBottom:10}}>
      {FASES.map(f=><button key={f.id} id={'f-'+f.id} onClick={()=>setFase(f.id)}
        style={{padding:'5px 9px',fontSize:11,background:fase===f.id?'#6B1B24':'#1B1612',color:'#D7CDBA',border:'1px solid #3A2E22',cursor:'pointer'}}>{f.nome} · {f.horas}</button>)}
      <label style={{fontSize:11,display:'flex',alignItems:'center',gap:6}}>
        pressão <input id="pressao" type="range" min="0" max="100" value={pressao*100}
          onChange={e=>setPressao(Number(e.target.value)/100)}/>
        <b id="pressao-valor">{Math.round(pressao*100)}%</b>
      </label>
      <button id="apagao" onClick={()=>setApagao(a=>!a)} style={{padding:'5px 9px',fontSize:11,background:'#1B1612',color:'#D7CDBA',border:'1px solid #3A2E22',cursor:'pointer'}}>apagão</button>
    </div>
    <div id="palco" style={{position:'relative',width:'100%',maxWidth:1200,aspectRatio:'1774/887',overflow:'hidden',border:'1px solid #3A2E22'}}>
      <img id="base" src={m.imagem} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',zIndex:1}}/>
      <AtmosferaDaCasa mapa={mapa} fase={fase} apagao={apagao} pressao={pressao}/>
    </div>
    <p style={{fontSize:12,color:'#8A7C68',maxWidth:900,marginTop:8}}>{m.luz}</p>
    <p style={{fontSize:12,color:'#C4414F',maxWidth:900}}><b>{m.evento.nome}:</b> {m.evento.texto}</p>
  </div>;
}
createRoot(document.getElementById('root')).render(<Demo/>);
