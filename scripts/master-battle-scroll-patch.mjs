import fs from 'node:fs';
import path from 'node:path';

const cssFile = path.join(process.cwd(), 'src', 'experience', 'master-battle.css');
let css = fs.readFileSync(cssFile, 'utf8');

const marker = '/* MASTER COMBAT PARTICIPANTS SCROLL */';
if (!css.includes(marker)) {
  css += `\n${marker}\n.mbc-picker{height:clamp(120px,calc(100vh - 390px),245px);max-height:none;min-height:0;overflow:hidden;grid-auto-rows:minmax(0,1fr)}\n.mbc-picker-col{min-height:0;max-height:100%;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;scrollbar-width:thin;scrollbar-color:rgba(168,85,247,.28) transparent}\n.mbc-picker-col::-webkit-scrollbar{width:5px}.mbc-picker-col::-webkit-scrollbar-track{background:transparent}.mbc-picker-col::-webkit-scrollbar-thumb{background:rgba(168,85,247,.28);border-radius:999px}\n@media(max-width:900px){.mbc-picker{height:clamp(160px,calc(100vh - 390px),300px);max-height:none;overflow:hidden;grid-auto-rows:minmax(0,1fr)}}\n`;
  fs.writeFileSync(cssFile, css);
}

if (!css.includes('overflow-y:auto;overscroll-behavior:contain')) {
  throw new Error('Scroll interno dos participantes do combate não foi aplicado.');
}

console.log('Dinastia E: lista de participantes do Mestre agora possui scroll vertical interno.');
