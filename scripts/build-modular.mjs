import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

// O gerador ainda extrai trechos do App.jsx legado por posição. Por segurança,
// ele só pode rodar sobre a versão exata para a qual a divisão foi validada.
const LEGACY_APP_SHA256 = '61e301a690c33d6e50e2ed78f9473e265dee7f92dc066ca4ffa28d232eb9398e';
const cwd = process.cwd();
const sourcePath = path.join(cwd, 'App.jsx');
const source = fs.readFileSync(sourcePath);
const sourceHash = crypto.createHash('sha256').update(source).digest('hex');

if (sourceHash !== LEGACY_APP_SHA256) {
  throw new Error(
    `App.jsx mudou desde a última validação modular (${sourceHash}). ` +
    'Atualize o mapa de extração antes de gerar os módulos; o build foi abortado para evitar regressões silenciosas.'
  );
}

for (const rel of [
  'src/experience/ExperienceKit.jsx',
  'src/experience/experience.css',
  'src/experience/PlayerAccess.jsx',
  'src/experience/access.css',
  'scripts/modular-app-source.jsx',
]) {
  if (!fs.existsSync(path.join(cwd, rel))) {
    throw new Error(`Camada imersiva obrigatória ausente: ${rel}`);
  }
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dinastia-modular-'));

try {
  fs.copyFileSync(sourcePath, path.join(temp, 'App.jsx'));
  fs.mkdirSync(path.join(temp, 'scripts'), { recursive: true });

  // O gerador principal contém apenas as extrações dos módulos. O shell lazy
  // vive em arquivo próprio para evitar templates JSX aninhados dentro do script.
  const generatorSource = fs.readFileSync(path.join(cwd, 'scripts', 'modularize.mjs'), 'utf8');
  const safeGeneratorSource = generatorSource
    .split(/\r?\n/)
    .map(line => line.startsWith("W('src/App.jsx',`")
      ? "W('src/App.jsx','// shell modular aplicado separadamente\\n');"
      : line)
    .join('\n')
    // Alguns dados no App legado usam espaços em torno do '=' (ex.: ATMOSPHERES).
    .replace('^const ${n}=', '^const ${n}\\\\s*=');

  fs.writeFileSync(path.join(temp, 'scripts', 'modularize.mjs'), safeGeneratorSource);

  execFileSync(process.execPath, ['scripts/modularize.mjs'], {
    cwd: temp,
    stdio: 'inherit',
  });

  // Substitui o placeholder pelo shell React.lazy validado e legível.
  fs.copyFileSync(
    path.join(cwd, 'scripts', 'modular-app-source.jsx'),
    path.join(temp, 'src', 'App.jsx')
  );

  // A navegação ocupa a lateral. Move o player de música para a área útil
  // sem alterar a sincronização do áudio.
  const ambientPath = path.join(temp, 'src', 'shell', 'AmbientSoundPlayer.jsx');
  let ambientSource = fs.readFileSync(ambientPath, 'utf8');
  ambientSource = ambientSource.replace(
    "position: 'fixed', top: 14, left: 16, zIndex: 100",
    "position: 'fixed', top: 'auto', bottom: 58, left: 'calc(var(--grim-w) + 14px)', zIndex: 230"
  );
  fs.writeFileSync(ambientPath, ambientSource);

  // Restringe fichas ao personagem autenticado. O Mestre continua vendo todas.
  const sheetsPath = path.join(temp, 'src', 'features', 'sheets', 'SheetsPage.jsx');
  let sheetsSource = fs.readFileSync(sheetsPath, 'utf8');
  sheetsSource = sheetsSource.replace(
    'function SheetsSection({masterMode}){',
    'function SheetsSection({masterMode,playerSheetId}){'
  );
  sheetsSource = sheetsSource.replace(
    "const u1=onSnapshot(collection(db,'sheets'),snap=>{const data=snap.docs.map(d=>({id:d.id,...d.data()}));setSheets(data);setLoaded(true);});",
    "const u1=onSnapshot(collection(db,'sheets'),snap=>{const all=snap.docs.map(d=>({id:d.id,...d.data()}));const data=!masterMode&&playerSheetId?all.filter(s=>String(s.id)===String(playerSheetId)):all;setSheets(data);setLoaded(true);});"
  );
  sheetsSource = sheetsSource.replace(
    "return()=>{u1();u2();u3();u4();u5();};\n  },[]);",
    "return()=>{u1();u2();u3();u4();u5();};\n  },[masterMode,playerSheetId]);"
  );
  fs.writeFileSync(sheetsPath, sheetsSource);

  // No mapa de batalha, jogadores também só carregam a própria ficha.
  const battlePath = path.join(temp, 'src', 'features', 'mapa-batalha', 'BattleMapPage.jsx');
  let battleSource = fs.readFileSync(battlePath, 'utf8');
  battleSource = battleSource.replace(
    'function BattleMapSection({ masterMode }) {',
    'function BattleMapSection({ masterMode, playerSheetId }) {'
  );
  battleSource = battleSource.replace(
    "const u3 = onSnapshot(collection(db, 'sheets'), snap => {\n      setSheets(snap.docs.map(d => ({ id: d.id, ...d.data() })));\n    });",
    "const u3 = onSnapshot(collection(db, 'sheets'), snap => {\n      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));\n      setSheets(!masterMode && playerSheetId ? all.filter(s => String(s.id) === String(playerSheetId)) : all);\n    });"
  );
  fs.writeFileSync(battlePath, battleSource);

  // Sanidade estrutural: falha cedo se alguma extração essencial desaparecer.
  const required = [
    'src/App.jsx',
    'src/core/firebase.js',
    'src/data/gameData.jsx',
    'src/features/prologue/ProloguePage.jsx',
    'src/features/sheets/SheetsPage.jsx',
    'src/features/mapa-batalha/BattleMapPage.jsx',
    'src/shell/DiceWidget.jsx',
    'src/shell/AmbientSoundPlayer.jsx',
    'src/styles/global.css',
  ];
  for (const rel of required) {
    if (!fs.existsSync(path.join(temp, rel))) {
      throw new Error(`Módulo obrigatório não foi gerado: ${rel}`);
    }
  }

  const gameData = fs.readFileSync(path.join(temp, 'src', 'data', 'gameData.jsx'), 'utf8');
  for (const symbol of ['ATMOSPHERES', 'CLASSES', 'ARTEFATOS_DATA', 'RULES_DATA', 'MASTER_PIN']) {
    if (!gameData.includes(`export const ${symbol}`)) {
      throw new Error(`Export obrigatório ausente em gameData.jsx: ${symbol}`);
    }
  }

  const generatedApp = fs.readFileSync(path.join(temp, 'src', 'App.jsx'), 'utf8');
  for (const marker of ['lazy(', '<Suspense', 'ExperienceProvider', 'ImmersiveNavigation', 'SessionDashboard', 'ExperienceLayer', 'PlayerAccessGate', 'playerSheetId']) {
    if (!generatedApp.includes(marker)) {
      throw new Error(`Shell modular/imersivo inválido: ${marker} não encontrado.`);
    }
  }
  if (generatedApp.includes('ConnectionStatus')) {
    throw new Error('ConnectionStatus voltou ao shell, mas deve permanecer removido da interface.');
  }

  const generatedSheets = fs.readFileSync(sheetsPath, 'utf8');
  if (!generatedSheets.includes('playerSheetId') || !generatedSheets.includes('all.filter')) {
    throw new Error('Filtro de ficha por jogador não foi aplicado em SheetsPage.jsx.');
  }
  const generatedBattle = fs.readFileSync(battlePath, 'utf8');
  if (!generatedBattle.includes('playerSheetId') || !generatedBattle.includes('all.filter')) {
    throw new Error('Filtro de ficha por jogador não foi aplicado em BattleMapPage.jsx.');
  }

  const generatedSrc = path.join(temp, 'src');
  const targetSrc = path.join(cwd, 'src');

  for (const dir of ['core', 'data', 'features', 'shell', 'styles']) {
    const from = path.join(generatedSrc, dir);
    const to = path.join(targetSrc, dir);
    fs.rmSync(to, { recursive: true, force: true });
    fs.cpSync(from, to, { recursive: true });
  }

  fs.copyFileSync(path.join(generatedSrc, 'App.jsx'), path.join(targetSrc, 'App.generated.jsx'));
  console.log('Dinastia E: login por personagem, escopo de fichas e ajustes de layout preparados e validados.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
