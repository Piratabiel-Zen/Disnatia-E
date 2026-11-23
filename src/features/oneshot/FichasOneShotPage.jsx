import { useCallback, useEffect, useState } from 'react';
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { deleteDoc, setDoc } from 'firebase/firestore';
import { col, docIn } from '../../core/campaign';
import { ehMestre, podeAbrirFicha } from '../../core/acesso.mjs';
import { useMembro } from '../acesso/useMembro';
import { verComoJogador } from '../acesso/previaDeJogador.mjs';
import FichaOneShot from './FichaOneShot.jsx';
import SeloDeAcessoRestrito from '../cain/SeloDeAcessoRestrito.jsx';
import { fichaNova, pvMaximoDaFicha } from './fichaOneShot.mjs';
import './paginas-one-shot.css';
import './fichas-one-shot.css';

const TETO_DE_FICHAS = 8;

/**
 * AS FICHAS DA NOITE
 *
 * Mesma regra de acesso do CAIN, porque é a que a mesa já conhece: o Mestre
 * cria e entrega, a pessoa abre e edita só a dela, e tocar na ficha de outro
 * devolve o selo de acesso restrito.
 *
 * O que muda é o ritmo. Numa one-shot a ficha é feita na hora, com a mesa
 * esperando, então o Mestre cria as quatro ou cinco de uma vez e entrega
 * enquanto as pessoas escolhem nome e ocupação. Oito é teto de sobra para
 * uma noite — mais que isso não é uma mesa, é uma plateia.
 */
export default function FichasOneShotPage({ playerSheetId = '' }) {
  const { membro, membroReal, previa, carregando, campanha } = useMembro();
  const [fichas, setFichas] = useState([]);
  const [abertaId, setAbertaId] = useState(null);
  const [recusada, setRecusada] = useState(null);
  const [tremendo, setTremendo] = useState(false);

  useEffect(() => onSnapshot(col('fichas_oneshot'), snap => {
    setFichas(snap.docs.map(d => ({ ...d.data(), id: d.id })));
  }, () => {}), [campanha?.id]);

  const mestre = ehMestre(membro);

  const salvar = useCallback(async ficha => {
    const { id, ...dados } = ficha;
    setFichas(atuais => atuais.map(f => (String(f.id) === String(id) ? ficha : f)));
    await setDoc(docIn('fichas_oneshot', String(id)), dados, { merge: true });
  }, []);

  const criar = async () => {
    if (fichas.length >= TETO_DE_FICHAS) return;
    const id = `f${Date.now().toString(36)}`;
    await setDoc(docIn('fichas_oneshot', id), fichaNova(''));
    setAbertaId(id);
  };

  const entregar = async (ficha, uid) => salvar({ ...ficha, dono: uid });
  const remover = async id => {
    if (!confirm('Apagar esta ficha? Não dá para desfazer.')) return;
    if (String(abertaId) === String(id)) setAbertaId(null);
    await deleteDoc(docIn('fichas_oneshot', String(id)));
  };

  const tocarNaFicha = useCallback(ficha => {
    const chave = String(ficha.id);
    if (!podeAbrirFicha(ficha, membro, playerSheetId)) {
      setRecusada(ficha);
      setTremendo(true);
      setTimeout(() => setTremendo(false), 460);
      return;
    }
    setAbertaId(atual => (atual === chave ? null : chave));
  }, [membro, playerSheetId]);

  if (carregando) return <div className="osl-vazio">Abrindo a noite…</div>;
  if (!membro) return <div className="osl-vazio">Entre na campanha para ver as fichas.</div>;

  const aberta = fichas.find(f => String(f.id) === abertaId) || null;
  const podeEditar = aberta ? (mestre || String(aberta.dono || '') === String(membro.uid)) : false;

  return (
    <div className={`osl${tremendo ? ' osl-tremendo' : ''}`}>
      <header className="osl-barra">
        <div>
          <h2>Fichas</h2>
          <p>{mestre
            ? 'Crie as fichas da noite e entregue a quem for jogar.'
            : 'Você abre e edita a ficha entregue a você. As outras estão seladas.'}</p>
        </div>
        {mestre && fichas.length < TETO_DE_FICHAS && (
          <button type="button" className="osl-novo" onClick={criar}>＋ Nova ficha</button>
        )}
      </header>

      {recusada && (
        <SeloDeAcessoRestrito nome={recusada.nome || ''} aoFechar={() => setRecusada(null)} />
      )}

      <ul className="osl-fileira">
        {fichas.map(f => {
          const abre = podeAbrirFicha(f, membro, playerSheetId);
          const pvMax = pvMaximoDaFicha(f);
          return (
            <li key={f.id}>
              <button
                type="button" className="osl-cartao"
                data-selada={abre ? 'nao' : 'sim'}
                data-aberta={String(f.id) === abertaId ? 'sim' : 'nao'}
                onClick={() => tocarNaFicha(f)}
              >
                <b>{f.nome || 'Sem nome'}</b>
                <em>{f.ocupacao || 'sem ocupação'}</em>
                <span className="osl-pv">{Number(f.pv ?? pvMax)}/{pvMax}</span>
                {!f.dono && mestre && <span className="osl-pendente">não entregue</span>}
              </button>
              {ehMestre(membroReal) && !previa && (
                <div className="osl-acoes">
                  <button type="button" onClick={() => verComoJogador(f)}>ver como</button>
                  <button type="button" className="perigo" onClick={() => remover(f.id)}>apagar</button>
                </div>
              )}
            </li>
          );
        })}
        {fichas.length === 0 && (
          <li className="osl-vazio">
            {mestre ? 'Nenhuma ficha ainda. Crie a primeira acima.' : 'O Mestre ainda não entregou nenhuma ficha.'}
          </li>
        )}
      </ul>

      {aberta && (
        <section className="osl-aberta">
          {mestre && (
            <label className="osl-entrega">
              <span>Entregue a</span>
              <select
                value={aberta.dono || ''}
                onChange={e => entregar(aberta, e.target.value)}
              >
                <option value="">Ninguém ainda</option>
                {(campanha?.membros || []).map(m => (
                  <option key={m.uid} value={m.uid}>{m.nome || m.uid}</option>
                ))}
              </select>
              <em>Quem recebe passa a ser o único, além de você, que abre esta ficha.</em>
            </label>
          )}
          <FichaOneShot
            ficha={aberta} aoMudar={ficha => salvar({ ...ficha, id: aberta.id })}
            podeEditar={podeEditar} mestre={mestre}
            // Para o seletor avisar que um talento já está com outra pessoa.
            // O jogador comum só enxerga a ficha dele, então para ele a lista
            // chega vazia e o aviso simplesmente não aparece — quem precisa
            // dessa visão é o Mestre, que vê a mesa toda.
            fichasDaMesa={fichas}
          />
        </section>
      )}
    </div>
  );
}
