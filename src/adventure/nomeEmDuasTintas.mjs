/**
 * O NOME DA MESA EM DUAS TINTAS
 *
 * Na referência o nome aparece em duas cores: "RELATOS DO" em pergaminho e
 * "MACABRO" em sangue. É o corte de cartaz — a palavra que carrega o peso
 * fica na tinta que custava caro.
 *
 * Não dá para fazer isso só com CSS. `::first-line` corta por linha, não
 * por palavra, e o nome do topo é uma linha só. Então a última palavra sai
 * num `<i>` e o CSS pinta esse `<i>`.
 *
 * A última, e não a primeira, porque é onde o nome costuma guardar o
 * assunto: Relatos do MACABRO, Estrela de ABSINTO, Dinastia E. Numa
 * palavra só, ela mesma leva a cor — que é o certo, senão o nome ficaria
 * sem destaque nenhum.
 *
 * Em `.mjs` e com `createElement` em vez de JSX porque os testes rodam no
 * node puro, que não sabe ler `.jsx`. O ganho é poder provar o corte das
 * palavras sem subir um navegador.
 */
import { createElement, Fragment } from 'react';

export function nomeEmDuasTintas(nome) {
  const texto = String(nome ?? '').trim();
  if (!texto) return null;

  const partes = texto.split(/\s+/);
  const ultima = partes.pop();
  const tinta = createElement('i', { className: 'marca-tinta' }, ultima);

  if (!partes.length) return tinta;
  return createElement(Fragment, null, `${partes.join(' ')} `, tinta);
}

export default nomeEmDuasTintas;
