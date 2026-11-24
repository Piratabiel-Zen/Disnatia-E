/**
 * O SOM DA CASA
 *
 * Cada andar soa diferente, e o som é o que faz um mapa parar de ser uma
 * imagem. O porão respira caldeira e goteira; o sótão é madeira estalando
 * no vento; a sala ritualística é quase silêncio, e o quase é o que
 * assusta.
 *
 * TUDO SINTETIZADO, sem um arquivo de áudio no projeto. As razões já foram
 * pagas aqui: a CSP da mesa é estreita e todo host novo quebrou alguma
 * coisa; arquivo precisa carregar, e ambiente que entra meio segundo depois
 * do mapa denuncia o truque; e sintetizado nunca se repete igual — a mesa
 * passa três horas no mesmo andar e não ouve um laço.
 *
 * O DESENHO É SEMPRE O MESMO, e é só isto:
 *
 *  - uma CAMA contínua: ruído passado por um filtro. Muda o filtro e o
 *    mesmo ruído vira chuva, vento, ar parado de porão;
 *  - um ZUMBIDO grave, quase inaudível, que dá peso ao lugar;
 *  - EVENTOS esparsos: a goteira, o estalo, a rajada. São eles que fazem o
 *    som não virar papel de parede — a mesma razão pela qual a atmosfera
 *    visual ganhou o que quebra.
 *
 * NUNCA TOCA SEM GESTO ANTERIOR do usuário: o navegador bloquearia e o
 * console encheria de aviso. Sem áudio liberado, a casa fica muda e o resto
 * funciona igual.
 */

/** O ambiente de cada mapa, em números que o motor entende. */
export const AMBIENTES = Object.freeze({
  patio: {
    nome: 'Pátio',
    // Vento aberto: filtro baixo e largo, com variação lenta.
    cama: { tipo: 'passa-banda', centro: 420, q: 0.6, ganho: 0.1, variacao: 220, periodo: 13 },
    zumbido: { hz: 48, ganho: 0.03 },
    eventos: [
      { tipo: 'rajada', intervalo: [9, 18], ganho: 0.12 },
      { tipo: 'range', intervalo: [22, 50], ganho: 0.07 },
    ],
  },
  terreo: {
    // Casa fechada: ar parado, e a madeira assentando.
    cama: { tipo: 'passa-baixa', centro: 300, q: 0.7, ganho: 0.055, variacao: 60, periodo: 19 },
    zumbido: { hz: 54, ganho: 0.035 },
    eventos: [
      { tipo: 'estalo', intervalo: [11, 26], ganho: 0.1 },
      { tipo: 'relogio', intervalo: [2, 2], ganho: 0.035 },
    ],
  },
  quartos: {
    // Quase nada. É o andar mais silencioso, e de propósito.
    cama: { tipo: 'passa-baixa', centro: 230, q: 0.8, ganho: 0.035, variacao: 40, periodo: 23 },
    zumbido: { hz: 58, ganho: 0.03 },
    eventos: [{ tipo: 'estalo', intervalo: [14, 38], ganho: 0.08 }],
  },
  sotao: {
    // Madeira e telhado: estalo frequente e vento filtrado fino.
    cama: { tipo: 'passa-banda', centro: 620, q: 1.1, ganho: 0.07, variacao: 180, periodo: 11 },
    zumbido: { hz: 44, ganho: 0.028 },
    eventos: [
      { tipo: 'estalo', intervalo: [6, 15], ganho: 0.13 },
      { tipo: 'rajada', intervalo: [16, 34], ganho: 0.09 },
    ],
  },
  porao: {
    // Caldeira, cano e goteira. O andar mais cheio de som.
    cama: { tipo: 'passa-baixa', centro: 190, q: 1.2, ganho: 0.085, variacao: 50, periodo: 8 },
    zumbido: { hz: 38, ganho: 0.055 },
    eventos: [
      { tipo: 'goteira', intervalo: [3, 8], ganho: 0.12 },
      { tipo: 'cano', intervalo: [13, 30], ganho: 0.1 },
    ],
  },
  ritual: {
    // Quase silêncio. O zumbido é mais forte que a cama: o lugar pesa.
    cama: { tipo: 'passa-baixa', centro: 150, q: 1.4, ganho: 0.03, variacao: 25, periodo: 27 },
    zumbido: { hz: 33, ganho: 0.08 },
    eventos: [{ tipo: 'goteira', intervalo: [9, 22], ganho: 0.08 }],
  },
  galpao: {
    // Chuva no telhado de zinco, e o gerador.
    cama: { tipo: 'passa-banda', centro: 1500, q: 0.5, ganho: 0.1, variacao: 320, periodo: 7 },
    zumbido: { hz: 62, ganho: 0.04 },
    eventos: [
      { tipo: 'cano', intervalo: [10, 24], ganho: 0.09 },
      { tipo: 'estalo', intervalo: [15, 32], ganho: 0.08 },
    ],
  },
});

export const ambienteDoMapa = id => AMBIENTES[String(id)] || null;

/**
 * O volume final, dado a hora e a pressão da mesa.
 *
 * A noite não fica mais ALTA quando aperta — fica mais presente. Subir o
 * volume cansaria em vinte minutos; o que cresce é a frequência dos
 * eventos, que é o que a pessoa percebe como "a casa está mais viva".
 */
export const MULTIPLICADOR_MAXIMO = 1.45;
export function pressaDoAmbiente(pressao = 0, instabilidade = 1) {
  const p = Math.min(1, Math.max(0, Number(pressao) || 0));
  const i = Math.min(3, Math.max(0.2, Number(instabilidade) || 1));
  return Object.freeze({
    // O volume quase não muda.
    volume: 1 + p * 0.22,
    // Os eventos chegam até quase o dobro mais perto uns dos outros.
    aperto: Math.min(MULTIPLICADOR_MAXIMO, 1 + p * 0.3 + (i - 1) * 0.18),
  });
}

/** Sorteia o próximo intervalo, já apertado pela pressão. */
export function proximoIntervalo([min, max], aperto = 1, sorteio = Math.random) {
  const a = Math.max(0.5, Number(min) || 1);
  const b = Math.max(a, Number(max) || a);
  const bruto = a + sorteio() * (b - a);
  return Math.max(0.4, bruto / Math.max(0.5, aperto));
}
