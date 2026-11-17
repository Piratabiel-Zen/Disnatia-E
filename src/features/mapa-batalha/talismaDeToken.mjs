// O TALISMÃ DE EXECUÇÃO SOBRE A CABEÇA DO TOKEN
//
// No CAIN não existe ponto de vida. O que mede o estado de um corpo — do
// exorcista e do Pecado — é o talismã de execução: uma fileira de caixas que
// se enche de cortes. Cheia, o corpo cede.
//
// Então a barra do token não pode ser a barra de HP da Dinastia E. Ela tem
// três estados por caixa, e é essa terceira que a mesa precisa ver:
//
//   vazia     o talismã ainda aguenta
//   cortada   já levou
//   perdida   não existe mais, e não volta
//
// A caixa PERDIDA é o ponto todo. Quando o talismã de um exorcista enche, ele
// zera e ganha um ferimento — e o talismã novo nasce com uma caixa a menos.
// A barra "volta a crescer", mas nunca até onde estava. Desenhar isso em
// cinza no fim da fileira é o que faz a mesa entender, de relance, que aquele
// exorcista está se gastando e não só tomando dano.

export const CAIXAS_DO_EXORCISTA = 6;

const inteiro = (valor, minimo = 0) => {
  const n = Math.trunc(Number(valor));
  return Number.isFinite(n) ? Math.max(minimo, n) : minimo;
};

/**
 * O talismã de um exorcista, a partir da ficha dele.
 *
 * Seis caixas menos uma por ferimento carregado; os cortes são o estresse.
 */
export function talismaDoExorcista(ficha) {
  if (!ficha) return null;
  const perdidas = Math.min(CAIXAS_DO_EXORCISTA - 1, inteiro(ficha.ferimentos));
  const disponiveis = CAIXAS_DO_EXORCISTA - perdidas;
  return {
    tipo: 'exorcista',
    total: CAIXAS_DO_EXORCISTA,
    disponiveis,
    perdidas,
    cortes: Math.min(disponiveis, inteiro(ficha.estresse)),
    // À beira da morte: o próximo corte mata, e a barra precisa gritar isso.
    critico: perdidas >= CAIXAS_DO_EXORCISTA - 3 && inteiro(ficha.ferimentos) >= 3,
  };
}

/**
 * O talismã de um Pecado, a partir do registro dele na aba Pecados.
 *
 * Aqui o total vem do próprio Pecado: um Ogro de quatro cortes e um Lorde de
 * oito não podem desenhar a mesma fileira.
 */
export function talismaDoPecado(pecado) {
  if (!pecado) return null;
  const total = Math.max(1, inteiro(pecado.talisma, 1) || 4);
  const perdidas = Math.min(total - 1, inteiro(pecado.talismaPerdidos));
  const disponiveis = total - perdidas;
  return {
    tipo: 'pecado',
    total,
    disponiveis,
    perdidas,
    cortes: Math.min(disponiveis, inteiro(pecado.talismaCortes)),
    // Talismã cheio não é morte: é a hora em que a execução passa a ser
    // possível. A barra marca isso com cor própria porque é a deixa da cena.
    critico: inteiro(pecado.talismaCortes) >= disponiveis,
  };
}

/**
 * O talismã que este token deve mostrar, seja ele exorcista ou Pecado.
 *
 * Devolve null quando o token não está ligado a nada — token solto não tem
 * corpo para medir, e inventar uma barra cheia seria mentira na tela.
 */
export function talismaDoToken(token, { fichas = [], pecados = [] } = {}) {
  if (!token) return null;
  const alvo = String(token.sheetId || '');
  if (alvo) {
    const ficha = fichas.find(f => String(f.id) === alvo);
    if (ficha) return talismaDoExorcista(ficha);
  }
  const inimigo = String(token.enemyId || '');
  if (inimigo) {
    const pecado = pecados.find(p => String(p.id) === inimigo);
    if (pecado) return talismaDoPecado(pecado);
  }
  return null;
}

/**
 * As caixas, em ordem, para a tela desenhar.
 *
 * Cortes primeiro, depois as vazias, e as perdidas no fim — porque é do fim
 * que a fileira encolhe. Desenhar a perdida no meio daria a impressão de um
 * buraco que ainda pode ser preenchido, e ele não pode.
 */
export function caixasDoTalisma(talisma) {
  if (!talisma) return [];
  const { total, disponiveis, cortes } = talisma;
  return Array.from({ length: total }, (_, i) => {
    if (i >= disponiveis) return 'perdida';
    return i < cortes ? 'cortada' : 'vazia';
  });
}

/** Resumo em texto, para quem pode ver número e para leitor de tela. */
export function resumoDoTalisma(talisma) {
  if (!talisma) return '';
  const { cortes, disponiveis, perdidas } = talisma;
  const base = `${cortes}/${disponiveis}`;
  return perdidas > 0 ? `${base} · ${perdidas} perdida${perdidas > 1 ? 's' : ''}` : base;
}
