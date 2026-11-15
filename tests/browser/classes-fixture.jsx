// A página de classes isolada, para conferir o cenário de cada linhagem.
import { createRoot } from 'react-dom/client';
import '../../src/styles/global.css';
import ClassesPage from '../../src/features/classes/ClassesPage';
createRoot(document.getElementById('root')).render(<div style={{ color: '#C8B8A0', fontFamily: "'Crimson Text',Georgia,serif", minHeight: '100vh' }}><ClassesPage /></div>);
