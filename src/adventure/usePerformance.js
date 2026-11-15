import { useEffect, useState } from 'react';

/* O modo nasce Imersivo. Antes nascia Leve, e como a escolha é guardada por
   aparelho, a mesma pessoa via duas mesas diferentes: o notebook onde ela
   trocou para Imersivo e o desktop onde nunca trocou. Quem quiser menos pode
   descer para Leve — isso agora tira só cenografia (fundo cósmico, poeira do
   mapa, cenas de classe), nunca a resposta da interface. */
export function loadQuality() {
  try { return localStorage.getItem('dinastia_quality_v1') === 'light' ? 'light' : 'cinematic'; } catch { return 'cinematic'; }
}

export function usePerformance() {
  const [quality, setQuality] = useState(loadQuality);
  useEffect(() => {
    document.documentElement.dataset.quality = quality;
    try { localStorage.setItem('dinastia_quality_v1', quality); } catch { /* Private browsing. */ }
    const visibility = () => { document.documentElement.dataset.away = String(document.hidden); };
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [quality]);
  return [quality, setQuality];
}
