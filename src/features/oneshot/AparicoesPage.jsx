import { useCallback, useEffect, useMemo, useState } from 'react';
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { deleteDoc, setDoc } from 'firebase/firestore';
import { col, docIn } from '../../core/campaign';
import { ehMestre } from '../../core/acesso.mjs';
import { comprimirParaDocumento } from '../../core/media';
import { useMembro } from '../acesso/useMembro';
import { observarLiberados } from '../acesso/observarLiberados';
import InspetorDeObjeto from './InspetorDeObjeto.jsx';
import { ZOOM_QUE_REVELA } from './inspecao.mjs';
import {
  INTENSIDADES, DURACOES, INTENSIDADE_PADRAO, DURACAO_PADRAO,
  avisoDeAssombracao, intensidadePorId, duracaoPorId,
} from './assombracao.mjs';
import { publicarAssombracao } from '../../core/liveChannel';
import {
  TIPOS_DE_APARICAO, alternarPessoa, aparicaoNova, cartaoDeAparicao, estaRevelada,
  jaNoMural, quemVe, revelarParaTodos, tipoDaAparicao,
} from './aparicoes.mjs';
import './paginas-one-shot.css';
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
  // Qual objeto está na mão de quem olha. Null é ninguém examinando.
  const [examinando, setExaminando] = useState(null);
  // O tom da assombração vale para todas: o Mestre acerta uma vez e depois
  // é só apertar, sem gastar dois cliques no meio da cena.
  const [intensidade, setIntensidade] = useState(INTENSIDADE_PADRAO);
  const [duracao, setDuracao] = useState(DURACAO_PADRAO);
  const [fichas, setFichas] = useState([]);
  const [abertaId, setAbertaId] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [cartoes, setCartoes] = useState([]);

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

  // Os cartões do mural entram só para saber o que já está pregado: pregar
  // duas vezes a mesma aparição enche a parede de repetição.
  useEffect(() => {
    if (!mestre) return undefined;
    return onSnapshot(col('mural_cartoes'), snap => {
      setCartoes(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    }, () => {});
  }, [mestre, campanha?.id]);

  const pregarNoMural = useCallback(async aparicao => {
    const cartao = cartaoDeAparicao(aparicao, {
      // Espalha: cartão novo sempre no mesmo ponto esconde o anterior.
      x: 0.26 + Math.random() * 0.46,
      y: 0.3 + Math.random() * 0.36,
    });
    const { id, ...dados } = cartao;
    await setDoc(docIn('mural_cartoes', id), dados);
  }, []);

  const nomePorUid = useMemo(() => Object.fromEntries(
    fichas.filter(f => f.dono).map(f => [String(f.dono), f.nome || 'personagem']),
  ), [fichas]);

  const salvar = useCallback(async aparicao => {
    const { id, ...dados } = aparicao;
    setAparicoes(atuais => atuais.map(a => (String(a.id) === String(id) ? aparicao : a)));
    await setDoc(docIn('aparicoes', String(id)), dados, { merge: true });
  }, []);

  /**
   * Assombrar a mesa com esta aparição.
   *
   * Vem DEPOIS de `salvar` de propósito: ele está na lista de dependências
   * daqui, e lista que lê um `const` declarado mais abaixo estoura em
   * tempo de RENDERIZAÇÃO — build limpo, teste limpo, tela preta na mesa.
   * Já aconteceu uma vez neste projeto e tem teste guardando.
   *
   * Revela ANTES de assombrar, e de propósito: depois do susto a mesa vai
   * querer olhar a coisa de perto, e aparição que escureceu a tela e sumiu
   * sem deixar nada para examinar frustra em vez de assustar.
   */
  const assombrar = useCallback(async aparicao => {
    if (!aparicao?.liberadoParaTodos) {
      await salvar({ ...revelarParaTodos(aparicao, true), id: aparicao.id });
    }
    await publicarAssombracao(avisoDeAssombracao({
      aparicao, intensidade, duracao,
    }));
  }, [intensidade, duracao, salvar]);


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
                  {/* A imagem vira botão: examinar é o gesto principal da
                      galeria, e esconder isso atrás de um ícone de lupa faria
                      metade da mesa nunca descobrir que dá para aproximar.
                      Nada aqui avisa que o objeto esconde coisa — quem
                      examina, acha. */}
                  {a.imagem
                    ? (
                      <button
                        type="button" className="apa-examinar"
                        onClick={() => setExaminando(a)}
                        title="Examinar de perto"
                      >
                        <img src={a.imagem} alt={a.titulo || ''} />
                      </button>
                    )
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

      {/* Os dois controles da assombração ficam FORA de cada aparição, e
          valem para todas: o Mestre acerta o tom uma vez e depois é só
          apertar. Escolher duração e intensidade dentro de cada linha
          custaria dois cliques no meio da cena, que é exatamente quando
          ele não tem dois cliques sobrando. */}
      {mestre && (
        <div className="apa-tom">
          <label>
            <span>Intensidade</span>
            <select value={intensidade} onChange={e => setIntensidade(e.target.value)}>
              {INTENSIDADES.map(i => <option key={i.id} value={i.id}>{i.nome} — {i.resumo}</option>)}
            </select>
          </label>
          <label>
            <span>Duração</span>
            <select value={duracao} onChange={e => setDuracao(e.target.value)}>
              {DURACOES.map(d => <option key={d.id} value={d.id}>{d.nome} — {d.resumo}</option>)}
            </select>
          </label>
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
            {/* Pregar no mural fica ao lado de revelar porque são as duas
                coisas que o Mestre faz com uma aparição no meio de uma cena:
                mostrar agora, ou deixar à vista para a mesa trabalhar em cima. */}
            {jaNoMural(a, cartoes) ? (
              <span className="apa-no-mural" title="Já está pregada no mural">no mural</span>
            ) : (
              <button
                type="button" className="apa-pregar" onClick={() => pregarNoMural(a)}
                title="Cria um cartão no mural, com a mesma plateia desta aparição"
              >Pregar</button>
            )}
            <button
              type="button" className="apa-revelar"
              onClick={() => salvar({ ...revelarParaTodos(a, !a.liberadoParaTodos), id: a.id })}
              title={a.liberadoParaTodos ? 'Recolher' : 'Revelar à mesa'}
            >{a.liberadoParaTodos ? 'Recolher' : 'Revelar'}</button>
            {/* ASSOMBRAR é diferente de revelar: revelar põe a aparição à
                vista para a mesa consultar; assombrar escurece a tela de
                todo mundo AGORA, onde quer que a pessoa esteja. Fica ao
                lado porque é decisão da mesma hora, mas é a mais pesada
                das três e por isso tem cor própria. */}
            <button
              type="button" className="apa-assombrar"
              onClick={() => assombrar(a)}
              title={`Escurece a tela da mesa: ${intensidadePorId(intensidade).nome}, ${duracaoPorId(duracao).nome.toLowerCase()}`}
            >Assombrar</button>
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

          {/* O QUE SÓ APARECE PARA QUEM PROCURA.
              Os dois campos são opcionais e o que ficar em branco não existe:
              objeto sem detalhe e sem verso ainda amplia e gira, e ampliar
              uma foto velha já é metade da cena. */}
          <fieldset className="apa-escondido">
            <legend>O que está escondido</legend>
            <label>
              <span>Ao aproximar</span>
              <textarea
                rows={2} value={aberta.detalheDePerto || ''}
                placeholder="Tem alguém na janela do fundo. Só se vê de perto."
                onChange={e => salvar({ ...aberta, detalheDePerto: e.target.value })}
              />
              <em>Aparece quando o jogador passa de {Math.round(ZOOM_QUE_REVELA * 100)}% de zoom. Some ao afastar.</em>
            </label>
            <label>
              <span>No verso</span>
              <textarea
                rows={2} value={aberta.versoTexto || ''}
                placeholder="A data escrita a lápis. O bilhete atrás do retrato."
                onChange={e => salvar({ ...aberta, versoTexto: e.target.value })}
              />
              <em>Preenchido, a mesa ganha o botão de virar o objeto.</em>
            </label>
          </fieldset>

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

      {/* O objeto na mão. Fica por último porque abre por cima de tudo. */}
      {examinando && (
        <InspetorDeObjeto
          objeto={examinando}
          aoFechar={() => setExaminando(null)}
        />
      )}
    </div>
  );
}
