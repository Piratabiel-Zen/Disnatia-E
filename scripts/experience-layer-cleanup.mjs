import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src', 'experience', 'ExperienceKit.generated.jsx');
if (!fs.existsSync(file)) throw new Error('ExperienceKit.generated.jsx não existe antes da limpeza.');

let source = fs.readFileSync(file, 'utf8');
for (const marker of ['    <CosmicEventLayer/>\n', '    <SoundscapeLayer/>\n']) {
  if (!source.includes(marker)) throw new Error(`Camada legada não encontrada para remoção: ${marker.trim()}`);
  source = source.replace(marker, '');
}

fs.writeFileSync(file, source);
console.log('Dinastia E: overlays cósmico e soundscape legados removidos antes da camada realtime.');
