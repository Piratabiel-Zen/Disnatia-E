import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../core/firebase';
import { newSheet } from '../features/sheets/SheetComponents';
import SheetsPage from '../features/sheets/SheetsPage';
import { passwordRecord } from '../adventure/visitorAccess.mjs';
import './visitor-summons.css';

export default function VisitorsPage({masterMode,access}) {
  const [visitors,setVisitors]=useState([]);
  const [selected,setSelected]=useState('');
  const [name,setName]=useState('');
  const [password,setPassword]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [characterName,setCharacterName]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  useEffect(()=>{
    if(!masterMode)return;
    return onSnapshot(collection(db,'visitors'),snap=>setVisitors(snap.docs.map(item=>({id:item.id,...item.data()}))),()=>setMessage('Não foi possível carregar visitantes. Confira sua conexão.'));
  },[masterMode]);
  const active=visitors.find(visitor=>visitor.id===selected);
  const action=async work=>{
    if(busy)return;setBusy(true);setMessage('');
    try{await work();}catch{setMessage('Não foi possível salvar. Confira a conexão e tente novamente.');}
    finally{setBusy(false);}
  };
  const create=()=>action(async()=>{
    const trimmed=name.trim();
    if(!trimmed||newPassword.length<6){setMessage('Informe o nome e uma senha de pelo menos 6 caracteres.');return;}
    if(visitors.some(visitor=>visitor.name.trim().toLocaleLowerCase('pt-BR')===trimmed.toLocaleLowerCase('pt-BR'))){setMessage('Já existe um visitante com esse nome.');return;}
    const id=crypto.randomUUID();
    await setDoc(doc(db,'visitors',id),{name:trimmed,password:await passwordRecord(newPassword),active:true,authVersion:1,createdAt:Date.now()});
    setSelected(id);setName('');setNewPassword('');setMessage('Visitante criado. Adicione os personagens abaixo.');
  });
  const resetPassword=()=>action(async()=>{
    if(password.length<6){setMessage('Use pelo menos 6 caracteres.');return;}
    await setDoc(doc(db,'visitors',active.id),{password:await passwordRecord(password),authVersion:Number(active.authVersion||1)+1,updatedAt:Date.now()},{merge:true});
    setPassword('');setMessage('Senha atualizada. O visitante precisará entrar novamente.');
  });
  const addCharacter=()=>action(async()=>{
    if(!active||!characterName.trim())return;
    const id=crypto.randomUUID();
    await setDoc(doc(db,'sheets',id),{...newSheet(id),nome:characterName.trim(),audience:'visitor',visitorId:active.id,senha:''});
    setCharacterName('');setMessage('Personagem criado. Abra a ficha para configurar classe, atributos e habilidades.');
  });
  if(!masterMode){
    if(access?.role!=='visitor')return <p className="visitor-error">Esta área é exclusiva do Mestre e dos visitantes.</p>;
    return <SheetsPage masterMode={false} access={access} visitorId={access.visitorId}/>;
  }
  return <div className="visitors-page">
    <header><small>ACESSOS DA CAMPANHA</small><h2>Visitantes</h2><p>Cada pessoa entra pelo próprio nome e controla apenas os personagens vinculados a ela.</p></header>
    <section className="visitor-admin-panel"><h3>Novo visitante</h3><div className="visitor-form"><label>Nome do visitante<input value={name} onChange={event=>setName(event.target.value)} maxLength={80}/></label><label>Senha do novo visitante<input type="password" value={newPassword} onChange={event=>setNewPassword(event.target.value)} autoComplete="new-password"/></label><button disabled={busy||!name.trim()} onClick={create}>Criar visitante</button></div></section>
    <div className="visitor-list" aria-label="Visitantes cadastrados">{visitors.map(visitor=><button key={visitor.id} className={selected===visitor.id?'active':''} onClick={()=>{setSelected(visitor.id);setPassword('');setMessage('');}}>{visitor.name}<small>{visitor.active===false?'Acesso suspenso':'Acesso ativo'}</small></button>)}</div>
    {active&&<section className="visitor-admin-panel"><h3>{active.name}</h3><div className="visitor-form"><label>Nova senha<input type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete="new-password"/></label><button disabled={busy} onClick={resetPassword}>Atualizar senha</button><button disabled={busy} onClick={()=>action(()=>setDoc(doc(db,'visitors',active.id),{active:active.active===false,updatedAt:Date.now()},{merge:true}))}>{active.active===false?'Reativar acesso':'Suspender acesso'}</button></div><div className="visitor-form"><label>Nome do personagem<input value={characterName} onChange={event=>setCharacterName(event.target.value)} maxLength={100}/></label><button disabled={busy||!characterName.trim()} onClick={addCharacter}>Adicionar personagem</button></div><SheetsPage key={active.id} masterMode={true} visitorId={active.id} access={{role:'master'}}/></section>}
    {message&&<p className="visitor-message" role="status">{message}</p>}
    {!visitors.length&&<p>Nenhum visitante cadastrado ainda.</p>}
  </div>;
}
