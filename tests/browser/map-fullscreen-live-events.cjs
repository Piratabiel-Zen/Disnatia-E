const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({executablePath:'/tmp/dinastia-chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote']});
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
  await context.addInitScript(()=>{window.__fixtureCachedStart=true;});
  await page.goto('http://127.0.0.1:4179/?map&master&live-events');
  await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=1600;c.height=600;c.getContext('2d').fillRect(0,0,1600,600);
    window.__testStore.set('battlemaps/m',{id:'m',nome:'Mapa isolado',img:c.toDataURL()});
    window.__testStore.set('battlemap_tokens/m',{tokens:[{id:'enemy',nome:'Inimigo',tipo:'inimigo',x:50,y:50,size:70,hp:10,maxHp:10}]});
    window.__testStore.set('config/battlemap_active',{activeId:'m'});
    window.__testStore.set('config/combat_action',{id:'old',abilityName:'Lança defensiva antiga',ts:Date.now()+86400000});
    window.__testStore.set('cosmic_events/old',{id:'old',type:'message',text:'Histórico antigo',ts:Date.now()+86400000});
  });
  await page.reload();await page.locator('[data-token-id=enemy]').waitFor();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('.combat-action-pulse').count(),0);
  assert.equal(await page.locator('.realtime-cosmic-event').count(),0);
  const dimensions=()=>page.evaluate(()=>{
    const map=document.querySelector('img[alt="mapa de batalha"]').getBoundingClientRect();
    const node=document.querySelector('[data-token-id=enemy]');
    const artwork=[...node.children].find(child=>child.style.width&&child.style.height===child.style.width);
    return {ratio:artwork.getBoundingClientRect().width/map.width,mapWidth:map.width,tokenWidth:artwork.getBoundingClientRect().width};
  });
  await page.mouse.move(600,50);
  await page.waitForFunction(()=>document.querySelector('.grim-nav').getBoundingClientRect().width<80);
  const baseline=await dimensions();
  assert.equal(await page.getByRole('button',{name:'Preencher tela completa',exact:true}).evaluate(e=>e.closest('.battlemap-viewport')===null),true);
  for(const fallback of [false,true]){
    if(fallback)await page.evaluate(()=>{document.documentElement.requestFullscreen=undefined;document.documentElement.webkitRequestFullscreen=undefined;});
    await page.getByRole('button',{name:'Preencher tela completa',exact:true}).click();
    await page.waitForFunction(()=>document.documentElement.classList.contains('dinastia-map-fullscreen'));
    await page.waitForTimeout(200);
    const full=await dimensions();assert.ok(Math.abs(full.ratio-baseline.ratio)<0.00005,JSON.stringify({baseline,full}));
    assert.ok(full.mapWidth>baseline.mapWidth);
    await page.getByRole('button',{name:'Sair da tela cheia',exact:true}).click();
    await page.waitForFunction(()=>!document.documentElement.classList.contains('dinastia-map-fullscreen'));
    await page.waitForTimeout(150);
    assert.ok(Math.abs((await dimensions()).ratio-baseline.ratio)<0.00005);
  }
  await page.locator('[data-token-id=enemy]').click();
  for(const name of ['-8 HP','Sangrando','Crítico!','Esquiva!'])assert.equal(await page.getByRole('button',{name,exact:true}).count(),0);
  await page.evaluate(()=>{
    window.__testStore.set('config/combat_action',{id:'new',abilityName:'Ação nova ao vivo',color:'#a855f7',ts:0});
    window.__testStore.set('cosmic_events/new',{id:'new',type:'message',text:'Evento novo ao vivo',ts:0});
  });
  await page.locator('.combat-action-pulse strong').filter({hasText:'Ação nova ao vivo'}).waitFor();
  await page.locator('.realtime-cosmic-event strong').filter({hasText:'Evento novo ao vivo'}).waitFor();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,fullscreenProportion:true,nativeAndFallback:true,masterButtonOutsideMap:true,cachedHistorySuppressed:true,liveActionsReceived:true,errors}));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
