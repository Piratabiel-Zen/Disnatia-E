/* QUEM DECIDE SE A MESA SE MEXE
   O jogador abriu o site no PC e não viu nada se mexer: token sem respirar,
   habilidade sem responder ao mouse, livro 3D parado, mapa sem luz. Em todos
   os navegadores. A causa era o Windows pedindo menos animação
   (Acessibilidade → Efeitos visuais), que todo navegador respeita — e o site
   inteiro obedecia cegamente, em 104 regras espalhadas por 39 arquivos.

   Agora quem decide é o jogador, dentro do site, e a resposta padrão é "sim".
   Estes testes seguram as duas pontas: a media query não volta, e quem pede
   menos movimento continua sendo atendido. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  MOTION_LABELS, MOTION_VALUES, normalizeMotion, resolveMotion,
} from '../src/adventure/movimento.mjs';

const raiz = new URL('../src/', import.meta.url).pathname;
const css = [];
(function varrer(dir) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) varrer(caminho);
    else if (nome.endsWith('.css')) css.push([caminho.slice(raiz.length), readFileSync(caminho, 'utf8')]);
  }
})(raiz);

test('nenhum CSS volta a obedecer o sistema operacional sozinho', () => {
  const culpados = css.filter(([, texto]) => /prefers-reduced-motion/.test(texto)).map(([nome]) => nome);
  assert.deepEqual(
    culpados, [],
    `voltou a media query em: ${culpados.join(', ')}.\n` +
    'Use html[data-motion="reduced"]: assim a escolha continua do jogador, não do Windows.',
  );
});

test('o JS também não consulta o sistema por conta própria', () => {
  const js = [];
  (function varrer(dir) {
    for (const nome of readdirSync(dir)) {
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) varrer(caminho);
      else if (/\.(js|jsx|mjs)$/.test(nome)) js.push([caminho.slice(raiz.length), readFileSync(caminho, 'utf8')]);
    }
  })(raiz);
  const culpados = js
    .filter(([nome]) => nome !== 'adventure/movimento.mjs')
    .filter(([, texto]) => /prefers-reduced-motion/.test(texto))
    .map(([nome]) => nome);
  assert.deepEqual(culpados, [], `consulta direta ao sistema em: ${culpados.join(', ')}. Use motionIsReduced().`);
});

test('o movimento nasce ligado, inclusive diante de lixo', () => {
  assert.equal(normalizeMotion(undefined), 'full');
  assert.equal(normalizeMotion(''), 'full');
  assert.equal(normalizeMotion('talvez'), 'full');
  assert.equal(normalizeMotion(null), 'full');
  for (const valor of MOTION_VALUES) assert.equal(normalizeMotion(valor), valor);
});

test('o padrão ignora o sistema: é por isso que o PC voltou a se mexer', () => {
  assert.equal(resolveMotion('full', true), 'full', 'o Windows pede reduzir e a mesa continua viva');
  assert.equal(resolveMotion('full', false), 'full');
  assert.equal(resolveMotion(undefined, true), 'full', 'quem nunca abriu as preferências também');
});

test('quem pede menos movimento é atendido, do jeito que pediu', () => {
  // Escolha explícita vale sempre, mesmo com o sistema quieto.
  assert.equal(resolveMotion('reduced', false), 'reduced');
  assert.equal(resolveMotion('reduced', true), 'reduced');
  // E quem prefere delegar ao sistema pode.
  assert.equal(resolveMotion('system', true), 'reduced');
  assert.equal(resolveMotion('system', false), 'full');
});

test('o CSS só conhece dois estados: o "system" é resolvido antes', () => {
  const comSystem = css.filter(([, t]) => /data-motion\s*=\s*["']?system/.test(t)).map(([n]) => n);
  assert.deepEqual(comSystem, [], `CSS tentando interpretar "system" em: ${comSystem.join(', ')}`);
  // E o estado que o CSS usa é exatamente o que resolveMotion devolve.
  const estados = new Set([resolveMotion('full', true), resolveMotion('reduced', false)]);
  assert.deepEqual([...estados].sort(), ['full', 'reduced']);
});

test('as três escolhas têm rótulo em português para o painel', () => {
  for (const valor of MOTION_VALUES) {
    assert.equal(typeof MOTION_LABELS[valor], 'string');
    assert.ok(MOTION_LABELS[valor].length > 2, `rótulo vazio para ${valor}`);
  }
});

test('o <html> nasce em movimento, antes de qualquer script carregar', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<html[^>]*data-motion="full"/,
    'sem isso existe um instante congelado na abertura, antes do React montar');
  // E o script inicial sabe corrigir para quem escolheu outra coisa.
  assert.match(html, /dinastia_player_preferences_v1/);
  assert.match(html, /data-motion', 'reduced'/);
});

test('o livro 3D, o token e a habilidade dependem da escolha do jogador', () => {
  const esperado = [
    ['experience/livro-3d.css', /html\[data-motion="reduced"\] \.tomo3d-corpo/],
    ['features/mapa-batalha/tokens-vivos.css', /html\[data-motion="reduced"\] \.map-token-body/],
    ['features/sheets/habilidades-vivas.css', /html\[data-motion="reduced"\]/],
    ['features/mapa-batalha/atmosfera.css', /html\[data-motion="reduced"\] \.mapa-atm/],
  ];
  for (const [nome, padrao] of esperado) {
    const achado = css.find(([n]) => n === nome);
    assert.ok(achado, `${nome} sumiu`);
    assert.match(achado[1], padrao, `${nome} parou de atender quem escolheu menos movimento`);
  }
});

test('o modo seguro do Opera GX protege o compositor, não apaga animação', () => {
  const smooth = css.find(([n]) => n === 'experience/performance-smooth.css')[1];
  const regras = smooth.split('}').filter(r => r.includes('opera-gx-safe'));
  for (const regra of regras) {
    assert.ok(
      !/animation\s*:\s*none/.test(regra),
      `o modo seguro voltou a matar animação — e o Opera é um dos navegadores prioritários:\n  ${regra.trim().slice(0, 160)}`,
    );
  }
  // O que previne a tela preta continua lá.
  assert.match(smooth, /html\.opera-gx-safe #root\{filter:none!important/);
});

test('cada linhagem da campanha principal nasce com a sua arte', async () => {
  const { ARTES_DAS_LINHAGENS, capaDaLinhagem } = await import('../src/features/classes/artesDasLinhagens.mjs');
  const { readFileSync: ler } = await import('node:fs');
  const fonte = ler(new URL('../src/data/gameData.jsx', import.meta.url), 'utf8');
  const inicio = fonte.indexOf('const DINASTIA_E_CLASSES=[');
  const bloco = fonte.slice(inicio, fonte.indexOf('export { DINASTIA_E_CLASSES }', inicio));
  const linhagens = [...bloco.matchAll(/"id":\s*"([a-z_]+)"/g)]
    .map(m => m[1])
    .filter((id, i, todos) => todos.indexOf(id) === i && id !== 'personalizado');

  for (const id of linhagens) {
    assert.ok(ARTES_DAS_LINHAGENS[id], `a linhagem "${id}" ficou sem arte`);
    const caminho = new URL(`../public${ARTES_DAS_LINHAGENS[id]}`, import.meta.url);
    assert.doesNotThrow(() => ler(caminho), `arquivo ausente para "${id}": ${ARTES_DAS_LINHAGENS[id]}`);
  }

  // O que o Mestre enviar continua vencendo a arte que veio junto.
  assert.equal(capaDaLinhagem('fogo', { fogo: 'data:image/webp;base64,XXX' }, true), 'data:image/webp;base64,XXX');
  assert.equal(capaDaLinhagem('fogo', {}, true), ARTES_DAS_LINHAGENS.fogo);
  // E outras campanhas começam vazias, de propósito.
  assert.equal(capaDaLinhagem('fogo', {}, false), '');
  assert.equal(capaDaLinhagem('linhagem-inventada', {}, true), '');
});

test('o bloco da linhagem segue a proporção da arte, em vez de recortá-la', () => {
  const classes = css.find(([n]) => n === 'features/classes/classes.css')[1];
  // A arte entra no fluxo e define a altura — nada de altura fixa com cover.
  assert.match(classes, /\.classe-hero-art img\{width:100%;height:auto;display:block\}/);
  assert.ok(
    !/\.classe-hero-art img\{[^}]*object-fit:cover/.test(classes),
    'a arte voltou a ser recortada para caber na caixa',
  );
  // As três camadas dividem a mesma célula, então o título continua por cima.
  assert.match(classes, /\.classe-hero-art,\.classe-hero-empty,\.classe-hero-copy\{grid-area:pilha/);
  // E a caixa vazia mantém forma, senão a linhagem sem arte colapsa.
  assert.match(classes, /\.classe-hero\{[^}]*min-height:308px/);
});
