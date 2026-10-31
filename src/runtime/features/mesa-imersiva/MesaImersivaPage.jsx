import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, runTransaction, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../core/firebase';
import { compressImage } from '../../core/media';
import { getSheetMaxHp } from '../../data/gameData';
import { characterMaxVigor } from '../../adventure/characterResources.mjs';
import { STATUS_LIST } from '../../data/gameData';
import { useExperience } from '../../experience/ExperienceKit.generated';
import TableCameraRoom from '../../experience/TableCameraRoom';
import AmbientSoundPlayer from '../../shell/AmbientSoundPlayer';
import './mesa-imersiva.css';

const THEMES = [
  { id:'revelacao', label:'Revelação', icon:'◇', color:'#caa6ff' },
  { id:'combate', label:'Combate', icon:'⚔', color:'#f05a70' },
  { id:'inimigo', label:'Inimigo', icon:'◉', color:'#fb8a58' },
  { id:'cenario', label:'Cenário', icon:'⌖', color:'#64d9c3' },
];
const nowId=()=>`scene_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

export default function MesaImersivaPage({ masterMode, access, onNavigate }){
  const { selectedSheet, selectedClass, useQuickAbility }=useExperience();
  const [scenes,setScenes]=useState([]),[active,setActive]=useState(null),[activeImage,setActiveImage]=useState('');
  const [editor,setEditor]=useState(false),[title,setTitle]=useState(''),[theme,setTheme]=useState('revelacao');
  const [file,setFile]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const [quickSheet,setQuickSheet]=useState(false),fileRef=useRef(null),[abilityBusy,setAbilityBusy]=useState('');
  const quickAbilities=useMemo(()=>listAbilities(selectedClass,selectedSheet),[selectedClass,selectedSheet]);
  const adjustResource=async(field,delta)=>{
    if(!selectedSheet?.id)return;
    try{await runTransaction(db,async tx=>{
      const ref=doc(db,'sheets',String(selectedSheet.id)),snap=await tx.get(ref);if(!snap.exists())return;
      const sheet=snap.data()||{},value=Number(sheet[field]||0),max=field==='hp'?getSheetMaxHp(sheet):characterMaxVigor(sheet);
      tx.set(ref,{[field]:Math.max(0,Math.min(max,value+delta))},{merge:true});
    });}catch{setNotice('Não foi possível atualizar esse recurso. Confira a conexão e tente novamente.');}
  };
  const setResource=async(field,value)=>{
    if(!selectedSheet?.id)return;
    try{await runTransaction(db,async tx=>{
      const ref=doc(db,'sheets',String(selectedSheet.id)),snap=await tx.get(ref);if(!snap.exists())return;
      const sheet=snap.data()||{},max=field==='hp'?getSheetMaxHp(sheet):characterMaxVigor(sheet);
      tx.set(ref,{[field]:Math.max(0,Math.min(max,Number(value)||0))},{merge:true});
    });}catch{setNotice('Não foi possível atualizar esse recurso. Confira a conexão e tente novamente.');}
  };
  const activateAbility=async ability=>{
    const key=abilityKey(ability);if(abilityBusy||!ability)return;
    setAbilityBusy(key);
    try{const ok=await useQuickAbility(ability);if(!ok)setNotice(`Não foi possível usar ${abilityName(ability)}: confira o vigor e o tempo de recarga.`);}
    catch{setNotice('Não foi possível registrar a habilidade. Confira a conexão.');}
    finally{setAbilityBusy('');}
  };
  const toggleStatus=async id=>{
    if(!selectedSheet?.id)return;
    try{await updateDoc(doc(db,'sheets',String(selectedSheet.id)),{[`status.${id}`]:!selectedSheet.status?.[id]});}
    catch{setNotice('Não foi possível atualizar as condições.');}
  };

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
      <div className="mi-title-block"><span className="mi-eyebrow">DINASTIA E</span><h2>Mesa Imersiva</h2></div>
      {activeScene&&<div className="mi-session-title" aria-live="polite"><small>SESSÃO ATUAL</small><h3>{activeScene.title}</h3></div>}
      <div className="mi-top-actions">
        {masterMode&&<button className="mi-scene-toggle" onClick={()=>setEditor(value=>!value)}>{editor?'Fechar cenas':'✦ Cenas'}</button>}
        <AmbientSoundPlayer masterMode={masterMode} immersive/>
        <button className="mi-exit" onClick={()=>onNavigate?.('session')}>Sair da mesa imersiva</button>
      </div>
    </header>

    {!activeScene&&<section className="mi-awaiting-scene"><span>✦</span><b>A narração começa aqui</b><small>{masterMode?'Adicione uma imagem e revele uma cena para a mesa.':'Aguardando a próxima cena do mestre.'}</small></section>}

    <section className="mi-camera-section"><div className="mi-camera-heading"><span>COMPANHIA</span><small>Até 7 câmeras · áudio desativado</small></div><TableCameraRoom access={access} selectedSheet={selectedSheet} selectedClass={selectedClass} masterMode={masterMode} immersive/></section>

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
      <header><div><small>FICHA RÁPIDA</small><div className="mi-sheet-identity"><span className="mi-sheet-portrait" style={{'--mi-class-color':selectedClass?.color||'#a855f7'}}>{selectedSheet?.foto?<img src={selectedSheet.foto} alt=""/>:(selectedClass?.icon||selectedSheet?.nome?.[0]||'✦')}</span><div><h3>{selectedSheet?.nome||'Personagem'}</h3><span>{selectedClass?.icon||'✦'} {selectedClass?.name||'Classe'} · Nv {selectedSheet?.nivel||1}</span></div></div></div><button onClick={()=>setQuickSheet(false)} aria-label="Fechar ficha">×</button></header>
      {selectedSheet?<><div className="mi-resource-card mi-hp-card"><div className="mi-resource-title"><span>♥ VIDA</span><b>{Number(selectedSheet.hp||0)} / {getSheetMaxHp(selectedSheet)}</b></div><Meter icon="" label="" value={selectedSheet.hp} max={getSheetMaxHp(selectedSheet)}/><div className="mi-resource-actions"><button onClick={()=>adjustResource('hp',-1)} aria-label="Diminuir vida em um">−</button><strong>{Number(selectedSheet.hp||0)}</strong><button onClick={()=>adjustResource('hp',1)} aria-label="Aumentar vida em um">+</button></div><div className="mi-resource-steps">{[-10,-5,5,10].map(step=><button key={step} onClick={()=>adjustResource('hp',step)}>{step>0?'+':''}{step}</button>)}</div></div>
        <div className="mi-resource-card mi-vc-card"><div className="mi-resource-title"><span>✦ VIGOR CÓSMICO</span><b>{Number(selectedSheet.vigos||0)} / {characterMaxVigor(selectedSheet)}</b></div><div className="mi-vc-dots">{Array.from({length:characterMaxVigor(selectedSheet)},(_,index)=><button key={index} className={index<Number(selectedSheet.vigos||0)?'filled':''} onClick={()=>setResource('vigos',index<Number(selectedSheet.vigos||0)?index:index+1)} aria-label={`Definir vigor cósmico em ${index+1}`} title={`${index+1} VC`}/>)}</div><div className="mi-resource-steps"><button onClick={()=>adjustResource('vigos',-1)}>−1</button><button onClick={()=>adjustResource('vigos',1)}>+1</button></div></div>
        <div className="mi-sheet-stats">{[['FOR','forca'],['AGI','agilidade'],['DUR','durabilidade'],['INT','inteligencia'],['PER','percepcao'],['SOR','sorte']].filter(([,key])=>selectedSheet[key]!=null).map(([label,key])=><div key={key}><small>{label}</small><b>{selectedSheet[key]}</b></div>)}</div>
        <div className="mi-sheet-status"><small>CONDIÇÕES ATIVAS</small><p>{Object.entries(selectedSheet.status||{}).filter(([,value])=>value).map(([key])=>key).join(' · ')||'Nenhuma condição ativa'}</p><div className="mi-status-buttons">{STATUS_LIST.map(status=><button key={status.id} className={selectedSheet.status?.[status.id]?'active':''} onClick={()=>toggleStatus(status.id)}>{status.icon||'✦'} {status.label||status.id}</button>)}</div></div>
        <section className="mi-quick-abilities"><div className="mi-abilities-heading"><small>HABILIDADES</small><span>{quickAbilities.length}</span></div>{quickAbilities.length?quickAbilities.map((ability,index)=>{
          const key=abilityKey(ability),cost=Number(ability.cost??ability.custo??0)||0,cooldown=Number(selectedSheet.cooldowns?.[key]||0),description=String(ability.desc||ability.descricao||ability.description||''),passive=/passiv/i.test(String(ability.tipoHab||ability.tipo||ability.type||''));
          return <article key={key} className="mi-ability-card"><div><span className="mi-ability-number">{String(index+1).padStart(2,'0')}</span><div><b>{abilityName(ability)}</b><small>{ability.tipoHab||ability.tipo||'Habilidade'}{cost?` · ${cost} VC`:''}{cooldown?` · Recarga ${cooldown}`:''}</small></div></div>{description&&<p>{description}</p>}<button disabled={passive||!!abilityBusy||cooldown>0||Number(selectedSheet.vigos||0)<cost} onClick={()=>activateAbility(ability)}>{passive?'Passiva':abilityBusy===key?'Usando…':cooldown>0?`Em recarga · ${cooldown}`:Number(selectedSheet.vigos||0)<cost?'Vigor insuficiente':'Usar habilidade'}</button></article>;
        }):<p className="mi-empty-abilities">Esta ficha ainda não tem habilidades cadastradas.</p>}</section>
      </>:<p className="mi-no-sheet">Selecione uma ficha para consultar os dados do personagem.</p>}
    </aside></div>}
  </div>;
}

function listAbilities(cls,sheet){
  const passiveRows=[cls?.passive,cls?.passiva,sheet?.passive,sheet?.passiva].filter(row=>row&&typeof row==='object').map(row=>({...row,tipoHab:row.tipoHab||'passiva'}));
  const buckets=[cls?.normal,cls?.normais,cls?.habilidades,cls?.abilities,cls?.skills,cls?.especial,cls?.especiais,cls?.special,cls?.specials,cls?.passivas,cls?.campanha,cls?.campaign,sheet?.normal,sheet?.normais,sheet?.habilidades,sheet?.abilities,sheet?.skills,sheet?.especial,sheet?.especiais,sheet?.special,sheet?.passivas,sheet?.campanha,sheet?.campaign,...passiveRows];
  const rows=[];const visit=value=>{if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object'){if(value.id||value.name||value.nome||value.desc||value.descricao||value.cost!=null||value.custo!=null)rows.push(value);else Object.values(value).forEach(visit);}};buckets.forEach(visit);
  const seen=new Set();return rows.filter(row=>{const key=abilityKey(row);if(seen.has(key))return false;seen.add(key);return true;});
}
function abilityKey(row){return String(row?.id||row?.name||row?.nome||'habilidade');}
function abilityName(row){return String(row?.name||row?.nome||'Habilidade');}

function Meter({icon,label,value=0,max=1}){
  const current=Math.max(0,Number(value)||0),limit=Math.max(1,Number(max)||1),percent=Math.max(0,Math.min(100,current/limit*100));
  return <div className={`mi-meter${!icon&&!label?' mi-meter-track-only':''}`}>{(icon||label)&&<div><span>{icon} {label}</span><b>{current}/{limit}</b></div>}<i><em style={{width:`${percent}%`}}/></i></div>;
}
