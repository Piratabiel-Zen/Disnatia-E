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

export default function AvisoDaCacada({ cacada, desvio = 0, mapaAtual = '', escondido = false }) {
  const [agora, setAgora] = useState(() => Date.now());

  /* O relógio só bate enquanto há caçada. Um intervalo correndo a sessão
     inteira para desenhar nada é bateria indo embora — e esta faixa vive
     em TODAS as abas, então seria em todas elas.

     O `agora` é reposto ao começar: ele era capturado na montagem e só
     andava no primeiro tique, 500ms depois. Numa aba aberta há meia hora,
     a faixa nascia mostrando meia hora de caçada e só então se corrigia —
     o primeiro número, que é o que a pessoa olha, era o errado. */
  const ativa = Boolean(cacada?.ativa);
  useEffect(() => {
    if (!ativa || escondido) return undefined;
    setAgora(Date.now());
    const t = window.setInterval(() => setAgora(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [ativa, escondido]);

  if (escondido) return null;
  const estado = estadoDaCacada(cacada, { agora, mapaAtual, desvio });

  /* Enquanto o Mestre diz que há caçada, TODA tela mostra caçada.
     Antes a faixa sumia quando a conta dizia que o tempo tinha acabado —
     e a conta depende do relógio do aparelho. Um celular adiantado
     apagava o relógio da mesa inteira enquanto o vulto corria atrás
     dela. Relógio errado pode errar o número; não pode esconder que a
     coisa está acontecendo. Quem encerra é o Mestre, e aí o documento
     chega apagado para todos. */
  if (!estado.ativa && !ativa) return null;

  const modo = modoDaCacada(cacada?.modo);
  const seg = Math.max(0, Math.round(estado.ativa ? estado.restante : 0));
  const relogio = `${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`;

  return (
    <div
      className={`avc${estado.inescapavel ? ' avc-cerco' : ''}`}
      /* No aperto do fim (relógio deste aparelho já zerado, Mestre ainda
         com a caçada no ar) a tensão vai ao máximo: 00:00 calmo seria a
         pior leitura possível. */
      style={{ '--avc-tensao': estado.ativa ? estado.tensao : 1 }}
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
