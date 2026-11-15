import './cosmico-profundo.css';

// Anel de partículas orbitando o que está selecionado: token no mapa, classe,
// ficha, artefato. É sempre uma camada irmã, posicionada por cima — nunca um
// transform no elemento escolhido, porque tokens já usam transform para girar,
// espelhar e respirar, e dois donos no mesmo transform brigariam.
const DOTS = [
  { duration: '4.6s', delay: '0s' },
  { duration: '4.6s', delay: '-1.15s' },
  { duration: '4.6s', delay: '-2.3s' },
  { duration: '4.6s', delay: '-3.45s' },
  // Duas partículas fora de compasso quebram a simetria de relógio.
  { duration: '6.9s', delay: '-2s' },
  { duration: '6.9s', delay: '-5.4s' },
];

export default function CosmicSelectionRing({
  color = '#C7B8FF',
  radius = '54%',
  dotSize = 4,
  count = DOTS.length,
  className = '',
}) {
  const dots = DOTS.slice(0, Math.max(1, Math.min(DOTS.length, count)));
  return (
    <span
      className={`cosmum-orbit ${className}`.trim()}
      aria-hidden="true"
      style={{ '--orbit-color': color, '--orbit-radius': radius, '--orbit-dot': `${dotSize}px` }}
    >
      {dots.map((dot, index) => (
        <i key={index} style={{ '--orbit-duration': dot.duration, '--orbit-delay': dot.delay }} />
      ))}
    </span>
  );
}
