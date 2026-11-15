import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORIAS, parseRuleBody, regraCombina, resumoDaRegra } from '../src/features/regras/regrasTexto.mjs';

const fonte = readFileSync(new URL('../src/data/gameData.jsx', import.meta.url), 'utf8');
const manual = fonte.slice(fonte.indexOf('export const RULES_DATA=['), fonte.indexOf('\n];', fonte.indexOf('export const RULES_DATA=[')));
const regra = titulo => {
  const i = manual.indexOf(`title:'${titulo}`);
  assert.ok(i > 0, `regra não encontrada: ${titulo}`);
  return manual.slice(i, manual.indexOf('`\n  }', i));
};

// ---------- O que o Gabriel decidiu ----------

test('a Esquiva saiu e o Teste de Reflexo assumiu sozinho', () => {
  assert.doesNotMatch(manual, /Esquiva — 1 VC/, 'a ação morta não pode continuar no manual');
  assert.match(regra('Teste de Reflexo'), /única defesa reativa do sistema/);
  // A contradição do bônus de Agilidade some junto.
  assert.doesNotMatch(regra('Bônus de Atributos'), /esquivas/);
  assert.match(regra('Teste de Reflexo'), /1D20 puro, sem bônus de atributo/);
});

test('o Vigor Cósmico trava em 5, com a exceção do Fogo Azul', () => {
  const acoes = regra('Tipos de Ação, Custos e Limites');
  assert.match(acoes, /O VC NÃO acumula\. Ele trava em 5/);
  assert.match(acoes, /Assassinos do Fogo Azul/);
});

test('ataque de oportunidade só com as costas viradas', () => {
  const oportunidade = regra('Ataques de Oportunidade');
  assert.match(oportunidade, /quando alguém VIRA AS COSTAS/);
  assert.match(oportunidade, /Recuar de frente[^\\]*não provoca nada/);
  assert.match(oportunidade, /no máximo 1 por rodada/);
});

test('1 ponto de atributo por nível, teto 16', () => {
  assert.match(regra('Progressão & XP'), /Cada nível conquistado dá 1 ponto de atributo/);
  assert.match(regra('Progressão & XP'), /Nenhum atributo passa de 16/);
});

test('as recargas zeram entre combates, menos a usada na porta', () => {
  const recargas = regra('Recargas, Descanso e Fora de Combate');
  assert.match(recargas, /Todas as recargas zeram/);
  assert.match(recargas, /Ao trocar de cena/);
  assert.match(recargas, /JÁ ENTRA na luta em recarga/);
});

test('a Pele de Rubi passou a dizer o que a mesa de fato faz', () => {
  // Defesa não existe como número no sistema; a passiva dava vida bônus.
  assert.match(fonte, /"name": "Pele de Rubi"[\s\S]{0,260}Vida M\\u00e1xima por inimigo/);
  assert.doesNotMatch(fonte, /atributos b\\u00f4nus de defesa/);
});

test('os estados alterados cobrem o que o Gabriel pediu, com tetos', () => {
  const estados = regra('Estados Alterados');
  for (const [nome, marca] of [['Sangramento', /−2 de vida por rodada/], ['Veneno', /−1 de vida por rodada/],
    ['Congelamento', /−3 em todos os testes de ataque/], ['Atordoado', /perde 1 turno inteiro/],
    ['Maldição', /20 natural deixa de ser crítico/]]) {
    assert.ok(estados.includes(nome), `falta o estado ${nome}`);
    assert.match(estados, marca, `efeito errado em ${nome}`);
  }
  // Os tetos existem para nenhum estado tirar o jogador da partida.
  assert.match(estados, /Acumula até o limite de −6/);
  assert.match(estados, /Enfileira até 2 turnos, nunca mais que isso/);
  assert.match(estados, /NÃO acumula — uma maldição por vez/);
  assert.match(estados, /descontam no INÍCIO do turno/);
});

test('o Último Fôlego dá a janela difícil, não a imortalidade', () => {
  const folego = regra('Último Fôlego');
  assert.match(folego, /16 ou mais → você não cai/);
  assert.match(folego, /Uma vez por combate/);
  assert.match(folego, /3 Marcas da Morte = morte definitiva/);
  // Tem que dar para o aliado chegar — e tem que dar para o inimigo terminar.
  assert.match(folego, /aliado adjacente pode gastar 2 VC/);
  assert.match(folego, /Levar dano enquanto Caído acrescenta 1 Marca/);
  assert.match(folego, /APAGA todas as Marcas/);
});

// ---------- A leitura ----------

test('resultado de dado vira tabela, não frase', () => {
  const blocos = parseRuleBody('Role 1D20:\n\n• 16 ou mais → você não cai.\n• 15 ou menos → você cai.');
  assert.deepEqual(blocos.map(b => b.tipo), ['titulo', 'resultados']);
  assert.equal(blocos[1].itens.length, 2);
  assert.equal(blocos[1].itens[0].condicao, '16 ou mais');
  assert.equal(blocos[1].itens[0].efeito, 'você não cai.');
});

test('estado alterado vira verbete, com a explicação junto do nome', () => {
  // A continuação sem linha em branco pertence ao verbete acima: era isso que
  // soltava a explicação do nome a que ela se refere.
  const blocos = parseRuleBody('🩸 Sangramento — −2 por rodada.\nAcumula. Dois são −4.\n\n🧪 Veneno — −1 por rodada.');
  assert.deepEqual(blocos.map(b => b.tipo), ['verbetes', 'verbetes']);
  assert.equal(blocos[0].itens[0].nome, 'Sangramento');
  assert.match(blocos[0].itens[0].texto, /−2 por rodada\. Acumula\. Dois são −4\./);
  assert.equal(blocos[1].itens[0].nome, 'Veneno');
});

test('aviso e passo numerado têm forma própria', () => {
  const blocos = parseRuleBody('⚠️ Limite em combate: três ataques.\n\n1º — O Último Fôlego\n2º — Caído');
  assert.equal(blocos[0].tipo, 'aviso');
  assert.equal(blocos[0].texto, 'Limite em combate: três ataques.');
  assert.equal(blocos[1].tipo, 'passos');
  assert.deepEqual(blocos[1].itens.map(p => p.numero), ['1', '2']);
});

test('texto comum continua texto comum', () => {
  const blocos = parseRuleBody('O combate é por turnos.\nA ordem é dinâmica.');
  assert.deepEqual(blocos.map(b => b.tipo), ['texto']);
  assert.equal(blocos[0].itens.length, 2);
  assert.deepEqual(parseRuleBody(''), []);
  assert.deepEqual(parseRuleBody(null), []);
});

test('a busca ignora acento e caixa', () => {
  const alvo = { title: 'Último Fôlego', body: 'Marca da Morte e Durabilidade.' };
  for (const termo of ['ultimo', 'FÔLEGO', '  marca ', 'durabilidade']) {
    assert.equal(regraCombina(alvo, termo), true, `não achou: ${termo}`);
  }
  assert.equal(regraCombina(alvo, 'piromancia'), false);
  assert.equal(regraCombina(alvo, ''), true, 'busca vazia mostra tudo');
});

test('o resumo do índice cabe em duas linhas', () => {
  assert.equal(resumoDaRegra('Primeira linha.\nSegunda linha.'), 'Primeira linha.');
  assert.ok(resumoDaRegra('x'.repeat(300)).length <= 96);
  assert.equal(resumoDaRegra(''), '');
});

test('todas as categorias do manual aparecem no filtro', () => {
  const usadas = new Set([...manual.matchAll(/cat:'([^']+)'/g)].map(m => m[1]));
  const oferecidas = new Set(CATEGORIAS.map(c => c.id));
  for (const cat of usadas) assert.ok(oferecidas.has(cat), `categoria sem filtro: ${cat}`);
  assert.ok(oferecidas.has('todas'));
});
