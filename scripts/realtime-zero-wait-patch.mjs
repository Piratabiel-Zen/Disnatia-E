import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function mustReplace(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Realtime zero-wait patch falhou: ${label}`);
  return source.replace(before, after);
}

// ── 1) MÚSICA: Firestore é a ordem autoritativa; relógios locais nunca bloqueiam ──
const ambientFile = path.join(root, 'src', 'shell', 'AmbientSoundPlayer.jsx');
let ambient = fs.readFileSync(ambientFile, 'utf8');

ambient = mustReplace(
  ambient,
  `      if (revision && revision < lastAmbientRevisionRef.current) return;
      lastAmbientRevisionRef.current = revision;`,
  `      // O snapshot recebido do Firestore é autoritativo entre clientes.
      // revision/ts nunca podem rejeitar outra máquina por diferença de relógio.`,
  'remoção do gate de relógio da música'
);

const playStart = ambient.indexOf('  const playTrack = async (track, categoria) => {');
const playEnd = ambient.indexOf('\n\n  const stopAll = async () => {', playStart);
if (playStart < 0 || playEnd < 0) throw new Error('Realtime zero-wait patch: playTrack não encontrado.');
const playTrack = `  const playTrack = async (track, categoria) => {
    const now = Date.now();
    const nextAmbient = {
      videoId: track.videoId,
      nome: track.nome,
      categoria,
      playing: true,
      ts: now,
      revision: now * 1000 + Math.floor(Math.random() * 1000),
      commandId: 'ambient_' + now + '_' + Math.random().toString(36).slice(2, 9),
    };

    // Latency compensation: o emissor muda imediatamente; os demais recebem
    // o mesmo comando pelo snapshot sem aguardar qualquer comparação de relógio.
    setCurrent(nextAmbient);
    setUserMuted(false);
    lastTs.current = nextAmbient.commandId;
    setDoc(doc(db, 'config', 'ambient'), nextAmbient).catch(async error => {
      console.error('Erro ao publicar música:', error);
      try {
        const snap = await getDocFromServer(doc(db, 'config', 'ambient'));
        if (snap.exists()) setCurrent(snap.data());
      } catch (_) {}
    });

    const catColor = SOUND_CATEGORIES.find(c => c.id === categoria)?.color || '#4ADE80';
    pushToast(\`🎵 Tocando agora: \${track.nome}\`, '🎵', catColor);
  };`;
ambient = ambient.slice(0, playStart) + playTrack + ambient.slice(playEnd);

const stopStart = ambient.indexOf('  const stopAll = async () => {');
const stopEnd = ambient.indexOf('\n\n  const addTrack = async () => {', stopStart);
if (stopStart < 0 || stopEnd < 0) throw new Error('Realtime zero-wait patch: stopAll não encontrado.');
const stopAll = `  const stopAll = async () => {
    const now = Date.now();
    const nextAmbient = {
      videoId: '', nome: '', categoria: '', playing: false,
      ts: now,
      revision: now * 1000 + Math.floor(Math.random() * 1000),
      commandId: 'ambient_stop_' + now + '_' + Math.random().toString(36).slice(2, 9),
    };
    setCurrent(nextAmbient);
    lastTs.current = nextAmbient.commandId;
    setDoc(doc(db, 'config', 'ambient'), nextAmbient).catch(error => console.error('Erro ao parar música:', error));
  };`;
ambient = ambient.slice(0, stopStart) + stopAll + ambient.slice(stopEnd);

if (ambient.includes('revision < lastAmbientRevisionRef.current')) {
  throw new Error('Realtime zero-wait patch: gate de relógio da música ainda ativo.');
}
fs.writeFileSync(ambientFile, ambient);

// ── 2) MAPA ATIVO: troca instantânea e sem comparação de relógio local ────────
const battleFile = path.join(root, 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let battle = fs.readFileSync(battleFile, 'utf8');

const activeApplyStart = battle.indexOf('    const applyActiveMap = (data) => {');
const activeApplyEnd = battle.indexOf('\n    const u2 = onSnapshot(activeMapRef', activeApplyStart);
if (activeApplyStart < 0 || activeApplyEnd < 0) {
  throw new Error('Realtime zero-wait patch: listener do mapa ativo não encontrado.');
}
const activeApply = `    const applyActiveMap = (data) => {
      // A ordem de snapshots do Firestore é a autoridade. Nunca rejeitar uma
      // troca de mapa por revision/updatedAt produzidos em outro computador.
      setActiveId(data?.activeId || '');
    };`;
battle = battle.slice(0, activeApplyStart) + activeApply + battle.slice(activeApplyEnd);

battle = mustReplace(
  battle,
  `        if (activeSnap.exists()) {
          const d = activeSnap.data();
          const rev = Number(d.revision || d.updatedAt || 0);
          if (!rev || rev >= activeMapRevisionRef.current) { activeMapRevisionRef.current = rev; setActiveId(d.activeId || ''); }
        }`,
  `        if (activeSnap.exists()) {
          const d = activeSnap.data();
          setActiveId(d.activeId || '');
        }`,
  'refresh do mapa ativo sem relógio'
);

battle = mustReplace(
  battle,
  `    activeMapRevisionRef.current = revision;
    await setDoc(doc(db, 'config', 'battlemap_active'), { activeId: String(id), revision, updatedAt: Date.now() });`,
  `    setActiveId(String(id));
    setDoc(doc(db, 'config', 'battlemap_active'), { activeId: String(id), revision, updatedAt: Date.now() }).catch(error => console.error('Erro ao ativar mapa:', error));`,
  'ativação otimista do mapa'
);

battle = mustReplace(
  battle,
  `  const deactivateMap = async () => {
    await setDoc(doc(db, 'config', 'battlemap_active'), { activeId: '', revision: Date.now() * 1000 + Math.floor(Math.random() * 1000), updatedAt: Date.now() });
  };`,
  `  const deactivateMap = async () => {
    setActiveId('');
    setDoc(doc(db, 'config', 'battlemap_active'), { activeId: '', revision: Date.now() * 1000 + Math.floor(Math.random() * 1000), updatedAt: Date.now() })
      .catch(error => console.error('Erro ao ocultar mapa:', error));
  };`,
  'desativação otimista do mapa'
);

// Movimento: ~30 Hz, mantendo 2 writes concorrentes e 3 slots. É mais
// conservador que o boost agressivo anterior, que foi revertido.
battle = mustReplace(battle, 'const TOKEN_THROTTLE_MS = 40;', 'const TOKEN_THROTTLE_MS = 33;', 'movimento em ~30 Hz');
battle = mustReplace(
  battle,
  "                        transition: draggingId === token.id ? 'none' : 'left 32ms linear, top 32ms linear',",
  "                        transition: draggingId === token.id ? 'none' : 'left 24ms linear, top 24ms linear',",
  'interpolação remota de 24ms'
);

if (battle.includes('revision < activeMapRevisionRef.current') || battle.includes('rev >= activeMapRevisionRef.current')) {
  throw new Error('Realtime zero-wait patch: comparação de relógio do mapa ativo ainda existe.');
}
for (const marker of ['const TOKEN_THROTTLE_MS = 33;', "left 24ms linear, top 24ms linear", "setActiveId(String(id));"]) {
  if (!battle.includes(marker)) throw new Error(`Realtime zero-wait patch incompleto no mapa: ${marker}`);
}
fs.writeFileSync(battleFile, battle);

// ── 3) NAVEGAÇÃO: chunks aquecidos em idle + transição curta ─────────────────
const appFile = path.join(root, 'src', 'App.generated.jsx');
let app = fs.readFileSync(appFile, 'utf8');
const appMarker = `  const atm = ATMOSPHERES[atmosphere] || ATMOSPHERES.neutro;`;
if (!app.includes('dinastia-zero-wait-prefetch')) {
  if (!app.includes(appMarker)) throw new Error('Realtime zero-wait patch: marcador do App não encontrado.');
  const warmEffect = `  // dinastia-zero-wait-prefetch: aquece as páginas depois do login sem bloquear o primeiro paint.
  useEffect(() => {
    if (!access) return;
    let cancelled = false;
    let idleHandle = 0;
    let timerHandle = 0;
    const priority = ['mapabatalha','fichas','mapamundi','inimigos','cronicas','livro','personagens','bestiario','regras','classes','prologo'];
    let index = 0;

    const warmNext = () => {
      if (cancelled || index >= priority.length) return;
      const loader = pageLoaders[priority[index++]];
      Promise.resolve(loader?.()).catch(() => {}).finally(() => {
        if (!cancelled) timerHandle = window.setTimeout(warmNext, 35);
      });
    };
    const start = () => warmNext();

    if ('requestIdleCallback' in window) idleHandle = window.requestIdleCallback(start, { timeout: 900 });
    else timerHandle = window.setTimeout(start, 180);

    return () => {
      cancelled = true;
      if (idleHandle && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleHandle);
      if (timerHandle) window.clearTimeout(timerHandle);
    };
  }, [access?.role, access?.sheetId]);

`;
  app = app.replace(appMarker, warmEffect + appMarker);
}
app = app.replaceAll('pageTurn 0.45s', 'pageTurn 0.16s');
if (!app.includes('dinastia-zero-wait-prefetch') || app.includes('pageTurn 0.45s')) {
  throw new Error('Realtime zero-wait patch: navegação instantânea não aplicada.');
}
fs.writeFileSync(appFile, app);

console.log('Dinastia E: zero-wait aplicado em música, mapa ativo, movimento e navegação, sem ordenar clientes por relógio local.');
