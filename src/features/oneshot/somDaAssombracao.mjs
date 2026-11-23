/**
 * O SOM DA ASSOMBRAÇÃO
 *
 * Sintetizado, como o resto do ambiente desta mesa — nenhum arquivo de áudio
 * entra no projeto. Três razões, e as duas primeiras já custaram sessão:
 *
 *  - arquivo de som precisa carregar, e um susto que chega meio segundo
 *    depois do escuro não é susto, é defeito;
 *  - a CSP da mesa é estreita, e todo host novo que entrou aqui quebrou
 *    alguma coisa (a música e a câmera já caíram por isso);
 *  - sintetizado, o som sai diferente a cada vez, e a terceira assombração
 *    da noite não soa igual à primeira.
 *
 * O desenho do som é o mesmo de um baque de filme: um golpe grave que chega
 * de uma vez e uma cauda que abre e fecha devagar por cima. Nada agudo —
 * agudo em fone de ouvido a volume alto machuca, e a mesa joga de fone.
 *
 * NUNCA toca sem gesto anterior do usuário: o navegador bloquearia, e tentar
 * forçar só enche o console de aviso. Se o contexto de áudio não estiver
 * liberado, a assombração acontece calada — o escuro sozinho já vale a cena.
 */

let contexto = null;

const pegarContexto = () => {
  if (contexto) return contexto;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    contexto = new Ctor();
  } catch { return null; }
  return contexto;
};

/** O quanto cada intensidade pesa no som. "Vulto" quase não soa. */
const PESO = Object.freeze({ vulto: 0.22, presenca: 0.5, encarar: 0.85 });

export function tocarAssombracao(intensidade = 'presenca') {
  const ctx = pegarContexto();
  // Bloqueado pelo navegador: cala a boca em vez de encher o console.
  if (!ctx || ctx.state === 'suspended') return false;

  const agora = ctx.currentTime;
  const peso = PESO[intensidade] ?? PESO.presenca;
  const saida = ctx.createGain();
  saida.gain.value = peso;
  saida.connect(ctx.destination);

  // O GOLPE: senoide que despenca de 90 para 34 Hz. É o que se sente mais do
  // que se ouve, e é o que faz o escuro chegar junto com alguma coisa.
  const golpe = ctx.createOscillator();
  const vGolpe = ctx.createGain();
  golpe.type = 'sine';
  golpe.frequency.setValueAtTime(90, agora);
  golpe.frequency.exponentialRampToValueAtTime(34, agora + 1.1);
  vGolpe.gain.setValueAtTime(0.0001, agora);
  vGolpe.gain.exponentialRampToValueAtTime(0.9, agora + 0.04);
  vGolpe.gain.exponentialRampToValueAtTime(0.0001, agora + 1.6);
  golpe.connect(vGolpe).connect(saida);
  golpe.start(agora);
  golpe.stop(agora + 1.7);

  // A CAUDA: ruído passado por um filtro que abre e fecha, como ar sendo
  // puxado. Dois segundos, sempre um pouco diferente, porque o ruído é
  // sorteado a cada vez.
  const amostras = Math.floor(ctx.sampleRate * 2.2);
  const buffer = ctx.createBuffer(1, amostras, ctx.sampleRate);
  const dados = buffer.getChannelData(0);
  for (let i = 0; i < amostras; i += 1) dados[i] = Math.random() * 2 - 1;

  const ruido = ctx.createBufferSource();
  ruido.buffer = buffer;
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.Q.value = 1.4;
  filtro.frequency.setValueAtTime(220, agora);
  filtro.frequency.linearRampToValueAtTime(820, agora + 0.9);
  filtro.frequency.linearRampToValueAtTime(140, agora + 2.1);
  const vRuido = ctx.createGain();
  vRuido.gain.setValueAtTime(0.0001, agora);
  vRuido.gain.linearRampToValueAtTime(0.4, agora + 0.5);
  vRuido.gain.linearRampToValueAtTime(0.0001, agora + 2.2);
  ruido.connect(filtro).connect(vRuido).connect(saida);
  ruido.start(agora);
  ruido.stop(agora + 2.2);

  // Desliga a saída quando tudo acabou: nó de áudio esquecido ligado vaza, e
  // numa noite inteira de assombrações isso vira estalo e travada.
  window.setTimeout(() => { try { saida.disconnect(); } catch { /* já foi */ } }, 2600);
  return true;
}

/** Para os testes: o peso de cada intensidade é o que o Mestre escolheu. */
export const pesoDaIntensidade = id => PESO[id] ?? PESO.presenca;
