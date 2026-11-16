// A ATMOSFERA DE UMA MESA ESPECÍFICA
//
// Sistema e atmosfera são coisas separadas, e misturá-las foi engano meu.
//
// O sistema CAIN já entrega tudo sozinho: ficha de exorcista, perícias,
// reserva de d6, mural de investigação, Pecados. Nada disso depende de tema,
// de mundo ou de preset — escolher o sistema basta, e uma mesa de CAIN em
// Hong Kong funciona igualzinho a uma em outro lugar qualquer.
//
// A atmosfera é outra camada: é o clima visual de UMA campanha. A Estrela de
// Absinto se passa na Terra Dourada e tem cara vitoriana sombria; outra mesa
// de CAIN pode ter cara nenhuma em comum com ela.
//
// Por isso a ligação é pelo NOME da mesa, e mora aqui num lugar só, em vez de
// espalhada em ifs pelas telas. Acrescentar outra mesa com clima próprio é
// acrescentar uma linha.

/** Tira acento, caixa e espaço de sobra, para "ESTRELA DE ABSINTO " casar. */
const chave = nome => String(nome || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .trim().toLowerCase().replace(/\s+/g, ' ');

/** Mesas que têm clima próprio, pelo nome. */
export const ATMOSFERAS_POR_MESA = Object.freeze({
  'estrela de absinto': 'veneziano',
});

/**
 * O tema que esta mesa deve usar.
 *
 * O nome manda sobre o que foi escolhido no formulário: se a mesa é a Estrela
 * de Absinto, ela tem o clima dela mesmo que alguém tenha deixado o seletor no
 * padrão na hora de criar. Para qualquer outra mesa, vale a escolha feita.
 */
export function temaDaMesa(campanha) {
  const própria = ATMOSFERAS_POR_MESA[chave(campanha?.name)];
  return própria || campanha?.theme || 'sombrio';
}

/** Esta mesa tem clima próprio, definido pelo nome? */
export const temAtmosferaPropria = campanha =>
  Boolean(ATMOSFERAS_POR_MESA[chave(campanha?.name)]);
