/**
 * O ARMÁRIO, NA TELA
 *
 * Existe por um defeito que só se vê olhando: as portas abriam e revelavam
 * PRETO. Abrir para o nada é o oposto de um susto — é um anticlímax com som
 * de porta. E a legenda do fim caía bem em cima do rosto da coisa, tapando
 * o único quadro que a cena inteira estava construindo.
 *
 * Rodar com o Vite de pé:  node tests/browser/esconderijo.cjs
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const URL = process.env.URL || 'http://localhost:5173/tests/browser/esconderijo.html';

/* Nenhuma das duas pontas é certeza — de propósito —, então o teste repete
   até sair o final que quer examinar. Com chance acima de 85% (ou abaixo de
   20%), oito tentativas erram menos de uma vez em dez mil. */
async function ate(p, botao, faseQuerida) {
  for (let n = 0; n < 8; n += 1) {
    await p.evaluate(s => document.querySelector(s).click(), botao);
    await p.waitForTimeout(3900);
    const fase = await p.evaluate(() => document.querySelector('.esc')?.dataset.fase);
    if (fase === faseQuerida) return true;
    await p.evaluate(() => document.querySelector('.esc-texto button')?.click());
    await p.waitForTimeout(250);
  }
  return false;
}

(async () => {
  const navegador = await chromium.launch({
    executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const erros = [];
  const p = await navegador.newPage({ viewport: { width: 1000, height: 680 } });
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(700);

  // 1. AS PORTAS FECHAM E SOBRA UMA FRESTA.
  await p.evaluate(() => document.querySelector('#cedo').click());
  await p.waitForTimeout(1000);
  const dentro = await p.evaluate(() => {
    const esc = document.querySelector('.esc');
    const fresta = document.querySelector('.esc-fresta').getBoundingClientRect();
    const e = document.querySelector('.esc-porta-e').getBoundingClientRect();
    const d = document.querySelector('.esc-porta-d').getBoundingClientRect();
    return {
      fase: esc.dataset.fase,
      fresta: Math.round(fresta.width),
      fechou: e.right > innerWidth * 0.45 && d.left < innerWidth * 0.55,
      texto: document.querySelector('.esc-texto p').textContent,
      sombra: getComputedStyle(document.querySelector('.esc-sombra')).animationName,
    };
  });
  assert.equal(dentro.fase, 'esperando');
  assert.ok(dentro.fechou, 'as portas não fecharam');
  assert.ok(dentro.fresta > 0 && dentro.fresta < 20,
    `a fresta tem ${dentro.fresta}px: ela é o campo de visão de quem está com medo`);
  assert.match(dentro.texto, /quieto/i);
  assert.match(dentro.sombra, /escPassa|escPara/, 'nada atravessou a fresta');

  // 2. A ESPERA É LONGA. Durante ela não há resultado nenhum na tela —
  //    dar o resultado na hora transformaria a decisão mais tensa da noite
  //    num aviso de sistema.
  assert.equal(await p.evaluate(() => Boolean(document.querySelector('.esc-fim'))), false);
  await p.waitForTimeout(3000);
  await p.evaluate(() => document.querySelector('.esc-texto button')?.click());
  await p.waitForTimeout(300);

  // 3. ESCONDER CEDO PASSA.
  assert.ok(await ate(p, '#cedo', 'passou'), 'esconder cedo nunca deu certo em 8 tentativas');
  const salvo = await p.evaluate(() => ({
    texto: document.querySelector('.esc-fim').textContent,
    coisa: Boolean(document.querySelector('.esc-coisa')),
    botao: document.querySelector('.esc-texto button').textContent.trim(),
  }));
  assert.ok(!salvo.coisa, 'quem passou não pode ver a coisa');
  assert.match(salvo.botao, /Sair/);
  assert.ok(!/test|chance|falh/i.test(salvo.texto), `vazou mecânica: ${salvo.texto}`);
  await p.evaluate(() => document.querySelector('.esc-texto button').click());
  await p.waitForTimeout(300);

  // 4. ESCONDER TARDE PEGA — E AÍ TEM O QUE VER.
  assert.ok(await ate(p, '#tarde', 'pego'), 'esconder tarde nunca falhou em 8 tentativas');
  await p.waitForTimeout(800);
  const pego = await p.evaluate(() => {
    const coisa = document.querySelector('.esc-coisa');
    const figura = coisa?.querySelector('svg,img');
    const r = figura?.getBoundingClientRect();
    const texto = document.querySelector('.esc-texto').getBoundingClientRect();
    const bt = document.querySelector('.esc-texto button');
    return {
      coisa: Boolean(coisa),
      alturaDaFigura: r ? Math.round((r.height / innerHeight) * 100) : 0,
      // A legenda tem de ficar ABAIXO do rosto: no meio da tela ela tapa
      // justamente o quadro que a cena inteira construiu.
      textoAbaixoDoRosto: r ? texto.top > r.top + r.height * 0.35 : false,
      botao: bt?.textContent.trim(),
      botaoVisivel: bt ? Number(getComputedStyle(bt).opacity) > 0.5 : false,
    };
  });
  assert.ok(pego.coisa, 'as portas abriram para o nada');
  assert.ok(pego.alturaDaFigura > 50,
    `a coisa ocupa só ${pego.alturaDaFigura}% da tela: de longe não é susto`);
  assert.ok(pego.textoAbaixoDoRosto, 'a legenda caiu em cima do rosto da coisa');
  assert.match(pego.botao || '', /Encarar/);
  assert.ok(pego.botaoVisivel, 'o botão de sair não apareceu');

  assert.deepEqual(erros, [], 'erro de JavaScript na página');
  await navegador.close();
  console.log('esconderijo: tudo certo');
})().catch(e => { console.error(e.message); process.exit(1); });
