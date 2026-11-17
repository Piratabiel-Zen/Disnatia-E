// O SISTEMA CAIN
//
// Terror investigativo de ação, de Tom Bloom. Exorcistas da CASTLE caçam
// Pecados — monstros nascidos de traumas humanos. Tudo aqui vem do livro
// (CAIN 1.4.5 PT-BR); o motor de rolagem mora em ./regras.mjs.
//
// Nada neste arquivo é o texto do livro. São os nomes das coisas e a forma da
// ficha, que é o que o site precisa saber para montar a mesa. O texto fica no
// PDF do Mestre, na aba Livro.

import { rolarAcao } from './regras.mjs';

/* As dez perícias básicas, 0 a 3, no máximo duas em 3. */
export const PERICIAS = Object.freeze([
  { id: 'forca', nome: 'Força', resumo: 'Erguer, quebrar, dominar pela força bruta.' },
  { id: 'atletismo', nome: 'Atletismo', resumo: 'Correr, escalar, aguentar, atravessar o que for.' },
  { id: 'coordenacao', nome: 'Coordenação', resumo: 'Pontaria, equilíbrio, mãos firmes.' },
  { id: 'furtividade', nome: 'Furtividade', resumo: 'Passar sem ser visto, arrombar, enganar.' },
  { id: 'interface', nome: 'Interface', resumo: 'Tecnologia, veículos, consertar e burlar máquinas.' },
  { id: 'investigacao', nome: 'Investigação', resumo: 'Pesquisar, decifrar, deduzir do que ficou para trás.' },
  { id: 'observacao', nome: 'Observação', resumo: 'Examinar, rastrear, achar o que está escondido.' },
  { id: 'autoridade', nome: 'Autoridade', resumo: 'Liderar, ordenar, impor a vontade.' },
  { id: 'negociacao', nome: 'Negociação', resumo: 'Convencer, barganhar, desarmar com a palavra.' },
  { id: 'conexao', nome: 'Conexão', resumo: 'Gente que te deve, gente que te atende, portas que abrem.' },
]);

/* Psique é à parte: sobe sozinha e só é rolada ao usar os poderes. */
export const PERICIA_ESPECIAL = Object.freeze({
  id: 'psique', nome: 'Psique',
  resumo: 'Sobe sozinha. Só rola ao usar blasfêmias.',
});

export const MAX_PERICIAS_EM_TRES = 2;

/**
 * As doze blasfêmias: o poder psíquico que o exorcista manifesta.
 *
 * Na ordem em que o livro as apresenta. O resumo é descrição própria do tema
 * de cada uma, para a mesa escolher sem abrir o PDF; os poderes de cada
 * blasfêmia continuam no livro, que é de quem o comprou.
 */
export const BLASFEMIAS_DETALHADAS = Object.freeze([
  { nome: 'Tensão', resumo: 'Campos de densidade psíquica: cortar como lâmina, endurecer uma superfície, amolecer a matéria morta.' },
  { nome: 'Ardor', resumo: 'Calor e luz que atravessam o que estiver no caminho — parede, porta, obstáculo.' },
  { nome: 'Fluxo', resumo: 'Correntes e o tempo delas: empurrar, acelerar, segurar o que se move.' },
  { nome: 'Vetor', resumo: 'Força dirigida à distância: arremessar, atirar, mover o que não se alcança.' },
  { nome: 'Portão', resumo: 'Rasgar e redobrar o espaço: passagens, duplicatas, um lugar reorganizado por dentro.' },
  { nome: 'Sufoco', resumo: 'Tirar apoio e atrito: o chão escorrega, o ar falta, o alvo não firma o pé.' },
  { nome: 'Sussurro', resumo: 'Uma sombra que acompanha, sente e responde — com pouquíssimas palavras.' },
  { nome: 'Edit', resumo: 'Alterar os detalhes: a aparência, a cópia, a pequena correção na realidade.' },
  { nome: 'Vínculo', resumo: 'Ligar pessoas e coisas; dividir entre vários o que acontece a um.' },
  { nome: 'Palácio', resumo: 'Abrir um espaço próprio e habitá-lo. Dentro dele mora um tulpa.' },
  { nome: 'Assombração', resumo: 'Ver e tratar com o que ficou: almas, rastros, presenças de quem passou.' },
  { nome: 'Simpatia', resumo: 'Correspondência: tocar um objeto e ler o que ele guarda.' },
]);

export const BLASFEMIAS = Object.freeze(BLASFEMIAS_DETALHADAS.map(b => b.nome));

/** As categorias de Pecado descritas no livro. */
export const CATEGORIAS_DE_PECADO = Object.freeze([
  { numeral: 'I', nome: 'Ogro', resumo: 'Enormes, disformes, terrivelmente poderosos.' },
  { numeral: 'II', nome: 'Ídolo', resumo: 'Serenos e encantadores, de beleza sobrenatural.' },
  { numeral: 'III', nome: 'Cão', resumo: 'Ferozes e violentos, selvagens extremamente perigosos.' },
  { numeral: 'IV', nome: 'Centopeia', resumo: 'Reputação pútrida; evitados sempre que possível.' },
  { numeral: 'V', nome: 'Sapo', resumo: 'Astutos e gananciosos, com um padrão de comportamento próprio.' },
  { numeral: 'VI', nome: 'Lorde', resumo: 'Justos e moralistas, movidos por um senso irracional de ordem.' },
]);

/* Os recursos do corpo e da psique, do jeito que a ficha marca. */
export const RECURSOS = Object.freeze([
  { id: 'estresse', nome: 'Estresse', tipo: 'barra', max: 6,
    nota: 'No máximo, um ferimento. Marcar estresse à beira da morte mata na hora.' },
  { id: 'ferimentos', nome: 'Ferimentos', tipo: 'caixas', max: 3,
    nota: 'Cada um deixa uma ação difícil. Limpa o estresse ao ganhar um.' },
  { id: 'pulsos', nome: 'Pulsos psíquicos', tipo: 'caixas', max: 4,
    nota: 'Gaste 1 para usar os poderes (+1D).' },
  { id: 'pecado', nome: 'Pecado', tipo: 'barra', max: 6,
    nota: 'No limite, o exorcista verte de pecado no fim da cena.' },
  { id: 'piedade', nome: 'Piedade', tipo: 'caixas', max: 3,
    nota: 'Queime tudo em Agonia Divina: +1D por ponto.' },
]);

/* Estados que entram e saem durante a caçada. */
export const CONDICOES = Object.freeze([
  { id: 'ferido', nome: 'Ferido', cor: '#B4543A', resumo: 'Ações afetadas até ser tratado.' },
  { id: 'aflito', nome: 'Aflição', cor: '#8B5CB8', resumo: 'Registrada na ficha; sai no debrief pós-missão.' },
  { id: 'gancho', nome: 'Gancho', cor: '#C79A3C', resumo: 'Enche e tem que ser resolvido.' },
  { id: 'beira-da-morte', nome: 'À beira da morte', cor: '#8E1F2B', resumo: 'Qualquer estresse agora mata.' },
  { id: 'vertendo', nome: 'Vertendo pecado', cor: '#5B2C6F', resumo: 'Chegou ao limite de pecado.' },
]);

/** Os blocos da ficha de exorcista, na ordem em que aparecem. */
export const BLOCOS_DA_FICHA = Object.freeze([
  { id: 'identidade', nome: 'Exorcista registrado', descricao: 'Nome, XID, categoria, foto e dados de registro.' },
  { id: 'pericias', nome: 'Perícias registradas', descricao: 'As dez perícias e a Psique.' },
  { id: 'agenda', nome: 'Agenda', descricao: 'Motivação, papel no grupo e a habilidade escolhida.' },
  { id: 'blasfemia', nome: 'Blasfêmia', descricao: 'O poder psíquico manifestado e seus usos.' },
  { id: 'corpo', nome: 'Avaliação de saúde', descricao: 'Estresse, ferimentos, ganchos e aflições.' },
  { id: 'kit', nome: 'Kit', descricao: 'O que o exorcista leva em missão.' },
  { id: 'vinculo', nome: 'Vínculo de virtude', descricao: 'A promessa que sustenta e limita.' },
  { id: 'avanco', nome: 'Avanço', descricao: 'XP e avanços ganhos ao fim de cada sessão.' },
  { id: 'segredos', nome: 'Segredos', descricao: 'O que só este jogador vê.' },
  { id: 'notas', nome: 'Notas', descricao: 'Histórico, descobertas e o que a mesa anotou.' },
]);

const SISTEMA = Object.freeze({
  id: 'cain',
  nome: 'CAIN',
  fonte: 'Tom Bloom',
  tagline: 'Terror investigativo de ação',
  descricao: 'Exorcistas da CASTLE caçam Pecados: monstros nascidos de traumas humanos.',

  // O sistema nomeia as coisas. Chamar o Mestre de "Admin" e o personagem de
  // "exorcista" não é enfeite — é metade do tom da mesa.
  termos: Object.freeze({
    mestre: 'Admin',
    personagem: 'exorcista',
    personagens: 'exorcistas',
    ficha: 'ficha de exorcista',
    grupo: 'esquadrão',
    sessao: 'caçada',
    inimigo: 'Pecado',
    inimigos: 'Pecados',
  }),

  dados: Object.freeze({
    notacao: 'd6',
    resumo: 'Reserva de d6. Todo 4+ é sucesso; um sucesso basta.',
    // O CAIN não usa outro dado. Oferecer d20 na mesa de dados seria
    // convidar a mesa a rolar uma coisa que o sistema não sabe ler.
    faces: Object.freeze([6]),
    // Três de perícia mais três de vantagem é o teto que o livro dá, e é onde
    // a mesa para. A Agonia Divina pode passar disso no papel, mas na prática
    // ninguém monta reserva maior — oferecer mais caixas era convidar a
    // clicar numa que não se usa.
    maximoDeDados: 6,
    rolar: rolarAcao,
  }),

  pericias: PERICIAS,
  periciaEspecial: PERICIA_ESPECIAL,
  recursos: RECURSOS,
  condicoes: CONDICOES,
  blocosDaFicha: BLOCOS_DA_FICHA,

  // Abas que este sistema traz além das estruturais (fichas, mapas, crônicas).
  abas: Object.freeze([
    'investigacao', 'pecados', 'documentos', 'livro',
    'manual', 'agendas', 'tiposdepecado',
  ]),

  // A navegação da mesa. Vem do sistema porque "Bestiário" e "Livro da
  // Mandíbula" são da Dinastia E; aqui a caçada tem outro mapa e outro índice.
  navegacao: Object.freeze([
    { id: 'session', label: 'Caçada', icon: '✦', items: [
      { id: 'session', label: 'Sessão Atual', icon: '✦' },
      { id: 'mapamundi', label: 'Mapa', icon: '🗺️' },
      { id: 'mapabatalha', label: 'Mapa de Combate', icon: '🗡️' },
    ] },
    { id: 'character', label: 'Exorcista', icon: '◆', items: [
      { id: 'fichas', label: 'Fichas', icon: '📋' },
    ] },
    { id: 'investigacao', label: 'Investigação', icon: '◉', items: [
      { id: 'investigacao', label: 'Mural', icon: '🧵' },
      { id: 'documentos', label: 'Documentos', icon: '▤' },
      { id: 'pecados', label: 'Pecados', icon: '✝' },
    ] },
    { id: 'knowledge', label: 'Arquivo', icon: '◇', items: [
      { id: 'manual', label: 'Manual de Campo', icon: '§' },
      { id: 'agendas', label: 'Agendas e Blasfêmias', icon: '◈' },
      { id: 'tiposdepecado', label: 'Tipos de Inimigo', icon: '☠' },
      { id: 'livro', label: 'Livro', icon: '✦' },
      { id: 'cronicas', label: 'Capítulos', icon: '🗒️' },
    ] },
    // O Painel do Admin trazia a aba "Pecados e NPCs" da Dinastia E, que é um
    // bestiário de ficha com atributos, dano e resistência. Nada disso existe
    // no CAIN: um Pecado se descreve por domínios, palácio, traumas e talismã
    // de execução. A aba Pecados já faz esse trabalho, e manter as duas só
    // dava ao Admin um formulário que ele nunca ia preencher.
  ]),
});

export default SISTEMA;
