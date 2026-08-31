import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const battleFile = path.join(root, 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
let battle = fs.readFileSync(battleFile, 'utf8');

// Jogadores continuam vendo a proporção da vida do inimigo pela barra, mas nunca
// o valor numérico. O Mestre mantém os números. Personagens continuam mostrando
// seus próprios números normalmente.
const hpStartMarker = "<div style={{fontSize:9*zoom,color:hpColor(displayHp,displayMaxHp)";
const hpEndMarker = ">❤ {displayHp}/{displayMaxHp}</div>";
const hpStart = battle.indexOf(hpStartMarker);
const hpEndAt = hpStart >= 0 ? battle.indexOf(hpEndMarker, hpStart) : -1;
if (hpStart < 0 || hpEndAt < 0) {
  throw new Error('Site fluidity/HP privacy patch: indicador numérico de HP do token não encontrado.');
}
const hpEnd = hpEndAt + hpEndMarker.length;
const hpNumberBlock = battle.slice(hpStart, hpEnd);
if (!hpNumberBlock.includes('displayHp') || !hpNumberBlock.includes('displayMaxHp')) {
  throw new Error('Site fluidity/HP privacy patch: bloco numérico de HP inesperado.');
}
battle = battle.slice(0, hpStart)
  + `{(masterMode || !linkedEnemyVitals) && (${hpNumberBlock})}`
  + battle.slice(hpEnd);

if (!battle.includes("{(masterMode || !linkedEnemyVitals) && (<div style={{fontSize:9*zoom")) {
  throw new Error('Site fluidity/HP privacy patch: privacidade de HP não aplicada.');
}
if (!battle.includes('displayMaxHp>0')) {
  throw new Error('Site fluidity/HP privacy patch: barra de vida do token foi perdida.');
}
fs.writeFileSync(battleFile, battle);

// Sanidade da camada de performance: o shell final não deve montar os dois fundos
// contínuos antigos (vídeo + StarField). O fundo CSS leve permanece obrigatório.
const generatedApp = fs.readFileSync(path.join(root, 'src', 'App.generated.jsx'), 'utf8');
if (generatedApp.includes('<CosmicLoopVideo') || generatedApp.includes('<StarField')) {
  throw new Error('Site fluidity patch: fundo contínuo antigo ainda está montado no shell.');
}
if (!generatedApp.includes('<CosmicLivingBackground')) {
  throw new Error('Site fluidity patch: fundo cósmico leve ausente.');
}

console.log('Dinastia E: fundo contínuo pesado removido, composição cósmica leve ativa e HP numérico de inimigo oculto dos jogadores.');
