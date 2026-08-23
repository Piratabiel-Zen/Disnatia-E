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

console.log(`Dinastia E: classe de personagem bloqueada para jogadores em ${matches.length} layout(s); somente o Mestre pode alterá-la.`);
