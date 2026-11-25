/**
 * A ASSOMBRAÇÃO
 *
 * O Mestre aperta um botão e a tela de TODO MUNDO escurece. A coisa aparece
 * aos poucos, fica, e some. É o único momento do sistema em que a interface
 * tira o controle das mãos do jogador — e é por isso que ele é curto, tem
 * duração escolhida pelo Mestre, e nunca trava nada.
 *
 * TRÊS DECISÕES QUE IMPORTAM:
 *
 *  - a assombração SEMPRE termina sozinha. Um Mestre que fecha a aba no meio,
 *    uma queda de rede, um jogador que chegou atrasado: em qualquer um desses
 *    casos a tela tem que voltar. Por isso o fim é calculado do horário de
 *    início, e não esperado de um segundo aviso que pode nunca chegar;
 *
 *  - quem entra no meio não vê o começo. A assombração não se repete para
 *    quem chegou depois — ela já aconteceu, e mostrar de novo para um só
 *    estragaria a cena que a mesa inteira já viveu;
 *
 *  - intensidade não é volume de efeito, é quanto da tela ela toma. "Vulto"
 *    é a coisa mal aparecendo no escuro; "Encarar" é ela ocupando tudo. O
 *    Mestre escolhe pela cena, não pelo susto.
 */

export const INTENSIDADES = Object.freeze([
  {
    id: 'vulto', nome: 'Vulto', ordem: 1,
    resumo: 'Mal se vê. Escurece pouco e ela não chega a ficar nítida.',
    veu: 0.72, nitidez: 0.4, escala: 0.82,
  },
  {
    id: 'presenca', nome: 'Presença', ordem: 2,
    resumo: 'Está ali, e dá para ver o que é.',
    veu: 0.88, nitidez: 0.78, escala: 0.94,
  },
  {
    id: 'encarar', nome: 'Encarar', ordem: 3,
    resumo: 'Toma a tela inteira. Use uma vez por noite, no máximo.',
    veu: 0.97, nitidez: 1, escala: 1.08,
  },
]);

export const DURACOES = Object.freeze([
  { id: 'relance', nome: 'Relance', ms: 2200, resumo: 'Passa antes de alguém processar.' },
  { id: 'demora', nome: 'Demora', ms: 5000, resumo: 'Tempo de olhar e de querer desviar.' },
  { id: 'fica', nome: 'Fica', ms: 9000, resumo: 'Tempo demais. É esse o ponto.' },
]);

export const INTENSIDADE_PADRAO = 'presenca';
export const DURACAO_PADRAO = 'demora';

export const intensidadePorId = id =>
  INTENSIDADES.find(i => i.id === id) || INTENSIDADES.find(i => i.id === INTENSIDADE_PADRAO);
export const duracaoPorId = id =>
  DURACOES.find(d => d.id === id) || DURACOES.find(d => d.id === DURACAO_PADRAO);

/**
 * Imagem grande demais não viaja.
 *
 * O aviso vai pelo canal ao vivo, que é feito para pacote pequeno e
 * frequente. As imagens de aparição já passam por `comprimirParaDocumento`,
 * então na prática cabem — este teto existe para o caso que não passou, e
 * nele a assombração acontece MESMO ASSIM, só sem imagem: o escuro e o som
 * sozinhos já valem a cena, e é melhor do que não acontecer nada.
 */
export const TETO_DA_IMAGEM = 220 * 1024;

export function avisoDeAssombracao({
  aparicao = {}, intensidade, duracao, para = [],
} = {}) {
  const img = String(aparicao.imagem || '');
  return {
    id: `asb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    titulo: String(aparicao.titulo || ''),
    imagem: img.length <= TETO_DA_IMAGEM ? img : '',
    intensidade: intensidadePorId(intensidade).id,
    duracao: duracaoPorId(duracao).id,
    /* QUEM LEVA O SUSTO.
       Vazio quer dizer a mesa inteira, que é como era antes e continua
       sendo o caso comum. Com nomes dentro, só eles — e aí dois primos
       veem a tela escurecer enquanto os outros três não veem nada, que é
       uma cena difícil de conseguir de qualquer outro jeito. */
    para: [...new Set((para || []).map(String).filter(Boolean))],
    comecouEm: Date.now(),
  };
}

/**
 * Este susto é para mim?
 *
 * LIMITE QUE PRECISA ESTAR ESCRITO: a assombração corre pelo canal vivo,
 * que entrega a todo mundo e não tem consulta por destinatário como o
 * Firestore das aparições. Então o recorte aqui é de TELA: quem não está na
 * lista não vê nada acontecer, mas o aviso passou pela máquina dele e
 * alguém com o console aberto consegue lê-lo.
 *
 * É a mesma força do selo da ficha e do bilhete: serve contra o primo
 * curioso, não contra o primo programador.
 */
export function assombracaoEhMinha(aviso, uid) {
  const lista = Array.isArray(aviso?.para) ? aviso.para.map(String) : [];
  if (!lista.length) return true;
  return lista.includes(String(uid || ''));
}

/**
 * Em que pé está a assombração agora.
 *
 * `decorrido` vem do relógio de quem assiste, e não de um contador que o
 * Mestre manda parar: assim ela termina mesmo que o Mestre suma no meio.
 *
 * Três fases, porque é o que faz a coisa "surgir aos poucos" em vez de
 * piscar: entra, fica, sai. A entrada é mais lenta que a saída — aparecer
 * devagar é o que assusta; sumir devagar só atrasa a mesa.
 */
export function estagioDaAssombracao(aviso, agora = Date.now()) {
  if (!aviso) return null;
  const total = duracaoPorId(aviso.duracao).ms;
  const decorrido = agora - Number(aviso.comecouEm || 0);
  if (decorrido < 0 || decorrido >= total) return null;

  const entrada = Math.min(1400, total * 0.42);
  const saida = Math.min(700, total * 0.22);
  const inten = intensidadePorId(aviso.intensidade);

  let presenca;
  let fase;
  if (decorrido < entrada) {
    fase = 'entrando';
    presenca = decorrido / entrada;
  } else if (decorrido < total - saida) {
    fase = 'parada';
    presenca = 1;
  } else {
    fase = 'saindo';
    presenca = Math.max(0, (total - decorrido) / saida);
  }

  return Object.freeze({
    fase,
    presenca,
    restante: total - decorrido,
    veu: inten.veu * Math.min(1, presenca * 1.5),
    nitidez: inten.nitidez * presenca,
    escala: inten.escala,
    intensidade: inten.id,
  });
}

/**
 * Vale mostrar este aviso para quem acabou de chegar?
 *
 * Não: a assombração já aconteceu para a mesa, e repetir para um retardatário
 * estraga a cena que todos já viveram. Só entra o que começou agora.
 */
export const AVISO_VELHO_MS = 1500;
export const avisoAindaVale = (aviso, agora = Date.now()) =>
  Boolean(aviso) && agora - Number(aviso.comecouEm || 0) <= AVISO_VELHO_MS;
