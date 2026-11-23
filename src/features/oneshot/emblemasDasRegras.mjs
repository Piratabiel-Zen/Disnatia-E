/**
 * AS GRAVURAS DOS CAPÍTULOS
 *
 * Cada capítulo das regras abre com uma gravura. São desenhadas aqui, em
 * SVG, pelas mesmas razões dos ícones da ficha: a mesa roda atrás de uma CSP
 * estreita e todo host novo que entrou neste projeto quebrou alguma coisa;
 * imagem externa pisca ou falha e deixa o capítulo com um buraco; e desenho
 * vetorial fica nítido em qualquer tela sem pesar no carregamento.
 *
 * São maiores e mais soltas que os ícones da ficha — gravura de livro, não
 * símbolo de lista. Traço fino, nada preenchido, como xilogravura velha.
 *
 * Todas são desenhos genéricos: uma casa, um dado, uma mão, um olho. Nada
 * que imite marca, personagem ou obra existente.
 */

export const EMBLEMAS = Object.freeze({
  // A casa atrás do portão, sob a lua.
  casa: [
    { t: 'circle', cx: '46', cy: '14', r: '7' },
    { t: 'path', d: 'M8 54h48' },
    { t: 'path', d: 'M14 54V30l18-13 18 13v24' },
    { t: 'path', d: 'M10 30 32 13l22 17' },
    { t: 'path', d: 'M27 54V41h10v13' },
    { t: 'path', d: 'M20 34h6v6h-6zM38 34h6v6h-6z' },
  ],
  // O d20, visto de frente.
  dado: [
    { t: 'path', d: 'M32 6 56 20v24L32 58 8 44V20Z' },
    { t: 'path', d: 'M32 6v16M8 20l24 2M56 20l-24 2' },
    { t: 'path', d: 'm32 22-14 9 14 11 14-11Z' },
    { t: 'path', d: 'M18 31 8 44M46 31l10 13M32 42v16' },
  ],
  // A mão aberta: o que se tem e o que não se tem.
  mao: [
    { t: 'path', d: 'M22 44V20a3 3 0 0 1 6 0v18' },
    { t: 'path', d: 'M28 38V15a3 3 0 0 1 6 0v23' },
    { t: 'path', d: 'M34 38V18a3 3 0 0 1 6 0v22' },
    { t: 'path', d: 'M40 40V24a3 3 0 0 1 6 0v18a16 16 0 0 1-32 0V32a3 3 0 0 1 6 0' },
  ],
  // A chave velha.
  chave: [
    { t: 'circle', cx: '22', cy: '24', r: '10' },
    { t: 'circle', cx: '22', cy: '24', r: '3.4' },
    { t: 'path', d: 'm29 31 23 23' },
    { t: 'path', d: 'm44 46 6-6M50 52l5-5' },
  ],
  // O coração, com a rachadura.
  coracao: [
    { t: 'path', d: 'M32 56S8 41 8 25A11 11 0 0 1 32 17 11 11 0 0 1 56 25c0 16-24 31-24 31Z' },
    { t: 'path', d: 'm30 22-5 11h9l-6 13' },
  ],
  // O olho que se abre no escuro.
  olho: [
    { t: 'path', d: 'M4 32s11-17 28-17 28 17 28 17-11 17-28 17S4 32 4 32Z' },
    { t: 'circle', cx: '32', cy: '32', r: '8' },
    { t: 'circle', cx: '32', cy: '32', r: '2.6' },
    { t: 'path', d: 'M32 9v-5M12 16 9 12M52 16l3-4' },
  ],
  // A vela acesa, que é o que resta.
  vela: [
    { t: 'path', d: 'M32 10c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11Z' },
    { t: 'path', d: 'M24 30h16v24H24z' },
    { t: 'path', d: 'M20 54h24' },
    { t: 'path', d: 'M32 27v3' },
  ],
  // O portão: o limite que não se atravessa.
  portao: [
    { t: 'path', d: 'M8 54V22M56 54V22M8 54h48' },
    { t: 'path', d: 'M16 54V26M24 54V22M32 54V19M40 54V22M48 54V26' },
    { t: 'path', d: 'M8 34h48' },
    { t: 'path', d: 'M16 26q16-12 32 0' },
  ],
});

export const TEM_EMBLEMA = nome => Boolean(EMBLEMAS[nome]);
