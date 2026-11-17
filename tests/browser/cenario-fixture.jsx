import { createRoot } from 'react-dom/client';
import CenarioDaMesa from '../../src/experience/CenarioDaMesa';

const mesa = { id: 'estrela-de-absinto', name: 'Estrela de Absinto', world: 'Terra Dourada' };

createRoot(document.getElementById('root')).render(
  <div style={{minHeight:'100vh',position:'relative'}}>
    <CenarioDaMesa campaign={mesa} />
    <div style={{position:'relative',zIndex:1,padding:'60px 48px',maxWidth:720,
                 color:'#CFCCC5',fontFamily:'Crimson Text,Georgia,serif',fontSize:17,lineHeight:1.7}}>
      <h1 style={{fontFamily:'Cinzel,serif',letterSpacing:'.14em',color:'#D9A441'}}>ESTRELA DE ABSINTO</h1>
      <p>Texto de teste em cima do cenário, para conferir se dá para ler. A praça
         continua alagada e a chuva não para nunca na Terra Dourada.</p>
      <div style={{marginTop:24,padding:18,border:'1px solid #32353A',borderRadius:3,
                   background:'rgba(21,23,26,.82)'}}>
        <b style={{color:'#E8E2D6'}}>Painel sobre o fundo</b>
        <p style={{margin:'8px 0 0',fontSize:14}}>Um painel normal da mesa, para ver se o
           contraste aguenta.</p>
      </div>
    </div>
  </div>
);
