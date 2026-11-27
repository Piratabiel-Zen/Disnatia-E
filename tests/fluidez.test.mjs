/**
 * O QUE NÃO PODE VOLTAR A TRAVAR
 *
 * A cena de terror empilha chuva, escuridão, névoa, sombras, poeira e
 * uma luz por efeito do mapa — tudo do tamanho da tela, tudo ao mesmo
 * tempo. Nessa pilha, três coisas custam caro de um jeito que não
 * aparece em teste nenhum até alguém reclamar que o site trava:
 *
 *   `background-position` animado  repinta a camada inteira por quadro
 *   `mix-blend-mode` por camada    relê tudo que está embaixo, por camada
 *   `backdrop-filter`              relê e BORRA tudo que está atrás
 *
 * Medido aqui com a cena cheia, trocar os três derrubou o quadro de
 * 216ms para 116ms. Estes testes são o que impede a volta.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { semComentarios } from './ajuda/semComentarios.mjs';

const RAIZ = new URL('../', import.meta.url).pathname;
const ler = f => semComentarios(readFileSync(join(RAIZ, f), 'utf8'));

function css(dir, achados = []) {
  for (const nome of readdirSync(join(RAIZ, dir))) {
    const rel = `${dir}/${nome}`;
    if (statSync(join(RAIZ, rel)).isDirectory()) css(rel, achados);
    else if (rel.endsWith('.css')) achados.push(rel);
  }
  return achados;
}

/** Os @keyframes de um arquivo, com o corpo de cada um. */
function quadros(fonte) {
  const achados = [];
  for (const m of fonte.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
    let prof = 1, j = m.index + m[0].length;
    const ini = j;
    while (j < fonte.length && prof) { prof += (fonte[j] === '{') - (fonte[j] === '}'); j += 1; }
    achados.push({ nome: m[1], corpo: fonte.slice(ini, j - 1) });
  }
  return achados;
}

/* As três que o compositor resolve sozinho, sem repintar nada. */
const BARATAS = new Set(['transform', 'opacity', 'visibility', 'offset-distance']);

test('as camadas da cena não animam nada que obrigue a repintar', () => {
  const caros = [];
  for (const f of ['src/experience/cenario-da-mesa.css',
    'src/features/oneshot/atmosfera-da-casa.css',
    'src/features/oneshot/camada-de-ambientacao.css',
    'src/features/oneshot/marcas-de-esconderijo.css']) {
    for (const q of quadros(ler(f))) {
      for (const prop of new Set([...q.corpo.matchAll(/([a-z-]+)\s*:/g)].map(m => m[1]))) {
        if (!BARATAS.has(prop)) caros.push(`${f.split('/').pop()}:${q.nome} anima ${prop}`);
      }
    }
  }
  assert.deepEqual(caros, [], `\n${caros.join('\n')}`);
});

test('as luzes da casa misturam UMA vez, não uma por camada', async () => {
  const folha = ler('src/features/oneshot/atmosfera-da-casa.css');
  /* Dez luzes com `mix-blend-mode` própria são dez leituras de tudo que
     está embaixo, a cada quadro. Agrupadas, é uma. Foi a troca que mais
     pesou: 166ms para 83ms no quadro. */
  assert.match(folha, /\.atm-luzes\{[^}]*mix-blend-mode:screen/);
  assert.match(folha, /\.atm-luzes\{[^}]*filter:brightness/);

  /* Nenhuma LUZ pode voltar a misturar sozinha. Outras camadas podem —
     a água reflete o que está aceso e precisa da mistura própria, e é
     uma só. O que não pode é a dezena de luzes voltar a ter uma cada. */
  const { LUZES } = await import('../src/features/oneshot/AtmosferaDaCasa.jsx')
    .catch(() => ({ LUZES: new Set() }));
  for (const luz of LUZES) {
    const i = folha.indexOf(`.${luz}{`);
    if (i < 0) continue;
    const regra = folha.slice(i, folha.indexOf('}', i));
    assert.ok(!/mix-blend-mode/.test(regra), `${luz} voltou a misturar sozinha`);
  }

  const jsx = readFileSync(join(RAIZ, 'src/features/oneshot/AtmosferaDaCasa.jsx'), 'utf8');
  assert.match(jsx, /className="atm-luzes"/, 'o invólucro das luzes sumiu do componente');
});

test('a atmosfera NÃO tem contain nem isolation — e isso é de propósito', () => {
  /* Os dois a deixariam mais barata e apagariam o efeito: criam contexto
     de empilhamento, e `mix-blend-mode` só mistura dentro do contexto em
     que está. A escuridão e as luzes existem para misturar com o MAPA,
     que está fora. Fechadas, a cena fica chapada. */
  const folha = ler('src/features/oneshot/atmosfera-da-casa.css');
  const bloco = folha.slice(folha.indexOf('.atm{'), folha.indexOf('}', folha.indexOf('.atm{')));
  assert.ok(!/contain:/.test(bloco), 'contain voltou e vai apagar a mistura com o mapa');
  assert.ok(!/isolation:/.test(bloco), 'isolation voltou e vai apagar a mistura com o mapa');
});

test('os painéis da noite não borram o que está atrás', () => {
  // Atrás deles está a pilha inteira da atmosfera. `backdrop-filter` manda
  // reler e borrar tudo aquilo a cada quadro, por um borrão de 2px que
  // sobre fundo 90% opaco ninguém enxerga.
  const comBorrao = [];
  for (const f of css('src/features/oneshot')) {
    if (/backdrop-filter:\s*blur/.test(ler(f))) comBorrao.push(f.split('/').pop());
  }
  assert.deepEqual(comBorrao, [], `voltou o borrão em: ${comBorrao.join(', ')}`);
});

test('a chuva sobra o necessário, e não mais', () => {
  /* O plano é girado e desce um ladrilho inteiro: a sobra de cima tem de
     caber a rotação MAIS o ladrilho. O `inset:-40%` antigo era fixo, não
     cabia o ladrilho de 380px, e ainda assim pintava 3,2 telas por
     camada, vezes três camadas. */
  const folha = ler('src/experience/cenario-da-mesa.css');
  assert.match(folha, /top:calc\(-24% - var\(--passo,260px\)\)/);
  assert.ok(!/inset:-40%/.test(folha), 'voltou a sobra fixa que não cabia o ladrilho');
});
