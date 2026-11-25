import { useMemo, useState } from 'react';
import { RULES_DATA } from '../../data/gameData';
import { CATEGORIAS, parseRuleBody, regraCombina, resumoDaRegra } from './regrasTexto.mjs';
import './regras.css';
import { useBuscaAdiada } from '../../core/useBuscaAdiada';

// MANUAL DE REGRAS
//
// Este manual é consultado DURANTE a partida — alguém pergunta "quanto custa
// o Movimento?" no meio do combate. Então a página tem dois trabalhos que
// puxam para lados opostos: achar um número em dois segundos, e ser
// agradável de ler de cabo a rabo.
//
// Resolvi os dois com a mesma estrutura: índice fixo à esquerda para achar, e
// um painel de leitura à direita com tipografia de verdade. O que mudou de
// fato não foi o layout, foi o texto: o corpo das regras é interpretado em
// blocos (tabela de resultado, verbete, aviso, passo) em vez de sair como
// parágrafo cinza uniforme. É isso que tira o cansaço.

function BlocoResultados({ itens }) {
  return (
    <dl className="regra-resultados">
      {itens.map((item, i) => (
        <div key={i}>
          <dt>{item.condicao}</dt>
          <dd>{item.efeito}</dd>
        </div>
      ))}
    </dl>
  );
}

function BlocoVerbetes({ itens }) {
  return (
    <div className="regra-verbetes">
      {itens.map((item, i) => (
        <article key={i}>
          <span className="regra-verbete-icone" aria-hidden="true">{item.icone}</span>
          <div>
            <b>{item.nome}</b>
            <p>{item.texto}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function BlocoPassos({ itens }) {
  return (
    <ol className="regra-passos">
      {itens.map((item, i) => (
        <li key={i}><span aria-hidden="true">{item.numero}</span><p>{item.texto}</p></li>
      ))}
    </ol>
  );
}

function CorpoDaRegra({ texto }) {
  const blocos = useMemo(() => parseRuleBody(texto), [texto]);
  return (
    <div className="regra-corpo">
      {blocos.map((bloco, i) => {
        switch (bloco.tipo) {
          case 'titulo': return <h4 key={i} className="regra-secao">{bloco.texto}</h4>;
          case 'aviso': return <p key={i} className="regra-aviso">{bloco.texto}</p>;
          case 'resultados': return <BlocoResultados key={i} itens={bloco.itens} />;
          case 'verbetes': return <BlocoVerbetes key={i} itens={bloco.itens} />;
          case 'passos': return <BlocoPassos key={i} itens={bloco.itens} />;
          case 'lista': return <ul key={i} className="regra-lista">{bloco.itens.map((t, j) => <li key={j}>{t}</li>)}</ul>;
          default: return <div key={i}>{bloco.itens.map((t, j) => <p key={j}>{t}</p>)}</div>;
        }
      })}
    </div>
  );
}

export default function RulesSection() {
  const [busca, setBusca] = useState('');
  // O filtro espera o dedo parar; a letra no campo, não.
  const buscaAdiado = useBuscaAdiada(busca);
  const [categoria, setCategoria] = useState('todas');
  const [abertaId, setAbertaId] = useState(RULES_DATA[0]?.title || '');

  const visiveis = useMemo(
    () => RULES_DATA.filter(r => (categoria === 'todas' || r.cat === categoria) && regraCombina(r, busca)),
    [busca, categoria],
  );
  const aberta = visiveis.find(r => r.title === abertaId) || visiveis[0] || null;

  const contarNa = id => RULES_DATA.filter(r => (id === 'todas' || r.cat === id) && regraCombina(r, busca)).length;

  return (
    <div className="regras-page">
      <header className="regras-topo">
        <div className="regras-titulo">
          <span className="regras-kicker">As leis do Cosmos</span>
          <h2>Manual de Regras</h2>
        </div>
        <div className="regras-busca">
          <span aria-hidden="true">⌕</span>
          <input
            value={busca}
            onChange={event => setBusca(event.target.value)}
            placeholder="Buscar: vigor, sangramento, crítico…"
            aria-label="Buscar nas regras"
          />
          {busca && <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca">×</button>}
        </div>
      </header>

      <nav className="regras-filtros" aria-label="Categorias">
        {CATEGORIAS.map(cat => {
          const total = contarNa(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              className={categoria === cat.id ? 'is-on' : ''}
              disabled={total === 0}
              aria-pressed={categoria === cat.id}
              onClick={() => setCategoria(cat.id)}
            >
              <span aria-hidden="true">{cat.icone}</span>{cat.rotulo}<i>{total}</i>
            </button>
          );
        })}
      </nav>

      {visiveis.length === 0 ? (
        <p className="regras-vazio" role="status">Nenhuma regra fala sobre “{busca}”.</p>
      ) : (
        <div className="regras-corpo">
          <aside className="regras-indice" aria-label="Lista de regras">
            {visiveis.map(regra => (
              <button
                key={regra.title}
                type="button"
                className={aberta?.title === regra.title ? 'is-on' : ''}
                onClick={() => setAbertaId(regra.title)}
              >
                <span className="regras-indice-icone" aria-hidden="true">{regra.icon}</span>
                <span className="regras-indice-texto">
                  <b>{regra.title}</b>
                  <small>{resumoDaRegra(regra.body)}</small>
                </span>
              </button>
            ))}
          </aside>

          {aberta && (
            <article className="regra-aberta" key={aberta.title}>
              <header>
                <span className="regra-aberta-icone" aria-hidden="true">{aberta.icon}</span>
                <div>
                  <span className="regra-aberta-cat">{CATEGORIAS.find(c => c.id === aberta.cat)?.rotulo || aberta.cat}</span>
                  <h3>{aberta.title}</h3>
                </div>
              </header>
              <CorpoDaRegra texto={aberta.body} />
            </article>
          )}
        </div>
      )}
    </div>
  );
}
