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
const archiveListener = `    const u1b = onSnapshot(collection(db, 'battlemap_tokens'), snap => {
      const incoming = {};
      snap.docs.forEach(entry => {
        const data = entry.data() || {};
        incoming[String(entry.id)] = Array.isArray(data.tokens) ? data.tokens : [];
      });
      if (!Object.keys(incoming).length) return;
      setMapTokens(prev => {
        const next = { ...prev };
        for (const [mapId, tokens] of Object.entries(incoming)) {
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
src = src.replace('collection,deleteDoc,doc,getDocFromServer,', 'collection,deleteDoc,doc,getDocFromServer,runTransaction,');
const writerStart = src.indexOf('  const writeLiveTokens = async');
const writerEnd = src.indexOf('\n  const writeLivePosition', writerStart);
must(writerStart >= 0 && writerEnd > writerStart, 'writer ausente');
src = src.slice(0, writerStart) + `  const writeLiveTokens = async (mapId, tokens, persistArchive = false, removedIds = []) => {
    const id = String(mapId);
    if (!persistArchive) return true;
    await runTransaction(db, async transaction => {
      const ref = doc(db, 'battlemap_tokens', id);
      const snapshot = await transaction.get(ref);
      const data = snapshot.exists() ? snapshot.data() : {};
      const deleted = new Set([...(data.deletedTokenIds || []), ...removedIds].map(String));
      const merged = new Map((data.tokens || []).map(token => [String(token.id), token]));
      for (const token of tokens) {
        if (!deleted.has(String(token.id))) merged.set(String(token.id), token);
      }
      for (const tokenId of deleted) merged.delete(tokenId);
      transaction.set(ref, { ...data, tokens: [...merged.values()], deletedTokenIds: [...deleted], updatedAt: Date.now() });
    });
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
    writeLiveTokens(mapId, tokens, true, [String(id)]).catch(error => {
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
fs.writeFileSync(file, src);
console.log('Dinastia E: tokens canônicos sem bloqueio por relógio local e sem sobrescrita por replay transitório.');
