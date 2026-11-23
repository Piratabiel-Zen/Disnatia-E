/**
 * TIRAR COMENTÁRIO DE UM FONTE, SEM TIRAR CÓDIGO POR ACIDENTE
 *
 * Vários testes procuram uma armadilha no fonte, e o comentário que EXPLICA
 * a armadilha cita a armadilha — então o texto precisa sair antes da busca.
 *
 * A versão ingênua (`replace(/\/\*[\s\S]*?\*\//g,'')`) tem um buraco sério:
 * `accept="image/*"` abre um comentário que nunca foi comentário, e tudo até
 * o próximo `*​/` de verdade desaparece do que o teste enxerga. Num assert
 * que exige a presença de algo, isso quebra na cara (foi assim que apareceu);
 * num assert que exige a AUSÊNCIA, passa calado e não guarda mais nada.
 *
 * Então o abridor só vale como comentário se vier no começo da linha ou
 * depois de espaço, `{`, `(`, `,`, `;` ou `=>` — nunca colado num `image`.
 * E `//` só vale se não vier depois de `:`, senão `https://` come a linha.
 */
const BLOCO = /(^|[\s{(,;])\/\*[\s\S]*?\*\//g;
const LINHA = /(^|[^:\w])\/\/[^\n]*/g;

export const semComentarios = fonte => String(fonte)
  .replace(BLOCO, (_, antes) => antes)
  .replace(LINHA, (_, antes) => antes);

export default semComentarios;
