import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appFile = path.join(root, 'src', 'App.generated.jsx');
const expFile = path.join(root, 'src', 'experience', 'ExperienceKit.generated.jsx');
const smoothFile = path.join(root, 'src', 'experience', 'performance-smooth.css');
const expCssFile = path.join(root, 'src', 'experience', 'experience.css');

const must = (ok, msg) => { if (!ok) throw new Error(`Opera/mobile parity patch: ${msg}`); };
for (const file of [appFile, expFile, smoothFile, expCssFile]) {
  must(fs.existsSync(file), `arquivo ausente: ${path.relative(root, file)}`);
}

let app = fs.readFileSync(appFile, 'utf8');
let exp = fs.readFileSync(expFile, 'utf8');
let smooth = fs.readFileSync(smoothFile, 'utf8');
let expCss = fs.readFileSync(expCssFile, 'utf8');

// ── 1) MOBILE: mesma superfície funcional do desktop ────────────────────────
// Remove os dois gates históricos que bloqueavam páginas no celular. O layout
// continua responsivo, mas o conteúdo, dados e páginas disponíveis passam a ser
// os mesmos do desktop, respeitando apenas permissões reais (ex.: Inimigos/Mestre).
app = app.replace(/\n\s*if\s*\(id==='mapabatalha'&&mobileBattleMapBlocked\(\)\)\s*return;/g, '');
app = app.replace(/\n\s*if\s*\(isMobileViewport\(\)\s*&&\s*!MOBILE_ALLOWED_PAGES\.has\(id\)\)\s*return;/g, '');

// Remove a proteção que expulsava o usuário do BattleMap ao redimensionar para mobile.
app = app.replace(/\n\s*useEffect\(\(\)=>\{\s*const protect=\(\)=>\{if\(mobileBattleMapBlocked\(\)&&tab==='mapabatalha'\)setTab\('session'\)\};\s*protect\(\);window\.addEventListener\('resize',protect\);return\(\)=>window\.removeEventListener\('resize',protect\);\s*\},\[tab\]\);/g, '');

must(!app.includes("if(id==='mapabatalha'&&mobileBattleMapBlocked()) return;"), 'bloqueio mobile do BattleMap ainda ativo');
must(!app.includes('if (isMobileViewport() && !MOBILE_ALLOWED_PAGES.has(id)) return;'), 'gate geral de páginas mobile ainda ativo');

// O menu expandido mobile usa exatamente os mesmos grupos filtrados por perfil do desktop.
exp = exp.replaceAll('mobileAllowedGroups20260910.map(group=>', 'desktopGroups.map(group=>');

// Dock rápido: mantém seis slots totais (cinco atalhos + menu), mas traz os dois mapas.
const mobileMainRe = /  const mobileMain=\[[\s\S]*?\n  \];/;
must(mobileMainRe.test(exp), 'mobileMain não encontrado');
exp = exp.replace(mobileMainRe, `  const mobileMain=[\n    {id:'session',label:'Início',icon:'⌂'},\n    {id:'mapamundi',label:'Mapa',icon:'🗺️'},\n    {id:'mapabatalha',label:'Batalha',icon:'⚔️'},\n    {id:'fichas',label:'Ficha',icon:'📋'},\n    {id:'cronicas',label:'Crônicas',icon:'🗒️'},\n  ];`);

for (const marker of [
  "{id:'mapamundi',label:'Mapa',icon:'🗺️'}",
  "{id:'mapabatalha',label:'Batalha',icon:'⚔️'}",
  'desktopGroups.map(group=>',
]) must(exp.includes(marker), `paridade mobile ausente: ${marker}`);
must(!exp.includes('mobileAllowedGroups20260910.map(group=>'), 'menu mobile ainda usa grupos restritos');

const MOBILE_VISUAL_MARK = '/* MOBILE DESKTOP-PARITY SURFACE · 2026-09-14 */';
if (!expCss.includes(MOBILE_VISUAL_MARK)) {
  expCss += `\n\n${MOBILE_VISUAL_MARK}\n@media(max-width:900px){\n  /* Mesma linguagem visual do desktop, apenas reorganizada para toque. */\n  .mobile-dock,.mobile-menu-sheet,.g3-mobile-session-hub,.g3-mobile-hud-toggle{border-color:rgba(168,85,247,.22)!important;background:linear-gradient(180deg,rgba(10,5,20,.96),rgba(4,2,10,.985))!important;box-shadow:0 14px 38px rgba(0,0,0,.54),0 0 24px rgba(168,85,247,.08)!important}\n  .mobile-menu-sheet section>div{grid-template-columns:repeat(2,minmax(0,1fr))!important}\n  .mobile-menu-sheet section button{min-height:46px!important}\n  .immersive-content{width:100%!important;max-width:100%!important;margin:0 auto!important}\n  .session-page{width:100%!important;max-width:100%!important}\n  .battlemap-root,.battle-map-page,.world-map-page,.atlas-page{max-width:100%!important}\n}\n`;
}

// ── 2) OPERA GX: safe mode precisa existir antes e durante todo o app ───────
// A classe agora nasce no index.html antes do bundle. Aqui reforçamos o renderer
// seguro para eliminar os últimos pontos que podem causar black-screen no compositor.
const OPERA_HARDEN_MARK = '/* OPERA GX BOOT-SAFE HARDENING · 2026-09-14 */';
if (!smooth.includes(OPERA_HARDEN_MARK)) {
  smooth += `\n\n${OPERA_HARDEN_MARK}\nhtml.opera-gx-safe,html.opera-gx-safe body,html.opera-gx-safe #root{visibility:visible!important;opacity:1!important;background:#030109!important}\nhtml.opera-gx-safe #root{filter:none!important;transform:none!important;mix-blend-mode:normal!important;isolation:auto!important}\nhtml.opera-gx-safe *,html.opera-gx-safe *::before,html.opera-gx-safe *::after{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}\nhtml.opera-gx-safe video,html.opera-gx-safe .cosmic-living-bg canvas,html.opera-gx-safe .cosmic-loop-video{display:none!important}\nhtml.opera-gx-safe .immersive-content>div,html.opera-gx-safe .session-card,html.opera-gx-safe .character-card,html.opera-gx-safe .objective-card{content-visibility:visible!important;contain:none!important;filter:none!important}\nhtml.opera-gx-safe .cosmic-lite-nebula,html.opera-gx-safe .cosmic-lite-stars-far,html.opera-gx-safe .cosmic-lite-stars-near{will-change:auto!important;filter:none!important;mix-blend-mode:normal!important}\nhtml.opera-gx-safe .page-transition,html.opera-gx-safe .immersive-content>div{animation:none!important}\n`;
}

for (const marker of [OPERA_HARDEN_MARK, 'html.opera-gx-safe #root', 'backdrop-filter:none!important', 'content-visibility:visible!important']) {
  must(smooth.includes(marker), `hardening Opera ausente: ${marker}`);
}

fs.writeFileSync(appFile, app);
fs.writeFileSync(expFile, exp);
fs.writeFileSync(smoothFile, smooth);
fs.writeFileSync(expCssFile, expCss);

console.log('Dinastia E: Opera GX boot-safe reforçado e mobile com as mesmas superfícies funcionais do desktop.');
