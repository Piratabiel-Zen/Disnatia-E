import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const battleFile = path.join(root, 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let battle = fs.readFileSync(battleFile, 'utf8');

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Runtime performance patch: marcador ausente (${label}).`);
  return source.replace(before, after);
}

// Movimento local continua no ritmo do requestAnimationFrame (~60/120 FPS), mas
// a rede não precisa receber 40 writes/s por token para parecer contínua. 25 Hz
// com interpolação curta preserva a sensação realtime e reduz bastante CPU,
// tráfego Firestore, callbacks de snapshot e contenção entre jogadores.
battle = replaceRequired(
  battle,
  'const TOKEN_THROTTLE_MS = 25;',
  'const TOKEN_THROTTLE_MS = 40;',
  'cadência de rede dos tokens'
);

// Duas gravações simultâneas são suficientes para não voltar ao writer serial,
// mas evitam o pico de quatro promises/writes concorrentes por token que estava
// pressionando navegador + Firestore durante movimentos longos.
battle = replaceRequired(
  battle,
  'if (!state.pending || state.inFlight >= 4) return;',
  'if (!state.pending || state.inFlight >= 2) return;',
  'limite de writes concorrentes'
);

// Três slots eliminam hot-document sem multiplicar snapshots desnecessariamente.
battle = replaceRequired(
  battle,
  'const slot = seq % 6;',
  'const slot = seq % 3;',
  'quantidade de slots de movimento'
);

// Evita transmitir ruído subpixel em precisão excessiva. 0,001% do mapa é muito
// menor que um pixel visual na prática, mas reduz atualizações idênticas/jitter.
battle = replaceRequired(
  battle,
  'const px = Math.round(Number(x) * 10000) / 10000;\n    const py = Math.round(Number(y) * 10000) / 10000;',
  'const px = Math.round(Number(x) * 1000) / 1000;\n    const py = Math.round(Number(y) * 1000) / 1000;',
  'quantização subpixel'
);

// Prefetch ao simplesmente cruzar o mouse pela navegação fazia chunks grandes
// serem baixados sem intenção do usuário. O clique continua carregando a página
// imediatamente; só removemos o aquecimento acidental em hover.
for (const rel of ['src/experience/ExperienceKit.jsx', 'src/experience/ExperienceKit.generated.jsx']) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  let source = fs.readFileSync(abs, 'utf8');
  source = source.replaceAll(' onPointerEnter={()=>warm(item.id)}', '');
  fs.writeFileSync(abs, source);
}

for (const marker of [
  'const TOKEN_THROTTLE_MS = 40;',
  'state.inFlight >= 2',
  'const slot = seq % 3;',
  'Math.round(Number(x) * 1000) / 1000',
]) {
  if (!battle.includes(marker)) throw new Error(`Runtime performance patch incompleto: ${marker}`);
}
if (battle.includes('state.inFlight >= 4')) throw new Error('Writer concorrente antigo permaneceu.');
if (battle.includes('const slot = seq % 6;')) throw new Error('Seis slots antigos permaneceram.');

fs.writeFileSync(battleFile, battle);
console.log('Dinastia E: realtime balanceado em 25 Hz, 2 writes concorrentes, 3 slots e sem prefetch acidental por hover.');
