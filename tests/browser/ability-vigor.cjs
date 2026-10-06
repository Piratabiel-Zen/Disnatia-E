const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/tmp/dinastia-chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 const errors=[];
 for(const custom of [false,true]){
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  const master=await context.newPage(),player=await context.newPage();
  for(const page of [master,player]){page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));}
  const url='http://127.0.0.1:4179/?abilities'+(custom?'&custom':'');
  await master.goto(url+'&master');await master.getByRole('button',{name:'Personagem de teste',exact:true}).click();
  await master.locator('.abilities-panel').getByRole('button',{name:/Habilidades/}).click();
  await player.goto(url);await player.getByRole('button',{name:'Personagem de teste',exact:true}).click();await player.locator('.abilities-panel').getByRole('button',{name:/Habilidades/}).click();
  assert.equal(await player.locator('.ability-edit-actions').count(),0);
  assert.equal(await master.getByRole('button',{name:'VC 8 bloqueado até o nível 23',exact:true}).isDisabled(),true);
  assert.equal(await master.locator('.ability-type-passiva').first().evaluate(e=>getComputedStyle(e).opacity),'0.55');
  assert.equal(await master.locator('.ability-type-especial').first().evaluate(e=>getComputedStyle(e,'::before').animationName),'abilityAuraRotate');
  await master.evaluate(()=>document.documentElement.dataset.quality='light');
  assert.equal(await master.locator('.ability-type-especial').first().evaluate(e=>getComputedStyle(e,'::before').animationName),'none');
  await master.evaluate(()=>delete document.documentElement.dataset.quality);
  await master.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await master.locator('.ability-type-especial').first().evaluate(e=>getComputedStyle(e,'::before').animationName),'none');
  await master.getByRole('button',{name:'Editar Raio de teste',exact:true}).click();
  const editor=master.locator('.custom-ability-editor');
  await editor.getByLabel('Nome da habilidade',{exact:true}).fill('Raio revisado');
  await editor.getByLabel('Descrição',{exact:true}).fill('Descrição revisada');
  await editor.getByLabel('Custo VC',{exact:true}).fill('3');
  await editor.getByLabel('Nível Mínimo',{exact:true}).fill('2');
  await editor.getByLabel('Cooldown / Rodadas',{exact:true}).fill('4 rodadas');
  await editor.getByLabel('Dano / Efeito',{exact:true}).fill('2D8');
  await editor.getByRole('button',{name:'Normal',exact:true}).click();
  await master.evaluate(()=>window.__failNextCustomWrite=true);
  await editor.getByRole('button',{name:'Salvar alterações',exact:true}).click();
  await master.getByRole('alert').getByText('Falha simulada de conexão').waitFor();
  assert.equal(await editor.getByLabel('Nome da habilidade',{exact:true}).inputValue(),'Raio revisado');
  await editor.getByRole('button',{name:'Salvar alterações',exact:true}).click();
  await player.getByText('Raio revisado',{exact:true}).waitFor();
  const saved=await player.evaluate(()=>({abilities:window.__testStore.get('config/customAbilities'),sheet:window.__testStore.get('sheets/necro')}));
  const skill=saved.abilities.necro.find(a=>a.id==='skill-1');
  assert.equal(saved.abilities.necro.length,3);assert.equal(skill.nome,'Raio revisado');assert.equal(skill.custo,3);assert.equal(skill.req,2);assert.equal(skill.cooldown,'4 rodadas');assert.equal(skill.dano,'2D8');assert.equal(skill.descricao,'Descrição revisada');assert.equal(skill.tipoHab,'normal');assert.equal(skill.lore,'Preservar');assert.equal(saved.sheet.cooldowns['skill-1'],2);assert.equal(saved.abilities.other[0].nome,'Não alterar');
  await master.getByRole('button',{name:'Editar Raio revisado',exact:true}).click();await editor.getByLabel('Nome da habilidade',{exact:true}).fill('Cancelado');await editor.getByRole('button',{name:'Cancelar edição',exact:true}).click();assert.equal(await master.getByText('Cancelado',{exact:true}).count(),0);
  await master.getByRole('button',{name:'Excluir Golpe de teste',exact:true}).click();await player.getByText('Golpe de teste',{exact:true}).waitFor({state:'detached'});
  await master.evaluate(()=>window.__testStore.set('sheets/necro',{...window.__testStore.get('sheets/necro'),nivel:23}));
  await master.getByRole('button',{name:'Definir 8 VC',exact:true}).click();
  await master.waitForFunction(()=>window.__testStore.get('sheets/necro').vigos===8);
  const caps=[];
  for(const nivel of [22,23]){
   caps.push(await master.evaluate(async nivel=>{window.__testStore.set('sheets/necro',{...window.__testStore.get('sheets/necro'),nivel,vigos:6});const result=await window.__roundAutomation({initiative:[{id:'p_necro',type:'player',nome:'Teste'}],round:nivel,combatKey:'isolated-level-test'});return {nivel,vc:window.__testStore.get('sheets/necro').vigos,applied:result.applied};},nivel));
  }
  assert.deepEqual(caps,[{nivel:22,vc:7,applied:true},{nivel:23,vc:8,applied:true}]);
  await master.setViewportSize({width:390,height:844});
  await master.getByRole('button',{name:/Combate/}).first().click();
  await master.locator('.abilities-panel').getByRole('button',{name:/Habilidades/}).click();
  await master.getByRole('button',{name:'Editar Raio revisado',exact:true}).click();
  assert.equal(await editor.getByLabel('Nome da habilidade',{exact:true}).inputValue(),'Raio revisado');
  assert.ok(await master.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await master.screenshot({path:'/tmp/ability-vigor-'+(custom?'custom':'standard')+'.png',fullPage:true});
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,standardAndCustom:true,masterEdit:true,playerReadOnly:true,liveSync:true,level23:true,roundRecovery:true,mobile:true,errors}));
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
