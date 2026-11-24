import { QUADRO, faceDoItem } from './facesDeItem.mjs';

/**
 * UM LADO DE UM ITEM, DESENHADO
 *
 * Só tradução: a geometria está em `facesDeItem.mjs`, onde dá para testar.
 * Aqui cada figura vira o elemento SVG dela, e nada mais.
 *
 * Vetor e não imagem porque o inspetor amplia até quatro vezes, e porque a
 * CSP desta mesa é estreita — arquivo externo pisca ou não chega.
 */

/**
 * `dentroDeGrupo` existe por um erro que só apareceu no navegador: um filho
 * sem `stroke` próprio recebia `stroke="none"` e apagava o traço do grupo —
 * os cinco selos dos amuletos ficaram invisíveis, e o teste passou porque a
 * figura estava lá, só não desenhava. Dentro de um grupo, o que não foi dito
 * é herdado, que é como SVG funciona quando ninguém atrapalha.
 */
const figura = (f, chave, dentroDeGrupo = false) => {
  const traco = dentroDeGrupo ? {
    fill: f.fill || (f.preenche ? 'currentColor' : undefined),
    stroke: f.stroke,
    strokeWidth: f.largura,
    opacity: f.opacidade,
  } : {
    fill: f.fill || (f.preenche ? 'currentColor' : 'none'),
    stroke: f.stroke || 'none',
    strokeWidth: f.largura,
    opacity: f.opacidade,
  };
  switch (f.t) {
    case 'r':
      return <rect key={chave} x={f.x} y={f.y} width={f.w} height={f.h} rx={f.raio} {...traco} />;
    case 'c':
      return <circle key={chave} cx={f.cx} cy={f.cy} r={f.raio} {...traco} />;
    case 'e':
      return <ellipse key={chave} cx={f.cx} cy={f.cy} rx={f.rx} ry={f.ry} {...traco} />;
    case 'p':
      return <path key={chave} d={f.d} {...traco} />;
    case 'g':
      return (
        <g key={chave} transform={f.move} fill="none" stroke={f.stroke}
          strokeWidth={f.largura} opacity={f.opacidade}
          strokeLinecap="round" strokeLinejoin="round">
          {(f.filhos || []).map((filho, n) => figura(
            // `preenche` dentro do grupo pinta com a cor do traço do grupo: é
            // assim que o miolo do selo fica da mesma cor da gravação.
            filho.preenche ? { ...filho, fill: f.stroke } : filho, `${chave}-${n}`, true,
          ))}
        </g>
      );
    default:
      return null;
  }
};

export default function FaceDeItem({ forma, selo, lado = 'frente', semEscritaFingida = false }) {
  const figuras = faceDoItem(forma, selo, lado, { semEscritaFingida });
  if (!figuras) return null;
  return (
    <svg
      viewBox={`0 0 ${QUADRO.largura} ${QUADRO.altura}`}
      width="100%" height="100%"
      aria-hidden="true" focusable="false"
      style={{ display: 'block' }}
    >
      {figuras.map((f, n) => figura(f, n))}
    </svg>
  );
}
