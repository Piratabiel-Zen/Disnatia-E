import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const must = (ok, msg) => { if (!ok) throw new Error(`Desktop stability patch: ${msg}`); };
const replaceOnce = (source, before, after, label) => {
  if (source.includes(after)) return source;
  must(source.includes(before), label);
  return source.replace(before, after);
};

// 1) O Game Experience 3 não pode cobrir todas as páginas do desktop com HUDs fixos.
// Sessão e mapas continuam imersivos; páginas de conteúdo voltam a ser superfícies limpas.
const gameFile = path.join(root, 'src', 'experience', 'GameExperience3.jsx');
const gameCssFile = path.join(root, 'src', 'experience', 'game-experience-3.css');
let game = fs.readFileSync(gameFile, 'utf8');
let gameCss = fs.readFileSync(gameCssFile, 'utf8');

const cleanTabs = ['prologo','classes','fichas','personagens','inimigos','bestiario','regras','livro','cronicas'];

if (!game.includes('DESKTOP CONTENT SURFACE RESET 2026-09-12')) {
  const modeAnchor = "  const effectiveMode=game?.worldMode==='cinematic'?'cinematic':combat?.active?'combat':(game?.worldMode||'exploration');";
  must(game.includes(modeAnchor), 'effectiveMode não encontrado no GameExperience3.');
  const resetEffect = `  // DESKTOP CONTENT SURFACE RESET 2026-09-12\n  useEffect(()=>{\n    if(['session','mapamundi','mapabatalha'].includes(tab)) return;\n    setPanel('');\n    setPingOpen(false);\n    setTargeting(null);\n  },[tab]);\n\n`;
  game = game.replace(modeAnchor, resetEffect + modeAnchor);
}

const cssMarker = '/* DESKTOP CONTENT SURFACE RESET 2026-09-12 */';
if (!gameCss.includes(cssMarker)) {
  const hudParts = ['.g3-top-context','.g3-utility-rail','.g3-master-quickbar','.g3-actionbar','.g3-environment','.g3-right-drawer'];
  const hideSelectors = [];
  for (const tab of cleanTabs) for (const part of hudParts) hideSelectors.push(`.game3-tab-${tab} ${part}`);
  const paddingSelectors = [];
  for (const tab of cleanTabs) {
    paddingSelectors.push(`.access-player:has(.game3-tab-${tab}) .immersive-content`);
    paddingSelectors.push(`.access-master:has(.game3-tab-${tab}) .immersive-content`);
  }
  gameCss += `\n\n${cssMarker}\n@media(min-width:901px){\n${hideSelectors.join(',\n')}{display:none!important}\n${paddingSelectors.join(',\n')}{padding-top:64px!important;padding-bottom:28px!important}\n}\n`;
}

fs.writeFileSync(gameFile, game);
fs.writeFileSync(gameCssFile, gameCss);

// 2) Remove o prefetch em cascata de 35 ms. Ele carregava/parsing quase todo o site logo
// após o login e competia com Firestore, imagens, áudio e HUD no desktop.
const appFile = path.join(root, 'src', 'App.generated.jsx');
let app = fs.readFileSync(appFile, 'utf8');
const prefetchStart = app.indexOf('  // dinastia-zero-wait-prefetch:');
const atmAnchor = app.indexOf('  const atm = ATMOSPHERES[atmosphere] || ATMOSPHERES.neutro;', Math.max(0, prefetchStart));
if (prefetchStart >= 0) {
  must(atmAnchor > prefetchStart, 'fim do prefetch zero-wait não encontrado.');
  app = app.slice(0, prefetchStart) + app.slice(atmAnchor);
}
app = app.replaceAll('pageTurn 0.16s', 'pageTurn 0.12s');
fs.writeFileSync(appFile, app);

// 3) Música: usa a identidade real do comando e elimina snapshots de metadata duplicados.
const ambientFile = path.join(root, 'src', 'shell', 'AmbientSoundPlayer.jsx');
let ambient = fs.readFileSync(ambientFile, 'utf8');
const applyStart = ambient.indexOf('    const applyAmbient = (d) => {');
const applyEnd = ambient.indexOf('\n    const unsub = onSnapshot', applyStart);
must(applyStart >= 0 && applyEnd > applyStart, 'applyAmbient não encontrado.');
const stableApply = `    const applyAmbient = (d) => {\n      if (!d) return;\n      const eventId = String(d.commandId || d.revision || d.ts || ((d.videoId || '') + ':' + (d.playing ? '1' : '0')));\n      setCurrent(d);\n      if (eventId && eventId !== String(lastTs.current || '')) {\n        lastTs.current = eventId;\n        setUserMuted(false);\n      }\n    };`;
ambient = ambient.slice(0, applyStart) + stableApply + ambient.slice(applyEnd);
ambient = ambient.replace(
  "    const unsub = onSnapshot(ambientRef, { includeMetadataChanges: true }, snap => {",
  "    const unsub = onSnapshot(ambientRef, snap => {"
);
must(!ambient.includes('revision < lastAmbientRevisionRef.current'), 'gate antigo da música reapareceu.');
fs.writeFileSync(ambientFile, ambient);

// 4) Mapa ativo: Firestore já possui latency compensation local. Não fazemos setActiveId
// manual antes do write, pois isso disparava refreshActiveState e podia reler o mapa antigo
// do servidor, causando flicker/rollback no desktop.
const battleFile = path.join(root, 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let battle = fs.readFileSync(battleFile, 'utf8');
battle = battle.replace(
  "    const u2 = onSnapshot(activeMapRef, { includeMetadataChanges: true }, snap => {",
  "    const u2 = onSnapshot(activeMapRef, snap => {"
);

battle = replaceOnce(
  battle,
  `  const activateMap = async (id) => {\n    const revision = Date.now() * 1000 + Math.floor(Math.random() * 1000);\n    setActiveId(String(id));\n    setDoc(doc(db, 'config', 'battlemap_active'), { activeId: String(id), revision, updatedAt: Date.now() }).catch(error => console.error('Erro ao ativar mapa:', error));\n    const tokens = mapTokensRef.current[String(id)] || [];\n    await setDoc(doc(db, 'config', 'battlemap_live_tokens'), { mapId: String(id), tokens, updatedAt: Date.now() }).catch(console.error);\n    pushToast('Mapa liberado para os jogadores!', '🗡️', '#E8193C');\n  };`,
  `  const activateMap = async (id) => {\n    const revision = Date.now() * 1000 + Math.floor(Math.random() * 1000);\n    const tokens = mapTokensRef.current[String(id)] || [];\n    const activeWrite = setDoc(doc(db, 'config', 'battlemap_active'), { activeId: String(id), revision, updatedAt: Date.now() });\n    const tokenWrite = setDoc(doc(db, 'config', 'battlemap_live_tokens'), { mapId: String(id), tokens, updatedAt: Date.now() });\n    try { await Promise.all([activeWrite, tokenWrite]); } catch (error) { console.error('Erro ao ativar mapa:', error); return; }\n    pushToast('Mapa liberado para os jogadores!', '🗡️', '#E8193C');\n  };`,
  'activateMap otimista antigo não encontrado.'
);

battle = replaceOnce(
  battle,
  `  const deactivateMap = async () => {\n    setActiveId('');\n    setDoc(doc(db, 'config', 'battlemap_active'), { activeId: '', revision: Date.now() * 1000 + Math.floor(Math.random() * 1000), updatedAt: Date.now() })\n      .catch(error => console.error('Erro ao ocultar mapa:', error));\n  };`,
  `  const deactivateMap = async () => {\n    try {\n      await setDoc(doc(db, 'config', 'battlemap_active'), { activeId: '', revision: Date.now() * 1000 + Math.floor(Math.random() * 1000), updatedAt: Date.now() });\n    } catch (error) { console.error('Erro ao ocultar mapa:', error); }\n  };`,
  'deactivateMap otimista antigo não encontrado.'
);

// 30 Hz continua; não reintroduzimos o boost agressivo nem canais extras.
for (const marker of [
  'DESKTOP CONTENT SURFACE RESET 2026-09-12',
  'const TOKEN_THROTTLE_MS = 33;',
  "const u2 = onSnapshot(activeMapRef, snap => {",
  "const unsub = onSnapshot(ambientRef, snap => {",
]) {
  must(game.includes(marker) || gameCss.includes(marker) || battle.includes(marker) || ambient.includes(marker), `marcador final ausente: ${marker}`);
}
must(!app.includes('dinastia-zero-wait-prefetch'), 'prefetch agressivo ainda presente.');
must(!battle.includes('setActiveId(String(id));'), 'setActiveId otimista ainda presente na ativação.');

fs.writeFileSync(battleFile, battle);
console.log('Dinastia E: desktop estabilizado — HUDs isolados, prefetch agressivo removido e realtime sem rollback local.');
