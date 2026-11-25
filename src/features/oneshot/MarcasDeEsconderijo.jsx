/**
 * AS ESTRELAS DO MAPA
 *
 * Pontos brancos minúsculos onde o Mestre aponta que há onde se esconder.
 * Piscam dois segundos e somem.
 *
 * Elas não recebem clique: o mapa inteiro precisa continuar arrastável por
 * baixo, e uma estrela de 6px que intercepta o dedo é um jeito garantido de
 * fazer o Mestre errar o arrasto. Quem apaga é o modo de marcação, que
 * trata o clique no mapa e procura a marca mais próxima.
 */
import React, { useEffect, useState } from 'react';
import { marcasDoMapa, aindaPulsando, DURACAO_DO_PULSO } from './esconderijosMarcados.mjs';
import './marcas-de-esconderijo.css';

export default function MarcasDeEsconderijo({ marcas, mapaId, marcando }) {
  const [, redesenhar] = useState(0);
  const visiveis = marcasDoMapa(marcas, mapaId);

  /* Um só temporizador, armado para o instante em que a última estrela
     vence, em vez de um intervalo correndo a noite toda: fora dos dois
     segundos não há nada para redesenhar, e um `setInterval` ligado
     durante a sessão inteira é bateria de celular indo embora à toa.

     O +40ms é folga: acordar no milissegundo exato às vezes recalcula com
     a estrela ainda viva por arredondamento, e aí ela fica até o próximo
     motivo de redesenho — que pode não vir. */
  const ultimoFim = visiveis.length
    ? Math.max(...visiveis.map(m => Number(m.em) || 0)) + DURACAO_DO_PULSO
    : 0;
  useEffect(() => {
    if (!ultimoFim) return undefined;
    const t = window.setTimeout(() => redesenhar(n => n + 1),
      Math.max(0, ultimoFim - Date.now()) + 40);
    return () => window.clearTimeout(t);
  }, [ultimoFim]);

  if (!visiveis.length) return null;

  return (
    <div className={`mes${marcando ? ' mes-marcando' : ''}`} aria-hidden="true">
      {visiveis.map(m => (
        <span
          key={m.id || `${m.mapa}-${m.x}-${m.y}`}
          className="mes-estrela"  /* toda estrela visível está pulsando */
          style={{ left: `${m.x}%`, top: `${m.y}%` }}
        />
      ))}
    </div>
  );
}
