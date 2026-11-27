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
  SANIDADE_VISOES, SANIDADE_DESVANTAGEM, DESVANTAGEM_DA_SANIDADE, ALIVIO_AO_LEVANTAR,
  COMPETENCIA_MINIMA, COMPETENCIA_MAXIMA, REFORCO_A_PARTIR_DE,
  aliviar, competenciasDaFicha, estaMorto, fichaNova, marcar, normalizar,
  pontosRestantes, pvDaIdade, reforcoAtivo, segundaBaseAtiva, responderAoPavor, estadoDaSanidade, levantar, rolarTeste,
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

test('a SEGUNDA base conta, a partir de 3', () => {
  /* Era o buraco da tabela: Sobrevivência sai de Percepção OU Vontade, e
     com `Math.max` puro quem punha cinco numa e quatro na outra tinha
     exatamente a mesma Sobrevivência de quem punha cinco e zero. A
     segunda escolha não mudava um número sequer. */
  const soUma = { atributos: { percepcao: 3, vontade: 2 } };
  const asDuas = { atributos: { percepcao: 3, vontade: 3 } };
  assert.equal(valorDaCompetencia(soUma, 'sobrevivencia'), 1);
  assert.equal(valorDaCompetencia(asDuas, 'sobrevivencia'), 2);
  assert.equal(segundaBaseAtiva(soUma, 'sobrevivencia'), false);
  assert.equal(segundaBaseAtiva(asDuas, 'sobrevivencia'), true);

  // E competência de uma origem só não ganha nada disso.
  assert.equal(segundaBaseAtiva({ atributos: { carisma: 5 } }, 'persuasao'), false);
});

test('o reforço continua vindo do atributo de apoio, que é outro', () => {
  // Sobrevivência: bases Percepção e Vontade, apoio Força.
  const semForca = { atributos: { percepcao: 4, forca: 2 } };
  const comForca = { atributos: { percepcao: 4, forca: 3 } };
  assert.equal(reforcoAtivo(semForca, 'sobrevivencia'), false);
  assert.equal(reforcoAtivo(comForca, 'sobrevivencia'), true);
  assert.equal(valorDaCompetencia(comForca, 'sobrevivencia')
    - valorDaCompetencia(semForca, 'sobrevivencia'), 1);
});

test('duas bases levam a competência ao teto, e nada passa dele', () => {
  /* É o que Gabriel pediu: Percepção e Vontade juntas sobem Sobrevivência
     até +4. Com as duas no talo e o apoio pago, a conta daria 5 — o teto
     é o que impede uma competência de valer mais que o dado. */
  const duasBases = { atributos: { percepcao: 5, vontade: 3 } };
  assert.equal(valorDaCompetencia(duasBases, 'sobrevivencia'), COMPETENCIA_MAXIMA);

  const tudo = { atributos: { percepcao: 5, vontade: 5, forca: 5 } };
  assert.equal(valorDaCompetencia(tudo, 'sobrevivencia'), COMPETENCIA_MAXIMA);
  assert.equal(COMPETENCIA_MAXIMA, 4);

  // Uma base só, sem apoio, não chega lá: o teto continua custando escolha.
  assert.equal(valorDaCompetencia({ atributos: { carisma: 5 } }, 'persuasao'),
    COMPETENCIA_MAXIMA - 1);
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

test('o pavio do Pavor estoura em dois, e estourar pede Vontade', () => {
  let ficha = fichaNova();
  assert.equal(ficha.pavor, 0);
  for (let i = 0; i < PAVOR_MAXIMO - 1; i += 1) ficha = marcar(ficha, 'pavor');
  assert.equal(ficha.pavorNoLimite, false, 'o estouro veio antes da hora');
  ficha = marcar(ficha, 'pavor');
  assert.equal(ficha.pavor, PAVOR_MAXIMO);
  assert.equal(ficha.pavorNoLimite, true);
});

test('estourar o Pavor NÃO tira vida — cobra Sanidade', () => {
  /* Era 1 de PV e virou 1 de Sanidade. A diferença não é de número: vida
     volta com descanso e Sanidade só desce com alguém por perto, então o
     preço do medo passou a empurrar a mesa para junto em vez de para a
     enfermaria. */
  const estourada = { ...fichaNova(), idade: 30, pv: 5, pavor: PAVOR_MAXIMO, pavorNoLimite: true, sanidade: 1 };

  const segurou = responderAoPavor(estourada, { resistiu: true });
  assert.equal(segurou.pavor, 0, 'o pavio tem de zerar de um jeito ou de outro');
  assert.equal(segurou.sanidade, 1, 'segurar não pode custar Sanidade');
  assert.equal(segurou.pv, 5);
  assert.equal(segurou.pavorNoLimite, false);

  const naoSegurou = responderAoPavor(estourada, { resistiu: false });
  assert.equal(naoSegurou.pavor, 0);
  assert.equal(naoSegurou.sanidade, 2, 'falhar devia custar 1 de Sanidade');
  assert.equal(naoSegurou.pv, 5, 'falhar NÃO pode mais custar vida');
});

test('a Sanidade tem três degraus com nome', () => {
  const em = n => estadoDaSanidade({ sanidade: n });

  assert.equal(em(SANIDADE_VISOES - 1).visoes, false);
  assert.equal(em(SANIDADE_VISOES).visoes, true, 'as visões deviam começar em 4');
  assert.equal(em(SANIDADE_VISOES).modificador, 0, 'o degrau das visões não tira número');

  assert.equal(em(SANIDADE_DESVANTAGEM).desvantagem, true);
  assert.equal(em(SANIDADE_DESVANTAGEM).modificador, DESVANTAGEM_DA_SANIDADE);

  assert.equal(em(SANIDADE_MAXIMA - 1).caida, false);
  assert.equal(em(SANIDADE_MAXIMA).caida, true, 'em 6 ela cai');
});

test('quem cai é levantado por outro, e volta pior do que entrou', () => {
  const caida = { ...fichaNova(), idade: 30, pv: 0, sanidade: SANIDADE_MAXIMA };
  assert.equal(estadoDaSanidade(caida).caida, true);

  const depois = levantar(caida);
  assert.equal(depois.sanidade, SANIDADE_MAXIMA - ALIVIO_AO_LEVANTAR,
    'devolveu mais de um degrau — desabar ficaria de graça');
  assert.equal(estadoDaSanidade(depois).caida, false, 'continuou no chão');
  assert.equal(estadoDaSanidade(depois).desvantagem, true,
    'levantou sem a desvantagem: ela voltou melhor do que caiu');
  assert.ok(depois.pv >= 1, 'levantou com zero de vida');
});

test('o alívio apaga o estouro pendente junto com as marcas', () => {
  // Ficar com o teste pendurado depois de o pavio baixar deixaria a mesa
  // devendo uma resposta a um medo que já passou.
  const cheia = marcar({ ...fichaNova(), pavor: PAVOR_MAXIMO - 1 }, 'pavor');
  assert.equal(cheia.pavorNoLimite, true);
  assert.equal(aliviar(cheia, 'pavor').pavorNoLimite, false);
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
