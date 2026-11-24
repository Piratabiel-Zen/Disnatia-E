import { useState } from 'react';
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
export default function FichaRapida({ ficha: bruta, aoMudarCor, aoAbrirToken }) {
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
          ? <img className="fr-mini" src={ficha.retrato} alt="" />
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
              ? <img className="fr-retrato" src={ficha.retrato} alt="" />
              : <span className="fr-retrato fr-retrato-vazio">sem<br />retrato</span>}
            <div className="fr-quem">
              <b>{nome}</b>
              <small>{[ficha.ocupacao, ficha.idade && `${ficha.idade} anos`]
                .filter(Boolean).join(' · ') || 'sem ocupação'}</small>

              <div className="fr-medidores">
                <span data-medidor="vida" data-nivel={estado.ferida || undefined}>
                  Vida <b>{ficha.pv}/{pvMaximo}</b>
                </span>
                <span data-medidor="pavor" data-nivel={estado.pavor || undefined}>
                  Pavor <b>{ficha.pavor}/{PAVOR_MAXIMO}</b>
                </span>
                <span data-medidor="sanidade" data-nivel={estado.sanidade || undefined}>
                  Sanidade <b>{ficha.sanidade}/{SANIDADE_MAXIMA}</b>
                </span>
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

          {/* A saída para os controles do token, quando é o Mestre olhando
              o primo pelo mapa. Mora DENTRO da ficha para herdar a cor
              dela: botão solto do lado ficaria sem paleta nenhuma. */}
          {aoAbrirToken && (
            <button type="button" className="fr-ir-token" onClick={aoAbrirToken}>
              ⚙ Controles do token
            </button>
          )}
        </div>
      )}
    </div>
  );
}
