import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  const next = source.replace(before, after);
  if (next === source) throw new Error(`Global realtime patch falhou: ${label}`);
  return next;
}

// ── 1) DADOS: publica diretamente no feed compartilhado ───────────────────
// Antes o feed durável dependia do onSnapshot do próprio navegador que rolou
// o dado detectar hasPendingWrites e então espelhar o evento. Agora a função
// de publicação grava o evento diretamente no feed, além dos documentos de
// compatibilidade já existentes.
const combatFile = path.join(root, 'src', 'core', 'combatEvents.js');
let combat = fs.readFileSync(combatFile, 'utf8');
combat = replaceRequired(
  combat,
  `  const writes = await Promise.allSettled([\n    setDoc(doc(db, 'config', 'public_dice_roll'), payload),\n    setDoc(doc(db, 'config', 'combat_dice'), payload),\n  ]);`,
  `  const writes = await Promise.allSettled([\n    setDoc(doc(db, 'config', 'public_dice_roll'), payload),\n    setDoc(doc(db, 'config', 'combat_dice'), payload),\n    setDoc(doc(db, 'public_dice_events', String(payload.rollId)), { ...payload, publishedAt: Date.now() }, { merge: true }),\n  ]);`,
  'publicação direta no feed de dados'
);
fs.writeFileSync(combatFile, combat);

// ── 2) BROADCAST GLOBAL: não usa relógio local para rejeitar eventos ───────
const broadcastsFile = path.join(root, 'src', 'experience', 'RealtimeBroadcasts.jsx');
let broadcasts = fs.readFileSync(broadcastsFile, 'utf8');

const hookStart = broadcasts.indexOf('function useDurableChannel({ configId, collectionName, kind, ttl }) {');
const legacyBoundary = broadcasts.indexOf('\n\nfunction DiceBroadcastCard', hookStart);
const replayBoundary = broadcasts.indexOf('\n\nfunction DiceBroadcastQueue', hookStart);
const hookEnd = [legacyBoundary, replayBoundary].filter(index => index >= 0).sort((a,b) => a-b)[0] ?? -1;
if (hookStart < 0 || hookEnd < 0) {
  throw new Error('Global realtime patch: hook useDurableChannel não encontrado.');
}

const durableHook = `function useDurableChannel({ configId, collectionName, kind, ttl }) {
  const [events, setEvents] = useState([]);
  const seenRef = useRef(new Set());
  const configPrimedRef = useRef(false);
  const feedPrimedRef = useRef(false);

  const rememberSeen = useCallback((id) => {
    if (!id) return;
    seenRef.current.add(id);
    if (seenRef.current.size > 300) {
      const recent = Array.from(seenRef.current).slice(-180);
      seenRef.current = new Set(recent);
    }
  }, []);

  const ingest = useCallback((payload) => {
    if (!payload) return;
    const id = eventId(payload, kind);
    if (!id || seenRef.current.has(id)) return;

    rememberSeen(id);
    const row = { ...payload, _rtId: id, _receivedAt: Date.now() };
    setEvents(prev => [...prev, row].sort((a,b) => Number(a._receivedAt||0)-Number(b._receivedAt||0)).slice(-40));

    // O tempo de exibição passa a contar a partir do RECEBIMENTO neste cliente.
    // Assim um relógio local adiantado/atrasado não descarta um evento válido.
    setTimeout(() => {
      setEvents(prev => prev.filter(item => item._rtId !== id));
    }, ttl);
  }, [kind, rememberSeen, ttl]);

  useEffect(() => {
    configPrimedRef.current = false;
    feedPrimedRef.current = false;

    const configRef = doc(db, 'config', configId);
    const feedQuery = query(collection(db, collectionName), orderBy('ts', 'desc'), limit(20));

    const unsubConfig = onSnapshot(configRef, { includeMetadataChanges: true }, snap => {
      if (!snap.exists()) return;
      const payload = snap.data() || {};
      const id = eventId(payload, kind);

      // A primeira leitura pode vir do cache persistente e conter um evento antigo.
      // Apenas semeamos o ID; alterações posteriores são sempre processadas.
      if (!configPrimedRef.current) {
        configPrimedRef.current = true;
        if (id) rememberSeen(id);
        return;
      }

      ingest(payload);

      // Mantém a ponte para versões antigas, mas ela não é mais necessária para
      // rolagens novas porque publishDiceResult grava o feed diretamente.
      if (snap.metadata.hasPendingWrites && id) {
        setDoc(doc(db, collectionName, id), {
          ...payload,
          mirroredAt: Date.now(),
        }, { merge: true }).catch(error => console.error('Falha ao espelhar evento realtime:', error));
      }
    }, error => console.error('Falha no canal realtime config:', configId, error));

    const unsubFeed = onSnapshot(feedQuery, snap => {
      if (!feedPrimedRef.current) {
        feedPrimedRef.current = true;
        snap.docs.forEach(d => rememberSeen(eventId({ _feedId: d.id, ...(d.data() || {}) }, kind)));
        return;
      }

      snap.docChanges().forEach(change => {
        if (change.type === 'removed') return;
        ingest({ _feedId: change.doc.id, ...(change.doc.data() || {}) });
      });
    }, error => console.error('Falha no feed realtime:', collectionName, error));

    return () => { unsubConfig(); unsubFeed(); };
  }, [collectionName, configId, ingest, kind, rememberSeen]);

  return events;
}`;

broadcasts = broadcasts.slice(0, hookStart) + durableHook + broadcasts.slice(hookEnd);
fs.writeFileSync(broadcastsFile, broadcasts);

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
  [combat, "public_dice_events', String(payload.rollId)", 'publicação direta de dados'],
  [broadcasts, '_receivedAt: Date.now()', 'TTL por recebimento'],
  [broadcasts, 'snap.docChanges().forEach', 'feed incremental'],
  [publicDice, 'dicePrimedRef', 'overlay sem relógio absoluto'],
  [battle, 'lastRemotePingId', 'ping global deduplicado'],
  [battle, 'setTimeout(() => setBattlePing(null), 5200)', 'vida local do ping'],
]) {
  if (!source.includes(marker)) throw new Error(`Global realtime patch incompleto: ${label}`);
}

if (battle.includes('age > 6500')) throw new Error('Global realtime patch: TTL antigo do ping ainda existe.');
if (broadcasts.includes('Date.now() - ts > ttl')) throw new Error('Global realtime patch: TTL antigo de broadcast ainda existe.');
if (publicDice.includes('Date.now() - d.ts > 12000')) throw new Error('Global realtime patch: TTL antigo do overlay ainda existe.');

console.log('Dinastia E: realtime global reforçado para ping, dados e broadcasts sem dependência do relógio local.');
