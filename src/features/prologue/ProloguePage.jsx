import { onSnapshot } from '../../adventure/sharedSnapshot';
import { useEffect,useRef,useState } from "react";
import { doc,setDoc } from "firebase/firestore";
import { db } from "../../core/firebase";
import { compressImage } from "../../core/media";
import { PROLOGUE } from "../../data/gameData";
function PrologueSection({ masterMode }) {
  const [capa, setCapa] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'prologue_cover'), snap => {
      if (snap.exists()) setCapa(snap.data().img || '');
    });
    return () => unsub();
  }, []);

  const handleUpload = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async ev => {
      const compressed = await compressImage(ev.target.result, 900, 1200, 0.78);
      setCapa(compressed);

      try {
        await setDoc(doc(db, 'config', 'prologue_cover'), { img: compressed });
      } catch (err) {
        alert('Erro ao salvar a imagem do prólogo. Tente uma imagem menor.');
        console.error(err);
      }
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div style={{maxWidth:1040,margin:'0 auto',padding:'40px 24px 80px'}}>
      <div style={{textAlign:'center',marginBottom:36}}>
        <div style={{fontSize:11,letterSpacing:'0.4em',color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:14,textTransform:'uppercase'}}>O Começo de Tudo</div>
        <h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:27,color:'#E8D8C0',fontWeight:700,margin:0,textShadow:'0 0 40px rgba(168,85,247,0.4)'}}>Prólogo</h2>
        <div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(168,85,247,0.6),transparent)',margin:'18px auto 0'}}/>
      </div>

      <div className="prologue-grid">
        {/* CAPA / ILUSTRAÇÃO */}
        <div className="prologue-cover" onClick={() => masterMode && fileRef.current?.click()}>
  {capa ? (
    <div className="prologue-image-wrapper">
      <img loading="lazy" decoding="async" src={capa} alt="capa do prólogo" style={{ objectPosition: 'center' }} />
    </div>
  ) : (
    <div className="prologue-cover-placeholder">
      <div style={{fontSize:44,opacity:0.25}}>📖</div>
      <div style={{fontSize:12,color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',letterSpacing:'0.06em'}}>
        {masterMode ? 'Toque para enviar a ilustração do prólogo' : 'Nenhuma ilustração enviada ainda'}
      </div>
    </div>
  )}
  {masterMode && capa && (
    <div style={{position:'absolute',top:10,right:10,padding:'4px 10px',borderRadius:6,background:'rgba(0,0,0,0.6)',border:'1px solid rgba(168,85,247,0.3)',color:'#C8A8E8',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.08em',zIndex:2}}>🖼 Trocar imagem</div>
  )}
  {masterMode && <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{display:'none'}}/>}
</div>

        {/* NARRATIVA */}
        <div>
          <div className="prologue-title-card">
            <h3 style={{fontFamily:'Cinzel Decorative,serif',fontSize:19,color:'#E8D8C0',fontWeight:700,margin:0,letterSpacing:'0.03em'}}>O Despertar do Cosmum</h3>
          </div>
          <div style={{lineHeight:1.9,fontSize:16}}>
            {PROLOGUE.map((p, i) => {
              if (p.type === 'title') return <div key={i} style={{textAlign:'center',margin:'30px 0',fontFamily:'Cinzel,serif',fontSize:19,color:'#E8D8C0',fontWeight:700,letterSpacing:'0.05em',textShadow:'0 0 30px rgba(168,85,247,0.5)'}}>{p.text}</div>;
              if (p.type === 'highlight') return <div key={i} style={{margin:'26px 0',padding:'15px 22px',borderLeft:'2px solid #A855F7',background:'rgba(168,85,247,0.08)',borderRadius:'0 8px 8px 0',fontFamily:'Cinzel,serif',color:'#C8A8E8',fontSize:15}}>{p.text}</div>;
              if (p.type === 'warning') return <div key={i} style={{margin:'26px 0',padding:'15px 22px',borderLeft:'2px solid #E8193C',background:'rgba(232,25,60,0.08)',borderRadius:'0 8px 8px 0',fontFamily:'Cinzel,serif',color:'#F09090',fontSize:15}}>{p.text}</div>;
              if (p.type === 'finale') return <div key={i} style={{margin:'36px 0 0',padding:'22px',border:'1px solid rgba(168,85,247,0.25)',borderRadius:12,background:'rgba(168,85,247,0.05)',fontFamily:'Cinzel,serif',color:'#C0A8D8',fontSize:15,lineHeight:1.9,textAlign:'center'}}>{p.text}</div>;
              if (p.type === 'divider') return <div key={i} style={{textAlign:'center',margin:'28px 0',color:'rgba(255,255,255,0.14)',letterSpacing:'0.4em',fontSize:12}}>{p.text}</div>;
              if (p.type === 'intro' || p.type === 'pause') return <p key={i} style={{margin:'0 0 18px',color:'#B0A090',fontStyle:p.type==='pause'?'italic':'normal',fontSize:p.type==='intro'?17:15}}>{p.text}</p>;
              return <p key={i} style={{margin:'0 0 18px',color:'#9A8A7A'}}>{p.text}</p>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrologueSection;
