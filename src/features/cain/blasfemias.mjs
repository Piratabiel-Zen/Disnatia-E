/**
 * AS DOZE BLASFÊMIAS — PODERES
 *
 * Cada blasfêmia tem uma passiva, que vem de graça, e cinco poderes, que se
 * compram com avanço (dois na criação). O que está aqui é um resumo mecânico
 * escrito com as nossas palavras: o suficiente para escolher na mesa e para
 * lembrar o que o poder faz sem abrir o PDF, não o texto do livro.
 *
 * `traços` é a linha de etiquetas do livro — tipo, alcance e duração — porque
 * é por ela que se decide se o poder serve para a cena que está acontecendo.
 *
 * `nomeIncerto` marca os poucos poderes cujo nome ficou ilegível na exportação
 * do PDF (os títulos dessa página são desenho, não texto). O nome que está
 * aqui descreve a função; a mesa corrige quando conferir no livro impresso.
 *
 * `sigilo` é a marca da blasfêmia, desenhada por nós em SVG — a arte do livro
 * não é nossa para copiar.
 */
export const BLASFEMIAS_COMPLETAS = Object.freeze([
  {
    id: 'tensao',
    nome: 'Tensão',
    sigilo: 'tensao',
    lema: 'Um campo psíquico de densidade e durabilidade incríveis.',
    resumo: 'Campos de densidade psíquica: cortar como lâmina, endurecer uma superfície, amolecer a matéria morta.',
    manifestacao: 'Costuma aparecer como uma superfície metálica reluzente, visível só para quem tem sensibilidade psíquica.',
    nota: 'Quem usa Tensão tende a ter episódios de síndrome de encarceramento com alguma regularidade, até dominar o poder.',
    passiva: {
      nome: 'Passiva',
      resumo: 'Quando o talismã de execução está a ponto de encher e render um ferimento, role 1d6. Com 4 ou mais você para a 1 ponto do máximo e ignora o excesso — e perde a passiva até descansar.',
    },
    poderes: [
      { nome: 'Ruptura', tracos: 'Instantâneo · Curto',
        resumo: 'Qualquer borda — uma lâmina ou uma unha — vira instrumento de corte. Role PSIQUE para cortar objeto ou oponente de até tamanho CAT num golpe limpo, gastando o pulso só no sucesso. +1D atacando para proteger alguém e +1D contra alvo imóvel.' },
      { nome: 'Maleato', tracos: 'Transmutação · Adjacente · Até o descanso',
        resumo: 'Inverte o campo dentro de um bloco de matéria por CAT: borracha (fica flexível), lama (derrete em pasta pegajosa, difícil de atravessar) ou líquido. Mexe com dificuldade e risco; ao expirar, a matéria volta devagar à forma original.' },
      { nome: 'Égide', tracos: 'Instantâneo · Curto',
        resumo: 'Quando você ou um aliado a curta distância marca estresse por dano externo, responda três perguntas: alcança o alvo a tempo? tem algo no ambiente para usar de escudo? está pondo o coração nisso? Role 1d6 por "sim" — 2 ou mais tira 1 de estresse, 6 tira 2, podendo chegar a zero. Depois, só volta no descanso.' },
      { nome: 'Estase', tracos: 'Maldição · Curto · 1 cena',
        resumo: 'Tranca você ou um grupo de tamanho CAT numa gaiola de tensão colada ao corpo como segunda pele. O alvo fica imóvel e imune a todo dano e efeito externo até a cena acabar — consciente, vendo como por um vidro grosso, sem precisar respirar — e pode ser carregado como objeto rígido. Contra humano hostil, role PSIQUE. Não dá para dissipar antes do fim.' },
      { nome: 'Fortaleza', tracos: 'Invocação · Curto · Até o descanso',
        resumo: 'Um plano reto de tensão de até CAT, que aparece como uma grande superfície de força reluzente, invisível para humanos. Só existe plano — sem curva nem dobra. Pode atravessar ou sobrepor material não vivo e barra toda matéria e energia, viva ou não.' },
    ],
  },
  {
    id: 'ardencia',
    nome: 'Ardência',
    sigilo: 'ardencia',
    lema: 'Energia potencial virada em clarão de calor ou frio extremo.',
    resumo: 'Calor e luz que atravessam o que estiver no caminho — parede, porta, obstáculo.',
    manifestacao: 'A mais potente e a mais perigosa das blasfêmias. Para os outros e para quem a pratica.',
    nota: 'Usar Ardência contra soldados humanos é tratado como desumano.',
    passiva: {
      nome: 'Fornalha interna',
      resumo: 'Você pode pegar o gancho "Poder Instável" para subir em até +2 o CAT de qualquer poder de Ardência. Quando esse gancho enche, você queima por dentro: sofre um ferimento e o gancho fecha. Se o ferimento for fatal, você explode numa área igual ao seu CAT e nada ali sobrevive.',
    },
    poderes: [
      { nome: 'Sabre', tracos: 'Instantânea · Alcance CAT',
        resumo: 'Um feixe destrutivo em linha reta, que atravessa parede, porta e obstrução sem esforço — altíssimo e ofuscante. Role PSIQUE, gastando o pulso só no sucesso. Opcionalmente tire o limitador: cada "6" corta uma caixa extra do talismã, mas custa 2 de estresse, que pode te ferir ou te matar.' },
      { nome: 'Inferno', tracos: 'Transmutação · Adjacente · Até o descanso',
        resumo: 'Despeja energia no chão e em tudo que o toque numa área CAT+2, quente ou frio. Esquentar incomoda humanos e muda a temperatura das superfícies; escaldar expulsa humanos da área, incomoda exorcistas e Pecados, congela ou ferve água e quebra vidro; ferver é mortal para humanos e dá 2 de estresse a Pecado ou exorcista que fique mais de uma cena. +1D para quem aproveitar.' },
      { nome: 'Fúria', tracos: 'Instantânea · Longo',
        resumo: 'Uma explosão feroz num ponto do alcance, com área de até CAT. Role PSIQUE e responda: aceita causar dano indiscriminado, sem se importar com o que queima? aceita deixar a raiva decidir o resultado? Cada "sim" afeta o resultado independentemente dos dados — e com pelo menos um, a área é sempre o CAT máximo e os aliados por perto sofrem 2 de estresse que não dá para ignorar. Depois de usar, só volta no descanso.' },
      { nome: 'Vazio', tracos: 'Instantânea · Curto',
        resumo: 'Queima o ar e abre um vácuo instantâneo numa área até CAT, com um estrondo ensurdecedor, afetando todos menos você. Fraco suga o que está solto; médio derruba e puxa todos para o centro; forte desequilibra ou arrasta Pecados e veículos de até CAT e estilhaça vidro. +1D para quem aproveitar.' },
      { nome: 'Tempestade', tracos: 'Transmutação · Extrema · Toda a caçada',
        resumo: 'Gaste quantos pulsos quiser para mandar energia potencial à atmosfera e mudar o tempo numa microrregião — uma escolha por pulso. Céu limpo cancela a previsão; frio congela a água das vias e vira a chuva em neve; neblina atrapalha ver e ouvir; vendaval empurra tudo ao ar livre. Dura a missão inteira ou até você dispensar.' },
    ],
  },
  {
    id: 'fluxo',
    nome: 'Fluxo',
    sigilo: 'fluxo',
    lema: 'A direção e o fluxo do próprio tempo.',
    resumo: 'Correntes e o tempo delas: congelar, acelerar, reverter o que já aconteceu.',
    manifestacao: 'Poder relativamente novo e, por enquanto, mal compreendido.',
    nota: 'Eventos temporais são rigorosamente regulados pela TEMERITY, através de um Pecado cativo chamado Spindle.',
    passiva: {
      nome: 'Roubar tempo',
      resumo: 'Uma vez por caçada, qualquer um pode rolar de novo todos os dados de descanso e ficar com o segundo resultado. Isso pode dar déjà vu. Vários dos seus poderes dão o gancho "instabilidade temporal"; quando ele se resolve, role 1d6: a agenda ganha de vez "prove que você é você mesmo"; ferimentos surgem sem causa; você desaparece até o descanso e volta sem lembrar de onde estava, com 2 de estresse; acorda com a roupa de outra pessoa e perde o PK da missão, mas recupera os pontos de kit gastos; uma perícia sua cai a 0d até o fim da missão; ou o seu rosto fica um pouco diferente, para sempre.',
    },
    poderes: [
      { nome: 'Congelar', nomeIncerto: true, tracos: 'Transmutação · Instantânea · Si mesmo',
        resumo: 'Gaste até três pulsos para congelar o tempo numa área CAT ao seu redor. Role 1d6 por pulso e some: são os segundos que você tem. Tudo que entra na área é afetado na hora, e fora dela o tempo corre normal. Lá dentro você não usa nem sofre poder psíquico — os que estavam ativos se dissipam — e pode fazer uma atividade que caiba no tempo; qualquer teste de ação encerra o efeito, dê no que der.' },
      { nome: 'Acelerar', tracos: 'Instantânea · Adjacente',
        resumo: 'Acelera a cura natural, sua ou de outra pessoa: 1d3 de estresse curado na hora, +1 se o alvo já estiver ferido. Também atende um grupo CAT de humanos morrendo ou feridos — os que estão morrendo ficam estabilizados e inconscientes, os gravemente feridos conseguem se mover devagar por conta própria, e os ferimentos leves saram por completo. Depois, instabilidade temporal.' },
      { nome: 'Reverter objeto', nomeIncerto: true, tracos: 'Adjacente · Instantâneo',
        resumo: 'Toque um objeto de até tamanho CAT e desfaça a última hora dele: ele volta ao lugar onde estava, o dano se desfaz. Continua afetando o mundo físico — o que estiver no caminho é atingido e o que estiver em cima vai junto — e você rola PSIQUE se houver dano ou impacto. Não devolve vida a matéria não viva, como cadáveres, mas move e reverte dano neles como se estivessem vivos.' },
      { nome: 'Bolha', nomeIncerto: true, tracos: 'Transmutação · Instantânea · 1 cena',
        resumo: 'Uma bolha de tempo alterado de área CAT, com uma janela para um dia atrás ou um dia à frente do momento em que ela foi criada. Você e os aliados entram e saem à vontade; exorcistas do presente presos nela não são afetados, mas humanos e o mundo do presente ficam "pausados", deixam de existir enquanto ela durar e não guardam memória. O que sai da bolha desaparece até voltar. É uma linha alternativa: nada feito lá dentro aparece no presente. +1D para quem aproveitar.' },
      { nome: 'Recausar', nomeIncerto: true, tracos: 'Instantânea · Curto',
        resumo: 'Logo depois de ver o resultado, reverta brevemente o tempo e altere a causalidade de qualquer coisa que veio de uma rolagem sua ou de um aliado no alcance CAT. Role a ação de novo e fique com o segundo resultado. Ao usar, você ganha instabilidade temporal.' },
    ],
  },
  {
    id: 'vetor',
    nome: 'Vetor',
    sigilo: 'vetor',
    lema: 'Imbuir objetos ou seres vivos de uma explosão repentina de velocidade.',
    resumo: 'Força dirigida à distância: arremessar, atirar, mover o que não se alcança.',
    manifestacao: 'Velocidade que você empresta e retira — do que voa na sua direção, inclusive.',
    nota: 'Tem a maior taxa de mortalidade entre usuários sem treino, que em geral morrem de queda.',
    passiva: {
      nome: 'Freio',
      resumo: 'Tira automaticamente a velocidade de todo projétil que fosse te acertar: eles chegam com 1 de estresse a menos.',
    },
    poderes: [
      { nome: 'Corrente', tracos: 'Transmutação · Alcance CAT · Até o descanso',
        resumo: 'Uma força vetorial fraca e persistente desenha uma linha de comprimento CAT+2 e largura de rua, empurrando sempre numa direção — inclusive para cima ou para baixo, como um vento forte. Aliados que vão a favor ganham +1D para se mover; quem vai contra tem dificuldade, o que cai cai devagar, e ações contra quem luta contra a corrente ganham +1D. Você dissipa quando quiser.' },
      { nome: 'Bala', tracos: 'Instantânea · Alcance CAT+1',
        resumo: 'Rajadas de velocidade na ponta dos dedos, virando balas de ar pressurizado que acertam com força extrema. Role PSIQUE, gastando o pulso só no sucesso. +1D atirando de posição elevada e +1D para desarmar, distrair ou incapacitar em vez de causar dano.' },
      { nome: 'Arremesso', tracos: 'Adjacente · Instantânea',
        resumo: 'Com um toque, imbua velocidade em si mesmo, num objeto ou num ser vivo e lance-o longe: tamanho somado ao alcance do lançamento não passa de CAT+2, e a direção não muda depois de lançado. Alternativamente, tire toda a velocidade de algo de até CAT+2 com um toque e pare aquilo por completo. Role PSIQUE para os efeitos e para qualquer dano.' },
      { nome: 'Levantar', tracos: 'Encantamento · Si mesmo · 1 cena',
        resumo: 'Inverte a gravidade sobre você e um grupo de tamanho CAT: correr, andar e escalar superfícies verticais; diminuir a própria queda à vontade, sem se machucar caindo; e planar por uma distância CAT, desde que você comece no alto. Mexe com dificuldade e risco.' },
      { nome: 'Sutileza', tracos: 'Si mesmo · passivo',
        resumo: 'Vetores finos o bastante para fazer à distância, a ½ do alcance CAT, o que você faria com as mãos: girar uma chave, digitar num teclado. Role a perícia que couber, como Interface. Funciona mesmo com o caminho até o alvo bloqueado, como se você pudesse alcançá-lo — e dá para pegar objetos e movê-los pelo ar, nada maior nem mais pesado que um laptop ou uma maleta cheia.' },
    ],
  },
  {
    id: 'portao',
    nome: 'Portão',
    sigilo: 'portao',
    lema: 'Manipule o espaço como um escultor trabalha a argila.',
    resumo: 'Rasgar e redobrar o espaço: passagens, duplicatas, um lugar reorganizado por dentro.',
    manifestacao: 'Fendas, bolsos e prédios maiores por dentro do que por fora.',
    nota: 'O uso indevido pode levar a perdas extremas de pessoal. Use com cautela.',
    passiva: {
      nome: 'Bolso',
      resumo: 'Você costura um rasgo comprimido no espaço numa peça de roupa que esteja vestindo. Ganha +1 PK, e o bolso guarda e devolve itens que somem até 3 PK — num espaço extradimensional, escondidos e seguros, independente do tamanho. O bolso está preso à roupa: se ela for destruída, o conteúdo salta para fora.',
    },
    poderes: [
      { nome: 'Rasgar', tracos: 'Invocação · Até o descanso',
        resumo: 'Marque dois pontos dentro do alcance CAT, precisando ver os dois na hora, e eles ficam ligados por uma fenda no tecido da realidade — um portal que se atravessa como se os dois lugares fossem lado a lado. Objetos, seres e forças de até ½ CAT de tamanho passam livremente enquanto durar, e o momento se preserva. +1D para quem agir aproveitando a passagem.' },
      { nome: 'Comprimir', tracos: 'Instantânea · Alcance especial',
        resumo: 'Escolha um ser vivo ou objeto à vista cujo tamanho somado à distância não passe de CAT+2 e comprima o espaço entre vocês para trazê-lo ao seu lado. Da perspectiva dele, quem se distorce é o mundo; ignora toda obstrução física — enquanto você o vê, ele simplesmente aparece ali. Role PSIQUE se o alvo resistir, gastando o pulso só no sucesso. +1D para quem aproveitar.' },
      { nome: 'Florecer', tracos: 'Invocação · Curto · 1 cena',
        resumo: 'Dividindo o espaço de maneiras criativas, você cria até CAT+1 duplicatas controláveis de quaisquer dos seus membros ou mãos, emergindo de fendas em superfícies a curta distância. Elas ficam presas no lugar e não se movem, mas você as comanda como membros normais e sente por elas; podem nascer em qualquer superfície, inclusive em movimento ou viva; e você absorve o estresse que elas sofreriam.' },
      { nome: 'Labirinto', tracos: 'Transmutação · Alcance CAT · Toda a caçada',
        resumo: 'Você reorganiza uma estrutura por dentro: criar, remover ou remanejar portas e janelas; somar cômodos; virar a direção da gravidade dentro de um cômodo; aumentar ou diminuir; rearranjar como preferir. Não dá para remover cômodo por completo, deixar algum menor que um armário ou maior que um salão de baile, nem acrescentar o que o prédio já não tenha além de corredores — então ele pode ficar maior por dentro do que por fora. Para cada escolha o Admin rola 1d6: saindo pelo menos um "1", ele ganha um uso deste poder contra você, no seu CAT atual, para quando quiser. +1D para quem aproveitar.' },
      { nome: 'Transmissão', tracos: 'Instantânea · Alcance CAT+2',
        resumo: 'Mova-se instantaneamente para qualquer ponto no alcance CAT+2. O Admin pergunta se você conhece o destino, se consegue ver para onde vai e se está calmo e concentrado, e rola 1d6 por resposta. Com pelo menos um "1" você chega num lugar diferente perto do destino, escolhido pelo Admin; com dois, você passa brevemente por outro lugar antes de chegar e ainda sofre 2d3 de estresse.' },
    ],
  },
  {
    id: 'sufoco',
    nome: 'Sufoco',
    sigilo: 'sufoco',
    lema: 'Suprima as propriedades inatas do universo. Minta para Deus.',
    resumo: 'Tirar o que as coisas têm de próprio: função, som, luz, peso, atrito.',
    manifestacao: 'Objetos que ninguém reconhece, chão que não segura o pé, silêncio absoluto.',
    nota: 'As perspectivas de sobrevivência a longo prazo são ruins, mas compensadas pela utilidade.',
    passiva: {
      nome: 'Ausência',
      resumo: 'Você pode subir em +2 o CAT de qualquer poder de Sufoco, até o teto de CAT 7 — mas ao fazer isso ganha o gancho "Ausência". Se esse gancho encher, você sofre um ferimento e desmaia por instantes; ao acordar, falta uma parte do corpo (role 1d6), que simplesmente desapareceu como se nunca tivesse existido, deixando um toco ou um buraco. Ela não volta, nem curando o ferimento.',
    },
    poderes: [
      { nome: 'Abstrair', tracos: 'Transmutação · Curto · 1 cena',
        resumo: 'Com um gesto, você remove as propriedades reconhecíveis de até CAT+1 objetos distintos que se possa segurar ou usar — ferramentas, veículos, janelas, portas. Eles não servem mais para o que serviam, e nenhum humano, Pecado ou exorcista, incluindo você, consegue reconhecê-los; encarar por muito tempo causa desconforto extremo. Arma não atira, porta não abre, janela não deixa ver. +1D para quem aproveitar, e mexe com os parâmetros das rolagens enquanto está ativo.' },
      { nome: 'Suavizar', tracos: 'Transmutação · Curto · 1 cena',
        resumo: 'Tira quase todo o atrito de um grupo de humanos ou exorcistas de tamanho CAT, ou de uma área de tamanho CAT. Os alvos ficam incrivelmente escorregadios; numa área, fica difícil ficar de pé, escalar ou andar — só deslizar. Role PSIQUE contra alvos hostis, gastando o pulso só no sucesso, e molde a área se quiser afetar só parte dela ou abrir um caminho. +1D para quem aproveitar, inclusive mexendo em dificuldade e risco.' },
      { nome: 'Idade das trevas', tracos: 'Encantamento · Si mesmo · Até o descanso',
        resumo: 'Um campo poderoso sai do seu corpo e impede até os avanços humanos mais simples de funcionarem na área CAT. O efeito anda com você. Escolha até três coisas para suprimir — eletricidade, internet, motor de combustão, água corrente, maçanetas, trincos de janela, zíperes, fechos — e elas simplesmente deixam de funcionar. +1D para quem aproveitar.' },
      { nome: 'Cegar', tracos: 'Transmutação · Adjacente · 1 cena',
        resumo: 'Até CAT objetos ou seres vivos, ou uma área de até CAT que você toque, deixam de produzir som, de refletir luz, ou as duas coisas, pela cena. Numa pessoa, o efeito anda com ela; num local, remove todo o som e a luz da área — e dá para filtrar, deixando som e luz funcionarem lá dentro mas sem entrar nem sair. +1D para quem aproveitar.' },
      { nome: 'Oco', tracos: 'Encantamento · Adjacente · Até o descanso',
        resumo: 'Remove temporariamente o peso de um único objeto, humano ou exorcista: se for mais pesado que isso, passa a pesar 450 g no total.' },
    ],
  },
  {
    id: 'sussurro',
    nome: 'Sussurro',
    sigilo: 'sussurro',
    lema: 'Sua sombra é animada e faminta. Ela conhece o futuro.',
    resumo: 'Uma sombra que acompanha, sente e responde — com pouquíssimas palavras.',
    manifestacao: 'O alter ego costuma se manifestar na puberdade e só você o vê, invisível até para outros exorcistas.',
    nota: 'A crença comum é que a sombra vista seja um componente da sua própria morte futura.',
    passiva: {
      nome: 'Sombra',
      resumo: 'Você abriga um ser à parte que o segue por toda parte, até dormindo. Ela é intangível e invisível para todos, inclusive para sensíveis psíquicos; interage fracamente com o mundo físico e tem mente e sentidos próprios, com alcance curto a partir de você. Atravessa paredes com facilidade, mas se recolhe para dentro do seu corpo sob luz forte, sem conseguir fazer nada. Você fala com ela por telepatia, mas é perigoso: 1 de estresse ao fim de qualquer interação. Ela não é obrigada a dizer a verdade, a não ser que você use seus poderes — e ela conhece o futuro. O Admin responde por ela.',
    },
    poderes: [
      { nome: 'Arrepio', tracos: 'Encantamento · Si mesmo · 1 cena',
        resumo: 'Procurando um humano, Pecado, exorcista, local ou objeto, declare "eu sinto um arrepio" e mande um pulso num raio CAT ao seu redor, que fica ativo na cena. Enquanto o alvo estiver perto o bastante para estar no alcance, você sente um frio e um desconforto fortes e localiza a sensação com facilidade; rastrear nunca é difícil, e se o alvo estiver a curta distância você ganha +1D para rastrear ou localizar.' },
      { nome: 'Dissecar', tracos: 'Instantânea · Alcance CAT',
        resumo: 'Examine um humano ou exorcista à vista. Role PSIQUE e faça uma pergunta por sucesso — está mentindo? qual é a emoção principal? de onde acabou de vir? para onde pretende ir? A sombra responde usando no máximo três palavras por resposta. +1D para quem aproveitar cada resposta.' },
      { nome: 'Presságio', tracos: 'Instantânea · Si mesmo',
        resumo: 'Pergunte à sombra "o que acontece se eu fizer X?", sendo X uma sequência simples que você planeja para a próxima cena ou hora: abrir esta porta, ir à reunião, atacar esta pessoa, descer esta rua. Ela dá uma impressão breve do futuro. Ou +1D para você ou um aliado que agir de acordo com a resposta, ou role o dado de risco antes da ação — você pode desistir, e se seguir o mesmo caminho mais tarde, usa o risco já rolado.' },
      { nome: 'Precognição', tracos: 'Instantânea · Si mesmo',
        resumo: 'Quando o Admin estabelece algo, você pode "ter um flashback": refaça a cena no passado, onde você teve uma visão do momento atual. Não altera os fatos já estabelecidos do presente, mas muda a situação ou detalhes dela, ajudando você ou um aliado — você já tinha trancado ou destrancado a porta, guardado o equipamento, feito a ligação. Se usar para equipamento, marque PK normalmente. Situação complicada custa 1 de estresse não letal; complexa ou improvável, 3.' },
      { nome: 'Onipresença', tracos: 'Instantânea · Alcance CAT+2',
        resumo: 'Quando um aliado está numa cena em que você não está, você pode se declarar presente nela. Depois de usar, você perde este poder até descansar.' },
    ],
  },
  {
    id: 'edit',
    nome: 'Edit',
    sigilo: 'edit',
    lema: 'As coisas como são não precisam ser como são.',
    resumo: 'Alterar os detalhes: a aparência, a cópia, a pequena correção na realidade.',
    manifestacao: 'Você filtra os fios das possibilidades e convida um deles a se fundir com o mundo real.',
    nota: 'A doutrina CAIN afirma que a existência de realidades "alternativas" não está comprovada.',
    passiva: {
      nome: 'Mímica',
      resumo: 'Você altera pequenos detalhes da própria aparência, com o corpo em repouso e dentro de uma variação do corpo original: altura e peso, traços do rosto, cor da pele, cabelo, apresentação de gênero, e idade de 13 a 88 anos. Você sempre fica vagamente parecido consigo, como um parente distante, e as roupas se ajustam sem que você as escolha. Não muda nenhuma habilidade ou capacidade, não devolve partes do corpo perdidas e não esconde marca de pecado nem cicatriz.',
    },
    poderes: [
      { nome: 'Cópia', tracos: 'Invocação · Adjacente · 1 cena',
        resumo: 'Uma cópia temporária e exata de um humano ou exorcista: um doppelgänger simples e obediente, sem muita inteligência e sem conseguir falar. Dê a ele uma ou duas instruções simples e ele cumpre como puder. Copia o alvo no estado atual, com o que ele veste e carrega, mas não usa nem se beneficia de poderes psíquicos e rola apenas 1d6 para qualquer ação. Dissolve numa gosma pálida quando a cena acaba, quando qualquer outra pessoa o toca ou se sofre qualquer dano.' },
      { nome: 'Uniforme', tracos: 'Encantamento · Si mesmo · Até o descanso',
        resumo: 'Uma edição breve de si mesmo, feita em alguma privacidade, por mais tênue que seja: você passa a fazer parte oficialmente de qualquer profissão ou grupo com mais de 5 membros, com uniforme, equipamento, identidade e filiação — a realidade se altera para que isso aconteça. As pessoas podem não lembrar de você em particular, mas têm a noção vaga de que você era do grupo. Você não adquire nenhuma habilidade do grupo.' },
      { nome: 'Filtro', tracos: 'Maldição · Curto · 1 cena',
        resumo: 'Você troca até CAT humanos por uma versão deles de uma linha temporal alternativa. Role PSIQUE para afetar alvo hostil, gastando o pulso só no sucesso. Pode mudar o que eles vestem (o que estiver nas mãos continua igual) e a aparência física. Eles mantêm as memórias, e a realidade se acomoda à troca, o que desorienta humanos despreparados; qualquer outra mudança sua é perfeita em todos os aspectos. +1D para quem aproveitar.' },
      { nome: 'Utilidade', tracos: 'Curto · Até o descanso',
        resumo: 'Quando precisar, faça qualquer objeto, ferramenta ou veículo comum que caiba num cômodo pequeno aparecer numa superfície ao alcance, como se sempre tivesse estado ali, sem gastar PK. O Admin escolhe um defeito, ou dois se o item for raro ou perigoso: usado, amassado e de baixa qualidade; é um item real de alguém por perto, que vai procurá-lo; tem defeito e parece imitação barata, de material estranho e textura orgânica; ou falta peça e não funciona como deveria. O item nunca é único — é sempre o representante genérico de uma categoria — e desaparece depois de um tempo sem uso.' },
      { nome: 'Absurdo', tracos: 'Transmutação · Adjacente · 1 cena',
        resumo: 'Um campo do tamanho de um cômodo pequeno, com você dentro, que afeta toda a matéria. +1D para examinar o conteúdo da área, e lá dentro você pode deixar matéria transparente ou opaca; mudar a iluminação como se a fonte fosse invisível, ou apagar as fontes de luz; mover objetos sem tocá-los e fixá-los flutuando em qualquer ponto; desmontar objeto inanimado solto ou mobília nas partes dele, e remontar objeto quebrado, desde que as peças estejam ali. Expira no fim da cena ou se você sair da área. +1D para quem aproveitar.' },
    ],
  },
  {
    id: 'vinculo',
    nome: 'Vínculo',
    sigilo: 'vinculo',
    lema: 'Com a vontade de quem possui, até Pecados podem ser controlados.',
    resumo: 'Um Pecado menor preso a você, obediente — e a arte herética de vincular.',
    manifestacao: 'Pecados ligados a talismãs especialmente preparados, em forma espiritual.',
    nota: 'Vincular é arte antiga e herética, punida com execução imediata. A CAIN oferece sentença indefinida a vinculadores que fiquem a serviço dela.',
    passiva: {
      nome: 'Pecado vinculado',
      resumo: 'Você tem a essência obediente de um Pecado menor aprisionada a você, sob seu controle, com forma e habilidades animalescas que você determina. Ele entende linguagem, não fala e é invisível para humanos. Segue você a curta distância, obedece ordens simples e usa as habilidades dele para o que for; capacidades gerais CAT 0. Qualquer estresse o bane pelo resto da cena, a não ser que você absorva psiquicamente o que ele sofreu. Em cena de conflito, você pode sacrificar o seu turno para que ele aja no seu lugar, sob seus comandos — fora disso ele não age por conta própria.',
    },
    poderes: [
      { nome: 'Proibido', tracos: 'Si mesmo · Instantâneo',
        resumo: 'Potencialize seu pecado numa única ação: ele perde as limitações do espírito, a ação ganha +1D e ele sofre uma transformação monstruosa, parecida com a forma original. Fica de tamanho CAT+1 e move, levanta, golpeia ou arremessa objetos e seres do mesmo tamanho com facilidade. Role PSIQUE para os efeitos. Depois da ação, ele volta ao tamanho normal — e se você verter pecado por causa disso, role 1 dado a menos para pegar a marca.' },
      { nome: 'Render', tracos: 'Encantamento · Si mesmo · Até o descanso',
        resumo: 'Você usa a energia do seu pecado para se fundir parcialmente com a essência dele. O corpo sofre uma transformação leve e você manifesta imediatamente uma habilidade da marca, rolando para determinar qual, e a mantém até descansar. Você pode ganhar 1 de pecado para rolar a habilidade da marca de novo, quantas vezes quiser, a qualquer momento enquanto o poder estiver ativo. E ao absorver estresse pelo seu pecado, você recebe 1 a menos.' },
      { nome: 'Espírito da horda', tracos: 'Si mesmo · 1 cena',
        resumo: 'Gaste um pulso para fortalecer seu pecado por uma cena: na próxima vez que ele usar uma ação para se deslocar ou se mover, ganha +1D. Como parte dessa ação, você pode transformá-lo em veículo ou criatura montável de até tamanho CAT por uma cena — ele se move na velocidade CAT, fica parcialmente visível para humanos e tem espaço para um grupo de passageiros de tamanho ½ CAT — e nessa forma ele pode planar por uma curta distância, com ou sem passageiros.' },
      { nome: 'Espírito caçador', tracos: 'Si mesmo · 1 cena',
        resumo: 'Gaste um pulso para fortalecer seu pecado por uma cena: na próxima vez que ele observar, ganha +1D. Como parte dessa ação, ele pode se separar de você a distâncias extremas quando liberado, e adquire olfato extremamente apurado, visão no escuro e no espectro térmico, com clareza a longa distância. Você também pode se concentrar, dissociando-se do próprio corpo e ficando extremamente vulnerável: enquanto se concentra, usa os sentidos do pecado em vez dos seus, ligando e desligando à vontade na cena.' },
      { nome: 'Penumbra', tracos: 'Invocação · Adjacente · Até o descanso',
        resumo: 'Você desenha um grande círculo cobrindo uma área de até CAT+1 e escolhe um tipo: um manto branco que impede a entrada de Pecados mas deixa humanos e exorcistas passarem; a versão que impede a saída em vez da entrada; ou a que faz quem está fora não ver o interior e agir como se a área não existisse. A prisão leva alguns minutos para ativar e surtir efeito, e dura até você descansar ou até ser destruída. Um atacante sobrenatural pode destruí-la: ela resiste ao estresse como um talismã de execução.' },
    ],
  },
  {
    id: 'palacio',
    nome: 'Palácio',
    sigilo: 'palacio',
    lema: 'O conteúdo da sua mente é tão concreto para você quanto a própria realidade.',
    resumo: 'Abrir um espaço próprio e habitá-lo. Dentro dele mora um tulpa.',
    manifestacao: 'Uma casa, residência ou mansão grande, num lugar que você escolhe, com aparência e decoração sob seu controle.',
    passiva: {
      nome: 'Santuário',
      resumo: 'Você e os aliados que descansam com você podem entrar no palácio psíquico durante o descanso, o que dá +1 nos testes de descanso seus e de um aliado à sua escolha. O palácio é uma projeção mental, um espaço onírico — sair do local simplesmente devolve você. Sofrer dano lá dentro expulsa e acorda a pessoa na hora, em vez de ferir de verdade, e os visitantes saem quando quiserem. Entrar é fechar os olhos e se concentrar, o que deixa o corpo de fora indefeso e insensível; você pode fazer isso a qualquer momento, e seus aliados só descansando com você ou pelos seus poderes.',
    },
    poderes: [
      { nome: 'Hall de entrada', tracos: 'Invocação · passiva e ativa',
        resumo: 'Passiva: o palácio tem um tulpa, um ser psíquico em forma de servo ou mordomo, leal a você, com personalidade e aparência que você define ao adquirir o poder. Ativo: invoque o tulpa para ele te auxiliar numa tarefa de pesquisa, artesanato ou investigação, dando +1D na próxima rolagem e um corte extra no talismã por cada "6" que você rolar; ou manifeste-o brevemente fora do palácio, a curto alcance, como uma pessoa real, espelho da sua aparência ou vestido como você quiser, com as capacidades de um comum (categoria 0) e 2d para o que um mordomo típico faria. Qualquer dano o bane de volta ao palácio.' },
      { nome: 'Salão', tracos: '1 cena · Área de investigação',
        resumo: 'Escolha uma pessoa ou um grupo de até CAT na área de investigação e diga o nome real de cada um para trazer a sombra psíquica deles para dentro do palácio, onde quer que estejam. Se os alvos estiverem dispostos, você pode trazer a consciência mesma, deixando os corpos vulneráveis. Se não, role PSIQUE e gaste o pulso só no sucesso: a pessoa não é afetada, e o que vem é uma cópia da mente dela no momento da invocação. Memórias formadas pelo duplo não voltam para a original, e ele não sai até a cena acabar ou sofrer dano. Ninguém invocado assim é obrigado a agir diferente do original.' },
      { nome: 'Biblioteca', tracos: 'Si mesmo · 1 cena',
        resumo: 'O palácio guarda uma biblioteca de informações do subconsciente psíquico: +1D quando você for coletar informação ou investigar qualquer assunto. Em seguida, o Admin rola 1d6 para cada pergunta — a informação é rara? é proibida de alguma forma? é pertinente a um grupo poderoso? — e para cada "1" você sofre 2 de estresse não letal, por ler algo perturbador.' },
      { nome: 'Bar', tracos: 'Instantânea · Si mesmo',
        resumo: 'Uma vez por cena, abra qualquer porta fechada e dê de cara com um bar físico e real, pequeno e bem abastecido, com petiscos, alguns pratos quentes e bebidas, reabastecido entre as missões. Ele só existe enquanto você estiver dentro ou segurando a porta; itens e pessoas lá dentro são empurrados para fora antes de ele desaparecer. Descansando no bar, role 1d3+1 e gaste as cargas: 1 elimina 1 de estresse de uma pessoa, 2 desmarcam uma marca em todos os ganchos de uma pessoa, 3 removem um ferimento — descrevendo a bebida, o lanche, a refeição ou o conforto que você preparou para o convidado.' },
      { nome: 'Prisão', tracos: 'Encantamento · Alcance infinito · Instantâneo',
        resumo: 'Simule situações dentro do palácio antes de viver, definindo um número de aliados igual a ½ CAT mesmo sem estar fisicamente presente. Só dá para definir quem você consegue descrever como treinou ou preparou, com ele ou com uma cópia psíquica dele, para a situação atual. A definição nunca pode ser arriscada e também não reduz risco. Se você falhar na rolagem, pode sofrer 1d3 de estresse não letal para rolar de novo, valendo o segundo resultado.' },
    ],
  },
  {
    id: 'assombracao',
    nome: 'Assombração',
    sigilo: 'assombracao',
    lema: 'Corte o corpo e a alma com uma faca de trinchar.',
    resumo: 'Ver e tratar com o que ficou: almas, rastros, presenças de quem passou.',
    manifestacao: 'O mundo invisível dos vestígios da graça, visto com os olhos fechados.',
    nota: 'Entre todos os exorcistas, os de Assombração são os mais propensos a "se esvaziar" durante o sono, deixando um corpo vazio. É muito raro, de causa desconhecida, e 100% fatal.',
    passiva: {
      nome: 'Conexão fantasma',
      resumo: 'Você liga sua mente por telepatia a até CAT pessoas dispostas que você tocar. Mesmo a longa distância um do outro, vocês conversam telepaticamente e sentem o estado emocional um do outro. O efeito dura até você usá-lo de novo, até alguém ficar inconsciente, ou até você ou outra pessoa encerrar a conexão.',
    },
    poderes: [
      { nome: 'Fios', tracos: 'Encantamento · Si mesmo · Até o descanso',
        resumo: 'Você fecha os olhos e vê, através das pálpebras, os padrões que a alma deixa no ambiente: seres vivos até através de paredes, dentro do alcance CAT, e o rastro de luz tênue que um Pecado ou alguém forte em graça deixa no ar. +1D em ações para rastrear ou localizar seres vivos e vestígios na área. Em troca, você não vê matéria inanimada — fica efetivamente cego — e ações que dependem da visão ficam difíceis. Termina quando você abre os olhos ou descansa.' },
      { nome: 'Profanar', tracos: 'Adjacente · Instantâneo',
        resumo: 'Injete um semblante de vida nos cadáveres de até CAT humanos ou exorcistas, tocando os olhos deles. Você faz três perguntas no total, independentemente de quantos animar, e depois eles voltam à morte; o efeito também expira se passar uma hora. Não dá para usar duas vezes no mesmo cadáver, e não funciona sem cabeça, cérebro ou língua. Não devolve a vida: acessa memórias. O cadáver é obrigado a responder com sinceridade, mas só fala do que sabia antes de morrer, pode ter conhecimento parcial da situação e fala pelo próprio ponto de vista. Depois, você perde o poder até descansar.' },
      { nome: 'Possessão', tracos: 'Maldição · Curto · 1 cena',
        resumo: 'Projete sua percepção para fora e possua um humano, animal ou cadáver em bom estado que você veja no alcance, por uma cena. Seres sobrenaturais são imunes, e humanos que resistem podem exigir um teste de PSIQUE. Seu corpo real fica insensível e indefeso. Em humanos e animais, você não pode forçar o alvo a se ferir nem a agir de modo que o machuque indiretamente; as ações usam as perícias dele, mas o corpo e o equipamento mudam as circunstâncias. Você é expulso se o corpo sofrer estresse. +1D para quem aproveitar.' },
      { nome: 'Espírito', tracos: 'Si mesmo · 1 cena',
        resumo: 'Projete a percepção para fora do corpo e vague por um alcance CAT+2 como um ser de pura energia psíquica; o corpo real fica insensível e indefeso. Você voa na velocidade CAT, é invisível para quem não é sensível psiquicamente e atravessa parede, piso e objeto com facilidade — mas não interage com o mundo físico nem é afetado por ele, e não pode usar os próprios poderes psíquicos, embora poderes e efeitos de outros ainda te afetem. Se a forma for destruída por força sobrenatural, você sofre 1 de estresse, o poder termina e não volta até a cena passar. Mexe fácil com dificuldade e risco.' },
      { nome: 'Passageiro', tracos: 'Maldição · Alcance extremo · 1 cena',
        resumo: 'Escolha um grupo de pessoas dispostas de tamanho até ½ CAT, no alcance extremo, que consigam te ouvir — inclusive telepaticamente — ou te ver, e absorva a presença psíquica delas para dentro do seu corpo. Os corpos delas ficam dormentes, vulneráveis e insensíveis. Elas passam a compartilhar o controle do seu corpo com você, sentidos incluídos; você pode ceder o controle para que façam testes de ação com as perícias e habilidades delas, mas o seu corpo (equipamento, acesso) não muda, e você pode ajudar nesses testes normalmente. Elas não usam poderes psíquicos enquanto te possuem dessa forma, e você sofre os danos e as consequências das ações delas.' },
    ],
  },
  {
    id: 'simpatia',
    nome: 'Simpatia',
    sigilo: 'simpatia',
    lema: 'Os humanos deixam impressões em tudo o que tocam. Você pode fazer mais do que tocar.',
    resumo: 'Correspondência: tocar um objeto e ler, ampliar ou convencer o que ele guarda.',
    manifestacao: 'Ressonância com objetos comuns, que deixam de ser só objetos.',
    nota: 'A psicometria é proibida no campus — Castle ref 0094.',
    passiva: {
      nome: 'Ressonância',
      resumo: 'No começo da missão, role na tabela de ressonância: 1d3 e depois 1d6. Numa rolagem de ação em que você usa um item com o qual tem ressonância, +1D. Você pode gastar um pulso psíquico a qualquer momento para rolar outra ressonância, mantendo até três ativas ao mesmo tempo, mas se beneficiando de uma por vez. A tabela vai de celulares, luzes, facas, chaves, livros e tacos de baseball a bolas, armas, canecas, computadores, sapatos e ferramentas elétricas, até cordas, martelos, carros, portas, mochilas e luvas.',
    },
    poderes: [
      { nome: 'Ligação', tracos: 'Encantamento · 1 cena',
        resumo: 'Crie, pela cena, uma ligação incrivelmente forte com um objeto que você esteja segurando com uma ou as duas mãos. Você entra em ressonância com ele, e ele continua mundano. Passa a servir de arma de corte ou concussão mesmo sem ser arma, com mais ou menos a força de um bastão ou espada de CAT 0; fica virtualmente indestrutível e volta voando à sua mão a curta distância. E você pode descarregar o efeito num golpe, dando ao objeto poder destrutivo sobrenatural igual a CAT — role PSIQUE, já com o +1D da ressonância — o que encerra o efeito e destrói o item.' },
      { nome: 'Psicometria', tracos: 'Instantâneo · Adjacente',
        resumo: 'Toque objetos para visualizar as memórias deles, até CAT dias atrás. Role PSIQUE e faça uma pergunta, mais uma por sucesso: onde este objeto esteve, quem o tocou, para que foi usado, a que mais ele está ligado no entorno imediato. Depois de usar, você perde o poder até descansar.' },
      { nome: 'Amplificar', tracos: 'Invocação · Adjacente · 1 cena',
        resumo: 'Toque um objeto mundano que não seja arma, de até tamanho CAT: você entra em ressonância com ele automaticamente na cena e as propriedades dele são ampliadas a níveis extremos, como se estivessem na escala de um CAT — a velocidade, a dirigibilidade e a resistência de um carro; o brilho, a intensidade e a área de uma luz; a capacidade de uma porta de travar e resistir a impacto. Mexe fácil com dificuldade e risco, e o objeto continua mundano.' },
      { nome: 'Diplomacia', tracos: 'Instantâneo · Curto',
        resumo: 'Faça um pedido simples a um objeto como se ele fosse pessoa, ou uma pergunta de sim ou não. Pedir a uma porta que abra ou fique fechada mesmo sem tranca e sem chave, a um computador que desligue ou ache uma informação, a um carro que ligue sem chave ou dirija sozinho. Se precisar de teste, role PSIQUE ou use uma ação social, como negociação ou autoridade. Afeta objetos de até tamanho CAT, e objetos perguntados só respondem sim ou não, sem vocalizar.' },
      { nome: 'Aliança', tracos: 'Invocação · Curto · 1 cena',
        resumo: 'Um objeto de até tamanho CAT passa a poder realizar uma ação de ajuda a um aliado, com a sua ressonância, sem causar as consequências normais dessas ações. Os aliados precisam conseguir interagir com ele ou usá-lo para ter o benefício. O objeto não ganha capacidade de se mover nem de se animar de forma alguma — a realidade simplesmente se curva ao seu redor.' },
    ],
  },
]);

/** Para a tela fechada e para qualquer lugar que só precise de nome e tema. */
export const BLASFEMIAS_RESUMIDAS = Object.freeze(
  BLASFEMIAS_COMPLETAS.map(({ nome, resumo }) => Object.freeze({ nome, resumo })),
);

/** Quantas habilidades a blasfêmia tem ao todo: a passiva conta. */
export function habilidadesDaBlasfemia(blasfemia) {
  if (!blasfemia) return 0;
  return (blasfemia.passiva ? 1 : 0) + (blasfemia.poderes?.length || 0);
}

/** Acha pelo id ou pelo nome, sem exigir acento certo de quem chama. */
export function acharBlasfemia(chave) {
  if (!chave) return null;
  const limpa = String(chave).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return BLASFEMIAS_COMPLETAS.find(b => {
    const nome = b.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return b.id === limpa || nome === limpa;
  }) || null;
}
