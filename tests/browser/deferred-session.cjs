// Run against the isolated fixture server on 4179. Never uses campaign data.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/dinastia-chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 try{
  for(const width of [390,1280]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   const page=await context.newPage(),requests=[],errors=[];
   page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:4179/loading.html');
   await page.getByRole('heading',{name:'Quem atravessa o Véu?',exact:true}).waitFor();
   assert.equal(requests.some(url=>url.includes('/AuthenticatedSession')),false,'Login must not load the session');
   await page.evaluate(()=>localStorage.setItem('dinastia_access_v1',JSON.stringify({role:'player',sheetId:'necro'})));
   await page.reload();await page.locator('.ad-party').waitFor();await page.locator('.game3-root').waitFor();
   assert.ok(requests.some(url=>url.includes('/AuthenticatedSession')));
   assert.equal(requests.some(url=>url.includes('/MasterBattleConsole')),false,'Players do not load the master console');
   assert.equal(requests.some(url=>url.includes('dice-box-threejs')),false,'Physics remains on demand');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.getByTitle('Trocar usuário',{exact:true}).click();
   await page.getByRole('heading',{name:'Quem atravessa o Véu?',exact:true}).waitFor();
   assert.equal(await page.locator('.game3-root').count(),0);assert.deepEqual(errors,[]);
   await context.close();
  }
  console.log('Deferred session: login, session, logout, mobile/desktop and lazy master/dice imports passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
