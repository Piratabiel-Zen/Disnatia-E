// A CAMADA DE AMBIENTAÇÃO, DESENHADA
//
// O que esta tela existe para medir é a regra que manda em tudo: a luz
// APAGADA continua ocupando lugar no mapa, e a coisa desligada some. É o
// que faz ligar o gerador significar alguma coisa.
import { createRoot } from 'react-dom/client';
import '../../src/features/oneshot/mortalha-casca.css';
import CamadaDeAmbientacao from '../../src/features/oneshot/CamadaDeAmbientacao.jsx';
import PainelDeAmbientacao from '../../src/features/oneshot/PainelDeAmbientacao.jsx';

const PECAS = [
  { id: 'luz-on', tipo: 'lampada', mapa: 'porao', x: 20, y: 30, tamanho: 1, forca: 1, ligada: true },
  { id: 'luz-off', tipo: 'lampada', mapa: 'porao', x: 50, y: 30, tamanho: 1, forca: 1, ligada: false },
  { id: 'coisa-on', tipo: 'grama', mapa: 'porao', x: 20, y: 70, tamanho: 1, forca: 1, ligada: true },
  { id: 'coisa-off', tipo: 'grama', mapa: 'porao', x: 50, y: 70, tamanho: 1, forca: 1, ligada: false },
  { id: 'grande', tipo: 'lampiao', mapa: 'porao', x: 80, y: 30, tamanho: 2.5, forca: 1.6, ligada: true },
  { id: 'pequena', tipo: 'vela', mapa: 'porao', x: 80, y: 70, tamanho: 0.5, forca: 0.5, ligada: true },
  { id: 'outro-mapa', tipo: 'pedra', mapa: 'sotao', x: 10, y: 10, tamanho: 1, forca: 1, ligada: true },
];

function Demo() {
  return <div style={{ position: 'relative', width: '100%', height: '560px', background: '#14100E' }}>
    <CamadaDeAmbientacao pecas={PECAS} mapaId="porao"
      ajuste={{ brilho: 1, contraste: 1, saturacao: 1 }}
      selecionada="grande" editando />
    <PainelDeAmbientacao pecas={PECAS} mapaId="porao" ajuste={{}}
      escolhido="" selecionada="luz-off"
      aoEscolherTipo={() => {}} aoMudarPeca={() => {}} aoApagarPeca={() => {}}
      aoMudarAjuste={() => {}} aoFechar={() => {}} />
  </div>;
}

document.documentElement.dataset.temaMesa = 'mortalha';
createRoot(document.getElementById('root')).render(<Demo />);
