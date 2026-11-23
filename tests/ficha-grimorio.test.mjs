/**
 * A FICHA COMO CADERNO ABERTO
 *
 * O redesenho é visual, mas tem duas promessas que não são de gosto e por
 * isso ficam guardadas aqui:
 *
 *  1. as camadas que fazem a ficha reagir ao estado se penduram na RAIZ e nas
 *     classes antigas. O caderno foi construído por cima, sem renomear nada,
 *     justamente para elas continuarem valendo — se alguém renomear `.osf` ou
 *     `.osf-retrato` numa próxima repaginada, o sangue e o pavor somem sem
 *     erro nenhum no console;
 *  2. em tela estreita o caderno vira UMA página. Duas colunas num celular
 *     espremem a competência até o nome quebrar em três linhas, e aí fica
 *     bonito e inútil.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import { ATRIBUTOS, COMPETENCIAS } from '../src/features/oneshot/fichaOneShot.mjs';
import { TEM_ICONE, TRACOS } from '../src/features/oneshot/iconesOneShot.mjs';

const fonte = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

test('todo atributo e toda competência têm ícone', () => {
  // Ícone faltando não quebra nada — o componente devolve vazio de propósito
  // — então o buraco só apareceria na mesa, como um item torto no meio da
  // lista. É aqui que ele tem que aparecer.
  for (const a of ATRIBUTOS) assert.ok(TEM_ICONE(a.id), `atributo ${a.nome} sem ícone`);
  for (const c of COMPETENCIAS) assert.ok(TEM_ICONE(c.id), `competência ${c.nome} sem ícone`);
  for (const condicao of ['vida', 'pavor', 'sanidade']) {
    assert.ok(TEM_ICONE(condicao), `condição ${condicao} sem ícone`);
  }
});

test('ícone que não existe não derruba a ficha', () => {
  // Competência nova entra sem quebrar a ficha de quem já está jogando: o
  // componente devolve vazio, e quem cobra o ícone que faltou é o teste
  // acima, não a mesa no meio da cena.
  assert.equal(TEM_ICONE('nao-existe'), false);
  assert.equal(TRACOS['nao-existe'], undefined);
});

test('todo ícone tem traço de verdade', () => {
  // Entrada vazia passaria no teste de existência e desenharia um buraco.
  for (const [nome, tracos] of Object.entries(TRACOS)) {
    assert.ok(Array.isArray(tracos) && tracos.length > 0, `${nome} está vazio`);
    for (const t of tracos) {
      assert.ok(['path', 'circle', 'ellipse', 'rect'].includes(t.t),
        `${nome} tem elemento desconhecido: ${t.t}`);
    }
  }
});

test('os ícones são desenhados aqui, sem fonte nem rede', () => {
  /* A mesa roda atrás de uma CSP estreita, e toda vez que entrou host novo
     alguma coisa parou de funcionar — música e câmera já caíram por isso. */
  for (const arquivo of ['src/features/oneshot/iconesOneShot.mjs',
    'src/features/oneshot/IconesOneShot.jsx']) {
    const texto = semComentarios(fonte(arquivo));
    assert.ok(!/https?:\/\//.test(texto), `entrou endereço externo em ${arquivo}`);
    assert.ok(!/@font-face|font-family/.test(texto), `entrou fonte de ícone em ${arquivo}`);
  }
  // Herdar a cor é o que deixa o mesmo desenho servir no escudo, na
  // competência e no medidor sem uma variante por lugar.
  assert.match(semComentarios(fonte('src/features/oneshot/IconesOneShot.jsx')), /currentColor/);
});

test('o caderno não renomeou o que as camadas de estado seguram', () => {
  /* Esta é a promessa que importa: o redesenho veio POR CIMA. Se um dia
     alguém renomear estas classes, a ficha para de reagir ao estado sem
     erro nenhum — some calado, que é o pior jeito de quebrar. */
  const jsx = semComentarios(fonte('src/features/oneshot/FichaOneShot.jsx'));
  const viva = semComentarios(fonte('src/features/oneshot/ficha-viva.css'));
  for (const classe of ['osf-vivo', 'osf-sangue', 'osf-pavor', 'osf-riscos',
    'osf-sombras', 'osf-retrato']) {
    assert.ok(jsx.includes(classe), `a ficha perdeu ${classe}`);
    assert.ok(viva.includes(classe), `a camada de estado perdeu ${classe}`);
  }
  // E os níveis continuam na raiz, que é de onde todas as camadas pendem.
  assert.match(jsx, /className="osf"[\s\S]{0,200}?data-ferida=/);
});

test('o caderno fecha numa página só em tela estreita', () => {
  const css = semComentarios(fonte('src/features/oneshot/ficha-one-shot.css'));
  const estreito = css.match(/@media \(max-width:900px\)\{[\s\S]*?\n\}/);
  assert.ok(estreito, 'sumiu a regra de tela estreita');
  assert.match(estreito[0], /\.osf\{grid-template-columns:1fr/);
  assert.match(estreito[0], /\.osf-vinco\{display:none\}/,
    'o vinco do meio tem que sumir junto com a segunda página');
});

test('a ficha tem as duas páginas e o vinco', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/FichaOneShot.jsx'));
  assert.match(jsx, /osf-pagina osf-pagina-esquerda/);
  assert.match(jsx, /osf-pagina osf-pagina-direita/);
  assert.match(jsx, /osf-vinco/);
  // A visão atravessa as duas: quando ela abre, nada mais na ficha importa.
  const css = semComentarios(fonte('src/features/oneshot/ficha-one-shot.css'));
  assert.match(css, /\.osf-visao\{grid-column:1 \/ -1\}/);
});
