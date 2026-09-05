import { useEffect, useId, useMemo, useRef, useState } from 'react';
import './physical-dice.css';

const clampSide = value => [4, 6, 8, 10, 12, 20].includes(Number(value)) ? Number(value) : 20;

export default function PhysicalDiceTray({
  sides = 20,
  finalValue = 1,
  finalValues,
  rollTs = 0,
  color = '#C8A8E8',
  total,
  bonus = 0,
  onSettled,
}) {
  const reactId = useId();
  const sceneId = `dinastia-physical-dice-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const hostRef = useRef(null);
  const boxRef = useRef(null);
  const mountedRef = useRef(true);
  const lastRollRef = useRef(0);
  const settledRef = useRef(onSettled);
  const [phase, setPhase] = useState('idle');
  const [fallback, setFallback] = useState(false);

  const values = useMemo(() => {
    const source = Array.isArray(finalValues) && finalValues.length ? finalValues : [finalValue];
    return source.slice(0, 5).map(value => Number(value) || 1);
  }, [finalValues, finalValue]);
  const valuesKey = values.join(',');

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
              background: '#241D2B',
              outline: '#08060D',
              texture: 'none',
              material: 'metal',
            },
            theme_texture: '',
            theme_material: 'metal',
            gravity_multiplier: 430,
            light_intensity: 0.95,
            color_spotlight: 0xf7efff,
            baseScale: values.length >= 4 ? 62 : values.length >= 2 ? 72 : 82,
            strength: 1.45,
            iterationLimit: 850,
          });
          await box.initialize();
          boxRef.current = box;
        } else if (box.updateConfig) {
          try {
            await box.updateConfig({
              baseScale: values.length >= 4 ? 62 : values.length >= 2 ? 72 : 82,
              light_intensity: 0.95,
              color_spotlight: 0xf7efff,
              theme_customColorset: {
                name: `dinastia-${sceneId}-${String(color).replace('#', '')}`,
                foreground: color,
                background: '#241D2B',
                outline: '#08060D',
                texture: 'none',
                material: 'metal',
              },
            });
          } catch (_) {}
        }
        if (cancelled) return;
        setPhase('rolling');
        const safeSides = clampSide(sides);
        const safeValues = values.map(value => Math.max(1, Math.min(safeSides, Number(value) || 1)));
        await box.roll(`${safeValues.length}d${safeSides}@${safeValues.join(',')}`);
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
  }, [rollTs, sides, valuesKey, color, sceneId]);

  const hasTotal = Number.isFinite(Number(total));
  const numericBonus = Number(bonus || 0);

  return (
    <div className={`physical-dice-tray phase-${phase}`} style={{ '--dice-accent': color }}>
      <div className="physical-dice-space">
        <div className="physical-dice-stars" />
        <div ref={hostRef} id={sceneId} className="physical-dice-scene" />
        {fallback && (
          <div className="physical-dice-fallback" aria-hidden="true" style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
            {values.map((value, index) => (
              <div key={`${rollTs}-${index}`} className={`physical-die-fallback d${clampSide(sides)}`}>{value}</div>
            ))}
          </div>
        )}
        {(phase === 'loading' || phase === 'idle') && (
          <div className="physical-dice-loading">materializando {values.length > 1 ? 'os dados' : 'o dado'}…</div>
        )}
      </div>
      <div className="physical-dice-caption">
        <span>{values.length > 1 ? `${values.length}D${clampSide(sides)}` : `D${clampSide(sides)}`}</span>
        <i />
        <small>
          {phase === 'rolling'
            ? 'em movimento'
            : phase === 'settled' && hasTotal
              ? `total ${Number(total)}${numericBonus ? ` (${values.reduce((sum, value) => sum + Number(value || 0), 0)} ${numericBonus >= 0 ? '+' : '−'} ${Math.abs(numericBonus)})` : ''}`
              : phase === 'settled' ? 'repouso alcançado' : 'preparando matéria'}
        </small>
      </div>
    </div>
  );
}
