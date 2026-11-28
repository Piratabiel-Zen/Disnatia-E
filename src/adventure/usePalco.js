/**
 * Mede os quadros desta tela e escolhe o palco (ver palcoAutomatico.mjs).
 *
 * COMO A MEDIÇÃO EVITA MENTIR
 *
 * - só mede em Imersivo: no Leve a cenografia já foi cortada pela pessoa,
 *   e medir ali seria decidir por ela;
 * - não mede com a aba escondida: o navegador congela o rAF e todo
 *   intervalo vira enorme — a máquina pareceria péssima por estar
 *   minimizada;
 * - descarta os primeiros quadros depois de cada mudança: montar a cena,
 *   decodificar o mapa e trocar de aba produzem quadros ruins que não
 *   dizem nada sobre o regime;
 * - mede em janelas curtas e espaçadas. Medir o tempo todo custaria um
 *   rAF permanente só para vigiar, que é exatamente o tipo de desperdício
 *   que este módulo existe para combater.
 */
import { useEffect, useRef, useState } from 'react';
import { medianaDe, proximoPalco } from './palcoAutomatico.mjs';

const QUADROS_POR_JANELA = 45;      // ~0,75s numa tela de 60Hz
const QUADROS_DE_AQUECIMENTO = 12;  // o começo de cada janela não conta
const PAUSA_ENTRE_JANELAS_MS = 6000;

export function usePalco(quality) {
  const [palco, setPalco] = useState(0);
  const estado = useRef({ palco: 0, folgas: 0 });

  useEffect(() => {
    document.documentElement.dataset.palco = String(palco);
  }, [palco]);

  useEffect(() => {
    if (quality !== 'cinematic') {
      /* No Leve o palco volta a zero: as duas escolhas não se somam, e
         quem voltar para o Imersivo merece começar com tudo e deixar a
         máquina dizer de novo o que aguenta. */
      estado.current = { palco: 0, folgas: 0 };
      setPalco(0);
      return undefined;
    }

    let vivo = true;
    let pedido = 0;
    let agendado = 0;

    const janela = () => {
      if (!vivo || document.hidden) return agendar();
      const intervalos = [];
      let anterior = performance.now();
      let n = 0;
      const passo = agora => {
        if (!vivo) return;
        const dt = agora - anterior;
        anterior = agora;
        if (++n > QUADROS_DE_AQUECIMENTO) intervalos.push(dt);
        if (n < QUADROS_POR_JANELA) { pedido = requestAnimationFrame(passo); return; }
        if (!document.hidden) {
          const seguinte = proximoPalco(estado.current, medianaDe(intervalos));
          if (seguinte.palco !== estado.current.palco) setPalco(seguinte.palco);
          estado.current = seguinte;
        }
        agendar();
      };
      pedido = requestAnimationFrame(passo);
      return undefined;
    };

    const agendar = () => { agendado = window.setTimeout(janela, PAUSA_ENTRE_JANELAS_MS); };

    /* A primeira medição espera a cena assentar: medir durante a montagem
       mediria a montagem. */
    agendado = window.setTimeout(janela, 2500);

    return () => {
      vivo = false;
      cancelAnimationFrame(pedido);
      window.clearTimeout(agendado);
    };
  }, [quality]);

  return palco;
}

export default usePalco;
