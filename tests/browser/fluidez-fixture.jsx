// A CENA COMPLETA, PARA MEDIR QUADROS
//
// Reúne o que de fato está na tela quando a mesa joga: o cenário com
// chuva, a atmosfera da casa com todas as camadas, a ambientação e um
// mapa por baixo. É isto que precisa correr liso no PC do Gabriel e no
// notebook do primo.
import { createRoot } from 'react-dom/client';
import { usePalco } from '../../src/adventure/usePalco';
import '../../src/experience/cenario-da-mesa.css';
import '../../src/features/oneshot/atmosfera-da-casa.css';
import '../../src/features/oneshot/camada-de-ambientacao.css';
import '../../src/features/oneshot/mortalha-casca.css';

// Todas as camadas de efeito que existem, de uma vez: é o pior caso, e o
// pior caso é o que trava.
const TODAS = ['atm-nevoa', 'atm-nevoa-alta', 'atm-sombras', 'atm-poeira', 'atm-chuva'];
const sem = new URLSearchParams(location.search).get('sem');
const FUNDO = sem ? TODAS.filter(c => c !== sem) : TODAS;
const LUZES = ['atm-lustre', 'atm-velas', 'atm-lareira', 'atm-lampiao',
  'atm-feixe', 'atm-luar', 'atm-caldeira'];

const so = new URLSearchParams(location.search).get('so');
const DENTRO_DA_ATM = ['fundo', 'luzes', 'escuro'];
/* Pedir `so=atm` tem de acender as partes de dentro também — senão a
   medição volta 16ms porque não há nada montado, e 16ms de tela vazia
   passa por conquista. */
const liga = nome => !so || so === nome
  || (nome === 'atm' && DENTRO_DA_ATM.includes(so))
  || (so === 'atm' && DENTRO_DA_ATM.includes(nome));

function Cena() {
  return <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#0A0807' }}>
    {liga('chuva') && <div className="cenario-mesa" style={{ '--cenario-veu': .55 }}>
      <span className="cenario-mesa-veu" />
      <span className="cenario-mesa-chuva">
        <i className="cenario-chuva-fundo" />
        <i className="cenario-chuva-meio" />
        <i className="cenario-chuva-frente" />
      </span>
    </div>}

    {liga('atm') && <div className="atm" data-mapa="porao" data-fase="fim" data-pulso="" data-respira=""
      style={{ '--atm-escuridao': .7, '--atm-nevoa': .2, '--atm-sombras': .5,
        '--atm-pulso': 1.4, '--atm-pressao': .5, '--atm-noite': .6,
        '--atm-brilho': 1, '--atm-tremor': .4 }}>
      {liga("escuro") && <i className="atm-escuridao" />}
      {liga('fundo') && FUNDO.map(c => <i key={c} className={c} />)}
      {liga('luzes') && <div className="atm-luzes">
        {LUZES.map(c => <i key={c} className={c} />)}
      </div>}
    </div>}

    {liga('amb') && <div className="amb">
      {Array.from({ length: 20 }, (_, i) => (
        <span key={i}
          className={`amb-peca amb-${['lampiao', 'vela', 'brasa', 'grama', 'fumaca'][i % 5]} amb-on`}
          style={{ left: `${(i * 17) % 95}%`, top: `${(i * 31) % 90}%`, '--amb-t': 1, '--amb-f': 1 }} />
      ))}
    </div>}
  </div>;
}

document.documentElement.dataset.temaMesa = 'mortalha';
// `?leve=1` mede o que o botão "Leve" entrega de verdade.
if (new URLSearchParams(location.search).get('leve')) {
  document.documentElement.dataset.quality = 'light';
}
/* Com `?palco=auto` a mesma cena pesada roda sob o regulador: é assim
   que tests/browser/palco.cjs prova que ele percebe a máquina sofrendo.
   Sem isso a bancada media uma tela vazia, que nunca engasga. */
const Regulada = ({ children }) => { usePalco('cinematic'); return children; };
const comRegulador = no =>
  new URLSearchParams(location.search).get('palco') === 'auto'
    ? <Regulada>{no}</Regulada> : no;

createRoot(document.getElementById('root')).render(comRegulador(<Cena />));
