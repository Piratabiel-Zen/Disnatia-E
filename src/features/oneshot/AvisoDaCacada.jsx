/**
 * O RELÓGIO DA CAÇADA, EM QUALQUER TELA
 *
 * O contador já existia, inteiro e bonito — dentro do mapa. Só que a
 * mesa não fica toda no mapa: um está na ficha somando pontos, outro no
 * mural, outro nas regras, e no celular o mapa de combate nem é
 * carregado, porque mapa grande não se controla com o polegar.
 *
 * Então, quando o Mestre soltava a caçada, metade da mesa não via
 * relógio nenhum. E um relógio que só parte das pessoas vê não serve
 * para o que ele existe: o aperto é coletivo ou não é aperto.
 *
 * Esta faixa é o mesmo relógio, curto, preso no alto da tela em todas as
 * abas. No mapa ela não aparece — lá o contador grande já está em cena, e
 * dois relógios com o mesmo número é pior que nenhum.
 */
import React, { useEffect, useState } from 'react';
import { estadoDaCacada, modoDaCacada } from './cacada.mjs';
import './aviso-da-cacada.css';

export default function AvisoDaCacada({ cacada, mapaAtual = '', escondido = false }) {
  const [agora, setAgora] = useState(() => Date.now());

  /* O relógio só bate enquanto há caçada. Um intervalo correndo a sessão
     inteira para desenhar nada é bateria indo embora — e esta faixa vive
     em TODAS as abas, então seria em todas elas. */
  const ativa = Boolean(cacada?.ativa);
  useEffect(() => {
    if (!ativa || escondido) return undefined;
    const t = window.setInterval(() => setAgora(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [ativa, escondido]);

  if (escondido) return null;
  const estado = estadoDaCacada(cacada, { agora, mapaAtual });
  if (!estado.ativa) return null;

  const modo = modoDaCacada(cacada?.modo);
  const seg = Math.max(0, Math.round(estado.restante));
  const relogio = `${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`;

  return (
    <div
      className={`avc${estado.inescapavel ? ' avc-cerco' : ''}`}
      style={{ '--avc-tensao': estado.tensao }}
      role="status"
      aria-live="off"   /* o número muda a cada segundo: anunciar cada um
                           transformaria o leitor de tela num metrônomo */
    >
      <span className="avc-pulso" aria-hidden="true" />
      <b className="avc-relogio">{relogio}</b>
      <span className="avc-nome">
        {estado.inescapavel ? 'não adianta esperar' : modo?.nome || 'alguma coisa está vindo'}
      </span>
    </div>
  );
}
