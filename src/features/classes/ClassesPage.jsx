import { onSnapshot } from '../../adventure/sharedSnapshot';
import { useEffect,useRef,useState } from "react";
import { collection,doc,setDoc } from "firebase/firestore";
import { db } from "../../core/firebase";
import { compressImage } from "../../core/media";
import { CLASSES } from "../../data/gameData";
import CosmicSelectionRing from "../../experience/CosmicSelectionRing";
import ClassScene from "./ClassScene";
import "./classes.css";
import { col, docIn } from '../../core/campaign';
function ClassesSection({ masterMode }) {
  const [activeId, setActiveId] = useState(CLASSES[0].id);
  const [covers, setCovers] = useState({});
  const fileRef = useRef(null);

  useEffect(() => {
  const unsub = onSnapshot(col('class_covers'), snap => {
    const data = {};
    snap.docs.forEach(d => { data[d.id] = d.data().img || ''; });
    setCovers(data);
  });
  return () => unsub();
}, []);

  const cls = CLASSES.find(c => c.id === activeId) || CLASSES[0];
  const cover = covers[cls.id] || '';

  const handleUpload = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async ev => {
      const compressed = await compressImage(ev.target.result, 900, 1200, 0.78);
      setCovers(prev => ({ ...prev, [cls.id]: compressed }));

      try {
        await setDoc(docIn('class_covers', cls.id), { img: compressed });
      } catch (err) {
        alert('Erro ao salvar a imagem desta classe. Tente uma imagem menor.');
        console.error(err);
      }
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const habilidades = [
    cls.passive ? { ...cls.passive, tipo: 'Passiva' } : null,
    ...(cls.normal || []).map(a => ({ ...a, tipo: 'Habilidade' })),
    ...(cls.specials || []).map(a => ({ ...a, tipo: 'Especial' })),
  ].filter(a => a?.name);

  const normais=(cls.normal||[]).filter(a=>a?.name);
  const especiais=(cls.specials||[]).filter(a=>a?.name);

  return (
    <>
    <ClassScene classId={cls.id} color={cls.color}/>
    <div className="classe-page">
      <header className="classe-intro">
        <span className="classe-intro-kicker">As linhagens de Cosmum</span>
        <h2>Classes</h2>
        <p>Escolha uma linhagem para conhecer sua origem e seus poderes</p>
      </header>

      <div className="classe-layout">
        <nav className="classe-list" aria-label="Linhagens">
          {CLASSES.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`classe-chip${c.id === activeId ? ' is-active' : ''}`}
              style={{ '--c': c.color }}
              aria-current={c.id === activeId ? 'true' : undefined}
            >
              <span className="classe-chip-medal" aria-hidden="true">
                {c.icon}
                {c.id === activeId && <CosmicSelectionRing color={c.color} radius="60%" dotSize={3} count={4} />}
              </span>
              <span className="classe-chip-text">
                <b>{c.name}</b>
                <small>{String(c.role || '').split('·')[0].trim()}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="classe-detail" style={{ '--c': cls.color }}>
          <section className="classe-hero">
            {cover ? (
              <div className="classe-hero-art"><img loading="lazy" decoding="async" src={cover} alt="" style={{ objectPosition: cls.objectPosition || 'center' }}/></div>
            ) : (
              <div className="classe-hero-empty">
                <span aria-hidden="true">{cls.icon}</span>
                <small>{masterMode ? 'Envie a ilustração desta linhagem' : 'Ilustração ainda não revelada'}</small>
              </div>
            )}
            {masterMode && (
              <button className="classe-hero-change" onClick={() => fileRef.current?.click()}>
                {cover ? '🖼 Trocar arte' : '🖼 Enviar arte'}
              </button>
            )}
            {masterMode && <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }}/>}
            <div className="classe-hero-copy">
              <span className="classe-hero-role">{cls.role}</span>
              <h3>{cls.name}</h3>
              <div className="classe-hero-reach">
                <span>Alcance <b>{cls.alcance || '—'}</b></span>
                <span>Habilidades <b>{normais.length + especiais.length + (cls.passive?.name && cls.passive.name !== '—' ? 1 : 0)}</b></span>
              </div>
            </div>
          </section>

          {cls.lore && <section className="classe-lore"><p>{cls.lore}</p></section>}

          {cls.passive?.name && cls.passive.name !== '—' && (
            <section className="classe-passive">
              <span className="classe-passive-mark" aria-hidden="true">✦</span>
              <div className="classe-passive-copy">
                <small>Passiva da linhagem</small>
                <b>{cls.passive.name}</b>
                <p>{cls.passive.desc}</p>
              </div>
            </section>
          )}

          {normais.length > 0 && (
            <section>
              <h4 className="classe-section-title">Habilidades</h4>
              <div className="classe-abilities">
                {normais.map((hab, i) => <AbilityCard key={`n_${i}_${hab.name}`} ability={hab}/>)}
              </div>
            </section>
          )}

          {especiais.length > 0 && (
            <section>
              <h4 className="classe-section-title">Especiais</h4>
              <div className="classe-abilities">
                {especiais.map((hab, i) => <AbilityCard key={`e_${i}_${hab.name}`} ability={hab} special/>)}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

function AbilityCard({ ability, special = false }) {
  const meta = [
    ability.cost ? `✦ ${ability.cost} VC` : null,
    ability.cooldown ? `⏱ ${ability.cooldown}` : null,
    ability.dano ? `⚔ ${ability.dano}` : null,
  ].filter(Boolean);
  return (
    <article className="classe-ability">
      <div className="classe-ability-head">
        <b>{ability.name}</b>
        {special && <span className="classe-ability-tag especial">Especial{ability.req ? ` · Nv ${ability.req}+` : ''}</span>}
      </div>
      <p>{ability.desc || 'Descrição ainda não registrada.'}</p>
      {meta.length > 0 && (
        <div className="classe-ability-meta">{meta.map(item => <span key={item}>{item}</span>)}</div>
      )}
    </article>
  );
}

export default ClassesSection;
