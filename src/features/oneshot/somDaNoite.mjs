/**
 * O SOM DA NOITE — sintetizado, não gravado.
 *
 * A mesa pediu sussurros e corujas de som ambiente. Eu não tenho de onde
 * trazer gravação: baixar áudio aqui não é possível, e pendurar um arquivo de
 * terceiro no site levanta uma questão de licença que ninguém quer ter numa
 * noite de jogo. Então isto é FEITO na hora, com Web Audio — oscilador,
 * ruído filtrado e envelope. Nenhum arquivo, nenhum download, nenhum CSP.
 *
 * Três vozes, que é o mínimo para não virar zumbido:
 *
 *  VENTO   ruído rosa atravessando um filtro passa-baixa que abre e fecha
 *          devagar. É a cama: sozinho já soa como casa vazia à noite.
 *  CORUJA  duas notas curtas, a segunda mais grave, em intervalos longos e
 *          irregulares. Coruja regular vira metrônomo e mata o efeito.
 *  SUSSURRO ruído em banda estreita na faixa da fala (1–2 kHz), subindo e
 *          descendo em dois segundos. Não tem palavra nenhuma; a cabeça de
 *          quem ouve põe as palavras, que é justamente o que se quer.
 *
 * O ganho é baixo de propósito. Som ambiente que se nota é trilha, e trilha
 * disputa com a voz do Mestre.
 */

const VOLUME_BASE = 0.055;

/** Ruído rosa: mais grave que o branco, soa como ar e não como chuvisco. */
function bufferDeRuido(contexto, segundos = 4) {
  const taxa = contexto.sampleRate;
  const buffer = contexto.createBuffer(1, taxa * segundos, taxa);
  const dados = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < dados.length; i += 1) {
    const branco = Math.random() * 2 - 1;
    // Filtro de Voss aproximado: três polos bastam para soar rosa.
    b0 = 0.99765 * b0 + branco * 0.0990460;
    b1 = 0.96300 * b1 + branco * 0.2965164;
    b2 = 0.57000 * b2 + branco * 1.0526913;
    dados[i] = (b0 + b1 + b2 + branco * 0.1848) * 0.12;
  }
  return buffer;
}

const entre = (minimo, maximo) => minimo + Math.random() * (maximo - minimo);

/**
 * Liga a noite. Devolve uma função que desliga e solta tudo.
 *
 * Precisa ser chamado de dentro de um clique: o navegador não libera áudio
 * sem gesto da pessoa, e aqui não há tocador visível para ela apertar.
 */
export function ligarSomDaNoite({ volume = 1 } = {}) {
  const Contexto = window.AudioContext || window.webkitAudioContext;
  if (!Contexto) return () => {};

  const ctx = new Contexto();
  const mestre = ctx.createGain();
  mestre.gain.value = VOLUME_BASE * Math.max(0, Math.min(1, volume));
  mestre.connect(ctx.destination);

  const ruido = bufferDeRuido(ctx);
  const vivos = [];

  /* ── Vento ── */
  const vento = ctx.createBufferSource();
  vento.buffer = ruido;
  vento.loop = true;
  const filtroDoVento = ctx.createBiquadFilter();
  filtroDoVento.type = 'lowpass';
  filtroDoVento.frequency.value = 420;
  const ganhoDoVento = ctx.createGain();
  ganhoDoVento.gain.value = 0.9;
  vento.connect(filtroDoVento).connect(ganhoDoVento).connect(mestre);
  vento.start();
  vivos.push(vento);

  // A respiração do vento: o filtro abrindo e fechando é o que impede o ruído
  // de virar chiado parado de televisão fora do ar.
  const lento = ctx.createOscillator();
  lento.frequency.value = 0.06;
  const profundidade = ctx.createGain();
  profundidade.gain.value = 180;
  lento.connect(profundidade).connect(filtroDoVento.frequency);
  lento.start();
  vivos.push(lento);

  /* ── Coruja e sussurro, em intervalos irregulares ── */
  let relogios = [];
  const agendar = (fn, minimo, maximo) => {
    const id = setTimeout(() => {
      fn();
      agendar(fn, minimo, maximo);
    }, entre(minimo, maximo) * 1000);
    relogios.push(id);
  };

  const piar = () => {
    const agora = ctx.currentTime;
    const base = entre(360, 460);
    [0, 0.42].forEach((atraso, i) => {
      const voz = ctx.createOscillator();
      voz.type = 'sine';
      voz.frequency.setValueAtTime(base * (i ? 0.86 : 1), agora + atraso);
      const env = ctx.createGain();
      // Ataque mole e cauda longa: coruja não tem transiente de percussão.
      env.gain.setValueAtTime(0, agora + atraso);
      env.gain.linearRampToValueAtTime(0.5, agora + atraso + 0.07);
      env.gain.exponentialRampToValueAtTime(0.001, agora + atraso + 0.46);
      voz.connect(env).connect(mestre);
      voz.start(agora + atraso);
      voz.stop(agora + atraso + 0.5);
    });
  };

  const sussurrar = () => {
    const agora = ctx.currentTime;
    const voz = ctx.createBufferSource();
    voz.buffer = ruido;
    voz.loop = true;
    const banda = ctx.createBiquadFilter();
    banda.type = 'bandpass';
    // Faixa da fala humana: é o que faz a cabeça procurar palavra onde não há.
    banda.frequency.value = entre(1100, 1900);
    banda.Q.value = 6;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, agora);
    env.gain.linearRampToValueAtTime(0.42, agora + 0.8);
    env.gain.linearRampToValueAtTime(0, agora + 2.1);
    voz.connect(banda).connect(env).connect(mestre);
    voz.start(agora);
    voz.stop(agora + 2.2);
  };

  agendar(piar, 18, 48);
  agendar(sussurrar, 12, 34);

  return () => {
    relogios.forEach(clearTimeout);
    relogios = [];
    vivos.forEach(no => { try { no.stop(); } catch (_) { /* já parou */ } });
    // Desvanecer antes de fechar: cortar o contexto no meio dá um estalo.
    try {
      mestre.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      setTimeout(() => ctx.close().catch(() => {}), 1200);
    } catch (_) {
      ctx.close().catch(() => {});
    }
  };
}
