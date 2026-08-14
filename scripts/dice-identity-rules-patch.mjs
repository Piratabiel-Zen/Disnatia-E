import fs from 'node:fs';
import path from 'node:path';

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  const next = source.replace(before, after);
  if (next === source) throw new Error(`Dice identity patch falhou: ${label}`);
  return next;
}

const cwd = process.cwd();

// ── Dado global: herda identidade e cor da ficha autenticada ───────────────
const diceFile = path.join(cwd, 'src', 'shell', 'DiceWidget.jsx');
let dice = fs.readFileSync(diceFile, 'utf8');

dice = replaceRequired(
  dice,
  'import { publishDiceResult } from "../core/combatEvents";',
  'import { publishDiceResult } from "../core/combatEvents";\nimport { SHEET_COLORS } from "../data/gameData";',
  'import das cores de classe'
);

dice = replaceRequired(
  dice,
  'function DiceWidget() {',
  'function DiceWidget({ access }) {',
  'acesso autenticado no dado'
);

dice = replaceRequired(
  dice,
  '  const [combatActive, setCombatActive] = useState(false);',
  '  const [combatActive, setCombatActive] = useState(false);\n  const [rollerSheet, setRollerSheet] = useState(null);',
  'estado da ficha que está rolando'
);

dice = replaceRequired(
  dice,
  "  }, []);\n\n  const roll = async () => {",
  "  }, []);\n\n  useEffect(() => {\n    if (access?.role !== 'player' || !access?.sheetId) { setRollerSheet(null); return undefined; }\n    const unsub = onSnapshot(doc(db, 'sheets', String(access.sheetId)), snap => {\n      setRollerSheet(snap.exists() ? { id: snap.id, ...(snap.data() || {}) } : null);\n    }, () => setRollerSheet(null));\n    return () => unsub();\n  }, [access?.role, access?.sheetId]);\n\n  const roll = async () => {",
  'listener da ficha autenticada'
);

dice = replaceRequired(
  dice,
  "    const res = { base, total, sides: dice, bonus: Number(bonus), isCrit, isFail, ts: Date.now(), roller: 'Jogador' };",
  "    const rollerName = access?.role === 'master' ? 'Mestre' : (rollerSheet?.nome || access?.name || 'Jogador');\n    const rollerColor = access?.role === 'master' ? '#E8A020' : (SHEET_COLORS[rollerSheet?.classe] || '#C8A8E8');\n    const res = {\n      base, total, sides: dice, bonus: Number(bonus), isCrit, isFail, ts: Date.now(),\n      roller: rollerName,\n      rollerColor,\n      rollerClass: rollerSheet?.classe || '',\n      rollerSheetId: access?.role === 'player' ? String(access?.sheetId || rollerSheet?.id || '') : '',\n    };",
  'payload identificado da rolagem'
);

dice = replaceRequired(
  dice,
  "color={result.isCrit?'#4ADE80':result.isFail?'#E8193C':'#C8A8E8'}",
  "color={result.rollerColor || (result.isCrit?'#4ADE80':result.isFail?'#E8193C':'#C8A8E8')}",
  'cor da classe no dado local'
);

dice = replaceRequired(
  dice,
  "color:result.isCrit?'#4ADE80':result.isFail?'#E8193C':'#C8A8E8'",
  "color:result.rollerColor || (result.isCrit?'#4ADE80':result.isFail?'#E8193C':'#C8A8E8')",
  'cor da classe no resultado local'
);

fs.writeFileSync(diceFile, dice);

// O App conhece o login atual e o entrega ao DiceWidget.
const appFile = path.join(cwd, 'src', 'App.generated.jsx');
let app = fs.readFileSync(appFile, 'utf8');
app = replaceRequired(app, '<DiceWidget/>', '<DiceWidget access={access}/>', 'login passado ao DiceWidget');
fs.writeFileSync(appFile, app);

// ── Popup público: nome real e pulso na cor da classe ──────────────────────
const broadcastsFile = path.join(cwd, 'src', 'experience', 'RealtimeBroadcasts.jsx');
let broadcasts = fs.readFileSync(broadcastsFile, 'utf8');
broadcasts = replaceRequired(
  broadcasts,
  "  const color = isCrit ? '#4ADE80' : isFail ? '#E8193C' : '#C8A8E8';",
  "  const color = result.rollerColor || (isCrit ? '#4ADE80' : isFail ? '#E8193C' : '#C8A8E8');",
  'cor da classe no broadcast público'
);
fs.writeFileSync(broadcastsFile, broadcasts);

const realtimeCssFile = path.join(cwd, 'src', 'experience', 'realtime.css');
let realtimeCss = fs.readFileSync(realtimeCssFile, 'utf8');
const diceIdentityMarker = '/* DADO IDENTIFICADO PELO LOGIN */';
if (!realtimeCss.includes(diceIdentityMarker)) {
  realtimeCss += `\n${diceIdentityMarker}\n.rt-dice-card{animation:rtDiceIn .25s ease both,rtDiceClassPulse 1.35s ease-in-out .28s infinite}\n.rt-dice-head{color:color-mix(in srgb,var(--rt-color) 78%,#d7c8dd);text-shadow:0 0 10px color-mix(in srgb,var(--rt-color) 22%,transparent)}\n@keyframes rtDiceClassPulse{0%,100%{box-shadow:0 10px 34px rgba(0,0,0,.55),0 0 18px color-mix(in srgb,var(--rt-color) 13%,transparent)}50%{box-shadow:0 10px 34px rgba(0,0,0,.55),0 0 34px color-mix(in srgb,var(--rt-color) 38%,transparent),inset 0 0 18px color-mix(in srgb,var(--rt-color) 7%,transparent)}}\n`;
}
fs.writeFileSync(realtimeCssFile, realtimeCss);

// ── Regras: limite explícito para ataques normais/básicos ─────────────────
const dataFile = path.join(cwd, 'src', 'data', 'gameData.jsx');
let data = fs.readFileSync(dataFile, 'utf8');
const ruleAnchor = `  {\n    cat:'Mecânicas',\n    icon:'📊',\n    title:'Bônus de Atributos',`;
const normalAttackRule = `  {\n    cat:'Combate',\n    icon:'✊',\n    title:'Limite de Ataques Normais',\n    body:\`Durante um turno de combate, um personagem pode realizar no máximo 3 Ataques Normais consecutivos, mesmo que ainda tenha Vigor Cósmico disponível.\\n\\nSão considerados Ataques Normais/Básicos: socos, chutes, golpes com armas, disparos básicos e outras ações diretas de bater ou atacar sem utilizar uma habilidade especial.\\n\\n⚠️ Limite absoluto: ter 5 VC ou mais não permite ultrapassar esse teto. O máximo continua sendo 3 Ataques Normais no mesmo turno.\\n\\nHabilidades de classe, habilidades especiais/ultimates e habilidades adquiridas durante a campanha seguem seus próprios custos e regras e não aumentam esse limite de ataques básicos.\`\n  },\n`;
if (!data.includes("title:'Limite de Ataques Normais'")) {
  if (!data.includes(ruleAnchor)) throw new Error('Dice identity patch falhou: ponto de inserção da regra não encontrado');
  data = data.replace(ruleAnchor, normalAttackRule + ruleAnchor);
}
fs.writeFileSync(dataFile, data);

for (const [source, marker, label] of [
  [dice, 'rollerColor', 'cor da classe no dado'],
  [dice, "roller: rollerName", 'nome do personagem na rolagem'],
  [app, '<DiceWidget access={access}/>', 'login conectado ao dado'],
  [broadcasts, 'result.rollerColor', 'broadcast colorido pela classe'],
  [realtimeCss, 'rtDiceClassPulse', 'pulso visual do popup'],
  [data, "title:'Limite de Ataques Normais'", 'nova regra de combate'],
]) {
  if (!source.includes(marker)) throw new Error(`Validação ausente: ${label}`);
}

console.log('Dinastia E: dado público identificado pelo login e regra de 3 ataques normais preparados.');
