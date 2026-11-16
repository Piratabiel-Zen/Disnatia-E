/* QUEM VÊ O QUÊ
   O Mestre vai guardar documentos para liberar na hora certa, e um deles vai
   ser a reviravolta da campanha. Se esta lógica errar, o erro tem nome:
   mostrar ao jogador o que ainda não era para ele ver. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PAPEIS, documentosVisiveis, ehMestre, normalizarPapel, podeEditarFicha,
  podeNaMesa, podeVerDocumento, podeVerSegredosDaFicha, resumoDaLiberacao,
} from '../src/core/acesso.mjs';

const mestre = { uid: 'm1', papel: 'mestre' };
const ana = { uid: 'a1', papel: 'jogador' };
const beto = { uid: 'b1', papel: 'jogador' };

test('papel desconhecido vira jogador, nunca mestre', () => {
  assert.equal(normalizarPapel('mestre'), 'mestre');
  assert.equal(normalizarPapel('admin'), 'jogador');
  assert.equal(normalizarPapel(undefined), 'jogador');
  assert.equal(normalizarPapel('MESTRE'), 'jogador', 'nada de promoção por maiúscula');
  assert.deepEqual(PAPEIS, ['mestre', 'jogador']);
});

test('documento sem nada marcado fica guardado: o padrão é fechado', () => {
  const guardado = { id: 'd1' };
  assert.equal(podeVerDocumento(guardado, ana), false);
  assert.equal(podeVerDocumento(guardado, mestre), true, 'o Mestre vê o que preparou');
});

test('liberado para a mesa chega a todo membro', () => {
  const aberto = { id: 'd2', liberadoParaTodos: true };
  assert.equal(podeVerDocumento(aberto, ana), true);
  assert.equal(podeVerDocumento(aberto, beto), true);
});

test('liberado para alguém chega só a esse alguém', () => {
  const carta = { id: 'd3', liberadoPara: ['a1'] };
  assert.equal(podeVerDocumento(carta, ana), true);
  assert.equal(podeVerDocumento(carta, beto), false);
  assert.equal(podeVerDocumento(carta, mestre), true);
});

test('sem estar logado não se vê nada, nem o que está aberto', () => {
  assert.equal(podeVerDocumento({ liberadoParaTodos: true }, null), false);
  assert.equal(podeVerSegredosDaFicha({ dono: 'a1' }, null), false);
  assert.equal(podeEditarFicha({}, null), false);
  assert.equal(podeNaMesa(null, 'criar-ficha'), false);
});

test('lixo no lugar da lista não abre o documento', () => {
  assert.equal(podeVerDocumento({ liberadoPara: 'a1' }, ana), false, 'string não é lista');
  assert.equal(podeVerDocumento({ liberadoParaTodos: 'sim' }, ana), false, 'só true vale');
  assert.equal(podeVerDocumento({ liberadoParaTodos: 1 }, ana), false);
  assert.equal(podeVerDocumento(null, ana), false);
});

test('os segredos da ficha são do dono e do Mestre', () => {
  const ficha = { id: 'f1', dono: 'a1' };
  assert.equal(podeVerSegredosDaFicha(ficha, ana), true);
  assert.equal(podeVerSegredosDaFicha(ficha, beto), false);
  assert.equal(podeVerSegredosDaFicha(ficha, mestre), true);
});

test('o jogador edita a própria ficha; a sem dono é de quem pegar', () => {
  assert.equal(podeEditarFicha({ dono: 'a1' }, ana), true);
  assert.equal(podeEditarFicha({ dono: 'a1' }, beto), false);
  assert.equal(podeEditarFicha({ dono: 'a1' }, mestre), true);
  assert.equal(podeEditarFicha({}, beto), true, 'ficha nova sem dono');
});

test('o que é do Mestre não é do jogador', () => {
  assert.equal(podeNaMesa(ana, 'liberar-documento'), false);
  assert.equal(podeNaMesa(ana, 'revelar-local'), false);
  assert.equal(podeNaMesa(ana, 'promover-membro'), false);
  assert.equal(podeNaMesa(mestre, 'liberar-documento'), true);
  // O que não está na lista o jogador faz: mover token, criar pista, anotar.
  assert.equal(podeNaMesa(ana, 'mover-token'), true);
  assert.equal(podeNaMesa(ana, 'criar-pista'), true);
});

test('a lista filtrada é o que a tela deve iterar', () => {
  const docs = [
    { id: '1', liberadoParaTodos: true },
    { id: '2', liberadoPara: ['a1'] },
    { id: '3', liberadoPara: ['b1'] },
    { id: '4' },
  ];
  assert.deepEqual(documentosVisiveis(docs, ana).map(d => d.id), ['1', '2']);
  assert.deepEqual(documentosVisiveis(docs, beto).map(d => d.id), ['1', '3']);
  assert.deepEqual(documentosVisiveis(docs, mestre).map(d => d.id), ['1', '2', '3', '4']);
  assert.deepEqual(documentosVisiveis(null, ana), []);
});

test('o Mestre lê num relance para quem cada documento foi', () => {
  const nomes = { a1: 'Ana', b1: 'Beto' };
  assert.equal(resumoDaLiberacao({ liberadoParaTodos: true }, nomes), 'Liberado para a mesa');
  assert.equal(resumoDaLiberacao({}, nomes), 'Guardado');
  assert.equal(resumoDaLiberacao({ liberadoPara: ['a1'] }, nomes), 'Só para Ana');
  assert.equal(resumoDaLiberacao({ liberadoPara: ['a1', 'b1'] }, nomes), 'Só para Ana e Beto');
});

/* As regras do servidor são a defesa de verdade. O módulo acima só evita que
   a tela ofereça o que o servidor vai negar. Então o arquivo precisa existir,
   e precisa manter as três decisões que sustentam o segredo. */
test('as regras do Firestore guardam a senha num lugar que ninguém lê', () => {
  const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  assert.match(regras, /match \/privado\/\{doc\}[\s\S]{0,80}allow read: if false/,
    'a senha da mesa voltou a ser legível pelo cliente');
  assert.match(regras, /request\.resource\.data\.senhaHash == senhaDaMesa\(cid\)/,
    'entrar na mesa deixou de exigir a senha certa');
  assert.match(regras, /allow update, delete: if mestre\(cid\)/,
    'alguém pode se promover a Mestre');
  assert.match(regras, /request\.auth\.uid in resource\.data\.get\('liberadoPara', \[\]\)/,
    'o servidor parou de filtrar documentos por pessoa');
});

test('as regras não trancam a Dinastia E no meio da campanha', () => {
  const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  // Dívida conhecida e declarada: os caminhos antigos continuam abertos até a
  // migração. Se este teste falhar, alguém trancou a mesa em andamento.
  for (const colecao of ['sheets', 'config', 'battlemaps', 'chronicles']) {
    assert.match(regras, new RegExp(`match /${colecao}/\\{doc=\\*\\*\\}\\s*\\{ allow read, write: if true`),
      `a coleção "${colecao}" da mesa em andamento ficaria inacessível`);
  }
  assert.match(regras, /dívida conhecida/i, 'a dívida deixou de estar declarada no arquivo');
});
