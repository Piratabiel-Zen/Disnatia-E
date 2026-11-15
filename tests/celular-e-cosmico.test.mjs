import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blockedOnThisDevice, isDesktopOnlyTab, visibleTabs, isMobileViewport } from '../src/adventure/viewport.mjs';
import { parallaxOffsets, cosmicParallaxAllowed, PARALLAX_REACH } from '../src/experience/useCosmicParallax.js';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');

test('o mapa de combate nunca abre em tela de celular', () => {
  assert.equal(blockedOnThisDevice('mapabatalha', true), true);
  assert.equal(blockedOnThisDevice('mapamundi', true), true);
  assert.equal(blockedOnThisDevice('mapabatalha', false), false);
  assert.equal(isDesktopOnlyTab('mapabatalha'), true);
  assert.equal(isDesktopOnlyTab('cronicas'), false);
});

test('no celular o botao do mapa nem aparece', () => {
  const menu = [['session','Sessão'],['mapabatalha','Mapa de combate'],['mapamundi','Atlas'],['livro','Livro']];
  assert.deepEqual(visibleTabs(menu, true).map(([id]) => id), ['session','livro']);
  assert.equal(visibleTabs(menu, false).length, 4);
});

test('visibleTabs aceita id solto e objeto, nao so par', () => {
  assert.deepEqual(visibleTabs(['session','mapabatalha'], true), ['session']);
  assert.deepEqual(visibleTabs([{id:'mapabatalha'},{id:'livro'}], true).map(i=>i.id), ['livro']);
});

test('sem window a regra nao explode nem bloqueia tudo', () => {
  assert.equal(isMobileViewport(null), false);
  assert.equal(cosmicParallaxAllowed(null), false);
});

test('a paralaxe afasta do cursor e respeita o limite', () => {
  const center = parallaxOffsets(500, 400, 1000, 800);
  assert.equal(center.x, 0);
  assert.equal(center.y, 0);
  const corner = parallaxOffsets(1000, 800, 1000, 800);
  assert.equal(corner.x, PARALLAX_REACH);
  assert.equal(corner.y, PARALLAX_REACH);
  const far = parallaxOffsets(99999, -99999, 1000, 800);
  assert.ok(Math.abs(far.x) <= PARALLAX_REACH, 'nunca passa do alcance');
  assert.ok(Math.abs(far.y) <= PARALLAX_REACH, 'nunca passa do alcance');
});

test('paralaxe exige ponteiro fino, tela larga e permissao de movimento', () => {
  const fake = answers => ({ matchMedia: q => ({ matches: Boolean(answers[q]) }) });
  const desktop = {'(hover: hover)':true,'(pointer: fine)':true,'(min-width: 1024px)':true};
  assert.equal(cosmicParallaxAllowed(fake(desktop), false), true);
  // Movimento reduzido agora é escolha do jogador, não da media query.
  assert.equal(cosmicParallaxAllowed(fake(desktop), true), false);
  assert.equal(cosmicParallaxAllowed(fake({...desktop,'(pointer: fine)':false}), false), false);
  assert.equal(cosmicParallaxAllowed(fake({...desktop,'(min-width: 1024px)':false}), false), false);
});

test('as camadas profundas ficam fora do celular e do modo Leve', () => {
  const css = read('../src/experience/cosmico-profundo.css');
  assert.match(css, /@media \(max-width:1023px\)\{[\s\S]*?\.cosmum-depth,\.cosmum-dust,\.cosmum-cursor-bloom\{display:none!important\}/);
  assert.match(css, /html\[data-quality="light"\] \.cosmum-depth/);
  assert.match(css, /html\[data-motion="reduced"\][\s\S]*?\.cosmum-depth/);
});

test('o anel de selecao continua visivel para quem pediu menos movimento', () => {
  const css = read('../src/experience/cosmico-profundo.css');
  const tail = css.slice(css.indexOf('.cosmum-orbit{'));
  assert.match(tail, /\.cosmum-orbit::before\{opacity:\.7\}/);
});

test('o anel nunca usa o transform do elemento selecionado', () => {
  const ring = read('../src/experience/CosmicSelectionRing.jsx');
  assert.match(ring, /className=\{`cosmum-orbit/);
  const css = read('../src/experience/cosmico-profundo.css');
  assert.match(css, /\.cosmum-orbit\{[\s\S]*?position:absolute/);
});

test('o celular nao recebe o mapa de combate pelo menu de atalhos', () => {
  const comfort = read('../src/experience/PlayerComfort.jsx');
  assert.match(comfort, /visibleTabs\(\[\['session'/);
  assert.match(comfort, /\]\], mobile\)\.map/);
});
