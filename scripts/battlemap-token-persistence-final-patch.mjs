import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let src = fs.readFileSync(file, 'utf8');
const must = (ok, message) => { if (!ok) throw new Error(`Battlemap token persistence: ${message}`); };

// Firestore snapshots already provide ordering for a document. Comparing
// Date.now() values from different browsers caused a client with a fast clock
// to reject legitimate token updates from another player.
const archiveStart = src.indexOf("    const u1b = onSnapshot(collection(db, 'battlemap_tokens'), snap => {");
const archiveEnd = src.indexOf("\n    // Canal leve de sincronização ao vivo.", archiveStart);
must(archiveStart >= 0 && archiveEnd > archiveStart, 'listener canônico não encontrado');
const archiveListener = `    const u1b = liveSnapshot(collection(db, 'battlemap_tokens'), { includeMetadataChanges: true }, snap => {
      const incoming = {};
      const records = {};
      const deletedByMap = {};
      snap.docs.forEach(entry => {
        const data = entry.data() || {};
        if (data.recordType === 'token-v2' && data.mapId && data.tokenId) {
          (records[String(data.mapId)] ||= []).push(data);
          if (!entry.metadata.hasPendingWrites && !entry.metadata.fromCache) tokenOutbox.acknowledge(data);
        } else if (Array.isArray(data.tokens)) {
          deletedByMap[String(entry.id)] = (data.deletedTokenIds || []).map(String);
          incoming[String(entry.id)] = data.tokens.filter(token => !(data.deletedTokenIds || []).map(String).includes(String(token.id)));
        }
      });
      setMapTokens(prev => {
        const next = { ...prev };
        for (const mapId of new Set([...Object.keys(incoming), ...Object.keys(records)])) {
          const legacy = new Map((prev[mapId] || []).map(token => [String(token.id), token]));
          for (const token of incoming[mapId] || []) legacy.set(String(token.id), token);
          for (const id of deletedByMap[mapId] || []) legacy.delete(id);
          const tokens = resolveTokenRoster([...legacy.values()], records[mapId] || [], tokenOutbox.operations(mapId));
          next[mapId] = mergeIncomingTokenState(mapId, tokens, prev[mapId] || []);
        }
        mapTokensRef.current = next;
        return next;
      });
    }, error => console.error('Erro no realtime canônico dos tokens:', error));`;
src = src.slice(0, archiveStart) + archiveListener + src.slice(archiveEnd);

const liveStart = src.indexOf("    const uLive = onSnapshot(doc(db, 'config', 'battlemap_live_tokens'), snap => {");
const liveEnd = src.indexOf("\n\n    const activeMapRef", liveStart);
must(liveStart >= 0 && liveEnd > liveStart, 'listener transitório não encontrado');
const liveListener = `    const uLive = onSnapshot(doc(db, 'config', 'battlemap_live_tokens'), snap => {
      if (!snap.exists()) return;
      const data = snap.data() || {};
      if (!data.mapId || !Array.isArray(data.tokens)) return;
      const mapId = String(data.mapId);
      // O canal leve serve para movimento/boot. Nunca substitui um documento
      // canônico já recebido, evitando que um snapshot antigo faça inimigos
      // desaparecerem para os demais jogadores.
      setMapTokens(prev => {
        if (Object.prototype.hasOwnProperty.call(prev, mapId)) return prev;
        const next = { ...prev, [mapId]: data.tokens };
        mapTokensRef.current = next;
        return next;
      });
    }, error => console.error('Erro no canal ao vivo dos tokens:', error));`;
src = src.slice(0, liveStart) + liveListener + src.slice(liveEnd);

// A recuperação de foco não deve trocar a tela por uma cópia local atrasada.
const refreshBlock = `        if (tokenSnap.exists()) {
          const d = tokenSnap.data() || {};
          setMapTokens(prev => { const next = { ...prev, [String(activeId)]: Array.isArray(d.tokens) ? d.tokens : [] }; mapTokensRef.current = next; return next; });
        }`;
const safeRefreshBlock = `        if (tokenSnap.exists()) {
          const d = tokenSnap.data() || {};
          const tokens = Array.isArray(d.tokens) ? d.tokens : [];
          setMapTokens(prev => {
            const next = { ...prev, [String(activeId)]: tokens };
            mapTokensRef.current = next;
            return next;
          });
        }`;
src = src.replace(refreshBlock, safeRefreshBlock);

for (const marker of ['Erro no realtime canônico dos tokens:', 'Nunca substitui um documento', 'Object.prototype.hasOwnProperty.call(prev, mapId)']) {
  must(src.includes(marker), `marcador ausente: ${marker}`);
}
if (src.includes('incomingTs < knownTs') || src.includes('incomingTs >= knownTs')) {
  throw new Error('comparação por relógio local ainda presente no listener de tokens');
}
// A stale participant must never erase tokens absent from its local list.
src = `import { tokenChanges, resolveTokenRoster, tokenOutbox } from '../../adventure/tokenPersistence.mjs';\n` + src;
const stateAnchor = '  const [mapTokens, setMapTokens] = useState({});';
must(src.includes(stateAnchor), 'estado tokens ausente');
src = src.replace(stateAnchor, `${stateAnchor}\n  const [, setTokenSyncRevision] = useState(0);\n  useEffect(() => tokenOutbox.subscribe(() => setTokenSyncRevision(value => value + 1)), []);`);
src = src.replace("tokens: mapTokens[String(currentMapRaw.id)] || []", "tokens: resolveTokenRoster(mapTokens[String(currentMapRaw.id)] || [], [], tokenOutbox.operations(currentMapRaw.id))");
const writerStart = src.indexOf('  const writeLiveTokens = async');
const writerEnd = src.indexOf('\n  const writeLivePosition', writerStart);
must(writerStart >= 0 && writerEnd > writerStart, 'writer ausente');
src = src.slice(0, writerStart) + `  const writeLiveTokens = async (mapId, tokens, persistArchive = false, removedIds = []) => {
    if (!persistArchive) return true;
    const write = (key, record) => {
      const baseline = (mapTokensRef.current[record.mapId] || []).find(token => String(token.id) === record.tokenId) || {};
      return runTransaction(db, async transaction => {
        const ref = doc(db, 'battlemap_tokens', key);
        const snapshot = await transaction.get(ref);
        // First touch copies the legacy token once; later writes carry only the
        // changed fields, so movement never resends all other tokens or photos.
        const token = !snapshot.exists() && !record.deleted ? { ...baseline, ...record.token } : record.token;
        transaction.set(ref, { ...record, token }, { merge: true });
      });
    };
    try {
      await Promise.all([
        ...tokens.map(token => tokenOutbox.enqueue(mapId, token.id, token, false, write)),
        ...removedIds.map(id => tokenOutbox.enqueue(mapId, id, { id }, true, write)),
      ]);
    } catch (error) {
      console.error('battlemap-token-write-failed', { mapId: String(mapId), code: error?.code, message: error?.message });
      pushToast('Token ainda não salvo. A tentativa permanece no mapa; use Tentar novamente.', '\\u26A0', '#E8A020');
      throw error;
    }
    return true;
  };
` + src.slice(writerEnd);
const deleteStart = src.indexOf('  const deleteToken = id => {');
const deleteEnd = src.indexOf('\n  const onTokenPointerDown', deleteStart);
must(deleteStart >= 0 && deleteEnd > deleteStart, 'delete ausente');
src = src.slice(0, deleteStart) + `  const deleteToken = id => {
    if (!currentMap || !masterMode) return;
    const mapId = String(currentMap.id);
    const tokens = (mapTokensRef.current[mapId] || currentMap.tokens || []).filter(token => String(token.id) !== String(id));
    mapTokensRef.current = { ...mapTokensRef.current, [mapId]: tokens };
    setMapTokens(prev => ({ ...prev, [mapId]: tokens }));
    writeLiveTokens(mapId, [], true, [String(id)]).catch(error => {
      console.error('Erro ao excluir token:', error);
      pushToast('Não foi possível excluir o token. Tente novamente.', '\\u26A0', '#E8193C');
    });
    if (selectedId === id) setSelectedId(null);
  };
` + src.slice(deleteEnd);
// Collection snapshots are authoritative; an overlapping one-shot read can
// resolve after a newer snapshot and rewind the roster every eight seconds.
const refreshStart = src.indexOf('        if (tokenSnap.exists()) {');
const refreshEnd = src.indexOf('\n      } catch (_) {}', refreshStart);
must(refreshStart >= 0 && refreshEnd > refreshStart, 'refresh ausente');
src = src.slice(0, refreshStart) + src.slice(refreshEnd);
src = src.replace('const [mapSnap, tokenSnap, activeSnap]', 'const [mapSnap, activeSnap]')
  .replace("          getDocFromServer(doc(db, 'battlemap_tokens', String(activeId))),\n", '');
// Register intent immediately, before a snapshot or another rapid click runs.
const persistStart = src.indexOf('  const persistTokens = (mapId, tokens) => {');
const persistEnd = src.indexOf('\n  const updCurrentMap', persistStart);
must(persistStart >= 0 && persistEnd > persistStart, 'persist ausente');
src = src.slice(0, persistStart) + `  const persistTokens = (mapId, tokens) => {
    writeLiveTokens(mapId, tokens, true).catch(() => {});
  };
` + src.slice(persistEnd);
src = src.replace(`      setMapTokens(prev => ({ ...prev, [String(currentMap.id)]: updated.tokens }));
      persistTokens(currentMap.id, updated.tokens);`, `      const changes = tokenChanges(currentMap.tokens || [], updated.tokens);
      mapTokensRef.current = { ...mapTokensRef.current, [String(currentMap.id)]: updated.tokens };
      setMapTokens(prev => ({ ...prev, [String(currentMap.id)]: updated.tokens }));
      persistTokens(currentMap.id, changes);`);
src = src.replace('await writeLiveTokens(currentMap.id,tokens,true);', 'await writeLiveTokens(currentMap.id,[token],true);');
src = src.replace('writeLiveTokens(mapId, latestTokens, true)', 'writeLiveTokens(mapId, token ? [{ id: token.id, rotation: token.rotation || 0 }] : [], true)');
src = src.replace('writeLiveTokens(mapIdAtDragStart, latestTokens, true)', 'writeLiveTokens(mapIdAtDragStart, movedToken ? [{ id: movedToken.id, x: movedToken.x, y: movedToken.y }] : [], true)');
const libraryAnchor = '          {showTokenLibrary && masterMode && currentMap && (';
must(src.includes(libraryAnchor), 'anchor status ausente');
src = src.replace(libraryAnchor, `          {currentMap && tokenOutbox.status(currentMap.id).count > 0 && (
            <div role="status" style={{position:'absolute',bottom:12,left:12,zIndex:45,padding:'8px 12px',borderRadius:8,background:'#10121b',color:tokenOutbox.status(currentMap.id).failed?'#E8A020':'#C8A8E8',fontSize:12}}>
              {tokenOutbox.status(currentMap.id).failed ? 'Há tokens aguardando gravação.' : 'Sincronizando tokens...'}
              {tokenOutbox.status(currentMap.id).failed && <button onClick={() => tokenOutbox.retry(currentMap.id).catch(() => {})} style={{marginLeft:10,padding:'6px 10px',cursor:'pointer'}}>Tentar novamente</button>}
            </div>
          )}
${libraryAnchor}`);
// Once a token has an independent record, deleting a legacy map removes those
// records too. This only runs for an explicit existing map-delete action.
const mapDeleteAnchor = "    await deleteDoc(doc(db, 'battlemap_tokens', String(id))).catch(() => {});";
src = src.replace(mapDeleteAnchor, `${mapDeleteAnchor}\n    const rows = await getDocs(query(collection(db, 'battlemap_tokens'), where('mapId', '==', String(id))));\n    await Promise.all(rows.docs.map(row => deleteDoc(row.ref)));`);
src = src.replace('collection,deleteDoc,doc,getDocFromServer,', 'collection,deleteDoc,doc,getDocFromServer,getDocs,runTransaction,');
must(src.includes('const changes = tokenChanges'), 'intent diff não aplicado');
fs.writeFileSync(file, src);
console.log('Dinastia E: tokens canônicos sem bloqueio por relógio local e sem sobrescrita por replay transitório.');
