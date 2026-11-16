// O MURAL DE INVESTIGAÇÃO
//
// Um mural contínuo da campanha inteira — não um por sessão. Cartões de pista,
// suspeito, local, documento, evento e teoria, espalhados onde a mesa quiser,
// ligados por barbante como num mural de delegacia. Todo mundo move, todo
// mundo vê.
//
// A parte pura mora aqui: criar, mover, ligar, filtrar. Sem Firebase e sem
// React, porque a geometria das ligações e as regras de quem-liga-com-quem são
// exatamente o tipo de coisa que se quebra em silêncio e só aparece quando a
// mesa está no meio de uma cena.
//
// Duas decisões que valem explicar:
//
//   • As coordenadas são relativas (0 a 1), não pixels. O mural precisa cair
//     igual no notebook do Mestre e no monitor grande de outro jogador; em
//     pixels, cada um veria um mural diferente.
//   • Arrastar não escreve no Firestore. Durante o arraste a posição vai pelo
//     canal vivo (Realtime Database), e só o lugar final é gravado. Sem isso,
//     um arraste de três segundos vira centenas de escritas, e a cota diária
//     da mesa acaba numa sessão.

export const TIPOS_DE_CARTAO = Object.freeze([
  { id: 'pista', nome: 'Pista', cor: '#A98045', icone: '◆' },
  { id: 'suspeito', nome: 'Suspeito', cor: '#8E1F2B', icone: '✦' },
  { id: 'local', nome: 'Local', cor: '#4E7B8E', icone: '◉' },
  { id: 'documento', nome: 'Documento', cor: '#8A7A5E', icone: '▤' },
  { id: 'evento', nome: 'Evento', cor: '#6F5B8E', icone: '◈' },
  { id: 'teoria', nome: 'Teoria', cor: '#5E7F5E', icone: '✎' },
]);

export const ESTADOS_DA_PISTA = Object.freeze([
  { id: 'encontrada', nome: 'Encontrada', cor: '#A98045', resumo: 'Apareceu. Ninguém olhou direito ainda.' },
  { id: 'investigando', nome: 'Investigando', cor: '#C79A3C', resumo: 'Alguém está atrás disso agora.' },
  { id: 'confirmada', nome: 'Confirmada', cor: '#5E7F5E', resumo: 'Verificada. Pode construir em cima.' },
  { id: 'descartada', nome: 'Descartada', cor: '#5A5048', resumo: 'Não levou a nada.' },
]);

export const ESTADO_PADRAO = 'encontrada';

const tipoValido = id => TIPOS_DE_CARTAO.some(t => t.id === id);
const estadoValido = id => ESTADOS_DA_PISTA.some(e => e.id === id);

export const tipoDoCartao = cartao =>
  TIPOS_DE_CARTAO.find(t => t.id === cartao?.tipo) || TIPOS_DE_CARTAO[0];

export const estadoDoCartao = cartao =>
  ESTADOS_DA_PISTA.find(e => e.id === cartao?.estado) || ESTADOS_DA_PISTA[0];

/** Mantém a coordenada dentro do mural, com folga para o cartão não sair pela borda. */
export const prender = valor => Math.max(0.02, Math.min(0.98, Number(valor) || 0.5));

/** Um cartão novo. Nasce no centro se ninguém disser onde. */
export function cartaoNovo({ id, tipo = 'pista', titulo = '', texto = '', x = 0.5, y = 0.5, autor = '' } = {}) {
  return {
    id: String(id || `c${Date.now().toString(36)}`),
    tipo: tipoValido(tipo) ? tipo : 'pista',
    titulo: String(titulo),
    texto: String(texto),
    estado: ESTADO_PADRAO,
    x: prender(x), y: prender(y),
    autor: String(autor),
    criadoEm: Date.now(),
    // Suspeito tem página própria; os campos extras moram aqui para o cartão
    // continuar sendo um cartão.
    ficha: tipo === 'suspeito' ? { foto: '', descricao: '', alibi: '', relacoes: '', evidencias: '' } : null,
  };
}

/* ─────────────────────────── mover ─────────────────────────── */

export function moverCartao(cartoes, id, x, y) {
  return (cartoes || []).map(c => (
    String(c.id) === String(id) ? { ...c, x: prender(x), y: prender(y) } : c
  ));
}

/** O estado de uma pista. Só pista e documento têm estado; o resto ignora. */
export function definirEstado(cartoes, id, estado) {
  if (!estadoValido(estado)) return cartoes;
  return (cartoes || []).map(c => (
    String(c.id) === String(id) ? { ...c, estado } : c
  ));
}

/* ─────────────────────────── ligações ─────────────────────────── */

/**
 * A chave de uma ligação, sempre na mesma ordem.
 *
 * Ligar A→B e B→A é a mesma linha. Sem normalizar, dois jogadores ligando a
 * mesma dupla ao mesmo tempo criam duas linhas sobrepostas, e apagar uma deixa
 * a outra — um barbante fantasma que ninguém consegue tirar.
 */
export const chaveDaLigacao = (a, b) => [String(a), String(b)].sort().join('::');

export function ligar(ligacoes, a, b, autor = '') {
  if (String(a) === String(b)) return ligacoes || [];
  const chave = chaveDaLigacao(a, b);
  if ((ligacoes || []).some(l => l.chave === chave)) return ligacoes;
  const [de, para] = [String(a), String(b)].sort();
  return [...(ligacoes || []), { chave, de, para, autor: String(autor), criadaEm: Date.now() }];
}

export function desligar(ligacoes, a, b) {
  const chave = chaveDaLigacao(a, b);
  return (ligacoes || []).filter(l => l.chave !== chave);
}

/** Tira do mural um cartão e todo barbante preso nele. */
export function removerCartao(cartoes, ligacoes, id) {
  const alvo = String(id);
  return {
    cartoes: (cartoes || []).filter(c => String(c.id) !== alvo),
    ligacoes: (ligacoes || []).filter(l => l.de !== alvo && l.para !== alvo),
  };
}

/**
 * As linhas a desenhar, já com as pontas resolvidas.
 *
 * Descarta ligação cujo cartão sumiu: sem isso, apagar um cartão por outro
 * caminho deixa barbante solto apontando para o nada.
 */
export function linhasDoMural(cartoes, ligacoes) {
  const porId = new Map((cartoes || []).map(c => [String(c.id), c]));
  return (ligacoes || [])
    .map(l => {
      const de = porId.get(l.de);
      const para = porId.get(l.para);
      if (!de || !para) return null;
      return {
        chave: l.chave,
        x1: de.x, y1: de.y, x2: para.x, y2: para.y,
        cor: tipoDoCartao(de).cor,
      };
    })
    .filter(Boolean);
}

/** Com quem este cartão está ligado. */
export function vizinhos(cartoes, ligacoes, id) {
  const alvo = String(id);
  const ids = new Set();
  for (const l of ligacoes || []) {
    if (l.de === alvo) ids.add(l.para);
    else if (l.para === alvo) ids.add(l.de);
  }
  return (cartoes || []).filter(c => ids.has(String(c.id)));
}

/* ─────────────────────────── filtro ─────────────────────────── */

const semAcento = texto => String(texto || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Filtra o mural por tipo, estado e busca.
 *
 * Devolve os cartões escondidos também, porque o mural não some com eles: ele
 * os apaga visualmente e mantém o barbante. Um mural onde o filtro faz cartão
 * sumir perde a forma que a mesa memorizou.
 */
export function filtrarMural(cartoes, { tipos = [], estados = [], busca = '' } = {}) {
  const termo = semAcento(busca).trim();
  const visiveis = new Set();
  for (const c of cartoes || []) {
    if (tipos.length && !tipos.includes(c.tipo)) continue;
    if (estados.length && !estados.includes(c.estado)) continue;
    if (termo && !semAcento(`${c.titulo} ${c.texto}`).includes(termo)) continue;
    visiveis.add(String(c.id));
  }
  return visiveis;
}

/** Quantos cartões de cada tipo, para o Mestre ler o mural num relance. */
export function contagemPorTipo(cartoes) {
  const contagem = Object.fromEntries(TIPOS_DE_CARTAO.map(t => [t.id, 0]));
  for (const c of cartoes || []) {
    if (contagem[c.tipo] !== undefined) contagem[c.tipo] += 1;
  }
  return contagem;
}
