import fs from 'node:fs';
import path from 'node:path';

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  const next = source.replace(before, after);
  if (next === source) throw new Error(`Session UI patch falhou: ${label}`);
  return next;
}

// 1) Jogador autenticado não digita novamente a senha da própria ficha.
const sheetsFile = path.join(process.cwd(), 'src', 'features', 'sheets', 'SheetsPage.jsx');
let sheets = fs.readFileSync(sheetsFile, 'utf8');
sheets = replaceRequired(
  sheets,
  'if (masterMode || !s.senha || unlockedIds[sid]) { setActiveId(sid); return; }',
  "if (masterMode || (playerSheetId && String(playerSheetId) === sid) || !s.senha || unlockedIds[sid]) { setActiveId(sid); return; }",
  'bypass de senha na aba Fichas'
);
sheets = replaceRequired(
  sheets,
  'const locked=!masterMode&&s.senha&&!unlockedIds[String(s.id)];',
  "const locked=!masterMode&&s.senha&&String(playerSheetId||'')!==String(s.id)&&!unlockedIds[String(s.id)];",
  'estado visual desbloqueado da ficha autenticada'
);
fs.writeFileSync(sheetsFile, sheets);

const battleFile = path.join(process.cwd(), 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let battle = fs.readFileSync(battleFile, 'utf8');
battle = replaceRequired(
  battle,
  'if (masterMode || !s.senha || unlockedIds[sid]) { toggleFloatingSheet(sid); return; }',
  "if (masterMode || (playerSheetId && String(playerSheetId) === sid) || !s.senha || unlockedIds[sid]) { toggleFloatingSheet(sid); return; }",
  'bypass de senha da ficha no mapa de batalha'
);
fs.writeFileSync(battleFile, battle);

// 2) Rolagem pública: fechável e com permanência máxima de 4 segundos.
const broadcastsFile = path.join(process.cwd(), 'src', 'experience', 'RealtimeBroadcasts.jsx');
let broadcasts = fs.readFileSync(broadcastsFile, 'utf8');
broadcasts = replaceRequired(broadcasts, 'const DICE_TTL = 16000;', 'const DICE_TTL = 4000;', 'TTL de quatro segundos do dado');
broadcasts = replaceRequired(
  broadcasts,
  '  const [revealed, setRevealed] = useState(false);',
  '  const [revealed, setRevealed] = useState(false);\n  const [dismissed, setDismissed] = useState(false);',
  'estado de fechar rolagem'
);
broadcasts = replaceRequired(
  broadcasts,
  '  return (\n    <div className="rt-dice-card" style={{ \'--rt-index\': index, \'--rt-color\': color }}>',
  '  if (dismissed) return null;\n  return (\n    <div className="rt-dice-card" style={{ \'--rt-index\': index, \'--rt-color\': color }}>',
  'ocultação manual do card de dado'
);
broadcasts = replaceRequired(
  broadcasts,
  '      <div className="rt-dice-head">🎲 {result.roller || \'Jogador\'} · D{result.sides}</div>',
  '      <div className="rt-dice-head">🎲 {result.roller || \'Jogador\'} · D{result.sides}</div>\n      <button className="rt-dice-close" onClick={() => setDismissed(true)} aria-label="Fechar rolagem" title="Fechar">✕</button>',
  'botão para fechar rolagem'
);
fs.writeFileSync(broadcastsFile, broadcasts);

const realtimeCssFile = path.join(process.cwd(), 'src', 'experience', 'realtime.css');
let realtimeCss = fs.readFileSync(realtimeCssFile, 'utf8');
if (!realtimeCss.includes('/* DADO FECHÁVEL 4S */')) {
  realtimeCss += `\n/* DADO FECHÁVEL 4S */\n.rt-dice-card{position:relative}\n.rt-dice-close{position:absolute;top:7px;right:7px;z-index:4;width:23px;height:23px;border-radius:50%;border:1px solid rgba(255,255,255,.13);background:rgba(5,2,12,.72);color:#8c7a96;display:grid;place-items:center;cursor:pointer;font-size:10px;line-height:1;backdrop-filter:blur(8px);transition:.18s}\n.rt-dice-close:hover{color:#e4d7e8;border-color:rgba(168,85,247,.36);background:rgba(168,85,247,.11)}\n`;
  fs.writeFileSync(realtimeCssFile, realtimeCss);
}

// 3) HUD de combate: todas as habilidades utilizáveis numa faixa horizontal.
const experienceFile = path.join(process.cwd(), 'src', 'experience', 'ExperienceKit.jsx');
let experience = fs.readFileSync(experienceFile, 'utf8');
experience = replaceRequired(
  experience,
  '  const [expanded,setExpanded]=useState(false);',
  '  const [expanded,setExpanded]=useState(false);\n  const abilityRailRef=useRef(null);',
  'referência da faixa de habilidades'
);
experience = replaceRequired(
  experience,
  '  const abilities=(selectedClass?.normal||[]).slice(0,3);',
  '  const abilities=(selectedClass?.normal||[]);',
  'todas as habilidades normais no HUD'
);
experience = replaceRequired(
  experience,
  '    <div className="hud-abilities">{abilities.map(a=>{',
  '    <div className="hud-abilities" ref={abilityRailRef} title="Role o mouse para navegar pelas habilidades" onWheel={e=>{const rail=abilityRailRef.current;if(!rail)return;const delta=Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX;if(!delta)return;e.preventDefault();rail.scrollLeft+=delta;}}>{abilities.map(a=>{',
  'scroll horizontal das habilidades'
);
fs.writeFileSync(experienceFile, experience);

const experienceCssFile = path.join(process.cwd(), 'src', 'experience', 'experience.css');
let experienceCss = fs.readFileSync(experienceCssFile, 'utf8');
if (!experienceCss.includes('/* HUD DE HABILIDADES HORIZONTAL */')) {
  experienceCss += `\n/* HUD DE HABILIDADES HORIZONTAL */\n.hud-abilities{display:flex;grid-template-columns:none;gap:6px;min-width:0;overflow-x:auto;overflow-y:hidden;scroll-behavior:smooth;overscroll-behavior-x:contain;scroll-snap-type:x proximity;padding-bottom:2px;scrollbar-width:thin;scrollbar-color:rgba(168,85,247,.25) transparent}\n.hud-abilities::-webkit-scrollbar{height:4px}.hud-abilities::-webkit-scrollbar-track{background:transparent}.hud-abilities::-webkit-scrollbar-thumb{background:rgba(168,85,247,.22);border-radius:9px}\n.hud-abilities button{flex:0 0 128px;min-width:128px;scroll-snap-align:start}\n@media(max-width:900px){.combat-hud:not(.expanded) .hud-abilities{display:none}.combat-hud.expanded .hud-abilities{display:flex;grid-column:1/3;grid-row:2;min-width:0;width:100%}.combat-hud.expanded .hud-abilities button{flex-basis:118px;min-width:118px}}\n`;
  fs.writeFileSync(experienceCssFile, experienceCss);
}

for (const check of [
  [sheets, 'playerSheetId && String(playerSheetId) === sid', 'senha única em Fichas'],
  [battle, 'playerSheetId && String(playerSheetId) === sid', 'senha única no mapa'],
  [broadcasts, 'const DICE_TTL = 4000;', 'TTL do dado'],
  [broadcasts, 'rt-dice-close', 'fechar dado'],
  [experience, 'const abilities=(selectedClass?.normal||[]);', 'todas as habilidades'],
  [experience, 'abilityRailRef', 'scroll de habilidades'],
]) {
  if (!check[0].includes(check[1])) throw new Error(`Validação ausente: ${check[2]}`);
}

console.log('Dinastia E: login reutiliza autenticação da ficha, dados fecham/expiram em 4s e HUD mostra todas as habilidades com scroll horizontal.');
