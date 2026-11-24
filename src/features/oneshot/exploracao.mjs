/**
 * A NÉVOA DE EXPLORAÇÃO
 *
 * Os jogadores enxergam só o que já descobriram e o que está ao redor deles
 * agora. O resto da casa é escuro — e continua escuro mesmo depois que eles
 * passam por perto, se não tiverem chegado perto o bastante.
 *
 * COMO O DESCOBERTO É REPRESENTADO, e por que não é por cômodo:
 *
 * O caminho óbvio seria recortar os cômodos de cada mapa em polígonos e
 * revelar um cômodo por vez. Não faço isso por dois motivos. São sete mapas
 * com dezenas de cômodos, e cada polígono desenhado na mão é uma chance de
 * ficar torto — e o próprio guia avisa que a escala muda um pouco entre os
 * andares. E cômodo inteiro revelado de uma vez entrega a sala antes de a
 * criança entrar nela, que é justamente o que esta feature existe para
 * evitar.
 *
 * Então o descoberto é uma lista de CLAREIRAS: círculos em coordenada
 * relativa (0 a 1), que o Mestre pinta clicando no mapa. Funciona igual nos
 * sete mapas, não depende de escala, e revela na medida em que a cena anda.
 *
 * A VISÃO DE CADA CRIANÇA é separada das clareiras: ela acompanha o token e
 * some quando ele sai. O que ficou para trás continua visível porque virou
 * clareira; o que nunca foi pisado volta ao escuro.
 */

/** Raios em fração da largura do mapa. */
export const RAIO_DA_VISAO = 0.085;
export const RAIO_DA_CLAREIRA = 0.07;
export const RAIO_MINIMO = 0.02;
export const RAIO_MAXIMO = 0.3;

/** O quanto o escuro cobre o que ninguém descobriu. */
export const ESCURO_TOTAL = 1;

const entre = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));
const fracao = n => entre(n, 0, 1);

export const clareiraNova = (x, y, raio = RAIO_DA_CLAREIRA) => ({
  id: `cl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
  x: fracao(x),
  y: fracao(y),
  r: entre(raio, RAIO_MINIMO, RAIO_MAXIMO),
});

/**
 * A máscara, em CSS.
 *
 * Cada círculo vira um gradiente radial na `mask`, e a borda é macia de
 * propósito: círculo de borda dura parece buraco de papel recortado, e o
 * que se quer é lanterna. A parte transparente do gradiente é o que APAGA o
 * escuro, então aqui o preto é o que fica coberto.
 *
 * Tudo em porcentagem, nunca em pixel: o mapa é redimensionado pela tela e
 * máscara em pixel escorrega do lugar no primeiro resize.
 */
export function mascaraDaExploracao({
  clareiras = [], visoes = [], suave = 0.38,
  // Largura dividida pela altura do mapa. Os sete mapas da casa são 1774x887,
  // ou seja 2:1, e é esse o padrão.
  aspecto = 2,
} = {}) {
  const circulos = [
    ...clareiras.map(c => ({ x: c.x, y: c.y, r: c.r })),
    ...visoes.map(v => ({ x: v.x, y: v.y, r: v.r ?? RAIO_DA_VISAO })),
  ].filter(c => Number.isFinite(c.x) && Number.isFinite(c.y) && c.r > 0);

  if (circulos.length === 0) return null;

  // O miolo é opaco e a borda desmancha: a fração `suave` diz onde começa a
  // desmanchar, contada do centro.
  const parada = Math.round(entre(1 - suave, 0.1, 0.95) * 100);
  const proporcao = entre(aspecto, 0.2, 6);

  /* ELIPSE, E NÃO CÍRCULO, e isto não é gosto: `circle` com raio em
     PORCENTAGEM é CSS inválido — só `ellipse` aceita porcentagem. O CSSOM
     descarta a declaração inteira em silêncio, sem erro no console, e o
     resultado é a casa toda preta com o Mestre achando que revelar não
     funciona. Foi exatamente o que aconteceu aqui.

     Os dois raios saem em porcentagem de eixos diferentes (o horizontal da
     largura, o vertical da altura), então multiplicar o vertical pela
     proporção é o que devolve um buraco REDONDO na tela. */
  const rx = n => (n * 100).toFixed(2);
  const ry = n => (n * 100 * proporcao).toFixed(2);
  return circulos
    .map(c => `radial-gradient(ellipse ${rx(c.r)}% ${ry(c.r)}% at `
      + `${rx(c.x)}% ${(c.y * 100).toFixed(2)}%,`
      + `transparent ${parada}%,#000 100%)`)
    .join(',');
}

/**
 * Quantas camadas de máscara se interceptam.
 *
 * `mask-composite:intersect` é o que faz vários buracos somarem em vez de o
 * último mandar: sem isso, só a última clareira apareceria, e o Mestre
 * acharia que revelar parou de funcionar depois do primeiro clique.
 */
export const COMPOSICAO = 'intersect';

/** Um ponto já está descoberto? Serve para a tela não revelar duas vezes. */
export function jaDescoberto(ponto, clareiras = []) {
  return clareiras.some(c => {
    const dx = c.x - ponto.x;
    const dy = c.y - ponto.y;
    // Metade do raio: clicar na beirada de uma clareira ainda abre mais
    // chão, que é como o Mestre vai ampliando um corredor.
    return Math.sqrt(dx * dx + dy * dy) < c.r * 0.5;
  });
}

/**
 * Quem vê o quê.
 *
 * O Mestre vê a casa inteira, sempre: ele precisa do mapa para conduzir, e
 * esconder dele seria esconder do narrador. O jogador vê o descoberto mais a
 * própria visão. Um jogador sem token não fica cego — vê o descoberto —
 * senão quem ainda não pôs ficha na mesa fica olhando uma tela preta.
 */
export function visaoDaMesa({
  mestre = false, clareiras = [], tokens = [], dono = '', aspecto = 2,
} = {}) {
  /* O MESTRE VÊ UMA PRÉVIA ESMAECIDA, E NÃO O NADA.
   *
   * Antes ele não recebia névoa nenhuma — "ele precisa do mapa inteiro para
   * conduzir" — e o resultado foi pior do que esconder: ele pintava às
   * cegas. Clicava para revelar, nada mudava na tela dele, e a conclusão
   * óbvia era que revelar não funcionava.
   *
   * Agora ele vê o mesmo escuro dos jogadores, só que fraco: lê o mapa
   * inteiro POR BAIXO e ao mesmo tempo sabe o que a mesa ainda não viu. É a
   * única forma de pintar sabendo o que se está fazendo.
   *
   * E a prévia dele mostra a visão de TODOS os tokens, não a de um dono:
   * ele precisa enxergar o que cada criança está enxergando. */
  if (mestre) {
    return {
      tudoVisivel: false,
      previa: true,
      mascara: mascaraDaExploracao({
        clareiras,
        visoes: (tokens || [])
          .filter(Boolean)
          .map(t => ({ x: fracao(t.x), y: fracao(t.y), r: t.raio ?? RAIO_DA_VISAO })),
        aspecto,
      }),
    };
  }
  const meus = tokens
    .filter(t => t && String(t.dono || '') === String(dono) && dono)
    .map(t => ({ x: fracao(t.x), y: fracao(t.y), r: t.raio ?? RAIO_DA_VISAO }));
  return {
    tudoVisivel: false,
    previa: false,
    mascara: mascaraDaExploracao({ clareiras, visoes: meus, aspecto }),
  };
}
