const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {analyse}=require('./png.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,
   args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-zygote']});
 const page=await browser.newPage({viewport:{width:1000,height:700}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4179/globe.html');
 await page.locator('.globo-canvas').waitFor();
 await page.waitForTimeout(900);

 // O planeta desenha de fato. Um canvas WebGL não pode ser lido de volta sem
 // preserveDrawingBuffer, então a conferência é feita sobre a tela capturada.
 const shot=analyse(await page.locator('.globo-canvas').screenshot());
 assert.ok(shot.lit>0.08,`o globo parece vazio (${(shot.lit*100).toFixed(1)}% aceso)`);
 assert.ok(shot.colors>6,`o globo saiu sem textura (${shot.colors} cores)`);

 // Pins do lado visível aparecem; os do outro lado somem sozinhos.
 const visible=()=>page.evaluate(()=>[...document.querySelectorAll('.globo-pin')]
   .filter(node=>node.style.opacity==='1').map(node=>node.textContent));
 const first=await visible();
 assert.ok(first.length>0,'nenhum pin visível no globo');
 assert.ok(first.length<4,'todos os pins visíveis ao mesmo tempo: o lado oculto não está sendo escondido');

 // O local desconhecido nunca revela o nome.
 const unknown=await page.locator('.globo-pin.is-unknown').first();
 assert.equal((await unknown.textContent()).includes('Oculto'),false,'um local desconhecido mostrou o nome');

 // Arrastar gira o planeta: o pin acompanha a superfície.
 const box=await page.locator('.globo-canvas').boundingBox();
 const centro=page.locator('.globo-pin').filter({hasText:'Centro'}).first();
 const before=await centro.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width/2+200,box.y+box.height/2,{steps:12});
 await page.mouse.up();
 await page.waitForTimeout(600);
 const after=await centro.boundingBox();
 assert.ok(Math.abs(after.x-before.x)>40,`arrastar não girou o planeta (${before.x} -> ${after.x})`);

 // Girar até o outro lado esconde o pin que estava de frente.
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width/2+420,box.y+box.height/2,{steps:16});
 await page.mouse.up();
 await page.waitForTimeout(600);
 assert.ok(!(await visible()).includes('◆Centro'),'o pin continuou visível do outro lado do planeta');

 // E voltando, ele reaparece.
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width/2-620,box.y+box.height/2,{steps:20});
 await page.mouse.up();
 await page.waitForTimeout(600);
 assert.ok((await visible()).includes('◆Centro'),'o pin não voltou ao girar de volta');

 // Clicar num pin seleciona aquele local.
 const target=page.locator('.globo-pin').filter({hasText:'Centro'});
 if(await target.count()){
   await target.first().click({force:true});
   await page.waitForTimeout(200);
   assert.equal(await page.locator('#selected').textContent(),'centro','o clique no pin não selecionou');
 }

 // No modo de marcação, clicar no planeta devolve uma posição válida.
 await page.locator('#toggle-placing').click();
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await page.waitForTimeout(200);
 const placed=await page.locator('#placed').textContent();
 assert.ok(placed,'clicar no globo não marcou posição');
 const [px,py]=placed.split(',').map(Number);
 assert.ok(px>=0&&px<=100&&py>=0&&py<=100,`posição fora do mapa: ${placed}`);

 // Ao sair do mapa, o globo devolve o contexto de vídeo.
 await page.locator('#unmount').click();
 await page.waitForTimeout(400);
 assert.equal(await page.locator('.globo-canvas').count(),0,'o canvas continuou na página');

 assert.deepEqual(errors,[],'erros de runtime no globo');
 await browser.close();
 console.log('globo: ok');
})();
