const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/tmp/dinastia-chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--allow-loopback-in-peer-connection','--force-webrtc-ip-handling-policy=default','--disable-background-timer-throttling','--disable-features=WebRtcHideLocalIpsWithMdns','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const context=await browser.newContext({viewport:{width:1280,height:900},permissions:['camera']});const errors=[];
 await context.addInitScript(()=>{
  window.__rtc=[];window.__iceRestarts=0;
  const Original=window.RTCPeerConnection;
  window.RTCPeerConnection=function(...args){
   const pc=new Original(...args);window.__rtc.push(pc);
   const offer=pc.createOffer.bind(pc);
   pc.createOffer=async options=>{if(options?.iceRestart){window.__iceRestarts++;if(pc.__forcedFailure){delete pc.connectionState;pc.__forcedFailure=false;}}return offer(options);};
   return pc;
  };
 });
 const pages=[];
 try{
  for(let i=0;i<7;i++){
   const page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',error=>errors.push(error.message));pages.push(page);
   await page.goto('http://127.0.0.1:4179/?cameras&name=Jogador'+i);
   await page.getByRole('button',{name:'Câmeras da mesa',exact:true}).click();
   await page.getByRole('button',{name:'Entrar nas câmeras',exact:true}).click();
   await page.getByRole('button',{name:'Câmeras da mesa',exact:true}).hover();
   await page.getByRole('button',{name:'Ativar minha câmera',exact:true}).click();
  }
  for(const page of pages)await page.waitForFunction(()=>document.querySelectorAll('video').length===7&&[...document.querySelectorAll('video')].every(video=>video.videoWidth>0&&video.readyState>=2),null,{timeout:45000});
  const connections=await Promise.all(pages.map(page=>page.evaluate(()=>window.__rtc.filter(pc=>pc.connectionState==='connected').length)));
  assert.deepEqual(connections,Array(7).fill(6));
  // Trigger a transient failure on an offerer, leaving membership/media intact.
  let affected;
  for(const page of pages){if(await page.evaluate(()=>window.__rtc.some(pc=>pc.localDescription?.type==='offer'))){affected=page;break;}}
  assert.ok(affected);
  await affected.evaluate(()=>{const pc=window.__rtc.find(pc=>pc.localDescription?.type==='offer');window.__recoveredPeer=pc;pc.__forcedFailure=true;Object.defineProperty(pc,'connectionState',{configurable:true,get:()=> 'failed'});pc.onconnectionstatechange();});
  await affected.waitForFunction(()=>window.__iceRestarts>0&&window.__recoveredPeer.connectionState==='connected',null,{timeout:15000});
  const before=await affected.evaluate(async()=>{let frames=0;(await window.__recoveredPeer.getStats()).forEach(row=>{if(row.type==='inbound-rtp'&&row.kind==='video')frames+=row.framesDecoded||0;});return frames;});
  await affected.waitForFunction(async prior=>{let frames=0;(await window.__recoveredPeer.getStats()).forEach(row=>{if(row.type==='inbound-rtp'&&row.kind==='video')frames+=row.framesDecoded||0;});return frames>prior;},before,{timeout:15000});
  for(const page of pages){assert.equal(await page.locator('.table-camera-tile').count(),7);assert.ok(await page.evaluate(()=>[...document.querySelectorAll('video')].every(video=>video.videoWidth>0)));}
  const idsBefore=await pages[0].evaluate(()=>JSON.parse(localStorage.getItem('dinastia-isolated-store')).filter(([key])=>key.startsWith('table_cameras/')).map(([key])=>key).sort());
  assert.equal(idsBefore.length,7);
  await pages[6].getByRole('button',{name:'Câmeras da mesa',exact:true}).hover();await pages[6].getByRole('button',{name:'Desligar minha câmera',exact:true}).click();
  for(const page of pages.slice(0,6))await page.waitForFunction(()=>document.querySelector('[aria-label="Vídeo de Jogador6"]')?.style.visibility==='hidden');
  await pages[6].getByRole('button',{name:'Câmeras da mesa',exact:true}).hover();await pages[6].getByRole('button',{name:'Ativar minha câmera',exact:true}).click();
  for(const page of pages)await page.waitForFunction(()=>[...document.querySelectorAll('video')].every(video=>video.videoWidth>0&&video.style.visibility==='visible'));
  const idsAfter=await pages[0].evaluate(()=>JSON.parse(localStorage.getItem('dinastia-isolated-store')).filter(([key])=>key.startsWith('table_cameras/')).map(([key])=>key).sort());assert.deepEqual(idsBefore,idsAfter);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,participants:7,peerConnections:21,visibleVideos:49,automaticIceRecovery:true,cameraToggleWithoutRejoin:true,errors}));
 }catch(error){for(const page of pages)console.log(JSON.stringify(await page.evaluate(()=>({videos:[...document.querySelectorAll('video')].map(v=>({label:v.getAttribute('aria-label'),width:v.videoWidth,ready:v.readyState})),peers:window.__rtc.map(pc=>({state:pc.connectionState,ice:pc.iceConnectionState,signaling:pc.signalingState})),issue:document.querySelector('.table-camera-controls')?.textContent}))));throw error;}
 finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
