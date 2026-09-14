import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const battleFile = path.join(root, 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
const must = (ok, message) => { if (!ok) throw new Error(`Owlbear interaction patch: ${message}`); };

let battle = fs.readFileSync(battleFile, 'utf8');
const MARKER = 'OWLBEAR-STYLE INTERACTION PIPELINE 2026-09-13';
const DURABLE_MARKER = 'BATTLEMAP DURABLE POSITION COMMIT 2026-09-14';

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

// ── PERSISTÊNCIA DURÁVEL ────────────────────────────────────────────────────
// O writer antigo usava Promise.allSettled para o documento legado + arquivo
// battlemap_tokens. Isso fazia uma falha do arquivo permanente parecer sucesso.
// Agora o arquivo autoritativo é obrigatório, tem retry curto e propaga erro.
const writerStart = battle.indexOf('  const writeLiveTokens = async (mapId, tokens, persistArchive = false) => {');
const writerEnd = battle.indexOf('\n\n  const writeLivePosition =', writerStart);
must(writerStart >= 0 && writerEnd > writerStart, 'writeLiveTokens não encontrado');

const durableWriter = `  // ${DURABLE_MARKER}\n  const writeLiveTokens = async (mapId, tokens, persistArchive = false) => {\n    const id = String(mapId);\n    const payload = { mapId: id, tokens, updatedAt: Date.now() };\n    liveTokenVersionRef.current[id] = payload.updatedAt;\n\n    // O canal legado continua como compatibilidade, mas nunca pode mascarar a\n    // falha do documento permanente.\n    const liveWrite = setDoc(doc(db, 'config', 'battlemap_live_tokens'), payload)\n      .catch(error => { console.error('Erro no canal legado de tokens:', error); return false; });\n\n    if (!persistArchive) {\n      await liveWrite;\n      return true;\n    }\n\n    let archiveError = null;\n    for (const delay of [0, 120, 360]) {\n      if (delay) await new Promise(resolve => setTimeout(resolve, delay));\n      try {\n        const updatedAt = Date.now();\n        await setDoc(doc(db, 'battlemap_tokens', id), { tokens, updatedAt });\n        liveTokenVersionRef.current[id] = updatedAt;\n        archiveError = null;\n        break;\n      } catch (error) {\n        archiveError = error;\n      }\n    }\n\n    await liveWrite;\n    if (archiveError) throw archiveError;\n    return true;\n  };`;

battle = battle.slice(0, writerStart) + durableWriter + battle.slice(writerEnd);

// Ao soltar um token, além do array canônico gravamos uma posição final estável
// no MESMO canal de posições já permitido pelo projeto. Os três slots p0..p2 ficam
// efêmeros para movimento; o documento _final é o checkpoint durável do drag.
const livePositionStart = battle.indexOf('  const writeLivePosition = (mapId, tokenId, x, y) => {');
const normalizeStart = battle.indexOf('\n\n  const normalizeTokenRotation =', livePositionStart);
const persistStart = battle.indexOf('\n\n  const persistTokens =', livePositionStart);
const livePositionEnd = normalizeStart >= 0 ? normalizeStart : persistStart;
must(livePositionStart >= 0 && livePositionEnd > livePositionStart, 'writeLivePosition não encontrado');

if (!battle.includes('const commitCanonicalTokenPosition = async')) {
  const canonicalCommit = `\n\n  const commitCanonicalTokenPosition = async (mapId, token) => {\n    const id = String(mapId);\n    const tid = String(token?.id ?? '');\n    const x = Math.round(Number(token?.x) * 1000) / 1000;\n    const y = Math.round(Number(token?.y) * 1000) / 1000;\n    if (!tid || !Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Posição final inválida');\n\n    const key = id + ':' + tid;\n    authoritativePositionRef.current[key] = { x, y };\n    const writerState = livePositionWriteStateRef.current[key];\n    const motionSession = String(writerState?.motionSession || (String(liveClientIdRef.current) + '_final'));\n    const rotation = Number.isFinite(Number(token?.rotation)) ? ((Number(token.rotation) % 360) + 360) % 360 : undefined;\n\n    let commitError = null;\n    for (const delay of [0, 90, 260]) {\n      if (delay) await new Promise(resolve => setTimeout(resolve, delay));\n      liveSequenceRef.current += 1;\n      const seq = liveSequenceRef.current;\n      try {\n        await setDoc(doc(db, 'battlemap_live_positions', id + '_' + tid + '_final'), {\n          mapId: id,\n          tokenId: tid,\n          x,\n          y,\n          ...(rotation === undefined ? {} : { rotation }),\n          seq,\n          motionSession,\n          channel: 'position-final-v1',\n          clientId: liveClientIdRef.current,\n          updatedAt: Date.now(),\n        }, { merge: true });\n        commitError = null;\n        break;\n      } catch (error) {\n        commitError = error;\n      }\n    }\n    if (commitError) throw commitError;\n\n    // Limpa apenas formatos que a versão atual NUNCA mais escreve. p0..p2 continuam\n    // disponíveis para um novo drag imediatamente, evitando corrida com o próximo gesto.\n    const obsoleteIds = [\n      id + '_' + tid,\n      id + '_' + tid + '_p3',\n      id + '_' + tid + '_p4',\n      id + '_' + tid + '_p5',\n    ];\n    await Promise.allSettled(obsoleteIds.map(docId => deleteDoc(doc(db, 'battlemap_live_positions', docId))));\n    return true;\n  };`;
  battle = battle.slice(0, livePositionEnd) + canonicalCommit + battle.slice(livePositionEnd);
}

// No bootstrap de uma página, documentos antigos e slots podem chegar em qualquer
// ordem. Processamos somente o protocolo atual e aplicamos _final por último. Em
// atualizações posteriores, um novo motion-v2 continua fluindo normalmente.
const positionsAnchor = battle.indexOf("const positionsQuery = query(collection(db, 'battlemap_live_positions')");
const rawChanges = '      snap.docChanges().forEach(change => {';
const rawChangesAt = battle.indexOf(rawChanges, positionsAnchor);
must(positionsAnchor >= 0 && rawChangesAt >= 0, 'listener battlemap_live_positions não encontrado');
if (!battle.includes('const orderedPositionChanges = snap.docChanges()')) {
  const orderedChanges = `      const orderedPositionChanges = snap.docChanges()\n        .filter(change => change.type !== 'removed')\n        .filter(change => {\n          const row = change.doc.data() || {};\n          const channel = String(row.channel || '');\n          if (channel !== 'motion-v2' && channel !== 'position-final-v1') return false;\n          if (/_p[3-5]$/.test(change.doc.id)) return false;\n          return true;\n        })\n        .sort((a, b) => {\n          const aFinal = String((a.doc.data() || {}).channel || '') === 'position-final-v1' ? 1 : 0;\n          const bFinal = String((b.doc.data() || {}).channel || '') === 'position-final-v1' ? 1 : 0;\n          return aFinal - bFinal;\n        });\n      orderedPositionChanges.forEach(change => {`;
  battle = battle.slice(0, rawChangesAt) + orderedChanges + battle.slice(rawChangesAt + rawChanges.length);
}

// O término do gesto precisa consolidar a posição mesmo se o ponteiro for cancelado,
// a janela perder foco ou o touch for interrompido. Um guard evita commit duplicado.
const dragEffectAnchor = battle.indexOf('if (!draggingId || !currentMap) return;');
must(dragEffectAnchor >= 0, 'efeito de arraste não encontrado');
const latestPointAt = battle.indexOf('    let latestPoint = null;', dragEffectAnchor);
must(latestPointAt >= 0, 'estado latestPoint do drag não encontrado');
if (!battle.includes('    let dragCommitted = false;', dragEffectAnchor)) {
  const insertAt = latestPointAt + '    let latestPoint = null;'.length;
  battle = battle.slice(0, insertAt) + '\n    let dragCommitted = false;' + battle.slice(insertAt);
}

const upStart = battle.indexOf('    const up = () => {', dragEffectAnchor);
must(upStart >= 0, 'finalizador do drag não encontrado');
const upBodyStart = upStart + '    const up = () => {'.length;
if (!battle.includes('      if (dragCommitted) return;', upStart)) {
  battle = battle.slice(0, upBodyStart) + '\n      if (dragCommitted) return;\n      dragCommitted = true;' + battle.slice(upBodyStart);
}

const latestStart = battle.indexOf('      const latestTokens = mapTokensRef.current[', upStart);
const movedCheckStart = battle.indexOf('      if (!moved.current)', latestStart);
must(latestStart >= 0 && movedCheckStart > latestStart, 'bloco de persistência final do drag não encontrado');
const durableFinal = `      const latestTokens = mapTokensRef.current[String(mapIdAtDragStart)];\n      if (latestTokens) {\n        const movedToken = latestTokens.find(t => String(t.id) === String(draggingId));\n        const durableWrites = [];\n        if (movedToken) {\n          writeLivePosition(mapIdAtDragStart, movedToken.id, movedToken.x, movedToken.y);\n          durableWrites.push(commitCanonicalTokenPosition(mapIdAtDragStart, movedToken));\n        }\n        lastTokenWriteRef.current[mapIdAtDragStart] = Date.now();\n        durableWrites.push(writeLiveTokens(mapIdAtDragStart, latestTokens, true));\n        Promise.allSettled(durableWrites).then(results => {\n          const rejected = results.filter(result => result.status === 'rejected');\n          if (rejected.length) rejected.forEach(result => console.error('Falha em persistência do token:', result.reason));\n          if (rejected.length === results.length && results.length) {\n            pushToast('Não foi possível salvar a posição do token. Verifique a conexão.', '⚠️', '#F59E0B');\n          }\n        });\n      }\n`;
battle = battle.slice(0, latestStart) + durableFinal + battle.slice(movedCheckStart);

// Eventos adicionais de término do gesto.
battle = battle.replace(
  "    window.addEventListener('pointerup', up);",
  "    window.addEventListener('pointerup', up);\n    window.addEventListener('pointercancel', up);\n    window.addEventListener('blur', up);"
);
battle = battle.replace(
  "    window.addEventListener('touchend', up);",
  "    window.addEventListener('touchend', up);\n    window.addEventListener('touchcancel', up);"
);
battle = battle.replace(
  "      window.removeEventListener('pointerup', up);",
  "      window.removeEventListener('pointerup', up);\n      window.removeEventListener('pointercancel', up);\n      window.removeEventListener('blur', up);"
);
battle = battle.replace(
  "      window.removeEventListener('touchend', up);",
  "      window.removeEventListener('touchend', up);\n      window.removeEventListener('touchcancel', up);"
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

for (const marker of [
  DURABLE_MARKER,
  'position-final-v1',
  'commitCanonicalTokenPosition',
  'const orderedPositionChanges = snap.docChanges()',
  'let dragCommitted = false;',
  "window.addEventListener('pointercancel', up);",
  "window.addEventListener('touchcancel', up);",
  "for (const delay of [0, 120, 360])",
]) {
  must(battle.includes(marker), `persistência durável incompleta: ${marker}`);
}

const durableWriterCheckStart = battle.indexOf(`// ${DURABLE_MARKER}`);
const durableWriterCheckEnd = battle.indexOf('\n\n  const writeLivePosition =', durableWriterCheckStart);
const durableWriterSegment = battle.slice(durableWriterCheckStart, durableWriterCheckEnd);
must(!durableWriterSegment.includes('await Promise.allSettled(writes)'), 'writer permanente ainda mascara falhas com allSettled');

fs.writeFileSync(battleFile, battle);
console.log('Dinastia E: realtime Owlbear + persistência durável — movimento efêmero separado do checkpoint final, retries ativos e slots antigos ignorados.');
