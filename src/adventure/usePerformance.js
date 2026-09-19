import { useEffect, useState } from 'react';

export function loadQuality() {
  try { return localStorage.getItem('dinastia_quality_v1') === 'cinematic' ? 'cinematic' : 'light'; } catch { return 'light'; }
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
