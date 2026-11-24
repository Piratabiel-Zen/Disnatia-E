/**
 * O OBJETO COM ESPESSURA
 *
 * O pedido foi "deixar os itens quase em 3D". O que faz um papel parecer um
 * papel na mão não é o giro: é a ESPESSURA e a luz. Um plano girando em
 * `rotateY` sem borda nem sombra é uma carta de baralho de zero milímetro, e
 * o olho percebe na primeira volta.
 *
 * O que estes testes guardam:
 *  - o lado à mostra sai do ÂNGULO, e não de um `virado` separado — dois
 *    estados para a mesma coisa é como a face certa acaba aparecendo
 *    espelhada;
 *  - há borda e sombra, e a sombra acompanha o ângulo;
 *  - o giro assenta numa face: objeto parado de perfil não se lê;
 *  - foto continua foto — `rotateY` numa imagem digital não mostra espessura
 *    nenhuma, porque ela não tem.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import {
  estaNoVerso, faceAoSol, ehDesenhado, objetoInspecionavel, temVerso,
} from '../src/features/oneshot/inspecao.mjs';
import {
  faceDoItem, TEM_FACE, FORMAS_CONHECIDAS, temEscritaFingida,
} from '../src/features/oneshot/facesDeItem.mjs';
import { ITENS } from '../src/features/oneshot/itensDaCasa.mjs';

const fonte = c => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8');

test('de frente mostra a frente, de costas mostra o verso', () => {
  assert.equal(estaNoVerso(0), false);
  assert.equal(estaNoVerso(180), true);
  assert.equal(estaNoVerso(360), false);
  assert.equal(estaNoVerso(540), true);
});

test('o lado à mostra não depende de quantas voltas foram dadas', () => {
  for (const voltas of [-2, -1, 0, 1, 3]) {
    assert.equal(estaNoVerso(voltas * 360), false, `${voltas} voltas inverteu a face`);
    assert.equal(estaNoVerso(voltas * 360 + 180), true);
  }
});

test('girar para a esquerda vira igual a girar para a direita', () => {
  assert.equal(estaNoVerso(-180), estaNoVerso(180));
  assert.equal(estaNoVerso(-90.1), estaNoVerso(269.9));
});

test('entrada podre não deixa o objeto sem face', () => {
  for (const ruim of [NaN, undefined, null, 'x', {}]) {
    assert.equal(estaNoVerso(ruim), false, 'sem ângulo, o objeto fica de frente');
    assert.ok(Number.isFinite(faceAoSol(ruim)));
  }
});

test('a luz é máxima de frente e mínima de perfil', () => {
  assert.equal(Number(faceAoSol(0).toFixed(3)), 1);
  assert.equal(Number(faceAoSol(180).toFixed(3)), 1);
  assert.ok(faceAoSol(90) < 0.01, 'de perfil a superfície some');
  assert.ok(faceAoSol(45) > 0.6 && faceAoSol(45) < 0.8);
});

test('a luz nunca é negativa: sombra invertida vira risco branco', () => {
  for (let g = -720; g <= 720; g += 7) {
    const luz = faceAoSol(g);
    assert.ok(luz >= 0 && luz <= 1, `luz fora da faixa em ${g}: ${luz}`);
  }
});

test('toda forma de item tem desenho de frente e de verso', () => {
  for (const item of ITENS) {
    assert.ok(TEM_FACE(item.forma), `forma sem desenho: ${item.forma} (${item.id})`);
    assert.ok(faceDoItem(item.forma, item.selo, 'frente'), `${item.id} sem frente`);
    assert.ok(faceDoItem(item.forma, item.selo, 'verso'), `${item.id} sem verso`);
  }
});

test('o verso não é a frente espelhada', () => {
  // Virar e achar a mesma coisa de trás é a maneira mais rápida de ensinar a
  // mesa a não virar mais nada.
  for (const forma of new Set(ITENS.map(i => i.forma))) {
    const frente = JSON.stringify(faceDoItem(forma, 'entrada', 'frente'));
    const verso = JSON.stringify(faceDoItem(forma, 'entrada', 'verso'));
    assert.notEqual(frente, verso, `o verso de ${forma} é igual à frente`);
  }
});

test('cada amuleto tem o selo dele, e não o do vizinho', () => {
  const versos = ITENS.filter(i => i.forma === 'amuleto')
    .map(i => JSON.stringify(faceDoItem('amuleto', i.selo, 'verso')));
  assert.equal(new Set(versos).size, versos.length, 'dois amuletos com o mesmo verso');
});

test('forma desconhecida não desenha nada em vez de quebrar', () => {
  assert.equal(faceDoItem('nada', '', 'frente'), null);
  assert.equal(TEM_FACE(''), false);
});

test('só objeto desenhado ganha espessura', () => {
  const foto = objetoInspecionavel({ imagem: 'x.png', versoTexto: 'atrás' });
  assert.equal(ehDesenhado(foto), false);
  assert.ok(temVerso(foto), 'a foto com texto atrás continua virável');

  const papel = objetoInspecionavel({ forma: 'jornal' });
  assert.ok(ehDesenhado(papel));
  assert.ok(temVerso(papel), 'o desenho sempre tem verso: é vetor dos dois lados');
});

test('o inspetor tira o lado à mostra do ângulo, não de um estado paralelo', () => {
  const codigo = semComentarios(fonte('src/features/oneshot/InspetorDeObjeto.jsx'));
  assert.match(codigo, /tridimensional \? estaNoVerso\(graus\) : virado/,
    'com espessura, a face é o ângulo; dois estados dessincronizam');
  // E é esse valor que vai para a tela e para o botão.
  assert.match(codigo, /virado:\s*mostrandoOVerso/);
  assert.match(codigo, /mostrandoOVerso \? 'Frente' : 'Virar'/);
});

test('o objeto tem borda e sombra, e a sombra segue o ângulo', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/InspetorDeObjeto.jsx'));
  for (const borda of ['insp-borda-e', 'insp-borda-d', 'insp-borda-c', 'insp-borda-b']) {
    assert.ok(jsx.includes(borda), `falta a face ${borda}: sem as quatro não há espessura`);
  }
  assert.match(jsx, /--insp-chao.*faceAoSol\(graus\)/,
    'a sombra precisa encolher quando o objeto fica de perfil');

  const css = semComentarios(fonte('src/features/oneshot/inspecao.css'));
  assert.match(css, /\.insp-objeto\{[^}]*transform-style:preserve-3d/,
    'sem preserve-3d as faces achatam e a borda aparece por cima');
  assert.match(css, /\.insp-face\{[^}]*backface-visibility:hidden/,
    'sem backface-visibility a frente aparece espelhada do outro lado');
  assert.match(css, /\.insp-palco\[data-tridimensional\]\{[^}]*perspective:/,
    'sem perspectiva o giro é uma faixa que encolhe, não um objeto');
});

test('o giro assenta numa face ao soltar', () => {
  const codigo = semComentarios(fonte('src/features/oneshot/InspetorDeObjeto.jsx'));
  assert.match(codigo, /Math\.round\(g \/ 180\) \* 180/,
    'solto de perfil, o objeto fica ilegível');
});

test('ampliado, arrastar percorre; no tamanho natural, gira', () => {
  const codigo = semComentarios(fonte('src/features/oneshot/InspetorDeObjeto.jsx'));
  // Os dois gestos moram no mesmo arrasto, e a ordem importa: girar enquanto
  // a pessoa tenta chegar num canto do papel é o pior dos dois mundos.
  assert.match(codigo, /if \(zoom <= ZOOM_MINIMO\) \{\s*if \(!tridimensional\) return;/);
});

test('a transição desliga durante o arrasto', () => {
  const css = semComentarios(fonte('src/features/oneshot/inspecao.css'));
  assert.match(css, /\.insp-objeto\[data-puxando\]\{transition:none\}/,
    'com transição no dedo o objeto chega atrasado em relação à mão');
  const jsx = semComentarios(fonte('src/features/oneshot/InspetorDeObjeto.jsx'));
  assert.match(jsx, /data-puxando=\{girando\.current/);
});

test('quem desligou animação no sistema não ganha giro', () => {
  const css = semComentarios(fonte('src/features/oneshot/inspecao.css'));
  assert.match(css, /html\[data-motion="reduced"\][^{]*\.insp-objeto/);
  // A regra do projeto: a preferência entra por data-motion, nunca por media
  // query — senão o jogador não tem como sobrepor.
  assert.ok(!/prefers-reduced-motion/.test(css));
});

test('o inspetor não conta que existe segredo', () => {
  const codigo = semComentarios(fonte('src/features/oneshot/InspetorDeObjeto.jsx'));
  // `escondeAlgo` é reexportado para quem decide SE abre o inspetor, mas não
  // pode virar selo na tela: "este objeto tem algo" põe a mesa a caçar em
  // vez de jogar.
  assert.ok(!/escondeAlgo\(/.test(codigo.slice(codigo.indexOf('return ('))),
    'escondeAlgo não pode ser usado dentro do render');
  // O detalhe só aparece quando o estado diz que a pessoa chegou lá.
  assert.match(codigo, /estado\.mostrandoDetalhe &&/);
  // E o texto do verso, só virado.
  assert.match(codigo, /estado\.mostrandoVerso && objeto\.versoTexto/);
});

test('onde há texto de verdade, a escrita fingida sai', () => {
  // As linhas do caderno e as colunas do jornal são um desenho de "aqui tem
  // texto". Com texto por cima elas viram risco em cima de letra, e foi
  // assim que o verso da fotografia ficou ilegível na primeira tentativa.
  for (const forma of FORMAS_CONHECIDAS) {
    if (!temEscritaFingida(forma, 'entrada', 'verso')) continue;
    const limpo = faceDoItem(forma, 'entrada', 'verso', { semEscritaFingida: true });
    const cheio = faceDoItem(forma, 'entrada', 'verso');
    assert.ok(limpo.length < cheio.length, `${forma} não tirou a escrita fingida`);
    assert.ok(limpo.length > 0, `${forma} ficou sem papel nenhum`);
    assert.ok(limpo.every(f => !f.escrita));
  }
});

test('tirar a escrita fingida não apaga o resto do desenho', () => {
  // A mancha do jornal e o papel continuam: só o que imita letra sai.
  const limpo = faceDoItem('jornal', '', 'verso', { semEscritaFingida: true });
  assert.ok(limpo.some(f => f.fill === '#17120E'), 'a mancha do jornal sumiu junto');
  assert.ok(limpo.some(f => f.t === 'r'), 'o papel sumiu junto');
});

test('todo item com verso escrito tem onde escrever', () => {
  for (const item of ITENS) {
    const limpo = faceDoItem(item.forma, item.selo, 'verso', { semEscritaFingida: true });
    assert.ok(limpo && limpo.length, `${item.id} fica sem verso nenhum ao escrever nele`);
  }
});

test('o texto do verso é escrito no papel, não numa placa por cima', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/InspetorDeObjeto.jsx'));
  // Dentro da face do verso, e não como irmão flutuante do objeto.
  const face = jsx.slice(jsx.indexOf('insp-face-verso'), jsx.indexOf('insp-borda insp-borda-e'));
  assert.match(face, /insp-escrito/, 'o escrito precisa morar dentro da face do verso');
  assert.match(face, /semEscritaFingida=\{Boolean\(objeto\.versoTexto\)\}/);
  // E a placa antiga só vale para foto, que não tem verso desenhado.
  assert.match(jsx, /!tridimensional && estado\.mostrandoVerso && objeto\.versoTexto/);
});

test('o escrito não rouba o clique do giro', () => {
  const css = semComentarios(fonte('src/features/oneshot/inspecao.css'));
  assert.match(css, /\.insp-escrito\{[^}]*pointer-events:none/,
    'texto que recebe o ponteiro trava o arrasto no meio do objeto');
});
