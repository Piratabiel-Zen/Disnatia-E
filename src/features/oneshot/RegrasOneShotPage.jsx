import { useMemo, useState } from 'react';
import { SECOES_DAS_REGRAS, buscarNasRegras } from './regrasOneShot.mjs';
import Emblema from './Emblema.jsx';
import './paginas-one-shot.css';
import './regras-one-shot.css';

/**
 * O LIVRO DA NOITE
 *
 * As regras deixam de ser uma pilha de seções e viram capítulos numerados,
 * lidos um por vez, com um índice ao lado.
 *
 * POR QUE UM POR VEZ, se antes estavam todos abertos de propósito: o motivo
 * de antes era o relance — o Mestre que procura "quanto é pavor máximo" não
 * quer clicar em três títulos. Esse caso continua resolvido, e por um
 * caminho melhor: a BUSCA. Digitando, o livro vira lista e mostra todos os
 * trechos que batem, de todos os capítulos, de uma vez.
 *
 * Então são dois modos, e cada um serve a uma hora da mesa:
 *
 *  - LENDO: capítulo a capítulo, com gravura, numeral e "próximo". É como
 *    alguém lê antes de a sessão começar, e é o que faz parecer livro;
 *  - PROCURANDO: a busca abre tudo que bate, achatado. É a mesa esperando.
 *
 * O índice marca onde a pessoa está e o que já passou — numa one-shot
 * ninguém volta para reler, então saber o que falta é o que importa.
 */
export default function RegrasOneShotPage() {
  const [busca, setBusca] = useState('');
  const [abertoId, setAbertoId] = useState(SECOES_DAS_REGRAS[0]?.id || '');

  const termo = busca.trim();
  const achados = useMemo(() => (termo ? buscarNasRegras(termo) : []), [termo]);

  const capitulos = useMemo(
    () => [...SECOES_DAS_REGRAS].sort((a, b) => (a.ordem || 0) - (b.ordem || 0)),
    [],
  );
  const indice = Math.max(0, capitulos.findIndex(c => c.id === abertoId));
  const aberto = capitulos[indice] || capitulos[0];
  const anterior = capitulos[indice - 1];
  const proximo = capitulos[indice + 1];

  const irPara = id => {
    setAbertoId(id);
    setBusca('');
  };

  return (
    <div className="osr" data-modo={termo ? 'procurando' : 'lendo'}>
      <header className="osr-barra">
        <div>
          <h2>O Livro da Noite</h2>
          <p>One Shot Terror — uma noite, gente comum, e algo que não deveria estar ali.</p>
        </div>
        <input
          value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Procurar no livro…" autoComplete="off"
        />
      </header>

      {/* PROCURANDO: tudo que bate, de todos os capítulos, achatado. */}
      {termo ? (
        <div className="osr-achados">
          {achados.length === 0 ? (
            <p className="osr-nada">
              Nada no livro fala disso. Pergunte ao Mestre — numa one-shot, ele decide.
            </p>
          ) : achados.map(secao => (
            <section key={secao.id} className="osr-secao">
              <h3>
                <button type="button" className="osr-ir" onClick={() => irPara(secao.id)}>
                  <i>{secao.numeral}</i> {secao.titulo}
                </button>
              </h3>
              {secao.corpo.map((paragrafo, i) => <p key={i}>{paragrafo}</p>)}
            </section>
          ))}
        </div>
      ) : (
        <div className="osr-livro">
          {/* O ÍNDICE. Marca onde a pessoa está e o que já passou: numa
              one-shot ninguém volta para reler, então o que importa é saber
              o que falta. */}
          <nav className="osr-indice" aria-label="Capítulos">
            <h3>Capítulos</h3>
            <ol>
              {capitulos.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setAbertoId(c.id)}
                    data-atual={c.id === aberto?.id ? '' : undefined}
                    data-lido={i < indice ? '' : undefined}
                  >
                    <i>{c.numeral}</i>
                    <span>{c.titulo}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          {aberto && (
            <article className="osr-capitulo" key={aberto.id}>
              <header className="osr-capitulo-topo">
                <Emblema nome={aberto.emblema} />
                <span className="osr-numeral">Capítulo {aberto.numeral}</span>
                <h3>{aberto.titulo}</h3>
                {aberto.abertura && <p className="osr-abertura">{aberto.abertura}</p>}
              </header>

              <div className="osr-corpo">
                {aberto.corpo.map((paragrafo, i) => <p key={i}>{paragrafo}</p>)}
              </div>

              <footer className="osr-passos">
                <button
                  type="button" disabled={!anterior}
                  onClick={() => anterior && setAbertoId(anterior.id)}
                >
                  {anterior ? `← ${anterior.titulo}` : '← início'}
                </button>
                <span className="osr-conta">{indice + 1} de {capitulos.length}</span>
                <button
                  type="button" className="osr-adiante" disabled={!proximo}
                  onClick={() => proximo && setAbertoId(proximo.id)}
                >
                  {proximo ? `${proximo.titulo} →` : 'fim do livro'}
                </button>
              </footer>
            </article>
          )}
        </div>
      )}

      <p className="osr-pe">
        {capitulos.length} capítulos. O que não estiver aqui, o Mestre decide na hora —
        é mesa de uma noite, e discussão de regra custa a cena.
      </p>
    </div>
  );
}
