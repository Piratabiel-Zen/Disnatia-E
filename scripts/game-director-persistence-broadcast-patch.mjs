import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.join(root, 'src', 'experience', 'GameExperience3.jsx');
const cssFile = path.join(root, 'src', 'experience', 'game-experience-3.css');
if (!fs.existsSync(file) || !fs.existsSync(cssFile)) throw new Error('Game Director persistence patch: arquivos do Game Experience 3 não encontrados.');

let source = fs.readFileSync(file, 'utf8');
let css = fs.readFileSync(cssFile, 'utf8');
const MARKER = 'GAME DIRECTOR PERSISTENTE + BOSS BROADCAST 2026-09-08';

function replaceExact(before, after, label) {
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`Game Director persistence patch: ${label}`);
  source = source.replace(before, after);
}

if (!source.includes(`/* ${MARKER} */`)) {
  replaceExact(
    "import { db } from '../core/firebase';",
    "import { db } from '../core/firebase';\nimport { compressImage } from '../core/media';\n/* GAME DIRECTOR PERSISTENTE + BOSS BROADCAST 2026-09-08 */",
    'import de mídia não encontrado'
  );

  replaceExact(
    "function DirectorPanel({game,session,combat,combatState,masterMode,onClose,onPatchGame,onNavigate,onUpdateSession,onStartSession,onEndSession,onNextTurn,onEndCombat,onSoundscape,onCosmic,onAtlas,onJournal,onCreateItem,sheets}){\n  const [tab,setTab]=useState('scene');\n  const [scene,setScene]=useState({title:'',subtitle:'',location:'',objective:''});\n  const [npc,setNpc]=useState({name:'',subtitle:'',portrait:'',mood:'neutral',text:''});\n  const [handout,setHandout]=useState({title:'',imageUrl:'',body:''});\n  const [boss,setBoss]=useState({name:'',subtitle:'',imageUrl:'',kicker:'UMA PRESENÇA DESPERTA'});\n  const [discovery,setDiscovery]=useState({type:'discovery',title:'',subtitle:''});\n  const [atlas,setAtlas]=useState({name:'',status:'rumor',note:''});\n  const [item,setItem]=useState({name:'',icon:'◆',description:'',ownerSheetId:'group'});\n\n  useEffect(()=>setScene({title:session?.title||'',subtitle:session?.subtitle||'',location:session?.location||'',objective:session?.objective||''}),[session?.title,session?.subtitle,session?.location,session?.objective]);\n  useEffect(()=>{\n    const focus=game?.npcFocus;\n    if(focus?.name) setNpc({name:focus.name||'',subtitle:focus.subtitle||'',portrait:focus.portrait||'',mood:focus.mood||'neutral',text:focus.text||''});\n  },[game?.npcFocus?.name]);",
    `function DirectorPanel({game,session,combat,combatState,masterMode,onClose,onPatchGame,onNavigate,onUpdateSession,onStartSession,onEndSession,onNextTurn,onEndCombat,onSoundscape,onCosmic,onAtlas,onJournal,onCreateItem,sheets,directorMedia,onSaveMedia}){\n  const [tab,setTab]=useState('scene');\n  const saved=game?.directorDrafts||{};\n  const [scene,setScene]=useState(()=>saved.scene||{title:session?.title||'',subtitle:session?.subtitle||'',location:session?.location||'',objective:session?.objective||''});\n  const [npc,setNpc]=useState(()=>({name:'',subtitle:'',portrait:'',portraitRef:'',mood:'neutral',text:'',...(saved.npc||{})}));\n  const [handout,setHandout]=useState(()=>({title:'',imageUrl:'',imageRef:'',body:'',...(saved.handout||{})}));\n  const [boss,setBoss]=useState(()=>({name:'',subtitle:'',imageUrl:'',imageRef:'',kicker:'UMA PRESENÇA DESPERTA',...(saved.boss||{})}));\n  const [discovery,setDiscovery]=useState(()=>({type:'discovery',title:'',subtitle:'',...(saved.discovery||{})}));\n  const [atlas,setAtlas]=useState(()=>({name:'',status:'rumor',note:'',...(saved.atlas||{})}));\n  const [item,setItem]=useState(()=>({name:'',icon:'◆',description:'',ownerSheetId:'group',...(saved.item||{})}));\n  const [mediaBusy,setMediaBusy]=useState('');\n  const draftTimerRef=useRef(null);\n\n  useEffect(()=>{\n    if(saved.scene) return;\n    setScene({title:session?.title||'',subtitle:session?.subtitle||'',location:session?.location||'',objective:session?.objective||''});\n  },[session?.title,session?.subtitle,session?.location,session?.objective,!!saved.scene]);\n  useEffect(()=>{\n    if(saved.npc) return;\n    const focus=game?.npcFocus;\n    if(focus?.name) setNpc({name:focus.name||'',subtitle:focus.subtitle||'',portrait:focus.portrait||'',portraitRef:focus.portraitRef||'',mood:focus.mood||'neutral',text:focus.text||''});\n  },[game?.npcFocus?.name,!!saved.npc]);\n\n  useEffect(()=>{\n    clearTimeout(draftTimerRef.current);\n    draftTimerRef.current=window.setTimeout(()=>{\n      onPatchGame({directorDrafts:{scene,npc,handout,boss,discovery,atlas,item,savedAt:Date.now()}}).catch(()=>{});\n    },450);\n    return()=>clearTimeout(draftTimerRef.current);\n  },[scene,npc,handout,boss,discovery,atlas,item,onPatchGame]);\n\n  const mediaUrl=ref=>directorMedia?.[String(ref||'')]?.data||'';\n  const attachMedia=async(kind,file,setter,refField='imageRef')=>{\n    if(!file)return;\n    setMediaBusy(kind);\n    try{\n      const ref=await onSaveMedia(kind,file);\n      if(ref) setter(v=>({...v,[refField]:ref,...(refField==='portraitRef'?{portrait:''}:{imageUrl:''})}));\n    }finally{setMediaBusy('');}\n  };`,
    'estado inicial persistente do Director não encontrado'
  );

  replaceExact(
    "  const revealNpc=()=>onPatchGame({npcFocus:{...npc,visible:true,updatedAt:Date.now()}});\n  const hideNpc=()=>onPatchGame({npcFocus:{...(game?.npcFocus||{}),visible:false,updatedAt:Date.now()}});\n  const revealHandout=()=>onPatchGame({handout:{...handout,id:nowId('handout'),visible:true,createdAt:Date.now()}});\n  const revealBoss=()=>onPatchGame({bossReveal:{...boss,id:nowId('boss'),createdAt:Date.now(),expiresAt:Date.now()+8500}});",
    `  const revealNpc=()=>onPatchGame({npcFocus:{...npc,visible:true,updatedAt:Date.now()}});\n  const hideNpc=()=>onPatchGame({npcFocus:{...(game?.npcFocus||{}),visible:false,updatedAt:Date.now()}});\n  const revealHandout=()=>onPatchGame({handout:{...handout,id:nowId('handout'),visible:true,createdAt:Date.now()}});\n  const revealBoss=async()=>{\n    const id=nowId('boss');\n    const payload={...boss,id,visible:true,createdAt:Date.now(),durationMs:8500};\n    await onPatchGame({bossReveal:payload,bossRevealDismissedId:''});\n    window.setTimeout(()=>onPatchGame({bossRevealDismissedId:id}).catch(()=>{}),12000);\n  };`,
    'broadcast de revelação do chefe não encontrado'
  );

  replaceExact(
    "    <nav className=\"g3-director-tabs\">{nav.map(([id,label,icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><span>{icon}</span>{label}</button>)}</nav>",
    "    <nav className=\"g3-director-tabs\">{nav.map(([id,label,icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><span>{icon}</span>{label}</button>)}</nav><div className=\"g3-director-autosave\"><i/> Preparação salva automaticamente para a próxima mesa</div>",
    'barra de abas do Director não encontrada'
  );

  replaceExact(
    "<label>Retrato (URL)<input value={npc.portrait} onChange={e=>setNpc(v=>({...v,portrait:e.target.value}))} placeholder=\"https://...\"/></label>",
    `<label>Retrato do NPC<input type=\"file\" accept=\"image/*\" disabled={mediaBusy==='npc'} onChange={e=>{const f=e.target.files?.[0];attachMedia('npc',f,setNpc,'portraitRef');e.target.value='';}}/></label>{(mediaUrl(npc.portraitRef)||npc.portrait)&&<div className=\"g3-media-preview\"><img src={mediaUrl(npc.portraitRef)||npc.portrait} alt=\"Prévia do NPC\"/><span>✓ Retrato salvo</span></div>}`,
    'campo URL do retrato do NPC não encontrado'
  );

  replaceExact(
    "<label>Imagem (URL)<input value={handout.imageUrl} onChange={e=>setHandout(v=>({...v,imageUrl:e.target.value}))}/></label>",
    `<label>Imagem do handout<input type=\"file\" accept=\"image/*\" disabled={mediaBusy==='handout'} onChange={e=>{const f=e.target.files?.[0];attachMedia('handout',f,setHandout);e.target.value='';}}/></label>{(mediaUrl(handout.imageRef)||handout.imageUrl)&&<div className=\"g3-media-preview wide\"><img src={mediaUrl(handout.imageRef)||handout.imageUrl} alt=\"Prévia do handout\"/><span>✓ Imagem salva</span></div>}`,
    'campo URL do handout não encontrado'
  );

  replaceExact(
    "<label>Arte (URL)<input value={boss.imageUrl} onChange={e=>setBoss(v=>({...v,imageUrl:e.target.value}))}/></label>",
    `<label>Arte do chefe<input type=\"file\" accept=\"image/*\" disabled={mediaBusy==='boss'} onChange={e=>{const f=e.target.files?.[0];attachMedia('boss',f,setBoss);e.target.value='';}}/></label>{(mediaUrl(boss.imageRef)||boss.imageUrl)&&<div className=\"g3-media-preview wide boss\"><img src={mediaUrl(boss.imageRef)||boss.imageUrl} alt=\"Prévia do chefe\"/><span>✓ Arte do chefe salva</span></div>}`,
    'campo URL da arte do chefe não encontrado'
  );

  replaceExact(
    "  const [items,setItems]=useState([]);\n  const [enemies,setEnemies]=useState([]);",
    "  const [items,setItems]=useState([]);\n  const [enemies,setEnemies]=useState([]);\n  const [directorMedia,setDirectorMedia]=useState({});",
    'estado de mídia do Director não encontrado'
  );

  replaceExact(
    "    const u4=onSnapshot(collection(db,'enemies'),snap=>setEnemies(snap.docs.map(d=>({id:d.id,...d.data()}))));\n    return()=>{u1();u2();u3();u4();};",
    "    const u4=onSnapshot(collection(db,'enemies'),snap=>setEnemies(snap.docs.map(d=>({id:d.id,...d.data()}))));\n    const u5=onSnapshot(collection(db,'director_media'),snap=>{const rows={};snap.docs.forEach(d=>{rows[d.id]={id:d.id,...d.data()};});setDirectorMedia(rows);});\n    return()=>{u1();u2();u3();u4();u5();};",
    'listener de mídia persistente não encontrado'
  );

  replaceExact(
    "  const pushFeedback=useCallback(row=>{\n    const entry={id:nowId('feedback'),...row};\n    setFeedback(prev=>[...prev.slice(-4),entry]);\n    window.setTimeout(()=>setFeedback(prev=>prev.filter(x=>x.id!==entry.id)),2400);\n  },[]);",
    `  const pushFeedback=useCallback(row=>{\n    const entry={id:nowId('feedback'),...row};\n    setFeedback(prev=>[...prev.slice(-4),entry]);\n    window.setTimeout(()=>setFeedback(prev=>prev.filter(x=>x.id!==entry.id)),2400);\n  },[]);\n\n  const saveDirectorMedia=useCallback(async(kind,file)=>{\n    if(!file)return '';\n    if(!String(file.type||'').startsWith('image/')){pushFeedback({kind:'warning',icon:'⚠',name:'Imagem inválida',text:'Escolha um arquivo de imagem.'});return '';}\n    try{\n      const raw=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('Falha ao ler imagem'));reader.readAsDataURL(file);});\n      let data=await compressImage(raw,1400,1000,.72);\n      if(String(data).length>850000)data=await compressImage(raw,1000,760,.60);\n      if(String(data).length>950000)throw new Error('Imagem ainda muito grande após compressão');\n      const id=\`director_\${String(kind||'media').replace(/[^a-z0-9_-]/gi,'_')}\`;\n      await setDoc(doc(db,'director_media',id),{data,name:file.name||'imagem',type:file.type||'image/jpeg',kind:String(kind||'media'),updatedAt:Date.now()},{merge:true});\n      pushFeedback({kind:'ability',icon:'✓',name:'Imagem salva',text:'A arte ficou armazenada no Game Director.'});\n      return id;\n    }catch(error){\n      console.error('Erro ao salvar mídia do Game Director:',error);\n      pushFeedback({kind:'warning',icon:'⚠',name:'Falha ao salvar imagem',text:'Tente uma imagem menor ou outro formato.'});\n      return '';\n    }\n  },[pushFeedback]);`,
    'helper de feedback para inserir mídia persistente não encontrado'
  );

  replaceExact(
    "  useEffect(()=>{\n    const boss=game?.bossReveal;\n    if(!boss?.id||Date.now()>Number(boss.expiresAt||0)){setBossVisible(false);return;}\n    setBossVisible(true);\n    const timer=window.setTimeout(()=>setBossVisible(false),Math.max(250,Number(boss.expiresAt)-Date.now()));\n    return()=>window.clearTimeout(timer);\n  },[game?.bossReveal?.id,game?.bossReveal?.expiresAt]);",
    `  useEffect(()=>{\n    const boss=game?.bossReveal;\n    const dismissed=String(game?.bossRevealDismissedId||'');\n    if(!boss?.id||boss.visible===false||dismissed===String(boss.id)){setBossVisible(false);return;}\n    setBossVisible(true);\n    const duration=clamp(Number(boss.durationMs||8500),3000,20000);\n    const timer=window.setTimeout(()=>setBossVisible(false),duration);\n    return()=>window.clearTimeout(timer);\n  },[game?.bossReveal?.id,game?.bossReveal?.visible,game?.bossRevealDismissedId]);`,
    'timer local do boss reveal não encontrado'
  );

  replaceExact(
    "    {panel==='director'&&<DirectorPanel key={directorTab} game={game} session={session} combat={combat} combatState={combatState} masterMode={masterMode} onClose={()=>setPanel('')} onPatchGame={patchGame} onNavigate={onNavigate} onUpdateSession={updateSession} onStartSession={startSession} onEndSession={endSession} onNextTurn={nextTurn} onEndCombat={endCombat} onSoundscape={applySoundscapePreset} onCosmic={triggerCosmicEvent} onAtlas={addAtlasDiscovery} onJournal={addJournal} onCreateItem={createItem} sheets={sheets}/>}",
    "    {panel==='director'&&<DirectorPanel key={directorTab} game={game} session={session} combat={combat} combatState={combatState} masterMode={masterMode} onClose={()=>setPanel('')} onPatchGame={patchGame} onNavigate={onNavigate} onUpdateSession={updateSession} onStartSession={startSession} onEndSession={endSession} onNextTurn={nextTurn} onEndCombat={endCombat} onSoundscape={applySoundscapePreset} onCosmic={triggerCosmicEvent} onAtlas={addAtlasDiscovery} onJournal={addJournal} onCreateItem={createItem} sheets={sheets} directorMedia={directorMedia} onSaveMedia={saveDirectorMedia}/>}",
    'montagem do Director não encontrada'
  );

  replaceExact(
    "    <NpcFocus npc={game?.npcFocus}/>",
    "    <NpcFocus npc={game?.npcFocus?{...game.npcFocus,portrait:directorMedia?.[String(game.npcFocus.portraitRef||'')]?.data||game.npcFocus.portrait||''}:null}/>",
    'render do NPC em foco não encontrado'
  );

  replaceExact(
    "  const handout=game?.handout?.visible&&String(game?.handout?.id||'')!==dismissedHandout?game.handout:null;",
    "  const handout=game?.handout?.visible&&String(game?.handout?.id||'')!==dismissedHandout?{...game.handout,imageUrl:directorMedia?.[String(game.handout.imageRef||'')]?.data||game.handout.imageUrl||''}:null;",
    'resolução do handout não encontrada'
  );

  replaceExact(
    "    {bossVisible&&<BossCinematic boss={game?.bossReveal}/>} ",
    "    {bossVisible&&<BossCinematic boss={{...(game?.bossReveal||{}),imageUrl:directorMedia?.[String(game?.bossReveal?.imageRef||'')]?.data||game?.bossReveal?.imageUrl||''}}/>} ",
    'render da cinemática do chefe não encontrado'
  );

  fs.writeFileSync(file, source);
}

const CSS_MARKER = `/* ${MARKER} */`;
if (!css.includes(CSS_MARKER)) {
  css += `\n${CSS_MARKER}\n.g3-director-autosave{display:flex;align-items:center;gap:7px;margin:-5px 0 7px;padding:7px 9px;border-radius:9px;border:1px solid rgba(83,241,166,.11);background:rgba(83,241,166,.025);font:600 6px 'Cinzel',serif;letter-spacing:.06em;color:#6e8e80}.g3-director-autosave i{width:6px;height:6px;border-radius:50%;background:#53f1a6;box-shadow:0 0 8px rgba(83,241,166,.55)}\n.g3-director-section input[type=file]{padding:7px;border-style:dashed;cursor:pointer;color:#776981}.g3-director-section input[type=file]::file-selector-button{margin-right:9px;border:1px solid rgba(168,85,247,.24);border-radius:7px;background:rgba(168,85,247,.08);color:#bba4ca;padding:6px 9px;font:700 6px 'Cinzel',serif;cursor:pointer}.g3-director-section input[type=file]:disabled{opacity:.5;cursor:wait}\n.g3-media-preview{position:relative;min-height:76px;display:grid;grid-template-columns:72px minmax(0,1fr);align-items:center;gap:9px;padding:7px;border-radius:10px;border:1px solid rgba(168,85,247,.12);background:rgba(168,85,247,.025);overflow:hidden}.g3-media-preview img{width:72px;height:62px;object-fit:cover;border-radius:8px;border:1px solid rgba(255,255,255,.07);background:#030106}.g3-media-preview span{font:700 6px 'Cinzel',serif;color:#6fa287;letter-spacing:.05em}.g3-media-preview.wide{grid-template-columns:118px minmax(0,1fr)}.g3-media-preview.wide img{width:118px;height:72px}.g3-media-preview.boss{border-color:rgba(232,25,60,.16);background:rgba(232,25,60,.025)}\n`;
  fs.writeFileSync(cssFile, css);
}

for (const expected of [
  "collection(db,'director_media')",
  'directorDrafts',
  'bossRevealDismissedId',
  'onSaveMedia={saveDirectorMedia}',
  'g3-director-autosave',
  'type=\"file\" accept=\"image/*\"',
]) {
  if (!source.includes(expected) && !css.includes(expected)) throw new Error(`Game Director persistence patch incompleto: ${expected}`);
}

console.log('Dinastia E: Game Director persiste preparações e imagens; boss reveal agora é broadcast confiável para toda a mesa.');
