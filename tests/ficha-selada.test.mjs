/**
 * A FICHA DO OUTRO EXORCISTA NÃO ABRE
 *
 * No CAIN o esquadrão se vê mas não se lê: a fileira mostra que as fichas
 * existem, com nome e estado, e abrir a de outra pessoa devolve o selo de
 * acesso restrito. Antes a ficha alheia abria inteira em modo leitura —
 * perícias, blasfêmia, bagagem e marcas de pecado à vista da mesa toda.
 *
 * Vale lembrar o alcance disto: é a TELA que recusa. O servidor continua
 * entregando as fichas da mesa a qualquer membro, porque separar isso nas
 * regras exige guardar nome e corpo da ficha em documentos diferentes — uma
 * consulta no Firestore falha inteira se um só documento da lista for negado.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { podeAbrirFicha, podeEditarFicha } from '../src/core/acesso.mjs';

const admin = { uid: 'u-admin', papel: 'mestre' };
const dono = { uid: 'u-dono', papel: 'jogador' };
const outro = { uid: 'u-outro', papel: 'jogador' };
const ficha = { id: 'f1', dono: 'u-dono' };
const rascunho = { id: 'f2', dono: '' };

test('o Admin abre qualquer ficha', () => {
  assert.equal(podeAbrirFicha(ficha, admin), true);
  assert.equal(podeAbrirFicha(rascunho, admin), true);
});

test('o jogador abre a própria e nenhuma outra', () => {
  assert.equal(podeAbrirFicha(ficha, dono), true);
  assert.equal(podeAbrirFicha(ficha, outro), false);
});

test('o rascunho do Admin não abre para jogador nenhum', () => {
  // Ficha sem dono é personagem que o Admin ainda está montando. Se ela
  // abrisse, o primeiro que clicasse leria o exorcista preparado para outro.
  assert.equal(podeAbrirFicha(rascunho, dono), false);
  assert.equal(podeAbrirFicha(rascunho, outro), false);
});

test('quem entrou pela senha da ficha abre aquela ficha', () => {
  // A segunda chave: conta amarrada pelo Admin, ou senha da ficha na porta.
  assert.equal(podeAbrirFicha(ficha, outro, 'f1'), true);
  assert.equal(podeAbrirFicha(ficha, outro, 'f9'), false);
});

test('sem membro, nada abre', () => {
  assert.equal(podeAbrirFicha(ficha, null), false);
  assert.equal(podeAbrirFicha(ficha, undefined, 'f1'), false);
});

test('abrir e editar andam juntos: ninguém edita o que não abre', () => {
  for (const [f, m, lib] of [[ficha, dono, ''], [ficha, outro, ''], [rascunho, dono, ''],
                             [ficha, outro, 'f1'], [rascunho, admin, '']]) {
    if (podeEditarFicha(f, m, lib)) {
      assert.equal(podeAbrirFicha(f, m, lib), true,
        'existe ficha editável que não abre — a tela travaria numa edição invisível');
    }
  }
});

test('a tela de fichas usa o selo e não abre a ficha alheia em leitura', () => {
  const pagina = readFileSync(new URL('../src/features/cain/FichasCainPage.jsx', import.meta.url), 'utf8');
  assert.match(pagina, /SeloDeAcessoRestrito/, 'o selo saiu da tela de fichas');
  assert.match(pagina, /podeAbrirFicha\(ficha, membro, playerSheetId\)/,
    'o clique no cartão voltou a abrir sem conferir o acesso');
  assert.ok(!/Você está lendo, não editando/.test(pagina),
    'a ficha alheia voltou a abrir em modo leitura');
  // O cartão continua na fileira: ver que o colega existe é informação de mesa.
  assert.match(pagina, /registro-cartao/, 'a fileira de fichas sumiu');
});

test('o selo diz exatamente o que foi pedido, em prata', () => {
  const selo = readFileSync(new URL('../src/features/cain/SeloDeAcessoRestrito.jsx', import.meta.url), 'utf8');
  assert.match(selo, />Acesso restrito</);
  assert.match(selo, />Exorcista divergente</);
  const estilo = readFileSync(new URL('../src/features/cain/selo-restrito.css', import.meta.url), 'utf8');
  assert.match(estilo, /#E2E8F0/, 'a prata do título saiu');
  // Tremor é informação; quem pediu menos movimento recebe o selo parado.
  assert.match(estilo, /data-motion="reduced"\] \.registro-tremendo\{animation:none\}/);
});
