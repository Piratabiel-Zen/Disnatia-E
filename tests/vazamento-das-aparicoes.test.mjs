/**
 * O VAZAMENTO DAS APARIÇÕES
 *
 * Gabriel testou na mesa e viu: a aparição marcada como "ninguém" aparecia
 * para todos. A tela filtrava, o banco não — `aparicoes` era uma coleção
 * "da mesa comum", que nas regras quer dizer "qualquer membro lê tudo".
 * Esconder no JavaScript não esconde nada: quem abre o devtools vê o
 * snapshot inteiro, com as seis aparições que o Mestre ainda está montando.
 *
 * Estes testes prendem as duas pontas: a regra que faz o banco recusar, e a
 * tela que para de pedir o que não é dela.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TIPOS_DE_APARICAO, ALCANCES, comAlcance, quemVe, alternarPessoa,
} from '../src/features/oneshot/aparicoes.mjs';

const ler = rel => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('as regras tratam aparições como material liberado por pessoa', () => {
  const regras = ler('../firestore.rules');
  const seletivo = regras.slice(
    regras.indexOf('function acessoSeletivo'),
    regras.indexOf('function daMesaComum'),
  );
  assert.match(seletivo, /c__\[a-z0-9-\]\+__aparicoes/,
    'aparicoes não entrou em acessoSeletivo — segue aberta à mesa inteira');

  // E o bloco que concede a leitura precisa exigir liberação, não só mesa.
  const concessao = regras.slice(regras.indexOf('// Documentos liberados por pessoa'));
  assert.match(concessao, /c__\[a-z0-9-\]\+__aparicoes/);
  assert.match(concessao, /liberadoParaTodos/);
  assert.match(concessao, /liberadoPara/);
});

test('uma coleção protege os seis tipos de uma vez', () => {
  // O tipo é campo do documento, não coleção. É o que faz a regra única
  // valer para criatura, cenário, item, página, símbolo e vulto.
  assert.deepEqual(TIPOS_DE_APARICAO.map(t => t.id),
    ['criatura', 'cenario', 'item', 'pagina', 'simbolo', 'vulto']);
  const fonte = ler('../src/features/oneshot/aparicoes.mjs');
  for (const tipo of TIPOS_DE_APARICAO) {
    assert.ok(!fonte.includes(`'aparicoes_${tipo.id}'`),
      `${tipo.id} em coleção separada escaparia da regra`);
  }
});

test('"ninguém" não libera para ninguém, em nenhum tipo', () => {
  for (const tipo of TIPOS_DE_APARICAO) {
    // A plateia já escolhida é o caso perigoso: o Mestre aponta duas pessoas,
    // muda de ideia e volta para "ninguém". Se a lista sobrevivesse, o
    // alcance diria uma coisa e o banco entregaria outra.
    const escolhida = { tipo: tipo.id, titulo: 'x', plateia: ['abc', 'def'] };
    const guardada = comAlcance(escolhida, 'ninguem');
    assert.equal(guardada.liberadoParaTodos, false, tipo.id);
    assert.deepEqual(guardada.liberadoPara, [], tipo.id);
    assert.match(quemVe(guardada), /^Ninguém/, tipo.id);
  }
});

test('só "a mesa" liga o liberadoParaTodos', () => {
  for (const alcance of ALCANCES) {
    const r = comAlcance({ titulo: 'x', plateia: ['uid-1'] }, alcance.id);
    assert.equal(r.liberadoParaTodos, alcance.id === 'mesa', alcance.id);
    assert.deepEqual(r.liberadoPara, alcance.id === 'alguns' ? ['uid-1'] : [], alcance.id);
  }
});

test('apontar uma pessoa entrega a ela, e só a ela', () => {
  const um = alternarPessoa({ titulo: 'x' }, 'uid-1');
  assert.equal(um.alcance, 'alguns');
  assert.deepEqual(um.liberadoPara, ['uid-1']);
  assert.equal(um.liberadoParaTodos, false);

  const dois = alternarPessoa(um, 'uid-2');
  assert.deepEqual(dois.liberadoPara, ['uid-1', 'uid-2']);

  // Tirar o último volta a fechar: lista vazia com alcance "alguns" seria um
  // estado que não quer dizer nada e que a regra leria como "ninguém" mesmo.
  const nenhum = alternarPessoa(alternarPessoa(dois, 'uid-1'), 'uid-2');
  assert.equal(nenhum.alcance, 'ninguem');
  assert.deepEqual(nenhum.liberadoPara, []);
});

test('o mapa só pede a coleção inteira quando é o Mestre olhando', () => {
  const pagina = ler('../src/features/mapa-batalha/BattleMapPage.jsx');
  const i = pagina.indexOf("onSnapshot(col('aparicoes')");
  assert.ok(i > 0, 'a leitura mudou de forma — reveja esta guarda');
  // A guarda tem de vir ANTES da assinatura, no mesmo efeito.
  const efeito = pagina.slice(pagina.lastIndexOf('useEffect(', i), i);
  assert.match(efeito, /!masterMode/, 'jogador ainda assina a coleção inteira');
  // E masterMode tem de estar nas dependências, senão quem vira Mestre no
  // meio da noite não recebe nada e quem deixa de ser continua recebendo.
  const depois = pagina.slice(i, i + 400);
  assert.match(depois, /\[ehNoite, masterMode\]/);
});

test('a página de aparições do jogador lê só o que foi liberado', () => {
  const pagina = ler('../src/features/oneshot/AparicoesPage.jsx');
  assert.match(pagina, /observarLiberados\('aparicoes'/);
  // Fichas e mural são da mesa por natureza e seguem lidos direto; o que
  // não pode voltar é a leitura crua das aparições.
  assert.ok(!/col\(\s*'aparicoes'/.test(pagina),
    'voltou a ler aparicoes direto, sem o filtro de liberação');
});
