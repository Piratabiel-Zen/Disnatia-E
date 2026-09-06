import fs from 'node:fs';

const target = 'scripts/advanced-combat-automation-v2-patch.mjs';
let src = fs.readFileSync(target, 'utf8');

src = src.replace(
  "block(exp,'function MasterConsole(){','\\nfunction ExperienceLayer', 'MasterConsole')",
  "block(exp,'function MasterConsole(){','\\nexport function ExperienceLayer', 'MasterConsole')"
);

if (!src.includes("block(exp,'function MasterConsole(){','\\nexport function ExperienceLayer', 'MasterConsole')")) {
  throw new Error('Bootstrap combat v2: marcador de MasterConsole não corrigido.');
}

fs.writeFileSync(target, src);
console.log('Dinastia E: bootstrap da automação de combate v2 corrigiu o limite do MasterConsole.');
