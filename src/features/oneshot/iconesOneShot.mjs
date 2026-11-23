/**
 * OS ÍCONES DA FICHA — OS DESENHOS
 *
 * Desenhados aqui, em SVG, e não vindos de fonte de ícone ou de CDN. Três
 * motivos, e todos já custaram caro neste projeto:
 *
 *  - a mesa roda com o site publicado atrás de uma CSP estreita, e toda vez
 *    que alguém acrescentou um host novo a música ou a câmera parou;
 *  - fonte de ícone pisca ou mostra quadrado vazio até carregar, e numa ficha
 *    com doze competências isso é doze quadrados piscando;
 *  - emoji muda de cara em cada sistema, e a mesa é metade Windows metade
 *    celular.
 *
 * Todos num viewBox de 24 e em `currentColor`, então herdam a cor de onde
 * estiverem e não precisam saber nada do tema. Traço de 1.6 para aguentar
 * 16px sem empastar.
 *
 * São desenhos genéricos de propósito — punho, olho, chama, engrenagem —
 * nada que imite marca, personagem ou símbolo de obra existente.
 *
 * Ficam como DADOS, e não como JSX, por dois motivos: o teste que garante
 * que nenhum atributo ou competência ficou sem ícone roda no Node, que não
 * importa `.jsx`; e a animação do dado vai querer os mesmos desenhos sem
 * arrastar React junto.
 */

export const TRACOS = Object.freeze({

  /* ─── Atributos ─── */
  // Punho fechado de lado.
  forca: [{ t: 'path', d: 'M7 11V8.5a1.5 1.5 0 0 1 3 0V11' }, { t: 'path', d: 'M10 11V7.5a1.5 1.5 0 0 1 3 0V11' }, { t: 'path', d: 'M13 11V8a1.5 1.5 0 0 1 3 0v5.5a5.5 5.5 0 0 1-11 0V11a1.5 1.5 0 0 1 2-1.4' }],
  // Figura correndo.
  agilidade: [{ t: 'circle', cx: '14.5', cy: '5', r: '1.8' }, { t: 'path', d: 'M13 9.5 9 12l1.5 4' }, { t: 'path', d: 'M13 9.5 16 12l1 4.5' }, { t: 'path', d: 'M10.5 16 8 20' }, { t: 'path', d: 'M6 10.5 10 9' }],
  // Retículo de mira.
  precisao: [{ t: 'circle', cx: '12', cy: '12', r: '7.5' }, { t: 'circle', cx: '12', cy: '12', r: '2.2' }, { t: 'path', d: 'M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3' }],
  // Cérebro, simplificado em dois lobos.
  inteligencia: [{ t: 'path', d: 'M12 5.5v13' }, { t: 'path', d: 'M12 6a3 3 0 0 0-5.3 1.9A2.6 2.6 0 0 0 5 10.3c0 1 .5 1.8 1.3 2.3a2.8 2.8 0 0 0 .6 3.4A3 3 0 0 0 12 18.5' }, { t: 'path', d: 'M12 6a3 3 0 0 1 5.3 1.9A2.6 2.6 0 0 1 19 10.3c0 1-.5 1.8-1.3 2.3a2.8 2.8 0 0 1-.6 3.4A3 3 0 0 1 12 18.5' }],
  // Olho aberto.
  percepcao: [{ t: 'path', d: 'M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z' }, { t: 'circle', cx: '12', cy: '12', r: '2.6' }],
  // Duas pessoas.
  carisma: [{ t: 'circle', cx: '9', cy: '8', r: '2.8' }, { t: 'path', d: 'M3.5 19a5.5 5.5 0 0 1 11 0' }, { t: 'path', d: 'M16 5.6a2.8 2.8 0 0 1 0 5.3' }, { t: 'path', d: 'M17.5 13.8a5.5 5.5 0 0 1 3 5.2' }],
  // Chama.
  vontade: [{ t: 'path', d: 'M12 3s5 4.3 5 8.6a5 5 0 0 1-10 0C7 9 9 7.5 9 7.5s.3 2 1.6 2.6C11 8 12 6 12 3Z' }, { t: 'path', d: 'M12 19.5a2.6 2.6 0 0 0 2.6-2.6c0-1.6-2.6-3.6-2.6-3.6s-2.6 2-2.6 3.6A2.6 2.6 0 0 0 12 19.5Z' }],
  // Trevo de quatro folhas.
  sorte: [{ t: 'path', d: 'M12 11.5c0-2 1-3.8 2.6-3.8A2.2 2.2 0 0 1 16.5 11c0 1.4-2 2-4.5 2' }, { t: 'path', d: 'M12 11.5c0-2-1-3.8-2.6-3.8A2.2 2.2 0 0 0 7.5 11c0 1.4 2 2 4.5 2' }, { t: 'path', d: 'M12 13c2.5 0 4.5.6 4.5 2a2.2 2.2 0 0 1-1.9 3.3C13 18.3 12 16.5 12 14.5' }, { t: 'path', d: 'M12 13c-2.5 0-4.5.6-4.5 2a2.2 2.2 0 0 0 1.9 3.3C11 18.3 12 16.5 12 14.5' }, { t: 'path', d: 'M12 14.5V21' }],

  /* ─── Competências ─── */
  atletismo: [{ t: 'circle', cx: '14.5', cy: '5', r: '1.8' }, { t: 'path', d: 'M13 9.5 9 12l1.5 4' }, { t: 'path', d: 'M13 9.5 16 12l1 4.5' }, { t: 'path', d: 'M10.5 16 8 20' }, { t: 'path', d: 'M6 10.5 10 9' }],
  // Pegada.
  furtividade: [{ t: 'ellipse', cx: '12', cy: '14', rx: '4', ry: '5.2' }, { t: 'circle', cx: '7.5', cy: '7.5', r: '1.5' }, { t: 'circle', cx: '11', cy: '5.5', r: '1.5' }, { t: 'circle', cx: '14.8', cy: '5.8', r: '1.5' }, { t: 'circle', cx: '17.5', cy: '8.5', r: '1.4' }],
  // Lupa.
  investigacao: [{ t: 'circle', cx: '10.5', cy: '10.5', r: '6' }, { t: 'path', d: 'm15 15 5 5' }],
  // Bússola.
  sobrevivencia: [{ t: 'circle', cx: '12', cy: '12', r: '8.5' }, { t: 'path', d: 'm15.5 8.5-2 5-5 2 2-5Z' }],
  // Balão de fala.
  persuasao: [{ t: 'path', d: 'M20 12.5a7 7 0 0 1-7 7H8l-4 2.5.9-3.6A7 7 0 0 1 8 5.5h5a7 7 0 0 1 7 7Z' }, { t: 'path', d: 'M9 12h6' }],
  // Máscara.
  enganacao: [{ t: 'path', d: 'M4 7.5h16v4a8 8 0 0 1-8 8 8 8 0 0 1-8-8Z' }, { t: 'path', d: 'M8 12.5c.7.9 2.3.9 3 0M13 12.5c.7.9 2.3.9 3 0' }],
  // Cruz médica.
  medicina: [{ t: 'rect', x: '4', y: '4', width: '16', height: '16', rx: '2.5' }, { t: 'path', d: 'M12 8.5v7M8.5 12h7' }],
  // Chip.
  tecnologia: [{ t: 'rect', x: '7', y: '7', width: '10', height: '10', rx: '1.5' }, { t: 'path', d: 'M10 4v3M14 4v3M10 17v3M14 17v3M4 10h3M4 14h3M17 10h3M17 14h3' }],
  // Engrenagem.
  mecanica: [{ t: 'circle', cx: '12', cy: '12', r: '3.2' }, { t: 'path', d: 'M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3 5.5 5.5' }],
  // Olho dentro de um losango: símbolo inventado, não de obra nenhuma.
  ocultismo: [{ t: 'path', d: 'm12 3 8 9-8 9-8-9Z' }, { t: 'path', d: 'M8 12s1.8-2.4 4-2.4S16 12 16 12s-1.8 2.4-4 2.4S8 12 8 12Z' }, { t: 'circle', cx: '12', cy: '12', r: '1.1' }],
  // Volante.
  pilotagem: [{ t: 'circle', cx: '12', cy: '12', r: '8.5' }, { t: 'circle', cx: '12', cy: '12', r: '2.6' }, { t: 'path', d: 'M12 3.5v6M4.3 15.5l5.4-2.2M19.7 15.5l-5.4-2.2' }],
  // Lâmina.
  combate: [{ t: 'path', d: 'M18.5 3.5 9 13l2 2 9.5-9.5Z' }, { t: 'path', d: 'm9 13-2.5 4.5L11 15' }, { t: 'path', d: 'm4 20 3-3' }],

  /* ─── Condição ─── */
  vida: [{ t: 'path', d: 'M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 7.8a4.1 4.1 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z' }],
  // Rosto gritando.
  pavor: [{ t: 'ellipse', cx: '12', cy: '12', rx: '7', ry: '9' }, { t: 'ellipse', cx: '9.3', cy: '10', rx: '1.1', ry: '1.7' }, { t: 'ellipse', cx: '14.7', cy: '10', rx: '1.1', ry: '1.7' }, { t: 'ellipse', cx: '12', cy: '16', rx: '2', ry: '2.6' }],
  sanidade: [{ t: 'path', d: 'M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z' }, { t: 'circle', cx: '12', cy: '12', r: '2.6' }, { t: 'path', d: 'M10 18.5 9 22M14 18.5l1 3.5' }],

});

export const TEM_ICONE = nome => Boolean(TRACOS[nome]);
