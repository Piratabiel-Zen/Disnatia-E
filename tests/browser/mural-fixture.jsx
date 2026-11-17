import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import MuralInvestigacao from '../../src/features/investigacao/MuralInvestigacao';
import { cartaoNovo, alternarPessoaNoCartao } from '../../src/features/investigacao/mural.mjs';
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

const fichas = [
  { id: 'f1', nome: 'Gabriel', dono: 'u1' },
  { id: 'f2', nome: 'Rafael', dono: 'u2' },
  { id: 'f3', nome: 'Henrique', dono: 'u3' },
  { id: 'f4', nome: 'João', dono: 'u4' },
];

let base = [
  { ...cartaoNovo({ id: 'c1', tipo: 'fotografia', titulo: 'O retrato na escrivaninha', x: .24, y: .3 }),
    imagem: '/media/mesas/terra-dourada.webp', texto: 'Tirada três dias antes.' },
  { ...cartaoNovo({ id: 'c2', tipo: 'pista', titulo: 'Bilhete queimado', texto: 'Só restou "…às onze".', x: .62, y: .26 }) },
  { ...cartaoNovo({ id: 'c3', tipo: 'suspeito', titulo: 'O guarda do campanário', x: .55, y: .68 }) },
];
base = alternarPessoaNoCartao(base, 'c2', 'u2');
base = alternarPessoaNoCartao(base, 'c2', 'u3');

function Palco() {
  const [cartoes, setCartoes] = useState(base);
  return (
    <div style={{height:'100vh',padding:16,boxSizing:'border-box'}}>
      <MuralInvestigacao
        cartoes={cartoes} ligacoes={[{chave:'c1::c2',de:'c1',para:'c2'}]}
        autor="u0" mestre fichas={fichas} podeEditar
        aoMudarCartoes={setCartoes} aoMudarLigacoes={() => {}}
      />
    </div>
  );
}
createRoot(document.getElementById('root')).render(<Palco />);
