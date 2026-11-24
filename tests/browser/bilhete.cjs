/**
 * O BILHETE, NA TELA
 *
 * Existe por um vazamento que só apareceu aqui: o papel era da Mika, a tela
 * passou para o Takuro e o bilhete CONTINUOU ABERTO na frente dele — porque
 * `lendo` é estado do componente e sobrevive à troca de ficha. Nenhum teste
 * de unidade veria isso: a função de filtro estava certa o tempo todo.
 *
 * Rodar com o Vite de pé:  node tests/browser/bilhete.cjs
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const URL = process.env.URL || 'http://localhost:5173/tests/browser/bilhete.html';

(async () => {
  const navegador = await chromium.launch({
    executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const erros = [];
  const p = await navegador.newPage({ viewport: { width: 1100, height: 760 } });
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(600);

  // O Mestre entrega "A saída" para a primeira ficha.
  await p.click('.eb-puxador');
  await p.waitForTimeout(200);
  await p.click('.eb-quem button');
  await p.click('.eb-prontos button');
  await p.click('.eb-enviar');
  await p.waitForTimeout(900);

  // 1. CHEGA DOBRADO, COM O TEXTO ESCONDIDO.
  const chegada = await p.evaluate(() => ({
    fase: document.querySelector('.blt')?.dataset.fase,
    texto: getComputedStyle(document.querySelector('.blt-texto')).opacity,
    lacre: getComputedStyle(document.querySelector('.blt-lacre')).animationName,
    cima: getComputedStyle(document.querySelector('.blt-dobra-cima')).transform,
  }));
  assert.equal(chegada.fase, 'dobrado');
  assert.equal(chegada.texto, '0', 'o texto não pode ser lido antes de quebrar o lacre');
  assert.equal(chegada.lacre, 'bltPulsa', 'o lacre parado é o que diz onde tocar');
  assert.notEqual(chegada.cima, 'none', 'o papel tem de chegar dobrado');

  // 2. O PAPEL TAPA A TELA. É de propósito: enquanto não abre, nada mais
  //    acontece — é o que cria a hesitação.
  const tapa = await p.evaluate(() => {
    const r = document.querySelector('.blt').getBoundingClientRect();
    return r.width >= innerWidth - 1 && r.height >= innerHeight - 1;
  });
  assert.ok(tapa, 'o bilhete precisa tomar a tela de quem recebeu');

  // 3. E NÃO VAZA PARA OUTRA FICHA.
  //    O clique vai direto no elemento: o papel cobre a página, e um clique
  //    por coordenada cairia nele em vez de no botão.
  await p.evaluate(() => document.querySelector('#eu-f2').click());
  await p.waitForTimeout(450);
  const outro = await p.evaluate(() => ({
    papel: Boolean(document.querySelector('.blt')),
    bolso: Boolean(document.querySelector('.blt-bolso')),
    texto: document.querySelector('.blt-texto')?.textContent || null,
  }));
  assert.ok(!outro.papel, 'o bilhete de um primo ficou na tela de outro');
  assert.ok(!outro.bolso, 'o bolso mostrou bilhete que não é desta ficha');
  assert.equal(outro.texto, null);

  // 4. DE VOLTA AO DONO, CONTINUA LÁ E AINDA FECHADO.
  await p.evaluate(() => document.querySelector('#eu-f1').click());
  await p.waitForTimeout(450);
  assert.equal(await p.evaluate(() => document.querySelector('.blt')?.dataset.fase), 'dobrado');

  // 5. QUEBRAR O LACRE: as metades giram para fora, as lascas saltam.
  await p.click('.blt-papel');
  await p.waitForTimeout(280);
  const quebra = await p.evaluate(() => ({
    fase: document.querySelector('.blt').dataset.fase,
    lacre: getComputedStyle(document.querySelector('.blt-lacre-a')).transform,
    lasca: getComputedStyle(document.querySelector('.blt-lasca')).animationName,
  }));
  assert.ok(['quebrando', 'abrindo'].includes(quebra.fase));
  assert.match(quebra.lacre, /^matrix/, 'o lacre não se moveu');
  assert.equal(quebra.lasca, 'bltLasca');

  // 6. ABERTO: o papel fica plano e o texto aparece.
  await p.waitForTimeout(1500);
  const aberto = await p.evaluate(() => ({
    fase: document.querySelector('.blt').dataset.fase,
    texto: getComputedStyle(document.querySelector('.blt-texto')).opacity,
    cima: getComputedStyle(document.querySelector('.blt-dobra-cima')).transform,
    conteudo: document.querySelector('.blt-texto').textContent.trim(),
  }));
  assert.equal(aberto.fase, 'aberto');
  assert.equal(aberto.texto, '1');
  assert.equal(aberto.cima, 'matrix(1, 0, 0, 1, 0, 0)', 'o papel não desdobrou');
  assert.ok(aberto.conteudo.length > 40);

  // 7. GUARDADO, VAI PARA O BOLSO — reler é onde a decisão acontece.
  await p.click('.blt-pe button');
  await p.waitForTimeout(700);
  const bolso = await p.evaluate(() => ({
    sumiu: !document.querySelector('.blt'),
    rotulo: document.querySelector('.blt-bolso button')?.textContent.trim(),
  }));
  assert.ok(bolso.sumiu);
  assert.match(bolso.rotulo || '', /1/, 'o bilhete lido tem de ficar guardado');

  assert.deepEqual(erros, [], 'erro de JavaScript na página');
  await navegador.close();
  console.log('bilhete: tudo certo');
})().catch(e => { console.error(e.message); process.exit(1); });
