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
 *  - competência NÃO é comprada: ela escala do atributo, atributo − 1
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
export const TALENTOS_POR_PERSONAGEM = 1;

/** Atributos vão de 1 a 5; na criação, nada passa de 4. */
export const ATRIBUTO_MINIMO = 1;
export const ATRIBUTO_MAXIMO = 5;
export const ATRIBUTO_MAXIMO_NA_CRIACAO = 4;
/** Todos começam em 1 e a pessoa distribui estes pontos entre os oito. */
export const PONTOS_DE_ATRIBUTO = 12;

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
 */
export const COMPETENCIAS = Object.freeze([
  { id: 'atletismo', nome: 'Atletismo', de: ['forca', 'agilidade'], resumo: 'Correr, nadar, saltar.' },
  { id: 'furtividade', nome: 'Furtividade', de: ['agilidade'], resumo: 'Esconder-se e caminhar sem ruído.' },
  { id: 'investigacao', nome: 'Investigação', de: ['inteligencia'], resumo: 'Analisar evidências e documentos.' },
  { id: 'sobrevivencia', nome: 'Sobrevivência', de: ['percepcao', 'inteligencia'], resumo: 'Rastrear, orientar-se, encontrar abrigo.' },
  { id: 'persuasao', nome: 'Persuasão', de: ['carisma'], resumo: 'Convencer e negociar.' },
  { id: 'enganacao', nome: 'Enganação', de: ['carisma'], resumo: 'Mentir, blefar, disfarçar intenções.' },
  { id: 'medicina', nome: 'Medicina', de: ['inteligencia'], resumo: 'Primeiros socorros e tratamentos.' },
  { id: 'tecnologia', nome: 'Tecnologia', de: ['inteligencia'], resumo: 'Computadores, eletrônicos e outros sistemas.' },
  // A escala desta não veio junto com as outras onze. Precisão pela mão e
  // Inteligência pelo entendimento do mecanismo — é o par que o resto da
  // tabela sugere para consertar, forçar e operar máquina.
  { id: 'mecanica', nome: 'Mecânica', de: ['precisao', 'inteligencia'], resumo: 'Consertar, forçar e operar máquinas.' },
  { id: 'ocultismo', nome: 'Ocultismo', de: ['inteligencia'], resumo: 'Reconhecer símbolos e tradições sobrenaturais.' },
  { id: 'pilotagem', nome: 'Pilotagem', de: ['precisao', 'agilidade'], resumo: 'Conduzir veículos.' },
  { id: 'combate', nome: 'Combate', de: ['forca', 'precisao'], resumo: 'Armas e técnicas de luta.' },
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
 * A competência derivada: atributo − 1, nunca abaixo de zero.
 *
 * Com mais de um atributo de origem, vale o maior. É o bônus que entra na
 * rolagem; o atributo em si não entra de novo, senão a mesma escolha contaria
 * duas vezes no mesmo teste.
 */
export function valorDaCompetencia(ficha, idDaCompetencia) {
  const competencia = COMPETENCIAS.find(c => c.id === idDaCompetencia);
  if (!competencia) return 0;
  const maior = Math.max(...competencia.de.map(id => valorDoAtributo(ficha, id)));
  return Math.max(0, maior - 1);
}

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
