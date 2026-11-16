import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import MuralInvestigacao from '../../src/features/investigacao/MuralInvestigacao';
import { cartaoNovo, ligar } from '../../src/features/investigacao/mural.mjs';

const iniciais = [
  { ...cartaoNovo({ id:'p1', tipo:'pista', titulo:'Luva no canal', x:.17, y:.26 }),
    texto:'Couro de cabrito, costura veneziana. Encontrada presa no portão da Ca\' Dolfin.', estado:'confirmada' },
  { ...cartaoNovo({ id:'p2', tipo:'pista', titulo:'O sino tocou às 3h', x:.44, y:.14 }),
    texto:'Três testemunhas. O sineiro jura que não subiu.', estado:'investigando' },
  { ...cartaoNovo({ id:'s1', tipo:'suspeito', titulo:'Il Carnefice', x:.74, y:.3 }),
    texto:'Máscara de médico da peste. Visto duas vezes perto do Arsenale.' },
  { ...cartaoNovo({ id:'l1', tipo:'local', titulo:'Arsenale', x:.26, y:.66 }),
    texto:'Portões lacrados desde o incêndio. Alguém entra mesmo assim.' },
  { ...cartaoNovo({ id:'d1', tipo:'documento', titulo:'Carta sem assinatura', x:.57, y:.72 }),
    texto:'"Não procure o que afundou. Ele voltou por vontade própria."', estado:'encontrada' },
  { ...cartaoNovo({ id:'t1', tipo:'teoria', titulo:'O Pecado é o sineiro', x:.84, y:.64 }),
    texto:'Explica o sino e o horário. Não explica a luva.' },
];
let L = [];
for (const [a,b] of [['p1','l1'],['p2','t1'],['s1','l1'],['d1','s1'],['p1','s1']]) L = ligar(L,a,b);

function App(){
  const [cartoes,setCartoes]=useState(iniciais);
  const [ligacoes,setLigacoes]=useState(L);
  return (
    <div style={{height:'100vh',padding:16,background:'#0A0908',boxSizing:'border-box'}}>
      <MuralInvestigacao
        cartoes={cartoes} ligacoes={ligacoes} autor="a1"
        podeEditar={new URLSearchParams(location.search).get('ver')!=='1'}
        aoMudarCartoes={setCartoes} aoMudarLigacoes={setLigacoes}
      />
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App/>);
