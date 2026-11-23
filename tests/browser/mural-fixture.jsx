// O mural renderizado com um jogador comum: é a tela que ficou preta.
import { createRoot } from 'react-dom/client';
import MuralInvestigacao from '../../src/features/investigacao/MuralInvestigacao.jsx';
import { podeMexerNoCartao } from '../../src/features/investigacao/mural.mjs';
// A repintura de ouija viaja com a PÁGINA, não com o mural. Sem este import a
// fixture mostra o mural marrom de sempre e dá a impressão de que o tema da
// noite não pegou.
import '../../src/features/oneshot/mural-ouija.css';

const v={'--fundo-mesa':'#070910','--superficie-mesa':'#0F1320','--linha-mesa':'#232C42',
 '--contraste-mesa':'#8CA0C4','--contraste-claro-mesa':'#C3D0E6','--ink-mesa':'#D4D7E0'};
for(const[k,val]of Object.entries(v))document.documentElement.style.setProperty(k,val);

const membro={uid:'u-ana',papel:'jogador',nome:'Ana'};
const cartoes=[
  {id:'c1',tipo:'pista',titulo:'Luz sobre o canal',texto:'Três testemunhas, mesma hora.',x:0.2,y:0.25,autor:'u-ana',liberadoParaTodos:true},
  {id:'c2',tipo:'pista',titulo:'Chave sem fechadura',texto:'Recolhida sob o altar.',x:0.55,y:0.45,autor:'u-bob',liberadoParaTodos:true},
];

createRoot(document.getElementById('root')).render(
  <div style={{background:'#070910',height:'100vh',padding:14,boxSizing:'border-box'}}>
    <MuralInvestigacao
      cartoes={cartoes} ligacoes={[]} autor={membro.uid} mestre={false}
      fichas={[]} membro={membro}
      podeMexer={c=>podeMexerNoCartao(c,membro)}
      aoMudarCartoes={()=>{}} aoMudarLigacoes={()=>{}} />
  </div>);
