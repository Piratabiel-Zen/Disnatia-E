import { onSnapshot } from '../../adventure/sharedSnapshot';
import { useEffect,useRef,useState } from "react";
import { collection,doc,setDoc } from "firebase/firestore";
import { db } from "../../core/firebase";
import { compressImage } from "../../core/media";
import { CLASSES } from "../../data/gameData";
function ClassesSection({ masterMode }) {
  const [activeId, setActiveId] = useState(CLASSES[0].id);
  const [covers, setCovers] = useState({});
  const fileRef = useRef(null);

  useEffect(() => {
  const unsub = onSnapshot(collection(db, 'class_covers'), snap => {
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
        await setDoc(doc(db, 'class_covers', cls.id), { img: compressed });
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

  return (
    <div style={{maxWidth:1040,margin:'0 auto',padding:'40px 24px 80px'}}>
      <div style={{textAlign:'center',marginBottom:32}}>
        <div style={{fontSize:11,letterSpacing:'0.4em',color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:13,textTransform:'uppercase'}}>As Cinco Linhagens</div>
        <h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:23,color:'#E8D8C0',fontWeight:700,margin:0}}>Classes</h2>
        <div style={{fontSize:12,color:'#4A4050',marginTop:9,fontFamily:'Cinzel,serif'}}>Selecione uma classe para ver detalhes e habilidades</div>
        <div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(232,160,32,0.6),transparent)',margin:'16px auto 0'}}/>
      </div>

      <div className="classes-grid">
        {/* LISTA DE CLASSES */}
        <div className="classes-list">
          {CLASSES.map(c => {
            const active = c.id === activeId;
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className="classes-list-item"
                style={{
                  border: `1px solid ${active ? c.color + '55' : 'rgba(255,255,255,0.07)'}`,
                  background: active ? `${c.color}14` : 'rgba(255,255,255,0.02)',
                  boxShadow: active ? `0 0 16px ${c.glow}` : 'none',
                }}
              >
                <span style={{fontSize:18,flexShrink:0}}>{c.icon}</span>
                <span style={{fontFamily:'Cinzel,serif',fontSize:12.5,fontWeight:700,color:active?c.color:'#8A7A8A',lineHeight:1.3}}>{c.name}</span>
              </button>
            );
          })}
        </div>

        {/* DETALHE DA CLASSE */}
        <div className="class-detail-grid">
          {/* ILUSTRAÇÃO */}
          <div className="class-illustration" onClick={() => masterMode && fileRef.current?.click()} style={{border:`1px solid ${cls.color}33`,boxShadow:`0 10px 40px ${cls.glow}`}}>
  {cover ? (
    <div className="class-image-wrapper">
      <img loading="lazy" decoding="async" src={cover} alt={cls.name} style={{ objectPosition: cls.objectPosition || 'center' }} />
    </div>
  ) : (
    <div className="class-illustration-placeholder">
      <span style={{fontSize:40,opacity:0.3}}>{cls.icon}</span>
      <div style={{fontSize:11,color:'rgba(255,255,255,0.2)',fontFamily:'Cinzel,serif',letterSpacing:'0.06em'}}>
        {masterMode ? 'Toque para enviar a ilustração' : 'Nenhuma ilustração enviada'}
      </div>
    </div>
  )}
  {masterMode && cover && (
    <div style={{position:'absolute',top:10,right:10,padding:'4px 10px',borderRadius:6,background:'rgba(0,0,0,0.6)',border:`1px solid ${cls.color}44`,color:cls.color,fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.08em',zIndex:2}}>🖼 Trocar</div>
  )}
  {masterMode && <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{display:'none'}}/>}
</div>

          {/* INFO */}
          <div>
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:'Cinzel Decorative,serif',fontSize:19,color:cls.color,fontWeight:700,letterSpacing:'0.02em',marginBottom:6,textShadow:`0 0 24px ${cls.glow}`}}>{cls.name}</div>
              <div style={{fontSize:11,color:'#7B6D8A',fontFamily:'Cinzel,serif',letterSpacing:'0.06em'}}>{cls.role}</div>
            </div>

            <p style={{fontSize:13.5,color:'#9A8A7A',lineHeight:1.85,fontStyle:'italic',margin:'0 0 22px'}}>{cls.lore}</p>

            <div style={{marginBottom:20}}>
              <div style={{fontSize:10,letterSpacing:'0.35em',color:'rgba(255,255,255,0.25)',fontFamily:'Cinzel,serif',marginBottom:10,textTransform:'uppercase'}}>Habilidades</div>
              <div style={{display:'flex',flexDirection:'column',gap:7}}>
                {habilidades.map((hab, i) => (
                  <div key={`ability_${i}_${hab.name}`} className="class-ability-hover" tabIndex={0} style={{'--ability-color':cls.color}}>
                    <span className="class-ability-glyph">◆</span>
                    <span className="class-ability-name">{hab.name}</span>
                    <span className="class-ability-hint">detalhes</span>
                    <div className="class-ability-tooltip" role="tooltip">
                      <small>{hab.tipo}{hab.req ? ` · Nv ${hab.req}+` : ''}</small>
                      <strong>{hab.name}</strong>
                      <p>{hab.desc || 'Descrição ainda não registrada.'}</p>
                      {(hab.cost || hab.cooldown || hab.dano) && <div className="class-ability-meta">
                        {hab.cost ? <span>✦ {hab.cost} VC</span> : null}
                        {hab.cooldown ? <span>⏱ {hab.cooldown}</span> : null}
                        {hab.dano ? <span>⚔ {hab.dano}</span> : null}
                      </div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{border:`1px solid ${cls.color}28`,borderRadius:10,background:`${cls.color}09`,padding:'14px 16px'}}>
              <div style={{fontSize:10,letterSpacing:'0.3em',color:cls.color,fontFamily:'Cinzel,serif',marginBottom:8,textTransform:'uppercase'}}>Características</div>
              <div style={{fontSize:13,color:'#8A7A6A',lineHeight:1.75}}>{cls.passive?.desc}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClassesSection;
