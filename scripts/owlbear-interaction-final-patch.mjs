import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const battleFile = path.join(root, 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
const must = (ok, message) => { if (!ok) throw new Error(`Owlbear interaction patch: ${message}`); };

let battle = fs.readFileSync(battleFile, 'utf8');
const MARKER = 'OWLBEAR-STYLE INTERACTION PIPELINE 2026-09-13';

// A referência do Owlbear é: movimento local em alta frequência, rede amostrada em
// frequência menor e receptor interpolando snapshots. O Dinastia E já possui a maior
// parte dessa arquitetura; esta camada final consolida e protege essas invariantes.
// Nenhum dado persistido, coleção, mapa, ficha ou token é migrado/apagado aqui.

must(battle.includes('const TOKEN_THROTTLE_MS = 33;'), 'cadência de rede ~30 Hz ausente');
must(battle.includes('requestAnimationFrame(applyLocalPoint)'), 'movimento local não está coalescido por frame');
must(battle.includes('requestAnimationFrame(flushRemotePositions)'), 'recepção remota não está coalescida por frame');
must(battle.includes('state.pending = { x: px, y: py };'), 'fila latest-only de posição ausente');
must(battle.includes('state.inFlight >= 2'), 'limite conservador de writes concorrentes ausente');
must(battle.includes('const slot = seq % 3;'), 'canal de movimento deve usar três slots finitos');
must(battle.includes("String(data.clientId || '') === String(liveClientIdRef.current)"), 'eco do próprio cliente não está sendo ignorado');
must(battle.includes('motionSession'), 'identidade da sessão de movimento ausente');

// O snapshot de rede chega aproximadamente a cada 33ms. Uma interpolação de 36ms
// cobre o pequeno intervalo entre snapshots sem acumular atraso perceptível e reduz
// o efeito stop-and-go nos clientes remotos. O token do emissor continua sem transição.
if (battle.includes("transition: draggingId === token.id ? 'none' : 'left 24ms linear, top 24ms linear',")) {
  battle = battle.replace(
    "transition: draggingId === token.id ? 'none' : 'left 24ms linear, top 24ms linear',",
    "transition: draggingId === token.id ? 'none' : 'left 36ms linear, top 36ms linear',"
  );
}
must(battle.includes("left 36ms linear, top 36ms linear"), 'interpolação remota final de 36ms ausente');

// Evita reservar camadas de composição permanentemente para todos os tokens. O
// navegador decide quando promover a camada; a suavização continua pela transition.
battle = battle.replace(
  "willChange: draggingId === token.id ? 'auto' : 'left, top',",
  "willChange: 'auto',"
);

// Proteções contra regressões conhecidas.
for (const forbidden of [
  'state.busy = true;',
  'state.inFlight >= 4',
  'const slot = seq % 6;',
  'left 88ms linear, top 88ms linear',
  'includeMetadataChanges: true',
  'incomingTs < knownTs',
  'incomingTs >= knownTs',
  'updatedAt < previous.updatedAt',
]) {
  must(!battle.includes(forbidden), `regressão proibida reapareceu: ${forbidden}`);
}

// Marca o arquivo gerado para o guard final poder confirmar que esta camada foi
// realmente aplicada após toda a longa cadeia de patches.
if (!battle.includes(MARKER)) {
  const anchor = 'const TOKEN_THROTTLE_MS = 33;';
  battle = battle.replace(anchor, `// ${MARKER}\n${anchor}`);
}

fs.writeFileSync(battleFile, battle);
console.log('Dinastia E: pipeline de interação inspirado no Owlbear consolidado — local por frame, rede ~30 Hz, latest-only e interpolação remota contínua.');
