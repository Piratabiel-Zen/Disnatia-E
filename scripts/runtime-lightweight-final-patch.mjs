import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const must = (ok, message) => { if (!ok) throw new Error(`Runtime lightweight patch: ${message}`); };

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  must(source.includes(before), `${label}: marcador ausente`);
  return source.replace(before, after);
}

// 1) Access gate: após autenticar, não mantenha a coleção inteira de fichas viva.
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

// 2) Game Experience 3: envolve o efeito realtime JÁ GERADO, em vez de substituir
// seu conteúdo. Assim preservamos todos os listeners adicionados por patches atuais
// ou futuros (incluindo director_media), mas desligamos o conjunto inteiro nas páginas
// editoriais onde o HUD está oculto.
const gameFile = path.join(root, 'src', 'experience', 'GameExperience3.jsx');
let game = fs.readFileSync(gameFile, 'utf8');
const g3Marker = 'RUNTIME LIGHTWEIGHT · IMMERSIVE LISTENER SCOPE 2026-09-13';
const listenerAnchor = "const u1=onSnapshot(doc(db,'config',GAME_DOC)";
let anchorAt = game.indexOf(listenerAnchor);
must(anchorAt >= 0, 'listener principal do GameExperience3 não encontrado');

if (!game.includes(g3Marker)) {
  const effectStart = game.lastIndexOf('  useEffect(()=>{', anchorAt);
  must(effectStart >= 0, 'início do efeito realtime do GameExperience3 não encontrado');
  const bodyStart = effectStart + '  useEffect(()=>{\n'.length;
  const declaration = `  // ${g3Marker}\n  const g3LiveSurface=['session','mapamundi','mapabatalha'].includes(tab);\n`;
  const guard = `    if(!g3LiveSurface){\n      setPresence([]);\n      setItems([]);\n      setEnemies([]);\n      if(typeof setDirectorMedia==='function')setDirectorMedia({});\n      return undefined;\n    }\n`;
  game = game.slice(0, effectStart) + declaration + game.slice(effectStart, bodyStart) + guard + game.slice(bodyStart);
}

anchorAt = game.indexOf(listenerAnchor);
const effectStart = game.lastIndexOf('  useEffect(()=>{', anchorAt);
const nextEffect = game.indexOf('\n\n  useEffect(', anchorAt);
const segmentEnd = nextEffect >= 0 ? nextEffect : game.length;
let listenerSegment = game.slice(effectStart, segmentEnd);
if (!listenerSegment.includes('},[g3LiveSurface]);')) {
  must(listenerSegment.includes('  },[]);'), 'dependência do efeito realtime do GameExperience3 não encontrada');
  listenerSegment = listenerSegment.replace('  },[]);', '  },[g3LiveSurface]);');
  game = game.slice(0, effectStart) + listenerSegment + game.slice(segmentEnd);
}

// Imagens que aparecem no HUD/cinemáticas decodificam fora da thread crítica quando possível.
game = game.replaceAll('<img src={entity.foto||entity.photo} alt=""/>', '<img src={entity.foto||entity.photo} alt="" decoding="async"/>');
game = game.replaceAll('row.photo?<img src={row.photo} alt=""/>', 'row.photo?<img src={row.photo} alt="" decoding="async" loading="lazy"/>');
game = game.replaceAll('<img src={handout.imageUrl} alt={handout.title||\'Handout\'} />', '<img src={handout.imageUrl} alt={handout.title||\'Handout\'} decoding="async" />');
game = game.replaceAll('<img src={boss.imageUrl} alt=""/>', '<img src={boss.imageUrl} alt="" decoding="async" />');
fs.writeFileSync(gameFile, game);

// 3) ExperienceProvider: mapas/Atlas só ficam em memória onde são consumidos.
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

// 4) Mesma aparência, menos memória de compositor e menos pintura fora da viewport.
const smoothFile = path.join(root, 'src', 'experience', 'performance-smooth.css');
let smooth = fs.readFileSync(smoothFile, 'utf8');
const cssMarker = '/* RUNTIME LIGHTWEIGHT · 2026-09-13 */';
if (!smooth.includes(cssMarker)) {
  smooth += `\n\n${cssMarker}\n.cosmic-lite-nebula,.cosmic-lite-vortex::before{will-change:auto!important}\n.prologue-cover,.class-illustration,.chronicles-memory{content-visibility:auto;contain-intrinsic-size:auto 460px}\n@media(max-width:900px){.prologue-cover,.class-illustration,.chronicles-memory{contain-intrinsic-size:auto 360px}}\n`;
}
fs.writeFileSync(smoothFile, smooth);

// Sanidade: se a cadeia de patches mudar, o build para antes de publicar algo parcial.
const finalAccess = fs.readFileSync(accessFile, 'utf8');
const finalGame = fs.readFileSync(gameFile, 'utf8');
const finalExperience = fs.readFileSync(path.join(root, 'src', 'experience', 'ExperienceKit.generated.jsx'), 'utf8');
for (const marker of [
  'RUNTIME LIGHTWEIGHT · ACCESS LISTENER SCOPE 2026-09-13',
  "doc(db, 'sheets', String(access.sheetId))",
]) must(finalAccess.includes(marker), `PlayerAccess sem ${marker}`);
for (const marker of [
  g3Marker,
  "const g3LiveSurface=['session','mapamundi','mapabatalha'].includes(tab);",
  '},[g3LiveSurface]);',
  "collection(db,'director_media')",
]) must(finalGame.includes(marker), `GameExperience3 sem ${marker}`);
must(finalExperience.includes("if(!(tab==='mapabatalha' || (masterMode && tab==='session')))"), 'escopo de battlemaps não aplicado');
must(finalExperience.includes("if(!(tab==='mapamundi' || tab==='session'))"), 'escopo de Atlas não aplicado');
must(smooth.includes(cssMarker), 'CSS lightweight ausente');

console.log('Dinastia E: runtime enxugado — listeners invisíveis removidos, coleções pesadas escopadas e pintura fora da viewport adiada.');
