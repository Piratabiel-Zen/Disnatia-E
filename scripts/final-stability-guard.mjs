import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const must = (condition, message) => {
  if (!condition) throw new Error(`Final stability guard: ${message}`);
};
const absent = (source, marker, label) => must(!source.includes(marker), `${label}: marcador proibido encontrado: ${marker}`);
const present = (source, marker, label) => must(source.includes(marker), `${label}: marcador obrigatório ausente: ${marker}`);

const files = {
  app: 'src/App.generated.jsx',
  experience: 'src/experience/ExperienceKit.generated.jsx',
  game: 'src/experience/GameExperience3.jsx',
  gameCss: 'src/experience/game-experience-3.css',
  battle: 'src/features/mapa-batalha/BattleMapPage.jsx',
  ambient: 'src/shell/AmbientSoundPlayer.jsx',
};

for (const [label, rel] of Object.entries(files)) {
  must(fs.existsSync(path.join(root, rel)), `${label}: arquivo gerado ausente (${rel})`);
}

const app = read(files.app);
const experience = read(files.experience);
const game = read(files.game);
const gameCss = read(files.gameCss);
const battle = read(files.battle);
const ambient = read(files.ambient);

// Desktop: Game Experience 3 só pode ocupar superfícies realmente imersivas.
present(game, 'DESKTOP CONTENT SURFACE RESET 2026-09-12', 'desktop');
present(gameCss, 'DESKTOP CONTENT SURFACE RESET 2026-09-12', 'desktop CSS');
for (const tab of ['prologo','classes','fichas','personagens','inimigos','bestiario','regras','livro','cronicas']) {
  present(gameCss, `.game3-tab-${tab} .g3-top-context`, `desktop CSS/${tab}`);
}
absent(app, 'dinastia-zero-wait-prefetch', 'performance');

// Navegação: desktop completo; mobile continua deliberadamente restrito.
present(experience, 'desktopGroups.map(group=>', 'navegação desktop');
present(experience, "item.id!=='inimigos'||masterMode", 'navegação Mestre');
present(experience, "{id:'mapamundi',label:'Mapa Múndi'", 'Mapa Múndi desktop');
present(experience, "{id:'mapabatalha',label:'Mapa de Batalha'", 'Mapa de Batalha desktop');
present(app, '!isMobileViewport()&&<AmbientSoundPlayer', 'áudio mobile');
const mobileSet = experience.match(/MOBILE_ALLOWED_NAV_IDS\s*=\s*new Set\(\[([^\]]*)\]\)/)?.[1] || '';
must(mobileSet, 'navegação mobile: conjunto de páginas permitidas não encontrado');
for (const forbidden of ['mapamundi','mapabatalha','inimigos']) {
  must(!mobileSet.includes(`'${forbidden}'`), `navegação mobile: ${forbidden} foi liberado acidentalmente`);
}

// BattleMap: Firestore é autoridade; sem comparar relógios de computadores diferentes.
present(battle, 'const TOKEN_THROTTLE_MS = 33;', 'BattleMap latência');
present(battle, "const u2 = onSnapshot(activeMapRef, snap => {", 'BattleMap ativo');
present(battle, 'Object.prototype.hasOwnProperty.call(prev, mapId)', 'BattleMap canal legado');
present(battle, 'previous && source === previous.source', 'BattleMap sequência de movimento');
absent(battle, 'updatedAt < previous.updatedAt', 'BattleMap relógio local');
absent(battle, 'incomingTs < knownTs', 'BattleMap relógio estrutural');
absent(battle, 'incomingTs >= knownTs', 'BattleMap relógio estrutural');
absent(battle, "onSnapshot(activeMapRef, { includeMetadataChanges: true }", 'BattleMap metadata duplicada');
absent(battle, 'setActiveId(String(id));', 'BattleMap rollback otimista');

// Música: um comando compartilhado não pode ser rejeitado por timestamp local nem duplicado por metadata.
present(ambient, 'const unsub = onSnapshot(ambientRef, snap => {', 'música realtime');
present(ambient, 'd.commandId || d.revision || d.ts', 'música command identity');
absent(ambient, 'revision < lastAmbientRevisionRef.current', 'música relógio local');
absent(ambient, 'includeMetadataChanges: true', 'música metadata duplicada');

// Proteções de conteúdo e superfícies essenciais já existentes.
for (const marker of ['fichas','personagens','bestiario','cronicas','livro','regras']) {
  must(app.includes(marker) || experience.includes(marker), `superfície essencial ausente: ${marker}`);
}

console.log('Dinastia E: final stability guard aprovado — desktop, mobile, realtime, música, BattleMap e superfícies essenciais preservados.');
