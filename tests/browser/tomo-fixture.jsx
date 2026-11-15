// O tomo 3D isolado, em tamanho grande, para conferir as seis faces.
import { createRoot } from 'react-dom/client';
import BookMark3D from '../../src/experience/BookMark3D';
createRoot(document.getElementById('root')).render(
  <div style={{ display: 'flex', gap: 60, alignItems: 'center', padding: 60, background: '#07050f' }}>
    <div style={{ '--tomo-larg': '120px', '--tomo-alt': '168px', '--tomo-lomb': '44px' }}><BookMark3D /></div>
    <div style={{ '--tomo-larg': '60px', '--tomo-alt': '84px', '--tomo-lomb': '22px' }}><BookMark3D /></div>
    <BookMark3D />
  </div>
);
