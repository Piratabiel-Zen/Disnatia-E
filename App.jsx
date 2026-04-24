import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, collection, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAnaJjwoJ6YgGrR5pIoPrTIj7PculaIfyA",
  authDomain: "dinastia-e-a4b28.firebaseapp.com",
  projectId: "dinastia-e-a4b28",
  storageBucket: "dinastia-e-a4b28.firebasestorage.app",
  messagingSenderId: "855332392669",
  appId: "1:855332392669:web:9fc06c8f633bb8cce89534",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

function compressImage(dataUrl, maxW=900, maxH=900, quality=0.72){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.width,h=img.height;
      if(w>maxW||h>maxH){const r=Math.min(maxW/w,maxH/h);w=Math.round(w*r);h=Math.round(h*r);}
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      resolve(canvas.toDataURL('image/jpeg',quality));
    };
    img.onerror=()=>resolve(dataUrl);
    img.src=dataUrl;
  });
}

const GLOBAL_CSS=`
@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
html,body,#root{margin:0;padding:0;height:100%;background:#04060F;}
*{box-sizing:border-box;}
::-webkit-scrollbar{width:5px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(155,89,182,0.4);border-radius:3px;}

/* Novas transições e animações */
@keyframes pageTurn {
  0% { opacity: 0; transform: translateY(12px) scale(0.99); filter: blur(3px); }
  100% { opacity: 1; transform: none; filter: blur(0); }
}
@keyframes diceRollAnim {
  0% { transform: rotate(0deg) scale(1); }
  25% { transform: rotate(-25deg) scale(1.15); }
  50% { transform: rotate(25deg) scale(1.15); }
  75% { transform: rotate(-15deg) scale(1.05); }
  100% { transform: rotate(0deg) scale(1); }
}
@keyframes shimmer{0%,100%{opacity:0.4}50%{opacity:1}}
@keyframes revealCoord{from{opacity:0;letter-spacing:0.6em}to{opacity:1;letter-spacing:0.25em}}
@keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}}

input,textarea,select{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.11);color:#C8B8A0;border-radius:6px;font-family:'Crimson Text',Georgia,serif;font-size:15px;padding:6px 10px;outline:none;transition:border-color 0.2s;}
input:focus,textarea:focus,select:focus{border-color:rgba(155,89,182,0.55);}
input[type=number]::-webkit-inner-spin-button{opacity:1;}
select option{background:#0E1020;}
button{font-family:'Crimson Text',Georgia,serif;}

@media(max-width:600px){
  .attr-dots{flex-wrap:wrap;}
  .attr-dots button{width:12px!important;height:12px!important;}
  .vigos-dots button{width:18px!important;height:18px!important;}
  .sheet-stats-grid{grid-template-columns:1fr 1fr!important;}
  .enemy-stats-grid{grid-template-columns:1fr 1fr!important;}
  .sheet-specials-row{flex-direction:column!important;align-items:flex-start!important;}
  .attr-label{min-width:72px!important;font-size:10px!important;}
  .nome-classe-row{flex-direction:column!important;align-items:stretch!important;}
  .nome-classe-row>div,.nome-classe-row select{width:100%!important;}
  nav{overflow-x:auto;flex-wrap:nowrap!important;justify-content:flex-start!important;padding:7px 10px!important;}
  nav button{flex-shrink:0;white-space:nowrap;}
  .sheet-tabs-nav{overflow-x:auto;flex-wrap:nowrap!important;}
  .sheet-tabs-nav button{flex-shrink:0;}
  
  /* Ajustes responsivos na tabela de equipamento */
  .equip-grid{grid-template-columns:1fr!important; gap: 16px!important;}
  .equip-slot-inputs { flex-direction: column !important; gap: 6px !important; }
  .equip-slot-inputs input { width: 100% !important; flex: none !important; }
}
@media(max-width:400px){
  .sheet-stats-grid{grid-template-columns:1fr!important;}
  .enemy-stats-grid{grid-template-columns:1fr!important;}
  .attr-dots button{width:11px!important;height:11px!important;}
}
`;

const SHEET_COLORS={fogo:'#1EC8FF',escarlate:'#E8193C',corvos:'#E8A020',magos:'#A855F7',marfim:'#4ADE80'};
const SHEET_GLOWS={fogo:'rgba(30,200,255,0.16)',escarlate:'rgba(232,25,60,0.16)',corvos:'rgba(232,160,32,0.16)',magos:'rgba(168,85,247,0.16)',marfim:'rgba(74,222,128,0.16)'};
const MASTER_PIN='dinastia';

const CLASSES=[
  {id:'fogo',alcance:'1m',name:'Assassinos do Fogo Azul',icon:'🔥',color:'#1EC8FF',glow:'rgba(30,200,255,0.16)',role:'Assassino · DPS Furtivo',lore:`Nos antigos e brutais campos de batalha, onde a morte era constante, alguns guerreiros descobriram como sobreviver canalizando a energia vital que emanava dos corpos caídos. Eles absorviam não apenas a vida esvaída, mas a pura vontade de lutar e a fúria dos mortos. Esta energia manifestou-se como uma chama azul incandescente que queima dentro deles, fortalecendo músculos e reflexos a níveis sobre-humanos, permitindo-lhes mover-se com velocidade letal e desferir ataques devastadores antes mesmo de serem notados.`,passive:{name:'Energia Vital',desc:'A cada 3 rodadas ganha 2 pontos para incluir em quaisquer bônus de ação. +1 ponto armazenado por inimigo abatido (acumulativo), podendo ser usado a qualquer momento.'},normal:[{name:'Esquiva da Catedral',cost:2,cooldown:'4 rodadas',desc:'Esquiva de qualquer ataque ficando translúcido e completamente intangível, mesmo fora do seu turno. Não pode ser usada novamente por 4 rodadas.'},{name:'Golpe Cintilante',cost:2,cooldown:'3 rodadas', dano: '1D6 + Força' ,desc:'Estocada veloz que atravessa o alvo, fazendo-o sangrar: −2 de vida por rodada por 3 rodadas consecutivas.'},{name:'Clemência Letal',cost:2,cooldown:'4 rodadas',desc:'+3 em quaisquer atributos por 2 rodadas. Ao expirar, −3 nesses mesmos atributos por 2 rodadas.'}],specials:[{name:'Olho da Mente',cost:3,cooldown:'4 rodadas',desc:'Vê os pontos fracos do oponente por membros do corpo, causando 2× o dano em uma parte específica escolhida (acertos na cabeça só acertam caso a precisão seja de 18-20, causando 3x o dano).',req:3},{name:'Fúria Flamejante',cost:3,cooldown:'5 rodadas',desc:'Envolve-se em chamas azuis: +1 alcance, +2 dano e precisão, +1 dano em área/rodada. Após 2 rodadas ativo, superaquece — fica 2 rodadas completamente incapaz de agir.',req:7}]},
  {id:'escarlate',alcance:'1m',name:'Cavaleiros Escarlate',icon:'🛡️',color:'#E8193C',glow:'rgba(232,25,60,0.16)',role:'Tanque · Protetor',lore:`A sua linhagem remonta a eras esquecidas, a povos que realizavam trabalhos braçais extremos nas profundezas da terra. Durante escavações, descobriram um minério enigmático: um rubi de cor escarlate incrivelmente denso. A exposição contínua e o suor derramado sobre o rubi criaram uma osmose biológica e mágica. O mineral fundiu-se com a genética destes trabalhadores, fazendo com que a sua própria pele se tornasse espessa, rígida e quase tão impenetrável quanto a rocha que outrora mineravam.`,passive:{name:'Pele de Rubi',desc:'Quando sem o escudo escarlate, a pele endurece. Ganha atributos bônus de defesa de acordo com a quantidade de inimigos ao redor (+1 de defesa por inimigo).'},normal:[{name:'Reflexo Escarlate',cost:2,cooldown:'3 rodadas',desc:'Se posiciona em frente a um ataque de disparo e reflete 0,5× o dano recebido utilizando um escudo.'},{name:'Lança Defensiva',cost:2,cooldown:'1 rodada', dano : '1D6 + Força' , desc:'Arremessa o escudo no inimigo. Com resultado D18–20, pode atingir múltiplos inimigos. O escudo retorna à mão automaticamente.'},{name:'Investida Ágil',cost:2,cooldown:'2 rodadas',desc:'Troca resistência por velocidade: move-se 3 passos em 1 ação para proteger alguém ou fugir. −3 resistência por 1 rodada.'}],specials:[{name:'Provocação Extrema',cost:3,cooldown:'4 rodadas',desc:'Todos os inimigos ao redor focam em você na proxima rodada. Todo dano recebido é reduzido em 50% enquanto o efeito durar (4 rodadas).',req:3},{name:'Modo Berserker',cost:3,cooldown:'4 rodadas',desc:'Troca toda a resistência por dano, força e alcance massivos. Fica imparável — mas exausto, sem poder usar habilidades por 4 rodadas.',req:7}]},
  {id:'corvos',alcance:'5m',name:'Corvos do Horizonte',icon:'🦅',color:'#E8A020',glow:'rgba(232,160,32,0.16)',role:'Atirador · Precisão Absoluta',lore:`Os primeiros caçadores desta linhagem desenvolveram uma ligação espiritual e simbiótica com as aves de rapina, especialmente os grandes corvos e gaviões. Esta conexão transcendeu a amizade, alterando os próprios sentidos destes caçadores. A sua visão tornou-se microscópica e letal, calculando ventos, distâncias e trajetórias instintivamente. Este dom genético foi passado de geração em geração, garantindo uma precisão de quase 100% com machados, flechas ou armas de fogo.`,passive:{name:'Visão do Gavião',desc:'Nunca sofre penalidade por distância. Ataques à longa distância ganham +2 no dado de precisão automaticamente.'},normal:[{name:'Sniper Americano',cost:2,cooldown:'—',desc:'Garante acerto em alvos de 5–10 metros sempre. Custo: causa apenas 0,50× do dano normal.'},{name:'Saque Rápido',cost:2,cooldown:'2 rodadas',desc:'Realiza um ataque a qualquer momento, mesmo fora do turno. Precisão reduzida em 3 pontos neste disparo.'},{name:'Foco Absoluto',cost:2,cooldown:'2 rodadas',desc:'Fica 1 rodada inteira sem atacar, apenas focando em um alvo. Garante acerto crítico automático na próxima rodada caso acerte.'}],specials:[{name:'Precisão Celestial',cost:3,cooldown:'4 rodadas',desc:'Disparo crítico perfurante. O inimigo atingido perde −2 de vida por rodada pelos 3 turnos seguintes.',req:3},{name:'Chuva Mortal',cost:3,cooldown:'5 rodadas',desc:'Múltiplos acertos simultâneos em uma área de 10–13 metros ao redor. Não atinge aliados.',req:7}]},
  {id:'magos',alcance:'5m',name:'Magos do Prólogo do Céu',icon:'☄️',color:'#A855F7',glow:'rgba(168,85,247,0.16)',role:'Vidente · Mago Cósmico',lore:`Outrora humanos comuns, o seu destino mudou quando uma pena celestial caiu dos céus. O primeiro a tocá-la teve a sua mente expandida além da compreensão mortal, despertando o dom absoluto da clarividência. Ele não controlava o tempo, mas conseguia observá-lo. Ao ver os fragmentos do futuro da humanidade, fundou esta ordem mágica e escreveu as suas visões no lendário Livro da Mandíbula. Transmitem o conhecimento cósmico através de diagramas sagrados, cânticos e uma profunda ligação com as anomalias do universo.`,passive:{name:'Visão Profética',desc:'Podem ver brevemente acontecimentos futuros ou preverem eventos por pistas do cenário, concedendo pontos bônus de combate ao grupo (+2 no atributo escolhido até o final do combate).'},normal:[{name:'Fortitude Ígnia',cost:2,cooldown:'1× por combate',desc:'Um personagem aliado recebe +3 de defesa por 2 rodadas. 1 uso por combate por jogador.'},{name:'Fluxo de Magia',cost:2,cooldown:'4 rodadas',desc:'Distribui parte da sua magia entre aliados em até 2m ao redor, buffando o dano deles em +2 por 4 rodadas.'},{name:'Telecinese',cost:2,cooldown:'variável', dano : '1D4|1D6|1D8|1D12 + Inteligência',desc:'Controla objetos ao redor e os arremessa contra inimigos. Tempo varia conforme o objeto. Pessoas só com consentimento.'}],specials:[{name:'Recuperação Divina',cost:3,cooldown:'7 rodadas',desc:'Remove todos os efeitos negativos de todos os aliados e cura em +8 pontos de vida.',req:3},{name:'Flecha do Último Guardião',cost:3,cooldown:'5 rodadas', dano : '1D12 + Inteligência', desc:'Invoca um arco gigante que dispara uma flecha com atributos de qualquer elemento escolhido, causando dano massivo em área (1d12).',req:7}]},
  {id:'marfim',alcance:'1m',name:'Cientistas de Marfim',icon:'🧪',color:'#4ADE80',glow:'rgba(212,197,169,0.16)',role:'Inventor · Gênio Adaptável',lore:`A origem desta linhagem começou com o primeiro grande alquimista da história. Através de anos de experimentação, ele sintetizou a "Pedra de Marfim" — o que as lendas chamam de Pedra Filosofal. Este objeto concedeu-lhe o conhecimento absoluto sobre física, química e tudo ainda por descobrir. Esta iluminação alterou o seu DNA. Todos os descendentes nascem com QI astronômico — um deles foi Nikola Tesla — criando maravilhas tecnológicas com sucata e compostos simples.`,passive:{name:'Percepção Elevada',desc:'Tem percepção acima do comum: pode revelar objetos escondidos no cenário e seus itens são utilizados das formas mais eficazes possiveis, ganhando +1 em qualquer atributo.'},normal:[{name:'Material de Pesquisa',cost:2,cooldown:'2 rodadas',desc:'Sempre carregado. Permite juntar 2 a 3 itens do cenário e combiná-los em um novo item.'},{name:'Seringa da Juventude',cost:2,cooldown:'3 rodadas',desc:'Aplica uma seringa que cura 2 de vida ao alvo e concede +2 Vigor Cósmico a ele.'},{name:'QI Distorcido',cost:2,cooldown:'1× por arma',desc:'Melhora qualquer arma concedendo mais alcance, dano ou precisão. 1 uso por arma por combate.'}],specials:[{name:'O 1° Alquimista',cost:3,cooldown:'4 rodadas', dano: '1D6 + Inteligência',desc:'Combina 4 a 5 itens criando algo novo e poderoso. Pode também disparar 1 tiro de tesla caso tenha algum objeto metalico ou condutor de energia, atordoando o alvo por 1 rodada.',req:3},{name:'Anti-Matéria',cost:3,cooldown:'6 rodadas', dano: '1D12 + Inteligência', desc:'Transcende, invocando 1mg de antimatéria: dano crítico garantido + efeitos negativos (lentidão, tontura, lepra degenerativa - demora 4 rounds para a lepra fazer efeito, degenerando uma parte do corpo do oponente).',req:7}]},
];

const PROLOGUE=[{type:'intro',text:'No início, não existia nada.'},{type:'pause',text:'E do nada ele surgiu — quem o nomeou? Ele mesmo.'},{type:'title',text:'*$!6;^@$+6~=´} (JhonKenteiker)'},{type:'body',text:'Jhon viu diante de si um universo vasto, lindo, porém vazio. E assim decidiu criar o sistema solar, e dele o mundo mais belo — nomeando-o Cosmum, a Terra dos mortais.'},{type:'body',text:'Nisso, ele criou as primeiras criaturas: já fortes, ágeis, adaptáveis, sobreviventes em qualquer cenário. Os dinossauros. Porém viu que dar-lhes tantas vantagens foi um erro.'},{type:'highlight',text:'E nisso ele criou o primeiro conceito de Reinício.'},{type:'body',text:'Uma grande bola de fogo atingiu o planeta, criando eventos irreversíveis e mudanças eternas. Do silêncio das cinzas surgiram os primeiros seres. Eles evoluíram. E a partir disso, o ser humano surgiu — não tão forte quanto os dinossauros, porém com uma capacidade cognitiva incomparável.'},{type:'divider',text:'— — —'},{type:'body',text:'Mas Jhon pensa novamente em reciclar o mundo. Pois viu que, ao passar dos anos, nenhum avanço significativo ocorreu. Fazendo-o questionar: devo começar tudo de novo?'},{type:'warning',text:'E além disso... uma catástrofe se aproxima.'},{type:'body',text:'Ninguém sabe o que. Só sabe que está chegando. Pois o Livro da Mandíbula — como o calendário maia — a previa. Dizendo que quatro estrelas ficariam brilhantes sobre os céus, tanto de dia quanto de noite, e se aproximariam a cada dia.'},{type:'finale',text:'O objetivo dos personagens não é apenas sobreviver. É provar seu valor para continuarem existindo. É parar. É compreender. É decifrar a profecia antes que o Reinício seja decretado novamente — desta vez, para sempre.'}];
const MILESTONES=[{year:'~400.000 AC',event:'Descoberta e controle do fogo',icon:'🔥'},{year:'~10.000 AC',event:'Revolução agrícola — os humanos se tornam sedentários',icon:'🌾'},{year:'~3.500 AC',event:'Surgimento das primeiras civilizações: Mesopotâmia e Egito',icon:'🏛️'},{year:'~3.000 AC',event:'Invenção da escrita cuneiforme',icon:'📜'},{year:'~500 AC',event:'Apogeu dos grandes impérios: Persa, Grego, Romano',icon:'⚔️'},{year:'Séc. XV',event:'Era das grandes navegações e descobrimento dos continentes',icon:'🌊'},{year:'Séc. XVIII',event:'Revolução Industrial — a máquina a vapor muda o mundo',icon:'⚙️'},{year:'1905',event:'Albert Einstein publica a Teoria da Relatividade',icon:'🧠'},{year:'1945',event:'Era Atômica — o poder de destruição da humanidade se torna real',icon:'☢️'},{year:'1969',event:'O primeiro ser humano pisa na Lua',icon:'🌕'},{year:'1990s',event:'Era digital — a internet conecta a humanidade globalmente',icon:'💻'},{year:'Séc. XXI',event:'Inteligência artificial: a humanidade cria inteligência',icon:'🤖'},{year:'AGORA',event:'Quatro estrelas aparecem nos céus de Cosmum. Elas se aproximam.',icon:'✦',prophecy:true}];
const ENTITIES_DATA=[{id:'homem-agua',name:'Homem Água',icon:'💧',revealed:true,lore:`Era um homem comum chamado David, que vivia por volta de 1544, com seu amigo Billy Laranjais. Um dia como qualquer outro, uma lágrima celestial caiu dos céus — era de JhonKenteiker. Ninguém sabe o motivo daquela lágrima ter caído, mas ao entrar em contato com o corpo de David, tornou-o extremamente poderoso, expelindo água de seu corpo e a controlando de forma quase que divina.\n\nAo ver isso, Billy teve uma ideia, movido pela ganância. Ele atraiu seu amigo até um local, onde o prendeu e ficou drenando toda sua água, dia após dia. Com isso, Billy criou uma fortuna e o parque temático para esconder seu pecado — conhecido como "Thermas dos Laranjais".\n\nApós isso, a cada 200 a 300 anos o Homem Água não morre, mas reencarna sua essência em outro hospedeiro. Quando isso acontece, todos os Cavaleiros dos Laranjais — descendentes diretos de Billy — são acionados para capturar a criança assim que nasce, e colocá-la na prisão que um dia foi de David, para drenar sua água até que o ciclo comece outra vez.`,fisico:`Um ser formado completamente pela água mais pura já vista — transparente, límpida, quase luminosa. Seus olhos são os únicos traços aparentes: dois pontos visíveis dentro de uma forma humana inteiramente aquosa. Não possui cor, não possui sombra. Apenas água com vontade própria.`},{id:'cabecas-azuis',name:'Os Cabeças Azuis',icon:'🔵',revealed:true,lore:`No ano de 830 d.C., uma entidade senciente de vontade própria e poder imensurável despertou. Embora fosse poderosa, ela se sentia incompleta em sua solidão. Foi então que seduziu o primeiro humano — um homem cujo nome original foi apagado da história, restando apenas o "Chamado" que ressoa em sua mente.\n\nA entidade convenceu este primeiro hospedeiro de que a individualidade era um fardo e que pertencer a um único ser pensante, abrindo mão da própria dignidade e vontade, seria o maior prazer de uma vida. Ao longo dos séculos, mais e mais humanos foram abduzidos e assimilados.\n\nHoje, eles não são mais indivíduos, mas componentes de uma Mente Coletiva. Funcionam como um "software" biológico: cada novo humano assimilado serve como processamento e memória, fazendo com que a entidade cresça em inteligência e alcance a cada segundo.`,fisico:`Seres finos, quase esqueléticos, com uma cabeça desproporcional e grande. Não possuem boca nem nariz — apenas um único olho no centro do rosto, brilhando na cor de safira profunda. Sua presença, embora não seja aterrorizante, é completamente desconfortável. Como se algo essencial estivesse faltando onde deveria haver um rosto.`},{id:'homem-leite',name:'O Homem de Leite',icon:'◌',revealed:false,lore:'',fisico:''},{id:'ventus',name:'Ventus o Rei dus Tempus',icon:'🌪️',revealed:false,lore:'',fisico:''},{id:'sixseven',name:'O 67 (SixSeven)',icon:'⚡',revealed:false,lore:'',fisico:''},{id:'unknown',name:'???',icon:'◈',revealed:false,lore:'',fisico:''}];
const ARTEFATOS_DATA=[{id:'artefato-1',name:'O Cristal Cristalizado da Gota de Água',icon:'💎',lore:`Ela é um artefato muito poderoso, expelido do corpo do próprio Homem Água. O usuário que o carrega ganha.... (o livro não descreve)`,fisico:`Localização: Desconhecida\nOrigem: Corpo do Homem Água`},{id:'artefato-2',name:'Sandaliers Six',icon:'👟',lore:`Quem possui esse artefato pode estar onde bem entender, espaço e tempo não o param, podendo se movimentar de forma livre em qualquer momento, um teleporte instantâneo.`,fisico:`Localização: Desconhecida\nOrigem: Desconhecida`},{id:'artefato-3',name:'Artefato III',icon:'◆',lore:'',fisico:''},{id:'artefato-4',name:'Artefato IV',icon:'◆',lore:'',fisico:''},{id:'artefato-5',name:'Artefato V',icon:'◆',lore:'',fisico:''},{id:'artefato-6',name:'Artefato VI',icon:'◆',lore:'',fisico:''}];
const RULES_DATA=[{icon:'⚔️',title:'Estrutura do Turno',body:`O combate em Dinastia E é por turnos. O Mestre define a ordem de iniciativa antes de cada encontro.\n\nEm seu turno, cada personagem possui 5 Vigor Cósmico (VC). A cada turno, o personagem recupera automaticamente +2 Vigor Cósmico.\n\nQualquer ação que envolva esforço físico, mental ou mágico consome Vigor Cósmicos.`},{icon:'🎲',title:'Os Dados',body:`Dois tipos de dados são usados em Dinastia E:\n\n1D20 — Dado de Precisão:\n• 1–5 → Falha Crítica. A ação falha com consequências.\n• 6–10 → Falha. A ação não surte efeito.\n• 11–15 → Sucesso Parcial. Funciona, mas não perfeitamente.\n• 16–19 → Sucesso. A ação ocorre como planejado.\n• 20 → Sucesso Crítico. Role o dado de dano duas vezes.\n\n1D4 / 1D6 / 1D8 / 1D12 — Dado de Dano:\nUsado após um ataque bem-sucedido (≥11 no D20). Cada habilidade especifica qual dado usar.`},{icon:'🎯',title:'Tipos de Ação e Custos',body:`Ações possíveis em combate:\n\n⚔️ Ataque Normal — 2 VC\nExecuta um dos 3 ataques normais da sua classe.\n\n✨ Ataque Especial — 3 VC\nExecuta um dos ataques especiais desbloqueados (ataques especiais só podem ser usados a partir da 2° rodada, ou quando o personagem estiver com 5 de vida).\n\n🏃 Movimento — 1 VC\nMove-se para nova posição no campo de batalha.\n\n🛡️ Esquiva — 1 VC\nTenta esquivar de um ataque. Role 1D20 — se ≥11, esquiva com sucesso.\n\n💬 Ação de Campo — 1 VC\nQualquer ação de esforço: carregar aliado, empurrar objeto, e etc...\n\n🔍 Percepção — 0 VC\nObservar ambiente ou inimigo. Sem custo.`},{icon:'📊',title:'Bônus de Atributos',body:`Os atributos do personagem concedem bônus diretos às ações em combate. A cada 2 pontos em um atributo, o personagem ganha +1 de ponto bônus na ação correspondente:\n\n⚔️ Força (Dano e Ataques):\n• A cada 2 pontos de Força = +1 de ponto bônus.\n\n🛡️ Durabilidade (Resistência e Defesas):\n• A cada 2 pontos de Durabilidade = +1 de ponto bônus.\n\n⚡| 🏹 Agilidade (Esquivas e Ataques a Distancia):\n• A cada 2 pontos de Agilidade = +1 de ponto bônus de acerto.\n\n🧠 Inteligência (Potencialização de Ataques Mágicos e Cientificos):\n• A cada 2 pontos de Inteligência = +1 ponto bônus.\n\n🏹 Percepção (Ataques Surpresa, Detecção de Comuflagem):\n• A cada 2 pontos de Percepção = 1+ de ponto bônus.`},{icon:'🔄',title:'Teste de Reflexo',body:`Quando um personagem possui pelo menos 1 Vigor Cósmico disponível, ele pode realizar um Teste de Reflexo ao ser alvo de um ataque.\n\n🛡️ Custo: 1 VC\n🎲 Role 1D20 — se o resultado for 16 ou mais, o personagem esquiva completamente do ataque.\n\n⚠️ Limitação: O Teste de Reflexo só pode ser utilizado 1 vez por combate por personagem.\n\nEste teste representa a capacidade instintiva do personagem de reagir a perigos imediatos, exigindo foco cósmico e reflexos apurados.`},{icon:'💎',title:'Crítico de Itens',body:`Quando um item (arma, artefato, equipamento) acerta um golpe crítico (resultado 20 no D20), o dano não é rolado normalmente.\n\n✦ Regra: O item causa automaticamente o dano máximo garantido do seu dado de dano.\n\nExemplos:\n• Item com 1D6 de dano → Crítico = 6 de dano garantido\n• Item com 1D8 + 2 de dano → Crítico = 8 + 2 = 10 de dano garantido\n• Item com 2D6 de dano → Crítico = 12 de dano garantido\n\nEssa regra se aplica exclusivamente a itens e equipamentos. Habilidades de classe seguem suas próprias regras de crítico.`},{icon:'✦',title:'Progressão & XP',body:`O nível máximo é 30.\n\nTítulos por Nível:\n• Nível 1–3 → Aprendiz Cósmico\n• Nível 4–6 → Portador do Destino\n• Nível 7–9 → Arauto do Fim\n• Nível 10–14 → Guardião Estelar\n• Nível 15–19 → Ascendente\n• Nível 20–24 → Transcendente\n• Nível 25–29 → Arauto Supremo\n• Nível 30 → Lenda Cósmica\n\nDesbloqueio de Especiais:\n• Especial I — desbloqueado ao atingir Nível 3\n• Especial II — desbloqueado ao atingir Nível 7\n\nHabilidades Novas:\nAo alcançar certos niveis (Nível 4, 10, 15, 20, 25 e 30), o personagem desbloqueia uma habilidade nova, que pode ser definida em conjunto com o Mestre.\n\nOs valores de XP por nível são definidos pelo Mestre conforme o ritmo da campanha.`}];

// ─── STARFIELD ────────────────────────────────────────────────────────────────
function StarField(){const ref=useRef(null);useEffect(()=>{const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');let raf;const resize=()=>{canvas.width=canvas.offsetWidth;canvas.height=canvas.offsetHeight;};resize();window.addEventListener('resize',resize);const stars=Array.from({length:200},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.2+0.2,phase:Math.random()*Math.PI*2,spd:Math.random()*0.025+0.008}));const ps=[{x:0.10,y:0.04,c:'#1EC8FF'},{x:0.87,y:0.05,c:'#E8A020'},{x:0.48,y:0.025,c:'#A855F7'},{x:0.70,y:0.06,c:'#E8193C'}];let t=0;const draw=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);t+=0.007;stars.forEach(s=>{const a=0.2+0.5*Math.sin(t*s.spd*50+s.phase);ctx.beginPath();ctx.arc(s.x*canvas.width,s.y*canvas.height,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${a})`;ctx.fill();});ps.forEach((s,i)=>{const a=0.55+0.45*Math.sin(t*1.1+i*0.8),px=s.x*canvas.width,py=s.y*canvas.height;ctx.save();ctx.shadowColor=s.c;ctx.shadowBlur=14*a;ctx.globalAlpha=a;ctx.beginPath();ctx.arc(px,py,2.8,0,Math.PI*2);ctx.fillStyle=s.c;ctx.fill();ctx.restore();ctx.save();ctx.globalAlpha=a*0.4;ctx.strokeStyle=s.c;ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(px-8,py);ctx.lineTo(px+8,py);ctx.stroke();ctx.beginPath();ctx.moveTo(px,py-8);ctx.lineTo(px,py+8);ctx.stroke();ctx.restore();});raf=requestAnimationFrame(draw);};draw();return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);};},[]);return <canvas ref={ref} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none'}}/>;}

// ─── BLOQUEIO MESTRE ─────────────────────────────────────────────────────────
function RestrictedAccess({ title, text }) {
  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'80px 24px',textAlign:'center'}}>
      <div style={{fontSize:48,marginBottom:16,opacity:0.6}}>🔒</div>
      <h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:24,color:'#E8193C',fontWeight:700,margin:0,textShadow:'0 0 20px rgba(232,25,60,0.4)'}}>{title}</h2>
      <div style={{fontSize:14,color:'#9A8A7A',marginTop:12,fontFamily:'Cinzel,serif',letterSpacing:'0.05em'}}>{text}</div>
      <div style={{fontSize:12,color:'#5A4A5A',marginTop:8}}>Ative o Modo Mestre no topo da tela usando a senha para acessar.</div>
    </div>
  );
}

// ─── ROLAGEM DE DADOS FLUTUANTE ──────────────────────────────────────────────
function DiceWidget() {
  const [open, setOpen] = useState(false);
  const [dice, setDice] = useState(20);
  const [bonus, setBonus] = useState(0);
  const [result, setResult] = useState(null);
  const [rolling, setRolling] = useState(false);

  const roll = () => {
    setRolling(true);
    setResult(null);
    setTimeout(() => {
      const base = Math.floor(Math.random() * dice) + 1;
      setResult({ base, total: base + Number(bonus) });
      setRolling(false);
    }, 600);
  };

  return (
    <div className="dice-widget" style={{position:'fixed', bottom:24, right:24, zIndex:100}}>
      {!open && (
        <button onClick={()=>setOpen(true)} style={{width:56, height:56, borderRadius:'50%', background:'rgba(168,85,247,0.15)', border:'1px solid rgba(168,85,247,0.4)', color:'#C8A8E8', fontSize:26, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 0 20px rgba(168,85,247,0.2)', backdropFilter:'blur(5px)', transition:'all 0.3s'}}>🎲</button>
      )}
      {open && (
        <div style={{background:'rgba(10,12,28,0.95)', border:'1px solid rgba(168,85,247,0.4)', borderRadius:16, padding:16, width:260, boxShadow:'0 10px 40px rgba(0,0,0,0.8)', backdropFilter:'blur(10px)'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
            <div style={{fontFamily:'Cinzel,serif', fontSize:13, color:'#C8A8E8', letterSpacing:'0.1em'}}>Rolagem Cósmica</div>
            <button onClick={()=>setOpen(false)} style={{background:'transparent', border:'none', color:'#5A5070', cursor:'pointer', fontSize:14}}>✕</button>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6, marginBottom:12}}>
            {[4,6,8,10,12,20].map(d => (
              <button key={d} onClick={()=>{setDice(d);setResult(null);}} style={{padding:'6px 0', borderRadius:6, border:`1px solid ${dice===d?'rgba(168,85,247,0.6)':'rgba(255,255,255,0.1)'}`, background:dice===d?'rgba(168,85,247,0.2)':'rgba(255,255,255,0.03)', color:dice===d?'#fff':'#9A8A7A', fontFamily:'Cinzel,serif', fontSize:12, cursor:'pointer', transition:'all 0.2s'}}>D{d}</button>
            ))}
          </div>

          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16}}>
            <label style={{fontSize:11, color:'#7B6D8A', fontFamily:'Cinzel,serif'}}>Bônus</label>
            <input type="number" value={bonus} onChange={e=>setBonus(Number(e.target.value))} style={{flex:1, textAlign:'center', padding:'4px', fontSize:14}} />
          </div>

          <button onClick={roll} disabled={rolling} style={{width:'100%', padding:'10px', borderRadius:8, border:'1px solid rgba(168,85,247,0.5)', background:'rgba(168,85,247,0.15)', color:'#fff', fontFamily:'Cinzel,serif', fontSize:14, fontWeight:600, cursor:rolling?'not-allowed':'pointer', transition:'all 0.2s', display:'flex', justifyContent:'center', alignItems:'center', gap:8}}>
            <span style={{animation: rolling ? 'diceRollAnim 0.5s infinite' : 'none'}}>🎲</span> {rolling ? 'Rolando...' : 'Rolar D' + dice}
          </button>

          {result && (
            <div style={{marginTop:16, paddingTop:16, borderTop:'1px dashed rgba(255,255,255,0.1)', textAlign:'center'}}>
              <div style={{fontSize:11, color:'#7B6D8A', fontFamily:'Cinzel,serif', marginBottom:4}}>Resultado (D{dice} + {bonus})</div>
              <div style={{display:'flex', justifyContent:'center', alignItems:'baseline', gap:8}}>
                <span style={{fontSize:32, fontFamily:'Cinzel,serif', color:result.base===20&&dice===20?'#4ADE80':result.base===1&&dice===20?'#E8193C':'#C8A8E8', fontWeight:700}}>{result.total}</span>
                {bonus !== 0 && <span style={{fontSize:12, color:'#5A5070'}}>({result.base} {bonus>=0?'+':''} {bonus})</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── PROLOGUE ─────────────────────────────────────────────────────────────────
function PrologueSection(){return(<div style={{maxWidth:720,margin:'0 auto',padding:'40px 24px 80px'}}><div style={{textAlign:'center',marginBottom:44}}><div style={{fontSize:11,letterSpacing:'0.4em',color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:14,textTransform:'uppercase'}}>O Começo de Tudo</div><h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:27,color:'#E8D8C0',fontWeight:700,margin:0,textShadow:'0 0 40px rgba(168,85,247,0.4)'}}>Prólogo</h2><div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(168,85,247,0.6),transparent)',margin:'18px auto 0'}}/></div><div style={{lineHeight:1.9,fontSize:16}}>{PROLOGUE.map((p,i)=>{if(p.type==='title')return <div key={i} style={{textAlign:'center',margin:'30px 0',fontFamily:'Cinzel,serif',fontSize:19,color:'#E8D8C0',fontWeight:700,letterSpacing:'0.05em',textShadow:'0 0 30px rgba(168,85,247,0.5)'}}>{p.text}</div>;if(p.type==='highlight')return <div key={i} style={{margin:'26px 0',padding:'15px 22px',borderLeft:'2px solid #A855F7',background:'rgba(168,85,247,0.08)',borderRadius:'0 8px 8px 0',fontFamily:'Cinzel,serif',color:'#C8A8E8',fontSize:15}}>{p.text}</div>;if(p.type==='warning')return <div key={i} style={{margin:'26px 0',padding:'15px 22px',borderLeft:'2px solid #E8193C',background:'rgba(232,25,60,0.08)',borderRadius:'0 8px 8px 0',fontFamily:'Cinzel,serif',color:'#F09090',fontSize:15}}>{p.text}</div>;if(p.type==='finale')return <div key={i} style={{margin:'36px 0 0',padding:'22px',border:'1px solid rgba(168,85,247,0.25)',borderRadius:12,background:'rgba(168,85,247,0.05)',fontFamily:'Cinzel,serif',color:'#C0A8D8',fontSize:15,lineHeight:1.9,textAlign:'center'}}>{p.text}</div>;if(p.type==='divider')return <div key={i} style={{textAlign:'center',margin:'28px 0',color:'rgba(255,255,255,0.14)',letterSpacing:'0.4em',fontSize:12}}>{p.text}</div>;if(p.type==='intro'||p.type==='pause')return <p key={i} style={{margin:'0 0 18px',color:'#B0A090',fontStyle:p.type==='pause'?'italic':'normal',fontSize:p.type==='intro'?17:15}}>{p.text}</p>;return <p key={i} style={{margin:'0 0 18px',color:'#9A8A7A'}}>{p.text}</p>;})}</div></div>);}

// ─── CLASSES ──────────────────────────────────────────────────────────────────
function ClassCard({cls}){const[open,setOpen]=useState(false);return(<div onClick={()=>setOpen(o=>!o)} style={{border:`1px solid ${open?cls.color+'55':'rgba(255,255,255,0.08)'}`,borderRadius:12,background:open?'rgba(10,12,28,0.95)':'rgba(8,10,22,0.8)',marginBottom:13,cursor:'pointer',transition:'all 0.3s',boxShadow:open?`0 0 28px ${cls.glow}`:'none',overflow:'hidden'}}><div style={{padding:'15px 20px',display:'flex',alignItems:'center',gap:13}}><span style={{fontSize:24}}>{cls.icon}</span><div style={{flex:1}}><div style={{fontFamily:'Cinzel,serif',fontSize:14,fontWeight:700,color:cls.color,letterSpacing:'0.03em'}}>{cls.name}</div><div style={{fontSize:11,color:'#7B6D8A',marginTop:3,fontFamily:'Cinzel,serif',letterSpacing:'0.06em'}}>{cls.role}</div></div><div style={{color:'rgba(255,255,255,0.22)',fontSize:12,transform:open?'rotate(90deg)':'none',transition:'transform 0.3s'}}>▶</div></div>{open&&(<div onClick={e=>e.stopPropagation()} style={{padding:'0 20px 20px'}}><div style={{width:'100%',height:1,background:`linear-gradient(90deg,${cls.color}44,transparent)`,marginBottom:16}}/><p style={{fontSize:14,color:'#9A8A7A',lineHeight:1.85,fontStyle:'italic',margin:'0 0 20px'}}>{cls.lore}</p><div style={{marginBottom:16}}><div style={{fontSize:10,letterSpacing:'0.35em',color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Passiva</div><div style={{background:`${cls.color}0D`,border:`1px solid ${cls.color}28`,borderRadius:8,padding:'10px 13px'}}><div style={{fontFamily:'Cinzel,serif',fontSize:13,color:cls.color,fontWeight:600,marginBottom:4}}>{cls.passive.name}</div><div style={{fontSize:13,color:'#8A7A6A',lineHeight:1.7}}>{cls.passive.desc}</div></div></div><div style={{marginBottom:16}}><div style={{fontSize:10,letterSpacing:'0.35em',color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Ataques Normais — 2 VC cada</div><div style={{display:'flex',flexDirection:'column',gap:6}}>{cls.normal.map((a,i)=>(<div key={i} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:'9px 12px',display:'flex',gap:10,alignItems:'flex-start'}}><div style={{flex:1}}><div style={{fontFamily:'Cinzel,serif',fontSize:12,color:'#C8B8A0',fontWeight:600,marginBottom:3}}>{a.name}</div><div style={{fontSize:13,color:'#7A6A5A',lineHeight:1.65}}>{a.desc}</div></div><div style={{flexShrink:0,textAlign:'right'}}><div style={{fontSize:11,color:`${cls.color}BB`,fontFamily:'Cinzel,serif'}}>2 VC</div><div style={{fontSize:10,color:'rgba(255,255,255,0.18)',marginTop:2}}>⏱ {a.cooldown}</div></div></div>))}</div></div><div><div style={{fontSize:10,letterSpacing:'0.35em',color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Especiais — 3 VC cada</div><div style={{display:'flex',flexDirection:'column',gap:6}}>{cls.specials.map((a,i)=>(<div key={i} style={{background:`${cls.color}09`,border:`1px solid ${cls.color}22`,borderRadius:8,padding:'9px 12px',display:'flex',gap:10,alignItems:'flex-start'}}><div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}><span style={{fontSize:11,color:cls.color}}>✦</span><span style={{fontFamily:'Cinzel,serif',fontSize:12,color:'#C8B8A0',fontWeight:600}}>{a.name}</span></div><div style={{fontSize:13,color:'#7A6A5A',lineHeight:1.65}}>{a.desc}</div></div><div style={{flexShrink:0,textAlign:'right'}}><div style={{fontSize:11,color:`${cls.color}BB`,fontFamily:'Cinzel,serif'}}>3 VC</div><div style={{fontSize:10,color:'rgba(255,255,255,0.18)',marginTop:2}}>⏱ {a.cooldown}</div><div style={{fontSize:10,color:'rgba(255,255,255,0.16)',marginTop:2}}>Nív {a.req}+</div></div></div>))}</div></div></div>)}</div>);}
function ClassesSection(){return(<div style={{maxWidth:760,margin:'0 auto',padding:'40px 24px 80px'}}><div style={{textAlign:'center',marginBottom:32}}><div style={{fontSize:11,letterSpacing:'0.4em',color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:13,textTransform:'uppercase'}}>As Cinco Linhagens</div><h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:23,color:'#E8D8C0',fontWeight:700,margin:0}}>Classes</h2><div style={{fontSize:12,color:'#4A4050',marginTop:9,fontFamily:'Cinzel,serif'}}>Clique em cada classe para revelar lore e habilidades</div><div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(232,160,32,0.6),transparent)',margin:'16px auto 0'}}/></div>{CLASSES.map(cls=><ClassCard key={cls.id} cls={cls}/>)}</div>);}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
const ATTRS=[{key:'forca',label:'Força',color:'#E8193C'},{key:'agilidade',label:'Agilidade',color:'#E8A020'},{key:'durabilidade',label:'Durabilidade',color:'#1EC8FF'},{key:'inteligencia',label:'Inteligência',color:'#A855F7'},{key:'percepcao',label:'Percepção',color:'#D4C5A9'}];
function AttrDots({value,color,onChange}){return(<div className="attr-dots" style={{display:'flex',gap:4}}>{Array.from({length:10}).map((_,i)=>(<button key={i} onClick={()=>onChange(i<value?(i===value-1?0:i+1):i+1)} style={{width:15,height:15,borderRadius:'50%',border:`1.5px solid ${i<value?color:'rgba(255,255,255,0.12)'}`,background:i<value?color+'44':'transparent',cursor:'pointer',transition:'all 0.15s',padding:0,flexShrink:0}}/>))}</div>);}
function VigosDots({value,max,color,onChange}){return(<div className="vigos-dots" style={{display:'flex',gap:6,flexWrap:'wrap'}}>{Array.from({length:max}).map((_,i)=>(<button key={i} onClick={()=>onChange(i<value?(i===value-1?0:i+1):i+1)} style={{width:22,height:22,borderRadius:'50%',border:`1.5px solid ${i<value?color:'rgba(255,255,255,0.13)'}`,background:i<value?color+'33':'transparent',cursor:'pointer',transition:'all 0.2s',padding:0,boxShadow:i<value?`0 0 5px ${color}55`:'none'}}>{i<value&&<span style={{display:'block',width:8,height:8,borderRadius:'50%',background:color,margin:'auto'}}/>}</button>))}</div>);}

function VigosWithLocked({value,nivel,color,onChange}){
  const unlocked1=nivel>=8,unlocked2=nivel>=18;
  const normal=Array.from({length:5}).map((_,i)=>(
    <button key={i} onClick={()=>onChange(i<value?(i===value-1?0:i+1):i+1)}
      style={{width:22,height:22,borderRadius:'50%',border:`1.5px solid ${i<value?color:'rgba(255,255,255,0.13)'}`,background:i<value?color+'33':'transparent',cursor:'pointer',transition:'all 0.2s',padding:0,boxShadow:i<value?`0 0 5px ${color}55`:'none'}}>
      {i<value&&<span style={{display:'block',width:8,height:8,borderRadius:'50%',background:color,margin:'auto'}}/>}
    </button>
  ));
  const slot=(idx,lockLvl)=>unlocked1&&idx===6||unlocked2&&idx===7
    ?<button onClick={()=>onChange(value===idx?idx-1:idx)}
        style={{width:22,height:22,borderRadius:'50%',border:`1.5px solid ${value>=idx?color:'rgba(255,255,255,0.13)'}`,background:value>=idx?color+'33':'transparent',cursor:'pointer',transition:'all 0.2s',padding:0,boxShadow:value>=idx?`0 0 5px ${color}55`:'none'}}>
        {value>=idx&&<span style={{display:'block',width:8,height:8,borderRadius:'50%',background:color,margin:'auto'}}/>}
      </button>
    :<div title={`Desbloqueado no Nível ${lockLvl}`} style={{width:22,height:22,borderRadius:'50%',border:'1.5px solid rgba(255,200,0,0.28)',background:'rgba(255,200,0,0.04)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'rgba(255,200,0,0.45)',cursor:'default'}}>🔒</div>;
  return(
    <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
      {normal}
      <div style={{width:1,height:16,background:'rgba(255,255,255,0.1)',margin:'0 2px'}}/>
      {slot(6,8)}{slot(7,18)}
    </div>
  );
}

// ─── EQUIPAMENTO PANEL ────────────────────────────────────────────────────────
function resolveEquipIcon(tipo=''){
  const t=tipo.toLowerCase();
  if(t.includes('espada')||t.includes('sabre')||t.includes('lâmina')||t.includes('lamina'))return'⚔️';
  if(t.includes('adaga')||t.includes('faca')||t.includes('punhal')||t.includes('navalha'))return'🗡️';
  if(t.includes('machado'))return'🪓';
  if(t.includes('martelo de guerra')||t.includes('martelo')||t.includes('maça')||t.includes('maca')||t.includes('clava')||t.includes('porrete')||t.includes('cacete'))return'🔨';
  if(t.includes('lança')||t.includes('lanca')||t.includes('alabarda')||t.includes('pique'))return'🪄';
  if(t.includes('arco')||t.includes('besta'))return'🏹';
  if(t.includes('flecha'))return'➶';
  if(t.includes('chicote'))return'🪢';
  if(t.includes('foice'))return'🌙';
  if(t.includes('cajado')||t.includes('báculo')||t.includes('baculo'))return'🪄';
  if(t.includes('varinha'))return'✨';
  if(t.includes('pistola')||t.includes('revólver')||t.includes('revolver'))return'🔫';
  if(t.includes('rifle')||t.includes('fuzil')||t.includes('sniper')||t.includes('carabina')||t.includes('shotgun')||t.includes('espingarda'))return'🔫';
  if(t.includes('granada')||t.includes('bomba')||t.includes('explosivo'))return'💣';
  if(t.includes('corrente'))return'⛓️';
  if(t.includes('capacete')||t.includes('elmo'))return'⛑️';
  if(t.includes('armadura leve')||t.includes('colete'))return'🦺';
  if(t.includes('armadura pesada')||t.includes('couraça')||t.includes('coiraca')||t.includes('armadura')||t.includes('cota'))return'🛡️';
  if(t.includes('escudo')||t.includes('broquel')||t.includes('égide')||t.includes('egide'))return'🛡️';
  if(t.includes('manto'))return'🧥';
  if(t.includes('luva')||t.includes('braçadeira')||t.includes('bracadeira'))return'🧤';
  if(t.includes('bota'))return'👢';
  if(t.includes('máscara ritual')||t.includes('mascara ritual'))return'🎭';
  if(t.includes('máscara')||t.includes('mascara'))return'🎭';
  if(t.includes('anel'))return'💍';
  if(t.includes('amuleto')||t.includes('colar')||t.includes('pingente')||t.includes('talismã')||t.includes('talisma'))return'📿';
  if(t.includes('cinto'))return'🪢';
  if(t.includes('mochila')||t.includes('alforge'))return'🎒';
  if(t.includes('bolsa')||t.includes('saco'))return'👜';
  if(t.includes('capa'))return'🦇';
  if(t.includes('prótese')||t.includes('protese'))return'🦾';
  if(t.includes('poção de cura')||t.includes('pocao de cura'))return'🧪';
  if(t.includes('poção de mana')||t.includes('pocao de mana'))return'🔵';
  if(t.includes('veneno'))return'☠️';
  if(t.includes('antídoto')||t.includes('antidoto'))return'💚';
  if(t.includes('pão')||t.includes('pao'))return'🍞';
  if(t.includes('comida')||t.includes('ração')||t.includes('racao'))return'🍖';
  if(t.includes('água')||t.includes('agua'))return'💧';
  if(t.includes('vinho'))return'🍷';
  if(t.includes('cerveja'))return'🍺';
  if(t.includes('erva'))return'🌿';
  if(t.includes('cogumelo'))return'🍄';
  if(t.includes('cristal mágico')||t.includes('cristal magico'))return'🔮';
  if(t.includes('bomba de fumaça')||t.includes('bomba de fumaca'))return'💨';
  if(t.includes('poção')||t.includes('pocao')||t.includes('elixir')||t.includes('frasco estranho')||t.includes('ampola'))return'🧪';
  if(t.includes('livro proibido'))return'📕';
  if(t.includes('livro mágico')||t.includes('livro magico'))return'📖';
  if(t.includes('grimório')||t.includes('grimorio'))return'📚';
  if(t.includes('pergaminho'))return'📜';
  if(t.includes('runa'))return'🔯';
  if(t.includes('orb'))return'🔮';
  if(t.includes('pedra encantada')||t.includes('gema mágica'))return'💎';
  if(t.includes('relíquia')||t.includes('reliquia')||t.includes('artefato'))return'🏺';
  if(t.includes('chave mágica')||t.includes('chave magica'))return'🗝️';
  if(t.includes('lanterna mágica')||t.includes('lanterna magica'))return'🏮';
  if(t.includes('coração demoníaco')||t.includes('coracao demoniaco'))return'❤️‍🔥';
  if(t.includes('fragmento de alma'))return'👻';
  if(t.includes('corda'))return'🪢';
  if(t.includes('tocha'))return'🔥';
  if(t.includes('lanterna'))return'🏮';
  if(t.includes('pá')||t.includes('picareta'))return'⛏️';
  if(t.includes('binóculo')||t.includes('binoculo'))return'🔭';
  if(t.includes('bússola')||t.includes('bussola'))return'🧭';
  if(t.includes('mapa'))return'🗺️';
  if(t.includes('chave'))return'🔑';
  if(t.includes('algema'))return'⛓️';
  if(t.includes('ferramenta')||t.includes('alicate')||t.includes('chave de fenda'))return'🧰';
  if(t.includes('canivete'))return'🔪';
  if(t.includes('frasco'))return'🧴';
  if(t.includes('ampulheta'))return'⏳';
  if(t.includes('moeda'))return'🪙';
  if(t.includes('ouro')||t.includes('barra de ouro'))return'🥇';
  if(t.includes('rubi'))return'♦️';
  if(t.includes('esmeralda'))return'💚';
  if(t.includes('safira'))return'💙';
  if(t.includes('gema')||t.includes('diamante'))return'💎';
  if(t.includes('tesouro'))return'🏴‍☠️';
  if(t.includes('baú')||t.includes('bau'))return'📦';
  if(t.includes('joia')||t.includes('jóia')||t.includes('coroa'))return'👑';
  if(t.includes('crânio')||t.includes('cranio')||t.includes('caveira'))return'💀';
  if(t.includes('osso'))return'🦴';
  if(t.includes('olho'))return'👁️';
  if(t.includes('mão decepada')||t.includes('mao decepada'))return'✋';
  if(t.includes('sangue'))return'🩸';
  if(t.includes('vela'))return'🕯️';
  if(t.includes('boneca amaldiçoada')||t.includes('boneca amaldicoada'))return'🪆';
  if(t.includes('coração')||t.includes('coracao'))return'❤️';
  if(t.includes('rosa'))return'🌹';
  if(t.includes('flor'))return'🌸';
  if(t.includes('folha'))return'🍃';
  if(t.includes('madeira')||t.includes('tora'))return'🪵';
  if(t.includes('pedra'))return'🪨';
  if(t.includes('cristal'))return'💎';
  if(t.includes('pena'))return'🪶';
  if(t.includes('ovo'))return'🥚';
  if(t.includes('concha'))return'🐚';
  if(t.includes('raiz'))return'🌱';
  if(t.includes('chip'))return'💾';
  if(t.includes('drone'))return'🚁';
  if(t.includes('bateria'))return'🔋';
  if(t.includes('laser'))return'🔦';
  if(t.includes('óculos')||t.includes('oculos'))return'🥽';
  if(t.includes('seringa'))return'💉';
  if(t.includes('máscara de gás')||t.includes('mascara de gas'))return'😷';
  if(t.includes('braço mecânico')||t.includes('braco mecanico'))return'🦾';
  if(t.includes('núcleo de energia')||t.includes('nucleo de energia'))return'⚛️';
  if(t.includes('disco de dados'))return'💿';
  if(t.includes('terminal')||t.includes('computador'))return'💻';
  if(t.includes('dispositivo'))return'📱';
  if(t.includes('diário')||t.includes('diario'))return'📓';
  if(t.includes('carta'))return'💌';
  if(t.includes('relógio')||t.includes('relogio'))return'⌚';
  if(t.includes('instrumento')||t.includes('violino')||t.includes('alaúde')||t.includes('alaude'))return'🎻';
  if(t.includes('flauta'))return'🎶';
  if(t.includes('sino'))return'🔔';
  if(t.includes('boneco'))return'🧸';
  if(t.includes('caixa misteriosa')||t.includes('presente'))return'🎁';
  if(t.includes('arma'))return'⚔️';
  if(t.includes('roupa')||t.includes('túnica')||t.includes('tunica')||t.includes('veste')||t.includes('casaco'))return'🎽';
  return'📦';
}

function CompactEquipSlot({label, color, data, onChange, placeholder}){
  const d={nome:'',dano:'',tipo:placeholder,...(data||{})};
  const dynIcon=resolveEquipIcon(d.tipo||placeholder);
  return(
    <div style={{background:`${color}07`,border:`1px solid ${color}20`,borderRadius:9,padding:'9px 11px',display:'flex',flexDirection:'column',gap:6}}>
      <div style={{fontSize:8,letterSpacing:'0.3em',color:`${color}99`,fontFamily:'Cinzel,serif',textTransform:'uppercase',marginBottom:1}}>{label}</div>
      <div style={{display:'flex',alignItems:'center',gap:7}}>
        <span style={{fontSize:17,flexShrink:0,lineHeight:1}}>{dynIcon}</span>
        <input value={d.nome} onChange={e=>onChange({...d,nome:e.target.value})} placeholder="Nome do item..." style={{flex:1,fontSize:13,padding:'4px 7px'}}/>
      </div>
      <div className="equip-slot-inputs" style={{display:'flex',gap:6}}>
        <input value={d.dano} onChange={e=>onChange({...d,dano:e.target.value})} placeholder="Dano / Ex: 1D6" style={{flex:1,fontSize:12,padding:'3px 7px',color:'rgba(255,200,80,0.85)'}}/>
        <input value={d.tipo} onChange={e=>onChange({...d,tipo:e.target.value})} placeholder={placeholder} style={{flex:1,fontSize:12,padding:'3px 7px',color:'rgba(200,184,160,0.6)'}}/>
      </div>
    </div>
  );
}

function CharSilhouette({color, classeId}){
  const head=<ellipse cx="30" cy="11" rx="7" ry="8" stroke={color} strokeWidth="1.2" fill="none"/>;
  const neck=<line x1="30" y1="19" x2="30" y2="25" stroke={color} strokeWidth="1.2"/>;
  const torso=<path d="M17 33 L15 60 Q15 63 19 63 L41 63 Q45 63 45 60 L43 33" stroke={color} strokeWidth="1.2" fill="none"/>;
  const belt=<line x1="16" y1="57" x2="44" y2="57" stroke={color} strokeWidth="1.3" strokeDasharray="3 2"/>;
  const legs=<><path d="M22 63 L19 88 L18 102" stroke={color} strokeWidth="1.2" fill="none"/><path d="M38 63 L41 88 L42 102" stroke={color} strokeWidth="1.2" fill="none"/></>;
  const boots=<><path d="M18 102 Q16 106 13 106 Q11 106 12 104 L14 102 L20 101" stroke={color} strokeWidth="1" fill="none"/><path d="M42 102 Q44 106 47 106 Q49 106 48 104 L46 102 L40 101" stroke={color} strokeWidth="1" fill="none"/></>;

  let arms, weapons, shoulders;
  switch(classeId){
    case 'escarlate': 
      shoulders=<path d="M10 32 Q18 26 30 25 Q42 26 50 32" stroke={color} strokeWidth="1.6" fill="none"/>;
      arms=<><path d="M17 33 L9 50 L11 55" stroke={color} strokeWidth="1.2" fill="none"/><path d="M43 33 L51 50 L49 55" stroke={color} strokeWidth="1.2" fill="none"/></>;
      weapons=<>
        <rect x="3" y="49" width="10" height="13" rx="2" stroke={color} strokeWidth="1.2" fill="none"/>
        <line x1="8" y1="49" x2="8" y2="62" stroke={color} strokeWidth="0.7"/>
        <line x1="50" y1="43" x2="56" y2="67" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="47" y1="53" x2="59" y2="57" stroke={color} strokeWidth="1.2"/>
      </>;
      break;
    case 'corvos': 
      shoulders=<path d="M12 31 Q18 26 30 25 Q42 26 48 31" stroke={color} strokeWidth="1.2" fill="none"/>;
      arms=<><path d="M17 33 L10 52 L12 56" stroke={color} strokeWidth="1.2" fill="none"/><path d="M43 33 L51 46 L50 56" stroke={color} strokeWidth="1.2" fill="none"/></>;
      weapons=<>
        <path d="M51 39 Q58 48 51 57" stroke={color} strokeWidth="1.5" fill="none"/>
        <line x1="51" y1="39" x2="51" y2="57" stroke={color} strokeWidth="0.8" strokeDasharray="2 1"/>
        <line x1="20" y1="46" x2="51" y2="48" stroke={color} strokeWidth="0.9"/>
        <polygon points="18,46 22,44 22,48" fill={color} opacity="0.7"/>
        <rect x="3" y="48" width="5" height="14" rx="2" stroke={color} strokeWidth="1" fill="none"/>
      </>;
      break;
    case 'magos': 
      shoulders=<path d="M13 32 Q18 26 30 25 Q42 26 47 32" stroke={color} strokeWidth="1.2" fill="none"/>;
      arms=<><path d="M17 33 L10 52 L13 56" stroke={color} strokeWidth="1.2" fill="none"/><path d="M43 33 L50 46 L48 55" stroke={color} strokeWidth="1.2" fill="none"/></>;
      weapons=<>
        <path d="M17 33 L12 63 Q14 66 19 65 L41 65 Q46 66 48 63 L43 33" stroke={color} strokeWidth="1.2" fill="none" opacity="0.5"/>
        <line x1="10" y1="28" x2="13" y2="72" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="10" cy="27" r="4" stroke={color} strokeWidth="1" fill="none"/>
        <circle cx="10" cy="27" r="1.5" fill={color} opacity="0.7"/>
        <circle cx="49" cy="55" r="4" stroke={color} strokeWidth="1" fill="none" opacity="0.6"/>
      </>;
      break;
    case 'marfim': 
      shoulders=<path d="M13 32 Q18 26 30 25 Q42 26 47 32" stroke={color} strokeWidth="1.2" fill="none"/>;
      arms=<><path d="M17 33 L10 50 L13 55" stroke={color} strokeWidth="1.2" fill="none"/><path d="M43 33 L51 48 L49 55" stroke={color} strokeWidth="1.2" fill="none"/></>;
      weapons=<>
        <rect x="6" y="50" width="9" height="5" rx="1.5" stroke={color} strokeWidth="1" fill="none"/>
        <line x1="15" y1="52" x2="19" y2="52" stroke={color} strokeWidth="1.2"/>
        <line x1="9" y1="50" x2="9" y2="47" stroke={color} strokeWidth="0.9"/>
        <path d="M49 49 L55 43" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="56" cy="42" r="3" stroke={color} strokeWidth="1" fill="none"/>
        <line x1="50" y1="56" x2="54" y2="52" stroke={color} strokeWidth="1.3"/>
      </>;
      break;
    default: 
      shoulders=<path d="M14 32 Q18 26 30 25 Q42 26 46 32" stroke={color} strokeWidth="1.2" fill="none"/>;
      arms=<><path d="M17 33 L9 49 L11 55" stroke={color} strokeWidth="1.2" fill="none"/><path d="M43 33 L51 49 L49 55" stroke={color} strokeWidth="1.2" fill="none"/></>;
      weapons=<>
        <line x1="8" y1="44" x2="8" y2="66" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="5" y1="51" x2="11" y2="51" stroke={color} strokeWidth="1.2"/>
        <line x1="52" y1="44" x2="52" y2="66" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="49" y1="51" x2="55" y2="51" stroke={color} strokeWidth="1.2"/>
      </>;
  }
  return(
    <svg width="66" height="116" viewBox="0 0 66 116" fill="none" xmlns="http://www.w3.org/2000/svg" style={{opacity:0.32,flexShrink:0}}>
      {head}{neck}{shoulders||<path d="M12 32 Q18 26 30 25 Q42 26 48 32" stroke={color} strokeWidth="1.2" fill="none"/>}
      {torso}{belt}{arms}{weapons}{legs}{boots}
    </svg>
  );
}

function EquipamentoPanel({sheet, onChange, sheetColor}){
  const f=(slot,val)=>onChange({...sheet,[slot]:val});
  const cls=CLASSES.find(c=>c.id===sheet.classe)||CLASSES[0];
  return(
    <div style={{marginBottom:16}}>
      <div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:10,textTransform:'uppercase',display:'flex',alignItems:'center',gap:8}}>
        <span style={{color:sheetColor}}>⚔</span> Equipamentos
      </div>
      <div className="equip-grid" style={{
        display:'grid',
        gridTemplateColumns:'1fr 90px 1fr',
        gap:12,
        alignItems:'start',
        justifyContent:'center',
        marginBottom:10
      }}>
        <div style={{minWidth:0}}>
          <CompactEquipSlot label="Mão Esquerda" color={sheetColor} data={sheet.equip_mao_esq} onChange={v=>f('equip_mao_esq',v)} placeholder="Espada / Arma"/>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,justifySelf:'center'}}>
          <CharSilhouette color={sheetColor} classeId={sheet.classe}/>
          <div style={{fontSize:7,color:sheetColor+'55',fontFamily:'Cinzel,serif',letterSpacing:'0.1em',textAlign:'center',textTransform:'uppercase'}}>ESQ · DIR</div>
        </div>
        <div style={{minWidth:0}}>
          <CompactEquipSlot label="Mão Direita" color={sheetColor} data={sheet.equip_mao_dir} onChange={v=>f('equip_mao_dir',v)} placeholder="Escudo / Arma"/>
        </div>
      </div>
      <CompactEquipSlot label="Corpo" color={sheetColor} data={sheet.equip_corpo} onChange={v=>f('equip_corpo',v)} placeholder="Armadura / Roupa"/>
    </div>
  );
}

// ─── HABILIDADES PANEL (ficha do personagem) ──────────────────────────────────
const newCustomAbility=()=>({id:Date.now()+Math.random(),nome:'',custo:2,cooldown:'—',dano:'',descricao:'',tipoHab:'normal',req:1});

function HabilidadesPanel({cls, sheet, customAbilities, masterMode, onSaveCustomAbilities}){
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState(newCustomAbility());
  const nivel=sheet.nivel||1;
  const classCustom=(customAbilities[cls.id]||[]);

  const handleSave=()=>{
    if(!form.nome.trim())return;
    const updated={...customAbilities,[cls.id]:[...(customAbilities[cls.id]||[]),{...form,id:Date.now()}]};
    onSaveCustomAbilities(updated);
    setForm(newCustomAbility());
  };
  const handleDelete=(abilityId)=>{
    const updated={...customAbilities,[cls.id]:(customAbilities[cls.id]||[]).filter(a=>a.id!==abilityId)};
    onSaveCustomAbilities(updated);
  };

  const color=cls.color;
  const tipoLabel={normal:'Normal',especial:'Especial',passiva:'Passiva'};
  const tipoBadgeColor={normal:'rgba(255,255,255,0.5)',especial:color,passiva:'rgba(168,85,247,0.8)'};

    const abilityRow=(a,isSpecial,isCustom,locked)=>{
    const danoValue=a.dano||a.roll||''; 
    return(
    <div key={a.id||a.name} style={{background:isSpecial||isCustom?`${color}09`:'rgba(255,255,255,0.02)',border:`1px solid ${isSpecial||isCustom?color+'22':'rgba(255,255,255,0.06)'}`,borderRadius:8,padding:'9px 12px',display:'flex',gap:10,alignItems:'flex-start',opacity:locked?0.45:1}}>
      <div style={{flex:1}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3,flexWrap:'wrap'}}>
          {(isSpecial||isCustom)&&<span style={{fontSize:10,color}}>✦</span>}
          <span style={{fontFamily:'Cinzel,serif',fontSize:12,color:'#C8B8A0',fontWeight:600}}>{a.name||a.nome}</span>
          {locked&&<span style={{fontSize:9,color:'rgba(255,200,0,0.5)',fontFamily:'Cinzel,serif'}}>🔒 Nv {a.req}+</span>}
          {isCustom&&a.tipoHab&&<span style={{fontSize:8,color:tipoBadgeColor[a.tipoHab]||color,fontFamily:'Cinzel,serif',letterSpacing:'0.12em',background:`${color}14`,borderRadius:3,padding:'1px 5px',border:`1px solid ${color}33`}}>{(tipoLabel[a.tipoHab]||'Nova').toUpperCase()}</span>}
          {danoValue&&<span style={{fontSize:10,color:'rgba(255,200,80,0.85)',fontFamily:'Cinzel,serif',letterSpacing:'0.05em',background:'rgba(255,200,80,0.08)',border:'1px solid rgba(255,200,80,0.22)',borderRadius:4,padding:'1px 6px'}}>⚔ {danoValue}</span>}
        </div>
        <div style={{fontSize:13,color:'#7A6A5A',lineHeight:1.65}}>{a.desc||a.descricao}</div>
      </div>
      <div style={{flexShrink:0,textAlign:'right',display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
        <div style={{fontSize:11,color:`${color}BB`,fontFamily:'Cinzel,serif'}}>{a.cost||a.custo} VC</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.18)'}}>⏱ {a.cooldown}</div>
        {a.req&&!isCustom&&<div style={{fontSize:10,color:'rgba(255,255,255,0.16)'}}>Nív {a.req}+</div>}
        {isCustom&&masterMode&&(
          <button onClick={()=>handleDelete(a.id)} style={{background:'rgba(232,25,60,0.1)',border:'1px solid rgba(232,25,60,0.25)',color:'#E8193C',borderRadius:4,cursor:'pointer',padding:'1px 6px',fontSize:10}}>✕</button>
        )}
      </div>
    </div>
    );
  };
  const TipoBtn=({val,label:l})=>(
    <button onClick={()=>setForm(f=>({...f,tipoHab:val}))} style={{flex:1,padding:'5px 4px',borderRadius:5,border:`1px solid ${form.tipoHab===val?color+'66':'rgba(255,255,255,0.1)'}`,background:form.tipoHab===val?`${color}18`:'rgba(255,255,255,0.02)',color:form.tipoHab===val?color:'#6A5A7A',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.06em',transition:'all 0.15s'}}>{l}</button>
  );

  return(
    <div style={{marginBottom:14,border:`1px solid ${open?color+'33':'rgba(255,255,255,0.07)'}`,borderRadius:10,overflow:'hidden',transition:'border-color 0.2s'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:'100%',padding:'12px 16px',display:'flex',alignItems:'center',gap:10,background:open?`${color}08`:'rgba(255,255,255,0.02)',border:'none',cursor:'pointer',textAlign:'left'}}>
        <span style={{fontSize:15,color}}>{cls.icon}</span>
        <span style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#C8B8A0',fontWeight:600,flex:1}}>Habilidades — {cls.name}</span>
        <span style={{fontSize:10,color:`${color}66`,fontFamily:'Cinzel,serif'}}>{classCustom.length>0?`+${classCustom.length} nova${classCustom.length>1?'s':''}`:''}</span>
        <span style={{color:`${color}88`,fontSize:11,transform:open?'rotate(90deg)':'none',transition:'transform 0.3s'}}>▶</span>
      </button>
      {open&&(
        <div style={{padding:'0 14px 14px'}}>
          <div style={{height:8}}/>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:9,letterSpacing:'0.3em',color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Passiva</div>
            <div style={{background:`${color}0D`,border:`1px solid ${color}28`,borderRadius:8,padding:'9px 12px'}}>
              <div style={{fontFamily:'Cinzel,serif',fontSize:12,color,fontWeight:600,marginBottom:3}}>{cls.passive.name}</div>
              <div style={{fontSize:13,color:'#7A6A5A',lineHeight:1.65}}>{cls.passive.desc}</div>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:9,letterSpacing:'0.3em',color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Ataques Normais — 2 VC cada</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>{cls.normal.map(a=>abilityRow(a,false,false,false))}</div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:9,letterSpacing:'0.3em',color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Especiais — 3 VC cada</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>{cls.specials.map(a=>abilityRow(a,true,false,nivel<a.req))}</div>
          </div>
          {classCustom.length>0&&(
            <div style={{marginBottom:10}}>
              <div style={{fontSize:9,letterSpacing:'0.3em',color:`${color}88`,fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Desbloqueadas pelo Mestre</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>{classCustom.map(a=>abilityRow(a,false,true,a.req&&nivel<a.req))}</div>
            </div>
          )}
          {masterMode&&(
            <div style={{border:`1px solid ${color}30`,borderRadius:10,padding:'14px',background:`${color}05`,marginTop:4}}>
              <div style={{fontSize:9,letterSpacing:'0.35em',color:`${color}AA`,fontFamily:'Cinzel,serif',marginBottom:12,textTransform:'uppercase'}}>✦ Adicionar Habilidade Nova · {cls.name}</div>
              <div style={{display:'flex',flexDirection:'column',gap:9}}>
                <div>
                  <label style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.22em'}}>Nome da Habilidade</label>
                  <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Golpe Cósmico" style={{width:'100%'}}/>
                </div>
                <div>
                  <label style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:'0.22em'}}>Tipo de Habilidade</label>
                  <div style={{display:'flex',gap:6}}>
                    <TipoBtn val="normal" label="Normal"/>
                    <TipoBtn val="especial" label="Especial"/>
                    <TipoBtn val="passiva" label="Passiva"/>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div>
                    <label style={{fontSize:9,color:'rgba(255,200,80,0.5)',fontFamily:'Cinzel,serif',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.22em'}}>Dano / Efeito</label>
                    <input value={form.dano} onChange={e=>setForm(f=>({...f,dano:e.target.value}))} placeholder="Ex: 1D8, 3D4, +2 vida" style={{width:'100%'}}/>
                  </div>
                  <div>
                    <label style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.22em'}}>Custo VC</label>
                    <input type="number" min={0} value={form.custo} onChange={e=>setForm(f=>({...f,custo:+e.target.value}))} style={{width:'100%'}}/>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div>
                    <label style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.22em'}}>Cooldown / Rodadas</label>
                    <input value={form.cooldown} onChange={e=>setForm(f=>({...f,cooldown:e.target.value}))} placeholder="Ex: 3 rodadas" style={{width:'100%'}}/>
                  </div>
                  <div>
                    <label style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.22em'}}>Nível Mínimo</label>
                    <input type="number" min={1} max={30} value={form.req} onChange={e=>setForm(f=>({...f,req:+e.target.value}))} style={{width:'100%'}}/>
                  </div>
                </div>
                <div>
                  <label style={{fontSize:9,color:'rgba(255,255,255,0.3)',fontFamily:'Cinzel,serif',display:'block',marginBottom:3,textTransform:'uppercase',letterSpacing:'0.22em'}}>Descrição</label>
                  <textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Descreva o efeito, duração, condições especiais, área de alcance..." rows={3} style={{width:'100%',resize:'vertical',lineHeight:1.7}}/>
                </div>
                <button onClick={handleSave} disabled={!form.nome.trim()} style={{padding:'8px',borderRadius:7,border:`1px solid ${color}55`,background:form.nome.trim()?`${color}20`:'rgba(255,255,255,0.03)',color:form.nome.trim()?color:'#5A5070',cursor:form.nome.trim()?'pointer':'not-allowed',fontFamily:'Cinzel,serif',fontSize:12,letterSpacing:'0.1em',fontWeight:600,transition:'all 0.2s'}}>
                  ✦ Salvar Habilidade em {cls.name}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── FICHAS DOS PERSONAGENS ───────────────────────────────────────────────────
const newSheet=id=>({id,nome:'',classe:'fogo',nivel:1,xp:0,hp:10,hp_bonus:0,vigos:5,forca:0,agilidade:0,durabilidade:0,inteligencia:0,percepcao:0,especial1:false,especial2:false,lore_personagem:'',notas:'',foto:'',equip_mao_esq:{nome:'',dano:'',tipo:'Espada / Arma'},equip_mao_dir:{nome:'',dano:'',tipo:'Escudo / Arma'},equip_corpo:{nome:'',dano:'',tipo:'Armadura / Roupa'}});

function SheetFull({sheet,onChange,masterMode,customAbilities,onSaveCustomAbilities}){
  const cls=CLASSES.find(c=>c.id===sheet.classe)||CLASSES[0];
  const sheetColor=SHEET_COLORS[sheet.classe]||cls.color;
  const sheetGlow=SHEET_GLOWS[sheet.classe]||cls.glow;
  const label=v=>v<=3?'Aprendiz Cósmico':v<=6?'Portador do Destino':v<=9?'Arauto do Fim':v<=14?'Guardião Estelar':v<=19?'Ascendente':v<=24?'Transcendente':v<=29?'Arauto Supremo':'Lenda Cósmica';
  const f=(k,v)=>onChange({...sheet,[k]:v});
  const hp=sheet.hp||0;const hpBonus=sheet.hp_bonus||0;
  const photoInputRef=useRef(null);
  const handlePhotoFile=async e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=async ev=>{const compressed=await compressImage(ev.target.result,900,900,0.75);f('foto',compressed);};reader.readAsDataURL(file);};
  const attrBonus=val=>Math.floor(val/2);
  return(
    <div style={{border:`1px solid ${sheetColor}44`,borderRadius:16,overflow:'hidden',background:'rgba(8,10,22,0.95)',boxShadow:`0 6px 32px ${sheetGlow}`}}>
      <div style={{height:4,background:`linear-gradient(90deg,${sheetColor},${sheetColor}44,transparent)`}}/>
      <div onClick={()=>photoInputRef.current?.click()} style={{position:'relative',width:'100%',cursor:'pointer',background:'#04060F',overflow:'hidden',minHeight:sheet.foto?0:130}}>
        {sheet.foto
          ?<img src={sheet.foto} alt="personagem" style={{width:'100%',display:'block',objectFit:'contain',background:'#04060F'}}/>
          :<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'36px 20px',gap:10}}>
            <div style={{fontSize:40,opacity:0.15}}>📷</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.18)',fontFamily:'Cinzel,serif',letterSpacing:'0.08em',textAlign:'center'}}>Toque para adicionar a foto do personagem</div>
          </div>
        }
        {sheet.foto&&<div style={{position:'absolute',bottom:0,left:0,right:0,height:'30%',background:'linear-gradient(to bottom,transparent,rgba(4,6,15,0.95))',pointerEvents:'none'}}/>}
        {sheet.foto&&<div style={{position:'absolute',bottom:16,left:20,right:20}}>
          <div style={{fontFamily:'Cinzel Decorative,serif',fontSize:22,fontWeight:700,color:sheetColor,textShadow:`0 0 24px ${sheetColor}88`}}>{sheet.nome||'Sem nome'}</div>
          <div style={{fontSize:12,color:'rgba(255,255,255,0.55)',marginTop:4,fontFamily:'Cinzel,serif'}}>{cls.icon} {cls.name} · Nv {sheet.nivel} · {label(sheet.nivel)}</div>
        </div>}
        <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoFile} style={{display:'none'}}/>
      </div>
      <div style={{padding:'18px'}}>
        <div className="nome-classe-row" style={{display:'flex',gap:10,alignItems:'flex-end',marginBottom:16,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:120}}><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Nome</label><input value={sheet.nome} onChange={e=>f('nome',e.target.value)} placeholder="Nome do personagem" style={{width:'100%'}}/></div>
          <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Classe</label><select value={sheet.classe} onChange={e=>f('classe',e.target.value)}>{CLASSES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>
          {masterMode&&<button onClick={()=>onChange(null)} style={{background:'rgba(232,25,60,0.12)',border:'1px solid rgba(232,25,60,0.35)',color:'#E8193C',borderRadius:6,cursor:'pointer',padding:'6px 11px',fontSize:12}}>✕ Excluir</button>}
        </div>
        <div className="sheet-stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(138px,1fr))',gap:9,marginBottom:16}}>
          <div style={{background:'rgba(232,25,60,0.07)',border:'1px solid rgba(232,25,60,0.2)',borderRadius:10,padding:'12px 14px'}}>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:'#E8193C',fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Pontos de Vida</div>
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              <button onClick={()=>f('hp',Math.max(0,hp-1))} style={{width:26,height:26,borderRadius:5,border:'1px solid rgba(232,25,60,0.3)',background:'rgba(232,25,60,0.1)',color:'#E8193C',cursor:'pointer',fontSize:16,lineHeight:1,padding:0}}>−</button>
              <span style={{fontFamily:'Cinzel,serif',fontSize:22,fontWeight:700,color:'#E8193C',minWidth:30,textAlign:'center'}}>{hp}</span>
              <button onClick={()=>f('hp',hp+1)} style={{width:26,height:26,borderRadius:5,border:'1px solid rgba(232,25,60,0.3)',background:'rgba(232,25,60,0.1)',color:'#E8193C',cursor:'pointer',fontSize:16,lineHeight:1,padding:0}}>+</button>
            </div>
            <div style={{marginTop:6,height:3,background:'rgba(255,255,255,0.06)',borderRadius:2}}><div style={{height:'100%',width:`${Math.min(100,(hp/Math.max(1,hp+hpBonus))*100)}%`,background:'#E8193C',borderRadius:2,transition:'width 0.3s'}}/></div>
            <div style={{marginTop:10,paddingTop:8,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{fontSize:9,letterSpacing:'0.25em',color:'rgba(74,222,128,0.7)',fontFamily:'Cinzel,serif',marginBottom:5,textTransform:'uppercase'}}>Vida Bônus</div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <button onClick={()=>f('hp_bonus',Math.max(0,hpBonus-1))} style={{width:22,height:22,borderRadius:4,border:'1px solid rgba(74,222,128,0.3)',background:'rgba(74,222,128,0.08)',color:'#4ADE80',cursor:'pointer',fontSize:14,lineHeight:1,padding:0}}>−</button>
                <span style={{fontFamily:'Cinzel,serif',fontSize:16,fontWeight:700,color:'#4ADE80',minWidth:24,textAlign:'center'}}>{hpBonus}</span>
                <button onClick={()=>f('hp_bonus',hpBonus+1)} style={{width:22,height:22,borderRadius:4,border:'1px solid rgba(74,222,128,0.3)',background:'rgba(74,222,128,0.08)',color:'#4ADE80',cursor:'pointer',fontSize:14,lineHeight:1,padding:0}}>+</button>
              </div>
              <div style={{marginTop:5,height:3,background:'rgba(255,255,255,0.06)',borderRadius:2}}><div style={{height:'100%',width:`${hpBonus>0?Math.min(100,(hpBonus/Math.max(1,hp))*100):0}%`,background:'#4ADE80',borderRadius:2,transition:'width 0.3s'}}/></div>
              <div style={{fontSize:9,color:'rgba(74,222,128,0.4)',marginTop:3,fontFamily:'Cinzel,serif'}}>curas · itens · status</div>
            </div>
          </div>
          <div style={{background:'rgba(232,160,32,0.07)',border:'1px solid rgba(232,160,32,0.2)',borderRadius:10,padding:'12px 14px'}}>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:'#E8A020',fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Nível · XP</div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <input type="number" min={1} max={30} value={sheet.nivel} onChange={e=>f('nivel',Math.min(30,Math.max(1,+e.target.value)))} style={{width:44,textAlign:'center'}}/>
              <span style={{color:'rgba(255,255,255,0.14)',fontSize:11}}>Nv</span>
              <input type="number" min={0} value={sheet.xp} onChange={e=>f('xp',+e.target.value)} style={{width:65,textAlign:'center'}}/>
              <span style={{fontSize:11,color:'rgba(255,255,255,0.18)'}}>XP</span>
            </div>
            <div style={{fontSize:10,color:'#7A6A5A',marginTop:6,fontFamily:'Cinzel,serif'}}>{label(sheet.nivel)}</div>
          </div>
          <div style={{background:`${sheetColor}09`,border:`1px solid ${sheetColor}24`,borderRadius:10,padding:'12px 14px'}}>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:sheetColor,fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Vigor Cósmico</div>
            <VigosWithLocked value={sheet.vigos||0} nivel={sheet.nivel||1} color={sheetColor} onChange={v=>f('vigos',v)}/>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.18)',marginTop:5}}>+2 por turno</div>
            {sheet.nivel>=8&&sheet.nivel<18&&<div style={{fontSize:9,color:'rgba(255,200,0,0.5)',marginTop:3,fontFamily:'Cinzel,serif'}}>✦ +1 VC desbloqueado (Nv 8)</div>}
            {sheet.nivel>=18&&<div style={{fontSize:9,color:'rgba(255,200,0,0.5)',marginTop:3,fontFamily:'Cinzel,serif'}}>✦ +2 VC desbloqueados (Nv 8 e 18)</div>}
          </div>
        </div>
        <div style={{marginBottom:15}}>
          <div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:9,textTransform:'uppercase'}}>Atributos</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {ATTRS.map(a=>{const bonus=attrBonus(sheet[a.key]||0);return(
              <div key={a.key} style={{display:'flex',alignItems:'center',gap:8}}>
                <span className="attr-label" style={{fontSize:11,fontFamily:'Cinzel,serif',color:a.color,minWidth:92,letterSpacing:'0.03em'}}>{a.label}</span>
                <AttrDots value={sheet[a.key]||0} color={a.color} onChange={v=>f(a.key,v)}/>
                <span style={{fontSize:11,color:'rgba(255,255,255,0.22)',minWidth:16,textAlign:'right'}}>{sheet[a.key]||0}</span>
                <span style={{fontSize:11,fontFamily:'Cinzel,serif',fontWeight:700,color:bonus>0?a.color:'rgba(255,255,255,0.12)',minWidth:26,textAlign:'center',background:bonus>0?`${a.color}15`:'transparent',borderRadius:4,padding:'1px 4px',border:bonus>0?`1px solid ${a.color}33`:'1px solid transparent',transition:'all 0.2s'}}>
                  {bonus>0?`+${bonus}`:'—'}
                </span>
              </div>
            );})}
          </div>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.15)',marginTop:6,fontFamily:'Cinzel,serif',letterSpacing:'0.05em'}}>a cada 2 pontos = +1 bônus</div>
        </div>
        <div style={{marginBottom:14}}>
          <div className="sheet-specials-row" style={{display:'flex',alignItems:'center',gap:12,marginBottom:9,flexWrap:'wrap'}}>
            <div style={{display:'flex',gap:9,flexWrap:'wrap',flex:1}}>
              {cls.specials.map((sp,i)=>{const key=i===0?'especial1':'especial2';const unlocked=sheet[key];const canUnlock=i===0?sheet.nivel>=3:sheet.nivel>=7;return(<button key={i} onClick={()=>f(key,!unlocked)} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 12px',borderRadius:7,border:`1px solid ${unlocked?sheetColor+'55':'rgba(255,255,255,0.09)'}`,background:unlocked?`${sheetColor}14`:'rgba(255,255,255,0.02)',cursor:canUnlock?'pointer':'not-allowed',opacity:canUnlock?1:0.5,transition:'all 0.2s'}}><span style={{fontSize:12}}>{unlocked?'✦':'○'}</span><div style={{textAlign:'left'}}><div style={{fontSize:11,color:unlocked?sheetColor:'#6A5A6A',fontFamily:'Cinzel,serif'}}>{sp.name}</div><div style={{fontSize:10,color:'rgba(255,255,255,0.18)'}}>Nível {sp.req}+{!canUnlock&&` (Atual: ${sheet.nivel})`}</div></div></button>);})}
            </div>
            <div style={{flexShrink:0,padding:'8px 14px',borderRadius:8,border:`1px solid ${sheetColor}33`,background:`${sheetColor}0A`,textAlign:'center'}}>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.25)',fontFamily:'Cinzel,serif',letterSpacing:'0.15em',marginBottom:3,textTransform:'uppercase'}}>Alcance</div>
              <div style={{fontSize:16,fontFamily:'Cinzel,serif',color:sheetColor,fontWeight:700}}>{cls.alcance}</div>
            </div>
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <HabilidadesPanel cls={cls} sheet={sheet} customAbilities={customAbilities} masterMode={masterMode} onSaveCustomAbilities={onSaveCustomAbilities}/>
        </div>

        <div style={{height:1,background:'rgba(255,255,255,0.05)',marginBottom:14}}/>
        <EquipamentoPanel sheet={sheet} onChange={onChange} sheetColor={sheetColor}/>

        <div style={{height:1,background:'rgba(255,255,255,0.05)',marginBottom:14}}/>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Lore do Personagem</div>
          <textarea value={sheet.lore_personagem||''} onChange={e=>f('lore_personagem',e.target.value)} placeholder="Escreva aqui a história, origem, motivações e segredos do seu personagem..." rows={4} style={{width:'100%',resize:'vertical',lineHeight:1.8}}/>
        </div>
        <div>
          <div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Itens & Inventário</div>
          <textarea value={sheet.notas||''} onChange={e=>f('notas',e.target.value)} placeholder="Liste outros itens carregados pelo personagem..." rows={3} style={{width:'100%',resize:'vertical'}}/>
        </div>
      </div>
    </div>
  );
}

function SheetsSection({masterMode}){
  const[sheets,setSheets]=useState([]);const[loaded,setLoaded]=useState(false);const[activeId,setActiveId]=useState(null);
  const[customAbilities,setCustomAbilities]=useState({});
  const saveTimeout=useRef({});
  useEffect(()=>{
    const u1=onSnapshot(collection(db,'sheets'),snap=>{const data=snap.docs.map(d=>({id:d.id,...d.data()}));setSheets(data);setLoaded(true);});
    const u2=onSnapshot(doc(db,'config','customAbilities'),snap=>{if(snap.exists())setCustomAbilities(snap.data()||{});});
    return()=>{u1();u2();};
  },[]);
  const saveSheet=sheet=>{clearTimeout(saveTimeout.current[sheet.id]);saveTimeout.current[sheet.id]=setTimeout(async()=>{try{await setDoc(doc(db,'sheets',String(sheet.id)),sheet);}catch(e){console.error('Erro ao salvar ficha:',e);}},900);};
  const add=()=>{if(sheets.length>=5)return;const s=newSheet(Date.now());setDoc(doc(db,'sheets',String(s.id)),s);setActiveId(String(s.id));};
  const upd=(id,data)=>{if(data===null){deleteDoc(doc(db,'sheets',String(id)));setActiveId(null);return;}setSheets(prev=>prev.map(s=>s.id===id?data:s));saveSheet(data);};
  const saveCustom=async(data)=>{try{await setDoc(doc(db,'config','customAbilities'),data);setCustomAbilities(data);}catch(e){console.error('Erro ao salvar habilidades:',e);}};
  const activeSheet=sheets.find(s=>String(s.id)===activeId);
  return(
    <div style={{maxWidth:820,margin:'0 auto',padding:'24px 14px 80px'}}>
      <div style={{textAlign:'center',marginBottom:20}}>
        <div style={{fontSize:11,letterSpacing:'0.4em',color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:10,textTransform:'uppercase'}}>Os Portadores do Destino</div>
        <h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:22,color:'#E8D8C0',fontWeight:700,margin:0}}>Fichas dos Personagens</h2>
        <div style={{fontSize:11,color:'#4A4050',marginTop:6,fontFamily:'Cinzel,serif'}}>✦ Selecione uma ficha · Sincronizado em tempo real</div>
        <div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(30,200,255,0.6),transparent)',margin:'12px auto 0'}}/>
      </div>
      {!loaded&&<div style={{textAlign:'center',color:'#5A5070',fontFamily:'Cinzel,serif',fontSize:13,padding:40}}>Conectando ao cosmos...</div>}
      {loaded&&(<>
        <div className="sheet-tabs-nav" style={{display:'flex',gap:6,marginBottom:20,overflowX:'auto',paddingBottom:2}}>
          {sheets.map(s=>{
            const cls=CLASSES.find(c=>c.id===s.classe)||CLASSES[0];
            const sc=SHEET_COLORS[s.classe]||cls.color;
            const isActive=String(s.id)===activeId;
            return(<button key={s.id} onClick={()=>setActiveId(isActive?null:String(s.id))}
              style={{display:'flex',alignItems:'center',gap:7,padding:'8px 14px',borderRadius:10,border:`1px solid ${isActive?sc+'66':sc+'28'}`,background:isActive?`${sc}15`:'rgba(255,255,255,0.02)',cursor:'pointer',transition:'all 0.2s',flexShrink:0,whiteSpace:'nowrap'}}>
              {s.foto?<img src={s.foto} alt="" style={{width:30,height:30,borderRadius:6,objectFit:'cover',border:`1.5px solid ${sc}44`}}/>:<div style={{width:30,height:30,borderRadius:6,background:`${sc}15`,border:`1.5px dashed ${sc}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>{cls.icon}</div>}
              <div style={{textAlign:'left'}}>
                <div style={{fontFamily:'Cinzel,serif',fontSize:12,fontWeight:700,color:isActive?sc:'#8A7A8A'}}>{s.nome||'Sem nome'}</div>
                <div style={{fontSize:10,color:'#5A5070',fontFamily:'Cinzel,serif'}}>Nv {s.nivel||1}</div>
              </div>
            </button>);
          })}
          {sheets.length<5&&(<button onClick={add} onMouseOver={e=>e.currentTarget.style.borderColor='rgba(168,85,247,0.4)'} onMouseOut={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'}
            style={{padding:'8px 16px',borderRadius:10,border:'1px dashed rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.01)',color:'#6A5A7A',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:'0.06em',flexShrink:0,transition:'border-color 0.2s'}}>
            + Novo Personagem
          </button>)}
        </div>
        {activeSheet
          ?<SheetFull sheet={activeSheet} onChange={d=>upd(activeSheet.id,d)} masterMode={masterMode} customAbilities={customAbilities} onSaveCustomAbilities={saveCustom}/>
          :<div style={{textAlign:'center',padding:44,border:'1px dashed rgba(255,255,255,0.06)',borderRadius:14}}>
            <div style={{fontSize:32,marginBottom:10,opacity:0.2}}>📋</div>
            <div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#6A5A7A'}}>Selecione um personagem acima para ver sua ficha.</div>
          </div>
        }
      </>)}
    </div>
  );
}

// ─── FICHAS DOS INIMIGOS ──────────────────────────────────────────────────────
const ENEMY_COLOR='#FF4444';const ENEMY_GLOW='rgba(255,68,68,0.18)';
const newEnemySkill=()=>({id:Date.now()+Math.random(),nome:'',descricao:'',dano:'',cost:0,tempo:'',tipo:'normal'});
const newEnemy=id=>({id,nome:'',tipo:'',hp:10,hp_bonus:0,vigos:10,alcance:'',forca:0,agilidade:0,durabilidade:0,inteligencia:0,percepcao:0,foto:'',habilidades:[newEnemySkill()],notas:''});

function EnemySkillEditor({skill,color,onChange,onDelete}){const update=(key,value)=>onChange({...skill,[key]:value});return(<div style={{background:'rgba(255,255,255,0.02)',border:`1px solid ${color}22`,borderRadius:10,padding:'12px 14px',display:'flex',flexDirection:'column',gap:10}}><div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}><div style={{flex:1,minWidth:160}}><label style={{fontSize:10,letterSpacing:'0.25em',color:'#7A4040',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Nome da habilidade</label><input value={skill.nome} onChange={e=>update('nome',e.target.value)} placeholder="Ex: Golpe Sombrio" style={{width:'100%'}}/></div><div style={{width:110}}><label style={{fontSize:10,letterSpacing:'0.25em',color:'#7A4040',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Dano</label><input value={skill.dano} onChange={e=>update('dano',e.target.value)} placeholder="Ex: 1D8+2" style={{width:'100%'}}/></div><div style={{width:90}}><label style={{fontSize:10,letterSpacing:'0.25em',color:'#7A4040',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Custo VC</label><input type="number" min={0} value={skill.cost} onChange={e=>update('cost',Number(e.target.value))} style={{width:'100%'}}/></div><div style={{width:120}}><label style={{fontSize:10,letterSpacing:'0.25em',color:'#7A4040',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Tempo</label><input value={skill.tempo} onChange={e=>update('tempo',e.target.value)} placeholder="Ex: 3 rodadas" style={{width:'100%'}}/></div><div style={{width:110}}><label style={{fontSize:10,letterSpacing:'0.25em',color:'#7A4040',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Tipo</label><select value={skill.tipo} onChange={e=>update('tipo',e.target.value)} style={{width:'100%'}}><option value="normal">Normal</option><option value="especial">Especial</option><option value="passiva">Passiva</option></select></div><button onClick={onDelete} style={{background:'rgba(232,25,60,0.1)',border:'1px solid rgba(232,25,60,0.3)',color:'#E8193C',borderRadius:6,cursor:'pointer',padding:'6px 10px',fontSize:12,height:34}}>✕</button></div><div><label style={{fontSize:10,letterSpacing:'0.25em',color:'#7A4040',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Descrição</label><textarea value={skill.descricao} onChange={e=>update('descricao',e.target.value)} placeholder="Descreva o efeito, alcance, condição ou comportamento desta habilidade..." rows={3} style={{width:'100%',resize:'vertical',lineHeight:1.7}}/></div><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:8}}><span style={{fontSize:10,color:color,fontFamily:'Cinzel,serif',letterSpacing:'0.12em'}}>{skill.tipo?.toUpperCase()||'HABILIDADE'}</span><div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}><span style={{fontSize:11,color:`${color}CC`,fontFamily:'Cinzel,serif'}}>⚔ {skill.dano||'sem dano'}</span><span style={{fontSize:11,color:`${color}CC`,fontFamily:'Cinzel,serif'}}>{skill.cost} VC</span><span style={{fontSize:10,color:'rgba(255,255,255,0.18)'}}>⏱ {skill.tempo||'—'}</span></div></div></div>);}

function EnemyCard({enemy,onChange,onDelete,masterMode}){
  const f=(k,v)=>onChange({...enemy,[k]:v});
  const hp=enemy.hp||0;const hpBonus=enemy.hp_bonus||0;
  const hpBarPct=Math.min(100,(hp/Math.max(50,hp))*100);
  const hpBonusBarPct=Math.min(100,(hpBonus/Math.max(20,hpBonus))*100);
  const photoRef=useRef(null);
  const handlePhoto=async e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=async ev=>{const c=await compressImage(ev.target.result,800,800,0.72);f('foto',c);};reader.readAsDataURL(file);};
  const attrBonus=val=>Math.floor(val/2);
  return(
    <div style={{border:`1px solid ${ENEMY_COLOR}44`,borderRadius:14,overflow:'hidden',background:'rgba(12,6,6,0.95)',marginBottom:18,boxShadow:`0 4px 24px ${ENEMY_GLOW}`}}>
      <div style={{height:3,background:`linear-gradient(90deg,${ENEMY_COLOR},transparent)`}}/>
      <div onClick={()=>photoRef.current?.click()} style={{position:'relative',width:'100%',cursor:'pointer',background:'rgba(0,0,0,0.4)',overflow:'hidden'}}>
        {enemy.foto?<img src={enemy.foto} alt="inimigo" style={{width:'100%',maxHeight:300,objectFit:'cover',objectPosition:'center top',display:'block'}}/>:<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'20px',opacity:0.35}}><span style={{fontSize:22}}>📷</span><span style={{fontSize:11,color:'rgba(255,255,255,0.5)',fontFamily:'Cinzel,serif'}}>Toque para adicionar imagem do inimigo</span></div>}
        {enemy.foto&&<div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 55%,rgba(12,6,6,0.85))',pointerEvents:'none'}}/>}
        {enemy.foto&&enemy.nome&&<div style={{position:'absolute',bottom:10,left:16,fontFamily:'Cinzel,serif',fontSize:16,fontWeight:700,color:ENEMY_COLOR,textShadow:'0 0 14px rgba(255,68,68,0.5)'}}>{enemy.nome}</div>}
        <input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}}/>
      </div>
      <div style={{padding:'16px 18px'}}>
        <div style={{display:'flex',gap:10,alignItems:'flex-end',marginBottom:16,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:130}}><label style={{fontSize:10,letterSpacing:'0.3em',color:'#7A4040',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Nome do Inimigo</label><input value={enemy.nome} onChange={e=>f('nome',e.target.value)} placeholder="Nome do inimigo..." style={{width:'100%'}}/></div>
          <div style={{flex:1,minWidth:110}}><label style={{fontSize:10,letterSpacing:'0.3em',color:'#7A4040',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Tipo / Origem</label><input value={enemy.tipo} onChange={e=>f('tipo',e.target.value)} placeholder="Ex: Humano, Entidade..." style={{width:'100%'}}/></div>
          {masterMode&&<button onClick={onDelete} style={{background:'rgba(232,25,60,0.1)',border:'1px solid rgba(232,25,60,0.3)',color:'#E8193C',borderRadius:6,cursor:'pointer',padding:'6px 11px',fontSize:12}}>✕</button>}
        </div>
        <div className="enemy-stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:9,marginBottom:16}}>
          <div style={{background:'rgba(232,25,60,0.09)',border:'1px solid rgba(232,25,60,0.25)',borderRadius:10,padding:'12px 14px'}}>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:'#E8193C',fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Pontos de Vida</div>
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              <button onClick={()=>f('hp',Math.max(0,hp-1))} style={{width:26,height:26,borderRadius:5,border:'1px solid rgba(232,25,60,0.3)',background:'rgba(232,25,60,0.1)',color:'#E8193C',cursor:'pointer',fontSize:16,lineHeight:1,padding:0}}>−</button>
              <span style={{fontFamily:'Cinzel,serif',fontSize:22,fontWeight:700,color:'#E8193C',minWidth:36,textAlign:'center'}}>{hp}</span>
              <button onClick={()=>f('hp',Math.min(400,hp+1))} style={{width:26,height:26,borderRadius:5,border:'1px solid rgba(232,25,60,0.3)',background:'rgba(232,25,60,0.1)',color:'#E8193C',cursor:'pointer',fontSize:16,lineHeight:1,padding:0}}>+</button>
            </div>
            <div style={{marginTop:6,height:3,background:'rgba(255,255,255,0.06)',borderRadius:2}}><div style={{height:'100%',width:`${hpBarPct}%`,background:'#E8193C',borderRadius:2,transition:'width 0.3s'}}/></div>
            <div style={{fontSize:9,color:'rgba(255,255,255,0.18)',marginTop:2}}>máx 400</div>
            <div style={{marginTop:8,paddingTop:7,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{fontSize:9,letterSpacing:'0.2em',color:'rgba(74,222,128,0.6)',fontFamily:'Cinzel,serif',marginBottom:4,textTransform:'uppercase'}}>Vida Bônus</div>
              <div style={{display:'flex',alignItems:'center',gap:5}}>
                <button onClick={()=>f('hp_bonus',Math.max(0,hpBonus-1))} style={{width:20,height:20,borderRadius:4,border:'1px solid rgba(74,222,128,0.3)',background:'rgba(74,222,128,0.08)',color:'#4ADE80',cursor:'pointer',fontSize:13,lineHeight:1,padding:0}}>−</button>
                <span style={{fontFamily:'Cinzel,serif',fontSize:14,fontWeight:700,color:'#4ADE80',minWidth:20,textAlign:'center'}}>{hpBonus}</span>
                <button onClick={()=>f('hp_bonus',hpBonus+1)} style={{width:20,height:20,borderRadius:4,border:'1px solid rgba(74,222,128,0.3)',background:'rgba(74,222,128,0.08)',color:'#4ADE80',cursor:'pointer',fontSize:13,lineHeight:1,padding:0}}>+</button>
              </div>
              <div style={{marginTop:4,height:3,background:'rgba(255,255,255,0.06)',borderRadius:2}}><div style={{height:'100%',width:`${hpBonus>0?hpBonusBarPct:0}%`,background:'#4ADE80',borderRadius:2,transition:'width 0.3s'}}/></div>
            </div>
          </div>
          <div style={{background:`${ENEMY_COLOR}09`,border:`1px solid ${ENEMY_COLOR}28`,borderRadius:10,padding:'12px 14px'}}>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:ENEMY_COLOR,fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Vigor Cósmico</div>
            <VigosDots value={enemy.vigos||0} max={10} color={ENEMY_COLOR} onChange={v=>f('vigos',v)}/>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.18)',marginTop:5}}>10 pontos totais</div>
          </div>
          <div style={{background:`${ENEMY_COLOR}07`,border:`1px solid ${ENEMY_COLOR}22`,borderRadius:10,padding:'12px 14px'}}>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:ENEMY_COLOR,fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Alcance</div>
            <input value={enemy.alcance||''} onChange={e=>f('alcance',e.target.value)} placeholder="Ex: 2m, 10m..." style={{width:'100%'}}/>
          </div>
        </div>
        <div style={{marginBottom:15}}>
          <div style={{fontSize:10,letterSpacing:'0.3em',color:'#7A4040',fontFamily:'Cinzel,serif',marginBottom:9,textTransform:'uppercase'}}>Atributos</div>
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            {ATTRS.map(a=>{const bonus=attrBonus(enemy[a.key]||0);return(<div key={a.key} style={{display:'flex',alignItems:'center',gap:8}}><span className="attr-label" style={{fontSize:11,fontFamily:'Cinzel,serif',color:a.color,minWidth:92,letterSpacing:'0.03em'}}>{a.label}</span><AttrDots value={enemy[a.key]||0} color={a.color} onChange={v=>f(a.key,v)}/><span style={{fontSize:11,color:'rgba(255,255,255,0.22)',minWidth:16,textAlign:'right'}}>{enemy[a.key]||0}</span><span style={{fontSize:11,fontFamily:'Cinzel,serif',fontWeight:700,color:bonus>0?a.color:'rgba(255,255,255,0.12)',minWidth:26,textAlign:'center',background:bonus>0?`${a.color}15`:'transparent',borderRadius:4,padding:'1px 4px',border:bonus>0?`1px solid ${a.color}33`:'1px solid transparent'}}>{bonus>0?`+${bonus}`:'—'}</span></div>);})}
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:8,flexWrap:'wrap'}}>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:'#7A4040',fontFamily:'Cinzel,serif',textTransform:'uppercase'}}>Habilidades & Ataques</div>
            <button onClick={()=>f('habilidades',[...(enemy.habilidades||[]),newEnemySkill()])} style={{padding:'6px 12px',borderRadius:7,border:`1px solid ${ENEMY_COLOR}33`,background:`${ENEMY_COLOR}10`,color:ENEMY_COLOR,cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:'0.06em'}}>+ Adicionar habilidade</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {(enemy.habilidades||[]).length===0&&(<div style={{padding:14,borderRadius:10,border:'1px dashed rgba(255,255,255,0.08)',color:'#6A4A4A',textAlign:'center',fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:'0.06em'}}>Nenhuma habilidade cadastrada.</div>)}
            {(enemy.habilidades||[]).map((skill,index)=>(<EnemySkillEditor key={skill.id||index} skill={skill} color={ENEMY_COLOR} onChange={updatedSkill=>{const updated=[...(enemy.habilidades||[])];updated[index]=updatedSkill;f('habilidades',updated);}} onDelete={()=>{const updated=(enemy.habilidades||[]).filter((_,i)=>i!==index);f('habilidades',updated);}}/>))}
          </div>
        </div>
        <div><div style={{fontSize:10,letterSpacing:'0.3em',color:'#7A4040',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Notas do Mestre</div><textarea value={enemy.notas||''} onChange={e=>f('notas',e.target.value)} placeholder="Motivações, fraquezas, itens dropados, comportamento narrativo..." rows={3} style={{width:'100%',resize:'vertical'}}/></div>
      </div>
    </div>
  );
}

function EnemiesSection({masterMode}){
  if(!masterMode) return <RestrictedAccess title="Acesso Restrito ao Mestre" text="As fichas dos inimigos estão ocultas nas sombras. Apenas o mestre possui este conhecimento." />;

  const[enemies,setEnemies]=useState([]);const[loaded,setLoaded]=useState(false);const saveTimeout=useRef({});
  useEffect(()=>{const unsub=onSnapshot(collection(db,'enemies'),snap=>{const data=snap.docs.map(d=>({id:d.id,...d.data()}));setEnemies(data);setLoaded(true);});return()=>unsub();},[]);
  const saveEnemy=enemy=>{clearTimeout(saveTimeout.current[enemy.id]);saveTimeout.current[enemy.id]=setTimeout(async()=>{try{await setDoc(doc(db,'enemies',String(enemy.id)),enemy);}catch(e){console.error(e);}},900);};
  const add=()=>{if(enemies.length>=3)return;const e=newEnemy(Date.now());setDoc(doc(db,'enemies',String(e.id)),e);};
  const upd=(id,data)=>{setEnemies(prev=>prev.map(e=>e.id===id?data:e));saveEnemy(data);};
  const del=async id=>{await deleteDoc(doc(db,'enemies',String(id)));};
  
  return(<div style={{maxWidth:760,margin:'0 auto',padding:'40px 24px 80px'}}><div style={{textAlign:'center',marginBottom:32}}><div style={{fontSize:11,letterSpacing:'0.4em',color:'#7A4040',fontFamily:'Cinzel,serif',marginBottom:13,textTransform:'uppercase'}}>As Forças das Trevas</div><h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:23,color:'#E8D8C0',fontWeight:700,margin:0}}>Fichas dos Inimigos</h2><div style={{fontSize:11,color:'#4A2020',marginTop:7,fontFamily:'Cinzel,serif'}}>⚔️ Gerenciado pelo Mestre · Sincronizado em tempo real</div><div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(232,68,68,0.6),transparent)',margin:'14px auto 0'}}/></div>{!loaded&&<div style={{textAlign:'center',color:'#5A5070',fontFamily:'Cinzel,serif',fontSize:13,padding:40}}>Conectando ao cosmos...</div>}{loaded&&enemies.length===0&&(<div style={{textAlign:'center',padding:38,border:'1px dashed rgba(232,68,68,0.15)',borderRadius:12}}><div style={{fontSize:30,marginBottom:10}}>⚔️</div><div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#6A4A4A'}}>Nenhum inimigo registrado.</div><div style={{fontSize:12,marginTop:5,color:'#4A2020'}}>Adicione os adversários que os heróis enfrentarão.</div></div>)}{enemies.map(e=><EnemyCard key={e.id} enemy={e} onChange={d=>upd(e.id,d)} onDelete={()=>del(e.id)} masterMode={masterMode}/>)}{loaded&&enemies.length<3&&masterMode&&(<button onClick={add} onMouseOver={e=>e.currentTarget.style.borderColor='rgba(232,68,68,0.4)'} onMouseOut={e=>e.currentTarget.style.borderColor='rgba(232,68,68,0.15)'} style={{width:'100%',padding:13,borderRadius:10,border:'1px dashed rgba(232,68,68,0.15)',background:'rgba(255,255,255,0.01)',color:'#7A4040',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12,letterSpacing:'0.08em',transition:'border-color 0.2s'}}>+ Adicionar Inimigo ({enemies.length}/3)</button>)}</div>);
}

// ─── BESTIARIO ─────────────────────────────────────────────────────────────────
const newBestiary = id => ({ id, nome: '', foto: '', descricao: '', nivelAmeaca: 'Médio' });

function BestiarioCard({ item, onChange, onDelete, masterMode }) {
  const f = (k,v) => onChange({...item, [k]:v});
  const photoRef = useRef(null);
  const handlePhoto = async e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const c = await compressImage(ev.target.result, 800, 800, 0.72);
      f('foto', c);
    };
    reader.readAsDataURL(file);
  };

  const ameacaCores = {
    "Baixo": "#4ADE80",
    "Médio": "#E8A020",
    "Alto": "#E8193C",
    "Supremo": "#A855F7",
    "Catastrófico": "#1EC8FF"
  };
  const corBase = ameacaCores[item.nivelAmeaca] || "#E8A020";

  return (
    <div style={{border:`1px solid ${corBase}44`, borderRadius:14, overflow:'hidden', background:'rgba(12,6,6,0.95)', marginBottom:18, boxShadow:`0 4px 20px ${corBase}22`}}>
      <div style={{height:3, background:`linear-gradient(90deg, ${corBase}, transparent)`}}/>
      <div onClick={() => masterMode && photoRef.current?.click()} style={{position:'relative', width:'100%', cursor:masterMode ? 'pointer' : 'default', background:'rgba(0,0,0,0.4)', overflow:'hidden'}}>
        {item.foto ? <img src={item.foto} alt="monstro" style={{width:'100%', maxHeight:350, objectFit:'cover', objectPosition:'center', display:'block'}}/> : <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'30px', opacity:0.35}}><span style={{fontSize:22}}>📷</span><span style={{fontSize:11, color:'rgba(255,255,255,0.5)', fontFamily:'Cinzel,serif'}}>{masterMode ? 'Toque para adicionar a foto do monstro' : 'Nenhuma imagem catalogada'}</span></div>}
        {item.foto && <div style={{position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 55%, rgba(12,6,6,0.9))', pointerEvents:'none'}}/>}
        {item.foto && item.nome && <div style={{position:'absolute', bottom:10, left:16, fontFamily:'Cinzel,serif', fontSize:18, fontWeight:700, color:corBase, textShadow:`0 0 14px ${corBase}88`}}>{item.nome}</div>}
        {masterMode && <input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}}/>}
      </div>
      
      <div style={{padding:'16px 18px'}}>
        <div style={{display:'flex', gap:10, alignItems:'flex-end', marginBottom:16, flexWrap:'wrap'}}>
          <div style={{flex:1, minWidth:130}}>
            <label style={{fontSize:10, letterSpacing:'0.3em', color:corBase, fontFamily:'Cinzel,serif', display:'block', marginBottom:5, textTransform:'uppercase'}}>Nome da Criatura</label>
            {masterMode ? (
              <input value={item.nome} onChange={e => f('nome', e.target.value)} placeholder="Ex: Besta das Sombras..." style={{width:'100%'}}/>
            ) : (
              <div style={{fontSize:15, color:'#E8D8C0', padding:'4px 0', fontFamily:'Cinzel,serif', fontWeight:600}}>{item.nome || 'Desconhecida'}</div>
            )}
          </div>
          <div style={{width:140}}>
            <label style={{fontSize:10, letterSpacing:'0.3em', color:corBase, fontFamily:'Cinzel,serif', display:'block', marginBottom:5, textTransform:'uppercase'}}>Ameaça</label>
            {masterMode ? (
              <select value={item.nivelAmeaca} onChange={e => f('nivelAmeaca', e.target.value)} style={{width:'100%', color:corBase, fontWeight:'bold'}}>
                <option value="Baixo">Baixo</option>
                <option value="Médio">Médio</option>
                <option value="Alto">Alto</option>
                <option value="Supremo">Supremo</option>
                <option value="Catastrófico">Catastrófico</option>
              </select>
            ) : (
              <div style={{fontSize:14, color:corBase, padding:'4px 0', fontWeight:'bold', fontFamily:'Cinzel,serif'}}>{item.nivelAmeaca}</div>
            )}
          </div>
          {masterMode && <button onClick={onDelete} style={{background:'rgba(232,25,60,0.1)', border:'1px solid rgba(232,25,60,0.3)', color:'#E8193C', borderRadius:6, cursor:'pointer', padding:'6px 11px', fontSize:12}}>✕ Excluir</button>}
        </div>
        
        <div>
          <label style={{fontSize:10, letterSpacing:'0.3em', color:'#5A5070', fontFamily:'Cinzel,serif', display:'block', marginBottom:5, textTransform:'uppercase'}}>Descrição & Comportamento</label>
          {masterMode ? (
            <textarea value={item.descricao} onChange={e => f('descricao', e.target.value)} placeholder="Descreva os hábitos, a aparência bizarra, e táticas de combate da criatura..." rows={5} style={{width:'100%', resize:'vertical', lineHeight:1.7}}/>
          ) : (
            <div style={{fontSize:14, color:'#9A8A7A', lineHeight:1.85, whiteSpace:'pre-wrap', fontStyle:'italic', background:'rgba(255,255,255,0.02)', padding:'12px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.05)'}}>
              {item.descricao || 'Nenhum registro sobre o comportamento desta criatura foi feito até o momento.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BestiarioSection({ masterMode }) {
  const [bestiario, setBestiario] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef({});
  
  // Novos estados para os filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAmeaca, setFilterAmeaca] = useState('Todas');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'bestiario'), snap => {
      const data = snap.docs.map(d => ({id: d.id, ...d.data()}));
      // Ordenar por criação (id)
      data.sort((a,b) => b.id - a.id);
      setBestiario(data);
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  const saveItem = item => {
    clearTimeout(saveTimeout.current[item.id]);
    saveTimeout.current[item.id] = setTimeout(async () => {
      try { await setDoc(doc(db, 'bestiario', String(item.id)), item); } 
      catch(e) { console.error(e); }
    }, 800);
  };

  const add = () => {
    const item = newBestiary(Date.now());
    setDoc(doc(db, 'bestiario', String(item.id)), item);
  };
  
  const upd = (id, data) => {
    setBestiario(prev => prev.map(b => b.id === id ? data : b));
    saveItem(data);
  };

  const del = async id => {
    await deleteDoc(doc(db, 'bestiario', String(id)));
  };

  // Lógica de filtragem
  const filteredBestiario = bestiario.filter(item => {
    const matchesSearch = (item.nome || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAmeaca = filterAmeaca === 'Todas' || item.nivelAmeaca === filterAmeaca;
    return matchesSearch && matchesAmeaca;
  });

  return (
    <div style={{maxWidth:760, margin:'0 auto', padding:'40px 24px 80px'}}>
      <div style={{textAlign:'center', marginBottom:32}}>
        <div style={{fontSize:11, letterSpacing:'0.4em', color:'#E8A020', fontFamily:'Cinzel,serif', marginBottom:13, textTransform:'uppercase'}}>O Compêndio das Aberrações</div>
        <h2 style={{fontFamily:'Cinzel Decorative,serif', fontSize:23, color:'#E8D8C0', fontWeight:700, margin:0}}>Bestiário</h2>
        <div style={{fontSize:11, color:'#6A5A5A', marginTop:7, fontFamily:'Cinzel,serif'}}>📖 Conhecimento Profano · Sincronizado em tempo real</div>
        <div style={{width:60, height:1, background:'linear-gradient(90deg, transparent, rgba(232,160,32,0.6), transparent)', margin:'14px auto 0'}}/>
      </div>

      {!loaded && <div style={{textAlign:'center', color:'#5A5070', fontFamily:'Cinzel,serif', fontSize:13, padding:40}}>Abrindo o tomo...</div>}
      
      {loaded && masterMode && (
        <div style={{display:'flex', justifyContent:'flex-end', marginBottom:18}}>
          <button onClick={add} style={{padding:'8px 20px', borderRadius:8, border:'1px solid rgba(232,160,32,0.4)', background:'rgba(232,160,32,0.1)', color:'#E8D8C0', cursor:'pointer', fontFamily:'Cinzel,serif', fontSize:12, letterSpacing:'0.08em'}}>+ Catalogar Criatura</button>
        </div>
      )}

      {/* Barra de Filtros */}
      {loaded && bestiario.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(232,160,32,0.15)' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{fontSize:9, letterSpacing:'0.2em', color:'rgba(232,160,32,0.7)', fontFamily:'Cinzel,serif', display:'block', marginBottom:6, textTransform:'uppercase'}}>Pesquisar</label>
            <input 
              type="text" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              placeholder="Nome da criatura..." 
              style={{ width: '100%', background: 'rgba(0,0,0,0.4)' }}
            />
          </div>
          <div style={{ width: 160, flexShrink: 0 }}>
            <label style={{fontSize:9, letterSpacing:'0.2em', color:'rgba(232,160,32,0.7)', fontFamily:'Cinzel,serif', display:'block', marginBottom:6, textTransform:'uppercase'}}>Categoria</label>
            <select 
              value={filterAmeaca} 
              onChange={e => setFilterAmeaca(e.target.value)} 
              style={{ width: '100%', background: 'rgba(0,0,0,0.4)' }}
            >
              <option value="Todas">Todas as Ameaças</option>
              <option value="Baixo">Baixo</option>
              <option value="Médio">Médio</option>
              <option value="Alto">Alto</option>
              <option value="Supremo">Supremo</option>
              <option value="Catastrófico">Catastrófico</option>
            </select>
          </div>
        </div>
      )}

      {loaded && bestiario.length === 0 && (
        <div style={{textAlign:'center', padding:38, border:'1px dashed rgba(232,160,32,0.2)', borderRadius:12}}>
          <div style={{fontSize:30, marginBottom:10}}>🐉</div>
          <div style={{fontFamily:'Cinzel,serif', fontSize:13, color:'#8A7A6A'}}>Nenhuma criatura catalogada.</div>
          <div style={{fontSize:12, marginTop:5, color:'#5A4A4A'}}>
            {masterMode ? 'O mundo ainda parece seguro. Registre o primeiro monstro.' : 'As páginas estão em branco. Nenhum monstro foi avistado ainda.'}
          </div>
        </div>
      )}

      {/* Mensagem quando o filtro não encontra resultados */}
      {loaded && bestiario.length > 0 && filteredBestiario.length === 0 && (
        <div style={{textAlign:'center', padding:30, color:'#7A6A5A', fontFamily:'Cinzel,serif', fontSize:13}}>
          Nenhuma criatura encontrada com estes filtros.
        </div>
      )}

      {/* Renderiza a lista filtrada em vez da lista completa */}
      {filteredBestiario.map(item => (
        <BestiarioCard key={item.id} item={item} onChange={d => upd(item.id, d)} onDelete={() => del(item.id)} masterMode={masterMode} />
      ))}
    </div>
  );
}

// ─── RULES ────────────────────────────────────────────────────────────────────
function RulesSection(){const[open,setOpen]=useState(0);return(<div style={{maxWidth:720,margin:'0 auto',padding:'40px 24px 80px'}}><div style={{textAlign:'center',marginBottom:32}}><div style={{fontSize:11,letterSpacing:'0.4em',color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:13,textTransform:'uppercase'}}>As Leis do Cosmos</div><h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:23,color:'#E8D8C0',fontWeight:700,margin:0}}>Manual de Regras</h2><div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(232,160,32,0.6),transparent)',margin:'16px auto 0'}}/></div>{RULES_DATA.map((r,i)=>(<div key={i} style={{marginBottom:9,border:'1px solid rgba(255,255,255,0.07)',borderRadius:11,overflow:'hidden',background:'rgba(8,10,22,0.8)'}}><button onClick={()=>setOpen(open===i?-1:i)} style={{width:'100%',padding:'14px 18px',display:'flex',alignItems:'center',gap:12,background:'none',border:'none',cursor:'pointer',textAlign:'left'}}><span style={{fontSize:16}}>{r.icon}</span><span style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#C8B8A0',fontWeight:600,flex:1}}>{r.title}</span><span style={{color:'rgba(255,255,255,0.2)',transform:open===i?'rotate(90deg)':'none',transition:'transform 0.3s'}}>▶</span></button>{open===i&&(<div style={{padding:'0 18px 16px',borderTop:'1px solid rgba(255,255,255,0.05)',animation:'pageTurn 0.3s ease'}}><div style={{height:10}}/>{r.body.split('\n').map((line,j)=>{if(!line.trim())return <div key={j} style={{height:6}}/>;const isBullet=line.startsWith('•');const isHead=!isBullet&&line.length<60&&!line.includes('→')&&line.endsWith(':');return <p key={j} style={{margin:'0 0 5px',fontSize:14,lineHeight:1.8,color:isHead?'#C8B8A0':isBullet?'#9A8A7A':'#8A7A6A',fontFamily:isHead?'Cinzel,serif':'inherit',fontWeight:isHead?600:400,paddingLeft:isBullet?12:0}}>{line}</p>;})}</div>)}</div>))}</div>);}

// ─── PÁGINAS DO MESTRE NO LIVRO DA MANDÍBULA ─────────────────────────────────
const newMasterPage=id=>({id,titulo:'',dataAquisicao:new Date().toLocaleDateString('pt-BR'),descricao:''});

function MasterPagesBook({masterMode}){
  const[pages,setPages]=useState([]);const[loaded,setLoaded]=useState(false);const[open,setOpen]=useState(null);
  const saveTimeout=useRef({});
  useEffect(()=>{const unsub=onSnapshot(collection(db,'livro_pages'),snap=>{const data=snap.docs.map(d=>({id:d.id,...d.data()}));data.sort((a,b)=>b.id-a.id);setPages(data);setLoaded(true);});return()=>unsub();},[]);
  const save=p=>{clearTimeout(saveTimeout.current[p.id]);saveTimeout.current[p.id]=setTimeout(async()=>{try{await setDoc(doc(db,'livro_pages',String(p.id)),p);}catch(e){console.error(e);}},700);};
  const add=()=>{const p=newMasterPage(Date.now());setDoc(doc(db,'livro_pages',String(p.id)),p);setOpen(p.id);};
  const upd=(id,data)=>{setPages(prev=>prev.map(p=>p.id===id?data:p));save(data);};
  const del=async id=>{await deleteDoc(doc(db,'livro_pages',String(id)));if(open===id)setOpen(null);};

  return(
    <div>
      <div style={{marginBottom:20,padding:'14px 18px',border:'1px solid rgba(168,85,247,0.18)',borderRadius:10,background:'rgba(168,85,247,0.05)',fontFamily:'Crimson Text,Georgia,serif',fontSize:14,color:'#9A8A9A',lineHeight:1.8,fontStyle:'italic',textAlign:'center'}}>
        "Páginas escritas pelos escribas do Mestre — registros do que o grupo descobriu, ganhou ou testemunhou ao longo de sua jornada."
      </div>

      {masterMode&&(
        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
          <button onClick={add} style={{padding:'8px 20px',borderRadius:8,border:'1px solid rgba(168,85,247,0.4)',background:'rgba(168,85,247,0.1)',color:'#C8A8E8',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12,letterSpacing:'0.08em'}}>+ Nova Página</button>
        </div>
      )}

      {!loaded&&<div style={{textAlign:'center',color:'#5A5070',fontFamily:'Cinzel,serif',fontSize:13,padding:30}}>Conectando ao cosmos...</div>}

      {loaded&&pages.length===0&&(
        <div style={{textAlign:'center',padding:38,border:'1px dashed rgba(168,85,247,0.18)',borderRadius:12}}>
          <div style={{fontSize:30,marginBottom:10}}>📖</div>
          <div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#6A5A7A'}}>Nenhuma página adicionada ainda.</div>
          <div style={{fontSize:12,marginTop:5,color:'#4A4050'}}>{masterMode?'Clique em "+ Nova Página" para começar.':'Aguarde o Mestre registrar novas descobertas.'}</div>
        </div>
      )}

      {pages.map(page=>(
        <div key={page.id} style={{border:'1px solid rgba(168,85,247,0.15)',borderRadius:11,marginBottom:11,overflow:'hidden',background:'rgba(8,10,22,0.85)'}}>
          <div onClick={()=>setOpen(open===page.id?null:page.id)} style={{padding:'13px 17px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',userSelect:'none'}}>
            <span style={{fontSize:17}}>📖</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#C8A8E8',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{page.titulo||'(Sem título)'}</div>
              <div style={{fontSize:11,color:'#5A5070',marginTop:2,fontFamily:'Cinzel,serif',letterSpacing:'0.03em'}}>📅 {page.dataAquisicao}</div>
            </div>
            <div style={{display:'flex',gap:7}}>
              {masterMode&&<button onClick={e=>{e.stopPropagation();del(page.id);}} style={{background:'rgba(232,25,60,0.09)',border:'1px solid rgba(232,25,60,0.22)',color:'#E8193C',borderRadius:5,cursor:'pointer',padding:'3px 8px',fontSize:11}}>✕</button>}
              <span style={{color:'rgba(168,85,247,0.4)',fontSize:11,transform:open===page.id?'rotate(90deg)':'none',transition:'transform 0.3s',display:'flex',alignItems:'center'}}>▶</span>
            </div>
          </div>

          {open===page.id&&(
            <div style={{padding:'0 17px 17px',borderTop:'1px solid rgba(168,85,247,0.1)',animation:'pageTurn 0.3s ease'}}>
              <div style={{height:11}}/>
              {masterMode?(<>
                <div style={{display:'grid',gridTemplateColumns:'1fr 140px',gap:10,marginBottom:11}}>
                  <div>
                    <label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Título da Página</label>
                    <input value={page.titulo||''} onChange={e=>upd(page.id,{...page,titulo:e.target.value})} placeholder="Ex: O Pacto com o Homem Água..." style={{width:'100%'}}/>
                  </div>
                  <div>
                    <label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Data Aquisição</label>
                    <input value={page.dataAquisicao||''} onChange={e=>upd(page.id,{...page,dataAquisicao:e.target.value})} placeholder="DD/MM/AAAA" style={{width:'100%'}}/>
                  </div>
                </div>
                <div>
                  <label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Descritivo</label>
                  <textarea value={page.descricao||''} onChange={e=>upd(page.id,{...page,descricao:e.target.value})} placeholder={"Registre aqui o que o grupo adquiriu, descobriu ou testemunhou nesta jornada..."} rows={6} style={{width:'100%',resize:'vertical',lineHeight:1.85}}/>
                </div>
                <div style={{marginTop:7,fontSize:11,color:'#4A4050',textAlign:'right',fontFamily:'Cinzel,serif'}}>salvo automaticamente</div>
              </>):(
                <div style={{fontSize:14,color:'#9A8A7A',lineHeight:1.85,fontStyle:'italic',whiteSpace:'pre-line'}}>
                  {page.descricao||<span style={{color:'#4A4050'}}>Esta página ainda não foi escrita.</span>}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── LIVRO DA MANDÍBULA ───────────────────────────────────────────────────────
function LibroSection({masterMode}){
  const[page,setPage]=useState(0);const[unlocked,setUnlocked]=useState({});const[artefatosUnlocked,setArtefatosUnlocked]=useState({});const[coordRevealed,setCoordRevealed]=useState(false);
  useEffect(()=>{const u1=onSnapshot(doc(db,'config','entities'),snap=>{if(snap.exists())setUnlocked(snap.data().unlocked||{});});const u2=onSnapshot(doc(db,'config','artefatos'),snap=>{if(snap.exists())setArtefatosUnlocked(snap.data().unlocked||{});});const u3=onSnapshot(doc(db,'config','prophecy'),snap=>{if(snap.exists())setCoordRevealed(snap.data().coordRevealed||false);});return()=>{u1();u2();u3();};},[]);
  const toggleUnlock=async id=>{const updated={...unlocked,[id]:!unlocked[id]};await setDoc(doc(db,'config','entities'),{unlocked:updated});};
  const toggleArtefato=async id=>{const updated={...artefatosUnlocked,[id]:!artefatosUnlocked[id]};await setDoc(doc(db,'config','artefatos'),{unlocked:updated});};
  const toggleCoord=async()=>{await setDoc(doc(db,'config','prophecy'),{coordRevealed:!coordRevealed});};
  const starC=['#1EC8FF','#E8A020','#A855F7','#E8193C'];
  const isRevealed=(ent,i)=>i<2?true:(unlocked[ent.id]||false);
  return(<div style={{maxWidth:780,margin:'0 auto',padding:'40px 24px 80px'}}><div style={{textAlign:'center',marginBottom:28}}><div style={{fontSize:11,letterSpacing:'0.4em',color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:13,textTransform:'uppercase'}}>O Artefato da Profecia</div><h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:22,color:'#E8D8C0',fontWeight:700,margin:0}}>Livro da Mandíbula</h2><div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(168,85,247,0.6),transparent)',margin:'15px auto 0'}}/></div><div style={{display:'flex',gap:6,marginBottom:26,justifyContent:'center',flexWrap:'wrap'}}>{['📜 Marcos & Profecia','◈ As Seis Entidades','◆ Os 6 Artefatos','📖 Páginas do Mestre'].map((t,i)=>(<button key={i} onClick={()=>setPage(i)} style={{padding:'7px 16px',borderRadius:20,fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:'0.07em',border:page===i?'1px solid rgba(168,85,247,0.5)':'1px solid rgba(255,255,255,0.08)',background:page===i?'rgba(168,85,247,0.12)':'transparent',color:page===i?'#C8A8E8':'#5A4A6A',cursor:'pointer',transition:'all 0.2s'}}>{t}</button>))}</div>
  {page===0&&(<div style={{animation:'pageTurn 0.4s ease'}}><div style={{marginBottom:24,padding:'14px 18px',border:'1px solid rgba(168,85,247,0.18)',borderRadius:10,background:'rgba(168,85,247,0.05)',fontFamily:'Crimson Text,Georgia,serif',fontSize:14,color:'#9A8A9A',lineHeight:1.8,fontStyle:'italic',textAlign:'center'}}>"Escrito na era em que o primeiro Mago do Prólogo tocou a pena celestial — estas páginas registram os passos da humanidade e para onde eles a levam."</div><div style={{position:'relative',paddingLeft:26}}><div style={{position:'absolute',left:7,top:0,bottom:0,width:1,background:'linear-gradient(180deg,rgba(168,85,247,0.4),rgba(232,25,60,0.6))'}}/>{MILESTONES.map((m,i)=>(<div key={i} style={{position:'relative',marginBottom:m.prophecy?0:15,paddingLeft:18}}><div style={{position:'absolute',left:-18,top:5,width:9,height:9,borderRadius:'50%',background:m.prophecy?'#E8193C':'rgba(168,85,247,0.5)',boxShadow:m.prophecy?'0 0 10px #E8193C':undefined,border:`1px solid ${m.prophecy?'#E8193C':'rgba(168,85,247,0.4)'}`}}/><div style={{display:'flex',alignItems:'flex-start',gap:10,padding:'9px 13px',borderRadius:8,background:m.prophecy?'rgba(232,25,60,0.07)':'rgba(255,255,255,0.018)',border:m.prophecy?'1px solid rgba(232,25,60,0.22)':'1px solid rgba(255,255,255,0.04)'}}><span style={{fontSize:15,flexShrink:0}}>{m.icon}</span><div><div style={{fontSize:10,fontFamily:'Cinzel,serif',color:m.prophecy?'#E8193C':'#7B6D8A',letterSpacing:'0.2em',marginBottom:2}}>{m.year}</div><div style={{fontSize:14,color:m.prophecy?'#F09090':'#9A8A7A',lineHeight:1.6,fontFamily:m.prophecy?'Cinzel,serif':'inherit',fontWeight:m.prophecy?600:400}}>{m.event}</div></div></div></div>))}</div><div style={{marginTop:26,padding:'22px',border:'1px solid rgba(232,25,60,0.28)',borderRadius:12,background:'rgba(232,25,60,0.05)'}}><div style={{textAlign:'center',marginBottom:16}}><div style={{fontSize:11,letterSpacing:'0.4em',color:'#E8193C',fontFamily:'Cinzel,serif',marginBottom:12,textTransform:'uppercase'}}>A Profecia</div><div style={{display:'flex',justifyContent:'center',gap:16,marginBottom:14}}>{starC.map((c,i)=>(<div key={i} style={{textAlign:'center'}}><div style={{width:13,height:13,borderRadius:'50%',background:c,boxShadow:`0 0 12px ${c}`,margin:'0 auto 4px',animation:'shimmer 2s ease-in-out infinite',animationDelay:`${i*0.4}s`}}/><div style={{fontSize:9,color:c,fontFamily:'Cinzel,serif'}}>★</div></div>))}</div></div><p style={{fontSize:14,color:'#B09090',lineHeight:1.85,margin:'0 0 20px',textAlign:'center',fontStyle:'italic'}}>"Quatro estrelas surgirão nos céus de Cosmum — visíveis tanto de dia quanto de noite. A cada dia que passa, elas se aproximam. Quando chegarem ao máximo possível de proximidade... algo acontecerá. O que, o Livro não ousou descrever."</p>{!coordRevealed?(<div style={{textAlign:'center',marginTop:8}}><div style={{fontSize:12,color:'rgba(255,255,255,0.2)',fontFamily:'Cinzel,serif',marginBottom:10,letterSpacing:'0.15em'}}>✦ A próxima página permanece selada por uma magia poderosa ✦</div><button onClick={toggleCoord} style={{padding:'9px 24px',borderRadius:8,border:'1px solid rgba(168,85,247,0.4)',background:'rgba(168,85,247,0.08)',color:'#C8A8E8',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12,letterSpacing:'0.1em',transition:'all 0.2s'}}>🔮 Quebrar Selo</button></div>):(<div style={{marginTop:8,padding:'18px',border:'1px solid rgba(168,85,247,0.3)',borderRadius:10,background:'rgba(168,85,247,0.06)',textAlign:'center',animation:'pageTurn 0.8s ease'}}><div style={{fontSize:10,letterSpacing:'0.35em',color:'#A855F7',fontFamily:'Cinzel,serif',marginBottom:12,textTransform:'uppercase'}}>As Coordenadas do Destino</div><div style={{fontFamily:'Cinzel,serif',fontSize:18,color:'#C8A8E8',letterSpacing:'0.25em',animation:'revealCoord 1.2s ease',marginBottom:8}}>45° 30′ 53.6″ N, 25° 22′ 1.8″ E</div><div style={{fontSize:12,color:'#7A6A8A',fontStyle:'italic',lineHeight:1.7}}>"O ponto onde as quatro estrelas convergem. Onde o véu entre o mortal e o absoluto é mais fino."</div><button onClick={toggleCoord} style={{marginTop:14,padding:'5px 14px',borderRadius:6,border:'1px solid rgba(168,85,247,0.25)',background:'transparent',color:'#5A4A6A',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.08em'}}>🔒 Selar novamente</button></div>)}</div></div>)}
  {page===1&&(<div style={{animation:'pageTurn 0.4s ease'}}><div style={{marginBottom:20,textAlign:'center',fontSize:14,color:'#6A5A7A',fontFamily:'Crimson Text,Georgia,serif',fontStyle:'italic'}}>"Seis entidades foram vislumbradas nas páginas finais do Livro. Sua origem, forma e propósito permanecem parcialmente envoltos em sombra."</div><div style={{display:'flex',flexDirection:'column',gap:14}}>{ENTITIES_DATA.map((ent,i)=>{const revealed=isRevealed(ent,i);return(<div key={ent.id} style={{border:`1px solid ${revealed?'rgba(168,85,247,0.22)':'rgba(255,255,255,0.05)'}`,borderRadius:11,background:revealed?'rgba(168,85,247,0.04)':'rgba(255,255,255,0.014)',overflow:'hidden'}}><div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:20}}>{ent.icon}</span><div style={{flex:1}}><div style={{fontFamily:'Cinzel,serif',fontSize:14,color:revealed?'#C8A8E8':'#5A4A6A',fontWeight:600}}>{ent.name}</div><div style={{fontSize:10,color:'#4A4050',letterSpacing:'0.18em',fontFamily:'Cinzel,serif'}}>{revealed?'ENTIDADE REGISTRADA':'TRANCADO — AGUARDANDO O MESTRE'}</div></div>{i>=2&&(<button onClick={()=>toggleUnlock(ent.id)} style={{padding:'5px 12px',borderRadius:5,border:`1px solid ${revealed?'rgba(168,85,247,0.35)':'rgba(232,25,60,0.35)'}`,background:revealed?'rgba(168,85,247,0.07)':'rgba(232,25,60,0.07)',color:revealed?'#C8A8E8':'#F09090',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.08em'}}>{revealed?'🔒 Trancar':'🔓 Revelar'}</button>)}</div>{revealed?(<div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:14}}><div><div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:8,textTransform:'uppercase'}}>Lore / História</div><div style={{fontSize:14,color:'#9A8A7A',lineHeight:1.85,fontStyle:'italic',whiteSpace:'pre-line'}}>{ent.lore||<span style={{color:'#4A4050'}}>Lore ainda não registrado.</span>}</div></div><div style={{height:1,background:'rgba(255,255,255,0.06)'}}/><div><div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:8,textTransform:'uppercase'}}>Características Físicas</div><div style={{fontSize:14,color:'#9A8A7A',lineHeight:1.85,fontStyle:'italic'}}>{ent.fisico||<span style={{color:'#4A4050'}}>Características físicas ainda não registradas.</span>}</div></div></div>):(<div style={{padding:'22px 16px',textAlign:'center'}}><div style={{fontSize:28,marginBottom:8,opacity:0.3}}>🔒</div><div style={{fontSize:13,color:'#4A4050',fontFamily:'Cinzel,serif',letterSpacing:'0.08em'}}>Esta entidade ainda não foi revelada.</div><div style={{fontSize:12,color:'#3A3040',marginTop:5}}>Aguarde o Mestre desbloquear esta página.</div></div>)}</div>);})}</div></div>)}
  {page===2&&(<div style={{animation:'pageTurn 0.4s ease'}}><div style={{marginBottom:20,textAlign:'center',fontSize:14,color:'#6A5A7A',fontFamily:'Crimson Text,Georgia,serif',fontStyle:'italic'}}>"Seis artefatos de poder imensurável foram registrados nas páginas mais antigas do Livro. Uma magia poderosa sela seu conhecimento — apenas o avanço da história os revelará."</div><div style={{display:'flex',flexDirection:'column',gap:12}}>{ARTEFATOS_DATA.map((art,i)=>{const revealed=artefatosUnlocked[art.id]||false;const hasContent=!!(art.lore||art.fisico);return(<div key={art.id} style={{border:`1px solid ${revealed?'rgba(232,160,32,0.3)':'rgba(255,255,255,0.05)'}`,borderRadius:11,background:revealed?'rgba(232,160,32,0.04)':'rgba(255,255,255,0.014)',overflow:'hidden'}}><div style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:18,opacity:revealed?1:0.3}}>{art.icon}</span><div style={{flex:1}}><div style={{fontFamily:'Cinzel,serif',fontSize:13,color:revealed?'#E8D8C0':'#4A4050',fontWeight:600}}>{revealed?art.name:`Artefato ${i+1} — Selado`}</div><div style={{fontSize:10,color:revealed?'rgba(232,160,32,0.6)':'#3A3040',letterSpacing:'0.18em',fontFamily:'Cinzel,serif',marginTop:2}}>{revealed?'ARTEFATO REVELADO':'SELADO POR MAGIA PODEROSA'}</div></div><button onClick={()=>toggleArtefato(art.id)} style={{padding:'5px 12px',borderRadius:5,border:`1px solid ${revealed?'rgba(232,160,32,0.35)':'rgba(232,25,60,0.25)'}`,background:revealed?'rgba(232,160,32,0.07)':'rgba(232,25,60,0.05)',color:revealed?'#E8A020':'#6A4A4A',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.08em'}}>{revealed?'🔒 Selar':'🔓 Revelar'}</button></div>{!revealed&&(<div style={{padding:'16px',textAlign:'center',borderTop:'1px solid rgba(255,255,255,0.04)'}}><div style={{fontSize:22,marginBottom:6,opacity:0.2}}>◆</div><div style={{fontSize:12,color:'#3A3040',fontFamily:'Cinzel,serif',letterSpacing:'0.08em',fontStyle:'italic'}}>Este artefato permanece oculto por uma magia poderosa.</div><div style={{fontSize:11,color:'#2A2030',marginTop:4}}>Seu poder será revelado conforme a história avança.</div></div>)}{revealed&&hasContent&&(<div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:12,borderTop:'1px solid rgba(232,160,32,0.1)'}}><div><div style={{fontSize:10,letterSpacing:'0.3em',color:'rgba(232,160,32,0.6)',fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Descrição</div><div style={{fontSize:14,color:'#9A8A7A',lineHeight:1.85,fontStyle:'italic',whiteSpace:'pre-line'}}>{art.lore}</div></div>{art.fisico&&(<><div style={{height:1,background:'rgba(232,160,32,0.1)'}}/><div><div style={{fontSize:10,letterSpacing:'0.3em',color:'rgba(232,160,32,0.6)',fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Localização & Origem</div><div style={{fontSize:14,color:'#9A8A7A',lineHeight:1.85,fontStyle:'italic',whiteSpace:'pre-line'}}>{art.fisico}</div></div></>)}</div>)}{revealed&&!hasContent&&(<div style={{padding:'14px 16px',borderTop:'1px solid rgba(232,160,32,0.1)'}}><div style={{fontSize:13,color:'#7A6A5A',fontStyle:'italic',fontFamily:'Crimson Text,Georgia,serif',lineHeight:1.7}}>Informações sobre este artefato serão reveladas pelo Mestre ao longo da campanha.</div></div>)}</div>);})}</div></div>)}
  {page===3&&<MasterPagesBook masterMode={masterMode}/>}
  </div>);
}

// ─── CRÔNICAS ─────────────────────────────────────────────────────────────────
const newEntry=id=>({id,titulo:'',sessao:'',data:new Date().toLocaleDateString('pt-BR'),conteudo:'',imagens:[]});

function CronicasSection({masterMode}){
  const[entries,setEntries]=useState([]);const[loaded,setLoaded]=useState(false);const[open,setOpen]=useState(null);const saveTimeout=useRef({});
  useEffect(()=>{const unsub=onSnapshot(collection(db,'cronicas'),snap=>{const data=snap.docs.map(d=>({id:d.id,...d.data()}));data.sort((a,b)=>b.id-a.id);setEntries(data);setLoaded(true);});return()=>unsub();},[]);
  const saveEntry=entry=>{clearTimeout(saveTimeout.current[entry.id]);saveTimeout.current[entry.id]=setTimeout(async()=>{try{const{imagens,...sem}=entry;await setDoc(doc(db,'cronicas',String(entry.id)),sem);if(imagens&&imagens.length>0)await setDoc(doc(db,'cronicas',String(entry.id)),entry);}catch(e){alert('Aviso: Crônica muito grande. Tente usar menos imagens.');}},800);};
  const add=()=>{const e=newEntry(Date.now());setDoc(doc(db,'cronicas',String(e.id)),e);setOpen(e.id);};
  const upd=(id,data)=>{setEntries(prev=>prev.map(e=>e.id===id?data:e));saveEntry(data);};
  const del=async id=>{await deleteDoc(doc(db,'cronicas',String(id)));if(open===id)setOpen(null);};
  const addImage=async(entry,file)=>{const reader=new FileReader();reader.onload=async ev=>{const compressed=await compressImage(ev.target.result,1000,1000,0.68);const imagens=[...(entry.imagens||[]),compressed];if(imagens.length>6){alert('Máximo de 6 imagens por crônica.');return;}upd(entry.id,{...entry,imagens});};reader.readAsDataURL(file);};
  const removeImage=(entry,idx)=>{const imagens=(entry.imagens||[]).filter((_,i)=>i!==idx);upd(entry.id,{...entry,imagens});};
  const imgInputRefs=useRef({});
  return(
    <div style={{maxWidth:760,margin:'0 auto',padding:'40px 24px 80px'}}>
      <div style={{textAlign:'center',marginBottom:28}}><div style={{fontSize:11,letterSpacing:'0.4em',color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:13,textTransform:'uppercase'}}>O Registro dos Acontecimentos</div><h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:23,color:'#E8D8C0',fontWeight:700,margin:0}}>Crônicas da Campanha</h2><div style={{fontSize:12,color:'#4A4050',marginTop:9,fontFamily:'Cinzel,serif'}}>Registre os eventos, batalhas, revelações e narrativas de cada sessão</div><div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(232,160,32,0.6),transparent)',margin:'16px auto 0'}}/></div>
      {!loaded&&<div style={{textAlign:'center',color:'#5A5070',fontFamily:'Cinzel,serif',fontSize:13,padding:40}}>Conectando ao cosmos...</div>}
      {loaded&&(<>
        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:18}}><button onClick={add} style={{padding:'8px 20px',borderRadius:8,border:'1px solid rgba(168,85,247,0.4)',background:'rgba(168,85,247,0.1)',color:'#C8A8E8',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12,letterSpacing:'0.08em'}}>+ Nova Crônica</button></div>
        {entries.length===0&&(<div style={{textAlign:'center',padding:38,border:'1px dashed rgba(255,255,255,0.07)',borderRadius:12}}><div style={{fontSize:30,marginBottom:10}}>📜</div><div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#6A5A7A'}}>Nenhuma crônica registrada.</div></div>)}
        {entries.map(entry=>(
          <div key={entry.id} style={{border:'1px solid rgba(255,255,255,0.08)',borderRadius:11,marginBottom:11,overflow:'hidden',background:'rgba(8,10,22,0.85)'}}>
            <div onClick={()=>setOpen(open===entry.id?null:entry.id)} style={{padding:'13px 17px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',userSelect:'none'}}>
              <span style={{fontSize:15}}>📜</span>
              <div style={{flex:1}}><div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#C8B8A0',fontWeight:600}}>{entry.titulo||'(Sem título)'}</div><div style={{fontSize:11,color:'#5A5070',marginTop:2,display:'flex',gap:10,flexWrap:'wrap'}}>{entry.sessao&&<span>Sessão {entry.sessao}</span>}<span>{entry.data}</span>{entry.conteudo&&<span style={{color:'#4A4050'}}>{entry.conteudo.split(' ').length} palavras</span>}{(entry.imagens||[]).length>0&&<span style={{color:'#4A4050'}}>🖼 {entry.imagens.length}</span>}</div></div>
              <div style={{display:'flex',gap:7}}>
                {masterMode&&<button onClick={e=>{e.stopPropagation();del(entry.id);}} style={{background:'rgba(232,25,60,0.09)',border:'1px solid rgba(232,25,60,0.22)',color:'#E8193C',borderRadius:5,cursor:'pointer',padding:'3px 8px',fontSize:11}}>✕</button>}
                <span style={{color:'rgba(255,255,255,0.2)',fontSize:11,transform:open===entry.id?'rotate(90deg)':'none',transition:'transform 0.3s',display:'flex',alignItems:'center'}}>▶</span>
              </div>
            </div>
            {open===entry.id&&(
              <div style={{padding:'0 17px 17px',borderTop:'1px solid rgba(255,255,255,0.05)',animation:'pageTurn 0.3s ease'}}>
                <div style={{height:11}}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 80px',gap:9,marginBottom:11}}>
                  <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Título</label><input value={entry.titulo||''} onChange={e=>upd(entry.id,{...entry,titulo:e.target.value})} placeholder="Nome desta crônica..." style={{width:'100%'}}/></div>
                  <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Sessão</label><input value={entry.sessao||''} onChange={e=>upd(entry.id,{...entry,sessao:e.target.value})} placeholder="Nº" style={{width:'100%'}}/></div>
                </div>
                <div style={{marginBottom:11}}><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Narrativa da Sessão</label><textarea value={entry.conteudo||''} onChange={e=>upd(entry.id,{...entry,conteudo:e.target.value})} placeholder={"Narre aqui os acontecimentos desta sessão..."} rows={10} style={{width:'100%',resize:'vertical',lineHeight:1.85}}/></div>
                <div style={{marginBottom:10}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:9}}>
                    <label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',textTransform:'uppercase'}}>Imagens da Sessão</label>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:10,color:'#4A4050',fontFamily:'Cinzel,serif'}}>{(entry.imagens||[]).length}/6</span>
                      <button onClick={()=>imgInputRefs.current[entry.id]?.click()} style={{padding:'5px 12px',borderRadius:7,border:'1px solid rgba(168,85,247,0.3)',background:'rgba(168,85,247,0.08)',color:'#C8A8E8',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:'0.06em'}}>🖼 Adicionar Imagem</button>
                      <input ref={el=>imgInputRefs.current[entry.id]=el} type="file" accept="image/*" onChange={e=>{if(e.target.files[0])addImage(entry,e.target.files[0]);e.target.value='';}} style={{display:'none'}}/>
                    </div>
                  </div>
                  {(entry.imagens||[]).length>0?<div style={{display:'flex',flexDirection:'column',gap:10}}>{entry.imagens.map((img,idx)=>(<div key={idx} style={{position:'relative',borderRadius:10,overflow:'hidden',border:'1px solid rgba(255,255,255,0.08)'}}><img src={img} alt={`Imagem ${idx+1}`} style={{width:'100%',display:'block',maxHeight:420,objectFit:'contain',background:'rgba(0,0,0,0.3)'}}/><button onClick={()=>removeImage(entry,idx)} style={{position:'absolute',top:8,right:8,background:'rgba(232,25,60,0.85)',border:'none',color:'#fff',borderRadius:6,cursor:'pointer',padding:'4px 9px',fontSize:12}}>✕</button></div>))}</div>:<div style={{padding:12,borderRadius:10,border:'1px dashed rgba(255,255,255,0.06)',color:'#5A5070',textAlign:'center',fontSize:11,fontFamily:'Cinzel,serif'}}>Nenhuma imagem adicionada. (máx 6)</div>}
                </div>
                <div style={{fontSize:11,color:'#4A4050',textAlign:'right',fontFamily:'Cinzel,serif'}}>{(entry.conteudo||'').length} caracteres · salvo automaticamente</div>
              </div>
            )}
          </div>
        ))}
      </>)}
    </div>
  );
}

// ─── CENÁRIOS ─────────────────────────────────────────────────────────────────
const newCenario=id=>({id,nome:'',descricao:'',mapa:'',data:new Date().toLocaleDateString('pt-BR')});

function CenariosSection({masterMode}){
  const[cenarios,setCenarios]=useState([]);const[loaded,setLoaded]=useState(false);const[open,setOpen]=useState(null);const saveTimeout=useRef({});
  useEffect(()=>{const unsub=onSnapshot(collection(db,'cenarios'),snap=>{const data=snap.docs.map(d=>({id:d.id,...d.data()}));data.sort((a,b)=>b.id-a.id);setCenarios(data);setLoaded(true);});return()=>unsub();},[]);
  const save=c=>{clearTimeout(saveTimeout.current[c.id]);saveTimeout.current[c.id]=setTimeout(async()=>{try{await setDoc(doc(db,'cenarios',String(c.id)),c);}catch(e){console.error(e);}},800);};
  const add=()=>{const c=newCenario(Date.now());setDoc(doc(db,'cenarios',String(c.id)),c);setOpen(c.id);};
  const upd=(id,data)=>{setCenarios(prev=>prev.map(c=>c.id===id?data:c));save(data);};
  const del=async id=>{await deleteDoc(doc(db,'cenarios',String(id)));if(open===id)setOpen(null);};
  const handleMap=async(c,e)=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=async ev=>{const compressed=await compressImage(ev.target.result,1200,1200,0.75);upd(c.id,{...c,mapa:compressed});};reader.readAsDataURL(file);e.target.value='';};
  const mapRefs=useRef({});
  return(
    <div style={{maxWidth:800,margin:'0 auto',padding:'40px 16px 80px'}}>
      <div style={{textAlign:'center',marginBottom:28}}><div style={{fontSize:11,letterSpacing:'0.4em',color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:13,textTransform:'uppercase'}}>Os Lugares de Cosmum</div><h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:23,color:'#E8D8C0',fontWeight:700,margin:0}}>Cenários Explorados</h2><div style={{fontSize:12,color:'#4A4050',marginTop:9,fontFamily:'Cinzel,serif'}}>Registre os mapas e locais por onde os personagens passaram</div><div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(168,85,247,0.5),transparent)',margin:'16px auto 0'}}/></div>
      {!loaded&&<div style={{textAlign:'center',color:'#5A5070',fontFamily:'Cinzel,serif',fontSize:13,padding:40}}>Conectando ao cosmos...</div>}
      {loaded&&(<>
        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:18}}><button onClick={add} style={{padding:'8px 20px',borderRadius:8,border:'1px solid rgba(168,85,247,0.4)',background:'rgba(168,85,247,0.1)',color:'#C8A8E8',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12,letterSpacing:'0.08em'}}>+ Novo Cenário</button></div>
        {cenarios.length===0&&(<div style={{textAlign:'center',padding:44,border:'1px dashed rgba(255,255,255,0.06)',borderRadius:14}}><div style={{fontSize:32,marginBottom:10,opacity:0.3}}>🗺️</div><div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#6A5A7A'}}>Nenhum cenário registrado.</div><div style={{fontSize:12,marginTop:5,color:'#4A4050'}}>Adicione os locais e mapas que os heróis exploraram.</div></div>)}
        {cenarios.map(c=>(
          <div key={c.id} style={{border:'1px solid rgba(168,85,247,0.14)',borderRadius:14,marginBottom:14,overflow:'hidden',background:'rgba(8,10,22,0.9)'}}>
            <div onClick={()=>setOpen(open===c.id?null:c.id)} style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',userSelect:'none'}}>
              {c.mapa?<img src={c.mapa} alt="" style={{width:54,height:40,borderRadius:7,objectFit:'cover',flexShrink:0,border:'1px solid rgba(168,85,247,0.25)'}}/>:<div style={{width:54,height:40,borderRadius:7,background:'rgba(168,85,247,0.06)',border:'1px dashed rgba(168,85,247,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>🗺️</div>}
              <div style={{flex:1,minWidth:0}}><div style={{fontFamily:'Cinzel,serif',fontSize:13,fontWeight:700,color:'#C8A8E8',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.nome||'(Sem nome)'}</div><div style={{fontSize:11,color:'#5A5070',marginTop:2,fontFamily:'Cinzel,serif'}}>{c.data}</div></div>
              <div style={{display:'flex',gap:7}}>{masterMode&&<button onClick={e=>{e.stopPropagation();del(c.id);}} style={{background:'rgba(232,25,60,0.09)',border:'1px solid rgba(232,25,60,0.22)',color:'#E8193C',borderRadius:5,cursor:'pointer',padding:'3px 8px',fontSize:11}}>✕</button>}<span style={{color:'rgba(168,85,247,0.4)',fontSize:11,transform:open===c.id?'rotate(90deg)':'none',transition:'transform 0.3s',display:'flex',alignItems:'center'}}>▶</span></div>
            </div>
            {open===c.id&&(
              <div style={{borderTop:'1px solid rgba(168,85,247,0.1)',animation:'pageTurn 0.3s ease'}}>
                {c.mapa&&(<div style={{position:'relative',cursor:'pointer'}} onClick={()=>mapRefs.current[c.id]?.click()}><img src={c.mapa} alt="mapa" style={{width:'100%',display:'block',maxHeight:500,objectFit:'contain',background:'rgba(0,0,0,0.4)'}}/><div style={{position:'absolute',top:10,right:10,padding:'4px 10px',borderRadius:6,background:'rgba(0,0,0,0.6)',border:'1px solid rgba(168,85,247,0.3)',color:'#C8A8E8',fontFamily:'Cinzel,serif',fontSize:10,cursor:'pointer',letterSpacing:'0.08em'}}>🗺 Trocar mapa</div></div>)}
                <input ref={el=>mapRefs.current[c.id]=el} type="file" accept="image/*" onChange={e=>handleMap(c,e)} style={{display:'none'}}/>
                <div style={{padding:'16px 18px',display:'flex',flexDirection:'column',gap:13}}>
                  {!c.mapa&&(<div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:8,textTransform:'uppercase'}}>Mapa do Cenário</label><div onClick={()=>mapRefs.current[c.id]?.click()} style={{padding:'30px',borderRadius:10,border:'1px dashed rgba(168,85,247,0.25)',background:'rgba(168,85,247,0.03)',textAlign:'center',cursor:'pointer'}}><div style={{fontSize:28,marginBottom:8,opacity:0.3}}>🗺️</div><div style={{fontSize:12,color:'rgba(255,255,255,0.25)',fontFamily:'Cinzel,serif',letterSpacing:'0.08em'}}>Toque para adicionar o mapa do cenário</div></div></div>)}
                  <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Nome do Cenário</label><input value={c.nome||''} onChange={e=>upd(c.id,{...c,nome:e.target.value})} placeholder="Ex: A Taverna dos Três Mundos..." style={{width:'100%'}}/></div>
                  <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Descrição & Notas</label><textarea value={c.descricao||''} onChange={e=>upd(c.id,{...c,descricao:e.target.value})} placeholder={"Descreva este local — sua atmosfera, o que os personagens encontraram aqui, segredos revelados, eventos marcantes..."} rows={5} style={{width:'100%',resize:'vertical',lineHeight:1.85}}/></div>
                  <div style={{fontSize:11,color:'#4A4050',textAlign:'right',fontFamily:'Cinzel,serif'}}>salvo automaticamente</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </>)}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
const TABS=[
  {id:'prologo',label:'Prólogo',icon:'📜'},
  {id:'classes',label:'Classes',icon:'⚔️'},
  {id:'fichas',label:'Fichas',icon:'📋'},
  {id:'inimigos',label:'Inimigos',icon:'💀'},
  {id:'bestiario',label:'Bestiário',icon:'🐉'},
  {id:'regras',label:'Regras',icon:'📖'},
  {id:'livro',label:'Livro da Mandíbula',icon:'✦'},
  {id:'cronicas',label:'Crônicas',icon:'🗒️'},
  {id:'cenarios',label:'Cenários',icon:'🗺️'}
];

function MasterToggle({masterMode,setMasterMode}){
  const[showInput,setShowInput]=useState(false);const[pin,setPin]=useState('');const[shake,setShake]=useState(false);
  const tryUnlock=()=>{if(pin.toLowerCase()===MASTER_PIN){setMasterMode(true);setShowInput(false);setPin('');}else{setShake(true);setTimeout(()=>setShake(false),500);setPin('');}};
  if(masterMode)return(<button onClick={()=>setMasterMode(false)} title="Desativar Modo Mestre" style={{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(232,25,60,0.4)',background:'rgba(232,25,60,0.12)',color:'#E8193C',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.08em',animation:'pulse 2s ease-in-out infinite'}}>🔴 MESTRE</button>);
  return(<div style={{display:'flex',alignItems:'center',gap:6}}>{showInput&&(<div style={{display:'flex',gap:5}}><input type="password" value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==='Enter'&&tryUnlock()} placeholder="senha..." autoFocus style={{width:80,padding:'3px 7px',fontSize:12,border:`1px solid ${shake?'rgba(232,25,60,0.6)':'rgba(255,255,255,0.15)'}`,transition:'border-color 0.3s'}}/><button onClick={tryUnlock} style={{padding:'3px 8px',borderRadius:5,border:'1px solid rgba(168,85,247,0.3)',background:'rgba(168,85,247,0.1)',color:'#C8A8E8',cursor:'pointer',fontSize:11}}>✓</button><button onClick={()=>{setShowInput(false);setPin('');}} style={{padding:'3px 7px',borderRadius:5,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'#5A5070',cursor:'pointer',fontSize:11}}>✕</button></div>)}{!showInput&&(<button onClick={()=>setShowInput(true)} title="Modo Mestre" style={{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.03)',color:'#5A5070',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.08em'}}>🔒 Mestre</button>)}</div>);
}

export default function App(){
  const[tab,setTab]=useState('prologo');const[masterMode,setMasterMode]=useState(false);
  useEffect(()=>{const s=document.createElement('style');s.textContent=GLOBAL_CSS;document.head.appendChild(s);return()=>s.remove();},[]);
  return(
    <div style={{height:'100vh',overflow:'hidden',display:'flex',flexDirection:'column',background:'#04060F',color:'#C8B8A0',fontFamily:"'Crimson Text',Georgia,serif",position:'relative'}}>
      <StarField/>
      <header style={{position:'relative',zIndex:10,borderBottom:'1px solid rgba(255,255,255,0.05)',background:'linear-gradient(180deg,rgba(4,6,15,0.98),rgba(4,6,15,0.92))',backdropFilter:'blur(8px)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px 10px'}}>
          <div style={{width:80}}/>
          <div style={{textAlign:'center',flex:1}}>
            <div style={{fontSize:9,letterSpacing:'0.5em',color:'#4A3A5A',fontFamily:'Cinzel,serif',marginBottom:4,textTransform:'uppercase'}}>Cosmum · O Livro da Mandíbula · Vigor Cósmico</div>
            <h1 style={{fontFamily:'Cinzel Decorative,serif',fontSize:22,fontWeight:900,margin:0,letterSpacing:'0.08em',background:'linear-gradient(135deg,#C8A8E8,#E8D8C0,#A855F7)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Dinastia E</h1>
            <div style={{fontSize:10,color:'#4A3A5A',fontFamily:'Cinzel,serif',marginTop:2,letterSpacing:'0.15em'}}>Livro do Mundo</div>
          </div>
          <div style={{width:80,display:'flex',justifyContent:'flex-end'}}><MasterToggle masterMode={masterMode} setMasterMode={setMasterMode}/></div>
        </div>
      </header>
      <nav style={{position:'relative',zIndex:10,display:'flex',justifyContent:'center',gap:3,padding:'9px 14px',background:'rgba(4,6,15,0.9)',borderBottom:'1px solid rgba(255,255,255,0.04)',flexWrap:'wrap'}}>
        {TABS.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'6px 12px',borderRadius:6,cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:'0.06em',border:tab===t.id?'1px solid rgba(168,85,247,0.5)':'1px solid transparent',background:tab===t.id?'rgba(168,85,247,0.12)':'transparent',color:tab===t.id?'#C8A8E8':'#5A4A6A',transition:'all 0.2s'}}>{t.icon} {t.label}</button>))}
      </nav>
      <main style={{flex:1,overflowY:'auto',position:'relative',zIndex:10, scrollBehavior: 'smooth'}}>
        <div key={tab} style={{animation: 'pageTurn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)'}}>
          {tab==='prologo'&&<PrologueSection/>}
          {tab==='classes'&&<ClassesSection/>}
          {tab==='fichas'&&<SheetsSection masterMode={masterMode}/>}
          {tab==='inimigos'&&<EnemiesSection masterMode={masterMode}/>}
          {tab==='bestiario'&&<BestiarioSection masterMode={masterMode}/>}
          {tab==='regras'&&<RulesSection/>}
          {tab==='livro'&&<LibroSection masterMode={masterMode}/>}
          {tab==='cronicas'&&<CronicasSection masterMode={masterMode}/>}
          {tab==='cenarios'&&<CenariosSection masterMode={masterMode}/>}
        </div>
      </main>
      <DiceWidget />
    </div>
  );
}
