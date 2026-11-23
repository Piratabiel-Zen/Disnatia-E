import { useEffect, useRef, useState } from 'react';
import { assinarVulto } from '../../core/liveChannel';
import { estagioDoVulto, valeNesteMapa, vultoAindaVale } from './vultoNoMapa.mjs';
import './exploracao.css';

/**
 * O VULTO QUE PASSA
 *
 * Escuta o canal, desenha a silhueta no cômodo e some sozinho. Como a
 * assombração, o fim vem do relógio de quem assiste — vulto preso num
 * cômodo seria pior que vulto nenhum: a mesa passaria a noite achando que
 * a coisa está parada ali.
 *
 * Vulto de outro mapa não aparece: a mesa pode estar olhando outro andar, e
 * um vulto no sótão enquanto todos olham o porão não assusta ninguém — só
 * confunde.
 */
export default function VultoNoMapa({ mapa }) {
  const [vulto, setVulto] = useState(null);
  const [estagio, setEstagio] = useState(null);
  const quadro = useRef(0);

  useEffect(() => assinarVulto(novo => {
    if (!vultoAindaVale(novo)) return;
    setVulto(novo);
  }), []);

  useEffect(() => {
    if (!vulto) return undefined;
    const passo = () => {
      const agora = estagioDoVulto(vulto);
      setEstagio(agora);
      if (agora) quadro.current = window.requestAnimationFrame(passo);
      else setVulto(null);
    };
    quadro.current = window.requestAnimationFrame(passo);
    return () => window.cancelAnimationFrame(quadro.current);
  }, [vulto]);

  if (!vulto || !estagio || !valeNesteMapa(vulto, mapa)) return null;

  const lado = `${estagio.escala * 100}%`;
  return (
    <div
      className="vul" aria-hidden="true"
      style={{
        left: `${vulto.x * 100}%`,
        top: `${vulto.y * 100}%`,
        width: lado,
        aspectRatio: '1 / 1.9',
        opacity: estagio.presenca,
      }}
    >
      {vulto.imagem ? <img src={vulto.imagem} alt="" /> : <span />}
    </div>
  );
}
