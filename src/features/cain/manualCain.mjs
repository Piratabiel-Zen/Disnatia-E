// O MANUAL DE CAMPO DO CAIN
//
// Um resumo operacional do sistema de Tom Bloom: o que a mesa precisa saber
// para jogar sem parar e abrir o PDF. É texto próprio, escrito a partir das
// regras — não é o livro transcrito, e não substitui o livro. A redação
// completa, os textos de cada agenda, de cada poder de blasfêmia e de cada
// Pecado continuam no PDF, na aba Livro, que é de quem comprou.
//
// O critério ao condensar foi: nenhuma regra pode sumir. Exemplo, piada e
// ficção saem; número, gatilho e ordem de resolução ficam. Se uma mesa
// precisa decidir alguma coisa no meio de uma cena, a resposta está aqui.

const t = texto => ({ tipo: 'texto', texto });
const lista = (...itens) => ({ tipo: 'lista', itens });
const nota = texto => ({ tipo: 'nota', texto });
const tabela = (cabecalho, linhas) => ({ tipo: 'tabela', cabecalho, linhas });

export const MANUAL_CAIN = Object.freeze([
  {
    id: 'rolagem',
    titulo: 'A rolagem de ação',
    resumo: 'Reserva de d6, 4+ é sucesso, um sucesso basta.',
    partes: [
      t('Quando o resultado de uma ação é incerto e existe algo em jogo, o jogador monta uma reserva de d6 e rola. Cada dado que sair 4, 5 ou 6 é um sucesso. Um único sucesso já resolve a ação: contar sucessos a mais serve para cortar talismãs, não para "acertar melhor".'),
      lista(
        'A perícia escolhida dá de 0 a 3 dados.',
        'Vantagens somam até +3 dados, e esse teto vale para a soma de todas as fontes.',
        'Sem nenhum dado na reserva, role 2d6 e fique com o MENOR dos dois.',
      ),
      t('O jogador diz qual perícia está usando; o Admin diz se, naquela circunstância, usar aquela perícia seria difícil, arriscado ou simplesmente ineficaz. Só uma perícia por ação.'),
      nota('O teto de +3D em vantagens tem uma exceção: a Agonia Divina pode ultrapassá-lo.'),
    ],
  },
  {
    id: 'dificil-arriscado',
    titulo: 'Difícil, arriscado e impossível',
    resumo: 'Os três temperos que o Admin põe na rolagem.',
    partes: [
      lista(
        'Difícil: só o 6 conta como sucesso. É o padrão de qualquer ação mundana contra uma força sobrenatural.',
        'Arriscado: o Admin rola um dado de risco à parte, junto com a ação. Esse dado mede a gravidade do que dá errado — e ele vale mesmo quando a ação é bem-sucedida.',
        'Impossível: não se rola. Acontece quando o alvo está três ou mais categorias acima do personagem, ou quando a abordagem simplesmente não alcança o problema.',
      ),
      tabela(['Dado de risco', 'O que acontece'], [
        ['1', 'Muito pior do que o esperado. O Admin aperta.'],
        ['2–3', 'Pior do que o esperado: custo, complicação, atraso.'],
        ['4–5', 'Como se esperava.'],
        ['6', 'Melhor do que se esperava — abre uma chance de virar o jogo, mesmo numa falha.'],
      ]),
      nota('Uma consequência nunca anula um sucesso. Ela cobra um preço por ele.'),
      t('Também existe o caminho inverso: quando a tarefa está três ou mais categorias ABAIXO do personagem, não se rola nada. Ele simplesmente faz.'),
    ],
  },
  {
    id: 'consequencias',
    titulo: 'Consequências',
    resumo: 'O que o Admin cobra quando a rolagem falha ou o risco sai baixo.',
    partes: [
      t('Em uma falha, ou num risco baixo, o Admin impõe uma complicação. A ideia não é punir: é mover a situação. As faixas abaixo são o cardápio básico, e o Admin improvisa a partir da cena.'),
      lista(
        'Atenção: o exorcista fica ocupado, preso ou perde algo que importava.',
        'Eficácia: o trabalho fica pela metade — um corte a menos no talismã.',
        'Equipamento: a ferramenta quebra, emperra, acaba a munição.',
        'Segurança: a situação em si fica mais arriscada daqui para a frente.',
        'Tempo: a janela se fecha, o alvo escapa, o relógio anda.',
        'Estresse: cortes no talismã de execução do exorcista.',
        'Gancho: em vez da consequência agora, uma consequência marcada para depois.',
        'Cronômetro: começa ou avança um talismã com desfecho ruim.',
      ),
      nota('Dano a exorcista só entra quando o perigo já estava estabelecido na ficção. Ninguém se fere do nada: fere-se quem agiu sob risco evidente.'),
      tabela(['Estresse', 'A que corresponde'], [
        ['1', 'Dor, tensão, cansaço, ferimento pequeno.'],
        ['2–3', 'Incapacitante ou fatal para a maioria dos humanos: tiro, hemorragia, veneno, privação.'],
        ['4+', 'Brutal e instantaneamente fatal para um humano comum.'],
      ]),
    ],
  },
  {
    id: 'melhorar',
    titulo: 'Melhorando uma rolagem',
    resumo: 'Vantagem, trabalho em equipe, ajuda e Agonia Divina.',
    partes: [
      t('Dados de vantagem vêm de quatro lugares: gastar um pulso psíquico usando os poderes de forma criativa (+1D), receber ajuda de outro exorcista (+1D), habilidades de agenda e de blasfêmia, e bônus de circunstância concedidos pelo Admin. Somando tudo, o teto é +3D.'),
      t('TRABALHO EM EQUIPE: vários personagens capazes e dispostos escolhem um líder e combinam a MAIOR perícia, a maior vantagem e o melhor equipamento entre eles. O líder rola uma vez só. Em compensação, todos sofrem as mesmas consequências — inclusive o estresse.'),
      t('AJUDAR: uma ação dedicada a preparar o caminho de outro (ou de si mesmo). Pode ser difícil ou arriscada como qualquer outra, e quem ajuda também sofre consequências. Dando certo, a próxima ação do alvo recebe um destes, à escolha: +1D, difícil vira normal, ou arriscado vira normal. Cada ação só se beneficia de uma ajuda.'),
      t('AGONIA DIVINA: queimar toda a piedade acumulada para somar +1D por ponto queimado, estourando o teto de +3D. Cada personagem só faz isso uma vez por sessão, e o grupo inteiro só uma vez por cena.'),
      lista(
        'Ganha-se 1 de piedade (até 3) quando: a rolagem não tira nenhum sucesso; o exorcista sofre um ferimento ou uma aflição; um gancho enche; ou outro exorcista morre ou verte pecado.',
        'A piedade é apagada no fim da sessão. Guardar não adianta.',
      ),
    ],
  },
  {
    id: 'talisma',
    titulo: 'Talismãs',
    resumo: 'O relógio do jogo: tarefas longas viram cortes.',
    partes: [
      t('Quando uma tarefa não cabe em uma rolagem, ela vira um talismã — um marcador com um número de segmentos. Rola-se normalmente, com os mesmos parâmetros, e CADA sucesso vira um corte. Numa ação difícil, só os 6 cortam.'),
      lista(
        'Simples: 1 a 2 segmentos.',
        'Médio: 3 a 5 segmentos.',
        'Complexo: 6 a 8 segmentos.',
      ),
      t('Um talismã cheio resolve o que representava. Um talismã pela metade é progresso real e deve ser narrado como tal: metade dos arquivos decifrados, parte dos guardas fora do caminho.'),
      nota('Talismãs se escrevem como descrição, não como objetivo: "Horrores Arrepiantes" é melhor do que "Evitar os Horrores Arrepiantes". Crie-os só quando a tarefa aparecer e os jogadores já tiverem descrito como vão encará-la.'),
      t('Nem todo talismã é tarefa. Alguns se enchem com o tempo, outros registram um estado de fracasso se enchendo. Cortes também podem ser retirados por circunstância.'),
    ],
  },
  {
    id: 'categoria',
    titulo: 'Categoria (CAT)',
    resumo: 'A escala de poder, de 0 a 7. Decide o que é difícil e o que é impossível.',
    partes: [
      t('Tudo no mundo do CAIN tem uma categoria, que mede tamanho, força, velocidade e alcance. CAT 0 é a capacidade humana comum; humanos muito bem treinados chegam a CAT 1. Exorcistas vão de 1 a 5 e, raramente, além. Pecados vão de 0 a 7.'),
      tabela(['CAT', 'Escala aproximada'], [
        ['0', 'Uma pessoa. Um cômodo. Toque ou alcance de braço.'],
        ['1', 'Algumas pessoas. Um carro. O outro lado da rua.'],
        ['2', 'Um pequeno grupo. Um veículo pesado. Uma sala inteira.'],
        ['3', 'Um grupo grande. Um edifício. Um quarteirão.'],
        ['4', 'Uma multidão. Um prédio. Alguns quarteirões.'],
        ['5', 'Uma plateia inteira. Um prédio grande. Um bairro.'],
        ['6', 'Dezenas de milhares. Um arranha-céu. Uma cidade.'],
        ['7', 'Milhares de milhares. Além do horizonte. Evento mundial.'],
      ]),
      lista(
        'Efeito de CAT alta contra alvo de CAT baixa: mais eficaz, menos arriscado ou mais fácil. Três categorias abaixo: nem se rola.',
        'Efeito de CAT baixa contra alvo de CAT alta: menos eficaz, mais arriscado ou difícil. Três categorias acima: impossível.',
        'A categoria do exorcista sobe conforme ele sobrevive a missões, e com ela sobem as blasfêmias.',
      ),
      tabela(['Missões sobrevividas', 'CAT'], [
        ['0', 'I'], ['1', 'II'], ['2', 'III'], ['4', 'IV'], ['7', 'V'],
      ]),
      nota('Ferir um Pecado com força mundana — punho, arma de serviço, carro — é SEMPRE difícil, e totalmente ineficaz se a diferença de categoria for grande. Para machucar de verdade: blasfêmia, arma de serviço aprimorada ou criatividade.'),
    ],
  },
  {
    id: 'pericias',
    titulo: 'As dez perícias e a PSIQUE',
    resumo: 'De 0 a 3. No máximo duas perícias em 3.',
    partes: [
      t('Força, Atletismo, Coordenação, Furtividade, Interface, Investigação, Observação, Autoridade, Negociação e Conexão. Cada uma vai de 0 a 3, e um exorcista nunca tem mais de duas perícias em 3.'),
      t('PSIQUE é à parte: ela não é escolhida nem comprada. É metade da categoria do exorcista, arredondada para cima — um exorcista CAT 4 tem PSIQUE 2. Rola-se PSIQUE sempre que se usa uma blasfêmia ou se tenta algo com os poderes que as regras não previram.'),
      nota('A ficha já calcula a PSIQUE a partir da categoria. Não é campo preenchível de propósito.'),
    ],
  },
  {
    id: 'agenda-blasfemia',
    titulo: 'Agenda, blasfêmia e pulso psíquico',
    resumo: 'O que move o exorcista e o que ele manifesta.',
    partes: [
      t('A AGENDA descreve a motivação do personagem e o papel dele no esquadrão. Ela traz dois itens de conduta — um normal e um em negrito, mais difícil — e um conjunto de habilidades. Pode ser trocada entre missões; itens e habilidades em negrito acompanham o personagem na troca. Máximo de cinco habilidades de agenda ao mesmo tempo.'),
      t('A BLASFÊMIA é o fenômeno psíquico manifestado. Escolhe-se uma na criação, junto com dois poderes dela e a história de como se manifestou pela primeira vez. Toda blasfêmia tem uma passiva e poderes que se compram com avanços. As blasfêmias escalam com a categoria do exorcista — e, por isso, não ficam difíceis contra Pecados por padrão.'),
      t('PULSO PSÍQUICO é a válvula de escape. Começa-se cada caçada com três. Gasta-se um para usar qualquer poder, e sempre se pode gastar um para somar +1D a qualquer rolagem — sua ou de um aliado — desde que se descreva como os poderes estão ajudando. Recupera-se descansando ou com habilidades.'),
      t('RAJADA é a blasfêmia básica que todo exorcista tem: gasta um pulso, rola PSIQUE e produz energia psíquica concentrada em corpo a corpo ou curta distância. A forma varia de exorcista para exorcista; a força escala com a categoria. Por ser sobrenatural, não é difícil por padrão contra Pecados.'),
      t('Uma blasfêmia extra custa um avanço. O preço permanente: risque uma caixa de pecado (o limite cai em 1) e o XP necessário por avanço sobe em +1.'),
    ],
  },
  {
    id: 'pecado',
    titulo: 'Pecado, marcas e verter',
    resumo: 'O poder que se toma emprestado da própria corrupção.',
    partes: [
      t('No lugar de gastar um pulso psíquico, o exorcista pode ganhar 1d3 de pecado. Isso vale para qualquer uso de pulso, inclusive o +1D e a rajada; gastando o equivalente a vários pulsos, rola-se o equivalente em d3.'),
      t('O limite começa em 6. Atingi-lo em qualquer momento da missão faz o exorcista VERTER PECADO — mas só no fim da missão. Ou seja: dá para passar do limite e acessar um poder enorme enquanto a caçada corre.'),
      t('O pecado não zera entre caçadas: é reduzido à metade, arredondando para cima, desde que o exorcista tenha sobrevivido.'),
      t('Quem verte escolhe entre desistir e resistir. DESISTIR: o personagem sai das mãos do jogador, vira um Pecado definido junto com o Admin e passa a ser antagonista. RESISTIR: role 1d6 e some 1 para cada marca de pecado que já carrega.'),
      lista(
        'Resultado 7 ou mais: falhou, e tem que desistir.',
        'Resultado 6 ou menos: manteve o controle — apaga todo o pecado, ganha uma marca de pecado e risca permanentemente duas caixas de pecado.',
        'Um 1 no dado é sempre sucesso. Sem nenhuma marca de pecado, passa automaticamente.',
      ),
      nota('Marca de pecado é permanente: é o corpo transbordando poder. Dá novas habilidades e tem seu custo.'),
    ],
  },
  {
    id: 'corpo',
    titulo: 'O corpo: execução, ferimentos e morte',
    resumo: 'Como o exorcista se desgasta e como ele morre.',
    partes: [
      t('O talismã de execução é onde o estresse se acumula. Ele começa com 6 cortes e perde uma caixa por ferimento carregado. Estresse é tudo o que desgasta: dor, exaustão, doença, sofrimento mental, dano absorvido.'),
      lista(
        'Quando o talismã enche: limpe todos os cortes e ganhe um ferimento. O estresse que sobrou transborda para o talismã novo — que já é menor.',
        'Estresse não letal nunca enche o talismã: sempre deixa pelo menos um corte aberto e o excedente é ignorado.',
        'Ganhar um ferimento limpa todo o estresse.',
      ),
      t('Ferimentos não impedem o exorcista de agir. Todos curam ao fim da missão, e toda missão começa sem nenhum.'),
      t('MORTE INSTANTÂNEA acontece em três situações: marcar qualquer estresse já estando à beira da morte (três ferimentos); sofrer 7 ou mais cortes de estresse de um único evento, já descontadas as reduções; ou por habilidade de um Pecado que cause isso.'),
      t('DESAFIAR O DESTINO: diante da morte instantânea, o exorcista pode verter pecado em vez de morrer. Ele vai para um ferimento abaixo do máximo — dois de três, no padrão — e apaga um ferimento.'),
      t('AFLIÇÕES são efeitos contínuos e negativos: infecção, trauma psíquico, corrupção, influência. São permanentes durante a caçada, uma vez adquiridas, e só saem no debrief depois da missão. Cada Pecado tem a lista das que sabe infligir.'),
    ],
  },
  {
    id: 'ganchos',
    titulo: 'Ganchos e barganha',
    resumo: 'A consequência que fica marcada para depois.',
    partes: [
      t('Um gancho é um talismã curtíssimo, de três traços, que começa vazio e fica anotado na ficha com um nome. O Admin pode dar um gancho em vez de aplicar a consequência na hora — a dívida fica combinada.'),
      t('Corte um traço do gancho quando: você ganha o mesmo gancho de novo, a pressão aumenta, ou sai 1 no dado de risco.'),
      t('Quando o gancho enche pela terceira vez, o Admin pode usá-lo a qualquer momento: apaga o gancho e aplica a consequência, que é sempre pior do que a original teria sido. Encher um gancho dá 1 de piedade.'),
      lista(
        'Ganchos zeram a cada missão: começa-se sempre sem nenhum.',
        'Descansar durante uma caçada remove cortes de um gancho.',
        'As próprias habilidades do personagem também podem dar ganchos.',
      ),
      t('BARGANHAR: o jogador pode oferecer ao Admin um gancho como pagamento, para si ou para outro, em troca de +1D, de uma ajuda que não teria, ou de que uma cena vire a seu favor. Só se barganha quando o personagem ou um aliado está em ação, o Admin decide se aceita, e os termos têm que estar claros ANTES da rolagem.'),
    ],
  },
  {
    id: 'kit',
    titulo: 'Kit e scrip',
    resumo: 'Cinco pontos por missão. Nada mais.',
    partes: [
      t('O exorcista leva 5 pontos de kit por missão. O inventário é abstrato: não se decide o que levar na partida — gasta-se ponto na hora em que o item é preciso, desde que ainda haja ponto.'),
      tabela(['Custo', 'O que sai da mala'], [
        ['0 PK', 'Uniforme padrão, colarinho, sapatos, broche.'],
        ['1 PK', 'Caderno e caneta.'],
        ['1 PK', 'Caixa de fósforos (20) e lenço limpo.'],
        ['2 PK', 'Armas de serviço: arma de fogo CAT 0, munição e arma branca.'],
      ]),
      t('Armas de serviço podem ser aprimoradas em +1 CAT por 3 de scrip, até CAT 3 — é o que as torna úteis contra Pecados.'),
      t('O que se encontra em campo pode ser recolhido e usado normalmente. SCRIP é o pagamento da missão e se gasta entre missões: 5 por missão bem-sucedida, 3 por uma missão poupada, −1 por falha, +3 ao gastar um avanço. Recuperar os restos mortais de um exorcista morto dá 1 XP e 1 scrip a todos.'),
    ],
  },
  {
    id: 'cacada',
    titulo: 'A caçada, fase por fase',
    resumo: 'O procedimento de uma missão, do briefing à execução.',
    partes: [
      t('1. INSTRUÇÃO — a CAIN entrega os parâmetros da missão: o que se sabe do Pecado, o perímetro, o que não pode acontecer. É aqui que a agenda de cada exorcista pode ganhar itens novos.'),
      t('2. CHEGADA — o esquadrão chega à área. Primeiro contato com o lugar, com as testemunhas e com o que já deu errado antes de eles chegarem.'),
      t('3. RASTREANDO — seguir o rastro até o Pecado ou até o hospedeiro. O Prego de Abel permite puxar um Pecado para dentro do palácio dele quando o esquadrão está dentro e ele está fora.'),
      t('4a. INVESTIGAÇÃO — cavar. Revelar os traumas do Pecado enfraquece o Pecado de verdade, e é aqui que isso acontece. 4b. PREPARAÇÃO — montar a armadilha, o ritual, a emboscada. 4c. DESCANSO — recuperar pulsos psíquicos e tirar cortes de um gancho. Descansar custa tempo, e tempo move a tensão.'),
      t('5a. TENSÃO — o relógio do Admin, um talismã de três cortes. Ele avança quando uma cena termina e quando sai 1 num dado de risco (no máximo uma vez por cena). Cheio, o Admin esvazia e dispara uma ação de tensão: mandar lacaios, emboscar, envolver as autoridades, separar alguém, forçar uma escolha difícil, agravar a situação, iniciar ou avançar um cronômetro, usar um domínio, ameaçar ou manipular um NPC, introduzir um obstáculo novo, afligir um exorcista.'),
      t('5b. PRESSÃO — o oposto da tensão: a situação piorando de um jeito que é próprio daquele Pecado. É a pressão que faz o esquadrão ter que escolher entre investigar mais e agir logo.'),
      t('6. EXECUÇÃO — o confronto. O Pecado tem um talismã de execução, igual ao do exorcista, que mede o estado dele.'),
      nota('Contra-ataque: ao ser descoberto, o Pecado responde. Rastrear e investigar não são seguros.'),
    ],
  },
  {
    id: 'conflito',
    titulo: 'Cenas de conflito',
    resumo: 'Agir, analisar, defender — e a reação do oponente.',
    partes: [
      t('Quando a briga começa, a cena passa a correr em rodadas. Em cada rodada, cada exorcista faz uma ação. As três básicas:'),
      lista(
        'AGIR: atacar, correr, usar um poder, fazer o que a cena pedir. É uma rolagem de ação comum, com cortes no talismã de execução do oponente.',
        'ANALISAR: estudar o oponente para arrancar informação dele — fraqueza, trauma, próximo movimento. Pode render talismãs e vantagens para o resto do esquadrão.',
        'DEFENDER: proteger alguém, segurar uma posição, absorver o que vinha para outro.',
      ),
      t('O oponente responde com REAÇÕES, que já vêm listadas na ficha dele e têm resultado explícito. Um Pecado fora do palácio que sofra 4 cortes no talismã de execução foge para o palácio e só volta quando a pressão aumentar; lá ele se cura 1d3, ou 2d3 se o talismã estiver cheio.'),
      nota('Um Pecado nunca pode ser executado fora do palácio dele. A luta decisiva acontece lá dentro, onde ele não tem para onde correr.'),
    ],
  },
  {
    id: 'avanco',
    titulo: 'Fim de sessão: XP e avanços',
    resumo: 'Quatro perguntas, e o que elas compram.',
    partes: [
      t('No fim de cada sessão, responda às quatro perguntas e marque 1 XP para cada "sim":'),
      lista(
        'Você sobreviveu?',
        'Você cumpriu o primeiro item da sua agenda?',
        'Você cumpriu pelo menos um item em negrito da sua agenda?',
        'Você sofreu um ferimento ou uma aflição?',
      ),
      t('Cada vez que a trilha de XP enche, sacou-se um avanço. Um avanço compra uma destas coisas:'),
      lista(
        'Uma habilidade nova da agenda ativa (teto de cinco ao mesmo tempo).',
        'Um poder novo da blasfêmia.',
        'Uma blasfêmia inteira nova — risque uma caixa de pecado e o XP por avanço sobe +1.',
        'Uma habilidade nova para uma marca de pecado que você tenha.',
        '3 de scrip.',
        '+1 numa perícia. No total, seis vezes — e sempre no máximo duas perícias em 3.',
      ),
      t('A categoria não se compra: ela sobe sozinha com as missões sobrevividas.'),
    ],
  },
]);

/** Para a busca da aba: tudo que é texto num índice só, sem acento. */
const semAcento = texto => String(texto || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function buscarNoManual(secoes, termo) {
  const busca = semAcento(termo).trim();
  if (!busca) return secoes;
  return secoes.filter(secao => {
    const corpo = (secao.partes || []).map(parte => {
      if (parte.tipo === 'lista') return parte.itens.join(' ');
      if (parte.tipo === 'tabela') return [...parte.cabecalho, ...parte.linhas.flat()].join(' ');
      return parte.texto;
    }).join(' ');
    return semAcento(`${secao.titulo} ${secao.resumo} ${corpo}`).includes(busca);
  });
}
