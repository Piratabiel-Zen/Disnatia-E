const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome',
    headless: true,
    args: ['--no-sandbox','--disable-dev-shm-usage','--enable-gpu-rasterization','--use-gl=swiftshader'],
  });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  await p.goto('http://localhost:5173/tests/browser/fluidez.html' + (process.env.SO ? '?so=' + process.env.SO : ''), { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => new Promise(ok => {
    const t = []; let last = performance.now(); let n = 0;
    const passo = agora => { t.push(agora - last); last = agora;
      if (++n < 150) requestAnimationFrame(passo);
      else { t.sort((a,b)=>a-b);
        ok({ mediana: +t[Math.floor(t.length/2)].toFixed(1),
             p95: +t[Math.floor(t.length*0.95)].toFixed(1),
             pior: +t[t.length-1].toFixed(1),
             animando: document.getAnimations().filter(a=>a.playState==='running').length }); } };
    requestAnimationFrame(passo);
  }));
  console.log(`quadro mediano ${r.mediana}ms · p95 ${r.p95}ms · pior ${r.pior}ms · ${r.animando} animações correndo`);
  await b.close();

  /* O teto é o dobro do medido depois da otimização, para o ruído entre
     execuções não derrubar a checagem sozinho. Quem passar daqui
     quebrou alguma coisa de verdade. */
  const TETO = Number(process.env.TETO || (process.env.SO ? 240 : 300));
  if (r.mediana > TETO) {
    console.error(`FALHOU: ${r.mediana}ms por quadro, acima do teto de ${TETO}ms.`);
    process.exit(1);
  }
})();
