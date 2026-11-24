// A névoa e o vulto, nas condições reais: máscara por cima de um mapa.
import { createRoot } from 'react-dom/client';
import { mascaraDaExploracao } from '../../src/features/oneshot/exploracao.mjs';
import { mapaPorId } from '../../src/features/oneshot/mapasDaCasa.mjs';
import '../../src/features/oneshot/exploracao.css';

// Um PNG 2x2 com o canto transparente: é o que prova que o vulto não ganha
// fundo nem filtro — se algo repintar, o pixel transparente deixa de ser.
const PNG_COM_BURACO='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAHUlEQVR4nGP8z8DwnwEJMDEgAVwcJgYsYNhIAgCDpwIB9ZZPMQAAAABJRU5ErkJggg==';

const m=mapaPorId('patio');
function Demo(){
  const mascara=mascaraDaExploracao({
    clareiras:[{x:.3,y:.5,r:.08}], visoes:[], aspecto:2,
  });
  return <div id="palco" style={{position:'relative',width:900,height:450,overflow:'hidden'}}>
    <img id="base" src={m.imagem} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',zIndex:1}}/>
    <div id="nevoa" className="nev" style={{maskImage:mascara,WebkitMaskImage:mascara}}/>
    <div id="vulto" className="vul" style={{left:'60%',top:'60%',width:'14%',aspectRatio:'1 / 1.9',opacity:.9}}>
      <img id="vulto-img" src={PNG_COM_BURACO} alt=""/>
    </div>
  </div>;
}
createRoot(document.getElementById('root')).render(<Demo/>);
