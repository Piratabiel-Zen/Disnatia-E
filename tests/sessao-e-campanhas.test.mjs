import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { campaignHasTab, campaignUsesBuiltInClasses, filterNavGroups, emptyClass } from '../src/core/campaignModules.mjs';
import { familiaresDaFicha, isFamiliarRascunho, limiteDeFamiliares } from '../src/adventure/familiares.mjs';
import { readGroups, splitParty, groupOf } from '../src/adventure/grupos.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const dinastia = { id: 'dinastia-e', primary: true };
const outra = { id: 'arquivo-de-veneza' };

test('o Livro e as Regras são da Dinastia E, não do site', () => {
  assert.equal(campaignHasTab(dinastia, 'livro'), true);
  assert.equal(campaignHasTab(dinastia, 'regras'), true);
  assert.equal(campaignHasTab(outra, 'livro'), false);
  assert.equal(campaignHasTab(outra, 'regras'), false);
  // Fichas, mapas e crônicas são estrutura: valem em qualquer mesa.
  for (const tab of ['session', 'fichas', 'mapabatalha', 'cronicas', 'classes']) {
    assert.equal(campaignHasTab(outra, tab), true, tab);
  }
});

test('uma mesa pode ligar o módulo depois', () => {
  assert.equal(campaignHasTab({ ...outra, modules: { livro: true } }, 'livro'), true);
  assert.equal(campaignHasTab({ ...dinastia, modules: { regras: false } }, 'regras'), false);
});

test('a navegação perde os grupos que ficaram vazios', () => {
  const groups = [
    { id: 'knowledge', items: [{ id: 'livro' }, { id: 'regras' }] },
    { id: 'world', items: [{ id: 'mapamundi' }, { id: 'personagens' }] },
  ];
  assert.deepEqual(filterNavGroups(groups, outra).map(g => g.id), ['world']);
  assert.equal(filterNavGroups(groups, dinastia).length, 2);
});

test('as linhagens embutidas são só da mesa que elas descrevem', () => {
  assert.equal(campaignUsesBuiltInClasses(dinastia), true);
  assert.equal(campaignUsesBuiltInClasses(outra), false);
  const nova = emptyClass('guardioes');
  assert.equal(nova.name, '');
  assert.deepEqual(nova.normal, []);
  assert.deepEqual(nova.specials, []);
});

test('a lista de classes é trocável sem refatorar quem a lê', () => {
  const data = read('../src/data/gameData.jsx');
  assert.match(data, /export const CLASSES=\[\.\.\.DINASTIA_E_CLASSES\]/);
  assert.match(data, /CLASSES\.length=0;\s*CLASSES\.push/);
});

test('ninguém ganha um cachorro do nada', () => {
  const sheet = read('../src/features/sheets/SheetComponents.jsx');
  // Ficha nova nasce sem familiar.
  assert.match(sheet, /invocacoes:\[\], familiares:\[\]\}\)/);
  // E o tipo não vem pré-escolhido como cachorro.
  assert.match(sheet, /const newFamiliar = id => \(\{ id, tipo:'', nome:''/);
  // O painel não inventa mais um familiar quando a ficha não tem nenhum.
  assert.doesNotMatch(sheet, /saved\.length \? saved\.slice\(0,limite\) : \[newFamiliar/);
});

test('familiar só existe depois de batizado', () => {
  assert.equal(isFamiliarRascunho({ tipo: 'cachorro', nome: '' }), true);
  assert.equal(isFamiliarRascunho({ tipo: 'cachorro', nome: '  ' }), true);
  assert.equal(isFamiliarRascunho({ tipo: 'lobo', nome: 'Fenrir' }), false);
  const ficha = { familiares: [{ nome: '' }, { nome: 'Fenrir' }, { nome: '' }] };
  assert.deepEqual(familiaresDaFicha(ficha).map(f => f.nome), ['Fenrir']);
  // Nada é apagado do banco: o rascunho continua gravado, só não aparece.
  assert.equal(ficha.familiares.length, 3);
  assert.deepEqual(familiaresDaFicha({}), []);
});

test('Corvos do Horizonte levam até três familiares', () => {
  assert.equal(limiteDeFamiliares({ classe: 'corvos' }), 3);
  assert.equal(limiteDeFamiliares({ classe: 'fogo' }), 1);
});

test('a tela inicial mostra onde a companhia está', () => {
  const unido = readGroups({ location: 'Catedral Submersa' });
  assert.equal(unido.ativo, false);
  assert.equal(unido.a.local, 'Catedral Submersa');
  const dividido = readGroups({ grupos: { ativo: true, a: { local: 'Cripta' }, b: { local: 'Muralha' } } });
  assert.equal(dividido.ativo, true);
  assert.equal(dividido.b.local, 'Muralha');
});

test('quando o grupo se divide, cada personagem fica na sua frente', () => {
  const sheets = [{ id: '1' }, { id: '2', grupo: 'b' }, { id: '3', grupo: 'a' }];
  const juntos = splitParty(sheets, readGroups({}));
  assert.equal(juntos.length, 1);
  assert.equal(juntos[0].sheets.length, 3, 'sem divisão, todos aparecem juntos');

  const separados = splitParty(sheets, readGroups({ grupos: { ativo: true } }));
  assert.deepEqual(separados.map(f => f.key), ['a', 'b']);
  assert.deepEqual(separados[0].sheets.map(s => s.id), ['1', '3'], 'sem grupo marcado, cai na frente A');
  assert.deepEqual(separados[1].sheets.map(s => s.id), ['2']);
});

test('sem divisão ninguém é separado por engano', () => {
  assert.equal(groupOf({ grupo: 'b' }, false), 'a');
  assert.equal(groupOf({ grupo: 'b' }, true), 'b');
  assert.equal(groupOf({}, true), 'a');
});

test('o tomo 3D tem as seis faces e para quando pedem menos movimento', () => {
  const css = read('../src/experience/livro-3d.css');
  for (const face of ['capa', 'contracapa', 'lombada', 'corte', 'topo', 'base']) {
    assert.match(css, new RegExp(`\\.tomo3d-face\\.${face}`), `falta a face ${face}`);
  }
  // A perspectiva precisa estar no pai do corpo, ou o giro vira achatamento.
  assert.match(css, /\.tomo3d-palco\{[\s\S]*?perspective:\d+px/);
  assert.match(css, /\.tomo3d-corpo\{[\s\S]*?transform-style:preserve-3d/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{[\s\S]*?\.tomo3d-corpo\{animation:none/);
  // E é CSS puro: a navegação fica montada o tempo todo, então nada de um
  // contexto de GPU vivo ali. O componente não importa nada além do estilo.
  const mark = read('../src/experience/BookMark3D.jsx');
  const imports = [...mark.matchAll(/^import .*?from '([^']+)'/gm)].map(match => match[1]);
  assert.deepEqual(imports, [], 'o tomo não deve depender de biblioteca alguma');
  assert.match(mark, /^import '\.\/livro-3d\.css';/m);
});

test('o cenário das classes cresce com a tela em vez de se diluir', () => {
  const css = read('../src/features/classes/cenarios.css');
  assert.match(css, /@media\(min-width:901px\)\{\.classe-scene\{--scene-scale:1\.4\}\}/);
  assert.match(css, /\.classe-scene i\{--sz:calc\(var\(--s\) \* var\(--scene-scale\)\)\}/);
  // A camada da frente existe no desktop e não no celular.
  assert.match(css, /\.classe-scene-front\{/);
  assert.match(css, /@media\(max-width:900px\)\{\s*\.classe-scene-front\{display:none\}/);
});
