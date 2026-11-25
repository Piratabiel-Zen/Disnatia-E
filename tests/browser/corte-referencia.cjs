/**
 * O CORTE DA REFERÊNCIA, MEDIDO
 *
 * Gabriel mandou a imagem do arranjo que queria. Imagem não vira teste
 * sozinha, mas o que a imagem decide, sim: onde está cada bloco, o que é
 * uma cápsula e o que é uma caixa, o que fica em linha e o que empilha.
 * São essas decisões que estão presas aqui — se alguma se desfizer numa
 * mudança futura, isto falha antes de chegar à mesa.
 *
 * Rodar com o Vite de pé:  node tests/browser/corte-referencia.cjs
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const BASE = process.env.BASE || 'http://localhost:5173/tests/browser';

const caixa = (p, s) => p.evaluate(sel => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { e: r.left, d: r.right, c: r.top, b: r.bottom, l: r.width, a: r.height };
}, s);

(async () => {
  const navegador = await chromium.launch({
    executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const erros = [];

  for (const largura of [1920, 1600, 1366, 1100, 960]) {
    const p = await navegador.newPage({ viewport: { width: largura, height: 820 } });
    p.on('pageerror', e => erros.push(`${largura}px: ${e.message}`));
    await p.goto(`${BASE}/referencia-corte.html`, { waitUntil: 'load' });
    await p.waitForTimeout(500);

    // 1. A marca fica À ESQUERDA do nome, não acima. Empilhada ela
    //    empurrava o nome para baixo e a legenda saía cortada pela barra.
    const marca = await caixa(p, '.brand-mark');
    const h1 = await caixa(p, '.brand-line h1');
    const small = await caixa(p, '.brand-line small');
    const barra = await caixa(p, '.immersive-topbar');
    assert.ok(marca.d <= h1.e + 1, `a ${largura}px a marca não está à esquerda do nome`);
    assert.ok(small.b <= barra.b - 4,
      `a ${largura}px a legenda encosta na borda da barra (folga ${Math.round(barra.b - small.b)}px)`);

    // 2. A última palavra do nome sai em sangue.
    const tinta = await p.evaluate(() => {
      const i = document.querySelector('.brand-line h1 .marca-tinta');
      return i ? { texto: i.textContent, cor: getComputedStyle(i).webkitTextFillColor } : null;
    });
    assert.equal(tinta?.texto, 'Macabro', `a ${largura}px a última palavra não saiu marcada`);
    assert.match(tinta.cor, /rgb\(138,\s*39,\s*48\)/, `a ${largura}px a tinta não é sangue`);

    // 3. As pastilhas do topo são cápsulas; as abas, não.
    const raios = await p.evaluate(() => ({
      pastilha: getComputedStyle(document.querySelector('.top-actions>button')).borderRadius,
      aba: getComputedStyle(document.querySelector('.grim-link')).borderRadius,
    }));
    assert.match(raios.pastilha, /^999px|^9999px/, `a ${largura}px a pastilha do topo não é cápsula`);
    assert.ok(parseInt(raios.aba, 10) <= 4, `a ${largura}px a aba arredondou demais`);

    // 4. A aba aberta é uma MOLDURA: borda nos quatro lados, não um fio.
    const ativa = await p.evaluate(() => {
      const c = getComputedStyle(document.querySelector('.grim-link.active'));
      return [c.borderTopWidth, c.borderRightWidth, c.borderBottomWidth, c.borderLeftWidth];
    });
    assert.deepEqual(ativa, ['1px', '1px', '1px', '1px'],
      `a ${largura}px a aba aberta perdeu a moldura`);

    if (largura >= 901) {
      // 5. Pergaminho à esquerda, quadro do lugar à direita, sem invadir.
      const titulo = await caixa(p, '.sessao-titulo');
      const frentes = await caixa(p, '.sessao-frentes');
      assert.ok(titulo.d <= frentes.e + 1,
        `a ${largura}px o pergaminho invade o quadro do lugar`);

      // 6. Os botões: o principal numa linha, os dois menores lado a lado.
      const principal = await caixa(p, '.sessao-acao-principal');
      const menores = await p.$$eval('.sessao-acoes .sessao-acao', els =>
        els.map(e => { const r = e.getBoundingClientRect(); return { c: r.top, a: r.height }; }));
      assert.equal(menores.length, 2, `a ${largura}px o número de botões menores mudou`);
      assert.ok(Math.abs(menores[0].c - menores[1].c) < 2,
        `a ${largura}px os dois botões menores não estão na mesma linha`);
      assert.ok(Math.abs(menores[0].a - menores[1].a) < 2,
        `a ${largura}px um dos botões menores quebrou em duas linhas`);
      assert.ok(principal.c < menores[0].c,
        `a ${largura}px o botão principal não está acima dos outros`);

      // 7. Os botões vêm logo depois da frase de efeito.
      //    A grade nascia com a linha do meio em `1fr`, que esticava até o
      //    fim da página e abria um vão enorme no meio do papel. Medir a
      //    altura do próprio papel não serve: ele é um pseudoelemento e
      //    acompanha a coluna mais alta das duas. O vão é o sintoma que
      //    aparece na tela, e é ele que fica preso aqui.
      const vao = Math.round(principal.c - titulo.b);
      assert.ok(vao < 60,
        `a ${largura}px sobram ${vao}px de pergaminho vazio entre a frase e os botões`);
    }

    await p.close();
  }

  if (erros.length) {
    console.error('FALHOU:\n' + erros.join('\n'));
    await navegador.close();
    process.exit(1);
  }
  console.log('corte-referencia: o arranjo bate com a imagem.');
  await navegador.close();
})().catch(e => { console.error(e.message || e); process.exit(1); });
