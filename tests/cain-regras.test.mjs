/* AS REGRAS DO CAIN
   O motor de rolagem é a peça que, se estiver errada, erra em silêncio: a mesa
   joga a sessão inteira com um número torto e ninguém percebe. Então ele é
   testado com sorte fixada, dado a dado, contra o que o livro diz (CAIN 1.4.5
   PT-BR, páginas 6 a 9). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALVO_DIFICIL, ALVO_NORMAL, MAX_PIEDADE, RISCO,
  ganharPiedade, montarReserva, podeAgoniaDivina, resumoDaRolagem, rolarAcao,
} from '../src/core/sistemas/cain/regras.mjs';

/* Transforma uma lista de faces desejadas num sorteio determinístico. */
const dadosFixos = faces => {
  let i = 0;
  return () => {
    const face = faces[i++ % faces.length];
    return (face - 1) / 6 + 1e-9;
  };
};

test('o sorteio fixado devolve exatamente as faces pedidas', () => {
  const r = rolarAcao({ pericia: 3, vantagens: 3, sorteio: dadosFixos([1, 2, 3, 4, 5, 6]) });
  assert.deepEqual(r.dados, [1, 2, 3, 4, 5, 6]);
});

test('a reserva soma perícia e vantagens, com teto de 3 em cada', () => {
  assert.deepEqual(montarReserva({ pericia: 2, vantagens: 1 }), { pericia: 2, vantagens: 1, dados: 3, minimo: false });
  // Ninguém monta 7 dados por insistência.
  assert.equal(montarReserva({ pericia: 9, vantagens: 9 }).dados, 6);
  // Nem reserva negativa: o livro diz que não pode ser menor que 0.
  assert.equal(montarReserva({ pericia: -4, vantagens: -2 }).dados, 0);
});

test('qualquer dado 4+ é sucesso, e um sucesso já basta', () => {
  const r = rolarAcao({ pericia: 3, sorteio: dadosFixos([1, 2, 4]) });
  assert.equal(r.alvo, ALVO_NORMAL);
  assert.equal(r.sucessos, 1);
  assert.equal(r.acertou, true, 'um sucesso atinge o objetivo');
});

test('nenhum sucesso é falha', () => {
  const r = rolarAcao({ pericia: 3, sorteio: dadosFixos([1, 2, 3]) });
  assert.equal(r.sucessos, 0);
  assert.equal(r.acertou, false);
});

test('difícil: só o 6 conta', () => {
  const r = rolarAcao({ pericia: 3, dificil: true, sorteio: dadosFixos([4, 5, 6]) });
  assert.equal(r.alvo, ALVO_DIFICIL);
  assert.equal(r.sucessos, 1, '4 e 5 deixam de contar quando é difícil');
  // E o mesmo lance, sem ser difícil, dá três.
  assert.equal(rolarAcao({ pericia: 3, sorteio: dadosFixos([4, 5, 6]) }).sucessos, 3);
});

test('reserva zero rola 2d6 e fica com o MENOR — não deixa de rolar', () => {
  const r = rolarAcao({ pericia: 0, vantagens: 0, sorteio: dadosFixos([6, 2]) });
  assert.equal(r.reserva.minimo, true);
  assert.equal(r.dados.length, 2, 'rolou dois dados');
  assert.deepEqual(r.contados, [2], 'contou o menor, não o 6');
  assert.equal(r.acertou, false);

  // E continua sendo uma chance: dois dados altos acertam.
  const bom = rolarAcao({ pericia: 0, sorteio: dadosFixos([5, 6]) });
  assert.deepEqual(bom.contados, [5]);
  assert.equal(bom.acertou, true);
});

test('o dado de risco só é rolado quando a ação é arriscada', () => {
  assert.equal(rolarAcao({ pericia: 2, sorteio: dadosFixos([4, 4]) }).risco, null);
  const r = rolarAcao({ pericia: 1, arriscado: true, sorteio: dadosFixos([4, 1]) });
  assert.equal(r.risco.valor, 1);
  assert.equal(r.risco.chave, 'muito-pior');
});

test('o risco vale mesmo quando a ação dá certo', () => {
  // Sucesso na ação e 1 no risco: o livro diz que a consequência vem assim mesmo.
  const r = rolarAcao({ pericia: 1, arriscado: true, sorteio: dadosFixos([6, 1]) });
  assert.equal(r.acertou, true);
  assert.equal(r.risco.chave, 'muito-pior');
});

test('a tabela de risco segue o livro: 1 / 2-3 / 4-5 / 6', () => {
  assert.equal(RISCO[1].chave, 'muito-pior');
  assert.equal(RISCO[2].chave, 'pior');
  assert.equal(RISCO[3].chave, 'pior');
  assert.equal(RISCO[4].chave, 'esperado');
  assert.equal(RISCO[5].chave, 'esperado');
  assert.equal(RISCO[6].chave, 'melhor');
});

test('Agonia Divina acrescenta 1D por piedade queimada, estourando o teto', () => {
  const r = rolarAcao({ pericia: 3, vantagens: 3, piedade: 3, sorteio: dadosFixos([4]) });
  assert.equal(r.reserva.rolados, 9, 'seis da reserva mais três de piedade');
  assert.equal(r.reserva.piedade, 3);
});

test('a piedade acumula até 3 e não passa disso', () => {
  assert.equal(ganharPiedade(0), 1);
  assert.equal(ganharPiedade(2), 3);
  assert.equal(ganharPiedade(3), MAX_PIEDADE, 'para na terceira');
  assert.equal(ganharPiedade(-5), 0);
});

test('Agonia Divina é uma por sessão por exorcista e uma por cena no grupo', () => {
  assert.equal(podeAgoniaDivina({ piedade: 2 }).pode, true);
  assert.equal(podeAgoniaDivina({ piedade: 0 }).pode, false);
  assert.equal(podeAgoniaDivina({ piedade: 2, usouNaSessao: true }).pode, false);
  assert.equal(podeAgoniaDivina({ piedade: 2, grupoUsouNaCena: true }).pode, false);
  assert.match(podeAgoniaDivina({ piedade: 2, grupoUsouNaCena: true }).motivo, /cena/);
});

test('o resumo diz o que a mesa precisa ouvir, sem jargão', () => {
  const falha = rolarAcao({ pericia: 1, sorteio: dadosFixos([2]) });
  assert.match(resumoDaRolagem(falha), /^Falha/);

  const comRisco = rolarAcao({ pericia: 2, arriscado: true, sorteio: dadosFixos([6, 6, 1]) });
  assert.match(resumoDaRolagem(comRisco), /2 sucessos/);
  assert.match(resumoDaRolagem(comRisco), /risco 1 — muito pior/);

  const zerada = rolarAcao({ pericia: 0, sorteio: dadosFixos([3, 5]) });
  assert.match(resumoDaRolagem(zerada), /reserva zero/);
  assert.equal(resumoDaRolagem(null), '');
});

test('sem sorte fixada, as faces continuam entre 1 e 6', () => {
  for (let i = 0; i < 400; i += 1) {
    const r = rolarAcao({ pericia: 3, vantagens: 3, arriscado: true });
    assert.ok(r.dados.every(d => d >= 1 && d <= 6), `face fora do d6: ${r.dados}`);
    assert.ok(r.risco.valor >= 1 && r.risco.valor <= 6);
    assert.ok(r.sucessos >= 0 && r.sucessos <= 6);
  }
});
