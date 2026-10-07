import test from 'node:test';
import assert from 'node:assert/strict';
import {activeCameraMembers,cameraName,cameraPosition,createCameraPeer,cameraMemberRows,CAMERA_VIDEO} from '../src/adventure/cameraPeer.mjs';

test('camera identities, viewport clamping and stale participation',()=>{
  assert.equal(cameraName({role:'visitor',name:'Ana'},{nome:'NPC'},false),'Ana');
  assert.equal(cameraName({role:'player'},{nome:'Jack'},false),'Jack');
  assert.equal(cameraName({},null,true),'Mestre');
  assert.deepEqual(cameraPosition({x:900,y:-15},390,844,140,112),{x:242,y:8});
  assert.deepEqual(activeCameraMembers([{id:'old',updatedAt:100},{id:'live',updatedAt:99900},{id:'off',updatedAt:99900,online:false}],100000).map(row=>row.id),['live']);
  assert.equal(CAMERA_VIDEO.frameRate.max,20);
});

test('a single offer, candidate deduplication, track replacement and cleanup',async()=>{
  let instance,listener,unsubscribed=false;
  const published=[];
  class Peer{
    constructor(){instance=this;this.candidates=[];this.connectionState='new';}
    addTransceiver(){this.sender={replaceTrack:async track=>{this.track=track;},getParameters:()=>({encodings:[{}]}),setParameters:async params=>{this.params=params;}};return{sender:this.sender};}
    async createOffer(){return{type:'offer',sdp:'offer'};}
    async setLocalDescription(data){this.localDescription=data;}
    async setRemoteDescription(data){this.remoteDescription=data;}
    async addIceCandidate(candidate){assert.ok(this.remoteDescription);this.candidates.push(candidate);}
    close(){this.closed=true;}
  }
  const peer=createCameraPeer({localId:'a',remoteId:'b',iceServers:[],Peer,publish:async data=>published.push(data),subscribe:callback=>{listener=callback;return()=>{unsubscribed=true;};},onStream:()=>{},onState:()=>{}});
  await peer.ready;assert.equal(published[0].offer.sdp,'offer');
  const candidate={candidate:'candidate1'};
  listener({rightIce:[candidate]});listener({offer:published[0].offer,offerId:published[0].offerId,answerFor:published[0].offerId,answer:{type:'answer',sdp:'answer'},rightIce:[candidate,candidate]});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(instance.candidates.length,1);
  await peer.setTrack({kind:'video'});assert.equal(instance.params.encodings[0].maxBitrate,200000);
  await peer.setTrack(null);assert.equal(instance.track,null);
  peer.close();assert.ok(instance.closed&&unsubscribed);
  listener({answer:{type:'answer',sdp:'late'},rightIce:[{candidate:'late'}]});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(instance.remoteDescription.sdp,'answer');
});

test('answerer uses the offered transceiver so a camera activated later can send video',async()=>{
  let listener,instance;const published=[];
  class Peer{
    constructor(){instance=this;this.video={direction:'recvonly',receiver:{track:{kind:'video'}},sender:{replaceTrack:async track=>{this.track=track;}}};}
    addTransceiver(){throw new Error('Answerer must not create an unrelated transceiver');}
    getTransceivers(){return[this.video];}
    async setRemoteDescription(data){this.remoteDescription=data;}
    async createAnswer(){assert.equal(this.video.direction,'sendrecv');return{type:'answer',sdp:'two-way'};}
    async setLocalDescription(data){this.localDescription=data;}
    close(){this.closed=true;}
  }
  const peer=createCameraPeer({localId:'b',remoteId:'a',iceServers:[],Peer,publish:async data=>published.push(data),subscribe:callback=>{listener=callback;return()=>{};},onStream:()=>{},onState:()=>{}});
  await peer.setTrack({kind:'video',id:'optional-camera'});
  listener({offer:{type:'offer',sdp:'offer'}});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(published[0].answer.sdp,'two-way');assert.equal(instance.track.id,'optional-camera');
  await peer.setTrack(null);assert.equal(instance.track,null);peer.close();
});

test('pending membership timestamps preserve a live participant instead of hiding their tile',()=>{
  const data={name:'Ana',updatedAt:null};let options;
  const result=cameraMemberRows([{id:'session',data:value=>{options=value;return data;}}],[{id:'session',updatedAt:99999}]);
  assert.equal(options.serverTimestamps,'estimate');assert.equal(result[0].updatedAt,99999);
  assert.equal(activeCameraMembers(result,100000).length,1);
  const pending=cameraMemberRows([{id:'session',metadata:{hasPendingWrites:true},data:()=>({updatedAt:1000000})}],result);
  assert.equal(activeCameraMembers(pending,100000).length,1);
  assert.equal(pending[0].updatedAt,99999);
});

function recoveryFixture(initiator=true,delayedPublish=false){
  const events=[],published=[],timers=new Map();let callback,onError,instance,stops=0;
  const schedule=(work,delay)=>{const id={};timers.set(id,{work,delay});return id;},cancel=id=>timers.delete(id);
  class Peer{
    constructor(){instance=this;this.signalingState='stable';this.connectionState='new';this.iceConnectionState='new';this.candidates=[];this.offers=0;this.video={receiver:{track:{kind:'video'}},sender:{replaceTrack:async track=>{this.track=track;}}};}
    addTransceiver(){return this.video;}
    getTransceivers(){return [this.video];}
    async createOffer(){return{type:'offer',sdp:'a=ice-ufrag:own'+(++this.offers)+'\r\n'};}
    async createAnswer(){return{type:'answer',sdp:'a=ice-ufrag:other\r\n'};}
    async setLocalDescription(data){if(data.type==='rollback'){this.signalingState='stable';return;}this.localDescription=data;this.signalingState=data.type==='offer'?'have-local-offer':'stable';}
    async setRemoteDescription(data){this.remoteDescription=data;this.signalingState=data.type==='answer'?'stable':'have-remote-offer';}
    async addIceCandidate(candidate){if(candidate.candidate==='bad')throw Object.assign(Error('candidate unsupported'),{name:'OperationError'});this.candidates.push(candidate);}
    close(){this.closed=true;}
  }
  const peer=createCameraPeer({localId:initiator?'a':'b',remoteId:initiator?'b':'a',iceServers:[],Peer,schedule,cancel,publish:row=>{published.push(row);return delayedPublish?new Promise(()=>{}):Promise.resolve();},subscribe:(next,error)=>{callback=next;onError=error;return()=>stops++;},onStream:()=>{},onState:state=>events.push(state)});
  const drain=()=>new Promise(resolve=>setImmediate(resolve));
  return {peer,published,events,timers,instance:()=>instance,receive:(data,metadata)=>callback(data,metadata),failSignal:error=>onError(error),stops:()=>stops,drain,tick:async delay=>{const entry=[...timers].find(([,value])=>value.delay===delay);assert.ok(entry,'expected timer '+delay);timers.delete(entry[0]);entry[1].work();await drain();}};
}

test('one invalid route cannot block valid ICE candidates from the same snapshot',async()=>{
  const f=recoveryFixture();await f.peer.ready;const offer=f.published[0];
  f.receive({...offer,answerFor:offer.offerId,answer:{type:'answer',sdp:'a=ice-ufrag:remote\r\n'},rightIceFor:offer.offerId,rightIce:[{candidate:'bad'},{candidate:'valid',usernameFragment:'remote'},{candidate:'old',usernameFragment:'expired'}]});
  await f.drain();assert.deepEqual(f.instance().candidates.map(c=>c.candidate),['valid']);
  assert.ok(!f.events.includes('failed'));f.peer.close();assert.equal(f.timers.size,0);
});

test('failed ICE restarts automatically and stale answers/candidates cannot enter the new round',async()=>{
  const f=recoveryFixture();await f.peer.ready;const initial=f.published[0];
  f.receive({...initial,answerFor:initial.offerId,answer:{type:'answer',sdp:'a=ice-ufrag:remote1\r\n'}});await f.drain();
  await f.peer.setTrack({id:'camera',kind:'video'});f.instance().connectionState='failed';f.instance().iceConnectionState='failed';f.instance().oniceconnectionstatechange();
  await f.tick(800);const latest=f.published.findLast(row=>row.offerId);assert.notEqual(latest.offerId,initial.offerId);
  f.receive({...latest,answerFor:initial.offerId,answer:{type:'answer',sdp:'a=ice-ufrag:expired\r\n'},rightIceFor:initial.offerId,rightIce:[{candidate:'stale',usernameFragment:'expired'}]});await f.drain();
  assert.equal(f.instance().remoteDescription.sdp,'a=ice-ufrag:remote1\r\n');assert.equal(f.instance().candidates.length,0);
  f.receive({...latest,answerFor:latest.offerId,answer:{type:'answer',sdp:'a=ice-ufrag:remote2\r\n'},rightIceFor:latest.offerId,rightIce:[{candidate:'new',usernameFragment:'remote2'}]});await f.drain();
  assert.equal(f.instance().remoteDescription.sdp,'a=ice-ufrag:remote2\r\n');assert.equal(f.instance().track.id,'camera');assert.equal(f.instance().candidates[0].candidate,'new');f.peer.close();
});

test('answerer requests an ICE restart without leaving, and a broken signaling watch reattaches',async()=>{
  const f=recoveryFixture(false);await f.peer.setTrack({id:'camera'});
  f.receive({offerId:'round-1',offer:{type:'offer',sdp:'a=ice-ufrag:remote\r\n'}});await f.drain();
  assert.equal(f.published[0].answerFor,'round-1');f.instance().iceConnectionState='failed';f.instance().oniceconnectionstatechange();await f.tick(800);
  assert.equal(f.published.find(row=>row.restartRequest).restartRequest.forOffer,'round-1');
  f.failSignal({code:'unavailable'});await f.tick(1000);assert.equal(f.stops(),1);
  f.peer.close();assert.equal(f.stops(),2);assert.equal(f.timers.size,0);
});

test('automatic retries stop after three attempts and explicit resume can recover a changed network',async()=>{
  const f=recoveryFixture();await f.peer.ready;
  await f.tick(20000);await f.tick(800);await f.tick(20000);await f.tick(2500);await f.tick(20000);await f.tick(6000);await f.tick(20000);
  assert.equal(f.published.filter(row=>row.offer).length,4);assert.equal(f.events.at(-1),'failed');assert.equal(f.timers.size,0);
  f.peer.resume();await f.tick(0);assert.equal(f.published.filter(row=>row.offer).length,5);f.peer.close();
});

test('cached signaling cannot reset the retry budget for a repeatedly terminated listener',async()=>{
  const f=recoveryFixture();await f.peer.ready;
  for(const delay of [1000,2500,6000]){f.receive(f.published[0],{fromCache:true});await f.drain();f.failSignal({code:'unavailable'});await f.tick(delay);}
  f.receive(f.published[0],{fromCache:true});await f.drain();f.failSignal({code:'unavailable'});
  assert.equal(f.events.at(-1),'failed');assert.equal(f.timers.size,0);f.peer.close();
});

test('delayed network acknowledgements do not block local camera changes or remote answers',{timeout:1000},async()=>{
  const f=recoveryFixture(true,true);await f.peer.ready;
  await f.peer.setTrack({id:'ready-camera'});assert.equal(f.instance().track.id,'ready-camera');
  const initial=f.published[0];f.receive({...initial,answerFor:initial.offerId,answer:{type:'answer',sdp:'a=ice-ufrag:remote\r\n'},rightIceFor:initial.offerId,rightIce:[{candidate:'valid',usernameFragment:'remote'}]});await f.drain();
  assert.equal(f.instance().candidates.length,1);await f.peer.setTrack(null);assert.equal(f.instance().track,null);f.peer.close();
});
