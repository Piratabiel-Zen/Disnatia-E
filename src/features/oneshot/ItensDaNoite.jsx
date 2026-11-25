/**
 * A BOLSA — o que cada um tem na mão.
 *
 * Abre pelo botão no canto do mapa, acima dos bilhetes. O jogador vê só o
 * que é dele e o que é da mesa; o Mestre vê tudo e entrega.
 *
 * O cartão é pequeno de propósito: nome, miniatura e uma linha. No meio de
 * uma cena ninguém lê parágrafo — a pessoa precisa LEMBRAR que tem a
 * lanterna, não estudá-la. A descrição inteira está a um toque, para quando
 * o Mestre pedir detalhe.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { col, docIn } from '../../core/campaign';
import { setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { observarLiberados } from '../acesso/observarLiberados';
import { comprimirParaDocumento } from '../../core/media';
import {
  ALCANCES_DE_ITEM, bolsaDe, resumoCurto, foiCortada,
  itemNovo, comDonos, alternarDono, donosDe, alcanceDe, quemTem,
} from './itens.mjs';
import './itens-da-noite.css';

export default function ItensDaNoite({ membro, mestre, aoFechar }) {
  const [itens, setItens] = useState([]);
  const [fichas, setFichas] = useState([]);
  const [aberto, setAberto] = useState('');

  useEffect(() => {
    if (!membro) return undefined;
    return observarLiberados('itens', membro, setItens,
      erro => console.error('Erro ao abrir a bolsa:', erro));
  }, [membro?.uid, membro?.papel]);

  // Os nomes só interessam a quem entrega.
  useEffect(() => {
    if (!mestre) return undefined;
    return onSnapshot(col('fichas_oneshot'),
      snap => setFichas(snap.docs.map(d => ({ ...d.data(), id: d.id }))), () => {});
  }, [mestre]);

  const bolsa = useMemo(() => bolsaDe(itens), [itens]);
  const nomePorUid = useMemo(() => Object.fromEntries(
    fichas.filter(f => f.dono).map(f => [String(f.dono), f.nome || 'sem nome'])), [fichas]);

  const guardar = item => setDoc(docIn('itens', String(item.id)), item, { merge: true })
    .catch(e => console.error('Erro ao guardar o item:', e));

  return (
    <div className="itn-fundo" role="dialog" aria-label="Itens" onClick={aoFechar}>
      <section className="itn" onClick={e => e.stopPropagation()}>
        <header className="itn-topo">
          <h3>{mestre ? 'Itens da noite' : 'O que você tem'}</h3>
          <button type="button" className="itn-fechar" onClick={aoFechar} aria-label="Fechar">✕</button>
        </header>

        {mestre && <NovoItem aoCriar={novo => addDoc(col('itens'), novo).catch(() => {})} />}

        {!bolsa.length ? (
          <p className="itn-vazio" role="status">
            {mestre ? 'Nenhum item criado ainda.' : 'Suas mãos estão vazias.'}
          </p>
        ) : (
          <ul className="itn-lista">
            {bolsa.map(item => (
              <li key={item.id} className={`itn-carta itn-${alcanceDe(item)}`}>
                <Miniatura item={item} />
                <div className="itn-corpo">
                  <b className="itn-nome">{item.nome}</b>
                  <p className="itn-desc">
                    {aberto === item.id ? item.descricao : resumoCurto(item.descricao)}
                  </p>
                  {foiCortada(item.descricao) && (
                    <button type="button" className="itn-mais"
                      onClick={() => setAberto(aberto === item.id ? '' : item.id)}>
                      {aberto === item.id ? 'menos' : 'ver tudo'}
                    </button>
                  )}
                  {mestre && (
                    <Entrega item={item} fichas={fichas} nomePorUid={nomePorUid}
                      aoMudar={guardar}
                      aoApagar={() => deleteDoc(docIn('itens', String(item.id))).catch(() => {})} />
                  )}
                  {!mestre && alcanceDe(item) === 'mesa' && (
                    <span className="itn-selo">da mesa</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* A miniatura é `loading="lazy"` e tem tamanho fixo no CSS: sem o tamanho,
   cada imagem que chega empurra a lista e o dedo erra o botão. */
function Miniatura({ item }) {
  if (!item.imagem) return <span className="itn-mini itn-mini-vazia" aria-hidden="true">◈</span>;
  return <img className="itn-mini" src={item.imagem} alt="" loading="lazy" decoding="async" />;
}

function Entrega({ item, fichas, nomePorUid, aoMudar, aoApagar }) {
  const alcance = alcanceDe(item);
  const donos = donosDe(item);
  return (
    <div className="itn-entrega">
      <div className="itn-alcances" role="group" aria-label="Quem tem este item">
        {ALCANCES_DE_ITEM.map(a => (
          <button key={a.id} type="button" title={a.resumo}
            className={alcance === a.id ? 'is-on' : ''}
            onClick={() => aoMudar({ ...comDonos(item, a.id, donos), id: item.id })}>
            {a.nome}
          </button>
        ))}
      </div>
      {alcance === 'alguns' && (
        <div className="itn-gente">
          {fichas.filter(f => f.dono).map(f => (
            <button key={f.id} type="button"
              className={donos.includes(String(f.dono)) ? 'is-on' : ''}
              onClick={() => aoMudar({ ...alternarDono(item, f.dono), id: item.id })}>
              {f.nome || 'sem nome'}
            </button>
          ))}
        </div>
      )}
      <p className="itn-quem">{quemTem(item, nomePorUid)}</p>
      <button type="button" className="itn-apagar" onClick={aoApagar}>apagar item</button>
    </div>
  );
}

function NovoItem({ aoCriar }) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagem, setImagem] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const anexar = async arquivo => {
    if (!arquivo) return;
    setOcupado(true);
    try {
      const cru = await new Promise((ok, erro) => {
        const l = new FileReader();
        l.onload = () => ok(String(l.result || ''));
        l.onerror = erro;
        l.readAsDataURL(arquivo);
      });
      /* Miniatura: 480px bastam para um quadrado de 56px em tela retina, e
         240KB de item vezes vinte itens seria meio megabyte de bolsa. */
      setImagem(await comprimirParaDocumento(cru, { largura: 480, altura: 480, limite: 70 * 1024 }));
    } catch (e) { console.error('Erro ao anexar a imagem do item:', e); }
    setOcupado(false);
  };

  const criar = () => {
    const novo = itemNovo({ nome, descricao, imagem, alcance: 'alguns', donos: [] });
    if (!novo) return;
    aoCriar(novo);
    setNome(''); setDescricao(''); setImagem('');
  };

  return (
    <div className="itn-novo">
      <input value={nome} onChange={e => setNome(e.target.value)}
        placeholder="Nome do item" maxLength={60} />
      <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
        placeholder="Descrição breve" rows={2} maxLength={400} />
      <div className="itn-novo-pe">
        <label className="itn-anexo">
          {imagem ? 'trocar imagem' : 'anexar imagem'}
          <input type="file" accept="image/*" hidden
            onChange={e => anexar(e.target.files?.[0])} />
        </label>
        {imagem && <img className="itn-mini" src={imagem} alt="" loading="lazy" decoding="async" />}
        <button type="button" className="itn-criar" disabled={!nome.trim() || ocupado}
          onClick={criar}>{ocupado ? 'preparando…' : 'criar item'}</button>
      </div>
    </div>
  );
}
