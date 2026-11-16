// O CORPO DO EXORCISTA, PELO LIVRO
//
// A primeira versão da ficha tratava o estresse como uma barra de 6 que
// virava ferimento e zerava. Faltavam três regras, e as três mudam a mesa:
// o talismã encolhe a cada ferimento, o estresse que sobra transborda para o
// talismã novo, e o gancho tem três traços e não quatro.
//
// Sem o encolhimento, o segundo ferimento custa exatamente o mesmo que o
// primeiro e um exorcista moído aguenta tanto quanto um inteiro. Sem o
// transbordo, um golpe de 6 e um arranhão custam a mesma coisa. São os dois
// lugares onde uma cena de conflito ganha peso — então são os dois que
// precisam de teste.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAIXAS_DE_GANCHO, MAX_ESTRESSE, MAX_FERIMENTOS, PULSOS_INICIAIS,
  cortarGancho, estadoDoExorcista, estresseMaximo, fichaNova,
  ganharFerimento, marcarEstresse, psiqueDaCategoria,
} from '../src/features/cain/fichaCain.mjs';

test('o talismã de execução encolhe uma caixa por ferimento', () => {
  const f = fichaNova('x1');
  assert.equal(estresseMaximo(f), MAX_ESTRESSE);
  assert.equal(estresseMaximo({ ...f, ferimentos: 1 }), MAX_ESTRESSE - 1);
  assert.equal(estresseMaximo({ ...f, ferimentos: 2 }), MAX_ESTRESSE - 2);
  assert.equal(estresseMaximo({ ...f, ferimentos: 3 }), MAX_ESTRESSE - 3);
});

test('encher o talismã dá ferimento, zera e transborda o que sobrou', () => {
  // Seis caixas, oito de estresse de uma vez: enche, vira ferimento, e os
  // dois que sobraram entram no talismã novo — que agora tem cinco caixas.
  const f = marcarEstresse(fichaNova('x2'), MAX_ESTRESSE + 2);
  assert.equal(f.ferimentos, 1, 'um ferimento');
  assert.equal(f.estresse, 2, 'o excedente transbordou');
  assert.equal(estresseMaximo(f), MAX_ESTRESSE - 1);
});

test('um golpe grande o bastante atravessa mais de um talismã', () => {
  // 12 de estresse de uma vez: 6 enchem o primeiro (ferimento 1, teto cai
  // para 5); 5 enchem o segundo (ferimento 2, teto cai para 4); sobra 1.
  const f = marcarEstresse(fichaNova('x3'), 12);
  assert.equal(f.ferimentos, 2);
  assert.equal(f.estresse, 1);
});

test('talismã que enche exato não deixa resto', () => {
  // 11 param no segundo talismã cheio: 6 + 5, nada transborda.
  const f = marcarEstresse(fichaNova('x3b'), 11);
  assert.equal(f.ferimentos, 2);
  assert.equal(f.estresse, 0);
});

test('à beira da morte o estresse para de transbordar', () => {
  const f = marcarEstresse(fichaNova('x4'), 40);
  assert.equal(f.ferimentos, MAX_FERIMENTOS, 'não passa de três ferimentos');
  assert.equal(f.estresse, 0, 'o resto não se acumula: quem decide a morte é a mesa');
  assert.equal(estadoDoExorcista(f).chave, 'beira-da-morte');
  // E o laço termina: um estresse absurdo não trava a tela.
  assert.equal(marcarEstresse(f, 999).ferimentos, MAX_FERIMENTOS);
});

test('estresse abaixo do teto só soma', () => {
  const f = marcarEstresse(fichaNova('x5'), 3);
  assert.equal(f.estresse, 3);
  assert.equal(f.ferimentos, 0);
});

test('ferimento limpa o estresse e dá piedade', () => {
  const ferido = ganharFerimento({ ...fichaNova('x6'), estresse: 4 });
  assert.equal(ferido.estresse, 0);
  assert.equal(ferido.ferimentos, 1);
  assert.equal(ferido.piedade, 1);
  assert.ok(ferido.condicoes.includes('ferido'));
});

test('"no limite" acompanha o teto que encolheu', () => {
  // Com um ferimento o teto é 5, então 4 de estresse já é o limite — e com a
  // conta antiga (fixa em 6) isso não acenderia.
  const f = { ...fichaNova('x7'), ferimentos: 1, estresse: 4, condicoes: [] };
  assert.equal(estadoDoExorcista({ ...f, ferimentos: 0 }).chave, 'inteiro');
  assert.equal(estadoDoExorcista(f).chave, 'ferido', 'ferido pesa mais que no-limite');
  assert.equal(estadoDoExorcista({ ...f, ferimentos: 0, estresse: 5 }).chave, 'no-limite');
});

test('o gancho é um talismã de três traços', () => {
  assert.equal(CAIXAS_DE_GANCHO, 3);
  let f = fichaNova('x8');
  for (let i = 0; i < CAIXAS_DE_GANCHO; i += 1) f = cortarGancho(f, 0).ficha;
  const ultimo = cortarGancho({ ...f, ganchos: f.ganchos.map((g, i) => (i ? g : { ...g, cortes: 2 })) }, 0);
  assert.equal(ultimo.encheu, true, 'o terceiro corte enche');
});

test('PSIQUE é metade da categoria, para cima', () => {
  assert.equal(psiqueDaCategoria(1), 1);
  assert.equal(psiqueDaCategoria(2), 1);
  assert.equal(psiqueDaCategoria(3), 2);
  assert.equal(psiqueDaCategoria(4), 2);
  assert.equal(psiqueDaCategoria(5), 3);
  // Lixo não vira zero nem NaN: a ficha nunca rola uma reserva inventada.
  assert.equal(psiqueDaCategoria(0), 1);
  assert.equal(psiqueDaCategoria(99), 3);
  assert.equal(psiqueDaCategoria('abacaxi'), 1);
});

test('a caçada começa com três pulsos psíquicos', () => {
  assert.equal(PULSOS_INICIAIS, 3);
  assert.equal(fichaNova('x9').pulsos, 3);
});
