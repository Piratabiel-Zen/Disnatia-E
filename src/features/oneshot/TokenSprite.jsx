/**
 * O TOKEN QUE ANDA
 *
 * Desenha um quadro da folha do personagem, virado para o lado em que ele
 * está se movendo. Parado, mostra o quadro de repouso; sendo arrastado,
 * a caminhada roda.
 *
 * A direção vem do MOVIMENTO e não de um botão: quem arrasta o token para
 * a esquerda já disse para onde o personagem está indo, e pedir que diga
 * de novo num controle separado seria trabalho em dobro no meio da cena.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  spriteDe, recorteDoQuadro, direcaoDoMovimento,
  quadroNoTempo, QUADRO_PARADO, QUADROS_POR_SEGUNDO,
} from './sprites.mjs';
import './token-sprite.css';

export default function TokenSprite({ spriteId, x, y, andando, trocarLados, tamanho }) {
  const sprite = spriteDe(spriteId);
  const [direcao, setDirecao] = useState('frente');
  const [quadro, setQuadro] = useState(QUADRO_PARADO);
  const anterior = useRef({ x, y });
  const desde = useRef(0);

  /* A direção é recalculada a cada posição nova. Guardada em ref e não em
     estado, a posição anterior não provoca render sozinha — o render vem
     da direção, e só quando ela realmente muda. */
  useEffect(() => {
    const dx = x - anterior.current.x;
    const dy = y - anterior.current.y;
    anterior.current = { x, y };
    const nova = direcaoDoMovimento(dx, dy, direcao);
    if (nova !== direcao) setDirecao(nova);
  }, [x, y, direcao]);

  /* O relógio da caminhada só existe enquanto se anda. Parado, ele é
     desligado e o sprite volta ao quadro de repouso — um intervalo
     correndo a noite toda por token, com cinco tokens no mapa, é bateria
     indo embora para desenhar cinco figuras imóveis. */
  useEffect(() => {
    if (!andando) { setQuadro(QUADRO_PARADO); return undefined; }
    desde.current = Date.now();
    const t = window.setInterval(
      () => setQuadro(quadroNoTempo(Date.now() - desde.current, sprite?.quadros || 1)),
      Math.round(1000 / QUADROS_POR_SEGUNDO),
    );
    return () => window.clearInterval(t);
  }, [andando, sprite?.quadros]);

  if (!sprite) return null;
  const r = recorteDoQuadro(sprite, direcao, quadro, trocarLados);

  return (
    <span
      className="tksp"
      aria-hidden="true"
      style={{
        backgroundImage: `url(${sprite.arquivo})`,
        backgroundSize: r.tamanho,
        backgroundPosition: `${r.x}% ${r.y}%`,
        /* A figura é mais alta que larga; o token é quadrado. Encaixar
           pela altura e deixar a largura seguir a proporção evita o
           personagem achatado, que é o que acontece quando se força o
           sprite no quadrado. */
        height: tamanho ? `${tamanho}px` : '100%',
        width: tamanho ? `${Math.round(tamanho * r.proporcao)}px` : 'auto',
        aspectRatio: `${sprite.largura} / ${sprite.altura}`,
      }}
    />
  );
}
