import { useMemo, useState } from 'react';
import { MANUAL_CAIN, buscarNoManual } from './manualCain.mjs';
import './referencia-cain.css';

function Parte({ parte }) {
  if (parte.tipo === 'lista') {
    return <ul>{parte.itens.map((item, i) => <li key={i}>{item}</li>)}</ul>;
  }
  if (parte.tipo === 'nota') {
    return <p className="ref-nota">{parte.texto}</p>;
  }
  if (parte.tipo === 'tabela') {
    return (
      <div className="ref-rolagem">
        <table className="ref-tabela">
          <thead>
            <tr>{parte.cabecalho.map((c, i) => <th key={i}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {parte.linhas.map((linha, i) => (
              <tr key={i}>{linha.map((celula, j) => <td key={j}>{celula}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <p>{parte.texto}</p>;
}

/**
 * O MANUAL DE CAMPO
 *
 * Catorze seções dobradas. Dobradas de propósito: aberto, o manual inteiro
 * é uma parede de texto que ninguém consulta no meio de uma cena. Fechado,
 * ele é um índice com resumo de uma linha em cada item — que é como se usa
 * uma regra de verdade, procurando uma coisa só.
 *
 * A busca filtra seções inteiras e abre o que sobrou, porque quem digita
 * "gancho" quer o bloco dos ganchos na tela, não um resultado para clicar.
 */
export default function ManualCainPage() {
  const [busca, setBusca] = useState('');
  const secoes = useMemo(() => buscarNoManual(MANUAL_CAIN, busca), [busca]);
  const filtrando = busca.trim().length > 0;

  return (
    <div className="ref">
      <header className="ref-cabeca">
        <h2>Manual de campo</h2>
        <p>
          As regras do CAIN condensadas para consulta durante a mesa: número, gatilho
          e ordem de resolução de cada coisa. Nenhuma regra ficou de fora — o que saiu
          foi exemplo, comentário e ficção.
        </p>
        <p className="ref-fonte">
          CAIN é de Tom Bloom. Este é um resumo operacional escrito para esta mesa;
          o livro completo é de quem o comprou.
        </p>
        <input
          className="ref-busca" value={busca} placeholder="Procurar uma regra…"
          onChange={e => setBusca(e.target.value)}
        />
      </header>

      {secoes.length === 0 && (
        <p className="ref-nota">Nada no manual com “{busca}”. Tente outra palavra.</p>
      )}

      <div className="ref-secoes">
        {secoes.map(secao => (
          <details key={secao.id} className="ref-secao" open={filtrando}>
            <summary>
              <b>{secao.titulo}</b>
              <em>{secao.resumo}</em>
            </summary>
            <div className="ref-corpo">
              {secao.partes.map((parte, i) => <Parte key={i} parte={parte} />)}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
