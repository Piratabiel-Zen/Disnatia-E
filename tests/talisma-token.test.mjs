// A BARRA DE TALISMÃ SOBRE O TOKEN
//
// No CAIN não existe ponto de vida, então a barra do token não pode ser a de
// HP. O que ela precisa mostrar, e que a barra de HP não sabe mostrar, é a
// caixa PERDIDA: quando o talismã de um exorcista enche, ele zera e nasce com
// uma caixa a menos. A barra volta a crescer, mas nunca até onde estava.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAIXAS_DO_EXORCISTA, caixasDoTalisma, resumoDoTalisma,
  talismaDoExorcista, talismaDoPecado, talismaDoToken,
} from '../src/features/mapa-batalha/talismaDeToken.mjs';

const conta = (caixas, estado) => caixas.filter(c => c === estado).length;

test('exorcista inteiro: seis caixas, nenhuma cortada, nenhuma perdida', () => {
  const t = talismaDoExorcista({ estresse: 0, ferimentos: 0 });
  assert.equal(t.total, CAIXAS_DO_EXORCISTA);
  assert.equal(t.disponiveis, 6);
  assert.equal(t.perdidas, 0);
  assert.equal(t.cortes, 0);
  assert.deepEqual(caixasDoTalisma(t), Array(6).fill('vazia'));
});

test('cada ferimento apaga uma caixa do fim da fileira', () => {
  // É o ponto todo da barra: ela volta a crescer, mas menor, e a mesa precisa
  // ver de relance que aquele exorcista está se gastando.
  const t = talismaDoExorcista({ estresse: 2, ferimentos: 2 });
  assert.equal(t.disponiveis, 4);
  assert.equal(t.perdidas, 2);
  const caixas = caixasDoTalisma(t);
  assert.equal(caixas.length, 6, 'a fileira mantém o tamanho; o que muda é o estado');
  assert.equal(conta(caixas, 'cortada'), 2);
  assert.equal(conta(caixas, 'vazia'), 2);
  assert.equal(conta(caixas, 'perdida'), 2);
  // As perdidas ficam no fim: um buraco no meio pareceria preenchível.
  assert.deepEqual(caixas.slice(-2), ['perdida', 'perdida']);
});

test('o corte nunca passa das caixas que ainda existem', () => {
  // Ficha com estresse antigo e ferimentos novos não desenha corte em caixa
  // que já foi embora.
  const t = talismaDoExorcista({ estresse: 99, ferimentos: 2 });
  assert.equal(t.cortes, 4);
  assert.equal(conta(caixasDoTalisma(t), 'cortada'), 4);
});

test('nem todos os ferimentos do mundo apagam a fileira inteira', () => {
  const t = talismaDoExorcista({ estresse: 0, ferimentos: 50 });
  assert.ok(t.disponiveis >= 1, 'sempre sobra uma caixa para desenhar');
  assert.equal(caixasDoTalisma(t).length, CAIXAS_DO_EXORCISTA);
});

test('à beira da morte a barra avisa', () => {
  assert.equal(talismaDoExorcista({ estresse: 1, ferimentos: 1 }).critico, false);
  assert.equal(talismaDoExorcista({ estresse: 1, ferimentos: 3 }).critico, true);
});

test('o talismã do Pecado vem do tamanho dele, não de um número fixo', () => {
  // Um Ogro de quatro cortes e um Lorde de oito não desenham a mesma fileira.
  const ogro = talismaDoPecado({ talisma: 4, talismaCortes: 1 });
  const lorde = talismaDoPecado({ talisma: 8, talismaCortes: 1 });
  assert.equal(caixasDoTalisma(ogro).length, 4);
  assert.equal(caixasDoTalisma(lorde).length, 8);
});

test('Pecado com talismã cheio fica em estado crítico: dá para executar', () => {
  // Cheio não é morto — é a hora em que a execução passa a ser possível, e é
  // a deixa da cena.
  assert.equal(talismaDoPecado({ talisma: 4, talismaCortes: 3 }).critico, false);
  assert.equal(talismaDoPecado({ talisma: 4, talismaCortes: 4 }).critico, true);
});

test('Pecado sem talismã declarado não quebra a tela', () => {
  const t = talismaDoPecado({});
  assert.ok(t.total >= 1);
  assert.equal(caixasDoTalisma(t).length, t.total);
});

test('o token acha o corpo dele entre fichas e Pecados', () => {
  const fichas = [{ id: 'f1', estresse: 3, ferimentos: 1 }];
  const pecados = [{ id: 'p1', talisma: 5, talismaCortes: 2 }];

  const doExorcista = talismaDoToken({ sheetId: 'f1' }, { fichas, pecados });
  assert.equal(doExorcista.tipo, 'exorcista');
  assert.equal(doExorcista.cortes, 3);

  const doPecado = talismaDoToken({ enemyId: 'p1' }, { fichas, pecados });
  assert.equal(doPecado.tipo, 'pecado');
  assert.equal(doPecado.cortes, 2);
});

test('token solto não ganha barra inventada', () => {
  // Desenhar uma fileira cheia para um token que não está ligado a nada seria
  // mentira na tela: a mesa leria "inteiro" onde não há corpo nenhum.
  assert.equal(talismaDoToken({ id: 't1' }, { fichas: [], pecados: [] }), null);
  assert.equal(talismaDoToken({ sheetId: 'nao-existe' }, { fichas: [{ id: 'f1' }] }), null);
  assert.equal(talismaDoToken(null), null);
  assert.deepEqual(caixasDoTalisma(null), []);
});

test('o resumo em texto conta as perdidas só quando há perdidas', () => {
  assert.equal(resumoDoTalisma(talismaDoExorcista({ estresse: 2, ferimentos: 0 })), '2/6');
  assert.equal(resumoDoTalisma(talismaDoExorcista({ estresse: 2, ferimentos: 1 })), '2/5 · 1 perdida');
  assert.equal(resumoDoTalisma(talismaDoExorcista({ estresse: 0, ferimentos: 2 })), '0/4 · 2 perdidas');
  assert.equal(resumoDoTalisma(null), '');
});
