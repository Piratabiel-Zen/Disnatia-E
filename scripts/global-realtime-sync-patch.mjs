import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  const next = source.replace(before, after);
  if (next === source) throw new Error(`Global realtime patch falhou: ${label}`);
  return next;
}

// ── 1) DADOS: uma única escrita no feed durável ───────────────────────────
const combatFile = path.join(root, 'src', 'core', 'combatEvents.js');
let combat = fs.readFileSync(combatFile, 'utf8');
const fnStart = combat.indexOf('export async function publishDiceResult(');
const fnEnd = combat.indexOf('\n// Registra ação de habilidade', fnStart);
if (fnStart < 0 || fnEnd < 0) throw new Error('Global realtime patch: publishDiceResult não encontrado.');
const singleFeedFn = `export async function publishDiceResult(result) {
  const payload = {
    ...result,
    ts: result?.ts || Date.now(),
    rollId: result?.rollId || \`${Date.now()}_${Math.random().toString(36).slice(2, 9)}\`,
  };
  const writes = await Promise.allSettled([
    setDoc(doc(db, 'config', 'public_dice_roll'), payload, { merge: true }),
    setDoc(doc(db, 'public_dice_events', String(payload.rollId)), { ...payload, publishedAt: Date.now() }, { merge: true }),
  ]);
  if (writes.every(result => result.status === 'rejected')) {
    console.error('Não foi possível publicar a rolagem global.', writes);
  }
  return payload;
}`;
combat = combat.slice(0, fnStart) + singleFeedFn + combat.slice(fnEnd);
fs.writeFileSync(combatFile, combat);

// ── 2) BROADCAST GLOBAL: feed-only, sem metadata/pending-write ─────────────
const broadcastsFile = path.join(root, 'src', 'experience', 'RealtimeBroadcasts.jsx');
let broadcasts = fs.readFileSync(broadcastsFile, 'utf8');
if (!broadcasts.includes('function useDurableChannel({ collectionName, kind, ttl })')) {
  throw new Error('Global realtime patch: hook feed-only não encontrado.');
}
if (broadcasts.includes('includeMetadataChanges: true')) throw new Error('Global realtime patch: metadata listener duplicado ainda presente.');
if (broadcasts.includes('hasPendingWrites')) throw new Error('Global realtime patch: ponte por pending write ainda presente.');
if (broadcasts.includes("configId: 'public_dice_roll'")) throw new Error('Global realtime patch: config legado de dados ainda presente.');

// ── 3) OVERLAY LEGADO DO DADO: mesma regra, sem comparar relógios ──────────
const publicDiceFile = path.join(root, 'src', 'shell', 'PublicDiceOverlay.jsx');
let publicDice = fs.readFileSync(publicDiceFile, 'utf8');
publicDice = replaceRequired(
  publicDice,
  `  const hideTimer = useRef(null);`,
  `  const hideTimer = useRef(null);\n  const lastRollIdRef = useRef(null);\n  const dicePrimedRef = useRef(false);`,
  'refs do overlay público'
);
publicDice = replaceRequired(
  publicDice,
  `      const d = snap.data();\n      if (!d.ts || Date.now() - d.ts > 12000) return;\n      setResult(d);`,
  `      const d = snap.data();\n      const id = String(d.rollId || d.id || d.ts || '');\n      if (!dicePrimedRef.current) {\n        dicePrimedRef.current = true;\n        lastRollIdRef.current = id;\n        return;\n      }\n      if (!id || id === lastRollIdRef.current) return;\n      lastRollIdRef.current = id;\n      setResult(d);`,
  'remoção do TTL por relógio no overlay legado'
);
fs.writeFileSync(publicDiceFile, publicDice);

// ── 4) PING DO MAPA: todos recebem por alteração do documento, sem TTL ─────
const battleFile = path.join(root, 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let battle = fs.readFileSync(battleFile, 'utf8');

const oldPingEffect = `  useEffect(() => {\n    const unsub = onSnapshot(doc(db,'config','battlemap_ping'), snap => {\n      if (!snap.exists()) return;\n      const row = snap.data() || {};\n      const createdAt = Number(row.createdAt || 0);\n      const age = Date.now() - createdAt;\n      if (!row.id || age > 6500) { setBattlePing(null); return; }\n      setBattlePing(row);\n      clearTimeout(pingTimerRef.current);\n      pingTimerRef.current = setTimeout(() => setBattlePing(null), Math.max(500, 5200 - Math.max(0, age)));\n    });\n    return () => { unsub(); clearTimeout(pingTimerRef.current); };\n  }, []);`;

const newPingEffect = `  useEffect(() => {\n    let primed = false;\n    let lastRemotePingId = '';\n    const unsub = onSnapshot(doc(db,'config','battlemap_ping'), snap => {\n      if (!snap.exists()) return;\n      const row = snap.data() || {};\n      const id = String(row.id || '');\n      if (!primed) {\n        primed = true;\n        lastRemotePingId = id;\n        return;\n      }\n      if (!id || id === lastRemotePingId) return;\n      lastRemotePingId = id;\n      setBattlePing(row);\n      clearTimeout(pingTimerRef.current);\n      // O ping permanece 5,2s a partir do momento em que ESTE cliente recebeu.\n      // Nenhum jogador é excluído por diferença de relógio, cache ou latência.\n      pingTimerRef.current = setTimeout(() => setBattlePing(null), 5200);\n    }, error => console.error('Erro no realtime do ping do mapa:', error));\n    return () => { unsub(); clearTimeout(pingTimerRef.current); };\n  }, []);`;

battle = replaceRequired(
  battle,
  oldPingEffect,
  newPingEffect,
  'listener global do ping'
);
fs.writeFileSync(battleFile, battle);


// ── 5) Validações de build ─────────────────────────────────────────────────
for (const [source, marker, label] of [
  [combat, "public_dice_events', String(payload.rollId)", 'publicação única de dados'],
  [broadcasts, '_receivedAt: Date.now()', 'TTL por recebimento'],
  [broadcasts, 'snap.docChanges().forEach', 'feed incremental'],
  [publicDice, 'dicePrimedRef', 'overlay legado sem relógio absoluto'],
  [battle, 'lastRemotePingId', 'ping global deduplicado'],
  [battle, 'setTimeout(() => setBattlePing(null), 5200)', 'vida local do ping'],
]) {
  if (!source.includes(marker)) throw new Error(`Global realtime patch incompleto: ${label}`);
}
if (combat.includes("config', 'combat_dice'")) throw new Error('Global realtime patch: combat_dice legado ainda existe.');
if (!combat.includes("config', 'public_dice_roll'")) throw new Error('Global realtime patch: fallback compatível public_dice_roll ausente.');
if (battle.includes('age > 6500')) throw new Error('Global realtime patch: TTL antigo do ping ainda existe.');
if (broadcasts.includes('Date.now() - ts > ttl')) throw new Error('Global realtime patch: TTL antigo de broadcast ainda existe.');
if (publicDice.includes('Date.now() - d.ts > 12000')) throw new Error('Global realtime patch: TTL antigo do overlay ainda existe.');

console.log('Dinastia E: realtime global com dado em feed único, broadcast feed-only e ping sem relógio local.');
