import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ESTADOS_DA_PISTA, TIPOS_DE_CARTAO,
  cartaoNovo, contagemPorTipo, definirEstado, desligar, estadoDoCartao,
  filtrarMural, ligar, linhasDoMural, moverCartao, prender, removerCartao,
  tipoDoCartao,
} from './mural.mjs';
import './mural.css';

/* O barbante com folga.
   Uma reta entre dois pontos é um diagrama. Um fio que cede no meio é um
   barbante pendurado entre dois alfinetes.
   Dois ajustes que a primeira versão errou: o ponto de controle de uma
   quadrática só puxa a curva até cerca da metade do caminho, então a folga
   precisa ser o dobro da queda desejada; e o viewBox é 100x100 esticado para
   um retângulo largo, o que encolhe a unidade vertical. Sem compensar as
   duas, o fio fica visualmente reto. */
function fioEntre(x1, y1, x2, y2) {
  const distancia = Math.hypot(x2 - x1, y2 - y1);
  const folga = Math.min(0.18, 0.05 + distancia * 0.34);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 + folga;
  return `M ${x1 * 100} ${y1 * 100} Q ${mx * 100} ${my * 100} ${x2 * 100} ${y2 * 100}`;
}

function Cartao({
  cartao, apagado, ligandoDaqui, podeEditar, aoMedir,
  aoArrastar, aoSoltar, aoAlfinete, aoMudar, aoRemover,
}) {
  const [editando, setEditando] = useState(!cartao.titulo);
  const tipo = tipoDoCartao(cartao);
  const estado = estadoDoCartao(cartao);
  const temEstado = cartao.tipo === 'pista' || cartao.tipo === 'documento';
  const arrastando = useRef(false);

  const comecar = evento => {
    if (!podeEditar || evento.target.closest('button,input,textarea')) return;
    evento.currentTarget.setPointerCapture(evento.pointerId);
    arrastando.current = true;
  };
  const mover = evento => {
    if (!arrastando.current) return;
    aoArrastar(cartao.id, evento);
  };
  const soltar = evento => {
    if (!arrastando.current) return;
    arrastando.current = false;
    try { evento.currentTarget.releasePointerCapture(evento.pointerId); } catch { /* já solto */ }
    aoSoltar(cartao.id, evento);
  };

  const proximoEstado = () => {
    const i = ESTADOS_DA_PISTA.findIndex(e => e.id === estado.id);
    return ESTADOS_DA_PISTA[(i + 1) % ESTADOS_DA_PISTA.length].id;
  };

  return (
    <article
      className={`mural-cartao${apagado ? ' apagado' : ''}${ligandoDaqui ? ' ligando' : ''}`}
      style={{ left: `${cartao.x * 100}%`, top: `${cartao.y * 100}%`, '--cor': tipo.cor }}
      onPointerDown={comecar}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      aria-label={`${tipo.nome}: ${cartao.titulo || 'sem título'}`}
      ref={el => aoMedir?.(cartao.id, el)}
    >
      <button
        type="button" className="mural-alfinete"
        title={ligandoDaqui ? 'Clique em outro cartão para ligar' : 'Puxar barbante daqui'}
        aria-label={`Puxar barbante de ${cartao.titulo || tipo.nome}`}
        onClick={e => { e.stopPropagation(); aoAlfinete(cartao.id); }}
      />

      <header className="mural-aba"><i>{tipo.icone}</i>{tipo.nome}</header>

      <div className="mural-corpo">
        {editando && podeEditar ? (
          <>
            <input
              autoFocus value={cartao.titulo} placeholder="O quê?"
              onChange={e => aoMudar({ ...cartao, titulo: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && setEditando(false)}
            />
            <textarea
              value={cartao.texto} placeholder="O que se sabe até agora…"
              onChange={e => aoMudar({ ...cartao, texto: e.target.value })}
            />
            <div className="mural-acoes">
              <button type="button" className="mural-acao" onClick={() => setEditando(false)}>Pronto</button>
              <button type="button" className="mural-acao" onClick={() => aoRemover(cartao.id)}>Tirar do mural</button>
            </div>
          </>
        ) : (
          <>
            <h3 onDoubleClick={() => podeEditar && setEditando(true)}>
              {cartao.titulo || 'Sem título'}
            </h3>
            {cartao.texto ? <p onDoubleClick={() => podeEditar && setEditando(true)}>{cartao.texto}</p> : null}
            {podeEditar && (
              <div className="mural-acoes">
                <button type="button" className="mural-acao" onClick={() => setEditando(true)}>Editar</button>
              </div>
            )}
          </>
        )}

        {temEstado && (
          <button
            type="button" className="mural-estado" style={{ '--cor-estado': estado.cor }}
            title={estado.resumo}
            disabled={!podeEditar}
            onClick={() => aoMudar({ ...cartao, estado: proximoEstado() })}
          ><i />{estado.nome}</button>
        )}
      </div>
    </article>
  );
}

/**
 * O MURAL
 *
 * Contínuo: é o mesmo mural a campanha inteira, não um por sessão.
 *
 * Arrastar NÃO grava no banco. Durante o arraste a posição sobe pelo canal
 * vivo (`aoArrastarVivo`), e só o lugar onde o cartão foi solto é gravado
 * (`aoMover`). Sem isso, um arraste de três segundos vira centenas de
 * escritas e a cota diária da mesa acaba numa sessão — e com seis pessoas
 * mexendo ao mesmo tempo, acaba antes.
 */
export default function MuralInvestigacao({
  cartoes = [], ligacoes = [], podeEditar = true, autor = '',
  aoMudarCartoes, aoMudarLigacoes, aoArrastarVivo,
}) {
  const quadro = useRef(null);
  // Altura de cada cartão, em fração do quadro, para o barbante sair do
  // alfinete e não do meio do papel. O alfinete fica na borda de cima, e os
  // cartões têm alturas diferentes — então isto é medido, não chutado.
  const [alturas, setAlturas] = useState({});
  const medir = useCallback((id, elemento) => {
    const caixa = quadro.current?.getBoundingClientRect();
    if (!elemento || !caixa?.height) return;
    const fracao = elemento.offsetHeight / caixa.height;
    setAlturas(atual => (Math.abs((atual[id] || 0) - fracao) < 0.002 ? atual : { ...atual, [id]: fracao }));
  }, []);
  // O ponto do alfinete: topo do cartão, no meio.
  const noAlfinete = useCallback(
    cartao => ({ x: cartao.x, y: cartao.y - (alturas[cartao.id] || 0.12) / 2 }),
    [alturas],
  );
  const [busca, setBusca] = useState('');
  const [tiposLigados, setTiposLigados] = useState([]);
  const [ligandoDe, setLigandoDe] = useState(null);
  const [arrastando, setArrastando] = useState(null);
  const [ponteiro, setPonteiro] = useState(null);
  const [abrindoNovo, setAbrindoNovo] = useState(false);

  const visiveis = useMemo(
    () => filtrarMural(cartoes, { tipos: tiposLigados, busca }),
    [cartoes, tiposLigados, busca],
  );
  const contagem = useMemo(() => contagemPorTipo(cartoes), [cartoes]);
  const fios = useMemo(() => linhasDoMural(cartoes, ligacoes), [cartoes, ligacoes]);

  const posicaoNoQuadro = useCallback(evento => {
    const caixa = quadro.current?.getBoundingClientRect();
    if (!caixa) return null;
    return {
      x: prender((evento.clientX - caixa.left) / caixa.width),
      y: prender((evento.clientY - caixa.top) / caixa.height),
    };
  }, []);

  const arrastar = useCallback((id, evento) => {
    const p = posicaoNoQuadro(evento);
    if (!p) return;
    setArrastando({ id, ...p });
    // Sobe pelo canal vivo: barato e efêmero.
    aoArrastarVivo?.(id, p);
  }, [posicaoNoQuadro, aoArrastarVivo]);

  const soltar = useCallback((id, evento) => {
    const p = posicaoNoQuadro(evento);
    setArrastando(null);
    if (!p) return;
    // Só agora grava.
    aoMudarCartoes?.(moverCartao(cartoes, id, p.x, p.y));
  }, [posicaoNoQuadro, cartoes, aoMudarCartoes]);

  const alfinete = useCallback(id => {
    if (!podeEditar) return;
    if (!ligandoDe) { setLigandoDe(id); return; }
    if (ligandoDe === id) { setLigandoDe(null); return; }
    // Clicar numa dupla já ligada desfaz: é o mesmo gesto, e ninguém precisa
    // caçar um botão de apagar barbante.
    const jaLigados = ligacoes.some(l =>
      (l.de === ligandoDe && l.para === id) || (l.de === id && l.para === ligandoDe));
    aoMudarLigacoes?.(jaLigados
      ? desligar(ligacoes, ligandoDe, id)
      : ligar(ligacoes, ligandoDe, id, autor));
    setLigandoDe(null);
  }, [podeEditar, ligandoDe, ligacoes, aoMudarLigacoes, autor]);

  const criar = tipo => {
    const novo = cartaoNovo({ tipo, autor, x: 0.3 + Math.random() * 0.4, y: 0.3 + Math.random() * 0.35 });
    aoMudarCartoes?.([...cartoes, novo]);
  };

  const comPosicaoViva = cartao =>
    (arrastando && arrastando.id === cartao.id ? { ...cartao, x: arrastando.x, y: arrastando.y } : cartao);

  const origemLigacao = ligandoDe ? cartoes.find(c => String(c.id) === String(ligandoDe)) : null;

  return (
    <div className="mural">
      <div className="mural-barra">
        <h2>Mural</h2>
        <input
          className="mural-busca" value={busca} placeholder="Buscar no mural…"
          onChange={e => setBusca(e.target.value)}
        />
        <div className="mural-filtros">
          {TIPOS_DE_CARTAO.map(t => {
            const ligado = tiposLigados.includes(t.id);
            return (
              <button
                key={t.id} type="button" className="mural-filtro"
                style={{ '--cor': t.cor }} data-ligado={ligado ? 'sim' : 'nao'}
                onClick={() => setTiposLigados(ligado
                  ? tiposLigados.filter(x => x !== t.id)
                  : [...tiposLigados, t.id])}
              >{t.icone} {t.nome} <b>{contagem[t.id]}</b></button>
            );
          })}
        </div>
        {podeEditar && (
          <div className="mural-pregar">
            <button
              type="button" className="mural-novo"
              aria-expanded={abrindoNovo} aria-haspopup="true"
              onClick={() => setAbrindoNovo(v => !v)}
            >Pregar no mural</button>
            {abrindoNovo && (
              <div className="mural-escolha" role="menu">
                {TIPOS_DE_CARTAO.map(t => (
                  <button
                    key={t.id} type="button" role="menuitem" style={{ '--cor': t.cor }}
                    onClick={() => { criar(t.id); setAbrindoNovo(false); }}
                  ><i>{t.icone}</i>{t.nome}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className="mural-quadro" ref={quadro}
        onPointerMove={e => ligandoDe && setPonteiro(posicaoNoQuadro(e))}
        onClick={e => { if (ligandoDe && e.target === e.currentTarget) setLigandoDe(null); }}
      >
        <svg className="mural-fios" viewBox="0 0 100 100" preserveAspectRatio="none">
          {fios.map(f => {
            const de = comPosicaoViva(cartoes.find(c => String(c.id) === f.chave.split('::')[0]) || {});
            const para = comPosicaoViva(cartoes.find(c => String(c.id) === f.chave.split('::')[1]) || {});
            return (
              <path
                key={f.chave}
                className={`mural-fio${ligandoDe && (String(de.id) === ligandoDe || String(para.id) === ligandoDe) ? ' realce' : ''}`}
                d={(() => {
                  const a = noAlfinete({ ...de, x: de.x ?? f.x1, y: de.y ?? f.y1 });
                  const z = noAlfinete({ ...para, x: para.x ?? f.x2, y: para.y ?? f.y2 });
                  return fioEntre(a.x, a.y, z.x, z.y);
                })()}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {origemLigacao && ponteiro && (
            <path
              className="mural-fio-alvo" vectorEffect="non-scaling-stroke"
              d={(() => {
                const a = noAlfinete(comPosicaoViva(origemLigacao));
                return fioEntre(a.x, a.y, ponteiro.x, ponteiro.y);
              })()}
            />
          )}
        </svg>

        {cartoes.map(c => (
          <Cartao
            key={c.id}
            cartao={comPosicaoViva(c)}
            aoMedir={medir}
            apagado={!visiveis.has(String(c.id))}
            ligandoDaqui={String(ligandoDe) === String(c.id)}
            podeEditar={podeEditar}
            aoArrastar={arrastar}
            aoSoltar={soltar}
            aoAlfinete={alfinete}
            aoMudar={novo => aoMudarCartoes?.(cartoes.map(x => x.id === novo.id ? novo : x))}
            aoRemover={id => {
              const r = removerCartao(cartoes, ligacoes, id);
              aoMudarCartoes?.(r.cartoes);
              aoMudarLigacoes?.(r.ligacoes);
            }}
          />
        ))}

        {cartoes.length === 0 && (
          <div className="mural-vazio">
            <strong>O mural está vazio</strong>
            <span>
              Pregue a primeira pista. Depois puxe barbante entre os alfinetes
              para dizer o que conversa com o quê.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
