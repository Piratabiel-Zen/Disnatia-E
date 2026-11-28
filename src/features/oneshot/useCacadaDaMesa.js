/**
 * A caçada, lida uma vez para a sessão inteira.
 *
 * Em gancho próprio porque dois lugares precisam do mesmo documento — a
 * faixa do alto, que existe em todas as abas, e o contador grande dentro
 * do mapa. Duas assinaturas do mesmo documento custariam duas leituras
 * por mudança e, pior, poderiam divergir por um quadro: a faixa num
 * segundo e o mapa noutro, com a mesa olhando para os dois.
 *
 * O DESVIO DE RELÓGIO
 *
 * `comecouEm` é o `Date.now()` do Mestre. Quem lê comparava isso com o
 * próprio relógio, e relógio de celular erra: um aparelho 25 segundos
 * adiantado, numa caçada de 20, calculava que o tempo já tinha acabado e
 * não mostrava relógio NENHUM. Era esse o "o timer não aparece para
 * todos" — e quanto mais curta a caçada, mais gente ficava sem ver.
 *
 * O documento chega milissegundos depois de ser escrito. Então, quando a
 * caçada começa com esta tela aberta, a hora de chegada é a hora de
 * começo, e a diferença entre ela e `comecouEm` é exatamente o desvio
 * deste aparelho. Medido uma vez por caçada, cancela o erro inteiro —
 * e esse é o caso normal: a mesa está toda junta quando o Mestre solta.
 *
 * Sem hora de servidor não existe como separar "o relógio está errado"
 * de "o tempo já passou": a conta é a mesma. Então a escolha é pelo erro
 * menos grave. Quem der refresh no meio de uma caçada ganha a contagem
 * um pouco mais folgada (o relógio recomeça do total) — ninguém se
 * machuca, e o Mestre encerra para todos de uma vez. O contrário, tratar
 * desvio como tempo gasto, era o defeito: tirava o relógio da tela de
 * quem mais precisava dele.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { docIn } from '../../core/campaign';

export function useCacadaDaMesa(ehNoite) {
  const [cacada, setCacada] = useState(null);
  const [desvio, setDesvio] = useState(0);
  /* Guarda a caçada que já foi medida. Sem isso, cada mudança no
     documento (o Mestre trocando o modo, por exemplo) remediria o desvio
     no meio da contagem e o relógio pularia. */
  const medida = useRef({ comecouEm: null });

  useEffect(() => {
    if (!ehNoite) { setCacada(null); setDesvio(0); return undefined; }
    medida.current = { comecouEm: null };
    const un = onSnapshot(docIn('config', 'cacada'),
      d => {
        const doc = d.exists() ? d.data() : null;
        const inicio = Number(doc?.comecouEm) || null;
        if (!doc?.ativa) {
          setDesvio(0);
        } else if (inicio && inicio !== medida.current.comecouEm) {
          // Primeira notícia desta caçada nesta tela: hora de medir.
          setDesvio(Date.now() - inicio);
        }
        medida.current = { comecouEm: doc?.ativa ? inicio : null };
        setCacada(doc);
      },
      () => setCacada(null));
    return () => un();
  }, [ehNoite]);

  /* Objeto estável: sem isto, cada render da sessão criaria um novo e
     remontaria quem depende dele por identidade. */
  return useMemo(() => ({ cacada, desvio }), [cacada, desvio]);
}

export default useCacadaDaMesa;
