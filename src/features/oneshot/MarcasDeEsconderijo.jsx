/**
 * AS ESTRELAS DO MAPA
 *
 * Pontos brancos minúsculos onde o Mestre marcou que há onde se esconder.
 * Pulsam dois segundos quando nascem e depois ficam ali, quietos, brilhando
 * de leve — presentes para quem procurar, invisíveis para quem não procura.
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
  const visiveis = marcasDoMapa(marcas, mapaId);

  /* Um só temporizador, armado para o fim do pulso mais recente, em vez de
     um intervalo correndo a noite toda: fora dos dois segundos não há nada
     para redesenhar, e um `setInterval` ligado durante a sessão inteira é
     bateria de celular indo embora por um ponto parado. */
  const [, redesenhar] = useState(0);
  const pulsando = visiveis.filter(m => aindaPulsando(m));
  useEffect(() => {
    if (!pulsando.length) return undefined;
    const ultimo = Math.max(...pulsando.map(m => Number(m.em) || 0));
    const falta = Math.max(0, ultimo + DURACAO_DO_PULSO - Date.now()) + 40;
    const t = window.setTimeout(() => redesenhar(n => n + 1), falta);
    return () => window.clearTimeout(t);
  }, [pulsando.length, pulsando.map(m => m.em).join(',')]);

  if (!visiveis.length) return null;

  return (
    <div className={`mes${marcando ? ' mes-marcando' : ''}`} aria-hidden="true">
      {visiveis.map(m => (
        <span
          key={m.id || `${m.mapa}-${m.x}-${m.y}`}
          className={`mes-estrela${aindaPulsando(m) ? ' mes-pulso' : ''}`}
          style={{ left: `${m.x}%`, top: `${m.y}%` }}
        />
      ))}
    </div>
  );
}
