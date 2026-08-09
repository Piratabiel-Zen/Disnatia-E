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
    // Torna a exportação tolerante à formatação sem alterar o arquivo legado.
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

  // Sanidade estrutural: falha cedo se alguma extração essencial desaparecer.
  const required = [
    'src/App.jsx',
    'src/core/firebase.js',
    'src/data/gameData.jsx',
    'src/features/prologue/ProloguePage.jsx',
    'src/features/sheets/SheetsPage.jsx',
    'src/features/mapa-batalha/BattleMapPage.jsx',
    'src/shell/DiceWidget.jsx',
    'src/styles/global.css',
  ];
  for (const rel of required) {
    if (!fs.existsSync(path.join(temp, rel))) {
      throw new Error(`Módulo obrigatório não foi gerado: ${rel}`);
    }
  }

  const gameData = fs.readFileSync(path.join(temp, 'src', 'data', 'gameData.jsx'), 'utf8');
  for (const symbol of ['ATMOSPHERES', 'CLASSES', 'ARTEFATOS_DATA', 'RULES_DATA']) {
    if (!gameData.includes(`export const ${symbol}`)) {
      throw new Error(`Export obrigatório ausente em gameData.jsx: ${symbol}`);
    }
  }

  const generatedApp = fs.readFileSync(path.join(temp, 'src', 'App.jsx'), 'utf8');
  if (!generatedApp.includes('lazy(') || !generatedApp.includes('<Suspense')) {
    throw new Error('Shell modular inválido: lazy loading/Suspense não encontrados.');
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
  console.log('Dinastia E: módulos de performance preparados e validados para o Vite.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
