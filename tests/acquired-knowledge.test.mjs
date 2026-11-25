import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { acquiredFiles, acquiredSpells } from '../src/adventure/acquiredKnowledge.js';

test('Acquired knowledge keeps all nine originals with unique paths', () => {
  assert.equal(acquiredFiles.length, 9);
  assert.equal(new Set(acquiredFiles.map(file => file.src)).size, 9);
  for (const file of acquiredFiles) {
    const bytes = fs.readFileSync('public' + file.src);
    /* As nove passaram de JPEG para WebP e perderam ~20% de peso sem
       perder resolução. A assinatura mudou junto: WebP é um contêiner
       RIFF, com "RIFF" nos bytes 0-3 e "WEBP" nos 8-11.

       O piso de tamanho continua existindo, e é o ponto do teste: ele
       pega o dia em que alguém trocar um original por uma miniatura —
       que é fácil de fazer sem perceber, porque na tela as duas abrem
       igual e só a leitura do documento mostra a diferença. */
    assert.equal(bytes.subarray(0, 4).toString('latin1'), 'RIFF', file.src);
    assert.equal(bytes.subarray(8, 12).toString('latin1'), 'WEBP', file.src);
    assert.ok(bytes.length > 150000, `${file.src} encolheu demais`);
  }
  assert.equal(acquiredSpells[0].healing, '12 de vida + SOR');
  assert.equal(acquiredSpells[0].cooldown, '1 vez por dia');
});

test('Necromancer skill preserves cost, cooldown and damage with two-hit condition', () => {
  const source = fs.readFileSync('src/data/gameData.jsx', 'utf8');
  const marker = 'const DINASTIA_E_CLASSES=';
  const start = source.indexOf(marker) + marker.length;
  const end = source.indexOf('\n];', start) + 2;
  const classes = vm.runInNewContext(source.slice(start, end));
  const skill = classes.find(cls => cls.id === 'necromante').normal.find(ability => ability.name === 'Corte do Silêncio');
  assert.equal(skill.cost, 2);
  assert.equal(skill.cooldown, '2 rodadas');
  assert.equal(skill.dano, '2 de dano por rodada + SOR');
  assert.match(skill.desc, /novamente o mesmo local marcado/);
  assert.match(skill.desc, /inutilizado por 2 rodadas/);
  assert.match(skill.desc, /atordoado \(stun\) por 2 rodadas/);
});

test('Book and chronicles use the top-layer viewer, not trapped page overlays', () => {
  const book = fs.readFileSync('src/features/livro/LivroPage.jsx', 'utf8');
  const chronicles = fs.readFileSync('src/features/cronicas/CronicasPage.jsx', 'utf8');
  assert.match(book, /label:'Magias adquiridas'/);
  assert.match(book, /label:'Arquivos adquiridos'/);
  assert.match(book, /<ImageViewer/);
  assert.match(chronicles, /<ImageViewer/);
  assert.doesNotMatch(chronicles, /className="chronicles-image-preview"/);
});
