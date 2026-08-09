import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Gera a versão modular em uma pasta temporária para preservar App.jsx como
// fonte de verdade. O Vite compila os módulos gerados em chunks independentes.
const cwd = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dinastia-modular-'));

try {
  fs.copyFileSync(path.join(cwd, 'App.jsx'), path.join(temp, 'App.jsx'));
  fs.mkdirSync(path.join(temp, 'scripts'), { recursive: true });
  fs.copyFileSync(path.join(cwd, 'scripts', 'modularize.mjs'), path.join(temp, 'scripts', 'modularize.mjs'));

  execFileSync(process.execPath, ['scripts/modularize.mjs'], {
    cwd: temp,
    stdio: 'inherit',
  });

  const generatedSrc = path.join(temp, 'src');
  const targetSrc = path.join(cwd, 'src');

  for (const dir of ['core', 'data', 'features', 'shell', 'styles']) {
    const from = path.join(generatedSrc, dir);
    const to = path.join(targetSrc, dir);
    fs.rmSync(to, { recursive: true, force: true });
    fs.cpSync(from, to, { recursive: true });
  }

  fs.copyFileSync(path.join(generatedSrc, 'App.jsx'), path.join(targetSrc, 'App.generated.jsx'));
  console.log('Dinastia E: módulos de performance preparados para o Vite.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
