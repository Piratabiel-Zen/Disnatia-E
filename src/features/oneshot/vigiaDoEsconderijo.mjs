/**
 * O MESTRE VÊ QUEM ESTÁ ENTRANDO NO ARMÁRIO
 *
 * Até agora o esconderijo era uma caixa-preta: o jogador apertava o botão,
 * ficava 3,4 segundos no escuro e saía escondido ou pego. O Mestre só
 * descobria depois, por um registro que ninguém lia.
 *
 * Isso tirava da cena o momento que mais vale. No Ao Oni a tensão não está
 * em saber que alguém se escondeu — está em VER a porta do armário se
 * fechando enquanto a coisa chega. Quem narra precisa desses segundos para
 * narrar em cima deles: "ela está na escada… você ouve a porta ranger…".
 *
 * Então o esconderijo passa a ter três momentos, e o Mestre vê os três:
 *
 *   ENTRANDO   os 3,4 segundos em que a porta se fecha. É aqui que a cena
 *              acontece, e é por isso que o segundo corrente aparece.
 *   ESCONDIDO  passou. Continua no armário até sair.
 *   PEGO       não passou.
 *
 * O resultado continua sendo sorteado UMA vez, na tela de quem entrou, no
 * instante em que entra — o Mestre vê o que está acontecendo, não decide.
 * Ver não pode virar poder de mudar, senão a decisão do jogador de esperar
 * mais um pouco deixa de valer alguma coisa.
 */

/** Os três momentos, na ordem em que acontecem. */
export const MOMENTOS = Object.freeze({
  ENTRANDO: 'entrando',
  ESCONDIDO: 'escondido',
  PEGO: 'pego',
});

/**
 * O registro que nasce quando alguém aperta "Esconder".
 *
 * Guarda a chance e a tensão do instante da decisão, não do instante em
 * que se lê: a caçada continua apertando enquanto a porta fecha, e o que
 * interessa ao Mestre é o risco que a pessoa ACEITOU correr.
 */
export function entrandoNoArmario({ quem, nome = '', cacada, chance, agora = Date.now() }) {
  const ficha = String(quem || '').trim();
  if (!ficha) return null;
  return {
    quem: ficha,
    nome: String(nome || '').trim(),
    estado: MOMENTOS.ENTRANDO,
    em: Number(agora) || 0,
    // Arredondado no centésimo: é número de leitura, não de conta.
    chance: Math.round(Math.min(1, Math.max(0, Number(chance) || 0)) * 100) / 100,
    tensao: Math.round(Math.min(1, Math.max(0, Number(cacada?.tensao) || 0)) * 100) / 100,
    inescapavel: Boolean(cacada?.inescapavel),
    cacando: Boolean(cacada?.ativa),
  };
}

/** E o que ele vira quando as portas abrem. */
export function portasAbrem(registro, resultado, agora = Date.now()) {
  if (!registro) return null;
  return {
    ...registro,
    estado: resultado?.passou ? MOMENTOS.ESCONDIDO : MOMENTOS.PEGO,
    resolvidoEm: Number(agora) || 0,
  };
}

/** Sair do armário por vontade própria apaga a linha da vista do Mestre. */
export const saiuDoArmario = registro =>
  (registro ? { ...registro, estado: '', saiuEm: Date.now() } : null);

const SEGUNDOS = 1000;

/**
 * A lista como o Mestre lê.
 *
 * Ordem: quem está entrando primeiro, porque é o que está acontecendo
 * agora e é sobre isso que ele vai falar. Depois os pegos, que são a
 * próxima coisa a narrar. Os escondidos ficam por último — eles já estão
 * resolvidos e só precisam ser lembrados.
 */
export function vistaDoMestre(registros, agora = Date.now()) {
  const ordem = { [MOMENTOS.ENTRANDO]: 0, [MOMENTOS.PEGO]: 1, [MOMENTOS.ESCONDIDO]: 2 };
  return (registros || [])
    .filter(r => r && ordem[r.estado] !== undefined)
    .map(r => {
      const desde = Math.max(0, (Number(agora) || 0) - (Number(r.em) || 0));
      return {
        ...r,
        /* Para quem está entrando, o relógio corre. Para os outros ele
           para no instante em que as portas abriram: um "há 4 minutos" que
           continua crescendo é informação, mas "há 2 segundos" congelado é
           o que diz que ISTO acabou de acontecer. */
        segundos: r.estado === MOMENTOS.ENTRANDO
          ? Math.floor(desde / SEGUNDOS)
          : Math.floor(Math.max(0, (Number(r.resolvidoEm) || Number(r.em) || 0) - (Number(r.em) || 0)) / SEGUNDOS),
        desdeQuando: Math.floor(desde / SEGUNDOS),
      };
    })
    .sort((a, b) => (ordem[a.estado] - ordem[b.estado]) || (b.em - a.em));
}

/** O que o Mestre lê em cada linha. */
export function frase(registro) {
  if (!registro) return '';
  const nome = registro.nome || 'Alguém';
  if (registro.estado === MOMENTOS.ENTRANDO) return `${nome} está entrando num esconderijo`;
  if (registro.estado === MOMENTOS.ESCONDIDO) return `${nome} conseguiu se esconder`;
  if (registro.estado === MOMENTOS.PEGO) return `${nome} não chegou a tempo`;
  return '';
}

/**
 * O risco em palavras.
 *
 * Porcentagem é número de planilha: no meio de uma cena ninguém converte
 * 0,34 em "arriscado" rápido o bastante para usar na narração. A faixa
 * segue a chance que o jogador aceitou, não a tensão de agora.
 */
export function risco(registro) {
  const c = Number(registro?.chance);
  if (!Number.isFinite(c)) return '';
  if (!registro?.cacando) return 'sem ninguém atrás';
  if (c >= 0.75) return 'entrou com folga';
  if (c >= 0.5) return 'entrou em cima da hora';
  if (c >= 0.25) return 'esperou demais';
  return 'entrou com ela em cima';
}
