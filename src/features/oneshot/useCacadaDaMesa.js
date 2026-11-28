/**
 * A caçada, lida uma vez para a sessão inteira.
 *
 * Em gancho próprio porque dois lugares precisam do mesmo documento — a
 * faixa do alto, que existe em todas as abas, e o contador grande dentro
 * do mapa. Duas assinaturas do mesmo documento custariam duas leituras
 * por mudança e, pior, poderiam divergir por um quadro: a faixa num
 * segundo e o mapa noutro, com a mesa olhando para os dois.
 */
import { useEffect, useState } from 'react';
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { docIn } from '../../core/campaign';

export function useCacadaDaMesa(ehNoite) {
  const [cacada, setCacada] = useState(null);
  useEffect(() => {
    if (!ehNoite) { setCacada(null); return undefined; }
    const un = onSnapshot(docIn('config', 'cacada'),
      d => setCacada(d.exists() ? d.data() : null),
      () => setCacada(null));
    return () => un();
  }, [ehNoite]);
  return cacada;
}

export default useCacadaDaMesa;
