/**
 * O NOME DA MESA EM DUAS TINTAS
 *
 * Na referência o nome sai em duas cores, com a última palavra em sangue.
 * CSS não corta por palavra — `::first-line` corta por LINHA, e o nome do
 * topo é uma linha só —, então o corte é feito na marcação.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { nomeEmDuasTintas } from '../src/adventure/nomeEmDuasTintas.mjs';

/** Achata o que o React devolve em texto e em "o que foi marcado". */
function ler(no) {
  if (no == null || no === false) return { texto: '', marcado: null };
  if (typeof no === 'string') return { texto: no, marcado: null };
  if (Array.isArray(no)) {
    return no.map(ler).reduce((a, b) => ({
      texto: a.texto + b.texto, marcado: b.marcado ?? a.marcado,
    }), { texto: '', marcado: null });
  }
  const filho = ler(no.props?.children);
  if (no.props?.className === 'marca-tinta') return { texto: filho.texto, marcado: filho.texto };
  return filho;
}

test('a última palavra sai marcada e o resto fica como está', () => {
  const r = ler(nomeEmDuasTintas('Relatos do Macabro'));
  assert.equal(r.texto, 'Relatos do Macabro');
  assert.equal(r.marcado, 'Macabro');
});

test('nome de uma palavra só se marca inteiro', () => {
  // Marcar nada deixaria o nome sem destaque nenhum, que é pior do que
  // destacar demais: a barra toda ficaria de uma cor só.
  const r = ler(nomeEmDuasTintas('Dinastia'));
  assert.equal(r.texto, 'Dinastia');
  assert.equal(r.marcado, 'Dinastia');
});

test('espaço a mais não vira palavra vazia', () => {
  const r = ler(nomeEmDuasTintas('  Estrela   de   Absinto  '));
  assert.equal(r.texto, 'Estrela de Absinto');
  assert.equal(r.marcado, 'Absinto');
});

test('mesa sem nome não quebra a barra', () => {
  for (const vazio of ['', '   ', null, undefined]) {
    assert.equal(nomeEmDuasTintas(vazio), null, JSON.stringify(vazio));
  }
});

test('acento e caixa chegam intactos', () => {
  const r = ler(nomeEmDuasTintas('O Arquivo de VENEZA'));
  assert.equal(r.marcado, 'VENEZA');
  assert.equal(r.texto, 'O Arquivo de VENEZA');
});
