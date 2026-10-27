import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../core/firebase';
import { compressImage } from '../../core/media';
import { getSheetMaxHp } from '../../data/gameData';
import { characterMaxVigor } from '../../adventure/characterResources.mjs';
import { useExperience } from '../../experience/ExperienceKit.generated';
import TableCameraRoom from '../../experience/TableCameraRoom';
import './mesa-imersiva.css';

const THEMES = [
  { id:'revelacao', label:'Revelação', icon:'◇', color:'#caa6ff' },
  { id:'combate', label:'Combate', icon:'⚔', color:'#f05a70' },
  { id:'inimigo', label:'Inimigo', icon:'◉', color:'#fb8a58' },
  { id:'cenario', label:'Cenário', icon:'⌖', color:'#64d9c3' },
];
const nowId=()=>`scene_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

export default function MesaImersivaPage({ masterMode, access, onNavigate }){
  const { selectedSheet, selectedClass }=useExperience();
  const [scenes,setScenes]=useState([]),[active,setActive]=useState(null),[activeImage,setActiveImage]=useState('');
  const [editor,setEditor]=useState(false),[title,setTitle]=useState(''),[theme,setTheme]=useState('revelacao');
  const [file,setFile]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const [quickSheet,setQuickSheet]=useState(false),fileRef=useRef(null);

  useEffect(()=>onSnapshot(collection(db,'immersive_scenes'),snap=>{
    const rows=snap.docs.map(entry=>({id:entry.id,...entry.data()}));
    rows.sort((a,b)=>Number(b.updatedAt||b.createdAt||0)-Number(a.updatedAt||a.createdAt||0));
    setScenes(rows);
  },error=>setNotice(error?.code==='permission-denied'?'Sem permissão para carregar as cenas imersivas.':'Não foi possível carregar as cenas.')),[]);
  useEffect(()=>onSnapshot(doc(db,'config','immersive_scene'),snap=>setActive(snap.exists()?snap.data():null),()=>setNotice('Não foi possível sincronizar a cena compartilhada.')),[]);
  const activeScene=useMemo(()=>scenes.find(scene=>String(scene.id)===String(active?.sceneId||''))||null,[scenes,active?.sceneId]);
  useEffect(()=>{
    setActiveImage('');
    if(!activeScene?.imageRef)return undefined;
    return onSnapshot(doc(db,'immersive_media',String(activeScene.imageRef)),snap=>setActiveImage(snap.exists()?String(snap.data()?.data||''):''),()=>setNotice('A imagem da cena não pôde ser carregada.'));
  },[activeScene?.imageRef]);

  const revealScene=async scene=>{
    if(!masterMode)return;
    setNotice('');
    try{await setDoc(doc(db,'config','immersive_scene'),{sceneId:String(scene.id),revealedAt:Date.now(),updatedAt:Date.now()});}
    catch{setNotice('Não foi possível exibir essa cena. Tente novamente.');}
  };
  const hideScene=async()=>{
    if(!masterMode)return;
    try{await setDoc(doc(db,'config','immersive_scene'),{sceneId:'',updatedAt:Date.now()},{merge:true});}
    catch{setNotice('Não foi possível encerrar a cena.');}
  };
  const addScene=async()=>{
    if(!masterMode||!title.trim()||!file)return;
    setBusy(true);setNotice('');
    const id=nowId(),mediaId=`${id}_image`;
    try{
      if(!String(file.type||'').startsWith('image/'))throw new Error('Escolha um arquivo de imagem.');
      const raw=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error||new Error('Falha ao ler imagem'));reader.readAsDataURL(file);});
      let data=await compressImage(raw,1500,1100,.74);
      if(data.length>850000)data=await compressImage(raw,1100,820,.62);
      if(data.length>950000)throw new Error('A imagem ficou grande demais. Escolha uma imagem menor.');
      await setDoc(doc(db,'immersive_media',mediaId),{data,name:file.name||'Cena',updatedAt:Date.now()});
      await setDoc(doc(db,'immersive_scenes',id),{title:title.trim(),theme,imageRef:mediaId,createdAt:Date.now(),updatedAt:Date.now()});
      setTitle('');setFile(null);if(fileRef.current)fileRef.current.value='';setNotice('Cena adicionada ao arquivo.');
    }catch(error){setNotice(error?.message||'Não foi possível salvar a cena.');}
    finally{setBusy(false);}
  };
  const removeScene=async scene=>{
    if(!masterMode||!scene?.id)return;
    try{
      await deleteDoc(doc(db,'immersive_scenes',String(scene.id)));
      if(scene.imageRef)await deleteDoc(doc(db,'immersive_media',String(scene.imageRef)));
      if(String(active?.sceneId||'')===String(scene.id))await hideScene();
      setNotice('Cena removida.');
    }catch{setNotice('Não foi possível remover a cena.');}
  };
  const accent=THEMES.find(row=>row.id===activeScene?.theme)?.color||'#aa8bd4';

  return <div className="mesa-imersiva" style={{'--mi-accent':accent}}>
    <div className="mi-image-layer" style={activeImage?{backgroundImage:`url("${activeImage}")`}:{}} aria-hidden="true"/>
    <div className="mi-shade" aria-hidden="true"/>
    <header className="mi-topbar">
      <div className="mi-title-block"><span className="mi-eyebrow">DINASTIA E · EXPERIÊNCIA DE NARRAÇÃO</span><h2>Mesa Imersiva</h2><p>{activeScene?`${THEMES.find(row=>row.id===activeScene.theme)?.label||'Cena'} · ${activeScene.title}`:'Uma cena compartilhada para a companhia'}</p></div>
      <div className="mi-top-actions">
        {masterMode&&<button className="mi-scene-toggle" onClick={()=>setEditor(value=>!value)}>{editor?'Fechar cenas':'✦ Cenas'}</button>}
        <button className="mi-exit" onClick={()=>onNavigate?.('session')}>Sair da mesa imersiva</button>
      </div>
    </header>

    {activeScene?<section className="mi-scene-caption" aria-live="polite"><span style={{color:accent}}>{THEMES.find(row=>row.id===activeScene.theme)?.icon||'✦'}</span><div><small>{THEMES.find(row=>row.id===activeScene.theme)?.label||'Cena revelada'}</small><h3>{activeScene.title}</h3></div></section>:<section className="mi-awaiting-scene"><span>✦</span><b>A narração começa aqui</b><small>{masterMode?'Adicione uma imagem e revele uma cena para a mesa.':'Aguardando a próxima cena do mestre.'}</small></section>}

    <section className="mi-camera-section"><div className="mi-camera-heading"><span>COMPANHIA</span><small>Até 8 câmeras · áudio desativado</small></div><TableCameraRoom access={access} selectedSheet={selectedSheet} selectedClass={selectedClass} masterMode={masterMode} immersive/></section>

    {masterMode&&editor&&<aside className="mi-scene-editor" aria-label="Gerenciar cenas">
      <header><div><small>CONTROLE DO MESTRE</small><h3>Arquivo de cenas</h3></div><button onClick={()=>setEditor(false)} aria-label="Fechar cenas">×</button></header>
      <div className="mi-theme-pills">{THEMES.map(item=><button key={item.id} className={theme===item.id?'active':''} style={{'--theme':item.color}} onClick={()=>setTheme(item.id)}>{item.icon} {item.label}</button>)}</div>
      <label className="mi-field">Título da cena<input value={title} onChange={event=>setTitle(event.target.value)} placeholder="Ex.: A porta se abre" maxLength={90}/></label>
      <label className="mi-file-pick">{file?`Imagem selecionada: ${file.name}`:'Escolher imagem da cena'}<input ref={fileRef} type="file" accept="image/*" onChange={event=>setFile(event.target.files?.[0]||null)}/></label>
      <button className="mi-add-scene" disabled={busy||!title.trim()||!file} onClick={addScene}>{busy?'Salvando cena…':'＋ Adicionar cena'}</button>
      {notice&&<p className="mi-notice" role="status">{notice}</p>}
      <div className="mi-scene-list"><div className="mi-list-label">CENAS SALVAS · {scenes.length}</div>{scenes.length?scenes.map(scene=>{
        const item=THEMES.find(row=>row.id===scene.theme)||THEMES[0],isActive=String(active?.sceneId||'')===String(scene.id);
        return <article key={scene.id} className={isActive?'active':''}><span style={{color:item.color}}>{item.icon}</span><div><b>{scene.title}</b><small>{item.label}</small></div><button onClick={()=>revealScene(scene)} title={isActive?'Cena visível para todos':'Revelar para todos'}>{isActive?'●':'◉'}</button><button className="mi-remove" onClick={()=>removeScene(scene)} title="Excluir cena">×</button></article>;
      }):<p className="mi-empty-scenes">Adicione imagens para criar o arquivo de cenas.</p>}</div>
      {activeScene&&<button className="mi-hide-scene" onClick={hideScene}>Ocultar cena para todos</button>}
    </aside>}
    {notice&&!editor&&<div className="mi-toast" role="status">{notice}</div>}

    <button className="mi-quick-sheet-trigger" aria-label="Abrir ficha rápida" title="Ficha rápida" onClick={()=>setQuickSheet(true)}><span>▤</span></button>
    {quickSheet&&<div className="mi-sheet-backdrop" onClick={()=>setQuickSheet(false)}><aside className="mi-quick-sheet" onClick={event=>event.stopPropagation()}>
      <header><div><small>FICHA RÁPIDA</small><h3>{selectedSheet?.nome||'Personagem'}</h3><span>{selectedClass?.icon||'✦'} {selectedClass?.name||'Classe'}</span></div><button onClick={()=>setQuickSheet(false)} aria-label="Fechar ficha">×</button></header>
      {selectedSheet?<><div className="mi-sheet-meters"><Meter icon="❤" label="Vida" value={selectedSheet.hp} max={getSheetMaxHp(selectedSheet)}/><Meter icon="✦" label="Vigor Cósmico" value={selectedSheet.vigos} max={characterMaxVigor(selectedSheet)}/></div>
        <div className="mi-sheet-stats">{[['FOR','forca'],['AGI','agilidade'],['DUR','durabilidade'],['INT','inteligencia'],['PER','percepcao'],['SOR','sorte']].filter(([,key])=>selectedSheet[key]!=null).map(([label,key])=><div key={key}><small>{label}</small><b>{selectedSheet[key]}</b></div>)}</div>
        <div className="mi-sheet-status"><small>CONDIÇÕES</small><p>{Object.entries(selectedSheet.status||{}).filter(([,value])=>value).map(([key])=>key).join(' · ')||'Nenhuma condição ativa'}</p></div>
      </>:<p className="mi-no-sheet">Selecione uma ficha para consultar os dados do personagem.</p>}
    </aside></div>}
  </div>;
}

function Meter({icon,label,value=0,max=1}){
  const current=Math.max(0,Number(value)||0),limit=Math.max(1,Number(max)||1),percent=Math.max(0,Math.min(100,current/limit*100));
  return <div className="mi-meter"><div><span>{icon} {label}</span><b>{current}/{limit}</b></div><i><em style={{width:`${percent}%`}}/></i></div>;
}
