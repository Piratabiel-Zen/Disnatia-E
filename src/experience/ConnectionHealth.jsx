import { useEffect, useRef, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { docIn } from '../core/campaign';

/**
 * O selo de sincronização.
 *
 * Ele escuta um documento qualquer da mesa e relata o que acontece: chegou do
 * servidor é "Conectado", veio do cache é "Sincronizando", deu erro ou o
 * aparelho está sem rede é "Desconectado".
 *
 * POR QUE ELE TENTA DE NOVO. Um onSnapshot recusado pelas regras não se
 * reconecta sozinho: o Firestore encerra aquele ouvinte e pronto. Como as
 * regras só entregam os dados da mesa para quem tem registro de membro, quem
 * abria a mesa um instante antes de o registro ser gravado — entrar e só
 * depois digitar a senha de Mestre é exatamente isso — via "Desconectado"
 * para sempre, mesmo já sendo membro, até recarregar a página. E o selo dizia
 * "desconectado" para uma pessoa que estava perfeitamente conectada.
 *
 * Então, ao ser recusado, ele arma de novo: 3s, 6s, 12s, até 30s. No momento
 * em que a permissão passa a existir, o próximo ensaio pega e o selo acende
 * sem ninguém fazer nada.
 */
const ESPERA_INICIAL = 3000;
const ESPERA_MAXIMA = 30000;

export default function ConnectionHealth() {
  const [state, setState] = useState(
    () => (typeof navigator === 'undefined' || navigator.onLine ? 'connecting' : 'offline'),
  );
  const tentativa = useRef(0);

  useEffect(() => {
    let vivo = true;
    let desligarOuvinte = () => {};
    let agendado = null;

    const ouvir = () => {
      if (!vivo) return;
      desligarOuvinte = onSnapshot(
        docIn('config', 'battlemap_active'),
        { includeMetadataChanges: true },
        snapshot => {
          if (!vivo) return;
          tentativa.current = 0;
          setState(!navigator.onLine ? 'offline' : snapshot.metadata.fromCache ? 'connecting' : 'connected');
        },
        () => {
          if (!vivo) return;
          setState('offline');
          const espera = Math.min(ESPERA_INICIAL * 2 ** tentativa.current, ESPERA_MAXIMA);
          tentativa.current += 1;
          agendado = setTimeout(ouvir, espera);
        },
      );
    };

    const onOnline = () => {
      setState('connecting');
      tentativa.current = 0;
      // Voltar a ter rede merece uma tentativa imediata, sem esperar o relógio.
      clearTimeout(agendado);
      desligarOuvinte();
      ouvir();
    };
    const onOffline = () => setState('offline');

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    ouvir();

    return () => {
      vivo = false;
      clearTimeout(agendado);
      desligarOuvinte();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const level = state === 'connected' ? 'good' : state === 'connecting' ? 'warn' : 'bad';
  const label = state === 'connected' ? 'Conectado' : state === 'connecting' ? 'Sincronizando' : 'Desconectado';
  return (
    <div
      className={`connection-health ${level}`}
      title="Estado da sincronização em tempo real. Ações locais continuam disponíveis durante a sincronização."
    >
      <i /><span>{label}</span>
    </div>
  );
}
