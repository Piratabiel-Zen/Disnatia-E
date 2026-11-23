/**
 * O DADO QUE PERGUNTA A AÇÃO
 *
 * Numa one-shot ninguém decora a ficha: a mesa dura uma sessão e metade das
 * pessoas nunca jogou o sistema. Pedir "some sua competência" é pedir conta
 * errada — e conta errada num teste de Pavor custa a cena.
 *
 * O que estes testes guardam é que o bônus vem SEMPRE da ficha, nunca de um
 * número digitado, e que o 20 e o 1 naturais continuam mandando no resultado
 * por cima de qualquer bônus.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import {
  CLIMAS, bonusDaAcao, climaDaCompetencia, lerResultado, opcoesDeRolagem,
} from '../src/features/oneshot/rolagemOneShot.mjs';
import { COMPETENCIAS, valorDaCompetencia } from '../src/features/oneshot/fichaOneShot.mjs';

const fonte = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

const ficha = {
  idade: '34',
  atributos: {
    forca: 2, agilidade: 3, precisao: 3, inteligencia: 4,
    percepcao: 3, carisma: 0, vontade: 3, sorte: 1,
  },
};

test('a lista de ações traz as doze competências, com o bônus pronto', () => {
  const opcoes = opcoesDeRolagem(ficha);
  assert.equal(opcoes.length, COMPETENCIAS.length);
  for (const o of opcoes) {
    // O bônus da lista TEM que ser o mesmo da ficha: se a tela recalculasse,
    // o número do seletor e o do resultado poderiam divergir.
    assert.equal(o.bonus, valorDaCompetencia(ficha, o.id), o.nome);
    assert.ok(o.vemDe, `${o.nome} não diz de onde vem`);
  }
});

test('o bônus negativo chega inteiro à rolagem', () => {
  // Carisma zerado trava Persuasão em -2, e o dado tem que somar -2 de
  // verdade — arredondar para zero aqui apagaria a renúncia que a pessoa fez
  // na criação.
  assert.equal(bonusDaAcao(ficha, 'persuasao'), -2);
  const opcao = opcoesDeRolagem(ficha).find(o => o.id === 'persuasao');
  assert.equal(opcao.bonus, -2);
});

test('sem ficha ou sem ação, o bônus é zero', () => {
  // O Mestre rola por criatura e não tem competência nenhuma para consultar.
  assert.equal(bonusDaAcao(null, 'investigacao'), 0);
  assert.equal(bonusDaAcao(ficha, ''), 0);
  assert.equal(bonusDaAcao(ficha, 'inventada'), 0);
  assert.deepEqual(opcoesDeRolagem(null), []);
});

test('o 20 natural passa e o 1 natural falha, por cima de qualquer bônus', () => {
  // Regra escrita das Regras. É por isso que o resultado relê o dado em vez
  // de confiar no total: um bônus alto transformaria 1 natural em sucesso.
  const comBonusAlto = lerResultado({ dado: 1, bonus: 9, alvo: 10 });
  assert.equal(comBonusAlto.passou, false);
  assert.equal(comBonusAlto.falhaCritica, true);
  assert.equal(comBonusAlto.custaPavor, true);

  const comPenalidade = lerResultado({ dado: 20, bonus: -2, alvo: 25 });
  assert.equal(comPenalidade.passou, true);
  assert.equal(comPenalidade.critico, true);
  assert.equal(comPenalidade.custaPavor, false);
});

test('o total soma o bônus e compara com o alvo', () => {
  assert.equal(lerResultado({ dado: 11, bonus: 3 }).total, 14);
  assert.equal(lerResultado({ dado: 11, bonus: 3, alvo: 15 }).passou, false);
  assert.equal(lerResultado({ dado: 12, bonus: 3, alvo: 15 }).passou, true);
  // Sem alvo declarado não há veredito: o Mestre decide na hora.
  assert.equal(lerResultado({ dado: 12, bonus: 3 }).passou, null);
});

test('o clima é de três, e competência sem clima rola sem efeito', () => {
  // Efeito demais vira ruído: a terceira vez que a tela treme, ninguém olha
  // mais. Então a maioria das competências não acende nada.
  assert.equal(climaDaCompetencia('investigacao'), CLIMAS.lupa);
  assert.equal(climaDaCompetencia('furtividade'), CLIMAS.escuro);
  assert.equal(climaDaCompetencia('atletismo'), '');
  assert.equal(climaDaCompetencia(''), '');
  const climas = new Set(COMPETENCIAS.map(c => climaDaCompetencia(c.id)).filter(Boolean));
  assert.ok(climas.size <= 3, `são ${climas.size} climas; o combinado era no máximo 3`);
});

/* ─── A ligação com o dado ────────────────────────────────────────────── */

test('o dado da noite pede a ação em vez de pedir o bônus', () => {
  const widget = semComentarios(fonte('src/shell/DiceWidget.jsx'));
  assert.match(widget, /O que você está fazendo\?/);
  // E o bônus entra da ficha, não digitado.
  assert.match(widget, /setBonus\(escolhida \? escolhida\.bonus : 0\)/);
});

test('o campo de digitar bônus continua existindo para quem não tem ficha', () => {
  // O Mestre rola por criatura: tirar o campo dele quebraria a mesa inteira.
  const widget = semComentarios(fonte('src/shell/DiceWidget.jsx'));
  assert.match(widget, /ehNoite && fichaDaNoite \?/);
  assert.match(widget, /type="number" value=\{bonus\}/);
});

test('a ficha da noite é lida na coleção do sistema, não em sheets', () => {
  // `fichas_oneshot` e não `sheets`: lendo da coleção errada, o seletor
  // abriria vazio e ninguém entenderia por quê.
  const widget = semComentarios(fonte('src/shell/DiceWidget.jsx'));
  assert.match(widget, /colecaoDeFichas\(activeCampaign\(\)\)/);
});

test('o clima sai sozinho da tela', () => {
  // Efeito que fica preso vira cenário, e cenário não marca a ação que o
  // causou.
  const widget = semComentarios(fonte('src/shell/DiceWidget.jsx'));
  assert.match(widget, /delete raiz\.dataset\.climaDaAcao/);
  assert.match(widget, /setTimeout/);
});

test('quem pediu menos movimento não ganha tremor nenhum', () => {
  const css = semComentarios(fonte('src/features/oneshot/rolagem-one-shot.css'));
  assert.match(css, /html\[data-motion="reduced"\]\[data-clima-da-acao\]\{animation:none!important\}/);
  assert.ok(!/prefers-reduced-motion/.test(css),
    'a media query voltou: ela tira do jogador a escolha que é dele');
});
