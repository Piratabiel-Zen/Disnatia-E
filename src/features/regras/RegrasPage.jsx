import { Suspense, lazy } from 'react';
import { activeCampaign } from '../../core/campaign';
import { sistemaDe } from '../../core/sistemas/index.mjs';

/**
 * A ABA REGRAS
 *
 * Mesma bifurcação da aba Fichas, e pelo mesmo motivo: "Regras" é a mesma
 * palavra para coisas sem nenhuma relação. As da Dinastia E falam de classes
 * e atributos daquele universo; as do One Shot Terror falam de d20, pavor e
 * sanidade. Uma mesa de terror que abre as regras da Dinastia E está lendo
 * a campanha errada — foi exatamente o que aconteceu com a aba Livro no CAIN.
 */
const POR_SISTEMA = {
  oneshot: lazy(() => import('../oneshot/RegrasOneShotPage')),
  'dinastia-e': lazy(() => import('./RegrasDinastiaPage')),
};

export default function RegrasPage(props) {
  const sistema = sistemaDe(activeCampaign());
  const Regras = POR_SISTEMA[sistema.id] || POR_SISTEMA['dinastia-e'];
  return (
    <Suspense fallback={<div className="lazy-page-skeleton" role="status">Abrindo as regras…</div>}>
      <Regras {...props} />
    </Suspense>
  );
}
