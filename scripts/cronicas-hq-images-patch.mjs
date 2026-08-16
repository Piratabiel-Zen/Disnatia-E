import fs from 'node:fs';
import path from 'node:path';

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  const next = source.replace(before, after);
  if (next === source) throw new Error(`Crônicas HQ patch falhou: ${label}`);
  return next;
}

const cronicasFile = path.join(process.cwd(), 'src', 'features', 'cronicas', 'CronicasPage.jsx');
let source = fs.readFileSync(cronicasFile, 'utf8');

source = replaceRequired(
  source,
  "  const[editingChronicle,setEditingChronicle]=useState(false);\n  const saveTimeout=useRef({});",
  "  const[editingChronicle,setEditingChronicle]=useState(false);\n  const legacyImagesRef=useRef({});\n  const hqImagesRef=useRef({});\n  const saveTimeout=useRef({});",
  'refs de mídia das crônicas'
);

source = replaceRequired(
  source,
  `  useEffect(() => {\n  const unsub1 = onSnapshot(collection(db,'cronicas'), snap => {\n    const data = snap.docs.map(d => ({ id: d.id, ...d.data(), imagens: [] }));\n    data.sort((a,b) => b.id - a.id);\n    setEntries(data);\n    setLoaded(true);\n  });\n  const unsub2 = onSnapshot(collection(db,'cronicas_imgs'), snap => {\n    const imgs = {};\n    snap.docs.forEach(d => { imgs[d.id] = d.data().imagens || []; });\n    setEntries(prev => prev.map(e => ({ ...e, imagens: imgs[String(e.id)] || [] })));\n  });\n  return () => { unsub1(); unsub2(); };\n}, []);`,
  `  useEffect(() => {\n  const composeImages = entryId => [\n    ...(legacyImagesRef.current[String(entryId)] || []),\n    ...(hqImagesRef.current[String(entryId)] || []),\n  ];\n  const unsub1 = onSnapshot(collection(db,'cronicas'), snap => {\n    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));\n    data.sort((a,b) => b.id - a.id);\n    setEntries(data.map(entry => ({ ...entry, imagens: composeImages(entry.id) })));\n    setLoaded(true);\n  });\n  const unsub2 = onSnapshot(collection(db,'cronicas_imgs'), snap => {\n    const imgs = {};\n    snap.docs.forEach(d => {\n      imgs[d.id] = (d.data().imagens || []).map((src,idx) => ({\n        id: \`legacy_\${d.id}_\${idx}\`, src, kind:'legacy', legacyIndex:idx,\n      }));\n    });\n    legacyImagesRef.current = imgs;\n    setEntries(prev => prev.map(entry => ({ ...entry, imagens: composeImages(entry.id) })));\n  });\n  const unsub3 = onSnapshot(collection(db,'cronicas_media'), snap => {\n    const media = {};\n    snap.docs.forEach(d => {\n      const row = d.data() || {};\n      const entryId = String(row.entryId || '');\n      if (!entryId || !row.img) return;\n      if (!media[entryId]) media[entryId] = [];\n      media[entryId].push({\n        id:d.id, src:row.img, kind:'hq', createdAt:Number(row.createdAt || 0),\n      });\n    });\n    Object.values(media).forEach(items => items.sort((a,b) => (a.createdAt||0) - (b.createdAt||0)));\n    hqImagesRef.current = media;\n    setEntries(prev => prev.map(entry => ({ ...entry, imagens: composeImages(entry.id) })));\n  });\n  return () => { unsub1(); unsub2(); unsub3(); };\n}, []);`,
  'mídia HQ separada com fallback legado'
);

source = replaceRequired(
  source,
  `const saveEntryImages = async (entryId, imagens) => {\n  try {\n    await setDoc(doc(db, 'cronicas_imgs', String(entryId)), { imagens: imagens || [] });\n  } catch(e) { console.error('Erro ao salvar imagens:', e); alert('Imagem muito grande mesmo após compressão. Tente uma foto menor.'); }\n};`,
  `const imageSrc = img => typeof img === 'string' ? img : String(img?.src || '');\nconst saveEntryImages = async (entryId, imagens) => {\n  try {\n    const legacyOnly = (imagens || [])\n      .filter(img => typeof img === 'string' || img?.kind === 'legacy')\n      .map(imageSrc)\n      .filter(Boolean);\n    await setDoc(doc(db, 'cronicas_imgs', String(entryId)), { imagens: legacyOnly });\n  } catch(e) { console.error('Erro ao salvar imagens:', e); alert('Não foi possível atualizar as imagens antigas desta crônica.'); }\n};\nconst compressChronicleImageHQ = async dataUrl => {\n  if (String(dataUrl || '').length < 760000) return dataUrl;\n  const presets = [\n    [2400,1800,.90],\n    [2100,1575,.86],\n    [1800,1350,.82],\n    [1500,1125,.78],\n    [1280,960,.72],\n  ];\n  let result = '';\n  for (const [w,h,q] of presets) {\n    result = await compressImage(dataUrl,w,h,q);\n    if (result.length < 840000) return result;\n  }\n  throw new Error('Imagem ainda muito grande após otimização HQ.');\n};`,
  'compressão HQ das crônicas'
);

source = replaceRequired(
  source,
  `const del = async id => {\n  await deleteDoc(doc(db,'cronicas',String(id)));\n  await deleteDoc(doc(db,'cronicas_imgs',String(id))).catch(()=>{});\n  if(open===id) setOpen(null);\n};\nconst addImage = async (entry, file) => {\n  const reader = new FileReader();\n  reader.onload = async ev => {\n    const compressed = await compressImageSmall(ev.target.result);\n    const imagens = [...(entry.imagens||[]), compressed];\n    if(imagens.length > 8){ alert('Máximo de 8 imagens por crônica.'); return; }\n    const newEntry2 = { ...entry, imagens };\n    setEntries(prev => prev.map(e => e.id === entry.id ? newEntry2 : e));\n    await saveEntryImages(entry.id, imagens);\n  };\n  reader.readAsDataURL(file);\n};\nconst removeImage = async (entry, idx) => {\n  const imagens = (entry.imagens||[]).filter((_,i) => i !== idx);\n  const newEntry2 = { ...entry, imagens };\n  setEntries(prev => prev.map(e => e.id === entry.id ? newEntry2 : e));\n  await saveEntryImages(entry.id, imagens);\n};`,
  `const del = async id => {\n  const current = entries.find(entry => String(entry.id) === String(id));\n  await deleteDoc(doc(db,'cronicas',String(id)));\n  await deleteDoc(doc(db,'cronicas_imgs',String(id))).catch(()=>{});\n  for (const img of (current?.imagens || [])) {\n    if (img?.kind === 'hq' && img?.id) await deleteDoc(doc(db,'cronicas_media',String(img.id))).catch(()=>{});\n  }\n  if(open===id) setOpen(null);\n};\nconst addImage = async (entry, file) => {\n  const currentImages = entry.imagens || [];\n  if(currentImages.length >= 8){ alert('Máximo de 8 imagens por crônica.'); return; }\n  const reader = new FileReader();\n  reader.onload = async ev => {\n    try {\n      const optimized = await compressChronicleImageHQ(ev.target.result);\n      const mediaId = \`\${entry.id}_\${Date.now()}_\${Math.random().toString(36).slice(2,7)}\`;\n      const createdAt = Date.now();\n      const image = { id:mediaId, src:optimized, kind:'hq', createdAt };\n      const imagens = [...currentImages, image];\n      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, imagens } : e));\n      await setDoc(doc(db,'cronicas_media',mediaId), {\n        entryId:String(entry.id), img:optimized, createdAt,\n      });\n    } catch(e) {\n      console.error('Erro ao salvar imagem HQ da crônica:', e);\n      alert('A imagem ficou grande demais para salvar com segurança. Tente uma imagem um pouco menor.');\n    }\n  };\n  reader.readAsDataURL(file);\n};\nconst removeImage = async (entry, idx) => {\n  const target = (entry.imagens||[])[idx];\n  const imagens = (entry.imagens||[]).filter((_,i) => i !== idx);\n  setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, imagens } : e));\n  if (target?.kind === 'hq' && target?.id) {\n    await deleteDoc(doc(db,'cronicas_media',String(target.id))).catch(()=>{});\n  } else {\n    await saveEntryImages(entry.id, imagens);\n  }\n};`,
  'upload e remoção HQ por imagem'
);

source = replaceRequired(
  source,
  "  const bannerImage = selectedImages[0] || '';",
  "  const bannerImage = imageSrc(selectedImages[0]) || '';",
  'banner aceita mídia HQ'
);

source = replaceRequired(
  source,
  `<div className="chronicles-memory-grid">{selectedImages.slice(0,8).map((img,i)=><div key={i}><div className="chronicles-memory"><img src={img} alt=""/></div><div style={{fontSize:10,color:'#87798b',textAlign:'center',marginTop:5}}>Memória {i+1}</div></div>)}</div>`,
  `<div className="chronicles-memory-grid">{selectedImages.slice(0,8).map((img,i)=><div key={img?.id||i}><div className="chronicles-memory"><img src={imageSrc(img)} alt=""/></div><div style={{fontSize:10,color:'#87798b',textAlign:'center',marginTop:5}}>Memória {i+1}</div></div>)}</div>`,
  'galeria de leitura HQ'
);

source = replaceRequired(
  source,
  `{selectedImages.length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:8,marginTop:12}}>{selectedImages.map((img,i)=><div key={i} style={{position:'relative'}}><div className="chronicles-memory"><img src={img} alt=""/></div><button onClick={()=>removeImage(selectedEntry,i)} style={{position:'absolute',right:5,top:5,border:0,borderRadius:5,background:'rgba(180,20,50,.9)',color:'#fff',cursor:'pointer'}}>✕</button></div>)}</div>}`,
  `{selectedImages.length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:8,marginTop:12}}>{selectedImages.map((img,i)=><div key={img?.id||i} style={{position:'relative'}}><div className="chronicles-memory"><img src={imageSrc(img)} alt=""/></div><button onClick={()=>removeImage(selectedEntry,i)} style={{position:'absolute',right:5,top:5,border:0,borderRadius:5,background:'rgba(180,20,50,.9)',color:'#fff',cursor:'pointer'}}>✕</button></div>)}</div>}`,
  'galeria de edição HQ'
);

fs.writeFileSync(cronicasFile, source);

for (const marker of [
  "collection(db,'cronicas_media')",
  'compressChronicleImageHQ',
  "doc(db,'cronicas_media',mediaId)",
  'imageSrc(selectedImages[0])',
  'src={imageSrc(img)}',
]) {
  if (!source.includes(marker)) throw new Error(`Crônicas HQ: marcador ausente ${marker}`);
}

console.log('Dinastia E: Crônicas agora preservam imagens em resolução e qualidade significativamente maiores, com mídia separada e fallback legado.');
