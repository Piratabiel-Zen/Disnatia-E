import { useEffect, useRef, useState } from 'react';
import { assinarAssombracao } from '../../core/liveChannel';
import { estagioDaAssombracao, avisoAindaVale } from './assombracao.mjs';
import { tocarAssombracao } from './somDaAssombracao.mjs';
import './assombracao.css';

/**
 * A ASSOMBRAÇÃO NA TELA
 *
 * Mora na casca e não numa aba, porque a tela de todo mundo tem que escurecer
 * esteja a pessoa onde estiver — a graça é pegar quem estava mexendo na
 * ficha.
 *
 * ELA SEMPRE TERMINA SOZINHA. O fim sai do horário de início, não de um
 * segundo aviso: se o Mestre fechar a aba no meio, se a rede cair, se o
 * navegador engasgar, a tela volta do mesmo jeito. Uma sobreposição preta
 * presa na tela de um jogador acabaria com a sessão dele, e esse é o pior
 * jeito possível de uma feature de clima falhar.
 *
 * E nada aqui bloqueia: `pointer-events:none` em tudo. O jogador continua
 * podendo rolar, escrever e clicar enquanto a coisa está lá — ele só não
 * enxerga direito, que é o efeito pretendido.
 */
export default function Assombracao() {
  const [aviso, setAviso] = useState(null);
  const [estagio, setEstagio] = useState(null);
  const quadro = useRef(0);

  // Chega o aviso: só vale se começou agora. Quem entrou depois não leva o
  // susto que a mesa já levou.
  useEffect(() => assinarAssombracao(novo => {
    if (!avisoAindaVale(novo)) return;
    setAviso(novo);
    tocarAssombracao(novo.intensidade);
  }), []);

  // O relógio é de quem assiste. É isto que garante que a tela volta mesmo
  // se nada mais chegar pela rede.
  useEffect(() => {
    if (!aviso) return undefined;
    const passo = () => {
      const agora = estagioDaAssombracao(aviso);
      setEstagio(agora);
      if (agora) quadro.current = window.requestAnimationFrame(passo);
      else setAviso(null);
    };
    quadro.current = window.requestAnimationFrame(passo);
    return () => window.cancelAnimationFrame(quadro.current);
  }, [aviso]);

  if (!aviso || !estagio) return null;

  return (
    <div
      className="asb"
      data-fase={estagio.fase}
      data-intensidade={estagio.intensidade}
      aria-hidden="true"
      style={{ '--asb-veu': estagio.veu, '--asb-nitidez': estagio.nitidez }}
    >
      <span className="asb-escuro" />
      {aviso.imagem && (
        <img
          className="asb-coisa" src={aviso.imagem} alt=""
          style={{
            opacity: estagio.nitidez,
            transform: `scale(${estagio.escala * (0.97 + estagio.presenca * 0.03)})`,
          }}
        />
      )}
      {/* Sem imagem a assombração acontece assim mesmo: o escuro e o som
          sozinhos já valem a cena, e é melhor do que não acontecer nada. */}
      {!aviso.imagem && aviso.titulo && (
        <p className="asb-nome" style={{ opacity: estagio.nitidez }}>{aviso.titulo}</p>
      )}
    </div>
  );
}
