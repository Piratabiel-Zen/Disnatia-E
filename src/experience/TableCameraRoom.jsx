import { useEffect,useRef,useState } from 'react';
import { createPortal } from 'react-dom';
import { collection,deleteDoc,doc,limit,onSnapshot,orderBy,query,serverTimestamp,setDoc } from 'firebase/firestore';
import { db } from '../core/firebase';
import { activeCameraMembers,CAMERA_LIMIT,CAMERA_VIDEO,cameraName,cameraPosition,createCameraPeer,cameraMemberRows,timestampMs } from '../adventure/cameraPeer.mjs';

function VideoTile({row,stream,state,index,local,layoutVersion,onRetry}){
  const video=useRef(null),tile=useRef(null),drag=useRef(null);
  const storageKey='dinastia_camera_position_'+(row.userKey||row.id);
  const initial=()=>{
    let saved;try{saved=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{}
    const width=window.innerWidth<=600?140:176;
    const startX=window.innerWidth<=600||document.documentElement.classList.contains('dinastia-map-fullscreen')?12:92;
    const columns=Math.max(1,Math.floor((window.innerWidth-startX-12)/(width+12)));
    return cameraPosition(saved||{x:startX+(index%columns)*(width+12),y:window.innerHeight-205-Math.floor(index/columns)*146},window.innerWidth,window.innerHeight,width);
  };
  const [pos,setPos]=useState(initial),[playback,setPlayback]=useState('waiting');
  useEffect(()=>{setPos(initial());},[layoutVersion,index]);
  const playVideo=()=>{
    const node=video.current;if(!node?.srcObject)return;
    node.muted=true;node.defaultMuted=true;
    node.play().then(()=>{if(node.readyState>=2)setPlayback('playing');}).catch(()=>setPlayback('blocked'));
  };
  useEffect(()=>{
    const node=video.current;if(!node)return;
    setPlayback('waiting');node.srcObject=stream||null;
    if(!stream)return;
    let active=true;
    const ready=()=>{if(active){node.play().catch(()=>{if(active)setPlayback('blocked');});}};
    const playing=()=>{if(active)setPlayback('playing');};
    const visible=()=>{if(!document.hidden)ready();};
    node.muted=true;node.defaultMuted=true;
    node.addEventListener('loadedmetadata',ready);node.addEventListener('canplay',ready);node.addEventListener('playing',playing);
    const observed=new Set();
    const observeTracks=()=>{stream.getVideoTracks().forEach(track=>{if(!observed.has(track)){observed.add(track);track.addEventListener('unmute',ready);}});ready();};
    stream.addEventListener('addtrack',observeTracks);observeTracks();
    document.addEventListener('visibilitychange',visible);
    const deadline=setTimeout(()=>{if(active&&node.readyState<2){setPlayback('stalled');if(!local)onRetry?.();}},15000);
    return()=>{active=false;clearTimeout(deadline);node.removeEventListener('loadedmetadata',ready);node.removeEventListener('canplay',ready);node.removeEventListener('playing',playing);document.removeEventListener('visibilitychange',visible);stream.removeEventListener('addtrack',observeTracks);observed.forEach(track=>track.removeEventListener('unmute',ready));node.srcObject=null;};
  },[stream]);
  useEffect(()=>{
    const resize=()=>setPos(previous=>cameraPosition(previous,innerWidth,innerHeight,tile.current?.offsetWidth,tile.current?.offsetHeight));
    window.addEventListener('resize',resize);document.addEventListener('fullscreenchange',resize);
    return()=>{window.removeEventListener('resize',resize);document.removeEventListener('fullscreenchange',resize);};
  },[]);
  const save=next=>{setPos(next);try{localStorage.setItem(storageKey,JSON.stringify(next));}catch{}};
  const move=event=>{
    if(!drag.current)return;
    const next=cameraPosition({x:drag.current.x+event.clientX-drag.current.px,y:drag.current.y+event.clientY-drag.current.py},innerWidth,innerHeight,tile.current.offsetWidth,tile.current.offsetHeight);
    tile.current.style.left=next.x+'px';tile.current.style.top=next.y+'px';drag.current.next=next;
  };
  const end=()=>{if(drag.current){save(drag.current.next||pos);drag.current=null;}};
  const key=event=>{const offsets={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]};if(!offsets[event.key])return;event.preventDefault();const [dx,dy]=offsets[event.key];save(cameraPosition({x:pos.x+dx,y:pos.y+dy},innerWidth,innerHeight,tile.current.offsetWidth,tile.current.offsetHeight));};
  return <article ref={tile} className={'table-camera-tile'+(local?' own':'')} style={{left:pos.x,top:pos.y}} aria-label={'Câmera de '+row.name}>
    <video ref={video} autoPlay playsInline muted disablePictureInPicture disableRemotePlayback aria-label={'Vídeo de '+row.name} style={{visibility:row.cameraOn&&stream?'visible':'hidden'}}/>
    {(!row.cameraOn||!stream||playback==='waiting'||playback==='blocked'||playback==='stalled')&&<div className="table-camera-placeholder">{!row.cameraOn?'Câmera desligada':playback==='blocked'?<button onClick={playVideo}>Reproduzir vídeo</button>:state==='failed'||playback==='stalled'?<button onClick={onRetry} aria-label={'Reconectar vídeo de '+row.name}>Reconectar vídeo</button>:state==='reconnecting'?'Reconectando vídeo...':'Conectando vídeo...'}</div>}
    <div className="table-camera-name" role="button" tabIndex={0} aria-label={'Mover câmera de '+row.name} title="Arraste para reposicionar; use as setas quando selecionado" onKeyDown={key} onPointerDown={event=>{if(event.button!==0)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);drag.current={...pos,px:event.clientX,py:event.clientY};}} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}><span>{row.name}{local?' · você':''}</span><small>{'\u283F'}</small></div>
  </article>;
}

export default function TableCameraRoom({access,selectedSheet,masterMode,onClose,onJoined}){
  const [joined,setJoined]=useState(false),[busy,setBusy]=useState(false),[cameraOn,setCameraOn]=useState(false),[error,setError]=useState('');
  const [members,setMembers]=useState([]),[streams,setStreams]=useState({}),[states,setStates]=useState({}),[layoutVersion,setLayoutVersion]=useState(0);
  const session=useRef(null),localStream=useRef(null),live=useRef(true),operation=useRef(0);
  const name=cameraName(access,selectedSheet,masterMode),userKey=masterMode?'master':access?.role==='visitor'?'visitor_'+access.visitorId:'sheet_'+(access?.sheetId||selectedSheet?.id||'player');
  const identity=useRef({name,userKey});identity.current={name,userKey};
  const setIssue=message=>{if(live.current)setError(message);};
  const stopMedia=()=>{localStream.current?.getTracks().forEach(track=>track.stop());localStream.current=null;};
  const leave=()=>{
    operation.current++;stopMedia();const room=session.current;session.current=null;
    if(room){clearInterval(room.heartbeat);clearInterval(room.health);clearTimeout(room.rosterTimer);if(room.cleanup)room.cleanup();else room.unsubscribe?.();room.peers.forEach(peer=>peer.close());room.calls.forEach(ref=>deleteDoc(ref).catch(()=>{}));deleteDoc(room.ref).catch(()=>{});}
    if(live.current){setJoined(false);onJoined?.(false);setCameraOn(false);setMembers([]);setStreams({});setStates({});setBusy(false);}
  };
  useEffect(()=>{live.current=true;const pagehide=()=>leave();window.addEventListener('pagehide',pagehide);return()=>{live.current=false;leave();window.removeEventListener('pagehide',pagehide);};},[]);
  useEffect(()=>{if(session.current)setDoc(session.current.ref,{name,userKey},{merge:true}).catch(()=>setIssue('Não foi possível atualizar seu nome na chamada.'));},[name,userKey]);
  const join=async event=>{
    const pointer=event?.detail>0;
    if(busy||session.current)return;
    if(!globalThis.RTCPeerConnection){setError('Este navegador não oferece suporte a vídeo WebRTC.');return;}
    setBusy(true);setError('');const generation=++operation.current;
    const id=crypto.randomUUID(),ref=doc(db,'table_cameras',id);
    const room={id,ref,peers:new Map(),calls:new Map(),offset:0,rows:[],ownStamp:0,active:null,rosterReady:false,rosterCached:false,rosterRetries:0};session.current=room;
    try{
      await setDoc(ref,{...identity.current,online:true,cameraOn:false,updatedAt:serverTimestamp()});
      if(session.current!==room||generation!==operation.current){await deleteDoc(ref);return;}
      setJoined(true);onJoined?.(true);if(pointer)document.activeElement?.blur();
      let iceServers=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];
      // Optional relay settings must use restricted/short-lived credentials; no secrets shipped by default.
      try{const configured=JSON.parse(import.meta.env.VITE_CAMERA_ICE_SERVERS||'null');if(Array.isArray(configured))iceServers=configured;}catch{setIssue('Configuração de vídeo inválida. Usando conexão direta.');}
      const sync=()=>{
        if(session.current!==room)return;
        const active=room.rosterCached&&room.active?room.active:activeCameraMembers(room.rows,Date.now()+room.offset);
        room.active=active;
        if(active.length>CAMERA_LIMIT){leave();setIssue('A mesa suporta até 8 participantes nas câmeras. Tente novamente quando houver uma vaga.');return;}
        setMembers(active);
        const ids=new Set(active.filter(row=>row.id!==id).map(row=>row.id));
        room.peers.forEach((peer,remoteId)=>{if(!ids.has(remoteId)){peer.close();room.peers.delete(remoteId);setStreams(previous=>{const next={...previous};delete next[remoteId];return next;});setStates(previous=>{const next={...previous};delete next[remoteId];return next;});const callRef=room.calls.get(remoteId);room.calls.delete(remoteId);if(callRef)deleteDoc(callRef).catch(()=>{});}});
        active.forEach(row=>{
          if(row.id===id||room.peers.has(row.id))return;
          const callRef=doc(db,'table_camera_calls',[id,row.id].sort().join('_'));room.calls.set(row.id,callRef);
          const peer=createCameraPeer({localId:id,remoteId:row.id,iceServers,
            publish:data=>setDoc(callRef,{...data,updatedAt:serverTimestamp()},{merge:true}),
            subscribe:(callback,onError)=>onSnapshot(callRef,snap=>{if(snap.exists())callback(snap.data(),snap.metadata);},onError),
            onStream:stream=>{if(session.current===room)setStreams(previous=>({...previous,[row.id]:stream}));},
            onIssue:code=>{if(session.current===room&&code==='permission-denied')setIssue('Sem permissão para sinalizar um dos vídeos.');},
            onState:state=>{if(session.current===room)setStates(previous=>({...previous,[row.id]:state}));},
          });room.peers.set(row.id,peer);
          peer.setTrack(localStream.current?.getVideoTracks()[0]||null).catch(()=>peer.recover());
        });
      };
      const watchRoster=()=>{
        if(session.current!==room)return;
        room.unsubscribe?.();
        room.unsubscribe=onSnapshot(query(collection(db,'table_cameras'),orderBy('updatedAt','desc'),limit(32)),{includeMetadataChanges:true},snap=>{
          if(session.current!==room)return;
          room.rosterCached=!!snap.metadata.fromCache;
          if(!room.rosterCached){room.rosterRetries=0;setError(previous=>previous==='Recuperando a conexão das câmeras...'?'':previous);}
          if(room.rosterCached&&room.rosterReady)return;
          if(!room.rosterCached)room.rosterReady=true;
          const ownEntry=snap.docs.find(entry=>entry.id===id);
          room.rows=cameraMemberRows(snap.docs,room.rows);
          const own=room.rows.find(row=>row.id===id),ownStamp=timestampMs(own?.updatedAt);
          if(ownStamp&&!room.rosterCached&&!ownEntry?.metadata.hasPendingWrites&&ownStamp!==room.ownStamp){room.ownStamp=ownStamp;room.offset=ownStamp-Date.now();}
          sync();
        },problem=>{
          if(session.current!==room)return;
          if(problem?.code==='permission-denied'){setIssue('Sem permissão para conectar as câmeras.');return;}
          setIssue('Recuperando a conexão das câmeras...');
          if(room.rosterRetries<3)room.rosterTimer=setTimeout(watchRoster,[1000,2500,6000][room.rosterRetries++]);
        });
      };
      const checkPeers=()=>{
        if(session.current!==room||document.hidden)return;
        room.peers.forEach((peer,remoteId)=>peer.checkHealth(!!room.rows.find(row=>row.id===remoteId)?.cameraOn));
      };
      const resume=()=>{
        if(session.current!==room||document.hidden)return;
        setDoc(ref,{updatedAt:serverTimestamp()},{merge:true}).catch(()=>{});
        room.peers.forEach(peer=>peer.resume());checkPeers();
      };
      watchRoster();
      window.addEventListener('online',resume);document.addEventListener('visibilitychange',resume);
      const stopRoster=()=>room.unsubscribe?.();
      room.cleanup=()=>{stopRoster();window.removeEventListener('online',resume);document.removeEventListener('visibilitychange',resume);};
      room.health=setInterval(checkPeers,20000);
      room.heartbeat=setInterval(()=>{if(session.current!==room)return;setDoc(ref,{updatedAt:serverTimestamp()},{merge:true}).catch(()=>setIssue('Conexão instável nas câmeras.'));sync();},25000);

    }catch{if(session.current===room){leave();setIssue('Não foi possível entrar nas câmeras. Tente novamente.');}}
    finally{if(live.current&&generation===operation.current)setBusy(false);}
  };
  const toggleCamera=async()=>{
    if(busy||!session.current)return;
    setBusy(true);setError('');const room=session.current,generation=operation.current;
    try{
      if(localStream.current){
        stopMedia();await Promise.allSettled([...room.peers.values()].map(peer=>peer.setTrack(null).catch(()=>peer.recover())));setCameraOn(false);setStreams(previous=>({...previous,[room.id]:null}));
        await setDoc(room.ref,{cameraOn:false},{merge:true});
      }else{
        if(!navigator.mediaDevices?.getUserMedia)throw Object.assign(new Error(),{name:'Unsupported'});
        const stream=await navigator.mediaDevices.getUserMedia({video:CAMERA_VIDEO,audio:false});
        if(session.current!==room||generation!==operation.current){stream.getTracks().forEach(track=>track.stop());return;}
        localStream.current=stream;setCameraOn(true);setStreams(previous=>({...previous,[room.id]:stream}));const track=stream.getVideoTracks()[0];
        track.onended=()=>{if(session.current!==room)return;stopMedia();setCameraOn(false);setStreams(previous=>({...previous,[room.id]:null}));room.peers.forEach(peer=>peer.setTrack(null).catch(()=>{}));setDoc(room.ref,{cameraOn:false},{merge:true}).catch(()=>{});};
        await Promise.allSettled([...room.peers.values()].map(peer=>peer.setTrack(track).catch(()=>peer.recover())));
        if(session.current!==room||generation!==operation.current)return;
        await setDoc(room.ref,{cameraOn:true},{merge:true});
        if(session.current!==room||generation!==operation.current){deleteDoc(room.ref).catch(()=>{});return;}
        setCameraOn(true);setStreams(previous=>({...previous,[room.id]:stream}));
      }
    }catch(problem){
      if(session.current!==room||generation!==operation.current)return;
      stopMedia();setCameraOn(false);setStreams(previous=>({...previous,[room.id]:null}));room.peers.forEach(peer=>peer.setTrack(null).catch(()=>{}));setDoc(room.ref,{cameraOn:false},{merge:true}).catch(()=>{});
      setIssue(problem.name==='NotAllowedError'?'Câmera bloqueada. Permita a câmera para este site nas configurações do navegador.':problem.name==='NotFoundError'?'Nenhuma câmera foi encontrada.':problem.name==='NotReadableError'?'A câmera está ocupada por outro programa.':'Não foi possível ativar a câmera. Confira o dispositivo e tente novamente.');
    }finally{if(live.current&&generation===operation.current)setBusy(false);}
  };
  const reset=()=>{members.forEach(row=>{try{localStorage.removeItem('dinastia_camera_position_'+(row.userKey||row.id));}catch{}});setLayoutVersion(value=>value+1);};
  return <>
    <section id="table-camera-options" className="table-camera-controls" aria-label="Câmeras da mesa" onClick={event=>{if(event.detail>0)event.target.closest('button')?.blur();}}>
      <strong>Câmeras da mesa{joined?` · ${members.length}/${CAMERA_LIMIT}`:''}</strong>
      {!joined?<><p>Entre para ver a mesa. Sua câmera começa desligada; você decide quando compartilhá-la.</p><button disabled={busy} onClick={join}>{busy?'Conectando...':'Entrar nas câmeras'}</button></>:<><button disabled={busy} onClick={toggleCamera}>{busy?'Aguarde...':cameraOn?'Desligar minha câmera':'Ativar minha câmera'}</button><button onClick={reset}>Organizar câmeras</button><button onClick={leave}>Sair das câmeras</button></>}
      <button onClick={()=>{leave();onClose();}} aria-label="Fechar câmeras">{'\u00D7'}</button>
      {error&&<p role="alert">{error}</p>}
      {Object.values(states).some(state=>state==='reconnecting'||state==='disconnected')&&<p role="status">Reconectando os vídeos automaticamente...</p>}
      {Object.values(states).some(state=>state==='failed')&&<p role="status">Um vídeo não conectou. <button onClick={()=>session.current?.peers.forEach(peer=>peer.recover())}>Reconectar vídeos</button> Redes restritas podem precisar de um servidor de retransmissão.</p>}
    </section>
    {joined&&createPortal(<div className="table-cameras-surface">{members.map((row,index)=><VideoTile key={row.id} row={row.id===session.current?.id?{...row,cameraOn}:row} index={index} stream={streams[row.id]} state={states[row.id]} local={row.id===session.current?.id} layoutVersion={layoutVersion} onRetry={()=>session.current?.peers.get(row.id)?.recover()}/>)}</div>,document.body)}
  </>;
}
