import { useCallback, useEffect, useMemo, useState } from 'react';
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { deleteDoc, setDoc } from 'firebase/firestore';
import { col, docIn } from '../../core/campaign';
import { documentosVisiveis, ehMestre, resumoDaLiberacao } from '../../core/acesso.mjs';
import { useMembro } from '../acesso/useMembro';
import { observarLiberados } from '../acesso/observarLiberados';
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
  const [fichas, setFichas] = useState([]);
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(null);
  const [falha, setFalha] = useState('');

  // Uma escuta direta em toda a coleção era negada por inteiro para o
  // jogador — bastava existir um documento guardado na mesa. Ver
  // observarLiberados: ele pede só o que a regra aprova.
  useEffect(() => {
    if (!membro) return undefined;
    setFalha('');
    return observarLiberados('documentos', membro, setDocumentos, erro => {
      console.error('Erro ao abrir o arquivo:', erro);
      setFalha('O servidor recusou a leitura do arquivo. Recarregue a página; se continuar, avise o Admin da mesa.');
    });
  }, [membro?.uid, membro?.papel]);

  // Quem recebe um documento sai das FICHAS, não de uma lista de contas.
  //
  // A mesa não pensa em uid nem em e-mail: ela pensa em personagem. "Isto
  // chega ao Álvaro" é a frase que o Mestre tem na cabeça, e o Álvaro é uma
  // ficha. A conta por trás é só o endereço de entrega — por isso a liberação
  // continua sendo gravada pelo uid do dono da ficha, que é o que as regras
  // do servidor sabem conferir.
  useEffect(() => onSnapshot(col('fichas'), snap => {
    setFichas(snap.docs.map(d => ({ ...d.data(), id: d.id })));
  }, () => {}), []);

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

  // Fichas já entregues a alguém: só essas podem receber documento, porque
  // uma ficha sem dono não tem para onde entregar.
  const comDono = fichas.filter(f => String(f.dono || '').trim());
  const semDono = fichas.length - comDono.length;
  const nomePorUid = Object.fromEntries(
    comDono.map(f => [String(f.dono), f.nome || 'exorcista sem nome']),
  );
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
          {/* Gaveta vazia e gaveta recusada são coisas diferentes, e durante
              um bom tempo as duas apareceram iguais: "nada foi liberado para
              você". Dizer qual é qual é o que evita o Mestre jurar que
              liberou enquanto o jogador jura que não chegou. */}
          {falha && <li className="arquivo-vazio arquivo-falha">{falha}</li>}
          {!falha && lista.length === 0 && (
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
                  {comDono.map(f => (
                    <button
                      key={f.id} type="button"
                      data-ligado={atual.liberadoPara?.includes(String(f.dono)) ? 'sim' : 'nao'}
                      title={`Entregar só a ${f.nome || 'esta ficha'}`}
                      onClick={() => salvar(alternarPessoa(atual, String(f.dono)))}
                    >{f.nome || 'Exorcista sem nome'}</button>
                  ))}
                </div>
                <p className="arquivo-nota-mestre">
                  Guardado é o padrão. O que está guardado não chega ao navegador de ninguém —
                  quem recusa é o servidor, não a tela.
                </p>
                {comDono.length === 0 && (
                  <p className="arquivo-nota-mestre">
                    {fichas.length === 0
                      ? 'Nenhuma ficha aberta ainda. Abra as fichas na aba Fichas e entregue cada uma a um jogador: é essa entrega que faz o nome aparecer aqui.'
                      : 'As fichas existem, mas nenhuma foi entregue a um jogador ainda. Escolha o dono de cada uma na aba Fichas.'}
                  </p>
                )}
                {comDono.length > 0 && semDono > 0 && (
                  <p className="arquivo-nota-mestre">
                    {semDono === 1
                      ? 'Uma ficha ainda está sem dono e por isso não aparece na lista.'
                      : `${semDono} fichas ainda estão sem dono e por isso não aparecem na lista.`}
                  </p>
                )}
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
