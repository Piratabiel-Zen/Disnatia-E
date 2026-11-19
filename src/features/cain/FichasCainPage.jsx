import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { deleteDoc, setDoc } from 'firebase/firestore';
import { col, docIn } from '../../core/campaign';
import { listarMembros, sairDoComando } from '../../core/auth';
import { clearStoredAccess } from '../../experience/PlayerAccess';
import { ehMestre, podeAbrirFicha } from '../../core/acesso.mjs';
import { useMembro } from '../acesso/useMembro';
import { verComoJogador } from '../acesso/previaDeJogador.mjs';
import FichaCain from './FichaCain';
import SeloDeAcessoRestrito from './SeloDeAcessoRestrito.jsx';
import { estadoDoExorcista, fichaNova } from './fichaCain.mjs';
import './fichas-cain.css';

const TETO_DE_FICHAS = 12;

/**
 * O REGISTRO DE EXORCISTAS
 *
 * A mesa do CAIN não é a mesa da Dinastia E, e a diferença começa em quem
 * segura a caneta: aqui a ficha é um documento da repartição. O Admin abre o
 * registro, preenche o que precisa e só então nomeia quem vai responder por
 * aquele exorcista. Nenhum jogador cria ficha, e nenhum jogador escreve numa
 * ficha que ainda não foi entregue a ele — o que é a diferença entre um
 * esquadrão designado e um balcão de retirada.
 *
 * O esquadrão inteiro se VÊ, mas não se lê. A fileira mostra todas as fichas
 * com nome e estado, porque saber que o colega está a um ferimento da morte é
 * informação de mesa. Abrir a ficha do outro, não: quem tenta recebe o selo de
 * acesso restrito. Perícias, blasfêmia, bagagem e marcas de pecado são do dono
 * e do Admin.
 *
 * Isto é a TELA recusando. O servidor ainda entrega as fichas da mesa a
 * qualquer membro — separar isso nas regras exige guardar nome e corpo da
 * ficha em lugares diferentes, porque uma consulta no Firestore falha inteira
 * se um só documento da lista for negado.
 */
export default function FichasCainPage({ playerSheetId = '' }) {
  const { membro, membroReal, previa, carregando, campanha } = useMembro();
  const [fichas, setFichas] = useState([]);
  const [membros, setMembros] = useState([]);
  const [abertaId, setAbertaId] = useState(null);
  const [recusada, setRecusada] = useState(null);
  const [tremendo, setTremendo] = useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [prontas, setProntas] = useState(false);
  const adiarGravacao = useRef({});

  useEffect(() => onSnapshot(col('fichas'), snap => {
    setFichas(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    setProntas(true);
  }, () => setProntas(true)), []);

  // A lista de membros só existe para o Admin entregar fichas. Para o jogador
  // ela nem é pedida: as regras negariam, e pedir só para ver o erro no
  // console é ruído.
  useEffect(() => {
    if (!membro || !ehMestre(membro)) return;
    let vivo = true;
    listarMembros(campanha?.id)
      .then(lista => { if (vivo) setMembros(lista); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [membro, campanha?.id]);

  /* Grava com atraso: a ficha é editada campo a campo, e sem isso cada tecla
     digitada no nome viraria uma escrita no banco. */
  const gravar = useCallback(ficha => {
    const chave = String(ficha.id);
    setFichas(atuais => atuais.map(f => (String(f.id) === chave ? ficha : f)));
    clearTimeout(adiarGravacao.current[chave]);
    adiarGravacao.current[chave] = setTimeout(() => {
      const { id, ...dados } = ficha;
      setDoc(docIn('fichas', chave), dados, { merge: true })
        .catch(erro => console.error('Erro ao salvar a ficha:', erro));
    }, 700);
  }, []);

  useEffect(() => () => {
    for (const t of Object.values(adiarGravacao.current)) clearTimeout(t);
  }, []);

  const mestre = ehMestre(membro);

  const criar = useCallback(() => {
    if (fichas.length >= TETO_DE_FICHAS) return;
    const nova = fichaNova(`x${Date.now().toString(36)}`);
    setDoc(docIn('fichas', nova.id), nova).catch(e => console.error('Erro ao criar a ficha:', e));
    setAbertaId(nova.id);
  }, [fichas.length]);

  const entregar = useCallback((ficha, uid) => {
    gravar({ ...ficha, dono: String(uid || '') });
  }, [gravar]);

  // A SENHA DA FICHA
  //
  // É o que a mesa já conhece da Dinastia E: o Admin registra a ficha no
  // nome de alguém, define uma senha e passa a senha para essa pessoa. Quem
  // abre a ficha na porta de entrada passa a jogar por ela.
  //
  // Ela convive com o dono por conta: são duas chaves para a mesma porta. A
  // conta serve quando o jogador tem login; a senha serve quando ele entra de
  // outro aparelho ou quando a mesa ainda não se cadastrou toda.
  const definirSenha = useCallback((ficha, senha) => {
    gravar({ ...ficha, senha: String(senha || '') });
  }, [gravar]);

  const remover = useCallback(async ficha => {
    await deleteDoc(docIn('fichas', String(ficha.id)));
    setAbertaId(atual => (atual === String(ficha.id) ? null : atual));
  }, []);

  // O jogador vê o esquadrão inteiro; a dele primeiro, porque é a que ele abre.
  const lista = useMemo(() => {
    const minha = f => (String(f.dono || '') === String(membro?.uid || '') ? 0 : 1);
    return [...fichas].sort((a, b) => minha(a) - minha(b)
      || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
  }, [fichas, membro?.uid]);

  // Tocar numa ficha que não é sua: a mesa estremece e o selo se fecha.
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

  const aberta = lista.find(f => String(f.id) === abertaId) || null;
  // A ficha aberta na porta de entrada é desta pessoa, mesmo que o Admin
  // ainda não tenha amarrado a conta dela.
  const minhaPelaPorta = ficha => String(ficha?.id || '') === String(playerSheetId || '');
  const nomePorUid = useMemo(
    () => Object.fromEntries(membros.map(m => [m.uid, m.nome || m.uid.slice(0, 6)])),
    [membros],
  );

  if (carregando) return <div className="pagina-aviso">Abrindo o registro…</div>;
  if (!membro) {
    return (
      <div className="pagina-aviso">
        <strong>O registro é da mesa.</strong>
        <span>Entre na campanha para ver as fichas do esquadrão.</span>
      </div>
    );
  }

  return (
    <div className={`registro${tremendo ? ' registro-tremendo' : ''}`}>
      <header className="registro-barra">
        <div>
          <h2>Registro de exorcistas</h2>
          <p>
            {mestre
              ? 'O Admin abre a ficha e entrega a quem vai jogar com ela.'
              : 'Você abre e edita a ficha entregue a você. As outras estão seladas.'}
          </p>
        </div>
        {mestre && (
          <button
            type="button" className="registro-novo" onClick={criar}
            disabled={fichas.length >= TETO_DE_FICHAS}
            title={fichas.length >= TETO_DE_FICHAS ? `Limite de ${TETO_DE_FICHAS} fichas` : 'Abrir ficha nova'}
          >＋ Nova ficha</button>
        )}
      </header>

      {/* DEVOLVER O COMANDO.
          Quem cria a mesa fica Mestre no servidor para sempre — o que está
          certo, mas deixa o criador sem como jogar com a própria conta: ele
          vê toda ficha e todo documento guardado, porque para o servidor ele
          é o Mestre. Daqui ele troca o próprio papel de verdade, e o servidor
          passa a recusar: os dados nem chegam ao navegador. */}
      {ehMestre(membroReal) && !previa && (
        <div className="registro-comando">
          {!confirmandoSaida ? (
            <button type="button" onClick={() => setConfirmandoSaida(true)}>
              Sair do comando desta mesa
            </button>
          ) : (
            <div className="registro-comando-confirma">
              <p>
                Você deixa de ser Admin e passa a jogar só com a ficha que for
                entregue a você. Para voltar ao comando, saia pelo seu nome no
                alto da tela e entre de novo escolhendo <b>Mestre</b>, com a
                senha de Mestre desta mesa.
              </p>
              <div>
                <button type="button" onClick={async () => {
                  try {
                    await sairDoComando(campanha?.id);
                    clearStoredAccess();
                    window.location.reload();
                  } catch (erro) {
                    console.error('Erro ao sair do comando:', erro);
                    setConfirmandoSaida(false);
                  }
                }}>Sim, virar jogador</button>
                <button type="button" onClick={() => setConfirmandoSaida(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {!prontas && <p className="registro-vazio">Consultando o arquivo…</p>}

      {prontas && lista.length === 0 && (
        <p className="registro-vazio">
          {mestre
            ? 'Nenhuma ficha aberta ainda. Comece pelo botão acima e depois entregue cada uma a um jogador.'
            : 'O Admin ainda não entregou nenhuma ficha a esta mesa.'}
        </p>
      )}

      {lista.length > 0 && (
        <ul className="registro-fileira">
          {lista.map(f => {
            const estado = estadoDoExorcista(f);
            const minha = String(f.dono || '') === String(membro.uid);
            const semDono = !String(f.dono || '');
            return (
              <li key={f.id}>
                {/* `data-selada`, e não `aria-disabled`: o botão NÃO está
                    desativado — ele responde, e o que responde é o selo.
                    Marcá-lo como desativado faria o leitor de tela anunciar
                    que não há nada ali, quando há uma recusa a ouvir. */}
                <button
                  type="button"
                  className={`registro-cartao${abertaId === String(f.id) ? ' aberto' : ''}${semDono ? ' sem-dono' : ''}`}
                  style={{ '--cor': estado.cor }}
                  onClick={() => tocarNaFicha(f)}
                  data-selada={podeAbrirFicha(f, membro, playerSheetId) ? 'nao' : 'sim'}
                >
                  <span className="registro-retrato">
                    {f.foto ? <img src={f.foto} alt="" /> : <i>{f.categoria || 'I'}</i>}
                  </span>
                  <span className="registro-nome">
                    <b>{f.nome || 'Exorcista sem nome'}</b>
                    <em>{estado.rotulo}</em>
                  </span>
                  {(minha || minhaPelaPorta(f)) && <span className="registro-selo">sua</span>}
                  {semDono && mestre && <span className="registro-selo pendente">sem dono</span>}
                </button>
                {/* Só o Admin de verdade entra em prévia, e só a partir daqui:
                    é o único lugar onde ele já está escolhendo de quem falar. */}
                {ehMestre(membroReal) && !previa && (
                  <button
                    type="button" className="registro-espiar"
                    onClick={() => verComoJogador(f)}
                    title={`Ver a mesa como ${f.nome || 'este exorcista'}`}
                  >ver como</button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {recusada && (
        <SeloDeAcessoRestrito
          nome={nomePorUid[recusada.dono] || ''}
          aoFechar={() => setRecusada(null)}
        />
      )}

      {aberta && (
        <>
          {mestre && (
            <div className="registro-entrega">
              <label>
                <span>Quem joga com esta ficha</span>
                <select
                  value={String(aberta.dono || '')}
                  onChange={e => entregar(aberta, e.target.value)}
                >
                  <option value="">— ainda ninguém (rascunho do Admin) —</option>
                  {membros.map(m => (
                    <option key={m.uid} value={m.uid}>
                      {m.nome || m.uid.slice(0, 8)}{m.papel === 'mestre' ? ' (Admin)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              {membros.length === 0 && (
                <p className="registro-aviso">
                  Ninguém entrou nesta mesa ainda. Passe a senha da mesa ao esquadrão;
                  assim que entrarem, os nomes aparecem aqui.
                </p>
              )}
              <label>
                <span>Senha desta ficha</span>
                <input
                  type="text" value={aberta.senha || ''} placeholder="sem senha: abre direto"
                  onChange={e => definirSenha(aberta, e.target.value)}
                />
              </label>
              <p className="registro-aviso">
                Passe esta senha ao jogador. É com ela que ele abre a ficha na porta
                da mesa. Sem senha, qualquer um que entrar na mesa abre esta ficha.
              </p>
              <button type="button" className="registro-remover" onClick={() => remover(aberta)}>
                Arquivar esta ficha
              </button>
            </div>
          )}

          <FichaCain
            key={String(aberta.id)}
            ficha={aberta}
            membro={membro}
            fichaLiberada={playerSheetId}
            aoMudar={gravar}
          />
        </>
      )}
    </div>
  );
}
