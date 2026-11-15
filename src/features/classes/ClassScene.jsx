// O cenário de cada linhagem. Escolher uma classe muda o lugar onde você
// está: fogo azul subindo do chão para os Assassinos, rochas escarlate
// suspensas para os Cavaleiros, penas caindo para os Corvos, e assim por
// diante. É uma camada só de atmosfera — fica atrás do conteúdo e nunca
// recebe clique.
import './cenarios.css';

// Quantas partículas cada cenário usa. Fogo e chuva de penas pedem volume;
// rochas pedem poucas e grandes.
// Contagem pensada para a tela grande; no celular o CSS corta em 12, que é o
// que já cabia bem lá.
const DENSITY = {
  fogo: 38, escarlate: 22, corvos: 30, magos: 44, marfim: 32,
  necromante: 38, bardo: 30, arcanjo: 28, personalizado: 28,
};

// Pseudoaleatório estável: o mesmo índice cai sempre no mesmo lugar, então o
// cenário não "pula" a cada render.
const seeded = (index, salt) => {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

function SceneLayer({ classId, color, count, front = false }) {
  return (
    <div
      className={`classe-scene scene-${classId}${front ? ' classe-scene-front' : ''}`}
      style={{ '--c': color }}
      aria-hidden="true"
    >
      <div className="classe-scene-glow" />
      {Array.from({ length: count }).map((_, index) => (
        <i
          key={index}
          style={{
            '--x': `${(seeded(index, front ? 11 : 1) * 100).toFixed(2)}%`,
            '--y': `${(seeded(index, front ? 12 : 2) * 100).toFixed(2)}%`,
            // As da frente são maiores e mais rápidas: é assim que o olho lê
            // "isto está perto de mim" e o cenário ganha profundidade.
            '--s': ((front ? 0.9 : 0.45) + seeded(index, 3) * (front ? 1.3 : 0.95)).toFixed(2),
            '--d': `${((front ? 3.4 : 5) + seeded(index, 4) * (front ? 5 : 9)).toFixed(2)}s`,
            '--dl': `${(-seeded(index, 5) * 14).toFixed(2)}s`,
            '--sw': `${((seeded(index, 6) - 0.5) * (front ? 240 : 160)).toFixed(0)}px`,
            '--r': `${((seeded(index, 7) - 0.5) * 80).toFixed(0)}deg`,
          }}
        />
      ))}
      <div className="classe-scene-flash" />
    </div>
  );
}

export default function ClassScene({ classId, color }) {
  const count = DENSITY[classId] || 20;
  return (
    <div key={classId}>
      <SceneLayer classId={classId} color={color} count={count} />
      <SceneLayer classId={classId} color={color} count={Math.round(count * 0.3)} front />
    </div>
  );
}
