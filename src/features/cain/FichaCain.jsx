import { useMemo, useRef, useState } from 'react';
import { BLASFEMIAS, PERICIAS, PERICIA_ESPECIAL } from '../../core/sistemas/cain/index.mjs';
import { MAX_PIEDADE, podeAgoniaDivina, resumoDaRolagem, rolarAcao } from '../../core/sistemas/cain/regras.mjs';
import { podeEditarFicha, podeVerSegredosDaFicha } from '../../core/acesso.mjs';
import {
  CAIXAS_DE_GANCHO, MAX_FERIMENTOS, MAX_PECADO, MAX_PERICIA, MAX_PULSOS,
  ajustarPericia, condicoesDaFicha, cortarGancho, estadoDoExorcista, estresseMaximo,
  ganharFerimento, marcarEstresse, marcarPecado, periciasNoMaximo,
  podeSubirPericia, psiqueDaCategoria, resolverGancho,
  MAX_PONTOS_KIT, TETO_DA_BAGAGEM, bagagemDe, guardarNaBagagem, tirarDaBagagem,
} from './fichaCain.mjs';
import { compressImage } from '../../core/media';
import './ficha-cain.css';

const CATEGORIAS = ['I', 'II', 'III', 'IV', 'V'];
const numeroDaCategoria = romano => Math.max(1, CATEGORIAS.indexOf(String(romano)) + 1);

/* Um painel com a aba entalhada na borda. É o gesto que diz "registro". */
function Painel({ aba, children, classe = '', ...resto }) {
  return (
    <section className={`cain-painel ${classe}`} {...resto}>
      <span className="cain-aba">{aba}</span>
      {children}
    </section>
  );
}

function Campo({ rotulo, children, classe = '' }) {
  return <label className={`cain-campo ${classe}`}><span>{rotulo}</span>{children}</label>;
}

/* Uma trilha de caixas: clicar na caixa n marca até n, clicar na última marcada desmarca. */
function Trilha({ nome, nota, valor, max, cor, aoMudar, somenteLeitura, morteNaUltima = false }) {
  return (
    <div className="cain-trilha">
      <div className="cain-trilha-topo">
        <b style={{ color: cor }}>{nome}</b>
        <em>{valor}/{max}</em>
      </div>
      <div className="cain-caixas">
        {Array.from({ length: max }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`cain-caixa${morteNaUltima && i === max - 1 ? ' morte' : ''}`}
            style={{ '--cor': cor }}
            data-cheio={i < valor ? 'sim' : 'nao'}
            disabled={somenteLeitura}
            aria-label={`${nome}: ${i + 1} de ${max}`}
            onClick={() => aoMudar(valor === i + 1 ? i : i + 1)}
          />
        ))}
      </div>
      {nota ? <p className="cain-trilha-nota">{nota}</p> : null}
    </div>
  );
}

/* O rolador. A regra mora em regras.mjs; aqui só se escolhe e se lê. */
/**
 * A BAGAGEM DO EXORCISTA
 *
 * O kit do livro é abstrato — cinco pontos, gastos na hora em que o item faz
 * falta. Esses pontos ficam aqui como trilha, porque são regra. Mas o que o
 * exorcista recolhe em campo não é kit: é bagagem, e precisava de um lugar
 * que não fosse a memória de quem está jogando.
 *
 * Lista simples de propósito. Quantidade, peso e preço transformariam uma
 * anotação de dez segundos num formulário, e o CAIN não pesa nada do que se
 * carrega.
 */
function Bagagem({ ficha, somenteLeitura, aoMudar }) {
  const [novo, setNovo] = useState('');
  const itens = bagagemDe(ficha);
  const pontos = Number.isFinite(Number(ficha.pontosDeKit))
    ? Math.max(0, Math.min(MAX_PONTOS_KIT, Number(ficha.pontosDeKit)))
    : MAX_PONTOS_KIT;

  const guardar = e => {
    e?.preventDefault?.();
    const antes = itens.length;
    const depois = guardarNaBagagem(ficha, novo);
    if (bagagemDe(depois).length > antes) aoMudar(depois);
    setNovo('');
  };

  return (
    <div className="cain-bagagem">
      <Trilha
        nome="Pontos de kit" valor={pontos} max={MAX_PONTOS_KIT} cor="#6E8A9E"
        somenteLeitura={somenteLeitura}
        nota="Cinco por missão. O item sai da mala na hora em que faz falta."
        aoMudar={v => aoMudar({ ...ficha, pontosDeKit: v })}
      />

      <div className="cain-bagagem-lista">
        <span className="cain-bagagem-titulo">Bagagem do exorcista</span>
        {itens.length === 0 && <p className="cain-bagagem-vazia">Nada registrado ainda.</p>}
        {itens.length > 0 && (
          <ul>
            {itens.map(item => (
              <li key={item.id}>
                <span>{item.nome}</span>
                {!somenteLeitura && (
                  <button
                    type="button" title={`Tirar ${item.nome} da bagagem`}
                    onClick={() => aoMudar(tirarDaBagagem(ficha, item.id))}
                  >✕</button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!somenteLeitura && itens.length < TETO_DA_BAGAGEM && (
          <form className="cain-bagagem-novo" onSubmit={guardar}>
            <input
              value={novo} placeholder="Lanterna, chave enferrujada, carta…"
              onChange={e => setNovo(e.target.value)}
            />
            <button type="submit" disabled={!novo.trim()}>Guardar</button>
          </form>
        )}
      </div>
    </div>
  );
}

function Rolador({ ficha, aoRolar }) {
  const [periciaId, setPericiaId] = useState(PERICIAS[0].id);
  const [vantagens, setVantagens] = useState(0);
  const [dificil, setDificil] = useState(false);
  const [arriscado, setArriscado] = useState(false);
  const [queimarPiedade, setQueimarPiedade] = useState(false);
  const [resultado, setResultado] = useState(null);

  // PSIQUE não mora no mapa de perícias: é a metade da categoria. Ela entra
  // na lista porque toda blasfêmia rola por ela — deixá-la de fora obrigaria
  // o jogador a contar na mão a cada uso de poder.
  const psique = psiqueDaCategoria(numeroDaCategoria(ficha.categoria));
  const pericia = periciaId === 'psique' ? psique : (Number(ficha.pericias?.[periciaId]) || 0);
  const piedade = Number(ficha.piedade) || 0;
  const agonia = podeAgoniaDivina({ piedade, usouNaSessao: ficha.agoniaUsadaNaSessao });
  const reservaZero = pericia + vantagens === 0;

  const rolar = () => {
    const r = rolarAcao({
      pericia, vantagens,
      piedade: queimarPiedade && agonia.pode ? piedade : 0,
      dificil, arriscado,
    });
    setResultado(r);
    setQueimarPiedade(false);
    aoRolar?.(r, { periciaId, queimouPiedade: queimarPiedade && agonia.pode });
  };

  const menor = resultado?.reserva?.minimo ? Math.min(...resultado.dados) : null;
  let jaDescartou = false;

  return (
    <div className="cain-rolagem">
      <div className="cain-rolagem-controles">
        <Campo rotulo="Perícia">
          <select value={periciaId} onChange={e => setPericiaId(e.target.value)}>
            {PERICIAS.map(p => (
              <option key={p.id} value={p.id}>
                {p.nome} · {Number(ficha.pericias?.[p.id]) || 0}D
              </option>
            ))}
            <option value="psique">{PERICIA_ESPECIAL.nome} · {psique}D</option>
          </select>
        </Campo>
        <Campo rotulo="Vantagens (até 3D)">
          <select value={vantagens} onChange={e => setVantagens(Number(e.target.value))}>
            {[0, 1, 2, 3].map(n => <option key={n} value={n}>+{n}D</option>)}
          </select>
        </Campo>
      </div>

      <div className="cain-interruptores">
        <label className="cain-interruptor" data-ligado={dificil ? 'sim' : 'nao'}>
          <input type="checkbox" checked={dificil} onChange={e => setDificil(e.target.checked)} />
          Difícil · só 6
        </label>
        <label className="cain-interruptor" data-ligado={arriscado ? 'sim' : 'nao'}>
          <input type="checkbox" checked={arriscado} onChange={e => setArriscado(e.target.checked)} />
          Arriscado
        </label>
        <label
          className="cain-interruptor"
          data-ligado={queimarPiedade ? 'sim' : 'nao'}
          title={agonia.pode ? `Queima ${piedade} de piedade: +${piedade}D` : agonia.motivo}
          style={agonia.pode ? undefined : { opacity: .45, cursor: 'not-allowed' }}
        >
          <input
            type="checkbox" checked={queimarPiedade} disabled={!agonia.pode}
            onChange={e => setQueimarPiedade(e.target.checked)}
          />
          Agonia Divina {agonia.pode ? `+${piedade}D` : ''}
        </label>
      </div>

      <p className="cain-detalhe">
        {reservaZero
          ? 'Reserva zero: rola 2d6 e fica com o menor.'
          : `${pericia + vantagens}d6${queimarPiedade && agonia.pode ? ` +${piedade}D de piedade` : ''} · ${dificil ? 'sucesso só no 6' : '4+ é sucesso'}`}
      </p>

      <button type="button" className="cain-rolar" onClick={rolar}>Rolar</button>

      {resultado && (
        <>
          <div className="cain-dados">
            {resultado.dados.map((d, i) => {
              let descartado = false;
              if (resultado.reserva.minimo && d !== menor) descartado = true;
              else if (resultado.reserva.minimo && d === menor && jaDescartou) descartado = true;
              else if (resultado.reserva.minimo && d === menor) jaDescartou = true;
              return (
                <i
                  key={i}
                  className="cain-dado"
                  data-sucesso={!descartado && d >= resultado.alvo ? 'sim' : 'nao'}
                  data-descartado={descartado ? 'sim' : 'nao'}
                  style={{ fontStyle: 'normal' }}
                >{d}</i>
              );
            })}
            {resultado.risco && (
              <>
                <span className="cain-dados-sep">risco</span>
                <i className="cain-dado risco" style={{ fontStyle: 'normal' }}>{resultado.risco.valor}</i>
              </>
            )}
          </div>
          <p className={`cain-veredito${resultado.acertou ? '' : ' falhou'}`}>
            {resumoDaRolagem(resultado)}
          </p>
          {resultado.risco && <p className="cain-detalhe">{resultado.risco.descricao}</p>}
        </>
      )}
    </div>
  );
}

/**
 * A FICHA DE EXORCISTA
 *
 * Quem pode o quê vem de acesso.mjs, não de um `if` escrito aqui: o jogador
 * edita a dele, o Admin edita todas, e os segredos só aparecem para o dono e
 * para o Admin. A tela não decide isso sozinha — e o servidor confere de novo.
 */
export default function FichaCain({ ficha, membro, aoMudar, aoRolar, fichaLiberada = '' }) {
  // fichaLiberada: a ficha que esta pessoa abriu com a senha, na porta da
  // mesa. Vale como dono mesmo quando a conta dela ainda não foi amarrada.
  const editavel = podeEditarFicha(ficha, membro, fichaLiberada);
  const veSegredos = podeVerSegredosDaFicha(ficha, membro, fichaLiberada);
  const somenteLeitura = !editavel;

  const estado = useMemo(() => estadoDoExorcista(ficha), [ficha]);
  // O selo de estado já diz a condição mais grave. Repeti-la como etiqueta
  // ao lado é ruído: o jogador lê "Ferido / Ferido" e para para entender se
  // são duas coisas. As etiquetas mostram só o que o selo deixou de fora.
  const condicoes = useMemo(
    () => condicoesDaFicha(ficha).filter(c => c.id !== estado.chave),
    [ficha, estado.chave],
  );
  const noTopo = periciasNoMaximo(ficha);

  const retratoRef = useRef(null);
  const mudar = campo => valor => aoMudar({ ...ficha, [campo]: valor });
  const aplicar = nova => aoMudar(nova);

  return (
    <div className="cain">
      {/* ── Registro ── */}
      <Painel aba="Exorcista registrado" classe="cain-largo">
        <div className="cain-registro">
          {/* O retrato é anexo de ficha de repartição: clicar no quadro abre
              o seletor. A imagem é reduzida antes de ser guardada porque ela
              vai junto com a ficha no banco, e uma foto de celular inteira
              estoura o teto de tamanho do documento sozinha. */}
          <div
            className={`cain-retrato${somenteLeitura ? '' : ' editavel'}`}
            role={somenteLeitura ? undefined : 'button'}
            tabIndex={somenteLeitura ? undefined : 0}
            title={somenteLeitura ? undefined : 'Anexar um retrato'}
            onClick={() => !somenteLeitura && retratoRef.current?.click()}
            onKeyDown={e => { if (!somenteLeitura && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); retratoRef.current?.click(); } }}
          >
            {ficha.foto
              ? <img src={ficha.foto} alt="" />
              : <span>{somenteLeitura ? 'Sem retrato de arquivo' : 'Anexar retrato'}</span>}
            {!somenteLeitura && ficha.foto && (
              <button
                type="button" className="cain-retrato-tirar" title="Remover o retrato"
                onClick={e => { e.stopPropagation(); mudar('foto')(''); }}
              >✕</button>
            )}
            <input
              ref={retratoRef} type="file" accept="image/*" hidden
              onChange={async e => {
                const arquivo = e.target.files?.[0];
                e.target.value = '';
                if (!arquivo) return;
                const leitor = new FileReader();
                leitor.onload = async ev => {
                  try { mudar('foto')(await compressImage(ev.target.result, 640, 640, 0.72)); }
                  catch (_) { mudar('foto')(ev.target.result); }
                };
                leitor.readAsDataURL(arquivo);
              }}
            />
          </div>
          <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
            <div className="cain-linha">
              <Campo rotulo="Nome">
                <input value={ficha.nome || ''} disabled={somenteLeitura}
                  onChange={e => mudar('nome')(e.target.value)} />
              </Campo>
              <Campo rotulo="XID">
                <input value={ficha.xid || ''} disabled={somenteLeitura}
                  onChange={e => mudar('xid')(e.target.value)} placeholder="0000000" />
              </Campo>
              <Campo rotulo="CID">
                <input value={ficha.cid || ''} disabled={somenteLeitura}
                  onChange={e => mudar('cid')(e.target.value)} placeholder="XXX" />
              </Campo>
            </div>
            <div className="cain-linha">
              <Campo rotulo="Agenda">
                <input value={ficha.agenda || ''} disabled={somenteLeitura}
                  onChange={e => mudar('agenda')(e.target.value)} />
              </Campo>
              <Campo rotulo="Blasfêmia">
                <select value={ficha.blasfemia || ''} disabled={somenteLeitura}
                  onChange={e => mudar('blasfemia')(e.target.value)}>
                  <option value="">—</option>
                  {BLASFEMIAS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </Campo>
            </div>
            <div>
              <span style={{ fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--tinta-fraca)' }}>
                Categoria
              </span>
              <div className="cain-categoria">
                {CATEGORIAS.map(c => (
                  <button
                    key={c} type="button" disabled={somenteLeitura}
                    aria-pressed={ficha.categoria === c}
                    onClick={() => mudar('categoria')(c)}
                  ><i>{c}</i></button>
                ))}
              </div>
            </div>
            <div>
              <span className="cain-estado" style={{ '--cor': estado.cor }}>
                <i />{estado.rotulo}
              </span>
              {condicoes.length > 0 && (
                <div className="cain-condicoes">
                  {condicoes.map(c => (
                    <span key={c.id} className="cain-condicao" style={{ '--cor': c.cor }} title={c.resumo}>
                      {c.nome}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Painel>

      {/* ── Perícias ── */}
      <Painel aba="Perícias registradas">
        <div className="cain-pericias">
          {PERICIAS.map(p => {
            const valor = Number(ficha.pericias?.[p.id]) || 0;
            const veredito = podeSubirPericia(ficha, p.id);
            return (
              <div key={p.id} className={`cain-pericia${valor >= MAX_PERICIA ? ' no-topo' : ''}`} title={p.resumo}>
                <b>{p.nome}</b>
                <div className="cain-pontos">
                  {[1, 2, 3].map(n => (
                    <button
                      key={n} type="button" className="cain-ponto"
                      data-cheio={n <= valor ? 'sim' : 'nao'}
                      disabled={somenteLeitura || (n > valor && !veredito.pode)}
                      title={n > valor && !veredito.pode ? veredito.motivo : `${p.nome}: ${n}`}
                      aria-label={`${p.nome}: ${n} de 3`}
                      onClick={() => aplicar(ajustarPericia(ficha, p.id, valor === n ? -1 : n - valor))}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="cain-psique">
          <div>
            <b>{PERICIA_ESPECIAL.nome}</b>
            <br />
            <small>{PERICIA_ESPECIAL.resumo}</small>
          </div>
          {/* Não é campo: é conta. Metade da categoria, para cima. Deixar
              digitável só convidaria a mesa a divergir do livro sem perceber. */}
          <strong className="cain-psique-valor" title="Metade da categoria, arredondada para cima">
            {psiqueDaCategoria(numeroDaCategoria(ficha.categoria))}
          </strong>
        </div>

        {noTopo >= 2 && (
          <p className="cain-nota-pericia">
            Duas perícias já estão em {MAX_PERICIA}. Pelo livro, é o limite de um exorcista.
          </p>
        )}
      </Painel>

      {/* ── Corpo e psique ── */}
      <Painel aba="Avaliação de saúde" classe={estado.chave === 'beira-da-morte' ? 'perigo' : ''}>
        <div className="cain-trilhas">
          <Trilha
            nome="Talismã de execução" valor={Number(ficha.estresse) || 0} max={estresseMaximo(ficha)}
            cor="#C79A3C" somenteLeitura={somenteLeitura}
            nota={`Enche: ganha ferimento, zera e o resto transborda. Cada ferimento tira uma caixa (hoje: ${estresseMaximo(ficha)}).`}
            aoMudar={v => {
              const atual = Number(ficha.estresse) || 0;
              aplicar(v > atual ? marcarEstresse(ficha, v - atual) : { ...ficha, estresse: v });
            }}
          />
          <Trilha
            nome="Ferimentos" valor={Number(ficha.ferimentos) || 0} max={MAX_FERIMENTOS}
            cor="#B4543A" somenteLeitura={somenteLeitura} morteNaUltima
            nota="Cada um deixa uma ação difícil. O terceiro leva à beira da morte."
            aoMudar={v => {
              const atual = Number(ficha.ferimentos) || 0;
              aplicar(v > atual ? ganharFerimento(ficha) : { ...ficha, ferimentos: v, condicoes: (ficha.condicoes || []).filter(c => v === 0 ? c !== 'ferido' && c !== 'beira-da-morte' : c !== 'beira-da-morte') });
            }}
          />
          <Trilha
            nome="Pulsos psíquicos" valor={Number(ficha.pulsos) || 0} max={MAX_PULSOS}
            cor="#7FA8C8" somenteLeitura={somenteLeitura}
            nota="Gaste 1 para usar a blasfêmia: +1D."
            aoMudar={v => aplicar({ ...ficha, pulsos: v })}
          />
          <Trilha
            nome="Pecado" valor={Number(ficha.pecado) || 0} max={MAX_PECADO}
            cor="#8E1F2B" somenteLeitura={somenteLeitura}
            nota="No limite, o exorcista verte de pecado no fim da cena."
            aoMudar={v => {
              const atual = Number(ficha.pecado) || 0;
              aplicar(marcarPecado(ficha, v - atual));
            }}
          />
          <Trilha
            nome="Piedade" valor={Number(ficha.piedade) || 0} max={MAX_PIEDADE}
            cor="#A98045" somenteLeitura={somenteLeitura}
            nota="Queime tudo em Agonia Divina: +1D por ponto."
            aoMudar={v => aplicar({ ...ficha, piedade: v })}
          />
        </div>
      </Painel>

      {/* ── Ganchos ── */}
      <Painel aba="Ganchos">
        {(ficha.ganchos || []).map((g, i) => {
          const cheio = (Number(g.cortes) || 0) >= CAIXAS_DE_GANCHO;
          return (
            <div key={i} className={`cain-gancho${cheio ? ' cheio' : ''}`}>
              <div className="cain-gancho-topo">
                <input
                  value={g.nome || ''} disabled={somenteLeitura}
                  placeholder={`Gancho ${i + 1}`}
                  onChange={e => {
                    const ganchos = (ficha.ganchos || []).map((x, j) => j === i ? { ...x, nome: e.target.value } : x);
                    aplicar({ ...ficha, ganchos });
                  }}
                />
                {cheio && !somenteLeitura && (
                  <button type="button" className="cain-resolver" onClick={() => aplicar(resolverGancho(ficha, i))}>
                    Resolver
                  </button>
                )}
              </div>
              <div className="cain-caixas">
                {Array.from({ length: CAIXAS_DE_GANCHO }, (_, n) => (
                  <button
                    key={n} type="button" className="cain-caixa"
                    style={{ '--cor': cheio ? '#C4414F' : '#A98045' }}
                    data-cheio={n < (Number(g.cortes) || 0) ? 'sim' : 'nao'}
                    disabled={somenteLeitura}
                    aria-label={`${g.nome || `Gancho ${i + 1}`}: corte ${n + 1}`}
                    onClick={() => {
                      const cortes = Number(g.cortes) || 0;
                      if (n + 1 <= cortes) {
                        const ganchos = (ficha.ganchos || []).map((x, j) => j === i ? { ...x, cortes: n } : x);
                        aplicar({ ...ficha, ganchos });
                      } else {
                        aplicar(cortarGancho(ficha, i).ficha);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
        <Campo rotulo="Aflições" classe="narrativa">
          <textarea
            value={ficha.aflicoes || ''} disabled={somenteLeitura}
            placeholder="Registradas aqui. Saem no debrief pós-missão."
            onChange={e => mudar('aflicoes')(e.target.value)}
          />
        </Campo>
      </Painel>

      {/* ── Rolagem ── */}
      <Painel aba="Métrica de avaliação de ação">
        <Rolador ficha={ficha} aoRolar={aoRolar} />
      </Painel>

      {/* ── Inventário ── */}
      <Painel aba="Inventário">
        <Bagagem ficha={ficha} somenteLeitura={somenteLeitura} aoMudar={aplicar} />
      </Painel>

      {/* ── Narrativa ── */}
      <Painel aba="História">
        <Campo rotulo="Como chegou até aqui" classe="narrativa">
          <textarea
            value={ficha.historia || ''} disabled={somenteLeitura}
            onChange={e => mudar('historia')(e.target.value)}
          />
        </Campo>
      </Painel>

      <Painel aba="Vínculo de virtude">
        <Campo rotulo="A promessa que sustenta e limita" classe="narrativa">
          <textarea
            value={ficha.vinculo || ''} disabled={somenteLeitura}
            onChange={e => mudar('vinculo')(e.target.value)}
          />
        </Campo>
      </Painel>

      {/* ── Segredos ── */}
      {veSegredos && (
        <Painel aba="Segredos" classe="segredo cain-largo">
          <p className="cain-segredo-aviso">
            Só você e o Admin veem este painel. O servidor confere isso também —
            não é só a tela escondendo.
          </p>
          <Campo rotulo="O que ninguém mais sabe" classe="narrativa">
            <textarea
              value={ficha.segredos || ''} disabled={somenteLeitura}
              onChange={e => mudar('segredos')(e.target.value)}
            />
          </Campo>
        </Painel>
      )}
    </div>
  );
}
