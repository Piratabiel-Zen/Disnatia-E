/**
 * O LIVRO DA NOITE
 *
 * As regras viraram capítulos numerados, lidos um por vez, com índice e
 * gravura. O que estes testes guardam é que o livro continua SERVINDO À
 * MESA: um livro bonito que não deixa achar "quanto é pavor máximo" no meio
 * da cena é pior que a lista feia de antes.
 *
 * Por isso a busca é tratada aqui como funcionalidade, e não como enfeite:
 * é ela que cobre o caso de consulta, que era o motivo de antes tudo ficar
 * aberto.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import { SECOES_DAS_REGRAS, buscarNasRegras } from '../src/features/oneshot/regrasOneShot.mjs';
import { EMBLEMAS, TEM_EMBLEMA } from '../src/features/oneshot/emblemasDasRegras.mjs';

const fonte = c => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8');

test('todo capítulo tem ordem, numeral, gravura e abertura', () => {
  for (const s of SECOES_DAS_REGRAS) {
    assert.ok(Number.isInteger(s.ordem) && s.ordem > 0, `${s.id} sem ordem`);
    assert.ok(s.numeral?.trim(), `${s.id} sem numeral`);
    assert.ok(s.abertura?.trim(), `${s.id} sem linha de abertura`);
    assert.ok(TEM_EMBLEMA(s.emblema), `${s.id} aponta para a gravura "${s.emblema}", que não existe`);
  }
});

test('a ordem é uma sequência sem buraco nem repetição', () => {
  // Numeral repetido ou ordem furada deixa o índice mentindo sobre onde a
  // pessoa está.
  const ordens = SECOES_DAS_REGRAS.map(s => s.ordem).sort((a, b) => a - b);
  assert.deepEqual(ordens, ordens.map((_, i) => i + 1));
  const numerais = SECOES_DAS_REGRAS.map(s => s.numeral);
  assert.equal(new Set(numerais).size, numerais.length, 'há numeral repetido');
});

test('toda gravura tem traço, e nenhuma vem de fora', () => {
  /* Imagem externa pisca ou falha e deixa o capítulo com um buraco; e todo
     host novo que entrou neste projeto quebrou alguma coisa. */
  for (const [nome, tracos] of Object.entries(EMBLEMAS)) {
    assert.ok(Array.isArray(tracos) && tracos.length, `a gravura ${nome} está vazia`);
  }
  const mjs = semComentarios(fonte('src/features/oneshot/emblemasDasRegras.mjs'));
  assert.ok(!/https?:\/\/|\.png|\.jpg|\.webp/.test(mjs), 'entrou imagem externa nas gravuras');
});

test('a busca continua achando o que a mesa procura no meio da cena', () => {
  /* Este é o caso que o livro NÃO pode ter quebrado: antes tudo ficava
     aberto justamente para o Mestre achar um número de relance. Agora quem
     cobre isso é a busca, então ela é funcionalidade e não enfeite. */
  const pavor = buscarNasRegras('pavor');
  assert.ok(pavor.length > 0, 'procurar "pavor" não acha nada');
  const talento = buscarNasRegras('talento');
  assert.ok(talento.length > 0, 'procurar "talento" não acha nada');
  // E a busca varre o corpo, não só os títulos.
  const corpo = buscarNasRegras('natural');
  assert.ok(corpo.length > 0, 'a busca deixou de olhar o corpo dos capítulos');
});

test('a página tem os dois modos, e procurar achata o livro', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/RegrasOneShotPage.jsx'));
  assert.match(jsx, /data-modo=\{termo \? 'procurando' : 'lendo'\}/);
  // Procurando mostra todos os achados de uma vez, de todos os capítulos.
  assert.match(jsx, /achados\.map\(secao =>/);
  // Lendo mostra um capítulo e o índice.
  assert.match(jsx, /osr-indice/);
  assert.match(jsx, /osr-capitulo/);
});

test('o índice diz onde a pessoa está e o que já passou', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/RegrasOneShotPage.jsx'));
  assert.match(jsx, /data-atual=/);
  assert.match(jsx, /data-lido=/);
  const css = semComentarios(fonte('src/features/oneshot/regras-one-shot.css'));
  assert.match(css, /button\[data-atual\]/);
  assert.match(css, /button\[data-lido\]/);
});

test('clicar num achado leva ao capítulo e limpa a busca', () => {
  // Senão a pessoa clica, o livro abre atrás da lista de achados, e parece
  // que o clique não fez nada.
  const jsx = semComentarios(fonte('src/features/oneshot/RegrasOneShotPage.jsx'));
  const ir = jsx.match(/const irPara = id => \{[\s\S]*?\};/)[0];
  assert.match(ir, /setAbertoId\(id\)/);
  assert.match(ir, /setBusca\(''\)/);
});

test('no celular o índice não empurra o capítulo para baixo da dobra', () => {
  const css = semComentarios(fonte('src/features/oneshot/regras-one-shot.css'));
  const estreito = css.match(/@media\(max-width:860px\)\{[\s\S]*?\n\}/);
  assert.ok(estreito, 'sumiu a regra de tela estreita do livro');
  assert.match(estreito[0], /grid-auto-flow:column/);
});

test('a capitular aparece uma vez por capítulo, não em todo parágrafo', () => {
  // Em todos, viraria enfeite repetido.
  const css = semComentarios(fonte('src/features/oneshot/regras-one-shot.css'));
  assert.match(css, /\.osr-corpo p:first-child::first-letter/);
  assert.ok(!/\.osr-corpo p::first-letter\{/.test(css));
});
