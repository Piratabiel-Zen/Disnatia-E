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
  COMPETENCIA_MINIMA, COMPETENCIA_MAXIMA, REFORCO_A_PARTIR_DE,
  aliviar, competenciasDaFicha, estaMorto, fichaNova, marcar, normalizar,
  pontosRestantes, pvDaIdade, reforcoAtivo, responderAVisao, rolarTeste,
  valorDaCompetencia,
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

test('competência é o atributo menos dois, de -1 a +3 com ponto', () => {
  // A régua nova da mesa: atributo COM ponto escala de -1 (um ponto) a +3
  // (cinco). Persuasão escala de Carisma e reforça com Inteligência, então
  // as fichas abaixo mantêm Inteligência em zero para medir só o principal.
  const comCarisma = n => ({ atributos: { carisma: n, inteligencia: 0 } });
  assert.equal(valorDaCompetencia(comCarisma(1), 'persuasao'), -1);
  assert.equal(valorDaCompetencia(comCarisma(2), 'persuasao'), 0);
  assert.equal(valorDaCompetencia(comCarisma(3), 'persuasao'), 1);
  assert.equal(valorDaCompetencia(comCarisma(5), 'persuasao'), 3);
});

test('atributo sem ponto nenhum trava a competência em -2, e o reforço não salva', () => {
  // "Atributos sem pontos contam com a competência em -2 SEMPRE": o sempre é
  // o que faz renunciar a um atributo custar alguma coisa. Antes o piso era
  // zero e ignorar um atributo não tinha preço.
  assert.equal(valorDaCompetencia({ atributos: { carisma: 0 } }, 'persuasao'), -2);
  // Inteligência em 5 reforça Persuasão — mas não com o principal zerado.
  assert.equal(
    valorDaCompetencia({ atributos: { carisma: 0, inteligencia: 5 } }, 'persuasao'),
    -2,
  );
});

test('o reforço dá +1 a partir de 3 no atributo de apoio', () => {
  // Era o buraco da tabela antiga: Vontade e Sorte não levantavam nada, e
  // Inteligência sozinha levantava seis competências.
  const semVontade = { atributos: { percepcao: 3, vontade: 2 } };
  const comVontade = { atributos: { percepcao: 3, vontade: 3 } };
  assert.equal(valorDaCompetencia(semVontade, 'sobrevivencia'), 1);
  assert.equal(valorDaCompetencia(comVontade, 'sobrevivencia'), 2);
  assert.equal(reforcoAtivo(semVontade, 'sobrevivencia'), false);
  assert.equal(reforcoAtivo(comVontade, 'sobrevivencia'), true);
});

test('o reforço não estoura o teto de +3', () => {
  const maximo = { atributos: { percepcao: 5, vontade: 5 } };
  assert.equal(valorDaCompetencia(maximo, 'sobrevivencia'), COMPETENCIA_MAXIMA);
  assert.equal(COMPETENCIA_MAXIMA, 3);
});

test('toda competência tem reforço, e nenhuma reforça do próprio principal', () => {
  // Reforçar do mesmo atributo que já é principal contaria a mesma escolha
  // duas vezes no mesmo teste.
  for (const c of COMPETENCIAS) {
    assert.ok(c.reforco, `${c.nome} ficou sem reforço`);
    assert.ok(!c.de.includes(c.reforco),
      `${c.nome} reforça de ${c.reforco}, que já é principal dela`);
  }
});

test('Vontade e Sorte deixaram de ser enfeite', () => {
  const apoios = COMPETENCIAS.map(c => c.reforco);
  for (const atributo of ['vontade', 'sorte']) {
    assert.ok(apoios.includes(atributo), `${atributo} continua não servindo para nada`);
  }
});

test('competência de dois atributos vale o maior', () => {
  // Exigir os dois puniria duas vezes a mesma escolha: quem é forte OU ágil
  // corre bem. Vontade em zero para o reforço não entrar na conta.
  const forte = { atributos: { forca: 4, agilidade: 1, vontade: 0 } };
  const agil = { atributos: { forca: 1, agilidade: 4, vontade: 0 } };
  assert.equal(valorDaCompetencia(forte, 'atletismo'), 2);
  assert.equal(valorDaCompetencia(agil, 'atletismo'), 2);
});

test('a ficha em branco tem tudo em -2, e são doze competências', () => {
  // Ficha nova nasce com os oito atributos em zero: é a pessoa antes de
  // qualquer escolha, e nenhuma competência dela passa de -2.
  const vazia = fichaNova();
  for (const c of COMPETENCIAS) {
    assert.equal(valorDaCompetencia(vazia, c.id), COMPETENCIA_MINIMA, c.nome);
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
  // Vinte, não doze: os oito atributos agora partem de zero, e a soma que a
  // ficha alcança no fim é a mesma de antes (8 x 1 + 12).
  assert.equal(pontosRestantes(nova), 20);
  const gastou = { ...nova, atributos: { ...nova.atributos, carisma: 4, percepcao: 3 } };
  assert.equal(pontosRestantes(gastou), 20 - 4 - 3);
});

test('vida zerada é morte', () => {
  assert.equal(estaMorto({ pv: 0 }), true);
  assert.equal(estaMorto({ pv: 1 }), false);
});
