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

export function cameraMemberRows(docs,previous=[]){
  const prior=new Map(previous.map(row=>[row.id,row]));
  return docs.map(entry=>{
    const row=entry.data({serverTimestamps:'estimate'});
    const previousStamp=prior.get(entry.id)?.updatedAt;
    const updatedAt=entry.metadata?.hasPendingWrites&&previousStamp?previousStamp:row.updatedAt||previousStamp;
    return {...row,id:entry.id,updatedAt};
  });
}

const iceFragments=sdp=>new Set([...String(sdp||'').matchAll(/^a=ice-ufrag:(.+)$/gm)].map(match=>match[1].trim()));

export function createCameraPeer({localId,remoteId,iceServers,publish,subscribe,onStream,onState,onIssue=()=>{},Peer=globalThis.RTCPeerConnection,
  schedule=setTimeout,cancel=clearTimeout,connectionTimeout=20000,recoveryDelays=[800,2500,6000],disconnectGrace=5000}){
  const initiator=localId<remoteId,pc=new Peer({iceServers});
  const epoch=globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2);
  let sender=initiator?pc.addTransceiver('video',{direction:'sendrecv'}).sender:null;
  let closed=false,desiredTrack=null,queue=Promise.resolve(),mediaQueue=Promise.resolve(),round='',offerSdp='',answerSdp='',attempts=0,offerNumber=0;
  let candidateTimer=null,deadline=null,recoveryTimer=null,signalTimer=null,stopSignals=()=>{},signalAttempts=0;
  let candidates=[],remoteStream=null,lastRequest='',lastFrames=null;
  const seen=new Set(),oldAnswers=new Set();
  const ownIce=initiator?'leftIce':'rightIce',remoteIce=initiator?'rightIce':'leftIce';
  const safePublish=data=>closed?Promise.resolve():publish({...data,protocol:2});
  const issue=problem=>onIssue(String(problem?.code||problem?.name||'connection'));
  const enqueue=work=>{
    const result=queue.then(()=>{if(!closed)return work();});
    queue=result.catch(problem=>{if(!closed){issue(problem);scheduleRecovery();}});
    return result;
  };
  const applyTrack=()=>{
    // Camera controls must not wait for another peer's SDP/network acknowledgement.
    const result=mediaQueue.then(async()=>{
      if(closed||!sender)return;
      const track=desiredTrack;
      await sender.replaceTrack(track);
      if(track&&sender.getParameters&&sender.setParameters){
        const parameters=sender.getParameters();if(!parameters.encodings?.length)parameters.encodings=[{}];
        parameters.encodings.forEach(encoding=>{encoding.maxBitrate=200000;encoding.maxFramerate=20;});
        try{await sender.setParameters(parameters);}catch{/* Browser-specific sender limits must not stop the call. */}
      }
    });
    mediaQueue=result.catch(()=>{});return result;
  };
  const send=data=>{
    safePublish(data).catch(problem=>{
      if(closed)return;issue(problem);
      if(problem?.code==='permission-denied'){cancel(deadline);cancel(recoveryTimer);deadline=null;recoveryTimer=null;attempts=recoveryDelays.length;onState('failed');}
      else scheduleRecovery();
    });
  };
  const armDeadline=()=>{
    cancel(deadline);deadline=schedule(()=>{deadline=null;if(!closed&&!connected())scheduleRecovery();},connectionTimeout);
  };
  const resetRound=value=>{
    round=value;seen.clear();candidates=[];lastFrames=null;cancel(candidateTimer);candidateTimer=null;
  };
  const makeOffer=async restart=>{
    if(closed)return;
    if(pc.signalingState&&pc.signalingState!=='stable')await pc.setLocalDescription({type:'rollback'});
    resetRound(`${localId}:${epoch}:${++offerNumber}`);
    const offer=await pc.createOffer(restart?{iceRestart:true}:undefined);
    if(closed)return;
    await pc.setLocalDescription(offer);offerSdp=pc.localDescription.sdp;
    send({offerId:round,offer:{type:pc.localDescription.type,sdp:offerSdp},answer:null,answerFor:'',leftIce:[],leftIceFor:round,rightIce:[],rightIceFor:''});
    armDeadline();
  };
  function scheduleRecovery(delay){
    if(closed||recoveryTimer)return;
    if(attempts>=recoveryDelays.length){cancel(deadline);onState('failed');return;}
    onState('reconnecting');
    recoveryTimer=schedule(()=>{
      recoveryTimer=null;attempts++;
      enqueue(async()=>{
        if(initiator)await makeOffer(true);
        else {
          send({restartRequest:{id:`${localId}:${attempts}:${Date.now()}`,from:localId,forOffer:round}});
          armDeadline();
        }
      }).catch(()=>{});
    },delay??recoveryDelays[attempts]);
  }
  const connected=()=>pc.connectionState?pc.connectionState==='connected':pc.iceConnectionState==='connected'||pc.iceConnectionState==='completed';
  const stateChange=()=>{
    if(closed)return;
    if(connected()){
      cancel(deadline);cancel(recoveryTimer);deadline=null;recoveryTimer=null;attempts=0;onState('connected');
    }else if(pc.connectionState==='failed'||pc.iceConnectionState==='failed')scheduleRecovery();
    else if(pc.connectionState==='disconnected'||pc.iceConnectionState==='disconnected')scheduleRecovery(disconnectGrace);
    else onState(pc.connectionState||pc.iceConnectionState||'connecting');
  };
  pc.onconnectionstatechange=stateChange;pc.oniceconnectionstatechange=stateChange;
  pc.onicecandidate=event=>{
    if(closed||!round||!event.candidate)return;
    const candidate=event.candidate.toJSON();
    const fragments=iceFragments(pc.localDescription?.sdp);
    if(candidate.usernameFragment&&fragments.size&&!fragments.has(candidate.usernameFragment))return;
    candidates.push(candidate);
    if(!candidateTimer)candidateTimer=schedule(()=>{
      candidateTimer=null;safePublish({[ownIce]:candidates.slice(-40),[ownIce+'For']:round}).catch(problem=>{issue(problem);scheduleRecovery();});
    },120);
  };
  pc.ontrack=event=>{
    if(closed)return;
    // Safari and Chromium can produce streamless track events. Keep one stream
    // per peer rather than replacing srcObject for each negotiation callback.
    if(!remoteStream)remoteStream=event.streams?.[0]||new MediaStream();
    if(!remoteStream.getTracks().some(track=>track.id===event.track.id))remoteStream.addTrack(event.track);
    onStream(remoteStream);
  };
  const processSignal=async data=>{
    if(!initiator&&data.offer?.sdp&&data.offer.sdp!==offerSdp){
      resetRound(data.offerId||data.offer.sdp);answerSdp='';
      await pc.setRemoteDescription(data.offer);offerSdp=data.offer.sdp;
      const video=pc.getTransceivers().find(transceiver=>transceiver.receiver?.track?.kind==='video');
      if(!video)throw new Error('No video transceiver');
      video.direction='sendrecv';sender=video.sender;await applyTrack();
      const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
      send({answer:{type:pc.localDescription.type,sdp:pc.localDescription.sdp},answerFor:round});
      armDeadline();
    }
    if(initiator&&data.answer?.sdp){
      // An old answer may arrive from a cached watch or a previous ICE round.
      if(data.offer?.sdp!==offerSdp)oldAnswers.add(data.answer.sdp);
      const matching=data.offer?.sdp===offerSdp&&(data.answerFor===round||(!data.answerFor&&!oldAnswers.has(data.answer.sdp)));
      if(matching&&data.answer.sdp!==answerSdp){await pc.setRemoteDescription(data.answer);answerSdp=data.answer.sdp;}
    }
    if(initiator&&data.restartRequest?.from===remoteId&&data.restartRequest.forOffer===round&&data.restartRequest.id!==lastRequest){
      lastRequest=data.restartRequest.id;await makeOffer(true);return;
    }
    if(!pc.remoteDescription)return;
    const forRound=data[remoteIce+'For'];
    if(forRound&&forRound!==round)return;
    const fragments=iceFragments(pc.remoteDescription.sdp);
    for(const candidate of data[remoteIce]||[]){
      const key=JSON.stringify(candidate);if(seen.has(key))continue;
      seen.add(key);
      if(candidate.usernameFragment&&fragments.size&&!fragments.has(candidate.usernameFragment))continue;
      try{await pc.addIceCandidate(candidate);}catch(problem){
        // One stale or unsupported candidate cannot prevent all later routes.
        // An actual connectivity failure is handled by the ICE state/deadline.
        issue(problem);
      }
    }
    if(connected())stateChange();
  };
  const attachSignals=()=>{
    if(closed)return;stopSignals();
    stopSignals=subscribe((data,metadata={})=>{if(!metadata.fromCache)signalAttempts=0;enqueue(()=>processSignal(data)).catch(()=>{});},problem=>{
      if(closed)return;issue(problem);
      if(problem?.code==='permission-denied'||signalAttempts>=3){cancel(deadline);cancel(recoveryTimer);deadline=null;recoveryTimer=null;attempts=recoveryDelays.length;onState('failed');return;}
      cancel(signalTimer);signalTimer=schedule(()=>{signalTimer=null;attachSignals();},[1000,2500,6000][signalAttempts++]);
    })||(()=>{});
  };
  const ready=initiator?enqueue(()=>makeOffer(false)).catch(()=>{}):Promise.resolve();
  attachSignals();if(!initiator)armDeadline();
  return {
    ready,
    setTrack(track){desiredTrack=track;return applyTrack();},
    resume(){if(!connected()){attempts=0;cancel(recoveryTimer);recoveryTimer=null;scheduleRecovery(0);}},
    recover(){
      if(closed)return;attempts=0;cancel(recoveryTimer);recoveryTimer=null;
      scheduleRecovery(0);
    },
    async checkHealth(expectVideo=false){
      if(closed)return;
      if(!connected()){if(!deadline&&!recoveryTimer&&attempts<recoveryDelays.length)scheduleRecovery();return;}
      if(!expectVideo||!pc.getStats){lastFrames=null;return;}
      try{
        const stats=await pc.getStats();let frames=0,hasVideo=false;
        stats.forEach(row=>{if(row.type==='inbound-rtp'&&(row.kind==='video'||row.mediaType==='video')){hasVideo=true;frames+=Number(row.framesDecoded??row.bytesReceived??0);}});
        if(hasVideo&&lastFrames!==null&&frames===lastFrames)scheduleRecovery();
        lastFrames=frames;
      }catch{/* A missing stats field must not interrupt working video. */}
    },
    close(){
      if(closed)return;closed=true;
      [candidateTimer,deadline,recoveryTimer,signalTimer].forEach(cancel);stopSignals();
      pc.ontrack=null;pc.onicecandidate=null;pc.onconnectionstatechange=null;pc.oniceconnectionstatechange=null;pc.close();
    },
  };
}
