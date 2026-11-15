// Monta o widget de dados real para ver o dado flutuante e o arremesso.
import { createRoot } from 'react-dom/client';
import DiceWidget from '../../src/shell/DiceWidget';
createRoot(document.getElementById('root')).render(<DiceWidget access={{ role: 'master', name: 'Mestre', color: '#A855F7' }} />);
