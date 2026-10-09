// Isolated Firestore fixture only. No production campaign or camera access.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const url='http://127.0.0.1:4179/';
const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
(async()=>{
 const browser=await chromium.launch({executablePath:'/tmp/dinastia-chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote']});
 const errors=[];
 try{
  for(const master of [true,false]){
   const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
   page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
   await page.goto(url+'?map'+(master?'&master':''));
   await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=1600;c.height=900;const ctx=c.getContext('2d');ctx.fillStyle='#1c2933';ctx.fillRect(0,0,1600,900);
    const image=c.toDataURL();
    window.__testStore.set('battlemaps/test',{id:'test',nome:'Campo isolado',img:image});
    window.__testStore.set('config/battlemap_active',{activeId:'test'});
    window.__testStore.set('battlemap_tokens/test',{tokens:[{id:'t',nome:'Teste',tipo:'inimigo',x:50,y:50,size:70,hp:20,maxHp:20}]});
    for(let n=0;n<16;n++)window.__testStore.set('enemies/e'+n,{id:'e'+n,nome:'Inimigo '+n,hp:20,hp_max:20,perigo:'Médio'});
    window.__testStore.set('presence/remote-master',{role:'master',name:'Mestre',online:true,photo:image,updatedAt:Date.now()});
   });
   await page.locator('[data-token-id=t]').waitFor();
   await page.mouse.move(600,50);
   await page.waitForFunction(()=>document.querySelector('.grim-nav').getBoundingClientRect().width<80);
   assert.equal(await page.locator('.enemy-map-strip').count(),0);
   assert.equal(await page.locator('.g3-presence-avatar.master img').count(),0);
   assert.equal(await page.locator('.g3-presence-avatar.master b').first().textContent(),'M');
   assert.equal(await page.locator('.map-dock-trigger').count(),master?2:1);
   if(master){
    assert.equal(await page.locator('.battlemap-master-mark .master-sigil').textContent(),'M');
    assert.equal(await page.locator('.grim-avatar img').count(),0);
    await page.getByRole('button',{name:'Fichas dos inimigos',exact:true}).click();
    assert.equal(await page.locator('.map-sheet-picker-list>button').count(),16);
    await page.locator('.map-sheet-picker-list>button').first().click();
    assert.equal(await page.locator('.map-sheet-picker').count(),0);
    await page.locator('.enemy-floating-sheet').waitFor();
    await page.reload();
    await page.locator('[data-token-id=t]').waitFor();
    await page.mouse.move(600,50);
    await page.waitForFunction(()=>document.querySelector('.grim-nav').getBoundingClientRect().width<80);
    await page.getByRole('button',{name:'Fichas dos personagens',exact:true}).click();
    assert.equal(await page.locator('.map-sheet-picker-list>button').count(),1);
    await page.getByRole('button',{name:'Fechar lista de fichas'}).focus();await page.keyboard.press('Escape');
    assert.equal(await page.locator('.map-sheet-picker').count(),0);
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dinastia:adventure-panel',{detail:{panel:'director'}})));
    await page.getByText('Contexto da sessão',{exact:true}).waitFor();
    for(const name of ['Estado do mundo','Ambiente sincronizado','Soundscape rápido'])assert.equal(await page.getByText(name,{exact:true}).count(),0);
    await page.getByText('Cena inicial da sessão',{exact:true}).waitFor();
    await page.keyboard.press('Escape');
   }
   for(const width of [1280,390]){
    await page.setViewportSize({width,height:900});
    const entry=page.getByRole('button',{name:'Preencher tela completa',exact:true});
    await entry.scrollIntoViewIfNeeded();
    const dock=await page.locator('.map-sheet-dock').boundingBox();
    assert.ok(!overlaps(await entry.boundingBox(),dock),'Entry clears sheet dock at '+width);
    if(master)assert.equal(await entry.evaluate(e=>!!e.closest('.battlemap-viewport')),false);
    await entry.click();
    await page.waitForFunction(()=>document.documentElement.classList.contains('dinastia-map-fullscreen'));
    const exit=page.getByRole('button',{name:'Sair da tela cheia',exact:true});
    assert.ok(!overlaps(await exit.boundingBox(),await page.locator('.map-sheet-dock').boundingBox()),'Exit clears dock');
    assert.ok(!overlaps(await exit.boundingBox(),await page.locator('.battlemap-zoom-controls').boundingBox()),'Exit clears zoom');
    await exit.click();
    await page.waitForFunction(()=>!document.documentElement.classList.contains('dinastia-map-fullscreen'));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow');
   }
   await page.setViewportSize({width:1280,height:900});
   await page.screenshot({path:'/tmp/dinastia-map-'+(master?'master':'player')+'.png'});
   await context.close();
  }
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.goto(url+'?hud');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dinastia:adventure-panel',{detail:{panel:'abilities'}})));
  await page.locator('.g3-ability-heading').nth(1).click();
  const ability=page.locator('.g3-use-ability:not(:disabled)').first();await ability.waitFor();
  await ability.hover();
  assert.equal(await ability.evaluate(e=>getComputedStyle(e,'::after').animationName),'abilityContour');
  for(const [attribute,value] of [['data-quality','light'],['data-effects','reduced']]){
   await page.evaluate(([a,v])=>document.documentElement.setAttribute(a,v),[attribute,value]);
   assert.equal(await ability.evaluate(e=>getComputedStyle(e,'::after').animationName),'none');
   await page.evaluate(a=>document.documentElement.removeAttribute(a),attribute);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await ability.evaluate(e=>getComputedStyle(e,'::after').animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.screenshot({path:'/tmp/dinastia-ability-hover.png'});
  for(const gallery of ['characters','bestiary']){
   await page.goto(url+'?gallery='+gallery);
   await page.evaluate(()=>{
    const c=document.createElement('canvas');c.width=320;c.height=300;const ctx=c.getContext('2d');const gradient=ctx.createLinearGradient(0,0,320,300);gradient.addColorStop(0,'#53375d');gradient.addColorStop(1,'#0a141f');ctx.fillStyle=gradient;ctx.fillRect(0,0,320,300);
    for(let n=0;n<4;n++){
     window.__testStore.set('npcs/n'+n,{id:'n'+n,nome:'Personagem '+n,foto:c.toDataURL(),descricao:'Um viajante dos caminhos esquecidos. Sua história continua na companhia.'});
     window.__testStore.set('bestiario/b'+n,{id:'b'+n,nome:'Criatura '+n,nivel:12,tipo:'Guardião',nivelAmeaca:n===0?'Supremo':'Alto',foto:c.toDataURL(),descricao:'Uma presença antiga entre os salões da fortaleza.'});
    }
   });
   await page.locator('.codex-card').first().waitFor();
   assert.equal(await page.locator('.codex-card').count(),4);
   for(const width of [1280,390]){
    await page.setViewportSize({width,height:900});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:'/tmp/dinastia-'+gallery+'-'+width+'.png'});
   }
   await page.locator('.codex-card').first().focus();await page.keyboard.press('Enter');
   assert.ok(await page.getByText(gallery==='bestiary'?'Descrição & Comportamento':'Descrição',{exact:true}).count()>0);
  }
  assert.deepEqual(errors,[]);
  await context.close();
  console.log(JSON.stringify({passed:true,compactEnemies:16,masterIdentity:true,cinematicSections:true,desktopMobileFullscreen:true,abilityHoverAndReducedMotion:true,codexKeyboardAndLayout:true,errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
