/**
 * OS SPRITES DE CAMINHADA
 *
 * Cada personagem é uma folha só: quatro linhas de direção e N quadros de
 * caminhada em cada. O token do mapa mostra UM quadro por vez, recortado
 * por `background-position`.
 *
 * Sobre isso valer a pena: esta semana tiramos quase toda animação de
 * `background-position` do site porque repintava a tela inteira a cada
 * quadro. Aqui é o contrário, e a diferença é o que está sendo repintado.
 * Lá era uma camada do tamanho da tela a 60 por segundo. Aqui é um
 * quadrado de 70px que troca de quadro 6 vezes por segundo, e só enquanto
 * alguém está arrastando. É o jeito certo para sprite, e continua sendo o
 * jeito errado para névoa.
 */

/**
 * As quatro direções, na ordem em que estão nas folhas.
 *
 * A segunda linha é ESQUERDA, e isso foi medido, não suposto: montei as
 * cinco folhas numa tela e olhei. Nas cinco, a figura da segunda linha
 * olha para a esquerda — o que faz sentido, porque vieram todas do mesmo
 * gerador. Na primeira tentativa eu tinha escrito 'direita' aqui e cada
 * personagem andaria de costas para onde estava indo.
 */
export const DIRECOES = Object.freeze(['frente', 'esquerda', 'direita', 'costas']);

/* Seis quadros por segundo. Mais que isso e a caminhada 8 bits perde o
   passo pesado que ela tem; menos e vira slide show. */
export const QUADROS_POR_SEGUNDO = 6;

/**
 * O catálogo. Cada folha tem o seu tamanho de célula porque os
 * personagens têm larguras diferentes — o Sakai com o taco ocupa mais que
 * o Magnus de terno, e espremer todos na mesma largura deixaria uns com
 * ar magro e outros cortados.
 */
export const SPRITES = Object.freeze([
  { id: 'sakai', nome: 'Sakai', arquivo: '/media/tokens/sakai-folha.webp',
    quadros: 4, largura: 91, altura: 128 },
  { id: 'haru', nome: 'Haru', arquivo: '/media/tokens/haru-folha.webp',
    quadros: 4, largura: 84, altura: 128 },
  { id: 'sakuta', nome: 'Sakuta', arquivo: '/media/tokens/sakuta-folha.webp',
    quadros: 6, largura: 78, altura: 128,
    /* Esta folha veio com a ordem trocada: frente, lado, COSTAS, lado.
       Em vez de remontar a imagem, a ordem fica escrita aqui — remontar
       perderia qualidade de novo e esconderia a diferença. */
    ordem: ['frente', 'esquerda', 'costas', 'direita'] },
  { id: 'kujo', nome: 'Kujo', arquivo: '/media/tokens/kujo-folha.webp',
    quadros: 4, largura: 63, altura: 128 },
  { id: 'lee', nome: 'Lee Nakamura', arquivo: '/media/tokens/lee-folha.webp',
    quadros: 4, largura: 76, altura: 128 },
]);

/* Nomes que um token já colocado pode estar guardando. O Kujo nasceu
   "magnus" e foi renomeado depois de já haver token dele em mapa — sem
   esta linha, aqueles tokens perderiam a folha e virariam um quadrado
   vazio no meio da cena, sem ninguém entender por quê. */
const APELIDOS = Object.freeze({ magnus: 'kujo' });

export const spriteDe = id => {
  const chave = String(id || '');
  return SPRITES.find(s => s.id === (APELIDOS[chave] || chave)) || null;
};

/** Em que linha da folha mora cada direção, para este sprite. */
export function linhaDaDirecao(sprite, direcao) {
  const ordem = sprite?.ordem || DIRECOES;
  const i = ordem.indexOf(direcao);
  return i < 0 ? 0 : i;
}

/**
 * Para que lado olhar, a partir do movimento.
 *
 * O eixo que mais andou decide. Sem a preferência pela horizontal, um
 * arrasto na diagonal ficaria trocando de direção a cada pixel — o
 * sprite piscaria entre o lado e a frente e pareceria defeito. A margem
 * de 1,35 é o que dá à horizontal o desempate.
 */
export function direcaoDoMovimento(dx, dy, anterior = 'frente') {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (ax < 0.4 && ay < 0.4) return anterior;   // parado: não vira à toa
  if (ax > ay * 1.35) return dx > 0 ? 'direita' : 'esquerda';
  if (ay > ax * 1.35) return dy > 0 ? 'frente' : 'costas';
  return anterior;                              // diagonal: segura o que estava
}

/**
 * O recorte da folha para um quadro.
 *
 * Devolve em porcentagem porque o token é redimensionável: com
 * `background-size` em múltiplos de 100% e a posição em porcentagem, o
 * mesmo cálculo serve para um token de 40px e um de 200px.
 */
export function recorteDoQuadro(sprite, direcao, quadro, trocarLados = false) {
  if (!sprite) return null;
  const lado = trocarLados && (direcao === 'direita' || direcao === 'esquerda')
    ? (direcao === 'direita' ? 'esquerda' : 'direita')
    : direcao;
  const linhas = (sprite.ordem || DIRECOES).length;
  const col = ((Math.floor(quadro) % sprite.quadros) + sprite.quadros) % sprite.quadros;
  const lin = linhaDaDirecao(sprite, lado);
  /* Em porcentagem, N posições se dividem por N-1 e não por N: 0% é a
     primeira e 100% é a última. Dividir por N deixa o último quadro meio
     cortado, que é o erro clássico de sprite em CSS. */
  return {
    x: sprite.quadros > 1 ? (col * 100) / (sprite.quadros - 1) : 0,
    y: linhas > 1 ? (lin * 100) / (linhas - 1) : 0,
    tamanho: `${sprite.quadros * 100}% ${linhas * 100}%`,
    proporcao: sprite.largura / sprite.altura,
  };
}

/** O quadro de repouso: o primeiro, que é o de pé parado. */
export const QUADRO_PARADO = 0;

/** Qual quadro mostrar, dado há quanto tempo está andando. */
export const quadroNoTempo = (ms, quadros) =>
  Math.floor((ms / 1000) * QUADROS_POR_SEGUNDO) % Math.max(1, quadros);
