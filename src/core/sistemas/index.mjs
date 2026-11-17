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

/**
 * Que dados esta mesa rola.
 *
 * A mesa de dados do site nasceu com d4 a d20 porque a Dinastia E usa d20.
 * O CAIN não usa nenhum deles além do d6 — e oferecer um d20 numa mesa de
 * CAIN não é só inútil: convida a rolar uma coisa que o sistema não sabe
 * interpretar, e depois a mesa discute o que aquele 17 significava.
 */
export function dadosDoSistema(campanha) {
  const dados = sistemaDe(campanha)?.dados || {};
  const faces = Array.isArray(dados.faces) && dados.faces.length ? dados.faces : [4, 6, 8, 10, 12, 20];
  const maximo = Number(dados.maximoDeDados) > 0 ? Math.trunc(dados.maximoDeDados) : 5;
  return { faces, maximo, notacao: dados.notacao || `d${faces[faces.length - 1]}`, resumo: dados.resumo || '' };
}

/**
 * Em que coleção moram as fichas desta mesa.
 *
 * As fichas da Dinastia E e as do CAIN não têm nada em comum — classe e
 * atributos de um lado, perícias de 0 a 3 e talismã do outro —, então moram
 * em coleções separadas. Quem precisa saber disso é a porta de entrada: é
 * ela que lista as fichas para a pessoa escolher a sua, e listar da coleção
 * errada é mostrar uma porta que não abre.
 */
export const colecaoDeFichas = campanha =>
  sistemaDe(campanha)?.colecaoDeFichas || 'sheets';

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
  if (!sistema?.navegacao) return padrao;
  // O sistema não sabe ONDE a campanha se passa. CAIN serve a Veneza, a Hong
  // Kong e ao que o Mestre inventar — então o mapa leva o nome do mundo da
  // mesa, não um nome fixo no sistema.
  const mundo = String(campanha?.world || '').trim();
  return sistema.navegacao.map(grupo => ({
    ...grupo,
    items: grupo.items.map(item => (
      item.id === 'mapamundi' && mundo ? { ...item, label: `Mapa de ${mundo}` } : { ...item }
    )),
  }));
}
