import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appFile = path.join(root, 'src', 'App.generated.jsx');
const expFile = path.join(root, 'src', 'experience', 'ExperienceKit.generated.jsx');
const expCssFile = path.join(root, 'src', 'experience', 'experience.css');
const gameCssFile = path.join(root, 'src', 'experience', 'game-experience-3.css');

const must = (ok, msg) => { if (!ok) throw new Error(`Mobile clean surface patch: ${msg}`); };
for (const file of [appFile, expFile, expCssFile, gameCssFile]) {
  must(fs.existsSync(file), `arquivo ausente: ${path.relative(root, file)}`);
}

let app = fs.readFileSync(appFile, 'utf8');
let exp = fs.readFileSync(expFile, 'utf8');
let expCss = fs.readFileSync(expCssFile, 'utf8');
let gameCss = fs.readFileSync(gameCssFile, 'utf8');

const APP_MARKER = 'MOBILE MAPS HIDDEN 2026-09-15';
if (!app.includes(APP_MARKER)) {
  must(app.includes('const isMobileViewport ='), 'detector de viewport mobile ausente');
  const navigateRe = /  const navigate\s*=\s*id\s*=>\s*\{[\s\S]*?\n  \};/;
  const navigateMatch = app.match(navigateRe);
  must(navigateMatch, 'função navigate não encontrada');
  let navigateBlock = navigateMatch[0];
  const guard = `\n    // ${APP_MARKER}\n    if (isMobileViewport() && (id==='mapamundi' || id==='mapabatalha')) return;`;
  navigateBlock = navigateBlock.replace('{', `{${guard}`);
  app = app.replace(navigateMatch[0], navigateBlock);

  const logoutAnchor = '\n\n  const logout =';
  must(app.includes(logoutAnchor), 'âncora de logout não encontrada');
  app = app.replace(logoutAnchor, `\n\n  useEffect(()=>{\n    const keepMobileOutOfMaps = () => {\n      if (isMobileViewport() && (tab==='mapamundi' || tab==='mapabatalha')) setTab('session');\n    };\n    keepMobileOutOfMaps();\n    window.addEventListener('resize', keepMobileOutOfMaps);\n    return()=>window.removeEventListener('resize', keepMobileOutOfMaps);\n  },[tab]);${logoutAnchor}`);
}

const EXP_MARKER = 'MOBILE CLEAN NAV 2026-09-15';
if (!exp.includes(EXP_MARKER)) {
  const mobileMainRe = /  const mobileMain=\[[\s\S]*?\n  \];/;
  must(mobileMainRe.test(exp), 'mobileMain não encontrado');
  exp = exp.replace(mobileMainRe, `  // ${EXP_MARKER}\n  const mobileMain=[\n    {id:'session',label:'Início',icon:'⌂'},\n    {id:'fichas',label:'Ficha',icon:'📋'},\n    {id:'cronicas',label:'Crônicas',icon:'🗒️'},\n    {id:'livro',label:'Livro',icon:'✦'},\n  ];\n  const mobileCleanGroups20260915 = desktopGroups.map(group=>({\n    ...group,\n    items:group.items.filter(item=>item.id!=='mapamundi'&&item.id!=='mapabatalha'),\n  })).filter(group=>group.items.length);`);

  const mobileStart = exp.indexOf('<nav className="mobile-dock">');
  const mobileEnd = exp.indexOf('export function SessionDashboard', mobileStart);
  must(mobileStart >= 0 && mobileEnd > mobileStart, 'bloco de navegação mobile não encontrado');
  let mobileSlice = exp.slice(mobileStart, mobileEnd);
  const mobileRenderCandidates = [
    'desktopGroups.map(group=>',
    'mobileAllowedGroups20260910.map(group=>',
    'NAV_GROUPS.map(group=>',
  ];
  const activeRender = mobileRenderCandidates.find(candidate => mobileSlice.includes(candidate));
  must(activeRender, 'render dos grupos do menu mobile não encontrado');
  mobileSlice = mobileSlice.replace(activeRender, 'mobileCleanGroups20260915.map(group=>');
  exp = exp.slice(0, mobileStart) + mobileSlice + exp.slice(mobileEnd);
}

const EXP_CSS_MARKER = '/* MOBILE CLEAN SURFACE · 2026-09-15 */';
if (!expCss.includes(EXP_CSS_MARKER)) {
  expCss += `\n\n${EXP_CSS_MARKER}\n@media(max-width:900px){\n  /* Desktop permanece intocado. No celular ficam apenas os atalhos essenciais. */\n  .mobile-dock{grid-template-columns:repeat(5,minmax(0,1fr))!important;height:54px!important;left:8px!important;right:8px!important;bottom:calc(7px + env(safe-area-inset-bottom,0px))!important;border-radius:14px!important;box-shadow:0 10px 28px rgba(0,0,0,.46)!important}\n  .mobile-dock button{padding:4px 2px!important;gap:1px!important}.mobile-dock button span{font-size:14px!important}.mobile-dock button small{font-size:5.8px!important;letter-spacing:.02em!important}\n  .mobile-menu-sheet{max-height:min(68vh,580px)!important;padding:10px 10px calc(16px + env(safe-area-inset-bottom,0px))!important;border-radius:18px 18px 0 0!important;box-shadow:0 -16px 46px rgba(0,0,0,.58)!important}\n  .mobile-menu-head{min-height:38px!important}.mobile-menu-sheet section{margin:8px 0!important}.mobile-menu-sheet section h4{margin:0 0 6px!important;font-size:7px!important;letter-spacing:.12em!important;opacity:.72!important}.mobile-menu-sheet section>div{gap:6px!important}.mobile-menu-sheet section button{min-height:38px!important;padding:7px 9px!important;font-size:9px!important}\n  /* Os cards que levam aos dois mapas não aparecem na experiência mobile. */\n  .turn-card,.atlas-card{display:none!important}\n  .hud-actions button:last-child{display:none!important}\n  /* Menos ornamento e mais conteúdo útil na página inicial mobile. */\n  .session-sigil,.objective-glyph{display:none!important}\n  .session-hero{padding:16px 12px!important;margin-bottom:9px!important}.session-hero h2{font-size:21px!important;margin-bottom:5px!important}.session-hero p{font-size:12px!important;line-height:1.45!important;max-width:36rem!important}.session-hero-meta{gap:5px!important;margin-top:8px!important}.session-hero-meta span{font-size:8px!important;padding:4px 6px!important}\n  .session-grid{gap:8px!important}.session-card{border-radius:12px!important;box-shadow:0 10px 24px rgba(0,0,0,.22)!important}\n  /* Fora da tela inicial/combate, removemos camadas utilitárias redundantes. */\n  .access-player:not(:has(.game3-tab-session)):not(:has(.game3-mode-combat)) .immersive-content,\n  .access-master:not(:has(.game3-tab-session)):not(:has(.game3-mode-combat)) .immersive-content{padding-top:72px!important;padding-bottom:84px!important}\n  .session-page{padding-bottom:158px!important}\n}\n`;
}

const GAME_CSS_MARKER = '/* MOBILE QUIET HUD · 2026-09-15 */';
if (!gameCss.includes(GAME_CSS_MARKER)) {
  gameCss += `\n\n${GAME_CSS_MARKER}\n@media(max-width:900px){\n  .game3-root:not(.game3-tab-session):not(.game3-mode-combat) .g3-mobile-session-hub,\n  .game3-root:not(.game3-tab-session):not(.game3-mode-combat) .g3-mobile-hud-toggle,\n  .game3-root:not(.game3-tab-session):not(.game3-mode-combat) .g3-actionbar,\n  .game3-root:not(.game3-tab-session):not(.game3-mode-combat) .g3-top-context{display:none!important}\n  .g3-mobile-session-hub{height:42px!important;bottom:68px!important;left:8px!important;right:60px!important;padding:3px!important;border-radius:11px!important;box-shadow:0 8px 20px rgba(0,0,0,.32)!important;opacity:.62!important}\n  .g3-mobile-session-hub.combat{opacity:.9!important}\n  .g3-mobile-session-hub button span{font-size:12px!important}.g3-mobile-session-hub button small{font-size:5.5px!important}\n  .g3-mobile-hud-toggle{width:42px!important;height:42px!important;right:10px!important;bottom:68px!important;border-radius:12px!important;box-shadow:0 8px 20px rgba(0,0,0,.34)!important}\n  .g3-mobile-hud-toggle span{font-size:14px!important}.g3-mobile-hud-toggle small{font-size:5.5px!important}\n  .dice-widget{bottom:68px!important}\n}\n`;
}

const mobileMainCheck = exp.match(/  const mobileMain=\[([\s\S]*?)\n  \];/)?.[1] || '';
must(mobileMainCheck && !mobileMainCheck.includes('mapamundi') && !mobileMainCheck.includes('mapabatalha'), 'atalhos mobile ainda contêm mapas');
must(exp.includes("item.id!=='mapamundi'&&item.id!=='mapabatalha'"), 'filtro dos mapas no menu mobile ausente');
must(exp.includes("{id:'mapamundi',label:'Mapa Múndi'"), 'Mapa Múndi desktop foi removido');
must(exp.includes("{id:'mapabatalha',label:'Mapa de Batalha'"), 'Mapa de Batalha desktop foi removido');
must(exp.includes('desktopGroups.map(group=>'), 'navegação desktop foi alterada indevidamente');
must(app.includes("id==='mapamundi' || id==='mapabatalha'"), 'bloqueio mobile de mapas ausente');
must(expCss.includes(EXP_CSS_MARKER) && gameCss.includes(GAME_CSS_MARKER), 'CSS mobile clean ausente');

fs.writeFileSync(appFile, app);
fs.writeFileSync(expFile, exp);
fs.writeFileSync(expCssFile, expCss);
fs.writeFileSync(gameCssFile, gameCss);

console.log('Dinastia E: mobile sem Mapa de Batalha/Atlas e com superfície visual mais limpa; desktop preservado integralmente.');
