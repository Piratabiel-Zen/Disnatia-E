import { useEffect, useId, useRef, useState } from 'react';
import './physical-dice.css';

const clampSide = value => [4, 6, 8, 10, 12, 20].includes(Number(value)) ? Number(value) : 20;

export default function PhysicalDiceTray({ sides = 20, finalValue = 1, rollTs = 0, color = '#C8A8E8', onSettled }) {
  const reactId = useId();
  const sceneId = `dinastia-physical-dice-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const hostRef = useRef(null);
  const boxRef = useRef(null);
  const mountedRef = useRef(true);
  const lastRollRef = useRef(0);
  const settledRef = useRef(onSettled);
  const [phase, setPhase] = useState('idle');
  const [fallback, setFallback] = useState(false);

  useEffect(() => { settledRef.current = onSettled; }, [onSettled]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const box = boxRef.current;
      try {
        if (box) {
          box.running = false;
          if (box.threadid) cancelAnimationFrame(box.threadid);
          if (Array.isArray(box.bodies) && box.world) box.bodies.forEach(body => { try { box.world.removeBody(body); } catch (_) {} });
          if (box.renderer) {
            try { box.renderer.dispose(); } catch (_) {}
            try { box.renderer.forceContextLoss?.(); } catch (_) {}
          }
        }
      } catch (_) {}
      boxRef.current = null;
      if (hostRef.current) hostRef.current.replaceChildren();
    };
  }, []);

  useEffect(() => {
    if (!rollTs || rollTs === lastRollRef.current) return;
    lastRollRef.current = rollTs;
    let cancelled = false;
    let fallbackTimer = 0;

    const settleFallback = () => {
      if (cancelled || !mountedRef.current) return;
      setPhase('settled');
      settledRef.current?.();
    };

    const run = async () => {
      setPhase('loading');
      setFallback(false);
      try {
        const mod = await import('@3d-dice/dice-box-threejs');
        if (cancelled || !hostRef.current) return;
        const DiceBox = mod.default || mod.DiceBox || mod;
        let box = boxRef.current;
        if (!box) {
          box = new DiceBox(`#${sceneId}`, {
            sounds: false,
            shadows: true,
            theme_surface: 'green-felt',
            theme_customColorset: {
              name: `dinastia-${sceneId}`,
              foreground: color,
              background: '#0A0812',
              outline: '#020106',
              texture: 'none',
              material: 'metal',
            },
            theme_texture: '',
            theme_material: 'metal',
            gravity_multiplier: 430,
            light_intensity: 0.72,
            color_spotlight: 0xd9dcff,
            baseScale: 82,
            strength: 1.45,
            iterationLimit: 850,
          });
          await box.initialize();
          boxRef.current = box;
        } else if (box.updateConfig) {
          try {
            await box.updateConfig({
              theme_customColorset: {
                name: `dinastia-${sceneId}-${String(color).replace('#', '')}`,
                foreground: color,
                background: '#0A0812',
                outline: '#020106',
                texture: 'none',
                material: 'metal',
              },
            });
          } catch (_) {}
        }
        if (cancelled) return;
        setPhase('rolling');
        const safeSides = clampSide(sides);
        const safeValue = Math.max(1, Math.min(safeSides, Number(finalValue) || 1));
        await box.roll(`1d${safeSides}@${safeValue}`);
        if (cancelled || !mountedRef.current) return;
        setPhase('settled');
        settledRef.current?.();
      } catch (error) {
        console.warn('Física 3D do dado indisponível; usando fallback leve.', error);
        if (cancelled || !mountedRef.current) return;
        setFallback(true);
        setPhase('rolling');
        fallbackTimer = window.setTimeout(settleFallback, 980);
      }
    };

    run();
    return () => {
      cancelled = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
    };
  }, [rollTs, sides, finalValue, color, sceneId]);

  return (
    <div className={`physical-dice-tray phase-${phase}`} style={{ '--dice-accent': color }}>
      <div className="physical-dice-space">
        <div className="physical-dice-stars" />
        <div ref={hostRef} id={sceneId} className="physical-dice-scene" />
        {fallback && (
          <div className="physical-dice-fallback" aria-hidden="true">
            <div className={`physical-die-fallback d${clampSide(sides)}`}>{finalValue}</div>
          </div>
        )}
        {(phase === 'loading' || phase === 'idle') && (
          <div className="physical-dice-loading">materializando o dado…</div>
        )}
      </div>
      <div className="physical-dice-caption">
        <span>FÍSICA CÓSMICA</span>
        <i />
        <small>{phase === 'rolling' ? 'em movimento' : phase === 'settled' ? 'repouso alcançado' : 'preparando matéria'}</small>
      </div>
    </div>
  );
}
