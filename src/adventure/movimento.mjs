// QUEM DECIDE SE A MESA SE MEXE
//
// Antes quem decidia era o sistema operacional. Todo o site usava
// @media(prefers-reduced-motion:reduce), e quem tivesse desligado as animações
// do Windows (Acessibilidade → Efeitos visuais) via a mesa inteira congelada:
// token sem respirar, habilidade sem responder ao mouse, livro sem girar,
// mapa sem luz. Em todos os navegadores, porque todos respeitam esse sinal.
// Era indistinguível de um site quebrado.
//
// O problema é que esse sinal é ambíguo. No Windows ele quase sempre é
// desligado por desempenho, não por enjoo de movimento — e aqui o movimento
// não é enfeite: a respiração do token diz que aquilo é alguém esperando a
// vez, e a escala da habilidade diz a força dela antes de o jogador ler o
// custo. Desligar isso não deixa a mesa mais calma, deixa a mesa muda.
//
// Então a decisão passa a ser do jogador, explicitamente, e nasce em "ligadas".
// Quem precisa de menos movimento continua tendo onde dizer isso — e agora
// num lugar que ele encontra, dentro do próprio site, em vez de depender de
// uma caixa do sistema que ele talvez nem saiba que marcou.

export const MOTION_VALUES = ['full', 'system', 'reduced'];

/** O rótulo de cada escolha, como aparece para o jogador. */
export const MOTION_LABELS = Object.freeze({
  full: 'Sempre ligadas',
  system: 'Seguir o sistema',
  reduced: 'Reduzidas',
});

/** Garante um valor conhecido. Nasce ligado: a mesa se mexe por padrão. */
export function normalizeMotion(value) {
  return MOTION_VALUES.includes(value) ? value : 'full';
}

/**
 * Traduz a escolha do jogador para o único estado que o CSS enxerga.
 *
 * O CSS não conhece "system": ele só sabe de reduced e full. Quem resolve a
 * ambiguidade é esta função, de um lado só, para não haver duas fontes de
 * verdade discordando.
 */
export function resolveMotion(preference, sistemaPedeReduzir) {
  const escolha = normalizeMotion(preference);
  if (escolha === 'reduced') return 'reduced';
  if (escolha === 'system' && sistemaPedeReduzir) return 'reduced';
  return 'full';
}

/** O sistema está pedindo menos movimento? */
export function systemAsksReduce() {
  try { return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches); }
  catch { return false; }
}

/** Escreve o estado resolvido no <html>, de onde todo o CSS o lê. */
export function applyMotion(preference, root = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!root) return 'full';
  const estado = resolveMotion(preference, systemAsksReduce());
  root.dataset.motion = estado;
  return estado;
}

/** Para o JS que precisa saber sem reler a preferência (dados, globo, parallax). */
export function motionIsReduced(root = typeof document !== 'undefined' ? document.documentElement : null) {
  return root?.dataset?.motion === 'reduced';
}
