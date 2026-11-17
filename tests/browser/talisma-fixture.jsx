import { createRoot } from 'react-dom/client';
import '../../src/features/mapa-batalha/tokens-vivos.css';
import { caixasDoTalisma, resumoDoTalisma, talismaDoExorcista, talismaDoPecado }
  from '../../src/features/mapa-batalha/talismaDeToken.mjs';

function Peca({ talisma, nome, numero, dispSize = 70 }) {
  const labelScale = 1;
  return (
    <div style={{position:'relative',width:dispSize,margin:'70px 34px 30px',
                 display:'flex',flexDirection:'column',alignItems:'center'}}>
      {numero && (
        <div className="token-talisma-numero" style={{'--escala':labelScale}}>{resumoDoTalisma(talisma)}</div>
      )}
      <div className="token-talisma" data-critico={talisma.critico?'sim':'nao'}
           style={{'--escala':labelScale,'--largura':`${Math.max(46,dispSize)}px`}}>
        {caixasDoTalisma(talisma).map((e,i)=><i key={i} data-estado={e} />)}
      </div>
      <div style={{width:dispSize,height:dispSize,borderRadius:'50%',
                   border:`2px solid ${talisma.critico?'#C8102E':'#A98045'}`,
                   background:'radial-gradient(circle at 40% 35%,#2A2320,#100E0D)',
                   display:'grid',placeItems:'center',fontSize:dispSize*.4,marginTop:3}}>
        {talisma.tipo==='pecado'?'💀':'🕵'}
      </div>
      <div style={{color:'#CFCCC5',fontFamily:'Cinzel,serif',fontSize:11,marginTop:5,whiteSpace:'nowrap'}}>{nome}</div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <div style={{display:'flex',flexWrap:'wrap',background:'#0C0D0F',minHeight:'100vh',padding:'0 20px'}}>
    <Peca nome="inteiro" numero talisma={talismaDoExorcista({estresse:0,ferimentos:0})} />
    <Peca nome="3 cortes" numero talisma={talismaDoExorcista({estresse:3,ferimentos:0})} />
    <Peca nome="1 ferimento" numero talisma={talismaDoExorcista({estresse:2,ferimentos:1})} />
    <Peca nome="2 ferimentos" numero talisma={talismaDoExorcista({estresse:2,ferimentos:2})} />
    <Peca nome="beira da morte" numero talisma={talismaDoExorcista({estresse:2,ferimentos:3})} />
    <Peca nome="Ogro (4)" talisma={talismaDoPecado({talisma:4,talismaCortes:1})} />
    <Peca nome="Lorde (8)" talisma={talismaDoPecado({talisma:8,talismaCortes:5})} />
    <Peca nome="pronto p/ executar" talisma={talismaDoPecado({talisma:4,talismaCortes:4})} />
  </div>
);
