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
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    assert.ok(bytes.length > 200000);
  }
  assert.equal(acquiredSpells[0].healing, '12 de vida + SOR');
  assert.equal(acquiredSpells[0].cooldown, '1 vez por dia');
});

test('Generated necromancer skill preserves cost, cooldown and damage with two-hit condition', () => {
  const source = fs.readFileSync('.generated/src/data/gameData.jsx', 'utf8');
  const marker = 'export const CLASSES=';
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
  const book = fs.readFileSync('.generated/src/features/livro/LivroPage.jsx', 'utf8');
  const chronicles = fs.readFileSync('.generated/src/features/cronicas/CronicasPage.jsx', 'utf8');
  assert.match(book, /label:'Magias adquiridas'/);
  assert.match(book, /label:'Arquivos adquiridos'/);
  assert.match(book, /<ImageViewer/);
  assert.match(chronicles, /<ImageViewer/);
  assert.doesNotMatch(chronicles, /className="chronicles-image-preview"/);
});
