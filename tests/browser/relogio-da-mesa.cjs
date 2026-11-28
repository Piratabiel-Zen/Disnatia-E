/**
 * O RELÓGIO DA CAÇADA CHEGA A QUEM NÃO ESTÁ NO MAPA?
 *
 * A mesa reclamou que o timer não aparece para todos. Os testes que
 * existiam provavam que a faixa DESENHA (estado local) e que o contador
 * grande do mapa funciona — nenhum provava que o número SAI do Mestre e
 * CHEGA em quem está noutra aba. É esse caminho que este teste cobre:
 * duas telas, um documento, o gancho de verdade.
 *
 * Rodar com a bancada isolada de pé (porta 4179).
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const CHROME = process.env.CHROMIUM_PATH || '/tmp/dinastia-chromium';
const BASE = process.env.TEST_URL || 'http://127.0.0.1:4179/relogio-da-mesa.html';

(async () => {
  const navegador = await chromium.launch({
    executablePath: CHROME, headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote'],
  });
  const erros = [];
  try {
    const contexto = await navegador.newContext({ viewport: { width: 1200, height: 800 } });
    const mestre = await contexto.newPage();
    const jogador = await contexto.newPage();
    for (const p of [mestre, jogador]) {
      p.setDefaultTimeout(8000);
      p.on('pageerror', e => erros.push(e.message));
    }

    await mestre.goto(BASE + '?papel=mestre', { waitUntil: 'load' });
    await jogador.goto(BASE, { waitUntil: 'load' });
    await jogador.locator('#estado').waitFor();
    /* Esperar o `#estado` não basta: ele desenha antes do primeiro
       retrato chegar. O que importa é a assinatura estar de pé, senão o
       aviso da escrita do Mestre cai no vazio (ver firestore.mjs). */
    await jogador.waitForFunction(() => window.__ouvintes?.().includes('config/cacada'));

    // Antes de soltar, nada na tela de ninguém.
    assert.equal(await jogador.locator('.avc').count(), 0, 'a faixa apareceu sem caçada');

    await mestre.locator('#soltar').click();

    /* O ponto do teste: o Mestre soltou no mapa dele, e quem está na ficha
       tem de ver o relógio sem fazer nada. */
    await jogador.locator('.avc').waitFor({ timeout: 6000 });
    const relogio = await jogador.locator('.avc-relogio').textContent();
    assert.match(relogio, /^\d\d:\d\d$/, `relógio ilegível: ${relogio}`);
    const segundos = Number(relogio.slice(0, 2)) * 60 + Number(relogio.slice(3));
    assert.ok(segundos > 50 && segundos <= 60, `o relógio não começou perto de 60s: ${relogio}`);

    // E o número anda.
    await jogador.waitForTimeout(1800);
    const depois = await jogador.locator('.avc-relogio').textContent();
    assert.notEqual(depois, relogio, 'o relógio chegou parado');

    // Encerrar apaga em todas as telas, não só na do Mestre.
    await mestre.locator('#encerrar').click();
    await jogador.locator('.avc').waitFor({ state: 'detached', timeout: 6000 });

    /* Dentro do mapa a faixa não aparece — lá existe o contador grande — e
       isso não pode virar desculpa para ela faltar em todo lugar. */
    const noMapa = await contexto.newPage();
    noMapa.on('pageerror', e => erros.push(e.message));
    await noMapa.goto(BASE + '?nomapa=1', { waitUntil: 'load' });
    await mestre.locator('#soltar').click();
    await noMapa.waitForTimeout(1500);
    assert.equal(await noMapa.locator('.avc').count(), 0, 'a faixa dobrou o relógio dentro do mapa');

    /* RELÓGIO ERRADO NÃO PODE APAGAR O RELÓGIO DA MESA
       Era o defeito: `comecouEm` é o Date.now() do MESTRE, e quem lia
       comparava com o próprio relógio. Um celular 25 segundos adiantado,
       numa caçada de 20, concluía que o tempo tinha acabado e não
       mostrava nada — Mestre com a caçada correndo, primos sem relógio.
       Cinco minutos de erro para qualquer lado e a faixa tem de estar
       lá, com o número certo. */
    for (const erroDeRelogio of [25000, -25000, 180000, -300000]) {
      const sala = await navegador.newContext({ viewport: { width: 1200, height: 800 } });
      const mestreS = await sala.newPage();
      const jogadorS = await sala.newPage();
      jogadorS.on('pageerror', e => erros.push(e.message));
      await jogadorS.addInitScript(`{const real=Date.now;Date.now=()=>real()+${erroDeRelogio};}`);
      await mestreS.goto(BASE + '?papel=mestre&segundos=20', { waitUntil: 'load' });
      await jogadorS.goto(BASE, { waitUntil: 'load' });
      await jogadorS.waitForFunction(() => window.__ouvintes?.().includes('config/cacada'));
      await mestreS.locator('#soltar').click();
      await jogadorS.locator('.avc').waitFor({ timeout: 6000 });
      const visto = await jogadorS.locator('.avc-relogio').textContent();
      const s = Number(visto.slice(0, 2)) * 60 + Number(visto.slice(3));
      assert.ok(s > 14 && s <= 20,
        `relógio ${erroDeRelogio / 1000}s fora mostrou ${visto} numa caçada de 20s`);
      await sala.close();
    }

    assert.deepEqual(erros, [], 'erros na tela');
    console.log('ok — o relógio sai do Mestre e chega em quem está fora do mapa,');
    console.log('     inclusive com o relógio do aparelho cinco minutos errado');
  } finally {
    await navegador.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
