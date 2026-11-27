import { useState } from 'react';
import { camposDaSenha, estadoDaSenha, temSenha } from '../sheets/senhaDaFicha.mjs';
import {
  ATRIBUTOS, ATRIBUTO_MAXIMO_NA_CRIACAO, ATRIBUTO_MINIMO, COMPETENCIAS,
  DIFICULDADES, PAVOR_MAXIMO, PONTOS_DE_SORTE, SANIDADE_MAXIMA,
  REFORCO_A_PARTIR_DE, REFORCO_BONUS, competenciasDaFicha, deterioracao, marcar,
  aliviar, pontosRestantes, pvMaximoDaFicha, reforcoAtivo, responderAoPavor,
  estadoDaSanidade, levantar,
  retratoPerturbado, valorDoAtributo, normalizar,
} from './fichaOneShot.mjs';
import {
  TALENTOS, TALENTOS_POR_PERSONAGEM, talentoPorId, talentosTomados,
} from './talentosOneShot.mjs';
import Icone from './IconesOneShot.jsx';
import { comprimirParaDocumento } from '../../core/media';
import './paginas-one-shot.css';
import './ficha-one-shot.css';
import './ficha-viva.css';

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

function Medidor({ rotulo, valor, maximo, aoMarcar, aoAliviar, podeEditar, perigo, cor = 'osso', icone }) {
  return (
    <div className="osf-medidor" data-perigo={perigo ? 'sim' : 'nao'} data-cor={cor}>
      <div className="osf-medidor-topo">
        <span><Icone nome={icone} />{rotulo}</span>
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
  /* Rascunho e botão, e não gravação a cada tecla: gravar calcula um
     resumo com sal novo, e uma escrita por letra gravaria oito senhas
     diferentes para "esqueleto" — só a última valeria. */
  const [rascunhoDaSenha, setRascunhoDaSenha] = useState('');
  const gravarSenha = async (texto = rascunhoDaSenha) => {
    aoMudar?.(await camposDaSenha(texto));
    setRascunhoDaSenha('');
  };
  const competencias = competenciasDaFicha(ficha);
  const pvMaximo = pvMaximoDaFicha(ficha);
  const restantes = pontosRestantes(ficha);
  const salvar = patch => aoMudar?.({ ...ficha, ...patch });
  const escolhido = talentoPorId(ficha.talento);
  const tomados = talentosTomados(fichasDaMesa, ficha.id);
  const estado = deterioracao(ficha);

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
    <div
      className="osf"
      data-ferida={estado.ferida || undefined}
      data-pavor={estado.pavor || undefined}
      data-sanidade={estado.sanidade || undefined}
    >
      {/* O papel envelhece junto com a pessoa. Fica atrás de tudo e sem pegar
          clique: ficha bonita que não deixa clicar no campo é ficha quebrada.
          As camadas leem só os três níveis da raiz, nunca o valor cru — quem
          sabe que Vida cai e os medidores enchem é `deterioracao()`. */}
      <span className="osf-vivo" aria-hidden="true">
        <i className="osf-sangue" /><i className="osf-gotas" />
        <i className="osf-pavor" />
        <i className="osf-riscos" /><i className="osf-sombras" />
      </span>

      {/* O VINCO do meio: é o que faz as duas colunas lerem como um caderno
          aberto e não como duas caixas lado a lado. Some junto com a segunda
          coluna quando a tela é estreita. */}
      <span className="osf-vinco" aria-hidden="true" />

      {/* O PAVIO ESTOUROU. Enquanto isto está na tela a mesa está
          esperando uma resposta, e nada mais na ficha importa agora. */}
      {ficha.pavorNoLimite && (
        <section className="osf-visao">
          <h4>O pavor encheu</h4>
          <p>
            Agora é um teste de <b>Vontade</b>. Passando, você segura — e
            não custa nada. Falhando, leva 1 de Sanidade, que não volta
            sozinha.
          </p>
          <p className="osf-visao-nota">
            O Mestre pede o teste. Depois marque aqui o que saiu.
          </p>
          {podeEditar && (
            <div className="osf-visao-botoes">
              <button type="button" onClick={() => aoMudar?.(responderAoPavor(ficha, { resistiu: true }))}>
                Segurei — o pavor zera
              </button>
              <button type="button" className="ceder" onClick={() => aoMudar?.(responderAoPavor(ficha, { resistiu: false }))}>
                Não segurei — +1 de Sanidade
              </button>
            </div>
          )}
        </section>
      )}

      {/* CAÍDA. Não há botão para levantar sozinha: quem levanta é outra
          pessoa, e por isso o botão fica disponível a quem abrir a ficha
          — inclusive ao primo que chegou perto. */}
      {estadoDaSanidade(ficha).caida && (
        <section className="osf-visao osf-caida">
          <h4>No chão</h4>
          <p>
            A Sanidade chegou ao fim e o corpo foi junto. Ela não levanta
            sozinha: alguém precisa chegar perto, acalmar, falar com ela.
          </p>
          <p className="osf-visao-nota">
            Quem levantar devolve um degrau — ela fica em {SANIDADE_MAXIMA - 1},
            já com a desvantagem, e com 1 de vida.
          </p>
          {podeEditar && (
            <div className="osf-visao-botoes">
              <button type="button" onClick={() => aoMudar?.(levantar(ficha))}>
                Alguém a levanta
              </button>
            </div>
          )}
        </section>
      )}

      {/* PÁGINA DA ESQUERDA: quem a pessoa é e em que estado ela está.
          É o lado que o jogador olha o tempo todo durante a cena. */}
      <div className="osf-pagina osf-pagina-esquerda">

      <section className="osf-bloco">
        <h4>Quem é</h4>
        <div className="osf-quem">
          {/* O RETRATO 3x4.
              Pequeno e com proporção de documento de propósito: é foto de
              arquivo, não ilustração de herói. Numa mesa de terror a foto 3x4
              já começa com cara de ficha de desaparecido — o que ajuda. */}
          {/* Só se perturba quando há retrato de verdade: o quadrado vazio
              com olhos escurecendo não é susto, é defeito. */}
          <div className="osf-retrato" data-perturbado={ficha.retrato && retratoPerturbado(ficha) ? '' : undefined}>
            {ficha.retrato
              ? <img src={ficha.retrato} alt="" loading="lazy" decoding="async" />
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
            icone="vida" rotulo="Vida" valor={ficha.pv} maximo={pvMaximo} perigo={ficha.pv <= 1}
            podeEditar={podeEditar}
            aoMarcar={n => salvar({ pv: Math.min(pvMaximo, ficha.pv + n) })}
            aoAliviar={n => salvar({ pv: Math.max(0, ficha.pv - n) })}
          />
          <Medidor
            icone="pavor" rotulo="Pavor" valor={ficha.pavor} maximo={PAVOR_MAXIMO} cor="roxo"
            perigo={ficha.pavor >= PAVOR_MAXIMO - 1} podeEditar={podeEditar}
            aoMarcar={n => aoMudar?.(marcar(ficha, 'pavor', n))}
            aoAliviar={n => aoMudar?.(aliviar(ficha, 'pavor', n))}
          />
          <Medidor
            icone="sanidade" rotulo="Sanidade" valor={ficha.sanidade} maximo={SANIDADE_MAXIMA} cor="sangue"
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

        {/* A chave do retrato é do MESTRE porque mexer na cara do personagem
            de alguém sem avisar cai mal com quem não pediu. Fica ligada por
            padrão e aqui, junto da condição, que é o que a dispara. */}
        {mestre && (
          <label className="osf-chave">
            <input
              type="checkbox"
              checked={ficha.retratoPerturbador !== false}
              disabled={!podeEditar}
              onChange={e => salvar({ retratoPerturbador: e.target.checked })}
            />
            <span>
              Deixar o retrato se alterar com a sanidade no fim
              <em>olhos escurecendo e uma silhueta atrás. Desligue para quem não quiser.</em>
            </span>
          </label>
        )}
      </section>

      <section className="osf-bloco">
        <h4>
          Atributos
          <em>{restantes > 0 ? `${restantes} por distribuir`
            : restantes === 0 ? 'os 20 estão distribuídos'
            : `${-restantes} além do permitido`}</em>
        </h4>
        <ul className="osf-atributos">
          {ATRIBUTOS.map(a => (
            <li key={a.id} title={a.resumo}>
              <Icone nome={a.id} />
              <span>{a.nome}</span>
              {podeEditar ? (
                <select
                  value={ficha.atributos[a.id]}
                  onChange={e => salvar({ atributos: { ...ficha.atributos, [a.id]: Number(e.target.value) } })}
                >
                  {Array.from(
                    { length: (mestre ? 5 : ATRIBUTO_MAXIMO_NA_CRIACAO) - ATRIBUTO_MINIMO + 1 },
                    (_, i) => ATRIBUTO_MINIMO + i,
                  ).map(v => {
                    /* OS 20 PONTOS VIRARAM TETO, NÃO AVISO.
                       O contador já dizia "3 além do permitido" e o
                       seletor deixava subir mesmo assim: a regra existia
                       no texto e não no programa, e quem montou a ficha
                       sozinho descobria o problema na hora de jogar.

                       Fecha para o jogador e fica aberto para o Mestre —
                       ele às vezes precisa de um personagem fora da
                       conta, e é ele quem responde por isso. */
                    const atual = ficha.atributos[a.id];
                    const estoura = !mestre && v > atual + restantes;
                    return <option key={v} value={v} disabled={estoura}>{v}</option>;
                  })}
                </select>
              ) : <b>{ficha.atributos[a.id]}</b>}
            </li>
          ))}
        </ul>
      </section>

      </div>

      {/* PÁGINA DA DIREITA: o que a pessoa sabe fazer. É o lado que ela
          consulta na hora de rolar, e por isso fica inteiro visível. */}
      <div className="osf-pagina osf-pagina-direita">

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
              <Icone nome={c.id} />
              <span>
                {c.nome}
                {/* De onde vem o número, em cima do cursor. Sem isto a
                    competência parece decidida por mágica, e o jogador que
                    quer melhorar uma não sabe onde pôr o ponto. */}
                <b className="osf-dica" aria-hidden="true">
                  {c.de.map(id => `${NOME_DO_ATRIBUTO[id]} ${valorDoAtributo(ficha, id)}`)
                    .join(c.de.length > 1 ? ' ou ' : '')}
                  {c.de.length > 1 && ' (vale o maior)'}
                  {' → '}{competencias[c.id] < 0 ? '−' : '+'}{Math.abs(competencias[c.id])}
                  {c.reforco && (
                    reforcoAtivo(ficha, c.id)
                      ? `, com +${REFORCO_BONUS} de ${NOME_DO_ATRIBUTO[c.reforco]}`
                      : `. ${NOME_DO_ATRIBUTO[c.reforco]} ${valorDoAtributo(ficha, c.reforco)}: a partir de ${REFORCO_A_PARTIR_DE} daria +${REFORCO_BONUS}`
                  )}
                  {valorDoAtributo(ficha, c.de[0]) <= ATRIBUTO_MINIMO && c.de.every(
                    id => valorDoAtributo(ficha, id) <= ATRIBUTO_MINIMO,
                  ) && '. Sem ponto no atributo, nada tira daqui'}
                </b>
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

      {/* A SENHA DA FICHA, logo abaixo do talento.
          Fica aqui e não numa tela de administração porque é aqui que o
          Mestre está quando pensa nela: ele acabou de montar o personagem
          de alguém e vai passar a ficha para essa pessoa. */}
      {mestre && (
        <section className="osf-bloco osf-senha">
          <h4>
            Senha desta ficha
            <em>{estadoDaSenha(ficha) === 'protegida' ? 'com senha' : 'sem senha'}</em>
          </h4>
          <p className="osf-senha-nota">
            Quem souber a senha abre esta ficha e joga com ela. Depois de
            gravada a senha não fica em lugar nenhum — só o resumo dela. Se
            esquecer, grave outra.
          </p>
          {estadoDaSenha(ficha) === 'antiga' && (
            <p className="osf-senha-aviso">
              Esta senha é antiga, guardada em texto puro e visível para a
              mesa. Grave-a de novo aqui para trocá-la.
            </p>
          )}
          <div className="osf-senha-campo">
            <input
              type="text" value={rascunhoDaSenha}
              placeholder={temSenha(ficha) ? 'trocar a senha…' : 'definir uma senha…'}
              onChange={e => setRascunhoDaSenha(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && rascunhoDaSenha.trim()) gravarSenha(); }}
            />
            <button type="button" disabled={!rascunhoDaSenha.trim()} onClick={gravarSenha}>
              Gravar
            </button>
            {temSenha(ficha) && (
              <button
                type="button" className="osf-senha-tirar"
                onClick={() => gravarSenha('')}
                title="Deixar a ficha aberta para quem clicar"
              >Tirar</button>
            )}
          </div>
        </section>
      )}

      </div>

      <p className="osf-regua">
        d20 + competência contra: {DIFICULDADES.map(d => `${d.nome.toLowerCase()} ${d.alvo}`).join(' · ')}.
        20 natural passa, 1 natural falha e custa 1 de pavor.
      </p>
    </div>
  );
}
