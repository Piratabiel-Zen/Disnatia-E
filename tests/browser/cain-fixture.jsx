// A ficha de exorcista como o jogador vê, com uma ficha já preenchida.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import FichaCain from '../../src/features/cain/FichaCain';
import { fichaNova } from '../../src/features/cain/fichaCain.mjs';

const inicial = {
  ...fichaNova('veneza-1'),
  dono: 'a1',
  nome: 'Celestina Vauclair', xid: '7710942', cid: 'VNZ', categoria: 'III',
  agenda: 'A Testemunha', blasfemia: 'Sussurro',
  pericias: { forca: 1, atletismo: 2, coordenacao: 1, furtividade: 3, interface: 0,
    investigacao: 3, observacao: 2, autoridade: 1, negociacao: 2, conexao: 1 },
  psique: 2,
  estresse: 4, ferimentos: 1, pulsos: 2, pecado: 3, piedade: 2,
  condicoes: ['ferido'],
  ganchos: [
    { nome: 'Deve um favor ao Doge', cortes: 4 },
    { nome: 'O irmão ainda respira', cortes: 2 },
    { nome: '', cortes: 0 },
  ],
  aflicoes: 'Não consegue atravessar água parada sem contar até sete.',
  historia: 'Recolhida no Arsenale depois do incêndio de 1897. Manifestou a blasfêmia aos onze anos, quando a mãe parou de falar e ela continuou ouvindo.',
  vinculo: 'Nunca mentir para alguém que já esteja morrendo.',
  segredos: 'Sabe que o Pecado do canal tem o rosto do pai. Ainda não contou a ninguém.',
};

const membro = new URLSearchParams(location.search).get('papel') === 'mestre'
  ? { uid: 'm1', papel: 'mestre' }
  : new URLSearchParams(location.search).get('papel') === 'outro'
    ? { uid: 'b1', papel: 'jogador' }
    : { uid: 'a1', papel: 'jogador' };

function App() {
  const [ficha, setFicha] = useState(inicial);
  return (
    <div style={{ background: '#0A0908', minHeight: '100vh', padding: 26 }}>
      <FichaCain ficha={ficha} membro={membro} aoMudar={setFicha} />
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
