/* OS PECADOS
   O que a mesa pode ver de um Pecado é a caçada inteira: revelar cedo demais
   acaba com a sessão. Então o padrão é escondido, e o que não foi revelado
   não vem mascarado — não vem de jeito nenhum, porque um campo vazio na tela
   já conta demais sobre o que existe. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPOS_REVELAVEIS, CATEGORIAS, DOMINIOS_POR_PECADO, OUTROS_OPONENTES,
  alternarDominio, categoriaPorNumeral, cortarTalisma, esconder, executar,
  pecadoNovo, pecadoVisivel, podeSerExecutado, progressoDaCacada, revelar,
} from '../src/features/pecados/pecados.mjs';

const mestre = { uid: 'm1', papel: 'mestre' };
const ana = { uid: 'a1', papel: 'jogador' };

const completo = () => ({
  ...pecadoNovo({ id: 'p1', nome: 'O Sineiro', categoria: 'III' }),
  origem: 'Um pai que deixou a filha afogar e nunca contou.',
  hospedeiro: 'Matteo Ferro',
  palacio: 'O campanário submerso de San Pietro',
  talisma: 5, atacaCom: 'Sinos que quebram ossos',
  dominios: ['A água que sobe', 'O relógio sem ponteiros', 'A missa que não acaba'],
  aflicoes: 'Surdez progressiva',
});

test('as seis categorias do livro, em ordem, com cor', () => {
  assert.equal(CATEGORIAS.length, 6);
  assert.deepEqual(CATEGORIAS.map(c => `${c.numeral}. ${c.nome}`), [
    'I. Ogro', 'II. Ídolo', 'III. Cão', 'IV. Centopeia', 'V. Sapo', 'VI. Lorde',
  ]);
  for (const c of CATEGORIAS) assert.match(c.cor, /^#[0-9A-F]{6}$/i);
  assert.equal(categoriaPorNumeral('VI').nome, 'Lorde');
  assert.equal(categoriaPorNumeral('XII').numeral, 'I', 'categoria inventada vira a primeira');
  assert.equal(OUTROS_OPONENTES.length, 3, 'Peste, massa e vinculador vêm do livro');
});

test('Pecado novo nasce com tudo escondido', () => {
  const p = pecadoNovo({ id: 'x' });
  for (const campo of CAMPOS_REVELAVEIS) {
    assert.equal(p.revelado[campo.id], false, `${campo.nome} nasceu revelado`);
  }
  assert.equal(progressoDaCacada(p), 0);
  assert.equal(p.executado, false);
});

test('o que não foi revelado NÃO vem — nem vazio, nem mascarado', () => {
  const p = completo();
  const visto = pecadoVisivel(p, ana);
  // Um campo vazio na tela já diz "existe algo aqui".
  assert.equal('origem' in visto, false);
  assert.equal('palacio' in visto, false);
  assert.equal('talisma' in visto, false);
  assert.equal('dominios' in visto, false);
  // O que sempre se vê: existe, tem nome, categoria e forma.
  assert.equal(visto.nome, 'O Sineiro');
  assert.equal(visto.categoria, 'III');
});

test('o Mestre vê o Pecado inteiro', () => {
  const p = completo();
  assert.deepEqual(pecadoVisivel(p, mestre), p);
});

test('revelar entrega um pedaço de cada vez', () => {
  let p = completo();
  p = revelar(p, 'origem');
  let visto = pecadoVisivel(p, ana);
  assert.match(visto.origem, /deixou a filha afogar/);
  assert.equal(visto.hospedeiro, 'Matteo Ferro', 'a origem traz o hospedeiro junto');
  assert.equal('palacio' in visto, false, 'o resto continua escondido');

  p = revelar(p, 'talisma');
  visto = pecadoVisivel(p, ana);
  assert.equal(visto.talisma, 5);
  assert.equal(visto.atacaCom, 'Sinos que quebram ossos');

  assert.equal(progressoDaCacada(p), 0.5);
});

test('esconder de volta funciona, e campo inventado não mexe em nada', () => {
  let p = revelar(completo(), 'palacio');
  assert.ok('palacio' in pecadoVisivel(p, ana));
  p = esconder(p, 'palacio');
  assert.equal('palacio' in pecadoVisivel(p, ana), false);
  assert.deepEqual(revelar(p, 'nome-secreto'), p);
  assert.deepEqual(esconder(p, 'qualquer-coisa'), p);
});

test('o talismã enche e aí o Pecado PODE ser executado — ainda não morreu', () => {
  // Cortar o último não acaba a cena: abre a possibilidade dela.
  let p = { ...pecadoNovo({ id: 'x' }), talisma: 3 };
  assert.equal(podeSerExecutado(p), false);
  p = cortarTalisma(p); p = cortarTalisma(p);
  assert.equal(podeSerExecutado(p), false);
  p = cortarTalisma(p);
  assert.equal(podeSerExecutado(p), true);
  assert.equal(p.executado, false, 'poder ser executado não é estar morto');

  p = executar(p);
  assert.equal(p.executado, true);
});

test('o talismã não passa do limite nem fica negativo', () => {
  let p = { ...pecadoNovo({ id: 'x' }), talisma: 2 };
  p = cortarTalisma(p, 99);
  assert.equal(p.talismaCortes, 2);
  p = cortarTalisma(p, -99);
  assert.equal(p.talismaCortes, 0);
});

test('três domínios é o limite do livro', () => {
  let p = pecadoNovo({ id: 'x' });
  for (const d of ['A água que sobe', 'O relógio parado', 'A missa eterna', 'Um quarto a mais']) {
    p = alternarDominio(p, d);
  }
  assert.equal(p.dominios.length, DOMINIOS_POR_PECADO, 'passar de três descalibra a caçada');
  assert.ok(!p.dominios.includes('Um quarto a mais'));

  // Tirar um abre vaga.
  p = alternarDominio(p, 'O relógio parado');
  assert.equal(p.dominios.length, 2);
  p = alternarDominio(p, 'Um quarto a mais');
  assert.ok(p.dominios.includes('Um quarto a mais'));

  // Domínio em branco é ignorado.
  assert.deepEqual(alternarDominio(p, '   ').dominios, p.dominios);
});
