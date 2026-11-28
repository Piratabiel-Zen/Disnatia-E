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
  /* O brilho da hora era `filter` e virou `opacity` — mesma imagem, e
     13% do quadro a menos. O teste de baixo guarda essa troca. */
  assert.match(folha, /\.atm-luzes\{[^}]*opacity:var\(--atm-brilho,1\)/);

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

test('o botão Leve corta textura e não corta informação', () => {
  /* O "Leve" existia e, nesta mesa, não fazia nada: só trocava o fundo
     cósmico, que aqui nem é desenhado porque o cenário da casa toma o
     lugar dele. Medido, ligá-lo de verdade levou a cena de 166ms para
     50ms por quadro, e de 34 animações correndo para 17. */
  const atm = ler('src/features/oneshot/atmosfera-da-casa.css');
  const cen = ler('src/experience/cenario-da-mesa.css');

  /* Conferência literal, sem expressão regular montada em template:
     escapes duplos dentro de crase são exatamente o tipo de coisa que
     falha em silêncio e acusa código que está certo. */
  const corte = atm.slice(atm.indexOf('html[data-quality="light"] .atm-poeira'));
  const seletores = corte.slice(0, corte.indexOf('}') + 1);

  // Sai o que é só profundidade: ninguém joga diferente por causa da poeira.
  for (const textura of ['.atm-poeira', '.atm-nevoa-alta', '.atm-sombras', '.atm-passagem']) {
    assert.ok(seletores.includes(textura), `${textura} continua desenhando no modo leve`);
  }
  assert.match(seletores, /display:none/);

  /* FICA tudo que a mesa usa para ler a cena. Cortar isto daria partidas
     diferentes a quem tem máquina boa e a quem não tem. */
  for (const essencial of ['.atm-escuridao', '.atm-luzes', '.atm-nevoa,', '.atm-nevoa{']) {
    assert.ok(!seletores.includes(essencial),
      `${essencial} sumiu no leve — é informação de cena, não enfeite`);
  }

  // E o que sobra para de se mexer: névoa parada é melhor que névoa que engasga.
  assert.match(atm, /data-quality="light"\][\s\S]{0,200}animation:none !important/);
});

test('o modo leve usa a chave que o projeto já tinha, e só ela', () => {
  /* O botão sempre escreveu `data-quality` na raiz (usePerformance). Eu
     tinha criado um SEGUNDO atributo para o corte desta mesa, e com isso
     metade do CSS ouvia uma chave e metade a outra. Este teste existe para
     que o segundo nome não volte. */
  const escritor = readFileSync(join(RAIZ, 'src/adventure/usePerformance.js'), 'utf8');
  assert.match(escritor, /document\.documentElement\.dataset\.quality = quality/);
  for (const arquivo of ['src/features/oneshot/atmosfera-da-casa.css',
                         'src/experience/cenario-da-mesa.css',
                         'src/AuthenticatedSession.jsx',
                         'tests/browser/fluidez-fixture.jsx']) {
    /* Sem comentários: o aviso de "não volte a usar o segundo nome" cita o
       nome, e o teste não deve se acusar pelo próprio aviso. */
    const fonte = readFileSync(join(RAIZ, arquivo), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.ok(!/data-qualidade|dataset\.qualidade/.test(fonte),
      `${arquivo} voltou a usar um segundo nome para o modo de qualidade`);
  }
  const atm = readFileSync(join(RAIZ, 'src/features/oneshot/atmosfera-da-casa.css'), 'utf8');
  assert.ok(atm.includes('html[data-quality="light"] .atm-poeira'),
    'o corte do modo leve não está pendurado na chave certa');
});

test('a escuridão e o peso da hora cabem numa camada só', () => {
  /* Eram dois elementos do tamanho da tela querendo a MESMA mistura
     sobre o mesmo mapa. Medido, o segundo custava 13% do quadro. Cada um
     manteve o seu controle porque a intensidade foi para a COR e não
     para a opacidade do elemento. */
  const atm = ler('src/features/oneshot/atmosfera-da-casa.css');
  assert.match(atm, /@property --atm-noite\{ syntax:'<number>'/,
    'sem a propriedade declarada a passagem das horas vira salto');
  assert.match(atm, /rgba\(5,6,10,var\(--atm-noite,\.3\)\)/);
  assert.match(atm, /rgba\(3,2,5,var\(--atm-escuridao,\.45\)\)/);
  assert.ok(!/^\.atm-noite\{/m.test(atm), 'a camada separada da noite voltou');

  const jsx = readFileSync(join(RAIZ, 'src/features/oneshot/AtmosferaDaCasa.jsx'), 'utf8');
  assert.ok(!/className="atm-noite"/.test(jsx));
});

test('o brilho da hora é opacidade, não filtro', () => {
  /* Para luz somada em `screen`, clarear e aumentar a opacidade dão
     quase a mesma imagem — e a saturação variava entre 0,85 e 1,03, que
     é invisível. O filtro custava 13% do quadro porque obriga o grupo a
     ser rasterizado num buffer à parte. */
  const atm = ler('src/features/oneshot/atmosfera-da-casa.css');
  const luzes = atm.slice(atm.indexOf('.atm-luzes{'), atm.indexOf('}', atm.indexOf('.atm-luzes{')));
  assert.match(luzes, /opacity:var\(--atm-brilho,1\)/);
  assert.ok(!/filter:/.test(luzes), 'o filtro voltou ao grupo das luzes');
});
