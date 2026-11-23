/**
 * ONE SHOT TERROR — A FICHA
 *
 * Sistema de mesa curta combinado com a mesa: d20 + competência contra a
 * dificuldade que o Mestre diz; competência escala do atributo em vez de ser
 * comprada; Pavor e Sanidade enchem e, cheios, trazem uma visão.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATRIBUTOS, COMPETENCIAS, PAVOR_MAXIMO, SANIDADE_MAXIMA, PONTOS_DE_SORTE,
  aliviar, competenciasDaFicha, estaMorto, fichaNova, marcar, normalizar,
  pontosRestantes, pvDaIdade, responderAVisao, rolarTeste, valorDaCompetencia,
} from '../src/features/oneshot/fichaOneShot.mjs';

test('são oito atributos e doze competências', () => {
  assert.equal(ATRIBUTOS.length, 8);
  assert.equal(COMPETENCIAS.length, 12);
  assert.equal(new Set(ATRIBUTOS.map(a => a.id)).size, 8);
  assert.equal(new Set(COMPETENCIAS.map(c => c.id)).size, 12);
});

test('toda competência escala de atributos que existem', () => {
  const ids = new Set(ATRIBUTOS.map(a => a.id));
  for (const c of COMPETENCIAS) {
    assert.ok(c.de.length >= 1, `${c.nome} não escala de nada`);
    for (const de of c.de) assert.ok(ids.has(de), `${c.nome} escala de "${de}", que não é atributo`);
  }
});

test('competência é o atributo menos um', () => {
  // A regra que a mesa deu: 3 de carisma dá 2 de persuasão.
  const ficha = { atributos: { carisma: 3 } };
  assert.equal(valorDaCompetencia(ficha, 'persuasao'), 2);
  assert.equal(valorDaCompetencia({ atributos: { carisma: 1 } }, 'persuasao'), 0);
  assert.equal(valorDaCompetencia({ atributos: { carisma: 5 } }, 'persuasao'), 4);
});

test('competência de dois atributos vale o maior', () => {
  // Exigir os dois puniria duas vezes a mesma escolha: quem é forte OU ágil
  // corre bem.
  const forte = { atributos: { forca: 4, agilidade: 1 } };
  const agil = { atributos: { forca: 1, agilidade: 4 } };
  assert.equal(valorDaCompetencia(forte, 'atletismo'), 3);
  assert.equal(valorDaCompetencia(agil, 'atletismo'), 3);
});

test('nenhuma competência fica negativa', () => {
  const vazia = fichaNova();
  for (const c of COMPETENCIAS) {
    assert.ok(valorDaCompetencia(vazia, c.id) >= 0, c.nome);
  }
  assert.equal(Object.keys(competenciasDaFicha(vazia)).length, 12);
});

test('idade de 6 a 18 anos dá 3 de vida; o resto, 5', () => {
  assert.equal(pvDaIdade(6), 3);
  assert.equal(pvDaIdade(18), 3);
  assert.equal(pvDaIdade(5), 5);
  assert.equal(pvDaIdade(19), 5);
  assert.equal(pvDaIdade(40), 5);
  // Idade em branco vale adulto: ficha pela metade não vira criança.
  assert.equal(pvDaIdade(''), 5);
  assert.equal(pvDaIdade(undefined), 5);
});

test('baixar a idade rebaixa o teto de vida junto', () => {
  // Senão sobraria na ficha uma vida que o sistema não reconhece.
  const adulto = normalizar({ ...fichaNova(), idade: 30, pv: 5 });
  assert.equal(adulto.pv, 5);
  const crianca = normalizar({ ...adulto, idade: 12 });
  assert.equal(crianca.pv, 3);
});

test('a rolagem é d20 mais competência contra o alvo', () => {
  assert.equal(rolarTeste({ dado: 12, competencia: 3, alvo: 15 }).sucesso, true);
  assert.equal(rolarTeste({ dado: 11, competencia: 3, alvo: 15 }).total, 14);
  assert.equal(rolarTeste({ dado: 11, competencia: 3, alvo: 15 }).sucesso, false);
});

test('o 20 natural passa e o 1 natural falha, somando o que somar', () => {
  assert.equal(rolarTeste({ dado: 20, competencia: 0, alvo: 20 }).sucesso, true);
  const desastre = rolarTeste({ dado: 1, competencia: 4, alvo: 5 });
  assert.equal(desastre.sucesso, false);
  // E o 1 alimenta o Pavor: é um dos gatilhos que a mesa definiu.
  assert.equal(desastre.geraPavor, true);
  assert.equal(rolarTeste({ dado: 9, competencia: 0, alvo: 10 }).geraPavor, false);
});

test('Pavor e Sanidade enchem, e cheios trazem a visão', () => {
  let ficha = fichaNova();
  assert.equal(ficha.pavor, 0);
  for (let i = 0; i < PAVOR_MAXIMO - 1; i += 1) ficha = marcar(ficha, 'pavor');
  assert.equal(ficha.visaoPendente, '', 'a visão veio antes da hora');
  ficha = marcar(ficha, 'pavor');
  assert.equal(ficha.pavor, PAVOR_MAXIMO);
  assert.equal(ficha.visaoPendente, 'pavor');
});

test('ceder à visão custa vida; resistir recua o medidor', () => {
  const cheia = { ...fichaNova(), idade: 30, pv: 5, sanidade: SANIDADE_MAXIMA, visaoPendente: 'sanidade' };

  const cedeu = responderAVisao(cheia, { cedeu: true });
  assert.equal(cedeu.pv, 4, 'ceder deixou de custar vida');
  assert.equal(cedeu.sanidade, SANIDADE_MAXIMA - 2, 'a sanidade deveria recuar para 4');
  assert.equal(cedeu.visaoPendente, '');

  const resistiu = responderAVisao(cheia, { cedeu: false });
  assert.equal(resistiu.pv, 5, 'resistir não pode custar vida');
  assert.equal(resistiu.sanidade, SANIDADE_MAXIMA - 2);
  assert.equal(resistiu.visaoPendente, '');
});

test('o alívio apaga a visão pendente junto com as marcas', () => {
  // Ficar com a visão pendurada depois de o medidor baixar deixaria a mesa
  // devendo uma resposta a um medo que já passou.
  const cheia = marcar({ ...fichaNova(), pavor: PAVOR_MAXIMO - 1 }, 'pavor');
  assert.equal(cheia.visaoPendente, 'pavor');
  assert.equal(aliviar(cheia, 'pavor').visaoPendente, '');
});

test('nada passa dos limites, nem por fora', () => {
  const exagero = normalizar({ ...fichaNova(), pavor: 99, sanidade: -5, sorte: 9, pv: 40, idade: 30 });
  assert.equal(exagero.pavor, PAVOR_MAXIMO);
  assert.equal(exagero.sanidade, 0);
  assert.equal(exagero.sorte, PONTOS_DE_SORTE);
  assert.equal(exagero.pv, 5);
});

test('a ficha nova começa com os pontos todos por gastar', () => {
  const nova = fichaNova();
  assert.equal(pontosRestantes(nova), 12);
  const gastou = { ...nova, atributos: { ...nova.atributos, carisma: 4, percepcao: 3 } };
  assert.equal(pontosRestantes(gastou), 12 - 3 - 2);
});

test('vida zerada é morte', () => {
  assert.equal(estaMorto({ pv: 0 }), true);
  assert.equal(estaMorto({ pv: 1 }), false);
});
