import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appFile = path.join(root, 'src', 'App.generated.jsx');
const experienceFile = path.join(root, 'src', 'experience', 'ExperienceKit.generated.jsx');
const cssFile = path.join(root, 'src', 'experience', 'experience.css');

for (const file of [appFile, experienceFile, cssFile]) {
  if (!fs.existsSync(file)) throw new Error(`Mobile access patch: arquivo ausente ${path.relative(root, file)}`);
}

let app = fs.readFileSync(appFile, 'utf8');
let exp = fs.readFileSync(experienceFile, 'utf8');
let css = fs.readFileSync(cssFile, 'utf8');

const must = (ok, msg) => { if (!ok) throw new Error(`Mobile access patch: ${msg}`); };
const APP_MARKER = 'MOBILE ALLOWED PAGES 2026-09-10';
const EXP_MARKER = 'MOBILE NAVIGATION FIX 2026-09-10';
const CSS_MARKER = '/* MOBILE NAVIGATION + SAFE OBJECTIVE 2026-09-10 */';

if (!app.includes(APP_MARKER)) {
  const loaderAnchor = 'const pageLoaders = {';
  must(app.includes(loaderAnchor), 'pageLoaders não encontrado no App gerado');
  app = app.replace(loaderAnchor, `// ${APP_MARKER}\nconst MOBILE_ALLOWED_PAGES = new Set(['fichas','bestiario','personagens','prologo','classes','cronicas','livro','regras']);\nconst isMobileViewport = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;\n\n${loaderAnchor}`);
  const navigateMatch = app.match(/  const navigate\s*=\s*id\s*=>\s*\{[\s\S]*?\n  \};/);
  must(navigateMatch, 'função navigate não encontrada no App gerado');
  const originalNavigate = navigateMatch[0];
  app = app.replace(originalNavigate, originalNavigate.replace('{', `{\n    if (isMobileViewport() && !MOBILE_ALLOWED_PAGES.has(id)) return;`));
}

if (!exp.includes(EXP_MARKER)) {
  const fnAnchor = `export function ImmersiveNavigation({ tab, onNavigate, accent='#A855F7' }){`;
  must(exp.includes(fnAnchor), 'ImmersiveNavigation não encontrado');
  exp = exp.replace(fnAnchor, `// ${EXP_MARKER}\nconst MOBILE_ALLOWED_NAV_IDS = new Set(['fichas','bestiario','personagens','prologo','classes','cronicas','livro','regras']);\n\n${fnAnchor}`);

  const mainRegex = /  const mobileMain=\[[\s\S]*?\n  \];/;
  must(mainRegex.test(exp), 'atalhos mobile antigos não encontrados');
  exp = exp.replace(mainRegex, `  const mobileMain=[\n    {id:'fichas',label:'Ficha',icon:'📋'},\n    {id:'personagens',label:'Personagens',icon:'👤'},\n    {id:'livro',label:'Livro',icon:'✦'},\n    {id:'cronicas',label:'Crônicas',icon:'🗒️'},\n  ];\n  const mobileGroups = NAV_GROUPS.map(group=>({ ...group, items:group.items.filter(item=>MOBILE_ALLOWED_NAV_IDS.has(item.id)) })).filter(group=>group.items.length);`);

  const lastNavMap = exp.lastIndexOf('NAV_GROUPS.map(group=>');
  must(lastNavMap >= 0, 'lista do menu mobile não encontrada');
  exp = exp.slice(0,lastNavMap) + 'mobileGroups.map(group=>' + exp.slice(lastNavMap + 'NAV_GROUPS.map(group=>'.length);

  const enterRegex = /  const enter=\(\)=>onNavigate\([^\n]+\);/;
  must(enterRegex.test(exp), 'ação principal da tela inicial não encontrada');
  exp = exp.replace(enterRegex, `  const enter=()=>{\n    const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;\n    onNavigate(mobile ? 'fichas' : (combat?.active||activeMap?.activeId?'mapabatalha':'fichas'));\n  };`);
}

if (!css.includes(CSS_MARKER)) {
  css += `\n\n${CSS_MARKER}\n@media(max-width:900px){\n.mobile-dock{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr));position:fixed!important;left:8px!important;right:8px!important;bottom:calc(8px + env(safe-area-inset-bottom,0px))!important;height:58px!important;z-index:820!important;pointer-events:auto!important;border:1px solid rgba(168,85,247,.18)!important;border-radius:15px!important;background:linear-gradient(180deg,rgba(10,5,20,.97),rgba(4,2,10,.98))!important;box-shadow:0 14px 38px rgba(0,0,0,.58),0 0 22px rgba(168,85,247,.08)!important;overflow:hidden!important;backdrop-filter:blur(14px)!important}\n.mobile-dock button{min-width:0!important;height:100%!important;padding:5px 2px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#776982!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:2px!important;pointer-events:auto!important}\n.mobile-dock button.active{color:var(--accent)!important;background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 10%,transparent),transparent)!important}\n.mobile-dock button span{font-size:15px!important;line-height:1!important}.mobile-dock button small{font:700 6px 'Cinzel',serif!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}\n.mobile-menu-backdrop{display:grid!important;position:fixed!important;inset:0!important;z-index:860!important;align-items:end!important;background:rgba(0,0,0,.66)!important;pointer-events:auto!important}\n.mobile-menu-sheet{position:relative!important;z-index:861!important;width:100%!important;max-height:min(76vh,680px)!important;overflow-y:auto!important;padding:12px 12px calc(20px + env(safe-area-inset-bottom,0px))!important;border-radius:22px 22px 0 0!important;border:1px solid rgba(168,85,247,.18)!important;border-bottom:0!important;background:linear-gradient(180deg,rgba(12,6,24,.99),rgba(4,2,10,.995))!important;box-shadow:0 -24px 70px rgba(0,0,0,.7)!important;pointer-events:auto!important}\n.mobile-menu-sheet section>div{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}.mobile-menu-sheet section button{min-height:42px!important;white-space:normal!important;text-align:left!important}\n.immersive-content,.access-player:has(.game3-mode-combat) .immersive-content,.access-master:has(.game3-mode-combat) .immersive-content{padding-top:108px!important;padding-bottom:142px!important}\n.session-page{padding:16px 10px 142px!important;width:100%!important;max-width:100%!important;overflow-x:hidden!important}.session-grid{grid-template-columns:1fr!important;gap:10px!important}.session-card,.character-card,.objective-card,.turn-card,.journal-card,.atlas-card,.soundtrack-card{grid-column:1/-1!important;min-width:0!important;width:100%!important;max-width:100%!important}.objective-card{overflow:hidden!important}.objective-card h3,.objective-card p{overflow-wrap:anywhere!important;word-break:break-word!important;white-space:normal!important;max-width:100%!important}\n.g3-top-context{left:8px!important;right:8px!important;top:58px!important;z-index:360!important}.g3-context-card{width:100%!important;max-width:100%!important;min-width:0!important;grid-template-columns:auto minmax(0,1fr) auto!important;overflow:hidden!important}.g3-objective{min-width:0!important;max-width:100%!important;overflow:hidden!important}.g3-objective b{display:block!important;max-width:100%!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}\n.g3-master-quickbar{display:none!important}\n}\n`;
}

for (const marker of [APP_MARKER, EXP_MARKER, CSS_MARKER, 'MOBILE_ALLOWED_NAV_IDS', "mobile ? 'fichas'", 'z-index:860']) {
  must(app.includes(marker) || exp.includes(marker) || css.includes(marker), `marcador final ausente: ${marker}`);
}

fs.writeFileSync(appFile, app);
fs.writeFileSync(experienceFile, exp);
fs.writeFileSync(cssFile, css);
console.log('Dinastia E: navegação mobile limitada às 8 áreas permitidas, menu destravado e objetivo reposicionado sem sobreposição.');
