import { useEffect, useRef, useState } from 'react';
import { SEGUNDOS_DE_ESPERA, resolverEsconderijo } from './esconderijo.mjs';
import './esconderijo.css';

/**
 * DENTRO DO ARMÁRIO
 *
 * Esta é a única tela do sistema que BLOQUEIA de propósito, e o motivo é o
 * oposto do habitual: quem se escondeu não está mais vendo a casa. A fresta
 * entre as portas é tudo o que sobra — e é por ela que a sombra passa.
 *
 * Os três segundos e meio de espera são o recurso inteiro. Durante eles a
 * pessoa não pode fazer nada, não sabe o que vai acontecer, e vê uma sombra
 * atravessar a fresta devagar. Dar o resultado na hora transformaria a
 * decisão mais tensa da noite num aviso de sistema.
 *
 * O resultado é sorteado no COMEÇO, e não no fim: assim a sombra que passa
 * já sabe se vai parar, e a encenação pode ser honesta com ela mesma — a
 * sombra que vai pegar você hesita um instante antes.
 */
export default function Esconderijo({ cacada, imagem = '', aoTerminar, aoFechar }) {
  const [resultado] = useState(() => resolverEsconderijo(cacada));
  const [fase, setFase] = useState('entrando');
  const tempos = useRef([]);
  const contou = useRef(false);

  useEffect(() => {
    tempos.current.push(setTimeout(() => setFase('esperando'), 700));
    tempos.current.push(setTimeout(
      () => setFase(resultado.passou ? 'passou' : 'pego'),
      SEGUNDOS_DE_ESPERA * 1000,
    ));
    return () => tempos.current.forEach(clearTimeout);
  }, [resultado.passou]);

  // O aviso para a mesa sai uma vez só, quando o resultado aparece: avisar
  // no início entregaria o fim antes da sombra passar.
  useEffect(() => {
    if (fase !== 'passou' && fase !== 'pego') return;
    if (contou.current) return;
    contou.current = true;
    aoTerminar?.(resultado);
  }, [fase, resultado, aoTerminar]);

  const acabou = fase === 'passou' || fase === 'pego';

  return (
    <div className="esc" data-fase={fase} role="dialog" aria-label="Escondido">
      {/* As duas portas. Fecham sobre a tela e deixam a fresta no meio. */}
      <i className="esc-porta esc-porta-e" aria-hidden="true" />
      <i className="esc-porta esc-porta-d" aria-hidden="true" />

      <div className="esc-fresta" aria-hidden="true">
        {/* A sombra que atravessa. Quando vai pegar, ela para no meio. */}
        <i className="esc-sombra" data-para={resultado.passou ? undefined : ''} />
      </div>

      {/* O QUADRO DO SUSTO.
          As portas abrindo para o nada era o momento mais fraco da cena:
          abriam, e não havia nada ali. Agora o que se vê é a coisa — a
          imagem que o Mestre escolheu, se escolheu alguma, e senão a
          silhueta desenhada. Ela vem de longe e chega perto rápido. */}
      {fase === 'pego' && (
        <div className="esc-coisa" aria-hidden="true">
          {imagem
            ? <img src={imagem} alt="" />
            : (
              <svg viewBox="0 0 120 200" preserveAspectRatio="xMidYMax meet">
                <path
                  d="M60 14c13 0 21 11 21 25 0 9-3 15-7 20 14 7 24 21 26 41
                     l8 98H12l8-98c2-20 12-34 26-41-4-5-7-11-7-20 0-14 8-25 21-25Z"
                  fill="#0A0A0C"
                />
              </svg>
            )}
        </div>
      )}
      {fase === 'pego' && <i className="esc-clarao" aria-hidden="true" />}

      {/* A respiração: um clarão fraquíssimo no ritmo de quem prende o ar e
          solta devagar. É o único movimento durante a espera. */}
      <i className="esc-folego" aria-hidden="true" />

      <div className="esc-texto">
        {fase === 'entrando' && <p>Você entra e puxa a porta.</p>}
        {fase === 'esperando' && <p className="esc-quieto">Fique quieto.</p>}
        {acabou && (
          <>
            <p className="esc-fim" data-pego={fase === 'pego' ? '' : undefined}>
              {resultado.motivo}
            </p>
            <button type="button" onClick={() => aoFechar?.(resultado)}>
              {resultado.passou ? 'Sair do armário' : 'Encarar'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
