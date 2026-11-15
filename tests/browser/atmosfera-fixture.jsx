// Os dois mapas com a atmosfera por cima, do mesmo jeito que o tabuleiro
// monta: arte, camadas, e os tokens viriam depois.
import { createRoot } from 'react-dom/client';
import MapAtmosphere from '../../src/features/mapa-batalha/MapAtmosphere';
import { MAPAS_PRONTOS } from '../../src/features/mapa-batalha/mapasProntos.mjs';

const qual = new URLSearchParams(location.search).get('q');
if (qual) document.documentElement.dataset.quality = qual;
const so = new URLSearchParams(location.search).get('mapa');
const lista = so ? MAPAS_PRONTOS.filter(m => m.id === so) : MAPAS_PRONTOS;

createRoot(document.getElementById('root')).render(
  <div style={{ display: 'grid', gap: 18, padding: 18, background: '#05030c' }}>
    {lista.map(mapa => (
      <div key={mapa.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #2a2240' }}>
        <img src={mapa.img} alt="" style={{ width: '100%', height: '100%', display: 'block' }} />
        <MapAtmosphere atmosfera={mapa.atmosfera} img={mapa.img} />
      </div>
    ))}
  </div>
);
