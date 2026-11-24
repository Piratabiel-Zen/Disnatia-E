/**
 * OS CINCO AJUSTES, NA TELA
 *
 * O que os testes de fonte não veem: se o título cai em cima dos botões em
 * alguma largura, se a névoa realmente tapa o mapa, se o vulto chega com a
 * cor e a transparência que o Mestre anexou.
 *
 * Rodar com o Vite de pé:  node tests/browser/cinco-ajustes.cjs
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const BASE = process.env.BASE || 'http://localhost:5173/tests/browser';

(async () => {
  const navegador = await chromium.launch({
    executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  /* ─── 1 e 2: o cabeçalho em várias larguras, e a tela cheia ─── */
  for (const largura of [1920, 1700, 1690, 1600, 1366, 1100, 960]) {
    const p = await navegador.newPage({ viewport: { width: largura, height: 480 } });
    await p.goto(`${BASE}/casca-topo.html`, { waitUntil: 'load' });
    await p.waitForTimeout(350);

    const r = await p.evaluate(() => {
      const cx = s => { const e = document.querySelector(s); if (!e) return null;
        const q = e.getBoundingClientRect();
        return { e: q.left, d: q.right, c: q.top, b: q.bottom }; };
      const marca = cx('.brand-line'); const acoes = cx('.top-actions');
      const barra = cx('.immersive-topbar'); const fita = cx('.grim-nav');
      return {
        sobrepoe: marca && acoes && marca.e < acoes.d && acoes.e < marca.d,
        cabe: marca && barra && marca.c >= barra.c - 1 && marca.b <= barra.b + 1,
        vao: fita && barra ? Math.round(fita.c - barra.b) : 0,
      };
    });
    assert.ok(!r.sobrepoe, `a ${largura}px o título ainda cai em cima dos botões`);
    assert.ok(r.cabe, `a ${largura}px o bloco do nome vaza da barra`);
    assert.equal(r.vao, 0, `a ${largura}px sobra uma tira de ${r.vao}px entre a barra e a fita`);

    // A tela cheia some com as duas, e devolve ao sair.
    const estado = async () => p.evaluate(() => ['.immersive-topbar', '.grim-nav']
      .map(s => getComputedStyle(document.querySelector(s)).display));
    await p.evaluate(() => document.documentElement.classList.add('dinastia-map-fullscreen'));
    await p.waitForTimeout(140);
    assert.deepEqual(await estado(), ['none', 'none'],
      `a ${largura}px a faixa de navegação continua aparecendo em tela cheia`);
    await p.evaluate(() => document.documentElement.classList.remove('dinastia-map-fullscreen'));
    await p.waitForTimeout(140);
    assert.ok(!(await estado()).includes('none'), 'sair da tela cheia não devolveu a navegação');
    await p.close();
  }

  /* ─── 4 e 5: a névoa tapa, o vulto chega inteiro ─── */
  const p = await navegador.newPage({ viewport: { width: 1000, height: 560 } });
  await p.goto(`${BASE}/cinco-ajustes.html`, { waitUntil: 'load' });
  await p.waitForTimeout(800);

  const nevoa = await p.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('#nevoa'));
    return { opacidade: Number(cs.opacity), animacao: cs.animationName,
      camadas: (cs.backgroundImage.match(/gradient/g) || []).length,
      temMascara: cs.maskImage !== 'none' };
  });
  assert.equal(nevoa.opacidade, 1, 'a névoa está translúcida de novo');
  assert.equal(nevoa.animacao, 'nevVaga', 'a névoa parou de flutuar');
  assert.ok(nevoa.camadas >= 4, 'névoa de camada única não tem volume');
  assert.ok(nevoa.temMascara, 'a máscara das clareiras se perdeu');

  const vulto = await p.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('#vulto-img'));
    return { filtro: cs.filter, fundo: cs.backgroundColor, ajuste: cs.objectFit };
  });
  assert.ok(!/grayscale|sepia|saturate|contrast|brightness|invert/.test(vulto.filtro),
    `a imagem do vulto está sendo repintada: ${vulto.filtro}`);
  assert.equal(vulto.fundo, 'rgba(0, 0, 0, 0)', 'o vulto ganhou fundo: PNG transparente deixa de ser');
  assert.equal(vulto.ajuste, 'contain', 'esticar a imagem também é alterá-la');

  // E a prova no pixel: o vermelho do PNG de teste chega vermelho.
  const corNaTela = await p.evaluate(async () => {
    const img = document.querySelector('#vulto-img');
    const r = img.getBoundingClientRect();
    const tela = document.createElement('canvas');
    tela.width = 2; tela.height = 2;
    const ctx = tela.getContext('2d');
    await img.decode();
    ctx.drawImage(img, 0, 0, 2, 2);
    const d = ctx.getImageData(0, 0, 2, 2).data;
    return { largura: Math.round(r.width), pixels: Array.from(d) };
  });
  const [r0, g0, b0] = corNaTela.pixels;
  assert.ok(r0 > 180 && g0 < 80 && b0 < 80,
    `o pixel vermelho do PNG chegou como rgb(${r0},${g0},${b0})`);
  const alfas = [3, 7, 11, 15].map(i => corNaTela.pixels[i]);
  assert.ok(alfas.some(a => a === 0), 'o pixel transparente do PNG deixou de ser transparente');

  /* ─── A RAIZ DO FUNDO PRETO: o caminho de GRAVAÇÃO ───
     O teste acima prova que a tela desenha a imagem como ela é. Este prova
     que ela CHEGA assim — a imagem era achatada contra preto ao ser salva,
     muito antes de qualquer CSS tocar nela. */
  const salvo = await p.evaluate(async url => {
    const r = await window.salvarComoOSiteSalva(url);
    const img = new Image();
    await new Promise(ok => { img.onload = ok; img.src = r; });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let vazados = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 250) vazados += 1;
    return { formato: r.slice(0, 20), vazados };
  }, await p.evaluate(() => document.querySelector('#vulto-img').src));
  assert.match(salvo.formato, /^data:image\/png/,
    `imagem vazada gravada como ${salvo.formato}: JPEG não tem canal alfa`);
  assert.ok(salvo.vazados > 0, 'a transparência não sobreviveu à gravação');

  await navegador.close();
  console.log('cinco-ajustes: tudo certo');
})().catch(e => { console.error(e.message); process.exit(1); });
