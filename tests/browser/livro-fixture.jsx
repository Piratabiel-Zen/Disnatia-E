import { createRoot } from 'react-dom/client';
import RegrasOneShotPage from '../../src/features/oneshot/RegrasOneShotPage.jsx';
document.documentElement.dataset.temaMesa='mortalha';
createRoot(document.getElementById('root')).render(
  <div style={{background:'#12100D',minHeight:'100vh',padding:16}}><RegrasOneShotPage/></div>);
