// AS PALETAS DAS MESAS
//
// Mora num arquivo só, sem Firebase, por um motivo prático: o teste que
// confere se os cinco temas continuam distintos precisa importar isto, e
// campaign.js arrasta o Firebase junto — que não sobe no Node.

// AS ATMOSFERAS DE MESA
//
// Cada uma precisa ser reconhecível em dois segundos, de olho fechado: a
// pessoa troca de mesa e tem que SENTIR que mudou de mundo antes de ler o
// nome. Antes elas se distinguiam só pelo acento, e três delas eram a mesma
// tela marrom-escura com um botão de outra cor.
//
// Então cada tema carrega uma paleta inteira:
//   accent / accentSoft  o que chama atenção (botões, realces, barras)
//   contraste            a cor que QUEBRA a paleta — o ponto que não deixa
//                        a tela virar um borrão de um tom só
//   bg / superficie      o fundo e o painel que mora sobre ele
//   linha                a divisória, que é o que dá sensação de material
//   ink                  o texto
export const CAMPAIGN_THEMES = {
  // O visual da Dinastia E: roxo cósmico sobre índigo, com estrelas.
  cosmico: {
    label: 'Cósmico e mágico',
    sigil: '✦',
    accent: '#A855F7',
    accentSoft: '#D6A7FF',
    contraste: '#6BE0FF',
    bg: '#0B0718',
    superficie: '#140C26',
    linha: '#2A1D44',
    ink: '#C8B8A0',
    display: "'Cinzel', Georgia, serif",
    body: "'Crimson Text', Georgia, serif",
    background: 'cosmic',
  },
  // Vermelho de verdade: sangue sobre quase-preto, com o branco entrando
  // como luz de lâmpada em sala de interrogatório. Alto contraste de
  // propósito — é a atmosfera onde alguma coisa já deu errado.
  sombrio: {
    label: 'Investigativo e sombrio',
    sigil: '◉',
    accent: '#C8102E',
    accentSoft: '#FF4D5E',
    contraste: '#F2F0EE',
    bg: '#0A0708',
    superficie: '#150C0E',
    linha: '#3A1A1F',
    ink: '#EDE7E4',
    display: "'Cinzel', Georgia, serif",
    body: "'Crimson Text', Georgia, serif",
    background: 'smoke',
  },
  // O dourado é a parte medieval; o azul é a parte mágica. O fundo puxa para
  // o azul-noite para que o ouro tenha onde brilhar — ouro sobre marrom vira
  // lama, e era nisso que este tema estava virando.
  medieval: {
    label: 'Medieval e mágico',
    sigil: '⚜',
    accent: '#C79A3C',
    accentSoft: '#EBC97A',
    contraste: '#4E8FD4',
    bg: '#0E1118',
    superficie: '#141A26',
    linha: '#2A3448',
    ink: '#D6C7A6',
    display: "'Cinzel', Georgia, serif",
    body: "'Crimson Text', Georgia, serif",
    background: 'parchment',
  },
  // Vitoriano sombrio: organização ocultista com investigação. O carmesim é o
  // acento e o bronze é a estrutura — e o fundo puxa para o azul da água
  // parada, não para o preto puro, senão o cenário some.
  //
  // O nome descreve o VISUAL, não um lugar: qualquer mesa pode escolhê-lo, e
  // a cidade onde a campanha se passa é assunto do campo Mundo.
  // Cinza e preto, como pedido — mas cinza puro vira névoa e some. O latão
  // entra como a cor que contrasta: é quente, destaca em cima do carvão e
  // combina com gás, relógio e instrumento de metal.
  veneziano: {
    label: 'Vitoriano sombrio',
    sigil: '⚜',
    accent: '#D9A441',
    accentSoft: '#F0CE86',
    bronze: '#A98045',
    contraste: '#E8E2D6',
    bg: '#0C0D0F',
    superficie: '#15171A',
    linha: '#32353A',
    ink: '#CFCCC5',
    display: "'Cinzel', Georgia, serif",
    body: "'Crimson Text', Georgia, serif",
    background: 'smoke',
  },
  // Pastel de dia útil: verde-sálvia, areia e papel. É a única atmosfera que
  // não tenta criar clima nenhum — e é esse o clima.
  moderno: {
    label: 'Pé no chão',
    sigil: '◈',
    accent: '#7FA8A0',
    accentSoft: '#BCDAD4',
    contraste: '#E8C9A0',
    bg: '#14181A',
    superficie: '#1D2325',
    linha: '#313A3C',
    ink: '#D8DEDC',
    display: "'Cinzel', Georgia, serif",
    body: "'Crimson Text', Georgia, serif",
    background: 'quiet',
  },
};

