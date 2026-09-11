import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const appFile=path.join(root,'src','App.generated.jsx');
const expFile=path.join(root,'src','experience','ExperienceKit.generated.jsx');
const gameFile=path.join(root,'src','experience','GameExperience3.jsx');
const expCssFile=path.join(root,'src','experience','experience.css');
const gameCssFile=path.join(root,'src','experience','game-experience-3.css');
const must=(ok,msg)=>{if(!ok)throw new Error(`Mobile hub patch: ${msg}`)};
for(const f of [appFile,expFile,gameFile,expCssFile,gameCssFile]) must(fs.existsSync(f),`arquivo ausente: ${path.relative(root,f)}`);

let app=fs.readFileSync(appFile,'utf8');
let exp=fs.readFileSync(expFile,'utf8');
let game=fs.readFileSync(gameFile,'utf8');
let expCss=fs.readFileSync(expCssFile,'utf8');
let gameCss=fs.readFileSync(gameCssFile,'utf8');

// 1) Mobile volta a ter um caminho explícito para a tela inicial, sem liberar as áreas bloqueadas.
app=app.replace(
  "const MOBILE_ALLOWED_PAGES = new Set(['fichas','bestiario','personagens','prologo','classes','cronicas','livro','regras']);",
  "const MOBILE_ALLOWED_PAGES = new Set(['session','fichas','bestiario','personagens','prologo','classes','cronicas','livro','regras']);"
);
exp=exp.replace(
  "const MOBILE_ALLOWED_NAV_IDS = new Set(['fichas','bestiario','personagens','prologo','classes','cronicas','livro','regras']);",
  "const MOBILE_ALLOWED_NAV_IDS = new Set(['session','fichas','bestiario','personagens','prologo','classes','cronicas','livro','regras']);"
);

const mobileMainRe=/  const mobileMain=\[\s*\{id:'fichas',label:'Ficha',icon:'📋'\},\s*\{id:'personagens',label:'Personagens',icon:'👤'\},\s*\{id:'livro',label:'Livro',icon:'✦'\},\s*\{id:'cronicas',label:'Crônicas',icon:'🗒️'\},\s*\];/;
if(mobileMainRe.test(exp)){
  exp=exp.replace(mobileMainRe,"  const mobileMain=[\n    {id:'session',label:'Início',icon:'⌂'},\n    {id:'fichas',label:'Ficha',icon:'📋'},\n    {id:'personagens',label:'Personagens',icon:'👤'},\n    {id:'livro',label:'Livro',icon:'✦'},\n    {id:'cronicas',label:'Crônicas',icon:'🗒️'},\n  ];");
}
must(exp.includes("{id:'session',label:'Início',icon:'⌂'}"),'atalho Início não aplicado');

// 2) Nenhuma trilha/ambiente sonoro é montado em viewport mobile.
if(app.includes('<AmbientSoundPlayer masterMode={masterMode}/>')){
  app=app.replace('<AmbientSoundPlayer masterMode={masterMode}/>','{!isMobileViewport()&&<AmbientSoundPlayer masterMode={masterMode}/>}');
}
must(app.includes('!isMobileViewport()&&<AmbientSoundPlayer'),'bloqueio de áudio mobile não aplicado');

// 3) Hub utilitário mobile + botão independente que abre/recolhe o HUD de personagem.
if(!game.includes('MOBILE SESSION HUB 2026-09-10')){
  const stateAnchor="  const [pingOpen,setPingOpen]=useState(false);";
  must(game.includes(stateAnchor),'estado de ping não encontrado');
  game=game.replace(stateAnchor,`${stateAnchor}\n  // MOBILE SESSION HUB 2026-09-10\n  const [mobileHudOpen,setMobileHudOpen]=useState(false);`);

  const modeAnchor="  const effectiveMode=game?.worldMode==='cinematic'?'cinematic':combat?.active?'combat':(game?.worldMode||'exploration');";
  must(game.includes(modeAnchor),'effectiveMode não encontrado');
  game=game.replace(modeAnchor,`  useEffect(()=>{ if(combat?.active) setMobileHudOpen(true); },[combat?.active]);\n\n${modeAnchor}`);

  const rootAnchor="  return <div className={`game3-root game3-mode-${effectiveMode} game3-preset-${preset} game3-tab-${tab}`} data-game3-mode={effectiveMode}>";
  must(game.includes(rootAnchor),'root GameExperience3 não encontrado');
  game=game.replace(rootAnchor,"  return <div className={`game3-root game3-mode-${effectiveMode} game3-preset-${preset} game3-tab-${tab} ${mobileHudOpen?'g3-mobile-hud-open':'g3-mobile-hud-closed'}`} data-game3-mode={effectiveMode}>");

  const utilityAnchor="    <UtilityRail tab={tab} panel={panel} setPanel={setPanel} masterMode={masterMode} onNavigate={onNavigate} preset={preset} setPreset={setPreset} onPing={()=>setPingOpen(true)}/>";
  must(game.includes(utilityAnchor),'UtilityRail não encontrado no render');
  const mobileHub=`${utilityAnchor}\n    <div className={\`g3-mobile-session-hub \${combat?.active?'combat':''}\`}>\n      <button className={panel==='sheet'?'active':''} onClick={()=>setPanel(panel==='sheet'?'':'sheet')}><span>◆</span><small>Ficha</small></button>\n      <button className={panel==='inventory'?'active':''} onClick={()=>setPanel(panel==='inventory'?'':'inventory')}><span>🗝</span><small>Itens</small></button>\n      <button className={panel==='journal'?'active':''} onClick={()=>setPanel(panel==='journal'?'':'journal')}><span>🗒</span><small>Diário Vivo</small></button>\n      <button onClick={()=>setPreset(preset==='standard'?'tactical':preset==='tactical'?'cinematic':'standard')}><span>{HUD_PRESETS[preset]?.icon||'✦'}</span><small>{HUD_PRESETS[preset]?.label||'HUD'}</small></button>\n    </div>\n    <button className={\`g3-mobile-hud-toggle \${combat?.active?'combat':''} \${mobileHudOpen?'open':''}\`} onClick={()=>setMobileHudOpen(v=>!v)} title=\"Mostrar ou recolher HUD\" aria-label=\"Mostrar ou recolher HUD\"><span>✦</span><small>HUD</small></button>`;
  game=game.replace(utilityAnchor,mobileHub);
}
must(game.includes('g3-mobile-session-hub'),'hub mobile não aplicado');
must(game.includes('g3-mobile-hud-toggle'),'toggle do HUD mobile não aplicado');

// 4) Transição de abas e zonas seguras: dock -> hub utilitário -> HUD -> botão/dado.
const CSS_MARK='/* MOBILE HUB + MOTION + SILENT 2026-09-10 */';
if(!expCss.includes(CSS_MARK)){
  expCss+=`\n\n${CSS_MARK}\n@media(max-width:900px){\n  .mobile-dock{grid-template-columns:repeat(6,minmax(0,1fr))!important}\n  .mobile-dock button{position:relative!important;transition:transform .22s cubic-bezier(.2,.8,.2,1),color .22s ease,background .22s ease,opacity .22s ease!important;-webkit-tap-highlight-color:transparent}\n  .mobile-dock button:active{transform:translateY(-3px) scale(.94)!important}\n  .mobile-dock button:after{content:'';position:absolute;left:26%;right:26%;bottom:2px;height:2px;border-radius:4px;background:var(--accent);opacity:0;transform:scaleX(.25);transition:opacity .28s ease,transform .34s cubic-bezier(.2,.9,.2,1);box-shadow:0 0 9px color-mix(in srgb,var(--accent) 50%,transparent)}\n  .mobile-dock button.active:after{opacity:1;transform:scaleX(1)}\n  .immersive-content>div{animation:g3MobilePageEnter .42s cubic-bezier(.18,.86,.22,1) both!important;transform-origin:50% 46%}\n  @keyframes g3MobilePageEnter{0%{opacity:0;transform:translate3d(14px,7px,0) scale(.992);filter:blur(2px)}55%{opacity:1;filter:blur(0)}100%{opacity:1;transform:none;filter:none}}\n  @media(prefers-reduced-motion:reduce){.immersive-content>div{animation:none!important}.mobile-dock button{transition:none!important}}\n}\n`;
}

if(!gameCss.includes(CSS_MARK)){
  gameCss+=`\n\n${CSS_MARK}\n.g3-mobile-session-hub,.g3-mobile-hud-toggle{display:none}\n@media(max-width:900px){\n  /* Hub utilitário permanente, acima da navegação e sem cobrir o dado. */\n  .g3-mobile-session-hub{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));position:fixed;left:8px;right:72px;bottom:74px;height:48px;z-index:805;gap:3px;padding:4px;border:1px solid rgba(168,85,247,.14);border-radius:13px;background:linear-gradient(180deg,rgba(10,5,20,.9),rgba(5,2,11,.94));box-shadow:0 10px 28px rgba(0,0,0,.4);backdrop-filter:blur(12px);pointer-events:auto;opacity:.76;transition:opacity .25s ease,border-color .25s ease}\n  .g3-mobile-session-hub.combat{opacity:1;border-color:rgba(232,25,60,.22)}\n  .g3-mobile-session-hub button{min-width:0;border:0;border-radius:8px;background:transparent;color:#7c6d86;display:flex;align-items:center;justify-content:center;gap:5px;padding:3px;transition:.2s ease}\n  .g3-mobile-session-hub button:active{transform:scale(.95)}.g3-mobile-session-hub button.active{color:#c3a7da;background:rgba(168,85,247,.09)}\n  .g3-mobile-session-hub button span{font-size:13px;line-height:1}.g3-mobile-session-hub button small{font:700 6px 'Cinzel',serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n  /* Botão do HUD fica no canto direito, imediatamente acima do dado. */\n  .g3-mobile-hud-toggle{display:flex;position:fixed;right:10px;bottom:132px;width:52px;height:52px;z-index:812;border-radius:16px;border:1px solid rgba(168,85,247,.2);background:linear-gradient(145deg,rgba(12,6,24,.88),rgba(5,2,11,.9));color:#9a81aa;align-items:center;justify-content:center;flex-direction:column;gap:1px;box-shadow:0 10px 26px rgba(0,0,0,.48),0 0 18px rgba(168,85,247,.07);backdrop-filter:blur(10px);opacity:.5;transition:opacity .25s ease,transform .25s cubic-bezier(.2,.8,.2,1),border-color .25s ease,box-shadow .25s ease;pointer-events:auto}\n  .g3-mobile-hud-toggle span{font-size:16px;line-height:1}.g3-mobile-hud-toggle small{font:700 6px 'Cinzel',serif;letter-spacing:.08em}.g3-mobile-hud-toggle.open{opacity:.78;border-color:rgba(168,85,247,.34)}.g3-mobile-hud-toggle.combat{opacity:1;color:#e9b0ba;border-color:rgba(232,25,60,.34);box-shadow:0 10px 26px rgba(0,0,0,.5),0 0 20px rgba(232,25,60,.14)}.g3-mobile-hud-toggle:active{transform:scale(.93)}\n  /* O HUD principal ocupa sua própria faixa. Fechado em exploração, abre por toque; combate abre automaticamente. */\n  .g3-actionbar{left:8px!important;right:72px!important;bottom:130px!important;width:auto!important;transition:opacity .3s ease,transform .34s cubic-bezier(.2,.8,.2,1)!important}\n  .g3-mobile-hud-closed .g3-actionbar:not(.combat){opacity:0!important;transform:translateY(26px) scale(.97)!important;pointer-events:none!important}\n  .g3-mobile-hud-open .g3-actionbar,.g3-actionbar.combat{opacity:1!important;transform:none!important;pointer-events:auto!important}\n  /* O dado fica abaixo do botão de HUD e à direita do hub utilitário. */\n  .dice-widget{right:10px!important;bottom:74px!important;z-index:810!important}\n  .immersive-content,.access-player:has(.game3-mode-combat) .immersive-content,.access-master:has(.game3-mode-combat) .immersive-content{padding-bottom:210px!important}\n  .session-page{padding-bottom:210px!important}\n}\n`;
}

for(const marker of ["'session','fichas'",'!isMobileViewport()&&<AmbientSoundPlayer','g3-mobile-session-hub','g3-mobile-hud-toggle','g3MobilePageEnter']){
  must(app.includes(marker)||exp.includes(marker)||game.includes(marker)||expCss.includes(marker)||gameCss.includes(marker),`marcador final ausente: ${marker}`);
}
fs.writeFileSync(appFile,app);
fs.writeFileSync(expFile,exp);
fs.writeFileSync(gameFile,game);
fs.writeFileSync(expCssFile,expCss);
fs.writeFileSync(gameCssFile,gameCss);
console.log('Dinastia E: mobile com Início, hub utilitário, HUD recolhível, transições fluidas e áudio desativado.');
