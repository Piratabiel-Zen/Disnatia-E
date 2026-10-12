import fs from 'node:fs';

function update(file, changes, imports) {
  let source = fs.readFileSync(file, 'utf8');
  for (const [before, after] of changes) {
    if (!source.includes(before)) throw new Error('Acquired knowledge: missing anchor in ' + file + ': ' + before.slice(0, 80));
    source = source.replace(before, after);
  }
  fs.writeFileSync(file, imports + '\n' + source);
}

update('src/features/livro/LivroPage.jsx', [
  ["{id:'mestre',label:'Páginas do Mestre',icon:'▤'},", "{id:'mestre',label:'Páginas do Mestre',icon:'▤'},\n    {id:'magias',label:'Magias adquiridas',icon:'✦'},\n    {id:'arquivos',label:'Arquivos adquiridos',icon:'▤'},"],
  ["const spread=tabPages[activeTab]||0;", "const spread=tabPages[activeTab]||0;\n  const acquired=activeTab==='magias'||activeTab==='arquivos';"],
  ['if(turning)return;\n    if(window.innerWidth<=720)', 'if(turning||acquired)return;\n    if(window.innerWidth<=720)'],
  ['<div className={`livro-stage', "{acquired?<AcquiredKnowledge key={activeTab} section={activeTab}/>:<><div className={`livro-stage"],
  ['de {totals[activeTab]}</div>', 'de {totals[activeTab]}</div></>}'],
  ['{lightbox&&<div className="livro-hq-lightbox" onClick={()=>setLightbox(null)}>\n      <button className="livro-hq-lightbox-close" onClick={()=>setLightbox(null)} aria-label="Fechar">✕</button>\n      <img src={lightbox.img} alt={lightbox.nome||\'Ilustração ampliada\'} onClick={e=>e.stopPropagation()}/>\n      {lightbox.nome&&<div className="livro-hq-caption">{lightbox.nome}</div>}\n    </div>}', '{lightbox&&<ImageViewer src={lightbox.img} title={lightbox.nome||"Ilustração ampliada"} onClose={()=>setLightbox(null)}/>}'],
], 'import AcquiredKnowledge from "../../experience/AcquiredKnowledge";\nimport ImageViewer from "../../experience/ImageViewer";');

update('src/features/cronicas/CronicasPage.jsx', [
  ['{preview&&<div className="chronicles-image-preview" role="dialog" aria-modal="true" aria-label="Imagem ampliada" onClick={()=>setPreview(\'\')}><button autoFocus onClick={()=>setPreview(\'\')}>Fechar imagem</button><img src={preview} alt="Memória da aventura"/></div>}', '{preview&&<ImageViewer src={preview} title="Memória da aventura" onClose={()=>setPreview(\'\')}/>}'],
], 'import ImageViewer from "../../experience/ImageViewer";');
console.log('Acquired spells, original archives and top-layer image viewers installed.');
