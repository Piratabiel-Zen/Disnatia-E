import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const battleFile = path.join(root, 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
const cssFile = path.join(root, 'src', 'experience', 'game-experience-3.css');
const must = (condition, message) => {
  if (!condition) throw new Error(`BattleMap direct realtime fix: ${message}`);
};

let battle = fs.readFileSync(battleFile, 'utf8');

// Eventos transitórios não passam pelo pool de snapshots. O pool é ótimo para
// coleções pesadas e estáveis, mas uma assinatura reaproveitada pode entregar um
// primeiro snapshot já armazenado quando a tela do mapa remonta. Para movimento
// e ping isso fazia o receptor tratar uma ação recém-chegada como bootstrap.
const firestoreImport = 'import { collection,deleteDoc,doc,getDocFromServer,query,setDoc,where } from "firebase/firestore";';
const firestoreImportWithLive = 'import { collection,deleteDoc,doc,getDocFromServer,onSnapshot as liveSnapshot,query,setDoc,where } from "firebase/firestore";';
if (!battle.includes(firestoreImportWithLive)) {
  must(battle.includes(firestoreImport), 'import do Firestore não encontrado');
  battle = battle.replace(firestoreImport, firestoreImportWithLive);
}

const pingStart = battle.indexOf('  useEffect(() => {\n    let configPrimed = false;');
const pingEndMarker = '\n\n  useEffect(() => { mapsRef.current = maps; }, [maps]);';
const pingEnd = battle.indexOf(pingEndMarker, pingStart);
must(pingStart >= 0 && pingEnd > pingStart, 'listener de ping não encontrado');

const pingEffect = `  useEffect(() => {
    const subscribedAt = Date.now();
    let configPrimed = false;
    let feedPrimed = false;
    const seenPingIds = new Set();

    const remember = id => {
      if (!id) return;
      seenPingIds.add(id);
      if (seenPingIds.size > 80) {
        const recent = Array.from(seenPingIds).slice(-40);
        seenPingIds.clear();
        recent.forEach(value => seenPingIds.add(value));
      }
    };

    const isFreshAtSubscribe = row => {
      const createdAt = Number(row?.publishedAt || row?.createdAt || 0);
      if (!createdAt) return false;
      const age = subscribedAt - createdAt;
      return age >= -30000 && age <= 6500;
    };

    const receivePing = row => {
      const id = String(row?.id || '');
      if (!id || seenPingIds.has(id)) return;
      remember(id);
      setBattlePing(row);
      clearTimeout(pingTimerRef.current);
      pingTimerRef.current = setTimeout(() => setBattlePing(null), 5200);
    };

    // Assinaturas diretas: ações efêmeras nunca reutilizam um snapshot guardado
    // por outra montagem da tela.
    const uConfig = liveSnapshot(doc(db,'config','battlemap_ping'), snap => {
      if (!snap.exists()) return;
      const row = snap.data() || {};
      if (!configPrimed) {
        configPrimed = true;
        if (isFreshAtSubscribe(row)) receivePing(row);
        else remember(String(row.id || ''));
        return;
      }
      receivePing(row);
    }, error => console.error('Erro no canal direto do ping:', error));

    const uFeed = liveSnapshot(collection(db,'battlemap_ping_live'), snap => {
      if (!feedPrimed) {
        feedPrimed = true;
        const initialRows = snap.docs.map(entry => entry.data() || {});
        const freshest = initialRows
          .filter(isFreshAtSubscribe)
          .sort((a, b) => Number(b.publishedAt || b.createdAt || 0) - Number(a.publishedAt || a.createdAt || 0))[0];
        initialRows.forEach(row => {
          if (!freshest || String(row.id || '') !== String(freshest.id || '')) remember(String(row.id || ''));
        });
        if (freshest) receivePing(freshest);
        return;
      }
      snap.docChanges().forEach(change => {
        if (change.type !== 'removed') receivePing(change.doc.data() || {});
      });
    }, error => console.error('Erro no canal direto rápido do ping:', error));

    return () => {
      uConfig();
      uFeed();
      clearTimeout(pingTimerRef.current);
    };
  }, []);`;

battle = battle.slice(0, pingStart) + pingEffect + battle.slice(pingEnd);

const positionListener = "    const unsub = onSnapshot(positionsQuery, snap => {";
must(battle.includes(positionListener), 'listener de posições não encontrado');
battle = battle.replace(
  positionListener,
  "    // Movimento usa transporte direto, como o dado 3D compartilhado.\n    const unsub = liveSnapshot(positionsQuery, snap => {",
);

for (const marker of [
  'onSnapshot as liveSnapshot',
  "liveSnapshot(doc(db,'config','battlemap_ping')",
  "liveSnapshot(collection(db,'battlemap_ping_live')",
  'const unsub = liveSnapshot(positionsQuery',
  'isFreshAtSubscribe',
  "channel: 'motion-v2'",
  "channel: 'position-final-v1'",
]) must(battle.includes(marker), `BattleMap final sem ${marker}`);

fs.writeFileSync(battleFile, battle);

let css = fs.readFileSync(cssFile, 'utf8');
const cssMarker = '/* QUICK PORTRAIT CLEANUP · 2026-09-24 */';
if (!css.includes(cssMarker)) {
  css += `\n\n${cssMarker}
/* A foto continua intacta; apenas a miniatura ornamental que cobria o rosto
   sai do botão da ficha rápida e do cabeçalho aberto por ele. */
.g3-action-character .g3-portrait[data-classe]::before,
.g3-action-character .g3-portrait[data-classe]::after,
.g3-sheet-hero .g3-portrait[data-classe]::before,
.g3-sheet-hero .g3-portrait[data-classe]::after{content:none!important;display:none!important;background-image:none!important;box-shadow:none!important}
.g3-action-character .g3-portrait[data-classe],
.g3-sheet-hero .g3-portrait[data-classe]{overflow:hidden!important;border-radius:50%!important}
`;
  fs.writeFileSync(cssFile, css);
}

console.log('Dinastia E: tokens e pings usam receptor Firestore direto; primeiro ping preservado e ornamento da ficha rápida removido.');
