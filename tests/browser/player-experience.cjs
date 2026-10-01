const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/tmp/dinastia-chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(6000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4179/?combat');
 await page.locator('.g3-hotbar').waitFor();
 assert.ok((await page.locator('.g3-hotbar kbd').count())>0);
 assert.ok((await page.locator('.g3-hotbar kbd').count())<=4);
 assert.equal(await page.locator('.player-dock button').count(),5);
 assert.equal(await page.locator('.g3-resource-orb').count(),2);
 await page.getByRole('button',{name:'Mais',exact:true}).click();
 await page.getByRole('button',{name:'Conforto e atalhos',exact:true}).click();
 await page.getByLabel('Tamanho do texto',{exact:true}).selectOption('large');
 await page.getByLabel('Efeitos visuais',{exact:true}).selectOption('reduced');
 await page.getByRole('slider',{name:'Volume de música'}).fill('25');
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.textSize),'large');
 await page.keyboard.press('Escape');
 await page.locator('.g3-right-drawer').waitFor({state:'detached'});
 await page.keyboard.press('1');await page.locator('.g3-target-backdrop').waitFor();
 await page.keyboard.press('Escape');
 await page.evaluate(()=>window.__testStore.set('config/combat_state',{initiative:[{id:'p_other',nome:'Outro jogador',type:'player'}],turnIdx:0,round:1}));
 await page.getByText('Aguarde seu turno',{exact:true}).first().waitFor();
 await page.keyboard.press('1');assert.equal(await page.locator('.g3-target-backdrop').count(),0);
 await page.getByRole('button',{name:'Habilidades',exact:true}).click();
 await page.locator('.g3-ability-heading').first().click();
 assert.equal(await page.getByRole('button',{name:'Aguarde seu turno',exact:true}).isDisabled(),true);
 await page.keyboard.press('Escape');
 const widths=[];for(const width of [360,390,430,768,1280]){
  await page.setViewportSize({width,height:844});
  widths.push(await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth})));
  await page.screenshot({path:'/tmp/dinastia-combat-'+width+'.png',fullPage:true});
 }
 assert.ok(widths.every(row=>row.scroll<=row.width+1),JSON.stringify(widths));
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,widths,errors,preferences:await page.evaluate(()=>localStorage.getItem('dinastia_player_preferences_v1'))}));
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
