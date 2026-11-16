// QUEM É QUEM NUMA MESA
//
// A parte pura do acesso: papéis, o que cada papel pode, e quem enxerga um
// documento guardado. Sem Firebase aqui, para poder ser testado sozinho — e
// porque esta é a lógica que decide segredo, que é exatamente a que não pode
// ser conferida só "olhando a tela".
//
// Importante: isto NÃO é a defesa. A defesa está em firestore.rules, que roda
// no servidor. O que está aqui é a mesma decisão repetida no navegador, para a
// interface não oferecer o que o servidor vai negar. Se os dois discordarem,
// quem vale é o servidor.

export const PAPEIS = Object.freeze(['mestre', 'jogador']);

export const PAPEL_PADRAO = 'jogador';

export function normalizarPapel(valor) {
  return PAPEIS.includes(valor) ? valor : PAPEL_PADRAO;
}

export const ehMestre = membro => normalizarPapel(membro?.papel) === 'mestre';

/**
 * Este documento chega a esta pessoa?
 *
 * Três portas, nesta ordem: o Mestre vê tudo; o que foi liberado para a mesa
 * vê quem é da mesa; o resto só chega a quem está na lista. Um documento sem
 * nada marcado não chega a ninguém além do Mestre — o padrão é guardado, não
 * aberto, porque o engano barato aqui é o que vaza a reviravolta.
 */
export function podeVerDocumento(documento, membro) {
  if (!membro) return false;
  if (ehMestre(membro)) return true;
  if (!documento) return false;
  if (documento.liberadoParaTodos === true) return true;
  const lista = Array.isArray(documento.liberadoPara) ? documento.liberadoPara : [];
  return lista.includes(membro.uid);
}

/** Os segredos da ficha: o dono vê os seus, o Mestre vê os de todos. */
export function podeVerSegredosDaFicha(ficha, membro) {
  if (!membro) return false;
  if (ehMestre(membro)) return true;
  return String(ficha?.dono || '') === String(membro.uid);
}

/**
 * O jogador pode editar esta ficha?
 *
 * O Mestre edita qualquer uma; o jogador, a dele. Uma ficha sem dono é de
 * quem a pegar — é assim que um jogador assume um personagem novo.
 */
export function podeEditarFicha(ficha, membro) {
  if (!membro) return false;
  if (ehMestre(membro)) return true;
  const dono = String(ficha?.dono || '');
  return dono === '' || dono === String(membro.uid);
}

/** O que só o Mestre faz, declarado num lugar só para não divergir pelas telas. */
export const PODERES_DO_MESTRE = Object.freeze([
  'criar-documento', 'liberar-documento',
  'criar-mapa', 'revelar-local',
  'criar-pecado', 'criar-ficha',
  'escrever-capitulo', 'tocar-musica',
  'promover-membro',
]);

export function podeNaMesa(membro, poder) {
  if (!membro) return false;
  if (ehMestre(membro)) return true;
  return !PODERES_DO_MESTRE.includes(String(poder));
}

/**
 * Filtra uma lista de documentos para o que esta pessoa pode ver.
 *
 * Existe para a tela nunca iterar a lista crua: é fácil esquecer um `if` numa
 * aba nova, e o esquecimento aqui tem nome — mostrar ao jogador o documento
 * que o Mestre guardou para a sessão que vem.
 */
export function documentosVisiveis(documentos, membro) {
  return (Array.isArray(documentos) ? documentos : []).filter(d => podeVerDocumento(d, membro));
}

/** Resumo em uma linha de para quem um documento foi liberado. */
export function resumoDaLiberacao(documento, nomePorUid = {}) {
  if (documento?.liberadoParaTodos === true) return 'Liberado para a mesa';
  const lista = Array.isArray(documento?.liberadoPara) ? documento.liberadoPara : [];
  if (lista.length === 0) return 'Guardado';
  const nomes = lista.map(uid => nomePorUid[uid] || 'alguém');
  if (nomes.length === 1) return `Só para ${nomes[0]}`;
  const ultimo = nomes[nomes.length - 1];
  return `Só para ${nomes.slice(0, -1).join(', ')} e ${ultimo}`;
}
