// O SISTEMA DA DINASTIA E
//
// O sistema que o site já usava, agora declarado em vez de embutido. Nada aqui
// muda o comportamento das mesas existentes: é a descrição do que já havia,
// escrita no mesmo formato do CAIN, para as telas poderem perguntar ao sistema
// em vez de supor.
//
// As nove linhagens continuam em src/data/gameData.jsx: elas são conteúdo da
// campanha Dinastia E, não do sistema. Uma mesa nova com este sistema nasce
// sem linhagem nenhuma e o Mestre monta as dela.

export const ATRIBUTOS = Object.freeze([
  { id: 'forca', nome: 'Força', resumo: 'O peso do golpe.' },
  { id: 'agilidade', nome: 'Agilidade', resumo: 'Velocidade e reação.' },
  { id: 'durabilidade', nome: 'Durabilidade', resumo: 'Vida bônus: o quanto se aguenta.' },
  { id: 'inteligencia', nome: 'Inteligência', resumo: 'Leitura, cálculo, memória.' },
  { id: 'percepcao', nome: 'Percepção', resumo: 'O que se nota antes dos outros.' },
  { id: 'sorte', nome: 'Sorte', resumo: 'O que não se explica.' },
]);

export const MAX_ATRIBUTO = 16;

export const RECURSOS = Object.freeze([
  { id: 'hp', nome: 'Vida', tipo: 'barra', nota: 'Zerou, entra o Último Fôlego.' },
  { id: 'vigos', nome: 'Vigor Cósmico', tipo: 'barra', max: 5,
    nota: 'Não acumula: trava em 5. Só os Assassinos do Fogo Azul passam disso.' },
]);

export const CONDICOES = Object.freeze([
  { id: 'sangramento', nome: 'Sangramento', cor: '#B4543A', resumo: 'Acumula -2 por aplicação.' },
  { id: 'veneno', nome: 'Veneno', cor: '#4E9A51', resumo: 'Acumula -1 por aplicação.' },
  { id: 'congelamento', nome: 'Congelamento', cor: '#5FA8D3', resumo: 'Reduz acertos.' },
  { id: 'atordoado', nome: 'Atordoado', cor: '#C79A3C', resumo: 'Perde 1 turno.' },
  { id: 'maldicao', nome: 'Maldição', cor: '#8B5CB8', resumo: 'Penalidade severa enquanto durar.' },
  { id: 'ultimo-folego', nome: 'Último Fôlego', cor: '#8E1F2B', resumo: 'Entre a queda e a morte.' },
]);

const SISTEMA = Object.freeze({
  id: 'dinastia-e',
  nome: 'Dinastia E',
  fonte: 'Sistema próprio',
  tagline: 'Cósmico e mágico',
  descricao: 'Linhagens de Cosmum, Vigor Cósmico e combate por turnos.',

  termos: Object.freeze({
    mestre: 'Mestre',
    personagem: 'personagem',
    personagens: 'personagens',
    ficha: 'ficha',
    grupo: 'grupo',
    sessao: 'sessão',
    inimigo: 'inimigo',
    inimigos: 'inimigos',
  }),

  dados: Object.freeze({
    notacao: 'd20',
    resumo: '1D20 mais o atributo. Teste de Reflexo é 1D20 puro.',
    faces: Object.freeze([4, 6, 8, 10, 12, 20]),
    maximoDeDados: 5,
  }),

  atributos: ATRIBUTOS,
  recursos: RECURSOS,
  condicoes: CONDICOES,

  // As abas de conteúdo escrito desta mesa. Campanhas novas com este sistema
  // nascem sem elas e o Mestre liga o que quiser — ver campaignModules.mjs.
  abas: Object.freeze(['livro', 'regras', 'classes']),
});

export default SISTEMA;
