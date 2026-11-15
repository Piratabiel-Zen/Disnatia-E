import { useEffect, useState } from 'react';
import { deleteDoc, setDoc } from 'firebase/firestore';
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { activeCampaign, col, docIn } from '../../core/campaign';
import { campaignUsesBuiltInClasses } from '../../core/campaignModules.mjs';
import { DINASTIA_E_CLASSES, setActiveClasses } from '../../data/gameData';

// As linhagens da campanha ativa.
//
// Na Dinastia E são as nove escritas no código — nada muda e nada depende do
// banco. Em qualquer outra mesa, vêm da coleção `classes` daquela campanha,
// que começa vazia: é o Mestre quem cria as suas.
//
// Em ambos os casos o resultado é empurrado para a lista viva de gameData, de
// modo que fichas, dados, mapa e tudo o mais continuem lendo `CLASSES` sem
// saber de onde ela veio.
export default function useCampaignClasses() {
  const campaign = activeCampaign();
  const builtIn = campaignUsesBuiltInClasses(campaign);
  const [classes, setClasses] = useState(() => (builtIn ? DINASTIA_E_CLASSES : []));
  const [loading, setLoading] = useState(!builtIn);

  useEffect(() => {
    if (builtIn) {
      setActiveClasses(DINASTIA_E_CLASSES);
      setClasses(DINASTIA_E_CLASSES);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const unsub = onSnapshot(
      col('classes'),
      snap => {
        const rows = snap.docs
          .map(entry => ({ id: entry.id, ...entry.data() }))
          .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0) || String(a.name || '').localeCompare(String(b.name || '')));
        setActiveClasses(rows);
        setClasses(rows);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [builtIn, campaign?.id]);

  const saveClass = async entry => {
    if (builtIn) throw new Error('As linhagens da Dinastia E fazem parte da história desta mesa.');
    const id = String(entry.id || '').trim();
    if (!id) throw new Error('A linhagem precisa de um identificador.');
    await setDoc(docIn('classes', id), { ...entry, id }, { merge: true });
  };

  const removeClass = async id => {
    if (builtIn) throw new Error('As linhagens da Dinastia E fazem parte da história desta mesa.');
    await deleteDoc(docIn('classes', String(id)));
  };

  return { classes, loading, builtIn, saveClass, removeClass };
}
