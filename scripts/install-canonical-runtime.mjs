import fs from 'node:fs';
const files = {
  'App.jsx': 'App.generated.jsx',
  'experience/PlayerExperience.jsx': 'experience/GameExperience3.adventure.jsx',
  'experience/ExperienceProvider.jsx': 'experience/ExperienceKit.generated.jsx',
  'experience/EnhancedSoundscape.jsx': 'experience/EnhancedSoundscape.jsx',
  'shell/AmbientSoundPlayer.jsx': 'shell/AmbientSoundPlayer.jsx',
  'features/mapa-batalha/BattleMapPage.jsx': 'features/mapa-batalha/BattleMapPage.jsx',
};
for (const [source, target] of Object.entries(files)) fs.copyFileSync('src/runtime/' + source, 'src/' + target);
console.log('Canonical player, session, map and audio modules installed after legacy generation.');
