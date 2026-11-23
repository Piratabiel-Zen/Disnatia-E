/**
 * ONE SHOT TERROR — A FICHA
 *
 * Sistema de mesa curta: uma noite, uma história, gente comum numa situação
 * que não deveria existir. A ficha cabe numa tela porque ninguém vai evoluir
 * personagem — ou a pessoa sai inteira no fim da sessão, ou não sai.
 *
 * AS DECISÕES DE NÚMERO ESTÃO TODAS AQUI EM CIMA, nomeadas, porque é delas
 * que o equilíbrio depende e é nelas que a mesa vai querer mexer depois das
 * primeiras sessões.
 *
 * O que vem da mesa (decidido com o Mestre):
 *  - rolagem: d20 + competência contra uma dificuldade que o Mestre diz
 *  - competência NÃO é comprada: ela escala do atributo, atributo − 2, com
 *    reforço condicional de um segundo atributo a partir de 3
 *  - PV 5, ou 3 para quem tem de 6 a 18 anos
 *  - Pavor e Sanidade ENCHEM conforme a pessoa se quebra
 *  - no limite vem uma visão; ceder custa dano, resistir recua o medidor
 *  - 2 pontos de sorte, cada um rola de novo e fica com o segundo resultado
 */

/* ─── Os números do sistema ─────────────────────────────────────────── */

export const DADO = 20;

/** O Mestre diz o número a vencer. Esta é a régua que ele usa. */
export const DIFICULDADES = Object.freeze([
  { id: 'facil', alvo: 10, nome: 'Fácil', resumo: 'Dá para errar, mas não deveria.' },
  { id: 'dificil', alvo: 15, nome: 'Difícil', resumo: 'Precisa de competência ou de sorte.' },
  { id: 'quase', alvo: 20, nome: 'Quase impossível', resumo: 'Só com as duas, e ainda assim.' },
]);

export const PV_ADULTO = 5;
export const PV_JOVEM = 3;
export const IDADE_JOVEM_MIN = 6;
export const IDADE_JOVEM_MAX = 18;

// Três, e não cinco: a mesa pediu depois de ver o medidor na tela. Pavor é o
// medidor curto de propósito — ele enche numa cena ruim, e a visão vem antes
// de a pessoa se acostumar com o medo.
export const PAVOR_MAXIMO = 3;
export const SANIDADE_MAXIMA = 6;
/** Resistir à visão não zera o medidor: recua dois. O alívio é curto. */
export const RECUO_AO_RESISTIR = 2;

export const PONTOS_DE_SORTE = 2;
/* O limite e o catálogo de talentos moram em `talentosOneShot.mjs`, junto dos
   dez talentos. Reexportado aqui porque as regras e a ficha já liam daqui. */
export { TALENTOS_POR_PERSONAGEM } from './talentosOneShot.mjs';
import { COR_PADRAO } from './fichaRapida.mjs';

/**
 * Atributos vão de 0 a 5.
 *
 * ZERO É PERMITIDO, e é a mudança que dá peso à distribuição: atributo sem
 * ponto nenhum trava as competências dele em −2, para sempre. Antes o piso
 * era 1 e a competência nunca descia de zero, então deixar um atributo de
 * lado não custava nada — a ficha só tinha vantagens e nenhuma renúncia.
 *
 * A soma continua a mesma de antes (oito atributos partindo de 1 mais doze
 * pontos davam vinte), então nenhuma ficha já preenchida mudou de total: o
 * que mudou é que agora dá para descer abaixo de 1 e subir até 5 na criação.
 */
export const ATRIBUTO_MINIMO = 0;
export const ATRIBUTO_MAXIMO = 5;
export const ATRIBUTO_MAXIMO_NA_CRIACAO = 5;
/** Todos começam em 0 e a pessoa distribui estes pontos entre os oito. */
export const PONTOS_DE_ATRIBUTO = 20;

/** A competência vai de −2 (atributo zerado) a +3 (atributo em cinco). */
export const COMPETENCIA_MINIMA = -2;
export const COMPETENCIA_MAXIMA = 3;

/* ─── Os oito atributos ─────────────────────────────────────────────── */

export const ATRIBUTOS = Object.freeze([
  { id: 'forca', nome: 'Força', resumo: 'Erguer, arrombar, segurar uma porta que empurra de volta.' },
  { id: 'agilidade', nome: 'Agilidade', resumo: 'Correr, desviar, passar por onde mal cabe.' },
  { id: 'precisao', nome: 'Precisão', resumo: 'Mão firme: mira, agulha, fechadura, volante.' },
  { id: 'inteligencia', nome: 'Inteligência', resumo: 'Entender, lembrar, juntar duas coisas que ninguém juntou.' },
  { id: 'percepcao', nome: 'Percepção', resumo: 'Notar. O cheiro errado, o barulho a mais, o que mudou de lugar.' },
  { id: 'carisma', nome: 'Carisma', resumo: 'Ser ouvido, ser levado a sério, ser acreditado.' },
  { id: 'vontade', nome: 'Vontade', resumo: 'Continuar quando o corpo e a cabeça pedem para parar.' },
  { id: 'sorte', nome: 'Sorte', resumo: 'O que não se explica. Às vezes é tudo o que resta.' },
]);

/* ─── As doze competências ──────────────────────────────────────────── */

/**
 * Competência não se compra: ela escala do atributo.
 *
 * `de` lista os atributos que a sustentam; com mais de um, vale O MAIOR —
 * quem é forte OU ágil corre bem, e exigir as duas coisas puniria duas vezes
 * a mesma escolha.
 *
 * `reforco` é a segunda pergunta que a competência faz. Ele existe porque a
 * tabela antiga concentrava demais: Inteligência sozinha levantava seis
 * competências, então uma ficha de 4 de Inteligência era boa em investigar,
 * tratar ferida, mexer em máquina, ler símbolo, rastrear e operar sistema —
 * e Vontade e Sorte não levantavam NADA, eram dois atributos que a pessoa
 * comprava por educação.
 *
 * Então três competências perderam o segundo atributo principal
 * (Sobrevivência, Mecânica e Pilotagem escalavam de dois e agora escalam de
 * um) e toda competência ganhou um reforço condicional. O reforço dá +1 a
 * partir de 3 no atributo de apoio: não é mais uma soma automática, é uma
 * escolha que se paga. Quem investe em Vontade aguenta a noite; quem investe
 * em Sorte mente melhor e acerta o tiro que não devia acertar.
 */

/** A partir de quanto o atributo de apoio começa a valer. */
export const REFORCO_A_PARTIR_DE = 3;
export const REFORCO_BONUS = 1;

export const COMPETENCIAS = Object.freeze([
  { id: 'atletismo', nome: 'Atletismo', de: ['forca', 'agilidade'], reforco: 'vontade',
    resumo: 'Correr, nadar, saltar.' },
  { id: 'furtividade', nome: 'Furtividade', de: ['agilidade'], reforco: 'percepcao',
    resumo: 'Esconder-se e caminhar sem ruído.' },
  { id: 'investigacao', nome: 'Investigação', de: ['inteligencia'], reforco: 'percepcao',
    resumo: 'Analisar evidências e documentos.' },
  // Escalava de Percepção E Inteligência. Agora é Percepção, e quem aguenta a
  // mata é quem tem Vontade — foi o exemplo que a mesa deu.
  { id: 'sobrevivencia', nome: 'Sobrevivência', de: ['percepcao'], reforco: 'vontade',
    resumo: 'Rastrear, orientar-se, encontrar abrigo.' },
  { id: 'persuasao', nome: 'Persuasão', de: ['carisma'], reforco: 'inteligencia',
    resumo: 'Convencer e negociar.' },
  { id: 'enganacao', nome: 'Enganação', de: ['carisma'], reforco: 'sorte',
    resumo: 'Mentir, blefar, disfarçar intenções.' },
  { id: 'medicina', nome: 'Medicina', de: ['inteligencia'], reforco: 'precisao',
    resumo: 'Primeiros socorros e tratamentos.' },
  { id: 'tecnologia', nome: 'Tecnologia', de: ['inteligencia'], reforco: 'precisao',
    resumo: 'Computadores, eletrônicos e outros sistemas.' },
  // Escalava de Precisão E Inteligência. Agora é a mão, e a força entra como
  // apoio: o que não se desenrosca, se arrebenta.
  { id: 'mecanica', nome: 'Mecânica', de: ['precisao'], reforco: 'forca',
    resumo: 'Consertar, forçar e operar máquinas.' },
  { id: 'ocultismo', nome: 'Ocultismo', de: ['inteligencia'], reforco: 'vontade',
    resumo: 'Reconhecer símbolos e tradições sobrenaturais.' },
  // Escalava de Precisão E Agilidade. Agora é Precisão, e Agilidade reforça.
  { id: 'pilotagem', nome: 'Pilotagem', de: ['precisao'], reforco: 'agilidade',
    resumo: 'Conduzir veículos.' },
  { id: 'combate', nome: 'Combate', de: ['forca', 'precisao'], reforco: 'sorte',
    resumo: 'Armas e técnicas de luta.' },
]);

/* ─── Contas ────────────────────────────────────────────────────────── */

const inteiro = (valor, padrao = 0) => {
  const n = Number(valor);
  return Number.isFinite(n) ? Math.trunc(n) : padrao;
};

export const limitar = (valor, minimo, maximo) =>
  Math.min(maximo, Math.max(minimo, inteiro(valor, minimo)));

/** Quantos PV esta idade sustenta. Idade em branco vale adulto. */
export function pvDaIdade(idade) {
  const anos = Number(idade);
  if (!Number.isFinite(anos) || anos <= 0) return PV_ADULTO;
  return anos >= IDADE_JOVEM_MIN && anos <= IDADE_JOVEM_MAX ? PV_JOVEM : PV_ADULTO;
}

/** O valor de um atributo na ficha, já dentro dos limites. */
export const valorDoAtributo = (ficha, id) =>
  limitar(ficha?.atributos?.[id], ATRIBUTO_MINIMO, ATRIBUTO_MAXIMO);

/**
 * A competência derivada: atributo − 2, de −2 a +3.
 *
 * Atributo sem ponto nenhum dá −2, e dá −2 SEMPRE: nem reforço tira a ficha
 * dali. É o que faz escolher onde não investir custar alguma coisa — antes o
 * piso era zero e não havia diferença real entre ignorar um atributo e pôr
 * um ponto nele.
 *
 * Com ponto, vai de −1 (um ponto) a +3 (cinco). Com mais de um atributo de
 * origem, vale o maior. O reforço entra depois, e só a partir de 3 no
 * atributo de apoio.
 *
 * É o bônus que entra na rolagem; o atributo em si não entra de novo, senão a
 * mesma escolha contaria duas vezes no mesmo teste.
 */
export function valorDaCompetencia(ficha, idDaCompetencia) {
  const competencia = COMPETENCIAS.find(c => c.id === idDaCompetencia);
  if (!competencia) return 0;
  const maior = Math.max(...competencia.de.map(id => valorDoAtributo(ficha, id)));
  // Sem ponto é sem ponto: o reforço não salva quem não investiu no principal.
  if (maior <= ATRIBUTO_MINIMO) return COMPETENCIA_MINIMA;
  const apoio = competencia.reforco ? valorDoAtributo(ficha, competencia.reforco) : 0;
  const reforco = apoio >= REFORCO_A_PARTIR_DE ? REFORCO_BONUS : 0;
  return limitar(maior - 2 + reforco, COMPETENCIA_MINIMA, COMPETENCIA_MAXIMA);
}

/** O reforço está pago nesta ficha? A tela mostra isso ao lado do número. */
export const reforcoAtivo = (ficha, idDaCompetencia) => {
  const competencia = COMPETENCIAS.find(c => c.id === idDaCompetencia);
  if (!competencia?.reforco) return false;
  if (Math.max(...competencia.de.map(id => valorDoAtributo(ficha, id))) <= ATRIBUTO_MINIMO) return false;
  return valorDoAtributo(ficha, competencia.reforco) >= REFORCO_A_PARTIR_DE;
};

/** Todas as competências de uma vez, para a tela não recalcular uma a uma. */
export const competenciasDaFicha = ficha => Object.fromEntries(
  COMPETENCIAS.map(c => [c.id, valorDaCompetencia(ficha, c.id)]),
);

/** Quantos pontos de atributo esta ficha já gastou. */
export const pontosGastos = ficha =>
  ATRIBUTOS.reduce((total, a) => total + valorDoAtributo(ficha, a.id) - ATRIBUTO_MINIMO, 0);

export const pontosRestantes = ficha => PONTOS_DE_ATRIBUTO - pontosGastos(ficha);

/* ─── Rolagem ───────────────────────────────────────────────────────── */

/**
 * d20 + competência contra o alvo que o Mestre disse.
 *
 * O 1 e o 20 naturais não são só acerto e erro: o 1 alimenta o Pavor, que é
 * um dos gatilhos que a mesa definiu ("errar, tomar crítico num teste"). Por
 * isso eles saem marcados daqui, e não interpretados na tela.
 */
export function rolarTeste({ dado, competencia = 0, alvo = 15 }) {
  const face = limitar(dado, 1, DADO);
  const total = face + inteiro(competencia);
  const desastre = face === 1;
  const perfeito = face === DADO;
  return {
    face,
    bonus: inteiro(competencia),
    total,
    alvo: inteiro(alvo, 15),
    sucesso: perfeito || (!desastre && total >= inteiro(alvo, 15)),
    desastre,
    perfeito,
    // O 1 natural sempre custa Pavor, mesmo que o resto da conta passasse.
    geraPavor: desastre,
  };
}

/* ─── Pavor e Sanidade ──────────────────────────────────────────────── */

/**
 * O que acontece ao marcar medo ou desgaste.
 *
 * Os dois medidores ENCHEM: eles contam o quanto a pessoa já foi gasta, não
 * o quanto ela aguenta. Cheios, vem a visão — sempre apavorante, mesmo
 * quando não é monstro nenhum. Aí a pessoa escolhe, e é a escolha que custa:
 * ceder tira 1 de PV; resistir recua o medidor em dois e a cena segue.
 *
 * Devolve o estado novo e, quando for o caso, o aviso de que há uma visão na
 * mesa esperando resposta. Quem aplica a resposta é `responderAVisao`.
 */
export function marcar(ficha, qual, quantidade = 1) {
  const maximo = qual === 'pavor' ? PAVOR_MAXIMO : SANIDADE_MAXIMA;
  const atual = limitar(ficha?.[qual], 0, maximo);
  const proximo = limitar(atual + inteiro(quantidade, 1), 0, maximo);
  return {
    ...ficha,
    [qual]: proximo,
    visaoPendente: proximo >= maximo ? qual : (ficha?.visaoPendente || ''),
  };
}

/** Tirar marcas: calmaria, conforto, um vestígio de normalidade. */
export function aliviar(ficha, qual, quantidade = 1) {
  const maximo = qual === 'pavor' ? PAVOR_MAXIMO : SANIDADE_MAXIMA;
  const proximo = limitar(limitar(ficha?.[qual], 0, maximo) - inteiro(quantidade, 1), 0, maximo);
  return { ...ficha, [qual]: proximo, visaoPendente: proximo >= maximo ? ficha?.visaoPendente : '' };
}

/**
 * A resposta à visão.
 *
 * `cedeu` verdadeiro: a pessoa aceita o que a visão mostra. Custa 1 de PV e o
 * medidor recua igual — o preço foi pago em outro lugar.
 * `cedeu` falso: ela resiste. Nada de dano, e o medidor volta dois abaixo do
 * máximo, que é pouco: a próxima vez vem logo.
 */
export function responderAVisao(ficha, { cedeu }) {
  const qual = ficha?.visaoPendente;
  if (!qual) return ficha;
  const maximo = qual === 'pavor' ? PAVOR_MAXIMO : SANIDADE_MAXIMA;
  const pvMaximo = pvDaIdade(ficha?.idade);
  return {
    ...ficha,
    [qual]: Math.max(0, maximo - RECUO_AO_RESISTIR),
    pv: cedeu ? limitar((ficha?.pv ?? pvMaximo) - 1, 0, pvMaximo) : limitar(ficha?.pv ?? pvMaximo, 0, pvMaximo),
    visaoPendente: '',
  };
}

/* ─── A ficha ───────────────────────────────────────────────────────── */

export function fichaNova(nome = '') {
  return {
    nome: String(nome || ''),
    idade: '',
    ocupacao: '',
    historico: '',
    atributos: Object.fromEntries(ATRIBUTOS.map(a => [a.id, ATRIBUTO_MINIMO])),
    pv: PV_ADULTO,
    pavor: 0,
    sanidade: 0,
    sorte: PONTOS_DE_SORTE,
    talento: '',
    talentoResumo: '',
    retrato: '',
    // A cor da ficha rápida do mapa. É do jogador, não do Mestre: numa mesa
    // de cinco primos parecidos, é o jeito mais rápido de se achar.
    corDaFichaRapida: COR_PADRAO,
    // Ligado por padrão; o Mestre desliga por ficha na Condição.
    retratoPerturbador: true,
    visaoPendente: '',
    dono: '',
    criadoEm: Date.now(),
  };
}

/**
 * Põe a ficha dentro das regras sem apagar o que a pessoa escreveu.
 *
 * O PV acompanha a idade: trocar 30 por 12 numa ficha já aberta rebaixa o
 * teto para 3, e um PV de 5 guardado ali viraria vida que o sistema não
 * reconhece.
 */
export function normalizar(ficha) {
  const base = fichaNova();
  const atributos = Object.fromEntries(
    ATRIBUTOS.map(a => [a.id, limitar(ficha?.atributos?.[a.id], ATRIBUTO_MINIMO, ATRIBUTO_MAXIMO)]),
  );
  const pvMaximo = pvDaIdade(ficha?.idade);
  return {
    ...base,
    ...ficha,
    atributos,
    pv: limitar(ficha?.pv ?? pvMaximo, 0, pvMaximo),
    pavor: limitar(ficha?.pavor, 0, PAVOR_MAXIMO),
    sanidade: limitar(ficha?.sanidade, 0, SANIDADE_MAXIMA),
    sorte: limitar(ficha?.sorte ?? PONTOS_DE_SORTE, 0, PONTOS_DE_SORTE),
  };
}

export const pvMaximoDaFicha = ficha => pvDaIdade(ficha?.idade);
export const estaMorto = ficha => limitar(ficha?.pv, 0, PV_ADULTO) <= 0;

/* ─── O quanto a noite já cobrou ────────────────────────────────────────
 *
 * A ficha reage ao estado do personagem — sangue nas bordas, pulsação,
 * riscos no papel — e quem decide a intensidade é esta função, sozinha.
 *
 * Ela existe para a DIREÇÃO morar num lugar só. Vida CAI e os dois medidores
 * ENCHEM, então "pior" é número baixo num caso e alto nos outros, e espalhar
 * essa inversão por dezenas de regras de CSS é como se escreve um bug que
 * ninguém acha: bastaria um `>` trocado para a ficha ficar sangrenta quando o
 * personagem está ótimo.
 *
 * Devolve 0 a 3 para cada coisa, onde 0 é inteiro e 3 é o fim da linha. O CSS
 * só olha esses números e nunca os valores crus.
 */
export function deterioracao(ficha) {
  const f = normalizar(ficha);
  const pvMaximo = pvMaximoDaFicha(f);

  // Vida cai: a fração que SOBROU é o que importa, porque 2 de 3 e 2 de 5 são
  // situações bem diferentes na mesa.
  const sobra = pvMaximo > 0 ? f.pv / pvMaximo : 0;
  const ferida = f.pv <= 0 ? 3 : sobra <= 0.34 ? 3 : sobra <= 0.6 ? 2 : sobra < 1 ? 1 : 0;

  // Pavor e Sanidade enchem: cheio é o pior, e o passo antes do cheio já
  // precisa aparecer, senão o aviso chega junto com a visão e não avisa nada.
  const escala = (valor, maximo) => {
    if (maximo <= 0) return 0;
    const parte = valor / maximo;
    return parte >= 1 ? 3 : parte >= 0.66 ? 2 : parte > 0 ? 1 : 0;
  };

  return Object.freeze({
    ferida,
    pavor: escala(f.pavor, PAVOR_MAXIMO),
    sanidade: escala(f.sanidade, SANIDADE_MAXIMA),
  });
}

/**
 * O retrato se altera quando a sanidade está no fim.
 *
 * Fica atrás de uma chave do Mestre porque nem toda mesa quer isto: mexer na
 * cara do personagem de alguém sem avisar é o tipo de susto que cai mal com
 * quem não pediu. `retratoPerturbador: false` na ficha desliga para ela.
 */
export const RETRATO_PERTURBA_A_PARTIR_DE = 3;
export const retratoPerturbado = ficha =>
  ficha?.retratoPerturbador !== false
  && deterioracao(ficha).sanidade >= RETRATO_PERTURBA_A_PARTIR_DE;
