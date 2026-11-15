// Exercita o gesto de arremesso isolado: segurar, puxar e lançar.
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useThrowGesture } from '../../src/experience/useThrowGesture';
import '../../src/experience/arremesso.css';

function Harness() {
  const [last, setLast] = useState(null);
  const [clicks, setClicks] = useState(0);
  const { holding, pull, handlers } = useThrowGesture(gesture => setLast(gesture));
  return (
    <div style={{ padding: 40, background: '#0B0718', minHeight: '100vh', fontFamily: 'Georgia,serif', color: '#C8B8A0' }}>
      <div style={{ width: 260 }}>
        <div
          className={'dice-throw-pad' + (holding ? ' is-holding' : '')}
          {...handlers}
          onClick={() => { if (!holding) setClicks(c => c + 1); }}
          role="button"
          tabIndex={0}
        >
          <span className="dice-throw-die" style={{ transform: `translate(${pull.x}px, ${pull.y}px)` }}>🎲</span>
          <b>Rolar D20</b>
          <small>Clique, ou segure e arremesse</small>
        </div>
      </div>
      <output id="gesto" style={{ display: 'block', marginTop: 20 }}>
        {last ? `${last.x.toFixed(3)},${last.y.toFixed(3)},${last.power.toFixed(3)}` : ''}
      </output>
      <output id="cliques" style={{ display: 'block' }}>{clicks}</output>
      <output id="puxada" style={{ display: 'block' }}>{`${pull.x.toFixed(1)},${pull.y.toFixed(1)}`}</output>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><Harness /></StrictMode>);
