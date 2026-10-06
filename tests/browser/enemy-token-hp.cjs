const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/tmp/dinastia-chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 const context=await browser.newContext({viewport:{width:1280,height:900}}),master=await context.newPage(),player=await context.newPage(),errors=[];
 for(const page of [master,player]){page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));}
 await master.goto('http://127.0.0.1:4179/?map&master');
 await master.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=700;canvas.getContext('2d').fillRect(0,0,1000,700);
  window.__testStore.set('enemies/goblin',{id:'goblin',nome:'Goblin',hp:25,hp_max:30,hp_bonus:5});
  window.__testStore.set('battlemaps/m',{id:'m',nome:'Mapa isolado',img:canvas.toDataURL()});
  window.__testStore.set('battlemap_tokens/m',{tokens:Array.from({length:6},(_,i)=>({id:'enemy'+i,nome:'Goblin '+i,tipo:'inimigo',enemyId:'goblin',x:15+(i%3)*25,y:30+Math.floor(i/3)*30,size:50,hp:0,maxHp:0}))});
  window.__testStore.set('config/battlemap_active',{activeId:'m'});
 });
 await master.waitForFunction(()=>Array.from({length:6},(_,i)=>window.__testStore.get('battlemap_tokens/token_v2:m:enemy'+i)?.token.hpMode).every(mode=>mode==='individual'));
 await player.goto('http://127.0.0.1:4179/?map');await player.locator('[data-token-id=enemy0]').waitFor();
 await master.mouse.move(600,50);await master.waitForFunction(()=>document.querySelector('.grim-nav').getBoundingClientRect().width<80);
 await master.locator('[data-token-id=enemy0]').click();
 const panel=master.getByRole('region',{name:'Controle do token Goblin 0',exact:true});
 await panel.getByLabel('HP',{exact:true}).fill('11');
 await master.waitForFunction(()=>window.__testStore.get('battlemap_tokens/token_v2:m:enemy0')?.token.hp===11);
 await player.waitForFunction(()=>window.__testStore.get('battlemap_tokens/token_v2:m:enemy0')?.token.hp===11);
 const health=await player.evaluate(()=>Array.from({length:6},(_,i)=>window.__testStore.get('battlemap_tokens/token_v2:m:enemy'+i).token.hp));assert.deepEqual(health,[11,25,25,25,25,25]);
 await panel.getByLabel('HP Máx.',{exact:true}).fill('45');
 for(let i=0;i<5;i++)await panel.getByRole('button',{name:'+1',exact:true}).click();
 await master.waitForFunction(()=>window.__testStore.get('battlemap_tokens/token_v2:m:enemy0')?.token.hp===16);
 await panel.getByRole('button',{name:'Desfazer última mudança de HP',exact:false}).click();
 await master.waitForFunction(()=>window.__testStore.get('battlemap_tokens/token_v2:m:enemy0')?.token.hp===15);
 assert.deepEqual(await master.evaluate(()=>window.__testStore.get('enemies/goblin')),{id:'goblin',nome:'Goblin',hp:25,hp_max:30,hp_bonus:5});
 await master.evaluate(()=>window.__testStore.set('enemies/goblin',{id:'goblin',nome:'Goblin',hp:1,hp_max:2,hp_bonus:0}));
 await master.reload();await master.locator('[data-token-id=enemy0]').waitFor();
 const saved=await master.evaluate(()=>Array.from({length:6},(_,i)=>window.__testStore.get('battlemap_tokens/token_v2:m:enemy'+i).token));
 assert.deepEqual(saved.map(t=>t.hp),[15,25,25,25,25,25]);assert.equal(saved[0].maxHp,45);assert.equal(saved[1].maxHp,35);
 assert.equal(await player.locator('[data-token-id]').count(),6);
 assert.equal(await player.getByRole('region',{name:/Controle do token/}).count(),0);
 await master.screenshot({path:'/tmp/dinastia-individual-enemy-hp.png'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,independentEnemyTokens:6,health:saved.map(t=>t.hp),reload:true,errors}));await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
