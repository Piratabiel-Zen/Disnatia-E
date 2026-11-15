import { useEffect, useState } from 'react';
import { liveChannelConnected, liveChannelReady, onLiveConnection } from '../core/liveChannel';
import './live-status.css';

// O estado do canal ao vivo, visível.
//
// O canal tem queda segura: se o Realtime Database não responde, o movimento
// dos tokens volta a trafegar pelo Firestore e a mesa continua funcionando —
// só que mais devagar. Isso é bom para a mesa e péssimo para o diagnóstico,
// porque ninguém percebe que está no caminho lento.
//
// Este selo diz qual caminho está em uso agora, para a diferença entre
// "configurei o tempo real" e "o tempo real está ligado" ser verificável.
export default function LiveStatus() {
  const [state, setState] = useState(() => (liveChannelConnected() ? 'live' : 'checking'));

  useEffect(() => {
    let alive = true;
    const stop = onLiveConnection(connected => { if (alive) setState(connected ? 'live' : 'slow'); });
    liveChannelReady().then(connected => { if (alive) setState(connected ? 'live' : 'slow'); });
    return () => { alive = false; stop?.(); };
  }, []);

  const label = state === 'live' ? 'Tempo real' : state === 'slow' ? 'Modo padrão' : 'Conectando';
  const title = state === 'live'
    ? 'Canal ao vivo ligado: os tokens se movem para todos quase sem atraso.'
    : state === 'slow'
      ? 'O canal ao vivo não respondeu. A mesa funciona, mas o movimento dos tokens passa pelo caminho mais lento. Confira as regras do Realtime Database.'
      : 'Verificando o canal ao vivo…';

  return (
    <span className={`live-status is-${state}`} title={title} role="status">
      <i aria-hidden="true" />
      <b>{label}</b>
    </span>
  );
}
