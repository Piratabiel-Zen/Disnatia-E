/**
 * O BILHETE
 *
 * Um papel que chega para UM primo só, e que os outros não sabem que existe.
 *
 * A ideia vem de Nira Oni: entre as notas espalhadas pelo hospital há uma
 * dizendo que dá para sobreviver entregando outra pessoa no seu lugar — e o
 * estrago começa quando um personagem a encontra primeiro. Não é o susto que
 * trabalha ali; é o fato de a mesa deixar de ter a mesma informação.
 *
 * Por isso este arquivo é pequeno e teimoso numa coisa só: o bilhete tem um
 * DESTINATÁRIO, e tudo o que o site mostra passa por essa pergunta antes de
 * qualquer outra.
 *
 * LIMITE QUE PRECISA ESTAR ESCRITO: o segredo é de tela, não de cofre. O
 * documento existe no banco da mesa e alguém com o console aberto consegue
 * lê-lo, como já acontece com o selo da ficha. Serve contra o primo
 * curioso, não contra o primo programador — e é bom o Mestre saber disso
 * antes de escrever algo que não pode vazar de jeito nenhum.
 */

export const TAMANHO_MAXIMO = 900;

/**
 * Os bilhetes que o Mestre pode mandar com um clique.
 *
 * O primeiro é o de Nira Oni, e está aqui porque é o único que muda a mesa
 * sozinho: a partir dele, todo silêncio de quem recebeu passa a significar
 * alguma coisa. Os outros três são variações do mesmo princípio — dão a uma
 * pessoa um pedaço de verdade que ela vai ter de decidir se conta.
 */
export const BILHETES_PRONTOS = Object.freeze([
  {
    id: 'sacrificio',
    rotulo: 'A saída',
    texto: 'A casa aceita uma troca. Quem leva outro até o porão '
      + 'atravessa a noite inteiro. Não precisa ser agora. Precisa ser '
      + 'antes do amanhecer.',
  },
  {
    id: 'mentira',
    rotulo: 'Alguém mente',
    texto: 'Um dos seus primos já esteve nesta casa antes, sozinho, e '
      + 'não contou a ninguém. Você sabe disso porque a letra no caderno '
      + 'é a mesma de um bilhete que você guardou.',
  },
  {
    id: 'contagem',
    rotulo: 'A contagem errada',
    texto: 'Conte de novo. Vocês chegaram em cinco. Há seis pares de '
      + 'sapatos na entrada, e um deles está molhado.',
  },
  {
    id: 'chamado',
    rotulo: 'O chamado',
    texto: 'A voz do vovô te chamou pelo nome. Só o seu. Ela veio do '
      + 'andar de cima e pediu que você não contasse para os outros.',
  },
]);

export const bilhetePronto = id =>
  BILHETES_PRONTOS.find(b => b.id === String(id)) || null;

/** O documento, como vai para o banco. Nulo se não dá para entregar. */
export function bilheteParaEntregar({ para, texto, agora = Date.now() }) {
  const destino = String(para || '').trim();
  const corpo = String(texto || '').trim().slice(0, TAMANHO_MAXIMO);
  // Sem destinatário não é bilhete secreto, é recado — e recado em mesa de
  // terror o Mestre dá falando, que é mais rápido e assusta mais.
  if (!destino || !corpo) return null;
  return { para: destino, texto: corpo, em: Number(agora) || 0, aberto: false };
}

/**
 * Os bilhetes desta pessoa, do mais novo para o mais velho.
 *
 * Note que a filtragem é por ficha e não por conta: numa mesa um jogador
 * pode estar com a ficha de outro no colo, e o que manda é de quem é a
 * ficha aberta na tela.
 */
export function bilhetesDe(registros = [], sheetId) {
  const meu = String(sheetId || '');
  if (!meu) return [];
  return (registros || [])
    .filter(b => b && String(b.para) === meu && String(b.texto || '').trim())
    .slice()
    .sort((a, b) => (Number(b?.em) || 0) - (Number(a?.em) || 0));
}

/** O que ainda não foi aberto: é isso que faz o papel subir na tela. */
export const porAbrir = (registros, sheetId) =>
  bilhetesDe(registros, sheetId).filter(b => !b.aberto);

/**
 * Quantos bilhetes correm na mesa, para o painel do Mestre.
 *
 * Ele precisa deste número por um motivo prático: depois de três cenas
 * ninguém lembra quem recebeu o quê, e entregar "A saída" para dois primos
 * ao mesmo tempo transforma a melhor carta da noite numa conversa.
 */
export function resumoDaMesa(registros = [], sheets = []) {
  const porFicha = new Map();
  for (const b of registros || []) {
    if (!b?.para) continue;
    porFicha.set(String(b.para), (porFicha.get(String(b.para)) || 0) + 1);
  }
  return (sheets || []).map(f => ({
    id: String(f.id),
    nome: f.nome || 'sem nome',
    quantos: porFicha.get(String(f.id)) || 0,
  }));
}
