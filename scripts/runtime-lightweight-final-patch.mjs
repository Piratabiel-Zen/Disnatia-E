import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const must = (ok, message) => { if (!ok) throw new Error(`Runtime lightweight patch: ${message}`); };

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  must(source.includes(before), `${label}: marcador ausente`);
  return source.replace(before, after);
}

// 1) Access gate: depois do login não faz sentido continuar ouvindo TODAS as fichas.
// Jogador autenticado passa a observar somente a própria ficha. Mestre autenticado
// não mantém listener do gate; a coleção completa só existe enquanto a tela de login
// realmente precisa listar personagens.
const accessFile = path.join(root, 'src', 'experience', 'PlayerAccess.jsx');
let access = fs.readFileSync(accessFile, 'utf8');
access = replaceRequired(
  access,
  "import { collection, onSnapshot } from 'firebase/firestore';",
  "import { collection, doc, onSnapshot } from 'firebase/firestore';",
  'import doc no PlayerAccess'
);
const accessBefore = `  useEffect(() => {\n    const unsub = onSnapshot(collection(db, 'sheets'), snap => {\n      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));\n      setSheets(rows);\n      setLoaded(true);\n      setSelectedId(prev => prev || String(rows[0]?.id || ''));\n    }, () => setLoaded(true));\n    return () => unsub();\n  }, []);`;
const accessAfter = `  // RUNTIME LIGHTWEIGHT · ACCESS LISTENER SCOPE 2026-09-13\n  useEffect(() => {\n    if (access?.role === 'master' && masterMode) {\n      setSheets([]);\n      setLoaded(true);\n      return undefined;\n    }\n    if (access?.role === 'player' && access.sheetId) {\n      setLoaded(false);\n      const ownSheetRef = doc(db, 'sheets', String(access.sheetId));\n      return onSnapshot(ownSheetRef, snap => {\n        setSheets(snap.exists() ? [{ id: snap.id, ...snap.data() }] : []);\n        setLoaded(true);\n      }, () => { setSheets([]); setLoaded(true); });\n    }\n    const unsub = onSnapshot(collection(db, 'sheets'), snap => {\n      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));\n      setSheets(rows);\n      setLoaded(true);\n      setSelectedId(prev => prev || String(rows[0]?.id || ''));\n    }, () => setLoaded(true));\n    return () => unsub();\n  }, [access?.role, access?.sheetId, masterMode]);`;
access = replaceRequired(access, accessBefore, accessAfter, 'listener do gate de acesso');
fs.writeFileSync(accessFile, access);

// 2) Game Experience 3: nas páginas editoriais o HUD já está escondido. Antes,
// cinco listeners realtime (game/presence/items/enemies/director_media) continuavam
// vivos mesmo invisíveis. Eles agora existem apenas nas superfícies imersivas e
// religam imediatamente ao voltar para Sessão / Mapa Múndi / Mapa de Batalha.
const gameFile = path.join(root, 'src', 'experience', 'GameExperience3.jsx');
let game = fs.readFileSync(gameFile, 'utf8');
const gameBefore = `  useEffect(()=>{\n    const u1=onSnapshot(doc(db,'config',GAME_DOC),snap=>setGame(snap.exists()?{worldMode:'exploration',environment:{type:'none',intensity:45},...(snap.data()||{})}:{worldMode:'exploration',environment:{type:'none',intensity:45}}));\n    const u2=onSnapshot(collection(db,'presence'),snap=>setPresence(snap.docs.map(d=>({id:d.id,...d.data()}))));\n    const u3=onSnapshot(collection(db,'campaign_items'),snap=>setItems(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>Number(b.updatedAt||b.createdAt||0)-Number(a.updatedAt||a.createdAt||0))));\n    const u4=onSnapshot(collection(db,'enemies'),snap=>setEnemies(snap.docs.map(d=>({id:d.id,...d.data()}))));\n    const u5=onSnapshot(collection(db,'director_media'),snap=>{const rows={};snap.docs.forEach(d=>{rows[d.id]={id:d.id,...d.data()};});setDirectorMedia(rows);});\n    return()=>{u1();u2();u3();u4();u5();};\n  },[]);`;
const gameAfter = `  // RUNTIME LIGHTWEIGHT · IMMERSIVE LISTENER SCOPE 2026-09-13\n  const g3LiveSurface=['session','mapamundi','mapabatalha'].includes(tab);\n  useEffect(()=>{\n    if(!g3LiveSurface){\n      setPresence([]);\n      setItems([]);\n      setEnemies([]);\n      setDirectorMedia({});\n      return undefined;\n    }\n    const u1=onSnapshot(doc(db,'config',GAME_DOC),snap=>setGame(snap.exists()?{worldMode:'exploration',environment:{type:'none',intensity:45},...(snap.data()||{})}:{worldMode:'exploration',environment:{type:'none',intensity:45}}));\n    const u2=onSnapshot(collection(db,'presence'),snap=>setPresence(snap.docs.map(d=>({id:d.id,...d.data()}))));\n    const u3=onSnapshot(collection(db,'campaign_items'),snap=>setItems(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>Number(b.updatedAt||b.createdAt||0)-Number(a.updatedAt||a.createdAt||0))));\n    const u4=onSnapshot(collection(db,'enemies'),snap=>setEnemies(snap.docs.map(d=>({id:d.id,...d.data()}))));\n    const u5=onSnapshot(collection(db,'director_media'),snap=>{const rows={};snap.docs.forEach(d=>{rows[d.id]={id:d.id,...d.data()};});setDirectorMedia(rows);});\n    return()=>{u1();u2();u3();u4();u5();};\n  },[g3LiveSurface]);`;
game = replaceRequired(game, gameBefore, gameAfter, 'listeners do GameExperience3');
// Decodificação de retratos não deve travar a thread principal.
game = game.replaceAll('<img src={entity.foto||entity.photo} alt=""/>', '<img src={entity.foto||entity.photo} alt="" decoding="async"/>');
game = game.replaceAll('row.photo?<img src={row.photo} alt=""/>', 'row.photo?<img src={row.photo} alt="" decoding="async" loading="lazy"/>');
game = game.replaceAll('<img src={handout.imageUrl} alt={handout.title||\'Handout\'} />', '<img src={handout.imageUrl} alt={handout.title||\'Handout\'} decoding="async" />');
game = game.replaceAll('<img src={boss.imageUrl} alt=""/>', '<img src={boss.imageUrl} alt="" decoding="async" />');
fs.writeFileSync(gameFile, game);

// 3) ExperienceProvider: o Mestre não precisa manter mapas e Atlas inteiros em
// memória durante Livro, Crônicas, Regras, Bestiário etc. Mantemos exatamente as
// superfícies que consomem esses dados, com realtime intacto ao entrar nelas.
for (const rel of ['src/experience/ExperienceKit.jsx', 'src/experience/ExperienceKit.generated.jsx']) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace(
    "if(!(masterMode || tab==='mapabatalha')) { setMaps([]); return; }",
    "if(!(tab==='mapabatalha' || (masterMode && tab==='session'))) { setMaps([]); return; }"
  );
  source = source.replace(
    "if(!(masterMode || tab==='mapamundi' || tab==='session')) { setAtlas([]); return; }",
    "if(!(tab==='mapamundi' || tab==='session')) { setAtlas([]); return; }"
  );
  fs.writeFileSync(file, source);
}

// 4) CSS: mantém a mesma composição visual, mas evita camadas permanentemente
// promovidas à GPU e adia pintura de blocos narrativos que estão fora da viewport.
const smoothFile = path.join(root, 'src', 'experience', 'performance-smooth.css');
let smooth = fs.readFileSync(smoothFile, 'utf8');
const cssMarker = '/* RUNTIME LIGHTWEIGHT · 2026-09-13 */';
if (!smooth.includes(cssMarker)) {
  smooth += `\n\n${cssMarker}\n.cosmic-lite-nebula,.cosmic-lite-vortex::before{will-change:auto!important}\n.prologue-cover,.class-illustration,.chronicles-memory{content-visibility:auto;contain-intrinsic-size:auto 460px}\n@media(max-width:900px){.prologue-cover,.class-illustration,.chronicles-memory{contain-intrinsic-size:auto 360px}}\n`;
}
fs.writeFileSync(smoothFile, smooth);

// Sanidade local desta camada.
const finalAccess = fs.readFileSync(accessFile, 'utf8');
const finalGame = fs.readFileSync(gameFile, 'utf8');
const finalExperience = fs.readFileSync(path.join(root, 'src', 'experience', 'ExperienceKit.generated.jsx'), 'utf8');
for (const marker of [
  'RUNTIME LIGHTWEIGHT · ACCESS LISTENER SCOPE 2026-09-13',
  "doc(db, 'sheets', String(access.sheetId))",
]) must(finalAccess.includes(marker), `PlayerAccess sem ${marker}`);
for (const marker of [
  'RUNTIME LIGHTWEIGHT · IMMERSIVE LISTENER SCOPE 2026-09-13',
  "const g3LiveSurface=['session','mapamundi','mapabatalha'].includes(tab);",
  '},[g3LiveSurface]);',
  "collection(db,'director_media')",
]) must(finalGame.includes(marker), `GameExperience3 sem ${marker}`);
must(finalExperience.includes("if(!(tab==='mapabatalha' || (masterMode && tab==='session')))"), 'escopo de battlemaps não aplicado');
must(finalExperience.includes("if(!(tab==='mapamundi' || tab==='session'))"), 'escopo de Atlas não aplicado');
must(smooth.includes(cssMarker), 'CSS lightweight ausente');

console.log('Dinastia E: runtime enxugado — listeners invisíveis removidos, coleções pesadas escopadas e pintura fora da viewport adiada.');
