import { useState } from 'react';
import {
  ATUALIZADO_EM, CONTROLADOR, DIREITOS_ART_18, POLITICA_DE_PRIVACIDADE, TERMOS_DE_USO,
} from './textos.mjs';
import './legal.css';

/* Documento legal: uma coluna de leitura, um índice ao lado. Nada de cartões
   nem acentos — isto é para ser LIDO, e a única coisa que ajuda a ler um texto
   longo é medida curta, entrelinha generosa e um sumário que não se mexe. */
function Documento({ doc }) {
  return (
    <>
      <nav className="legal-indice" aria-label="Seções">
        {doc.secoes.map(s => (
          <a key={s.id} href={`#${s.id}`}>{s.titulo}</a>
        ))}
      </nav>
      <article className="legal-corpo">
        <h1>{doc.titulo}</h1>
        <p className="legal-resumo">{doc.resumo}</p>
        <p className="legal-data">Atualizado em {ATUALIZADO_EM}</p>

        {doc.secoes.map(secao => (
          <section key={secao.id} id={secao.id}>
            <h2>{secao.titulo}</h2>
            {(secao.paragrafos || []).map((p, i) => <p key={i}>{p}</p>)}
            {secao.lista && (
              <ul>{secao.lista.map((item, i) => <li key={i}>{item}</li>)}</ul>
            )}
            {secao.direitos && (
              <ol className="legal-direitos">
                {DIREITOS_ART_18.map(d => (
                  <li key={d.inciso}>
                    <b>{d.inciso} — {d.titulo}.</b> {d.texto}
                  </li>
                ))}
              </ol>
            )}
            {(secao.depois || []).map((p, i) => <p key={i}>{p}</p>)}
          </section>
        ))}

        <section id="contato">
          <h2>Contato</h2>
          {CONTROLADOR.nome || CONTROLADOR.contato ? (
            <p>
              {CONTROLADOR.nome && <>Responsável: <b>{CONTROLADOR.nome}</b>. </>}
              {CONTROLADOR.contato && <>Contato: <b>{CONTROLADOR.contato}</b>.</>}
            </p>
          ) : (
            <p className="legal-pendencia">{CONTROLADOR.aviso}</p>
          )}
        </section>
      </article>
    </>
  );
}

export default function LegalPage({ inicial }) {
  const padrao = inicial
    || (typeof location !== 'undefined' && location.hash.includes('termos') ? 'termos' : 'privacidade');
  const [aba, setAba] = useState(padrao);
  return (
    <div className="legal">
      <div className="legal-abas" role="tablist">
        <button role="tab" aria-selected={aba === 'privacidade'} onClick={() => setAba('privacidade')}>
          Privacidade
        </button>
        <button role="tab" aria-selected={aba === 'termos'} onClick={() => setAba('termos')}>
          Termos de uso
        </button>
      </div>
      <div className="legal-pagina">
        <Documento doc={aba === 'termos' ? TERMOS_DE_USO : POLITICA_DE_PRIVACIDADE} />
      </div>
    </div>
  );
}
