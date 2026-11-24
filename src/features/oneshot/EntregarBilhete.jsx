import { useState } from 'react';
import { BILHETES_PRONTOS, TAMANHO_MAXIMO, resumoDaMesa } from './bilhete.mjs';
import './entregar-bilhete.css';

/**
 * O LADO DO MESTRE
 *
 * Escolher o primo, escolher o papel, entregar. Em três cliques, porque
 * isto acontece no meio de uma cena e tudo que demora mais que isso o
 * Mestre não usa.
 *
 * A contagem de quantos bilhetes cada um já recebeu fica à vista por um
 * motivo prático e não decorativo: depois de três cenas ninguém lembra
 * quem recebeu o quê, e entregar "A saída" para dois primos ao mesmo tempo
 * transforma a melhor carta da noite numa conversa entre eles.
 */
export default function EntregarBilhete({ sheets = [], bilhetes = [], aoEntregar }) {
  const [aberto, setAberto] = useState(false);
  const [para, setPara] = useState('');
  const [texto, setTexto] = useState('');
  const [enviado, setEnviado] = useState('');

  const mesa = resumoDaMesa(bilhetes, sheets);
  const podeEntregar = Boolean(para && texto.trim());

  const entregar = () => {
    if (!podeEntregar) return;
    aoEntregar?.(para, texto.trim());
    const quem = mesa.find(m => m.id === para);
    setEnviado(quem?.nome || 'entregue');
    setTexto('');
    setTimeout(() => setEnviado(''), 2600);
  };

  return (
    <div className="eb" data-aberto={aberto ? '' : undefined}>
      <button
        type="button" className="eb-puxador"
        onClick={() => setAberto(a => !a)}
        aria-expanded={aberto}
        title="Entregar um bilhete a um jogador só"
      >✉ Bilhete</button>

      {aberto && (
        <div className="eb-painel">
          <p className="eb-nota">
            Chega só para quem você escolher. Os outros não são avisados
            de que existe.
          </p>

          <div className="eb-quem">
            {mesa.map(m => (
              <button
                key={m.id} type="button"
                data-escolhido={para === m.id ? '' : undefined}
                onClick={() => setPara(m.id)}
              >
                {m.nome}
                {m.quantos > 0 && <i>{m.quantos}</i>}
              </button>
            ))}
            {mesa.length === 0 && <p className="eb-vazio">Nenhuma ficha na mesa.</p>}
          </div>

          <div className="eb-prontos">
            {BILHETES_PRONTOS.map(b => (
              <button key={b.id} type="button" onClick={() => setTexto(b.texto)}>
                {b.rotulo}
              </button>
            ))}
          </div>

          <textarea
            value={texto}
            maxLength={TAMANHO_MAXIMO}
            onChange={e => setTexto(e.target.value)}
            placeholder="Ou escreva o seu…"
            rows={4}
          />

          <button
            type="button" className="eb-enviar"
            disabled={!podeEntregar}
            onClick={entregar}
          >Lacrar e entregar</button>

          {enviado && <p className="eb-feito">Entregue a {enviado}.</p>}

          {/* O Mestre precisa saber o alcance disto antes de escrever algo
              que não pode vazar. Mesma honestidade do selo da ficha. */}
          <p className="eb-limite">
            O segredo é de tela: fica guardado na mesa e alguém com o
            console do navegador consegue ler.
          </p>
        </div>
      )}
    </div>
  );
}
