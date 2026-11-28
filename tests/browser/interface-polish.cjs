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
    window.__testStore.set('sheets/necro',{id:'necro',nome:'Kenai de teste',classe:'fogo',hp:18,hp_max:20});
    window.__testStore.set('battlemap_tokens/test',{tokens:[
      {id:'t',nome:'Inimigo oculto',tipo:'inimigo',x:50,y:50,size:70,hp:20,maxHp:20},
      {id:'own',nome:'Kenai',tipo:'jogador',sheetId:'necro',x:30,y:50,size:70,hp:18,maxHp:20}
    ]});
    for(let n=0;n<16;n++)window.__testStore.set('enemies/e'+n,{id:'e'+n,nome:'Inimigo '+n,hp:20,hp_max:20,perigo:'Médio'});
   });
   await page.locator('[data-token-id=t]').waitFor();
   await page.mouse.move(600,50);
   await page.waitForFunction(()=>document.querySelector('.grim-nav').getBoundingClientRect().width<80);
   assert.equal(await page.locator('.enemy-map-strip').count(),0);
   const enemyTokenText=await page.locator('[data-token-id="t"]').textContent();
   const ownTokenText=await page.locator('[data-token-id="own"]').textContent();
   if(master){assert.match(enemyTokenText,/20\/20/);assert.match(ownTokenText,/18\/20/);}
   else {assert.doesNotMatch(enemyTokenText,/20\/20/);assert.match(ownTokenText,/18\/20/);}
   assert.equal(await page.locator('.g3-presence').count(),0);
   /* Contar botões não dizia QUAIS botões: o dock ganhou o de familiares e
      o número mudou sem que nada tivesse quebrado. Agora o teste nomeia
      cada um, e passa a falhar só quando algum de fato desaparece. */
   const docaEsperada=master?['Fichas dos personagens','Familiares','Fichas dos inimigos']:['Minha ficha','Familiares'];
   for(const nome of docaEsperada)
    assert.equal(await page.locator('.map-dock-trigger[aria-label="'+nome+'"]').count(),1,'falta o botão '+nome);
   assert.equal(await page.locator('.map-dock-trigger').count(),docaEsperada.length);
   if(master){
    /* O modo de combate saiu da mesa inteira a pedido do mestre, e com ele
       o resumo de participantes (`.mbc-*`). O que este teste guardava era o
       estado ZERADO da seleção; não há mais seleção. Em vez de afirmar o
       sumiço num lugar só, o teste agora cobra que nada do combate apareça. */
    for(const resto of ['.mbc-setup-summary','.mbc-picker-col','.combat-round-bar'])
     assert.equal(await page.locator(resto).count(),0,'o modo de combate voltou: '+resto);
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
  /* O modo de qualidade mexe em cenografia, nunca na resposta ao jogador:
     o token respira e a habilidade responde ao mouse igual no celular, no
     notebook e no desktop (tests/paridade-animacoes.test.mjs, escrita
     depois que o jogador filmou a tela). Este teste cobrava o contrário,
     de antes dessa regra. Quem desliga de fato é a escolha do jogador:
     Animações → Reduzidas (data-effects) ou data-motion. */
  for(const [attribute,value] of [['data-effects','reduced'],['data-effects','subtle']]){
   await page.evaluate(([a,v])=>document.documentElement.setAttribute(a,v),[attribute,value]);
   assert.equal(await ability.evaluate(e=>getComputedStyle(e,'::after').animationName),'none');
   await page.evaluate(a=>document.documentElement.removeAttribute(a),attribute);
  }
  /* O projeto NAO le `prefers-reduced-motion` no CSS — e proibido em
     regra, justamente para que a preferencia do jogador possa discordar do
     sistema. Quem traduz a media query e o `movimento.mjs`, escrevendo
     `data-motion` na raiz, e so quando o jogador escolhe "seguir o
     sistema". Emular a media query aqui testava um caminho que foi
     removido de proposito; o teste agora escreve o sinal de verdade. */
  await page.evaluate(()=>document.documentElement.dataset.motion='reduced');
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
