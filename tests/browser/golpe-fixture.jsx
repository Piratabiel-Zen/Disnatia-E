// Mostra a cinemática do golpe isolada, para conferir o véu e a legibilidade.
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/experience/experience.css';
import '../../src/experience/realtime.css';
import '../../src/experience/golpes.css';

const RETRATO = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#3b2a5a'; x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#c8a2ff'; x.beginPath(); x.arc(64, 52, 26, 0, 7); x.fill();
  x.fillRect(30, 84, 68, 44);
  return c.toDataURL('image/png');
})();

function Golpe({ kind, nome, habilidade, cost }) {
  return (
    <div className={`combat-action-pulse compact action-${kind}`} data-ability-type={kind} style={{ '--action-color': '#A855F7' }}>
      <div className="combat-action-backdrop" aria-hidden="true" />
      <div className="combat-action-wave wave-a" /><div className="combat-action-wave wave-b" />
      <div className="combat-action-pulse-core">
        <div className="combat-action-actor">
          <span className="combat-action-portrait"><img src={RETRATO} alt="" /></span>
          <small>{nome}</small>
        </div>
        <span className="combat-action-tier">{{ normal: 'Habilidade', especial: 'Especial', combinada: 'Combinada', passiva: 'Passiva' }[kind]}</span>
        <strong>{habilidade}</strong>
        {cost > 0 && <span className="combat-action-cost">{cost} VC</span>}
      </div>
    </div>
  );
}

function Harness() {
  const [kind, setKind] = useState('especial');
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0B0718', color: '#C8B8A0', fontFamily: 'Georgia,serif' }}>
      {/* conteúdo de fundo, para ver o quanto o véu realmente esconde */}
      <div style={{ padding: 40, display: 'grid', gap: 14 }}>
        <h1 style={{ fontSize: 34, color: '#E8D8C0' }}>Mapa de batalha</h1>
        {Array.from({ length: 8 }).map((_, i) => (
          <p key={i} style={{ fontSize: 17, color: '#9A8A7A', margin: 0 }}>
            Linha de texto do cenário número {i + 1}, para medir o escurecimento do fundo.
          </p>
        ))}
      </div>
      <div style={{ position: 'fixed', top: 8, left: 8, zIndex: 99999, display: 'flex', gap: 6 }}>
        {['passiva', 'normal', 'especial', 'combinada'].map(k => (
          <button key={k} id={`k-${k}`} onClick={() => setKind(k)}>{k}</button>
        ))}
      </div>
      <Golpe key={kind} kind={kind} nome="Ignácio" habilidade="Corte do Silêncio" cost={3} />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><Harness /></StrictMode>);
