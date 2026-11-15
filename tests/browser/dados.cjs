const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,
   args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote']});
 const page=await browser.newPage({viewport:{width:900,height:700}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4179/dados.html');
 const pad=page.locator('.dice-throw-pad');
 await pad.waitFor();
 const box=await pad.boundingBox();
 const cx=box.x+box.width/2, cy=box.y+box.height/2;

 // Um clique simples ainda rola o dado, sem virar arremesso.
 await pad.click();
 assert.equal(await page.locator('#cliques').textContent(),'1','o clique simples parou de funcionar');
 assert.equal(await page.locator('#gesto').textContent(),'','um clique virou arremesso');

 // Arremesso para a direita e para cima.
 await page.mouse.move(cx,cy);
 await page.mouse.down();
 for(let i=1;i<=6;i++){await page.mouse.move(cx+i*22,cy-i*9);await page.waitForTimeout(12);}
 await page.mouse.up();
 const direita=(await page.locator('#gesto').textContent()).split(',').map(Number);
 assert.ok(direita[0]>0.3,`o arremesso para a direita não registrou (x=${direita[0]})`);
 assert.ok(direita[1]>0,`a tela cresce para baixo e a mesa para cima: y deveria ser positivo (y=${direita[1]})`);
 assert.ok(direita[2]>=0.45&&direita[2]<=2.2,`força fora dos limites (${direita[2]})`);

 // Arremesso para a esquerda: o sinal acompanha.
 await page.mouse.move(cx,cy);
 await page.mouse.down();
 for(let i=1;i<=6;i++){await page.mouse.move(cx-i*22,cy+i*9);await page.waitForTimeout(12);}
 await page.mouse.up();
 const esquerda=(await page.locator('#gesto').textContent()).split(',').map(Number);
 assert.ok(esquerda[0]<-0.3,`o arremesso para a esquerda não registrou (x=${esquerda[0]})`);
 assert.ok(esquerda[1]<0,`y deveria ser negativo ao jogar para baixo (y=${esquerda[1]})`);

 // Um lance rápido tem mais força que um lento, na mesma distância.
 const lance=async espera=>{
   await page.mouse.move(cx,cy); await page.mouse.down();
   for(let i=1;i<=6;i++){await page.mouse.move(cx+i*25,cy);await page.waitForTimeout(espera);}
   await page.mouse.up();
   return Number((await page.locator('#gesto').textContent()).split(',')[2]);
 };
 const rapido=await lance(5);
 const lento=await lance(90);
 assert.ok(rapido>lento,`um lance rápido (${rapido}) deveria ter mais força que um lento (${lento})`);

 // Um movimento mínimo é toque, não arremesso: o dado volta ao lugar.
 await page.mouse.move(cx,cy); await page.mouse.down();
 await page.mouse.move(cx+4,cy+2); await page.mouse.up();
 assert.equal(await page.locator('#puxada').textContent(),'0.0,0.0','o dado não voltou ao lugar');

 assert.deepEqual(errors,[],'erros de runtime no arremesso');
 await browser.close();
 console.log('arremesso: ok');
})();
