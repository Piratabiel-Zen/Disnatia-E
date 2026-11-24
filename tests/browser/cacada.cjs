/**
 * A CAÇADA, NA TELA
 *
 * O que os testes de fonte não veem: se o relógio realmente cai, se o
 * coração acelera junto, se a tela continua clicável (ela PRECISA continuar
 * — a mesa decide para onde corre enquanto isso), e se a porta e o tempo
 * encerram de verdade.
 *
 * Rodar com o Vite de pé:  node tests/browser/cacada.cjs
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const URL = process.env.URL || 'http://localhost:5173/tests/browser/cacada.html';

(async () => {
  const navegador = await chromium.launch({
    executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const erros = [];
  const p = await navegador.newPage({ viewport: { width: 1160, height: 760 } });
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(800);

  const ler = () => p.evaluate(() => {
    const c = document.querySelector('.cac');
    if (!c) return null;
    const cs = getComputedStyle(c);
    const arco = document.querySelector('.cac-arco');
    return {
      n: Number(document.querySelector('.cac-relogio strong').textContent),
      tensao: Number(cs.getPropertyValue('--cac-tensao')),
      batida: Number(cs.getPropertyValue('--cac-batida').replace('ms', '')),
      offset: arco ? Number(getComputedStyle(arco).strokeDashoffset.replace('px', '')) : null,
      pulso: Number(getComputedStyle(document.querySelector('.cac-pulso')).opacity),
      alta: c.dataset.tensao || null,
      clicavel: cs.pointerEvents,
    };
  });

  // Caçada de 5 segundos, para o teste não levar meio minuto.
  await p.click('#rapida');
  await p.waitForTimeout(400);
  const inicio = await ler();
  assert.ok(inicio, 'a caçada não apareceu');
  assert.ok(inicio.n >= 4, `começou em ${inicio.n}s`);
  assert.equal(inicio.clicavel, 'none',
    'a caçada bloqueou a tela: a mesa precisa continuar decidindo para onde corre');

  await p.waitForTimeout(2600);
  const meio = await ler();
  assert.ok(meio.n < inicio.n, 'o relógio não andou');
  assert.ok(meio.tensao > inicio.tensao, 'a tensão não subiu');
  assert.ok(meio.batida < inicio.batida, 'o coração não acelerou');
  assert.ok(meio.offset > inicio.offset, 'o anel não esvaziou');
  assert.ok(meio.pulso > inicio.pulso, 'o pulso nas bordas não cresceu');
  // Na metade ainda NÃO é "alta": a tensão cresce ao quadrado, então o
  // aperto fica guardado para os últimos segundos.
  assert.equal(meio.alta, null, 'o aviso de fim acendeu cedo demais');

  await p.waitForTimeout(1500);
  const fim = await ler();
  assert.ok(fim, 'a caçada acabou antes da hora');
  assert.equal(fim.alta, 'alta', 'o aviso de fim próximo não acendeu');
  assert.ok(fim.batida < meio.batida, 'o coração parou de acelerar');

  // O TEMPO FECHA: escaparam.
  await p.waitForTimeout(1800);
  assert.equal(await ler(), null, 'a caçada não terminou sozinha no fim do tempo');

  // A PORTA: trocar de cômodo encerra, mesmo com tempo de sobra.
  await p.click('#rapida');
  await p.waitForTimeout(500);
  assert.ok(await ler(), 'a segunda caçada não começou');
  await p.click('#porta');
  await p.waitForTimeout(400);
  assert.equal(await ler(), null, 'atravessar a porta não encerrou a caçada');

  // O CERCO: nem a porta nem o tempo salvam, e o número conta para cima.
  await p.click('#cerco');
  await p.waitForTimeout(600);
  const cerco1 = await ler();
  assert.ok(cerco1, 'o cerco não começou');
  assert.equal(cerco1.tensao, 1, 'no cerco a tensão é máxima o tempo todo');
  await p.click('#porta');
  await p.waitForTimeout(500);
  const cerco2 = await ler();
  assert.ok(cerco2, 'a porta encerrou o cerco: era justamente a caçada de que não se foge');
  assert.ok(cerco2.n >= cerco1.n, 'o relógio do cerco tinha de contar para cima');
  // E o anel gira em vez de esvaziar, porque não há fim para contar.
  assert.equal(
    await p.evaluate(() => getComputedStyle(document.querySelector('.cac-arco')).animationName),
    'cacGira',
  );

  assert.deepEqual(erros, [], 'erro de JavaScript na página');
  await navegador.close();
  console.log('cacada: tudo certo');
})().catch(e => { console.error(e.message); process.exit(1); });
