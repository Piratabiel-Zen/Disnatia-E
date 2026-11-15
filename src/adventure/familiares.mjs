// Quem é familiar de verdade.
//
// Antes, toda ficha nova nascia com um familiar pronto — e o padrão do tipo
// era "cachorro". Quem nunca pediu um familiar ganhava um cachorro do nada, e
// o painel ainda inventava um na tela quando a ficha não tinha nenhum.
//
// A regra agora é simples: um familiar existe quando foi batizado. O Mestre
// adiciona e dá um nome; enquanto não tiver nome, é rascunho e não aparece em
// lugar nenhum — nem no mapa, nem na lista, nem na ficha dos outros.
//
// Isso resolve também as fichas antigas sem apagar nada do banco: o cachorro
// fantasma continua gravado, apenas deixa de ser exibido. Se o Mestre quiser
// de fato um familiar ali, basta dar um nome a ele.

export const familiarName = familiar => String(familiar?.nome || '').trim();

/** Rascunho: foi criado mas ninguém batizou. Não conta como familiar. */
export const isFamiliarRascunho = familiar => familiarName(familiar).length === 0;

/** Os familiares que realmente pertencem à ficha, na ordem em que foram criados. */
export function familiaresDaFicha(sheet) {
  const saved = Array.isArray(sheet?.familiares) ? sheet.familiares : [];
  return saved.filter(familiar => !isFamiliarRascunho(familiar));
}

/** Quantos familiares a ficha pode ter: Corvos do Horizonte levam até três. */
export const limiteDeFamiliares = sheet => (sheet?.classe === 'corvos' ? 3 : 1);
