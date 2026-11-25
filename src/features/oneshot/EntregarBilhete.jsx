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
export default function EntregarBilhete({
  sheets = [], bilhetes = [], aoEntregar, aoReescrever, aoApagar,
}) {
  const [aberto, setAberto] = useState(false);
  const [para, setPara] = useState('');
  const [texto, setTexto] = useState('');
  const [enviado, setEnviado] = useState('');
  // Qual bilhete já entregue está sendo reescrito, se algum.
  const [editando, setEditando] = useState(null);

  const mesa = resumoDaMesa(bilhetes, sheets);
  const nomePorFicha = new Map(sheets.map(f => [String(f.id), f.nome || 'sem nome']));
  const entregues = [...bilhetes]
    .filter(b => b?.id && String(b.texto || '').trim())
    .sort((a, b) => (Number(b?.em) || 0) - (Number(a?.em) || 0));
  const podeEntregar = Boolean(para && texto.trim());

  const entregar = () => {
    if (!podeEntregar) return;
    /* REESCREVER EM VEZ DE ENTREGAR DE NOVO.
       Bilhete errado acontece — o Mestre clica no primo de cima da lista,
       ou troca "A saída" por "O chamado". Entregar a correção como um
       segundo papel deixaria o errado na mão do jogador, que é justamente
       o que não pode ficar. */
    if (editando) {
      aoReescrever?.(editando.id, texto.trim());
      setEditando(null);
      setTexto('');
      setEnviado('reescrito');
      setTimeout(() => setEnviado(''), 2600);
      return;
    }
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
          >{editando ? 'Reescrever o bilhete' : 'Lacrar e entregar'}</button>
          {editando && (
            <button
              type="button" className="eb-cancelar"
              onClick={() => { setEditando(null); setTexto(''); }}
            >Deixar como está</button>
          )}

          {enviado && (
            <p className="eb-feito">
              {enviado === 'reescrito' ? 'Reescrito.' : `Entregue a ${enviado}.`}
            </p>
          )}

          {/* OS QUE JÁ FORAM. Sem esta lista, um bilhete entregue por
              engano ficava na mão do jogador para sempre: não havia por
              onde alcançá-lo. */}
          {entregues.length > 0 && (
            <div className="eb-entregues">
              <span>Já entregues</span>
              <ul>
                {entregues.map(b => (
                  <li key={b.id} data-aberto={b.aberto ? '' : undefined}>
                    <div className="eb-entregue-quem">
                      <b>{nomePorFicha.get(String(b.para)) || 'alguém'}</b>
                      <em>{b.aberto ? 'já leu' : 'ainda fechado'}</em>
                    </div>
                    <p>{String(b.texto).slice(0, 90)}{String(b.texto).length > 90 ? '…' : ''}</p>
                    <div className="eb-entregue-acoes">
                      <button
                        type="button"
                        onClick={() => { setEditando(b); setTexto(b.texto); setPara(String(b.para)); }}
                      >Reescrever</button>
                      <button
                        type="button" className="eb-apagar"
                        onClick={() => {
                          if (editando?.id === b.id) { setEditando(null); setTexto(''); }
                          aoApagar?.(b.id);
                        }}
                      >Apagar</button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="eb-nota-aberto">
                Reescrever um bilhete que o primo já abriu troca o texto na
                tela dele sem avisar. Apagar o faz sumir.
              </p>
            </div>
          )}

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
