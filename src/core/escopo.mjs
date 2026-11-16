// QUAL MESA ESTÁ ABERTA
//
// Só o id da campanha ativa e o que se deriva dele. Sem Firebase, de
// propósito: o cache da sessão, o do mapa e o das fichas precisam saber em que
// mesa estão, e puxar o Firestore inteiro para dentro de um cache de
// localStorage deixaria esses módulos impossíveis de testar sozinhos.
//
// campaign.js é quem escreve aqui; todo o resto só lê.

export const PRIMARY_CAMPAIGN_ID = 'dinastia-e';

let idAtivo = PRIMARY_CAMPAIGN_ID;

/** Troca a mesa ativa. Chamado por campaign.js, não pelas telas. */
export function definirEscopo(id) {
  idAtivo = String(id || PRIMARY_CAMPAIGN_ID);
  return idAtivo;
}

export const escopoAtivo = () => idAtivo;

export const ehCampanhaPrincipal = () => idAtivo === PRIMARY_CAMPAIGN_ID;

/**
 * Prefixo das coleções da mesa ativa.
 *
 * A principal não tem prefixo: ela usa os caminhos que o Firestore já tem, e
 * foi assim que a migração para várias mesas aconteceu sem mover um dado.
 */
export function caminhoEscopado(nome) {
  const caminho = String(nome || '');
  if (!caminho) throw new Error('caminhoEscopado exige o nome da coleção');
  return ehCampanhaPrincipal() ? caminho : `c__${idAtivo}__${caminho}`;
}

/**
 * Sufixo para chaves de localStorage.
 *
 * Vazio na campanha principal, para quem já estava logado continuar logado e
 * não perder o que tinha guardado. Fora dela, cada mesa tem o seu canto — sem
 * isso, o Arquivo de Veneza abria mostrando a sessão e os mapas da Dinastia E
 * que estavam no navegador, e ficava assim, porque a mesa nova não tem
 * documento de sessão para sobrescrever o cache.
 */
export const storageSuffix = () => (ehCampanhaPrincipal() ? '' : `:${idAtivo}`);
