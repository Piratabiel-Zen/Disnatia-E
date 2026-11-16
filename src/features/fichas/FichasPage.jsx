import { Suspense, lazy } from 'react';
import { activeCampaign } from '../../core/campaign';
import { sistemaDe } from '../../core/sistemas/index.mjs';

/**
 * A ABA FICHAS
 *
 * "Ficha" é a mesma palavra para coisas que não se parecem em nada: na
 * Dinastia E é classe, atributos e habilidades; no CAIN é um formulário de
 * registro com perícias de 0 a 3, blasfêmia e talismã de execução. Tentar
 * fazer uma tela servir às duas daria uma tela que não serve a nenhuma.
 *
 * Então a aba não é uma tela: é uma bifurcação. O sistema declarado pela mesa
 * escolhe qual ficha abrir, e cada sistema novo — Tormenta, Ordem Paranormal
 * — entra aqui como mais uma linha, sem mexer nas que já existem.
 */
const POR_SISTEMA = {
  cain: lazy(() => import('../cain/FichasCainPage')),
  'dinastia-e': lazy(() => import('../sheets/SheetsPage')),
};

export default function FichasPage(props) {
  const sistema = sistemaDe(activeCampaign());
  const Ficha = POR_SISTEMA[sistema.id] || POR_SISTEMA['dinastia-e'];
  return (
    <Suspense fallback={<div className="lazy-page-skeleton" role="status">Abrindo as fichas…</div>}>
      <Ficha {...props} />
    </Suspense>
  );
}
