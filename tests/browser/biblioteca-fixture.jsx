// A biblioteca de tokens: lista, busca e escolha de vários.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import BibliotecaDeTokens from '../../src/features/mapa-batalha/BibliotecaDeTokens.jsx';

const v={'--linha-mesa':'#232C42','--contraste-mesa':'#B51E34','--contraste-claro-mesa':'#E04356'};
for(const[k,val]of Object.entries(v))document.documentElement.style.setProperty(k,val);

const fichas=[{id:'f1',nome:"Dominic D'Coco"},{id:'f2',nome:'Kennedy Flanders'}];
const tokens=[
  {id:'t1',nome:'Dominic',sheetId:'f1',foto:''},
  {id:'t2',nome:'Kennedy',sheetId:'f2',foto:''},
  {id:'t3',nome:'Ogro do canal',foto:''},
  {id:'t4',nome:'Lorde de Absinto',foto:''},
  {id:'t5',nome:'Guarda da ponte',foto:''},
  {id:'t6',nome:'Sombra menor',foto:''},
  {id:'t7',nome:'Irmã Rute',foto:''},
  {id:'t8',nome:'Gondoleiro',foto:''},
];
function Demo(){
  const [log,setLog]=useState('');
  return <>
    <BibliotecaDeTokens tokens={tokens} fichas={fichas}
      aoColocar={l=>setLog(`colocou ${l.length}: ${l.map(t=>t.nome).join(', ')}`)}
      aoExcluir={()=>{}} aoFechar={()=>{}} aoCriarNovo={()=>{}} />
    <div style={{position:'absolute',left:340,top:80,color:'#8fb2e8',font:'12px monospace'}}>{log}</div>
  </>;
}
createRoot(document.getElementById('root')).render(
  <div style={{background:'#0b0d17',height:'100vh',position:'relative'}}><Demo/></div>);
