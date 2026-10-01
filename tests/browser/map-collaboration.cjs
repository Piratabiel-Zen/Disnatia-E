const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/tmp/dinastia-chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 const first=await context.newPage(),second=await context.newPage(),errors=[];
 for(const p of [first,second]){p.setDefaultTimeout(8000);p.on('pageerror',e=>errors.push(e.message));}
 await first.goto('http://127.0.0.1:4179/?map&master');
 await first.evaluate(()=>{
  const c=document.createElement('canvas');c.width=1000;c.height=700;c.getContext('2d').fillRect(0,0,1000,700);
  window.__testStore.set('battlemaps/m',{id:'m',nome:'Mapa isolado',img:c.toDataURL('image/png')});
  window.__testStore.set('config/battlemap_active',{activeId:'m'});
  window.__testStore.set('battlemap_tokens/m',{tokens:[{id:'enemy',nome:'Inimigo',tipo:'inimigo',x:35,y:40,size:70,hp:10,maxHp:10},{id:'enemy2',nome:'Outro',tipo:'inimigo',x:65,y:60,size:70,hp:10,maxHp:10}]});
 });
 await first.locator('[data-token-id="enemy"]').waitFor();
 await second.goto('http://127.0.0.1:4179/?map');await second.locator('[data-token-id="enemy"]').waitFor();
 const token=first.locator('[data-token-id="enemy"]'),box=await token.boundingBox();
 await first.mouse.move(box.x+box.width/2,box.y+20);await first.mouse.down();
 await first.waitForFunction(()=>!!window.__testStore.get('battlemap_live_positions/m_enemy_lease'));
 await second.getByText('Mestre movimentando',{exact:true}).waitFor();
 const other=second.locator('[data-token-id="enemy"]'),otherBox=await other.boundingBox();
 await second.mouse.move(otherBox.x+otherBox.width/2,otherBox.y+20);await second.mouse.down();await second.mouse.up();
 await first.mouse.move(box.x+box.width/2+120,box.y+85,{steps:12});
 await second.waitForFunction(()=>parseFloat(document.querySelector('[data-token-id="enemy"]').style.left)>40);
 await first.mouse.up();
 await second.getByText('Mestre movimentando',{exact:true}).waitFor({state:'detached'});
 await second.waitForFunction(()=>!!window.__testStore.get('battlemap_tokens/token_v2:m:enemy'));
 const positions=await Promise.all([first,second].map(p=>p.locator('[data-token-id="enemy"]').evaluate(node=>({x:node.style.left,y:node.style.top}))));
 assert.deepEqual(positions[0],positions[1]);
 assert.equal(await second.locator('[data-token-id]').count(),2);
 await second.screenshot({path:'/tmp/dinastia-shared-map.png'});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,positions,tokenCount:2,errors}));await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
