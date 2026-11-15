// A tela de entrada das mesas, isolada do banco.
import { createRoot } from 'react-dom/client';
import CampaignGate from '../../src/features/campanhas/CampaignGate';
createRoot(document.getElementById('root')).render(<CampaignGate onChoose={campaign => { document.title = 'entrou:' + campaign.id; }} />);
