import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const gameFile = path.join(root, 'src', 'experience', 'GameExperience3.jsx');
const gameCssFile = path.join(root, 'src', 'experience', 'game-experience-3.css');
const battleFile = path.join(root, 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
const diceReplayFile = path.join(root, 'src', 'experience', 'SharedDiceReplay.jsx');
const MARKER = 'GAME EXPERIENCE 3 POLISH + LIVE EVENTS 2026-09-10';
const CSS_MARKER = '/* GAME EXPERIENCE 3 POLISH + LIVE EVENTS 2026-09-10 */';

for (const file of [gameFile, gameCssFile, battleFile, diceReplayFile]) {
  if (!fs.existsSync(file)) throw new Error(`Game Experience 3 polish: arquivo ausente: ${path.relative(root, file)}`);
}

let game = fs.readFileSync(gameFile, 'utf8');
let css = fs.readFileSync(gameCssFile, 'utf8');
let battle = fs.readFileSync(battleFile, 'utf8');
let replay = fs.readFileSync(diceReplayFile, 'utf8');

const must = (condition, message) => {
  if (!condition) throw new Error(`Game Experience 3 polish: ${message}`);
};

function replaceGame(before, after, label) {
  if (game.includes(after)) return;
  must(game.includes(before), label);
  game = game.replace(before, after);
}

if (!game.includes(`/* ${MARKER} */`)) {
  replaceGame(
    "import './game-experience-3.css';",
    `import './game-experience-3.css';\n/* ${MARKER} */`,
    'âncora de marcação não encontrada'
  );

  const oldAbilities = `function listAbilities(cls){
  const buckets=[cls?.normal,cls?.especial,cls?.special,cls?.campanha,cls?.campaign];
  const rows=[];
  buckets.forEach(bucket=>{
    if(Array.isArray(bucket)) rows.push(...bucket);
    else if(bucket && typeof bucket==='object') rows.push(bucket);
  });
  const seen=new Set();
  return rows.filter(a=>{
    if(!a) return false;
    const key=String(a.id||a.name||a.nome||JSON.stringify(a));
    if(seen.has(key)) return false;
    seen.add(key); return true;
  });
}`;
  const newAbilities = `function listAbilities(cls,sheet){
  const buckets=[
    cls?.normal,cls?.normais,cls?.habilidades,cls?.abilities,cls?.skills,
    cls?.especial,cls?.especiais,cls?.special,cls?.campanha,cls?.campaign,
    sheet?.normal,sheet?.normais,sheet?.habilidades,sheet?.abilities,sheet?.skills,
    sheet?.especial,sheet?.especiais,sheet?.special,sheet?.campanha,sheet?.campaign,
  ];
  const rows=[];
  const pushBucket=bucket=>{
    if(Array.isArray(bucket)) bucket.forEach(pushBucket);
    else if(bucket && typeof bucket==='object'){
      const looksLikeAbility=!!(bucket.id||bucket.name||bucket.nome||bucket.desc||bucket.descricao||bucket.custo!=null||bucket.cost!=null);
      if(looksLikeAbility) rows.push(bucket);
      else Object.values(bucket).forEach(pushBucket);
    }
  };
  buckets.forEach(pushBucket);
  const seen=new Set();
  return rows.filter(a=>{
    if(!a) return false;
    const key=String(a.id||a.name||a.nome||JSON.stringify(a));
    if(seen.has(key)) return false;
    seen.add(key); return true;
  });
}`;
  replaceGame(oldAbilities, newAbilities, 'helper de habilidades não encontrado');

  game = game.replaceAll('listAbilities(selectedClass).slice(0,4)', 'listAbilities(selectedClass,selectedSheet)');
  game = game.replaceAll('listAbilities(selectedClass)', 'listAbilities(selectedClass,selectedSheet)');
  game = game.replaceAll('const abilities=listAbilities(cls);', 'const abilities=listAbilities(cls,sheet);');
  game = game.replace("<kbd>{['Q','W','E','R'][index]}</kbd>", "<kbd>{['Q','W','E','R'][index]||String(index+1)}</kbd>");

  replaceGame(
    "      const idx={q:0,w:1,e:2,r:3}[String(e.key||'').toLowerCase()];\n      if(idx==null||!abilities[idx])return;",
    "      const pressed=String(e.key||'').toLowerCase();\n      const idx={q:0,w:1,e:2,r:3}[pressed] ?? (/^[5-9]$/.test(pressed)?Number(pressed)-1:null);\n      if(idx==null||!abilities[idx])return;",
    'atalhos de habilidade não encontrados'
  );

  replaceGame(
    "  const [bossVisible,setBossVisible]=useState(false);\n  const [discoveryVisible,setDiscoveryVisible]=useState(false);",
    "  const [bossVisible,setBossVisible]=useState(false);\n  const bossRevealPrimedRef=useRef(false);\n  const lastBossRevealIdRef=useRef('');\n  const [gameReady,setGameReady]=useState(false);\n  const [discoveryVisible,setDiscoveryVisible]=useState(false);",
    'estados do boss reveal não encontrados'
  );

  replaceGame(
    "    const u1=onSnapshot(doc(db,'config',GAME_DOC),snap=>setGame(snap.exists()?{worldMode:'exploration',environment:{type:'none',intensity:45},...(snap.data()||{})}:{worldMode:'exploration',environment:{type:'none',intensity:45}}));",
    "    const u1=onSnapshot(doc(db,'config',GAME_DOC),snap=>{setGame(snap.exists()?{worldMode:'exploration',environment:{type:'none',intensity:45},...(snap.data()||{})}:{worldMode:'exploration',environment:{type:'none',intensity:45}});setGameReady(true);});",
    'listener principal do Game Experience 3 não encontrado'
  );

  const oldBossEffect = `  useEffect(()=>{
    const boss=game?.bossReveal;
    const dismissed=String(game?.bossRevealDismissedId||'');
    if(!boss?.id||boss.visible===false||dismissed===String(boss.id)){setBossVisible(false);return;}
    setBossVisible(true);
    const duration=clamp(Number(boss.durationMs||8500),3000,20000);
    const timer=window.setTimeout(()=>setBossVisible(false),duration);
    return()=>window.clearTimeout(timer);
  },[game?.bossReveal?.id,game?.bossReveal?.visible,game?.bossRevealDismissedId]);`;
  const newBossEffect = `  useEffect(()=>{
    if(!gameReady)return;
    const boss=game?.bossReveal;
    const id=String(boss?.id||'');
    const dismissed=String(game?.bossRevealDismissedId||'');
    if(!bossRevealPrimedRef.current){
      bossRevealPrimedRef.current=true;
      lastBossRevealIdRef.current=id;
      setBossVisible(false);
      return;
    }
    if(!id||id===lastBossRevealIdRef.current||boss.visible===false||dismissed===id){setBossVisible(false);return;}
    lastBossRevealIdRef.current=id;
    setBossVisible(true);
    const duration=clamp(Number(boss.durationMs||8500),3000,20000);
    const timer=window.setTimeout(()=>setBossVisible(false),duration);
    return()=>window.clearTimeout(timer);
  },[gameReady,game?.bossReveal?.id,game?.bossReveal?.visible,game?.bossRevealDismissedId]);`;
  replaceGame(oldBossEffect, newBossEffect, 'efeito persistente do boss reveal não encontrado');
}

if (!battle.includes('battle-master-toolbar-handle')) {
  const wrapper = "            <div style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 40, display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'none' }}>";
  must(battle.includes(wrapper), 'wrapper da toolbar do Mestre não encontrado');
  battle = battle.replace(wrapper, `${wrapper.replace('<div ', '<div className="battle-master-toolbar" ')}\n              <button type="button" className="battle-master-toolbar-handle" title="Ferramentas do Mestre"><span>✦</span><b>Ferramentas</b></button>`);

  const tabs = "              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', pointerEvents: 'auto' }}>";
  if (battle.includes(tabs)) battle = battle.replace(tabs, tabs.replace('<div ', '<div className="battle-master-map-tabs" '));

  const controls = "                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', pointerEvents: 'auto' }}>";
  if (battle.includes(controls)) battle = battle.replace(controls, controls.replace('<div ', '<div className="battle-master-controls" '));
}

function removeDuplicateByLabel(source, label, tag='button') {
  let out = source;
  let first = out.indexOf(label);
  if (first < 0) return out;
  let next = out.indexOf(label, first + label.length);
  while (next >= 0) {
    const open = out.lastIndexOf(`<${tag}`, next);
    const closeStart = out.indexOf(`</${tag}>`, next);
    if (open < 0 || closeStart < 0 || open > next) break;
    const close = closeStart + tag.length + 3;
    out = out.slice(0, open) + out.slice(close);
    next = out.indexOf(label, first + label.length);
  }
  return out;
}

battle = removeDuplicateByLabel(battle, '📚 Biblioteca', 'button');
battle = removeDuplicateByLabel(battle, '📏 Régua', 'button');
battle = removeDuplicateByLabel(battle, '1m=', 'label');

battle = battle.replaceAll("📚 Biblioteca", "◇ Biblioteca");
battle = battle.replaceAll("📏 Régua", "⌁ Medir");
battle = battle.replaceAll("+ Novo Mapa", "＋ Novo cenário");
battle = battle.replaceAll("✎ Renomear", "✎ Nome");
battle = battle.replaceAll("+ Token", "✦ Token");
battle = battle.replaceAll("🌫 Cobrir", "◌ Névoa");
battle = battle.replaceAll("🧽 Revelar área", "✧ Revelar");
battle = battle.replaceAll("🗺 {currentMap.img ? 'Trocar' : 'Enviar'} Imagem", "◫ {currentMap.img ? 'Cenário' : 'Adicionar cenário'}");

if (!replay.includes('joinedAtRef')) {
  const anchor = "  const localClientIdRef = useRef(getDiceTabClientId());\n  const seenRef = useRef(new Set());";
  must(replay.includes(anchor), 'âncora do SharedDiceReplay não encontrada');
  replay = replay.replace(anchor, "  const localClientIdRef = useRef(getDiceTabClientId());\n  const joinedAtRef = useRef(Date.now());\n  const seenRef = useRef(new Set());");

  const enqueueAnchor = `    const id = getReplayId(payload);
    if (!id || seenRef.current.has(id)) return;
    remember(id);`;
  const enqueueReplacement = `    const id = getReplayId(payload);
    if (!id || seenRef.current.has(id)) return;
    const eventTs = Number(payload?.ts || 0);
    if (!eventTs || eventTs < joinedAtRef.current) {
      remember(id);
      return;
    }
    remember(id);`;
  must(replay.includes(enqueueAnchor), 'ingestão do SharedDiceReplay não encontrada');
  replay = replay.replace(enqueueAnchor, enqueueReplacement);
}

if (!css.includes(CSS_MARKER)) {
  css += `\n\n${CSS_MARKER}
.g3-utility-rail{right:14px!important;top:50%!important;transform:translateY(-50%);width:44px!important;max-height:44px;overflow:hidden;padding:4px!important;border-radius:14px!important;background:linear-gradient(180deg,rgba(10,5,21,.94),rgba(5,2,11,.94))!important;box-shadow:0 12px 34px rgba(0,0,0,.48),0 0 20px rgba(168,85,247,.07)!important;transition:max-height .24s ease,width .2s ease,border-color .2s ease,box-shadow .2s ease;scrollbar-width:none}
.g3-utility-rail::-webkit-scrollbar{display:none}.g3-utility-rail:hover,.g3-utility-rail:focus-within{width:58px!important;max-height:min(560px,calc(100vh - 150px));border-color:rgba(168,85,247,.28)!important;box-shadow:0 16px 46px rgba(0,0,0,.58),0 0 28px rgba(168,85,247,.12)!important}
.g3-utility-rail>button{min-height:36px!important;height:36px!important;border-radius:10px!important;flex:0 0 36px}.g3-utility-rail>button span{font-size:16px!important}.g3-utility-rail>button small{max-height:0;opacity:0;overflow:hidden;transition:.18s}.g3-utility-rail:hover>button,.g3-utility-rail:focus-within>button{height:46px!important;flex-basis:46px}.g3-utility-rail:hover>button small,.g3-utility-rail:focus-within>button small{max-height:10px;opacity:1}
.g3-master-quickbar{left:84px!important;top:50%!important;transform:translateY(-50%);width:42px;max-height:42px;overflow:hidden;padding:4px!important;border-radius:14px!important;background:linear-gradient(180deg,rgba(13,7,18,.94),rgba(6,3,11,.94))!important;border-color:rgba(232,160,32,.14)!important;box-shadow:0 12px 34px rgba(0,0,0,.46)!important;transition:max-height .24s ease,border-color .2s ease,box-shadow .2s ease}
.g3-master-quickbar:hover,.g3-master-quickbar:focus-within{max-height:260px;border-color:rgba(232,160,32,.28)!important;box-shadow:0 16px 46px rgba(0,0,0,.58),0 0 24px rgba(232,160,32,.08)!important}.g3-master-quickbar button{width:34px!important;height:34px!important;flex:0 0 34px;border-radius:10px!important;font-size:15px}.g3-master-quickbar button:first-child{color:#d8b56f}
.g3-actionbar{width:min(1020px,calc(100vw - 270px))!important;grid-template-columns:minmax(140px,180px) 118px minmax(0,1fr) auto!important;gap:7px!important}
.g3-hotbar{display:flex!important;grid-template-columns:none!important;gap:5px!important;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;scrollbar-color:rgba(168,85,247,.28) transparent;padding-bottom:2px;scroll-snap-type:x proximity}
.g3-hotbar::-webkit-scrollbar{height:4px}.g3-hotbar::-webkit-scrollbar-thumb{background:rgba(168,85,247,.25);border-radius:10px}.g3-hotbar>button{flex:0 0 116px;min-width:116px!important;height:55px;scroll-snap-align:start;background:linear-gradient(180deg,rgba(168,85,247,.065),rgba(168,85,247,.025))!important;border-color:rgba(168,85,247,.16)!important}.g3-hotbar>button:hover:not(:disabled){box-shadow:0 7px 18px rgba(0,0,0,.26),0 0 14px rgba(168,85,247,.09)}
.battle-master-toolbar{right:auto!important;width:46px!important;max-width:calc(100% - 20px);max-height:44px;overflow:hidden!important;pointer-events:auto!important;padding:4px!important;border:1px solid rgba(183,132,235,.18);border-radius:14px;background:linear-gradient(180deg,rgba(10,5,21,.94),rgba(4,2,10,.94));box-shadow:0 14px 38px rgba(0,0,0,.5),0 0 22px rgba(133,72,190,.08);backdrop-filter:blur(12px);transition:width .24s ease,max-height .28s ease,border-color .2s ease,box-shadow .2s ease}
.battle-master-toolbar:hover,.battle-master-toolbar:focus-within{width:min(860px,calc(100% - 96px))!important;max-height:230px;overflow:auto!important;border-color:rgba(183,132,235,.34);box-shadow:0 20px 55px rgba(0,0,0,.62),0 0 32px rgba(133,72,190,.12)}
.battle-master-toolbar-handle{width:36px;height:34px;min-height:34px;display:flex;align-items:center;justify-content:center;gap:0;flex:0 0 auto;border:1px solid rgba(183,132,235,.2);border-radius:10px;background:radial-gradient(circle at 35% 30%,rgba(168,85,247,.16),rgba(255,255,255,.02));color:#c9a9de;cursor:pointer;box-shadow:inset 0 0 14px rgba(168,85,247,.05)}
.battle-master-toolbar-handle span{font-size:17px;text-shadow:0 0 14px rgba(168,85,247,.55)}.battle-master-toolbar-handle b{display:none;font:700 7px 'Cinzel',serif;letter-spacing:.12em;text-transform:uppercase}.battle-master-toolbar:hover .battle-master-toolbar-handle,.battle-master-toolbar:focus-within .battle-master-toolbar-handle{width:auto;padding:0 11px;gap:7px}.battle-master-toolbar:hover .battle-master-toolbar-handle b,.battle-master-toolbar:focus-within .battle-master-toolbar-handle b{display:block}
.battle-master-map-tabs,.battle-master-controls{pointer-events:auto!important;display:flex!important;gap:5px!important;flex-wrap:wrap!important;align-items:center}.battle-master-map-tabs{padding-top:2px}.battle-master-map-tabs button,.battle-master-controls button,.battle-master-controls label{min-height:32px!important;border-radius:9px!important;border:1px solid rgba(255,255,255,.075)!important;background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.012))!important;color:#a997b1!important;box-shadow:none!important;backdrop-filter:none!important;font-family:'Cinzel',serif!important;font-size:8px!important;letter-spacing:.02em;transition:background .18s ease,border-color .18s ease,color .18s ease,transform .18s ease}
.battle-master-map-tabs button:hover,.battle-master-controls button:hover{background:rgba(168,85,247,.08)!important;border-color:rgba(168,85,247,.26)!important;color:#d0b9dc!important;transform:translateY(-1px)}.battle-master-controls label{padding:4px 7px!important}.battle-master-controls input{background:rgba(2,1,7,.55)!important;border-color:rgba(255,255,255,.08)!important;color:#c0acc8!important}
@media(max-width:900px){
  .immersive-content,.access-player:has(.game3-mode-combat) .immersive-content,.access-master:has(.game3-mode-combat) .immersive-content{padding-top:52px!important;padding-bottom:146px!important}.immersive-content.main-locked{padding-bottom:146px!important}
  .g3-utility-rail{display:flex!important;left:8px!important;right:8px!important;top:auto!important;bottom:8px!important;transform:none!important;width:auto!important;max-height:46px!important;height:46px;max-width:none;flex-direction:row!important;align-items:center;gap:3px!important;overflow-x:auto!important;overflow-y:hidden!important;padding:4px!important;border-radius:14px!important}
  .g3-utility-rail:hover,.g3-utility-rail:focus-within{width:auto!important;max-height:46px!important}.g3-utility-rail>button,.g3-utility-rail:hover>button,.g3-utility-rail:focus-within>button{flex:0 0 38px!important;width:38px!important;height:36px!important;min-height:36px!important;padding:0!important}.g3-utility-rail>button small,.g3-utility-rail:hover>button small,.g3-utility-rail:focus-within>button small{display:none!important}.g3-rail-separator{width:1px!important;height:24px!important;margin:0 2px!important;flex:0 0 1px}
  .g3-master-quickbar{display:none!important}
  .g3-actionbar{left:6px!important;right:6px!important;bottom:60px!important;transform:none!important;width:auto!important;height:74px!important;grid-template-columns:84px minmax(0,1fr) 30px!important;padding:5px 6px!important;border-radius:15px!important}.g3-action-meters{display:none!important}.g3-action-character{min-width:0!important;gap:4px!important;padding:0 2px!important}.g3-action-character .g3-portrait{width:38px!important;height:38px!important}.g3-action-character>span:last-child small{display:none!important}.g3-action-character b{font-size:6px!important}.g3-hotbar{height:60px!important;gap:4px!important;padding-bottom:1px}.g3-hotbar>button{flex-basis:92px!important;min-width:92px!important;height:56px!important;padding:4px 4px 4px 20px!important}.g3-hotbar span{font-size:6px!important}.g3-hotbar small{font-size:5px!important}.g3-hotbar kbd{left:4px!important;top:5px!important}.g3-action-shortcuts{display:grid!important;gap:3px!important}.g3-action-shortcuts button{width:28px!important;height:28px!important}.g3-action-shortcuts button:first-child{display:none!important}
  .dice-widget{bottom:144px!important;right:8px!important}.master-battle-console{left:8px!important;right:8px!important;bottom:144px!important;width:auto!important;transform:none!important}.mbc-orb{right:70px!important;bottom:144px!important}.g3-npc-focus{left:8px!important;right:8px!important;bottom:144px!important;width:auto!important}.battlemap-ping-button{right:8px!important;top:auto!important;bottom:144px!important}.battlemap-ping-wheel-inline{right:8px!important;top:auto!important;bottom:192px!important}
  .g3-top-context{left:6px!important;right:6px!important}.g3-context-card{border-radius:11px!important;min-height:40px!important}.g3-turn-strip{border-radius:11px!important}.g3-feedback-stack{right:6px!important;top:108px!important;width:min(240px,74vw)!important}
  .battle-master-toolbar{top:8px!important;left:8px!important;right:auto!important;width:42px!important;max-width:calc(100% - 16px);max-height:42px}.battle-master-toolbar:hover,.battle-master-toolbar:focus-within{width:calc(100% - 16px)!important;max-height:min(56vh,360px)!important}.battle-master-toolbar-handle{width:32px!important;height:32px!important;min-height:32px!important}.battle-master-map-tabs,.battle-master-controls{gap:4px!important}.battle-master-map-tabs button,.battle-master-controls button,.battle-master-controls label{min-height:34px!important;font-size:7px!important}
}
@media(max-width:580px){
  .g3-actionbar{grid-template-columns:70px minmax(0,1fr) 28px!important}.g3-action-character .g3-portrait{width:34px!important;height:34px!important}.g3-action-character b{font-size:5.5px!important}.g3-hotbar>button{flex-basis:84px!important;min-width:84px!important}.g3-context-card{grid-template-columns:auto minmax(0,1fr)!important}.g3-objective b{font-size:6px!important}.g3-utility-rail{gap:2px!important}.g3-utility-rail>button{flex-basis:36px!important;width:36px!important}
}
`;
}

must(game.includes(`/* ${MARKER} */`), 'marcador do Game Experience 3 não aplicado');
must(game.includes('listAbilities(selectedClass,selectedSheet)'), 'todas as habilidades não foram liberadas no HUD');
must(game.includes('bossRevealPrimedRef'), 'proteção contra boss reveal no login não aplicada');
must(battle.includes('battle-master-toolbar-handle'), 'toolbar moderna do Mestre não aplicada');
must(replay.includes('joinedAtRef'), 'bloqueio de replay histórico dos dados não aplicado');
must(css.includes(CSS_MARKER), 'polimento visual não aplicado');

fs.writeFileSync(gameFile, game);
fs.writeFileSync(gameCssFile, css);
fs.writeFileSync(battleFile, battle);
fs.writeFileSync(diceReplayFile, replay);

console.log('Dinastia E: UI do Mestre modernizada, HUDs recolhíveis, todas as habilidades liberadas, boss reveal somente ao vivo, replay histórico de dados bloqueado e mobile refinado.');
