import ImageViewer from "../../experience/ImageViewer";
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { useEffect,useRef,useState } from "react";
import { collection,deleteDoc,doc,setDoc,getDocs,query,where,writeBatch } from "firebase/firestore";
import { db } from "../../core/firebase";
import { compressImage,compressImageSmall } from "../../core/media";
import { btnStyle } from "../../core/ui";
const newEntry=id=>({id,titulo:'',sessao:'',data:new Date().toLocaleDateString('pt-BR'),mestre:'Gabriel Marcondes',participantes:'',conteudo:'',imagens:[]});

function ChronicleArchive({masterMode,archive}){
  const isOva=archive==='ovas';
  const mediaKey=id=>isOva?'ova_'+id:String(id);
  const [uploadStatus,setUploadStatus]=useState('');
  const uploading=useRef(false);
  const [preview,setPreview]=useState('');
  const [error,setError]=useState('');
  const[entries,setEntries]=useState([]);
  const[loaded,setLoaded]=useState(false);
  const[open,setOpen]=useState(null);
  const[editingChronicle,setEditingChronicle]=useState(false);
  const legacyImagesRef=useRef({});
  const hqImagesRef=useRef({});
  const originalChunksRef=useRef({});
  const saveTimeout=useRef({});
  useEffect(() => {
  const hydrateOriginal = item => {
    const chunkCount = Number(item?.chunkCount || 0);
    if (!chunkCount) return item;
    const chunks = originalChunksRef.current[String(item.id)] || [];
    if (chunks.length < chunkCount) return item;
    const ordered = Array.from({length:chunkCount}, (_,index) => chunks[index] || '');
    if (ordered.some(chunk => !chunk)) return item;
    return { ...item, full: ordered.join('') };
  };
  const composeImages = entryId => [
    ...(!isOva?(legacyImagesRef.current[String(entryId)] || []):[]),
    ...(hqImagesRef.current[mediaKey(entryId)] || []).map(hydrateOriginal),
  ];
  const unsub1 = onSnapshot(collection(db,archive), snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    data.sort((a,b) => b.id - a.id);
    setEntries(data.map(entry => ({ ...entry, sessao:entry.sessao||entry.episodio||'', imagens: [...(isOva?(entry.imagens||[]):[]),...composeImages(entry.id)] }))); 
    setLoaded(true);
  });
  const unsub2 = onSnapshot(collection(db,'cronicas_imgs'), snap => {
    const imgs = {};
    snap.docs.forEach(d => {
      imgs[d.id] = (d.data().imagens || []).map((src,idx) => ({
        id: `legacy_${d.id}_${idx}`, src, thumb:src, full:src, kind:'legacy', legacyIndex:idx,
      }));
    });
    legacyImagesRef.current = imgs;
    setEntries(prev => prev.map(entry => ({ ...entry, imagens: [...(isOva?(entry.imagens||[]).filter(img=>typeof img==='string'):[]),...composeImages(entry.id)] })));
  });
  const unsub3 = onSnapshot(collection(db,'cronicas_media'), snap => {
    const media = {};
    snap.docs.forEach(d => {
      const row = d.data() || {};
      const entryId = String(row.entryId || '');
      if (!entryId || (!row.img && !row.thumb && !row.chunkCount)) return;
      if (!media[entryId]) media[entryId] = [];
      media[entryId].push({
        id:d.id,
        src:row.img || row.full || '',
        thumb:row.thumb || row.img || row.full || '',
        full:row.full || row.img || '',
        chunkCount:Number(row.chunkCount || 0),
        kind:'hq',
        createdAt:Number(row.createdAt || 0),
      });
    });
    Object.values(media).forEach(items => items.sort((a,b) => (a.createdAt||0) - (b.createdAt||0)));
    hqImagesRef.current = media;
    setEntries(prev => prev.map(entry => ({ ...entry, imagens: [...(isOva?(entry.imagens||[]).filter(img=>typeof img==='string'):[]),...composeImages(entry.id)] })));
  });
  return () => { unsub1(); unsub2(); unsub3(); };
}, [archive]);
useEffect(()=>{
  if(loaded && entries.length>0 && !entries.some(e=>e.id===open)) setOpen(entries[0].id);
},[loaded,entries,open]);
  const saveEntry = entry => {
  clearTimeout(saveTimeout.current[entry.id]);
  saveTimeout.current[entry.id] = setTimeout(async () => {
    try {
      const { imagens, ...sem } = entry;
      await setDoc(doc(db, archive, String(entry.id)), sem,{merge:true});
    } catch(e) { console.error('Erro ao salvar crônica:', e); setError('Não foi possível salvar o texto. Confira a conexão e tente novamente.'); }
  }, 800);
};
const imageSrc = img => typeof img === 'string' ? img : String(img?.full || img?.src || img?.thumb || '');
const imageThumbSrc = img => typeof img === 'string' ? img : String(img?.thumb || img?.full || img?.src || '');
const imageFullSrc = img => typeof img === 'string' ? img : String(img?.full || img?.src || img?.thumb || '');
const saveEntryImages = async (entryId, imagens) => {
  try {
    const legacyOnly = (imagens || [])
      .filter(img => typeof img === 'string' || img?.kind === 'legacy')
      .map(imageFullSrc)
      .filter(Boolean);
    if(isOva) await setDoc(doc(db,'ovas',String(entryId)),{imagens:legacyOnly},{merge:true});
    else await setDoc(doc(db, 'cronicas_imgs', String(entryId)), { imagens: legacyOnly });
  } catch(e) { console.error('Erro ao salvar imagens:', e); alert('Não foi possível atualizar as imagens antigas desta crônica.'); }
};
const makeChronicleThumb = async dataUrl => {
  const presets = [[960,960,.90],[840,840,.87],[720,720,.84],[640,640,.80]];
  let result = dataUrl;
  for (const [w,h,q] of presets) {
    result = await compressImage(dataUrl,w,h,q);
    if (String(result || '').length < 600000) return result;
  }
  return result;
};
const splitChronicleOriginal = (dataUrl, chunkSize=480000) => {
  const value = String(dataUrl || '');
  const chunks = [];
  for (let offset=0; offset<value.length; offset+=chunkSize) chunks.push(value.slice(offset, offset+chunkSize));
  return chunks;
};
const deleteChronicleMedia = async img => {
  if (!img?.id || img?.kind !== 'hq') return;
  const chunkCount = Number(img.chunkCount || 0);
  for (let index=0; index<chunkCount; index++) {
    const chunkId = `${img.id}_${String(index).padStart(4,'0')}`;
    await deleteDoc(doc(db,'cronicas_media_chunks',chunkId)).catch(()=>{});
  }
  await deleteDoc(doc(db,'cronicas_media',String(img.id))).catch(()=>{});
};
const add = () => { const e = newEntry(Date.now()); setDoc(doc(db,archive,String(e.id)),e); setOpen(e.id); };
const upd = (id, data) => {
  setEntries(prev => prev.map(e => e.id === id ? data : e));
  const { imagens, ...sem } = data;
  saveEntry({ ...sem, id });
};
const del = async id => {
  const current = entries.find(entry => String(entry.id) === String(id));
  await deleteDoc(doc(db,archive,String(id)));
  if(!isOva)await deleteDoc(doc(db,'cronicas_imgs',String(id))).catch(()=>{});
  for (const img of (current?.imagens || [])) await deleteChronicleMedia(img);
  if(open===id) setOpen(null);
};
const showImage=async image=>{
  setPreview(imageFullSrc(image));
  if(!image?.chunkCount)return;
  try{
    const snapshot=await getDocs(query(collection(db,'cronicas_media_chunks'),where('mediaId','==',image.id)));
    const chunks=snapshot.docs.map(d=>d.data()).sort((a,b)=>a.index-b.index);
    if(chunks.length!==image.chunkCount)throw new Error('Imagem incompleta');
    const full=chunks.map(row=>row.data).join('');
    setPreview(current=>current?full:'');
  }catch(e){setError('O original não carregou. A prévia continua disponível.');}
};
const addImage = async (entry,file) => {
  if(uploading.current||!file)return;
  if((entry.imagens||[]).length>=8){setError('Máximo de 8 imagens por entrada.');return;}
  if(file.size>18*1024*1024){setError('Escolha uma imagem de até 18 MB.');return;}
  uploading.current=true;setError('');setUploadStatus('Preparando imagem...');
  const mediaId=mediaKey(entry.id)+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
  try{
    const original=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Falha ao ler arquivo'));reader.readAsDataURL(file);});
    const thumb=await makeChronicleThumb(original);
    const chunks=splitChronicleOriginal(original);
    // Small batches stay below Firestore request limits. Metadata publishes only after all chunks succeed.
    for(let offset=0;offset<chunks.length;offset+=6){
      setUploadStatus('Enviando imagem: '+Math.round(offset/chunks.length*100)+'%');
      const batch=writeBatch(db);
      chunks.slice(offset,offset+6).forEach((data,i)=>{const index=offset+i;batch.set(doc(db,'cronicas_media_chunks',mediaId+'_'+String(index).padStart(4,'0')),{mediaId,index,data});});
      await batch.commit();
    }
    await setDoc(doc(db,'cronicas_media',mediaId),{entryId:mediaKey(entry.id),thumb,chunkCount:chunks.length,originalName:file.name,createdAt:Date.now()});
    setUploadStatus('Imagem salva.');
  }catch(e){console.error('Upload de imagem:',e);setUploadStatus('');setError('Não foi possível salvar a imagem. '+(e.code==='permission-denied'?'O banco recusou a permissão de escrita.':e.message||'Confira sua conexão.'));}
  finally{uploading.current=false;}
};
const removeImage = async (entry, idx) => {
  const target = (entry.imagens||[])[idx];
  const imagens = (entry.imagens||[]).filter((_,i) => i !== idx);
  setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, imagens } : e));
  if (target?.kind === 'hq' && target?.id) {
    await deleteChronicleMedia(target);
  } else {
    await saveEntryImages(entry.id, imagens);
  }
};
  const imgInputRefs=useRef({});
  const selectedEntry = entries.find(e=>e.id===open) || entries[0] || null;
  const selectedWords = selectedEntry?.conteudo?.trim() ? selectedEntry.conteudo.trim().split(/\s+/).length : 0;
  const selectedMinutes = Math.max(1, Math.ceil(selectedWords/180));
  const selectedImages = selectedEntry?.imagens || [];
  const bannerImage = imageThumbSrc(selectedImages[0]) || '';
  const narrativeLines = (selectedEntry?.conteudo || '').split(/\n+/).map(t=>t.trim()).filter(Boolean);
  const arcTitle = selectedEntry?.arco || 'Pequeninis';
  const actTitle = selectedEntry?.ato || 'Ato III';
  const sessionTitle = selectedEntry?.titulo || 'Crônica sem título';
  const sessionNumber = selectedEntry?.sessao || '—';
  const sessionQuote = selectedEntry?.frase || 'Toda aventura deixa um eco na história.';
  const sessionLocation = selectedEntry?.local || arcTitle;
  const sessionMaster = selectedEntry?.mestre || 'Gabriel Marcondes';
  const sessionDuration = selectedEntry?.duracao || 'Duração não informada';
  // CRONICAS CLEAN SESSION META 2026-09-15
  const legacyParticipants = ['Ignácio','Jansen','Kenai','Elyon','Mateeo'];
  const hasParticipantsField = !!selectedEntry && Object.prototype.hasOwnProperty.call(selectedEntry,'participantes');
  const participantNames = (Array.isArray(selectedEntry?.participantes)
    ? selectedEntry.participantes
    : hasParticipantsField
      ? String(selectedEntry?.participantes || '').split(/[,;]/)
      : legacyParticipants
  ).map(name=>String(name||'').trim()).filter(Boolean);
  const participantPalette = ['#58D9FF','#E8193C','#E8A020','#A855F7','#4ADE80','#F472B6','#22D3EE','#F59E0B'];
  const participantColor = (name,index) => {
    const normalized = String(name||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
    const known = normalized.includes('ignacio') ? '#58D9FF'
      : normalized.includes('jansen') ? '#E8193C'
      : normalized.includes('kenai') ? '#E8A020'
      : normalized.includes('elyon') ? '#A855F7'
      : (normalized.includes('mateeo') || normalized.includes('matheus')) ? '#4ADE80'
      : '';
    if (known) return known;
    let hash = 0; for (const ch of normalized) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
    return participantPalette[Math.abs(hash || index) % participantPalette.length];
  };
  const participantInitial = name => String(name||'?').trim().charAt(0).toUpperCase() || '?';
  return(
    <div className="chronicles-shell" data-archive={archive}>
      {uploadStatus&&<div className="chronicles-upload-status" role="status">{uploadStatus}</div>}
      {error&&<div className="chronicles-upload-error" role="alert">{error}<button onClick={()=>setError('')}>Fechar</button></div>}
      {preview&&<ImageViewer src={preview} title="Memória da aventura" onClose={()=>setPreview('')}/>}

        {!loaded&&<div style={{textAlign:'center',color:'#746883',fontFamily:'Cinzel,serif',padding:50}}>Conectando ao arquivo das crônicas...</div>}
        {loaded&&entries.length===0&&<div className="chronicles-panel" style={{padding:50,textAlign:'center',borderRadius:14}}><div style={{fontSize:38}}>📖</div><div style={{fontFamily:'Cinzel,serif',color:'#bda8cf',marginTop:10}}>Nenhuma crônica registrada.</div>{masterMode&&<button onClick={add} style={{...btnStyle('#A855F7'),marginTop:18}}>{isOva?'+ Nova OVA':'+ Nova Crônica'}</button>}</div>}
        {loaded&&selectedEntry&&(
          <div className="chronicles-grid">
            <aside className="chronicles-panel chronicles-left">
              <div style={{padding:'20px 18px 17px',borderBottom:'1px solid rgba(255,255,255,.055)'}}>
                <div style={{display:'flex',gap:11,alignItems:'center'}}><div style={{width:42,height:42,borderRadius:'50%',border:'1px solid rgba(216,180,254,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,background:'rgba(124,58,237,.08)'}}>📖</div><div><div style={{fontFamily:'Cinzel Decorative,serif',fontSize:18,color:'#e6d6c8'}}>{isOva?'OVA':'Crônicas'}</div><div style={{fontSize:11,color:'#786d80',lineHeight:1.4,marginTop:2}}>Registros das aventuras<br/>e memórias de cada sessão.</div></div></div>
              </div>
              <div style={{padding:'17px 13px 12px',overflowY:'auto'}}>
                <div style={{fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'.14em',color:'#b58be8',margin:'0 5px 8px'}}>ARCO ATUAL</div>
                <div style={{fontFamily:'Cinzel,serif',fontSize:20,color:'#e6cfae',padding:'0 5px 13px'}}>{arcTitle}</div>
                <div className="chronicles-session-list">
                  {entries.map(entry=>{const active=entry.id===selectedEntry.id;return <button key={entry.id} className="chronicles-session-button" onClick={()=>{setOpen(entry.id);setEditingChronicle(false);}} style={{border:active?'1px solid rgba(168,85,247,.58)':'1px solid transparent',background:active?'linear-gradient(90deg,rgba(124,58,237,.2),rgba(76,29,149,.08))':'transparent',boxShadow:active?'inset 3px 0 0 #8b5cf6,0 0 18px rgba(124,58,237,.08)':'none',color:active?'#e8dafa':'#93859c'}}><span style={{width:10,height:10,borderRadius:'50%',marginTop:5,flexShrink:0,background:active?'#8b5cf6':'transparent',border:`1px solid ${active?'#a78bfa':'#806e83'}`,boxShadow:active?'0 0 8px #7c3aed':'none'}}/><span style={{minWidth:0,flex:1}}><span style={{display:'block',fontFamily:'Cinzel,serif',fontSize:12,color:active?'#f0e4f8':'#b6a7b5'}}>Sessão {entry.sessao||'—'}</span><span style={{display:'block',fontSize:11,color:active?'#a99ab0':'#685e70',marginTop:3,lineHeight:1.35,whiteSpace:'normal'}}>{entry.titulo||'(Sem título)'}</span></span></button>})}
                </div>
                <div style={{height:1,background:'rgba(255,255,255,.055)',margin:'17px 5px'}}/>
                <div style={{fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'.14em',color:'#b58be8',margin:'0 5px 10px'}}>OUTROS ARCOS</div>
                {['🏰  O Castelo','🚆  Trem Maglev','💎  Salar de Uyuni','♨️  Thermas dos Laranjais'].map(x=><div key={x} style={{padding:'9px 6px',fontFamily:'Cinzel,serif',fontSize:12,color:'#af9daa'}}>{x}</div>)}
              </div>
              {masterMode&&<div style={{marginTop:'auto',padding:13,borderTop:'1px solid rgba(255,255,255,.05)',display:'grid',gap:7}}><button onClick={add} style={{...btnStyle('#A855F7'),width:'100%'}}>{isOva?'+ Nova OVA':'+ Nova Crônica'}</button><button onClick={()=>setEditingChronicle(v=>!v)} style={{...btnStyle('#C8A8E8'),width:'100%'}}>{editingChronicle?'Fechar edição':'✦ Editar crônica'}</button></div>}
            </aside>

            <main className="chronicles-panel chronicles-main">
              <div className="chronicles-banner">
                {bannerImage&&<img loading="lazy" decoding="async" src={bannerImage} alt=""/>}
                <div style={{position:'absolute',zIndex:2,left:29,top:19,fontFamily:'Cinzel,serif',fontSize:11,letterSpacing:'.12em',color:'#c7a0f3'}}>✦ {arcTitle.toUpperCase()} · {actTitle.toUpperCase()}</div>
                <div style={{position:'absolute',zIndex:2,left:29,right:26,bottom:20}}>
                  <div style={{fontFamily:'Cinzel,serif',fontSize:14,color:'#d9b77c',marginBottom:7}}>{isOva?'Episódio':'Sessão'} {sessionNumber}</div>
                  <h1 style={{fontFamily:'Cinzel Decorative,serif',fontSize:34,lineHeight:1.14,color:'#eee5dc',margin:0,textShadow:'0 3px 18px rgba(0,0,0,.9)',maxWidth:720}}>{sessionTitle}</h1>
                </div>
              </div>
              <div className="chronicles-reading">
                <div style={{display:'flex',gap:18,flexWrap:'wrap',padding:'15px 0 12px',fontSize:12,color:'#aa9178',borderBottom:'1px solid rgba(255,255,255,.045)'}}><span>▣ {selectedEntry.data}</span><span>▤ {selectedWords} palavras</span><span>◷ ~ {selectedMinutes} min de leitura</span></div>
                <div style={{fontFamily:'Crimson Text,Georgia,serif',fontStyle:'italic',fontSize:16,color:'#d6b78b',padding:'17px 0 13px'}}>“{sessionQuote}”</div>
                <div style={{height:3,borderRadius:4,background:'rgba(255,255,255,.07)',overflow:'hidden',marginBottom:22}}><div style={{width:'32%',height:'100%',background:'linear-gradient(90deg,#7c3aed,#a855f7)',boxShadow:'0 0 12px rgba(168,85,247,.6)'}}/></div>
                <div className="chronicles-story">{narrativeLines.length?narrativeLines.map((line,i)=>{const dialogue=/^[—-]/.test(line);return <p key={i} className={dialogue?'dialogue':''}>{line}</p>}):<p style={{fontStyle:'italic',color:'#655b6c'}}>Esta crônica ainda não possui narrativa.</p>}</div>
                {selectedImages.length>0&&<section style={{marginTop:24,padding:'13px',border:'1px solid rgba(216,180,254,.12)',borderRadius:11,background:'rgba(255,255,255,.012)'}}><div style={{fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'.13em',color:'#c59bf3',marginBottom:10}}>✦ MEMÓRIAS DA SESSÃO</div><div className="chronicles-memory-grid">{selectedImages.slice(0,8).map((img,i)=><div key={img?.id||i} className="chronicles-memory-cell"><button className="chronicles-memory" onClick={()=>showImage(img)} aria-label="Ampliar imagem"><img loading="lazy" decoding="async" className="chronicles-memory-thumb" src={imageThumbSrc(img)} alt=""/></button><div style={{fontSize:10,color:'#87798b',textAlign:'center',marginTop:5}}>Memória {i+1}</div></div>)}</div></section>}
              </div>

              {masterMode&&editingChronicle&&<div className="chronicles-editor">
                <div style={{fontFamily:'Cinzel,serif',color:'#d7b9f4',fontSize:13,marginBottom:13}}>EDIÇÃO DA CRÔNICA — salvamento automático</div>
                <div style={{display:'grid',gridTemplateColumns:'2fr 90px 1fr 1fr',gap:8,marginBottom:8}}><input value={selectedEntry.titulo||''} onChange={e=>upd(selectedEntry.id,{...selectedEntry,titulo:e.target.value})} placeholder="Título"/><input value={selectedEntry.sessao||''} onChange={e=>upd(selectedEntry.id,{...selectedEntry,sessao:e.target.value})} placeholder="Sessão"/><input value={selectedEntry.arco||''} onChange={e=>upd(selectedEntry.id,{...selectedEntry,arco:e.target.value})} placeholder="Arco"/><input value={selectedEntry.ato||''} onChange={e=>upd(selectedEntry.id,{...selectedEntry,ato:e.target.value})} placeholder="Ato"/></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:8}}><input value={selectedEntry.duracao||''} onChange={e=>upd(selectedEntry.id,{...selectedEntry,duracao:e.target.value})} placeholder="Duração"/><input value={selectedEntry.local||''} onChange={e=>upd(selectedEntry.id,{...selectedEntry,local:e.target.value})} placeholder="Local"/><input value={selectedEntry.mestre||''} onChange={e=>upd(selectedEntry.id,{...selectedEntry,mestre:e.target.value})} placeholder="Mestre"/></div>
                <input className="chronicles-participants-input" value={Array.isArray(selectedEntry.participantes)?selectedEntry.participantes.join(', '):(selectedEntry.participantes??'')} onChange={e=>upd(selectedEntry.id,{...selectedEntry,participantes:e.target.value})} placeholder="Personagens presentes — separe por vírgula" style={{width:'100%',marginBottom:8}}/>
                <input value={selectedEntry.frase||''} onChange={e=>upd(selectedEntry.id,{...selectedEntry,frase:e.target.value})} placeholder="Frase de impacto" style={{width:'100%',marginBottom:8}}/>
                <textarea value={selectedEntry.conteudo||''} onChange={e=>upd(selectedEntry.id,{...selectedEntry,conteudo:e.target.value})} rows={12} style={{width:'100%',resize:'vertical',lineHeight:1.75,marginBottom:10}}/>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><div style={{fontSize:11,color:'#6d6174'}}>{selectedImages.length}/8 imagens preservadas</div><div style={{display:'flex',gap:8}}><button disabled={uploading.current} onClick={()=>imgInputRefs.current[selectedEntry.id]?.click()} style={btnStyle('#A855F7')}>🖼 Adicionar imagem</button><input ref={el=>imgInputRefs.current[selectedEntry.id]=el} type="file" accept="image/*" onChange={e=>{if(e.target.files[0])addImage(selectedEntry,e.target.files[0]);e.target.value='';}} style={{display:'none'}}/><button onClick={()=>{if(confirm('Excluir esta crônica e suas imagens?'))del(selectedEntry.id)}} style={btnStyle('#E8193C')}>Excluir</button></div></div>
                {selectedImages.length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:8,marginTop:12}}>{selectedImages.map((img,i)=><div key={img?.id||i} style={{position:'relative'}}><div className="chronicles-memory"><img loading="lazy" decoding="async" src={imageThumbSrc(img)} alt=""/></div><button onClick={()=>removeImage(selectedEntry,i)} style={{position:'absolute',right:5,top:5,border:0,borderRadius:5,background:'rgba(180,20,50,.9)',color:'#fff',cursor:'pointer'}}>✕</button></div>)}</div>}
              </div>}
            </main>

            <aside className="chronicles-panel chronicles-right">
              <section className="chronicles-side-section"><div style={{fontFamily:'Cinzel,serif',fontSize:18,color:'#e1c08d',marginBottom:13}}>{isOva?'Episódio':'Sessão'} {sessionNumber}</div><div className="chronicles-chip">▣ <span>{selectedEntry.data}</span></div><div className="chronicles-chip">◷ <span>{sessionDuration}</span></div><div className="chronicles-chip">⌖ <span>{sessionLocation}</span></div><div className="chronicles-chip">♙ <span>{sessionMaster}</span></div></section>
              <section className="chronicles-side-section chronicles-participants-section"><div className="chronicles-side-title">PERSONAGENS PRESENTES</div><div className="chronicles-participants-list">{participantNames.length?participantNames.map((name,i)=>{const color=participantColor(name,i);return <div className="chronicles-participant" key={name+'_'+i} title={name}><div className="chronicles-participant-orb" style={{'--participant-color':color}}>{participantInitial(name)}</div><small>{name}</small></div>}):<span className="chronicles-empty-participants">Nenhum personagem informado.</span>}</div>{masterMode&&<div className="chronicles-participants-hint">Edite os participantes em “Editar crônica”.</div>}</section>
              <section className="chronicles-side-section"><div style={{fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'.13em',color:'#c49af1',marginBottom:11}}>LOCALIZAÇÃO</div><div style={{display:'flex',gap:10,alignItems:'center'}}><span style={{fontSize:22,color:'#a855f7'}}>⌖</span><div><div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#d7bd91'}}>{sessionLocation}</div><div style={{fontSize:11,color:'#776c7b',marginTop:3}}>{arcTitle}</div></div></div></section>
              
              <section className="chronicles-side-section"><div style={{fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'.13em',color:'#c49af1',marginBottom:12}}>LINHA DO TEMPO</div><div className="chronicles-timeline">{narrativeLines.slice(0,5).map((line,i)=><div className="chronicles-timeline-row" key={i}><div className="chronicles-timeline-dot">{i+1}</div><div>{line.length>75?line.slice(0,75)+'…':line}</div></div>)}</div></section>
            </aside>
          </div>
        )}
    </div>
  );
}
function CronicasSection({masterMode}){
  const [archive,setArchive]=useState('cronicas');
  return <><nav className="chronicles-tabs" aria-label="Arquivo de histórias">{[['cronicas','Crônicas'],['ovas','OVA']].map(([id,label])=><button key={id} aria-pressed={archive===id} onClick={()=>setArchive(id)}>{label}</button>)}</nav><ChronicleArchive key={archive} archive={archive} masterMode={masterMode}/></>;
}
export default CronicasSection;
