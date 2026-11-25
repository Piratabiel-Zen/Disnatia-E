/**
 * A AMBIENTAÇÃO, MEDIDA NA TELA
 *
 * A regra central não dá para provar em teste de fonte: ela é sobre o que
 * CONTINUA ocupando lugar na tela. Luz apagada fica; coisa desligada some.
 *
 * Rodar com o Vite de pé:  node tests/browser/ambientacao.cjs
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const URL = process.env.URL || 'http://localhost:5173/tests/browser/ambientacao.html';

(async () => {
  const navegador = await chromium.launch({
    executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const erros = [];
  const p = await navegador.newPage({ viewport: { width: 1280, height: 620 } });
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(600);

  const lido = await p.evaluate(() => {
    const cx = sel => {
      const e = document.querySelector(sel);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      const s = getComputedStyle(e);
      return { l: r.width, a: r.height, x: Math.round(r.x), y: Math.round(r.y),
        mistura: s.mixBlendMode, opac: Number(s.opacity) };
    };
    const peca = i => cx(`.amb-peca:nth-of-type(${i})`);
    return {
      quantas: document.querySelectorAll('.amb-peca').length,
      classes: [...document.querySelectorAll('.amb-peca')].map(e => e.className),
      luzOn: cx('.amb-lampada.amb-on'),
      luzOff: cx('.amb-lampada.amb-off'),
      grande: cx('.amb-lampiao'),
      pequena: cx('.amb-vela'),
      escolhida: !!document.querySelector('.amb-escolhida'),
      painel: !!document.querySelector('.pamb'),
      interruptor: cx('.pamb-interruptor'),
      peca,
    };
  });

  // 1. Seis peças deste mapa, menos a coisa desligada: cinco. A do outro
  //    mapa não entra de jeito nenhum.
  assert.equal(lido.quantas, 5,
    `esperava 5 peças desenhadas, vieram ${lido.quantas}: ${lido.classes.join(' | ')}`);
  assert.ok(!lido.classes.some(c => c.includes('pedra')), 'peça de outro mapa vazou');
  assert.ok(!lido.classes.some(c => c.includes('grama') && c.includes('amb-off')),
    'a coisa desligada continuou na tela');

  // 2. A LUZ APAGADA CONTINUA LÁ. É a regra que faz o gerador valer.
  assert.ok(lido.luzOff, 'a luz apagada sumiu do mapa — ligar o gerador deixa de significar algo');
  assert.ok(lido.luzOff.l > 4 && lido.luzOff.a > 4,
    `a luz apagada ficou sem tamanho (${lido.luzOff.l}x${lido.luzOff.a})`);
  // Mas pequena e sem mistura de luz: é lâmpada apagada, não acesa fraca.
  assert.ok(lido.luzOff.l < lido.luzOn.l / 3,
    'a luz apagada está do tamanho da acesa — não parece apagada');
  assert.equal(lido.luzOff.mistura, 'normal');
  assert.equal(lido.luzOn.mistura, 'screen', 'a luz acesa parou de somar ao que está embaixo');

  // 3. O tamanho responde à variável: 2.5 contra 0.5 é cinco vezes.
  assert.ok(lido.grande.l > lido.pequena.l * 3,
    `o tamanho não está sendo aplicado (${lido.grande.l} vs ${lido.pequena.l})`);

  // 4. A peça escolhida tem alvo, e o painel está de pé.
  assert.ok(lido.escolhida, 'a peça selecionada não ganhou destaque');
  assert.ok(lido.painel, 'o painel não renderizou');
  assert.ok(lido.interruptor.a >= 30,
    `o interruptor ficou pequeno (${lido.interruptor.a}px) — é o que se aperta sem olhar`);

  if (erros.length) {
    console.error('FALHOU:\n' + erros.join('\n'));
    await navegador.close();
    process.exit(1);
  }
  console.log(`ambientacao: ${lido.quantas} peças, luz apagada ocupa `
    + `${Math.round(lido.luzOff.l)}px e a acesa ${Math.round(lido.luzOn.l)}px.`);
  await navegador.close();
})().catch(e => { console.error(e.message || e); process.exit(1); });
