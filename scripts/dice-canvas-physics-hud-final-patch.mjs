import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);

write('src/experience/PhysicalDiceTray.jsx', read('scripts/templates/PhysicalDiceTray.canvas.jsx'));
write('src/experience/physical-dice.css', read('scripts/templates/physical-dice.canvas.css'));

const adventureFile = 'src/adventure/adventure.css';
let adventure = read(adventureFile);
const marker = '/* FINAL DESKTOP HUD CENTERING 2026-09-21 */';
if (!adventure.includes(marker)) {
  adventure += `\n\n${marker}\n@media(min-width:901px){\n  html body .adventure-shell:has(.page-stage-session) .game3-tab-session .g3-utility-rail{\n    position:fixed!important;top:50%!important;bottom:auto!important;right:14px!important;left:auto!important;\n    transform:translate3d(0,-50%,0)!important;\n  }\n}\n`;
}
write(adventureFile, adventure);

const renderedDice = read('src/experience/PhysicalDiceTray.jsx');
if (!renderedDice.includes('requestAnimationFrame(tick)')) throw new Error('Canvas dice: animation loop missing');
if (renderedDice.includes('ResizeObserver')) throw new Error('Canvas dice: resize observer can restart the throw');
if (!renderedDice.includes('elapsed<1.85') || !renderedDice.includes('body.impact=1')) throw new Error('Canvas dice: cinematic physics missing');
if (!adventure.includes('.game3-tab-session .g3-utility-rail')) throw new Error('Canvas dice: desktop HUD guard missing');
console.log('Dinastia E: física 3D leve em Canvas e HUD direito centralizado aplicados.');
