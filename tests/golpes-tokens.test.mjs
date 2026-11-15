import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
const kit = read('../src/experience/ExperienceKit.jsx');
const strikeCss = read('../src/experience/golpes.css');
const battle = read('../src/features/mapa-batalha/BattleMapPage.jsx');
const tokenCss = read('../src/features/mapa-batalha/tokens-vivos.css');

test('o golpe escurece a mesa e mostra quem agiu', () => {
  // O véu cobre a tela toda, sem clarão no meio que deixe a cena legível.
  assert.match(strikeCss, /\.combat-action-pulse\.compact \.combat-action-backdrop\{[\s\S]*?rgba\(3,3,9,\.74\)/);
  assert.match(strikeCss, /backdrop-filter:blur/);
  // Quem usou aparece de rosto, com o retrato da própria ficha.
  assert.match(kit, /combat-action-portrait/);
  assert.match(kit, /actor\?\.foto\?<img src=\{actor\.foto\}/);
  // O nome da habilidade é o maior texto da tela.
  assert.match(strikeCss, /\.combat-action-pulse\.compact \.combat-action-pulse-core strong\{[\s\S]*?font-size:clamp\(1\.5rem/);
  // Tipos mais raros pesam mais que uma habilidade comum.
  assert.match(strikeCss, /\.action-combinada \.combat-action-pulse-core strong\{[\s\S]*?font-size:clamp\(1\.8rem/);
});

test('o golpe respeita quem pediu menos movimento e o modo leve', () => {
  assert.match(strikeCss, /html\[data-quality=light\][\s\S]*?animation:none/);
  assert.match(strikeCss, /prefers-reduced-motion:reduce[\s\S]*?animation:none/);
});

test('os tokens respiram conforme o estado, sem atrapalhar o arraste', () => {
  // A animação fica no invólucro: a imagem já usa transform para a rotação.
  assert.match(battle, /className="map-token-body"/);
  assert.match(tokenCss, /\.map-token-body\{[\s\S]*?animation:tokenBreath/);
  // Vida baixa muda o ritmo; token caído não respira.
  assert.match(battle, /data-vitals=/);
  assert.match(tokenCss, /\[data-vitals="ferido"\]/);
  assert.match(tokenCss, /\[data-vitals="caido"\]\{animation:none\}/);
  // Arrastar ou girar desliga a respiração.
  assert.match(battle, /data-still=\{draggingId === token\.id \|\| rotatingId === token\.id \? 'false' : 'true'\}/);
  assert.match(tokenCss, /\[data-still="false"\]\{animation:none\}/);
  // Cada peça tem seu próprio compasso.
  assert.match(battle, /'--breath-delay'/);
  // E nada disso roda para quem não quer movimento.
  assert.match(tokenCss, /prefers-reduced-motion:reduce[\s\S]*?animation:none!important/);
});
