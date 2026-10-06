import { onSnapshot } from '../../adventure/sharedSnapshot';
import { useEffect,useRef,useState } from "react";
import { collection,deleteDoc,doc,setDoc,query,where } from "firebase/firestore";
import { db } from "../../core/firebase";
import { ARTEFATOS_DATA,CLASSES,SHEET_COLORS } from "../../data/gameData";
import { SheetFull,newSheet } from "./SheetComponents";
import { visibleSheets } from '../../adventure/visitorAccess.mjs';
import CombatMode from "./CombatMode";
function SheetsSection({masterMode,playerSheetId,access,visitorId=''}){
  const[sheets,setSheets]=useState([]);const[loaded,setLoaded]=useState(false);const[activeId,setActiveId]=useState(null);
  const[customAbilities,setCustomAbilities]=useState({});
  const[unlockedIds,setUnlockedIds]=useState({});
  const[pwInput,setPwInput]=useState('');const[pwTarget,setPwTarget]=useState(null);const[pwError,setPwError]=useState(false);
  const[combatOpen,setCombatOpen]=useState(false);
  const[enemies,setEnemies]=useState([]);
  const [artefatosUnlockedState, setArtefatosUnlockedState] = useState({});
  const [artefatosHabsState, setArtefatosHabsState] = useState({});
  const saveTimeout=useRef({});

  useEffect(()=>{
    const scopedVisitor=visitorId||(access?.role==='visitor'?access.visitorId:'');
    const ref=scopedVisitor?query(collection(db,'sheets'),where('visitorId','==',String(scopedVisitor))):collection(db,'sheets');
    const u1=onSnapshot(ref,snap=>{const all=visibleSheets(snap.docs.map(d=>({id:d.id,...d.data()})),access,masterMode);const data=visitorId||access?.role==='visitor'?all:!masterMode&&playerSheetId?all.filter(s=>String(s.id)===String(playerSheetId)):all.filter(sheet=>!sheet.visitorId);setSheets(data);setLoaded(true);},()=>setLoaded(true));
    const u2=onSnapshot(doc(db,'config','customAbilities'),snap=>{if(snap.exists())setCustomAbilities(snap.data()||{});});
    const u3=onSnapshot(collection(db,'enemies'),snap=>{setEnemies(snap.docs.map(d=>({id:d.id,...d.data()})));});
    const u4=onSnapshot(doc(db,'config','artefatos'),snap=>{if(snap.exists())setArtefatosUnlockedState(snap.data().unlocked||{});});
    const u5=onSnapshot(doc(db,'config','artefatos_habilidades'),snap=>{if(snap.exists())setArtefatosHabsState(snap.data()||{});});
    return()=>{u1();u2();u3();u4();u5();};
  },[masterMode,playerSheetId,access?.role,access?.visitorId,visitorId]);

  const revealedArtefatos = ARTEFATOS_DATA.filter(a => artefatosUnlockedState[a.id]);

  const saveSheet=sheet=>{clearTimeout(saveTimeout.current[sheet.id]);saveTimeout.current[sheet.id]=setTimeout(async()=>{try{await setDoc(doc(db,'sheets',String(sheet.id)),sheet);}catch(e){console.error('Erro ao salvar ficha:',e);}},900);};
  const add=()=>{if(sheets.length>=15)return;const s=newSheet(Date.now());setDoc(doc(db,'sheets',String(s.id)),s);setActiveId(String(s.id));setUnlockedIds(prev=>({...prev,[String(s.id)]:true}));};
  const upd=(id,data)=>{if(data===null){if(!masterMode)return;deleteDoc(doc(db,'sheets',String(id)));setActiveId(null);return;}const current=sheets.find(s=>String(s.id)===String(id));const safeData=!masterMode&&current?{...data,classe:current.classe,audience:current.audience||'player',visitorId:current.visitorId||''}:data;setSheets(prev=>prev.map(s=>s.id===id?safeData:s));saveSheet(safeData);};
  const saveCustom=async(sheetId,abilities)=>{if(!masterMode)throw new Error('Apenas o Mestre pode editar habilidades.');await setDoc(doc(db,'config','customAbilities'),{[String(sheetId)]:abilities},{merge:true});};

  const handleTabClick = (s) => {
    const sid = String(s.id);
    if (activeId === sid) { setActiveId(null); return; }
    if (masterMode || access?.role==='visitor' || (playerSheetId && String(playerSheetId) === sid) || !s.senha || unlockedIds[sid]) { setActiveId(sid); return; }
    setPwTarget(sid); setPwInput(''); setPwError(false);
  };

  const tryPassword = () => {
    const s = sheets.find(x => String(x.id) === pwTarget);
    if (s && pwInput === s.senha) {
      setUnlockedIds(prev=>({...prev,[pwTarget]:true}));
      setActiveId(pwTarget);
      setPwTarget(null); setPwInput('');
    } else {
      setPwError(true); setPwInput('');
      setTimeout(()=>setPwError(false),600);
    }
  };

  const activeSheet=sheets.find(s=>String(s.id)===activeId);
  return(
    <div style={{maxWidth:1360,margin:'0 auto',padding:'20px 14px 80px'}}>
      <div style={{textAlign:'center',marginBottom:20}}>
        <div style={{fontSize:11,letterSpacing:'0.4em',color:'#7B6D8A',fontFamily:'Cinzel,serif',marginBottom:10,textTransform:'uppercase'}}>Os Portadores do Destino</div>
        <h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:22,color:'#E8D8C0',fontWeight:700,margin:0}}>{visitorId||access?.role==='visitor'?'Personagens do visitante':'Fichas dos Personagens'}</h2>
        <div style={{fontSize:11,color:'#4A4050',marginTop:6,fontFamily:'Cinzel,serif'}}>✦ Selecione uma ficha · Sincronizado em tempo real</div>
        <div style={{width:60,height:1,background:'linear-gradient(90deg,transparent,rgba(30,200,255,0.6),transparent)',margin:'12px auto 0'}}/>
      </div>
      {!loaded&&<div style={{textAlign:'center',color:'#5A5070',fontFamily:'Cinzel,serif',fontSize:13,padding:40}}>Conectando ao cosmos...</div>}
      
      {pwTarget && (
        <div style={{position:'fixed',inset:0,zIndex:9980,background:'rgba(0,0,0,0.85)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'none'}} onClick={()=>setPwTarget(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:'rgba(10,12,28,0.98)',border:'1px solid rgba(168,85,247,0.4)',borderRadius:16,padding:28,width:300,textAlign:'center',boxShadow:'0 10px 40px rgba(0,0,0,0.8)'}}>
            <div style={{fontSize:32,marginBottom:12}}>🔒</div>
            <div style={{fontFamily:'Cinzel Decorative,serif',fontSize:16,color:'#C8A8E8',marginBottom:6}}>Ficha Protegida</div>
            <div style={{fontSize:12,color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:18}}>Digite a senha para acessar esta ficha.</div>
            <input type="password" value={pwInput} onChange={e=>setPwInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&tryPassword()} placeholder="Senha..." autoFocus style={{width:'100%',textAlign:'center',marginBottom:12,fontSize:16,border:`1px solid ${pwError?'rgba(232,25,60,0.7)':'rgba(168,85,247,0.4)'}`,transition:'border-color 0.3s'}}/>
            {pwError&&<div style={{fontSize:12,color:'#E8193C',fontFamily:'Cinzel,serif',marginBottom:10}}>Senha incorreta.</div>}
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setPwTarget(null)} style={{flex:1,padding:'9px',borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'#5A5070',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12}}>Cancelar</button>
              <button onClick={tryPassword} style={{flex:1,padding:'9px',borderRadius:8,border:'1px solid rgba(168,85,247,0.5)',background:'rgba(168,85,247,0.12)',color:'#C8A8E8',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12,fontWeight:600}}>Entrar</button>
            </div>
          </div>
        </div>
      )}
      {loaded&&(<>
        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:18}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',alignItems:'center'}}>
          {sheets.map(s=>{
            const cls=CLASSES.find(c=>c.id===s.classe)||CLASSES[0];
            const sc=SHEET_COLORS[s.classe]||cls.color;
            const isActive=String(s.id)===activeId;
            const hasPts=(s.attrPoints||0)>0;
            const locked=!masterMode&&access?.role!=='visitor'&&s.senha&&String(playerSheetId||'')!==String(s.id)&&!unlockedIds[String(s.id)];
            const hasCooldown=masterMode&&Object.values(s.cooldowns||{}).some(v=>v>0);
            return(
              <button key={s.id} onClick={()=>handleTabClick(s)} title={s.nome||'Sem nome'} aria-label={s.nome||'Sem nome'} style={{
                flexShrink:0, width:54, height:54, borderRadius:'50%', padding:0,
                border:`2.5px solid ${isActive?sc:sc+'44'}`,
                background:'rgba(6,8,18,0.88)', backdropFilter:'none',
                boxShadow:isActive?`0 0 18px ${sc}88`:'0 2px 10px rgba(0,0,0,0.5)',
                cursor:'pointer', overflow:'hidden', transition:'all 0.2s', position:'relative',
                display:'flex',alignItems:'center',justifyContent:'center',
              }}>
                {s.foto
                  ?<img src={s.foto} alt="" style={{width:'100%',height:'100%',objectFit:'cover',filter:locked?'grayscale(70%)':'none'}}/>
                  :<span style={{fontSize:22}}>{locked?'🔒':cls.icon}</span>
                }
                {(hasPts||hasCooldown)&&(
                  <div style={{position:'absolute',top:2,right:2,display:'flex',flexDirection:'column',gap:2}}>
                    {hasPts&&<span style={{width:7,height:7,borderRadius:'50%',background:'#A855F7',boxShadow:'0 0 5px #A855F7',display:'block',animation:'pulse 1.5s ease-in-out infinite'}}/>}
                    {hasCooldown&&<span style={{width:7,height:7,borderRadius:'50%',background:'#E86420',boxShadow:'0 0 5px #E86420',display:'block',animation:'pulse 1.5s ease-in-out infinite'}}/>}
                  </div>
                )}
              </button>
            );
          })}
          {masterMode&&!visitorId&&sheets.length<15&&(
            <button onClick={add} title="Criar nova ficha" style={{flexShrink:0,height:44,borderRadius:10,padding:'0 15px',border:'1px dashed rgba(180,108,232,.48)',background:'rgba(180,108,232,.10)',color:'#D7B6F2',cursor:'pointer',fontSize:11,display:'flex',gap:7,alignItems:'center',justifyContent:'center',backdropFilter:'none',fontFamily:'Cinzel,serif'}}>＋ Criar Ficha</button>
          )}
        </div>
        {activeSheet&&<div style={{textAlign:'center',fontSize:12,color:'rgba(255,255,255,0.35)',fontFamily:'Cinzel,serif',letterSpacing:'0.06em'}}>{activeSheet.nome||'Sem nome'} · Nv {activeSheet.nivel||1}</div>}
      </div>
        {activeSheet
          ?<SheetFull
              sheet={activeSheet}
              onChange={d=>upd(activeSheet.id,d)}
              masterMode={masterMode}
              customAbilities={customAbilities[activeSheet.id] || []}
              onSaveCustomAbilities={(novas) => saveCustom(activeSheet.id, novas)}
              revealedArtefatos={revealedArtefatos}
              artefatosHabs={artefatosHabsState}
            />
          :<div style={{textAlign:'center',padding:44,border:'1px dashed rgba(255,255,255,0.06)',borderRadius:14}}><div style={{fontSize:32,marginBottom:10,opacity:0.2}}>📋</div><div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#6A5A7A'}}>Selecione um personagem acima para ver sua ficha.</div></div>
        }
      </>)}
    </div>
  );
}

const ENEMY_COLOR='#FF4444';
const ENEMY_GLOW='rgba(255,68,68,0.18)';
const newEnemySkill=()=>({id:Date.now()+Math.random(),nome:'',descricao:'',dano:'',custo:0,cooldown:'—',tipoHab:'normal'});
const ENEMY_PERIGO_LEVELS=['Baixo','Médio','Alto','Extremo'];
const ENEMY_PERIGO_COLORS={'Baixo':'#4ADE80','Médio':'#E8A020','Alto':'#FF6B35','Extremo':'#E8193C'};
const newEnemy=id=>({id,nome:'',tipo:'',nivel:1,perigo:'Médio',hp:10,hp_bonus:0,vigos:10,alcance:'',forca:0,agilidade:0,durabilidade:0,inteligencia:0,percepcao:0,sorte:0,foto:'',habilidades:[newEnemySkill()],notas:'',status:{}});


export default SheetsSection;
