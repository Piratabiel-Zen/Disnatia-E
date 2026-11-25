/**
 * A BOLSA — o que cada um tem na mão, dentro do mapa
 *
 * Os itens NÃO têm cadastro próprio. Eles são as aparições de tipo "item",
 * criadas na aba Aparições, onde o Mestre já põe nome, imagem e escolhe se
 * é de alguém ou da mesa inteira.
 *
 * A primeira versão tinha uma coleção `itens` separada, e isso significava
 * dois lugares para criar a mesma coisa: o Mestre cadastrava a lanterna nas
 * aparições para mostrar na tela e cadastrava de novo nos itens para o
 * primo ter na bolsa. Dois cadastros da mesma lanterna é como eles saem de
 * sincronia — um é apagado, o outro fica, e ninguém sabe qual vale.
 *
 * Aqui dentro do mapa a bolsa é só CONSULTA RÁPIDA: a foto pequena e o
 * nome, para a pessoa lembrar o que tem sem sair da cena. A descrição, o
 * alcance e o resto ficam na aba Aparições, que é onde se lê com calma.
 */

/** O tipo de aparição que vira item de bolsa. */
export const TIPO_DE_ITEM = 'item';

/**
 * As aparições que são itens, prontas para a bolsa.
 *
 * A lista que chega aqui já veio filtrada pelo banco — `observarLiberados`
 * consulta por `liberadoParaTodos` e `liberadoPara`. Então o que estiver
 * nesta lista é, por construção, de quem está olhando: não há filtro de
 * dono para fazer aqui, e fazer um daria a impressão errada de que a
 * segurança mora na tela.
 */
export function bolsaDeItens(aparicoes) {
  return (aparicoes || [])
    .filter(a => a && String(a.tipo || '') === TIPO_DE_ITEM)
    .filter(a => String(a.titulo || '').trim() || a.imagem)
    .sort((a, b) => String(a.titulo || '').localeCompare(String(b.titulo || ''), 'pt-BR'));
}

/** O nome que o cartão mostra. */
export const nomeDoItem = item =>
  (String(item?.titulo || '').trim() || 'Sem nome');

/** Se este item é da mesa inteira — o cartão ganha um selo. */
export const ehDaMesa = item => Boolean(item?.liberadoParaTodos);
