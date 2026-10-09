import './codex-cards.css';

// A native button keeps the entire card usable by pointer, touch and keyboard.
export default function CodexCard({name,photo,color='#a855f7',category,meta,description,badge,action='Abrir registro',onClick}) {
  return <button type="button" className="codex-card" style={{'--codex-color':color}} onClick={onClick} aria-label={name||'Sem nome'}>
    <span className="codex-card-art">
      {photo?<img src={photo} alt="" loading="lazy" decoding="async"/>:<span className="codex-card-placeholder" aria-hidden="true">{name?.[0]||'\u25C7'}</span>}
      <span className="codex-card-shade" aria-hidden="true"/>
      <span className="codex-card-category">{category}</span>
      {badge&&<span className="codex-card-badge">{badge}</span>}
      <span className="codex-card-identity"><strong>{name||'Sem nome'}</strong>{meta&&<small>{meta}</small>}</span>
    </span>
    <span className="codex-card-body"><span className="codex-card-description">{description||'Um novo registro aguarda para ser descoberto.'}</span><span className="codex-card-action">{action}<span aria-hidden="true">{'\u2197'}</span></span></span>
  </button>;
}
