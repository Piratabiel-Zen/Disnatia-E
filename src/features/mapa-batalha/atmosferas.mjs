// ATMOSFERAS DE MAPA
//
// Um mapa de batalha é uma pintura parada. A atmosfera é o que a faz respirar:
// a luz que muda, a poeira que atravessa, a lâmpada que falha. Tudo acontece
// por cima da arte, em camadas que não recebem clique e não atrapalham os
// tokens — a cena ganha vida sem o tabuleiro perder precisão.
//
// Cada preset é só dados. O componente desenha o que estiver descrito aqui, e
// o Mestre escolhe a atmosfera de qualquer mapa pelo nome.
//
// As luzes são o coração do sistema: cada uma marca uma fonte que já existe no
// desenho — a tocha, o poste, o tubo criogênico — e acende no lugar dela. O
// padrão diz COMO ela se comporta no tempo, e é o padrão que separa uma
// câmara aconchegante de um corredor assombrado.

export const SEM_ATMOSFERA = '';

/** Como cada fonte de luz se comporta no tempo. */
export const PADROES_DE_LUZ = Object.freeze({
  tocha: 'Chama viva: variação rápida e pequena, nunca apaga.',
  lampada: 'Lâmpada de rua: quase firme, com uma queda de vez em quando.',
  falha: 'Lâmpada quebrada: fica apagada, estoura, apaga de novo.',
  frio: 'Brilho frio: pulsa devagar, sem calor.',
  pulso: 'Alerta: sobe e desce em compasso lento e regular.',
  glitch: 'Tela avariada: treme, corta e volta.',
  estavel: 'Sem variação.',
});

export const ATMOSFERAS = {
  deserto: {
    id: 'deserto',
    nome: 'Deserto ao sol',
    descricao: 'Sol reluzindo nas pedras, sombras subindo e descendo, poeira de areia cruzando o terreno.',
    // O sol vem de onde a arte já diz que ele vem: na pirâmide, a face
    // iluminada é a da direita.
    luz: { x: 78, y: 12, cor: '#FFE1A8', forca: 0.5, respiro: 11 },
    sombra: { cor: '#2A1505', forca: 0.34, respiro: 11 },
    // Camadas de areia atravessando da esquerda para a direita, cada uma com
    // sua altura e velocidade: é a diferença entre elas que faz parecer vento.
    areia: [
      { topo: 18, altura: 26, duracao: 29, opacidade: 0.2, escala: 1.5, atraso: 0 },
      { topo: 46, altura: 34, duracao: 41, opacidade: 0.26, escala: 2.1, atraso: -14 },
      { topo: 68, altura: 30, duracao: 23, opacidade: 0.16, escala: 1.1, atraso: -7 },
    ],
    graos: { quantidade: 26, duracao: 15 },
    brilho: 1.04,
  },

  instituto: {
    id: 'instituto',
    nome: 'Noite com postes',
    descricao: 'Cena escurecida pelo luar, postes acesos pontuando o terreno e vento movendo as árvores.',
    noite: { cor: '#0B1430', forca: 0.52 },
    luar: { x: 20, y: 2, cor: '#B4D2FF', forca: 0.4, respiro: 17 },
    // Os postes do desenho, em porcentagem da imagem.
    luzes: [
      { x: 33.8, y: 39.5, raio: 10, forca: 0.72, padrao: 'lampada' },
      { x: 45.6, y: 40.5, raio: 9, forca: 0.66, padrao: 'lampada' },
      { x: 53.6, y: 40.5, raio: 9, forca: 0.66, padrao: 'lampada' },
      { x: 67.2, y: 39.5, raio: 10, forca: 0.72, padrao: 'lampada' },
      { x: 45.5, y: 61.5, raio: 9.5, forca: 0.7, padrao: 'lampada' },
      { x: 55.2, y: 61.5, raio: 9.5, forca: 0.7, padrao: 'lampada' },
    ],
    // O vento balança a vegetação das bordas, onde a arte é só folhagem, e
    // passa sombras de folhas por cima do terreno todo.
    vento: { forca: 2.4, duracao: 7.5, borda: 13 },
    folhagem: { duracao: 26, opacidade: 0.2 },
    brilho: 0.82,
  },

  tumba: {
    id: 'tumba',
    nome: 'Tumba iluminada por tochas',
    descricao: 'Só o fogo ilumina a câmara: luz quente e viva, ouro reluzindo e poeira parada no ar.',
    // Nada de véu escuro pesado aqui: a câmara é imperial, não assombrada. O
    // escuro entra só o bastante para o fogo ter contra o que brilhar.
    noite: { cor: '#1A0C04', forca: 0.3 },
    luzes: [
      // Os quatro braseiros da câmara principal: as luzes mestras da cena.
      { x: 37.1, y: 17.5, raio: 13, forca: 0.9, padrao: 'tocha' },
      { x: 70.1, y: 16.9, raio: 13, forca: 0.9, padrao: 'tocha' },
      { x: 36.0, y: 73.3, raio: 13, forca: 0.88, padrao: 'tocha' },
      { x: 70.1, y: 73.1, raio: 13, forca: 0.88, padrao: 'tocha' },
      // Tochas de parede do corredor da esquerda: menores e mais fracas.
      { x: 3.6, y: 38.9, raio: 7, forca: 0.6, padrao: 'tocha' },
      { x: 12.9, y: 39.5, raio: 6.5, forca: 0.55, padrao: 'tocha' },
      { x: 3.9, y: 61.2, raio: 7, forca: 0.6, padrao: 'tocha' },
      { x: 12.7, y: 59.5, raio: 6.5, forca: 0.55, padrao: 'tocha' },
      { x: 23.6, y: 39.7, raio: 6, forca: 0.5, padrao: 'tocha' },
      // A ampulheta dourada do fundo e o frasco carmesim do tesouro: os dois
      // pontos que o olho procura, acesos de leve para puxar o olhar.
      { x: 52.1, y: 11.8, raio: 9, forca: 0.42, padrao: 'frio', cor: '#FFE9A8' },
      { x: 90.9, y: 38.9, raio: 5.5, forca: 0.5, padrao: 'pulso', cor: '#FF5A6E' },
    ],
    // Poeira suspensa: em ambiente fechado ela não atravessa, ela paira.
    poeira: { quantidade: 30, duracao: 22, opacidade: 0.4 },
    // O ouro responde ao fogo: um brilho lento percorre a câmara.
    ouro: { duracao: 13, opacidade: 0.2 },
    brilho: 1.06,
  },

  arcadia: {
    id: 'arcadia',
    nome: 'Instituto Arcádia · catástrofe',
    descricao: 'Escuridão, lâmpadas falhando sem parar, luz fria do laboratório e algo se movendo nas sombras.',
    noite: { cor: '#05070F', forca: 0.66 },
    luzes: [
      // Quarto à esquerda: o abajur é a única luz quente que sobrou.
      { x: 19.8, y: 47.4, raio: 11, forca: 0.6, padrao: 'falha', cor: '#FFB46E' },
      // Salão central: emergência, telas e as faixas das portas.
      { x: 49.6, y: 6.5, raio: 14, forca: 0.5, padrao: 'glitch', cor: '#9FB4FF' },
      { x: 49.6, y: 17.1, raio: 10, forca: 0.55, padrao: 'falha', cor: '#CFE2FF' },
      { x: 41.5, y: 14.7, raio: 6, forca: 0.62, padrao: 'pulso', cor: '#FF2E4D' },
      { x: 59.0, y: 14.7, raio: 6, forca: 0.62, padrao: 'pulso', cor: '#FF2E4D' },
      { x: 33.8, y: 49.6, raio: 7, forca: 0.5, padrao: 'falha', cor: '#BFE0FF' },
      { x: 62.3, y: 49.6, raio: 7, forca: 0.5, padrao: 'falha', cor: '#BFE0FF' },
      { x: 43.3, y: 54.3, raio: 8, forca: 0.42, padrao: 'glitch', cor: '#8FB8FF' },
      { x: 58.6, y: 33.8, raio: 7, forca: 0.4, padrao: 'glitch', cor: '#8FB8FF' },
      { x: 44.8, y: 89.3, raio: 7, forca: 0.5, padrao: 'falha', cor: '#CFE2FF' },
      { x: 56.4, y: 89.3, raio: 7, forca: 0.5, padrao: 'falha', cor: '#CFE2FF' },
      // Laboratório à direita: o frio dos tubos e a maleta que ainda brilha.
      { x: 70.2, y: 18.9, raio: 9, forca: 0.52, padrao: 'frio', cor: '#5FE6D8' },
      { x: 85.2, y: 18.3, raio: 9, forca: 0.52, padrao: 'frio', cor: '#5FE6D8' },
      { x: 80.3, y: 45.1, raio: 13, forca: 0.78, padrao: 'frio', cor: '#6FFFE8' },
      { x: 69.4, y: 80.9, raio: 8.5, forca: 0.46, padrao: 'frio', cor: '#5FE6D8' },
      { x: 85.8, y: 78.9, raio: 8.5, forca: 0.46, padrao: 'frio', cor: '#5FE6D8' },
      { x: 87.8, y: 57.7, raio: 6.5, forca: 0.42, padrao: 'glitch', cor: '#7FD8FF' },
    ],
    // Algo grande e escuro atravessa a cena de tempos em tempos. Nunca tem
    // forma definida — o que assusta é justamente o que não dá para nomear.
    presenca: { duracao: 34, opacidade: 0.5 },
    // A escuridão dos cantos avança e recua, como se a sala respirasse.
    respiracao: { duracao: 9, forca: 0.3 },
    brilho: 0.68,
  },
};

export const listaDeAtmosferas = () => Object.values(ATMOSFERAS);

export function atmosferaDe(id) {
  const chave = String(id || '');
  return Object.prototype.hasOwnProperty.call(ATMOSFERAS, chave) ? ATMOSFERAS[chave] : null;
}

/** Duração base de cada padrão, em segundos. */
const COMPASSO = { tocha: 1.7, lampada: 4.3, falha: 5.6, frio: 6.4, pulso: 2.9, glitch: 2.2, estavel: 0 };

/**
 * O compasso de uma luz. Cada fonte recebe uma variação própria a partir da
 * posição dela, para duas lâmpadas iguais nunca piscarem juntas: em sincronia
 * viraria pisca-pisca de festa, não iluminação quebrada.
 */
export function compassoDaLuz(luz, indice) {
  const padrao = COMPASSO[luz?.padrao] === undefined ? 'lampada' : luz.padrao;
  const base = COMPASSO[padrao];
  if (!base) return { padrao, duracao: 0, atraso: 0 };
  const desvio = Math.abs((Math.sin((Number(luz?.x) || indice * 7.3) * 12.9898) * 43758.5453) % 1);
  return {
    padrao,
    duracao: Number((base * (0.78 + desvio * 0.5)).toFixed(2)),
    atraso: Number((-(indice * 0.73 + desvio * 3.1)).toFixed(2)),
  };
}

/** Posições equidistantes e estáveis para partículas (grãos ou poeira). */
export function graosDeAreia(quantidade) {
  const total = Math.max(0, Math.min(60, Number(quantidade) || 0));
  return Array.from({ length: total }, (_, index) => {
    const semente = Math.sin(index * 53.17) * 43758.5453;
    const sorte = semente - Math.floor(semente);
    const outra = Math.abs((Math.sin(index * 91.73) * 24634.6345) % 1);
    return {
      topo: Number((sorte * 100).toFixed(2)),
      esquerda: Number((outra * 100).toFixed(2)),
      atraso: Number((-outra * 15).toFixed(2)),
      escala: Number((0.5 + outra * 1.4).toFixed(2)),
      duracao: Number((9 + sorte * 9).toFixed(2)),
    };
  });
}
