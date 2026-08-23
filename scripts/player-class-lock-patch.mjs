import fs from 'node:fs';
import path from 'node:path';

const componentsFile = path.join(process.cwd(), 'src', 'features', 'sheets', 'SheetComponents.jsx');
const pageFile = path.join(process.cwd(), 'src', 'features', 'sheets', 'SheetsPage.jsx');

if (!fs.existsSync(componentsFile) || !fs.existsSync(pageFile)) {
  throw new Error('Arquivos de ficha não encontrados para aplicar bloqueio de classe.');
}

let components = fs.readFileSync(componentsFile, 'utf8');
const classSelectPattern = /<select value=\{sheet\.classe\} onChange=\{e=>\{const classe=e\.target\.value;const next=\{\.\.\.sheet,classe\};onChange\(\{\.\.\.next,hp:Math\.min\(sheet\.hp\|\|0,getSheetMaxHp\(next\)\)\}\);\}\}>\{CLASSES\.map\(c=><option key=\{c\.id\} value=\{c\.id\}>\{c\.icon\} \{c\.name\}<\/option>\)\}<\/select>/g;
const matches = components.match(classSelectPattern) || [];

if (!matches.length) {
  throw new Error('Nenhum seletor de classe de personagem foi encontrado.');
}

const readonlyClass = `{masterMode
  ? <select value={sheet.classe} onChange={e=>{const classe=e.target.value;const next={...sheet,classe};onChange({...next,hp:Math.min(sheet.hp||0,getSheetMaxHp(next))});}}>{CLASSES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select>
  : <div className="sheet-class-readonly" title="Classe definida pelo Mestre" style={{minHeight:34,display:'flex',alignItems:'center',gap:7,padding:'6px 10px',borderRadius:6,border:'1px solid rgba(168,85,247,.24)',background:'rgba(168,85,247,.055)',color:sheetColor,fontFamily:'Cinzel,serif',fontSize:12,fontWeight:600,whiteSpace:'nowrap'}}><span>{cls.icon}</span><span>{cls.name}</span><span aria-hidden="true" style={{fontSize:9,color:'rgba(255,255,255,.28)'}}>🔒</span></div>}`;

components = components.replace(classSelectPattern, readonlyClass);
const readonlyCount = (components.match(/sheet-class-readonly/g) || []).length;
if (readonlyCount < matches.length) {
  throw new Error(`Bloqueio visual de classe incompleto: ${readonlyCount}/${matches.length}.`);
}
fs.writeFileSync(componentsFile, components);

let page = fs.readFileSync(pageFile, 'utf8');
const oldUpdate = "const upd=(id,data)=>{if(data===null){deleteDoc(doc(db,'sheets',String(id)));setActiveId(null);return;}setSheets(prev=>prev.map(s=>s.id===id?data:s));saveSheet(data);};";
const newUpdate = "const upd=(id,data)=>{if(data===null){deleteDoc(doc(db,'sheets',String(id)));setActiveId(null);return;}const current=sheets.find(s=>String(s.id)===String(id));const safeData=!masterMode&&current?{...data,classe:current.classe}:data;setSheets(prev=>prev.map(s=>s.id===id?safeData:s));saveSheet(safeData);};";
if (!page.includes(newUpdate)) {
  if (!page.includes(oldUpdate)) throw new Error('Atualização de ficha não encontrada para proteger a classe.');
  page = page.replace(oldUpdate, newUpdate);
}
if (!page.includes('const safeData=!masterMode&&current?{...data,classe:current.classe}:data;')) {
  throw new Error('Proteção de classe no salvamento não foi aplicada.');
}
fs.writeFileSync(pageFile, page);

// ── POLIMENTO DE INTERAÇÕES: CRÔNICAS, CARDS E LIVRO ───────────────────────
const globalCssFile = path.join(process.cwd(), 'src', 'styles', 'global.css');
let globalCss = fs.readFileSync(globalCssFile, 'utf8');
const POLISH_MARKER = '/* INTERACTION POLISH · 2026-08-23 */';
if (!globalCss.includes(POLISH_MARKER)) {
  globalCss += `
${POLISH_MARKER}
/* O zoom das memórias continua grande, mas entra e sai como uma aproximação de câmera,
   sem trocar object-fit no meio da animação e sem o salto instantâneo anterior. */
@media (hover:hover) and (pointer:fine){
  .chronicles-reading .chronicles-memory{
    transition:transform .68s cubic-bezier(.16,1,.3,1),border-color .42s ease,box-shadow .52s ease,background-color .42s ease!important;
    will-change:transform;
  }
  .chronicles-reading .chronicles-memory img{
    object-fit:cover!important;
    transition:transform .68s cubic-bezier(.16,1,.3,1),filter .46s ease!important;
  }
  .chronicles-reading .chronicles-memory:hover img{
    object-fit:cover!important;
    transform:none!important;
    filter:brightness(1.025)!important;
  }

  .npc-grid-card,.bestiary-grid-card{
    transition:transform .30s cubic-bezier(.16,1,.3,1),box-shadow .30s ease,border-color .30s ease!important;
    will-change:transform;
  }
  .npc-grid-card:hover{
    transform:translateY(-4px);
    box-shadow:0 11px 29px rgba(0,0,0,.32),0 0 20px rgba(168,85,247,.09)!important;
    border-color:rgba(168,85,247,.38)!important;
  }
  .bestiary-grid-card:hover{
    transform:translateY(-4px);
    box-shadow:0 11px 29px rgba(0,0,0,.34),0 0 18px rgba(232,160,32,.075)!important;
  }
}
@media(prefers-reduced-motion:reduce){
  .chronicles-reading .chronicles-memory,.chronicles-reading .chronicles-memory img,.npc-grid-card,.bestiary-grid-card{transition-duration:.01ms!important}
}
`;
  fs.writeFileSync(globalCssFile, globalCss);
}

function addCardClass(file, functionMarker, className) {
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes(`className="${className}"`)) return;
  const fnStart = source.indexOf(functionMarker);
  if (fnStart < 0) throw new Error(`Polimento: função ${functionMarker} não encontrada.`);
  const divStart = source.indexOf('<div onClick={onClick} style=', fnStart);
  if (divStart < 0) throw new Error(`Polimento: card clicável de ${functionMarker} não encontrado.`);
  const before = '<div onClick={onClick} style=';
  const after = `<div className="${className}" onClick={onClick} style=`;
  source = source.slice(0, divStart) + source.slice(divStart).replace(before, after);
  if (!source.includes(`className="${className}"`)) throw new Error(`Polimento: classe ${className} não aplicada.`);
  fs.writeFileSync(file, source);
}

addCardClass(
  path.join(process.cwd(), 'src', 'features', 'personagens', 'PersonagensPage.jsx'),
  'function NPCGridCard({ npc, onClick })',
  'npc-grid-card'
);
addCardClass(
  path.join(process.cwd(), 'src', 'features', 'bestiario', 'BestiarioPage.jsx'),
  'function BestiarioGridCard({ item, onClick })',
  'bestiary-grid-card'
);

// O Livro volta a folhear uma folha individual, em vez de inclinar o spread inteiro.
const livroFile = path.join(process.cwd(), 'src', 'features', 'livro', 'LivroPage.jsx');
let livro = fs.readFileSync(livroFile, 'utf8');

const mobileTurnRegex = /if\(window\.innerWidth<=720\)\{\s*if\(dir>0&&mobileSide===0\)\{setMobileSide\(1\);return;\}\s*if\(dir<0&&mobileSide===1\)\{setMobileSide\(0\);return;\}\s*\}/;
const mobileTurnAnimated = `if(window.innerWidth<=720){
      if(dir>0&&mobileSide===0){setTurnDir(1);setTurning(true);setTimeout(()=>setMobileSide(1),300);setTimeout(()=>setTurning(false),760);return;}
      if(dir<0&&mobileSide===1){setTurnDir(-1);setTurning(true);setTimeout(()=>setMobileSide(0),300);setTimeout(()=>setTurning(false),760);return;}
    }`;
if (!livro.includes('setTimeout(()=>setMobileSide(1),300)')) {
  const next = livro.replace(mobileTurnRegex, mobileTurnAnimated);
  if (next === livro) throw new Error('Polimento: navegação mobile do Livro não encontrada.');
  livro = next;
}

const bookPagesAnchor = '<div className="livro-cover"><div className="livro-pages">';
const bookPagesWithFlip = '<div className="livro-cover"><div className="livro-pages">{turning&&<div className={`livro-page-flip ${turnDir>0?\'forward\':\'backward\'}`} aria-hidden="true"/>}';
if (!livro.includes('livro-page-flip')) {
  if (!livro.includes(bookPagesAnchor)) throw new Error('Polimento: miolo do Livro não encontrado para restaurar a folha.');
  livro = livro.replace(bookPagesAnchor, bookPagesWithFlip);
}
fs.writeFileSync(livroFile, livro);

const livroCssFile = path.join(process.cwd(), 'src', 'styles', 'livro.css');
let livroCss = fs.readFileSync(livroCssFile, 'utf8');
const BOOK_FLIP_MARKER = '/* FOLHEAR REALISTA RESTAURADO · 2026-08-23 */';
if (!livroCss.includes(BOOK_FLIP_MARKER)) {
  livroCss += `
${BOOK_FLIP_MARKER}
/* A animação antiga inclinava o livro inteiro. A folha abaixo usa perspectiva 3D,
   frente/verso de pergaminho e sombra no vinco central. */
.livro-turning .livro-pages{animation:none!important}
.livro-page-flip{
  position:absolute;top:0;bottom:0;width:50%;z-index:35;pointer-events:none;
  transform-style:preserve-3d;backface-visibility:hidden;
  background-color:#d8c391;
  background-image:radial-gradient(circle at 18% 20%,rgba(83,51,23,.16),transparent 25%),linear-gradient(100deg,rgba(255,246,209,.56),transparent 28%,rgba(85,48,23,.14));
  box-shadow:inset 0 0 50px rgba(91,55,24,.28);
}
.livro-page-flip::before,.livro-page-flip::after{
  content:'';position:absolute;inset:0;backface-visibility:hidden;pointer-events:none;
  background:linear-gradient(90deg,rgba(255,244,205,.12),transparent 64%),repeating-linear-gradient(7deg,rgba(82,50,22,.022) 0 1px,transparent 1px 4px);
  border:1px solid rgba(91,55,24,.22);
}
.livro-page-flip::after{transform:rotateY(180deg);background:linear-gradient(270deg,rgba(255,244,205,.16),rgba(88,49,23,.11)),repeating-linear-gradient(-7deg,rgba(82,50,22,.025) 0 1px,transparent 1px 4px)}
.livro-page-flip.forward{left:50%;transform-origin:left center;animation:livroLeafForward .78s cubic-bezier(.42,.02,.18,1) both}
.livro-page-flip.backward{left:0;transform-origin:right center;animation:livroLeafBackward .78s cubic-bezier(.42,.02,.18,1) both}
@keyframes livroLeafForward{
  0%{transform:rotateY(0deg);box-shadow:inset 22px 0 35px rgba(45,25,12,.15),-2px 0 3px rgba(0,0,0,.12)}
  35%{box-shadow:inset 45px 0 55px rgba(45,25,12,.32),-18px 8px 28px rgba(0,0,0,.34)}
  50%{filter:brightness(.72)}
  100%{transform:rotateY(-180deg);filter:brightness(.92);box-shadow:inset -25px 0 42px rgba(45,25,12,.2),-4px 0 8px rgba(0,0,0,.18)}
}
@keyframes livroLeafBackward{
  0%{transform:rotateY(0deg);box-shadow:inset -22px 0 35px rgba(45,25,12,.15),2px 0 3px rgba(0,0,0,.12)}
  35%{box-shadow:inset -45px 0 55px rgba(45,25,12,.32),18px 8px 28px rgba(0,0,0,.34)}
  50%{filter:brightness(.72)}
  100%{transform:rotateY(180deg);filter:brightness(.92);box-shadow:inset 25px 0 42px rgba(45,25,12,.2),4px 0 8px rgba(0,0,0,.18)}
}
@media(max-width:720px){
  .livro-page-flip{width:100%;left:0!important}
  .livro-page-flip.forward{transform-origin:left center}
  .livro-page-flip.backward{transform-origin:right center}
}
@media(prefers-reduced-motion:reduce){.livro-page-flip{animation:none!important;opacity:.22}}
`;
  fs.writeFileSync(livroCssFile, livroCss);
}

// ── REGISTRO DE EXPLORAÇÃO: EDITAR E EXCLUIR ───────────────────────────────
// O runtime usa ExperienceKit.generated quando o realtime patch está ativo.
const generatedExperienceFile = path.join(process.cwd(), 'src', 'experience', 'ExperienceKit.generated.jsx');
const sourceExperienceFile = path.join(process.cwd(), 'src', 'experience', 'ExperienceKit.jsx');
const experienceFile = fs.existsSync(generatedExperienceFile) ? generatedExperienceFile : sourceExperienceFile;
let experience = fs.readFileSync(experienceFile, 'utf8');

const firestoreImportEnd = experience.indexOf("} from 'firebase/firestore';");
if (firestoreImportEnd < 0) throw new Error('Polimento: import do Firestore no ExperienceKit não encontrado.');
const firestoreImport = experience.slice(0, firestoreImportEnd);
if (!firestoreImport.includes('deleteDoc')) {
  const next = experience.replace('  collection,', '  collection, deleteDoc,');
  if (next === experience) throw new Error('Polimento: não foi possível incluir deleteDoc.');
  experience = next;
}

const atlasPanelStart = experience.indexOf('function AtlasDiscoveryPanel(){');
const atlasPanelEnd = experience.indexOf('\n\nfunction SoundscapeLayer(){', atlasPanelStart);
if (atlasPanelStart < 0 || atlasPanelEnd < 0) throw new Error('Polimento: Registro de Exploração não encontrado.');
const atlasPanel = `function AtlasDiscoveryPanel(){
  const { tab,atlas,masterMode }=useExperience();
  const [open,setOpen]=useState(true);
  const [editingId,setEditingId]=useState(null);
  const [draft,setDraft]=useState({name:'',status:'rumor',note:''});
  if(tab!=='mapamundi') return null;
  const order={visitado:0,descoberto:1,rumor:2};
  const items=[...atlas].sort((a,b)=>(order[a.status]??9)-(order[b.status]??9));
  const labelStatus=status=>status==='visitado'?'Visitado':status==='descoberto'?'Descoberto':'Rumor';
  const startEdit=item=>{setEditingId(String(item.id));setDraft({name:item.name||'',status:item.status||'rumor',note:item.note||''});};
  const cancelEdit=()=>{setEditingId(null);setDraft({name:'',status:'rumor',note:''});};
  const saveEdit=async item=>{
    const name=String(draft.name||'').trim();
    if(!name)return;
    await setDoc(doc(db,'atlas_discoveries',String(item.id)),{name,status:draft.status||'rumor',note:String(draft.note||''),updatedAt:Date.now()},{merge:true});
    cancelEdit();
  };
  const removeEntry=async item=>{
    if(!window.confirm('Excluir este registro de exploração?'))return;
    await deleteDoc(doc(db,'atlas_discoveries',String(item.id)));
    if(String(editingId)===String(item.id))cancelEdit();
  };
  return <aside className={'atlas-overlay '+(open?'open':'')}>
    <button className="atlas-toggle" onClick={()=>setOpen(x=>!x)}>🌍 {open?'Fechar':'Atlas'}</button>
    {open&&<>
      <header><small>REGISTRO DE EXPLORAÇÃO</small><h3>Descobertas</h3></header>
      <div className="atlas-list">{items.length?items.map(item=>{
        const editing=masterMode&&String(editingId)===String(item.id);
        return <article key={item.id} className={'atlas-'+(item.status||'rumor')+' '+(editing?'editing':'')}>
          {editing?<div className="atlas-edit-form">
            <label>Local<input value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))} placeholder="Nome do local"/></label>
            <label>Registro<select value={draft.status} onChange={e=>setDraft(d=>({...d,status:e.target.value}))}><option value="rumor">Rumor</option><option value="descoberto">Descoberto</option><option value="visitado">Visitado</option></select></label>
            <label className="wide">Observação<textarea rows="3" value={draft.note} onChange={e=>setDraft(d=>({...d,note:e.target.value}))} placeholder="Anotação sobre a exploração..."/></label>
            <div className="atlas-edit-actions"><button onClick={()=>saveEdit(item)} disabled={!String(draft.name||'').trim()}>Salvar</button><button onClick={cancelEdit}>Cancelar</button></div>
          </div>:<>
            <span>{item.status==='visitado'?'✦':item.status==='descoberto'?'◇':'?'}</span>
            <div className="atlas-entry-copy"><b>{item.name}</b><small>{labelStatus(item.status)}</small>{item.note&&<p>{item.note}</p>}</div>
            {masterMode&&<div className="atlas-entry-actions"><button onClick={()=>startEdit(item)} title="Editar registro" aria-label="Editar registro">✎</button><button className="danger" onClick={()=>removeEntry(item)} title="Excluir registro" aria-label="Excluir registro">✕</button></div>}
          </>}
        </article>;
      }):<div className="empty-state">Nenhum local registrado ainda.</div>}</div>
    </>}
  </aside>;
}`;
experience = experience.slice(0, atlasPanelStart) + atlasPanel + experience.slice(atlasPanelEnd);
fs.writeFileSync(experienceFile, experience);

const experienceCssFile = path.join(process.cwd(), 'src', 'experience', 'experience.css');
let experienceCss = fs.readFileSync(experienceCssFile, 'utf8');
const ATLAS_EDIT_MARKER = '/* ATLAS EDITÁVEL · 2026-08-23 */';
if (!experienceCss.includes(ATLAS_EDIT_MARKER)) {
  experienceCss += `
${ATLAS_EDIT_MARKER}
.atlas-list article{position:relative}
.atlas-entry-copy{min-width:0;flex:1}
.atlas-entry-actions{display:flex;gap:4px;margin-left:auto;align-self:flex-start;opacity:.48;transition:opacity .22s ease}
.atlas-list article:hover .atlas-entry-actions{opacity:1}
.atlas-entry-actions button{width:25px;height:25px;padding:0;border-radius:6px;border:1px solid rgba(168,85,247,.18);background:rgba(168,85,247,.055);color:#a58ab3;cursor:pointer;font-size:11px}
.atlas-entry-actions button:hover{border-color:rgba(168,85,247,.38);color:#d1b9df}
.atlas-entry-actions button.danger{border-color:rgba(232,25,60,.2);background:rgba(232,25,60,.045);color:#a96875}
.atlas-entry-actions button.danger:hover{border-color:rgba(232,25,60,.42);color:#ef8497}
.atlas-list article.editing{display:block;padding:10px}
.atlas-edit-form{display:grid;grid-template-columns:minmax(0,1fr) 105px;gap:7px;width:100%}
.atlas-edit-form label{font:7px Cinzel,serif;letter-spacing:.12em;text-transform:uppercase;color:#75677e}
.atlas-edit-form label.wide{grid-column:1/-1}
.atlas-edit-form input,.atlas-edit-form select,.atlas-edit-form textarea{display:block;width:100%;margin-top:4px;font-size:10px;resize:vertical}
.atlas-edit-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:6px}
.atlas-edit-actions button{padding:5px 9px;border-radius:6px;border:1px solid rgba(168,85,247,.25);background:rgba(168,85,247,.08);color:#c2a6d0;cursor:pointer;font:8px Cinzel,serif}
.atlas-edit-actions button:disabled{opacity:.35;cursor:not-allowed}
@media(max-width:700px){.atlas-edit-form{grid-template-columns:1fr}.atlas-edit-form label.wide,.atlas-edit-actions{grid-column:auto}.atlas-entry-actions{opacity:1}}
`;
  fs.writeFileSync(experienceCssFile, experienceCss);
}

for (const [file,marker] of [
  [globalCssFile,POLISH_MARKER],
  [livroFile,'livro-page-flip'],
  [livroCssFile,BOOK_FLIP_MARKER],
  [experienceFile,'atlas-edit-form'],
  [experienceCssFile,ATLAS_EDIT_MARKER],
]) {
  if (!fs.readFileSync(file,'utf8').includes(marker)) throw new Error(`Polimento final incompleto: ${marker}`);
}

console.log(`Dinastia E: classe bloqueada para jogadores; hover das Crônicas suavizado, folhear do Livro restaurado, cards elevados e Registro de Exploração editável.`);
