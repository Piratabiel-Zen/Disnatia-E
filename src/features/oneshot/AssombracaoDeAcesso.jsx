import { useEffect, useRef } from 'react';
import './assombracao-de-acesso.css';

/**
 * A ASSOMBRAÇÃO — o que atende quando se toca a ficha de outra pessoa.
 *
 * A mesa de terror herdava o selo prateado do CAIN, que fala de exorcista
 * divergente e tem cara de carimbo de arquivo. Serve lá; aqui é a coisa
 * errada: numa noite de casa assombrada a recusa não pode parecer
 * burocracia, tem que parecer que alguém notou.
 *
 * Então uma caveira sobe do escuro atrás do aviso, devagar, e fica
 * olhando. Ela não pisca nem salta: susto de tela que pula é susto de
 * jogo barato e ninguém leva a sério depois da segunda vez. O que assusta
 * é a coisa que estava lá antes de você chegar.
 *
 * Some ao toque, ao Esc e sozinha depois de alguns segundos — ninguém
 * precisa procurar como sair de uma porta que não abriu.
 */
const TEMPO_EM_TELA = 5200;

const RECADOS = [
  'A história dela não é sua. Deixe onde está.',
  'Não leia o que não foi escrito para você.',
  'Essa não é a sua história. E ela já sabe que você tentou.',
];

export default function AssombracaoDeAcesso({ nome = '', aoFechar }) {
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;

  /* O recado é sorteado uma vez e fica: trocar a frase enquanto a caveira
     está na tela estragaria o que ela tem de melhor, que é parecer que
     alguém está falando com você. Mas varia entre uma tentativa e outra,
     senão na terceira vez vira texto de sistema. */
  const recado = useRef(RECADOS[Math.floor(Math.random() * RECADOS.length)]);

  useEffect(() => {
    const relogio = setTimeout(() => fechar.current?.(), TEMPO_EM_TELA);
    const naTecla = e => { if (e.key === 'Escape') fechar.current?.(); };
    window.addEventListener('keydown', naTecla);
    return () => { clearTimeout(relogio); window.removeEventListener('keydown', naTecla); };
  }, []);

  return (
    <div
      className="assb" role="alertdialog" aria-label="Esta ficha não é sua"
      onClick={() => fechar.current?.()}
    >
      <div className="assb-caveira" aria-hidden="true">
        <svg viewBox="0 0 200 220" focusable="false">
          {/* O crânio: uma forma só, sem contorno, para ele emergir do
              escuro em vez de estar desenhado por cima dele. */}
          <path className="assb-cranio" d="M100 18c-41 0-68 28-68 68 0 24 9 40 22 52 6 6 8 12 8 21v12c0
            7 5 12 12 12h52c7 0 12-5 12-12v-12c0-9 2-15 8-21 13-12 22-28 22-52
            0-40-27-68-68-68z" />
          <ellipse className="assb-orbita" cx="72" cy="92" rx="21" ry="24" />
          <ellipse className="assb-orbita" cx="128" cy="92" rx="21" ry="24" />
          {/* As duas brasas dentro das órbitas. É a única coisa que se
              move — o resto fica parado, e é isso que faz o olhar pesar. */}
          <circle className="assb-brasa" cx="72" cy="94" r="5" />
          <circle className="assb-brasa assb-brasa-b" cx="128" cy="94" r="5" />
          <path className="assb-nariz" d="M100 118l-11 22h22z" />
          <path className="assb-dentes" d="M74 166h52M86 158v18M100 158v18M114 158v18" />
        </svg>
      </div>

      <strong className="assb-titulo">Não é sua</strong>
      <p className="assb-recado">{recado.current}</p>
      {nome && <span className="assb-nome">{nome}</span>}
    </div>
  );
}
