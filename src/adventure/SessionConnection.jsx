import { useEffect, useState } from 'react';
import { doc } from 'firebase/firestore';
import { db } from '../core/firebase';
import { onSnapshot } from './sharedSnapshot';

export default function SessionConnection() {
  const [online, setOnline] = useState(navigator.onLine);
  const [state, setState] = useState('connecting');
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    const stop = onSnapshot(doc(db, 'config', 'session'), { includeMetadataChanges: true }, snap => {
      setState(snap.metadata.hasPendingWrites ? 'saving' : snap.metadata.fromCache ? 'cache' : 'live');
    }, () => setState('error'));
    return () => { stop(); window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const label = !online ? 'Sem conexão' : ({ connecting: 'Conectando…', saving: 'Enviando…', cache: 'Reconectando…', live: 'Sessão conectada', error: 'Falha na conexão' })[state];
  return <span className={`ad-connection ${online && state === 'live' ? 'live' : ''}`} title="Estado da conexão da sessão com o servidor" role="status"><i />{label}</span>;
}
