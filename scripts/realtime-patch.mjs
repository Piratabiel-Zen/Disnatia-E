import fs from 'node:fs';
import path from 'node:path';

const battleFile = path.join(process.cwd(), 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let src = fs.readFileSync(battleFile, 'utf8');

function replaceBattle(pattern, replacement, label) {
  const next = src.replace(pattern, replacement);
  if (next === src) throw new Error(`Realtime patch falhou: ${label}`);
  src = next;
}

replaceBattle(
  'const TOKEN_THROTTLE_MS = 80;',
  'const TOKEN_THROTTLE_MS = 40;',
  'throttle de token'
);

replaceBattle(
  '    let lastFallbackWrite = 0;\n',
  '',
  'remoção do fallback de array completo'
);

replaceBattle(
  /\n\s*if \(now - lastFallbackWrite >= 600\) \{ lastFallbackWrite = now; writeLiveTokens\(mapIdAtDragStart, tokensArr, false\)\.catch\(\(\) => \{\}\); \}/,
  '',
  'fallback concorrente durante arraste'
);

replaceBattle(
  "const unsub = onSnapshot(positionsQuery, { includeMetadataChanges: true }, snap => {",
  "const unsub = onSnapshot(positionsQuery, snap => {",
  'snapshot de posições sem eventos de metadata'
);

replaceBattle(
  "        touchAction: 'none',\n                      }}",
  "        touchAction: 'none',\n                        transition: draggingId === token.id ? 'none' : 'left 45ms linear, top 45ms linear',\n                      }}",
  'interpolação visual remota'
);

replaceBattle(
  "      if (latestTokens) {\n        lastTokenWriteRef.current[mapIdAtDragStart] = Date.now();\n        writeLiveTokens(mapIdAtDragStart, latestTokens, true).catch(e => console.error(e));\n      }",
  "      if (latestTokens) {\n        lastTokenWriteRef.current[mapIdAtDragStart] = Date.now();\n        const finalToken = latestTokens.find(t => String(t.id) === String(draggingId));\n        if (finalToken) writeLivePosition(mapIdAtDragStart, finalToken.id, finalToken.x, finalToken.y);\n        writeLiveTokens(mapIdAtDragStart, latestTokens, true).catch(e => console.error(e));\n      }",
  'posição final imediata'
);

if (!src.includes('const TOKEN_THROTTLE_MS = 40;')) throw new Error('Throttle realtime não aplicado.');
if (!src.includes("transition: draggingId === token.id ? 'none' : 'left 45ms linear, top 45ms linear'")) throw new Error('Interpolação remota ausente.');
if (src.includes('lastFallbackWrite')) throw new Error('Fallback de array completo ainda ativo durante arraste.');
fs.writeFileSync(battleFile, src);

const appFile = path.join(process.cwd(), 'src', 'App.generated.jsx');
let app = fs.readFileSync(appFile, 'utf8');

function replaceApp(pattern, replacement, label) {
  const next = app.replace(pattern, replacement);
  if (next === app) throw new Error(`Realtime shell patch falhou: ${label}`);
  app = next;
}

replaceApp(
  'import "./experience/access.css";',
  'import "./experience/access.css";\nimport "./experience/realtime.css";',
  'CSS realtime'
);
replaceApp(
  'import PublicDiceOverlay from "./shell/PublicDiceOverlay";',
  'import RealtimeBroadcasts from "./experience/RealtimeBroadcasts";',
  'overlay de dados resiliente'
);
replaceApp(
  '<PublicDiceOverlay/>',
  '<RealtimeBroadcasts/>',
  'montagem dos broadcasts'
);
replaceApp(
  'className={`access-${access.role}`}',
  'className={`access-${access.role} realtime-sync-enabled`}',
  'supressão do evento cósmico legado'
);

// O player de música deixa de flutuar sobre mapa/HUD e passa a morar na barra superior.
replaceApp(
  '<div className="top-actions">\n              <PlayerIdentityChip access={access} onLogout={logout}/>',
  '<div className="top-actions">\n              <AmbientSoundPlayer masterMode={masterMode}/>\n              <PlayerIdentityChip access={access} onLogout={logout}/>',
  'player de música na topbar'
);
replaceApp(
  '        <ExperienceLayer onNavigate={navigate}/>\n        <AmbientSoundPlayer masterMode={masterMode}/>\n        <DiceWidget/>',
  '        <ExperienceLayer onNavigate={navigate}/>\n        <DiceWidget/>',
  'remoção do player flutuante antigo'
);

if (app.includes('<PublicDiceOverlay/>')) throw new Error('Overlay público legado ainda montado.');
if (!app.includes('<RealtimeBroadcasts/>')) throw new Error('RealtimeBroadcasts não foi montado.');
if ((app.match(/<AmbientSoundPlayer masterMode=\{masterMode\}\/\>/g) || []).length !== 1) {
  throw new Error('AmbientSoundPlayer deve existir uma única vez na topbar.');
}
fs.writeFileSync(appFile, app);

const ambientFile = path.join(process.cwd(), 'src', 'shell', 'AmbientSoundPlayer.jsx');
let ambient = fs.readFileSync(ambientFile, 'utf8');
const ambientRootPattern = /<div style=\{\{ position: 'fixed', [^\n]*?zIndex: (?:100|230) \}\}>/;
const ambientRootAfter = '<div className="ambient-topbar-player" style={{ position: \'relative\', zIndex: 100, flexShrink: 0 }}>';
const ambientWithRoot = ambient.replace(ambientRootPattern, ambientRootAfter);
if (ambientWithRoot === ambient) throw new Error('Raiz flutuante do player de música não encontrada.');
ambient = ambientWithRoot;
ambient = ambient.replace(
  "<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>",
  "<div className=\"ambient-topbar-closed\" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>",
);
ambient = ambient.replace(
  "style={{ width: 48, height: 48, borderRadius: '50%'",
  "className=\"ambient-mute-button\" style={{ width: 36, height: 36, borderRadius: '50%'",
);
ambient = ambient.replace(
  "<div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(10,12,28,0.92)'",
  "<div className=\"ambient-track-pill\" style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(10,12,28,0.92)'",
);
ambient = ambient.replace('maxWidth: 220', 'maxWidth: 180');
ambient = ambient.replace(
  "style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.04)'",
  "className=\"ambient-playlist-button\" style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.04)'",
);
fs.writeFileSync(ambientFile, ambient);

const globalCssFile = path.join(process.cwd(), 'src', 'styles', 'global.css');
fs.appendFileSync(globalCssFile, `\n/* Música integrada à topbar: nunca cobre mapa, HUD, diário ou dados. */\n.ambient-topbar-player{display:flex;align-items:center;max-width:min(340px,36vw)}\n.ambient-topbar-closed{min-width:0;max-width:100%}\n.ambient-track-pill{min-width:0}\n@media(max-width:1100px){.ambient-track-pill{max-width:135px!important}.ambient-track-pill input[type=range]{width:44px!important}}\n@media(max-width:900px){.ambient-topbar-player{max-width:none}.ambient-track-pill{display:none!important}.ambient-mute-button{width:32px!important;height:32px!important;font-size:16px!important}.ambient-playlist-button{width:30px!important;height:30px!important}.immersive-topbar .top-actions{gap:6px}}\n@media(max-width:520px){.ambient-playlist-button{display:none!important}}\n`);

console.log('Dinastia E: tokens/dados/eventos realtime ajustados e música integrada à barra superior sem sobrepor conteúdo.');
