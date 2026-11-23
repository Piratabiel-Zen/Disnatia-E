import {
  ATRIBUTOS, ATRIBUTO_MAXIMO_NA_CRIACAO, ATRIBUTO_MINIMO, COMPETENCIAS,
  DIFICULDADES, PAVOR_MAXIMO, PONTOS_DE_SORTE, SANIDADE_MAXIMA,
  competenciasDaFicha, marcar, aliviar, pontosRestantes, pvMaximoDaFicha,
  responderAVisao, normalizar,
} from './fichaOneShot.mjs';
import { comprimirParaDocumento } from '../../core/media';
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

export default function FichaOneShot({ ficha: bruta, aoMudar, podeEditar = false, mestre = false }) {
  const ficha = normalizar(bruta);
  const competencias = competenciasDaFicha(ficha);
  const pvMaximo = pvMaximoDaFicha(ficha);
  const restantes = pontosRestantes(ficha);
  const salvar = patch => aoMudar?.({ ...ficha, ...patch });

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
          <em>atributo − 1; não se marca aqui</em>
        </h4>
        <ul className="osf-competencias">
          {COMPETENCIAS.map(c => (
            <li key={c.id}>
              <b>+{competencias[c.id]}</b>
              <span>
                {c.nome}
                <em>{c.resumo}</em>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="osf-bloco">
        <h4>
          Talento especial
          <em>um por personagem</em>
        </h4>
        {campo('talento', 'Qual é', { placeholder: 'Sou enfermeira, reconheço esse cheiro' })}
        <label className="osf-campo">
          <span>O que ele permite</span>
          <textarea
            value={ficha.talentoResumo || ''} disabled={!podeEditar} rows={2}
            placeholder="Uma coisa só que esta pessoa sabe fazer e as outras não."
            onChange={e => salvar({ talentoResumo: e.target.value })}
          />
        </label>
      </section>

      <p className="osf-regua">
        d20 + competência contra: {DIFICULDADES.map(d => `${d.nome.toLowerCase()} ${d.alvo}`).join(' · ')}.
        20 natural passa, 1 natural falha e custa 1 de pavor.
      </p>
    </div>
  );
}
