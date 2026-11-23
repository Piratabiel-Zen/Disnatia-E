import { EMBLEMAS } from './emblemasDasRegras.mjs';

/** A gravura de um capítulo. Nome que não existe não desenha nada. */
export default function Emblema({ nome, className = '' }) {
  const tracos = EMBLEMAS[nome];
  if (!tracos) return null;
  return (
    <svg
      className={`osr-emblema ${className}`.trim()}
      viewBox="0 0 64 64" width="1em" height="1em"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
    >
      {tracos.map((t, i) => {
        const { t: tag, ...attrs } = t;
        if (tag === 'circle') return <circle key={i} {...attrs} />;
        return <path key={i} {...attrs} />;
      })}
    </svg>
  );
}
