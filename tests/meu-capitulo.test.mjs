/* O CAPÍTULO DO JOGADOR NA TELA INICIAL
   O que estes testes seguram: o bloco é só do jogador, nunca do Mestre; ele
   não aparece vazio; a lore é resumida sem cortar palavra pela metade; e a
   frente (grupo A/B) só é anunciada quando o Mestre dividiu a companhia. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { meuCapitulo, objetivosDaFicha, resumoDaLore, tracosDaFicha } from '../src/adventure/meuCapitulo.mjs';
import { readGroups } from '../src/adventure/grupos.mjs';

const jansen = {
  id: 'j1',
  nome: "Jansen D'Loros",
  lore_personagem: 'Nasceu no Triângulo das Bermudas, filho de um cartógrafo que nunca voltou. Aprendeu a ler estrelas antes de ler palavras. Foi recrutado pelo Instituto aos dezenove anos e saiu de lá sem lembrar dos três meses do meio.',
  personalidade: ['Cético', 'Leal', ''],
  objetivos_pessoais: ['Descobrir o que o Instituto apagou', '  ', 'Achar o pai'],
};
const kenai = { id: 'k1', nome: 'Kenai', grupo: 'b', lore_personagem: 'Curto e direto.' };
const sheets = [jansen, kenai];

test('o Mestre não recebe o bloco: a tela dele continua como era', () => {
  const groups = readGroups({ location: 'Triângulo das Bermudas' });
  assert.equal(meuCapitulo({ sheets, playerId: 'j1', groups, masterMode: true }), null);
});

test('sem ficha na sessão não há bloco', () => {
  const groups = readGroups({});
  assert.equal(meuCapitulo({ sheets, playerId: 'ninguem', groups, masterMode: false }), null);
  assert.equal(meuCapitulo({ sheets, playerId: '', groups, masterMode: false }), null);
});

test('ficha sem nada escrito não vira moldura vazia', () => {
  const vazia = { id: 'v1', nome: 'Recém-criado', lore_personagem: '   ', personalidade: [], objetivos_pessoais: [] };
  assert.equal(meuCapitulo({ sheets: [vazia], playerId: 'v1', groups: readGroups({}), masterMode: false }), null);
});

test('traços e objetivos em branco são descartados, não exibidos', () => {
  assert.deepEqual(tracosDaFicha(jansen), ['Cético', 'Leal']);
  assert.deepEqual(objetivosDaFicha(jansen), ['Descobrir o que o Instituto apagou', 'Achar o pai']);
  assert.deepEqual(tracosDaFicha({}), []);
  assert.deepEqual(objetivosDaFicha({ objetivos_pessoais: 'texto solto' }), []);
});

test('a frente só é anunciada quando o Mestre dividiu a companhia', () => {
  const juntos = meuCapitulo({ sheets, playerId: 'k1', groups: readGroups({ location: 'Alasca' }), masterMode: false });
  assert.equal(juntos.frente.dividida, false);
  assert.equal(juntos.frente.nome, '', 'sem divisão, o lugar já está no topo da tela');
  // Sem divisão todos contam como frente A, mesmo com grupo marcado na ficha.
  assert.equal(juntos.frente.chave, 'a');

  const sessao = { location: 'Pirâmide de Salomão', grupos: { ativo: true, a: { nome: 'Frente da Porta' }, b: { nome: 'Frente da Cripta', local: 'Câmara interna' } } };
  const dividido = meuCapitulo({ sheets, playerId: 'k1', groups: readGroups(sessao), masterMode: false });
  assert.equal(dividido.frente.dividida, true);
  assert.equal(dividido.frente.chave, 'b', 'Kenai está marcado no grupo B');
  assert.equal(dividido.frente.nome, 'Frente da Cripta');
  assert.equal(dividido.frente.local, 'Câmara interna');

  const outro = meuCapitulo({ sheets, playerId: 'j1', groups: readGroups(sessao), masterMode: false });
  assert.equal(outro.frente.chave, 'a', 'quem não tem grupo marcado fica na frente A');
  assert.equal(outro.frente.local, 'Pirâmide de Salomão', 'a frente A herda o lugar da sessão');
});

test('o bloco traz o que a ficha tem, sem inventar texto', () => {
  const c = meuCapitulo({ sheets, playerId: 'j1', groups: readGroups({}), masterMode: false });
  assert.equal(c.nome, "Jansen D'Loros");
  assert.deepEqual(c.tracos, ['Cético', 'Leal']);
  assert.equal(c.objetivos.length, 2);
  assert.ok(jansen.lore_personagem.startsWith(c.lore.resumo.replace(/…$/, '').slice(0, 40)));
});

test('resumo: lore curta passa inteira e não ganha botão de "ler mais"', () => {
  const r = resumoDaLore('Curto e direto.');
  assert.equal(r.resumo, 'Curto e direto.');
  assert.equal(r.cortado, false);
  assert.equal(resumoDaLore('').resumo, '');
  assert.equal(resumoDaLore(null).cortado, false);
});

test('resumo: corta no fim de frase, nunca no meio de uma palavra', () => {
  const r = resumoDaLore(jansen.lore_personagem, 120);
  assert.equal(r.cortado, true);
  assert.ok(r.resumo.length <= 180, `resumo longo demais: ${r.resumo.length}`);
  assert.match(r.resumo, /[.!?…]$/, `terminou no meio: ${JSON.stringify(r.resumo)}`);
  // E o texto inteiro continua disponível para o botão abrir.
  assert.equal(r.inteiro, jansen.lore_personagem);
});

test('resumo: sem pontuação alguma, corta na palavra inteira com reticências', () => {
  const corrido = 'palavra '.repeat(80).trim();
  const r = resumoDaLore(corrido, 100);
  assert.equal(r.cortado, true);
  assert.match(r.resumo, /…$/);
  assert.ok(!/\bpalavr…$/.test(r.resumo), 'cortou uma palavra pela metade');
  assert.ok(r.resumo.length <= 110, `estourou o limite: ${r.resumo.length}`);
});

test('resumo: quando o primeiro parágrafo já se apresenta, ele é o resumo', () => {
  const abertura = 'Ele chegou ao Instituto sem nome, sem sombra e sem nenhuma intenção de sair de lá vivo.';
  const r = resumoDaLore(`${abertura}\n\nO resto veio depois, e o resto é longo: ${'detalhe. '.repeat(40)}`, 300);
  assert.equal(r.resumo, abertura);
  assert.equal(r.cortado, true);

  // Um parágrafo de abertura muito curto não serve de resumo sozinho.
  const magro = resumoDaLore(`Ele chegou.\n\nE o resto é longo: ${'detalhe. '.repeat(40)}`, 300);
  assert.notEqual(magro.resumo, 'Ele chegou.');
  assert.ok(magro.resumo.length > 60);
});

test('a tela do Mestre não ganha uma linha vazia por causa do bloco', () => {
  const css = readFileSync(new URL('../src/adventure/sessao.css', import.meta.url), 'utf8');
  const areas = css.match(/grid-template-areas:[^;}]+/g) || [];
  assert.ok(areas.length > 0);
  for (const area of areas) {
    assert.ok(
      !area.includes('capitulo'),
      `"capitulo" voltou a ser uma área nomeada: a linha passa a existir mesmo sem o bloco, e o gap da grade deixa um vazio no fim da tela do Mestre.\n  ${area}`,
    );
  }
  // Ele é posicionado automaticamente, ocupando a largura inteira.
  assert.match(css, /\.sessao-capitulo\{grid-column:1\/-1\}/);
});
