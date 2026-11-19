/**
 * DO ARQUIVO PARA O MURAL
 *
 * Um documento no Arquivo é material de leitura: a pessoa abre, lê inteiro,
 * fecha. No Mural ele é outra coisa — uma peça pequena, alfinetada na parede,
 * que serve para ser ligada por barbante a outras. São usos diferentes do
 * mesmo papel, e a mesa precisa dos dois: ler a carta de dez parágrafos, e
 * depois pendurar na parede "a carta do médico" para amarrar a três pistas.
 *
 * Então mandar para o mural não move nem copia o documento: cria um cartão
 * que o aponta. O documento continua no Arquivo, com a liberação dele; o
 * cartão nasce com A MESMA liberação, porque pendurar na parede não pode
 * virar um atalho para revelar o que estava guardado.
 *
 * Tipo do cartão: fotografia vira fotografia, o resto vira pista — que é o
 * tipo do mural feito para pedaço de informação que se liga a outros.
 */

const RESUMO_MAXIMO = 220;

/** O começo do corpo, cortado em palavra inteira. */
export function resumoParaCartao(corpo, limite = RESUMO_MAXIMO) {
  const texto = String(corpo || '').replace(/\s+/g, ' ').trim();
  if (texto.length <= limite) return texto;
  const corte = texto.slice(0, limite);
  const ultimoEspaco = corte.lastIndexOf(' ');
  return `${(ultimoEspaco > limite * 0.6 ? corte.slice(0, ultimoEspaco) : corte).trimEnd()}…`;
}

/**
 * O cartão que representa este documento na parede.
 *
 * `origemDocumento` é o que impede duplicata: a tela confere antes de criar.
 */
export function cartaoDeDocumento(documento, { id, x = 40, y = 40 } = {}) {
  if (!documento) return null;
  const ehFoto = documento.tipo === 'foto' && Boolean(documento.imagem);
  return {
    id: String(id || `c${Date.now().toString(36)}`),
    tipo: ehFoto ? 'fotografia' : 'pista',
    titulo: String(documento.titulo || 'Documento sem título'),
    texto: resumoParaCartao(documento.corpo || documento.legenda || ''),
    imagem: ehFoto ? documento.imagem : '',
    x, y,
    // Mesma plateia do documento. Pendurar na parede não revela nada novo.
    liberadoParaTodos: documento.liberadoParaTodos === true,
    liberadoPara: Array.isArray(documento.liberadoPara) ? [...documento.liberadoPara] : [],
    origemDocumento: String(documento.id || ''),
    criadoEm: Date.now(),
  };
}

/** Este documento já está pendurado? */
export const jaNoMural = (documento, cartoes) =>
  (Array.isArray(cartoes) ? cartoes : [])
    .some(c => String(c?.origemDocumento || '') === String(documento?.id || '') && documento?.id);
