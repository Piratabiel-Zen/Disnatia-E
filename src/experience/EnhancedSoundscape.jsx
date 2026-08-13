import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../core/firebase';

const SOUND_KEYS = [
  'rain','wind','fire','whispers','hum','bells','drips','water','insects','metal','heartbeat','arcane','thunder','crowd',
];

const clamp01 = v => Math.max(0, Math.min(1, Number(v || 0) / 100));

function makeNoise(ctx, seconds = 3) {
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    brown = (brown + 0.035 * white) / 1.035;
    data[i] = brown * 3.2;
  }
  return buffer;
}

function connectNoise(ctx, master, buffer, type, frequency, q = 0.8) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  src.connect(filter).connect(gain).connect(master);
  src.start();
  return { src, filter, gain };
}

export default function EnhancedSoundscape() {
  const [soundscape, setSoundscape] = useState({ preset:'silencio' });
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const nodesRef = useRef({});
  const timersRef = useRef(new Map());
  const valuesRef = useRef(soundscape);
  const active = SOUND_KEYS.some(key => Number(soundscape?.[key] || 0) > 0);

  useEffect(() => { valuesRef.current = soundscape; }, [soundscape]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'soundscape'), snap => {
      setSoundscape(snap.exists() ? (snap.data() || { preset:'silencio' }) : { preset:'silencio' });
    }, () => {});
    return () => unsub();
  }, []);

  const transientGain = useCallback((ctx, master, peak, duration, start = ctx.currentTime) => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    gain.connect(master);
    return gain;
  }, []);

  const playBell = useCallback((intensity) => {
    const ctx = ctxRef.current; const master = masterRef.current;
    if (!ctx || !master) return;
    const start = ctx.currentTime;
    [392, 587.3, 783.9].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq * (0.985 + Math.random() * 0.03);
      const gain = transientGain(ctx, master, (0.011 + i * 0.003) * intensity, 2.2 + i * 0.35, start + i * 0.012);
      osc.connect(gain); osc.start(start); osc.stop(start + 2.7 + i * 0.3);
    });
  }, [transientGain]);

  const playDrip = useCallback((intensity) => {
    const ctx = ctxRef.current; const master = masterRef.current;
    if (!ctx || !master) return;
    const start = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const startFreq = 1050 + Math.random() * 900;
    osc.frequency.setValueAtTime(startFreq, start);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.46, start + 0.14);
    const gain = transientGain(ctx, master, 0.025 * intensity, 0.23, start);
    osc.connect(gain); osc.start(start); osc.stop(start + 0.28);
  }, [transientGain]);

  const playMetal = useCallback((intensity) => {
    const ctx = ctxRef.current; const master = masterRef.current;
    if (!ctx || !master) return;
    const start = ctx.currentTime;
    [930, 1450].forEach((freq, i) => {
      const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = freq * (0.9 + Math.random() * 0.18);
      const gain = transientGain(ctx, master, (i ? 0.0045 : 0.007) * intensity, 0.32 + i * 0.12, start + i * 0.025);
      osc.connect(gain); osc.start(start); osc.stop(start + 0.52);
    });
  }, [transientGain]);

  const playHeartbeat = useCallback((intensity) => {
    const ctx = ctxRef.current; const master = masterRef.current;
    if (!ctx || !master) return;
    [0, 0.19].forEach((offset, i) => {
      const start = ctx.currentTime + offset;
      const osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(i ? 58 : 48, start);
      osc.frequency.exponentialRampToValueAtTime(31, start + 0.18);
      const gain = transientGain(ctx, master, (i ? 0.024 : 0.036) * intensity, 0.22, start);
      osc.connect(gain); osc.start(start); osc.stop(start + 0.26);
    });
  }, [transientGain]);

  const playThunder = useCallback((intensity) => {
    const ctx = ctxRef.current; const master = masterRef.current;
    if (!ctx || !master) return;
    const start = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = makeNoise(ctx, 1.8);
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 210;
    const gain = transientGain(ctx, master, 0.11 * intensity, 1.55, start);
    src.connect(filter).connect(gain); src.start(start); src.stop(start + 1.8);
  }, [transientGain]);

  const playInsect = useCallback((intensity) => {
    const ctx = ctxRef.current; const master = masterRef.current;
    if (!ctx || !master) return;
    const start = ctx.currentTime;
    for (let i = 0; i < 3; i += 1) {
      const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 3900 + Math.random() * 1900;
      const gain = transientGain(ctx, master, 0.0035 * intensity, 0.055, start + i * 0.085);
      osc.connect(gain); osc.start(start + i * 0.085); osc.stop(start + i * 0.085 + 0.08);
    }
  }, [transientGain]);

  const schedule = useCallback((key, minMs, maxMs, play) => {
    const loop = () => {
      const level = clamp01(valuesRef.current?.[key]);
      if (level > 0.015 && !document.hidden) play(level);
      const density = Math.max(0.18, level);
      const delay = (minMs + Math.random() * (maxMs - minMs)) / (0.55 + density * 0.9);
      const timer = window.setTimeout(loop, delay);
      timersRef.current.set(key, timer);
    };
    const timer = window.setTimeout(loop, minMs * (0.7 + Math.random()));
    timersRef.current.set(key, timer);
  }, []);

  const ensure = useCallback(() => {
    if (ctxRef.current) {
      ctxRef.current.resume?.(); setReady(true); return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const master = ctx.createGain(); master.gain.value = muted || !active ? 0 : 0.9; master.connect(ctx.destination);
    const noiseBuffer = makeNoise(ctx, 4);

    const rain = connectNoise(ctx, master, noiseBuffer, 'highpass', 2600, 0.45);
    const wind = connectNoise(ctx, master, noiseBuffer, 'bandpass', 420, 0.55);
    const fire = connectNoise(ctx, master, noiseBuffer, 'bandpass', 1750, 0.8);
    const whispers = connectNoise(ctx, master, noiseBuffer, 'bandpass', 1250, 1.35);
    const water = connectNoise(ctx, master, noiseBuffer, 'lowpass', 520, 0.55);
    const crowd = connectNoise(ctx, master, noiseBuffer, 'bandpass', 700, 0.7);

    const humOsc = ctx.createOscillator(); humOsc.type = 'sine'; humOsc.frequency.value = 52;
    const humGain = ctx.createGain(); humGain.gain.value = 0; humOsc.connect(humGain).connect(master); humOsc.start();
    const arcaneOsc = ctx.createOscillator(); arcaneOsc.type = 'triangle'; arcaneOsc.frequency.value = 109.8;
    const arcaneGain = ctx.createGain(); arcaneGain.gain.value = 0; arcaneOsc.connect(arcaneGain).connect(master); arcaneOsc.start();
    const arcaneUpper = ctx.createOscillator(); arcaneUpper.type = 'sine'; arcaneUpper.frequency.value = 164.7;
    const arcaneUpperGain = ctx.createGain(); arcaneUpperGain.gain.value = 0; arcaneUpper.connect(arcaneUpperGain).connect(master); arcaneUpper.start();

    // Os LFOs modulam a textura/frequência — nunca o ganho. Assim, com volume 0,
    // nenhum semiciclo do oscilador consegue reabrir o canal e gerar "vento fantasma".
    const windLfo = ctx.createOscillator(); const windLfoGain = ctx.createGain(); windLfo.frequency.value = 0.09; windLfoGain.gain.value = 85; windLfo.connect(windLfoGain).connect(wind.filter.frequency); windLfo.start();
    const fireLfo = ctx.createOscillator(); const fireLfoGain = ctx.createGain(); fireLfo.frequency.value = 7.2; fireLfoGain.gain.value = 210; fireLfo.connect(fireLfoGain).connect(fire.filter.frequency); fireLfo.start();
    const waterLfo = ctx.createOscillator(); const waterLfoGain = ctx.createGain(); waterLfo.frequency.value = 0.18; waterLfoGain.gain.value = 70; waterLfo.connect(waterLfoGain).connect(water.filter.frequency); waterLfo.start();

    ctxRef.current = ctx; masterRef.current = master;
    nodesRef.current = { rain,wind,fire,whispers,water,crowd,hum:{gain:humGain,source:humOsc},arcane:{gain:arcaneGain,source:arcaneOsc},arcaneUpper:{gain:arcaneUpperGain,source:arcaneUpper},lfos:[windLfo,fireLfo,waterLfo] };

    schedule('bells',5200,12500,playBell); schedule('drips',900,4300,playDrip); schedule('metal',3600,9800,playMetal);
    schedule('heartbeat',980,1800,playHeartbeat); schedule('thunder',6500,15500,playThunder); schedule('insects',850,2600,playInsect);
    setReady(true); ctx.resume?.();
  }, [active,muted,playBell,playDrip,playMetal,playHeartbeat,playThunder,playInsect,schedule]);

  useEffect(() => {
    const activate = () => ensure();
    window.addEventListener('pointerdown', activate, { once:true });
    return () => window.removeEventListener('pointerdown', activate);
  }, [ensure]);

  useEffect(() => {
    const ctx = ctxRef.current; const nodes = nodesRef.current; const master = masterRef.current;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    const tau = active && !muted ? 0.45 : 0.045;
    const set = (node, key, max) => {
      const param = node?.gain?.gain;
      if (!param) return;
      param.cancelScheduledValues(t);
      param.setTargetAtTime(clamp01(soundscape?.[key]) * max, t, tau);
    };
    set(nodes.rain, 'rain', 0.16); set(nodes.wind, 'wind', 0.12); set(nodes.fire, 'fire', 0.08); set(nodes.whispers, 'whispers', 0.055);
    set(nodes.water, 'water', 0.15); set(nodes.crowd, 'crowd', 0.045); set(nodes.hum, 'hum', 0.08); set(nodes.arcane, 'arcane', 0.045); set(nodes.arcaneUpper, 'arcane', 0.023);
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(muted || !active ? 0 : 0.9, t, active && !muted ? 0.18 : 0.035);
    if (active && ctx.state === 'suspended') ctx.resume?.();
  }, [soundscape, muted, ready, active]);

  useEffect(() => () => {
    timersRef.current.forEach(timer => window.clearTimeout(timer)); timersRef.current.clear();
    try { ctxRef.current?.close?.(); } catch (_) {}
  }, []);

  if (!active) return null;
  return <button className={`soundscape-local ${ready ? 'ready' : ''}`} onClick={() => { ensure(); setMuted(v => !v); }} title={muted ? 'Ativar ambiente' : 'Silenciar ambiente'}>{muted ? '🌫️×' : '🌫️'}<span>{soundscape.label || 'Ambiente'}</span></button>;
}
