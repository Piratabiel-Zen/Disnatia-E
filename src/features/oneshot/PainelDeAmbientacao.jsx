/**
 * O PAINEL DE AMBIENTAÇÃO — a mesa de luz do Mestre
 *
 * Abre pelo botão no canto superior direito, logo abaixo do de
 * esconderijos. Tem dois lados:
 *
 *   PÔR      escolhe um tipo e toca no mapa.
 *   AJUSTAR  toca numa peça que já está lá e mexe em tamanho, força e no
 *            interruptor.
 *
 * Os dois modos existem porque o mesmo toque não pode fazer as duas
 * coisas: com um tipo escolhido, tocar perto de uma peça criaria outra em
 * cima dela; sem tipo escolhido, tocar no vazio não faria nada.
 *
 * O interruptor é o controle mais importante da tela e por isso é o maior:
 * é o que o Mestre aperta no meio da cena, quando os primos ligam o
 * gerador, e ele precisa acertar sem olhar.
 */
import React from 'react';
import {
  TIPOS, TAMANHO, FORCA, AJUSTE, LIMITE_POR_MAPA,
  tipoDe, ehLuz, pecasDoMapa, cabeMais, ajusteDoMapa,
} from './ambientacao.mjs';
import './painel-de-ambientacao.css';

export default function PainelDeAmbientacao({
  pecas, mapaId, ajuste, escolhido, selecionada,
  aoEscolherTipo, aoMudarPeca, aoApagarPeca, aoMudarAjuste, aoFechar,
}) {
  const noMapa = pecasDoMapa(pecas, mapaId);
  const peca = noMapa.find(p => p.id === selecionada) || null;
  const a = ajusteDoMapa(ajuste);
  const cheio = !cabeMais(pecas, mapaId);

  const luzes = TIPOS.filter(t => t.grupo === 'luz');
  const coisas = TIPOS.filter(t => t.grupo === 'coisa');

  return (
    <section className="pamb" aria-label="Ambientação do mapa">
      <header className="pamb-topo">
        <h4>Ambientação</h4>
        <span className="pamb-conta">{noMapa.length}/{LIMITE_POR_MAPA}</span>
        <button type="button" className="pamb-fechar" onClick={aoFechar} aria-label="Fechar">✕</button>
      </header>

      {peca ? (
        <Ajustes peca={peca} aoMudarPeca={aoMudarPeca} aoApagarPeca={aoApagarPeca} />
      ) : (
        <>
          <p className="pamb-dica">
            {escolhido
              ? `Toque no mapa para pôr ${tipoDe(escolhido)?.nome.toLowerCase()}.`
              : 'Escolha o que pôr, ou toque numa peça do mapa para ajustar.'}
          </p>
          <Paleta titulo="Luzes" tipos={luzes} escolhido={escolhido}
            cheio={cheio} aoEscolher={aoEscolherTipo} />
          <Paleta titulo="Coisas" tipos={coisas} escolhido={escolhido}
            cheio={cheio} aoEscolher={aoEscolherTipo} />
          {cheio && (
            <p className="pamb-cheio">
              Este mapa chegou ao limite. Apague alguma peça para pôr outra.
            </p>
          )}
        </>
      )}

      <div className="pamb-mapa-todo">
        <h5>O mapa inteiro</h5>
        {/* O ajuste geral fica sempre à vista, mesmo com uma peça
            selecionada: é o que o Mestre usa quando a energia cai na casa
            toda, e trocar de aba para isso custaria a cena. */}
        <Faixa rotulo="Luz" valor={a.brilho} limites={AJUSTE.brilho}
          aoMudar={v => aoMudarAjuste({ ...a, brilho: v })} />
        <Faixa rotulo="Contraste" valor={a.contraste} limites={AJUSTE.contraste}
          aoMudar={v => aoMudarAjuste({ ...a, contraste: v })} />
        <Faixa rotulo="Cor" valor={a.saturacao} limites={AJUSTE.saturacao}
          aoMudar={v => aoMudarAjuste({ ...a, saturacao: v })} />
        <button type="button" className="pamb-zerar"
          onClick={() => aoMudarAjuste({ brilho: 1, contraste: 1, saturacao: 1 })}>
          devolver ao normal
        </button>
      </div>
    </section>
  );
}

function Paleta({ titulo, tipos, escolhido, cheio, aoEscolher }) {
  return (
    <div className="pamb-paleta">
      <h5>{titulo}</h5>
      <div className="pamb-tipos">
        {tipos.map(t => (
          <button key={t.id} type="button" title={t.resumo} disabled={cheio}
            className={escolhido === t.id ? 'is-on' : ''}
            onClick={() => aoEscolher(escolhido === t.id ? '' : t.id)}>
            <i style={{ background: t.cor }} aria-hidden="true" />
            {t.nome}
          </button>
        ))}
      </div>
    </div>
  );
}

function Ajustes({ peca, aoMudarPeca, aoApagarPeca }) {
  const tipo = tipoDe(peca.tipo);
  const luz = ehLuz(peca);
  return (
    <div className="pamb-ajustes">
      <div className="pamb-qual">
        <i style={{ background: tipo?.cor }} aria-hidden="true" />
        <b>{tipo?.nome}</b>
        <button type="button" className="pamb-apagar" onClick={() => aoApagarPeca(peca)}>
          apagar
        </button>
      </div>

      <button type="button"
        className={`pamb-interruptor${peca.ligada ? ' is-on' : ''}`}
        onClick={() => aoMudarPeca({ ...peca, ligada: !peca.ligada })}>
        <span className="pamb-bolha" />
        {peca.ligada
          ? (luz ? 'Acesa' : 'Visível')
          : (luz ? 'Apagada' : 'Escondida')}
      </button>
      {luz && !peca.ligada && (
        <p className="pamb-nota">
          A luz apagada continua no mapa, escura. É o que faz acendê-la
          depois significar alguma coisa.
        </p>
      )}

      <Faixa rotulo="Tamanho" valor={peca.tamanho ?? 1} limites={TAMANHO}
        aoMudar={v => aoMudarPeca({ ...peca, tamanho: v })} />
      <Faixa rotulo={luz ? 'Brilho' : 'Presença'} valor={peca.forca ?? 1} limites={FORCA}
        aoMudar={v => aoMudarPeca({ ...peca, forca: v })} />
    </div>
  );
}

/**
 * Uma faixa com os botões de menos e mais nas pontas.
 *
 * A faixa sozinha não serve no meio de uma cena: acertar um passo de 0,1
 * arrastando, no celular, com a casa escura, é mais difícil do que
 * parece. Os botões dão o passo exato sem mira.
 */
function Faixa({ rotulo, valor, limites, aoMudar }) {
  const passo = n => aoMudar(Math.min(limites.max, Math.max(limites.min,
    Math.round((Number(valor) + n) * 100) / 100)));
  return (
    <label className="pamb-faixa">
      <span className="pamb-rotulo">{rotulo}<b>{Number(valor).toFixed(1)}</b></span>
      <span className="pamb-controles">
        <button type="button" onClick={() => passo(-limites.passo)} aria-label={`${rotulo} menos`}>−</button>
        <input type="range" min={limites.min} max={limites.max} step={limites.passo}
          value={valor} onChange={e => aoMudar(Number(e.target.value))} />
        <button type="button" onClick={() => passo(limites.passo)} aria-label={`${rotulo} mais`}>+</button>
      </span>
    </label>
  );
}
