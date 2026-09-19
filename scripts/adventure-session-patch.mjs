import fs from 'node:fs';
import path from 'node:path';

const read = p => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s);
const replace = (source, before, after, label) => {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Adventure integration: ${label} anchor missing`);
  return source.replace(before, after);
};

// Legacy patches remain intact. Integration happens on their final generated output.
let app = read('src/App.generated.jsx');
app = replace(app, 'import ConnectionHealth from "./experience/ConnectionHealth";', `import SessionConnection from './adventure/SessionConnection';
import AdventureSession from './adventure/AdventureSession';
import SessionLink from './adventure/SessionLink';
import { usePerformance } from './adventure/usePerformance';
import './adventure/adventure.css';`, 'adventure imports');
app = replace(app, 'import GameExperience3 from "./experience/GameExperience3";', 'import GameExperience3 from "./experience/GameExperience3.adventure";', 'game adapter');
app = replace(app, 'export default function App(){', "export default function App(){\n  const [quality,setQuality]=usePerformance();", 'quality setting');
app = replace(app, 'className={`access-${access.role} realtime-sync-enabled`}', 'className={`adventure-shell access-${access.role} realtime-sync-enabled`}', 'shell theme');
app = replace(app, '<ConnectionHealth/>', '<SessionLink masterMode={masterMode} onNavigate={navigate}/>', 'remove periodic network probe');
app = replace(app, '<div className="top-actions">', `<div className="top-actions">
              <SessionConnection/>
              <button className="ad-quality" title="Modo leve reduz efeitos e usa dados sem física 3D; a sessão continua sincronizada" aria-pressed={quality==='light'} onClick={()=>setQuality(quality==='light'?'cinematic':'light')}>{quality==='light'?'◈ Leve':'✦ Imersivo'}</button>`, 'quality control');
app = replace(app, '<SessionDashboard onNavigate={navigate} masterMode={masterMode}/>', '<AdventureSession onNavigate={navigate} masterMode={masterMode} access={access}/>', 'session dashboard');
write('src/App.generated.jsx', app);

let experience = read('src/experience/ExperienceKit.generated.jsx');
experience = replace(experience, 'export function ExperienceProvider({ children, tab, masterMode }) {', "export function ExperienceProvider({ children, tab, masterMode, playerSheetId='' }) {", 'selected player identity');
experience = replace(experience, "const selectedSheet=useMemo(()=>sheets.find(s=>String(s.id)===String(selectedSheetId))||null,[sheets,selectedSheetId]);", "const selectedSheet=useMemo(()=>sheets.find(s=>String(s.id)===String(!masterMode&&playerSheetId?playerSheetId:selectedSheetId))||null,[sheets,selectedSheetId,masterMode,playerSheetId]);", 'prevent another character becoming active');
// Use metadata for the session only; share it with the connection badge, no polling.
experience = replace(experience, "onSnapshot(doc(db,'config','session'),snap=>", "onSnapshot(doc(db,'config','session'),{includeMetadataChanges:true},snap=>", 'session acknowledgement');
// Group identity is visible, but personal sheets remain selected by the authenticated player.
experience = replace(experience, "const value=String(id||'');\n    setSelectedSheetIdState(value);", "const value=String(!masterMode&&playerSheetId?playerSheetId:id||'');\n    setSelectedSheetIdState(value);", 'selection guard');
experience = replace(experience, "safeLocalStorage.set('dinastia_player_sheet',value);\n  },[]);", "safeLocalStorage.set('dinastia_player_sheet',value);\n  },[masterMode,playerSheetId]);", 'selection dependencies');
write('src/experience/ExperienceKit.generated.jsx', experience);

let game = read('src/experience/GameExperience3.jsx');
const mount = '  const [game,setGame]=useState';
game = replace(game, mount, `  // Public UI bridge; never changes roles or authentication.
  useEffect(()=>{
    const open=e=>{
      const panel=e.detail?.panel;
      if(['director','combat'].includes(panel)){
        if(!masterMode)return;
        setDirectorTab(panel==='combat'?'combat':'scene');setPanel('director');
      } else if(['sheet','abilities','inventory','journal'].includes(panel))setPanel(panel==='abilities'?'sheet':panel);
    };
    const key=e=>{
      if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.target?.matches('input,textarea,select,[contenteditable="true"]'))return;
      if(e.key==='Escape'){setPanel('');setPingOpen(false);setTargeting(null);return;}
      if(!['session','mapamundi','mapabatalha'].includes(tab))return;
      const panel={c:'sheet',h:'abilities',i:'inventory',j:'journal'}[e.key.toLowerCase()];
      if(panel){e.preventDefault();open({detail:{panel}});}
    };
    window.addEventListener('dinastia:adventure-panel',open);window.addEventListener('keydown',key);
    return()=>{window.removeEventListener('dinastia:adventure-panel',open);window.removeEventListener('keydown',key);};
  },[masterMode,tab]);
${mount}`, 'panel and keyboard bridge');
// Loading every base64 scene image for every player was unnecessarily expensive.
game = replace(game, "const u5=onSnapshot(collection(db,'director_media'),snap=>{const rows={};snap.docs.forEach(d=>{rows[d.id]={id:d.id,...d.data()};});setDirectorMedia(rows);});", "const u5=()=>{}; // Media is subscribed by active reference below.", 'media scope');
const presenceAnchor = "  useEffect(()=>{\n    let clientId='';";
game = replace(game, presenceAnchor, `  const liveMediaIds=JSON.stringify([...new Set([
    game?.npcFocus?.visible&&game?.npcFocus?.portraitRef,
    game?.handout?.visible&&game?.handout?.imageRef,
    bossVisible&&game?.bossReveal?.imageRef,
    openingVisible&&game?.openingScene?.imageRef,
  ].filter(Boolean).map(String))].sort());
  useEffect(()=>{
    if(!g3LiveSurface)return;
    if(masterMode&&panel==='director')return onSnapshot(collection(db,'director_media'),snap=>{
      setDirectorMedia(Object.fromEntries(snap.docs.map(d=>[d.id,{id:d.id,...d.data()}])));
    });
    const ids=JSON.parse(liveMediaIds);
    setDirectorMedia(prev=>Object.fromEntries(ids.filter(id=>prev[id]).map(id=>[id,prev[id]])));
    const stops=ids.map(id=>onSnapshot(doc(db,'director_media',id),snap=>setDirectorMedia(prev=>({...prev,[id]:snap.exists()?snap.data():null}))));
    return()=>stops.forEach(stop=>stop());
  },[g3LiveSurface,masterMode,panel,liveMediaIds]);

${presenceAnchor}`, 'active media subscriptions');
write('src/experience/GameExperience3.adventure.jsx', game);

// Pool duplicate callbacks in the heaviest surfaces; legacy source files stay untouched.
const paths = ['src/App.generated.jsx', 'src/experience/ExperienceKit.generated.jsx', 'src/experience/GameExperience3.adventure.jsx', ...['features','shell','core'].flatMap(dir=>fs.readdirSync(`src/${dir}`,{recursive:true}).filter(file=>/\.(jsx?|mjs)$/.test(file)).map(file=>`src/${dir}/${file}`))];
let count=0;
for (const file of paths) {
  let source=read(file);
  if(source.includes('adventure/sharedSnapshot'))continue;
  let changed=false;
  source=source.replace(/import\s*\{([^}]+)\}\s*from\s*(['"])firebase\/firestore\2;?/g,(full, names, quote)=>{
    if(!names.split(',').some(x=>x.trim()==='onSnapshot'))return full;
    changed=true;
    return `import {${names.split(',').filter(x=>x.trim()!=='onSnapshot').join(',')}} from ${quote}firebase/firestore${quote};`;
  });
  if(!changed)continue;
  let relative=path.relative(path.dirname(file),'src/adventure/sharedSnapshot').split(path.sep).join('/');
  if(!relative.startsWith('.'))relative='./'+relative;
  write(file,`import { onSnapshot } from '${relative}';\n${source}`);count++;
}

let dice=read('src/experience/PhysicalDiceTray.jsx');
dice=replace(dice, 'if (OPERA_GX_SAFE) {', "if (OPERA_GX_SAFE || document.documentElement.dataset.quality==='light' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {", 'lightweight dice');
write('src/experience/PhysicalDiceTray.jsx',dice);
console.log(`Dinastia E: adventure UI, transactional council, shared focus and ${count} pooled realtime modules prepared.`);
