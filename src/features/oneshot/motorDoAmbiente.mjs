/**
 * O MOTOR DO AMBIENTE
 *
 * Monta a cama, o zumbido e os eventos de um mapa, e desmonta tudo quando a
 * mesa troca de andar.
 *
 * O CUIDADO QUE MAIS IMPORTA AQUI É DESLIGAR. Nó de áudio esquecido ligado
 * continua consumindo e continua soando; numa noite inteira trocando de
 * andar, isso vira sete ambientes tocando juntos e o navegador engasgando.
 * Por isso tudo que é criado entra numa lista e `parar()` percorre a lista.
 *
 * E toda entrada e saída é com RAMPA, nunca em corte seco: som que começa
 * de supetão denuncia o truque, e som que corta no meio é um clique alto no
 * fone de quem está jogando.
 */
import { ambienteDoMapa, pressaDoAmbiente, proximoIntervalo } from './somDaCasa.mjs';

const RAMPA = 1.6;

/** Ruído branco de alguns segundos, em laço. Serve de matéria para tudo. */
function fazerRuido(ctx, segundos = 3) {
  const amostras = Math.floor(ctx.sampleRate * segundos);
  const buffer = ctx.createBuffer(1, amostras, ctx.sampleRate);
  const dados = buffer.getChannelData(0);
  for (let i = 0; i < amostras; i += 1) dados[i] = Math.random() * 2 - 1;
  return buffer;
}

const TIPO_DE_FILTRO = { 'passa-baixa': 'lowpass', 'passa-banda': 'bandpass' };

/**
 * Um evento: goteira, estalo, rajada, cano, relógio.
 *
 * Todos saem do mesmo ruído e de um envelope — muda o filtro e a forma. É
 * o que permite sete ambientes inteiros sem um arquivo de som.
 */
function dispararEvento(ctx, saida, tipo, ganho) {
  const agora = ctx.currentTime;
  const v = ctx.createGain();
  v.connect(saida);

  if (tipo === 'goteira' || tipo === 'cano') {
    // Uma gota é um tom curto que cai de altura. Cano é o mesmo, mais grave
    // e mais longo, como metal ressoando.
    const grave = tipo === 'cano';
    const o = ctx.createOscillator();
    o.type = 'sine';
    const topo = grave ? 320 : 1250;
    o.frequency.setValueAtTime(topo, agora);
    o.frequency.exponentialRampToValueAtTime(topo * 0.42, agora + (grave ? 0.5 : 0.13));
    v.gain.setValueAtTime(0.0001, agora);
    v.gain.exponentialRampToValueAtTime(ganho, agora + 0.008);
    v.gain.exponentialRampToValueAtTime(0.0001, agora + (grave ? 0.9 : 0.3));
    o.connect(v);
    o.start(agora);
    o.stop(agora + (grave ? 1 : 0.4));
    return;
  }

  if (tipo === 'relogio') {
    // O tique: estalo seco e curtíssimo, bem baixo.
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(900, agora);
    v.gain.setValueAtTime(0.0001, agora);
    v.gain.exponentialRampToValueAtTime(ganho, agora + 0.004);
    v.gain.exponentialRampToValueAtTime(0.0001, agora + 0.06);
    o.connect(v);
    o.start(agora);
    o.stop(agora + 0.08);
    return;
  }

  // Estalo e rajada: ruído filtrado. O estalo é curto e agudo (madeira); a
  // rajada é longa e larga (vento).
  const rajada = tipo === 'rajada';
  const fonte = ctx.createBufferSource();
  fonte.buffer = fazerRuido(ctx, rajada ? 3 : 0.5);
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = rajada ? 0.7 : 5;
  const base = rajada ? 300 : 900 + Math.random() * 700;
  f.frequency.setValueAtTime(base, agora);
  if (rajada) f.frequency.linearRampToValueAtTime(base * 2.2, agora + 2);
  const dura = rajada ? 2.6 : 0.26;
  v.gain.setValueAtTime(0.0001, agora);
  v.gain.linearRampToValueAtTime(ganho, agora + (rajada ? 0.8 : 0.01));
  v.gain.linearRampToValueAtTime(0.0001, agora + dura);
  fonte.connect(f).connect(v);
  fonte.start(agora);
  fonte.stop(agora + dura + 0.05);
}

/**
 * Liga o ambiente de um mapa. Devolve o controle: `ajustar` e `parar`.
 *
 * Devolve null quando o áudio não está liberado — a casa fica muda e o
 * resto funciona igual. Forçar só encheria o console de aviso.
 */
export function ligarAmbiente(ctx, idDoMapa, { pressao = 0, instabilidade = 1 } = {}) {
  const receita = ambienteDoMapa(idDoMapa);
  if (!ctx || !receita || ctx.state === 'suspended') return null;

  const vivos = [];
  const timers = [];
  const mestre = ctx.createGain();
  mestre.gain.setValueAtTime(0.0001, ctx.currentTime);
  mestre.connect(ctx.destination);
  vivos.push(mestre);

  let presenca = pressaDoAmbiente(pressao, instabilidade);
  mestre.gain.linearRampToValueAtTime(presenca.volume, ctx.currentTime + RAMPA);

  // A CAMA: ruído em laço, filtrado. O filtro passeia devagar, e é esse
  // passeio que faz o vento não soar como chiado de rádio.
  const cama = ctx.createBufferSource();
  cama.buffer = fazerRuido(ctx, 4);
  cama.loop = true;
  const filtro = ctx.createBiquadFilter();
  filtro.type = TIPO_DE_FILTRO[receita.cama.tipo] || 'lowpass';
  filtro.frequency.value = receita.cama.centro;
  filtro.Q.value = receita.cama.q;
  const vCama = ctx.createGain();
  vCama.gain.value = receita.cama.ganho;
  cama.connect(filtro).connect(vCama).connect(mestre);
  cama.start();
  vivos.push(cama, filtro, vCama);

  // O passeio do filtro, com um oscilador lento em vez de um temporizador:
  // temporizador a cada quadro gastaria processamento à toa.
  const lento = ctx.createOscillator();
  lento.type = 'sine';
  lento.frequency.value = 1 / Math.max(1, receita.cama.periodo);
  const profundidade = ctx.createGain();
  profundidade.gain.value = receita.cama.variacao;
  lento.connect(profundidade).connect(filtro.frequency);
  lento.start();
  vivos.push(lento, profundidade);

  // O ZUMBIDO: o peso do lugar. Quase inaudível e sempre presente.
  const zum = ctx.createOscillator();
  zum.type = 'sine';
  zum.frequency.value = receita.zumbido.hz;
  const vZum = ctx.createGain();
  vZum.gain.value = receita.zumbido.ganho;
  zum.connect(vZum).connect(mestre);
  zum.start();
  vivos.push(zum, vZum);

  // OS EVENTOS: cada um se reagenda sozinho, com intervalo sorteado. São
  // eles que impedem o ambiente de virar papel de parede.
  for (const evento of receita.eventos || []) {
    const agendar = () => {
      const espera = proximoIntervalo(evento.intervalo, presenca.aperto) * 1000;
      const t = setTimeout(() => {
        try { dispararEvento(ctx, mestre, evento.tipo, evento.ganho); } catch { /* fim */ }
        agendar();
      }, espera);
      timers.push(t);
    };
    agendar();
  }

  return {
    mapa: String(idDoMapa),
    /** A pressão muda o aperto dos eventos sem recomeçar o ambiente. */
    ajustar(nova = {}) {
      presenca = pressaDoAmbiente(nova.pressao ?? pressao, nova.instabilidade ?? instabilidade);
      try {
        mestre.gain.linearRampToValueAtTime(presenca.volume, ctx.currentTime + 2);
      } catch { /* contexto fechado */ }
    },
    /** Desliga com rampa e solta TUDO: nó esquecido ligado continua soando. */
    parar() {
      for (const t of timers) clearTimeout(t);
      timers.length = 0;
      try {
        mestre.gain.cancelScheduledValues(ctx.currentTime);
        mestre.gain.setValueAtTime(mestre.gain.value, ctx.currentTime);
        mestre.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
      } catch { /* já fechado */ }
      setTimeout(() => {
        for (const no of vivos) {
          try { no.stop?.(); } catch { /* não é fonte */ }
          try { no.disconnect(); } catch { /* já solto */ }
        }
        vivos.length = 0;
      }, 1000);
    },
  };
}
