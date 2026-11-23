/**
 * O CENÁRIO DO HORROR — A MÃO DO MESTRE NO MAPA
 *
 * A noite reusa o mapa de batalha INVERTENDO o sentido da névoa: lá o
 * Mestre pinta escuridão por cima do mapa; aqui a casa nasce escura e o que
 * ele pinta é o que a mesa já descobriu.
 *
 * Reusar em vez de duplicar é a decisão que estes testes protegem. O mesmo
 * armazenamento, o mesmo pincel, a mesma sincronização — muda só a leitura.
 * Um segundo sistema de névoa daria duas coleções, dois pincéis e dois
 * jeitos de a coordenada sair errada.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

const mapa = () => semComentarios(
  readFileSync(new URL('../src/features/mapa-batalha/BattleMapPage.jsx', import.meta.url), 'utf8'),
);

test('a noite lê a névoa ao contrário, sem segunda coleção', () => {
  const s = mapa();
  // A leitura invertida existe...
  assert.match(s, /ehNoite \?\s*\(\s*<NevoaDeExploracao/);
  // ...e as outras mesas continuam com as manchas escuras de sempre.
  assert.match(s, /rgba\(0,0,0,\.995\)/);
  // Uma coleção só para os dois sentidos.
  assert.equal((s.match(/battlemap_fog/g) || []).length >= 1, true);
  assert.ok(!/battlemap_clareiras|col\('clareiras'\)/.test(s),
    'nasceu uma segunda coleção de névoa');
});

test('a conversão do pincel para clareira acerta a escala', () => {
  /* O pincel trabalha em 0–100 e a clareira em 0–1; o raio é METADE da
     largura da mancha, que é desenhada redonda. Errar aqui dá clareira do
     dobro do tamanho e a casa abre inteira no primeiro clique. */
  const s = mapa();
  assert.match(s, /x: p\.x \/ 100, y: p\.y \/ 100, r: \(p\.size \|\| 12\) \/ 200/);
});

test('a proporção do mapa chega na névoa', () => {
  // Sem ela o buraco sai achatado: os dois raios da elipse saem de eixos
  // diferentes.
  assert.match(mapa(), /aspecto=\{baseSize\.w && baseSize\.h \? baseSize\.w \/ baseSize\.h : 2\}/);
});

test('a atmosfera só entra nos sete mapas da casa', () => {
  /* Mapa que o Mestre subiu por conta própria não tem camadas declaradas, e
     inventar luzes para ele daria névoa genérica por cima de uma arte que
     não pediu nada. */
  assert.match(mapa(), /ehNoite && mapaPorId\(String\(currentMap\.id\)\) && \(/);
});

test('o vulto passa pela mesma camada do pincel', () => {
  /* Essa camada já resolve captura de ponteiro, zoom e deslocamento. Um
     segundo caminho de clique daria coordenada diferente da do pincel no
     mesmo mapa. */
  const s = mapa();
  assert.match(s, /const startFogDraw = \(e\) => \{\s*if \(modoVulto\) \{ porVultoNoPonto\(e\); return; \}/);
  assert.match(s, /publicarVulto\(vultoNovo\(\{/);
});

test('o modo vulto se desarma depois de um vulto', () => {
  // Deixar ligado faria o Mestre soltar um vulto sem querer no próximo
  // clique do mapa.
  const s = mapa();
  const fn = s.match(/const porVultoNoPonto = \(e\) => \{[\s\S]*?\n  \};/)[0];
  assert.match(fn, /setModoVulto\(false\)/);
});

test('a camada só captura clique quando há o que fazer', () => {
  // Capturando sempre, o Mestre não conseguiria mais arrastar token nenhum.
  assert.match(mapa(),
    /pointerEvents:masterMode&&\(fogMode!=='off'\|\|modoVulto\)\?'auto':'none'/);
});

test('os rótulos do pincel invertem na noite', () => {
  // Pintar ABRE a casa aqui; manter "Névoa" faria o Mestre achar que está
  // escondendo justamente o que acabou de mostrar.
  const s = mapa();
  assert.match(s, /ehNoite \? '✦ Revelar' : '◌ Névoa'/);
  assert.match(s, /ehNoite \? '◌ Esconder' : '✧ Revelar'/);
});

test('o Mestre vira a hora da noite sem sair do mapa', () => {
  const s = mapa();
  assert.match(s, /setFaseDaNoite\(e\.target\.value\)/);
  assert.match(s, /FASES\.map\(f =>/);
});

test('nada da noite aparece nas outras mesas', () => {
  /* Toda a mão nova está atrás de `ehNoite`. Um controle solto apareceria
     na Dinastia E e no CAIN, que é como os vazamentos deste projeto sempre
     começaram. */
  const s = mapa();
  /* A checagem é por ESCOPO e não por proximidade: o bloco da barra da noite
     passa de dois mil caracteres, e medir distância daria falso alarme a
     cada linha nova. O que importa é que entre o `ehNoite` que abre e o
     trecho não tenha fechado nada. */
  for (const trecho of ['Pôr vulto', 'FASES.map', '<AtmosferaDaCasa', '<VultoNoMapa']) {
    const i = s.indexOf(trecho);
    assert.ok(i > 0, `sumiu ${trecho}`);
    const abertura = s.lastIndexOf('ehNoite', i);
    assert.ok(abertura > 0, `${trecho} não tem nenhum ehNoite antes`);
    const entre = s.slice(abertura, i);
    // Entre a guarda e o trecho não pode haver o fim do bloco dela.
    assert.ok(!/\n\s{18}\)\}/.test(entre),
      `${trecho} caiu fora do bloco guardado por ehNoite`);
  }
  // E a guarda existe de verdade, uma vez por frente da noite.
  assert.ok((s.match(/ehNoite/g) || []).length >= 6,
    'a noite deixou de estar guardada em alguma das frentes');
});
