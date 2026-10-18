import { useEffect, useState, useSyncExternalStore } from 'react';
import { syncState } from './syncState.mjs';
import { tokenOutbox } from './tokenPersistence.mjs';
export default function SessionConnection() {
  const [online,setOnline]=useState(navigator.onLine);
  const [tokens,setTokens]=useState(()=>tokenOutbox.status());
  const sync=useSyncExternalStore(syncState.subscribe,syncState.getSnapshot,syncState.getSnapshot);
  useEffect(()=>{const update=()=>setOnline(navigator.onLine);const stop=tokenOutbox.subscribe(()=>setTokens(tokenOutbox.status()));window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{stop();window.removeEventListener('online',update);window.removeEventListener('offline',update)}},[]);
  const state=!online?'offline':tokens.failed||sync.error?'error':tokens.count||sync.pending?'saving':sync.state;
  const label={offline:'Sem conexão',error:'Alteração pendente',saving:'Enviando alterações',cache:'Reconectando',connecting:'Conectando',live:'Conectado'}[state];
  const tokenError=tokens.error?.code||tokens.error?.message||'';
  const detail=sync.error?'Falha de leitura no Firestore ('+sync.error+'). Confira a conexão e as regras de acesso.':tokenError?'Falha ao salvar token no Firestore ('+tokenError+'). A gravação será tentada novamente automaticamente.':'Estado das alterações da sessão e do mapa';
  return <span className={'ad-connection '+state} title={detail} role="status"><i/>{label}{tokens.failed&&<button onClick={()=>tokenOutbox.retry().catch(()=>{})}>Tentar novamente</button>}</span>;
}
