import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);

write('src/experience/PhysicalDiceTray.jsx', read('scripts/templates/PhysicalDiceTray.three.jsx'));
write('src/experience/physical-dice.css', read('scripts/templates/physical-dice.three.css'));

const adventureFile = 'src/adventure/adventure.css';
let adventure = read(adventureFile);
const marker = '/* FINAL DESKTOP HUD CENTERING 2026-09-21 */';
if (!adventure.includes(marker)) {
  adventure += `\n\n${marker}\n@media(min-width:901px){html body .adventure-shell:has(.page-stage-session) .game3-tab-session .g3-utility-rail{position:fixed!important;top:50%!important;bottom:auto!important;right:14px!important;left:auto!important;transform:translate3d(0,-50%,0)!important}}\n`;
}
write(adventureFile, adventure);

const dice = read('src/experience/PhysicalDiceTray.jsx');
if (!dice.includes("import('@3d-dice/dice-box-threejs')")) throw new Error('Three dice: lazy import missing');
if (!dice.includes('box.roll(notation)')) throw new Error('Three dice: real physics roll missing');
if (!dice.includes("texture: 'none'") || !dice.includes('sounds: false')) throw new Error('Three dice: asset-safe configuration missing');
if (dice.includes('function DiceCanvas')) throw new Error('Three dice: legacy Canvas renderer still active');
console.log('Dinastia E: dice-box-threejs com Three.js, Cannon ES e resultados predeterminados aplicado.');
