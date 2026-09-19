import { useEffect, useRef, useState } from 'react';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from '../core/firebase';

const SAMPLE_MS = 20000;

export default function ConnectionHealth(){
  const [online,setOnline]=useState(()=>typeof navigator==='undefined'?true:navigator.onLine);
  const [latency,setLatency]=useState(null);
  const [sampling,setSampling]=useState(false);
  const mountedRef=useRef(true);

  useEffect(()=>{
    mountedRef.current=true;
    const onOnline=()=>setOnline(true);
    const onOffline=()=>{setOnline(false);setLatency(null);};
    window.addEventListener('online',onOnline);
    window.addEventListener('offline',onOffline);

    let timer=0;
    const sample=async()=>{
      if(!navigator.onLine){setOnline(false);setLatency(null);return;}
      setOnline(true);
      setSampling(true);
      const started=performance.now();
      try{
        await getDocFromServer(doc(db,'config','battlemap_active'));
        if(mountedRef.current)setLatency(Math.round(performance.now()-started));
      }catch(_){
        if(mountedRef.current)setLatency(null);
      }finally{
        if(mountedRef.current)setSampling(false);
      }
    };
    sample();
    timer=window.setInterval(sample,SAMPLE_MS);
    return()=>{mountedRef.current=false;window.clearInterval(timer);window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOffline);};
  },[]);

  const level=!online||latency==null?'bad':latency<=180?'good':latency<=450?'warn':'bad';
  const label=!online?'Offline':latency==null?(sampling?'Medindo…':'Sem resposta'):`${latency} ms`;
  return <div className={`connection-health ${level}`} title="Latência aproximada até o Firestore"><i/><span>{label}</span></div>;
}
