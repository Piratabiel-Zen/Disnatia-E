// As três abas de referência do CAIN, uma embaixo da outra.
import { createRoot } from 'react-dom/client';
import ManualCainPage from '../../src/features/cain/ManualCainPage';
import BlasfemiasPage from '../../src/features/cain/BlasfemiasPage';
import TiposDePecadoPage from '../../src/features/cain/TiposDePecadoPage';

const qual = new URLSearchParams(location.search).get('aba') || 'manual';
const Pagina = qual === 'agendas' ? BlasfemiasPage : qual === 'pecados' ? TiposDePecadoPage : ManualCainPage;

createRoot(document.getElementById('root')).render(<Pagina />);
