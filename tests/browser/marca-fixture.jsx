import { createRoot } from 'react-dom/client';
import CrossMark3D from '../../src/experience/CrossMark3D';
import BookMark3D from '../../src/experience/BookMark3D';
import '../../src/experience/experience.css';

/* As duas marcas lado a lado, no tamanho real da faixa de navegação e num
   tamanho grande para conferir a montagem das faces. */
function Palco() {
  return (
    <div style={{ display: 'grid', gap: 40, padding: 40, color: '#CEC4B4', fontFamily: 'Cinzel,serif' }}>
      <div style={{ display: 'flex', gap: 30, alignItems: 'center' }}>
        <button className="grim-brand has-tomo" data-teste="cruz-pequena">
          <CrossMark3D title="Estrela de Absinto" /><b>Estrela de Absinto</b>
        </button>
        <button className="grim-brand has-tomo" data-teste="tomo-pequeno">
          <BookMark3D sigil="✦" title="Dinastia E" /><b>Dinastia E</b>
        </button>
      </div>
      <div style={{ display: 'flex', gap: 60, alignItems: 'center', '--tomo-larg': '120px', '--tomo-alt': '170px', '--tomo-lomb': '30px' }}>
        <span data-teste="cruz-grande"><CrossMark3D title="grande" /></span>
        <span data-teste="tomo-grande"><BookMark3D sigil="✦" title="grande" /></span>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Palco />);
