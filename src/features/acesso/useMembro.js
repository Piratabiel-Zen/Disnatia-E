import { useEffect, useState } from 'react';
import { aoMudarConta, lerMembro } from '../../core/auth';
import { activeCampaign, isPrimaryCampaign } from '../../core/campaign';

/**
 * Quem eu sou nesta mesa.
 *
 * Devolve o registro de membro (uid, nome, papel) ou null quando a pessoa não
 * é da mesa. As telas usam isto para saber o que oferecer — mas quem decide
 * de verdade é o servidor, nas regras.
 *
 * A Dinastia E é o caso à parte: ela existe desde antes do login e não exige
 * conta. Ali todo mundo entra como membro, para a mesa em andamento não parar.
 */
export function useMembro() {
  const campanha = activeCampaign();
  const [membro, setMembro] = useState(null);
  const [carregando, setCarregando] = useState(!isPrimaryCampaign());

  useEffect(() => {
    if (isPrimaryCampaign()) {
      setMembro({ uid: 'dinastia-e', nome: '', papel: 'mestre' });
      setCarregando(false);
      return undefined;
    }
    let vivo = true;
    const parar = aoMudarConta(async conta => {
      if (!conta) { if (vivo) { setMembro(null); setCarregando(false); } return; }
      try {
        const registro = await lerMembro(campanha?.id, conta.uid);
        if (vivo) setMembro(registro);
      } catch { if (vivo) setMembro(null); }
      finally { if (vivo) setCarregando(false); }
    });
    return () => { vivo = false; parar(); };
  }, [campanha?.id]);

  return { membro, carregando, campanha };
}
