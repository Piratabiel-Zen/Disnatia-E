import CodexCard from '../../experience/CodexCard';
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { useEffect,useRef,useState } from "react";
import { collection,deleteDoc,doc,setDoc } from "firebase/firestore";
import { db } from "../../core/firebase";
import { compressImage } from "../../core/media";
const BESTIARIO_AMEACA_CORES = {"Baixo":"#4ADE80","Médio":"#E8A020","Alto":"#E8193C","Supremo":"#A855F7","Catastrófico":"#1EC8FF"};
const newBestiary = id => ({ id, nome: '', tipo: '', nivel: 1, foto: '', descricao: '', nivelAmeaca: 'Médio' });

function BestiarioCard({ item, onChange, onDelete, masterMode }) {
  const f = (k,v) => onChange({...item, [k]:v});
  const photoRef = useRef(null);
  const handlePhoto = async e => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = async ev => { const c = await compressImage(ev.target.result, 800, 800, 0.72); f('foto', c); };
    reader.readAsDataURL(file);
  };
  const corBase = BESTIARIO_AMEACA_CORES[item.nivelAmeaca] || "#E8A020";
  return (
    <div style={{border:`1px solid ${corBase}44`,borderRadius:14,overflow:'hidden',background:'rgba(12,6,6,0.95)',marginBottom:18}}>
      <div style={{height:3,background:`linear-gradient(90deg,${corBase},transparent)`}}/>
      <div onClick={()=>masterMode&&photoRef.current?.click()} style={{position:'relative',width:'100%',cursor:masterMode?'pointer':'default',background:'rgba(0,0,0,0.4)',overflow:'hidden'}}>
        {item.foto?<img loading="lazy" decoding="async" src={item.foto} alt="monstro" style={{width:'100%',maxHeight:350,objectFit:'cover',objectPosition:'center',display:'block'}}/>:<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'30px',opacity:0.35}}><span style={{fontSize:22}}>📷</span><span style={{fontSize:11,color:'rgba(255,255,255,0.5)',fontFamily:'Cinzel,serif'}}>{masterMode?'Toque para adicionar a foto':'Nenhuma imagem catalogada'}</span></div>}
        {item.foto&&<div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 55%,rgba(12,6,6,0.9))',pointerEvents:'none'}}/>}
        {item.foto&&item.nome&&<div style={{position:'absolute',bottom:10,left:16,fontFamily:'Cinzel,serif',fontSize:18,fontWeight:700,color:corBase}}>{item.nome}</div>}
        {masterMode&&<input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}}/>}
      </div>
      <div style={{padding:'16px 18px'}}>
        <div style={{display:'flex',gap:10,alignItems:'flex-end',marginBottom:16,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:130}}>
            <label style={{fontSize:10,letterSpacing:'0.3em',color:corBase,fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Nome da Criatura</label>
            {masterMode?<input value={item.nome} onChange={e=>f('nome',e.target.value)} placeholder="Ex: Besta das Sombras..." style={{width:'100%'}}/>:<div style={{fontSize:15,color:'#E8D8C0',fontFamily:'Cinzel,serif',fontWeight:600}}>{item.nome||'Desconhecida'}</div>}
          </div>
          <div style={{flex:1,minWidth:110}}>
            <label style={{fontSize:10,letterSpacing:'0.3em',color:corBase,fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Categoria</label>
            {masterMode?<input value={item.tipo||''} onChange={e=>f('tipo',e.target.value)} placeholder="Ex: Aberração, Vampiro..." style={{width:'100%'}}/>:<div style={{fontSize:14,color:'#C8B8A0',fontFamily:'Cinzel,serif'}}>{item.tipo||'—'}</div>}
          </div>
          <div style={{width:80}}>
            <label style={{fontSize:10,letterSpacing:'0.3em',color:corBase,fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Nível</label>
            {masterMode?<input type="number" value={item.nivel||1} onChange={e=>f('nivel',Number(e.target.value))} style={{width:'100%'}}/>:<div style={{fontSize:14,color:'#C8B8A0',fontFamily:'Cinzel,serif'}}>{item.nivel||1}</div>}
          </div>
          <div style={{width:140}}>
            <label style={{fontSize:10,letterSpacing:'0.3em',color:corBase,fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Ameaça</label>
            {masterMode?<select value={item.nivelAmeaca} onChange={e=>f('nivelAmeaca',e.target.value)} style={{width:'100%',color:corBase,fontWeight:'bold'}}><option value="Baixo">Baixo</option><option value="Médio">Médio</option><option value="Alto">Alto</option><option value="Supremo">Supremo</option><option value="Catastrófico">Catastrófico</option></select>:<div style={{fontSize:14,color:corBase,fontWeight:'bold',fontFamily:'Cinzel,serif'}}>{item.nivelAmeaca}</div>}
          </div>
          {masterMode&&<button onClick={onDelete} style={{background:'rgba(232,25,60,0.1)',border:'1px solid rgba(232,25,60,0.3)',color:'#E8193C',borderRadius:6,cursor:'pointer',padding:'6px 11px',fontSize:12}}>✕ Excluir</button>}
        </div>
        <div>
          <label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Descrição & Comportamento</label>
          {masterMode?<textarea value={item.descricao} onChange={e=>f('descricao',e.target.value)} placeholder="Descreva os hábitos, aparência e táticas..." rows={5} style={{width:'100%',resize:'vertical',lineHeight:1.7}}/>:<div style={{fontSize:14,color:'#9A8A7A',lineHeight:1.85,whiteSpace:'pre-wrap',fontStyle:'italic',background:'rgba(255,255,255,0.02)',padding:'12px',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.05)'}}>{item.descricao||'Nenhum registro sobre esta criatura.'}</div>}
        </div>
      </div>
    </div>
  );
}

function BestiarioGridCard({item,onClick}) {
  const threat=item.nivelAmeaca||'Médio';
  return <CodexCard name={item.nome} photo={item.foto} color={BESTIARIO_AMEACA_CORES[threat]||'#E8A020'} category="Bestiário" badge={threat} meta={'Nível '+(item.nivel||1)+(item.tipo?' · '+item.tipo:'')} description={item.descricao} action="Examinar criatura" onClick={onClick}/>;
}

function BestiarioSection({ masterMode }) {
  const [bestiario, setBestiario] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterAmeaca, setFilterAmeaca] = useState('Todas');
  const [sortBy, setSortBy] = useState('nome');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'bestiario'), snap => {
      setBestiario(snap.docs.map(d => ({id:d.id,...d.data()}))); setLoaded(true);
    });
    return () => unsub();
  }, []);

  const saveItem = item => {
    clearTimeout(saveTimeout.current[item.id]);
    saveTimeout.current[item.id] = setTimeout(async () => {
      try { await setDoc(doc(db,'bestiario',String(item.id)),item); } catch(e) { console.error(e); }
    }, 800);
  };

  const add = () => { const item = newBestiary(Date.now()); setDoc(doc(db,'bestiario',String(item.id)),item); setExpandedId(String(item.id)); };
  const upd = (id, data) => { setBestiario(prev => prev.map(b => b.id===id?data:b)); saveItem(data); };
  const del = async id => { await deleteDoc(doc(db,'bestiario',String(id))); if(String(id)===expandedId)setExpandedId(null); };

  const pesosAmeaca = {"Baixo":1,"Médio":2,"Alto":3,"Supremo":4,"Catastrófico":5};
  const tiposDisponiveis = [...new Set(bestiario.map(b=>b.tipo).filter(Boolean))];

  const filtered = bestiario
    .filter(item => (item.nome||'').toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(item => filterAmeaca==='Todas' || item.nivelAmeaca===filterAmeaca)
    .filter(item => !filterTipo || item.tipo===filterTipo)
    .sort((a,b) => {
      if (sortBy==='nivel') return (b.nivel||1)-(a.nivel||1);
      if (sortBy==='ameaca') return (pesosAmeaca[b.nivelAmeaca]||0)-(pesosAmeaca[a.nivelAmeaca]||0);
      return (a.nome||'').localeCompare(b.nome||'');
    });

  const expandedItem = bestiario.find(b=>String(b.id)===expandedId);

  return (
    <div style={{maxWidth:1100,margin:'0 auto',padding:'40px 24px 80px'}}>
      <div style={{textAlign:'center',marginBottom:26}}>
        <div style={{fontSize:11,letterSpacing:'0.4em',color:'#E8A020',fontFamily:'Cinzel,serif',marginBottom:13,textTransform:'uppercase'}}>O Compêndio das Aberrações</div>
        <h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:23,color:'#E8D8C0',fontWeight:700,margin:0}}>Bestiário</h2>
        <div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(232,160,32,0.6),transparent)',margin:'14px auto 0'}}/>
      </div>

      {loaded&&masterMode&&<div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}><button onClick={add} style={{padding:'8px 20px',borderRadius:8,border:'1px solid rgba(232,160,32,0.4)',background:'rgba(232,160,32,0.1)',color:'#E8D8C0',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12}}>+ Catalogar Criatura</button></div>}

      {loaded&&bestiario.length>0&&(
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:24,alignItems:'center'}}>
          <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="🔍 Buscar criatura..." style={{flex:2,minWidth:180}}/>
          <select value={filterTipo} onChange={e=>setFilterTipo(e.target.value)} style={{flex:1,minWidth:140}}>
            <option value="">Todas as Categorias</option>
            {tiposDisponiveis.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterAmeaca} onChange={e=>setFilterAmeaca(e.target.value)} style={{flex:1,minWidth:140}}>
            <option value="Todas">Todas as Ameaças</option>
            <option value="Baixo">Baixo</option><option value="Médio">Médio</option><option value="Alto">Alto</option><option value="Supremo">Supremo</option><option value="Catastrófico">Catastrófico</option>
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{flex:1,minWidth:140}}>
            <option value="nome">Ordenar: Nome</option>
            <option value="nivel">Ordenar: Nível</option>
            <option value="ameaca">Ordenar: Ameaça</option>
          </select>
        </div>
      )}

      {!loaded&&<div style={{textAlign:'center',color:'#5A5070',fontFamily:'Cinzel,serif',fontSize:13,padding:40}}>Abrindo o tomo...</div>}
      {loaded&&bestiario.length===0&&<div style={{textAlign:'center',padding:38,border:'1px dashed rgba(232,160,32,0.2)',borderRadius:12}}><div style={{fontSize:30,marginBottom:10}}>🐉</div><div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#8A7A6A'}}>Nenhuma criatura catalogada.</div></div>}
      {loaded&&bestiario.length>0&&filtered.length===0&&<div style={{textAlign:'center',padding:30,color:'#5A5070',fontFamily:'Cinzel,serif',fontSize:12}}>Nenhuma criatura encontrada com esses filtros.</div>}

      <div className="codex-grid">
        {filtered.map(item=>
          <BestiarioGridCard key={item.id} item={item} onClick={()=>setExpandedId(String(item.id))}/>
        )}
      </div>

      {expandedItem && (
        <div style={{position:'fixed',inset:0,zIndex:9980,background:'rgba(0,0,0,0.88)',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'40px 16px',overflowY:'auto',backdropFilter:'none'}} onClick={()=>setExpandedId(null)}>
          <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:640,position:'relative'}}>
            <button onClick={()=>setExpandedId(null)} style={{position:'absolute',top:-14,right:-14,zIndex:10,width:32,height:32,borderRadius:'50%',border:'1px solid rgba(255,255,255,0.2)',background:'rgba(20,10,10,0.95)',color:'#E8D8C0',cursor:'pointer',fontSize:15}}>✕</button>
            <BestiarioCard item={expandedItem} onChange={d=>upd(expandedItem.id,d)} onDelete={()=>del(expandedItem.id)} masterMode={masterMode}/>
          </div>
        </div>
      )}
    </div>
  );
}

export default BestiarioSection;
