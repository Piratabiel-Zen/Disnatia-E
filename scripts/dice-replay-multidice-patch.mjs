import fs from 'node:fs';
import path from 'node:path';

const diceFile = path.join(process.cwd(), 'src', 'shell', 'DiceWidget.jsx');
let dice = fs.readFileSync(diceFile, 'utf8');

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`Dice replay/multidice patch falhou: ${label}`);
  return source.replace(before, after);
}

dice = replaceRequired(
  dice,
  '  const [dice, setDice] = useState(20);\n  const [bonus, setBonus] = useState(0);',
  '  const [dice, setDice] = useState(20);\n  const [count, setCount] = useState(1);\n  const [bonus, setBonus] = useState(0);',
  'estado de quantidade de dados'
);

const rollRegex = /  const roll = async \(\) => \{[\s\S]*?\n  \};\n\n  return \(/;
if (!dice.includes('const safeCount = Math.min(5')) {
  if (!rollRegex.test(dice)) throw new Error('Dice replay/multidice patch falhou: função roll não encontrada.');
  dice = dice.replace(rollRegex, `  const roll = async () => {
    if (physicalRolling) return;
    setPhysicalRolling(true);
    const safeCount = Math.min(5, Math.max(1, Number(count) || 1));
    const values = Array.from({ length: safeCount }, () => Math.floor(Math.random() * dice) + 1);
    const base = values.reduce((sum, value) => sum + value, 0);
    const total = base + Number(bonus);
    const isCrit = dice === 20 && safeCount === 1 && values[0] === 20;
    const isFail = dice === 20 && safeCount === 1 && values[0] === 1;
    let sourceClientId = 'dice-client';
    try {
      sourceClientId = localStorage.getItem('dinastia-dice-client-id') || \`dice_\${Date.now()}_\${Math.random().toString(36).slice(2, 9)}\`;
      localStorage.setItem('dinastia-dice-client-id', sourceClientId);
    } catch (_) {}
    const res = {
      base, values, count: safeCount, total, sides: dice, bonus: Number(bonus), isCrit, isFail, ts: Date.now(),
      roller: rollerProfile.name || access?.name || 'Jogador',
      rollerColor: rollerProfile.color || '#C8A8E8',
      rollerClass: rollerProfile.classId || '',
      rollerClassName: rollerProfile.className || '',
      rollerSheetId: access?.sheetId ? String(access.sheetId) : '',
      sourceClientId,
    };
    setResult(res);
    setRevealed(false);
    try { await publishDiceResult(res); } catch (e) { console.error('Erro ao publicar dado:', e); }
  };

  return (`);
}

const bonusRow = `          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16}}>
            <label style={{fontSize:11, color:'#7B6D8A', fontFamily:'Cinzel,serif'}}>Bônus</label>`;
if (!dice.includes('Quantidade')) {
  if (!dice.includes(bonusRow)) throw new Error('Dice replay/multidice patch falhou: linha de bônus não encontrada.');
  dice = dice.replace(bonusRow, `          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
            <label style={{fontSize:11, color:'#7B6D8A', fontFamily:'Cinzel,serif'}}>Quantidade</label>
            <div style={{display:'flex', gap:5, marginLeft:'auto'}}>
              {[1,2,3,4,5].map(n => <button key={n} onClick={()=>{if(!physicalRolling){setCount(n);setResult(null);}}} style={{width:31,height:28,borderRadius:7,border:\`1px solid \${count===n?'rgba(168,85,247,.65)':'rgba(255,255,255,.1)'}\`,background:count===n?'rgba(168,85,247,.2)':'rgba(255,255,255,.03)',color:count===n?'#fff':'#8A7A92',fontFamily:'Cinzel,serif',cursor:'pointer'}}>{n}</button>)}
            </div>
          </div>
${bonusRow}`);
}

dice = replaceRequired(
  dice,
  "            {physicalRolling ? '✦ Dado em movimento…' : `🎲 Rolar D${dice}`}\n          </button>",
  "            {physicalRolling ? '✦ Dados em movimento…' : `🎲 Rolar ${count > 1 ? `${count}D${dice}` : `D${dice}`}`}\n          </button>",
  'rótulo do botão multidado'
);

dice = replaceRequired(
  dice,
  `                finalValue={result.base}
                rollTs={result.ts}
                color={rollerProfile.color || (result.isCrit?'#4ADE80':result.isFail?'#E8193C':'#C8A8E8')}`,
  `                finalValue={Array.isArray(result.values) ? result.values[0] : result.base}
                finalValues={result.values}
                rollTs={result.ts}
                color={rollerProfile.color || (result.isCrit?'#4ADE80':result.isFail?'#E8193C':'#C8A8E8')}
                total={result.total}
                bonus={result.bonus}`,
  'valores múltiplos na física local'
);

const resultLabel = `              <div style={{fontSize:11, color:'#7B6D8A', fontFamily:'Cinzel,serif', margin:'10px 0 4px'}}>Resultado (D{result.sides} {result.bonus?\`+ \${result.bonus}\`:''})</div>`;
if (dice.includes(resultLabel)) dice = dice.replace(resultLabel, '');

const resultTotal = `              <div style={{minHeight:38, display:'flex', justifyContent:'center', alignItems:'baseline', gap:8, opacity: revealed?1:0, transition:'opacity 0.25s'}}>
                <span style={{fontSize:32, fontFamily:'Cinzel,serif', color:result.isCrit?'#4ADE80':result.isFail?'#E8193C':'#C8A8E8', fontWeight:700}}>{result.total}</span>
                {result.bonus !== 0 && <span style={{fontSize:12, color:'#5A5070'}}>({result.base} {result.bonus>=0?'+':''} {result.bonus})</span>}
              </div>`;
if (dice.includes(resultTotal)) dice = dice.replace(resultTotal, '');

for (const marker of [
  'const [count, setCount] = useState(1)',
  'const safeCount = Math.min(5',
  'values, count: safeCount',
  'sourceClientId,',
  'finalValues={result.values}',
  'total={result.total}',
  'Quantidade',
]) {
  if (!dice.includes(marker)) throw new Error(`Dice replay/multidice patch: validação ausente (${marker}).`);
}
if (dice.includes('Resultado (D{result.sides}')) throw new Error('Dice replay/multidice patch: popup textual de resultado ainda presente.');

fs.writeFileSync(diceFile, dice);
console.log('Dinastia E: replay físico sem popup e rolagens simultâneas de até 5 dados habilitadas.');
