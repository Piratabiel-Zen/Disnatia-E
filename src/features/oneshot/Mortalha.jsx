import { useEffect, useState } from 'react';
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { setDoc } from 'firebase/firestore';
import { docIn } from '../../core/campaign';
import './mortalha.css';

/**
 * A NÉVOA
 *
 * Atravessa a tela o tempo todo, atrás de tudo, e o Mestre liga e desliga
 * para a mesa inteira — um clique dele muda o que todos estão vendo, que é
 * metade da graça: a névoa subir no meio de uma descrição vale mais que
 * névoa que sempre esteve lá.
 *
 * Três camadas de gradiente radial em planos de velocidades diferentes. Não
 * é imagem: é a única forma de ter névoa que não repete em telas largas e não
 * custa download nenhum. As camadas andam em sentidos quase opostos, porque
 * névoa que anda toda para o mesmo lado lê como cortina passando.
 *
 * Fica atrás de tudo, com z-index 0 e `contain`, e NÃO mexe na posição de
 * nenhum irmão — foi exatamente uma regra dessas que derrubou o layout da
 * Estrela de Absinto, empurrando a navegação para dentro do fluxo.
 */
export default function Mortalha({ mestre = false }) {
  const [ligada, setLigada] = useState(false);

  useEffect(() => onSnapshot(docIn('config', 'mortalha'), snap => {
    setLigada(Boolean(snap.data()?.ligada));
  }, () => {}), []);

  const alternar = async () => {
    const proximo = !ligada;
    setLigada(proximo);
    await setDoc(docIn('config', 'mortalha'), { ligada: proximo }, { merge: true });
  };

  return (
    <>
      {ligada && (
        <div className="mortalha" aria-hidden="true">
          <span className="mortalha-camada um" />
          <span className="mortalha-camada dois" />
          <span className="mortalha-camada tres" />
        </div>
      )}
      {mestre && (
        <button
          type="button" className="mortalha-chave" data-ligada={ligada ? 'sim' : 'nao'}
          onClick={alternar}
          title={ligada ? 'Dissipar a névoa' : 'Levantar a névoa para a mesa'}
        >
          <span aria-hidden="true">☁</span>
          {ligada ? 'Névoa no ar' : 'Levantar névoa'}
        </button>
      )}
    </>
  );
}
