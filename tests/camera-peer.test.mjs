import test from 'node:test';
import assert from 'node:assert/strict';
import {activeCameraMembers,cameraName,cameraPosition,createCameraPeer,CAMERA_VIDEO} from '../src/adventure/cameraPeer.mjs';

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
  listener({rightIce:[candidate]});listener({answer:{type:'answer',sdp:'answer'},rightIce:[candidate,candidate]});
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
