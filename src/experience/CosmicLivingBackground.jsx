import { useEffect, useRef } from 'react';
import './cosmic-living-background.css';
import './performance-lite.css';

const BRIGHT_STARS = Array.from({ length: 10 }, (_, index) => index);
const SHOOTING_STARS = Array.from({ length: 5 }, (_, index) => index);

export default function CosmicLivingBackground({ variant = 'world' }) {
  const rootRef = useRef(null);
  const gate = variant === 'gate';

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === 'undefined') return undefined;

    const finePointer = window.matchMedia?.('(min-width: 901px) and (hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!finePointer?.matches || reducedMotion?.matches) return undefined;

    let frame = 0;
    let nextX = 0;
    let nextY = 0;

    const flush = () => {
      frame = 0;
      root.style.setProperty('--cosmic-px', `${(nextX * 8).toFixed(2)}px`);
      root.style.setProperty('--cosmic-py', `${(nextY * 6).toFixed(2)}px`);
      root.style.setProperty('--cosmic-vx', `${(nextX * -14).toFixed(2)}px`);
      root.style.setProperty('--cosmic-vy', `${(nextY * -9).toFixed(2)}px`);
      root.style.setProperty('--cosmic-sx', `${(nextX * 4).toFixed(2)}px`);
      root.style.setProperty('--cosmic-sy', `${(nextY * 3).toFixed(2)}px`);
    };

    const onPointerMove = event => {
      nextX = Math.max(-1, Math.min(1, (event.clientX / Math.max(1, window.innerWidth) - .5) * 2));
      nextY = Math.max(-1, Math.min(1, (event.clientY / Math.max(1, window.innerHeight) - .5) * 2));
      if (!frame) frame = window.requestAnimationFrame(flush);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={rootRef} className={`cosmic-living-bg cosmic-lite-bg ${gate ? 'gate' : ''}`} aria-hidden="true">
      <div className="cosmic-lite-nebula" />
      <div className="cosmic-lite-vortex" />
      <div className="cosmic-lite-stars cosmic-lite-stars-far" />
      <div className="cosmic-lite-stars cosmic-lite-stars-near" />
      <div className="cosmic-bright-stars">
        {BRIGHT_STARS.map(index => <i key={index} className={`cosmic-bright-star star-${index + 1}`} />)}
      </div>
      <div className="cosmic-shooting-stars">
        {SHOOTING_STARS.map(index => <i key={index} className={`cosmic-shooting-star meteor-${index + 1}`} />)}
      </div>
      {!gate && <div className="cosmic-lite-water" />}
      <div className="cosmic-living-vignette" />
      {!gate && <>
        <div className="cosmic-side-rail cosmic-side-rail-left"><i/><i/><i/></div>
        <div className="cosmic-side-rail cosmic-side-rail-right"><i/><i/><i/></div>
      </>}
    </div>
  );
}
