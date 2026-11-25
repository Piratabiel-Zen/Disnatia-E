/**
 * OS ESCONDERIJOS MARCADOS
 *
 * O pulso de dois segundos é um pedido literal de Gabriel e está preso
 * aqui: é o que separa um recado de um painel de avisos piscando.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DURACAO_DO_PULSO, marcaNova, aindaPulsando, marcasDoMapa, marcasVencidas,
} from '../src/features/oneshot/esconderijosMarcados.mjs';

test('o pulso dura dois segundos, nem mais', () => {
  assert.equal(DURACAO_DO_PULSO, 2000);
  const m = marcaNova({ x: 10, y: 20, mapa: 'sotao', agora: 1000 });
  assert.equal(aindaPulsando(m, 1000), true, 'no instante em que é posta');
  assert.equal(aindaPulsando(m, 2999), true, 'um milissegundo antes do fim');
  assert.equal(aindaPulsando(m, 3000), false, 'no limite, já parou');
  assert.equal(aindaPulsando(m, 9999), false);
});

test('relógio atrasado não faz a marca pulsar para sempre', () => {
  // O horário vem de outra máquina: se o relógio de quem vê estiver atrás,
  // `agora - em` fica negativo e um `< 2000` sozinho diria "pulsando".
  const m = marcaNova({ x: 1, y: 1, mapa: 'porao', agora: 10000 });
  assert.equal(aindaPulsando(m, 5000), false);
});

test('a marca guarda o lugar em porcentagem, dentro do mapa', () => {
  const m = marcaNova({ x: -40, y: 180, mapa: 'patio' });
  assert.equal(m.x, 0);
  assert.equal(m.y, 100);
});

test('marca sem mapa não existe — ela apareceria em todos', () => {
  for (const vazio of ['', '  ', null, undefined]) {
    assert.equal(marcaNova({ x: 1, y: 1, mapa: vazio }), null);
  }
});

test('cada mapa mostra só as suas', () => {
  const marcas = [
    { x: 10, y: 10, mapa: 'sotao', em: 1000 },
    { x: 50, y: 50, mapa: 'porao', em: 1000 },
    { x: 80, y: 80, mapa: 'sotao', em: 1000 },
  ];
  assert.equal(marcasDoMapa(marcas, 'sotao', 1500).length, 2);
  assert.equal(marcasDoMapa(marcas, 'porao', 1500).length, 1);
  assert.deepEqual(marcasDoMapa(marcas, '', 1500), []);
});

test('A ESTRELA SOME DEPOIS DOS DOIS SEGUNDOS', () => {
  /* O pedido veio do teste de mesa: as estrelas ficavam no mapa e cada
     cena acumulava mais, até virar um céu estrelado onde nenhuma queria
     dizer nada. Ela é um gesto, não um marcador — vale enquanto o Mestre
     está falando daquele canto e morre junto com a frase. */
  const marcas = [{ id: 'a', x: 10, y: 10, mapa: 'sotao', em: 1000 }];
  assert.equal(marcasDoMapa(marcas, 'sotao', 1500).length, 1, 'durante o pulso, aparece');
  assert.equal(marcasDoMapa(marcas, 'sotao', 2999).length, 1, 'um instante antes do fim');
  assert.equal(marcasDoMapa(marcas, 'sotao', 3000).length, 0, 'no limite, sumiu');
  assert.equal(marcasDoMapa(marcas, 'sotao', 90000).length, 0, 'e não volta');
});

test('o que venceu sai do banco, não só da tela', () => {
  // Esconder na tela e guardar no banco juntaria lixo que ninguém vê e
  // que todo mundo baixa ao abrir o mapa.
  const marcas = [
    { id: 'viva', x: 1, y: 1, mapa: 'sotao', em: 2500 },
    { id: 'velha', x: 2, y: 2, mapa: 'sotao', em: 100 },
    { x: 3, y: 3, mapa: 'sotao', em: 100 },  // sem id: não dá para apagar
  ];
  assert.deepEqual(marcasVencidas(marcas, 3000).map(m => m.id), ['velha']);
});

test('dois toques no mesmo lugar não viram duas estrelas', () => {
  const marcas = [
    { x: 30, y: 30, mapa: 'sotao', em: 1000 },
    { x: 30.4, y: 30.6, mapa: 'sotao', em: 1000 },  // dedo trêmulo
    { x: 36, y: 30, mapa: 'sotao', em: 1000 },      // outro lugar de verdade
  ];
  assert.equal(marcasDoMapa(marcas, 'sotao', 1500).length, 2);
});

test('marca quebrada não derruba o mapa', () => {
  const marcas = [null, { mapa: 'sotao' }, { x: 'abc', y: 1, mapa: 'sotao', em: 1000 }, undefined];
  assert.deepEqual(marcasDoMapa(marcas, 'sotao', 1500), []);
  assert.deepEqual(marcasDoMapa(null, 'sotao'), []);
});


test('a mesa VÊ as estrelas — não é material só do Mestre', async () => {
  const { readFileSync } = await import('node:fs');
  const mapa = readFileSync(
    new URL('../src/features/mapa-batalha/BattleMapPage.jsx', import.meta.url), 'utf8');

  /* Ao contrário do painel de quem está no armário, que é de condução, a
     estrela é um recado PARA a mesa. Um recado que só quem escreveu
     enxerga não é recado — então a assinatura não pode ser gateada por
     masterMode, só por ser noite. */
  const efeito = mapa.slice(mapa.indexOf("onSnapshot(col('marcas_esconderijo')") - 400,
    mapa.indexOf("onSnapshot(col('marcas_esconderijo')") + 320);
  assert.ok(!/!masterMode/.test(efeito), 'a mesa parou de ver as estrelas');
  assert.match(efeito, /\[ehNoite\]/);

  // Mas quem PÕE é só o Mestre.
  assert.match(mapa, /if \(!marcando \|\| !masterMode\) return false/);
  // E não há mais apagar: a estrela morre sozinha.
  assert.ok(!/marcaEm/.test(mapa), 'voltou o apagar por toque, que não tem mais o que apagar');
});

