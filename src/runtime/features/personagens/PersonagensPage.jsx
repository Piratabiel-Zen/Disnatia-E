import CodexCard from '../../experience/CodexCard';
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { useEffect,useRef,useState } from "react";
import { collection,deleteDoc,doc,setDoc } from "firebase/firestore";
import { db } from "../../core/firebase";
import { compressImage } from "../../core/media";
const newNPC = id => ({ id, nome: '', foto: '', genero: '', idade: '', descricao: '' });

function NPCCard({ npc, onChange, onDelete, masterMode }) {
  const f = (k, v) => onChange({ ...npc, [k]: v });
  const photoRef = useRef(null);
  const handlePhoto = async e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => { const c = await compressImage(ev.target.result, 900, 900, 0.75); f('foto', c); };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ border:'1px solid rgba(168,85,247,0.28)', borderRadius:14, overflow:'hidden', background:'rgba(5,2,13,0.98)', boxShadow:'0 4px 28px rgba(105,35,170,0.12)' }}>
      <div style={{ height:3, background:'linear-gradient(90deg,#A855F7,#A855F722,transparent)' }}/>
      <div onClick={()=>masterMode&&photoRef.current?.click()} style={{position:'relative',width:'100%',cursor:masterMode?'pointer':'default',background:'#030108',overflow:'hidden'}}>
        {npc.foto
          ? <img loading="lazy" decoding="async" src={npc.foto} alt={npc.nome} style={{width:'100%',height:'auto',maxHeight:'70vh',objectFit:'contain',display:'block',background:'#030108'}}/>
          : <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'38px 24px',opacity:0.3}}><span style={{fontSize:26}}>👤</span><span style={{fontSize:12,color:'rgba(255,255,255,0.5)',fontFamily:'Cinzel,serif'}}>{masterMode?'Toque para adicionar foto':'Sem foto disponível'}</span></div>}
        {masterMode&&<input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}}/>}
      </div>
      <div style={{padding:'18px'}}>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:10,letterSpacing:'0.3em',color:'#8A66A8',fontFamily:'Cinzel,serif',display:'block',marginBottom:6,textTransform:'uppercase'}}>Personagem</label>
          {masterMode
            ? <input value={npc.nome||''} onChange={e=>f('nome',e.target.value)} placeholder="Nome do personagem..." style={{width:'100%'}}/>
            : <div style={{fontFamily:'Cinzel,serif',fontSize:19,fontWeight:700,color:'#D7B8F2'}}>{npc.nome||'Desconhecido'}</div>}
        </div>
        <div>
          <label style={{fontSize:10,letterSpacing:'0.3em',color:'#8A66A8',fontFamily:'Cinzel,serif',display:'block',marginBottom:6,textTransform:'uppercase'}}>Descrição</label>
          {masterMode
            ? <textarea value={npc.descricao||''} onChange={e=>f('descricao',e.target.value)} placeholder="Descreva a aparência, personalidade e papel na história..." rows={7} style={{width:'100%',resize:'vertical',lineHeight:1.8}}/>
            : <div style={{fontSize:14,color:'#A99AAD',lineHeight:1.85,whiteSpace:'pre-wrap',background:'rgba(255,255,255,0.018)',padding:'13px 14px',borderRadius:8,border:'1px solid rgba(168,85,247,0.1)'}}>{npc.descricao||'Nenhuma descrição disponível.'}</div>}
        </div>
        {masterMode&&<div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}><button onClick={onDelete} style={{background:'rgba(232,25,60,0.08)',border:'1px solid rgba(232,25,60,0.28)',color:'#E8193C',borderRadius:6,cursor:'pointer',padding:'6px 14px',fontSize:11,fontFamily:'Cinzel,serif'}}>✕ Remover</button></div>}
      </div>
    </div>
  );
}

function NPCGridCard({npc,onClick}) {
  return <CodexCard name={npc.nome} photo={npc.foto} category="Personagem" description={npc.descricao} action="Conhecer personagem" onClick={onClick}/>;
}

function PersonagensSection({ masterMode }) {
  const [npcs, setNpcs] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const saveTimeout = useRef({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'npcs'), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));
      setNpcs(data); setLoaded(true);
    });
    return () => unsub();
  }, []);

  const save = npc => {
    clearTimeout(saveTimeout.current[npc.id]);
    saveTimeout.current[npc.id] = setTimeout(async()=>{
      try { await setDoc(doc(db,'npcs',String(npc.id)),npc); } catch(e) { console.error(e); }
    },800);
  };
  const add = () => { const n=newNPC(Date.now()); setDoc(doc(db,'npcs',String(n.id)),n); setExpandedId(String(n.id)); };
  const upd = (id,data) => { setNpcs(prev=>prev.map(n=>n.id===id?data:n)); save(data); };
  const del = async id => { await deleteDoc(doc(db,'npcs',String(id))); if(String(id)===expandedId)setExpandedId(null); };
  const expandedNpc=npcs.find(n=>String(n.id)===expandedId);

  return (
    <div style={{maxWidth:1100,margin:'0 auto',padding:'40px 24px 80px'}}>
      <div style={{textAlign:'center',marginBottom:26}}>
        <div style={{fontSize:11,letterSpacing:'0.4em',color:'#8655AA',fontFamily:'Cinzel,serif',marginBottom:13,textTransform:'uppercase'}}>Os Habitantes de Cosmum</div>
        <h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:23,color:'#E8D8F0',fontWeight:700,margin:0}}>Personagens</h2>
        <div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(168,85,247,0.6),transparent)',margin:'14px auto 0'}}/>
      </div>

      {!loaded&&<div style={{textAlign:'center',color:'#5A5070',fontFamily:'Cinzel,serif',fontSize:13,padding:40}}>Conectando ao cosmos...</div>}
      {loaded&&npcs.length===0&&<div style={{textAlign:'center',padding:42,border:'1px dashed rgba(168,85,247,0.16)',borderRadius:14,color:'#6A5A7A',fontFamily:'Cinzel,serif',fontSize:13}}>Nenhum personagem registrado.</div>}

      <div className="codex-grid">
        {npcs.map(npc=><NPCGridCard key={npc.id} npc={npc} onClick={()=>setExpandedId(String(npc.id))}/>)}
        {loaded&&masterMode&&<button onClick={add} style={{minHeight:220,borderRadius:14,border:'1px dashed rgba(168,85,247,0.28)',background:'rgba(255,255,255,0.01)',color:'#875DA3',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:13,letterSpacing:'0.06em',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8}}><span style={{fontSize:28}}>+</span>Adicionar Personagem</button>}
      </div>

      {expandedNpc&&(
        <div style={{position:'fixed',inset:0,zIndex:9980,background:'rgba(0,0,0,0.9)',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'40px 16px',overflowY:'auto',backdropFilter:'none'}} onClick={()=>setExpandedId(null)}>
          <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:650,position:'relative'}}>
            <button onClick={()=>setExpandedId(null)} style={{position:'absolute',top:-14,right:-14,zIndex:10,width:32,height:32,borderRadius:'50%',border:'1px solid rgba(168,85,247,0.26)',background:'rgba(7,2,14,0.98)',color:'#E8D8F0',cursor:'pointer',fontSize:15}}>✕</button>
            <NPCCard npc={expandedNpc} onChange={d=>upd(expandedNpc.id,d)} onDelete={()=>del(expandedNpc.id)} masterMode={masterMode}/>
          </div>
        </div>
      )}
    </div>
  );
}

export default PersonagensSection;
