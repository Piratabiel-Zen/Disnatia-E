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
