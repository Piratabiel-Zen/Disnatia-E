import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { deleteDoc, setDoc } from 'firebase/firestore';
import { col, docIn } from '../../core/campaign';
import { ehMestre } from '../../core/acesso.mjs';
import { useMembro } from '../acesso/useMembro';
import {
  CAMPOS_REVELAVEIS, CATEGORIAS, DOMINIOS_POR_PECADO, alternarDominio,
  categoriaPorNumeral, cortarTalisma, esconder, executar, pecadoNovo,
  pecadoVisivel, podeSerExecutado, progressoDaCacada, revelar,
} from './pecados.mjs';
import { compressImage } from '../../core/media';
import './pecados.css';

/**
 * OS PECADOS
 *
 * Do lado do Mestre, a ficha inteira, com um interruptor por campo: ele revela
 * origem, palácio, talismã e domínios conforme a investigação chega neles.
 *
 * Do lado do jogador, só o que já foi descoberto — e o que não foi não aparece
 * vazio nem riscado: não aparece. Um campo em branco na tela já conta que
 * existe algo ali, e numa caçada isso é meio caminho andado de graça.
 */
export default function PecadosPage() {
  const { membro, carregando } = useMembro();
  const [pecados, setPecados] = useState([]);
  const [aberto, setAberto] = useState(null);

  useEffect(() => onSnapshot(col('pecados'), snap => {
    setPecados(snap.docs.map(d => ({ ...d.data(), id: d.id })));
  }), []);

  const salvar = useCallback(async pecado => {
    const { id, ...dados } = pecado;
    await setDoc(docIn('pecados', String(id)), dados, { merge: true });
  }, []);

  const criaturaRef = useRef(null);
  const mestre = ehMestre(membro);
  const lista = useMemo(
    () => pecados.map(p => pecadoVisivel(p, membro)).filter(Boolean),
    [pecados, membro],
  );

  if (carregando) return <div className="pagina-aviso">Abrindo os registros…</div>;
  if (!membro) {
    return (
      <div className="pagina-aviso">
        <strong>Os Pecados são da mesa.</strong>
        <span>Entre na campanha para ver o que a caçada já descobriu.</span>
      </div>
    );
  }

  const bruto = pecados.find(p => p.id === aberto) || null;
  const atual = bruto ? pecadoVisivel(bruto, membro) : null;
  const campoVisivel = id => mestre || atual?.revelado?.[id];

  return (
    <div className="pecados">
      <header className="pecados-barra">
        <h2>Pecados</h2>
        {mestre && (
          <button
            type="button" className="pecados-novo"
            onClick={() => {
              const novo = pecadoNovo({ autor: membro.uid, nome: 'Pecado sem nome' });
              salvar(novo); setAberto(novo.id);
            }}
          >Registrar Pecado</button>
        )}
      </header>

      <div className="pecados-corpo">
        <ul className="pecados-lista">
          {lista.length === 0 && (
            <li className="pecados-vazio">
              {mestre ? 'Nenhum Pecado registrado ainda.' : 'A caçada ainda não encontrou nada.'}
            </li>
          )}
          {lista.map(p => {
            const cat = categoriaPorNumeral(p.categoria);
            const bruteza = pecados.find(x => x.id === p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={`pecados-item${aberto === p.id ? ' aberto' : ''}${p.executado ? ' executado' : ''}`}
                  style={{ '--cor': cat.cor }}
                  onClick={() => setAberto(aberto === p.id ? null : p.id)}
                >
                  <i>{cat.numeral}</i>
                  <span>
                    <b>{p.nome || 'Sem nome'}</b>
                    <em>{cat.nome}{p.executado ? ' · executado' : ''}</em>
                  </span>
                  {mestre && (
                    <u style={{ '--p': `${Math.round(progressoDaCacada(bruteza) * 100)}%` }} />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {atual && (
          <article className="pecados-ficha">
            <header className="pecados-ficha-topo" style={{ '--cor': categoriaPorNumeral(atual.categoria).cor }}>
              {mestre ? (
                <>
                  <input value={bruto.nome} onChange={e => salvar({ ...bruto, nome: e.target.value })} />
                  <select value={bruto.categoria} onChange={e => salvar({ ...bruto, categoria: e.target.value })}>
                    {CATEGORIAS.map(c => <option key={c.numeral} value={c.numeral}>{c.numeral}. {c.nome}</option>)}
                  </select>
                </>
              ) : (
                <>
                  <h3>{atual.nome}</h3>
                  <span className="pecados-categoria">
                    {atual.categoria}. {categoriaPorNumeral(atual.categoria).nome}
                  </span>
                </>
              )}
            </header>

            {/* A CRIATURA
                Fica logo abaixo do nome porque é a primeira coisa que a mesa
                quer ver quando o Pecado aparece. Só o Admin anexa e só ele
                troca: o retrato é a carta que ele vira na hora certa — se o
                jogador pudesse mexer, a revelação deixaria de ser dele. */}
            {(mestre || atual.imagem) && (
              <figure className={`pecados-criatura${mestre ? ' editavel' : ''}`}>
                {atual.imagem
                  ? <img src={atual.imagem} alt={`O Pecado ${atual.nome || 'sem nome'}`} />
                  : <span>Sem retrato da criatura</span>}
                {mestre && (
                  <div className="pecados-criatura-acoes">
                    <button type="button" onClick={() => criaturaRef.current?.click()}>
                      {bruto.imagem ? 'Trocar imagem' : 'Anexar imagem'}
                    </button>
                    {bruto.imagem && (
                      <button type="button" onClick={() => salvar({ ...bruto, imagem: '' })}>Remover</button>
                    )}
                    <input
                      ref={criaturaRef} type="file" accept="image/*" hidden
                      onChange={async e => {
                        const arquivo = e.target.files?.[0];
                        e.target.value = '';
                        if (!arquivo) return;
                        const leitor = new FileReader();
                        leitor.onload = async ev => {
                          try { salvar({ ...bruto, imagem: await compressImage(ev.target.result, 900, 620, 0.72) }); }
                          catch (_) { salvar({ ...bruto, imagem: ev.target.result }); }
                        };
                        leitor.readAsDataURL(arquivo);
                      }}
                    />
                  </div>
                )}
              </figure>
            )}

            <Campo rotulo="Manifestação" visivel mestre={mestre}
              valor={mestre ? bruto.manifestacao : atual.manifestacao}
              aoMudar={v => salvar({ ...bruto, manifestacao: v })} />

            {CAMPOS_REVELAVEIS.map(campo => {
              if (!campoVisivel(campo.id)) return null;
              return (
                <section key={campo.id} className="pecados-bloco">
                  <div className="pecados-bloco-topo">
                    <span className="pecados-rotulo">{campo.nome}</span>
                    {mestre && (
                      <button
                        type="button" className="pecados-revelar"
                        data-ligado={bruto.revelado?.[campo.id] ? 'sim' : 'nao'}
                        title={campo.resumo}
                        onClick={() => salvar(bruto.revelado?.[campo.id]
                          ? esconder(bruto, campo.id)
                          : revelar(bruto, campo.id))}
                      >{bruto.revelado?.[campo.id] ? 'A mesa já sabe' : 'Revelar à mesa'}</button>
                    )}
                  </div>

                  {campo.id === 'origem' && (
                    <>
                      <Campo rotulo="De que trauma nasceu" visivel mestre={mestre}
                        valor={mestre ? bruto.origem : atual.origem}
                        aoMudar={v => salvar({ ...bruto, origem: v })} />
                      <Campo rotulo="Hospedeiro" visivel mestre={mestre} linha
                        valor={mestre ? bruto.hospedeiro : atual.hospedeiro}
                        aoMudar={v => salvar({ ...bruto, hospedeiro: v })} />
                    </>
                  )}
                  {campo.id === 'palacio' && (
                    <Campo rotulo="Onde reside" visivel mestre={mestre}
                      valor={mestre ? bruto.palacio : atual.palacio}
                      aoMudar={v => salvar({ ...bruto, palacio: v })} />
                  )}
                  {campo.id === 'talisma' && (
                    <div className="pecados-talisma">
                      <div className="pecados-cortes">
                        {Array.from({ length: Math.max(1, (mestre ? bruto : atual).talisma || 1) }, (_, i) => (
                          <button
                            key={i} type="button"
                            data-cheio={i < (atual.talismaCortes || 0) ? 'sim' : 'nao'}
                            aria-label={`Corte ${i + 1}`}
                            onClick={() => salvar(i + 1 <= (bruto.talismaCortes || 0)
                              ? { ...bruto, talismaCortes: i }
                              : cortarTalisma(bruto))}
                          />
                        ))}
                      </div>
                      <p className="pecados-nota">
                        {podeSerExecutado(mestre ? bruto : atual)
                          ? 'O talismã está cheio: o Pecado pode ser executado.'
                          : 'Cada corte aproxima a execução. Cheio, ele pode morrer — não está morto.'}
                      </p>
                      {mestre && (
                        <label className="pecados-talisma-tamanho">
                          Cortes necessários
                          <input type="number" min="1" max="12" value={bruto.talisma}
                            onChange={e => salvar({ ...bruto, talisma: Math.max(1, Number(e.target.value) || 1) })} />
                        </label>
                      )}
                      <Campo rotulo="Ataca com" visivel mestre={mestre}
                        valor={mestre ? bruto.atacaCom : atual.atacaCom}
                        aoMudar={v => salvar({ ...bruto, atacaCom: v })} />
                    </div>
                  )}
                  {campo.id === 'dominios' && (
                    <>
                      <ul className="pecados-dominios">
                        {((mestre ? bruto : atual).dominios || []).map(d => <li key={d}>{d}</li>)}
                        {((mestre ? bruto : atual).dominios || []).length === 0 && (
                          <li className="vazio">Nenhum domínio escolhido.</li>
                        )}
                      </ul>
                      {mestre && (
                        <NovoDominio
                          cheio={(bruto.dominios || []).length >= DOMINIOS_POR_PECADO}
                          aoAdicionar={d => salvar(alternarDominio(bruto, d))}
                          aoRemover={d => salvar(alternarDominio(bruto, d))}
                          atuais={bruto.dominios || []}
                        />
                      )}
                      <Campo rotulo="Aflições que impõe" visivel mestre={mestre}
                        valor={mestre ? bruto.aflicoes : atual.aflicoes}
                        aoMudar={v => salvar({ ...bruto, aflicoes: v })} />
                    </>
                  )}
                </section>
              );
            })}

            {mestre && (
              <div className="pecados-acoes">
                {!bruto.executado && podeSerExecutado(bruto) && (
                  <button type="button" className="pecados-executar" onClick={() => salvar(executar(bruto))}>
                    Executar
                  </button>
                )}
                <button
                  type="button" className="pecados-remover"
                  onClick={async () => { await deleteDoc(docIn('pecados', bruto.id)); setAberto(null); }}
                >Apagar registro</button>
              </div>
            )}
          </article>
        )}
      </div>
    </div>
  );
}

function Campo({ rotulo, valor, aoMudar, mestre, visivel, linha = false }) {
  if (!visivel) return null;
  if (!mestre) {
    if (!valor) return null;
    return (
      <div className="pecados-campo">
        <span className="pecados-rotulo">{rotulo}</span>
        <p>{valor}</p>
      </div>
    );
  }
  return (
    <label className="pecados-campo">
      <span className="pecados-rotulo">{rotulo}</span>
      {linha
        ? <input value={valor || ''} onChange={e => aoMudar(e.target.value)} />
        : <textarea value={valor || ''} onChange={e => aoMudar(e.target.value)} />}
    </label>
  );
}

function NovoDominio({ atuais, cheio, aoAdicionar, aoRemover }) {
  const [texto, setTexto] = useState('');
  return (
    <div className="pecados-novo-dominio">
      {atuais.map(d => (
        <button key={d} type="button" className="pecados-tira" onClick={() => aoRemover(d)}>
          {d} ✕
        </button>
      ))}
      {!cheio && (
        <div className="pecados-adicionar">
          <input
            value={texto} placeholder="Um domínio…" maxLength={60}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && texto.trim()) { aoAdicionar(texto.trim()); setTexto(''); } }}
          />
          <button type="button" disabled={!texto.trim()}
            onClick={() => { aoAdicionar(texto.trim()); setTexto(''); }}>+</button>
        </div>
      )}
      {cheio && <span className="pecados-nota">Três é o limite do livro.</span>}
    </div>
  );
}
