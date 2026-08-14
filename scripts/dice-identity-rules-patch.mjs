import fs from 'node:fs';
import path from 'node:path';

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  const next = source.replace(before, after);
  if (next === source) throw new Error(`Dice identity/rules patch falhou: ${label}`);
  return next;
}

// ── Login: preserva classe/cor no acesso para rolagens imediatas ────────────
const accessFile = path.join(process.cwd(), 'src', 'experience', 'PlayerAccess.jsx');
let access = fs.readFileSync(accessFile, 'utf8');
access = replaceRequired(
  access,
  "      photo: selected.foto || '',\n      ts: Date.now(),",
  "      photo: selected.foto || '',\n      classId: selected.classe || '',\n      className: CLASSES.find(c => c.id === selected.classe)?.name || '',\n      color: CLASSES.find(c => c.id === selected.classe)?.color || '#C8A8E8',\n      ts: Date.now(),",
  'classe e cor no login do jogador'
);
fs.writeFileSync(accessFile, access);

// ── Dado: identifica a ficha autenticada e publica nome/classe/cor ─────────
const diceFile = path.join(process.cwd(), 'src', 'shell', 'DiceWidget.jsx');
let dice = fs.readFileSync(diceFile, 'utf8');
dice = replaceRequired(
  dice,
  'import { publishDiceResult } from "../core/combatEvents";',
  'import { publishDiceResult } from "../core/combatEvents";\nimport { CLASSES } from "../data/gameData";',
  'import das classes no dado'
);
dice = replaceRequired(
  dice,
  'function DiceWidget() {',
  'function DiceWidget({ access }) {',
  'acesso no DiceWidget'
);
dice = replaceRequired(
  dice,
  "  const [combatActive, setCombatActive] = useState(false);\n  useEffect(() => {",
  "  const [combatActive, setCombatActive] = useState(false);\n  const [rollerProfile, setRollerProfile] = useState({\n    name: access?.name || (access?.role === 'master' ? 'Mestre' : 'Jogador'),\n    color: access?.color || (access?.role === 'master' ? '#E8A020' : '#C8A8E8'),\n    classId: access?.classId || '',\n    className: access?.className || '',\n  });\n\n  useEffect(() => {\n    if (access?.role !== 'player' || !access?.sheetId) {\n      setRollerProfile({\n        name: access?.name || (access?.role === 'master' ? 'Mestre' : 'Jogador'),\n        color: access?.color || (access?.role === 'master' ? '#E8A020' : '#C8A8E8'),\n        classId: access?.classId || '',\n        className: access?.className || '',\n      });\n      return undefined;\n    }\n    const unsub = onSnapshot(doc(db, 'sheets', String(access.sheetId)), snap => {\n      const sheet = snap.exists() ? (snap.data() || {}) : {};\n      const classId = sheet.classe || access?.classId || '';\n      const cls = CLASSES.find(c => String(c.id) === String(classId));\n      setRollerProfile({\n        name: sheet.nome || access?.name || 'Jogador',\n        color: cls?.color || access?.color || '#C8A8E8',\n        classId,\n        className: cls?.name || access?.className || '',\n      });\n    }, () => {});\n    return () => unsub();\n  }, [access?.role, access?.sheetId, access?.name, access?.color, access?.classId, access?.className]);\n\n  useEffect(() => {",
  'perfil realtime de quem rola o dado'
);
dice = replaceRequired(
  dice,
  "    const res = { base, total, sides: dice, bonus: Number(bonus), isCrit, isFail, ts: Date.now(), roller: 'Jogador' };",
  "    const res = {\n      base, total, sides: dice, bonus: Number(bonus), isCrit, isFail, ts: Date.now(),\n      roller: rollerProfile.name || access?.name || 'Jogador',\n      rollerColor: rollerProfile.color || '#C8A8E8',\n      rollerClass: rollerProfile.classId || '',\n      rollerClassName: rollerProfile.className || '',\n      rollerSheetId: access?.sheetId ? String(access.sheetId) : '',\n    };",
  'identidade publicada na rolagem'
);
dice = replaceRequired(
  dice,
  "color={result.isCrit?'#4ADE80':result.isFail?'#E8193C':'#C8A8E8'}",
  "color={rollerProfile.color || (result.isCrit?'#4ADE80':result.isFail?'#E8193C':'#C8A8E8')}",
  'cor da classe no dado local'
);
fs.writeFileSync(diceFile, dice);

// O shell possui o acesso autenticado; entrega esse contexto ao dado global.
const appFile = path.join(process.cwd(), 'src', 'App.generated.jsx');
let app = fs.readFileSync(appFile, 'utf8');
app = replaceRequired(app, '<DiceWidget/>', '<DiceWidget access={access}/>', 'accesso passado ao dado');
fs.writeFileSync(appFile, app);

// ── Popup público: bloco e pulso usam a cor da classe do personagem ────────
const broadcastsFile = path.join(process.cwd(), 'src', 'experience', 'RealtimeBroadcasts.jsx');
let broadcasts = fs.readFileSync(broadcastsFile, 'utf8');
broadcasts = replaceRequired(
  broadcasts,
  "  const color = isCrit ? '#4ADE80' : isFail ? '#E8193C' : '#C8A8E8';",
  "  const color = result.rollerColor || (isCrit ? '#4ADE80' : isFail ? '#E8193C' : '#C8A8E8');",
  'cor da ficha no popup público'
);
fs.writeFileSync(broadcastsFile, broadcasts);

const realtimeCssFile = path.join(process.cwd(), 'src', 'experience', 'realtime.css');
let realtimeCss = fs.readFileSync(realtimeCssFile, 'utf8');
const diceIdentityMarker = '/* DADO IDENTIFICADO POR PERSONAGEM */';
if (!realtimeCss.includes(diceIdentityMarker)) {
  realtimeCss += `\n${diceIdentityMarker}\n.rt-dice-card{animation:rtDiceIn .25s ease both,rtDiceClassPulse 1.15s ease-in-out .3s infinite alternate}\n.rt-dice-head{color:var(--rt-color);text-shadow:0 0 10px color-mix(in srgb,var(--rt-color) 35%,transparent)}\n@keyframes rtDiceClassPulse{from{border-color:color-mix(in srgb,var(--rt-color) 34%,transparent);box-shadow:0 10px 34px rgba(0,0,0,.55),0 0 18px color-mix(in srgb,var(--rt-color) 12%,transparent)}to{border-color:color-mix(in srgb,var(--rt-color) 72%,transparent);box-shadow:0 10px 34px rgba(0,0,0,.55),0 0 34px color-mix(in srgb,var(--rt-color) 34%,transparent),inset 0 0 20px color-mix(in srgb,var(--rt-color) 7%,transparent)}}\n`;
}
fs.writeFileSync(realtimeCssFile, realtimeCss);

// ── Regras: teto de três ataques básicos consecutivos por turno ────────────
const gameDataFile = path.join(process.cwd(), 'src', 'data', 'gameData.jsx');
let gameData = fs.readFileSync(gameDataFile, 'utf8');
gameData = replaceRequired(
  gameData,
  "title:'Tipos de Ação e Custos',",
  "title:'Tipos de Ação, Custos e Limites',",
  'título da regra de ações'
);
gameData = replaceRequired(
  gameData,
  '⚔️ Ataque Normal — 2 VC\\nExecuta um dos ataques normais da classe.\\n\\n✨ Ataque Especial — 3 VC',
  '⚔️ Ataque Normal — 2 VC\\nBater, chutar, socar, golpear com uma arma ou realizar outro ataque físico básico que não seja uma habilidade de classe.\\n\\n⚠️ Limite em combate: cada personagem pode realizar no máximo 3 Ataques Normais consecutivos no mesmo turno, independentemente de quanto Vigor Cósmico ainda possua. Mesmo que reste VC suficiente, um 4º ataque normal consecutivo não pode ser realizado naquele turno. Habilidades de classe não contam como Ataque Normal e podem ser usadas em sequência quando houver VC e o cooldown/requisito permitir.\\n\\n✨ Ataque Especial — 3 VC',
  'limite de três ataques normais'
);
fs.writeFileSync(gameDataFile, gameData);

for (const [source, marker, label] of [
  [access, 'classId:', 'identidade persistida no login'],
  [dice, 'rollerColor:', 'cor publicada na rolagem'],
  [dice, "doc(db, 'sheets', String(access.sheetId))", 'ficha realtime da rolagem'],
  [app, '<DiceWidget access={access}/>', 'acesso entregue ao dado'],
  [broadcasts, 'result.rollerColor', 'popup colorido pela classe'],
  [realtimeCss, diceIdentityMarker, 'pulso da cor da classe'],
  [gameData, 'no máximo 3 Ataques Normais consecutivos', 'regra dos três ataques'],
]) {
  if (!source.includes(marker)) throw new Error(`Validação ausente: ${label}`);
}

console.log('Dinastia E: rolagens identificadas por login/classe e limite de três ataques normais registrados nas regras.');
