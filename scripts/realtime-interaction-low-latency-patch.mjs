import fs from 'node:fs';
import path from 'node:path';

const battleFile = path.join(process.cwd(), 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let src = fs.readFileSync(battleFile, 'utf8');

function replaceRequired(before, after, label) {
  if (src.includes(after)) return;
  if (!src.includes(before)) throw new Error(`Low-latency realtime patch falhou: ${label}`);
  src = src.replace(before, after);
}

// ── 1) REMOÇÃO DE LATÊNCIA VISUAL ARTIFICIAL ────────────────────────────────
// O patch anterior adicionava 88ms de transição a CADA snapshot remoto. Isso
// tornava o token visualmente atrasado mesmo quando a rede já havia entregue a
// posição. Mantemos apenas ~2 frames de interpolação para esconder jitter.
replaceRequired(
  "                        transition: draggingId === token.id ? 'none' : 'left 88ms linear, top 88ms linear',\n                        willChange: draggingId === token.id ? 'auto' : 'left, top',",
  "                        transition: draggingId === token.id ? 'none' : 'left 32ms linear, top 32ms linear',\n                        willChange: draggingId === token.id ? 'auto' : 'left, top',",
  'transição remota de 88ms'
);

// ── 2) VERSÃO REMOTA POR TOKEN ───────────────────────────────────────────────
// Precisamos ordenar os 6 slots físicos do mesmo token sem depender do relógio
// absoluto entre computadores. Dentro do mesmo cliente usamos seq monotônico;
// quando a origem muda, updatedAt serve apenas como proteção contra um slot
// claramente antigo reaparecendo.
replaceRequired(
  '  const authoritativeRotationRef = useRef({});\n  const rotationLastWriteRef = useRef({});',
  '  const authoritativeRotationRef = useRef({});\n  const remoteMotionVersionRef = useRef({});\n  const rotationLastWriteRef = useRef({});',
  'ref de versão do movimento remoto'
);

// ── 3) RECEPÇÃO: latest-only, um render por frame, posição + rotação ─────────
const positionsStart = src.indexOf('  // Escuta somente as posições do mapa aberto.');
const positionsEnd = src.indexOf('\n\n  // Ao recuperar a internet', positionsStart);
if (positionsStart < 0 || positionsEnd < 0) {
  throw new Error('Low-latency realtime patch: listener de posições não encontrado.');
}

const positionsEffect = `  // Escuta somente as posições do mapa aberto. Canal low-latency em slots por token.
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
          const hasPosition = Number.isFinite(patch.x) && Number.isFinite(patch.y);
          const hasRotation = Number.isFinite(patch.rotation);
          const sameX = !hasPosition || Math.abs(Number(token.x || 0) - patch.x) < 0.00001;
          const sameY = !hasPosition || Math.abs(Number(token.y || 0) - patch.y) < 0.00001;
          const sameRotation = !hasRotation || Math.abs(Number(token.rotation || 0) - patch.rotation) < 0.01;
          if (sameX && sameY && sameRotation) return token;
          changed = true;
          return {
            ...token,
            ...(hasPosition ? { x: patch.x, y: patch.y } : {}),
            ...(hasRotation ? { rotation: patch.rotation } : {}),
          };
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

    const acceptPositionVersion = (tokenId, data) => {
      const key = String(currentMapId) + ':' + String(tokenId);
      const source = String(data.motionSession || data.clientId || 'legacy');
      const seq = Number(data.seq || 0);
      const updatedAt = Number(data.updatedAt || 0);
      const previous = remoteMotionVersionRef.current[key];

      if (previous) {
        if (source === previous.source && seq && previous.seq && seq <= previous.seq) return false;
        // Só rejeita troca de origem quando o slot é claramente mais antigo. A
        // tolerância evita depender de relógios perfeitamente sincronizados.
        if (source !== previous.source && updatedAt && previous.updatedAt && updatedAt < previous.updatedAt - 1500) return false;
      }
      remoteMotionVersionRef.current[key] = { source, seq, updatedAt, receivedAt: performance.now() };
      return true;
    };

    const positionsQuery = query(collection(db, 'battlemap_live_positions'), where('mapId', '==', String(currentMapId)));
    const unsub = onSnapshot(positionsQuery, snap => {
      snap.docChanges().forEach(change => {
        if (change.type === 'removed') return;
        const data = change.doc.data() || {};
        if (String(data.mapId) !== String(currentMapId) || data.tokenId === undefined) return;

        // O token local já acompanha o ponteiro imediatamente. Ignorar o próprio
        // eco impede o ACK remoto de disputar com a posição da mão do jogador.
        if (String(data.clientId || '') === String(liveClientIdRef.current)) return;

        const tokenId = String(data.tokenId);
        const currentPatch = remotePositionQueueRef.current.get(tokenId) || {};
        const nextPatch = { ...currentPatch };
        let changed = false;

        const x = Number(data.x);
        const y = Number(data.y);
        if (Number.isFinite(x) && Number.isFinite(y) && acceptPositionVersion(tokenId, data)) {
          authoritativePositionRef.current[String(currentMapId) + ':' + tokenId] = { x, y };
          nextPatch.x = x;
          nextPatch.y = y;
          changed = true;
        }

        const rotation = Number(data.rotation);
        if (Number.isFinite(rotation)) {
          const normalizedRotation = ((rotation % 360) + 360) % 360;
          authoritativeRotationRef.current[String(currentMapId) + ':' + tokenId] = normalizedRotation;
          nextPatch.rotation = normalizedRotation;
          changed = true;
        }

        if (changed) remotePositionQueueRef.current.set(tokenId, nextPatch);
      });
      if (remotePositionQueueRef.current.size) scheduleRemoteFlush();
    }, err => console.error('Erro no canal low-latency do mapa atual:', err));

    return () => {
      unsub();
      if (remotePositionFrameRef.current) cancelAnimationFrame(remotePositionFrameRef.current);
      remotePositionFrameRef.current = 0;
      remotePositionQueueRef.current.clear();
    };
  }, [currentMapId]);`;

src = src.slice(0, positionsStart) + positionsEffect + src.slice(positionsEnd);

// ── 4) ENVIO: PIPELINE CURTO + 6 SLOTS POR TOKEN ─────────────────────────────
// O código anterior mantinha apenas UM write em voo e só chamava o próximo após
// o Promise do Firestore resolver. Como o Promise resolve depois do ACK remoto,
// o FPS de rede ficava limitado pelo RTT. Agora permitimos até quatro writes em
// voo, mas existe no máximo UMA posição pendente: eventos intermediários são
// substituídos pelo ponto mais novo em vez de formar uma fila velha.
//
// Os writes alternam por 6 documentos fixos. Isso evita concentrar toda a taxa
// de atualização em um único documento Firestore e mantém armazenamento finito.
const writeStart = src.indexOf('  const writeLivePosition = (mapId, tokenId, x, y) => {');
const normalizeStart = src.indexOf('\n\n  const normalizeTokenRotation =', writeStart);
const persistStart = src.indexOf('\n\n  const persistTokens =', writeStart);
const writeEnd = normalizeStart >= 0 ? normalizeStart : persistStart;
if (writeStart < 0 || writeEnd < 0) {
  throw new Error('Low-latency realtime patch: writeLivePosition não encontrado.');
}

const writeLivePosition = `  const writeLivePosition = (mapId, tokenId, x, y) => {
    const id = String(mapId);
    const tid = String(tokenId);
    const key = id + ':' + tid;
    const px = Math.round(Number(x) * 10000) / 10000;
    const py = Math.round(Number(y) * 10000) / 10000;
    if (!Number.isFinite(px) || !Number.isFinite(py)) return;

    authoritativePositionRef.current[key] = { x: px, y: py };
    const state = livePositionWriteStateRef.current[key] || {
      inFlight: 0,
      pending: null,
      motionSession: String(liveClientIdRef.current) + '_' + Date.now().toString(36),
    };
    livePositionWriteStateRef.current[key] = state;
    state.pending = { x: px, y: py };

    const flushLatest = () => {
      if (!state.pending || state.inFlight >= 4) return;
      const point = state.pending;
      state.pending = null;
      state.inFlight += 1;
      liveSequenceRef.current += 1;
      const seq = liveSequenceRef.current;
      const slot = seq % 6;

      setDoc(doc(db, 'battlemap_live_positions', id + '_' + tid + '_p' + slot), {
        mapId: id,
        tokenId: tid,
        x: point.x,
        y: point.y,
        seq,
        motionSession: state.motionSession,
        channel: 'motion-v2',
        clientId: liveClientIdRef.current,
        updatedAt: Date.now(),
      }, { merge: true })
        .catch(e => console.error('Erro ao transmitir posição low-latency:', e))
        .finally(() => {
          state.inFlight = Math.max(0, state.inFlight - 1);
          if (state.pending) queueMicrotask(flushLatest);
        });
    };

    flushLatest();
  };`;

src = src.slice(0, writeStart) + writeLivePosition + src.slice(writeEnd);

// ── 5) PING: CANAL DUPLO EFÊMERO SEM HOT-DOCUMENT ÚNICO ──────────────────────
const pingMarker = src.indexOf("    let lastRemotePingId = '';");
if (pingMarker < 0) throw new Error('Low-latency realtime patch: listener atual de ping não encontrado.');
const pingEffectStart = src.lastIndexOf('  useEffect(() => {', pingMarker);
const pingEffectClose = src.indexOf('  }, []);', pingMarker);
if (pingEffectStart < 0 || pingEffectClose < 0) throw new Error('Low-latency realtime patch: limites do listener de ping não encontrados.');
const pingEffectEnd = pingEffectClose + '  }, []);'.length;

const pingEffect = `  useEffect(() => {
    let configPrimed = false;
    let feedPrimed = false;
    const seenPingIds = new Set();

    const remember = id => {
      if (!id) return;
      seenPingIds.add(id);
      if (seenPingIds.size > 80) {
        const recent = Array.from(seenPingIds).slice(-40);
        seenPingIds.clear();
        recent.forEach(x => seenPingIds.add(x));
      }
    };

    const receivePing = row => {
      const id = String(row?.id || '');
      if (!id || seenPingIds.has(id)) return;
      remember(id);
      setBattlePing(row);
      clearTimeout(pingTimerRef.current);
      // Tempo de vida contado a partir da chegada neste cliente: a latência de
      // rede nunca reduz a duração visual do ping.
      pingTimerRef.current = setTimeout(() => setBattlePing(null), 5200);
    };

    const uConfig = onSnapshot(doc(db,'config','battlemap_ping'), snap => {
      if (!snap.exists()) return;
      const row = snap.data() || {};
      const id = String(row.id || '');
      if (!configPrimed) { configPrimed = true; remember(id); return; }
      receivePing(row);
    }, error => console.error('Erro no canal compatível do ping:', error));

    // O feed possui somente oito slots reaproveitados. Ele evita que todos os
    // pings dependam de um único documento e entrega pelo primeiro canal que
    // chegar; o ID garante deduplicação caso ambos cheguem.
    const uFeed = onSnapshot(collection(db,'battlemap_ping_live'), snap => {
      if (!feedPrimed) {
        feedPrimed = true;
        snap.docs.forEach(d => remember(String((d.data() || {}).id || '')));
        return;
      }
      snap.docChanges().forEach(change => {
        if (change.type === 'removed') return;
        receivePing(change.doc.data() || {});
      });
    }, error => console.error('Erro no canal rápido do ping:', error));

    return () => {
      uConfig();
      uFeed();
      clearTimeout(pingTimerRef.current);
    };
  }, []);`;

src = src.slice(0, pingEffectStart) + pingEffect + src.slice(pingEffectEnd);

const oldPingWrite = `    try { await setDoc(doc(db,'config','battlemap_ping'), ping); }
    catch (error) { console.error('Erro ao enviar ping no mapa:', error); }`;
const newPingWrite = `    const pingSlot = Math.floor(Math.random() * 8);
    Promise.allSettled([
      setDoc(doc(db,'config','battlemap_ping'), ping),
      setDoc(doc(db,'battlemap_ping_live','slot_' + pingSlot), { ...ping, publishedAt: Date.now() }, { merge: true }),
    ]).then(results => {
      if (results.every(result => result.status === 'rejected')) console.error('Erro ao enviar ping no mapa pelos canais realtime.');
    });`;
replaceRequired(oldPingWrite, newPingWrite, 'publicação redundante do ping');

// ── 6) SANIDADE ───────────────────────────────────────────────────────────────
for (const marker of [
  "left 32ms linear, top 32ms linear",
  'remoteMotionVersionRef',
  "channel: 'motion-v2'",
  "state.inFlight >= 4",
  "seq % 6",
  "battlemap_ping_live",
  "Promise.allSettled([",
]) {
  if (!src.includes(marker)) throw new Error(`Low-latency realtime patch incompleto: ${marker}`);
}
if (src.includes('left 88ms linear, top 88ms linear')) throw new Error('Low-latency realtime patch: atraso visual antigo ainda presente.');
if (src.includes('state.busy = true;')) throw new Error('Low-latency realtime patch: writer serial antigo ainda presente.');

fs.writeFileSync(battleFile, src);
console.log('Dinastia E: movimento e ping em canal low-latency, latest-only e sem espera serial por RTT.');
