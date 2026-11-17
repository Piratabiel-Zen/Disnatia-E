import { createRoot } from 'react-dom/client';
import '../../src/features/pecados/pecados.css';
import { CAMPAIGN_THEMES } from '../../src/core/temas.mjs';

const t = CAMPAIGN_THEMES.veneziano;
const r = document.documentElement;
for (const [k, v] of Object.entries({
  '--accent': t.accent, '--accent-soft': t.accentSoft,
  '--contraste-mesa': t.contraste, '--contraste-claro-mesa': t.contrasteSoft,
  '--superficie-mesa': t.superficie, '--linha-mesa': t.linha,
  '--fundo-mesa': t.bg, '--ink-mesa': t.ink,
})) r.style.setProperty(k, v);
document.body.style.background = t.bg;

createRoot(document.getElementById('root')).render(
  <div style={{maxWidth:900,margin:'0 auto',padding:28,color:t.ink,
               fontFamily:'Crimson Text,Georgia,serif',fontSize:15,lineHeight:1.7}}>
    <h2 style={{fontFamily:'Cinzel,serif',color:t.accentSoft,letterSpacing:'.1em'}}>O LORDE DE TERRA DOURADA</h2>
    <figure className="pecados-criatura editavel">
      <img src="/media/mesas/terra-dourada.webp" alt="" />
      <div className="pecados-criatura-acoes">
        <button type="button">Trocar imagem</button>
        <button type="button">Remover</button>
      </div>
    </figure>
    <p>Forma II · Categoria IV. Manifestou-se depois do alagamento da praça,
       e desde então o reino cresce um quarteirão por noite.</p>
    <p>O hospedeiro era o guarda do campanário. Ninguém o vê desde março, mas
       as luzes continuam acesas todas as noites no mesmo horário.</p>
    <figure className="pecados-criatura editavel">
      <div className="pecados-criatura-acoes">
        <button type="button">Anexar imagem</button>
      </div>
      <span>Sem retrato da criatura</span>
    </figure>
  </div>
);
