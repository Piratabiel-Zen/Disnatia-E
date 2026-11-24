/**
 * O ESCONDERIJO
 *
 * A regra do Ao Oni é de uma linha: entrar no armário encerra a
 * perseguição — mas se a coisa estiver no mesmo cômodo e te vir entrando,
 * ela te mata assim mesmo.
 *
 * Aqui o "mesmo cômodo" é o relógio da caçada, porque o vulto desta mesa é
 * momentâneo e na maior parte do tempo não está em lugar nenhum. Esconder
 * cedo é seguro; esconder nos últimos segundos é quase suicídio. É por isso
 * que o relógio de Nira Oni fica à vista: sem ele esconder é sorte, com ele
 * é decisão — e quem esperou demais sabe exatamente por que foi pego.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import {
  RISCO_MINIMO, ESPERANCA_MINIMA, SEGUNDOS_DE_ESPERA,
  chanceDePassar, resolverEsconderijo, registroDoEsconderijo,
} from '../src/features/oneshot/esconderijo.mjs';
import { cacadaParaComecar, estadoDaCacada } from '../src/features/oneshot/cacada.mjs';

const fonte = c => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8');
const T0 = 1_000_000;
const emSegundo = (s, extra = {}) => estadoDaCacada(
  cacadaParaComecar({ mapa: 'terreo', segundos: 20, agora: T0, ...extra }),
  { agora: T0 + s * 1000, mapaAtual: 'terreo' },
);

test('sem ninguém caçando, esconder não tem risco', () => {
  // Não tem de quem.
  for (const nada of [null, undefined, { ativa: false }]) {
    assert.equal(chanceDePassar(nada), 1);
  }
});

test('esconder cedo é seguro, esconder tarde é quase suicídio', () => {
  const cedo = chanceDePassar(emSegundo(1));
  const meio = chanceDePassar(emSegundo(10));
  const tarde = chanceDePassar(emSegundo(19));
  assert.ok(cedo > meio && meio > tarde, `${cedo} / ${meio} / ${tarde}`);
  assert.ok(cedo > 0.85, `no começo a chance era só ${cedo}`);
  assert.ok(tarde < 0.2, `a um segundo do fim a chance ainda era ${tarde}`);
});

test('nenhuma das duas pontas é certeza', () => {
  // Certeza tira a decisão, e sem decisão isto vira um botão que a pessoa
  // aperta sempre.
  for (let s = 0; s < 20; s += 0.5) {
    const c = chanceDePassar(emSegundo(s));
    assert.ok(c <= 1 - RISCO_MINIMO, `virou garantia aos ${s}s: ${c}`);
    assert.ok(c >= ESPERANCA_MINIMA, `virou sentença aos ${s}s: ${c}`);
  }
});

test('no Cerco, esconder é a saída', () => {
  /* É a caçada de que não se foge — a de Nira Oni, em que correr não
     resolve e só barricar resolve. Se esconder também falhasse, a mesa
     ficaria sem nenhuma saída, e cena sem saída não é terror: é espera. */
  const cerco = emSegundo(60, { modo: 'cerco' });
  assert.ok(cerco.inescapavel);
  const chance = chanceDePassar(cerco);
  assert.ok(chance > 0.7, `no Cerco a chance de barricar era só ${chance}`);
  // Mas não é garantido, senão o Cerco viraria a caçada mais fácil.
  assert.ok(chance < 1);
  // E não despenca com o tempo, porque o relógio dele conta para cima.
  assert.equal(chanceDePassar(emSegundo(600, { modo: 'cerco' })), chance);
});

test('o sorteio decide, e dá para fixá-lo', () => {
  const tarde = emSegundo(19);
  assert.equal(resolverEsconderijo(tarde, () => 0).passou, true);
  assert.equal(resolverEsconderijo(tarde, () => 0.999).passou, false);
  const cedo = emSegundo(1);
  assert.equal(resolverEsconderijo(cedo, () => 0.5).passou, true);
});

test('sorteio podre não vira passe livre', () => {
  // Um sorteio quebrado tem de errar para o lado seguro: ser pego é
  // reversível na ficção, sumir com o risco não é.
  for (const ruim of [() => NaN, () => undefined, () => 'x']) {
    assert.equal(resolverEsconderijo(emSegundo(10), ruim).passou, false);
  }
});

test('o que a pessoa lê é cena, não diagnóstico', () => {
  // "Falhou no teste" não assusta ninguém.
  const pego = resolverEsconderijo(emSegundo(19), () => 0.999);
  const passou = resolverEsconderijo(emSegundo(1), () => 0);
  for (const r of [pego, passou]) {
    assert.ok(r.motivo.length > 20);
    assert.ok(!/test|chance|rolagem|falh/i.test(r.motivo), `vazou mecânica: ${r.motivo}`);
  }
  assert.notEqual(pego.motivo, passou.motivo);
});

test('o registro diz quem e o quê, e nada mais', () => {
  const r = registroDoEsconderijo({
    quem: 'f1', resultado: { passou: true }, agora: 77,
  });
  assert.deepEqual(r, { quem: 'f1', passou: true, em: 77 });
  assert.equal(registroDoEsconderijo({ quem: '', resultado: { passou: true } }), null);
  assert.equal(registroDoEsconderijo({ quem: 'f1', resultado: null }), null);
});

/* ─── A espera ─── */

test('a espera é longa o bastante para doer', () => {
  // Dar o resultado na hora transformaria a decisão mais tensa da noite
  // num aviso de sistema.
  assert.ok(SEGUNDOS_DE_ESPERA >= 3, `${SEGUNDOS_DE_ESPERA}s é rápido demais`);
  assert.ok(SEGUNDOS_DE_ESPERA <= 6, `${SEGUNDOS_DE_ESPERA}s cansa`);
});

test('o resultado é sorteado na entrada, não na saída', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/Esconderijo.jsx'));
  // Assim a sombra que passa já sabe se vai parar, e a encenação pode ser
  // honesta com ela mesma: a sombra que vai pegar você hesita antes.
  assert.match(jsx, /useState\(\(\) => resolverEsconderijo\(cacada\)\)/);
  assert.match(jsx, /data-para=\{resultado\.passou \? undefined : ''\}/);
});

test('a mesa só fica sabendo quando as portas abrem', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/Esconderijo.jsx'));
  // Avisar no início entregaria o fim antes da sombra passar.
  assert.match(jsx, /if \(fase !== 'passou' && fase !== 'pego'\) return;/);
  assert.match(jsx, /contou\.current = true;/);
});

test('esta é a única tela que bloqueia, e de propósito', () => {
  const css = semComentarios(fonte('src/features/oneshot/esconderijo.css'));
  // Quem se escondeu não está mais vendo a casa: a fresta é tudo o que sobra.
  assert.match(css, /\.esc\{[^}]*position:fixed;inset:0/);
  assert.ok(!/\.esc\{[^}]*pointer-events:none/.test(css));
  assert.match(css, /\.esc-fresta\{[^}]*width:8px/);
  // E a caçada, que é a outra tela, continua não bloqueando.
  const cac = semComentarios(fonte('src/features/oneshot/cacada.css'));
  assert.match(cac, /\.cac\{[^}]*pointer-events:none/);
});

test('a espera continua mesmo sem movimento', () => {
  const css = semComentarios(fonte('src/features/oneshot/esconderijo.css'));
  // A espera É a mecânica; encurtá-la seria entregar o resultado.
  assert.match(css, /html\[data-motion="reduced"\][\s\S]{0,300}animation:none/);
  assert.match(css, /html\[data-motion="reduced"\] \.esc\[data-fase="pego"\] \.esc-porta-e/);
  assert.ok(!/prefers-reduced-motion/.test(css));
});

test('só quem tem ficha pode se esconder', () => {
  const mapa = semComentarios(fonte('src/features/mapa-batalha/BattleMapPage.jsx'));
  assert.match(mapa, /ehNoite && !masterMode && playerSheetId && !escondido/);
  // E o estado da caçada entra congelado no momento da entrada: se o
  // relógio continuasse correndo por baixo, a chance mudaria no meio da
  // espera e a sombra já estaria encenando outra coisa.
  assert.match(mapa, /setEscondido\(estadoDaCacada\(cacadaDaMesa, \{/);
});

test('ser pego mostra a coisa, e não um quadro preto', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/Esconderijo.jsx'));
  const css = semComentarios(fonte('src/features/oneshot/esconderijo.css'));
  /* As portas abriam e revelavam PRETO. Abrir para o nada é o oposto de um
     susto: é um anticlímax com som de porta. */
  assert.match(jsx, /\{fase === 'pego' && \(\s*<div className="esc-coisa"/);
  // Com a imagem que o Mestre escolheu, se escolheu alguma.
  assert.match(jsx, /imagem\s*\?\s*<img src=\{imagem\}/);
  assert.match(css, /@keyframes escChega/);
  // E um clarão de um quadro só: mais que isso vira filtro de festa.
  assert.match(css, /@keyframes escClarao\{0%\{opacity:0\}12%\{opacity:1\}100%\{opacity:0\}\}/);
});

test('a legenda do fim não tapa o rosto da coisa', () => {
  const css = semComentarios(fonte('src/features/oneshot/esconderijo.css'));
  // Tapar o susto com uma legenda é desperdiçar o único quadro que a cena
  // inteira estava construindo.
  assert.match(css, /\.esc\[data-fase="pego"\] \.esc-texto\{[^}]*align-self:end/);
});

test('a imagem do vulto chega ao armário como foi anexada', () => {
  const mapa = semComentarios(fonte('src/features/mapa-batalha/BattleMapPage.jsx'));
  assert.match(mapa, /imagem=\{imagemDoVulto !== VULTO_DESENHADO \? imagemDoVulto : ''\}/);
  const css = semComentarios(fonte('src/features/oneshot/esconderijo.css'));
  const bloco = css.slice(css.indexOf('.esc-coisa svg,.esc-coisa img{'));
  assert.ok(!/grayscale|sepia|saturate|contrast\(/.test(bloco.slice(0, 220)),
    'nada pode repintar a imagem que o Mestre escolheu');
});
