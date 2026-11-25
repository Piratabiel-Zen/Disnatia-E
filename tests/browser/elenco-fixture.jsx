// O quadro do grupo com a mesma estrutura e o mesmo CSS da sessão: o que
// está sob teste é se as fichas CABEM no bloco em vez de saírem pela
// direita atrás de uma barra que ninguém percebe.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/adventure/adventure.css';

function Demo(){
  const [quantos,setQuantos]=useState(5);
  const fichas=Array.from({length:quantos},(_,n)=>({id:'f'+n,nome:['Mika','Takuro','Hiroshi','Daniel','Yuki','Kenji','Aoi','Rin','Sora','Haru','Nao','Emi'][n%12]+(n>11?' '+n:'')}));
  return <div style={{maxWidth:760}}>
    <div style={{display:'flex',gap:6,marginBottom:10}}>
      {[1,3,5,8,14].map(n=><button key={n} id={'n-'+n} onClick={()=>setQuantos(n)}
        style={{padding:'4px 9px',fontSize:11,background:'#1B1612',color:'#D7CDBA',border:'1px solid #3A2E22',cursor:'pointer'}}>{n}</button>)}
    </div>
    <section className="sessao-frente ad-party" id="bloco">
      <div className="ad-party-viewport" aria-label="Integrantes">
        <div className="ad-party-row">
          {fichas.map(f=>(
            <div className="sessao-integrante" key={f.id}>
              <div className="ad-companion">
                <div className="ad-portrait"><span className="ad-portrait-fallback">{f.nome[0]}</span></div>
                <div className="ad-companion-name">{f.nome}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  </div>;
}
createRoot(document.getElementById('root')).render(<Demo/>);
