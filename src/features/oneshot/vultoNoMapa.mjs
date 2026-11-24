/**
 * O VULTO NO MAPA
 *
 * O Mestre põe uma silhueta num cômodo, ela fica alguns segundos e some.
 *
 * É a forma que a Yamauba toma no mapa, e a razão de ela não estar nas
 * imagens: a mesa nunca tem certeza de ter visto. Um vulto que ficasse
 * parado no mapa viraria mobília, e mobília não assusta.
 *
 * COMO A ASSOMBRAÇÃO, ele termina sozinho pelo relógio de quem assiste, e
 * não espera um segundo aviso. Vulto preso num cômodo seria pior que não
 * ter vulto nenhum: a mesa passaria a noite achando que a coisa está parada
 * ali.
 */

export const DURACOES = Object.freeze([
  { id: 'piscada', nome: 'Piscada', ms: 900, resumo: 'Quem não estava olhando não viu.' },
  { id: 'instante', nome: 'Instante', ms: 2200, resumo: 'Dá para apontar, não para descrever.' },
  { id: 'parado', nome: 'Parado', ms: 4500, resumo: 'Tempo de alguém dizer "tem alguém ali".' },
]);
export const DURACAO_PADRAO = 'instante';
export const duracaoPorId = id =>
  DURACOES.find(d => d.id === id) || DURACOES.find(d => d.id === DURACAO_PADRAO);

export const TAMANHOS = Object.freeze([
  { id: 'crianca', nome: 'Baixo', escala: 0.07 },
  { id: 'pessoa', nome: 'Gente', escala: 0.11 },
  { id: 'alto', nome: 'Alto demais', escala: 0.18 },
]);
export const TAMANHO_PADRAO = 'pessoa';
export const tamanhoPorId = id =>
  TAMANHOS.find(t => t.id === id) || TAMANHOS.find(t => t.id === TAMANHO_PADRAO);

/**
 * DE ONDE VEM A SILHUETA.
 *
 * O Mestre escolhe entre as aparições que ele mesmo preparou — são as
 * imagens que ele já subiu para a mesa, e reusá-las aqui evita um segundo
 * acervo de imagens dizendo a mesma coisa.
 *
 * `desenhada` é a saída quando ele não escolhe nada: ombros e cabeça, sem
 * forma reconhecível. É o bastante — o que assusta é a forma de gente onde
 * não devia ter — e garante que pôr um vulto nunca dependa de ter imagem
 * pronta.
 */
export const VULTO_DESENHADO = 'desenhada';

/** As aparições com imagem viram opções de vulto. */
export const vultosDisponiveis = (aparicoes = []) => [
  { id: VULTO_DESENHADO, nome: 'Silhueta', imagem: '' },
  ...(aparicoes || [])
    .filter(a => a && a.imagem)
    .map(a => ({ id: String(a.id), nome: String(a.titulo || 'Aparição'), imagem: String(a.imagem) })),
];

const fracao = n => Math.min(1, Math.max(0, Number(n) || 0));

export function vultoNovo({ mapa, x, y, duracao, tamanho, imagem = '' } = {}) {
  return {
    id: `vl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    mapa: String(mapa || ''),
    x: fracao(x),
    y: fracao(y),
    duracao: duracaoPorId(duracao).id,
    tamanho: tamanhoPorId(tamanho).id,
    imagem: String(imagem || ''),
    comecouEm: Date.now(),
  };
}

/**
 * Em que pé está o vulto.
 *
 * Entra depressa e sai depressa: um vulto que desmancha devagar vira
 * fantasma de desenho animado. O que assusta é já não estar lá.
 */
export function estagioDoVulto(vulto, agora = Date.now()) {
  if (!vulto) return null;
  const total = duracaoPorId(vulto.duracao).ms;
  const decorrido = agora - Number(vulto.comecouEm || 0);
  if (!Number.isFinite(decorrido) || decorrido < 0 || decorrido >= total) return null;

  const borda = Math.min(320, total * 0.3);
  let presenca = 1;
  if (decorrido < borda) presenca = decorrido / borda;
  else if (decorrido > total - borda) presenca = Math.max(0, (total - decorrido) / borda);

  return Object.freeze({
    presenca,
    restante: total - decorrido,
    escala: tamanhoPorId(vulto.tamanho).escala,
  });
}

/** Vulto de outro mapa não aparece: a mesa pode estar olhando outro andar. */
export const valeNesteMapa = (vulto, idDoMapa) =>
  Boolean(vulto) && String(vulto.mapa) === String(idDoMapa);

/** Como o aviso velho da assombração: vulto não se repete para retardatário. */
export const VULTO_VELHO_MS = 1200;
export const vultoAindaVale = (vulto, agora = Date.now()) =>
  Boolean(vulto) && agora - Number(vulto.comecouEm || 0) <= VULTO_VELHO_MS;
