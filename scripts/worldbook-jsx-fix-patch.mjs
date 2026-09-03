import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let src = fs.readFileSync(file, 'utf8');

if (!src.includes('battlemap-order-control')) throw new Error('World/Book JSX fix: controle de ordem não encontrado.');
if (!src.includes('<><button onClick={() => setShowMapNameEdit(true)}')) {
  const pattern = /(<button onClick=\{\(\) => setShowMapNameEdit\(true\)\}[\s\S]*?>✎ Renomear<\/button>)\s*(<label title="Escolha a posição deste mapa" className="battlemap-order-control">[\s\S]*?<\/label>)/;
  if (!pattern.test(src)) throw new Error('World/Book JSX fix: grupo Renomear/Ordem não encontrado.');
  src = src.replace(pattern, '<>$1$2</>');
}

if (!src.includes('<><button onClick={() => setShowMapNameEdit(true)}') || !src.includes('battlemap-order-control')) {
  throw new Error('World/Book JSX fix incompleto.');
}
fs.writeFileSync(file, src);
console.log('Dinastia E: controle de ordem do mapa agrupado em JSX válido.');
