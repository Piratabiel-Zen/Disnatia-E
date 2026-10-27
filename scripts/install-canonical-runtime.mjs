import fs from 'node:fs';
const files = {
  'App.jsx': 'App.generated.jsx',
  'AuthenticatedSession.jsx': 'AuthenticatedSession.jsx',
  'experience/PlayerAccess.jsx': 'experience/PlayerAccess.jsx',
  'features/sheets/SheetsPage.jsx': 'features/sheets/SheetsPage.jsx',
  'features/personagens/PersonagensPage.jsx': 'features/personagens/PersonagensPage.jsx',
  'features/bestiario/BestiarioPage.jsx': 'features/bestiario/BestiarioPage.jsx',
  'experience/PlayerExperience.jsx': 'experience/GameExperience3.adventure.jsx',
  'experience/ExperienceProvider.jsx': 'experience/ExperienceKit.generated.jsx',
  'experience/EnhancedSoundscape.jsx': 'experience/EnhancedSoundscape.jsx',
  'shell/AmbientSoundPlayer.jsx': 'shell/AmbientSoundPlayer.jsx',
  'features/mapa-batalha/BattleMapPage.jsx': 'features/mapa-batalha/BattleMapPage.jsx',
  'features/mesa-imersiva/MesaImersivaPage.jsx': 'features/mesa-imersiva/MesaImersivaPage.jsx',
  'features/mesa-imersiva/mesa-imersiva.css': 'features/mesa-imersiva/mesa-imersiva.css',
};
for (const [source, target] of Object.entries(files)) {
  fs.mkdirSync('src/' + target.split('/').slice(0, -1).join('/'), { recursive: true });
  fs.copyFileSync('src/runtime/' + source, 'src/' + target);
}
console.log('Canonical player, session, map, audio and immersive-mesa modules installed after legacy generation.');
