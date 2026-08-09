import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let src = fs.readFileSync(file, 'utf8');

function replaceOnce(pattern, replacement, label) {
  const next = src.replace(pattern, replacement);
  if (next === src) throw new Error(`Realtime patch falhou: ${label}`);
  src = next;
}

replaceOnce(
  'const TOKEN_THROTTLE_MS = 80;',
  'const TOKEN_THROTTLE_MS = 40;',
  'throttle de token'
);

replaceOnce(
  '    let lastFallbackWrite = 0;\n',
  '',
  'remoção do fallback de array completo'
);

replaceOnce(
  /\n\s*if \(now - lastFallbackWrite >= 600\) \{ lastFallbackWrite = now; writeLiveTokens\(mapIdAtDragStart, tokensArr, false\)\.catch\(\(\) => \{\}\); \}/,
  '',
  'fallback concorrente durante arraste'
);

replaceOnce(
  "const unsub = onSnapshot(positionsQuery, { includeMetadataChanges: true }, snap => {",
  "const unsub = onSnapshot(positionsQuery, snap => {",
  'snapshot de posições sem eventos de metadata'
);

replaceOnce(
  "        touchAction: 'none',\n                      }}",
  "        touchAction: 'none',\n                        transition: draggingId === token.id ? 'none' : 'left 45ms linear, top 45ms linear',\n                      }}",
  'interpolação visual remota'
);

replaceOnce(
  "      if (latestTokens) {\n        lastTokenWriteRef.current[mapIdAtDragStart] = Date.now();\n        writeLiveTokens(mapIdAtDragStart, latestTokens, true).catch(e => console.error(e));\n      }",
  "      if (latestTokens) {\n        lastTokenWriteRef.current[mapIdAtDragStart] = Date.now();\n        const finalToken = latestTokens.find(t => String(t.id) === String(draggingId));\n        if (finalToken) writeLivePosition(mapIdAtDragStart, finalToken.id, finalToken.x, finalToken.y);\n        writeLiveTokens(mapIdAtDragStart, latestTokens, true).catch(e => console.error(e));\n      }",
  'posição final imediata'
);

if (!src.includes('const TOKEN_THROTTLE_MS = 40;')) throw new Error('Throttle realtime não aplicado.');
if (!src.includes("transition: draggingId === token.id ? 'none' : 'left 45ms linear, top 45ms linear'")) throw new Error('Interpolação remota ausente.');
if (src.includes('lastFallbackWrite')) throw new Error('Fallback de array completo ainda ativo durante arraste.');

fs.writeFileSync(file, src);
console.log('Dinastia E: canal de movimento dos tokens ajustado para ~25 atualizações/s, sem sobrescrita concorrente do array completo.');
