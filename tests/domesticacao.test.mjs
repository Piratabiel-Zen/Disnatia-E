import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// O Node não importa .jsx, então lemos a fonte e recortamos a regra — é o
// mesmo caminho que os outros testes usam para o gameData.
const fonte = readFileSync(new URL('../src/data/gameData.jsx', import.meta.url), 'utf8');
const inicio = fonte.indexOf("title:'Domesticação & Familiares'");
const regra = inicio < 0 ? null : {
  cat: (fonte.slice(Math.max(0, inicio - 200), inicio).match(/cat:'([^']+)'/g) || []).pop()?.slice(5, -1),
  body: fonte.slice(inicio, fonte.indexOf('`\n  }', inicio)),
};

test('a domesticação está no manual', () => {
  assert.ok(regra, 'a regra precisa aparecer no Manual de Regras');
  assert.equal(regra.cat, 'Mecânicas');
});

test('usa Percepção, que é o atributo mais magro do sistema', () => {
  assert.match(regra.body, /O atributo é Percepção/);
  // E não vira um segundo teste de Força disfarçado.
  assert.match(regra.body, /Força assusta; Percepção convence/);
});

test('as ofertas do cenário fazem o trabalho pesado', () => {
  for (const oferta of ['Comida, carne ou isca', 'território dela', 'Artefato com afinidade', 'Oferta errada']) {
    assert.ok(regra.body.includes(oferta), `falta a oferta: ${oferta}`);
  }
  // Com a oferta certa mais sangue, uma criatura de ameaça média sai em poucos
  // turnos; sem nada, o jogador rola a noite inteira. É esse o incentivo.
  assert.match(regra.body, /Ameaça Média → 9 de Vínculo/);
  assert.match(regra.body, /território dela[^\n]*\+4 de Vínculo/);
  assert.match(regra.body, /Cada 2 pontos de vida que você derrama valem \+1 de Vínculo/);
});

test('a criatura precisa estar abalada ou calma', () => {
  assert.match(regra.body, /Abalada \(metade da vida ou menos\) ou Calma/);
  assert.match(regra.body, /até 2 metros/);
});

test('errar feio tem preço, e o 1 natural fecha a porta', () => {
  assert.match(regra.body, /10 ou menos → −2 de Vínculo e a criatura ataca você imediatamente/);
  assert.match(regra.body, /1 natural → o vínculo se quebra/);
});

test('o resultado se encaixa no familiar que a ficha já tem', () => {
  // A ficha já guarda hp, 2 de vigor e habilidades; a regra não pode inventar
  // um formato diferente do que o site grava.
  assert.match(regra.body, /Tem 2 de Vigor Cósmico, como todo Familiar/);
  assert.match(regra.body, /Mantém UMA de suas habilidades/);
  assert.match(regra.body, /Cada personagem sustenta 1 Familiar\. Corvos do Horizonte sustentam até 3/);
});

test('familiar derrubado foge em vez de morrer', () => {
  assert.match(regra.body, /Familiar a 0 de vida não morre: ele foge/);
  assert.match(regra.body, /sobe em \+3/);
});

test('o limite de familiares da regra é o mesmo que o código aplica', async () => {
  const { limiteDeFamiliares } = await import('../src/adventure/familiares.mjs');
  assert.equal(limiteDeFamiliares({ classe: 'corvos' }), 3);
  assert.equal(limiteDeFamiliares({ classe: 'fogo' }), 1);
});
