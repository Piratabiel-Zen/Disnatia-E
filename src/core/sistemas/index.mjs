// OS SISTEMAS DE RPG
//
// O site deixa de ser "a Dinastia E com outras mesas penduradas" e passa a ser
// um motor onde cada campanha escolhe um sistema. Um sistema diz como se rola,
// como é a ficha, que condições existem, quais abas a mesa ganha e — o que é
// metade do tom — como as coisas se chamam. Chamar o Mestre de "Admin" e o
// personagem de "exorcista" é CAIN; "Mestre" e "personagem" é Dinastia E.
//
// Acrescentar D&D, Tormenta 20 ou Ordem Paranormal depois é escrever mais um
// arquivo ao lado destes e registrá-lo aqui. Nenhuma tela precisa saber que
// eles existem: elas perguntam ao sistema ativo.
//
// A Dinastia E continua sendo o padrão de quem não escolheu nada, para as
// mesas que já existem não mudarem de comportamento do nada.

import cain from './cain/index.mjs';
import dinastiaE from './dinastiaE.mjs';

export const SISTEMAS = Object.freeze({
  [dinastiaE.id]: dinastiaE,
  [cain.id]: cain,
});

export const SISTEMA_PADRAO = dinastiaE.id;

/** Lista para montar o seletor ao criar uma campanha. */
export const listaDeSistemas = () => Object.values(SISTEMAS);

/** O sistema de uma campanha. Campanha sem sistema declarado usa o padrão. */
export function sistemaDe(campanha) {
  const id = String(campanha?.sistema || '');
  return SISTEMAS[id] || SISTEMAS[SISTEMA_PADRAO];
}

/**
 * O nome que este sistema dá a uma coisa.
 *
 * Cai no termo genérico quando o sistema não tem palavra própria, então a
 * interface pode pedir qualquer termo sem precisar saber quem responde.
 */
export function termo(campanha, chave, padrao = '') {
  const termos = sistemaDe(campanha)?.termos || {};
  return termos[chave] || padrao || String(chave);
}

/** Esta campanha tem esta aba, considerando o sistema dela? */
export function sistemaTemAba(campanha, abaId) {
  const abas = sistemaDe(campanha)?.abas || [];
  return abas.includes(String(abaId));
}

/**
 * A navegação desta mesa.
 *
 * O sistema manda quando declara a sua; quem não declara fica com a padrão.
 * É assim que a Dinastia E segue com "Livro da Mandíbula" e "Bestiário"
 * enquanto o CAIN tem "Mural", "Pecados" e "Capítulos" — sem nenhuma tela
 * precisar de um if para cada sistema novo.
 */
export function navegacaoDoSistema(campanha, padrao) {
  const sistema = sistemaDe(campanha);
  return sistema?.navegacao ? sistema.navegacao.map(g => ({ ...g, items: [...g.items] })) : padrao;
}
