// OS TIPOS DE INIMIGO
//
// Catálogo de referência dos Pecados do CAIN, escrito aqui a partir das
// regras — não é o livro copiado. Cada Pecado do livro vem com domínios,
// palácio, aflições, vestígios e traumas prontos; isso continua no PDF, na
// aba Livro. O que mora aqui é o que a mesa precisa para reconhecer com o
// que está lidando e para o Admin montar um Pecado novo quando quiser.
//
// Não confundir com a aba Pecados: lá ficam os Pecados DESTA campanha, os
// que o esquadrão já encontrou. Aqui ficam os seis tipos, que são o
// alfabeto a partir do qual aqueles são escritos.

export const COMO_UM_PECADO_E_FEITO = Object.freeze([
  {
    titulo: 'Tipo',
    texto: 'Um dos seis abaixo. O tipo decide os poderes, o comportamento e — o que pesa mais — o tom da história que aquela caçada vai contar.',
  },
  {
    titulo: 'Forma',
    texto: 'Como o Pecado se relaciona com o hospedeiro. É escolha temática: a forma não muda nada nas regras.',
    itens: [
      'I · Separado — a mais comum. Age por conta própria, mas mantém um laço com o hospedeiro, que pode até já estar morto. Pode ser hostil ou protetor com ele.',
      'II · Fundido — está dentro do corpo ou do cadáver do hospedeiro, formando uma só coisa. Costuma passar por humano; quem olha sente que há algo errado sem saber dizer o quê.',
      'III · Vinculado — raro. Um humano ou exorcista aprendeu a comandar um Pecado de forma I ou II. Vincular é crime capital na CAIN.',
    ],
  },
  {
    titulo: 'Categoria',
    texto: 'De 0 a 7, como tudo no sistema. CAT 0 é tão forte quanto um humano comum; CAT 1 e 2 já matam um humano sem esforço. O esquadrão costuma ser mandado contra Pecados de categoria igual ou menor que a sua — acima disso, só em situação extrema. Não há registro histórico de um Pecado CAT 7.',
  },
  {
    titulo: 'Três domínios',
    texto: 'Um domínio é uma força central do Pecado e o conjunto de poderes que vem com ela. Todo Pecado tem exatamente três, e é a combinação deles que faz um Ogro ser diferente de outro Ogro. Fora dos poderes explícitos, os domínios servem de bússola: um Pecado de domínio sombrio ataca por emboscada; um de podridão ataca por lama e infecção.',
  },
  {
    titulo: 'Palácio',
    texto: 'A dimensão paralela onde o Pecado se abriga. Fica sempre dentro da área de investigação e a entrada tem que ser reconhecível pelos exorcistas. Como nasce da psique humana, quase sempre se parece com um lugar comum — um hotel, um hospital desativado — e carrega algo do hospedeiro.',
    itens: [
      'Levando 4 cortes no talismã de execução FORA do palácio, o Pecado foge para lá e fica até a pressão aumentar.',
      'Lá dentro ele se cura 1d3, ou 2d3 se o talismã estiver cheio.',
      'Nenhum Pecado pode ser executado fora do palácio. A luta que encerra a caçada é lá dentro, onde ele não tem para onde correr.',
      'O Prego de Abel puxa um Pecado para dentro do palácio quando o esquadrão já está lá e ele não.',
    ],
  },
  {
    titulo: 'Talismã de execução',
    texto: 'O estado físico do Pecado e, ao mesmo tempo, o cardápio do que ele faz numa cena de conflito. O Pecado não tem ação própria: ele reage, usando como dado de reação o dado de risco rolado pelo adversário.',
    itens: [
      'Ataques — dano direto, por parâmetro simples: risco 1 custa 5 cortes de estresse, 2–3 custam 3, 4+ custam 2. O estresse pode ser dividido entre os alvos no alcance.',
      'Complicações — o campo de batalha piora: chão em chamas, fumaça que sufoca, carapaça que absorve um corte. Até três por cena de conflito, sempre específicas e nunca válidas o tempo todo.',
      'Ameaças — ele promete algo pior que uma reação: matar um civil, corromper um NPC, derrubar um prédio. Promete antes, e cumpre se ninguém impedir.',
      'Ataques severos — raros e muito mais fortes: mais dano, condições, às vezes ferimento direto. A quantidade de talismãs que custam sai do dado de reação: 5–6 valem 2, 2–4 valem 4, 1 vale 6.',
    ],
  },
  {
    titulo: 'Traumas',
    texto: 'As circunstâncias trágicas do nascimento do Pecado, guardadas como três perguntas. Descobri-las na investigação enfraquece o Pecado de verdade — cada resposta pode ser usada uma vez para resolver um problema e reduzir o dano. As respostas têm que estar ao alcance da investigação, em pessoas, lugares ou eventos da área.',
    itens: [
      'Como ele se comunica?',
      'Qual é a relação dele com o hospedeiro?',
      'Do que ele gosta ou faz questão de experimentar?',
      'O que ele evita, detesta, ou o que o enfurece se mencionado?',
      'Como ele trata os exorcistas: incômodo, inimigo, ou com pena?',
    ],
  },
  {
    titulo: 'Aflições e vestígios',
    texto: 'Cada Pecado tem aflições próprias que sabe infligir — efeitos contínuos que ficam até o debrief. Vestígios são monstros menores, produto da manifestação do Pecado maior, que infestam a área. Eles também não têm ação própria: numa rodada, podem fazer uma reação gratuita depois que um jogador age, rolando o próprio dado de reação. Mas o Admin escolhe um ou outro — ou o Pecado reage, ou os vestígios.',
  },
  {
    titulo: 'Pressão',
    texto: 'O oposto da tensão. A tensão é o relógio do Admin; a pressão é a situação apodrecendo de um jeito que é próprio daquele Pecado. É ela que obriga o esquadrão a decidir entre investigar mais e agir agora.',
  },
]);

export const TIPOS_DE_PECADO = Object.freeze([
  {
    numeral: 'I',
    nome: 'Ogro',
    chamada: 'Enormes, disformes, terrivelmente poderosos.',
    cor: '#6F5A3E',
    nasce: 'Do desespero. Costuma brotar em quem carrega uma aversão profunda e sem saída.',
    comoAge: 'É o Pecado colossal. Não se esconde: ocupa. Invoca um miasma sufocante que envolve e abafa a área inteira, e luta de dentro dele, onde enxerga melhor que o esquadrão.',
    aMesaSente: 'Uma caçada de Ogro é claustrofóbica. O perigo não é a surpresa — é que o lugar inteiro virou dele, e cada minuto lá dentro custa alguma coisa.',
  },
  {
    numeral: 'II',
    nome: 'Ídolo',
    chamada: 'Serenos e encantadores, de beleza sobrenatural.',
    cor: '#A98045',
    nasce: 'Do desejo de ser visto e adorado.',
    comoAge: 'Não enfrenta: convence. Manipula e comanda dos bastidores, e junta um culto ao redor de si. Quando o esquadrão chega, metade da área já trabalha para ele sem saber.',
    aMesaSente: 'A investigação é a luta. Quase todo mundo com quem se fala é uma peça dele, e bater em alguém errado custa mais do que não bater.',
  },
  {
    numeral: 'III',
    nome: 'Cão',
    chamada: 'Ferozes e violentos, selvagens extremamente perigosos.',
    cor: '#8E1F2B',
    nasce: 'Da fúria. Quase sempre se manifesta depois da morte do hospedeiro.',
    comoAge: 'É rancor com corpo. Guarda ódio por um grupo específico de pessoas e caça esse grupo com violência, sem interesse por mais nada.',
    aMesaSente: 'É a caçada mais direta e a mais rápida. O relógio não é o Pecado se fortalecendo: é a lista de quem ele ainda vai alcançar.',
  },
  {
    numeral: 'IV',
    nome: 'Centopeia',
    chamada: 'Reputação pútrida; evitados sempre que possível.',
    cor: '#5B6E3A',
    nasce: 'Do ódio e da fuga da realidade.',
    comoAge: 'Infecta. É temido porque transforma hordas de gente comum, e o número cresce enquanto o esquadrão decide o que fazer. Até a CAIN evita essas caçadas quando pode.',
    aMesaSente: 'Horror de contágio. Cada pessoa salva tarde demais vira mais uma coisa no caminho, e a dúvida é sempre entre conter e avançar.',
  },
  {
    numeral: 'V',
    nome: 'Sapo',
    chamada: 'Astutos e gananciosos, com um padrão de comportamento próprio.',
    cor: '#4F7A6E',
    nasce: 'Da cobiça — do que o hospedeiro quis a vida inteira e nunca teve.',
    comoAge: 'É excepcionalmente inteligente e se deleita com riqueza material. Rouba sem parar para montar um tesouro enorme, e segue um padrão de comportamento que se pode aprender e explorar.',
    aMesaSente: 'É a caçada de xadrez. Ele negocia, arma, troca. Quem estuda o padrão ganha uma vantagem real; quem subestima a inteligência dele paga caro.',
  },
  {
    numeral: 'VI',
    nome: 'Lorde',
    chamada: 'Justos e moralistas, movidos por um senso irracional de ordem.',
    cor: '#6B4B8A',
    nasce: 'De uma calamidade ou tragédia sofrida pelo hospedeiro.',
    comoAge: 'Apela à saudade e à perda. Devolve ao hospedeiro a antiga glória e constrói em volta um reino — uma realidade paralela parasitária que vai consumindo o mundo real enquanto dura.',
    aMesaSente: 'É a caçada mais triste. O que se está destruindo é a única coisa que fez alguém feliz de novo, e o reino cresce enquanto a mesa hesita.',
  },
]);

export const OUTROS_OPONENTES = Object.freeze([
  { nome: 'Imagos', resumo: 'Pecados nascentes formados por um exorcista que verteu. Quem verte e escolhe lutar força uma cena contra um Imago.' },
  { nome: 'Vestígios', resumo: 'Monstros menores, produto da manifestação de um Pecado maior. Infestam a área depois que ele aparece.' },
  { nome: 'Vinculadores', resumo: 'Humanos ou exorcistas que aprenderam a comandar um Pecado. Pela doutrina da CAIN, execução sumária.' },
  { nome: 'Oponentes mundanos', resumo: 'Polícia, seguranças, militares. Não são sobrenaturais — e, justamente por isso, as armas de serviço funcionam contra eles.' },
]);
