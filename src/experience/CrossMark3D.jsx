import './cruz-3d.css';

/**
 * A CRUZ QUE GIRA
 *
 * A marca de uma mesa de CAIN. O tomo girando é a Dinastia E: ali a marca é
 * um livro porque a campanha inteira sai de um livro. Numa mesa de exorcismo
 * a marca tem que ser o instrumento, não o índice.
 *
 * É uma cruz sólida de verdade, não um desenho chapado: duas traves com
 * espessura, montadas em CSS 3D e giradas sobre o próprio eixo, exatamente
 * como o tomo. O que prende o olho é a mesma coisa que prendia lá — a luz
 * mudando de face quando a trave passa pela frente — e o nimbo atrás dá o
 * peso de objeto consagrado.
 *
 * Em CSS 3D e não em WebGL pelo mesmo motivo do tomo: a navegação fica
 * montada o tempo todo, e manter um contexto de GPU vivo ali sai caro em
 * máquina fraca.
 */
export default function CrossMark3D({ sigil = '', title = 'Mesa' }) {
  return (
    <span className="cruz3d" role="img" aria-label={`Marca de ${title}`}>
      <span className="cruz3d-aura" aria-hidden="true" />
      <span className="cruz3d-palco" aria-hidden="true">
        <span className="cruz3d-corpo">
          <span className="cruz3d-nimbo" />
          <span className="cruz3d-trave vertical">
            <i className="cruz3d-face frente">{sigil ? <b>{sigil}</b> : null}</i>
            <i className="cruz3d-face tras" />
            <i className="cruz3d-face lado esquerda" />
            <i className="cruz3d-face lado direita" />
          </span>
          <span className="cruz3d-trave horizontal">
            <i className="cruz3d-face frente" />
            <i className="cruz3d-face tras" />
            <i className="cruz3d-face lado esquerda" />
            <i className="cruz3d-face lado direita" />
          </span>
        </span>
      </span>
    </span>
  );
}
