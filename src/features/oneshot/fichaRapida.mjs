/**
 * A FICHA RÁPIDA DO MAPA
 *
 * Durante a cena ninguém abre a aba de fichas: o mapa está aberto, a coisa
 * está andando, e o que a pessoa precisa saber é quanto de vida lhe resta e
 * quanto soma na competência que ela vai usar. Abrir outra aba para isso
 * custa a vez dela.
 *
 * Então o resumo fica no próprio mapa, e é RESUMO: retrato, os três
 * medidores, o talento em uma linha e as competências com nome e número.
 * Nada de editar — ficha se edita na aba da ficha. Painel de mapa que
 * também edita vira dois lugares para a mesma verdade, e um deles sempre
 * fica para trás.
 *
 * A COR É DE QUEM JOGA. Numa mesa de cinco primos, todos com ficha parecida
 * de gente comum, a cor é o jeito mais rápido de bater o olho e saber de
 * quem é aquilo. Por isso quem escolhe é o jogador, não o Mestre: é a ficha
 * dele.
 */

/**
 * As cinco cores. Todas escuras de propósito — a ficha fica por cima de um
 * mapa noturno, e cor clara aqui vira lanterna apontada para o rosto.
 *
 * `tinta` e `fraca` são calculadas para cada fundo e não herdadas: numa
 * paleta escura, texto cinza-médio some no preto e berra no roxo.
 */
export const CORES = Object.freeze([
  {
    id: 'roxo', nome: 'Roxo',
    fundo: 'linear-gradient(168deg,#241733,#140C1E)',
    borda: '#5B3C86', realce: '#B98CE8', tinta: '#E4DAF2', fraca: '#9A8BB0',
  },
  {
    id: 'cinza', nome: 'Cinza',
    fundo: 'linear-gradient(168deg,#262628,#141416)',
    borda: '#4A4A4E', realce: '#C8C6C2', tinta: '#E6E4E0', fraca: '#95928D',
  },
  {
    id: 'preto', nome: 'Preto',
    fundo: 'linear-gradient(168deg,#141315,#0A090B)',
    borda: '#333135', realce: '#A9A6AB', tinta: '#DCD9DE', fraca: '#8A878C',
  },
  {
    id: 'azul', nome: 'Azul escuro',
    fundo: 'linear-gradient(168deg,#131F33,#0A1220)',
    borda: '#2F4C77', realce: '#7FAEE6', tinta: '#DCE6F2', fraca: '#8699B0',
  },
  {
    id: 'vermelho', nome: 'Vermelho',
    fundo: 'linear-gradient(168deg,#2B1316,#17090C)',
    borda: '#6B2129', realce: '#D96B77', tinta: '#F0DCDE', fraca: '#AD8A8E',
  },
]);

export const COR_PADRAO = 'preto';
export const corPorId = id =>
  CORES.find(c => c.id === id) || CORES.find(c => c.id === COR_PADRAO);

/**
 * O talento em uma linha.
 *
 * O efeito inteiro tem três ou quatro linhas e não cabe num painel de mapa.
 * O resumo é o que lembra a pessoa de que ela TEM aquilo — e quem precisar
 * do texto exato abre a aba, que é onde ele está por inteiro.
 */
export function talentoEmUmaLinha(ficha, talentoDoCatalogo) {
  if (talentoDoCatalogo) {
    return { nome: talentoDoCatalogo.nome, resumo: talentoDoCatalogo.resumo };
  }
  const livre = String(ficha?.talento || '').trim();
  if (!livre) return null;
  return { nome: livre, resumo: String(ficha?.talentoResumo || '').trim() };
}

/** O número como ele aparece: com sinal, e com o menos de verdade. */
export const comSinal = n => {
  const v = Number(n) || 0;
  if (v < 0) return `−${Math.abs(v)}`;
  return v > 0 ? `+${v}` : '0';
};
