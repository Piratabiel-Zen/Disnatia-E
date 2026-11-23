// O SISTEMA ONE SHOT TERROR
//
// Mesa de uma noite. Gente comum numa situação que não deveria existir —
// terror ou terror psicológico, sem campanha longa, sem evolução de
// personagem. Ou a pessoa sai inteira no fim da sessão, ou não sai.
//
// Por isso o sistema é curto de propósito: três abas além da sessão e do
// mural. Nada de bestiário, crônicas ou capítulos — numa noite só não há
// tempo de construir arquivo, e oferecer gaveta vazia só atrapalha o Mestre
// que está procurando a ficha.
//
// A forma da ficha e as contas moram em features/oneshot/fichaOneShot.mjs.
// Aqui ficam os nomes, as abas e a navegação.

const SISTEMA = Object.freeze({
  id: 'oneshot',
  nome: 'One Shot Terror',
  fonte: 'Mesa da casa',
  tagline: 'Terror de uma noite só',
  descricao: 'Gente comum, uma noite, e algo que não deveria estar ali. Para one-shots e mesas curtas.',

  // O vocabulário é deliberadamente seco. Em CAIN o Mestre é "Admin" porque
  // existe uma repartição; aqui não existe instituição nenhuma para dar nome
  // pomposo às coisas — são pessoas, e o que acontece com elas.
  termos: Object.freeze({
    mestre: 'Mestre',
    personagem: 'personagem',
    personagens: 'personagens',
    ficha: 'ficha',
    grupo: 'grupo',
    sessao: 'Sessão',
    mapabatalha: 'Cenário do Horror',
    capitulos: 'Notas da noite',
    inimigo: 'aparição',
    inimigos: 'aparições',
    navegacao: 'Índice da noite',
  }),

  // Só d20. A mesa rola d20 + competência contra a dificuldade que o Mestre
  // diz, e mais nada — oferecer d6 ou d8 aqui convida a rolar uma coisa que
  // o sistema não sabe interpretar.
  dados: Object.freeze({ faces: [20], maximoDeDados: 2, notacao: 'd20', resumo: 'd20 + competência' }),

  // Ficha própria: a deste sistema não se parece com a da Dinastia E nem com
  // a do CAIN, e misturar na mesma coleção daria fichas meio preenchidas dos
  // dois lados.
  colecaoDeFichas: 'fichas_oneshot',

  // As três condições da noite. A cor é o que a mesa lê antes do texto, então
  // as três precisam ser distinguíveis de relance, no escuro, de canto de olho:
  // osso para a vida, roxo para o pavor e vermelho para a sanidade.
  //
  // O vermelho ficou na sanidade e não no pavor porque é o medidor mais final
  // dos dois — pavor passa, cabeça quebrada não volta. Gastar o vermelho no
  // medidor curto tiraria o sinal de onde ele importa mais.
  condicoes: Object.freeze([
    { id: 'pv', nome: 'Vida', cor: '#C9C2B4', resumo: '5 pontos; 3 de 6 a 18 anos. Zerou, acabou.' },
    { id: 'pavor', nome: 'Pavor', cor: '#8B5FAF', resumo: 'Enche até 3. Cheio, vem a visão.' },
    { id: 'sanidade', nome: 'Sanidade', cor: '#C4414F', resumo: 'Enche até 6. Cheia, vem a visão — e é sobre você.' },
  ]),

  // A paleta faz parte do sistema, como a caveira e o d20: qualquer mesa de
  // uma noite é preto e cinza. Mesa com nome próprio ainda manda sobre isto
  // (a Estrela de Absinto tem a paleta dela), mas o seletor do formulário não.
  tema: 'mortalha',

  // A névoa atravessa a tela o tempo todo, e o Mestre liga e desliga para a
  // mesa inteira. É o único efeito de ambiente deste sistema — ter dois
  // competiria com a cena que o Mestre está descrevendo.
  nevoa: true,

  abas: Object.freeze(['investigacao', 'regras', 'aparicoes', 'mapabatalha']),

  navegacao: Object.freeze([
    { id: 'session', label: 'A noite', icon: '✦', items: [
      { id: 'session', label: 'Sessão Atual', icon: '✦' },
      // O mesmo mapa de combate das outras mesas, com outro nome: aqui não
      // há combate tático, há um lugar e onde cada um está dentro dele.
      { id: 'mapabatalha', label: 'Cenário do Horror', icon: '☗' },
    ] },
    { id: 'character', label: 'Personagem', icon: '◆', items: [
      { id: 'fichas', label: 'Fichas', icon: '📋' },
    ] },
    { id: 'mesa', label: 'Mesa', icon: '◉', items: [
      { id: 'investigacao', label: 'Mural', icon: '🧵' },
      { id: 'aparicoes', label: 'Aparições', icon: '☾' },
      { id: 'regras', label: 'Regras', icon: '§' },
    ] },
  ]),
});

export default SISTEMA;
