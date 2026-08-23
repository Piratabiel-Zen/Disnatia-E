import fs from 'node:fs';
import path from 'node:path';

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  const next = source.replace(before, after);
  if (next === source) throw new Error(`Enemy/Battle patch falhou: ${label}`);
  return next;
}

// A aba Inimigos passa a usar a implementação persistente e moderna,
// em vez de manter uma segunda ficha legada gerada do App.jsx.
const enemyPage = path.join(process.cwd(), 'src', 'features', 'inimigos', 'InimigosPage.jsx');
if (!fs.existsSync(enemyPage)) throw new Error('InimigosPage.jsx gerado não encontrado.');
fs.writeFileSync(enemyPage, "export { default } from '../../experience/EnemySheetExperience.jsx';\n");

const battleFile = path.join(process.cwd(), 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let battle = fs.readFileSync(battleFile, 'utf8');

battle = replaceRequired(
  battle,
  'import { resolveEquipIcon,HabilidadesPanel,StatusPanel,VigosWithLocked,newSheet } from "../sheets/SheetComponents";',
  'import { resolveEquipIcon,HabilidadesPanel,StatusPanel,VigosWithLocked,newSheet } from "../sheets/SheetComponents";\nimport { FloatingEnemyPanel } from "../../experience/BattleMapEnemySheet.jsx";',
  'import da ficha de inimigo no mapa'
);

battle = replaceRequired(
  battle,
  '  const [floatingSheets, setFloatingSheets] = useState([]); // {sheetId, x, y, z}\n  const zTopRef = useRef(60);',
  '  const [floatingSheets, setFloatingSheets] = useState([]); // {sheetId, x, y, z}\n  const [enemies, setEnemies] = useState([]);\n  const [floatingEnemies, setFloatingEnemies] = useState([]); // {enemyId, x, y, z}\n  const zTopRef = useRef(60);',
  'estado de inimigos e janelas flutuantes'
);

battle = replaceRequired(
  battle,
  "    const u4 = onSnapshot(doc(db, 'config', 'customAbilities'), snap => {\n      if (snap.exists()) setCustomAbilities(snap.data() || {});\n    });\n    const uFog = onSnapshot(collection(db, 'battlemap_fog'), snap => {",
  "    const u4 = onSnapshot(doc(db, 'config', 'customAbilities'), snap => {\n      if (snap.exists()) setCustomAbilities(snap.data() || {});\n    });\n    const uEnemies = onSnapshot(collection(db, 'enemies'), snap => {\n      setEnemies(snap.docs.map(d => ({ id:d.id, ...d.data() })));\n    });\n    const uFog = onSnapshot(collection(db, 'battlemap_fog'), snap => {",
  'listener realtime de inimigos'
);

battle = replaceRequired(
  battle,
  '    return () => { u1(); u1b(); uLive(); u2(); u3(); u4(); uFog(); uLibrary(); uFx(); };',
  '    return () => { u1(); u1b(); uLive(); u2(); u3(); u4(); uEnemies(); uFog(); uLibrary(); uFx(); };',
  'cleanup do listener de inimigos'
);

const enemyFunctions = [
  "  const saveEnemyFromMap = enemy => {",
  "    clearTimeout(saveTimeout.current['enemy_' + enemy.id]);",
  "    saveTimeout.current['enemy_' + enemy.id] = setTimeout(async () => {",
  "      try { await setDoc(doc(db, 'enemies', String(enemy.id)), enemy); } catch (e) { console.error('Erro ao salvar inimigo pelo mapa:', e); }",
  "    }, 520);",
  "  };",
  "  const updEnemyFromMap = (id, data) => {",
  "    setEnemies(prev => prev.map(e => String(e.id) === String(id) ? data : e));",
  "    saveEnemyFromMap(data);",
  "  };",
  "  const toggleFloatingEnemy = eid => {",
  "    setFloatingEnemies(prev => {",
  "      const exists = prev.find(p => p.enemyId === eid);",
  "      if (exists) return prev.filter(p => p.enemyId !== eid);",
  "      zTopRef.current += 1;",
  "      const idx = prev.length + floatingSheets.length;",
  "      return [...prev, { enemyId:eid, x:120 + (idx % 4) * 44, y:85 + (idx % 4) * 38, z:zTopRef.current }];",
  "    });",
  "  };",
  "  const bringEnemyToFront = eid => {",
  "    zTopRef.current += 1;",
  "    const z = zTopRef.current;",
  "    setFloatingEnemies(prev => prev.map(p => p.enemyId === eid ? { ...p, z } : p));",
  "  };",
  "  const moveFloatingEnemy = (eid, x, y) => setFloatingEnemies(prev => prev.map(p => p.enemyId === eid ? { ...p, x, y } : p));",
  "  const closeFloatingEnemy = eid => setFloatingEnemies(prev => prev.filter(p => p.enemyId !== eid));",
].join('\n');

battle = replaceRequired(
  battle,
  '  const closeFloatingSheet = (sid) => {\n    setFloatingSheets(prev => prev.filter(p => p.sheetId !== sid));\n  };\n  const handleSelectSheet = (s) => {',
  '  const closeFloatingSheet = (sid) => {\n    setFloatingSheets(prev => prev.filter(p => p.sheetId !== sid));\n  };\n' + enemyFunctions + '\n  const handleSelectSheet = (s) => {',
  'ações das fichas de inimigo no mapa'
);

const floatingEnemyRender = [
  "          {/* FICHAS DE INIMIGOS — somente Mestre */}",
  "          {masterMode && floatingEnemies.map(p => {",
  "            const enemy = enemies.find(e => String(e.id) === String(p.enemyId));",
  "            if (!enemy) return null;",
  "            return (",
  "              <FloatingEnemyPanel",
  "                key={`enemy_${p.enemyId}`}",
  "                enemy={enemy}",
  "                pos={p}",
  "                zIndex={p.z}",
  "                onChangeEnemy={data => updEnemyFromMap(enemy.id, data)}",
  "                onDrag={(x,y) => moveFloatingEnemy(p.enemyId,x,y)}",
  "                onFocus={() => bringEnemyToFront(p.enemyId)}",
  "                onClose={() => closeFloatingEnemy(p.enemyId)}",
  "              />",
  "            );",
  "          })}",
  "",
].join('\n');

battle = replaceRequired(
  battle,
  '          {/* BARRA INFERIOR DE FICHAS — apenas bolinhas com a foto, sem nome */}',
  floatingEnemyRender + '          {/* BARRA INFERIOR DE FICHAS — personagens + inimigos do Mestre */}',
  'render das fichas flutuantes de inimigo'
);

const enemyBubbles = [
  "            {masterMode && enemies.length > 0 && <span className=\"enemy-map-divider\" title=\"Inimigos\"/>}",
  "            {masterMode && enemies.map(enemy => {",
  "              const cls = CLASSES.find(c => c.id === enemy.classe);",
  "              const color = cls ? (SHEET_COLORS[cls.id] || cls.color || '#FF4F65') : ({Baixo:'#4ADE80','Médio':'#E8A020',Alto:'#FF6B35',Extremo:'#E8193C'}[enemy.perigo] || '#FF4F65');",
  "              const isOpen = floatingEnemies.some(p => p.enemyId === String(enemy.id));",
  "              return (",
  "                <button key={`enemy_${enemy.id}`} className={`enemy-map-bubble ${isOpen?'open':''}`} style={{'--enemy-color':color}} onClick={() => toggleFloatingEnemy(String(enemy.id))} title={`Inimigo: ${enemy.nome || 'Sem nome'}`}>",
  "                  {enemy.foto ? <img src={enemy.foto} alt=\"\"/> : <span>{cls?.icon || '💀'}</span>}",
  "                </button>",
  "              );",
  "            })}",
].join('\n');

battle = replaceRequired(
  battle,
  '            {masterMode && sheets.length < 15 && (',
  enemyBubbles + '\n            {masterMode && sheets.length < 15 && (',
  'bolinhas de inimigo na barra inferior'
);

fs.writeFileSync(battleFile, battle);

for (const marker of [
  'EnemySheetExperience.jsx',
  'FloatingEnemyPanel',
  "collection(db, 'enemies')",
  'floatingEnemies.map',
  'enemy-map-bubble',
  'updEnemyFromMap',
]) {
  const haystack = marker === 'EnemySheetExperience.jsx' ? fs.readFileSync(enemyPage,'utf8') : battle;
  if (!haystack.includes(marker)) throw new Error(`Enemy/Battle patch incompleto: ${marker}`);
}

console.log('Dinastia E: fichas completas de inimigos e controle exclusivo do Mestre no Mapa de Batalha aplicados.');
