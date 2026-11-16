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

  // ─────────────────────────────────────────────────────────────────────────
  // O lago sob a Pirâmide de Salomão.
  //
  // Aqui o jogador não deve sentir medo: deve sentir que acabou de encontrar
  // algo que ninguém viu. Por isso o véu escuro é fraco — só o suficiente para
  // o azul ter contra o que brilhar — e nenhuma luz "falha". Tudo é 'frio':
  // pulso longo, calmo, sem sobressalto. É a diferença entre uma caverna
  // assombrada e uma descoberta.
  lago: {
    id: 'lago',
    nome: 'Pirâmide de Salomão · o lago',
    descricao: 'A água brilha e se move devagar, os cristais pulsam e esporos de luz pairam no ar. Místico, não ameaçador.',
    noite: { cor: '#06182E', forca: 0.3 },
    // O lago inteiro como uma fonte só, enorme e lenta: é ele que ilumina a
    // caverna, e não o contrário.
    luar: { x: 50, y: 46, cor: '#7FE9FF', forca: 0.32, respiro: 14 },
    luzes: [
      // A água: três focos de intensidade dentro do lago, com compassos
      // diferentes, para o brilho nunca parecer uma lâmpada só.
      { x: 50, y: 44, raio: 30, forca: 0.42, padrao: 'frio', cor: '#5FD8FF' },
      { x: 34, y: 36, raio: 20, forca: 0.4, padrao: 'frio', cor: '#6FE4FF' },
      { x: 64, y: 54, raio: 22, forca: 0.42, padrao: 'frio', cor: '#4FC8FF' },
      // Os espinhos de cristal que saem da água.
      { x: 36.0, y: 12.5, raio: 7, forca: 0.6, padrao: 'frio', cor: '#8FF2FF' },
      { x: 64.5, y: 15.0, raio: 7, forca: 0.6, padrao: 'frio', cor: '#8FF2FF' },
      { x: 62.5, y: 24.5, raio: 5.5, forca: 0.5, padrao: 'frio', cor: '#7FE9FF' },
      { x: 33.5, y: 56.0, raio: 5, forca: 0.44, padrao: 'frio', cor: '#7FE9FF' },
      // Os veios de cristal nas paredes e no chão de pedra.
      { x: 7.5, y: 10.0, raio: 7, forca: 0.5, padrao: 'frio', cor: '#6FC2FF' },
      { x: 24.5, y: 7.5, raio: 6, forca: 0.46, padrao: 'frio', cor: '#6FC2FF' },
      { x: 21.0, y: 64.0, raio: 6, forca: 0.44, padrao: 'frio', cor: '#5FB8FF' },
      { x: 79.5, y: 51.0, raio: 7, forca: 0.52, padrao: 'frio', cor: '#6FD4FF' },
      { x: 92.0, y: 80.0, raio: 7.5, forca: 0.5, padrao: 'frio', cor: '#6FD4FF' },
      { x: 2.5, y: 46.0, raio: 6, forca: 0.4, padrao: 'frio', cor: '#5FB8FF' },
      // Os dois braseiros da plataforma de baixo: as únicas chamas da cena,
      // e por isso as únicas que tremem.
      { x: 43.2, y: 82.0, raio: 6, forca: 0.72, padrao: 'tocha', cor: '#9FF4FF' },
      { x: 58.0, y: 82.0, raio: 6, forca: 0.72, padrao: 'tocha', cor: '#9FF4FF' },
      // Os selos no chão e o portal do alto, que puxam o olho para as saídas.
      { x: 51.0, y: 92.0, raio: 9, forca: 0.46, padrao: 'pulso', cor: '#FFD98A' },
      { x: 6.5, y: 76.0, raio: 8, forca: 0.4, padrao: 'pulso', cor: '#FFD98A' },
      { x: 86.5, y: 17.0, raio: 7, forca: 0.4, padrao: 'pulso', cor: '#FFD98A' },
      { x: 92.5, y: 10.5, raio: 9, forca: 0.52, padrao: 'frio', cor: '#8FE4FF' },
    ],
    // A mesma camada que faz o ouro reluzir na tumba, em ciano: aqui ela é a
    // água se movendo sob a superfície.
    ouro: { duracao: 17, opacidade: 0.22, cor: '111,230,255', brilho: '210,250,255' },
    // Esporos de luz pairando — não é poeira de tumba, é a caverna viva.
    poeira: { quantidade: 34, duracao: 26, opacidade: 0.5, cor: '150,238,255', halo: '90,200,255' },
    brilho: 1.06,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // A sala de combate do Instituto Arcádia.
  //
  // O oposto do lago. Aqui o jogador deve hesitar antes de decidir. As luzes
  // não iluminam a sala: elas avisam. Vermelho em compasso de alarme, tubos
  // brancos que falham, os cantos avançando, e algo atravessando o fundo de
  // vez em quando — sem forma, porque o que assusta é o que não se nomeia.
  arena: {
    id: 'arena',
    nome: 'Instituto Arcádia · sala de combate',
    descricao: 'Escuro e hostil: alarme vermelho pulsando, tubos falhando, os cantos avançando e algo cruzando o fundo.',
    noite: { cor: '#07040B', forca: 0.46 },
    luzes: [
      // Parede do fundo: tubos frios alternados com faixas de alarme.
      { x: 13.5, y: 3.5, raio: 8, forca: 0.5, padrao: 'falha', cor: '#BFE2FF' },
      { x: 24.5, y: 3.0, raio: 6, forca: 0.6, padrao: 'pulso', cor: '#FF2A42' },
      { x: 44.8, y: 3.5, raio: 8, forca: 0.5, padrao: 'falha', cor: '#BFE2FF' },
      { x: 55.6, y: 3.0, raio: 6, forca: 0.6, padrao: 'pulso', cor: '#FF2A42' },
      { x: 72.5, y: 3.5, raio: 8, forca: 0.5, padrao: 'falha', cor: '#BFE2FF' },
      { x: 85.0, y: 3.0, raio: 6, forca: 0.6, padrao: 'pulso', cor: '#FF2A42' },
      // Os dois corpos pendurados no alto: um halo fraco e trêmulo neles é o
      // que faz o olhar voltar para lá sem querer.
      { x: 22.0, y: 7.5, raio: 6, forca: 0.34, padrao: 'glitch', cor: '#FF4A5E' },
      { x: 78.0, y: 7.5, raio: 6, forca: 0.34, padrao: 'glitch', cor: '#FF4A5E' },
      // Corredores laterais: as celas, em alarme.
      { x: 3.0, y: 30.0, raio: 7, forca: 0.52, padrao: 'pulso', cor: '#FF2A42' },
      { x: 3.0, y: 52.0, raio: 7, forca: 0.46, padrao: 'falha', cor: '#FF3A50' },
      { x: 3.0, y: 75.0, raio: 7, forca: 0.52, padrao: 'pulso', cor: '#FF2A42' },
      { x: 97.0, y: 30.0, raio: 7, forca: 0.52, padrao: 'pulso', cor: '#FF2A42' },
      { x: 97.0, y: 52.0, raio: 7, forca: 0.46, padrao: 'falha', cor: '#FF3A50' },
      { x: 97.0, y: 75.0, raio: 7, forca: 0.52, padrao: 'pulso', cor: '#FF2A42' },
      // Janelas frias das pontas: o único branco que não é alarme.
      { x: 7.5, y: 13.0, raio: 6, forca: 0.3, padrao: 'frio', cor: '#9FC8FF' },
      { x: 92.5, y: 13.0, raio: 6, forca: 0.3, padrao: 'frio', cor: '#9FC8FF' },
      { x: 7.5, y: 60.0, raio: 6, forca: 0.3, padrao: 'frio', cor: '#9FC8FF' },
      { x: 92.5, y: 60.0, raio: 6, forca: 0.3, padrao: 'frio', cor: '#9FC8FF' },
      // Porta da frente e o selo alado no centro do piso: a arena em si.
      { x: 37.5, y: 96.5, raio: 6, forca: 0.44, padrao: 'falha', cor: '#BFE2FF' },
      { x: 62.5, y: 96.5, raio: 6, forca: 0.44, padrao: 'falha', cor: '#BFE2FF' },
      { x: 25.0, y: 96.5, raio: 5.5, forca: 0.5, padrao: 'pulso', cor: '#FF2A42' },
      { x: 75.0, y: 96.5, raio: 5.5, forca: 0.5, padrao: 'pulso', cor: '#FF2A42' },
      { x: 50.0, y: 47.0, raio: 14, forca: 0.3, padrao: 'pulso', cor: '#FF5566' },
    ],
    // Mais forte que no resto do Instituto: aqui a sala fecha em volta.
    respiracao: { duracao: 7.5, forca: 0.42 },
    presenca: { duracao: 26, opacidade: 0.62 },
    brilho: 0.78,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // O posto de gasolina na estrada.
  //
  // Lugar comum, e é essa a graça: nada ameaça. A cobertura das bombas acende
  // firme e não oscila nunca — é o ponto seguro da cena. Quem pisca é a loja
  // de conveniência, e só ela. O céu puxa para o âmbar por causa da estrela
  // amarela caindo; como a vista é de cima, a estrela não aparece, mas a cor
  // que ela joga no lugar, sim.
  posto: {
    id: 'posto',
    nome: 'Posto de gasolina · estrada à noite',
    descricao: 'A cobertura das bombas acesa sem oscilar, as luzes da loja piscando e o céu puxado para o âmbar.',
    noite: { cor: '#17101F', forca: 0.34 },
    // A estrela caindo: um banho âmbar sobre a cena inteira, bem devagar.
    luar: { x: 62, y: 4, cor: '#FFC86A', forca: 0.3, respiro: 21 },
    luzes: [
      // Cobertura das bombas: estáveis de propósito. São o que o jogador
      // enxerga como abrigo, e abrigo não pisca.
      { x: 50.5, y: 11.5, raio: 7, forca: 0.26, padrao: 'estavel', cor: '#FFE7B4' },
      { x: 76.0, y: 11.5, raio: 7, forca: 0.26, padrao: 'estavel', cor: '#FFE7B4' },
      { x: 50.5, y: 25.0, raio: 7, forca: 0.26, padrao: 'estavel', cor: '#FFE7B4' },
      { x: 76.0, y: 25.0, raio: 7, forca: 0.26, padrao: 'estavel', cor: '#FFE7B4' },
      // O chão sob as duas ilhas de bomba, onde a luz se acumula.
      { x: 57.5, y: 45.0, raio: 16, forca: 0.62, padrao: 'estavel', cor: '#FFD98A' },
      { x: 73.5, y: 45.0, raio: 16, forca: 0.62, padrao: 'estavel', cor: '#FFD98A' },
      // Loja de conveniência: é aqui que a luz falha.
      { x: 19.5, y: 24.0, raio: 8, forca: 0.6, padrao: 'falha', cor: '#FFE2A8' },
      { x: 30.5, y: 24.0, raio: 8, forca: 0.56, padrao: 'falha', cor: '#FFE2A8' },
      { x: 25.0, y: 31.5, raio: 10, forca: 0.5, padrao: 'lampada', cor: '#FFDD9E' },
      { x: 37.5, y: 33.0, raio: 5, forca: 0.5, padrao: 'glitch', cor: '#FF6A52' },
      // Postes da pista e a placa da estrada: quase firmes, com uma queda de
      // vez em quando. É o que dá o resto do movimento sem agitar a cena.
      { x: 5.5, y: 13.0, raio: 9, forca: 0.6, padrao: 'lampada', cor: '#FFD98A' },
      { x: 5.0, y: 62.0, raio: 9, forca: 0.58, padrao: 'lampada', cor: '#FFD98A' },
      { x: 93.0, y: 10.0, raio: 9, forca: 0.6, padrao: 'lampada', cor: '#FFD98A' },
      { x: 95.5, y: 57.0, raio: 8, forca: 0.54, padrao: 'lampada', cor: '#FFD98A' },
      { x: 97.0, y: 25.0, raio: 6, forca: 0.46, padrao: 'lampada', cor: '#FFBF6A' },
    ],
    // Mosquitos de beira de estrada em volta das lâmpadas.
    poeira: { quantidade: 20, duracao: 19, opacidade: 0.26, cor: '255,226,180', halo: '255,200,120' },
    // A vegetação das bordas se move: é a única coisa viva aqui.
    vento: { forca: 1.5, duracao: 9.5, borda: 11 },
    brilho: 0.92,
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
