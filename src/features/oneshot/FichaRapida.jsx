import { useEffect, useRef, useState } from 'react';
import {
  COMPETENCIAS, PAVOR_MAXIMO, SANIDADE_MAXIMA,
  competenciasDaFicha, deterioracao, normalizar, pvMaximoDaFicha,
} from './fichaOneShot.mjs';
import { talentoPorId } from './talentosOneShot.mjs';
import { CORES, COR_PADRAO, comSinal, corPorId, talentoEmUmaLinha } from './fichaRapida.mjs';
import './ficha-rapida.css';

/**
 * A FICHA RÁPIDA, EM CIMA DO MAPA
 *
 * Abre e fecha num botão. Fechada é só uma aba estreita com o nome e a vida
 * — porque mesmo fechada ela precisa responder "quanto me resta", que é a
 * pergunta que mais se faz numa noite dessas.
 *
 * NÃO EDITA NADA. Ficha se edita na aba da ficha; painel de mapa que também
 * edita vira dois lugares para a mesma verdade, e um deles sempre fica para
 * trás. A única coisa que se muda aqui é a COR, que é da pessoa e não da
 * ficha — serve para ela se achar no meio de cinco primos parecidos.
 *
 * As competências entram todas, com nome e número e mais nada: numa cena a
 * pessoa não quer ler o que Furtividade significa, quer saber se soma ou
 * subtrai.
 */
/* Os três, numa lista só: o botão, o rótulo e o teto saem daqui, e não de
   três blocos quase iguais que vão divergir no primeiro ajuste. */
const MEDIDORES = Object.freeze([
  { id: 'vida', nome: 'Vida', campo: 'pv', estado: 'ferida', teto: max => max },
  { id: 'pavor', nome: 'Pavor', campo: 'pavor', estado: 'pavor', teto: () => PAVOR_MAXIMO },
  { id: 'sanidade', nome: 'Sanidade', campo: 'sanidade', estado: 'sanidade', teto: () => SANIDADE_MAXIMA },
]);

const limitar = (valor, minimo, maximo) =>
  Math.min(maximo, Math.max(minimo, Number(valor) || 0));

export default function FichaRapida({ ficha: bruta, aoMudarCor, aoMudar }) {
  /* A FICHA DIZ A PRÓPRIA ALTURA.
     Os botões que moram acima dela — esconder, bilhetes — precisam saber
     onde ela termina, e ela cresce quando abre. Com um número chutado no
     CSS eles ficavam certos com a ficha fechada e por baixo dela aberta.

     A medida vai para o elemento que contém os três (o palco do mapa), e
     não para o `:root`: duas fichas na mesma tela — Mestre e jogador —
     escreveriam no mesmo lugar e a última ganharia. */
  const caixa = useRef(null);
  useEffect(() => {
    const el = caixa.current;
    const palco = el?.offsetParent;
    if (!el || !palco) return undefined;
    const medir = () => palco.style.setProperty('--fr-altura', `${Math.round(el.offsetHeight)}px`);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => {
      observador.disconnect();
      palco.style.removeProperty('--fr-altura');
    };
  }, []);

  const [aberta, setAberta] = useState(false);
  const [escolhendoCor, setEscolhendoCor] = useState(false);
  if (!bruta) return null;

  const ficha = normalizar(bruta);
  const cor = corPorId(ficha.corDaFichaRapida || COR_PADRAO);
  const competencias = competenciasDaFicha(ficha);
  const estado = deterioracao(ficha);
  const pvMaximo = pvMaximoDaFicha(ficha);
  const talento = talentoEmUmaLinha(ficha, talentoPorId(ficha.talento));
  const nome = String(ficha.nome || '').trim() || 'Sem nome';

  const trocarCor = id => {
    aoMudarCor?.(id);
    setEscolhendoCor(false);
  };

  return (
    <div
      ref={caixa}
      className="fr" data-aberta={aberta ? '' : undefined}
      style={{
        '--fr-fundo': cor.fundo,
        '--fr-borda': cor.borda,
        '--fr-realce': cor.realce,
        '--fr-tinta': cor.tinta,
        '--fr-fraca': cor.fraca,
      }}
    >
      <button
        type="button" className="fr-aba"
        onClick={() => setAberta(a => !a)}
        aria-expanded={aberta}
        title={aberta ? 'Fechar a ficha' : 'Abrir a ficha'}
      >
        {ficha.retrato
          ? <img className="fr-mini" src={ficha.retrato} alt="" loading="lazy" decoding="async" />
          : <span className="fr-mini fr-mini-vazio" aria-hidden="true" />}
        <span className="fr-aba-texto">
          <b>{nome}</b>
          {/* Mesmo fechada ela responde "quanto me resta", que é a pergunta
              que mais se faz numa noite dessas. */}
          <small>{ficha.pv}/{pvMaximo} vida</small>
        </span>
        <span className="fr-seta" aria-hidden="true">{aberta ? '▾' : '▸'}</span>
      </button>

      {aberta && (
        <div className="fr-corpo">
          <div className="fr-topo">
            {ficha.retrato
              ? <img className="fr-retrato" src={ficha.retrato} alt="" loading="lazy" decoding="async" />
              : <span className="fr-retrato fr-retrato-vazio">sem<br />retrato</span>}
            <div className="fr-quem">
              <b>{nome}</b>
              <small>{[ficha.ocupacao, ficha.idade && `${ficha.idade} anos`]
                .filter(Boolean).join(' · ') || 'sem ocupação'}</small>

              {/* OS TRÊS MEDIDORES, COM MÃO.
                  Levar dano é a coisa mais frequente da noite, e era a que
                  exigia mais passos: sair do mapa, achar a aba de Fichas,
                  abrir a sua, mudar o número, voltar. No meio de uma caçada
                  ninguém faz isso — anota num papel e esquece.

                  Os botões só aparecem para quem pode mexer naquela ficha
                  (`aoMudar`), então o Mestre olhando a ficha de um primo
                  pelo token continua só olhando. */}
              <div className="fr-medidores" data-comBotoes={aoMudar ? '' : undefined}>
                {MEDIDORES.map(m => (
                  <span key={m.id} data-medidor={m.id} data-nivel={estado[m.estado] || undefined}>
                    {aoMudar && (
                      <button
                        type="button" className="fr-passo" aria-label={`Menos um de ${m.nome}`}
                        onClick={() => aoMudar(m.campo, limitar(ficha[m.campo] - 1, 0, m.teto(pvMaximo)))}
                      >−</button>
                    )}
                    {m.nome} <b>{ficha[m.campo]}/{m.teto(pvMaximo)}</b>
                    {aoMudar && (
                      <button
                        type="button" className="fr-passo" aria-label={`Mais um de ${m.nome}`}
                        onClick={() => aoMudar(m.campo, limitar(ficha[m.campo] + 1, 0, m.teto(pvMaximo)))}
                      >+</button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="fr-secao">Habilidade especial</p>
          {talento && (
            <p className="fr-talento">
              <b>{talento.nome}</b>
              {talento.resumo && <span>{talento.resumo}</span>}
            </p>
          )}

          <p className="fr-secao">Competências</p>
          <ul className="fr-competencias">
            {COMPETENCIAS.map(c => (
              <li key={c.id}>
                <span>{c.nome}</span>
                <b data-negativo={competencias[c.id] < 0 ? '' : undefined}>
                  {comSinal(competencias[c.id])}
                </b>
              </li>
            ))}
          </ul>

          {/* A COR É DE QUEM JOGA. Quando o Mestre abre a ficha de um primo
              pelo token, ele vê tudo e não troca a cor: ela serve para a
              pessoa se achar no meio de cinco parecidos, e quem escolhe
              como se achar é ela. Sem `aoMudarCor`, nem aparece. */}
          {aoMudarCor && (
          <div className="fr-cores">
            <button
              type="button" className="fr-cor-atual"
              onClick={() => setEscolhendoCor(v => !v)}
              aria-expanded={escolhendoCor}
            >
              Cor da ficha: {cor.nome}
            </button>
            {escolhendoCor && (
              <div className="fr-paleta" role="group" aria-label="Cor da ficha">
                {CORES.map(c => (
                  <button
                    key={c.id} type="button"
                    onClick={() => trocarCor(c.id)}
                    title={c.nome} aria-label={c.nome}
                    data-escolhida={c.id === cor.id ? '' : undefined}
                    style={{ background: c.fundo, borderColor: c.borda }}
                  />
                ))}
              </div>
            )}
          </div>
          )}

        </div>
      )}
    </div>
  );
}
