/**
 * O OBJETO NA MÃO, NO NAVEGADOR
 *
 * Isto existe porque dois defeitos desta rodada passaram por 784 testes e só
 * apareceram na tela:
 *
 *  1. OS SELOS DOS AMULETOS NÃO DESENHAVAM. As figuras estavam no DOM — o
 *     teste de dados passava — mas cada filho do grupo recebia
 *     `stroke="none"` e apagava o traço herdado. Figura presente e invisível
 *     é exatamente o que um teste de unidade não vê.
 *  2. A BOLSA ERA MAIS ALTA QUE O MAPA e transbordava por cima da cena.
 *
 * Rodar com o Vite de pé:  node tests/browser/itens-3d.cjs
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const CHROME = process.env.CHROME
  || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const URL = process.env.URL || 'http://localhost:5173/tests/browser/itens.html';

(async () => {
  const navegador = await chromium.launch({
    executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const erros = [];
  const p = await navegador.newPage({ viewport: { width: 1500, height: 980 } });
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(700);

  // 1. TODA FACE DESENHA, E DESENHA COM TINTA.
  const apagadas = await p.evaluate(() => {
    const fora = [];
    for (const el of document.querySelectorAll('[id^="f-"],[id^="v-"]')) {
      const figuras = [...el.querySelectorAll('rect,circle,ellipse,path')];
      const pinta = figuras.filter(f => {
        const cs = getComputedStyle(f);
        return cs.stroke !== 'none' || cs.fill !== 'none';
      });
      if (!figuras.length || !pinta.length) fora.push(el.id);
    }
    return fora;
  });
  assert.deepEqual(apagadas, [], 'face no DOM mas sem nada pintando');

  // 2. CADA SELO DE AMULETO APARECE, GRAVADO.
  const selos = await p.evaluate(() => ['entrada', 'sono', 'memoria', 'terra', 'sangue']
    .map(id => {
      const tracos = [...document.querySelectorAll(`#v-amuleto-${id} g path, #v-amuleto-${id} g circle`)];
      return [id, tracos.length, tracos.every(t => getComputedStyle(t).stroke !== 'none')];
    }));
  for (const [id, quantos, pinta] of selos) {
    assert.ok(quantos > 0, `o selo de ${id} não foi para a tela`);
    assert.ok(pinta, `o selo de ${id} está no DOM mas sem traço`);
  }

  // 3. OS CINCO AMULETOS SE DISTINGUEM DE FRENTE. Na bolsa vê-se a frente, e
  //    cinco discos iguais deixam o jogador sem saber o que tem na mão.
  const pedras = await p.evaluate(() => ['entrada', 'sono', 'memoria', 'terra', 'sangue']
    .map(id => getComputedStyle(document.querySelector(`#f-amuleto-${id} circle`)).fill));
  assert.equal(new Set(pedras).size, 5, 'dois amuletos com a mesma pedra de frente');

  // 4. A BOLSA CABE NO MAPA.
  await p.click('.ach-puxador');
  await p.click('.ach-abrir-lista');
  await p.waitForTimeout(260);
  const cabe = await p.evaluate(() => {
    const painel = document.querySelector('.ach-painel').getBoundingClientRect();
    const mapa = document.querySelector('#palco-mapa').getBoundingClientRect();
    return { altura: painel.height, mapa: mapa.height, acima: painel.top < mapa.top - 1 };
  });
  assert.ok(!cabe.acima,
    `a bolsa (${Math.round(cabe.altura)}px) sai por cima do mapa (${Math.round(cabe.mapa)}px)`);

  // 5. O OBJETO TEM ESPESSURA, E A ESPESSURA SÓ APARECE DE ESGUELHA.
  await p.click('[id^="abrir-"]');
  await p.waitForTimeout(500);
  const palco = await p.locator('.insp-palco').boundingBox();
  const meio = { x: palco.x + palco.width / 2, y: palco.y + palco.height / 2 };
  const medir = () => p.evaluate(() => ({
    largura: Math.round(document.querySelector('.insp-objeto').getBoundingClientRect().width),
    sombra: getComputedStyle(document.querySelector('.insp-sombra')).transform,
    brilho: getComputedStyle(document.querySelector('.insp-face'), '::after').backgroundImage,
  }));

  const deFrente = await medir();
  await p.mouse.move(meio.x, meio.y);
  await p.mouse.down();
  await p.mouse.move(meio.x + 160, meio.y, { steps: 8 });  // 0,5 grau por pixel = 80 graus
  await p.waitForTimeout(160);
  const deEsguelha = await medir();
  // Segue até passar da metade, senão ao soltar ele assenta de volta na
  // frente — que é o certo, e foi o que este teste aprendeu da primeira vez.
  await p.mouse.move(meio.x + 400, meio.y, { steps: 10 });
  await p.waitForTimeout(140);
  await p.mouse.up();

  assert.ok(deEsguelha.largura < deFrente.largura * 0.4,
    'o objeto não encolheu ao girar: não há perspectiva nenhuma');
  assert.notEqual(deEsguelha.sombra, deFrente.sombra,
    'a sombra não acompanhou o giro');
  assert.notEqual(deEsguelha.brilho, deFrente.brilho,
    'o brilho não anda com o ângulo: a superfície fica chapada');

  // 6. SOLTO, ASSENTA NUMA FACE E MOSTRA O VERSO.
  await p.waitForTimeout(700);
  const depois = await p.evaluate(() => ({
    largura: Math.round(document.querySelector('.insp-objeto').getBoundingClientRect().width),
    // No item desenhado o recado fica ESCRITO no papel do verso; a placa
    // flutuante (.insp-verso-texto) é só para fotografia carregada.
    verso: Boolean(document.querySelector('.insp-face-verso .insp-escrito')),
    botao: document.querySelector('.insp-botoes [title^="Virar"]')?.textContent,
  }));
  assert.ok(depois.largura > deFrente.largura * 0.9,
    'o objeto ficou parado de perfil, ilegível');
  assert.ok(depois.verso, 'virou e o recado escrito atrás não apareceu');
  const placa = await p.evaluate(() => Boolean(document.querySelector('.insp-verso-texto')));
  assert.ok(!placa, 'o objeto desenhado não pode ganhar placa por cima do papel');
  assert.equal(depois.botao, 'Frente', 'o botão não acompanhou o lado à mostra');

  assert.deepEqual(erros, [], 'erro de JavaScript na página');
  await navegador.close();
  console.log('itens-3d: tudo certo');
})().catch(e => { console.error(e.message); process.exit(1); });
