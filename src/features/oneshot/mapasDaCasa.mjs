/**
 * A CASA DO AVÔ HIROSHI — OS SETE MAPAS
 *
 * Quatro ou cinco primos passam a noite na casa do avô. Os mapas descem do
 * pátio até a sala ritualística, e é nessa ordem que a noite costuma andar.
 *
 * O QUE ESTE ARQUIVO É: o guia de ambientação virado em dados. Cada mapa
 * traz a imagem, o que tem dentro, as camadas de luz que o cenário pede e o
 * evento que o Mestre dispara ali. A tela só lê daqui — nenhuma atmosfera
 * está escrita dentro de componente nenhum, porque mapa novo tem que entrar
 * sem mexer em tela.
 *
 * DUAS REGRAS DA MESA QUE VIRARAM REGRA DO CÓDIGO:
 *
 *  1. A YAMAUBA NÃO ESTÁ NAS IMAGENS. Os mapas são lugares abandonados e
 *     ameaçadores mesmo sem ela. Ela entra como camada temporária, por cima,
 *     e sai — assim a mesa nunca tem certeza de ter visto alguma coisa. Por
 *     isso não existe aqui nenhum campo de "criatura no mapa": só eventos.
 *
 *  2. A BARREIRA SEGUE OS MUROS, não as paredes da casa. O galpão está
 *     dentro da propriedade, então ir até lá não quebra proteção nenhuma; só
 *     ultrapassar o portão quebra. `dentroDaBarreira` marca isso em cada
 *     mapa, para a tela poder avisar o Mestre antes de ele mandar alguém
 *     para fora.
 */

export const PASTA = '/media/mapas/casa';

/**
 * As três fases da noite.
 *
 * São um multiplicador sobre TODAS as camadas, e não um conjunto de valores
 * por mapa: assim o Mestre vira a noite uma vez e os sete mapas acompanham
 * juntos. Escrever os três estados em cada mapa daria 21 lugares para
 * desencontrar.
 */
export const FASES = Object.freeze([
  {
    id: 'estranheza',
    nome: 'Estranheza',
    horas: '22h – 00h',
    etapa: 'Exploração',
    resumo: 'Luzes relativamente estáveis, pouca névoa, sombras discretas.',
    escuridao: 0.35,
    nevoa: 0.1,
    sombras: 0.06,
    // O quanto as luzes oscilam. 1 é o pulso escrito no mapa; abaixo disso,
    // mais estável.
    instabilidade: 0.45,
  },
  {
    id: 'assombracao',
    nome: 'Assombração',
    horas: '00h – 03h',
    etapa: 'Perseguição',
    resumo: 'Piscadas frequentes, luzes enfraquecidas, névoa densa, sombras que parecem se mover.',
    escuridao: 0.56,
    nevoa: 0.19,
    sombras: 0.14,
    instabilidade: 1,
  },
  {
    id: 'cacada',
    nome: 'Caçada',
    horas: '03h – 06h',
    etapa: 'Sobrevivência',
    resumo: 'Quase escuro, falhas de energia, aparições muito breves. O amanhecer enfraquece tudo no fim.',
    escuridao: 0.75,
    nevoa: 0.25,
    sombras: 0.2,
    instabilidade: 1.6,
  },
]);

export const FASE_PADRAO = 'estranheza';
export const fasePorId = id =>
  FASES.find(f => f.id === id) || FASES.find(f => f.id === FASE_PADRAO);

/**
 * As camadas, na ordem em que são empilhadas.
 *
 * O mapa base NUNCA é tocado: tudo é desenhado por cima. É o que permite
 * trocar a imagem de um andar sem refazer atmosfera nenhuma.
 */
export const CAMADAS = Object.freeze([
  { id: 'base', nome: 'Mapa base', funcao: 'Estrutura e mobiliário', fixa: true },
  { id: 'escuridao', nome: 'Escuridão', funcao: 'Quanto os jogadores enxergam' },
  { id: 'luzes', nome: 'Luzes', funcao: 'Luar, velas, lâmpadas, fogo' },
  { id: 'nevoa', nome: 'Névoa', funcao: 'Movimento ambiental lento' },
  { id: 'sombras', nome: 'Sombras', funcao: 'Sugerir movimento e presenças' },
  { id: 'aparicoes', nome: 'Aparições', funcao: 'Revelações sobrenaturais' },
]);

export const MAPAS = Object.freeze([
  {
    id: 'patio',
    ordem: 1,
    nome: 'O Pátio da Mansão',
    onde: 'Terreno externo',
    imagem: `${PASTA}/patio.webp`,
    dentroDaBarreira: true,
    // O portão é o limite: passar dele quebra a proteção.
    temLimite: true,
    elementos: ['mansão', 'muros altos', 'portão de ferro', 'árvore retorcida',
      'poço', 'carro', 'caminhos de cascalho', 'galpão'],
    luz: 'Luar azul-acinzentado, fraco. O lampião do portão oscila a cada 7–12 segundos.',
    efeitos: ['nevoa-rasteira', 'luar-pulso', 'lampiao-portao', 'sombra-arvore', 'brilho-chuva'],
    evento: {
      nome: 'A presença além dos muros',
      texto: 'Quando uma criança se aproxima do portão, uma sombra muito alta aparece do lado de fora, imóvel. Se a criança piscar, ela some.',
    },
  },
  {
    id: 'terreo',
    ordem: 2,
    nome: 'O Coração da Mansão',
    onde: 'Térreo',
    imagem: `${PASTA}/terreo.webp`,
    dentroDaBarreira: true,
    elementos: ['hall de entrada', 'escadaria principal', 'sala de jantar', 'cozinha',
      'sala de estar', 'escritório', 'banheiro', 'acesso ao porão'],
    luz: 'Hall amarelado e trêmulo. O abajur do escritório fica aceso mesmo depois de alguém apagá-lo.',
    efeitos: ['lustre-tremor', 'vela-respira', 'lareira-danca', 'nevoa-porao'],
    evento: {
      nome: 'A sexta cadeira',
      texto: 'A mesa está posta para cinco crianças. Depois da meia-noite, ao voltarem à sala, há um sexto lugar à mesa.',
    },
  },
  {
    id: 'quartos',
    ordem: 3,
    nome: 'Os Quartos',
    onde: 'Primeiro andar',
    imagem: `${PASTA}/quartos.webp`,
    dentroDaBarreira: true,
    elementos: ['quarto do avô Hiroshi', 'dois quartos infantis', 'banheiro',
      'corredor', 'acesso ao sótão'],
    luz: 'Corredor quase escuro. O quarto do avô tem luz quente estranhamente estável.',
    efeitos: ['corredor-apaga', 'luar-desliza', 'sombra-teto', 'aparicao-surge'],
    evento: {
      nome: 'A coisa no teto',
      texto: 'A sombra da luminária começa a se esticar pelo teto. Quando olham para cima, a Yamauba está presa entre as vigas, com os membros dobrados em ângulos impossíveis.',
      // A criatura NÃO fica no mapa: é camada temporária, por cima.
      usaAparicao: true,
    },
  },
  {
    id: 'sotao',
    ordem: 4,
    nome: 'O Lugar das Memórias',
    onde: 'Sótão',
    imagem: `${PASTA}/sotao.webp`,
    dentroDaBarreira: true,
    elementos: ['baús', 'fotografias antigas', 'móveis cobertos', 'cadeira de balanço',
      'espelho', 'berço abandonado', 'alçapão'],
    luz: 'Só o luar pelas janelinhas. Poeira suspensa nos feixes. A vela diminui quando alguém chega perto do espelho.',
    efeitos: ['poeira-flutua', 'feixe-luar', 'vela-tremula', 'vinheta-escura'],
    evento: {
      nome: 'A cadeira',
      texto: 'A cadeira de balanço começa a se mexer sozinha. Para no instante em que alguém a encara de frente.',
    },
  },
  {
    id: 'porao',
    ordem: 5,
    nome: 'As Coisas Enterradas',
    onde: 'Porão',
    imagem: `${PASTA}/porao.webp`,
    dentroDaBarreira: true,
    elementos: ['caldeira', 'tubulações', 'prateleiras de mantimentos',
      'bancada de Hiroshi', 'cisterna', 'passagem secreta'],
    luz: 'A lâmpada central pisca sem hora e às vezes apaga por 2–4 segundos. A caldeira pulsa laranja atrás da portinhola.',
    efeitos: ['lampada-instavel', 'caldeira-brasa', 'agua-reflexo', 'sombra-avanca'],
    evento: {
      nome: 'A respiração',
      texto: 'Ouvem alguém respirando atrás das prateleiras. A cada piscada da lâmpada, a sombra parece ter chegado mais perto.',
    },
  },
  {
    id: 'ritual',
    ordem: 6,
    nome: 'O Segredo de Hiroshi',
    onde: 'Sala ritualística',
    imagem: `${PASTA}/ritual.webp`,
    dentroDaBarreira: true,
    elementos: ['altar central', 'cadeira ritualística', 'cinco nichos para os amuletos',
      'raízes', 'velas', 'passagem de entrada'],
    luz: 'Luz ambiente quase nula. O altar tem um brilho vermelho discreto, como brasa sob a pedra.',
    efeitos: ['brasa-altar', 'sombra-raiz', 'vela-caos', 'selo-acende'],
    // Os cinco nichos são contados: cada amuleto posto acende um trecho.
    nichos: 5,
    evento: {
      nome: 'O ritual final',
      texto: 'A cada amuleto posto, um trecho da sala se acende. Com os cinco no lugar, todas as velas apagam ao mesmo tempo. Três segundos de escuridão total. Depois disso a barreira pode ser restaurada.',
      escuridaoTotalMs: 3000,
    },
  },
  {
    id: 'galpao',
    ordem: 7,
    nome: 'O Armazém',
    onde: 'Galpão',
    imagem: `${PASTA}/galpao.webp`,
    // Dentro dos muros: ir até o galpão NÃO quebra a barreira.
    dentroDaBarreira: true,
    elementos: ['bancada', 'ferramentas', 'gerador', 'prateleiras', 'bicicletas',
      'caixas', 'camisa manchada de sangue', 'carro do lado de fora'],
    luz: 'A lâmpada pendurada balança. As janelas trazem o azul frio da madrugada.',
    efeitos: ['luz-balanca', 'chuva-reflexo', 'porta-nevoa', 'gerador-faisca', 'sombra-prateleira'],
    evento: {
      nome: 'A camisa',
      texto: 'A camisa de Hiroshi está pendurada na parede. Ao se aproximarem, ouvem a voz dele vindo de dentro de um armário.',
    },
  },
]);

export const mapaPorId = id => MAPAS.find(m => m.id === id) || null;
export const mapasEmOrdem = () => [...MAPAS].sort((a, b) => a.ordem - b.ordem);

/**
 * As intensidades de cada camada, já com a fase aplicada.
 *
 * Um lugar só faz a conta, e a tela só lê: espalhar a multiplicação por
 * componente daria sete telas calculando a mesma coisa de jeitos diferentes,
 * e a primeira que divergisse ninguém ia notar.
 */
export function atmosferaDoMapa(idDoMapa, idDaFase) {
  const mapa = mapaPorId(idDoMapa);
  const fase = fasePorId(idDaFase);
  if (!mapa) return null;
  return Object.freeze({
    mapa: mapa.id,
    fase: fase.id,
    escuridao: fase.escuridao,
    nevoa: fase.nevoa,
    sombras: fase.sombras,
    instabilidade: fase.instabilidade,
    efeitos: mapa.efeitos,
  });
}

/** Passar do portão quebra a proteção; o resto da propriedade, não. */
export const quebraABarreira = idDoMapa => {
  const mapa = mapaPorId(idDoMapa);
  return Boolean(mapa) && !mapa.dentroDaBarreira;
};
