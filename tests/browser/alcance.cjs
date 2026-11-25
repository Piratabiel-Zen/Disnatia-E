/**
 * OS TRÊS ALCANCES, NA TELA
 *
 * O que importa aqui é a coluna da direita do resultado: os campos que o
 * BANCO obedece. A tela do jogador não filtra nada em JavaScript — ela
 * pergunta ao Firestore por `liberadoParaTodos == true` e por
 * `liberadoPara` contendo o uid dela. Então este teste olha esses dois
 * campos a cada clique, e não o que está aceso.
 *
 * Rodar com o Vite de pé:  node tests/browser/alcance.cjs
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const URL = process.env.URL || 'http://localhost:5173/tests/browser/alcance.html';

/* O que o Firestore entregaria, dado o documento como está agora. */
const recebem = (banco, uids) => uids.filter(uid =>
  banco.liberadoParaTodos === true || (banco.liberadoPara || []).includes(uid));

(async () => {
  const navegador = await chromium.launch({
    executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const erros = [];
  const p = await navegador.newPage({ viewport: { width: 1000, height: 620 } });
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(700);

  const TODOS = ['ana', 'bia', 'caio'];
  const ler = () => p.evaluate(() => ({
    banco: JSON.parse(document.querySelector('#banco').textContent),
    quemVe: document.querySelector('#quemve').textContent,
    aceso: [...document.querySelectorAll('.apa-alcance button')]
      .filter(x => x.dataset.ligado === 'sim').map(x => x.textContent),
    plateiaAcesa: [...document.querySelectorAll('.apa-plateia button')]
      .filter(x => x.dataset.ligado === 'sim').map(x => x.textContent),
    aviso: document.querySelector('.apa-guardada,.apa-vazia')?.textContent?.trim() || null,
  }));

  // 1. NASCE PARA NINGUÉM.
  let e = await ler();
  assert.deepEqual(e.aceso, ['Ninguém']);
  assert.deepEqual(recebem(e.banco, TODOS), [], 'a aparição nasceu visível para alguém');
  assert.match(e.quemVe, /Ninguém/);

  // 2. MARCAR UM PRIMO JÁ REVELA PARA ELE, E SÓ PARA ELE.
  await p.click('#p-bia');
  await p.waitForTimeout(250);
  e = await ler();
  assert.deepEqual(e.aceso, ['Alguns'], 'marcar alguém devia mudar o alcance');
  assert.deepEqual(recebem(e.banco, TODOS), ['bia']);
  assert.equal(e.quemVe, 'Takuro');

  // 3. VOLTAR PARA NINGUÉM TIRA DO AR — MAS GUARDA A ESCOLHA.
  await p.click('#al-ninguem');
  await p.waitForTimeout(250);
  e = await ler();
  assert.deepEqual(recebem(e.banco, TODOS), [], 'continuou entregando para alguém');
  assert.deepEqual(e.banco.plateia, ['bia'], 'a plateia foi perdida ao recolher');
  assert.deepEqual(e.plateiaAcesa, ['Takuro'], 'o nome escolhido apagou da tela');
  assert.match(e.aviso || '', /Guardada/, 'faltou avisar que a plateia não está valendo');

  // 4. A MESA ENTREGA PARA TODOS, SEM MISTURAR COM A LISTA GUARDADA.
  await p.click('#al-mesa');
  await p.waitForTimeout(250);
  e = await ler();
  assert.deepEqual(recebem(e.banco, TODOS), TODOS);
  assert.deepEqual(e.banco.liberadoPara, [],
    'a lista específica não pode ficar no campo do banco quando o alcance é a mesa');
  assert.deepEqual(e.banco.plateia, ['bia'], 'a plateia sumiu ao passar pela mesa');

  // 5. E VOLTA INTEIRA, SEM REMONTAR.
  await p.click('#al-alguns');
  await p.waitForTimeout(250);
  e = await ler();
  assert.deepEqual(recebem(e.banco, TODOS), ['bia']);
  assert.equal(e.aviso, null);

  // 6. TIRAR O ÚLTIMO VOLTA PARA NINGUÉM: alcance "alguns" com a lista
  //    vazia é um estado que não quer dizer nada.
  await p.click('#p-bia');
  await p.waitForTimeout(250);
  e = await ler();
  assert.deepEqual(e.aceso, ['Ninguém']);
  assert.deepEqual(recebem(e.banco, TODOS), []);

  assert.deepEqual(erros, [], 'erro de JavaScript na página');
  await navegador.close();
  console.log('alcance: tudo certo');
})().catch(e => { console.error(e.message); process.exit(1); });
