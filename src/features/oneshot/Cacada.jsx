import { useEffect, useRef, useState } from 'react';
import { estadoDaCacada, batidaEmMs, modoDaCacada } from './cacada.mjs';
import './cacada.css';

/**
 * O RELÓGIO DA CAÇADA
 *
 * Tudo o que esta tela faz é uma coisa: deixar o tempo VISÍVEL enquanto ele
 * aperta. O número é grande porque é nele que a pessoa decide; o anel em
 * volta esvazia porque número sozinho não dá a sensação de estar acabando;
 * e a tela inteira pulsa no compasso de um coração que acelera, porque é
 * assim que o corpo conta tempo quando está com medo.
 *
 * O anel usa `stroke-dashoffset` e não uma barra: círculo fechando lê como
 * cerco, barra lê como download.
 *
 * NADA AQUI BLOQUEIA A TELA. A caçada acontece enquanto a mesa olha o mapa,
 * conversa e decide para onde corre — um painel modal mataria exatamente a
 * cena que ele deveria apoiar.
 */

const RAIO = 34;
const VOLTA = 2 * Math.PI * RAIO;

export default function Cacada({ cacada, desvio = 0, mapaAtual, aoEscapar, mestre = false }) {
  const [agora, setAgora] = useState(() => Date.now());
  const avisou = useRef(false);

  // Dez vezes por segundo: o número precisa cair sem engasgo, e um quadro a
  // cada 100ms é barato e já parece contínuo.
  useEffect(() => {
    if (!cacada?.ativa) return undefined;
    setAgora(Date.now());   /* o capturado na montagem já está velho */
    const t = setInterval(() => setAgora(Date.now()), 100);
    return () => clearInterval(t);
  }, [cacada?.ativa]);

  /* `desvio`: o relógio deste aparelho em relação ao de quem soltou a
     caçada. Ver useCacadaDaMesa. */
  const estado = estadoDaCacada(cacada, { agora, mapaAtual, desvio });
  const modo = modoDaCacada(cacada?.modo);

  /* Quem encerra no banco é o Mestre — se cada jogador escrevesse ao ver o
     tempo zerar, seriam cinco gravações para o mesmo fim, e a primeira que
     chegasse já teria resolvido. A tela de todos para sozinha de qualquer
     jeito, porque o fim é calculado do relógio e não de um aviso. */
  useEffect(() => {
    if (!cacada?.ativa) { avisou.current = false; return; }
    if (!estado.escapou || avisou.current || !mestre) return;
    avisou.current = true;
    aoEscapar?.();
  }, [estado.escapou, cacada?.ativa, mestre, aoEscapar]);

  if (!estado.ativa) return null;

  const batida = batidaEmMs(estado.tensao);

  return (
    <div
      className="cac"
      data-tensao={estado.tensao > 0.62 ? 'alta' : undefined}
      data-cerco={estado.inescapavel ? '' : undefined}
      style={{ '--cac-tensao': estado.tensao.toFixed(3), '--cac-batida': `${batida}ms` }}
      role="status" aria-live="off"
    >
      {/* O pulso vermelho nas bordas. Fica atrás de tudo e não recebe
          clique: a mesa continua jogando com ele na tela. */}
      <i className="cac-pulso" aria-hidden="true" />

      <div className="cac-relogio">
        <svg viewBox="0 0 80 80" aria-hidden="true">
          <circle className="cac-trilho" cx="40" cy="40" r={RAIO} />
          {!estado.inescapavel && (
            <circle
              className="cac-arco" cx="40" cy="40" r={RAIO}
              style={{
                strokeDasharray: VOLTA,
                strokeDashoffset: VOLTA * (1 - estado.fracao),
              }}
            />
          )}
          {estado.inescapavel && <circle className="cac-arco cac-arco-cerco" cx="40" cy="40" r={RAIO} />}
        </svg>
        <strong>{estado.restante}</strong>
        <small>{estado.inescapavel ? 'sem saída' : 'segundos'}</small>
      </div>

      <p className="cac-quem">
        {cacada.oQue || 'Alguma coisa'}
        <span>{modo.inescapavel ? 'não dá para correr' : 'está atrás de vocês'}</span>
      </p>
    </div>
  );
}
