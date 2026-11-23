import './caveira-3d.css';

/**
 * A CAVEIRA QUE GIRA
 *
 * A marca de uma mesa de One Shot Terror. O tomo é a Dinastia E, a cruz é o
 * CAIN; aqui a mesa não tem instituição nem instrumento — tem o que sobra de
 * uma pessoa.
 *
 * As outras duas marcas são sólidas, montadas em caixas com espessura. Uma
 * caveira não se faz assim: cada tentativa de empilhar caixas vira um dado
 * com buracos. Então esta é um disco que gira com DUAS FACES desenhadas — o
 * crânio de frente e a nuca de trás — e a volta inteira mostra as duas,
 * passando pelo perfil fino. A rotação é a mesma dos outros, sobre o próprio
 * eixo, para a navegação não ter dois ritmos.
 *
 * O desenho é nosso, em CSS: órbitas fundas com sombra interna, a cavidade
 * nasal em triângulo e a linha dos dentes como filetes. Nada de emoji — ☠
 * muda de cara em cada sistema operacional e numa mesa de terror a marca não
 * pode virar engraçada no celular de alguém.
 *
 * CSS e não WebGL pelo mesmo motivo das outras: a navegação fica montada o
 * tempo todo e um contexto de GPU vivo ali sai caro em máquina fraca.
 */
export default function SkullMark3D({ sigil = '', title = 'Mesa' }) {
  return (
    <span className="caveira3d" role="img" aria-label={`Marca de ${title}`}>
      <span className="caveira3d-aura" aria-hidden="true" />
      <span className="caveira3d-palco" aria-hidden="true">
        <span className="caveira3d-corpo">
          <span className="caveira3d-face frente">
            <i className="caveira3d-cranio">
              <i className="caveira3d-orbita esquerda" />
              <i className="caveira3d-orbita direita" />
              <i className="caveira3d-nariz" />
              <i className="caveira3d-maxilar">
                <b /><b /><b /><b /><b />
              </i>
            </i>
          </span>
          <span className="caveira3d-face tras">
            <i className="caveira3d-cranio">
              <i className="caveira3d-sutura" />
              {sigil ? <b className="caveira3d-sigilo">{sigil}</b> : null}
            </i>
          </span>
        </span>
      </span>
    </span>
  );
}
