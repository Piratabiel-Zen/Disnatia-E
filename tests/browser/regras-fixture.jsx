// O manual de regras isolado, com os estilos globais do site.
import { createRoot } from 'react-dom/client';
import '../../src/styles/global.css';
import '../../src/experience/experience.css';
import RulesSection from '../../src/features/regras/RegrasPage';
const q = new URLSearchParams(location.search);
createRoot(document.getElementById('root')).render(
  <div style={{ background: '#07050f', minHeight: '100vh', color: '#C8B8A0', fontFamily: "'Crimson Text',Georgia,serif" }}>
    <RulesSection />
  </div>
);
