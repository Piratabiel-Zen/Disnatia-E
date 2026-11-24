/**
 * OS DEZESSEIS ITENS DA CASA
 *
 * O que as crianças podem achar, onde está e para que serve. São a espinha
 * da investigação: cada um é uma peça do que aconteceu com o avô Hiroshi, e
 * os cinco amuletos são o que fecha a noite.
 *
 * CADA ITEM TEM FRENTE E VERSO, porque virar o objeto é metade da
 * descoberta: a fotografia tem uma data a lápis atrás, a chave tem uma
 * marca gravada embaixo, o amuleto tem o símbolo do outro lado. O que está
 * no verso é o que o Mestre só entrega a quem examinar.
 *
 * `onde` é o id do mapa. `pista` é o que o item ENSINA — e é isso, e não a
 * descrição, que decide se o item vale estar na mesa: item que não ensina
 * nada é item que a mesa cata e esquece.
 */

export const ITENS = Object.freeze([
  {
    id: 'foto-antiga', numero: 1, nome: 'Fotografia antiga',
    onde: 'terreo', local: 'Sala de estar', forma: 'fotografia',
    pista: 'Pista familiar',
    frente: 'Uma família inteira posando na escada da entrada. Ninguém sorri.',
    verso: 'A lápis, atrás: cinco nomes e um sexto riscado até furar o papel.',
  },
  {
    id: 'foto-primos', numero: 2, nome: 'Fotografia dos primos',
    onde: 'quartos', local: 'Quarto de Hiroshi', forma: 'fotografia',
    pista: 'Pista sobre as lembranças',
    frente: 'As cinco crianças no pátio, numa tarde de verão que ninguém lembra de ter vivido.',
    verso: '"Para que não esqueçam o caminho de casa." Sem data.',
  },
  {
    id: 'recorte', numero: 3, nome: 'Recorte de jornal',
    onde: 'terreo', local: 'Escritório', forma: 'jornal',
    pista: 'Descobrir desaparecimentos',
    frente: 'Fazenda Santa Eulália — três sumiços em um mês. A matéria para no meio da coluna.',
    verso: 'O resto da página foi arrancado. Resta a palavra "criança" cortada ao meio.',
  },
  {
    id: 'anotacoes', numero: 4, nome: 'Anotações de Hiroshi',
    onde: 'terreo', local: 'Escritório e sótão', forma: 'caderno',
    pista: 'Conhecer a entidade',
    frente: 'Letra miúda, apressada. Descreve algo que anda pelo teto e não encosta no chão.',
    verso: 'A última página repete a mesma linha dezenas de vezes: "não olhe para cima".',
  },
  {
    id: 'planta', numero: 5, nome: 'Planta da câmara',
    onde: 'terreo', local: 'Escritório', forma: 'planta',
    pista: 'Encontrar o local do ritual',
    frente: 'Um desenho técnico da casa, com um cômodo que não existe em nenhum andar.',
    verso: 'Uma seta partindo do porão, e a profundidade anotada em metros.',
  },
  {
    id: 'diario', numero: 6, nome: 'Diário do ritual',
    onde: 'quartos', local: 'Quarto de Hiroshi', forma: 'caderno',
    pista: 'Aprender a restaurar o selo',
    frente: 'Os passos para refazer a barreira, escritos como receita de cozinha.',
    verso: 'Embaixo, em outra tinta: "custa um. sempre custa um."',
  },
  {
    id: 'desenho', numero: 7, nome: 'Desenho da passagem',
    onde: 'porao', local: 'Porão ou sótão', forma: 'desenho',
    pista: 'Encontrar a entrada secreta',
    frente: 'Feito por mão de criança: uma parede, uma fresta e uma figura muito alta atrás.',
    verso: 'No canto, a giz de cera: "ela mora aqui embaixo".',
  },
  {
    id: 'diagrama', numero: 8, nome: 'Diagrama dos cinco selos',
    onde: 'terreo', local: 'Escritório', forma: 'diagrama',
    pista: 'Compreender o posicionamento dos amuletos',
    frente: 'Um círculo com cinco nichos, cada um marcado por um símbolo diferente.',
    verso: 'A ordem em que devem ser postos, e o aviso de que trocar a ordem fecha errado.',
  },
  {
    id: 'aviso', numero: 9, nome: 'Aviso do portão',
    onde: 'patio', local: 'Próximo à entrada', forma: 'placa',
    pista: 'Descobrir a regra da barreira',
    frente: 'Placa de madeira, pintada à mão: "NINGUÉM ATRAVESSA ANTES DO SOL."',
    verso: 'Atrás, mais fundo na madeira, a mesma frase riscada com unha.',
  },
  {
    id: 'camisa', numero: 10, nome: 'Camisa ensanguentada',
    onde: 'galpao', local: 'Galpão', forma: 'camisa',
    pista: 'Evidência do desaparecimento',
    frente: 'Pendurada num prego, como se alguém fosse voltar para buscá-la.',
    verso: 'O sangue está do lado de dentro, não de fora.',
  },
  {
    id: 'chave', numero: 11, nome: 'Chave de bronze',
    onde: 'terreo', local: 'Escritório', forma: 'chave',
    pista: 'Abrir o baú',
    frente: 'Pesada, escurecida pelo tempo, com o cabo em forma de folha.',
    verso: 'Gravado na haste, quase apagado: o mesmo símbolo do nicho da entrada.',
  },
  {
    id: 'amuleto-entrada', numero: 12, nome: 'Amuleto da Entrada',
    onde: 'terreo', local: 'Escritório', forma: 'amuleto', selo: 'entrada',
    pista: 'Ritual',
    frente: 'Disco de pedra clara, frio ao toque mesmo depois de segurado.',
    verso: 'O símbolo do portal, gasto no meio de tanto ser esfregado.',
  },
  {
    id: 'amuleto-sono', numero: 13, nome: 'Amuleto do Sono',
    onde: 'quartos', local: 'Quarto de Hiroshi', forma: 'amuleto', selo: 'sono',
    pista: 'Ritual',
    frente: 'Pedra leitosa. Quem a segura demais começa a bocejar.',
    verso: 'Uma lua deitada, com três traços embaixo.',
  },
  {
    id: 'amuleto-memoria', numero: 14, nome: 'Amuleto da Memória',
    onde: 'sotao', local: 'Sótão', forma: 'amuleto', selo: 'memoria',
    pista: 'Ritual',
    frente: 'Tem o peso errado para o tamanho. Mais leve do que deveria.',
    verso: 'Uma espiral fechando para dentro, e um olho pequeno no centro.',
  },
  {
    id: 'amuleto-terra', numero: 15, nome: 'Amuleto da Terra',
    onde: 'galpao', local: 'Galpão', forma: 'amuleto', selo: 'terra',
    pista: 'Ritual',
    frente: 'Barro cozido, ainda com terra nas ranhuras.',
    verso: 'Uma raiz desenhada, descendo mais do que a pedra comporta.',
  },
  {
    id: 'amuleto-sangue', numero: 16, nome: 'Amuleto do Sangue',
    onde: 'porao', local: 'Porão', forma: 'amuleto', selo: 'sangue',
    pista: 'Ritual',
    frente: 'Pedra escura com veios vermelhos que não são do mineral.',
    verso: 'Uma mão aberta, com o centro da palma furado.',
  },
]);

export const itemPorId = id => ITENS.find(i => i.id === id) || null;
export const itensDoMapa = idDoMapa => ITENS.filter(i => i.onde === String(idDoMapa));

/** Os cinco que fecham a noite, na ordem em que o diagrama manda pô-los. */
export const AMULETOS = Object.freeze(ITENS.filter(i => i.forma === 'amuleto'));

/**
 * O item vira objeto do inspetor.
 *
 * O VERSO VAI COMO `versoTexto` E NÃO COMO DESCRIÇÃO: é a regra de sempre
 * desta mesa — o que está escondido só aparece para quem vira o objeto. Pôr
 * o verso junto da frente transformaria a descoberta em legenda.
 */
export const itemComoObjeto = item => (item ? {
  titulo: item.nome,
  descricao: item.frente,
  detalheDePerto: '',
  versoTexto: item.verso,
  imagem: '',
  forma: item.forma,
  selo: item.selo || '',
} : null);
