/* OS DOCUMENTOS
   O Mestre prepara a reviravolta com semanas de antecedência e guarda. O
   engano barato aqui — liberar cedo demais — não tem desfazer: a mesa já leu.
   Então o padrão é fechado, e estes testes seguram isso. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TIPOS_DE_DOCUMENTO, alternarPessoa, anotar, buscarDocumentos,
  compartilharComAMesa, documentoNovo, guardar, liberarParaTodos,
  notaDe, ordenarParaJogador, ordenarParaMestre, tipoDoDocumento,
} from '../src/features/documentos/documentos.mjs';
import { documentosVisiveis, podeVerDocumento } from '../src/core/acesso.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join as joinPath } from 'node:path';

const mestre = { uid: 'm1', papel: 'mestre' };
const ana = { uid: 'a1', papel: 'jogador' };
const beto = { uid: 'b1', papel: 'jogador' };

test('documento novo nasce guardado', () => {
  const d = documentoNovo({ id: 'd1' });
  assert.equal(d.liberadoParaTodos, false);
  assert.deepEqual(d.liberadoPara, []);
  assert.equal(podeVerDocumento(d, ana), false);
  assert.equal(podeVerDocumento(d, mestre), true);
});

test('tipo inventado vira carta em vez de quebrar a tela', () => {
  assert.equal(documentoNovo({ id: 'x', tipo: 'pergaminho-mágico' }).tipo, 'carta');
  assert.equal(tipoDoDocumento({ tipo: 'nada' }).id, 'carta');
  for (const t of TIPOS_DE_DOCUMENTO) assert.ok(t.nome && t.icone && t.resumo);
});

test('liberar para alguém e liberar para a mesa são excludentes', () => {
  // Deixar os dois ligados faz a tela mentir sobre quem está vendo.
  let d = liberarParaTodos(documentoNovo({ id: 'd1' }));
  assert.equal(d.liberadoParaTodos, true);
  d = alternarPessoa(d, 'a1');
  assert.equal(d.liberadoParaTodos, false, 'escolher uma pessoa tira o "para todos"');
  assert.deepEqual(d.liberadoPara, ['a1']);
});

test('alternar pessoa liga e desliga', () => {
  let d = documentoNovo({ id: 'd1' });
  d = alternarPessoa(d, 'a1');
  d = alternarPessoa(d, 'b1');
  assert.deepEqual(d.liberadoPara, ['a1', 'b1']);
  d = alternarPessoa(d, 'a1');
  assert.deepEqual(d.liberadoPara, ['b1']);
  assert.equal(podeVerDocumento(d, ana), false);
  assert.equal(podeVerDocumento(d, beto), true);
});

test('guardar de volta fecha para todo mundo menos o Mestre', () => {
  let d = liberarParaTodos(documentoNovo({ id: 'd1' }));
  d = guardar(d);
  assert.equal(podeVerDocumento(d, ana), false);
  assert.equal(podeVerDocumento(d, beto), false);
  assert.equal(podeVerDocumento(d, mestre), true);
});

test('quem recebeu pode passar adiante, e fica registrado quem passou', () => {
  let d = alternarPessoa(documentoNovo({ id: 'd1' }), 'a1');
  assert.equal(podeVerDocumento(d, beto), false);
  d = compartilharComAMesa(d, 'a1');
  assert.equal(podeVerDocumento(d, beto), true);
  // Numa investigação importa quem contou.
  assert.equal(d.compartilhadoPor, 'a1');
});

test('as anotações são de cada um', () => {
  let d = documentoNovo({ id: 'd1' });
  d = anotar(d, 'a1', 'A letra é da mesma mão da carta anterior.');
  d = anotar(d, 'b1', 'Não confio nisso.');
  assert.match(notaDe(d, 'a1'), /mesma mão/);
  assert.match(notaDe(d, 'b1'), /Não confio/);
  assert.equal(notaDe(d, 'm1'), '');
  // Apagar a anotação some com ela, não guarda string vazia.
  d = anotar(d, 'b1', '   ');
  assert.equal('b1' in d.notas, false);
});

test('o Mestre vê primeiro o que ainda não entregou', () => {
  // Ele abre esta aba para liberar algo, não para reler o que a mesa já tem.
  const docs = [
    { ...documentoNovo({ id: 'aberto' }), liberadoParaTodos: true, criadoEm: 3 },
    { ...documentoNovo({ id: 'guardado' }), criadoEm: 2 },
    { ...documentoNovo({ id: 'parcial' }), liberadoPara: ['a1'], criadoEm: 1 },
  ];
  assert.deepEqual(ordenarParaMestre(docs).map(d => d.id), ['guardado', 'parcial', 'aberto']);
  // Para o jogador, o que acabou de chegar.
  assert.deepEqual(ordenarParaJogador(docs).map(d => d.id), ['aberto', 'guardado', 'parcial']);
});

test('a lista do jogador nunca inclui o que ele não pode ver', () => {
  const docs = [
    { ...documentoNovo({ id: '1' }), liberadoParaTodos: true },
    { ...documentoNovo({ id: '2' }), liberadoPara: ['a1'] },
    { ...documentoNovo({ id: '3' }) },
  ];
  assert.deepEqual(documentosVisiveis(docs, ana).map(d => d.id), ['1', '2']);
  assert.deepEqual(documentosVisiveis(docs, beto).map(d => d.id), ['1']);
  assert.equal(documentosVisiveis(docs, mestre).length, 3);
});

test('a busca ignora acento e caixa', () => {
  const docs = [{ ...documentoNovo({ id: '1', titulo: 'Relatório de necrópsia' }), procedencia: 'Arsenale' }];
  assert.equal(buscarDocumentos(docs, 'relatorio').length, 1);
  assert.equal(buscarDocumentos(docs, 'ARSENALE').length, 1);
  assert.equal(buscarDocumentos(docs, 'nada').length, 0);
  assert.equal(buscarDocumentos(docs, '').length, 1, 'busca vazia devolve tudo');
});

/* ─────────────────── quem recebe sai das fichas ─────────────────── */

test('a lista de quem recebe é montada a partir das fichas, não de uma lista de contas', () => {
  // A versão anterior lia uma coleção de espelho de membros que nunca era
  // escrita por ninguém — então a lista aparecia sempre vazia e o Mestre não
  // conseguia liberar nada para uma pessoa só. A fonte certa é a ficha: é
  // nela que o Mestre escreve o nome do personagem e escolhe o dono.
  const pagina = readFileSync(
    joinPath(dirname(fileURLToPath(import.meta.url)), '..', 'src/features/documentos/DocumentosPage.jsx'),
    'utf8',
  );
  assert.ok(!pagina.includes('__membros_espelho'),
    'a coleção de espelho não era escrita por ninguém: a lista ficava vazia');
  assert.ok(pagina.includes("col('fichas')"), 'a lista vem das fichas da mesa');
});

test('liberar por ficha continua gravando o dono, que é o que o servidor confere', () => {
  // A tela mostra o nome do personagem; o que vai para o banco é o uid do
  // dono. Tem que ser assim: firestore.rules compara com request.auth.uid, e
  // não tem como saber que "Álvaro" é a conta de alguém.
  const ficha = { id: 'f1', nome: 'Álvaro', dono: 'a1' };
  const d = alternarPessoa(documentoNovo({ id: 'd9' }), ficha.dono);
  assert.deepEqual(d.liberadoPara, ['a1']);
  assert.equal(podeVerDocumento(d, ana), true);
  assert.equal(podeVerDocumento(d, beto), false);
});
