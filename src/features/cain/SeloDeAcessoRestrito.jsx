import { useEffect, useRef } from 'react';
import './selo-restrito.css';

/**
 * ACESSO RESTRITO — EXORCISTA DIVERGENTE
 *
 * O que acontece quando alguém toca a ficha de outro exorcista: a tela estremece
 * e um selo prateado se fecha sobre ela. É recusa, não erro — por isso não tem
 * cara de alerta de sistema. Prata sobre o cenário, letra espaçada, um anel que
 * se fecha uma vez e fica.
 *
 * Some ao toque, ao Esc, e sozinho depois de alguns segundos: ninguém precisa
 * procurar como sair de uma porta que não abriu.
 *
 * Tremer é informação, não enfeite. Quem tem `data-motion="reduced"` ligado
 * recebe o mesmo selo parado — a recusa continua clara sem a sacudida.
 */
const TEMPO_EM_TELA = 4200;

export default function SeloDeAcessoRestrito({ nome = '', aoFechar }) {
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;

  useEffect(() => {
    const relogio = setTimeout(() => fechar.current?.(), TEMPO_EM_TELA);
    const naTecla = e => { if (e.key === 'Escape') fechar.current?.(); };
    window.addEventListener('keydown', naTecla);
    return () => { clearTimeout(relogio); window.removeEventListener('keydown', naTecla); };
  }, []);

  return (
    <div className="selo-restrito" role="alertdialog" aria-label="Acesso restrito" onClick={() => fechar.current?.()}>
      <div className="selo-restrito-marca">
        <svg viewBox="0 0 220 220" aria-hidden="true" focusable="false">
          <circle className="selo-anel" cx="110" cy="110" r="96" />
          <circle className="selo-anel-interno" cx="110" cy="110" r="78" />
          {/* Dois traços cruzados: o lacre. Nada de cadeado — a mesa é de
              exorcismo, o vocabulário é de selo. */}
          <path className="selo-lacre" d="M58 58 L162 162 M162 58 L58 162" />
          <path className="selo-risco" d="M110 14v22M110 184v22M14 110h22M184 110h22" />
        </svg>
      </div>
      <strong className="selo-restrito-titulo">Acesso restrito</strong>
      <span className="selo-restrito-sub">Exorcista divergente</span>
      <p className="selo-restrito-nota">
        {nome
          ? `Este registro responde a ${nome}. O seu é o único que se abre para você.`
          : 'Este registro responde a outro exorcista. O seu é o único que se abre para você.'}
      </p>
    </div>
  );
}
