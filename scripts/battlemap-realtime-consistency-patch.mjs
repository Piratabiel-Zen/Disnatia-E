import fs from 'node:fs';
import path from 'node:path';

const battleFile = path.join(process.cwd(), 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let src = fs.readFileSync(battleFile, 'utf8');

// A sincronização estrutural não pode depender de Date.now() gerado em máquinas
// diferentes. Um relógio local adiantado fazia atualizações legítimas de outro
// jogador serem rejeitadas indefinidamente. O Firestore passa a ser a autoridade
// de ordenação para o documento canônico battlemap_tokens.
const archiveStart = src.indexOf("    const u1b = onSnapshot(collection(db, 'battlemap_tokens'), snap => {");
const archiveEnd = src.indexOf("\n    // Canal leve de sincronização ao vivo.", archiveStart);
if (archiveStart < 0 || archiveEnd < 0) {
  throw new Error('Realtime consistency patch: listener battlemap_tokens não encontrado.');
}

const canonicalListener = `    const u1b = onSnapshot(collection(db, 'battlemap_tokens'), snap => {
      const incomingByMap = {};
      snap.docs.forEach(d => {
        const data = d.data() || {};
        const mapId = String(d.id);
        incomingByMap[mapId] = Array.isArray(data.tokens) ? data.tokens : [];
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
    }, error => console.error('Erro no realtime canônico dos tokens:', error));`;

src = src.slice(0, archiveStart) + canonicalListener + src.slice(archiveEnd);

// O canal legado continua apenas como compatibilidade de bootstrap. Depois que o
// mapa já existe localmente, ele não pode sobrescrever o estado canônico com uma
// cópia atrasada que chegou por outro documento.
const legacyStart = src.indexOf("    const uLive = onSnapshot(doc(db, 'config', 'battlemap_live_tokens'), snap => {");
const legacyEnd = src.indexOf("\n\n    const activeMapRef", legacyStart);
if (legacyStart < 0 || legacyEnd < 0) {
  throw new Error('Realtime consistency patch: listener legado não encontrado.');
}

const legacyListener = `    const uLive = onSnapshot(doc(db, 'config', 'battlemap_live_tokens'), snap => {
      if (!snap.exists()) return;
      const data = snap.data() || {};
      if (!data.mapId || !Array.isArray(data.tokens)) return;
      const mapId = String(data.mapId);
      setMapTokens(prev => {
        // battlemap_tokens é o canal autoritativo. O documento legado só semeia
        // clientes antigos/recém-abertos que ainda não receberam o mapa canônico.
        if (Object.prototype.hasOwnProperty.call(prev, mapId)) return prev;
        const merged = mergeIncomingTokenState(mapId, data.tokens, []);
        const next = { ...prev, [mapId]: merged };
        mapTokensRef.current = next;
        return next;
      });
    }, error => console.error('Erro no canal legado dos tokens:', error));`;

src = src.slice(0, legacyStart) + legacyListener + src.slice(legacyEnd);

// Movimento: seq só é comparável dentro da MESMA sessão de movimento. Em troca
// de origem, aceitamos imediatamente o novo escritor em vez de comparar relógios
// locais. Isso elimina o caso em que um PC alguns segundos adiantado "congela" o
// token para os demais clientes.
const clockGate = `      if (previous) {
        if (source === previous.source && seq && previous.seq && seq <= previous.seq) return false;
        // Só rejeita troca de origem quando o slot é claramente mais antigo. A
        // tolerância evita depender de relógios perfeitamente sincronizados.
        if (source !== previous.source && updatedAt && previous.updatedAt && updatedAt < previous.updatedAt - 1500) return false;
      }
      remoteMotionVersionRef.current[key] = { source, seq, updatedAt, receivedAt: performance.now() };`;

const noClockGate = `      if (previous && source === previous.source && seq && previous.seq && seq <= previous.seq) return false;
      remoteMotionVersionRef.current[key] = { source, seq, updatedAt, receivedAt: performance.now() };`;

if (!src.includes(clockGate)) {
  throw new Error('Realtime consistency patch: gate de relógio do movimento não encontrado.');
}
src = src.replace(clockGate, noClockGate);

// Reforço de recuperação: quando a aba volta ao foco, a conexão retorna ou a
// página volta a ficar visível, o estado canônico já é relido pela rotina existente.
// Adicionamos um pulso leve apenas enquanto a aba está visível para evitar que um
// websocket suspenso pelo navegador deixe a mesa congelada por muito tempo.
const refreshCleanup = `    return () => { window.removeEventListener('online', refreshActiveState); window.removeEventListener('focus', refreshActiveState); document.removeEventListener('visibilitychange', onVisible); };`;
const refreshWithHeartbeat = `    const realtimeHealthPulse = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) refreshActiveState();
    }, 8000);
    return () => { clearInterval(realtimeHealthPulse); window.removeEventListener('online', refreshActiveState); window.removeEventListener('focus', refreshActiveState); document.removeEventListener('visibilitychange', onVisible); };`;

if (src.includes(refreshCleanup)) {
  src = src.replace(refreshCleanup, refreshWithHeartbeat);
} else if (!src.includes('const realtimeHealthPulse = setInterval')) {
  throw new Error('Realtime consistency patch: ponto de recuperação de conexão não encontrado.');
}

for (const marker of [
  "Erro no realtime canônico dos tokens:",
  "Object.prototype.hasOwnProperty.call(prev, mapId)",
  "previous && source === previous.source",
  "realtimeHealthPulse",
]) {
  if (!src.includes(marker)) throw new Error(`Realtime consistency patch incompleto: ${marker}`);
}
if (src.includes('updatedAt < previous.updatedAt - 1500')) {
  throw new Error('Realtime consistency patch: comparação entre relógios ainda ativa no movimento.');
}
if (src.includes('incomingTs < knownTs') || src.includes('incomingTs >= knownTs')) {
  throw new Error('Realtime consistency patch: comparação entre relógios ainda ativa na estrutura dos tokens.');
}

fs.writeFileSync(battleFile, src);
console.log('Dinastia E: realtime consistente entre clientes, sem dependência de relógio local e com recuperação automática.');
