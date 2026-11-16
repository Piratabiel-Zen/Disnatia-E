/* A FICHA DE EXORCISTA
   Várias regras do CAIN moram na ficha em vez de na cabeça do Mestre: duas
   perícias em 3 no máximo, estresse que vira ferimento e zera, gancho que
   precisa ser resolvido quando enche. Se a ficha não segurar isso, a mesa
   joga errado sem perceber. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAIXAS_DE_GANCHO, MAX_ESTRESSE, MAX_FERIMENTOS, MAX_PECADO, MAX_PERICIA,
  ajustarPericia, condicoesDaFicha, cortarGancho, estadoDoExorcista, fichaNova,
  ganharFerimento, gastarPulso, marcarEstresse, marcarPecado, marcarXP,
  periciasNoMaximo, podeSubirPericia, resolverGancho,
} from '../src/features/cain/fichaCain.mjs';

test('ficha nova nasce zerada, com os três pulsos de início de caçada', () => {
  const f = fichaNova('x1');
  assert.equal(f.sistema, 'cain');
  assert.equal(f.estresse, 0);
  assert.equal(f.ferimentos, 0);
  // São três, não quatro: toda caçada começa com três pulsos psíquicos. A
  // quarta caixa existe porque habilidades podem passar disso.
  assert.equal(f.pulsos, 3, 'a caçada começa com três pulsos psíquicos');
  assert.equal(f.psique, 1);
  assert.equal(Object.values(f.pericias).every(v => v === 0), true);
  assert.equal(f.ganchos.length, 3);
  assert.equal(f.segredos, '');
});

test('no máximo duas perícias em 3, e o jogador lê o porquê', () => {
  let f = fichaNova('x');
  f.pericias.forca = 3;
  f.pericias.atletismo = 3;
  assert.equal(periciasNoMaximo(f), 2);

  f.pericias.observacao = 2;
  const veredito = podeSubirPericia(f, 'observacao');
  assert.equal(veredito.pode, false);
  assert.match(veredito.motivo, /no máximo 2 perícias em 3/i, 'o motivo tem que ser legível');

  // E a subida é mesmo recusada, não só desenhada como recusada.
  assert.equal(ajustarPericia(f, 'observacao', 1).pericias.observacao, 2);

  // Liberando uma, a terceira sobe.
  f = ajustarPericia(f, 'forca', -1);
  assert.equal(podeSubirPericia(f, 'observacao').pode, true);
  assert.equal(ajustarPericia(f, 'observacao', 1).pericias.observacao, 3);
});

test('perícia não passa de 3 nem desce de 0', () => {
  let f = fichaNova('x');
  f = ajustarPericia(f, 'conexao', -5);
  assert.equal(f.pericias.conexao, 0);
  f = ajustarPericia(f, 'conexao', 9);
  assert.equal(f.pericias.conexao, MAX_PERICIA, 'o teto é 3');
});

test('delta grande não fura a trava das duas no topo', () => {
  // O caminho torto: duas perícias já em 3, e uma terceira recebe +9 de uma
  // vez. Conferindo só o passo, ela pularia de 0 para 3 sem passar pelo 2.
  let f = fichaNova('x');
  f.pericias.forca = 3;
  f.pericias.atletismo = 3;
  f = ajustarPericia(f, 'observacao', 9);
  assert.equal(f.pericias.observacao, MAX_PERICIA - 1, 'parou em 2, não virou a terceira no topo');
  assert.equal(periciasNoMaximo(f), 2);
});

test('estresse no limite vira ferimento e ZERA — é a parte que se esquece', () => {
  let f = fichaNova('x');
  f = marcarEstresse(f, MAX_ESTRESSE - 1);
  assert.equal(f.estresse, MAX_ESTRESSE - 1);
  assert.equal(f.ferimentos, 0);

  f = marcarEstresse(f, 1);
  assert.equal(f.ferimentos, 1, 'o limite virou ferimento');
  assert.equal(f.estresse, 0, 'e o estresse limpou');
  assert.ok(f.condicoes.includes('ferido'));
});

test('ferimento dá piedade, e o terceiro leva à beira da morte', () => {
  let f = fichaNova('x');
  f = ganharFerimento(f);
  assert.equal(f.piedade, 1, 'sofrer ferimento dá piedade, pelo livro');
  f = ganharFerimento(f);
  f = ganharFerimento(f);
  assert.equal(f.ferimentos, MAX_FERIMENTOS);
  assert.ok(f.condicoes.includes('beira-da-morte'));
  assert.equal(f.piedade, 3, 'e a piedade para em 3');
});

test('pecado no limite marca que o exorcista verte no fim da cena', () => {
  let f = marcarPecado(fichaNova('x'), MAX_PECADO);
  assert.ok(f.condicoes.includes('vertendo'));
  // E sair do limite tira a marca.
  f = marcarPecado(f, -2);
  assert.ok(!f.condicoes.includes('vertendo'));
});

test('pulso psíquico acaba, e a recusa vem com motivo', () => {
  let f = fichaNova('x');
  for (let i = 0; i < 4; i += 1) f = gastarPulso(f).ficha;
  assert.equal(f.pulsos, 0);
  const r = gastarPulso(f);
  assert.equal(r.gastou, false);
  assert.match(r.motivo, /pulsos/i);
  assert.equal(r.ficha.pulsos, 0, 'não fica negativo');
});

test('gancho enche, avisa, dá piedade e pode ser resolvido', () => {
  let f = fichaNova('x');
  f.ganchos[0].nome = 'Deve um favor ao Diretor';
  let encheu = false;
  for (let i = 0; i < CAIXAS_DE_GANCHO; i += 1) {
    const r = cortarGancho(f, 0);
    f = r.ficha; encheu = r.encheu;
  }
  assert.equal(encheu, true, 'a tela precisa saber na hora que encheu');
  assert.equal(f.ganchos[0].cortes, CAIXAS_DE_GANCHO);
  assert.equal(f.piedade, 1, 'encher um gancho dá piedade');

  f = resolverGancho(f, 0);
  assert.equal(f.ganchos[0].cortes, 0);
  assert.equal(f.ganchos[0].nome, '', 'apagado e livre para outro');
  // Os outros ganchos não foram tocados.
  assert.equal(f.ganchos[1].cortes, 0);
});

test('cada 4 de XP vira um avanço', () => {
  let f = fichaNova('x');
  f = marcarXP(f, 3);
  assert.equal(f.avancos, 0);
  assert.equal(f.xp, 3);
  f = marcarXP(f, 1);
  assert.equal(f.avancos, 1);
  assert.equal(f.xp, 0, 'o contador recomeça');
  f = marcarXP(f, 8);
  assert.equal(f.avancos, 3);
});

test('o estado em uma linha prioriza o que é mais grave', () => {
  assert.equal(estadoDoExorcista(fichaNova('x')).chave, 'inteiro');
  assert.equal(estadoDoExorcista({ estresse: 5 }).chave, 'no-limite');
  assert.equal(estadoDoExorcista({ ferimentos: 1 }).chave, 'ferido');
  assert.equal(estadoDoExorcista({ condicoes: ['vertendo'] }).chave, 'vertendo');
  // À beira da morte vence tudo: é a informação que decide o turno.
  assert.equal(estadoDoExorcista({ ferimentos: 3, condicoes: ['beira-da-morte', 'vertendo'] }).chave, 'beira-da-morte');
  for (const f of [{}, null, undefined]) assert.equal(estadoDoExorcista(f).chave, 'inteiro');
});

test('as condições vêm com nome e cor, para a tela não procurar', () => {
  const lista = condicoesDaFicha({ condicoes: ['ferido', 'vertendo', 'inventada'] });
  assert.equal(lista.length, 2, 'condição inventada é descartada');
  assert.ok(lista.every(c => c.nome && /^#[0-9A-F]{6}$/i.test(c.cor)));
});
