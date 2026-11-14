export const SHEET_COLORS={fogo:'#1EC8FF',escarlate:'#E8193C',corvos:'#E8A020',magos:'#A855F7',marfim:'#4ADE80',necromante:'#6E6E80',bardo:'#FFD86B',arcanjo:'#5B2C8C',personalizado:'#C0C0C0'};
export const SHEET_GLOWS={fogo:'rgba(30,200,255,0.16)',escarlate:'rgba(232,25,60,0.16)',corvos:'rgba(232,160,32,0.16)',magos:'rgba(168,85,247,0.16)',marfim:'rgba(74,222,128,0.16)',necromante:'rgba(110,110,128,0.18)',bardo:'rgba(255,216,107,0.18)',arcanjo:'rgba(91,44,140,0.2)',personalizado:'rgba(192,192,192,0.16)'};
export const MASTER_PIN='b1e87e31fe1147efac5412f9fc1c744753aa903395d57e51033b31d9223a61b1';async function hashAccessPin(value){const bytes=new TextEncoder().encode(String(value||'').trim().toLowerCase());const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('')}

// ─── 🌦️ ATMOSPHERE SYSTEM ────────────────────────────────────────────────────
export const ATMOSPHERES= {
  neutro:    { label: 'Neutro',      icon: '🌌', accent: '#8B5CF6', bg: 'radial-gradient(circle at 50% -18%,#0B0217 0%,#030008 42%,#010004 100%)', starColor: '#6D28D9' },
  combate:   { label: 'Combate',     icon: '⚔️', accent: '#B91C8C', bg: 'radial-gradient(circle at 50% -18%,#120218 0%,#040008 44%,#010004 100%)', starColor: '#86198F' },
  misterio:  { label: 'Mistério',    icon: '🌫️', accent: '#7C3AED', bg: 'radial-gradient(circle at 50% -18%,#09031A 0%,#020008 44%,#010004 100%)', starColor: '#5B21B6' },
  exploracao:{ label: 'Exploração',  icon: '🌿', accent: '#6D28D9', bg: 'radial-gradient(circle at 50% -18%,#050A16 0%,#020008 44%,#010004 100%)', starColor: '#4C1D95' },
  descanso:  { label: 'Descanso',    icon: '🌙', accent: '#7E22CE', bg: 'radial-gradient(circle at 50% -18%,#0C0418 0%,#030008 44%,#010004 100%)', starColor: '#581C87' },
  tensao:    { label: 'Tensão',      icon: '⚡', accent: '#A21CAF', bg: 'radial-gradient(circle at 50% -18%,#140219 0%,#040007 44%,#010004 100%)', starColor: '#701A75' },
};

export const STATUS_LIST= [
  { id: 'envenenado',  label: 'Envenenado',   icon: '☠',  color: '#4ADE80' },
  { id: 'sangrando',   label: 'Sangrando',    icon: '🩸', color: '#E8193C' },
  { id: 'atordoado',   label: 'Atordoado',    icon: '💫', color: '#E8A020' },
  { id: 'queimando',   label: 'Queimando',    icon: '🔥', color: '#FF6B35' },
  { id: 'congelado',   label: 'Congelado',    icon: '✦',  color: '#1EC8FF' },
  { id: 'amaldicado',  label: 'Amaldicado',   icon: '💀', color: '#A855F7' },
  { id: 'invisivel',   label: 'Invisivel',    icon: '👻', color: '#C8B8A0' },
  { id: 'protegido',   label: 'Protegido',    icon: '🛡', color: '#4ADE80' },
];

export const CLASSES=[
  {
    "id": "personalizado",
    "alcance": "\u2014",
    "name": "Personalizado",
    "icon": "\u2699\ufe0f",
    "color": "#C0C0C0",
    "glow": "rgba(192,192,192,0.16)",
    "role": "Classe Personalizada \u00b7 Definida pelo Mestre",
    "lore": "Esta ficha possui uma classe personalizada, criada exclusivamente pelo Mestre para este personagem. Suas habilidades, origem e poderes s\u00e3o \u00fanicos e revelados ao longo da campanha.",
    "passive": {
      "name": "\u2014",
      "desc": "Habilidades definidas pelo Mestre."
    },
    "normal": [],
    "specials": []
  },
  {
    "id": "fogo",
    "alcance": "1m",
    "name": "Assassinos do Fogo Azul",
    "icon": "\ud83d\udd25",
    "color": "#1EC8FF",
    "glow": "rgba(30,200,255,0.16)",
    "role": "Assassino \u00b7 DPS Furtivo",
    "lore": "Nos antigos e brutais campos de batalha, onde a morte era constante, alguns guerreiros descobriram como sobreviver canalizando a energia vital que emanava dos corpos ca\u00eddos. Eles absorviam n\u00e3o apenas a vida esva\u00edda, mas a pura vontade de lutar e a f\u00faria dos mortos. Esta energia manifestou-se como uma chama azul incandescente que queima dentro deles, fortalecendo m\u00fasculos e reflexos a n\u00edveis sobre-humanos, permitindo-lhes mover-se com velocidade letal e desferir ataques devastadores antes mesmo de serem notados.",
    "passive": {
      "name": "Energia Vital",
      "desc": "A cada 3 rodadas ganha 2 pontos para incluir em quaisquer b\u00f4nus de a\u00e7\u00e3o. +1 ponto armazenado por inimigo abatido (acumulativo), podendo ser usado a qualquer momento."
    },
    "normal": [
      {
        "name": "Esquiva da Catedral",
        "cost": 2,
        "cooldown": "4 rodadas",
        "desc": "Esquiva de qualquer ataque ficando transl\u00facido e completamente intang\u00edvel, mesmo fora do seu turno. N\u00e3o pode ser usada novamente por 4 rodadas."
      },
      {
        "name": "Golpe Cintilante",
        "cost": 2,
        "cooldown": "3 rodadas",
        "dano": "1D8 + AGI",
        "desc": "Embui um objeto com chamas de plasma e efetua uma estocada veloz que atravessa o alvo, fazendo-o sangrar (caso n\u00e3o tenha um objeto, usa suas proprias m\u00e3os): \u22122 de vida por rodada por 3 rodadas consecutivas."
      },
      {
        "name": "Over Hit",
        "cost": 2,
        "cooldown": "3 rodadas",
        "desc": "+3 em quaisquer atributos por 2 rodadas. Sua proxima utiliza\u00e7\u00e3o apenas pode ser utilizada em um atributo diferente do anterior at\u00e9 o final do combate."
      }
    ],
    "specials": [
      {
        "name": "Olho da Mente",
        "cost": 3,
        "cooldown": "4 rodadas",
        "desc": "V\u00ea os pontos fracos do oponente por membros do corpo, causando 2\u00d7 o dano em uma parte espec\u00edfica escolhida (acertos na cabe\u00e7a s\u00f3 acertam caso a precis\u00e3o seja de 18-20, causando 3x o dano).",
        "req": 3
      },
      {
        "name": "F\u00faria Flamejante",
        "cost": 3,
        "cooldown": "5 rodadas",
        "desc": "Envolve-se em chamas azuis: +1 alcance, +3 dano e precis\u00e3o, +3 dano em \u00e1rea/rodada. Ao inicio da 3\u00b0 rodada que estivar com a habilidade ativa concecutivamente, fazendo com que seu corpo fique com o calor muito elevado o usu\u00e1rio superaquece, desativando a habilidade.",
        "req": 7
      }
    ]
  },
  {
    "id": "escarlate",
    "alcance": "1m",
    "name": "Cavaleiros Escarlate",
    "icon": "\ud83d\udee1\ufe0f",
    "color": "#E8193C",
    "glow": "rgba(232,25,60,0.16)",
    "role": "Tanque \u00b7 Protetor",
    "lore": "A sua linhagem remonta a eras esquecidas, a povos que realizavam trabalhos bra\u00e7ais extremos nas profundezas da terra. Durante escava\u00e7\u00f5es, descobriram um min\u00e9rio enigm\u00e1tico: um rubi de cor escarlate incrivelmente denso. A exposi\u00e7\u00e3o cont\u00ednua e o suor derramado sobre o rubi criaram uma osmose biol\u00f3gica e m\u00e1gica. O mineral fundiu-se com a gen\u00e9tica destes trabalhadores, fazendo com que a sua pr\u00f3pria pele se tornasse espessa, r\u00edgida e quase t\u00e3o impenetr\u00e1vel quanto a rocha que outrora mineravam.",
    "passive": {
      "name": "Pele de Rubi",
      "desc": "Quando sem o escudo escarlate, a pele endurece. Ganha atributos b\u00f4nus de defesa de acordo com a quantidade de inimigos ao redor (+1 de defesa por inimigo)."
    },
    "normal": [
      {
        "name": "Reflexo Escarlate",
        "cost": 2,
        "cooldown": "3 rodadas",
        "desc": "Se posiciona em frente a um ataque de disparo e reflete 0,5\u00d7 o dano recebido utilizando um escudo."
      },
      {
        "name": "Lan\u00e7a Defensiva",
        "cost": 2,
        "cooldown": "1 rodada",
        "dano": "1D6 + FOR",
        "desc": "Arremessa o escudo no inimigo. Com resultado D18\u201320, pode atingir m\u00faltiplos inimigos. O escudo retorna \u00e0 m\u00e3o automaticamente."
      },
      {
        "name": "Investida \u00c1gil",
        "cost": 2,
        "cooldown": "2 rodadas",
        "dano": "+4 de dano",
        "desc": "Troca resist\u00eancia por velocidade: voc\u00ea avan\u00e7a at\u00e9 3 passos em 1 a\u00e7\u00e3o. O peso da investida garante +4 de dano no seu ataque durante este avan\u00e7o. O esfor\u00e7o extremo desestabiliza sua base: voc\u00ea sofre -3 de Defesa por 3 rodadas imediatamente ap\u00f3s o uso."
      }
    ],
    "specials": [
      {
        "name": "Provoca\u00e7\u00e3o Extrema",
        "cost": 3,
        "cooldown": "4 rodadas",
        "desc": "Todos os inimigos ao redor focam em voc\u00ea na proxima rodada. Todo dano recebido \u00e9 reduzido em 50% enquanto o efeito durar (2 rodadas).",
        "req": 3
      },
      {
        "name": "Modo Berserker",
        "cost": 3,
        "cooldown": "4 rodadas",
        "dano": "+3 de FOR + DUR",
        "desc": "Troca resist\u00eancia por dano e for\u00e7a massivos. Ao usar, perde 3 de Durabilidade (DUR), equivalente a menos 6 pontos de vida temporariamente, por 2 rodadas. Fica impar\u00e1vel \u2014 mas exausto, gastando mais 1VC para realizar a\u00e7\u00f5es na pr\u00f3xima rodada.",
        "req": 7
      }
    ]
  },
  {
    "id": "corvos",
    "alcance": "5m",
    "name": "Corvos do Horizonte",
    "icon": "\ud83d\udc26\u200d\u2b1b",
    "color": "#E8A020",
    "glow": "rgba(232,160,32,0.16)",
    "role": "Atirador \u00b7 Precis\u00e3o Absoluta",
    "lore": "Os primeiros ca\u00e7adores desta linhagem desenvolveram uma liga\u00e7\u00e3o espiritual e simbi\u00f3tica com as aves de rapina, especialmente os grandes corvos e gavi\u00f5es. Esta conex\u00e3o transcendeu a amizade, alterando os pr\u00f3prios sentidos destes ca\u00e7adores. A sua vis\u00e3o tornou-se microsc\u00f3pica e letal, calculando ventos, dist\u00e2ncias e trajet\u00f3rias instintivamente. Este dom gen\u00e9tico foi passado de gera\u00e7\u00e3o em gera\u00e7\u00e3o, garantindo uma precis\u00e3o de quase 100% com machados, flechas ou armas de fogo.",
    "passive": {
      "name": "Vis\u00e3o do Gavi\u00e3o",
      "desc": "Nunca sofre penalidade por dist\u00e2ncia. Ataques \u00e0 longa dist\u00e2ncia ganham +2 no dado de precis\u00e3o automaticamente. Al\u00e9m disso, a cada 2 ataques, seu pr\u00f3ximo ter\u00e1 um acerto garantido."
    },
    "normal": [
      {
        "name": "Coragem Robusta",
        "cost": 2,
        "cooldown": "2 rodadas",
        "dano": "Disputa: 1D20 + PER",
        "desc": "O Corvo do Horizonte encara um inimigo com tamanha ast\u00facia e ferocidade que a aura colossal de um grande urso se projeta atr\u00e1s de seu corpo. O usu\u00e1rio e o alvo realizam uma disputa de 1D20 + Percep\u00e7\u00e3o. Se o Corvo obtiver o maior resultado, o inimigo fica profundamente intimidado por 2 rodadas completas e sofre \u22125 de Precis\u00e3o em todos os ataques realizados contra o usu\u00e1rio. Em caso de empate ou vit\u00f3ria do alvo, ele resiste \u00e0 presen\u00e7a amea\u00e7adora e n\u00e3o sofre o efeito."
      },
      {
        "name": "Saque R\u00e1pido",
        "cost": 2,
        "cooldown": "2 rodadas",
        "desc": "Realiza um ataque a qualquer momento, mesmo fora do turno. Precis\u00e3o reduzida em 3 pontos neste disparo."
      },
      {
        "name": "Foco Absoluto",
        "cost": 2,
        "cooldown": "2 rodadas",
        "desc": "Fica 1 rodada inteira sem atacar, apenas focando em um alvo. Garante acerto cr\u00edtico autom\u00e1tico na pr\u00f3xima rodada caso acerte."
      }
    ],
    "specials": [
      {
        "name": "Precis\u00e3o Celestial",
        "cost": 3,
        "cooldown": "4 rodadas",
        "desc": "Disparo cr\u00edtico perfurante no primeiro alvo e nos demais que estejam na mesma trajet\u00f3ria. Soma o b\u00f4nus de PER ao dano do disparo. O(s) inimigo(s) atingido(s) perde \u22122 de vida por rodada pelos 3 turnos seguintes.",
        "req": 3,
        "dano": "Dano do disparo + PER"
      },
      {
        "name": "Chuva Mortal",
        "cost": 3,
        "cooldown": "5 rodadas",
        "dano": "3D8 + INT",
        "desc": "Canaliza calmamente sua arma atual com uma precis\u00e3o fora do comum, disparando m\u00faltiplos acertos simult\u00e2neos em uma \u00e1rea de 10\u201313 metros ao redor. Soma o b\u00f4nus de INT ao dano. N\u00e3o atinge aliados.",
        "req": 7
      }
    ]
  },
  {
    "id": "magos",
    "alcance": "5m",
    "name": "Magos do Pr\u00f3logo do C\u00e9u",
    "icon": "\u2604\ufe0f",
    "color": "#A855F7",
    "glow": "rgba(168,85,247,0.16)",
    "role": "Vidente \u00b7 Mago C\u00f3smico",
    "lore": "Outrora humanos comuns, o seu destino mudou quando uma pena celestial caiu dos c\u00e9us. O primeiro a toc\u00e1-la teve a sua mente expandida al\u00e9m da compreens\u00e3o mortal, despertando o dom absoluto da clarivid\u00eancia. Ele n\u00e3o controlava o tempo, mas conseguia observ\u00e1-lo. Ao ver os fragmentos do futuro da humanidade, fundou esta ordem m\u00e1gica e escreveu as suas vis\u00f5es no lend\u00e1rio Livro da Mand\u00edbula. Transmitem o conhecimento c\u00f3smico atrav\u00e9s de diagramas sagrados, c\u00e2nticos e uma profunda liga\u00e7\u00e3o com as anomalias do universo.",
    "passive": {
      "name": "Vis\u00e3o Prof\u00e9tica",
      "desc": "Podem ver brevemente acontecimentos futuros ou preverem eventos por pistas do cen\u00e1rio, concedendo pontos b\u00f4nus de combate ao grupo (+2 no atributo escolhido at\u00e9 o final do combate)."
    },
    "normal": [
      {
        "name": "Fortitude \u00cdgnia",
        "cost": 2,
        "cooldown": "1\u00d7 por combate",
        "desc": "Um personagem aliado recebe +3 + SOR de defesa por 2 rodadas. SOR corresponde ao b\u00f4nus de Sorte do mago. 1 uso por combate por jogador.",
        "dano": "+3 + SOR de defesa"
      },
      {
        "name": "Fluxo de Magia",
        "cost": 2,
        "cooldown": "4 rodadas",
        "desc": "Distribui parte da sua magia entre aliados em at\u00e9 2m ao redor, aumentando o dano deles em +2 + INT por 4 rodadas. INT corresponde ao b\u00f4nus de Intelig\u00eancia do mago.",
        "dano": "+2 + INT de dano"
      },
      {
        "name": "Telecinese",
        "cost": 2,
        "cooldown": "vari\u00e1vel",
        "dano": "1D4|1D6|1D8|1D12|1D20 + INT",
        "desc": "Controla objetos ao redor e os arremessa contra inimigos. Tempo varia conforme o objeto. Pessoas s\u00f3 com consentimento."
      }
    ],
    "specials": [
      {
        "name": "Recupera\u00e7\u00e3o Divina",
        "cost": 3,
        "cooldown": "7 rodadas",
        "desc": "Remove todos os efeitos negativos de todos os aliados e cura em +8 pontos de vida.",
        "req": 3
      },
      {
        "name": "Flecha do \u00daltimo Guardi\u00e3o",
        "cost": 3,
        "cooldown": "5 rodadas",
        "dano": "2D12 + INT",
        "desc": "Invoca um arco gigante que dispara uma flecha com atributos de qualquer elemento escolhido, causando dano massivo em \u00e1rea (1d12).",
        "req": 7
      }
    ]
  },
  {
    "id": "marfim",
    "alcance": "1m",
    "name": "Cientistas de Marfim",
    "icon": "\ud83e\uddea",
    "color": "#4ADE80",
    "glow": "rgba(212,197,169,0.16)",
    "role": "Inventor \u00b7 G\u00eanio Adapt\u00e1vel",
    "lore": "A origem desta linhagem come\u00e7ou com o primeiro grande alquimista da hist\u00f3ria. Atrav\u00e9s de anos de experimenta\u00e7\u00e3o, ele sintetizou a \"Pedra de Marfim\" \u2014 o que as lendas chamam de Pedra Filosofal. Este objeto concedeu-lhe o conhecimento absoluto sobre f\u00edsica, qu\u00edmica e tudo ainda por descobrir. Esta ilumina\u00e7\u00e3o alterou o seu DNA. Todos os descendentes nascem com QI astron\u00f4mico \u2014 um deles foi Nikola Tesla \u2014 criando maravilhas tecnol\u00f3gicas com sucata e compostos simples.",
    "passive": {
      "name": "Percep\u00e7\u00e3o Elevada",
      "desc": "Tem percep\u00e7\u00e3o acima do comum: pode revelar objetos escondidos no cen\u00e1rio e seus itens s\u00e3o utilizados das formas mais eficazes possiveis, ganhando +1 em qualquer atributo."
    },
    "normal": [
      {
        "name": "Material de Pesquisa",
        "cost": 2,
        "cooldown": "2 rodadas",
        "desc": "Sempre carregado. Permite juntar 2 a 3 itens do cen\u00e1rio e combin\u00e1-los em um novo item."
      },
      {
        "name": "Seringa da Juventude",
        "cost": 2,
        "cooldown": "3 rodadas",
        "desc": "Aplica uma seringa que cura 2 + INT de vida ao alvo, concede +2 Vigor C\u00f3smico e reduz o tempo de recarga de uma das suas habilidades em 2 rodadas. Caso o Cientista use a seringa em si mesmo, cura 3 + INT de vida, ganha 3 Vigor C\u00f3smico e reduz o tempo de recarga de uma de suas habilidades em 3 rodadas, exceto \"Seringa da Juventude\". INT corresponde ao b\u00f4nus de Intelig\u00eancia do Cientista.",
        "dano": "Cura: 2 + INT (alvo) / 3 + INT (em si)"
      },
      {
        "name": "QI Distorcido",
        "cost": 2,
        "cooldown": "1\u00d7 por arma",
        "desc": "Melhora qualquer arma concedendo mais alcance, dano ou precis\u00e3o. 1 uso por arma por combate."
      }
    ],
    "specials": [
      {
        "name": "O 1\u00b0 Alquimista",
        "cost": 3,
        "cooldown": "4 rodadas",
        "dano": "1D6 + SOR",
        "desc": "Combina 4 a 5 itens criando algo novo e poderoso. Pode tamb\u00e9m disparar 1 tiro de tesla caso tenha algum objeto met\u00e1lico ou condutor de energia, atordoando o alvo por 1 rodada. O dano recebe o b\u00f4nus de SOR.",
        "req": 3
      },
      {
        "name": "Anti-Mat\u00e9ria",
        "cost": 3,
        "cooldown": "6 rodadas",
        "dano": "2D10 + INT",
        "desc": "Transcende, invocando 1mg de antimat\u00e9ria: dano cr\u00edtico garantido + efeitos negativos (lentid\u00e3o, tontura, lepra degenerativa - demora 4 rounds para a lepra fazer efeito, degenerando uma parte do corpo do oponente).",
        "req": 7
      }
    ]
  },
  {
    "id": "necromante",
    "alcance": "2m",
    "name": "Necromantes das Cinzas Eternas",
    "icon": "\ud83d\udc80",
    "color": "#6E6E80",
    "glow": "rgba(110,110,128,0.18)",
    "role": "Necromante \u00b7 Controlador Sombrio",
    "lore": "Nascidos \u00e0 sombra de campos de batalha esquecidos, os Necromantes aprenderam a ouvir o sil\u00eancio que resta ap\u00f3s a morte. N\u00e3o dominam a vida \u2014 dominam o que fica depois dela. Cada osso, cada \u00faltima respira\u00e7\u00e3o, cada eco de dor guardado num campo de batalha \u00e9, para eles, uma ferramenta. Dizem que o primeiro Necromante n\u00e3o escolheu seu dom: ele apenas parou de temer os mortos, e os mortos, em troca, pararam de tem\u00ea-lo.",
    "passive": {
      "name": "Passos dos que j\u00e1 Se Foram",
      "desc": "Sempre que anda ou se movimenta, o Necromante n\u00e3o faz nenhum barulho \u2014 uma n\u00e9voa negra envolve a sola de seus p\u00e9s, amortecendo sempre sua passada."
    },
    "normal": [
      {
        "name": "Metamorfose Negra",
        "cost": 2,
        "cooldown": "3 rodadas",
        "dano": "+1 de dano na arma + INT",
        "desc": "Imbui magia negra em uma arma, parte do corpo ou objeto, acrescentando +1 de dano ao ataque e escalando com Intelig\u00eancia. Ao causar dano, cura todo o dano causado, podendo direcionar a cura para si mesmo ou para outra pessoa. Caso o inimigo esteja sangrando no local atingido, o valor da cura \u00e9 dobrado."
      },
      {
        "name": "Animar os Mortos",
        "cost": 2,
        "cooldown": "4 rodadas",
        "desc": "Conjura monstros ou seres de amea\u00e7a baixa ou m\u00e9dia que foram mortos por ele, ou que morreram naquele local, para se juntarem \u00e0 batalha ao seu lado \u2014 por\u00e9m com sua energia (vida e atributos) reduzida pela metade."
      },
      {
        "name": "Corte do Sil\u00eancio",
        "cost": 2,
        "cooldown": "2 rodadas",
        "dano": "2 de dano por rodada + SOR",
        "desc": "O primeiro corte certeiro marca um local espec\u00edfico do corpo do inimigo com uma runa negra. O alvo sofre 2 de dano por rodada + SOR durante 2 rodadas. Se acertar novamente o mesmo local marcado com Corte do Sil\u00eancio, o membro atingido fica inutilizado por 2 rodadas; se o local marcado for uma regi\u00e3o cr\u00edtica, o alvo fica atordoado (stun) por 2 rodadas. O primeiro acerto apenas marca e aplica o dano cont\u00ednuo, sem inutilizar o membro nem atordoar."
      }
    ],
    "specials": [
      {
        "name": "Grito das Lamenta\u00e7\u00f5es",
        "cost": 3,
        "cooldown": "5 rodadas",
        "dano": "2D8 + INT",
        "desc": "Invoca as almas dos que foram mortos naquele local, criando gritos avassaladores que causam 2D8 de dano, escalando com Intelig\u00eancia, em todos os alvos atingidos e deixando-os com \u22123 de precis\u00e3o por 2 rodadas.",
        "req": 3
      },
      {
        "name": "Invoca\u00e7\u00e3o dos Lordes",
        "cost": 3,
        "cooldown": "6 rodadas",
        "desc": "Conjura um inimigo de classe alta, ainda com metade da vida, para lutar ao seu lado. Se o Necromante rolar 1D20 e tirar 17 ou mais (escalando com sua Intelig\u00eancia), ganha uma segunda invoca\u00e7\u00e3o gratuita de classe m\u00e9dia.",
        "req": 7
      }
    ]
  },
  {
    "id": "bardo",
    "alcance": "4m",
    "name": "Bardos da Luz",
    "icon": "\ud83c\udfb6",
    "color": "#FFD86B",
    "glow": "rgba(255,216,107,0.18)",
    "role": "Bardo \u00b7 Suporte Encantador",
    "lore": "No passado, estes bardos aprenderam a extrair a vontade e o poder m\u00e1gico guardados em can\u00e7\u00f5es antigas, canalizando-os em magias poderosas \u2014 feitas, acima de tudo, para erguer seus companheiros. N\u00e3o costumavam ser os mais fortes em combate direto, e sim os que mantinham o grupo de p\u00e9, de corpo e de esp\u00edrito. Alegres por natureza, tornaram-se indispens\u00e1veis em qualquer jornada: onde a esperan\u00e7a faltava, uma can\u00e7\u00e3o deles sempre encontrava um jeito de acender de novo.",
    "passive": {
      "name": "Can\u00e7\u00e3o que Cura",
      "desc": "A cada rodada, caso cante uma frase em voz alta, cura um aliado escolhido em 2 pontos de vida."
    },
    "normal": [
      {
        "name": "Inspira\u00e7\u00e3o B\u00e1rdica",
        "cost": 2,
        "cooldown": "2 rodadas",
        "dano": "+2 a +5 (b\u00f4nus)",
        "desc": "O Bardo usa uma palavra inspiradora \u2014 que deve ser dita em voz alta no momento do uso \u2014 para conceder um b\u00f4nus de +2, +3, +4 ou +5 a um aliado, escolhido entre Dano, Precis\u00e3o ou Intelig\u00eancia."
      },
      {
        "name": "Charme Natural",
        "cost": 2,
        "cooldown": "3 rodadas",
        "dano": "1D20 + SOR",
        "desc": "Encanta um NPC, fazendo com que ele aja a favor do que o Bardo deseja com mais facilidade. Role 2D20 \u2014 \u00e9 preciso tirar 12 ou mais em ao menos um dos dados."
      },
      {
        "name": "Palavras Cortantes",
        "cost": 2,
        "cooldown": "2 rodadas",
        "dano": "2D4 + SOR",
        "desc": "Causa 2D4 de dano, somado ao b\u00f4nus de Sorte do Bardo."
      }
    ],
    "specials": [
      {
        "name": "Contra-Can\u00e7\u00e3o",
        "cost": 3,
        "cooldown": "4 rodadas",
        "desc": "Devolve por completo um ataque ou dano que um inimigo tenha causado. Pode ser usado a qualquer momento, mesmo fora do pr\u00f3prio turno, desde que haja Vigor C\u00f3smico dispon\u00edvel \u2014 inclusive redirecionando danos causados a um aliado no momento.",
        "req": 3
      },
      {
        "name": "Double Chance",
        "cost": 3,
        "cooldown": "3 rodadas",
        "desc": "Caso erre um ataque ou tire um resultado baixo no dado de dano, rola mais dois dados extras e usa sempre o maior resultado entre eles. Pode ser usado para si mesmo ou para um aliado, no momento da a\u00e7\u00e3o dele.",
        "req": 7
      }
    ]
  },
  {
    "id": "arcanjo",
    "alcance": "3m",
    "name": "Arcanjos da Escurid\u00e3o",
    "icon": "\ud83e\udebd",
    "color": "#5B2C8C",
    "glow": "rgba(91,44,140,0.2)",
    "role": "Arcanjo Ca\u00eddo \u00b7 Guerreiro Alado",
    "lore": "Certo dia, uma pena celestial caiu dos c\u00e9us \u2014 mas n\u00e3o era uma pena comum. Era negra, como de um anjo ca\u00eddo ou de uma criatura desconhecida pelos homens. Ao entrar em contato com uma crian\u00e7a pequena, fez com ela uma simbiose quase instant\u00e2nea: asas transparentes e negras come\u00e7aram a brotar de seu corpo. A partir da\u00ed, ela passou a voar pelos c\u00e9us, provocando ventanias absurdas \u2014 fen\u00f4menos que os homens daquela \u00e9poca confundiram com desastres naturais, e que muitos passaram a temer, e venerar, como sinal de uma divindade.",
    "passive": {
      "name": "Asas do Vazio",
      "desc": "Pode conjurar asas negras e transl\u00facidas que permitem voar at\u00e9 7 metros de dist\u00e2ncia por 6 segundos. Ap\u00f3s conjuradas, n\u00e3o podem ser invocadas novamente por 1 minuto."
    },
    "normal": [
      {
        "name": "Lan\u00e7as da Dor",
        "cost": 2,
        "cooldown": "2 rodadas",
        "dano": "1D6 + FOR",
        "desc": "Lan\u00e7a penas negras que cravam no corpo do alvo, causando dano e deixando penas encravadas no local atingido. Caso acerte um segundo ataque no mesmo local, causara +4 de dano extra, e deixar\u00e1 o alvo amaldi\u00e7oado (condi\u00e7\u00e3o para acertar novamente \u00e9 narrativamente estar a queima roupa, o inimigo estar atortoado ou caso tire um 17 em 1D20 puro)."
      },
      {
        "name": "Ventos do Livro",
        "cost": 2,
        "cooldown": "3 rodadas",
        "dano": "1D8 + FOR",
        "desc": "Cria uma rajada de vento com as asas, que empurra e desestabiliza os inimigos atingidos, deixando-os com \u22122 de Precis\u00e3o na rodada seguinte."
      },
      {
        "name": "Correntes do Sil\u00eancio",
        "cost": 2,
        "cooldown": "2 rodadas",
        "dano": "2D4 + INT",
        "desc": "Prende correntes invis\u00edveis em um aliado ou inimigo, podendo pux\u00e1-lo at\u00e9 si ou se puxar at\u00e9 ele, dependendo do teste de For\u00e7a realizado. Causa um pequeno dano no processo."
      }
    ],
    "specials": [
      {
        "name": "Rasante dos Deuses",
        "cost": 3,
        "cooldown": "4 rodadas",
        "dano": "2D8 + AGI",
        "desc": "Abre as asas e voa rapidamente por entre todos os inimigos em seu caminho, cortando cada um deles e se deslocando em at\u00e9 10 metros.",
        "req": 3
      },
      {
        "name": "Furac\u00e3o da Divindade",
        "cost": 3,
        "cooldown": "5 rodadas",
        "dano": "2D6 + AGI",
        "desc": "Cria um pequeno tornado brilhante que puxa tudo ao redor, reduzindo em 4 a Durabilidade do inimigo. Em um teste de 1D10, resultado 8, 9 ou 10 desarma o inimigo \u2014 exceto se ele estiver usando um artefato.",
        "req": 7
      }
    ]
  }
];

export const PROLOGUE=[{type:'intro',text:'No início, não existia nada.'},{type:'pause',text:'E do nada ele surgiu — quem o nomeou? Ele mesmo.'},{type:'title',text:'*$!6;^@$+6~=´} (JhonKenteiker)'},{type:'body',text:'Jhon viu diante de si um universo vasto, lindo, porém vazio. E assim decidiu criar o sistema solar, e dele o mundo mais belo — nomeando-o Cosmum, a Terra dos mortais.'},{type:'body',text:'Nisso, ele criou as primeiras criaturas: já fortes, ágeis, adaptáveis, sobreviventes em qualquer cenário. Os dinossauros. Porém viu que dar-lhes tantas vantagens foi um erro.'},{type:'highlight',text:'E nisso ele criou o primeiro conceito de Reinício.'},{type:'body',text:'Uma grande bola de fogo atingiu o planeta, criando eventos irreversíveis e mudanças eternas. Do silêncio das cinzas surgiram os primeiros seres. Eles evoluíram. E a partir disso, o ser humano surgiu — não tão forte quanto os dinossauros, porém com uma capacidade cognitiva incomparável.'},{type:'divider',text:'— — —'},{type:'body',text:'Mas Jhon pensa novamente em reciclar o mundo. Pois viu que, ao passar dos anos, nenhum avanço significativo ocorreu. Fazendo-o questionar: devo começar tudo de novo?'},{type:'warning',text:'E além disso... uma catástrofe se aproxima.'},{type:'body',text:'Ninguém sabe o que. Só sabe que está chegando. Pois o Livro da Mandíbula — como o calendário maia — a previa. Dizendo que quatro estrelas ficariam brilhantes sobre os céus, tanto de dia quanto de noite, e se aproximariam a cada dia.'},{type:'finale',text:'O objetivo dos personagens não é apenas sobreviver. É provar seu valor para continuarem existindo. É parar. É compreender. É decifrar a profecia antes que o Reinício seja decretado novamente — desta vez, para sempre.'}];
export const MILESTONES=[{year:'~400.000 AC',event:'Descoberta e controle do fogo',icon:'🔥'},{year:'~10.000 AC',event:'Revolução agrícola — os humanos se tornam sedentários',icon:'🌾'},{year:'~3.500 AC',event:'Surgimento das primeiras civilizações: Mesopotâmia e Egito',icon:'🏛️'},{year:'~3.000 AC',event:'Invenção da escrita cuneiforme',icon:'📜'},{year:'~500 AC',event:'Apogeu dos grandes impérios: Persa, Grego, Romano',icon:'⚔️'},{year:'Séc. XV',event:'Era das grandes navegações e descobrimento dos continentes',icon:'🌊'},{year:'Séc. XVIII',event:'Revolução Industrial — a máquina a vapor muda o mundo',icon:'⚙️'},{year:'1905',event:'Albert Einstein publica a Teoria da Relatividade',icon:'🧠'},{year:'1945',event:'Era Atômica — o poder de destruição da humanidade se torna real',icon:'☢️'},{year:'1969',event:'O primeiro ser humano pisa na Lua',icon:'🌕'},{year:'1990s',event:'Era digital — a internet conecta a humanidade globalmente',icon:'💻'},{year:'Séc. XXI',event:'Inteligência artificial: a humanidade cria inteligência',icon:'🤖'},{year:'AGORA',event:'Quatro estrelas aparecem nos céus de Cosmum. Elas se aproximam.',icon:'✦',prophecy:true}];
export const ENTITIES_DATA=[{id:'homem-agua',name:'Homem Água',icon:'💧',revealed:true,lore:`Era um homem comum chamado David, que vivia por volta de 1544, com seu amigo Billy Laranjais. Um dia como qualquer outro, uma lágrima celestial caiu dos céus — era de JhonKenteiker. Ninguém sabe o motivo daquela lágrima ter caído, mas ao entrar em contato com o corpo de David, tornou-o extremamente poderoso, expelindo água de seu corpo e a controlando de forma quase que divina.\n\nAo ver isso, Billy teve uma ideia, movido pela ganância. Ele atraiu seu amigo até um local, onde o prendeu e ficou drenando toda sua água, dia após dia. Com isso, Billy criou uma fortuna e o parque temático para esconder seu pecado — conhecido como "Thermas dos Laranjais".\n\nApós isso, a cada 200 a 300 anos o Homem Água não morre, mas reencarna sua essência em outro hospedeiro. Quando isso acontece, todos os Cavaleiros dos Laranjais — descendentes diretos de Billy — são acionados para capturar a criança assim que nasce, e colocá-la na prisão que um dia foi de David, para drenar sua água até que o ciclo comece outra vez.`,fisico:`Um ser formado completamente pela água mais pura já vista — transparente, límpida, quase luminosa. Seus olhos são os únicos traços aparentes: dois pontos visíveis dentro de uma forma humana inteiramente aquosa. Não possui cor, não possui sombra. Apenas água com vontade própria.`},{id:'cabecas-azuis',name:'Os Cabeças Azuis',icon:'🔵',revealed:true,lore:`No ano de 830 d.C., uma entidade senciente de vontade própria e poder imensurável despertou. Embora fosse poderosa, ela se sentia incompleta em sua solidão. Foi então que seduziu o primeiro humano — um homem cujo nome original foi apagado da história, restando apenas o "Chamado" que ressoa em sua mente.\n\nA entidade convenceu este primeiro hospedeiro de que a individualidade era um fardo e que pertencer a um único ser pensante, abrindo mão da própria dignidade e vontade, seria o maior prazer de uma vida. Ao longo dos séculos, mais e mais humanos foram abduzidos e assimilados.\n\nHoje, eles não são mais indivíduos, mas componentes de uma Mente Coletiva. Funcionam como um "software" biológico: cada novo humano assimilado serve como processamento e memória, fazendo com que a entidade cresça em inteligência e alcance a cada segundo.`,fisico:`Seres finos, quase esqueléticos, com uma cabeça desproporcional e grande. Não possuem boca nem nariz — apenas um único olho no centro do rosto, brilhando na cor de safira profunda. Sua presença, embora não seja aterrorizante, é completamente desconfortável. Como se algo essencial estivesse faltando onde deveria haver um rosto.`},{id:'homem-leite',name:'O Homem de Leite',icon:'◌',revealed:false,lore:'',fisico:''},{id:'ventus',name:'Ventus o Rei dus Tempus',icon:'🌪️',revealed:false,lore:'',fisico:''},{id:'sixseven',name:'O 67 (SixSeven)',icon:'⚡',revealed:false,lore:'',fisico:''},{id:'unknown',name:'???',icon:'◈',revealed:false,lore:'',fisico:''}];
export const ARTEFATOS_DATA=[
  {id:'artefato-1',name:'O Cristal Cristalizado da Gota de Água',icon:'💎',lore:`Ela é um artefato muito poderoso, expelido do corpo do próprio Homem Água. O usuário que o carrega ganha.... (o livro não descreve)`,fisico:`Localização: Desconhecida
Origem: Corpo do Homem Água`},
  {id:'artefato-2',name:'Sandaliers Six',icon:'\uD83D\uDC5F', requisitos:{agilidadeBonus:4,percepcaoBonus:2,texto:'Exige bônus natural de +4 Agilidade e +2 Percepção: pelo menos 8 pontos base de Agilidade e 4 de Percepção, sem equipamentos ou efeitos temporários.'},lore:`Quem possui esse artefato pode estar onde bem entender, espaço e tempo não o param, podendo se movimentar de forma livre em qualquer momento, um teleporte instantâneo.`,fisico:`Localização: Desconhecida
Origem: Desconhecida`},
  {
    id:'artefato-3',
    name:"Esmerald'da",
    icon:'◆',
    sigil:'6',
    lore:`Criada pela entidade Six Seven, a Esmerald'da não é apenas uma pedra temporal. É uma extensão da própria vontade de seu criador. Six Seven desejava que o tempo não fosse somente observado, estudado ou quebrado. Desejava que fosse dobrado como parte de seu corpo.

Há 1.200 anos, a relíquia foi entregue ao seu servo mais devoto e leal, para que guardasse um fragmento de seu domínio sobre o fluxo dos instantes. Aquele que portar a Esmerald'da poderá, em breves rupturas, retornar a si mesmo, a algo ou a alguém seis segundos no passado.

Mas o tempo não obedece aos fracos, aos desatentos ou aos indignos. Para tocar sua lógica, é necessário mente afiada e sorte suficiente para sobreviver ao próprio paradoxo.`,
    requisitos:{
      inteligenciaBonus:3,
      sorteBonus:2,
      texto:'Bônus mínimo de +3 em Inteligência e +2 em Sorte, obtidos exclusivamente pelos atributos naturais do portador.'
    },
    risco:`Cada uso intenso pode atrair entidades ligadas ao fluxo do tempo e provocar ecos temporais — memórias deslocadas, fragmentos de acontecimentos e manifestações de poder cósmico.`,
    builtInPowers:[
      {
        id:'esmeraldda-retrocesso-temporal',
        nome:'Retrocesso Temporal',
        custo:2,
        cooldown:'4 rodadas',
        descricao:'O portador rompe o fluxo dos instantes e faz a si mesmo, um objeto ou outra pessoa retornar exatamente seis segundos no passado. Na prática, pode retroceder por completo uma ação que acabou de ser realizada.'
      },
      {
        id:'esmeraldda-ruptura-temporal',
        nome:'Ruptura Temporal',
        custo:0,
        cooldown:'—',
        descricao:"Uso especial. Em pontos de ruptura temporal — como a Catedral de Santa Luzia, o Poço de Pequeninis ou o subterrâneo de Thermas dos Laranjais — a Esmerald'da pode abrir passagens entre o tempo. Esta manifestação não consome Vigor Cósmico."
      }
    ]
  },
  {id:'sardas',name:'Sardas',icon:'◉',lore:'Sardas é um manto de pele quase translúcida, passado de campeão em campeão. A tradição atribui sua criação ao primeiro grande campeão da humanidade, conhecido apenas como Titã; seu nome verdadeiro se perdeu na história.\n\nNinguém sabe de onde o manto veio, onde se originou ou quem o criou. Boatos antigos afirmam que foi tecido por uma entidade cujo nome não pode ser pronunciado: ?????? — ⟊⟒⟟ ⟊⟒⟟ ⟟⟒⟊. Os sinais não pertencem a nenhum idioma conhecido.',fisico:'Forma: manto feito de uma pele fina, translúcida e quase viva.\nPortadores conhecidos: campeões escolhidos ao longo das eras.\nOrigem: desconhecida; as versões sobre sua criação se contradizem.',requisitos:{forcaBonus:3,sorteBonus:3,texto:'Exige bônus mínimo de +3 em Força e +3 em Sorte — equivalentes a pelo menos 6 pontos naturais em cada atributo.'},builtInPowers:[{id:'sardas-pele-impenetravel',nome:'Pele do Campeão',custo:0,cooldown:'—',descricao:'A pele do portador absorve completamente ataques cujo resultado final seja inferior a 15 no D20, mesmo quando o teste escala com atributos. O ataque precisa alcançar 15 ou mais para feri-lo. Efeitos avassaladores — como antimatéria, bomba de nêutrons ou tiro de bazuca — ignoram essa absorção.'}]},
  {id:'oculos-de-cera',name:'Óculos de Cera',icon:'👓',lore:'Relíquia passada de faraó a faraó no Egito antigo, os Óculos de Cera foram criados pelo Homem de Leite, entidade da vida, em um gesto benevolente: trazer vida a este mundo.\n\nEm eras antigas, os óculos absorviam a energia vital dos fiéis, guardando-a nas hastes e, sobretudo, nas lentes. A ambição de príncipes, sacerdotes e faraós acumulou tanta energia na relíquia que ela já não precisa drenar a vida de quem está ao redor. O que nasceu como dádiva tornou-se um reservatório imenso de vida.',fisico:'Forma: óculos antigos, com hastes e lentes impregnadas de energia vital.\nOrigem: Egito antigo; transmitidos de imperador a imperador.\nCriador atribuído: Homem de Leite, entidade da vida.',requisitos:{percepcaoMinimo:2,inteligenciaMinimo:2,sorteMinimo:1,texto:'Exige pelo menos 2 pontos em Percepção, 2 em Inteligência e 1 em Sorte.'},builtInPowers:[{id:'oculos-cera-regeneracao',nome:'Restauração Vital',custo:0,cooldown:'1 vez por combate',descricao:'Uma vez por combate, o portador restaura completamente todos os próprios ferimentos.'},{id:'oculos-cera-visao-futura',nome:'Dois Segundos Adiante',custo:0,cooldown:'A cada 2 ataques recebidos',descricao:'A cada segundo ataque direcionado ao portador, ele enxerga dois segundos no futuro. Se obtiver 11 ou mais no D20, prevê o golpe e consegue esquivá-lo.'}]},
  {id:'notacao-cientifica-do-leite',name:'Notação Científica do Leite',icon:'🧪',lore:'Os cientistas de eras antigas se intrigavam com o Homem de Leite, o senhor da vida: sua presença fazia a cura e prosperidade e reacendia a esperança dos fiéis, enquanto os doutores tentavam explicar o fenômeno. Um dia, decidiram ir até o Homem de Leite e medir aquilo que acreditavam ser leite.\n\nO experimento terminou em catástrofe. Os que testemunharam ficaram cegos; os que escutaram, surdos; os que gritavam, mudos; e aqueles que sentiam qualquer coisa desapareceram por completo.\n\nDo desastre restou uma pequena molécula branca, parecida com leite, mas desconhecida pela humanidade. Ela foi chamada de elixir da vida — o sopro de esperança que deu origem à Notação Científica do Leite.',fisico:'Forma: uma molécula branca, pequena e desconhecida, preservada como notação científica.\nOrigem: experimento dos antigos doutores junto ao Homem de Leite.\nNatureza: elixir de vida, além da compreensão humana.',requisitos:{inteligenciaBonus:4,sorteBonus:3,percepcaoBonus:2,texto:'Exige bônus mínimo de +4 em Inteligência, +3 em Sorte e +2 em Percepção.'},builtInPowers:[{id:'notacao-criacao-viva',nome:'Gênese de Matéria',custo:0,cooldown:'2 rodadas',descricao:'Com um D20 puro, o portador dá vida a objetos inanimados, flores ou pequenos ramos, que passam a servi-lo como minions. Cada criação comum tem 7 pontos de vida. Com resultado 18 ou maior, ela nasce como um grande golem com 20 pontos de vida.'},{id:'notacao-execucao-criacao',nome:'Execução da Criação',custo:0,cooldown:'—',descricao:'Quando um inimigo está com até 13% de sua vida máxima, qualquer ataque do portador pode executá-lo instantaneamente, desintegrando-o. Esta execução não afeta ameaças de nível Anomalia ou Entidade.'}]}
];

export function getArtifactPowers(art, artefatosHabs){
  if(!art) return [];
  const builtIn=(art.builtInPowers||[]).map(p=>({...p,builtIn:true}));
  const custom=(artefatosHabs?.[art.id]||[]).map(p=>({...p,builtIn:false}));
  return [...builtIn,...custom];
}

export function ArtifactGlyph({art,size=18}){
  if(art?.sigil==='6'){
    return (
      <span style={{
        width:size,height:size,display:'inline-flex',alignItems:'center',justifyContent:'center',
        clipPath:'polygon(50% 0%,88% 20%,100% 58%,74% 92%,30% 100%,4% 64%,12% 22%)',
        background:'radial-gradient(circle at 38% 30%,#8CFFB2 0%,#1D9B67 35%,#07543F 70%,#01261F 100%)',
        border:'1px solid rgba(203,255,220,.7)',boxShadow:'0 0 12px rgba(55,255,158,.42),inset 0 0 8px rgba(220,255,235,.38)',
        color:'#E9FFF0',fontFamily:'Cinzel Decorative,serif',fontWeight:900,fontSize:Math.max(10,size*.46),
        textShadow:'0 0 6px rgba(255,255,255,.85)',flexShrink:0
      }}>6</span>
    );
  }
  return <span style={{fontSize:size,lineHeight:1}}>{art?.icon||'◆'}</span>;
}
// ─── VIDA MÁXIMA POR CLASSE, NÍVEL E DURABILIDADE ─────────────────────────────
// Nível 1 começa com a vida-base. Cada nível acima do primeiro concede +1 HP.
// Cada ponto de bônus de Durabilidade (1 bônus a cada 2 pontos) concede +2 HP.
export const CLASS_BASE_HP= {
  personalizado: 16,
  fogo: 20,
  escarlate: 25,
  corvos: 15,
  arcanjo: 20,
};

export function getClassBaseHp(classe) {
  return CLASS_BASE_HP[classe] ?? 15;
}

export function getDurabilityBonus(durabilidade) {
  return Math.floor(Math.max(0, Number(durabilidade) || 0) / 2);
}

export function getDurabilityHp(durabilidade) {
  return getDurabilityBonus(durabilidade) * 2;
}

export function getSheetMaxHp(sheet) {
  const base = getClassBaseHp(sheet?.classe);
  const levelHp = Math.max(0, (Number(sheet?.nivel) || 1) - 1);
  const durabilityHp = getDurabilityHp(sheet?.durabilidade);
  const extraHp = Math.max(0, Number(sheet?.hp_bonus) || 0);
  return base + levelHp + durabilityHp + extraHp;
}

export const RULES_DATA=[
  {
    cat:'sistema',
    icon:'⚔️',
    title:'Estrutura do Turno & Iniciativa',
    body:`O combate em Dinastia E é por turnos. A ordem de iniciativa agora é dinâmica e definida rolando 1D20 + Bônus de Agilidade.\n\nDesempates de Iniciativa:\nCaso dois combatentes tirem o mesmo valor, o desempate é feito pelo atributo Percepção. Se o empate persistir, o Jogador tem prioridade sobre o Inimigo.\n\nO Mestre também pode definir ou alterar a ordem manualmente. A fila de turnos fica sempre visível no lado esquerdo da tela durante o combate.`
  },
  {
    cat:'Combate',
    icon:'⚡',
    title:'Ataques de Oportunidade (Surpresa)',
    body:`O posicionamento é vital em Dinastia E. Caso um personagem ou inimigo dê as costas para um oponente ou tente fugir de um combate corpo-a-corpo de forma imprudente, ele sofrerá um Ataque de Oportunidade.\n\nEsse ataque é uma reação imediata e gratuita do atacante contra quem deu as costas, ocorrendo fora do seu turno normal. O Mestre pode acionar esse ataque diretamente no painel de combate.`
  },
  {
    cat:'Mecânicas',
    icon:'🎲',
    title:'Os Dados e Rolagens Públicas',
    body:`Agora as rolagens de dados podem ser feitas diretamente pelo site no painel de "Dado Público". O resultado, incluindo bônus, acertos críticos e falhas, aparece na tela de todos que estiverem na sala.\n\nTeste Universal de Ação — toda ação declarada exige um teste, sem exceções: ataques normais ou à distância, saltos, magias, conjurações de necromancia, milagres, esquivas, interações e ações de campo. Role sempre 1D20 e some o bônus do atributo correspondente (a cada 2 pontos no atributo, +1).\n\nResultado total:\n• 1–10 → Falha: a ação não surte efeito ou o Mestre aplica uma consequência ruim.\n• 11 ou mais → Sucesso completo: a ação acontece perfeitamente.\n• 20 natural → mantém os efeitos críticos previstos para a ação.\n\nAtributos de escala (exemplos):\n• Ataques à distância → Precisão (Percepção/PER).\n• Ataques normais e manobras ágeis → Agilidade (AGI).\n• Magias e conjurações → Inteligência (INT).\n• Milagres e efeitos de sorte → Sorte (SOR).\n• Ataques físicos corpo a corpo → Força (FOR).\n• Defesa e resistência → Durabilidade (DUR).\n\nDados de dano (1D4, 1D6, 1D8, 1D12 etc.) são rolados para definir o dano ou efeito indicado pela ação após o teste.`
  },
  {
    cat:'sistema',
    icon:'🎯',
    title:'Tipos de Ação, Custos e Limites',
    body:`Em seu turno, cada personagem possui 5 Vigor Cósmico (VC). A cada turno, ele recupera automaticamente +2 Vigor Cósmico.\n\nAções possíveis em combate:\n\n⚔️ Ataque Normal — 2 VC\nBater, chutar, socar, golpear com uma arma ou realizar outro ataque físico básico que não seja uma habilidade de classe.\n\n⚠️ Limite em combate: cada personagem pode realizar no máximo 3 Ataques Normais consecutivos no mesmo turno, independentemente de quanto Vigor Cósmico ainda possua. Mesmo que reste VC suficiente, um 4º ataque normal consecutivo não pode ser realizado naquele turno. Habilidades de classe não contam como Ataque Normal e podem ser usadas em sequência quando houver VC e o cooldown/requisito permitir.\n\n✨ Ataque Especial — 3 VC\nExecuta um dos ataques especiais (só podem ser usados a partir da 2° rodada, ou quando o personagem estiver com 5 de vida).\n\n🏃 Movimento — 1 VC\nMove-se para nova posição no campo de batalha.\n\n🛡️ Esquiva — 1 VC\nTenta esquivar de um ataque. Role 1D20 — se ≥11, esquiva com sucesso.\n\n💬 Ação de Campo — 1 VC\nQualquer ação de esforço: carregar aliado, empurrar objeto, etc.\n\n🔍 Percepção — 0 VC\nObservar ambiente ou inimigo. Sem custo.`
  },
  {
    cat:'Mecânicas',
    icon:'📊',
    title:'Bônus de Atributos',
    body:`A cada 2 pontos em um atributo, o personagem ganha +1 de bônus para somar ao D20 quando aquele atributo corresponder à ação:\n\n⚔️ Força: dano físico e ataques corpo a corpo.\n🛡️ Durabilidade: resistência e defesas.\n⚡ Agilidade: ataques normais, manobras ágeis, esquivas e iniciativa.\n🧠 Inteligência: magias, conjurações e ações científicas.\n🏹 Percepção (Precisão/PER): ataques à distância, ataques surpresa e desempate de iniciativa.\n✨ Sorte: milagres e ações que dependam de sorte.\n\nUse o bônus do atributo adequado em todo Teste Universal de Ação.`
  },
  {
    cat:'Status',
    icon:'❤️',
    title:'Cores e Estado de Vida (HP)',
    body:`A interface do combate indica visualmente a saúde atual do combatente através das cores da barra de vida:\n\n🟢 Verde (Saudável): Acima de 60% de HP.\n🟡 Amarelo (Ferido): Entre 30% e 60% de HP.\n🔴 Vermelho (Crítico): Abaixo de 30% de HP.\n⚫ Cinza e foto escura (Abatido): 0 HP (Morto).`
  },
  {
    cat:'Combate',
    icon:'🔄',
    title:'Teste de Reflexo',
    body:`Quando um personagem possui pelo menos 1 Vigor Cósmico disponível, ele pode realizar um Teste de Reflexo ao ser alvo de um ataque.\n\n🛡️ Custo: 1 VC\n🎲 Role 1D20 — se o resultado for 16 ou mais, o personagem esquiva completamente do ataque.\n\n⚠️ Limitação: O Teste de Reflexo só pode ser utilizado 1 vez por combate por personagem.`
  },
  {
    cat:'Mecânicas',
    icon:'💎',
    title:'Crítico de Itens',
    body:`Quando um item (arma, artefato, equipamento) acerta um golpe crítico (resultado 20 no D20), o dano não é rolado normalmente.\n\n✦ Regra: O item causa automaticamente o dano máximo garantido do seu dado de dano.\n\nExemplos:\n• Item com 1D6 de dano → Crítico = 6 de dano garantido\n• Item com 1D8 + 2 de dano → Crítico = 8 + 2 = 10 de dano garantido\n• Item com 2D6 de dano → Crítico = 12 de dano garantido\n\nEssa regra se aplica exclusivamente a itens e equipamentos. Habilidades de classe seguem suas próprias regras de crítico.`
  },
  {
    cat:'Status',
    icon:'✦',
    title:'Progressão & XP',
    body:`O nível máximo é 30.\n\nTítulos por Nível:\n• Nível 1–3 → Aprendiz Cósmico\n• Nível 4–6 → Portador do Destino\n• Nível 7–9 → Arauto do Fim\n• Nível 10–14 → Guardião Estelar\n• Nível 15–19 → Ascendente\n• Nível 20–24 → Transcendente\n• Nível 25–29 → Arauto Supremo\n• Nível 30 → Lenda Cósmica\n\nDesbloqueio de Especiais:\n• Especial I — desbloqueado no Nível 3\n• Especial II — desbloqueado no Nível 7\n\nAo alcançar os níveis 4, 10, 15, 20, 25 e 30, o personagem desbloqueia uma habilidade nova, definida em conjunto com o Mestre.`
  }
  ,{
    cat:'Mecânicas',
    icon:'❤️‍🔥',
    title:'Vida Máxima, Classes e Durabilidade',
    body:`A Vida Máxima dos personagens é calculada automaticamente pela classe, pelo nível e pela Durabilidade.\n\nFórmula de Vida Máxima:\nVida-base da classe + níveis acima do 1º + Vida de Durabilidade + bônus adicionais.\n\nVida-base por Classe:\n• Personalizado → 16 HP\n• Assassinos do Fogo Azul → 20 HP\n• Cavaleiros Escarlate → 25 HP\n• Corvos do Horizonte → 15 HP\n• Arcanjos da Escuridão → 20 HP\n• Todas as demais classes → 15 HP\n\nProgressão por Nível:\nO personagem começa no Nível 1 com a vida-base da classe. A cada nível conquistado acima do primeiro, recebe +1 de Vida Máxima.\n\nDurabilidade e Vida:\nA cada 2 pontos de Durabilidade, o personagem recebe +1 de bônus de Durabilidade. Cada ponto desse bônus concede +2 de Vida Máxima.\n\nExemplos:\n• Durabilidade 2 → bônus +1 → +2 HP\n• Durabilidade 6 → bônus +3 → +6 HP\n• Durabilidade 10 → bônus +5 → +10 HP\n• Durabilidade 16 → bônus +8 → +16 HP\n\nBônus adicionais de vida concedidos por itens, efeitos ou pelo Mestre são somados depois desse cálculo.`
  }
];

export const ATTRS= [
  { key: 'forca',       label: 'Força',        color: '#E8193C' },
  { key: 'agilidade',   label: 'Agilidade',    color: '#E8A020' },
  { key: 'durabilidade',label: 'Durabilidade', color: '#1EC8FF' },
  { key: 'inteligencia',label: 'Inteligência', color: '#A855F7' },
  { key: 'percepcao',   label: 'Percepção',    color: '#D4C5A9' },
  { key: 'sorte',       label: 'Sorte',        color: '#F0C040' },
];
