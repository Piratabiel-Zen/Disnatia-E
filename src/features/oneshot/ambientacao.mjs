/**
 * A AMBIENTAÇÃO DO MAPA — luzes e coisas que o Mestre põe por cima
 *
 * O mapa é uma imagem parada, e a noite não é. Os primos ligam o gerador
 * do galpão e as luzes da casa têm que acender; a lâmpada do porão
 * estoura e aquele canto tem que apagar. Até agora cada mudança dessas
 * pedia uma imagem nova e CSS escrito à mão.
 *
 * Aqui o Mestre põe as peças ele mesmo, durante a sessão, e liga e desliga
 * quando a cena pedir.
 *
 * A DECISÃO QUE MANDA EM TUDO: desligar uma luz NÃO a apaga da tela. Uma
 * lâmpada desligada continua lá, escura, porque é isso que faz o gerador
 * valer a pena — a mesa precisa ter visto o poste apagado antes para que
 * acender signifique alguma coisa. Peça que some quando desligada seria um
 * interruptor sem lâmpada.
 *
 * O objeto (grama, pedra) é o oposto: desligado ele some mesmo, porque ali
 * não há promessa nenhuma — o Mestre só está dizendo "isto não está mais
 * aqui".
 */

/** O teto de peças por mapa. */
export const LIMITE_POR_MAPA = 40;

/* Cada peça é um elemento com sombra, brilho e às vezes animação. No
   celular do primo, uns poucos desses somam; algumas dezenas derrubam a
   taxa de quadros do mapa inteiro. O teto existe por isso, e 40 é bem mais
   do que uma cena precisa — a casa tem sete mapas, não um. */

export const TIPOS = Object.freeze([
  // ---- LUZES. Ligam e desligam; desligadas, continuam visíveis. ----
  { id: 'lampiao', nome: 'Lampião', grupo: 'luz', cor: '#FFBE6A',
    resumo: 'Luz quente que treme. O lampião do portão, o do corredor.' },
  { id: 'lampada', nome: 'Lâmpada', grupo: 'luz', cor: '#FFE9B8',
    resumo: 'Luz elétrica, firme. É a que o gerador liga.' },
  { id: 'vela', nome: 'Vela', grupo: 'luz', cor: '#FFD08A',
    resumo: 'Pequena e inquieta. Apaga com corrente de ar.' },
  { id: 'brasa', nome: 'Brasa', grupo: 'luz', cor: '#FF7A3C',
    resumo: 'Lareira, fornalha. Respira devagar e não pisca.' },
  { id: 'luz-fria', nome: 'Luz fria', grupo: 'luz', cor: '#9FC8FF',
    resumo: 'Luar numa janela, lanterna. Azulada, sem tremor.' },

  // ---- COISAS. Desligadas, somem. ----
  { id: 'grama', nome: 'Grama', grupo: 'coisa', cor: '#3E5A33',
    resumo: 'Tufo de mato. Para cobrir caminho e beirada.' },
  { id: 'pedra', nome: 'Pedra', grupo: 'coisa', cor: '#6A6560',
    resumo: 'Pedra solta, entulho.' },
  { id: 'arbusto', nome: 'Arbusto', grupo: 'coisa', cor: '#2F4A2C',
    resumo: 'Moita mais alta, boa para esconder alguém.' },
  { id: 'poca', nome: 'Poça', grupo: 'coisa', cor: '#2A3A44',
    resumo: 'Água parada que reflete o que estiver aceso perto.' },
  { id: 'teia', nome: 'Teia', grupo: 'coisa', cor: '#C8C4BC',
    resumo: 'Para cantos que ninguém toca há tempo.' },
  { id: 'folhas', nome: 'Folhas', grupo: 'coisa', cor: '#5A4A2E',
    resumo: 'Folha seca no chão. Faz barulho quando alguém passa.' },
  { id: 'fumaca', nome: 'Fumaça', grupo: 'coisa', cor: '#8A8782',
    resumo: 'Névoa num ponto só, subindo devagar.' },
  { id: 'sangue', nome: 'Mancha', grupo: 'coisa', cor: '#4A1014',
    resumo: 'Mancha escura no chão. Não é obrigatoriamente sangue.' },
]);

export const tipoDe = id => TIPOS.find(t => t.id === id) || null;
export const ehLuz = peca => tipoDe(peca?.tipo)?.grupo === 'luz';

/* Os limites de tamanho e força. Abaixo do mínimo a peça some sem o Mestre
   perceber que ela ainda está lá e ainda custa desenho; acima do máximo um
   lampião cobre meio mapa e o resto deixa de ser legível. */
export const TAMANHO = Object.freeze({ min: 0.4, max: 3, passo: 0.1, padrao: 1 });
export const FORCA = Object.freeze({ min: 0.1, max: 2, passo: 0.1, padrao: 1 });

const emFaixa = (n, { min, max }, padrao) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return padrao;
  return Math.round(Math.min(max, Math.max(min, v)) * 100) / 100;
};
const posicao = n => Math.round(Math.min(100, Math.max(0, Number(n) || 0)) * 100) / 100;

/** Uma peça nova, no ponto onde o Mestre tocou. */
export function pecaNova({ tipo, x, y, mapa, agora = Date.now() }) {
  const qual = tipoDe(tipo);
  const onde = String(mapa || '').trim();
  if (!qual || !onde) return null;
  return {
    tipo: qual.id,
    mapa: onde,
    x: posicao(x),
    y: posicao(y),
    tamanho: TAMANHO.padrao,
    forca: FORCA.padrao,
    // Nasce acesa: o Mestre põe para ver onde ficou. Pôr apagada o faria
    // tocar duas vezes para conferir cada peça.
    ligada: true,
    em: Number(agora) || 0,
  };
}

export const comTamanho = (peca, n) =>
  (peca ? { ...peca, tamanho: emFaixa(n, TAMANHO, TAMANHO.padrao) } : null);

export const comForca = (peca, n) =>
  (peca ? { ...peca, forca: emFaixa(n, FORCA, FORCA.padrao) } : null);

export const alternarLigada = peca =>
  (peca ? { ...peca, ligada: !peca.ligada } : null);

export const movida = (peca, { x, y }) =>
  (peca ? { ...peca, x: posicao(x), y: posicao(y) } : null);

/**
 * As peças de um mapa, prontas para desenhar.
 *
 * Luzes por último: elas se somam ao que está embaixo, então uma luz
 * desenhada antes da grama ficaria por baixo do mato e o brilho sumiria.
 */
export function pecasDoMapa(pecas, mapaId) {
  const onde = String(mapaId || '');
  if (!onde) return [];
  return (pecas || [])
    .filter(p => p && String(p.mapa || '') === onde && tipoDe(p.tipo))
    .slice(0, LIMITE_POR_MAPA)
    .sort((a, b) => (ehLuz(a) ? 1 : 0) - (ehLuz(b) ? 1 : 0));
}

/** Se ainda cabe peça neste mapa. */
export const cabeMais = (pecas, mapaId) =>
  pecasDoMapa(pecas, mapaId).length < LIMITE_POR_MAPA;

/** A peça mais próxima de um toque, para o Mestre pegar e ajustar. */
export function pecaEm(pecas, { x, y }, mapaId, raio = 4) {
  let perto = null;
  let menor = Infinity;
  for (const p of pecasDoMapa(pecas, mapaId)) {
    // O raio acompanha o tamanho: uma peça grande é mais fácil de acertar
    // porque ela OCUPA mais — o contrário seria tocar no meio de um
    // lampião enorme e não pegar nada.
    const alcance = raio * Math.max(0.7, Number(p.tamanho) || 1);
    const d = Math.hypot(Number(p.x) - posicao(x), Number(p.y) - posicao(y));
    if (d < menor && d <= alcance) { menor = d; perto = p; }
  }
  return perto;
}

/**
 * O ajuste que vale para o mapa inteiro.
 *
 * Separado das peças porque é outra coisa: não é um objeto no cenário, é
 * como a arte toda é lida. O Mestre escurece o térreo inteiro quando a
 * energia cai, sem tocar em nenhuma lâmpada.
 */
export const AJUSTE = Object.freeze({
  brilho: { min: 0.3, max: 1.4, passo: 0.05, padrao: 1 },
  contraste: { min: 0.6, max: 1.8, passo: 0.05, padrao: 1 },
  saturacao: { min: 0, max: 1.6, passo: 0.05, padrao: 1 },
});

export function ajusteDoMapa(bruto) {
  const a = bruto || {};
  return {
    brilho: emFaixa(a.brilho, AJUSTE.brilho, AJUSTE.brilho.padrao),
    contraste: emFaixa(a.contraste, AJUSTE.contraste, AJUSTE.contraste.padrao),
    saturacao: emFaixa(a.saturacao, AJUSTE.saturacao, AJUSTE.saturacao.padrao),
  };
}

/** O filtro CSS correspondente — ou vazio, quando nada foi mexido. */
export function filtroDoAjuste(bruto) {
  const a = ajusteDoMapa(bruto);
  const mexido = a.brilho !== 1 || a.contraste !== 1 || a.saturacao !== 1;
  // String vazia em vez de `filter:none` de propósito: `filter` em
  // qualquer valor cria uma camada de composição nova no navegador, e num
  // mapa do tamanho da tela isso custa memória de vídeo à toa.
  return mexido
    ? `brightness(${a.brilho}) contrast(${a.contraste}) saturate(${a.saturacao})`
    : '';
}
