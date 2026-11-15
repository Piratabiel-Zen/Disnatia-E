// O Livro da Mandíbula isolado, para conferir a virada de página e os artefatos.
import { createRoot } from 'react-dom/client';
import '../../src/styles/global.css';
import '../../src/styles/livro.css';
import LivroPage from '../../src/features/livro/LivroPage';
createRoot(document.getElementById('root')).render(<div style={{ color: '#C8B8A0', fontFamily: "'Crimson Text',Georgia,serif" }}><LivroPage masterMode /></div>);
