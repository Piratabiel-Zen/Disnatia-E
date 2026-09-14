import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const battleFile = path.join(root, 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
const cosmicFile = path.join(root, 'src', 'experience', 'CosmicLivingBackground.jsx');
const smoothFile = path.join(root, 'src', 'experience', 'performance-smooth.css');

const must = (ok, message) => {
  if (!ok) throw new Error(`Live drag/platform parity patch: ${message}`);
};

// ── 1) BATTLEMAP: canal espelho de movimento ao vivo ──────────────────────
// Mantemos intactos battlemap_tokens e position-final-v1. Este canal existe só
// durante o arraste para garantir que outros clientes enxerguem a mão do jogador
// mesmo se o listener/query de battlemap_live_positions sofrer atraso ou bloqueio.
let battle = fs.readFileSync(battleFile, 'utf8');
const LIVE_MARKER = 'BATTLEMAP LIVE DRAG MIRROR 2026-09-14';

must(battle.includes('const TOKEN_THROTTLE_MS = 33;'), 'cadência principal de ~30 Hz ausente');
must(battle.includes('state.inFlight >= 3'), 'fast-path de 3 writes ausente');
must(battle.includes("channel: 'position-final-v1'"), 'checkpoint durável final ausente');
must(battle.includes("channel: 'motion-v2'"), 'canal principal motion-v2 ausente');

if (!battle.includes(LIVE_MARKER)) {
  const writerStart = battle.indexOf('  const writeLivePosition = (mapId, tokenId, x, y) => {');
  const normalizeStart = battle.indexOf('\n\n  const normalizeTokenRotation =', writerStart);
  const persistStart = battle.indexOf('\n\n  const persistTokens =', writerStart);
  const writerEnd = normalizeStart >= 0 ? normalizeStart : persistStart;
  must(writerStart >= 0 && writerEnd > writerStart, 'writeLivePosition não encontrado');

  let writer = battle.slice(writerStart, writerEnd);
  const oldWrite = `      setDoc(doc(db, 'battlemap_live_positions', id + '_' + tid + '_p' + slot), {
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
        });`;

  const mirroredWrite = `      const motionPayload = {
        mapId: id,
        tokenId: tid,
        x: point.x,
        y: point.y,
        seq,
        motionSession: state.motionSession,
        channel: 'motion-v2',
        clientId: liveClientIdRef.current,
        updatedAt: Date.now(),
      };
      const mirrorSlot = seq % 6;
      const mirrorPayload = {
        ...motionPayload,
        channel: 'motion-mirror-v1',
        mirrorId: state.motionSession + '_' + seq,
      };

      const primaryWrite = setDoc(
        doc(db, 'battlemap_live_positions', id + '_' + tid + '_p' + slot),
        motionPayload,
        { merge: true }
      ).catch(error => {
        console.error('Erro ao transmitir posição no canal principal:', error);
        return false;
      });

      const mirrorWrite = setDoc(
        doc(db, 'config', 'battlemap_motion_' + mirrorSlot),
        mirrorPayload,
        { merge: true }
      ).catch(error => {
        console.error('Erro ao transmitir posição no canal espelho:', error);
        return false;
      });

      Promise.allSettled([primaryWrite, mirrorWrite]).finally(() => {
        state.inFlight = Math.max(0, state.inFlight - 1);
        if (state.pending) queueMicrotask(flushLatest);
      });`;

  must(writer.includes(oldWrite), 'bloco de transmissão principal inesperado');
  writer = writer.replace(oldWrite, mirroredWrite);
  battle = battle.slice(0, writerStart) + writer + battle.slice(writerEnd);

  const reconnectAnchor = battle.indexOf('  // Ao recuperar a internet');
  must(reconnectAnchor >= 0, 'âncora após listener de movimento ausente');

  const mirrorEffect = `  // ${LIVE_MARKER}\n  useEffect(() => {\n    if (!currentMapId) return undefined;\n    const primedSlots = new Set();\n    const seenMirrorIds = new Set();\n    const pendingByToken = new Map();\n    let mirrorFrame = 0;\n\n    const rememberMirror = id => {\n      if (!id) return;\n      seenMirrorIds.add(id);\n      if (seenMirrorIds.size > 180) {\n        const recent = Array.from(seenMirrorIds).slice(-100);\n        seenMirrorIds.clear();\n        recent.forEach(value => seenMirrorIds.add(value));\n      }\n    };\n\n    const flushMirror = () => {\n      mirrorFrame = 0;\n      if (!pendingByToken.size) return;\n      const patches = new Map(pendingByToken);\n      pendingByToken.clear();\n      setMapTokens(prev => {\n        const mapId = String(currentMapId);\n        const currentTokens = prev[mapId] || [];\n        let changed = false;\n        const nextTokens = currentTokens.map(token => {\n          const patch = patches.get(String(token.id));\n          if (!patch) return token;\n          const sameX = Math.abs(Number(token.x || 0) - patch.x) < 0.00001;\n          const sameY = Math.abs(Number(token.y || 0) - patch.y) < 0.00001;\n          if (sameX && sameY) return token;\n          changed = true;\n          authoritativePositionRef.current[mapId + ':' + String(token.id)] = { x: patch.x, y: patch.y };\n          return { ...token, x: patch.x, y: patch.y };\n        });\n        if (!changed) return prev;\n        const next = { ...prev, [mapId]: nextTokens };\n        mapTokensRef.current = next;\n        return next;\n      });\n    };\n\n    const scheduleMirrorFlush = () => {\n      if (!mirrorFrame) mirrorFrame = requestAnimationFrame(flushMirror);\n    };\n\n    const receiveMirror = (snap, slot) => {\n      if (!primedSlots.has(slot)) {\n        primedSlots.add(slot);\n        if (snap.exists()) rememberMirror(String((snap.data() || {}).mirrorId || ''));\n        return;\n      }\n      if (!snap.exists()) return;\n      const row = snap.data() || {};\n      const mirrorId = String(row.mirrorId || '');\n      if (!mirrorId || seenMirrorIds.has(mirrorId)) return;\n      rememberMirror(mirrorId);\n      if (String(row.mapId || '') !== String(currentMapId)) return;\n      if (String(row.clientId || '') === String(liveClientIdRef.current)) return;\n      if (row.tokenId === undefined || row.tokenId === null) return;\n      const x = Number(row.x);\n      const y = Number(row.y);\n      if (!Number.isFinite(x) || !Number.isFinite(y)) return;\n      pendingByToken.set(String(row.tokenId), { x, y });\n      scheduleMirrorFlush();\n    };\n\n    const unsubs = Array.from({ length: 6 }, (_, slot) =>\n      onSnapshot(\n        doc(db, 'config', 'battlemap_motion_' + slot),\n        snap => receiveMirror(snap, slot),\n        error => console.error('Erro no canal espelho do movimento:', error)\n      )\n    );\n\n    return () => {\n      unsubs.forEach(unsub => unsub());\n      if (mirrorFrame) cancelAnimationFrame(mirrorFrame);\n      pendingByToken.clear();\n    };\n  }, [currentMapId]);\n\n`;

  battle = battle.slice(0, reconnectAnchor) + mirrorEffect + battle.slice(reconnectAnchor);
}

for (const marker of [
  LIVE_MARKER,
  "doc(db, 'config', 'battlemap_motion_' + mirrorSlot)",
  "channel: 'motion-mirror-v1'",
  'Promise.allSettled([primaryWrite, mirrorWrite])',
  "doc(db, 'config', 'battlemap_motion_' + slot)",
  'requestAnimationFrame(flushMirror)',
]) must(battle.includes(marker), `BattleMap incompleto: ${marker}`);

// Garantias: não mexer na persistência final estável.
must(battle.includes('commitCanonicalTokenPosition'), 'commit canônico foi perdido');
must(battle.includes("doc(db, 'battlemap_tokens', id)"), 'arquivo durável battlemap_tokens foi perdido');
must(battle.includes("channel: 'position-final-v1'"), 'checkpoint final foi perdido');
fs.writeFileSync(battleFile, battle);

// ── 2) FUNDO CÓSMICO: uma animação idêntica em todos os navegadores ───────
let cosmic = fs.readFileSync(cosmicFile, 'utf8');
const STAR_MARKER = 'cosmic-unified-starfield';
if (!cosmic.includes(STAR_MARKER)) {
  const anchor = '      <div className="cosmic-lite-stars cosmic-lite-stars-near" />';
  must(cosmic.includes(anchor), 'âncora das estrelas cósmicas ausente');
  cosmic = cosmic.replace(
    anchor,
    `${anchor}\n      <div className="cosmic-unified-starfield"><i/><i/></div>`
  );
  fs.writeFileSync(cosmicFile, cosmic);
}

// ── 3) PARIDADE VISUAL + CLAREZA SUTIL ─────────────────────────────────────
let smooth = fs.readFileSync(smoothFile, 'utf8');
const CSS_MARKER = '/* CROSS-PLATFORM VISUAL PARITY + SUBTLE CLARITY · 2026-09-14 */';
if (!smooth.includes(CSS_MARKER)) {
  smooth += `\n\n${CSS_MARKER}\n
/* Um único campo estelar simples, por transform, permanece ativo inclusive no
   modo seguro do Opera. Chrome, Opera, Edge e Firefox passam a ver o mesmo
   movimento de fundo sem canvas, mask ou blend mode. */
.cosmic-unified-starfield{position:absolute;inset:0;z-index:4;overflow:hidden;pointer-events:none;opacity:.82}
.cosmic-unified-starfield>i{position:absolute;inset:-12%;display:block;pointer-events:none;background-repeat:repeat;transform:translate3d(0,0,0);will-change:auto}
.cosmic-unified-starfield>i:first-child{background-image:radial-gradient(circle,rgba(245,250,255,.78) 0 .9px,transparent 1.25px),radial-gradient(circle,rgba(155,196,244,.46) 0 .7px,transparent 1.05px);background-size:127px 127px,211px 211px;background-position:19px 31px,83px 117px;animation:cosmicUnifiedStarsA 34s linear infinite!important;opacity:.64}
.cosmic-unified-starfield>i:last-child{background-image:radial-gradient(circle,rgba(255,255,255,.92) 0 1.05px,rgba(166,211,255,.16) 1.35px,transparent 2.15px),radial-gradient(circle,rgba(199,184,255,.66) 0 .85px,transparent 1.25px);background-size:359px 359px,503px 503px;background-position:47px 103px,241px 37px;animation:cosmicUnifiedStarsB 49s linear infinite!important;opacity:.48}
@keyframes cosmicUnifiedStarsA{0%{transform:translate3d(-1.8%,-.8%,0)}50%{transform:translate3d(.9%,1.15%,0)}100%{transform:translate3d(2.6%,-.25%,0)}}
@keyframes cosmicUnifiedStarsB{0%{transform:translate3d(1.5%,-1.1%,0)}50%{transform:translate3d(-.7%,.7%,0)}100%{transform:translate3d(-2.4%,1.5%,0)}}

/* Remove diferenças de composição entre plataformas. Os elementos mais caros
   ficam estáticos/ocultos para todos; o movimento visível passa a ser o campo
   estelar acima, igual em qualquer navegador. */
.cosmic-lite-nebula{animation:none!important;transform:none!important;will-change:auto!important;opacity:.95!important}
.cosmic-lite-vortex,.cosmic-shooting-stars{display:none!important}
.cosmic-lite-stars-far,.cosmic-lite-stars-near{animation:none!important;will-change:auto!important}
.cosmic-bright-star{animation:none!important;will-change:auto!important;opacity:.62!important;transform:translateZ(0) scale(1)!important}
html.opera-gx-safe .cosmic-unified-starfield,html.opera-gx-safe .cosmic-unified-starfield>i{display:block!important}
html.opera-gx-safe .cosmic-unified-starfield>i:first-child{animation:cosmicUnifiedStarsA 34s linear infinite!important}
html.opera-gx-safe .cosmic-unified-starfield>i:last-child{animation:cosmicUnifiedStarsB 49s linear infinite!important}

/* Clareada sutil: menos vinheta preta e superfícies um pouco mais legíveis sem
   abandonar a identidade dark fantasy. */
.cosmic-living-bg.cosmic-lite-bg.cosmic-dark-bg{background:#02030a!important}
.cosmic-lite-bg .cosmic-living-vignette{opacity:.60!important;background:radial-gradient(circle at 50% 42%,transparent 12%,rgba(0,0,4,.07) 48%,rgba(0,0,3,.48) 100%),linear-gradient(180deg,rgba(0,0,3,.04),rgba(0,0,5,.22))!important}
.immersive-topbar{background:linear-gradient(180deg,rgba(12,7,24,.96),rgba(7,4,17,.93))!important}
.grim-nav,.mobile-dock{background:linear-gradient(180deg,rgba(11,7,23,.985),rgba(6,4,15,.985))!important}
:is(.grim-nav,.mobile-dock,.immersive-topbar,.session-card,.master-battle-console,.journal-drawer,.floating-sheet,.access-panel) button:not(:disabled){outline:1px solid rgba(255,255,255,.035);outline-offset:-1px}
:is(.session-card,.master-battle-console,.journal-drawer,.floating-sheet,.access-panel) input,
:is(.session-card,.master-battle-console,.journal-drawer,.floating-sheet,.access-panel) select,
:is(.session-card,.master-battle-console,.journal-drawer,.floating-sheet,.access-panel) textarea{outline:1px solid rgba(255,255,255,.045);outline-offset:-1px}
`;
  fs.writeFileSync(smoothFile, smooth);
}

for (const marker of [
  STAR_MARKER,
  CSS_MARKER,
  'cosmicUnifiedStarsA',
  'cosmicUnifiedStarsB',
  'opacity:.60!important',
]) {
  must(cosmic.includes(marker) || smooth.includes(marker), `paridade visual incompleta: ${marker}`);
}

console.log('Dinastia E: movimento do token possui canal espelho ao vivo; estrelas e clareza visual foram normalizadas entre navegadores.');
