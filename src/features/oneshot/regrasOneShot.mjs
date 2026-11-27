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
  SANIDADE_VISOES, SANIDADE_DESVANTAGEM, DESVANTAGEM_DA_SANIDADE, ALIVIO_AO_LEVANTAR,
  TALENTOS_POR_PERSONAGEM, ATRIBUTO_MINIMO, ATRIBUTO_MAXIMO,
  COMPETENCIA_MINIMA, COMPETENCIA_MAXIMA, REFORCO_A_PARTIR_DE, REFORCO_BONUS,
} from './fichaOneShot.mjs';
import { TALENTOS } from './talentosOneShot.mjs';

const regua = DIFICULDADES.map(d => `${d.nome} ${d.alvo}`).join(', ');

export const SECOES_DAS_REGRAS = Object.freeze([
  {
    id: 'o-que-e',
    ordem: 1,
    numeral: 'I',
    emblema: 'casa',
    abertura: 'Uma história que começa e termina na mesma noite.',
    titulo: 'Do que trata esta noite',
    corpo: [
      'Uma história que começa e termina na mesma noite. Quem a atravessa é gente comum: nenhum dom, nenhum treino, ninguém que já tenha visto isto antes e sobrevivido para contar direito.',
      'Não se evolui aqui. Não há experiência a juntar nem degrau a subir — o que a ficha declara no começo é o que ela declara no fim, menos o que a noite tiver levado.',
      'E ela leva. Morrer é um desfecho; enlouquecer é outro, e nem sempre é o mais brando. Mesa que não aceita perder personagem está jogando outra coisa, e tudo bem — mas não é isto.',
    ],
  },
  {
    id: 'rolagem',
    ordem: 2,
    numeral: 'II',
    emblema: 'dado',
    abertura: 'Um d20, mais a competência que couber, contra o número que o Mestre declara.',
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
    ordem: 3,
    numeral: 'III',
    emblema: 'mao',
    abertura: 'Oito números, e o que você deixa em branco custa a noite inteira.',
    titulo: 'Os oito atributos',
    corpo: [
      `Força, Agilidade, Precisão, Inteligência, Percepção, Carisma, Vontade e Sorte. Todos começam em ${ATRIBUTO_MINIMO} e a pessoa distribui ${PONTOS_DE_ATRIBUTO} pontos entre eles, até ${ATRIBUTO_MAXIMO} em cada.`,
      `Deixar um atributo em ${ATRIBUTO_MINIMO} é permitido, e é uma decisão de verdade: as competências dele ficam em ${COMPETENCIA_MINIMA} pela noite toda, e nada as tira dali. Ninguém é bom em tudo às três da manhã.`,
      'A lista é fixa e igual para todos. Quem a pessoa é aparece nos números, na ocupação e no histórico — não em escolher atributos diferentes dos outros.',
    ],
  },
  {
    id: 'competencias',
    ordem: 4,
    numeral: 'IV',
    emblema: 'chave',
    abertura: 'Competência não se compra: ela escala do que você é.',
    titulo: 'As doze competências',
    corpo: [
      `Competência não se compra: ela escala do atributo que a sustenta, menos dois. Atributo 3 dá +1; atributo ${ATRIBUTO_MAXIMO} dá ${COMPETENCIA_MAXIMA}, que é o teto.`,
      `Atributo com um ponto só dá ${COMPETENCIA_MINIMA + 1}. Atributo sem ponto nenhum dá ${COMPETENCIA_MINIMA}, sempre — essa é a única competência que nenhum reforço alcança.`,
      'Quando duas coisas sustentam a mesma competência, vale a maior das duas: quem é forte ou ágil corre bem, e não precisa ser as duas.',
      `E toda competência tem um segundo atributo, de apoio. A partir de ${REFORCO_A_PARTIR_DE} nesse atributo, a competência ganha +${REFORCO_BONUS}. Sobrevivência escala de Percepção, mas quem aguenta a mata é quem tem Vontade; Enganação escala de Carisma, mas mentir bem também é Sorte.`,
      'O apoio é o que tira Vontade e Sorte do papel de enfeite — antes ninguém os comprava, porque não levantavam nada.',
      'Por isso a ficha não tem onde marcar competência: ela se recalcula sozinha quando o atributo muda, e mostra ao lado de cada uma de onde vem o reforço e se ele já está pago.',
    ],
  },
  {
    id: 'condicoes',
    ordem: 5,
    numeral: 'V',
    emblema: 'coracao',
    abertura: 'A vida cai. O pavor estoura. A sanidade não volta.',
    titulo: 'Vida, Pavor e Sanidade',
    corpo: [
      `Vida: ${PV_ADULTO} pontos. Dos ${IDADE_JOVEM_MIN} aos ${IDADE_JOVEM_MAX} anos, ${PV_JOVEM} — corpo pequeno quebra antes, e a mesa precisa saber disso antes de pôr uma criança nesta história, não depois.`,

      `PAVOR é um pavio de ${PAVOR_MAXIMO} pontos, e estourar NÃO tira vida. Quando ele chega em ${PAVOR_MAXIMO}, a pessoa rola VONTADE para segurar. Segurou: o pavio zera e a cena segue. Não segurou: o pavio zera do mesmo jeito e ela leva 1 de Sanidade.`,

      'O pavio é curto de propósito. Assim o estouro acontece dentro da cena em que o medo aconteceu, e não três cenas depois, quando a mesa já esqueceu o que deu medo — é o que liga a causa ao preço.',

      'Enche com o que acontece e com o que se escolhe: um susto, uma falha feia, o 1 natural, barulho onde não se podia fazer nenhum. E, principalmente, olhar o que era melhor não ter olhado.',

      `SANIDADE vai até ${SANIDADE_MAXIMA} e não cicla: ela sobe e fica. Tem três degraus com nome.`,

      `${SANIDADE_VISOES} — começam as visões e a vista embaça. Não tira número nenhum: o custo é que a pessoa deixa de saber o que viu de verdade, e isso é com o Mestre, não com o dado.`,

      `${SANIDADE_DESVANTAGEM} — ${DESVANTAGEM_DA_SANIDADE} em TUDO que se rolar. É o degrau que aparece na conta, e onde a pessoa já não é confiável nem para si mesma.`,

      `${SANIDADE_MAXIMA} — ela cai. A Vida vai a zero e ela fica no chão. Não levanta sozinha: alguém precisa chegar perto e acalmar. Quem levantar devolve ${ALIVIO_AO_LEVANTAR} degrau — ela volta em ${SANIDADE_MAXIMA - ALIVIO_AO_LEVANTAR}, de pé, com 1 de vida e já com a desvantagem.`,

      'Daí para baixo a Sanidade só desce com ajuda de fora ou com um item. Sozinha ela não melhora, e é isso que faz a mesa se cuidar em vez de cada um correr para o seu lado.',
    ],
  },
  {
    id: 'esconder',
    ordem: 6,
    numeral: 'VI',
    emblema: 'olho',
    abertura: 'O relógio corre na tela. Ache um buraco antes de ele parar.',
    titulo: 'Esconder-se',
    corpo: [
      'Quando alguma coisa começa a caçar, o Mestre põe um relógio na tela e ele corre à vista de todos. O que vocês têm são aqueles segundos.',

      'ACHE UM LUGAR. O Mestre marca no mapa, com um ponto de luz, onde dá para se enfiar — o ponto pisca dois segundos e some, então preste atenção na hora em que ele aparecer. Quem não achou pode rolar SORTE: é o atributo de encontrar, no meio do susto, um buraco que ninguém tinha visto.',

      'ENTRE. O Mestre pode pedir um teste de competência para isso: Agilidade para passar por um vão, Atletismo para subir, Furtividade para fazer sem barulho. Nem todo esconderijo cobra — armário aberto não cobra nada.',

      'FIQUE. Aperte Esconder e você continua escondido até a cena acabar. Sair antes é escolha sua, e é escolha de verdade: ninguém de dentro do armário sabe o que está acontecendo lá fora.',

      'Se a criatura te vir, acabou: ou você é pega, ou leva o que o Mestre decidir que custa ter sido vista.',

      'Se ela não te vir, você está a salvo — com uma condição. Com a SANIDADE alta, estar a salvo não basta: o Mestre pede VONTADE para você segurar a respiração, ou não gritar, ou não sair correndo quando aquilo passar do outro lado da porta. Falhar aí é o que entrega um esconderijo perfeito.',
    ],
  },
  {
    id: 'sorte-e-talento',
    ordem: 7,
    numeral: 'VII',
    emblema: 'vela',
    abertura: 'Duas chances e uma permissão para quebrar uma regra.',
    titulo: 'Sorte e talento',
    corpo: [
      `${PONTOS_DE_SORTE} pontos de sorte na noite inteira. Cada um rola de novo um teste e fica com o segundo resultado, mesmo que seja pior. Não voltam.`,
      'Sorte, o atributo, é outra coisa: é o que o Mestre pede quando nada do que a pessoa é tem a ver com o que está acontecendo.',
      `${TALENTOS_POR_PERSONAGEM} talento especial por personagem, escolhido entre os ${TALENTOS.length} da aba de Talentos. É a única coisa que diferencia duas fichas de gente comum, então dois personagens da mesma mesa não deveriam repetir.`,
      'Talento não é poder nem número a mais: é permissão para quebrar uma regra, quase sempre uma vez só na noite. Quem guarda o talento até a hora certa costuma tomar a melhor decisão da mesa.',
      'Quase todos precisam ser declarados ANTES de o dado sair da mão. Dado na mesa cancela o talento — é o que evita a discussão no susto.',
      'Se nada na lista servir para o personagem que a pessoa escreveu, o Mestre pode inventar um: a ficha aceita talento de texto livre.',
    ],
  },
  {
    id: 'mesa',
    ordem: 8,
    numeral: 'VIII',
    emblema: 'portao',
    abertura: 'Não se evolui aqui. O que a ficha diz no começo é o que ela diz no fim.',
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
