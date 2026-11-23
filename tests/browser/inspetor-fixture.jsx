// Um objeto com os dois esconderijos, para percorrer zoom, giro e verso.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import InspetorDeObjeto from '../../src/features/oneshot/InspetorDeObjeto.jsx';

const foto='data:image/svg+xml;base64,'+btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440">
<rect width="640" height="440" fill="#2a2520"/>
<rect x="30" y="30" width="580" height="380" fill="#4a4036"/>
<rect x="430" y="90" width="120" height="150" fill="#15110e"/>
<ellipse cx="490" cy="150" rx="26" ry="34" fill="#6b625a"/>
<text x="60" y="400" fill="#9c8d7e" font-size="22">varanda, 1953</text></svg>`);

function Demo(){
  const [aberto,setAberto]=useState(true);
  return <div style={{padding:20}}>
    <button id="abrir" onClick={()=>setAberto(true)}>abrir</button>
    {aberto && <InspetorDeObjeto
      objeto={{titulo:'Fotografia da varanda',imagem:foto,
        descricao:'Encontrada dentro do livro, na página da data.',
        detalheDePerto:'Tem alguém na janela do fundo. Não estava ali na outra foto.',
        versoTexto:'Agosto de 1953. "Ela pediu para não revelarmos."'}}
      aoFechar={()=>setAberto(false)} />}
  </div>;
}
createRoot(document.getElementById('root')).render(<Demo/>);
