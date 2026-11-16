import { BLASFEMIAS_DETALHADAS, PERICIAS, PERICIA_ESPECIAL } from '../../core/sistemas/cain/index.mjs';
import './referencia-cain.css';

/**
 * AGENDAS E BLASFÊMIAS
 *
 * O que no CAIN faz o papel de "classe". Não existe classe aqui: um exorcista
 * é definido por duas escolhas independentes — a agenda, que é o que ele
 * quer, e a blasfêmia, que é o que ele manifesta. Dois exorcistas com a mesma
 * blasfêmia jogam diferente se as agendas forem diferentes, e é essa
 * separação que faz o sistema ter mais combinações do que uma lista de
 * classes teria.
 *
 * Os textos dos poderes de cada blasfêmia e das habilidades de cada agenda
 * estão no livro, na aba Livro. O que esta tela dá é o suficiente para
 * escolher: o tema de cada uma e as regras que valem para todas.
 */
export default function BlasfemiasPage() {
  return (
    <div className="ref">
      <header className="ref-cabeca">
        <h2>Agendas e blasfêmias</h2>
        <p>
          Um exorcista não tem classe. Ele tem uma agenda — o que o move e o papel
          dele no esquadrão — e uma blasfêmia, o fenômeno psíquico que manifesta.
          As duas escolhas são independentes e mudam por motivos diferentes.
        </p>
        <p className="ref-fonte">
          Os poderes de cada blasfêmia e as habilidades de cada agenda estão no livro,
          na aba Livro. Aqui ficam o tema de cada uma e as regras comuns.
        </p>
      </header>

      <div className="ref-secoes">
        <details className="ref-secao" open>
          <summary>
            <b>Como a agenda funciona</b>
            <em>Dá XP, dá habilidades e pode ser trocada entre missões.</em>
          </summary>
          <div className="ref-corpo">
            <p>
              A agenda descreve a abordagem do personagem aos problemas — não o
              personagem inteiro. Ela traz dois itens de conduta: um normal e um em
              negrito, mais difícil de cumprir. No fim da sessão, cumprir o item normal
              dá 1 XP; cumprir pelo menos um item em negrito dá outro.
            </p>
            <ul>
              <li>Escolha uma agenda ao criar o exorcista e uma habilidade dela.</li>
              <li>Cada avanço gasto compra mais uma habilidade da agenda ativa.</li>
              <li>Teto de cinco habilidades de agenda ao mesmo tempo. Chegando lá, trocar uma é a única forma de ganhar outra.</li>
              <li>Pode-se trocar de agenda entre missões. Itens e habilidades em negrito ficam com o personagem na troca; a agenda nova não dá habilidade de graça.</li>
              <li>O Admin pode acrescentar itens à agenda durante a caçada, como recompensa ou por virada de história. O que foi acrescentado em negrito também fica para sempre.</li>
            </ul>
            <p className="ref-nota">
              Frequentemente o item em negrito pede uma abordagem diferente da que a
              agenda normalmente encorajaria. É de propósito: é onde o personagem tem
              que se contradizer para crescer.
            </p>
          </div>
        </details>

        <details className="ref-secao">
          <summary>
            <b>Como a blasfêmia funciona</b>
            <em>Uma passiva, poderes comprados com avanço, e escala com a categoria.</em>
          </summary>
          <div className="ref-corpo">
            <ul>
              <li>Na criação, escolha uma das doze, escolha dois poderes dela e decida como os poderes se manifestaram pela primeira vez.</li>
              <li>Toda blasfêmia dá uma habilidade passiva, que não se compra.</li>
              <li>Usar um poder custa um pulso psíquico. Às vezes há rolagem, e aí o pulso só é gasto no sucesso; às vezes gasta-se mais de um de uma vez.</li>
              <li>Blasfêmias normalmente concedem dados de vantagem.</li>
              <li>Elas escalam com a categoria do exorcista — por isso não ficam difíceis contra Pecados por padrão, ao contrário de tudo que é mundano.</li>
              <li>Rolar blasfêmia é rolar PSIQUE, que é metade da categoria arredondada para cima.</li>
            </ul>
            <p>
              Uma blasfêmia inteiramente nova custa um avanço, em vez de um poder.
              Vem com a passiva dela e um poder. O preço é permanente: risque uma caixa
              de pecado — o limite cai em 1 — e o XP necessário por avanço sobe em +1.
            </p>
            <p className="ref-nota">
              RAJADA é de todo mundo: gaste um pulso psíquico, role PSIQUE e produza
              energia psíquica concentrada em corpo a corpo ou curta distância. A forma
              varia de exorcista para exorcista; a força escala com a categoria.
            </p>
          </div>
        </details>

        <details className="ref-secao">
          <summary>
            <b>As dez perícias</b>
            <em>De 0 a 3, no máximo duas em 3.</em>
          </summary>
          <div className="ref-corpo">
            <ul>
              {PERICIAS.map(p => <li key={p.id}><b>{p.nome}</b> — {p.resumo}</li>)}
              <li><b>{PERICIA_ESPECIAL.nome}</b> — {PERICIA_ESPECIAL.resumo} Vale metade da categoria, para cima.</li>
            </ul>
          </div>
        </details>
      </div>

      <header className="ref-cabeca">
        <h2>As doze blasfêmias</h2>
        <p>O tema de cada uma, para escolher. Os poderes estão no livro.</p>
      </header>

      <ul className="ref-grade">
        {BLASFEMIAS_DETALHADAS.map((b, i) => (
          <li key={b.nome} className="ref-cartao" style={{ '--cor': i % 2 ? '#8A7BB0' : '#A98045' }}>
            <h3>{b.nome}</h3>
            <p>{b.resumo}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
