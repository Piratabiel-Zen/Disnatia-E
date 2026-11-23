/**
 * ONE SHOT TERROR — AS REGRAS
 *
 * O texto que a mesa lê. Escrito para ser lido em cinco minutos antes de
 * começar, porque numa one-shot ninguém estuda sistema: lê a página, faz a
 * ficha e joga.
 *
 * Os números vêm de fichaOneShot.mjs, nunca escritos à mão aqui. Mudar o
 * máximo de Pavor lá muda o que esta página diz, e não existe a possibilidade
 * de a regra na tela discordar da regra que o código aplica.
 */
import {
  DIFICULDADES, PAVOR_MAXIMO, SANIDADE_MAXIMA, PONTOS_DE_SORTE, PV_ADULTO, PV_JOVEM,
  IDADE_JOVEM_MIN, IDADE_JOVEM_MAX, PONTOS_DE_ATRIBUTO, ATRIBUTO_MAXIMO_NA_CRIACAO,
  RECUO_AO_RESISTIR, TALENTOS_POR_PERSONAGEM, ATRIBUTO_MINIMO, ATRIBUTO_MAXIMO,
} from './fichaOneShot.mjs';

const regua = DIFICULDADES.map(d => `${d.nome} ${d.alvo}`).join(', ');

export const SECOES_DAS_REGRAS = Object.freeze([
  {
    id: 'o-que-e',
    titulo: 'Do que trata esta noite',
    corpo: [
      'Uma história que começa e termina na mesma noite. Quem a atravessa é gente comum: nenhum dom, nenhum treino, ninguém que já tenha visto isto antes e sobrevivido para contar direito.',
      'Não se evolui aqui. Não há experiência a juntar nem degrau a subir — o que a ficha declara no começo é o que ela declara no fim, menos o que a noite tiver levado.',
      'E ela leva. Morrer é um desfecho; enlouquecer é outro, e nem sempre é o mais brando. Mesa que não aceita perder personagem está jogando outra coisa, e tudo bem — mas não é isto.',
    ],
  },
  {
    id: 'rolagem',
    titulo: 'Como se rola',
    corpo: [
      'Um d20, mais a competência que couber, contra um número que o Mestre declara. Igual ou acima, passou.',
      `A régua: ${regua}. O Mestre escolhe antes de o dado sair da mão, e diz em voz alta — número combinado depois do resultado não é dificuldade, é sentença.`,
      '20 natural passa, some o que somar. 1 natural falha, some o que somar — e cobra 1 de Pavor, porque errar feio na frente do que está ali custa mais do que a tentativa.',
      'Sem risco e sem pressa, não se rola: a pessoa simplesmente faz. O dado só entra quando falhar significa alguma coisa — e, nesta casa, significa quase sempre.',
    ],
  },
  {
    id: 'atributos',
    titulo: 'Os oito atributos',
    corpo: [
      `Força, Agilidade, Precisão, Inteligência, Percepção, Carisma, Vontade e Sorte. Todos começam em ${ATRIBUTO_MINIMO} e a pessoa distribui ${PONTOS_DE_ATRIBUTO} pontos entre eles.`,
      `No começo da noite nada passa de ${ATRIBUTO_MAXIMO_NA_CRIACAO}; o teto do sistema é ${ATRIBUTO_MAXIMO}, reservado para o que a história conceder.`,
      'A lista é fixa e igual para todos. Quem a pessoa é aparece nos números, na ocupação e no histórico — não em escolher atributos diferentes dos outros.',
    ],
  },
  {
    id: 'competencias',
    titulo: 'As doze competências',
    corpo: [
      'Competência não se compra: ela escala do atributo. Uma competência vale o atributo que a sustenta menos um.',
      'Carisma 3 dá Persuasão 2. Quando duas coisas sustentam a mesma competência, vale a maior das duas — quem é forte ou ágil corre bem, e não precisa ser as duas.',
      'Por isso a ficha não tem onde marcar competência: ela se recalcula sozinha quando o atributo muda.',
    ],
  },
  {
    id: 'condicoes',
    titulo: 'Vida, Pavor e Sanidade',
    corpo: [
      `Vida: ${PV_ADULTO} pontos. Dos ${IDADE_JOVEM_MIN} aos ${IDADE_JOVEM_MAX} anos, ${PV_JOVEM} — corpo pequeno quebra antes, e a mesa precisa saber disso antes de pôr uma criança nesta história, não depois.`,
      `Pavor vai até ${PAVOR_MAXIMO}; Sanidade, até ${SANIDADE_MAXIMA}. Os dois ENCHEM, e é essa a diferença: eles não medem o que a pessoa aguenta, medem o quanto dela já foi gasto.`,
      'Enchem com o que acontece e com o que se escolhe. Um susto. Uma falha feia. O 1 natural. Barulho onde não se podia fazer nenhum. E, principalmente, olhar o que era melhor não ter olhado.',
      'Calma, conforto, um vestígio de normalidade — isso devolve marca. Pouco, e por pouco tempo. A casa tem mais noite do que vocês têm fôlego.',
    ],
  },
  {
    id: 'visao',
    titulo: 'A visão',
    corpo: [
      'Medidor cheio, vem a visão. Ela é sempre apavorante, e nem sempre é monstro: às vezes é só uma coisa muito errada a respeito de quem está olhando.',
      'E ela oferece. Toda visão oferece alguma coisa — alívio, resposta, saída. Aí a pessoa escolhe, em voz alta, na frente da mesa.',
      'CEDER custa 1 de Vida. O que a visão mostrou passa a fazer parte da história, e o Mestre vai usar isso.',
      `RESISTIR não custa nada agora, e o medidor recua ${RECUO_AO_RESISTIR}. Repare no tamanho desse alívio: ele é curto de propósito. A visão não foi embora — ela voltou para o fim da fila.`,
    ],
  },
  {
    id: 'sorte-e-talento',
    titulo: 'Sorte e talento',
    corpo: [
      `${PONTOS_DE_SORTE} pontos de sorte na noite inteira. Cada um rola de novo um teste e fica com o segundo resultado, mesmo que seja pior. Não voltam.`,
      'Sorte, o atributo, é outra coisa: é o que o Mestre pede quando nada do que a pessoa é tem a ver com o que está acontecendo.',
      `${TALENTOS_POR_PERSONAGEM} talento especial por personagem: uma coisa só que essa pessoa sabe fazer e as outras não. Vem da ocupação e do histórico, e quem aprova é o Mestre.`,
      'Talento não é poder. É "sou enfermeira, reconheço esse cheiro" ou "cresci nesta rua, sei onde o muro é baixo".',
    ],
  },
  {
    id: 'mesa',
    titulo: 'A noite em si',
    corpo: [
      'O Mural é onde vocês juntam o que foi sobrando. Qualquer um prega e amarra cartões; cada um mexe no que ele mesmo pregou. O que o Mestre pregar lá, fica.',
      'As Aparições são dele: itens, páginas, cômodos e o que mora neles. Ele revela quando a cena chega, e pode recolher. O que não foi revelado não existe para vocês — nem para discutir.',
      'Não há iniciativa, nem turno, nem ordem combinada. Quando o tempo importa, o Mestre pergunta o que cada um está fazendo e resolve na ordem que a cena pedir. Quem hesitar em voz alta, hesitou.',
    ],
  },
]);

/** Busca simples por palavra, para o Mestre achar a regra com a mesa esperando. */
export function buscarNasRegras(termo) {
  const alvo = String(termo || '').trim().toLowerCase();
  if (!alvo) return SECOES_DAS_REGRAS;
  return SECOES_DAS_REGRAS.filter(secao =>
    `${secao.titulo} ${secao.corpo.join(' ')}`.toLowerCase().includes(alvo));
}
