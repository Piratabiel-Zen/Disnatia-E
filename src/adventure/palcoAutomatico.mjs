/**
 * O PALCO QUE SE AJUSTA À MÁQUINA
 *
 * O modo Imersivo era uma promessa fixa: a mesma quantidade de camadas
 * do tamanho da tela para todo mundo. Num desktop com vídeo integrado
 * isso não é imersão, é engasgo — e a experiência de quem joga na
 * máquina fraca ficava pior que a dos outros justamente nas horas que
 * importam: o cenário em tela cheia, o mapa aproximado.
 *
 * Então o Imersivo deixa de ser uma promessa e vira um teto. A tela
 * mede os próprios quadros e desce de palco quando não dá conta, sobe de
 * volta quando sobra folga.
 *
 *   palco 0 — tudo. É o que a máquina boa vê.
 *   palco 1 — saem as camadas que repintam área grande (vento, poeira,
 *             grãos, chuva, sombras). Ficam luz, escuridão e névoa.
 *   palco 2 — sai a mistura das camadas do tamanho da tela e para todo
 *             movimento de cenografia. Continua escuro, continua com
 *             clima; só não se move.
 *
 * O QUE O PALCO NUNCA TOCA
 *
 * Resposta ao jogador: o token respirando, a habilidade acendendo ao
 * passar o mouse, o relógio da caçada. Isso é a regra de
 * tests/paridade-animacoes.test.mjs e vale aqui igual: a máquina fraca
 * perde cenografia, nunca informação nem resposta.
 *
 * POR QUE MEDIANA E NÃO MÉDIA
 *
 * Carregar uma imagem, abrir uma aba ou o navegador recolher memória
 * produzem um quadro horrível isolado. A média afunda com um só; a
 * mediana ignora. O que interessa é o estado de regime.
 *
 * POR QUE OS DOIS LIMITES SÃO LONGE UM DO OUTRO
 *
 * Se descer a 30 quadros e subir a 31, a tela fica piscando entre dois
 * palcos a cada respiro da máquina. Desce abaixo de ~34/s, só volta
 * acima de ~52/s — e ainda precisa de duas medições seguidas de folga.
 */

/** Abaixo disto a máquina está sofrendo: ~34 quadros por segundo. */
export const LIMITE_RUIM_MS = 29;
/** Acima disto sobra folga de verdade: ~52 quadros por segundo. */
export const LIMITE_BOM_MS = 19;
/** Quantas medições boas seguidas antes de devolver uma camada. */
export const MEDIDAS_PARA_SUBIR = 2;
export const PALCO_MAXIMO = 2;

/** Mediana sem ordenar o array de quem chamou. */
export function medianaDe(amostras) {
  const lista = (amostras || []).filter(n => Number.isFinite(n) && n > 0).slice().sort((a, b) => a - b);
  if (!lista.length) return 0;
  const meio = lista.length >> 1;
  return lista.length % 2 ? lista[meio] : (lista[meio - 1] + lista[meio]) / 2;
}

/**
 * O próximo palco, a partir de uma medição.
 *
 * Devolve o estado inteiro (palco e contador de folga) em vez de mexer
 * em variável de fora: assim o teste consegue rodar uma sessão inteira
 * de medições sem montar tela nenhuma.
 */
export function proximoPalco({ palco = 0, folgas = 0 } = {}, mediana) {
  if (!Number.isFinite(mediana) || mediana <= 0) return { palco, folgas };

  if (mediana > LIMITE_RUIM_MS) {
    /* Uma medição ruim basta para descer. Esperar confirmação é deixar
       a pessoa jogando engasgado mais alguns segundos para provar o que
       ela já está sentindo. */
    return { palco: Math.min(PALCO_MAXIMO, palco + 1), folgas: 0 };
  }

  if (palco > 0 && mediana < LIMITE_BOM_MS) {
    const folgasAgora = folgas + 1;
    if (folgasAgora >= MEDIDAS_PARA_SUBIR) return { palco: palco - 1, folgas: 0 };
    return { palco, folgas: folgasAgora };
  }

  /* Zona morta entre os dois limites: fica onde está e esquece a folga
     acumulada, senão duas sobras separadas por meia hora contariam
     como seguidas. */
  return { palco, folgas: 0 };
}
