import { TRACOS } from './iconesOneShot.mjs';

/**
 * O ÍCONE NA TELA
 *
 * Os desenhos moram em `iconesOneShot.mjs`, como dados. Aqui só vira SVG.
 * A separação existe porque o teste que garante que nenhum atributo nem
 * competência ficou sem ícone roda no Node, que não importa `.jsx`.
 *
 * Nome que não existe não desenha nada em vez de quebrar: competência nova
 * entra sem derrubar a ficha de quem já está jogando — e o teste é quem
 * cobra o ícone que faltou, não a mesa no meio da cena.
 */
export default function Icone({ nome, className = '' }) {
  const tracos = TRACOS[nome];
  if (!tracos) return null;
  return (
    <svg
      className={`osf-icone ${className}`.trim()}
      viewBox="0 0 24 24" width="1em" height="1em"
      fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
    >
      {tracos.map((t, i) => {
        const { t: tag, ...attrs } = t;
        if (tag === 'path') return <path key={i} {...attrs} />;
        if (tag === 'circle') return <circle key={i} {...attrs} />;
        if (tag === 'ellipse') return <ellipse key={i} {...attrs} />;
        if (tag === 'rect') return <rect key={i} {...attrs} />;
        return null;
      })}
    </svg>
  );
}

export { TEM_ICONE } from './iconesOneShot.mjs';
