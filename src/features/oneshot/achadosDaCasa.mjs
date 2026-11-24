import { ITENS, itemPorId, itensDoMapa, AMULETOS } from './itensDaCasa.mjs';

/**
 * O QUE A MESA JÁ ACHOU
 *
 * Os dezesseis itens existem desde o começo; o que muda é quais deles estão
 * na mão da mesa. O mestre entrega quando os primos procuram no lugar certo,
 * e a partir daí o item fica disponível para qualquer um examinar.
 *
 * POR QUE NÃO DEIXAR TUDO À MOSTRA DESDE O INÍCIO: a lista completa é o mapa
 * do que falta. Quem vê dezesseis espaços vazios joga para preencher espaços,
 * e não para procurar numa casa. Só aparece o que foi achado.
 *
 * POR QUE A ENTREGA É DO MESTRE E NÃO UM CLIQUE DO JOGADOR: achar é resultado
 * de um teste, de uma pergunta feita no lugar certo, de uma gaveta aberta na
 * hora errada. Isso acontece na conversa; o site só registra.
 */

/** Um registro de achado, do jeito que vai para o banco. */
export function registroDeAchado(idDoItem, agora = Date.now()) {
  const item = itemPorId(idDoItem);
  if (!item) return null;
  return { item: item.id, em: Number(agora) || 0 };
}

/**
 * Os achados viram itens, na ordem em que foram achados.
 *
 * Registro de item que não existe mais (nome trocado, item retirado) é
 * descartado em silêncio: a mesa não precisa ver erro de banco no meio da
 * noite, e um buraco na lista é menos ruim que uma tela quebrada.
 */
export function itensAchados(registros = []) {
  const vistos = new Set();
  return (registros || [])
    .slice()
    .sort((a, b) => (Number(a?.em) || 0) - (Number(b?.em) || 0))
    .map(r => itemPorId(r?.item))
    .filter(item => {
      if (!item || vistos.has(item.id)) return false;
      vistos.add(item.id);
      return true;
    });
}

export const jaAchou = (registros, idDoItem) =>
  (registros || []).some(r => r?.item === String(idDoItem));

/**
 * O que o mestre pode entregar agora, com o deste mapa na frente.
 *
 * O item continua entregável de qualquer mapa — o avô guardava coisas fora de
 * lugar, e a mesa inventa caminhos que nenhuma lista previu. O que a ordem faz
 * é poupar o mestre de caçar na lista enquanto a cena corre.
 */
export function porEntregar(registros = [], idDoMapa = '') {
  const doMapa = new Set(itensDoMapa(idDoMapa).map(i => i.id));
  return ITENS
    .filter(i => !jaAchou(registros, i.id))
    .slice()
    .sort((a, b) => (doMapa.has(b.id) ? 1 : 0) - (doMapa.has(a.id) ? 1 : 0)
      || a.numero - b.numero)
    .map(i => ({ ...i, aqui: doMapa.has(i.id) }));
}

/**
 * Os cinco amuletos: quantos estão na mão.
 *
 * Este é o único contador que a mesa vê, e vê de propósito — os amuletos são
 * a condição de fechar a noite, e saber que faltam dois é pressão, não
 * espoiler. Quantos itens comuns faltam continua escondido.
 */
export function contagemDosAmuletos(registros = []) {
  const achados = AMULETOS.filter(a => jaAchou(registros, a.id));
  return Object.freeze({
    achados: achados.length,
    total: AMULETOS.length,
    faltam: AMULETOS.length - achados.length,
    completo: achados.length === AMULETOS.length,
  });
}
