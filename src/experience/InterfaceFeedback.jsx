import { useEffect, useRef } from 'react';
import { usePlayerPreferences } from '../adventure/usePlayerPreferences';
export default function InterfaceFeedback() {
  const [preferences] = usePlayerPreferences();
  const audio = useRef(null);
  useEffect(() => {
    const play = () => {
      if (!preferences.interface || document.hidden) return;
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      try {
        const ctx = audio.current || (audio.current = new Audio());
        if (ctx.state !== 'running') { ctx.resume().catch(() => {}); return; }
        const tone = ctx.createOscillator(), gain = ctx.createGain();
        tone.type = 'sine'; tone.frequency.value = 620;
        gain.gain.setValueAtTime(.025 * preferences.interface / 100, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .075);
        tone.connect(gain).connect(ctx.destination); tone.start(); tone.stop(ctx.currentTime + .08);
        tone.onended = () => { tone.disconnect(); gain.disconnect(); };
      } catch { /* Audio permission does not block actions. */ }
    };
    window.addEventListener('dinastia:action-confirmed', play);
    window.addEventListener('dinastia:ping-type', play);
    return () => { window.removeEventListener('dinastia:action-confirmed', play); window.removeEventListener('dinastia:ping-type', play); };
  }, [preferences.interface]);
  useEffect(() => () => { audio.current?.close().catch(() => {}); }, []);
  return null;
}
