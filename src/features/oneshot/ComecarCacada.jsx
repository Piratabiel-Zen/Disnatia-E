import { useState } from 'react';
import {
  MODOS, SEGUNDOS_PADRAO, SEGUNDOS_MINIMO, SEGUNDOS_MAXIMO, cacadaParaComecar,
} from './cacada.mjs';
import './comecar-cacada.css';

/**
 * O BOTÃO DA CAÇADA
 *
 * Dois cliques no meio de uma cena: quem vem e por quanto tempo. Qualquer
 * coisa maior que isso o Mestre não usa no calor do momento, e uma caçada
 * que chega atrasada não é caçada, é aviso.
 */
export default function ComecarCacada({ cacada, oQuePadrao = '', aoComecar, aoEncerrar }) {
  const [aberto, setAberto] = useState(false);
  const [segundos, setSegundos] = useState(SEGUNDOS_PADRAO);
  const [modo, setModo] = useState('corrida');
  const [oQue, setOQue] = useState('');
  const correndo = Boolean(cacada?.ativa);

  if (correndo) {
    return (
      <button type="button" className="cc-parar" onClick={() => aoEncerrar?.()}>
        ■ Encerrar caçada
      </button>
    );
  }

  return (
    <div className="cc" data-aberto={aberto ? '' : undefined}>
      <button
        type="button" className="cc-puxador"
        onClick={() => setAberto(a => !a)}
        aria-expanded={aberto}
      >▲ Caçada</button>

      {aberto && (
        <div className="cc-painel">
          <input
            value={oQue}
            onChange={e => setOQue(e.target.value)}
            placeholder={oQuePadrao || 'O que vem atrás'}
            maxLength={60}
          />

          <div className="cc-modos">
            {Object.values(MODOS).map(m => (
              <button
                key={m.id} type="button"
                data-escolhido={modo === m.id ? '' : undefined}
                onClick={() => setModo(m.id)}
                title={m.dica}
              >{m.nome}</button>
            ))}
          </div>
          <p className="cc-dica">{MODOS[modo].dica}</p>

          {modo === 'corrida' && (
            <label className="cc-tempo">
              <span>{segundos}s</span>
              <input
                type="range" min={SEGUNDOS_MINIMO} max={SEGUNDOS_MAXIMO} step={5}
                value={segundos}
                onChange={e => setSegundos(Number(e.target.value))}
              />
            </label>
          )}

          <button
            type="button" className="cc-ir"
            onClick={() => {
              aoComecar?.({ oQue: oQue.trim() || oQuePadrao, segundos, modo });
              setAberto(false);
            }}
          >Soltar</button>
        </div>
      )}
    </div>
  );
}
