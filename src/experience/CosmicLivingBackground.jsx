import { useEffect, useMemo, useRef } from 'react';
import './cosmic-living-background.css';
import './performance-lite.css';

const BRIGHT_STAR_COUNT = 16;
const SHOOTING_STAR_COUNT = 7;
const STAR_COLORS = ['#F7FBFF', '#A9DCFF', '#C7B8FF', '#E8F4FF'];

export default function CosmicLivingBackground({ variant = 'world' }) {
  const rootRef = useRef(null);
  const gate = variant === 'gate';

  const brightStars = useMemo(() => Array.from({ length: BRIGHT_STAR_COUNT }, (_, index) => ({
    id: index,
    left: `${4 + Math.random() * 92}%`,
    top: `${5 + Math.random() * 88}%`,
    duration: `${3.8 + Math.random() * 5.8}s`,
    delay: `${-(Math.random() * 8).toFixed(2)}s`,
    size: `${2 + Math.random() * 2.2}px`,
    color: STAR_COLORS[index % STAR_COLORS.length],
  })), []);

  const shootingStars = useMemo(() => Array.from({ length: SHOOTING_STAR_COUNT }, (_, index) => {
    const duration = 13 + Math.random() * 13;
    return {
      id: index,
      top: `${4 + Math.random() * 82}%`,
      duration: `${duration.toFixed(2)}s`,
      delay: `${-(Math.random() * duration).toFixed(2)}s`,
      travelY: `${(-8 + Math.random() * 22).toFixed(1)}vh`,
      angle: `${(-5 + Math.random() * 10).toFixed(1)}deg`,
      length: `${90 + Math.round(Math.random() * 85)}px`,
    };
  }), []);

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
      root.style.setProperty('--cosmic-px', `${(nextX * 5).toFixed(2)}px`);
      root.style.setProperty('--cosmic-py', `${(nextY * 4).toFixed(2)}px`);
      root.style.setProperty('--cosmic-vx', `${(nextX * -8).toFixed(2)}px`);
      root.style.setProperty('--cosmic-vy', `${(nextY * -6).toFixed(2)}px`);
      root.style.setProperty('--cosmic-sx', `${(nextX * 2.5).toFixed(2)}px`);
      root.style.setProperty('--cosmic-sy', `${(nextY * 2).toFixed(2)}px`);
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
    <div ref={rootRef} className={`cosmic-living-bg cosmic-lite-bg cosmic-dark-bg ${gate ? 'gate' : ''}`} aria-hidden="true">
      <div className="cosmic-dark-space" />
      <div className="cosmic-lite-nebula" />
      <div className="cosmic-lite-vortex" />
      <div className="cosmic-lite-stars cosmic-lite-stars-far" />
      <div className="cosmic-lite-stars cosmic-lite-stars-near" />
      <div className="cosmic-bright-stars">
        {brightStars.map(star => (
          <i
            key={star.id}
            className="cosmic-bright-star"
            style={{
              '--star-left': star.left,
              '--star-top': star.top,
              '--star-duration': star.duration,
              '--star-delay': star.delay,
              '--star-size': star.size,
              '--star-color': star.color,
            }}
          />
        ))}
      </div>
      <div className="cosmic-shooting-stars">
        {shootingStars.map(meteor => (
          <i
            key={meteor.id}
            className="cosmic-shooting-star"
            style={{
              '--meteor-top': meteor.top,
              '--meteor-duration': meteor.duration,
              '--meteor-delay': meteor.delay,
              '--meteor-y': meteor.travelY,
              '--meteor-angle': meteor.angle,
              '--meteor-length': meteor.length,
            }}
          />
        ))}
      </div>
      <div className="cosmic-living-vignette" />
      {!gate && <>
        <div className="cosmic-side-rail cosmic-side-rail-left"><i/><i/><i/></div>
        <div className="cosmic-side-rail cosmic-side-rail-right"><i/><i/><i/></div>
      </>}
    </div>
  );
}
