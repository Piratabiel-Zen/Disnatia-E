import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appFile = path.join(root, 'src', 'App.generated.jsx');
const experienceFile = path.join(root, 'src', 'experience', 'ExperienceKit.jsx');
const globalCssFile = path.join(root, 'src', 'styles', 'global.css');

function replaceRequired(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Site immersion/performance patch: marcador ausente (${label}).`);
  return source.replace(from, to);
}

// ── Shell: contexto de navegação + prefetch intencional ──────────────────────
let app = fs.readFileSync(appFile, 'utf8');
app = replaceRequired(
  app,
  'import "./experience/cosmic-living-background.css";',
  'import "./experience/cosmic-living-background.css";\nimport "./experience/site-polish.css";',
  'import site-polish'
);
app = replaceRequired(
  app,
  'const pageLoaders = {',
  `const TAB_LABELS = {\n  session:'Sessão Atual', prologo:'Prólogo', classes:'Classes', fichas:'Fichas',\n  personagens:'Personagens', inimigos:'Inimigos', bestiario:'Bestiário', regras:'Regras',\n  livro:'Livro da Mandíbula', cronicas:'Crônicas', mapamundi:'Mapa Múndi', mapabatalha:'Mapa de Batalha',\n};\n\nconst pageLoaders = {`,
  'tab labels'
);
app = replaceRequired(
  app,
  '<ExperienceProvider key={`${access.role}:${playerSheetId || \'master\'}`} tab={tab} masterMode={masterMode}>',
  '<ExperienceProvider key={`${access.role}:${playerSheetId || \'master\'}`} tab={tab} masterMode={masterMode} playerSheetId={playerSheetId}>',
  'provider playerSheetId'
);
app = replaceRequired(
  app,
  '<ImmersiveNavigation tab={tab} onNavigate={navigate} accent={atm.accent}/>',
  '<ImmersiveNavigation tab={tab} onNavigate={navigate} onPrefetch={prefetch} accent={atm.accent}/>',
  'navigation prefetch'
);
app = replaceRequired(
  app,
  '<small>Cosmum · Livro do Mundo · Vigor Cósmico</small>',
  "<small>Cosmum · {TAB_LABELS[tab] || 'Livro do Mundo'}</small>",
  'topbar context'
);
app = replaceRequired(
  app,
  '<div key={tab} style={lockPageScroll?',
  '<div key={tab} className={`page-stage page-stage-${tab}`} style={lockPageScroll?',
  'page stage class'
);
fs.writeFileSync(appFile, app);

// ── Provider: jogador escuta somente a própria ficha ────────────────────────
let experience = fs.readFileSync(experienceFile, 'utf8');
experience = replaceRequired(
  experience,
  'export function ExperienceProvider({ children, tab, masterMode }) {',
  "export function ExperienceProvider({ children, tab, masterMode, playerSheetId='' }) {",
  'provider signature'
);
experience = replaceRequired(
  experience,
  "const [selectedSheetId,setSelectedSheetIdState]=useState(()=>safeLocalStorage.get('dinastia_player_sheet'));",
  "const [selectedSheetId,setSelectedSheetIdState]=useState(()=>String(playerSheetId||safeLocalStorage.get('dinastia_player_sheet')));",
  'selected sheet bootstrap'
);
experience = replaceRequired(
  experience,
  `  useEffect(()=>{\n    const unsubscribers=[];\n    unsubscribers.push(onSnapshot(collection(db,'sheets'),snap=>setSheets(snap.docs.map(d=>({id:d.id,...d.data()})))));`,
  `  useEffect(()=>{\n    if(!masterMode && playerSheetId){\n      return onSnapshot(doc(db,'sheets',String(playerSheetId)),snap=>{\n        setSheets(snap.exists()?[{id:snap.id,...snap.data()}]:[]);\n      });\n    }\n    return onSnapshot(collection(db,'sheets'),snap=>setSheets(snap.docs.map(d=>({id:d.id,...d.data()}))));\n  },[masterMode,playerSheetId]);\n\n  useEffect(()=>{\n    const unsubscribers=[];`,
  'scoped sheet listener'
);

// Navegação aquece o chunk antes do clique quando o dispositivo oferece oportunidade.
experience = replaceRequired(
  experience,
  "export function ImmersiveNavigation({ tab, onNavigate, accent='#A855F7' }){",
  "export function ImmersiveNavigation({ tab, onNavigate, onPrefetch, accent='#A855F7' }){",
  'navigation signature'
);
experience = replaceRequired(
  experience,
  "  const go=id=>{ onNavigate(id); setMobileMenu(false); };",
  "  const go=id=>{ onNavigate(id); setMobileMenu(false); };\n  const warm=id=>{ if(onPrefetch) onPrefetch(id); };",
  'navigation warm helper'
);
experience = replaceRequired(
  experience,
  "{group.items.map(item=><button key={item.id} onClick={()=>go(item.id)} className={`grim-link ${tab===item.id?'active':''}`}",
  "{group.items.map(item=><button key={item.id} onPointerEnter={()=>warm(item.id)} onFocus={()=>warm(item.id)} onClick={()=>go(item.id)} className={`grim-link ${tab===item.id?'active':''}`}",
  'desktop nav prefetch'
);
experience = replaceRequired(
  experience,
  "{mobileMain.map(item=><button key={item.id} className={tab===item.id?'active':''} onClick={()=>go(item.id)}",
  "{mobileMain.map(item=><button key={item.id} className={tab===item.id?'active':''} onPointerDown={()=>warm(item.id)} onFocus={()=>warm(item.id)} onClick={()=>go(item.id)}",
  'mobile dock prefetch'
);
experience = replaceRequired(
  experience,
  "{group.items.map(item=><button key={item.id} onClick={()=>go(item.id)} className={tab===item.id?'active':''}",
  "{group.items.map(item=><button key={item.id} onPointerDown={()=>warm(item.id)} onFocus={()=>warm(item.id)} onClick={()=>go(item.id)} className={tab===item.id?'active':''}",
  'mobile menu prefetch'
);
fs.writeFileSync(experienceFile, experience);

// ── Fonte: descoberta no HTML em vez de @import bloqueante no CSS ──────────
let globalCss = fs.readFileSync(globalCssFile, 'utf8');
globalCss = globalCss.replace(/@import\s+url\(['"]https:\/\/fonts\.googleapis\.com\/css2\?[^\n]+\);?\s*/g, '');
if (globalCss.includes('fonts.googleapis.com/css2?')) {
  throw new Error('Site immersion/performance patch: @import de fontes permaneceu no CSS gerado.');
}
fs.writeFileSync(globalCssFile, globalCss);

// ── Runtime: remove blur inline caro de painéis gerados ─────────────────────
function walk(dir, files=[]) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes:true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, files);
    else files.push(abs);
  }
  return files;
}

let blurReplacements = 0;
for (const dirName of ['features','shell']) {
  for (const file of walk(path.join(root,'src',dirName))) {
    if (!file.endsWith('.jsx')) continue;
    let source = fs.readFileSync(file,'utf8');
    const before = source;
    source = source.replace(/backdropFilter\s*:\s*(['"])blur\([^'\"]+\)\1/g, () => { blurReplacements++; return "backdropFilter:'none'"; });
    source = source.replace(/WebkitBackdropFilter\s*:\s*(['"])blur\([^'\"]+\)\1/g, () => { blurReplacements++; return "WebkitBackdropFilter:'none'"; });
    if (source !== before) fs.writeFileSync(file,source);
  }
}

for (const file of walk(path.join(root,'src','styles'))) {
  if (!file.endsWith('.css')) continue;
  let css = fs.readFileSync(file,'utf8');
  const before = css;
  css = css.replace(/(-webkit-)?backdrop-filter\s*:\s*blur\([^;]+\)/g, (_m,prefix='') => `${prefix || ''}backdrop-filter:none`);
  if (css !== before) fs.writeFileSync(file,css);
}

// ── Imagens narrativas/listagens: lazy + async decoding ────────────────────
const lazyTargets = [
  ['prologue','ProloguePage.jsx'],
  ['classes','ClassesPage.jsx'],
  ['personagens','PersonagensPage.jsx'],
  ['bestiario','BestiarioPage.jsx'],
  ['inimigos','InimigosPage.jsx'],
  ['cronicas','CronicasPage.jsx'],
  ['regras','RegrasPage.jsx'],
].map(([dir,file])=>path.join(root,'src','features',dir,file));

let lazyImages = 0;
for (const file of lazyTargets) {
  if (!fs.existsSync(file)) continue;
  let source = fs.readFileSync(file,'utf8');
  source = source.replace(/<img\b([^>]*)>/g,(full,attrs)=>{
    if (/\bloading\s*=/.test(full)) return full;
    lazyImages++;
    const decoding = /\bdecoding\s*=/.test(full) ? '' : ' decoding="async"';
    return `<img loading="lazy"${decoding}${attrs}>`;
  });
  fs.writeFileSync(file,source);
}

// Sanidade final.
const finalApp = fs.readFileSync(appFile,'utf8');
const finalExperience = fs.readFileSync(experienceFile,'utf8');
for (const marker of ['site-polish.css','onPrefetch={prefetch}','page-stage-${tab}','playerSheetId={playerSheetId}','TAB_LABELS[tab]']) {
  if (!finalApp.includes(marker)) throw new Error(`Site immersion/performance patch: shell final sem ${marker}.`);
}
for (const marker of ["doc(db,'sheets',String(playerSheetId))",'onPointerEnter={()=>warm(item.id)}','onPointerDown={()=>warm(item.id)}']) {
  if (!finalExperience.includes(marker)) throw new Error(`Site immersion/performance patch: experiência final sem ${marker}.`);
}
if (blurReplacements < 1) throw new Error('Site immersion/performance patch: nenhum blur inline foi neutralizado; estrutura gerada mudou.');
if (lazyImages < 1) throw new Error('Site immersion/performance patch: nenhuma imagem narrativa recebeu lazy loading.');

console.log(`Dinastia E: polish global aplicado — ${blurReplacements} blur(s) inline neutralizados e ${lazyImages} imagem(ns) em lazy loading.`);
