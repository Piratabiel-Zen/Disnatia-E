// Segurar e arremessar o dado com o mouse ou com o dedo.
//
// O gesto decide só o voo: para onde o dado vai e com que força. O resultado
// continua sendo o que o sistema sorteou, senão cada jogador veria um número
// diferente do mesmo lançamento.
import { useCallback, useRef, useState } from 'react';

const MIN_SWIPE = 14;      // abaixo disso foi um toque, não um arremesso
const MAX_SAMPLES = 6;     // só o fim do movimento conta para a velocidade
const MIN_POWER = 0.45;
const MAX_POWER = 2.2;

/**
 * Devolve os manipuladores para a área do dado e o estado do gesto.
 * `onThrow({ x, y, power })` recebe a direção normalizada (-1 a 1) e a força.
 */
export function useThrowGesture(onThrow, { disabled = false } = {}) {
  const [holding, setHolding] = useState(false);
  const [pull, setPull] = useState({ x: 0, y: 0 });
  const stateRef = useRef(null);

  const finish = useCallback(event => {
    const state = stateRef.current;
    stateRef.current = null;
    setHolding(false);
    setPull({ x: 0, y: 0 });
    if (!state) return;
    try { event?.currentTarget?.releasePointerCapture?.(state.pointerId); } catch (_) {}

    const samples = state.samples;
    const last = samples[samples.length - 1];
    const first = samples[0];
    if (!last || !first) return;

    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const distance = Math.hypot(dx, dy);
    if (distance < MIN_SWIPE) return; // foi um toque; quem chama decide o que fazer

    const elapsed = Math.max(16, last.t - first.t);
    const speed = distance / elapsed; // pixels por milissegundo
    const power = Math.max(MIN_POWER, Math.min(MAX_POWER, speed * 1.6 + 0.5));

    // A direção vai normalizada pelo tamanho da área, para o mesmo gesto
    // valer o mesmo num celular e num monitor grande.
    const bounds = state.bounds;
    onThrow?.({
      x: Math.max(-1, Math.min(1, dx / Math.max(60, bounds.width / 2))),
      // A tela cresce para baixo e a mesa da física cresce para cima.
      y: Math.max(-1, Math.min(1, -dy / Math.max(60, bounds.height / 2))),
      power,
      distance,
    });
  }, [onThrow]);

  const onPointerDown = useCallback(event => {
    if (disabled || event.button === 2) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    stateRef.current = {
      pointerId: event.pointerId,
      bounds,
      samples: [{ x: event.clientX, y: event.clientY, t: event.timeStamp || performance.now() }],
    };
    setHolding(true);
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch (_) {}
  }, [disabled]);

  const onPointerMove = useCallback(event => {
    const state = stateRef.current;
    if (!state) return;
    state.samples.push({ x: event.clientX, y: event.clientY, t: event.timeStamp || performance.now() });
    if (state.samples.length > MAX_SAMPLES) state.samples.shift();
    const origin = state.samples[0];
    // O dado acompanha o arraste, como quem arma o lance.
    setPull({
      x: Math.max(-26, Math.min(26, (event.clientX - origin.x) * 0.26)),
      y: Math.max(-26, Math.min(26, (event.clientY - origin.y) * 0.26)),
    });
  }, []);

  return {
    holding,
    pull,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
  };
}

export default useThrowGesture;
