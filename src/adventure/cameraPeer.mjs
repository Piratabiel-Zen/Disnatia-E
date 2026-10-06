// WebRTC media never passes through Firestore. The transport carries only SDP/ICE.
export const CAMERA_VIDEO = {width:{ideal:320,max:640},height:{ideal:180,max:360},frameRate:{ideal:15,max:20}};
export const CAMERA_LIMIT = 8;
export function cameraName(access,sheet,masterMode){
  return String(masterMode?'Mestre':access?.role==='visitor'?(access.name||sheet?.nome||'Visitante'):(sheet?.nome||access?.name||'Jogador')).slice(0,80);
}
export function cameraPosition(position,width,height,tileWidth=176,tileHeight=134){
  return {x:Math.max(8,Math.min(Math.max(8,width-tileWidth-8),Number(position?.x)||8)),y:Math.max(8,Math.min(Math.max(8,height-tileHeight-8),Number(position?.y)||8))};
}
export function timestampMs(value){return typeof value?.toMillis==='function'?value.toMillis():Number(value)||0;}
export function activeCameraMembers(rows,now){return rows.filter(row=>row.online!==false&&timestampMs(row.updatedAt)>now-90000&&timestampMs(row.updatedAt)<now+90000).sort((a,b)=>String(a.id).localeCompare(String(b.id)));}

export function createCameraPeer({localId,remoteId,iceServers,publish,subscribe,onStream,onState,Peer=globalThis.RTCPeerConnection}){
  const initiator=localId<remoteId;
  const pc=new Peer({iceServers});
  let sender=initiator?pc.addTransceiver('video',{direction:'sendrecv'}).sender:null;
  let desiredTrack=null;
  const applyTrack=async()=>{
    if(closed||!sender)return;
    await sender.replaceTrack(desiredTrack);
    if(desiredTrack&&sender.getParameters&&sender.setParameters){
      const parameters=sender.getParameters();if(!parameters.encodings?.length)parameters.encodings=[{}];
      parameters.encodings.forEach(encoding=>{encoding.maxBitrate=200000;encoding.maxFramerate=20;});
      try{await sender.setParameters(parameters);}catch{/* Some browsers negotiate these after connection. */}
    }
  };
  let closed=false,offerSdp='',answerSdp='',queue=Promise.resolve(),timer=null;
  const candidates=[],seen=new Set();
  const ownIce=initiator?'leftIce':'rightIce',remoteIce=initiator?'rightIce':'leftIce';
  const safePublish=data=>closed?Promise.resolve():publish(data);
  const fail=()=>{if(!closed)onState('failed');};
  const deadline=setTimeout(()=>{if(!closed&&pc.connectionState!=='connected')onState('failed');},20000);
  pc.onicecandidate=event=>{
    if(closed||!event.candidate)return;
    candidates.push(event.candidate.toJSON());
    if(!timer)timer=setTimeout(()=>{timer=null;safePublish({[ownIce]:candidates.slice(-40)}).catch(fail);},120);
  };
  pc.ontrack=event=>{if(!closed)onStream(event.streams[0]||new MediaStream([event.track]));};
  pc.onconnectionstatechange=()=>{if(!closed){if(pc.connectionState==='connected')clearTimeout(deadline);onState(pc.connectionState);}};
  const unsubscribe=subscribe(data=>{
    queue=queue.then(async()=>{
      if(closed)return;
      if(!initiator&&data.offer?.sdp&&data.offer.sdp!==offerSdp){
        await pc.setRemoteDescription(data.offer);offerSdp=data.offer.sdp;
        const video=pc.getTransceivers().find(transceiver=>transceiver.receiver?.track?.kind==='video');
        if(!video)throw new Error('No video transceiver');
        video.direction='sendrecv';sender=video.sender;await applyTrack();
        const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
        await safePublish({answer:{type:pc.localDescription.type,sdp:pc.localDescription.sdp}});
      }
      if(initiator&&data.answer?.sdp&&data.answer.sdp!==answerSdp){
        await pc.setRemoteDescription(data.answer);answerSdp=data.answer.sdp;
      }
      if(!pc.remoteDescription)return;
      for(const candidate of data[remoteIce]||[]){
        const key=JSON.stringify(candidate);if(seen.has(key))continue;
        await pc.addIceCandidate(candidate);seen.add(key);
      }
    }).catch(fail);
  });
  const ready=initiator?(async()=>{
    const offer=await pc.createOffer();if(closed)return;
    await pc.setLocalDescription(offer);
    await safePublish({offer:{type:pc.localDescription.type,sdp:pc.localDescription.sdp}});
  })().catch(fail):Promise.resolve();
  return {
    ready,
    async setTrack(track){
      if(closed)return;desiredTrack=track;await applyTrack();
    },
    close(){if(closed)return;closed=true;clearTimeout(timer);clearTimeout(deadline);unsubscribe();pc.ontrack=null;pc.onicecandidate=null;pc.onconnectionstatechange=null;pc.close();},
  };
}
