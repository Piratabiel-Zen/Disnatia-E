import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
const enemy = read('../src/experience/EnemySheetExperience.jsx');
const threatCss = read('../src/experience/ameaca.css');
const sheet = read('../src/features/sheets/SheetComponents.jsx');
const summonCss = read('../src/features/sheets/invocacoes.css');
const classes = read('../src/features/classes/ClassesPage.jsx');
const classesCss = read('../src/features/classes/classes.css');
const artifactCss = read('../src/experience/artefatos-destaque.css');

test('a ameaça do inimigo sobe junto com o visual da ficha', () => {
  // Os quatro níveis seguem existindo e cada um tem sua cor.
  for (const level of ['Baixo', 'Médio', 'Alto', 'Extremo']) {
    assert.match(threatCss, new RegExp(`data-threat="${level}"|--threat:#4ADE80`), `falta o nível ${level}`);
  }
  // A ficha inteira reage, não só um rótulo colorido.
  assert.match(enemy, /className="enemy-sheet-shell" data-threat=/);
  assert.match(threatCss, /\.enemy-sheet-shell\[data-threat="Extremo"\]/);
  // O extremo chama atenção sozinho.
  assert.match(threatCss, /animation:threatBeat/);
  // E quem pediu menos animação não recebe nenhuma.
  assert.match(threatCss, /prefers-reduced-motion:reduce[\s\S]*animation:none/);
  // Cada nível diz o que significa, em vez de só mudar de cor.
  assert.match(enemy, /DANGER_WORDS/);
});

test('a invocação do necromante usa a linguagem da ficha de personagem', () => {
  // Vitalidade em barra e vigor em marcas, como na ficha.
  assert.match(sheet, /invocacao-hp-fill/);
  assert.match(sheet, /invocacao-vc-pips/);
  // Atributos e habilidades em seções próprias.
  assert.match(sheet, /<h5>Atributos<\/h5>/);
  assert.match(sheet, /<h5>Habilidades<\/h5>/);
  // A criatura pode ter retrato, como um personagem.
  assert.match(sheet, /invocacao-portrait/);
  assert.match(sheet, /const newSummon=id=>\(\{id,nome:'',foto:''/);
  // O layout antigo saiu de cena.
  assert.doesNotMatch(sheet, /summon-memory-slot player-summon-card/);
  // As regras de liberação e sincronia continuam de pé.
  assert.match(sheet, /const canRelease=Boolean\(!activeSummon&&!busy\)/);
  assert.match(sheet, /Autorizada pelo Mestre\. Pode ser liberada agora/);
  assert.match(sheet, /updateSummonHp\(activeSummon\.id,delta,configuredMaxHp\)/);
  // A ameaça da criatura também escala.
  assert.match(summonCss, /\[data-threat="Extrema"\]/);
});

test('cada classe é apresentada como um cartaz, não como uma linha de lista', () => {
  assert.match(classes, /classe-hero/);
  assert.match(classes, /classe-hero-role/);
  // A lore ganha tratamento de citação e a passiva sai do rodapé.
  assert.match(classesCss, /\.classe-lore::before/);
  assert.match(classes, /Passiva da linhagem/);
  // Habilidades e especiais aparecem separadas, em cartões.
  assert.match(classes, /<h4 className="classe-section-title">Habilidades<\/h4>/);
  assert.match(classes, /<h4 className="classe-section-title">Especiais<\/h4>/);
  // A cor da linhagem comanda o painel inteiro.
  assert.match(classes, /style=\{\{ '--c': cls\.color \}\}/);
});

test('o artefato do portador é tratado como relíquia na ficha', () => {
  assert.match(artifactCss, /\.artifact-powers\{/);
  // Estado dos requisitos legível de relance.
  assert.match(artifactCss, /\.artifact-requirements\.ready/);
  assert.match(artifactCss, /\.artifact-requirements\.blocked/);
  // O poder utilizável se destaca do bloqueado.
  assert.match(artifactCss, /\.artifact-powers>article button:disabled/);
});
