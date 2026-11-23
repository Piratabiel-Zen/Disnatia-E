import {
  ATRIBUTOS, ATRIBUTO_MAXIMO_NA_CRIACAO, ATRIBUTO_MINIMO, COMPETENCIAS,
  DIFICULDADES, PAVOR_MAXIMO, PONTOS_DE_SORTE, SANIDADE_MAXIMA,
  REFORCO_A_PARTIR_DE, competenciasDaFicha, marcar, aliviar, pontosRestantes,
  pvMaximoDaFicha, reforcoAtivo, responderAVisao, normalizar,
} from './fichaOneShot.mjs';
import {
  TALENTOS, TALENTOS_POR_PERSONAGEM, talentoPorId, talentosTomados,
} from './talentosOneShot.mjs';
import { comprimirParaDocumento } from '../../core/media';
import './paginas-one-shot.css';
import './ficha-one-shot.css';

/**
 * A FICHA DE UMA NOITE
 *
 * Cabe numa tela porque ninguém vai evoluir este personagem: o que está aqui
 * no começo é o que vai estar no fim, menos o que a noite tirar.
 *
 * Duas decisões moldam o resto:
 *
 * COMPETÊNCIA NÃO TEM ONDE MARCAR. Ela escala do atributo, então mostrar um
 * campo editável ao lado dela seria oferecer um controle que não controla
 * nada. As doze aparecem calculadas, e muda-se o atributo acima.
 *
 * PAVOR E SANIDADE SÃO CAIXAS, NÃO NÚMEROS. Enchem, e a mesa precisa ver de
 * relance quanto falta para a visão — um número subindo não dá esse susto;
 * três caixas vazias de seis, sim.
 */

function Medidor({ rotulo, valor, maximo, aoMarcar, aoAliviar, podeEditar, perigo, cor = 'osso' }) {
  return (
    <div className="osf-medidor" data-perigo={perigo ? 'sim' : 'nao'} data-cor={cor}>
      <div className="osf-medidor-topo">
        <span>{rotulo}</span>
        <b>{valor}/{maximo}</b>
      </div>
      <div className="osf-caixas">
        {Array.from({ length: maximo }, (_, i) => (
          <button
            key={i} type="button" disabled={!podeEditar}
            data-cheia={i < valor ? 'sim' : 'nao'}
            onClick={() => (i < valor ? aoAliviar(valor - i) : aoMarcar(i + 1 - valor))}
            title={podeEditar ? `Marcar até ${i + 1}` : undefined}
          />
        ))}
      </div>
    </div>
  );
}

/* Para a competência dizer "+1 com 3 de Vontade" em vez de "+1 com vontade". */
const NOME_DO_ATRIBUTO = Object.fromEntries(ATRIBUTOS.map(a => [a.id, a.nome]));

export default function FichaOneShot({
  ficha: bruta, aoMudar, podeEditar = false, mestre = false,
  // As outras fichas da mesa, só para avisar que um talento já está com
  // alguém. Opcional de propósito: a ficha abre sozinha em vários lugares e
  // não pode depender de a lista chegar.
  fichasDaMesa = [],
}) {
  const ficha = normalizar(bruta);
  const competencias = competenciasDaFicha(ficha);
  const pvMaximo = pvMaximoDaFicha(ficha);
  const restantes = pontosRestantes(ficha);
  const salvar = patch => aoMudar?.({ ...ficha, ...patch });
  const escolhido = talentoPorId(ficha.talento);
  const tomados = talentosTomados(fichasDaMesa, ficha.id);

  const campo = (id, rotulo, extra = {}) => (
    <label className="osf-campo">
      <span>{rotulo}</span>
      <input
        value={ficha[id] ?? ''} disabled={!podeEditar}
        onChange={e => salvar({ [id]: e.target.value })}
        {...extra}
      />
    </label>
  );

  return (
    <div className="osf">
      {/* A VISÃO vem primeiro, acima de tudo: quando ela está pendente, a mesa
          está esperando uma resposta e nada mais na ficha importa agora. */}
      {ficha.visaoPendente && (
        <section className="osf-visao">
          <h4>Uma visão</h4>
          <p>
            {ficha.visaoPendente === 'pavor'
              ? 'O pavor encheu. Algo se mostra — e oferece alguma coisa.'
              : 'A cabeça cedeu. O que aparece agora diz respeito a você, e é pior por isso.'}
          </p>
          <p className="osf-visao-nota">
            O Mestre descreve. Depois, escolha na frente da mesa.
          </p>
          {podeEditar && (
            <div className="osf-visao-botoes">
              <button type="button" className="ceder" onClick={() => aoMudar?.(responderAVisao(ficha, { cedeu: true }))}>
                Ceder — custa 1 de vida
              </button>
              <button type="button" onClick={() => aoMudar?.(responderAVisao(ficha, { cedeu: false }))}>
                Resistir — o medidor recua
              </button>
            </div>
          )}
        </section>
      )}

      <section className="osf-bloco">
        <h4>Quem é</h4>
        <div className="osf-quem">
          {/* O RETRATO 3x4.
              Pequeno e com proporção de documento de propósito: é foto de
              arquivo, não ilustração de herói. Numa mesa de terror a foto 3x4
              já começa com cara de ficha de desaparecido — o que ajuda. */}
          <div className="osf-retrato">
            {ficha.retrato
              ? <img src={ficha.retrato} alt="" />
              : <span className="osf-retrato-vazio">sem<br />retrato</span>}
            {podeEditar && (
              <label className="osf-retrato-trocar">
                {ficha.retrato ? 'trocar' : 'anexar'}
                <input
                  type="file" accept="image/*"
                  onChange={async e => {
                    const arquivo = e.target.files?.[0];
                    if (!arquivo) return;
                    const cru = await new Promise(resolver => {
                      const leitor = new FileReader();
                      leitor.onload = () => resolver(String(leitor.result || ''));
                      leitor.readAsDataURL(arquivo);
                    });
                    // 3x4 pequeno não precisa de muito: 900px de lado já
                    // imprime bem, e o documento do Firestore para em 400 KiB.
                    salvar({ retrato: await comprimirParaDocumento(cru, { largura: 900, altura: 1200, limite: 150 * 1024 }) });
                  }}
                />
              </label>
            )}
          </div>

          <div className="osf-quem-campos">
        <div className="osf-identidade">
          {campo('nome', 'Nome')}
          {campo('idade', 'Idade', { inputMode: 'numeric', placeholder: 'anos' })}
          {campo('ocupacao', 'Ocupação', { placeholder: 'o que faz da vida' })}
        </div>
        <label className="osf-campo osf-historico">
          <span>Histórico</span>
          <textarea
            value={ficha.historico || ''} disabled={!podeEditar} rows={3}
            placeholder="De onde veio, o que carrega, por que está aqui esta noite."
            onChange={e => salvar({ historico: e.target.value })}
          />
        </label>
        {/* O aviso da idade é regra, não enfeite: a mesa precisa saber disso
            ANTES de pôr uma criança na história. */}
          </div>
        </div>
        {pvMaximo < 5 && (
          <p className="osf-aviso">
            Entre 6 e 18 anos: {pvMaximo} de vida em vez de 5.
          </p>
        )}
      </section>

      <section className="osf-bloco">
        <h4>
          Condição
          <em>vida cai; pavor e sanidade enchem</em>
        </h4>
        <div className="osf-condicoes">
          <Medidor
            rotulo="Vida" valor={ficha.pv} maximo={pvMaximo} perigo={ficha.pv <= 1}
            podeEditar={podeEditar}
            aoMarcar={n => salvar({ pv: Math.min(pvMaximo, ficha.pv + n) })}
            aoAliviar={n => salvar({ pv: Math.max(0, ficha.pv - n) })}
          />
          <Medidor
            rotulo="Pavor" valor={ficha.pavor} maximo={PAVOR_MAXIMO} cor="roxo"
            perigo={ficha.pavor >= PAVOR_MAXIMO - 1} podeEditar={podeEditar}
            aoMarcar={n => aoMudar?.(marcar(ficha, 'pavor', n))}
            aoAliviar={n => aoMudar?.(aliviar(ficha, 'pavor', n))}
          />
          <Medidor
            rotulo="Sanidade" valor={ficha.sanidade} maximo={SANIDADE_MAXIMA} cor="sangue"
            perigo={ficha.sanidade >= SANIDADE_MAXIMA - 1} podeEditar={podeEditar}
            aoMarcar={n => aoMudar?.(marcar(ficha, 'sanidade', n))}
            aoAliviar={n => aoMudar?.(aliviar(ficha, 'sanidade', n))}
          />
        </div>
        <div className="osf-sorte">
          <span>Sorte</span>
          {Array.from({ length: PONTOS_DE_SORTE }, (_, i) => (
            <button
              key={i} type="button" disabled={!podeEditar}
              data-gasto={i >= ficha.sorte ? 'sim' : 'nao'}
              onClick={() => salvar({ sorte: i >= ficha.sorte ? i + 1 : i })}
              title="Rola de novo e fica com o segundo resultado"
            >◆</button>
          ))}
          <em>cada um rola de novo, valendo o segundo resultado</em>
        </div>
      </section>

      <section className="osf-bloco">
        <h4>
          Atributos
          <em>{restantes >= 0 ? `${restantes} por distribuir` : `${-restantes} além do permitido`}</em>
        </h4>
        <ul className="osf-atributos">
          {ATRIBUTOS.map(a => (
            <li key={a.id} title={a.resumo}>
              <span>{a.nome}</span>
              {podeEditar ? (
                <select
                  value={ficha.atributos[a.id]}
                  onChange={e => salvar({ atributos: { ...ficha.atributos, [a.id]: Number(e.target.value) } })}
                >
                  {Array.from(
                    { length: (mestre ? 5 : ATRIBUTO_MAXIMO_NA_CRIACAO) - ATRIBUTO_MINIMO + 1 },
                    (_, i) => ATRIBUTO_MINIMO + i,
                  ).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              ) : <b>{ficha.atributos[a.id]}</b>}
            </li>
          ))}
        </ul>
      </section>

      <section className="osf-bloco">
        <h4>
          Competências
          <em>atributo − 2, de −2 a +3; não se marca aqui</em>
        </h4>
        <ul className="osf-competencias">
          {COMPETENCIAS.map(c => (
            <li key={c.id}>
              {/* O sinal vem do número, não da marca fixa: desde que atributo
                  zerado trava a competência em −2, um "+" cravado aqui
                  escrevia "+-2" na ficha. */}
              <b data-negativo={competencias[c.id] < 0 ? '' : undefined}>
                {competencias[c.id] > 0 && '+'}
                {competencias[c.id] < 0 ? `−${Math.abs(competencias[c.id])}` : competencias[c.id]}
              </b>
              <span>
                {c.nome}
                <em>{c.resumo}</em>
                {/* O reforço aparece quando está pago: sem isto o jogador vê o
                    número subir e não sabe por quê, e o atributo de apoio
                    volta a parecer inútil. */}
                {c.reforco && (
                  <i className="osf-reforco" data-pago={reforcoAtivo(ficha, c.id) ? '' : undefined}>
                    {reforcoAtivo(ficha, c.id) ? '+1 por ' : `+1 com ${REFORCO_A_PARTIR_DE} de `}
                    {NOME_DO_ATRIBUTO[c.reforco]}
                  </i>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="osf-bloco">
        <h4>
          Talento especial
          <em>{TALENTOS_POR_PERSONAGEM === 1 ? 'um por personagem' : `${TALENTOS_POR_PERSONAGEM} por personagem`}</em>
        </h4>
        <label className="osf-campo">
          <span>Qual é</span>
          <select
            className="osf-talento-escolha"
            value={escolhido ? ficha.talento : (ficha.talento ? '__livre' : '')}
            disabled={!podeEditar}
            onChange={e => salvar({ talento: e.target.value === '__livre' ? ' ' : e.target.value })}
          >
            <option value="">— sem talento —</option>
            {TALENTOS.map(t => {
              const donos = tomados.get(t.id);
              return (
                <option key={t.id} value={t.id}>
                  {t.nome}{donos ? ` (já com ${donos.join(', ')})` : ''}
                </option>
              );
            })}
            <option value="__livre">Outro, inventado pelo Mestre…</option>
          </select>
        </label>

        {/* Talento do catálogo mostra a regra inteira e não deixa editar: o
            texto é o mesmo da aba de Talentos, e duas versões do mesmo
            talento na mesma mesa é como a discussão começa. */}
        {escolhido && (
          <div className="osf-talento-carta">
            <p className="osf-talento-resumo">{escolhido.resumo}</p>
            <p className="osf-talento-efeito">{escolhido.efeito}</p>
            <p className="osf-talento-quando"><span>Quando</span> {escolhido.quando} · {escolhido.limite}</p>
            {tomados.get(escolhido.id) && (
              <p className="osf-talento-repetido">
                Este talento já está com {tomados.get(escolhido.id).join(', ')}. Dois personagens
                com o mesmo talento perdem a única coisa que os diferencia — mas quem decide é o Mestre.
              </p>
            )}
          </div>
        )}

        {/* Só aparece quando o Mestre escolheu inventar um. */}
        {!escolhido && ficha.talento !== '' && (
          <>
            {campo('talento', 'Nome do talento', { placeholder: 'Sou enfermeira, reconheço esse cheiro' })}
            <label className="osf-campo">
              <span>O que ele permite</span>
              <textarea
                value={ficha.talentoResumo || ''} disabled={!podeEditar} rows={2}
                placeholder="Uma coisa só que esta pessoa sabe fazer e as outras não."
                onChange={e => salvar({ talentoResumo: e.target.value })}
              />
            </label>
          </>
        )}
      </section>

      <p className="osf-regua">
        d20 + competência contra: {DIFICULDADES.map(d => `${d.nome.toLowerCase()} ${d.alvo}`).join(' · ')}.
        20 natural passa, 1 natural falha e custa 1 de pavor.
      </p>
    </div>
  );
}
