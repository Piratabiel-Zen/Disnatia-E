import { useState } from 'react';
import { SECOES_DAS_REGRAS, buscarNasRegras } from './regrasOneShot.mjs';
import './regras-one-shot.css';

/**
 * AS REGRAS DA NOITE
 *
 * Página para ser lida em cinco minutos antes de começar, e consultada com a
 * mesa esperando. Por isso a busca fica no alto e as seções ficam todas
 * abertas: fechar em sanfona economiza tela e custa o relance — o Mestre que
 * procura "quanto é pavor máximo" não quer clicar em três títulos.
 *
 * Os números vêm do módulo das regras, que por sua vez os lê da ficha. Não
 * existe a possibilidade de a página dizer 5 e o sistema aplicar 6.
 */
export default function RegrasOneShotPage() {
  const [busca, setBusca] = useState('');
  const secoes = buscarNasRegras(busca);

  return (
    <div className="osr">
      <header className="osr-barra">
        <div>
          <h2>Regras</h2>
          <p>One Shot Terror — uma noite, gente comum, e algo que não deveria estar ali.</p>
        </div>
        <input
          value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar nas regras…" autoComplete="off"
        />
      </header>

      {secoes.length === 0 && (
        <p className="osr-nada">Nada nas regras fala disso. Pergunte ao Mestre — numa one-shot, ele decide.</p>
      )}

      {secoes.map(secao => (
        <section key={secao.id} className="osr-secao">
          <h3>{secao.titulo}</h3>
          {secao.corpo.map((paragrafo, i) => <p key={i}>{paragrafo}</p>)}
        </section>
      ))}

      <p className="osr-pe">
        {SECOES_DAS_REGRAS.length} seções. O que não estiver aqui, o Mestre decide na hora —
        é mesa de uma noite, e discussão de regra custa a cena.
      </p>
    </div>
  );
}
