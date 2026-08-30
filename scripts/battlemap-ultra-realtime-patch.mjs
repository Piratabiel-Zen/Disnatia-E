import fs from 'node:fs';
import path from 'node:path';

const battleFile = path.join(process.cwd(), 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let src = fs.readFileSync(battleFile, 'utf8');

function replaceRequired(before, after, label) {
  if (src.includes(after)) return;
  if (!src.includes(before)) throw new Error(`BattleMap ultra realtime patch falhou: ${label}`);
  src = src.replace(before, after);
}

// ── 1) Atualização de rede: alvo de 40 Hz sem criar uma fila de posições velhas ──
replaceRequired(
  'const TOKEN_THROTTLE_MS = 40;',
  'const TOKEN_THROTTLE_MS = 25;',
  'throttle realtime de 25ms'
);

// O navegador remoto interpola entre snapshots recebidos. 88ms mascara a variação
// normal de RTT sem atrasar o token local, que continua sem transição durante drag.
replaceRequired(
  "                        transition: draggingId === token.id ? 'none' : 'left 45ms linear, top 45ms linear',",
  "                        transition: draggingId === token.id ? 'none' : 'left 88ms linear, top 88ms linear',\n                        willChange: draggingId === token.id ? 'auto' : 'left, top',",
  'interpolação visual remota'
);

// ── 2) Estado auxiliar: latest-only por token + fila de render remoto ──────────
replaceRequired(
  '  const liveSequenceRef = useRef(0);\n  const activeMapRevisionRef = useRef(0);',
  '  const liveSequenceRef = useRef(0);\n  const livePositionWriteStateRef = useRef({});\n  const remotePositionQueueRef = useRef(new Map());\n  const remotePositionFrameRef = useRef(0);\n  const activeMapRevisionRef = useRef(0);',
  'refs do canal ultrarrápido'
);

// ── 3) Recepção: sem ordenar clientes diferentes pelo relógio local ────────────
// O Firestore já entrega as alterações confirmadas do documento em ordem. Comparar
// seq baseado em Date.now() entre computadores fazia um relógio adiantado bloquear
// movimentos posteriores de outro jogador. Agora cada snapshot remoto é o estado
// mais recente, ecos do próprio cliente são ignorados e os renders são agrupados
// em requestAnimationFrame.
const positionsStart = src.indexOf('  // Escuta somente as posições do mapa aberto.');
const positionsEnd = src.indexOf('\n\n  // Ao recuperar a internet', positionsStart);
if (positionsStart < 0 || positionsEnd < 0) {
  throw new Error('BattleMap ultra realtime patch: listener de posições não encontrado.');
}

const positionsEffect = `  // Escuta somente as posições do mapa aberto. Canal de alta frequência, um documento por token.
  useEffect(() => {
    if (!currentMapId) return;
    remotePositionQueueRef.current.clear();
    if (remotePositionFrameRef.current) cancelAnimationFrame(remotePositionFrameRef.current);
    remotePositionFrameRef.current = 0;

    const flushRemotePositions = () => {
      remotePositionFrameRef.current = 0;
      if (!remotePositionQueueRef.current.size) return;
      const patchMap = new Map(remotePositionQueueRef.current);
      remotePositionQueueRef.current.clear();

      setMapTokens(prev => {
        const currentTokens = prev[String(currentMapId)] || [];
        let changed = false;
        const nextTokens = currentTokens.map(token => {
          const patch = patchMap.get(String(token.id));
          if (!patch) return token;
          const sameX = Math.abs(Number(token.x || 0) - patch.x) < 0.00001;
          const sameY = Math.abs(Number(token.y || 0) - patch.y) < 0.00001;
          if (sameX && sameY) return token;
          changed = true;
          return { ...token, x: patch.x, y: patch.y };
        });
        if (!changed) return prev;
        const next = { ...prev, [String(currentMapId)]: nextTokens };
        mapTokensRef.current = next;
        return next;
      });
    };

    const scheduleRemoteFlush = () => {
      if (remotePositionFrameRef.current) return;
      remotePositionFrameRef.current = requestAnimationFrame(flushRemotePositions);
    };

    const positionsQuery = query(collection(db, 'battlemap_live_positions'), where('mapId', '==', String(currentMapId)));
    const unsub = onSnapshot(positionsQuery, snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'removed') return;
        const data = change.doc.data() || {};
        if (String(data.mapId) !== String(currentMapId) || data.tokenId === undefined) return;

        // Latency compensation já move o token local imediatamente. Ignorar o eco
        // evita que o ACK do Firestore dispute com o ponteiro e cause microtravadas.
        if (String(data.clientId || '') === String(liveClientIdRef.current)) return;

        const tokenId = String(data.tokenId);
        const x = Number(data.x);
        const y = Number(data.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        remotePositionQueueRef.current.set(tokenId, { x, y });
      });
      if (remotePositionQueueRef.current.size) scheduleRemoteFlush();
    }, err => console.error('Erro no canal rápido do mapa atual:', err));

    return () => {
      unsub();
      if (remotePositionFrameRef.current) cancelAnimationFrame(remotePositionFrameRef.current);
      remotePositionFrameRef.current = 0;
      remotePositionQueueRef.current.clear();
    };
  }, [currentMapId]);`;

src = src.slice(0, positionsStart) + positionsEffect + src.slice(positionsEnd);

// ── 4) Envio: no máximo 1 write pendente por token, sempre preservando o MAIS NOVO ──
// Se a rede levar mais tempo que 25ms, não acumulamos dezenas de posições antigas.
// A posição mais recente substitui a pendente e é enviada assim que o write atual
// termina. Isso reduz a sensação de token "correndo atrás" do jogador em conexões
// com RTT maior.
const writeStart = src.indexOf('  const writeLivePosition = (mapId, tokenId, x, y) => {');
const writeEnd = src.indexOf('\n\n  const persistTokens =', writeStart);
if (writeStart < 0 || writeEnd < 0) {
  throw new Error('BattleMap ultra realtime patch: writeLivePosition não encontrado.');
}

const writeLivePosition = `  const writeLivePosition = (mapId, tokenId, x, y) => {
    const id = String(mapId);
    const tid = String(tokenId);
    const key = \`${'${id}:${tid}'}\`;
    const px = Math.round(Number(x) * 10000) / 10000;
    const py = Math.round(Number(y) * 10000) / 10000;
    if (!Number.isFinite(px) || !Number.isFinite(py)) return;

    const state = livePositionWriteStateRef.current[key] || { busy: false, pending: null };
    livePositionWriteStateRef.current[key] = state;
    state.pending = { x: px, y: py };
    if (state.busy) return;

    const flushLatest = () => {
      const point = state.pending;
      if (!point) { state.busy = false; return; }
      state.pending = null;
      state.busy = true;
      liveSequenceRef.current += 1;
      const seq = liveSequenceRef.current;

      setDoc(doc(db, 'battlemap_live_positions', \`${'${id}_${tid}'}\`), {
        mapId: id,
        tokenId: tid,
        x: point.x,
        y: point.y,
        seq,
        clientId: liveClientIdRef.current,
        updatedAt: Date.now(),
      }, { merge: true })
        .catch(e => console.error('Erro ao transmitir posição:', e))
        .finally(() => {
          state.busy = false;
          if (state.pending) queueMicrotask(flushLatest);
        });
    };

    flushLatest();
  };`;

src = src.slice(0, writeStart) + writeLivePosition + src.slice(writeEnd);

// ── 5) Movimento local: renderiza no máximo uma vez por frame ─────────────────
// Pointer events podem chegar acima de 100 Hz. React não precisa renderizar todos;
// coalescemos para o refresh da tela, preservando o último ponto e deixando o drag
// visualmente contínuo sem desperdiçar CPU.
const dragEffectStart = src.indexOf(' useEffect(() => {\n    if (!draggingId || !currentMap) return;');
const moveStart = src.indexOf('    const move = (e) => {', dragEffectStart);
const upStart = src.indexOf('    const up = () => {', moveStart);
if (dragEffectStart < 0 || moveStart < 0 || upStart < 0) {
  throw new Error('BattleMap ultra realtime patch: efeito de arraste não encontrado.');
}

const smoothMove = `    let localFrame = 0;
    let latestPoint = null;

    const applyLocalPoint = () => {
      localFrame = 0;
      if (!latestPoint) return;
      const { x, y } = latestPoint;
      latestPoint = null;
      const prev = mapTokensRef.current;
      const currentTokens = prev[String(mapIdAtDragStart)] || [];
      const updatedTokens = currentTokens.map(t => t.id === draggingId ? { ...t, x, y } : t);
      const next = { ...prev, [String(mapIdAtDragStart)]: updatedTokens };
      mapTokensRef.current = next;
      setMapTokens(next);
      throttledTokenWrite(updatedTokens);
    };

    const move = (e) => {
      if (!mapRef.current) return;
      moved.current = true;
      const rect = mapRef.current.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      let x = ((clientX - rect.left) / rect.width) * 100;
      let y = ((clientY - rect.top) / rect.height) * 100;
      x = Math.min(100, Math.max(0, x));
      y = Math.min(100, Math.max(0, y));
      latestPoint = { x, y };
      if (!localFrame) localFrame = requestAnimationFrame(applyLocalPoint);
    };
`;

src = src.slice(0, moveStart) + smoothMove + src.slice(upStart);

replaceRequired(
  '    const up = () => {\n      clearTimeout(saveTimeout.current[\'tok_\' + mapIdAtDragStart]);',
  '    const up = () => {\n      if (localFrame) { cancelAnimationFrame(localFrame); localFrame = 0; applyLocalPoint(); }\n      clearTimeout(saveTimeout.current[\'tok_\' + mapIdAtDragStart]);',
  'flush do último frame ao soltar'
);

replaceRequired(
  '    return () => {\n      window.removeEventListener(\'pointermove\', move);',
  '    return () => {\n      if (localFrame) cancelAnimationFrame(localFrame);\n      window.removeEventListener(\'pointermove\', move);',
  'cancelamento do frame local'
);

// ── 6) Token sem círculo: seleção acompanha a silhueta alfa da imagem ─────────
const oldTokenVisual = `                     <div style={{
                      width: dispSize, height: dispSize, borderRadius: '50%',
                      border: draggingId === token.id ? \`2px solid \${info.ring}\` : isSelected ? '2px solid #fff' : '2px solid transparent',
                      boxShadow: draggingId === token.id ? \`0 0 14px \${info.color}\` : isSelected ? \`0 0 14px \${info.color}\` : '0 2px 8px rgba(0,0,0,0.4)',
                      background: 'transparent', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: draggingId === token.id ? 'none' : 'box-shadow 0.2s, border-color 0.2s',
                     }}>
                        {token.foto
                          ? <img src={token.foto} alt="" draggable={false} style={{ width: '92%', height: '92%', objectFit: 'contain', pointerEvents: 'none' }} />
                          : <span style={{ fontSize: dispSize * 0.4 }}>{token.tipo === 'inimigo' ? '💀' : '🧙'}</span>}
                      </div>`;

const newTokenVisual = `                     <div style={{
                      width: dispSize, height: dispSize,
                      background: 'transparent', overflow: 'visible',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                     }}>
                        {token.foto
                          ? <img src={token.foto} alt="" draggable={false} style={{
                              width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none',
                              filter: draggingId === token.id
                                ? \`drop-shadow(0 0 1px rgba(255,255,255,.98)) drop-shadow(0 0 \${Math.max(7,9*zoom)}px \${info.color})\`
                                : isSelected
                                  ? \`drop-shadow(0 0 1px rgba(255,255,255,.96)) drop-shadow(0 0 \${Math.max(5,7*zoom)}px \${info.color})\`
                                  : 'drop-shadow(0 2px 4px rgba(0,0,0,.68))',
                              transition: draggingId === token.id ? 'none' : 'filter .14s ease',
                            }} />
                          : <span style={{ fontSize: dispSize * 0.4, filter: isSelected ? \`drop-shadow(0 0 6px \${info.color})\` : 'none' }}>{token.tipo === 'inimigo' ? '💀' : '🧙'}</span>}
                      </div>`;

replaceRequired(oldTokenVisual, newTokenVisual, 'contorno da imagem do token');

// ── 7) Sanidade ───────────────────────────────────────────────────────────────
for (const marker of [
  'const TOKEN_THROTTLE_MS = 25;',
  'livePositionWriteStateRef',
  'remotePositionQueueRef',
  'queueMicrotask(flushLatest)',
  "String(data.clientId || '') === String(liveClientIdRef.current)",
  'requestAnimationFrame(applyLocalPoint)',
  'left 88ms linear, top 88ms linear',
  'drop-shadow(0 0 1px rgba(255,255,255,.98))',
]) {
  if (!src.includes(marker)) throw new Error(`BattleMap ultra realtime patch incompleto: ${marker}`);
}
if (src.includes('const TOKEN_THROTTLE_MS = 40;')) throw new Error('Throttle antigo ainda presente.');
if (src.includes("borderRadius: '50%',\n                      border: draggingId === token.id")) throw new Error('Círculo antigo do token ainda presente.');

fs.writeFileSync(battleFile, src);
console.log('Dinastia E: BattleMap em realtime latest-only, render coalescido e seleção por contorno da imagem.');
