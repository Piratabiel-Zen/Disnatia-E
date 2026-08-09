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

if (app.includes('<PublicDiceOverlay/>')) throw new Error('Overlay público legado ainda montado.');
if (!app.includes('<RealtimeBroadcasts/>')) throw new Error('RealtimeBroadcasts não foi montado.');
fs.writeFileSync(appFile, app);

console.log('Dinastia E: tokens em ~25 atualizações/s e broadcasts duráveis de dados/eventos preparados.');
