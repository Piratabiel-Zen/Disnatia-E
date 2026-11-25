/**
 * O PAINEL DE QUEM ESTÁ NO ARMÁRIO — só na tela do Mestre.
 *
 * Fica no canto, pequeno, e só existe quando há alguém se escondendo. Um
 * painel permanente com "ninguém escondido" seria mais uma coisa ocupando
 * a tela de quem já tem mapa, tokens, névoa e relógio para olhar.
 *
 * A linha de quem está ENTRANDO pulsa e conta os segundos: é o que o
 * Mestre narra por cima. As outras duas ficam quietas — já aconteceram.
 */
import React, { useEffect, useState } from 'react';
import { MOMENTOS, vistaDoMestre, frase, risco } from './vigiaDoEsconderijo.mjs';
import './vigia-do-esconderijo.css';

export default function VigiaDoEsconderijo({ registros }) {
  const [agora, setAgora] = useState(() => Date.now());

  /* O relógio só bate enquanto há alguém entrando. Um intervalo correndo
     a sessão inteira para atualizar um painel vazio é o tipo de coisa que
     não aparece em teste nenhum e come bateria de celular. */
  const alguemEntrando = (registros || []).some(r => r?.estado === MOMENTOS.ENTRANDO);
  useEffect(() => {
    if (!alguemEntrando) return undefined;
    const t = window.setInterval(() => setAgora(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [alguemEntrando]);

  const linhas = vistaDoMestre(registros, agora);
  if (!linhas.length) return null;

  return (
    <aside className="vig" aria-label="Quem está se escondendo">
      <h4 className="vig-topo">No escuro</h4>
      <ul className="vig-lista">
        {linhas.map(r => (
          <li key={r.quem} className={`vig-linha vig-${r.estado}`}>
            <span className="vig-marca" aria-hidden="true">
              {r.estado === MOMENTOS.ENTRANDO ? '◍' : r.estado === MOMENTOS.ESCONDIDO ? '◉' : '✕'}
            </span>
            <span className="vig-texto">
              <b>{frase(r)}</b>
              <small>{risco(r)}</small>
            </span>
            <span className="vig-relogio">
              {r.estado === MOMENTOS.ENTRANDO ? `${r.segundos}s` : `há ${r.desdeQuando}s`}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
