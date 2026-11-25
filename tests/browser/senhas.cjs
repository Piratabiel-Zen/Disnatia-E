/**
 * AS SENHAS DAS FICHAS, NA TELA
 *
 * O teste decisivo aqui é o "banco" ao lado do painel: ele mostra
 * EXATAMENTE o que seria gravado no documento da ficha. É lá que a senha
 * estava vazando — em texto puro, num documento que todo membro da mesa
 * recebe —, e é lá que este teste olha.
 *
 * Rodar com o Vite de pé:  node tests/browser/senhas.cjs
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const URL = process.env.URL || 'http://localhost:5173/tests/browser/senhas.html';
const SENHA = 'porao-dos-fundos';

(async () => {
  const navegador = await chromium.launch({
    executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const erros = [];
  const p = await navegador.newPage({ viewport: { width: 900, height: 900 } });
  p.on('pageerror', e => erros.push(e.message));
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(700);

  const banco = () => p.evaluate(() => JSON.parse(document.querySelector('#banco').textContent));
  const linha = n => `.snf li:nth-child(${n})`;

  // 1. O MESTRE VÊ COMO CADA UMA ESTÁ.
  const estados = await p.evaluate(() => [...document.querySelectorAll('.snf li')]
    .map(l => [l.querySelector('strong').textContent, l.dataset.estado]));
  assert.deepEqual(estados, [['Mika', 'aberta'], ['Takuro', 'antiga'], ['Hiroshi', 'aberta']]);
  // A ficha de senha antiga é a única que chama atenção: é a única que pede ação.
  const recado = await p.textContent(`${linha(2)} em`);
  assert.match(recado, /texto puro/);
  assert.match(recado, /Defina-a de novo/);

  // 2. GRAVAR NÃO DEIXA O TEXTO EM LUGAR NENHUM.
  await p.fill(`${linha(1)} input`, SENHA);
  await p.click(`${linha(1)} .snf-campo button`);
  await p.waitForTimeout(500);
  const depois = await banco();
  assert.ok(!JSON.stringify(depois).includes(SENHA),
    'a senha em texto foi parar no documento da ficha');
  assert.equal(depois[0].senha, '', 'o campo antigo precisa ficar vazio');
  assert.equal(depois[0].senhaHash.length, 64, 'o resumo não parece um SHA-256');
  assert.ok(depois[0].senhaSal, 'sem sal, uma lista pronta resolve a senha');
  assert.equal(depois[0].senhaVersao, 2);

  // 3. O CAMPO LIMPA SOZINHO E O ESTADO MUDA.
  assert.equal(await p.inputValue(`${linha(1)} input`), '',
    'a senha ficou na tela depois de gravada');
  assert.equal(await p.evaluate(() => document.querySelector('.snf li').dataset.estado), 'protegida');

  // 4. A SENHA CERTA ABRE, A ERRADA NÃO.
  const tentar = async texto => {
    await p.fill('#tentativa', texto);
    await p.click('#testar');
    await p.waitForTimeout(220);
    return p.textContent('#resposta');
  };
  assert.equal(await tentar(SENHA), 'abriu');
  assert.equal(await tentar('porao'), 'recusou');
  assert.equal(await tentar(''), 'recusou');
  // O resumo guardado não serve de senha: quem ler o documento não entra.
  assert.equal(await tentar(depois[0].senhaHash), 'recusou',
    'o próprio resumo abriu a ficha');

  // 5. TIRAR DEIXA A FICHA ABERTA DE NOVO.
  await p.click(`${linha(1)} .snf-tirar`);
  await p.waitForTimeout(400);
  const limpa = (await banco())[0];
  assert.equal(limpa.senhaHash, '');
  assert.equal(limpa.senha, '');
  assert.equal(await tentar(''), 'abriu');

  assert.deepEqual(erros, [], 'erro de JavaScript na página');
  await navegador.close();
  console.log('senhas: tudo certo');
})().catch(e => { console.error(e.message); process.exit(1); });
