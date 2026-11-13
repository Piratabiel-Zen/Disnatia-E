import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../core/firebase';

export default function ConnectionHealth(){
  const [state,setState]=useState(()=>typeof navigator==='undefined'||navigator.onLine?'connecting':'offline');

  useEffect(()=>{
    const onOnline=()=>setState('connecting');
    const onOffline=()=>setState('offline');
    window.addEventListener('online',onOnline);
    window.addEventListener('offline',onOffline);
    const unsubscribe=onSnapshot(doc(db,'config','battlemap_active'),{includeMetadataChanges:true},snapshot=>{
      setState(!navigator.onLine?'offline':snapshot.metadata.fromCache?'connecting':'connected');
    },()=>setState('offline'));
    return()=>{unsubscribe();window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOffline);};
  },[]);

  const level=state==='connected'?'good':state==='connecting'?'warn':'bad';
  const label=state==='connected'?'Conectado':state==='connecting'?'Sincronizando':'Desconectado';
  return <div className={`connection-health ${level}`} title="Estado da sincronização em tempo real. Ações locais continuam disponíveis durante a sincronização."><i/><span>{label}</span></div>;
}
