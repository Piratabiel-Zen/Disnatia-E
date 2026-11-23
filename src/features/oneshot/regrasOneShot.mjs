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
    titulo: 'O que é uma noite destas',
    corpo: [
      'Uma história fechada, do começo ao fim, numa sessão. Os personagens são gente comum — não há treinamento, não há dom, não há quem já tenha visto isto antes.',
      'Ninguém evolui. Não há experiência para gastar nem nível a subir: o que a ficha diz no começo é o que ela diz no fim. O que muda ao longo da noite é só o quanto a pessoa foi gasta.',
      'E ela pode acabar. Morrer é um desfecho possível, e perder a cabeça também. Uma mesa que não aceita isso está jogando outra coisa.',
    ],
  },
  {
    id: 'rolagem',
    titulo: 'Como se rola',
    corpo: [
      `Um d20, mais a competência que couber, contra um número que o Mestre diz. Igual ou acima, passou.`,
      `A régua de dificuldade: ${regua}. O Mestre escolhe antes de a pessoa rolar, e diz em voz alta.`,
      `20 natural passa, somando o que somar. 1 natural falha, somando o que somar — e custa 1 de Pavor.`,
      'Se não há risco nem pressa, não se rola: a pessoa simplesmente faz. Dado só entra quando falhar significa alguma coisa.',
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
      `Vida: ${PV_ADULTO} pontos. De ${IDADE_JOVEM_MIN} a ${IDADE_JOVEM_MAX} anos, ${PV_JOVEM} — é mais frágil mesmo, e a mesa deve saber disso antes de pôr uma criança na história.`,
      `Pavor vai até ${PAVOR_MAXIMO} e Sanidade até ${SANIDADE_MAXIMA}. Os dois ENCHEM: eles contam o quanto a pessoa já foi gasta, não o quanto ela ainda aguenta.`,
      'Enchem com o que acontece e com o que se escolhe: levar um susto, falhar feio, tirar 1 natural, fazer barulho onde não se podia fazer nenhum, ver o que não devia.',
      'Momento de calma, conforto ou um vestígio de normalidade tira marca. É pouco, e é curto.',
    ],
  },
  {
    id: 'visao',
    titulo: 'A visão',
    corpo: [
      'Quando um dos dois medidores enche, vem uma visão. Ela é sempre apavorante — nem sempre monstro, às vezes só uma coisa muito errada sobre a própria pessoa.',
      'E ela oferece alguma coisa. Aí a pessoa escolhe, na frente da mesa.',
      `Ceder: perde 1 de Vida. O que a visão mostrou entra na história e o Mestre usa depois.`,
      `Resistir: nada de dano, e o medidor recua ${RECUO_AO_RESISTIR}. Fica a ${RECUO_AO_RESISTIR} do máximo — o alívio é curto de propósito, e a próxima visão vem logo.`,
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
      'O Mural é onde a mesa junta o que descobriu. Qualquer pessoa prega e liga cartões; cada uma mexe no que ela mesma pregou.',
      'As Aparições são do Mestre: itens, páginas, cenários e criaturas que ele revela quando a cena chega. O que não foi revelado não existe para a mesa.',
      'Não há iniciativa nem turno. Quando a ordem importa, o Mestre pergunta o que cada um está fazendo e resolve na ordem que fizer sentido.',
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
