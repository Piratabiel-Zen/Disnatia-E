// AS REGRAS DO CAIN
//
// O motor de rolagem, puro e sem React, para poder ser testado sozinho. As
// regras aqui vêm do livro (CAIN 1.4.5 PT-BR, Tom Bloom), páginas 6 a 9 — não
// de memória, e não inventadas:
//
//   • A reserva soma até 3d6 pela perícia (0 a 3) e até 3d6 por vantagens.
//   • Todo dado com 4+ é um sucesso. Um sucesso já basta: a ação atinge o
//     objetivo. Nenhum sucesso é falha, com consequências.
//   • Difícil: só o 6 conta como sucesso.
//   • Reserva 0 não é "não role". É rolar 2d6 e ficar com o MENOR — a chance
//     ruim continua sendo uma chance, e é por isso que esse caso existe.
//   • Arriscado: o Admin rola 1d6 de risco junto, e o resultado vale
//     independentemente de a ação ter dado certo. 1 muito pior, 2-3 pior,
//     4-5 como esperado, 6 melhor.
//   • Agonia Divina: a piedade acumula até 3 e é queimada inteira, dando +1D
//     por ponto. Uma vez por sessão por exorcista, uma por cena no grupo.

export const FACES = 6;
export const ALVO_NORMAL = 4;
export const ALVO_DIFICIL = 6;

/** O teto de cada metade da reserva. Perícia e vantagens somam 3 cada. */
export const MAX_PERICIA = 3;
export const MAX_VANTAGEM = 3;

/** A piedade para na terceira. */
export const MAX_PIEDADE = 3;

/** O que o dado de risco diz, do pior para o melhor. */
export const RISCO = Object.freeze({
  1: { chave: 'muito-pior', rotulo: 'Muito pior', descricao: 'Acontece o pior que poderia acontecer.' },
  2: { chave: 'pior', rotulo: 'Pior', descricao: 'Pior do que o esperado: consequências mais pesadas ou ação menos eficaz.' },
  3: { chave: 'pior', rotulo: 'Pior', descricao: 'Pior do que o esperado: consequências mais pesadas ou ação menos eficaz.' },
  4: { chave: 'esperado', rotulo: 'Como esperado', descricao: 'Sem maiores complicações.' },
  5: { chave: 'esperado', rotulo: 'Como esperado', descricao: 'Sem maiores complicações.' },
  6: { chave: 'melhor', rotulo: 'Melhor', descricao: 'Mais eficaz, consequência mais leve ou uma abertura repentina.' },
});

/** Um d6. O sorteio entra por parâmetro para o teste poder fixá-lo. */
const rolarDado = (sorteio = Math.random) => Math.floor(sorteio() * FACES) + 1;

const inteiro = (valor, minimo, maximo) => {
  const n = Math.trunc(Number(valor) || 0);
  return Math.max(minimo, Math.min(maximo, n));
};

/**
 * Monta a reserva a partir da perícia e das vantagens, respeitando os tetos.
 *
 * Devolve também `minimo`: quando a reserva zera, não se deixa de rolar — rola
 * 2d6 e fica o menor. É a regra que mais se perde quando alguém implementa
 * isto de cabeça, e é justamente a que mantém tensão numa perícia zerada.
 */
export function montarReserva({ pericia = 0, vantagens = 0 } = {}) {
  const p = inteiro(pericia, 0, MAX_PERICIA);
  const v = inteiro(vantagens, 0, MAX_VANTAGEM);
  const total = p + v;
  return { pericia: p, vantagens: v, dados: total, minimo: total === 0 };
}

/**
 * Uma rolagem de ação completa.
 *
 * @param {object} opcoes
 * @param {number} opcoes.pericia    0 a 3.
 * @param {number} opcoes.vantagens  0 a 3 (ajuda, equipamento, habilidade).
 * @param {number} opcoes.piedade    Piedade queimada em Agonia Divina.
 * @param {boolean} opcoes.dificil   Só 6 conta como sucesso.
 * @param {boolean} opcoes.arriscado O Admin rola o dado de risco junto.
 * @param {Function} opcoes.sorteio  Gerador, para o teste poder fixar a sorte.
 */
export function rolarAcao({
  pericia = 0, vantagens = 0, piedade = 0,
  dificil = false, arriscado = false,
  sorteio = Math.random,
} = {}) {
  const queimada = inteiro(piedade, 0, MAX_PIEDADE);
  const base = montarReserva({ pericia, vantagens });

  // A Agonia Divina pode estourar o teto das vantagens: é esse o ponto dela.
  const quantidade = base.minimo ? 2 : base.dados + queimada;
  const dados = Array.from({ length: quantidade }, () => rolarDado(sorteio));

  const alvo = dificil ? ALVO_DIFICIL : ALVO_NORMAL;
  // Com reserva zero, só o menor dos dois dados conta.
  const contados = base.minimo ? [Math.min(...dados)] : dados;
  const sucessos = contados.filter(d => d >= alvo).length;

  const risco = arriscado ? rolarDado(sorteio) : null;

  return {
    dados,
    contados,
    descartados: base.minimo ? dados.filter((_, i) => dados.indexOf(Math.min(...dados)) !== i) : [],
    reserva: { ...base, piedade: queimada, rolados: quantidade },
    alvo,
    dificil,
    arriscado,
    sucessos,
    // Um sucesso basta. Os extras valem em certas circunstâncias, e quem
    // decide isso é o Admin — o site só informa quantos saíram.
    acertou: sucessos > 0,
    risco: risco === null ? null : { valor: risco, ...RISCO[risco] },
  };
}

/** O texto curto que resume a rolagem na mesa. */
export function resumoDaRolagem(resultado) {
  if (!resultado) return '';
  const { sucessos, acertou, dificil, risco, reserva } = resultado;
  const partes = [];
  partes.push(acertou
    ? `${sucessos} sucesso${sucessos > 1 ? 's' : ''}`
    : 'Falha');
  if (reserva.minimo) partes.push('reserva zero: 2d6, fica o menor');
  else if (dificil) partes.push('difícil: só 6 conta');
  if (risco) partes.push(`risco ${risco.valor} — ${risco.rotulo.toLowerCase()}`);
  return partes.join(' · ');
}

/**
 * A piedade que um exorcista ganha numa cena.
 *
 * Pelo livro, ganha 1 a cada: teste sem sucesso, ferimento ou aflição, gancho
 * preenchido, ou outro exorcista morrer/verter pecado. Para em 3.
 */
export function ganharPiedade(atual, quantidade = 1) {
  return inteiro(Number(atual) + Number(quantidade), 0, MAX_PIEDADE);
}

/** Pode invocar Agonia Divina? Uma vez por sessão por exorcista, uma por cena no grupo. */
export function podeAgoniaDivina({ piedade = 0, usouNaSessao = false, grupoUsouNaCena = false } = {}) {
  if (piedade <= 0) return { pode: false, motivo: 'Sem piedade acumulada.' };
  if (usouNaSessao) return { pode: false, motivo: 'Este exorcista já usou Agonia Divina nesta sessão.' };
  if (grupoUsouNaCena) return { pode: false, motivo: 'O grupo já usou Agonia Divina nesta cena.' };
  return { pode: true, motivo: '' };
}
