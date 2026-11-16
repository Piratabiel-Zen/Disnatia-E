// OS DOCUMENTOS DA CAMPANHA
//
// Cartas, fotos, jornais, relatórios, gravações. O Mestre prepara tudo com
// antecedência e guarda; na hora certa, libera — para a mesa inteira ou para
// uma pessoa só, que depois decide se conta aos outros.
//
// A parte pura mora aqui. A decisão de quem-vê-o-quê está em core/acesso.mjs,
// e quem a faz valer de verdade é firestore.rules, no servidor: um documento
// guardado nem chega ao navegador de quem não pode lê-lo. O que está aqui é
// forma, tipo e ordenação.

export const TIPOS_DE_DOCUMENTO = Object.freeze([
  { id: 'carta', nome: 'Carta', icone: '✉', resumo: 'Manuscrita, assinada ou não.' },
  { id: 'foto', nome: 'Fotografia', icone: '▣', resumo: 'Revelada, tremida, antiga.' },
  { id: 'jornal', nome: 'Jornal', icone: '▤', resumo: 'Recorte, manchete, nota de rodapé.' },
  { id: 'relatorio', nome: 'Relatório', icone: '▦', resumo: 'Oficial, carimbado, com partes riscadas.' },
  { id: 'gravacao', nome: 'Gravação', icone: '◉', resumo: 'Fita, cilindro, transcrição.' },
  { id: 'objeto', nome: 'Objeto', icone: '◈', resumo: 'O que não é papel mas foi recolhido.' },
]);

export const tipoDoDocumento = doc =>
  TIPOS_DE_DOCUMENTO.find(t => t.id === doc?.tipo) || TIPOS_DE_DOCUMENTO[0];

/** Um documento novo. Nasce GUARDADO — nunca liberado por engano. */
export function documentoNovo({ id, tipo = 'carta', titulo = '', autor = '' } = {}) {
  return {
    id: String(id || `d${Date.now().toString(36)}`),
    tipo: TIPOS_DE_DOCUMENTO.some(t => t.id === tipo) ? tipo : 'carta',
    titulo: String(titulo),
    corpo: '',
    imagem: '',
    procedencia: '',
    // O padrão é fechado. O engano barato aqui é liberar a reviravolta cedo
    // demais, e esse engano não tem desfazer: a mesa já leu.
    liberadoParaTodos: false,
    liberadoPara: [],
    // Anotações dos jogadores, por pessoa.
    notas: {},
    // A que pistas, locais e Pecados este documento se liga.
    relacionado: [],
    criadoPor: String(autor),
    criadoEm: Date.now(),
  };
}

/* ───────────────────────── liberação ───────────────────────── */

/** Libera para a mesa inteira. */
export const liberarParaTodos = doc => ({ ...doc, liberadoParaTodos: true, liberadoPara: [] });

/** Guarda de volta: ninguém além do Mestre vê. */
export const guardar = doc => ({ ...doc, liberadoParaTodos: false, liberadoPara: [] });

/** Liga ou desliga uma pessoa da lista de quem recebeu. */
export function alternarPessoa(doc, uid) {
  const alvo = String(uid);
  const lista = Array.isArray(doc?.liberadoPara) ? doc.liberadoPara : [];
  const tem = lista.includes(alvo);
  return {
    ...doc,
    // Liberar para alguém tira o "para todos": são coisas diferentes, e
    // deixar os dois ligados faz a tela mentir sobre quem está vendo.
    liberadoParaTodos: false,
    liberadoPara: tem ? lista.filter(u => u !== alvo) : [...lista, alvo],
  };
}

/**
 * O jogador compartilha com a mesa o que recebeu.
 *
 * O Mestre liberou para uma pessoa; essa pessoa pode passar adiante. É o
 * fluxo que a mesa pediu — e quem compartilha fica registrado, porque numa
 * investigação importa quem contou.
 */
export function compartilharComAMesa(doc, uid) {
  return { ...doc, liberadoParaTodos: true, compartilhadoPor: String(uid) };
}

/* ───────────────────────── anotações ───────────────────────── */

/** A anotação de uma pessoa neste documento. */
export const notaDe = (doc, uid) => String(doc?.notas?.[String(uid)] || '');

export function anotar(doc, uid, texto) {
  const notas = { ...(doc?.notas || {}) };
  const limpo = String(texto || '');
  if (limpo.trim()) notas[String(uid)] = limpo;
  else delete notas[String(uid)];
  return { ...doc, notas };
}

/* ───────────────────────── ordenação ───────────────────────── */

const semAcento = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Ordena para o Mestre: o que está guardado primeiro.
 *
 * É o contrário do que parece intuitivo, e é de propósito. O Mestre abre esta
 * aba para liberar algo, não para reler o que a mesa já tem — então o que
 * ainda não foi entregue é o que precisa estar à mão.
 */
export function ordenarParaMestre(documentos) {
  const peso = d => (d.liberadoParaTodos ? 2 : (d.liberadoPara?.length ? 1 : 0));
  return [...(documentos || [])].sort((a, b) => peso(a) - peso(b) || (b.criadoEm || 0) - (a.criadoEm || 0));
}

/** Para o jogador, o mais recente primeiro: o que acabou de chegar. */
export const ordenarParaJogador = documentos =>
  [...(documentos || [])].sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));

export function buscarDocumentos(documentos, termo) {
  const busca = semAcento(termo).trim();
  if (!busca) return documentos || [];
  return (documentos || []).filter(d =>
    semAcento(`${d.titulo} ${d.corpo} ${d.procedencia}`).includes(busca));
}
