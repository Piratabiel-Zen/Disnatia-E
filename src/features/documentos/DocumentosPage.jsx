import { useCallback, useEffect, useMemo, useState } from 'react';
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { deleteDoc, setDoc } from 'firebase/firestore';
import { col, docIn } from '../../core/campaign';
import { documentosVisiveis, ehMestre, resumoDaLiberacao } from '../../core/acesso.mjs';
import { useMembro } from '../acesso/useMembro';
import {
  TIPOS_DE_DOCUMENTO, alternarPessoa, anotar, buscarDocumentos, compartilharComAMesa,
  documentoNovo, guardar, liberarParaTodos, notaDe, ordenarParaJogador,
  ordenarParaMestre, tipoDoDocumento,
} from './documentos.mjs';
import './documentos.css';

/**
 * O ARQUIVO
 *
 * Do lado do Mestre é uma gaveta: o que ele preparou e ainda não entregou fica
 * em cima, porque é para isso que ele abre esta aba. Do lado do jogador é uma
 * caixa de entrada: o que chegou por último vem primeiro.
 *
 * O que está guardado nem chega ao navegador do jogador — quem recusa é o
 * servidor. A lista filtrada aqui existe para a tela não oferecer o que seria
 * negado, não como a defesa.
 */
export default function DocumentosPage() {
  const { membro, carregando } = useMembro();
  const [documentos, setDocumentos] = useState([]);
  const [membros, setMembros] = useState([]);
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(null);

  useEffect(() => onSnapshot(col('documentos'), snap => {
    setDocumentos(snap.docs.map(d => ({ ...d.data(), id: d.id })));
  }), []);

  useEffect(() => {
    if (!membro || !ehMestre(membro)) return undefined;
    return onSnapshot(col('__membros_espelho'), snap => {
      setMembros(snap.docs.map(d => ({ ...d.data(), uid: d.id })));
    });
  }, [membro]);

  const salvar = useCallback(async doc => {
    const { id, ...dados } = doc;
    await setDoc(docIn('documentos', String(id)), dados, { merge: true });
  }, []);

  const mestre = ehMestre(membro);
  const lista = useMemo(() => {
    const visiveis = documentosVisiveis(documentos, membro);
    const filtrados = buscarDocumentos(visiveis, busca);
    return mestre ? ordenarParaMestre(filtrados) : ordenarParaJogador(filtrados);
  }, [documentos, membro, busca, mestre]);

  if (carregando) return <div className="pagina-aviso">Abrindo o arquivo…</div>;
  if (!membro) {
    return (
      <div className="pagina-aviso">
        <strong>O arquivo é da mesa.</strong>
        <span>Entre na campanha para ver o que já foi liberado para você.</span>
      </div>
    );
  }

  const nomePorUid = Object.fromEntries(membros.map(m => [m.uid, m.nome || 'alguém']));
  const atual = lista.find(d => d.id === aberto) || null;

  return (
    <div className="arquivo">
      <header className="arquivo-barra">
        <h2>Arquivo</h2>
        <input
          className="arquivo-busca" value={busca} placeholder="Buscar no arquivo…"
          onChange={e => setBusca(e.target.value)}
        />
        {mestre && (
          <div className="arquivo-novos">
            {TIPOS_DE_DOCUMENTO.map(t => (
              <button
                key={t.id} type="button" title={`Novo ${t.nome.toLowerCase()}`}
                onClick={() => {
                  const novo = documentoNovo({ tipo: t.id, autor: membro.uid, titulo: `${t.nome} sem título` });
                  salvar(novo); setAberto(novo.id);
                }}
              >{t.icone}</button>
            ))}
          </div>
        )}
      </header>

      <div className="arquivo-corpo">
        <ul className="arquivo-lista">
          {lista.length === 0 && (
            <li className="arquivo-vazio">
              {mestre ? 'Nada no arquivo ainda. Crie o primeiro documento acima.'
                      : 'Nada foi liberado para você até agora.'}
            </li>
          )}
          {lista.map(d => {
            const tipo = tipoDoDocumento(d);
            const guardado = !d.liberadoParaTodos && !(d.liberadoPara?.length);
            return (
              <li key={d.id}>
                <button
                  type="button"
                  className={`arquivo-item${aberto === d.id ? ' aberto' : ''}${guardado ? ' guardado' : ''}`}
                  style={{ '--cor': guardado ? '#5A5048' : '#A98045' }}
                  onClick={() => setAberto(aberto === d.id ? null : d.id)}
                >
                  <i>{tipo.icone}</i>
                  <span>
                    <b>{d.titulo || 'Sem título'}</b>
                    {mestre && <em>{resumoDaLiberacao(d, nomePorUid)}</em>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {atual && (
          <article className="arquivo-folha">
            {mestre ? (
              <input
                className="arquivo-titulo" value={atual.titulo}
                onChange={e => salvar({ ...atual, titulo: e.target.value })}
              />
            ) : <h3 className="arquivo-titulo">{atual.titulo}</h3>}

            {atual.imagem && <img className="arquivo-imagem" src={atual.imagem} alt="" />}

            {mestre ? (
              <textarea
                className="arquivo-corpo-texto" value={atual.corpo} placeholder="O que o documento diz…"
                onChange={e => salvar({ ...atual, corpo: e.target.value })}
              />
            ) : <p className="arquivo-corpo-texto leitura">{atual.corpo}</p>}

            {mestre && (
              <div className="arquivo-liberacao">
                <span className="arquivo-rotulo">Quem recebe</span>
                <div className="arquivo-pessoas">
                  <button
                    type="button" data-ligado={atual.liberadoParaTodos ? 'sim' : 'nao'}
                    onClick={() => salvar(atual.liberadoParaTodos ? guardar(atual) : liberarParaTodos(atual))}
                  >A mesa inteira</button>
                  {membros.filter(m => m.papel !== 'mestre').map(m => (
                    <button
                      key={m.uid} type="button"
                      data-ligado={atual.liberadoPara?.includes(m.uid) ? 'sim' : 'nao'}
                      onClick={() => salvar(alternarPessoa(atual, m.uid))}
                    >{m.nome || 'jogador'}</button>
                  ))}
                </div>
                <p className="arquivo-nota-mestre">
                  Guardado é o padrão. O que está guardado não chega ao navegador de ninguém.
                </p>
              </div>
            )}

            {!mestre && atual.liberadoPara?.includes(membro.uid) && !atual.liberadoParaTodos && (
              <button
                type="button" className="arquivo-compartilhar"
                onClick={() => salvar(compartilharComAMesa(atual, membro.uid))}
              >Mostrar isto à mesa</button>
            )}

            <label className="arquivo-anotacao">
              <span className="arquivo-rotulo">Sua anotação</span>
              <textarea
                value={notaDe(atual, membro.uid)} placeholder="O que você notou…"
                onChange={e => salvar(anotar(atual, membro.uid, e.target.value))}
              />
            </label>

            {mestre && (
              <button
                type="button" className="arquivo-remover"
                onClick={async () => { await deleteDoc(docIn('documentos', atual.id)); setAberto(null); }}
              >Tirar do arquivo</button>
            )}
          </article>
        )}
      </div>
    </div>
  );
}
