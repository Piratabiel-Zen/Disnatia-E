import { useState } from 'react';
import { PERICIAS, PERICIA_ESPECIAL } from '../../core/sistemas/cain/index.mjs';
import { BLASFEMIAS_COMPLETAS, habilidadesDaBlasfemia } from './blasfemias.mjs';
import SigiloBlasfemia from './SigiloBlasfemia.jsx';
import './referencia-cain.css';
import './blasfemias.css';

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
 * estão no PDF do livro. O que esta tela dá é o suficiente para
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
          Os poderes das doze blasfêmias estão abertos mais abaixo, em resumo. As
          habilidades de cada agenda continuam no PDF do livro.
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
        <p>Clique em uma para abrir a passiva e os cinco poderes dela.</p>
      </header>

      <DozeBlasfemias />
    </div>
  );
}

/**
 * AS DOZE, EM TIRAS E UM PAINEL
 *
 * Fechada, a seção é uma grade de doze cartões com o tema de cada blasfêmia —
 * é assim que se escolhe. Aberta, ela vira outra coisa: as doze recolhem para
 * uma fileira de tiras finas e a escolhida toma a área inteira com a passiva e
 * os cinco poderes. As tiras continuam clicáveis, então trocar de blasfêmia é
 * um clique, sem fechar e reabrir.
 *
 * A mesma tira que abre também fecha, e Esc fecha de qualquer lugar: quem
 * abriu por curiosidade volta para a grade sem procurar um X.
 */
function DozeBlasfemias() {
  const [abertaId, setAbertaId] = useState('');
  const aberta = BLASFEMIAS_COMPLETAS.find(b => b.id === abertaId) || null;

  function alternar(id) {
    setAbertaId(atual => (atual === id ? '' : id));
  }

  if (!aberta) {
    return (
      <ul className="blasf-grade">
        {BLASFEMIAS_COMPLETAS.map(b => (
          <li key={b.id}>
            <button
              type="button"
              className="blasf-cartao"
              onClick={() => alternar(b.id)}
              aria-expanded="false"
            >
              <SigiloBlasfemia sigilo={b.sigilo} tamanho={34} />
              <span className="blasf-cartao-texto">
                <strong>{b.nome}</strong>
                <span>{b.resumo}</span>
              </span>
              <span className="blasf-cartao-conta">
                {habilidadesDaBlasfemia(b)} habilidades
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="blasf-abertura" onKeyDown={e => { if (e.key === 'Escape') setAbertaId(''); }}>
      <ul className="blasf-tiras">
        {BLASFEMIAS_COMPLETAS.map(b => (
          <li key={b.id}>
            <button
              type="button"
              className="blasf-tira"
              data-ativa={b.id === aberta.id ? 'sim' : 'nao'}
              onClick={() => alternar(b.id)}
              aria-expanded={b.id === aberta.id}
            >
              {b.nome}
            </button>
          </li>
        ))}
      </ul>

      <article className="blasf-painel" aria-label={`Blasfêmia ${aberta.nome}`}>
        <header className="blasf-painel-cabeca">
          <div className="blasf-marca">
            <SigiloBlasfemia sigilo={aberta.sigilo} tamanho={92} />
          </div>
          <div className="blasf-painel-titulo">
            <h3>{aberta.nome}</h3>
            <p className="blasf-lema">{aberta.lema}</p>
            {aberta.manifestacao && <p className="blasf-manifesto">{aberta.manifestacao}</p>}
          </div>
          <button type="button" className="blasf-fechar" onClick={() => setAbertaId('')}>
            Fechar
          </button>
        </header>

        {aberta.nota && (
          <p className="blasf-fato">
            <span>Fato</span>
            {aberta.nota}
          </p>
        )}

        <section className="blasf-passiva">
          <h4>
            {aberta.passiva.nome}
            <em>passiva · não se compra</em>
          </h4>
          <p>{aberta.passiva.resumo}</p>
        </section>

        <h4 className="blasf-rotulo">
          Os cinco poderes
          <em>dois na criação, os outros por avanço</em>
        </h4>
        <ol className="blasf-poderes">
          {aberta.poderes.map(p => (
            <li key={p.nome}>
              <h5>
                {p.nome}
                {p.nomeIncerto && <i title="O título deste poder saiu ilegível na exportação do PDF — o nome aqui descreve a função.">nome a confirmar</i>}
              </h5>
              <p className="blasf-tracos">{p.tracos}</p>
              <p>{p.resumo}</p>
            </li>
          ))}
        </ol>
      </article>
    </div>
  );
}
