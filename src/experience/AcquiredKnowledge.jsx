import { useState } from 'react';
import ImageViewer from './ImageViewer';
import { acquiredFiles, acquiredSpells } from '../adventure/acquiredKnowledge';
import './acquired-knowledge.css';

export default function AcquiredKnowledge({ section }) {
  const [opened, setOpened] = useState(null);
  const file = opened === null ? null : acquiredFiles[opened];
  if (section === 'magias') return <section className="acquired-knowledge acquired-spells" aria-labelledby="acquired-spells-title">
    <header><span className="acquired-kicker">Conhecimento arcano</span><h3 id="acquired-spells-title">Magias adquiridas</h3><p>Os encantamentos revelados durante a jornada.</p></header>
    {acquiredSpells.map(spell => <article className="acquired-spell" key={spell.id}>
      <div className="acquired-spell-rune" aria-hidden="true">&#10022;</div>
      <div><span className="acquired-kicker">Magia de restauração</span><h4>{spell.name}</h4><p>{spell.description}</p><dl><div><dt>Cura por integrante</dt><dd>{spell.healing}</dd></div><div><dt>Alvo</dt><dd>Todo o grupo</dd></div><div><dt>Recarga</dt><dd>{spell.cooldown}</dd></div></dl></div>
    </article>)}
  </section>;
  return <section className="acquired-knowledge acquired-files" aria-labelledby="acquired-files-title">
    <header><span className="acquired-kicker">Assembleia / documentos recuperados</span><h3 id="acquired-files-title">Arquivos adquiridos</h3><p>{acquiredFiles.length} registros confidenciais</p></header>
    <div className="acquired-file-grid">{acquiredFiles.map((item, index) => <button key={item.id} className="acquired-file" onClick={() => setOpened(index)} aria-label={`Abrir ${item.title}`}>
      <div className="acquired-file-image"><img src={item.src} alt={item.title} loading="lazy" decoding="async" width="1103" height="1426"/></div>
      <span className="acquired-file-caption"><small>Registro {String(index + 1).padStart(2, '0')}</small><strong>{item.title}</strong><em>Confidencial</em></span>
    </button>)}</div>
    {file && <ImageViewer src={file.src} title={file.title} counter={`${opened + 1} de ${acquiredFiles.length}`} onClose={() => setOpened(null)} onPrevious={opened > 0 ? () => setOpened(opened - 1) : undefined} onNext={opened < acquiredFiles.length - 1 ? () => setOpened(opened + 1) : undefined}/>}
  </section>;
}
