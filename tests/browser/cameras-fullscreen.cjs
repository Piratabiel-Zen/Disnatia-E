const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/tmp/dinastia-chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--allow-loopback-in-peer-connection','--force-webrtc-ip-handling-policy=default','--enable-features=NetworkServiceInProcess2','--disable-background-timer-throttling','--disable-features=WebRtcHideLocalIpsWithMdns','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({viewport:{width:1280,height:900},permissions:['camera']});
 await context.addInitScript(()=>{window.__getMediaCount=0;window.__capturedTracks=[];const originalGetMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=(...args)=>{window.__getMediaCount++;return originalGetMedia(...args).then(stream=>{window.__capturedTracks.push(...stream.getTracks());return stream;});};window.__rtc=[];const Original=window.RTCPeerConnection;window.RTCPeerConnection=function(...args){const pc=new Original(...args);window.__rtc.push(pc);for(const key of ['setLocalDescription','setRemoteDescription','addIceCandidate']){const original=pc[key].bind(pc);pc[key]=async(...values)=>{try{return await original(...values);}catch(error){console.error('RTC '+key+': '+error.message);throw error;}};}return pc;};});
 const first=await context.newPage(),second=await context.newPage(),errors=[];
 first.on('console',message=>{if(message.type()==='error')console.log('browser:',message.text());});second.on('console',message=>{if(message.type()==='error')console.log('browser:',message.text());});
 for(const page of [first,second]){page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));}
 await first.goto('http://127.0.0.1:4179/?map&master');
 await first.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=600;canvas.getContext('2d').fillStyle='#384c65';canvas.getContext('2d').fillRect(0,0,1600,600);
  window.__testStore.set('battlemaps/m',{id:'m',nome:'Mapa isolado',img:canvas.toDataURL()});
  window.__testStore.set('config/battlemap_active',{activeId:'m'});
  window.__testStore.set('battlemap_tokens/m',{tokens:[{id:'enemy',nome:'Inimigo',tipo:'inimigo',x:35,y:40,size:70,hp:10,maxHp:10}]});
 });
 await first.locator('[data-token-id=enemy]').waitFor();
 assert.equal(await first.evaluate(()=>(window.__writes||[]).filter(key=>key.startsWith('table_camera')).length),0);
 await first.mouse.move(600,50);await first.waitForFunction(()=>document.querySelector('.grim-nav').getBoundingClientRect().width<80);await first.getByRole('button',{name:'Preencher tela completa',exact:true}).click();
 await first.waitForFunction(()=>document.fullscreenElement&&document.documentElement.classList.contains('dinastia-map-fullscreen'));
 const rect=await first.locator('.battlemap-viewport').boundingBox();assert.deepEqual(rect,{x:0,y:0,width:1280,height:900});
 const image=await first.locator('img[alt="mapa de batalha"]').boundingBox();assert.ok(image.width<=1281&&image.height<=901);assert.ok(image.height<900);
 assert.equal(await first.locator('[data-token-id=enemy]').count(),1);
 await first.getByRole('button',{name:'Sair da tela cheia',exact:true}).click();
 await first.waitForFunction(()=>!document.fullscreenElement&&!document.documentElement.classList.contains('dinastia-map-fullscreen'));
 // Unsupported native fullscreen still expands safely and Escape restores the layout.
 await first.evaluate(()=>{document.documentElement.requestFullscreen=undefined;document.documentElement.webkitRequestFullscreen=undefined;});
 await first.getByRole('button',{name:'Preencher tela completa',exact:true}).click();await first.keyboard.press('Escape');
 assert.equal(await first.evaluate(()=>document.documentElement.classList.contains('dinastia-map-fullscreen')),false);
 await second.goto('http://127.0.0.1:4179/?map');
 for(const page of [first,second]){await page.getByRole('button',{name:'Câmeras da mesa',exact:true}).click();await page.getByRole('button',{name:'Entrar nas câmeras',exact:true}).click();}
 await first.getByRole('button',{name:'Ativar minha câmera',exact:true}).waitFor();
 assert.equal(await first.evaluate(()=>window.__getMediaCount),0);
 for(const page of [first,second])await page.getByRole('button',{name:'Ativar minha câmera',exact:true}).click();
 try{await first.waitForFunction(()=>document.querySelector('[aria-label="Vídeo de Necromante"]')?.videoWidth>0,{},{timeout:7000});}catch(error){for(const page of [first,second])console.log(JSON.stringify(await page.evaluate(async()=>({peers:await Promise.all(window.__rtc.map(async pc=>({connection:pc.connectionState,ice:pc.iceConnectionState,signaling:pc.signalingState,local:!!pc.localDescription,remote:!!pc.remoteDescription,gather:pc.iceGatheringState,localMedia:pc.localDescription?.sdp.match(/a=(sendrecv|recvonly|inactive|sendonly)|m=video [^ ]+/g),remoteMedia:pc.remoteDescription?.sdp.match(/a=(sendrecv|recvonly|inactive|sendonly)|m=video [^ ]+/g),candidates:(pc.localDescription?.sdp.match(/a=candidate/g)||[]).length,stats:[...await pc.getStats()].filter(([,s])=>s.type==='outbound-rtp'||s.type==='inbound-rtp').map(([,s])=>({type:s.type,frames:s.framesEncoded||s.framesDecoded,bytes:s.bytesSent||s.bytesReceived}))}))),videos:[...document.querySelectorAll('video')].map(v=>({label:v.getAttribute('aria-label'),width:v.videoWidth,stream:!!v.srcObject,tracks:v.srcObject?.getTracks().map(t=>({state:t.readyState,enabled:t.enabled,muted:t.muted}))})),signals:JSON.parse(localStorage.getItem('dinastia-isolated-store')||'[]').filter(([key])=>key.startsWith('table_camera_calls/')).map(([key,value])=>({key,offer:!!value.offer,answer:!!value.answer,left:value.leftIce?.length,right:value.rightIce?.length})),text:document.querySelector('.table-camera-controls')?.textContent})),null,2));await first.screenshot({path:'/tmp/dinastia-camera-failure.png'});throw error;}
 await second.waitForFunction(()=>document.querySelector('[aria-label="Vídeo de Mestre"]')?.videoWidth>0,{},{timeout:7000});
 // Moving a camera is a local preference, with pointer and keyboard controls.
 const handle=first.getByRole('button',{name:'Mover câmera de Necromante',exact:true});const box=await handle.boundingBox();
 await first.mouse.move(box.x+30,box.y+12);await first.mouse.down();await first.mouse.move(box.x+260,box.y-90,{steps:8});await first.mouse.up();
 await handle.focus();await first.keyboard.press('ArrowRight');
 const moved=await first.locator('[aria-label="Câmera de Necromante"]').boundingBox();assert.ok(moved.x>100);
 await first.screenshot({path:'/tmp/dinastia-table-cameras.png'});
 await second.getByRole('button',{name:'Desligar minha câmera',exact:true}).click();
 await first.waitForFunction(()=>document.querySelector('[aria-label="Câmera de Necromante"] video').style.visibility==='hidden');
 for(const width of [390,768,1280]){await first.setViewportSize({width,height:900});assert.ok(await first.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await second.getByRole('button',{name:'Sair das câmeras',exact:true}).click();await first.locator('[aria-label="Câmera de Necromante"]').waitFor({state:'detached'});
 const tracks=await first.evaluate(()=>[...document.querySelectorAll('video')].flatMap(video=>video.srcObject?.getTracks()||[]).map(track=>track.readyState));assert.ok(tracks.includes('live'));
 await first.getByRole('button',{name:'Desligar minha câmera',exact:true}).click();
 await first.evaluate(()=>{navigator.mediaDevices.getUserMedia=()=>new Promise((resolve,reject)=>{window.__rejectPendingCamera=()=>reject(Object.assign(new Error('blocked'),{name:'NotAllowedError'}));});});
 await first.getByRole('button',{name:'Ativar minha câmera',exact:true}).click();
 await first.getByRole('button',{name:'Sair das câmeras',exact:true}).click();
 await first.getByRole('button',{name:'Entrar nas câmeras',exact:true}).click();
 await first.getByRole('button',{name:'Ativar minha câmera',exact:true}).waitFor();
 await first.evaluate(()=>window.__rejectPendingCamera());
 assert.equal(await first.locator('.table-camera-controls [role=alert]').count(),0);
 await first.getByRole('button',{name:'Fechar câmeras',exact:true}).click();assert.equal(await first.locator('.table-camera-tile').count(),0);
 assert.ok(await first.evaluate(()=>window.__capturedTracks.every(track=>track.readyState==='ended')));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,realWebRTCWithSyntheticVideo:true,fullscreen:true,errors}));await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
