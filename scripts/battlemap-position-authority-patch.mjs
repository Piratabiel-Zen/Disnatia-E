import fs from 'node:fs';
import path from 'node:path';

const battleFile = path.join(process.cwd(), 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let src = fs.readFileSync(battleFile, 'utf8');

function replaceRequired(before, after, label) {
  if (src.includes(after)) return;
  if (!src.includes(before)) throw new Error(`BattleMap position authority patch falhou: ${label}`);
  src = src.replace(before, after);
}

replaceRequired(
  `  const remotePositionQueueRef = useRef(new Map());
  const remotePositionFrameRef = useRef(0);
  const activeMapRevisionRef = useRef(0);
  useEffect(() => { mapTokensRef.current = mapTokens; }, [mapTokens]);`,
  `  const remotePositionQueueRef = useRef(new Map());
  const remotePositionFrameRef = useRef(0);
  const authoritativePositionRef = useRef({});
  const activeMapRevisionRef = useRef(0);

  const mergeIncomingTokenState = (mapId, incomingTokens, previousTokens = []) => {
    const id = String(mapId);
    const prevById = new Map((previousTokens || []).map(token => [String(token.id), token]));
    return (incomingTokens || []).map(token => {
      const tid = String(token.id);
      const live = authoritativePositionRef.current[\`${'${id}:${tid}'}\`];
      const previous = prevById.get(tid);
      if (live && Number.isFinite(live.x) && Number.isFinite(live.y)) {
        return { ...token, x: live.x, y: live.y };
      }
      if (previous && Number.isFinite(Number(previous.x)) && Number.isFinite(Number(previous.y))) {
        return { ...token, x: Number(previous.x), y: Number(previous.y) };
      }
      return token;
    });
  };

  useEffect(() => { mapTokensRef.current = mapTokens; }, [mapTokens]);`,
  'ref e merge autoritativo de posições'
);

const archiveStart = src.indexOf("    const u1b = onSnapshot(collection(db, 'battlemap_tokens'), snap => {");
const archiveEnd = src.indexOf("\n    // Canal leve de sincronização ao vivo.", archiveStart);
if (archiveStart < 0 || archiveEnd < 0) throw new Error('BattleMap position authority patch: listener battlemap_tokens não encontrado.');
const archiveListener = `    const u1b = onSnapshot(collection(db, 'battlemap_tokens'), snap => {
      const incomingByMap = {};
      snap.docs.forEach(d => {
        const data = d.data() || {};
        const mapId = String(d.id);
        const incomingTs = Number(data.updatedAt || 0);
        const knownTs = Number(liveTokenVersionRef.current[mapId] || 0);
        if (incomingTs >= knownTs) {
          incomingByMap[mapId] = Array.isArray(data.tokens) ? data.tokens : [];
          liveTokenVersionRef.current[mapId] = incomingTs;
        }
      });
      if (Object.keys(incomingByMap).length) {
        setMapTokens(prev => {
          const next = { ...prev };
          for (const [mapId, incomingTokens] of Object.entries(incomingByMap)) {
            next[mapId] = mergeIncomingTokenState(mapId, incomingTokens, prev[mapId] || []);
          }
          mapTokensRef.current = next;
          return next;
        });
      }
    });`;
src = src.slice(0, archiveStart) + archiveListener + src.slice(archiveEnd);

const legacyLiveStart = src.indexOf("    const uLive = onSnapshot(doc(db, 'config', 'battlemap_live_tokens'), snap => {");
const legacyLiveEnd = src.indexOf("\n\n    const activeMapRef", legacyLiveStart);
if (legacyLiveStart < 0 || legacyLiveEnd < 0) throw new Error('BattleMap position authority patch: listener battlemap_live_tokens não encontrado.');
const legacyLiveListener = `    const uLive = onSnapshot(doc(db, 'config', 'battlemap_live_tokens'), snap => {
      if (!snap.exists()) return;
      const data = snap.data() || {};
      if (!data.mapId || !Array.isArray(data.tokens)) return;
      const mapId = String(data.mapId);
      const incomingTs = Number(data.updatedAt || 0);
      const knownTs = Number(liveTokenVersionRef.current[mapId] || 0);
      if (incomingTs < knownTs) return;
      liveTokenVersionRef.current[mapId] = incomingTs;
      setMapTokens(prev => {
        const merged = mergeIncomingTokenState(mapId, data.tokens, prev[mapId] || []);
        const next = { ...prev, [mapId]: merged };
        mapTokensRef.current = next;
        return next;
      });
    });`;
src = src.slice(0, legacyLiveStart) + legacyLiveListener + src.slice(legacyLiveEnd);

replaceRequired(
  `        const x = Number(data.x);
        const y = Number(data.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        remotePositionQueueRef.current.set(tokenId, { x, y });`,
  `        const x = Number(data.x);
        const y = Number(data.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        authoritativePositionRef.current[\`${'${currentMapId}:${tokenId}'}\`] = { x, y };
        remotePositionQueueRef.current.set(tokenId, { x, y });`,
  'registro autoritativo de snapshot remoto'
);

replaceRequired(
  `    const state = livePositionWriteStateRef.current[key] || { busy: false, pending: null };`,
  `    authoritativePositionRef.current[key] = { x: px, y: py };
    const state = livePositionWriteStateRef.current[key] || { busy: false, pending: null };`,
  'registro autoritativo de posição local'
);

replaceRequired(
  `    let lastFallbackWrite = 0;

    const throttledTokenWrite = (tokensArr) => {`,
  `    const throttledTokenWrite = (tokensArr) => {`,
  'remoção do fallback de array inteiro'
);
replaceRequired(
  `        if (movedToken) writeLivePosition(mapIdAtDragStart, movedToken.id, movedToken.x, movedToken.y);
        if (now - lastFallbackWrite >= 600) { lastFallbackWrite = now; writeLiveTokens(mapIdAtDragStart, tokensArr, false).catch(() => {}); }`,
  `        if (movedToken) writeLivePosition(mapIdAtDragStart, movedToken.id, movedToken.x, movedToken.y);`,
  'remoção de writeLiveTokens durante movimento'
);

const upStartForFinal = src.indexOf('    const up = () => {');
const latestStart = src.indexOf('      const latestTokens = mapTokensRef.current[', upStartForFinal);
const movedCheckStart = src.indexOf('      if (!moved.current)', latestStart);
if (upStartForFinal < 0 || latestStart < 0 || movedCheckStart < 0) {
  throw new Error('BattleMap position authority patch: bloco final do drag não encontrado.');
}
const finalPositionBlock = `      const latestTokens = mapTokensRef.current[String(mapIdAtDragStart)];
      if (latestTokens) {
        const movedToken = latestTokens.find(t => String(t.id) === String(draggingId));
        if (movedToken) writeLivePosition(mapIdAtDragStart, movedToken.id, movedToken.x, movedToken.y);
        lastTokenWriteRef.current[mapIdAtDragStart] = Date.now();
        writeLiveTokens(mapIdAtDragStart, latestTokens, true).catch(e => console.error(e));
      }
`;
src = src.slice(0, latestStart) + finalPositionBlock + src.slice(movedCheckStart);

replaceRequired(
  `        if (tokenSnap.exists()) {
          const d = tokenSnap.data() || {};
          setMapTokens(prev => { const next = { ...prev, [String(activeId)]: Array.isArray(d.tokens) ? d.tokens : [] }; mapTokensRef.current = next; return next; });
        }`,
  `        if (tokenSnap.exists()) {
          const d = tokenSnap.data() || {};
          const incomingTokens = Array.isArray(d.tokens) ? d.tokens : [];
          setMapTokens(prev => {
            const mapId = String(activeId);
            const merged = mergeIncomingTokenState(mapId, incomingTokens, prev[mapId] || []);
            const next = { ...prev, [mapId]: merged };
            mapTokensRef.current = next;
            return next;
          });
        }`,
  'refresh sem rollback de posição'
);

replaceRequired(
  `    const heartbeat = setInterval(refreshActiveState, 15000);
    return () => { clearInterval(heartbeat); window.removeEventListener('online', refreshActiveState); window.removeEventListener('focus', refreshActiveState); document.removeEventListener('visibilitychange', onVisible); };`,
  `    return () => { window.removeEventListener('online', refreshActiveState); window.removeEventListener('focus', refreshActiveState); document.removeEventListener('visibilitychange', onVisible); };`,
  'remoção do polling periódico de posição'
);

for (const marker of ['authoritativePositionRef', 'mergeIncomingTokenState', 'writeLivePosition(mapIdAtDragStart, movedToken.id, movedToken.x, movedToken.y);']) {
  if (!src.includes(marker)) throw new Error(`BattleMap position authority patch incompleto: ${marker}`);
}
if (src.includes('lastFallbackWrite')) throw new Error('Fallback de array inteiro ainda presente durante drag.');
if (src.includes('setInterval(refreshActiveState, 15000)')) throw new Error('Polling antigo de 15s ainda presente.');

fs.writeFileSync(battleFile, src);
console.log('Dinastia E: posição do token agora tem autoridade única por-token, sem rollback por arrays antigos.');
