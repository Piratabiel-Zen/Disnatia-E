// OS CINCO, PARADOS E ANDANDO, NAS QUATRO DIREÇÕES.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/features/oneshot/token-sprite.css';
import { SPRITES, DIRECOES, recorteDoQuadro, spriteDe, quadroNoTempo } from '../../src/features/oneshot/sprites.mjs';

function Linha({ sp }) {
  const [t, setT] = useState(0);
  useEffect(() => { const i = setInterval(() => setT(x => x + 166), 166); return () => clearInterval(i); }, []);
  const q = quadroNoTempo(t, sp.quadros);
  return <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end', padding: '10px 14px' }}>
    <b style={{ width: 110, color: '#D8C5A4', font: '12px Georgia,serif' }}>{sp.nome}</b>
    {DIRECOES.map(d => {
      const r = recorteDoQuadro(spriteDe(sp.id), d, q);
      return <span key={d} style={{ position: 'relative', width: 84, height: 96 }}>
        <span className="tksp" style={{
          backgroundImage: `url(${sp.arquivo})`, backgroundSize: r.tamanho,
          backgroundPosition: `${r.x}% ${r.y}%`, height: 96,
          width: Math.round(96 * r.proporcao), aspectRatio: `${sp.largura} / ${sp.altura}`,
        }} />
      </span>;
    })}
  </div>;
}

createRoot(document.getElementById('root')).render(
  <div style={{ background: '#16120F', minHeight: '100vh', paddingTop: 8 }}>
    <div style={{ display: 'flex', gap: 18, padding: '0 14px', color: '#B08A53', font: '10px Georgia,serif', letterSpacing: '.2em' }}>
      <b style={{ width: 110 }} />{DIRECOES.map(d => <span key={d} style={{ width: 84 }}>{d.toUpperCase()}</span>)}
    </div>
    {SPRITES.map(sp => <Linha key={sp.id} sp={sp} />)}
  </div>,
);
