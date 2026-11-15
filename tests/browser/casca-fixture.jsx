// A casca real do app (shell > immersive-content > page-stage) em volta da
// página de classes, com a mesma ordem de CSS do App. Sem Firebase: serve
// para ver o que a cascata faz com o cenário das linhagens no desktop.
import { createRoot } from 'react-dom/client';
import '../../src/styles/global.css';
import '../../src/styles/livro.css';
import '../../src/experience/experience.css';
import '../../src/experience/access.css';
import '../../src/experience/realtime.css';
import '../../src/experience/golpes.css';
import '../../src/experience/cosmic-living-background.css';
import '../../src/experience/site-polish.css';
import '../../src/adventure/adventure.css';
import '../../src/experience/mobile-player-polish.css';
import '../../src/experience/mobile-menos-e-mais.css';
import '../../src/experience/interface-clearance.css';
import CosmicLivingBackground from '../../src/experience/CosmicLivingBackground';
import ClassesPage from '../../src/features/classes/ClassesPage';

document.documentElement.dataset.quality = new URLSearchParams(location.search).get('q') || 'cinematic';

createRoot(document.getElementById('root')).render(
  <div className="adventure-shell access-player" style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column' }}>
    <CosmicLivingBackground quality={document.documentElement.dataset.quality} />
    <div className="immersive-topbar" style={{ height: 52, flexShrink: 0 }} />
    <div className="immersive-content">
      <div className="page-stage page-stage-classes" style={{ animation: 'pageTurn 0.12s cubic-bezier(0.2,0.8,0.2,1)' }}>
        <ClassesPage />
      </div>
    </div>
  </div>
);
