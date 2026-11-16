// OS PECADOS
//
// Não são os sete capitais: são monstros nascidos de traumas humanos. Cada um
// tem uma categoria, um palácio onde reside, domínios que distorcem o mundo em
// volta, e um talismã de execução — o número de cortes que decide quantas
// vezes ele precisa ser atingido antes de poder morrer.
//
// A estrutura vem do livro (CAIN 1.4.5 PT-BR, páginas 100 a 150). O conteúdo
// de cada Pecado é do Mestre: o livro traz seis exemplares, e a graça é
// inventar os seus.
//
// O que decide a dificuldade de uma caçada não é o dano: é o talismã e os
// domínios. Por isso eles são campos de primeira classe aqui, e não texto
// solto numa descrição.

/** As categorias descritas no livro, da menos à mais terrível. */
export const CATEGORIAS = Object.freeze([
  { numeral: 'I', nome: 'Ogro', resumo: 'Enorme, disforme, terrivelmente poderoso.', cor: '#8E5A2B' },
  { numeral: 'II', nome: 'Ídolo', resumo: 'Sereno e encantador, de beleza sobrenatural.', cor: '#A98045' },
  { numeral: 'III', nome: 'Cão', resumo: 'Feroz e violento, selvagem e extremamente perigoso.', cor: '#8E1F2B' },
  { numeral: 'IV', nome: 'Centopeia', resumo: 'Reputação pútrida; evitada sempre que possível.', cor: '#4E7B4A' },
  { numeral: 'V', nome: 'Sapo', resumo: 'Astuto e ganancioso, com um padrão próprio de comportamento.', cor: '#5E7F5E' },
  { numeral: 'VI', nome: 'Lorde', resumo: 'Justo e moralista, movido por um senso irracional de ordem.', cor: '#6F5B8E' },
]);

/** Outros oponentes do livro, que não são Pecados plenos. */
export const OUTROS_OPONENTES = Object.freeze([
  { id: 'massa', nome: 'Pecado produzido em massa', resumo: 'Categoria 0 a 4, conforme a força.' },
  { id: 'peste', nome: 'Peste', resumo: 'Anomalia. Talismã de execução 2 sozinha, 5 em grupo.' },
  { id: 'vinculador', nome: 'Vinculador', resumo: 'Humano que se vinculou a um Pecado menor. Proibido pela CASTLE.' },
]);

export const categoriaPorNumeral = numeral =>
  CATEGORIAS.find(c => c.numeral === String(numeral)) || CATEGORIAS[0];

/** Quantos domínios um Pecado escolhe. O livro diz três. */
export const DOMINIOS_POR_PECADO = 3;

/** Um Pecado novo, com a forma que o livro dá a eles. */
export function pecadoNovo({ id, nome = '', categoria = 'I', autor = '' } = {}) {
  return {
    id: String(id || `s${Date.now().toString(36)}`),
    nome: String(nome),
    categoria: CATEGORIAS.some(c => c.numeral === categoria) ? categoria : 'I',
    // De que trauma humano ele nasceu. É isto que a investigação descobre, e
    // descobrir enfraquece o Pecado — então é o campo mais importante da ficha.
    origem: '',
    hospedeiro: '',
    manifestacao: '',
    // Onde reside. Chegar nele costuma ser metade da caçada.
    palacio: '',
    atacaCom: '',
    // O talismã de execução: quantos cortes antes de poder morrer.
    talisma: 4,
    talismaCortes: 0,
    dominios: [],
    aflicoes: '',
    // O que a mesa já descobriu. Liberado pelo Mestre, pedaço por pedaço.
    revelado: { origem: false, palacio: false, talisma: false, dominios: false },
    imagem: '',
    criadoPor: String(autor),
    criadoEm: Date.now(),
    executado: false,
  };
}

/* ───────────────────────── talismã ───────────────────────── */

const limitar = (v, min, max) => Math.max(min, Math.min(max, Math.trunc(Number(v) || 0)));

/**
 * Corta o talismã de execução.
 *
 * Quando enche, o Pecado pode ser executado — ainda não está morto. É a
 * diferença que a mesa precisa ver na tela: cortar o último não acaba a cena,
 * abre a possibilidade dela.
 */
export function cortarTalisma(pecado, quantidade = 1) {
  const talisma = Math.max(1, Number(pecado?.talisma) || 1);
  const cortes = limitar((Number(pecado?.talismaCortes) || 0) + quantidade, 0, talisma);
  return { ...pecado, talismaCortes: cortes };
}

export const podeSerExecutado = pecado =>
  (Number(pecado?.talismaCortes) || 0) >= Math.max(1, Number(pecado?.talisma) || 1);

export const executar = pecado => ({ ...pecado, executado: true, talismaCortes: Math.max(1, Number(pecado?.talisma) || 1) });

/* ───────────────────────── domínios ───────────────────────── */

export function alternarDominio(pecado, dominio) {
  const nome = String(dominio || '').trim();
  if (!nome) return pecado;
  const atuais = Array.isArray(pecado?.dominios) ? pecado.dominios : [];
  if (atuais.includes(nome)) return { ...pecado, dominios: atuais.filter(d => d !== nome) };
  // Três é o limite do livro. Passar disso descalibra a caçada inteira.
  if (atuais.length >= DOMINIOS_POR_PECADO) return pecado;
  return { ...pecado, dominios: [...atuais, nome] };
}

/* ───────────────────────── revelação ───────────────────────── */

export const CAMPOS_REVELAVEIS = Object.freeze([
  { id: 'origem', nome: 'Origem', resumo: 'De que trauma humano ele nasceu.' },
  { id: 'palacio', nome: 'Palácio', resumo: 'Onde ele reside.' },
  { id: 'talisma', nome: 'Talismã de execução', resumo: 'Quantos cortes até poder morrer.' },
  { id: 'dominios', nome: 'Domínios', resumo: 'Como ele distorce o mundo em volta.' },
]);

export function revelar(pecado, campo) {
  if (!CAMPOS_REVELAVEIS.some(c => c.id === campo)) return pecado;
  return { ...pecado, revelado: { ...(pecado?.revelado || {}), [campo]: true } };
}

export function esconder(pecado, campo) {
  if (!CAMPOS_REVELAVEIS.some(c => c.id === campo)) return pecado;
  return { ...pecado, revelado: { ...(pecado?.revelado || {}), [campo]: false } };
}

/**
 * O Pecado como este jogador o vê.
 *
 * O Mestre vê tudo. O jogador vê só o que a investigação já descobriu — e o
 * que ainda não foi revelado não é mascarado com reticências: ele simplesmente
 * não vem, porque um campo vazio na tela já conta demais sobre o que existe.
 */
export function pecadoVisivel(pecado, membro) {
  if (!pecado) return null;
  if (membro?.papel === 'mestre') return pecado;
  const revelado = pecado.revelado || {};
  const visto = {
    id: pecado.id,
    nome: pecado.nome,
    categoria: pecado.categoria,
    manifestacao: pecado.manifestacao,
    imagem: pecado.imagem,
    executado: pecado.executado,
    talismaCortes: pecado.talismaCortes,
    revelado,
  };
  if (revelado.origem) { visto.origem = pecado.origem; visto.hospedeiro = pecado.hospedeiro; }
  if (revelado.palacio) visto.palacio = pecado.palacio;
  if (revelado.talisma) { visto.talisma = pecado.talisma; visto.atacaCom = pecado.atacaCom; }
  if (revelado.dominios) { visto.dominios = pecado.dominios; visto.aflicoes = pecado.aflicoes; }
  return visto;
}

/** Quanto da caçada já foi descoberto, de 0 a 1. */
export function progressoDaCacada(pecado) {
  const revelado = pecado?.revelado || {};
  const achados = CAMPOS_REVELAVEIS.filter(c => revelado[c.id]).length;
  return achados / CAMPOS_REVELAVEIS.length;
}
