/**
 * O MESTRE VÊ QUEM ESTÁ ENTRANDO NO ARMÁRIO
 *
 * O que estes testes protegem não é o cálculo — é o tempo da cena. Se o
 * registro de "entrando" não nascer no instante do clique, o Mestre perde
 * exatamente os segundos em que havia alguma coisa para narrar.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOMENTOS, entrandoNoArmario, portasAbrem, saiuDoArmario,
  vistaDoMestre, frase, risco,
} from '../src/features/oneshot/vigiaDoEsconderijo.mjs';

const CACADA = { ativa: true, tensao: 0.6, inescapavel: false };

test('o registro nasce no clique, já visível, antes do resultado', () => {
  const r = entrandoNoArmario({ quem: 'f1', nome: 'Mika', cacada: CACADA, chance: 0.4, agora: 1000 });
  assert.equal(r.estado, MOMENTOS.ENTRANDO);
  assert.equal(r.em, 1000);
  // Nada de `passou` ainda: o resultado existe, mas só depois dos 3,4s.
  assert.equal('passou' in r, false);
  assert.equal(r.chance, 0.4);
  assert.equal(r.tensao, 0.6);
});

test('sem ficha não há registro — nem linha fantasma na vista do Mestre', () => {
  for (const vazio of ['', '   ', null, undefined]) {
    assert.equal(entrandoNoArmario({ quem: vazio, cacada: CACADA, chance: 1 }), null);
  }
});

test('as portas abrem para um dos dois lados', () => {
  const r = entrandoNoArmario({ quem: 'f1', cacada: CACADA, chance: .4, agora: 1000 });
  assert.equal(portasAbrem(r, { passou: true }, 4400).estado, MOMENTOS.ESCONDIDO);
  assert.equal(portasAbrem(r, { passou: false }, 4400).estado, MOMENTOS.PEGO);
  // E a chance aceita no clique não é reescrita pelo resultado.
  assert.equal(portasAbrem(r, { passou: false }, 4400).chance, 0.4);
});

test('quem está entrando aparece primeiro, porque é o que está acontecendo', () => {
  const base = t => ({ quem: 'f' + t, em: t });
  const lista = [
    { ...base(1), estado: MOMENTOS.ESCONDIDO, resolvidoEm: 2 },
    { ...base(2), estado: MOMENTOS.PEGO, resolvidoEm: 3 },
    { ...base(3), estado: MOMENTOS.ENTRANDO },
  ];
  assert.deepEqual(vistaDoMestre(lista, 9).map(r => r.estado),
    [MOMENTOS.ENTRANDO, MOMENTOS.PEGO, MOMENTOS.ESCONDIDO]);
});

test('o relógio corre para quem entra e para para quem já saiu', () => {
  const entrando = { quem: 'a', estado: MOMENTOS.ENTRANDO, em: 1000 };
  const resolvido = { quem: 'b', estado: MOMENTOS.PEGO, em: 1000, resolvidoEm: 4400 };
  const [e, r] = vistaDoMestre([entrando, resolvido], 11000);
  assert.equal(e.segundos, 10, 'quem entra tem o relógio correndo');
  assert.equal(r.segundos, 3, 'quem saiu tem o relógio parado no instante');
  // Mas o Mestre ainda sabe há quanto tempo foi, para narrar o intervalo.
  assert.equal(r.desdeQuando, 10);
});

test('sair do armário tira a linha da vista', () => {
  const r = saiuDoArmario({ quem: 'f1', estado: MOMENTOS.ESCONDIDO, em: 1 });
  assert.deepEqual(vistaDoMestre([r]), []);
});

test('registro quebrado não derruba o painel', () => {
  assert.deepEqual(vistaDoMestre([null, undefined, {}, { estado: 'sei la' }]), []);
  assert.deepEqual(vistaDoMestre(null), []);
});

test('a frase é de cena, e nomeia quem', () => {
  const r = { nome: 'Takuro', estado: MOMENTOS.ENTRANDO };
  assert.match(frase(r), /^Takuro está entrando/);
  assert.match(frase({ ...r, estado: MOMENTOS.PEGO }), /não chegou a tempo/);
  assert.match(frase({ ...r, estado: MOMENTOS.ESCONDIDO }), /conseguiu se esconder/);
  // Ficha sem nome ainda rende uma linha legível.
  assert.match(frase({ estado: MOMENTOS.ENTRANDO }), /^Alguém/);
});

test('o risco sai em palavras, não em porcentagem', () => {
  assert.equal(risco({ cacando: true, chance: .9 }), 'entrou com folga');
  assert.equal(risco({ cacando: true, chance: .6 }), 'entrou em cima da hora');
  assert.equal(risco({ cacando: true, chance: .3 }), 'esperou demais');
  assert.equal(risco({ cacando: true, chance: .1 }), 'entrou com ela em cima');
  assert.equal(risco({ cacando: false, chance: 1 }), 'sem ninguém atrás');
});

test('as regras deixam a mesa escrever e só o Mestre ler', async () => {
  const { readFileSync } = await import('node:fs');
  const regras = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

  // Fora das coleções "da mesa comum", senão qualquer membro lê tudo.
  const seletivo = regras.slice(
    regras.indexOf('function acessoSeletivo'),
    regras.indexOf('function daMesaComum'),
  );
  assert.match(seletivo, /c__\[a-z0-9-\]\+__esconderijos/);

  const bloco = regras.slice(regras.indexOf('// O que só o Mestre lê'));
  const ate = bloco.slice(0, bloco.indexOf('// Documentos liberados'));
  assert.match(ate, /allow read:[\s\S]*?esconderijos[\s\S]*?mestre\(/);
  assert.match(ate, /allow write:[\s\S]*?esconderijos[\s\S]*?membro\(/);
});
