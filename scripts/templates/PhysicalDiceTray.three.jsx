import { useEffect, useId, useMemo, useRef, useState } from 'react';
import './physical-dice.css';

const SUPPORTED_SIDES = [4, 6, 8, 10, 12, 20];
const clampSide = value => SUPPORTED_SIDES.includes(Number(value)) ? Number(value) : 20;

function disposeDiceBox(box, host) {
  if (!box) return;
  try {
    box.running = false;
    box.rolling = false;
    if (box.threadid) cancelAnimationFrame(box.threadid);
    if (Array.isArray(box.bodies) && box.world) {
      box.bodies.forEach(body => { try { box.world.removeBody(body); } catch (_) {} });
    }
    if (box.renderer) {
      try { box.renderer.dispose(); } catch (_) {}
      try { box.renderer.forceContextLoss?.(); } catch (_) {}
    }
  } catch (_) {}
  try { host?.replaceChildren(); } catch (_) {}
}

const withTimeout = (promise, timeoutMs) => new Promise((resolve, reject) => {
  const timer = window.setTimeout(() => reject(new Error('Tempo limite da física 3D excedido')), timeoutMs);
  promise.then(value => { window.clearTimeout(timer); resolve(value); }, error => { window.clearTimeout(timer); reject(error); });
});

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
  const sceneId = `dinastia-three-dice-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const hostRef = useRef(null);
  const boxRef = useRef(null);
  const boxKeyRef = useRef('');
  const lastRollRef = useRef(0);
  const settledRef = useRef(onSettled);
  const mountedRef = useRef(true);
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
    const handleResize = () => {
      const box = boxRef.current;
      if (!box?.renderer || !hostRef.current) return;
      try { box.setDimensions(); } catch (_) {}
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      mountedRef.current = false;
      window.removeEventListener('resize', handleResize);
      disposeDiceBox(boxRef.current, hostRef.current);
      boxRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!rollTs || rollTs === lastRollRef.current) return undefined;
    lastRollRef.current = rollTs;
    let cancelled = false;
    let fallbackTimer = 0;
    const safeSides = clampSide(sides);
    const safeValues = values.map(value => Math.max(1, Math.min(safeSides, Number(value) || 1)));
    const scaleBand = safeValues.length >= 4 ? 'many' : safeValues.length >= 2 ? 'pair' : 'single';
    const boxKey = `${String(color).toLowerCase()}-${scaleBand}`;

    const settle = () => {
      if (cancelled || !mountedRef.current) return;
      setPhase('settled');
      settledRef.current?.();
    };

    const run = async () => {
      setPhase('loading');
      setFallback(false);
      try {
        if (!window.WebGLRenderingContext) throw new Error('WebGL não está disponível neste navegador');
        const module = await import('@3d-dice/dice-box-threejs');
        if (cancelled || !hostRef.current) return;
        const DiceBox = module.default || module.DiceBox || module;

        if (boxRef.current && boxKeyRef.current !== boxKey) {
          disposeDiceBox(boxRef.current, hostRef.current);
          boxRef.current = null;
        }

        let box = boxRef.current;
        if (!box) {
          hostRef.current.replaceChildren();
          box = new DiceBox(`#${sceneId}`, {
            assetPath: '/dice-box/',
            sounds: false,
            shadows: true,
            theme_surface: 'green-felt',
            theme_customColorset: {
              name: `dinastia-${String(color).replace('#', '')}`,
              foreground: '#FFF8FF',
              background: color,
              outline: '#16081E',
              edge: color,
              texture: 'none',
              material: 'metal',
            },
            theme_texture: '',
            theme_material: 'metal',
            gravity_multiplier: 360,
            light_intensity: 1.15,
            color_spotlight: 0xf8efff,
            baseScale: safeValues.length >= 4 ? 54 : safeValues.length >= 2 ? 66 : 78,
            strength: 2.15,
            iterationLimit: 1100,
          });
          // A biblioteca registra internamente um listener que não oferece API de
          // remoção. O componente já possui um listener limpo no unmount.
          box.resizeWorld = () => {};
          await box.initialize();
          if (cancelled || !mountedRef.current) {
            disposeDiceBox(box, hostRef.current);
            return;
          }
          boxRef.current = box;
          boxKeyRef.current = boxKey;
        }

        setPhase('rolling');
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const notation = `${safeValues.length}d${safeSides}@${safeValues.join(',')}`;
        await withTimeout(box.roll(notation), 10000);
        settle();
      } catch (error) {
        console.error('[Dinastia Dice] Falha ao iniciar a física Three.js/Cannon.', error);
        if (cancelled || !mountedRef.current) return;
        disposeDiceBox(boxRef.current, hostRef.current);
        boxRef.current = null;
        boxKeyRef.current = '';
        setFallback(true);
        setPhase('fallback');
        fallbackTimer = window.setTimeout(settle, 1200);
      }
    };

    run();
    return () => {
      cancelled = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
    };
  }, [rollTs, sides, valuesKey, color, sceneId]);

  const safeSides = clampSide(sides);
  const numericBonus = Number(bonus || 0);
  const diceTotal = values.reduce((sum, value) => sum + Number(value || 0), 0);
  const hasTotal = Number.isFinite(Number(total));

  return (
    <div className={`physical-dice-tray phase-${phase}`} style={{ '--dice-accent': color }}>
      <div className="physical-dice-space">
        <div className="physical-dice-stars" />
        <div ref={hostRef} id={sceneId} className="physical-dice-scene" aria-hidden="true" />
        {fallback && (
          <div className="physical-dice-fallback" aria-hidden="true">
            {values.map((value, index) => <b key={`${rollTs}-${index}`}>{value}</b>)}
          </div>
        )}
        {phase === 'loading' && <div className="physical-dice-loading">preparando física tridimensional…</div>}
        <span className="physical-dice-a11y" role="img" aria-label={values.map(value => `D${safeSides} com resultado ${value}`).join(', ')} />
      </div>
      <div className="physical-dice-caption">
        <span>{values.length > 1 ? `${values.length}D${safeSides}` : `D${safeSides}`}</span><i />
        <small>{phase === 'rolling' ? 'física em movimento' : phase === 'loading' ? 'materializando dados' : phase === 'settled' && hasTotal ? `total ${Number(total)}${numericBonus ? ` (${diceTotal} ${numericBonus >= 0 ? '+' : '−'} ${Math.abs(numericBonus)})` : ''}` : phase === 'settled' ? 'repouso alcançado' : phase === 'fallback' ? 'modo de compatibilidade' : 'pronto para rolar'}</small>
      </div>
    </div>
  );
}
