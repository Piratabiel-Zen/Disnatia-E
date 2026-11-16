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

/** As doze blasfêmias: o poder psíquico que o exorcista manifesta. */
export const BLASFEMIAS = Object.freeze([
  'Tensão', 'Ardência', 'Tempo', 'Vetor', 'Espaço', 'Sussurro',
  'Cópia', 'Vínculo', 'Assombração', 'Possessão', 'Simpatia', 'Palácio',
]);

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
    rolar: rolarAcao,
  }),

  pericias: PERICIAS,
  periciaEspecial: PERICIA_ESPECIAL,
  recursos: RECURSOS,
  condicoes: CONDICOES,
  blocosDaFicha: BLOCOS_DA_FICHA,

  // Abas que este sistema traz além das estruturais (fichas, mapas, crônicas).
  abas: Object.freeze(['investigacao', 'pecados', 'documentos', 'livro']),
});

export default SISTEMA;
