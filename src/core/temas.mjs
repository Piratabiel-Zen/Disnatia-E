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
    contrasteSoft: '#B7F0FF',
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
    contrasteSoft: '#FFFFFF',
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
    contrasteSoft: '#9DC4ED',
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
  // Vitoriano sombrio: a mesa de investigação à noite.
  //
  // A primeira versão era carvão com latão, e saiu DOURADA — leu como salão
  // antigo, não como caso aberto. Investigação tem outra paleta: sangue sob
  // lampião, azul-marinho de noite fria e preto. O vermelho é escuro mas
  // vibrante, senão o conjunto afunda e vira só mais uma tela cinza.
  //
  // O azul faz dois trabalhos: é o fundo (que puxa para a noite em vez do
  // preto morto) e é a cor que quebra a paleta, viva o bastante para marcar
  // o que importa sem disputar com o vermelho.
  // MORTALHA — One Shot Terror.
  //
  // Preto e cinza, e nada mais. As outras paletas têm uma cor que quebra —
  // o roxo de Cosmum, o vermelho de Veneza — porque têm um mundo com cor
  // própria. Esta mesa não tem mundo: tem uma casa, uma noite e pessoas.
  //
  // O acento é osso, não vermelho. Vermelho fica reservado ao dano e à visão,
  // e aparecer em botão de interface gastaria o único sinal que a mesa tem de
  // que alguma coisa está muito errada.
  mortalha: {
    label: 'Mortalha',
    sigil: '☾',
    accent: '#C9C2B4',
    accentSoft: '#E2DCCE',
    bronze: '#8B8477',
    contraste: '#8B8477',
    contrasteSoft: '#C9C2B4',
    bg: '#09090A',
    superficie: '#121214',
    linha: '#242427',
    ink: '#C8C6C2',
    display: "'Cinzel', Georgia, serif",
  },

  veneziano: {
    label: 'Vitoriano sombrio',
    sigil: '⚜',
    accent: '#B51E34',
    accentSoft: '#E04356',
    bronze: '#8CA0C4',
    contraste: '#3E6FC4',
    contrasteSoft: '#8FB2E8',
    bg: '#070910',
    superficie: '#0F1320',
    linha: '#232C42',
    ink: '#D4D7E0',
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
    contrasteSoft: '#F5E4CC',
    bg: '#14181A',
    superficie: '#1D2325',
    linha: '#313A3C',
    ink: '#D8DEDC',
    display: "'Cinzel', Georgia, serif",
    body: "'Crimson Text', Georgia, serif",
    background: 'quiet',
  },
};

