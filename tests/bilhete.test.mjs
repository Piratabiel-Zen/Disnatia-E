/**
 * O BILHETE
 *
 * A regra que estes testes existem para guardar é uma: o bilhete tem UM
 * destinatário, e nada o mostra a mais ninguém. Se isso quebrar, a mecânica
 * inteira some — informação que todo mundo tem não corrompe ninguém.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import {
  BILHETES_PRONTOS, TAMANHO_MAXIMO, bilhetePronto, bilheteParaEntregar,
  bilhetesDe, porAbrir, resumoDaMesa,
} from '../src/features/oneshot/bilhete.mjs';

const fonte = c => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8');

test('o bilhete sem destinatário não existe', () => {
  // Recado para todos o Mestre dá falando: é mais rápido e assusta mais.
  assert.equal(bilheteParaEntregar({ para: '', texto: 'algo' }), null);
  assert.equal(bilheteParaEntregar({ para: '   ', texto: 'algo' }), null);
  assert.equal(bilheteParaEntregar({ para: 'f1', texto: '' }), null);
  assert.equal(bilheteParaEntregar({ para: 'f1', texto: '   ' }), null);
});

test('o bilhete guarda quem, o quê e quando, e nasce fechado', () => {
  const b = bilheteParaEntregar({ para: 'f1', texto: '  A casa aceita uma troca.  ', agora: 99 });
  assert.deepEqual(b, { para: 'f1', texto: 'A casa aceita uma troca.', em: 99, aberto: false });
});

test('texto comprido é cortado, não recusado', () => {
  // Recusar faria o Mestre perder o que escreveu no meio da cena.
  const b = bilheteParaEntregar({ para: 'f1', texto: 'x'.repeat(TAMANHO_MAXIMO + 400) });
  assert.equal(b.texto.length, TAMANHO_MAXIMO);
});

test('cada um só vê o que é dele', () => {
  const todos = [
    { id: 'a', para: 'f1', texto: 'A saída existe.', em: 1 },
    { id: 'b', para: 'f2', texto: 'Alguém mente.', em: 2 },
    { id: 'c', para: 'f1', texto: 'Conte de novo.', em: 3 },
  ];
  assert.deepEqual(bilhetesDe(todos, 'f1').map(b => b.id), ['c', 'a']);
  assert.deepEqual(bilhetesDe(todos, 'f2').map(b => b.id), ['b']);
  assert.deepEqual(bilhetesDe(todos, 'f3'), []);
});

test('sem ficha não se vê bilhete nenhum', () => {
  // O Mestre e quem entra olhando não têm ficha: nada pode cair na tela
  // deles por acidente.
  const todos = [{ id: 'a', para: 'f1', texto: 'segredo', em: 1 }];
  for (const vazio of ['', null, undefined, 0]) {
    assert.deepEqual(bilhetesDe(todos, vazio), [], `vazou com sheetId ${String(vazio)}`);
  }
});

test('bilhete podre não quebra a tela de ninguém', () => {
  const todos = [null, {}, { para: 'f1' }, { para: 'f1', texto: '   ' },
    { id: 'ok', para: 'f1', texto: 'vale', em: 1 }];
  assert.deepEqual(bilhetesDe(todos, 'f1').map(b => b.id), ['ok']);
});

test('o mais novo chega primeiro', () => {
  const todos = [
    { id: 'velho', para: 'f1', texto: 'um', em: 10 },
    { id: 'novo', para: 'f1', texto: 'dois', em: 90 },
  ];
  assert.equal(bilhetesDe(todos, 'f1')[0].id, 'novo');
});

test('só o que não foi aberto sobe na tela', () => {
  const todos = [
    { id: 'lido', para: 'f1', texto: 'um', em: 1, aberto: true },
    { id: 'fechado', para: 'f1', texto: 'dois', em: 2 },
  ];
  assert.deepEqual(porAbrir(todos, 'f1').map(b => b.id), ['fechado']);
});

test('os bilhetes prontos existem e o primeiro é o que corrompe', () => {
  assert.ok(BILHETES_PRONTOS.length >= 4);
  // O de Nira Oni: a partir dele, todo silêncio de quem recebeu significa
  // alguma coisa. É o que muda a mesa sozinho, então vem primeiro.
  assert.equal(BILHETES_PRONTOS[0].id, 'sacrificio');
  for (const b of BILHETES_PRONTOS) {
    assert.ok(b.rotulo && b.texto.length > 40, `bilhete pronto raso: ${b.id}`);
    assert.ok(bilheteParaEntregar({ para: 'f1', texto: b.texto }), `${b.id} não dá para entregar`);
  }
  assert.equal(bilhetePronto('nada'), null);
});

test('o mestre vê quantos cada um recebeu', () => {
  // Sem este número ele entrega "A saída" para dois primos sem perceber e
  // a melhor carta da noite vira uma conversa entre eles.
  const resumo = resumoDaMesa(
    [{ para: 'f1' }, { para: 'f1' }, { para: 'f2' }, null, { para: 'sumiu' }],
    [{ id: 'f1', nome: 'Mika' }, { id: 'f2', nome: 'Takuro' }, { id: 'f3' }],
  );
  assert.deepEqual(resumo, [
    { id: 'f1', nome: 'Mika', quantos: 2 },
    { id: 'f2', nome: 'Takuro', quantos: 1 },
    { id: 'f3', nome: 'sem nome', quantos: 0 },
  ]);
});

/* ─── O que a tela não pode fazer ─── */

test('o papel do jogador filtra pela ficha antes de desenhar', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/BilheteSecreto.jsx'));
  assert.match(jsx, /const meus = bilhetesDe\(bilhetes, sheetId\)/);
  assert.match(jsx, /const fechados = porAbrir\(bilhetes, sheetId\)/);
  // Nada pode varrer a lista crua: o `bilhetes` que entra é da mesa inteira.
  assert.ok(!/bilhetes\.map|bilhetes\.filter/.test(jsx),
    'a lista crua da mesa não pode ser desenhada');
});

test('o bilhete só vai para a tela de quem tem ficha, e não para o mestre', () => {
  const mapa = semComentarios(fonte('src/features/mapa-batalha/BattleMapPage.jsx'));
  assert.match(mapa, /ehNoite && !masterMode && playerSheetId && \(\s*<BilheteSecreto/);
  assert.match(mapa, /ehNoite && masterMode && \(\s*<EntregarBilhete/);
});

test('cada entrega cria um bilhete novo', () => {
  const mapa = semComentarios(fonte('src/features/mapa-batalha/BattleMapPage.jsx'));
  // Com id fixo o segundo bilhete do mesmo primo apagaria o primeiro.
  assert.match(mapa, /addDoc\(col\('bilhetes'\), novo\)/);
  assert.ok(!/setDoc\(docIn\('bilhetes', [^)]*\), novo/.test(mapa));
});

test('o mestre é avisado de que o segredo é de tela', () => {
  // Mesma honestidade do selo da ficha: ele precisa saber o alcance disto
  // antes de escrever algo que não pode vazar.
  // O aviso é texto na tela do Mestre, então a quebra de linha do JSX
  // entra no meio dele — daí o \s+ em vez do espaço.
  const jsx = fonte('src/features/oneshot/EntregarBilhete.jsx');
  assert.match(jsx, /console\s+do navegador/);
  // E o limite fica escrito no módulo, em comentário, para quem for mexer
  // nisto depois. Sem `semComentarios`: é justamente o comentário que se
  // está exigindo.
  assert.match(fonte('src/features/oneshot/bilhete.mjs'), /segredo é de tela, não de cofre/);
});

/* ─── A encenação ─── */

test('o papel chega dobrado e exige o gesto de quebrar o lacre', () => {
  const css = semComentarios(fonte('src/features/oneshot/bilhete.css'));
  const jsx = semComentarios(fonte('src/features/oneshot/BilheteSecreto.jsx'));
  // Bilhete que aparece em texto é informação. Bilhete que sobe dobrado e
  // precisa de um gesto é objeto — e objeto a pessoa hesita antes de abrir.
  assert.match(jsx, /fase === 'dobrado'/);
  assert.match(jsx, /quebrarOLacre/);
  assert.match(css, /@keyframes bltSobe/);
  assert.match(css, /\.blt-dobra-cima\{[^}]*rotateX\(76deg\)/);
  assert.match(css, /\.blt-dobra-baixo\{[^}]*rotateX\(-80deg\)/);
  // E o lacre respira enquanto espera: é o único movimento na tela, então
  // é ele que diz onde tocar sem seta nem rótulo.
  assert.match(css, /\.blt\[data-fase="dobrado"\] \.blt-lacre\{animation:bltPulsa/);
});

test('o texto só aparece depois que o papel abre', () => {
  const css = semComentarios(fonte('src/features/oneshot/bilhete.css'));
  assert.match(css, /\.blt-texto\{[^}]*opacity:0/);
  assert.match(css, /\.blt\[data-fase="aberto"\] \.blt-texto\{opacity:1\}/);
  // Frase a frase, no passo de quem lê.
  assert.match(css, /animation-delay:calc\(var\(--n\) \* \.42s\)/);
});

test('quem desligou movimento recebe o bilhete legível', () => {
  const css = semComentarios(fonte('src/features/oneshot/bilhete.css'));
  // A encenação se perde e tudo bem; a informação é o que não pode faltar.
  assert.match(css, /html\[data-motion="reduced"\] \.blt-texto\{opacity:1\}/);
  assert.match(css, /html\[data-motion="reduced"\][^{]*\.blt-papel[^{]*\{[^}]*transform:none/);
  assert.ok(!/prefers-reduced-motion/.test(css));
});

test('o papel lido vai para o bolso em vez de sumir', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/BilheteSecreto.jsx'));
  // Reler é onde a decisão acontece: a pessoa volta ao papel antes de
  // resolver se conta aos outros.
  assert.match(jsx, /blt-bolso/);
  assert.match(jsx, /\{!lendo && meus\.length > 0 &&/);
});

test('trocar de ficha larga o papel, e a tela confere de novo', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/BilheteSecreto.jsx'));
  /* Achado no navegador: o bilhete era de um primo, a tela passou para
     outro e o papel continuou aberto na frente dele — `lendo` é estado do
     componente e sobrevive à troca. Quem entra olhando pode ter mais de
     uma ficha na mão, então isso acontece de verdade.

     É a única regra em que esta mecânica se apoia, por isso são DUAS
     travas: limpar ao trocar, e conferir o destinatário na hora de
     desenhar. Uma trava só, numa coisa dessas, é trava nenhuma. */
  assert.match(jsx, /useEffect\(\(\) => \{ setLendo\(null\);[^}]*\}, \[sheetId\]\);/);
  assert.match(jsx, /const meuMesmo = lendo && String\(lendo\.para\) === String\(sheetId \|\| ''\)/);
  assert.match(jsx, /\{meuMesmo && \(/);
  // E nada desenha a partir de `lendo` sem passar por essa conferência.
  assert.ok(!/\{lendo && \(/.test(jsx), 'sobrou um caminho que desenha sem conferir o dono');
});
