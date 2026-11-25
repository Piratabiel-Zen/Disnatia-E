/**
 * O ELENCO NO QUADRO DO LUGAR
 *
 * A faixa era uma fila de largura infinita que rolava para o lado: com
 * cinco personagens a terceira ficha já saía da tela, e ninguém descobria
 * sozinho que aquilo rolava. Agora ela quebra em linhas e cresce para
 * baixo, que é a direção em que há espaço.
 *
 * Rodar com o Vite de pé:  node tests/browser/elenco.cjs
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const URL = process.env.URL || 'http://localhost:5173/tests/browser/elenco.html';

(async () => {
  const navegador = await chromium.launch({
    executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const erros = [];
  const p = await navegador.newPage({ viewport: { width: 900, height: 900 } });
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(600);

  const medir = () => p.evaluate(() => {
    const vp = document.querySelector('.ad-party-viewport');
    const r = vp.getBoundingClientRect();
    const cards = [...document.querySelectorAll('.ad-companion')];
    return {
      cards: cards.length,
      fora: cards.filter(c => {
        const q = c.getBoundingClientRect();
        return q.right > r.right + 1 || q.left < r.left - 1;
      }).length,
      linhas: new Set(cards.map(c => Math.round(c.getBoundingClientRect().top))).size,
      rolaLado: vp.scrollWidth > vp.clientWidth + 1,
      larguraMinima: Math.min(...cards.map(c => Math.round(c.getBoundingClientRect().width))),
      altura: Math.round(r.height),
    };
  });

  let anterior = 0;
  let larguraSozinho = 0;
  for (const n of [1, 3, 5, 8, 14]) {
    await p.click(`#n-${n}`);
    await p.waitForTimeout(240);
    const e = await medir();
    assert.equal(e.cards, n);
    assert.equal(e.fora, 0, `com ${n} fichas, ${e.fora} saíram do bloco`);
    assert.ok(!e.rolaLado, `com ${n} fichas o bloco voltou a rolar para o lado`);
    /* Caber não pode virar espremer. O número absoluto depende do
       conteúdo de cada cartão, então o que se mede é se ele ENCOLHE ao
       ganhar vizinhos: com oito numa fila fina e ilegível o problema só
       teria trocado de forma. */
    if (n === 1) larguraSozinho = e.larguraMinima;
    assert.ok(e.larguraMinima >= larguraSozinho,
      `com ${n} fichas os cartões encolheram de ${larguraSozinho}px para ${e.larguraMinima}px`);
    assert.ok(e.altura >= anterior, 'o bloco encolheu ao ganhar fichas');
    anterior = e.altura;
  }

  // Muitas fichas quebram em mais de uma linha, em vez de sumir.
  const cheio = await medir();
  assert.ok(cheio.linhas >= 2, 'catorze fichas continuaram numa linha só');

  assert.deepEqual(erros, [], 'erro de JavaScript na página');
  await navegador.close();
  console.log('elenco: tudo certo');
})().catch(e => { console.error(e.message); process.exit(1); });
