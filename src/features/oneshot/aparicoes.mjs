/**
 * APARIÇÕES — O QUE O MESTRE MOSTRA
 *
 * Numa mesa de terror, metade do efeito é o tempo. O Mestre prepara as
 * imagens antes da sessão — o item, a página do diário, o corredor, a coisa —
 * e revela quando a cena chega. O que não foi revelado não existe para a mesa.
 *
 * Por isso revelar é um estado do documento, e não um clique que manda a
 * imagem para outro lugar: o Mestre pode esconder de novo, e a mesma aparição
 * serve a duas cenas.
 *
 * A liberação segue a mesma forma do mural e dos documentos — liberadoParaTodos
 * ou uma lista de uids — porque é o que as regras do servidor já sabem checar
 * e o que `observarLiberados` já sabe consultar.
 */

export const TIPOS_DE_APARICAO = Object.freeze([
  { id: 'criatura', nome: 'Criatura', icone: '☾', resumo: 'O que está ali com eles.' },
  { id: 'cenario', nome: 'Cenário', icone: '▣', resumo: 'O lugar, visto de dentro.' },
  { id: 'item', nome: 'Item', icone: '◈', resumo: 'O objeto na mão de alguém.' },
  { id: 'pagina', nome: 'Página', icone: '▤', resumo: 'Diário, carta, recorte, laudo.' },
  { id: 'simbolo', nome: 'Símbolo', icone: '✧', resumo: 'A marca que se repete.' },
  { id: 'vulto', nome: 'Vulto', icone: '◐', resumo: 'O que mal se vê — e é pior por isso.' },
]);

export const aparicaoNova = (tipo = 'criatura') => ({
  tipo: String(tipo),
  titulo: '',
  descricao: '',
  imagem: '',
  // Nasce escondida, sempre. Aparição que nasce revelada estraga a cena antes
  // de ela existir — e é o erro que não dá para desfazer numa mesa de terror.
  liberadoParaTodos: false,
  liberadoPara: [],
  criadoEm: Date.now(),
});

/** Está à vista da mesa? */
export const estaRevelada = aparicao =>
  aparicao?.liberadoParaTodos === true
  || (Array.isArray(aparicao?.liberadoPara) && aparicao.liberadoPara.length > 0);

/** Revelar para a mesa inteira, ou recolher. */
export const revelarParaTodos = (aparicao, revelar) => ({
  ...aparicao,
  liberadoParaTodos: Boolean(revelar),
  liberadoPara: revelar ? [] : [],
});

/** Revelar só para uma pessoa — o que ela vê e os outros não. */
export function alternarPessoa(aparicao, uid) {
  const lista = Array.isArray(aparicao?.liberadoPara) ? [...aparicao.liberadoPara] : [];
  const alvo = String(uid || '');
  if (!alvo) return aparicao;
  const i = lista.indexOf(alvo);
  if (i >= 0) lista.splice(i, 1); else lista.push(alvo);
  return { ...aparicao, liberadoPara: lista, liberadoParaTodos: false };
}

/** Quem vê isto, dito em palavras para o Mestre conferir de relance. */
export function quemVe(aparicao, nomePorUid = {}) {
  if (aparicao?.liberadoParaTodos) return 'A mesa inteira';
  const lista = Array.isArray(aparicao?.liberadoPara) ? aparicao.liberadoPara : [];
  if (!lista.length) return 'Ninguém ainda';
  return lista.map(uid => nomePorUid[uid] || 'alguém').join(', ');
}

export const tipoDaAparicao = id =>
  TIPOS_DE_APARICAO.find(t => t.id === id) || TIPOS_DE_APARICAO[0];

/**
 * A APARIÇÃO PREGADA NO MURAL
 *
 * Revelar mostra a imagem na aba das Aparições, e ali ela fica — uma de cada
 * vez, isolada. No mural ela vira outra coisa: um cartão que a mesa arrasta,
 * liga a outros por barbante e mantém à vista enquanto discute. É a diferença
 * entre "olhem isto" e "isto é a terceira vez que esse símbolo aparece".
 *
 * Não copia nem move: cria um cartão que aponta para a aparição, com a MESMA
 * plateia. Pregar não pode virar atalho para revelar o que estava escondido —
 * é a mesma regra dos documentos, pelo mesmo motivo.
 *
 * `origemAparicao` é o que impede pregar duas vezes a mesma coisa.
 */
export function cartaoDeAparicao(aparicao, { id, x = 0.4, y = 0.4 } = {}) {
  if (!aparicao) return null;
  const tipo = tipoDaAparicao(aparicao.tipo);
  return {
    id: String(id || `c${Date.now().toString(36)}`),
    // Com imagem é fotografia; sem, é pista — que é o tipo do mural feito
    // para pedaço de informação que se liga a outros.
    tipo: aparicao.imagem ? 'fotografia' : 'pista',
    titulo: String(aparicao.titulo || tipo.nome),
    texto: String(aparicao.descricao || ''),
    imagem: String(aparicao.imagem || ''),
    x, y,
    liberadoParaTodos: aparicao.liberadoParaTodos === true,
    liberadoPara: Array.isArray(aparicao.liberadoPara) ? [...aparicao.liberadoPara] : [],
    origemAparicao: String(aparicao.id || ''),
    criadoEm: Date.now(),
  };
}

/** Esta aparição já está pregada? */
export const jaNoMural = (aparicao, cartoes) =>
  Boolean(aparicao?.id) && (Array.isArray(cartoes) ? cartoes : [])
    .some(c => String(c?.origemAparicao || '') === String(aparicao.id));
