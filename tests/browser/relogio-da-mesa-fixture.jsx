/**
 * O RELÓGIO DA CAÇADA INDO DO MESTRE ATÉ O JOGADOR
 *
 * Os testes que existiam alimentavam a faixa com estado local: provavam
 * que ela DESENHA, nunca que ela CHEGA. E a reclamação da mesa é
 * justamente a chegada — "o timer não aparece para todos".
 *
 * Aqui o caminho é o de verdade: uma tela escreve `config/cacada` como o
 * mapa do Mestre escreve, e a outra lê pelo mesmo gancho que a sessão usa.
 * Duas telas, um documento, nada de atalho por propriedade.
 *
 * `?papel=mestre` abre o lado que solta a caçada; sem isso, o lado que
 * precisa ver.
 */
import { createRoot } from 'react-dom/client';
import AvisoDaCacada from '../../src/features/oneshot/AvisoDaCacada.jsx';
import { useCacadaDaMesa } from '../../src/features/oneshot/useCacadaDaMesa.js';
import { cacadaParaComecar } from '../../src/features/oneshot/cacada.mjs';
import { setDoc } from 'firebase/firestore';
import { docIn } from '../../src/core/campaign';
import '../../src/styles/global.css';

const params = new URLSearchParams(location.search);

function Mestre() {
  return (
    <div style={{ padding: 20, fontFamily: 'system-ui', color: '#D7CDBA' }}>
      <button
        id="soltar"
        onClick={() => setDoc(docIn('config', 'cacada'), cacadaParaComecar({
          oQue: 'O vulto', segundos: Number(params.get('segundos')) || 60, mapa: 'terreo',
        }))}
      >soltar a caçada</button>
      <button
        id="encerrar"
        onClick={() => setDoc(docIn('config', 'cacada'), { ativa: false }, { merge: true })}
      >encerrar</button>
    </div>
  );
}

/* O mesmo gancho da sessão, com o sinal de mesa de uma noite ligado. */
function Jogador() {
  const { cacada, desvio } = useCacadaDaMesa(true);
  return (
    <div style={{ padding: 20, fontFamily: 'system-ui', color: '#D7CDBA' }}>
      <AvisoDaCacada cacada={cacada} desvio={desvio} escondido={params.has('nomapa')} />
      <p id="estado">{cacada ? (cacada.ativa ? 'caçada ativa' : 'caçada encerrada') : 'sem documento'}</p>
    </div>
  );
}

createRoot(document.getElementById('root'))
  .render(params.get('papel') === 'mestre' ? <Mestre /> : <Jogador />);
