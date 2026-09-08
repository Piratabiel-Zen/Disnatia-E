import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src', 'experience', 'GameExperience3.jsx');
if (!fs.existsSync(file)) throw new Error('Game Experience 3 context fix: componente não encontrado.');

let source = fs.readFileSync(file, 'utf8');
const generatedImport = "import { useExperience } from './ExperienceKit.generated';";
const legacyImport = "import { useExperience } from './ExperienceKit';";

if (!source.includes(generatedImport)) {
  if (!source.includes(legacyImport)) {
    throw new Error('Game Experience 3 context fix: import do useExperience inesperado.');
  }
  source = source.replace(legacyImport, generatedImport);
  fs.writeFileSync(file, source);
}

if (!source.includes(generatedImport)) {
  throw new Error('Game Experience 3 context fix: contexto realtime gerado não foi aplicado.');
}

console.log('Dinastia E Game Experience 3: contexto unificado com ExperienceKit.generated; tela preta pós-login corrigida.');
