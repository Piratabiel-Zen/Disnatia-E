import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const must = (condition, message) => {
  if (!condition) throw new Error(`Final stability guard: ${message}`);
};
const absent = (source, marker, label) => must(!source.includes(marker), `${label}: marcador proibido encontrado: ${marker}`);
const present = (source, marker, label) => must(source.includes(marker), `${label}: marcador obrigatório ausente: ${marker}`);

// ── FINAL NORMALIZATION · OPERA GX / CHROMIUM SAFE GRAPHICS ────────────────
// Opera GX can black-screen when several fullscreen compositor layers (CSS filters,
// masks, blend modes, continuous animation and WebGL) are active together. We keep
// the same dark/cosmic identity, but automatically use a lighter renderer on Opera/GX.
const operaDetect = String.raw`const OPERA_GX_SAFE = typeof navigator !== 'undefined' && (/OPR\//i.test(navigator.userAgent || '') || /OPRGX/i.test(navigator.userAgent || '') || /Opera GX/i.test(navigator.userAgent || '') || /Opera\//i.test(navigator.userAgent || '') || (typeof location !== 'undefined' && new URLSearchParams(location.search).has('safe')));`;

const loopFile = path.join(root, 'src', 'experience', 'CosmicLoopVideo.jsx');
if (fs.existsSync(loopFile)) {
  const safeLoop = `import { useEffect, useRef, useState } from 'react';\n\n${operaDetect}\nif (typeof document !== 'undefined' && OPERA_GX_SAFE) document.documentElement.classList.add('opera-gx-safe');\n\nexport default function CosmicLoopVideo({ variant = 'world' }) {\n  const videoRef = useRef(null);\n  const [ready, setReady] = useState(false);\n  const gate = variant === 'gate';\n\n  useEffect(() => {\n    if (OPERA_GX_SAFE) return undefined;\n    const video = videoRef.current;\n    if (!video) return undefined;\n    const ensurePlayback = () => {\n      video.muted = true;\n      const attempt = video.play();\n      if (attempt?.catch) attempt.catch(() => {});\n    };\n    const onVisible = () => { if (!document.hidden) ensurePlayback(); };\n    ensurePlayback();\n    document.addEventListener('visibilitychange', onVisible);\n    window.addEventListener('pointerdown', ensurePlayback, { once: true, passive: true });\n    return () => {\n      document.removeEventListener('visibilitychange', onVisible);\n      window.removeEventListener('pointerdown', ensurePlayback);\n    };\n  }, []);\n\n  if (OPERA_GX_SAFE) {\n    return <div className={\`cosmic-loop-video opera-gx-video-fallback \${gate ? 'gate' : ''}\`} aria-hidden=\"true\" />;\n  }\n\n  return (\n    <div className={\`cosmic-loop-video \${gate ? 'gate' : ''}\`} aria-hidden=\"true\" style={{position:'fixed',inset:0,zIndex:2,overflow:'hidden',pointerEvents:'none',background:'#030109'}}>\n      <video ref={videoRef} src=\"/media/deserto-bg.mp4\" autoPlay muted loop playsInline preload=\"metadata\" tabIndex={-1} disablePictureInPicture\n        onLoadedData={() => setReady(true)}\n        onCanPlay={() => { setReady(true); const attempt = videoRef.current?.play(); if (attempt?.catch) attempt.catch(() => {}); }}\n        style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'50% 50%',opacity:ready?(gate?0.78:0.84):0,filter:'none',transform:'none',transition:'opacity .35s ease'}} />\n      <div className=\"cosmic-video-shade\" style={{position:'absolute',inset:0,background:'radial-gradient(circle at 50% 44%,rgba(13,5,30,.04) 8%,rgba(4,1,12,.13) 66%,rgba(1,0,5,.40) 100%),linear-gradient(180deg,rgba(3,1,10,.12),rgba(7,2,18,.08) 48%,rgba(2,0,8,.33))'}} />\n    </div>\n  );\n}\n`;
  fs.writeFileSync(loopFile, safeLoop);
}

const smoothFile = path.join(root, 'src', 'experience', 'performance-smooth.css');
const operaCssMarker = '/* OPERA GX SAFE GRAPHICS · 2026-09-13 */';
if (fs.existsSync(smoothFile)) {
  let smooth = fs.readFileSync(smoothFile, 'utf8');
  if (!smooth.includes(operaCssMarker)) {
    smooth += `\n\n${operaCssMarker}\nhtml.opera-gx-safe .cosmic-loop-video{display:none!important}\nhtml.opera-gx-safe .cosmic-lite-nebula,\nhtml.opera-gx-safe .cosmic-lite-stars-far,\nhtml.opera-gx-safe .cosmic-lite-stars-near,\nhtml.opera-gx-safe .cosmic-bright-star,\nhtml.opera-gx-safe .immersive-topbar::after,\nhtml.opera-gx-safe .session-sigil,\nhtml.opera-gx-safe .grim-live,\nhtml.opera-gx-safe .access-sigil,\nhtml.opera-gx-safe .access-panel::before{animation:none!important;will-change:auto!important}\nhtml.opera-gx-safe .cosmic-lite-nebula{transform:none!important;opacity:.90!important}\nhtml.opera-gx-safe .cosmic-lite-vortex,\nhtml.opera-gx-safe .cosmic-shooting-stars{display:none!important}\nhtml.opera-gx-safe .access-gate::before,\nhtml.opera-gx-safe .access-gate::after{animation:none!important;filter:none!important;opacity:.18!important}\nhtml.opera-gx-safe .access-panel,\nhtml.opera-gx-safe .grim-nav,\nhtml.opera-gx-safe .mobile-dock,\nhtml.opera-gx-safe .immersive-topbar,\nhtml.opera-gx-safe .combat-hud,\nhtml.opera-gx-safe .master-battle-console,\nhtml.opera-gx-safe .journal-drawer,\nhtml.opera-gx-safe .floating-sheet{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}\nhtml.opera-gx-safe .cosmic-living-bg,\nhtml.opera-gx-safe .cosmic-dark-space,\nhtml.opera-gx-safe .cosmic-lite-nebula,\nhtml.opera-gx-safe .cosmic-living-vignette{mix-blend-mode:normal!important;filter:none!important}\nhtml.opera-gx-safe .session-card{content-visibility:visible!important;contain-intrinsic-size:auto!important}\n`;
    fs.writeFileSync(smoothFile, smooth);
  }
}

const diceFile = path.join(root, 'src', 'experience', 'PhysicalDiceTray.jsx');
if (fs.existsSync(diceFile)) {
  let dice = fs.readFileSync(diceFile, 'utf8');
  if (!dice.includes('const OPERA_GX_SAFE =')) {
    const anchor = "import './physical-dice.css';";
    must(dice.includes(anchor), 'PhysicalDiceTray: import CSS ausente');
    dice = dice.replace(anchor, `${anchor}\n\n${operaDetect}`);
  }
  const runAnchor = `    const run = async () => {\n      setPhase('loading');\n      setFallback(false);`;
  if (!dice.includes('fallbackTimer = window.setTimeout(settleFallback, 780);')) {
    must(dice.includes(runAnchor), 'PhysicalDiceTray: run() ausente');
    dice = dice.replace(runAnchor, `    const run = async () => {\n      setPhase('loading');\n      setFallback(false);\n      if (OPERA_GX_SAFE) {\n        setFallback(true);\n        setPhase('rolling');\n        fallbackTimer = window.setTimeout(settleFallback, 780);\n        return;\n      }`);
  }
  fs.writeFileSync(diceFile, dice);
}

const accessFile = path.join(root, 'src', 'experience', 'PlayerAccess.jsx');
if (fs.existsSync(accessFile)) {
  let accessSource = fs.readFileSync(accessFile, 'utf8');
  accessSource = accessSource.replaceAll('<img src={s.foto} alt="" />', '<img src={s.foto} alt="" decoding="async" loading="lazy" />');
  accessSource = accessSource.replaceAll('<img src={selected.foto} alt="" />', '<img src={selected.foto} alt="" decoding="async" />');
  accessSource = accessSource.replaceAll('<img src={access.photo} alt="" />', '<img src={access.photo} alt="" decoding="async" />');
  fs.writeFileSync(accessFile, accessSource);
}

const files = {
  app: 'src/App.generated.jsx',
  experience: 'src/experience/ExperienceKit.generated.jsx',
  game: 'src/experience/GameExperience3.jsx',
  gameCss: 'src/experience/game-experience-3.css',
  battle: 'src/features/mapa-batalha/BattleMapPage.jsx',
  ambient: 'src/shell/AmbientSoundPlayer.jsx',
  loop: 'src/experience/CosmicLoopVideo.jsx',
  smooth: 'src/experience/performance-smooth.css',
  dice: 'src/experience/PhysicalDiceTray.jsx',
  access: 'src/experience/PlayerAccess.jsx',
};

for (const [label, rel] of Object.entries(files)) {
  must(fs.existsSync(path.join(root, rel)), `${label}: arquivo gerado ausente (${rel})`);
}

const app = read(files.app);
const experience = read(files.experience);
const game = read(files.game);
const gameCss = read(files.gameCss);
const battle = read(files.battle);
const ambient = read(files.ambient);
const loop = read(files.loop);
const smooth = read(files.smooth);
const dice = read(files.dice);
const access = read(files.access);

// Desktop: Game Experience 3 só pode ocupar superfícies realmente imersivas.
present(game, 'DESKTOP CONTENT SURFACE RESET 2026-09-12', 'desktop');
present(gameCss, 'DESKTOP CONTENT SURFACE RESET 2026-09-12', 'desktop CSS');
for (const tab of ['prologo','classes','fichas','personagens','inimigos','bestiario','regras','livro','cronicas']) {
  present(gameCss, `.game3-tab-${tab} .g3-top-context`, `desktop CSS/${tab}`);
}
absent(app, 'dinastia-zero-wait-prefetch', 'performance');

// Navegação: desktop completo; mobile continua deliberadamente restrito.
present(experience, 'desktopGroups.map(group=>', 'navegação desktop');
present(experience, "item.id!=='inimigos'||masterMode", 'navegação Mestre');
present(experience, "{id:'mapamundi',label:'Mapa Múndi'", 'Mapa Múndi desktop');
present(experience, "{id:'mapabatalha',label:'Mapa de Batalha'", 'Mapa de Batalha desktop');
present(app, '!isMobileViewport()&&<AmbientSoundPlayer', 'áudio mobile');
const mobileSet = experience.match(/MOBILE_ALLOWED_NAV_IDS\s*=\s*new Set\(\[([^\]]*)\]\)/)?.[1] || '';
must(mobileSet, 'navegação mobile: conjunto de páginas permitidas não encontrado');
for (const forbidden of ['mapamundi','mapabatalha','inimigos']) {
  must(!mobileSet.includes(`'${forbidden}'`), `navegação mobile: ${forbidden} foi liberado acidentalmente`);
}

// BattleMap: Firestore é autoridade; sem comparar relógios de computadores diferentes.
present(battle, 'const TOKEN_THROTTLE_MS = 33;', 'BattleMap latência');
present(battle, "const u2 = onSnapshot(activeMapRef, snap => {", 'BattleMap ativo');
present(battle, 'Object.prototype.hasOwnProperty.call(prev, mapId)', 'BattleMap canal legado');
present(battle, 'previous && source === previous.source', 'BattleMap sequência de movimento');
absent(battle, 'updatedAt < previous.updatedAt', 'BattleMap relógio local');
absent(battle, 'incomingTs < knownTs', 'BattleMap relógio estrutural');
absent(battle, 'incomingTs >= knownTs', 'BattleMap relógio estrutural');
absent(battle, "onSnapshot(activeMapRef, { includeMetadataChanges: true }", 'BattleMap metadata duplicada');
absent(battle, 'setActiveId(String(id));', 'BattleMap rollback otimista');

// Música: um comando compartilhado não pode ser rejeitado por timestamp local nem duplicado por metadata.
present(ambient, 'const unsub = onSnapshot(ambientRef, snap => {', 'música realtime');
present(ambient, 'd.commandId || d.revision || d.ts', 'música command identity');
absent(ambient, 'revision < lastAmbientRevisionRef.current', 'música relógio local');
absent(ambient, 'includeMetadataChanges: true', 'música metadata duplicada');

// Opera/GX: safe graphics precisa permanecer disponível e automático.
for (const marker of ['OPERA_GX_SAFE','opera-gx-safe','opera-gx-video-fallback','preload="metadata"']) present(loop, marker, 'Opera GX vídeo');
present(smooth, operaCssMarker, 'Opera GX CSS');
present(smooth, 'html.opera-gx-safe .cosmic-lite-vortex', 'Opera GX CSS');
present(dice, 'fallbackTimer = window.setTimeout(settleFallback, 780)', 'Opera GX dado');
present(access, 'decoding="async"', 'Opera GX acesso');

// Proteções de conteúdo e superfícies essenciais já existentes.
for (const marker of ['fichas','personagens','bestiario','cronicas','livro','regras']) {
  must(app.includes(marker) || experience.includes(marker), `superfície essencial ausente: ${marker}`);
}

console.log('Dinastia E: final stability guard aprovado — desktop, mobile, realtime, Opera GX, música, BattleMap e superfícies essenciais preservados.');
