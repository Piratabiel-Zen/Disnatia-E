import { useEffect, useState } from 'react';
import { aoMudarConta, observarMembro } from '../../core/auth';
import { activeCampaign, isPrimaryCampaign } from '../../core/campaign';
import { aoMudarPrevia, membroEfetivo, previaDeJogador } from './previaDeJogador.mjs';

/**
 * Quem eu sou nesta mesa.
 *
 * Devolve o registro de membro (uid, nome, papel) ou null quando a pessoa não
 * é da mesa. As telas usam isto para saber o que oferecer — mas quem decide
 * de verdade é o servidor, nas regras.
 *
 * ACOMPANHA, NÃO LÊ UMA VEZ. A primeira versão lia o registro no momento em
 * que a conta aparecia e parava ali. Quem entrava na mesa e só depois digitava
 * a senha de Mestre ficava com todas as telas vazias e um aviso de "entre na
 * campanha" — já estava registrado no servidor, mas nada na tela voltava a
 * perguntar. Só recarregando a página a mesa aparecia, e ninguém adivinha isso.
 *
 * A Dinastia E é o caso à parte: ela existe desde antes do login e não exige
 * conta. Ali todo mundo entra como membro, para a mesa em andamento não parar.
 */
export function useMembro() {
  const campanha = activeCampaign();
  const [membro, setMembro] = useState(null);
  const [previa, setPrevia] = useState(previaDeJogador);
  useEffect(() => aoMudarPrevia(setPrevia), []);
  const [carregando, setCarregando] = useState(!isPrimaryCampaign());

  useEffect(() => {
    if (isPrimaryCampaign()) {
      setMembro({ uid: 'dinastia-e', nome: '', papel: 'mestre' });
      setCarregando(false);
      return undefined;
    }
    let vivo = true;
    let pararDeObservar = () => {};
    const parar = aoMudarConta(conta => {
      pararDeObservar();
      pararDeObservar = () => {};
      if (!conta) { if (vivo) { setMembro(null); setCarregando(false); } return; }
      pararDeObservar = observarMembro(campanha?.id, conta.uid, registro => {
        if (!vivo) return;
        setMembro(registro);
        setCarregando(false);
      });
    });
    return () => { vivo = false; pararDeObservar(); parar(); };
  }, [campanha?.id]);

  // `membro` já sai com a prévia aplicada, para nenhuma tela precisar saber
  // que ela existe: quem está em prévia simplesmente É jogador para elas.
  // `membroReal` fica disponível para a barra que oferece sair da prévia.
  return { membro: membroEfetivo(membro, previa), membroReal: membro, previa, carregando, campanha };
}
