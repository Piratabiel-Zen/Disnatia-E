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

/**
 * DOIS, e não três nem cinco.
 *
 * O Pavor encolheu de novo depois do teste de mesa. Ele não é mais um
 * medidor de desgaste: é um PAVIO. Dois sustos e ele estoura, e o que
 * sobra do estouro não é dano — é Sanidade, que não volta sozinha.
 *
 * O medidor curto faz o estouro acontecer DENTRO da cena em que o medo
 * aconteceu, e não três cenas depois, quando a mesa já esqueceu o que deu
 * medo. É o que liga a causa ao preço.
 */
export const PAVOR_MAXIMO = 2;

/**
 * A Sanidade é o que fica, e ela tem degraus com nome.
 *
 *   4  as visões começam, e a vista embaça
 *   5  −1 em tudo: a pessoa já não é confiável nem para si mesma
 *   6  cai
 *
 * Seis continua sendo o teto porque é onde a criança desaba — e desabar
 * não é morrer. Alguém a levanta, e ela volta ao 5.
 */
export const SANIDADE_MAXIMA = 6;
export const SANIDADE_VISOES = 4;
export const SANIDADE_DESVANTAGEM = 5;
export const DESVANTAGEM_DA_SANIDADE = -1;

/**
 * Quem levanta um caído devolve um degrau, e só um.
 *
 * A pessoa sai do chão em 5, que é o degrau da desvantagem: ela se
 * levanta já pior do que entrou. Devolver mais do que isso faria o
 * desabamento ser de graça, e desabar é a coisa mais séria que acontece
 * com um personagem nesta noite.
 */
export const ALIVIO_AO_LEVANTAR = 1;

export const PONTOS_DE_SORTE = 1;
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
/**
 * QUATRO, e não três.
 *
 * A conta é `maior - 2 + reforço`: atributo 5 dá 3, e o reforço pago leva
 * a 4. Com o teto em 3 esse último ponto era descartado em silêncio — a
 * pessoa investia no reforço e a ficha não mudava, que é a pior forma de
 * um sistema dizer não.
 */
export const COMPETENCIA_MAXIMA = 4;

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
  /* Vontade virou BASE aqui, e não mais reforço.
     Como reforço ela era um interruptor: 3 ligava o +1 e o quarto e o
     quinto ponto não faziam nada. Agora ela escala sozinha — quem aguenta
     a mata é quem tem Vontade, mesmo sem reparar em nada. Força entrou
     como reforço porque passar a noite fora cobra corpo também. */
  { id: 'sobrevivencia', nome: 'Sobrevivência', de: ['percepcao', 'vontade'], reforco: 'forca',
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
  /* Ocultismo também: ler o símbolo é Inteligência, mas continuar lendo
     depois de entender o que ele quer dizer é Vontade. */
  { id: 'ocultismo', nome: 'Ocultismo', de: ['inteligencia', 'vontade'], reforco: 'percepcao',
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

  const bases = competencia.de
    .map(id => valorDoAtributo(ficha, id))
    .sort((a, b) => b - a);
  const maior = bases[0] ?? 0;
  // Sem ponto é sem ponto: o reforço não salva quem não investiu no principal.
  if (maior <= ATRIBUTO_MINIMO) return COMPETENCIA_MINIMA;

  /* A SEGUNDA BASE PASSA A CONTAR.
     Antes era `Math.max` puro, e isso fazia Sobrevivência depender só de
     Percepção OU de Vontade — investir na outra não mudava um número
     sequer. Quem pôs cinco em Percepção e quatro em Vontade tinha
     exatamente a mesma Sobrevivência de quem pôs cinco e zero.

     Agora a segunda dá +1 ao cruzar o mesmo limiar do reforço. É pouco de
     propósito: ela não pode valer tanto quanto a principal, senão a
     escolha de uma base vira irrelevante — mas é o que permite as
     competências de duas origens chegarem ao teto. */
  const segunda = bases[1] ?? 0;
  const bonusDaSegunda = segunda >= REFORCO_A_PARTIR_DE ? REFORCO_BONUS : 0;

  const apoio = competencia.reforco ? valorDoAtributo(ficha, competencia.reforco) : 0;
  const reforco = apoio >= REFORCO_A_PARTIR_DE ? REFORCO_BONUS : 0;

  return limitar(maior - 2 + bonusDaSegunda + reforco, COMPETENCIA_MINIMA, COMPETENCIA_MAXIMA);
}

/**
 * A segunda base está pagando? A tela mostra isso ao lado do número.
 *
 * Separado de `reforcoAtivo` porque são dois bônus diferentes, com fontes
 * diferentes: este vem de uma das origens da competência, aquele vem do
 * atributo de apoio. Um `+1` sem dizer de onde veio obriga a pessoa a
 * abrir a tabela para descobrir no que investir.
 */
export const segundaBaseAtiva = (ficha, idDaCompetencia) => {
  const competencia = COMPETENCIAS.find(c => c.id === idDaCompetencia);
  if (!competencia || competencia.de.length < 2) return false;
  const bases = competencia.de.map(id => valorDoAtributo(ficha, id)).sort((a, b) => b - a);
  if (bases[0] <= ATRIBUTO_MINIMO) return false;
  return bases[1] >= REFORCO_A_PARTIR_DE;
};

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

/* ─── Pavor, o pavio ──────────────────────────────────────────────────
 *
 * O Pavor não mede desgaste: ele é um pavio de dois pontos. Dois sustos e
 * estoura — e o que sobra do estouro não é dano, é Sanidade, que não volta
 * sozinha.
 *
 * Entre encher e estourar há um teste de VONTADE. É o único lugar do
 * sistema onde a pessoa pode segurar o que está acontecendo com ela, e é
 * por isso que Vontade existe.
 */

/** Marcar Pavor ou Sanidade. Pavor cheio arma o teste de Vontade. */
export function marcar(ficha, qual, quantidade = 1) {
  const maximo = qual === 'pavor' ? PAVOR_MAXIMO : SANIDADE_MAXIMA;
  const atual = limitar(ficha?.[qual], 0, maximo);
  const proximo = limitar(atual + inteiro(quantidade, 1), 0, maximo);
  const base = { ...ficha, [qual]: proximo };

  /* Só o Pavor arma teste. A Sanidade não tem teste para resistir: ela já
     é o resultado de um teste perdido, e deixá-la cobrar um segundo teste
     seria cobrar duas vezes pelo mesmo susto. */
  if (qual !== 'pavor') return comQuedaResolvida(base);
  return { ...base, pavorNoLimite: proximo >= PAVOR_MAXIMO };
}

/** Tirar marcas: calmaria, conforto, um vestígio de normalidade. */
export function aliviar(ficha, qual, quantidade = 1) {
  const maximo = qual === 'pavor' ? PAVOR_MAXIMO : SANIDADE_MAXIMA;
  const proximo = limitar(limitar(ficha?.[qual], 0, maximo) - inteiro(quantidade, 1), 0, maximo);
  const base = { ...ficha, [qual]: proximo };
  if (qual === 'pavor') return { ...base, pavorNoLimite: proximo >= PAVOR_MAXIMO };
  /* Aliviar Sanidade pode tirar a pessoa do chão. Mas não é isso que a
     levanta: quem levanta é `levantar`, com alguém ao lado. Aqui só o
     número desce — a pessoa continua caída até ser erguida. */
  return comQuedaResolvida(base);
}

/**
 * A resposta ao Pavor cheio.
 *
 * `resistiu` verdadeiro: ela segurou. O pavio volta a zero e nada mais
 * acontece — e é o único resultado do sistema em que não se paga nada.
 * `resistiu` falso: o pavio volta a zero do mesmo jeito, e ela leva 1 de
 * SANIDADE. Não é dano: é o estrago que fica.
 *
 * Nos dois casos o Pavor zera. Se ele ficasse cheio depois de falhar, o
 * próximo susto da mesma cena cobraria de novo, e a cena viraria uma
 * escada sem corrimão.
 */
export function responderAoPavor(ficha, { resistiu }) {
  const base = { ...ficha, pavor: 0, pavorNoLimite: false };
  if (resistiu) return base;
  return comQuedaResolvida({
    ...base,
    sanidade: limitar((ficha?.sanidade ?? 0) + 1, 0, SANIDADE_MAXIMA),
  });
}

/* ─── A escada da Sanidade ────────────────────────────────────────────
 *
 * Ela não cobra nada até o 4. Dali em diante cobra em degraus, e cada
 * degrau é pior que o anterior de um jeito diferente — não é o mesmo
 * castigo ficando maior.
 */

/** O que a Sanidade está fazendo com esta pessoa agora. */
export function estadoDaSanidade(ficha) {
  const n = limitar(ficha?.sanidade, 0, SANIDADE_MAXIMA);
  return {
    nivel: n,
    /* 4: as visões começam e a vista embaça. Não tira número nenhum — o
       custo é que a pessoa deixa de saber o que viu de verdade, e isso é
       com o Mestre, não com o dado. */
    visoes: n >= SANIDADE_VISOES,
    /* 5: −1 em tudo. O primeiro degrau que aparece na rolagem. */
    desvantagem: n >= SANIDADE_DESVANTAGEM,
    modificador: n >= SANIDADE_DESVANTAGEM ? DESVANTAGEM_DA_SANIDADE : 0,
    /* 6: caiu. A Vida vai a zero e ela fica no chão até alguém chegar. */
    caida: n >= SANIDADE_MAXIMA || Boolean(ficha?.caida),
  };
}

/** Sanidade no teto derruba e zera a Vida; abaixo dele, nada muda sozinho. */
function comQuedaResolvida(ficha) {
  const n = limitar(ficha?.sanidade, 0, SANIDADE_MAXIMA);
  if (n < SANIDADE_MAXIMA) return ficha;
  return { ...ficha, caida: true, pv: 0 };
}

/**
 * Levantar um caído.
 *
 * Quem faz isso é outra pessoa, ao lado — acalmando, falando, segurando.
 * Devolve UM degrau, e só um: ela se põe de pé no 5, já pior do que
 * entrou, e com 1 de Vida. Devolver mais faria desabar sair de graça, e
 * desabar é a coisa mais séria que acontece com alguém nesta noite.
 *
 * Do 5 em diante, só ajuda de fora ou item fazem o número descer. Não
 * existe recuperar sozinho: é essa a diferença entre Pavor e Sanidade.
 */
export function levantar(ficha) {
  if (!estadoDaSanidade(ficha).caida) return ficha;
  const pvMaximo = pvDaIdade(ficha?.idade);
  return {
    ...ficha,
    caida: false,
    sanidade: limitar(SANIDADE_MAXIMA - ALIVIO_AO_LEVANTAR, 0, SANIDADE_MAXIMA),
    pv: limitar(Math.max(1, ficha?.pv ?? 0), 0, pvMaximo),
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
    pavorNoLimite: false,
    caida: false,
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
