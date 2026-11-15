// O cenário de cada linhagem. Escolher uma classe muda o lugar onde você
// está: fogo azul subindo do chão para os Assassinos, rochas escarlate
// suspensas para os Cavaleiros, penas caindo para os Corvos, e assim por
// diante. É uma camada só de atmosfera — fica atrás do conteúdo e nunca
// recebe clique.
import './cenarios.css';

// Quantas partículas cada cenário usa. Fogo e chuva de penas pedem volume;
// rochas pedem poucas e grandes.
const DENSITY = {
  fogo: 30, escarlate: 16, corvos: 24, magos: 34, marfim: 26,
  necromante: 30, bardo: 24, arcanjo: 22, personalizado: 22,
};

// Pseudoaleatório estável: o mesmo índice cai sempre no mesmo lugar, então o
// cenário não "pula" a cada render.
const seeded = (index, salt) => {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

export default function ClassScene({ classId, color }) {
  const count = DENSITY[classId] || 20;
  return (
    <div key={classId} className={`classe-scene scene-${classId}`} style={{ '--c': color }} aria-hidden="true">
      <div className="classe-scene-glow" />
      {Array.from({ length: count }).map((_, index) => (
        <i
          key={index}
          style={{
            '--x': `${(seeded(index, 1) * 100).toFixed(2)}%`,
            '--y': `${(seeded(index, 2) * 100).toFixed(2)}%`,
            '--s': (0.45 + seeded(index, 3) * 0.95).toFixed(2),
            '--d': `${(5 + seeded(index, 4) * 9).toFixed(2)}s`,
            '--dl': `${(-seeded(index, 5) * 14).toFixed(2)}s`,
            '--sw': `${((seeded(index, 6) - 0.5) * 160).toFixed(0)}px`,
            '--r': `${((seeded(index, 7) - 0.5) * 80).toFixed(0)}deg`,
          }}
        />
      ))}
      <div className="classe-scene-flash" />
    </div>
  );
}
