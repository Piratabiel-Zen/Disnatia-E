import { useEffect, useRef } from 'react';

// Paralaxe do fundo cósmico. O ponteiro e a rolagem só escrevem variáveis CSS;
// quem move as camadas é o compositor, então a mesa não perde quadros mesmo
// com o mapa de combate aberto.
//
// O efeito é gesto de mouse, não de dedo: em telas de toque ele não liga, o que
// também mantém o celular leve. Quem pediu menos movimento no sistema nunca
// recebe paralaxe.
export const PARALLAX_REACH = 18;

export function cosmicParallaxAllowed(win = typeof window === 'undefined' ? null : window) {
  if (!win || typeof win.matchMedia !== 'function') return false;
  const asks = query => {
    try { return Boolean(win.matchMedia(query).matches); } catch { return false; }
  };
  if (asks('(prefers-reduced-motion: reduce)')) return false;
  if (!asks('(hover: hover)') || !asks('(pointer: fine)')) return false;
  return asks('(min-width: 1024px)');
}

export function parallaxOffsets(clientX, clientY, width, height, reach = PARALLAX_REACH) {
  const safeWidth = Number(width) > 0 ? Number(width) : 1;
  const safeHeight = Number(height) > 0 ? Number(height) : 1;
  // -1..1 a partir do centro da tela, para as camadas se afastarem do cursor.
  const x = (Number(clientX) / safeWidth) * 2 - 1;
  const y = (Number(clientY) / safeHeight) * 2 - 1;
  const clamp = value => Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));
  return { x: clamp(x) * reach, y: clamp(y) * reach };
}

export default function useCosmicParallax(enabled) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !enabled || !cosmicParallaxAllowed()) return undefined;

    let frame = 0;
    const target = { x: 0, y: 0, scroll: 0 };
    const shown = { x: 0, y: 0, scroll: 0 };

    const paint = () => {
      frame = 0;
      // Perseguição suave: o fundo chega ao destino com inércia, como massa
      // distante, em vez de colar no cursor.
      shown.x += (target.x - shown.x) * 0.08;
      shown.y += (target.y - shown.y) * 0.08;
      shown.scroll += (target.scroll - shown.scroll) * 0.12;
      host.style.setProperty('--cosmic-px', `${shown.x.toFixed(2)}px`);
      host.style.setProperty('--cosmic-py', `${shown.y.toFixed(2)}px`);
      host.style.setProperty('--cosmic-scroll', shown.scroll.toFixed(4));
      const settled = Math.abs(target.x - shown.x) < 0.05
        && Math.abs(target.y - shown.y) < 0.05
        && Math.abs(target.scroll - shown.scroll) < 0.0008;
      if (!settled) frame = requestAnimationFrame(paint);
    };

    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };

    const onPointerMove = event => {
      const next = parallaxOffsets(event.clientX, event.clientY, window.innerWidth, window.innerHeight);
      target.x = -next.x;
      target.y = -next.y;
      schedule();
    };

    const onScroll = () => {
      const reach = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      target.scroll = Math.min(1, Math.max(0, window.scrollY / reach));
      schedule();
    };

    const onLeave = () => { target.x = 0; target.y = 0; schedule(); };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    onScroll();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('pointerleave', onLeave);
      host.style.removeProperty('--cosmic-px');
      host.style.removeProperty('--cosmic-py');
      host.style.removeProperty('--cosmic-scroll');
    };
  }, [enabled]);

  return hostRef;
}
