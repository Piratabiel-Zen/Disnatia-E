import { useCallback, useEffect, useMemo, useState } from 'react';
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { deleteDoc, setDoc } from 'firebase/firestore';
import { col, docIn } from '../../core/campaign';
import { ehMestre } from '../../core/acesso.mjs';
import { comprimirParaDocumento } from '../../core/media';
import { useMembro } from '../acesso/useMembro';
import { observarLiberados } from '../acesso/observarLiberados';
import {
  TIPOS_DE_APARICAO, alternarPessoa, aparicaoNova, estaRevelada,
  quemVe, revelarParaTodos, tipoDaAparicao,
} from './aparicoes.mjs';
import './aparicoes.css';

/**
 * APARIÇÕES
 *
 * A gaveta do Mestre. Ele prepara as imagens antes da sessão e revela quando
 * a cena chega — o que não foi revelado não existe para a mesa.
 *
 * Duas telas no mesmo lugar, e a diferença é grande: o Mestre vê tudo, com o
 * estado de cada uma à vista, porque ele precisa achar a imagem certa em dois
 * segundos no meio de uma descrição. O jogador vê só o que foi revelado, em
 * cheio — para ele isto não é gaveta, é a coisa aparecendo.
 */
export default function AparicoesPage() {
  const { membro, carregando, campanha } = useMembro();
  const [aparicoes, setAparicoes] = useState([]);
  const [fichas, setFichas] = useState([]);
  const [abertaId, setAbertaId] = useState(null);
  const [filtro, setFiltro] = useState('');

  const mestre = ehMestre(membro);

  useEffect(() => {
    if (!membro) return undefined;
    // O Mestre lê tudo; o jogador só o que a regra aprova, em duas consultas
    // que o servidor confere sem abrir documento nenhum.
    return observarLiberados('aparicoes', membro, setAparicoes,
      erro => console.error('Erro ao abrir as aparições:', erro));
  }, [membro?.uid, membro?.papel]);

  useEffect(() => {
    if (!mestre) return undefined;
    return onSnapshot(col('fichas_oneshot'), snap => {
      setFichas(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    }, () => {});
  }, [mestre, campanha?.id]);

  const nomePorUid = useMemo(() => Object.fromEntries(
    fichas.filter(f => f.dono).map(f => [String(f.dono), f.nome || 'personagem']),
  ), [fichas]);

  const salvar = useCallback(async aparicao => {
    const { id, ...dados } = aparicao;
    setAparicoes(atuais => atuais.map(a => (String(a.id) === String(id) ? aparicao : a)));
    await setDoc(docIn('aparicoes', String(id)), dados, { merge: true });
  }, []);

  const criar = async tipo => {
    const id = `a${Date.now().toString(36)}`;
    await setDoc(docIn('aparicoes', id), aparicaoNova(tipo));
    setAbertaId(id);
  };

  const remover = async id => {
    if (!confirm('Apagar esta aparição?')) return;
    if (String(abertaId) === String(id)) setAbertaId(null);
    await deleteDoc(docIn('aparicoes', String(id)));
  };

  const anexar = async (aparicao, arquivo) => {
    if (!arquivo) return;
    const cru = await new Promise(resolver => {
      const leitor = new FileReader();
      leitor.onload = () => resolver(String(leitor.result || ''));
      leitor.readAsDataURL(arquivo);
    });
    // Mesmo teto da ficha e dos documentos: a imagem vai dentro do documento
    // do Firestore, que para em 400 KiB.
    const imagem = await comprimirParaDocumento(cru, { largura: 1600, altura: 1600, limite: 230 * 1024 });
    await salvar({ ...aparicao, imagem });
  };

  if (carregando) return <div className="apa-vazio">Abrindo a noite…</div>;
  if (!membro) return <div className="apa-vazio">Entre na campanha para ver o que foi revelado.</div>;

  const lista = filtro ? aparicoes.filter(a => a.tipo === filtro) : aparicoes;
  const aberta = aparicoes.find(a => String(a.id) === abertaId) || null;

  /* ---- A mesa: só o que apareceu ---- */
  if (!mestre) {
    const reveladas = lista.filter(estaRevelada);
    return (
      <div className="apa apa-mesa">
        <header className="apa-barra">
          <div>
            <h2>Aparições</h2>
            <p>O que a noite já mostrou a vocês.</p>
          </div>
        </header>
        {reveladas.length === 0 ? (
          <p className="apa-vazio">Nada apareceu ainda.</p>
        ) : (
          <ul className="apa-galeria">
            {reveladas.map(a => (
              <li key={a.id}>
                <figure>
                  {a.imagem
                    ? <img src={a.imagem} alt={a.titulo || ''} />
                    : <div className="apa-sem-imagem">{tipoDaAparicao(a.tipo).icone}</div>}
                  <figcaption>
                    <b>{a.titulo || tipoDaAparicao(a.tipo).nome}</b>
                    {a.descricao && <p>{a.descricao}</p>}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  /* ---- O Mestre: a gaveta inteira ---- */
  return (
    <div className="apa">
      <header className="apa-barra">
        <div>
          <h2>Aparições</h2>
          <p>Prepare antes; revele quando a cena chegar. O que não foi revelado não existe para a mesa.</p>
        </div>
      </header>

      <div className="apa-criar">
        {TIPOS_DE_APARICAO.map(t => (
          <button key={t.id} type="button" onClick={() => criar(t.id)} title={t.resumo}>
            <span>{t.icone}</span>{t.nome}
          </button>
        ))}
      </div>

      {aparicoes.length > 0 && (
        <div className="apa-filtros">
          <button type="button" data-ativo={filtro === '' ? 'sim' : 'nao'} onClick={() => setFiltro('')}>
            Todas <em>{aparicoes.length}</em>
          </button>
          {TIPOS_DE_APARICAO.map(t => {
            const quantos = aparicoes.filter(a => a.tipo === t.id).length;
            if (!quantos) return null;
            return (
              <button key={t.id} type="button" data-ativo={filtro === t.id ? 'sim' : 'nao'} onClick={() => setFiltro(t.id)}>
                {t.icone} {t.nome} <em>{quantos}</em>
              </button>
            );
          })}
        </div>
      )}

      <ul className="apa-lista">
        {lista.map(a => (
          <li key={a.id} data-revelada={estaRevelada(a) ? 'sim' : 'nao'} data-aberta={String(a.id) === abertaId ? 'sim' : 'nao'}>
            <button type="button" className="apa-linha" onClick={() => setAbertaId(atual => (atual === String(a.id) ? null : String(a.id)))}>
              {a.imagem
                ? <img src={a.imagem} alt="" className="apa-mini" />
                : <span className="apa-mini apa-mini-vazia">{tipoDaAparicao(a.tipo).icone}</span>}
              <span className="apa-nomes">
                <b>{a.titulo || `${tipoDaAparicao(a.tipo).nome} sem título`}</b>
                <em>{quemVe(a, nomePorUid)}</em>
              </span>
            </button>
            {/* Revelar fica na linha, não dentro do detalhe: é a ação que o
                Mestre faz no meio de uma frase, sem tirar os olhos da mesa. */}
            <button
              type="button" className="apa-revelar"
              onClick={() => salvar({ ...revelarParaTodos(a, !a.liberadoParaTodos), id: a.id })}
              title={a.liberadoParaTodos ? 'Recolher' : 'Revelar à mesa'}
            >{a.liberadoParaTodos ? 'Recolher' : 'Revelar'}</button>
          </li>
        ))}
        {aparicoes.length === 0 && (
          <li className="apa-vazio">Nenhuma aparição preparada. Crie a primeira acima.</li>
        )}
      </ul>

      {aberta && (
        <section className="apa-detalhe">
          <div className="apa-detalhe-campos">
            <label>
              <span>Título</span>
              <input
                value={aberta.titulo || ''} placeholder="O que a mesa vai chamar isto"
                onChange={e => salvar({ ...aberta, titulo: e.target.value })}
              />
            </label>
            <label>
              <span>Tipo</span>
              <select value={aberta.tipo} onChange={e => salvar({ ...aberta, tipo: e.target.value })}>
                {TIPOS_DE_APARICAO.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </label>
          </div>

          <label className="apa-descricao">
            <span>Descrição</span>
            <textarea
              rows={3} value={aberta.descricao || ''}
              placeholder="O que se vê, o que se ouve, o cheiro. O que a mesa lê junto com a imagem."
              onChange={e => salvar({ ...aberta, descricao: e.target.value })}
            />
          </label>

          <div className="apa-imagem">
            {aberta.imagem && <img src={aberta.imagem} alt="" />}
            <div className="apa-imagem-acoes">
              <label className="apa-anexar">
                {aberta.imagem ? 'Trocar imagem' : 'Anexar imagem'}
                <input type="file" accept="image/*" onChange={e => anexar(aberta, e.target.files?.[0])} />
              </label>
              {aberta.imagem && (
                <button type="button" onClick={() => salvar({ ...aberta, imagem: '' })}>Tirar imagem</button>
              )}
              <button type="button" className="perigo" onClick={() => remover(aberta.id)}>Apagar aparição</button>
            </div>
          </div>

          {fichas.some(f => f.dono) && (
            <div className="apa-plateia">
              <span>Revelar só para</span>
              <div>
                {fichas.filter(f => f.dono).map(f => (
                  <button
                    key={f.id} type="button"
                    data-ligado={(aberta.liberadoPara || []).includes(String(f.dono)) ? 'sim' : 'nao'}
                    onClick={() => salvar({ ...alternarPessoa(aberta, f.dono), id: aberta.id })}
                  >{f.nome || 'personagem'}</button>
                ))}
              </div>
              <em>Mostrar a uma pessoa só é o que separa quem viu de quem não acredita.</em>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
