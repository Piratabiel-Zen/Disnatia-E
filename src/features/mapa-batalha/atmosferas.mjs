// ATMOSFERAS DE MAPA
//
// Um mapa de batalha é uma pintura parada. A atmosfera é o que a faz respirar:
// a luz que muda, a poeira que atravessa, o vento nas árvores. Tudo acontece
// por cima da arte, em camadas que não recebem clique e não atrapalham os
// tokens — a cena ganha vida sem o tabuleiro perder precisão.
//
// Cada preset é só dados. O componente desenha o que estiver descrito aqui, e
// o Mestre escolhe a atmosfera de qualquer mapa pelo nome.

export const SEM_ATMOSFERA = '';

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
    // A noite entra como um véu frio por cima da arte inteira.
    noite: { cor: '#0B1430', forca: 0.52 },
    luar: { x: 20, y: 2, cor: '#B4D2FF', forca: 0.4, respiro: 17 },
    // Os postes do desenho, em porcentagem da imagem. Cada um acende um poço
    // de luz quente com um tremor leve, como lâmpada velha.
    postes: [
      { x: 33.8, y: 39.5, raio: 10, forca: 0.72 },
      { x: 45.6, y: 40.5, raio: 9, forca: 0.66 },
      { x: 53.6, y: 40.5, raio: 9, forca: 0.66 },
      { x: 67.2, y: 39.5, raio: 10, forca: 0.72 },
      { x: 45.5, y: 61.5, raio: 9.5, forca: 0.7 },
      { x: 55.2, y: 61.5, raio: 9.5, forca: 0.7 },
    ],
    // O vento balança a vegetação das bordas, onde a arte é só folhagem, e
    // passa sombras de folhas por cima do terreno todo.
    vento: { forca: 2.4, duracao: 7.5, borda: 13 },
    folhagem: { duracao: 26, opacidade: 0.2 },
    brilho: 0.82,
  },
};

export const listaDeAtmosferas = () => Object.values(ATMOSFERAS);

export function atmosferaDe(id) {
  const chave = String(id || '');
  return Object.prototype.hasOwnProperty.call(ATMOSFERAS, chave) ? ATMOSFERAS[chave] : null;
}

/** Posições equidistantes e estáveis para os grãos de areia. */
export function graosDeAreia(quantidade) {
  const total = Math.max(0, Math.min(60, Number(quantidade) || 0));
  return Array.from({ length: total }, (_, index) => {
    const semente = Math.sin(index * 53.17) * 43758.5453;
    const sorte = semente - Math.floor(semente);
    const outra = (Math.sin(index * 91.73) * 24634.6345) % 1;
    return {
      topo: Number((sorte * 100).toFixed(2)),
      atraso: Number((-Math.abs(outra) * 15).toFixed(2)),
      escala: Number((0.5 + Math.abs(outra) * 1.4).toFixed(2)),
      duracao: Number((9 + sorte * 9).toFixed(2)),
    };
  });
}
