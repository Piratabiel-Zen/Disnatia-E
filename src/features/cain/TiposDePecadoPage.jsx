import { COMO_UM_PECADO_E_FEITO, OUTROS_OPONENTES, TIPOS_DE_PECADO } from './tiposDePecado.mjs';
import './referencia-cain.css';

/**
 * OS TIPOS DE INIMIGO
 *
 * Os seis tipos de Pecado e as peças com que qualquer um deles é montado.
 * Não confundir com a aba Pecados: lá ficam os Pecados desta campanha, os
 * que o esquadrão de fato encontrou e o que já se descobriu sobre cada um.
 * Aqui fica o alfabeto — o que é um Ogro, o que é um Lorde, e o que todo
 * Pecado tem por dentro.
 *
 * A ordem da tela é essa de propósito: primeiro os seis, que é o que se
 * procura no meio de uma caçada; a anatomia depois, que é o que o Admin lê
 * uma vez, ao montar o próximo.
 */
export default function TiposDePecadoPage() {
  return (
    <div className="ref">
      <header className="ref-cabeca">
        <h2>Tipos de inimigo</h2>
        <p>
          Pecados são monstros nascidos de trauma humano: nós de emoção escura que
          viraram carne. Existir já corrói o mundo ao redor deles — por isso a CAIN
          manda o esquadrão depressa. São seis tipos, e o tipo decide tanto os poderes
          quanto o tom da caçada.
        </p>
        <p className="ref-fonte">
          Resumo escrito para esta mesa. Cada Pecado do livro vem com domínios,
          palácio, aflições e vestígios prontos — isso está no PDF do livro.
        </p>
      </header>

      <ul className="ref-grade">
        {TIPOS_DE_PECADO.map(p => (
          <li key={p.numeral} className="ref-cartao ref-pecado" style={{ '--cor': p.cor }}>
            <span className="ref-numeral">{p.numeral}</span>
            <h3>{p.nome}</h3>
            <p><em>{p.chamada}</em></p>
            <dl>
              <div><dt>De onde nasce</dt><dd>{p.nasce}</dd></div>
              <div><dt>Como age</dt><dd>{p.comoAge}</dd></div>
              <div><dt>O que a mesa sente</dt><dd>{p.aMesaSente}</dd></div>
            </dl>
          </li>
        ))}
      </ul>

      <header className="ref-cabeca">
        <h2>Anatomia de um Pecado</h2>
        <p>As peças que o Admin escolhe ao montar um. Valem para os seis tipos.</p>
      </header>

      <div className="ref-secoes">
        {COMO_UM_PECADO_E_FEITO.map(bloco => (
          <details key={bloco.titulo} className="ref-secao">
            <summary>
              <b>{bloco.titulo}</b>
              <em>{bloco.texto.split('.')[0]}.</em>
            </summary>
            <div className="ref-corpo">
              <p>{bloco.texto}</p>
              {bloco.itens && <ul>{bloco.itens.map((i, n) => <li key={n}>{i}</li>)}</ul>}
            </div>
          </details>
        ))}

        <details className="ref-secao">
          <summary>
            <b>Montando um Pecado novo</b>
            <em>Cinco decisões, nesta ordem.</em>
          </summary>
          <div className="ref-corpo">
            <ul>
              <li>Escolha o tipo, entre os seis.</li>
              <li>Escolha a forma (I, II ou III). É só temático.</li>
              <li>Escolha a categoria, de 0 a 7 — normalmente igual ou abaixo da do esquadrão.</li>
              <li>Decida quem é o hospedeiro, qual é o gancho principal da investigação, e escreva as três perguntas de trauma.</li>
              <li>Decida onde fica o palácio e com o que ele se parece. Tem que estar dentro da área e ser alcançável.</li>
            </ul>
            <p>
              Com isso em mãos, monte a investigação em torno de cinco pontos: o
              incidente que deu origem ao Pecado, a situação atual, o hospedeiro (estado
              e localização), a localização do palácio e as três questões traumáticas.
            </p>
            <p className="ref-nota">
              As perguntas de trauma só valem se puderem ser respondidas dentro da área
              de investigação, por pessoas, lugares ou eventos que o esquadrão consiga
              alcançar. Pergunta sem resposta disponível não enfraquece nada.
            </p>
          </div>
        </details>

        <details className="ref-secao">
          <summary>
            <b>Outros oponentes</b>
            <em>Nem tudo que o esquadrão enfrenta é um Pecado.</em>
          </summary>
          <div className="ref-corpo">
            <ul>
              {OUTROS_OPONENTES.map(o => <li key={o.nome}><b>{o.nome}</b> — {o.resumo}</li>)}
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
}
