// Monta só o globo, com uma textura conhecida e pins em pontos exatos do
// planeta, para checar geometria, rotação, clique e limpeza num navegador real.
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import GlobeView from '../../src/features/mapa-mundi/GlobeView';

// Textura 4x2: cada quadrante com uma cor, para enxergar a orientação.
const TEXTURE = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const colors = [['#2b6cb0', '#2f855a'], ['#b7791f', '#9b2c2c']];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      ctx.fillStyle = colors[row][col % 2];
      ctx.fillRect(col * 128, row * 128, 128, 128);
    }
  }
  return canvas.toDataURL('image/png');
})();

const PINS = [
  { id: 'centro', x: 50, y: 50, titulo: 'Centro', tipo: 'cidade', estado: 'descoberto' },
  { id: 'oeste', x: 0, y: 50, titulo: 'Oeste', tipo: 'reino', estado: 'descoberto' },
  { id: 'leste', x: 100, y: 50, titulo: 'Leste', tipo: 'perigo', estado: 'descoberto' },
  { id: 'segredo', x: 25, y: 30, titulo: 'Oculto', tipo: 'anomalia', estado: 'unknown' },
];

const TYPES = {
  cidade: { icon: '◆', color: '#9B7CFF' },
  reino: { icon: '▲', color: '#C4A7FF' },
  perigo: { icon: '✕', color: '#F87171' },
  anomalia: { icon: '✦', color: '#38BDF8' },
};

function Harness() {
  const [selected, setSelected] = useState(null);
  const [placed, setPlaced] = useState(null);
  const [mounted, setMounted] = useState(true);
  const [placing, setPlacing] = useState(false);
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#07050d' }}>
      <div style={{ position: 'absolute', inset: '48px 20px 20px' }}>
        {mounted ? (
          <GlobeView
            image={TEXTURE}
            pins={PINS}
            selectedPinId={selected}
            onSelectPin={setSelected}
            onPlacePin={point => setPlaced(point)}
            placing={placing}
            pinTypes={TYPES}
            canSeePin={pin => pin.estado !== 'unknown'}
          />
        ) : null}
      </div>
      <div style={{ position: 'absolute', top: 8, left: 12, display: 'flex', gap: 8, zIndex: 10 }}>
        <button id="unmount" onClick={() => setMounted(false)}>desmontar</button>
        <button id="toggle-placing" onClick={() => setPlacing(v => !v)}>marcar</button>
      </div>
      <output id="selected" style={{ position: 'absolute', top: 12, right: 220, color: '#fff' }}>{String(selected ?? '')}</output>
      <output id="placed" style={{ position: 'absolute', top: 12, right: 12, color: '#fff' }}>{placed ? `${placed.x.toFixed(2)},${placed.y.toFixed(2)}` : ''}</output>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><Harness /></StrictMode>);
