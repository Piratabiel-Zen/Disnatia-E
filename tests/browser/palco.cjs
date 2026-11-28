/**
 * O PALCO DESCE SOZINHO QUANDO A MÁQUINA NÃO DÁ CONTA
 *
 * O Imersivo era promessa fixa: a mesma quantidade de camadas do tamanho
 * da tela para todo mundo. Em desktop com vídeo integrado isso não é
 * imersão, é engasgo, e quem tem máquina fraca jogava pior justamente nas
 * horas que importam — cenário em tela cheia, mapa aproximado.
 *
 * Aqui a CPU é estrangulada de verdade, pelo protocolo do navegador, e o
 * teste cobra que a tela perceba e desça.
 *
 * O QUE ESTE TESTE NÃO CONSEGUE PROVAR, E POR QUÊ
 *
 * A volta ao palco cheio não é verificada aqui. Esta bancada roda em
 * renderização por SOFTWARE (swiftshader): a cena pesada não alcança os
 * quadros do palco 0 nem com a CPU solta, então nunca subiria — e estaria
 * certo em não subir, porque a máquina de fato não aguenta. A subida é
 * coberta em tests/palco-automatico.test.mjs, onde a decisão é testada
 * com medições na mão, sem depender da placa de vídeo da bancada.
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const CHROME = process.env.CHROMIUM_PATH || '/tmp/dinastia-chromium';
const BASE = process.env.TEST_URL || 'http://localhost:5173/tests/browser/fluidez.html?palco=auto';
const palcoAgora = pagina => pagina.evaluate(() => Number(document.documentElement.dataset.palco || 0));

(async () => {
  const navegador = await chromium.launch({
    executablePath: CHROME, headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote'],
  });
  try {
    const pagina = await navegador.newPage({ viewport: { width: 1400, height: 900 } });
    const cdp = await pagina.context().newCDPSession(pagina);
    await pagina.goto(BASE, { waitUntil: 'load' });
    await pagina.waitForTimeout(1200);

    assert.equal(await palcoAgora(pagina), 0, 'a cena não começou no palco cheio');

    // Máquina ruim de verdade: tudo vinte vezes mais lento.
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 });
    await pagina.waitForFunction(() => Number(document.documentElement.dataset.palco) > 0,
      null, { timeout: 40000 });

    /* E não desce sem fim: dois é o fundo. Abaixo dele não sobraria
       cena nenhuma, só tela preta — a mesa precisa continuar vendo
       onde está. */
    await pagina.waitForTimeout(20000);
    const fundo = await palcoAgora(pagina);
    assert.ok(fundo >= 1 && fundo <= 2, `palco fora do esperado: ${fundo}`);

    /* No palco do fundo a cena perde cenografia, nunca informação: a
       escuridão e a luz continuam desenhadas. */
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const sobrou = await pagina.evaluate(() => ({
      escuridao: document.querySelectorAll('.atm-escuridao').length,
      luzes: document.querySelectorAll('.atm-luzes').length,
      visiveis: [...document.querySelectorAll('.atm-escuridao,.atm-luzes')]
        .filter(e => getComputedStyle(e).display !== 'none').length,
    }));
    assert.equal(sobrou.escuridao, 1, 'a escuridão sumiu no palco do fundo');
    assert.equal(sobrou.visiveis, sobrou.escuridao + sobrou.luzes,
      'o palco do fundo escondeu camada que carrega informação de cena');

    console.log(`ok — o palco desceu para ${fundo} com a máquina sofrendo, e parou lá`);
  } finally {
    await navegador.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
