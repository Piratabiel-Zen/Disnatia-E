import './livro-3d.css';

// O tomo que gira na marca da mesa.
//
// É um livro de verdade em três dimensões — seis faces, miolo de páginas,
// nervuras na lombada e corte dourado — girando sem parar sobre o próprio
// eixo. Feito em CSS 3D, não em WebGL: a navegação fica montada o tempo
// inteiro, e manter um contexto de GPU vivo ali o tempo todo custaria caro
// em qualquer máquina fraca da mesa.
//
// Em outra campanha não existe Livro da Mandíbula, então a marca vira o
// sigilo daquela mesa — o componente só é chamado onde o livro faz sentido.
export default function BookMark3D({ sigil = '✦', title = 'Dinastia E' }) {
  return (
    <span className="tomo3d" role="img" aria-label={`Marca de ${title}`}>
      <span className="tomo3d-aura" aria-hidden="true" />
      <span className="tomo3d-palco" aria-hidden="true">
        <span className="tomo3d-corpo">
          <span className="tomo3d-face capa"><i className="tomo3d-sigilo">{sigil}</i></span>
          <span className="tomo3d-face contracapa" />
          <span className="tomo3d-face lombada"><i /><i /><i /></span>
          <span className="tomo3d-face corte" />
          <span className="tomo3d-face topo" />
          <span className="tomo3d-face base" />
        </span>
      </span>
    </span>
  );
}
