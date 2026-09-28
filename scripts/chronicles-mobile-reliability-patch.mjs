import fs from 'node:fs';

const file='src/features/cronicas/CronicasPage.jsx';
let source=fs.readFileSync(file,'utf8');
function range(start,end,replacement){
  const a=source.indexOf(start),b=source.indexOf(end,a);
  if(a<0||b<0)throw new Error('Chronicles patch anchor: '+start);
  source=source.slice(0,a)+replacement+source.slice(b);
}
function once(a,b){if(!source.includes(a))throw new Error('Chronicles patch anchor: '+a);source=source.replace(a,b);}
once('collection,deleteDoc,doc,setDoc','collection,deleteDoc,doc,setDoc,getDocs,query,where,writeBatch');
once('function CronicasSection({masterMode}){',"function ChronicleArchive({masterMode,archive}){\n  const isOva=archive==='ovas';\n  const mediaKey=id=>isOva?'ova_'+id:String(id);\n  const [uploadStatus,setUploadStatus]=useState('');\n  const uploading=useRef(false);\n  const [preview,setPreview]=useState('');\n  const [error,setError]=useState('');");
range('  const[subTab, setSubTab]', '  useEffect(() => {', '');
// Originals are fetched only on explicit viewing, never as an archive-wide stream.
range('  const unsub4 = onSnapshot', 'useEffect(()=>{\n  if(loaded', '  return () => { unsub1(); unsub2(); unsub3(); };\n}, [archive]);\n');
range('  useEffect(()=>{\n  const unsub = onSnapshot(collection(db,\'ovas\')', '  const saveEntry = entry => {', '');
source=source.replaceAll("collection(db,'cronicas')",'collection(db,archive)');
source=source.replaceAll("doc(db, 'cronicas', String(entry.id))",'doc(db, archive, String(entry.id))');
source=source.replaceAll("doc(db,'cronicas',String(e.id))",'doc(db,archive,String(e.id))');
source=source.replaceAll("doc(db,'cronicas',String(id))",'doc(db,archive,String(id))');
once("await deleteDoc(doc(db,'cronicas_imgs',String(id))).catch(()=>{});","if(!isOva)await deleteDoc(doc(db,'cronicas_imgs',String(id))).catch(()=>{});");
once('setEntries(data.map(entry => ({ ...entry, imagens: composeImages(entry.id) })));',"setEntries(data.map(entry => ({ ...entry, sessao:entry.sessao||entry.episodio||'', imagens: [...(isOva?(entry.imagens||[]):[]),...composeImages(entry.id)] }))); ");
once("...(hqImagesRef.current[String(entryId)] || []).map(hydrateOriginal)","...(hqImagesRef.current[mediaKey(entryId)] || []).map(hydrateOriginal)");
// Legacy OVA arrays remain untouched; new media is separate from narrative saves.
source=source.replaceAll('imagens: composeImages(entry.id)',"imagens: [...(isOva?(entry.imagens||[]).filter(img=>typeof img==='string'):[]),...composeImages(entry.id)]");
once('...(legacyImagesRef.current[String(entryId)] || []),','...(!isOva?(legacyImagesRef.current[String(entryId)] || []):[]),');
once("await setDoc(doc(db, archive, String(entry.id)), sem);","await setDoc(doc(db, archive, String(entry.id)), sem,{merge:true});");
once("} catch(e) { console.error('Erro ao salvar crônica:', e); }","} catch(e) { console.error('Erro ao salvar crônica:', e); setError('Não foi possível salvar o texto. Confira a conexão e tente novamente.'); }");
once("await setDoc(doc(db, 'cronicas_imgs', String(entryId)), { imagens: legacyOnly });","if(isOva) await setDoc(doc(db,'ovas',String(entryId)),{imagens:legacyOnly},{merge:true});\n    else await setDoc(doc(db, 'cronicas_imgs', String(entryId)), { imagens: legacyOnly });");
// Remove legacy blocks, preserving the established chronicle reader and editor.
range('      {/* Sub-abas preservadas */}', "        {!loaded", '');
range('      </>)}\n\n      {/*', 'export default CronicasSection;', `    </div>\n  );\n}\nfunction CronicasSection({masterMode}){\n  const [archive,setArchive]=useState('cronicas');\n  return <><nav className="chronicles-tabs" aria-label="Arquivo de histórias">{[['cronicas','Crônicas'],['ovas','OVA']].map(([id,label])=><button key={id} aria-pressed={archive===id} onClick={()=>setArchive(id)}>{label}</button>)}</nav><ChronicleArchive key={archive} archive={archive} masterMode={masterMode}/></>;\n}\n`);
once('<div className="chronicles-shell">',`<div className="chronicles-shell" data-archive={archive}>
      {uploadStatus&&<div className="chronicles-upload-status" role="status">{uploadStatus}</div>}
      {error&&<div className="chronicles-upload-error" role="alert">{error}<button onClick={()=>setError('')}>Fechar</button></div>}
      {preview&&<div className="chronicles-image-preview" role="dialog" aria-modal="true" aria-label="Imagem ampliada" onClick={()=>setPreview('')}><button autoFocus onClick={()=>setPreview('')}>Fechar imagem</button><img src={preview} alt="Memória da aventura"/></div>}
`);
range('const addImage = async (entry, file) => {','const removeImage = async',`const showImage=async image=>{
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
`);
once("const bannerImage = imageSrc(selectedImages[0]) || '';","const bannerImage = imageThumbSrc(selectedImages[0]) || '';");
source=source.replaceAll('<div className="chronicles-memory"><img loading="lazy" decoding="async" className="chronicles-memory-thumb"', '<button className="chronicles-memory" onClick={()=>showImage(img)} aria-label="Ampliar imagem"><img loading="lazy" decoding="async" className="chronicles-memory-thumb"');
once('src={imageThumbSrc(img)} alt=""/></div><div className="chronicles-memory-hq" aria-hidden="true"><img src={imageFullSrc(img)} alt="" loading="eager" decoding="async"/></div>', 'src={imageThumbSrc(img)} alt=""/></button>');
source=source.replaceAll('+ Nova Crônica',"{isOva?'+ Nova OVA':'+ Nova Crônica'}");
source=source.replaceAll('>Crônicas</div>',">{isOva?'OVA':'Crônicas'}</div>");
source=source.replaceAll('Sessão {sessionNumber}',"{isOva?'Episódio':'Sessão'} {sessionNumber}");
once("onClick={()=>imgInputRefs.current[selectedEntry.id]?.click()}","disabled={uploading.current} onClick={()=>imgInputRefs.current[selectedEntry.id]?.click()}");
fs.writeFileSync(file,source);
const app='src/App.generated.jsx';
let appSource=fs.readFileSync(app,'utf8');
appSource+="\nimport './experience/mobile-player-polish.css';\n";
fs.writeFileSync(app,appSource);
// All generated upload call sites share this bounded, error-aware compressor.
fs.copyFileSync('src/experience/safe-image-media.js','src/core/media.js');
console.log('Crônicas e OVA unificadas, Ecom removida da interface; mídia sob demanda e layout mobile preparados.');
