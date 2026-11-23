/**
 * OS TALENTOS DA NOITE
 *
 * O talento é a única coisa que diferencia duas fichas de gente comum, então
 * o que estes testes guardam é menos a mecânica e mais as duas promessas que
 * a mesa cobra: que são dez de verdade, e que cada um diz QUANDO vale — é o
 * "quando" que evita a discussão no susto, quando o jogador tenta usar o
 * talento depois de ver o dado.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import {
  TALENTOS, TALENTOS_POR_PERSONAGEM, talentoPorId, nomeDoTalento, talentosTomados,
} from '../src/features/oneshot/talentosOneShot.mjs';
import { SISTEMAS, navegacaoDoSistema, sistemaTemAba } from '../src/core/sistemas/index.mjs';
import { SECOES_DAS_REGRAS } from '../src/features/oneshot/regrasOneShot.mjs';

const fonte = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');
const mesa = { id: 'noite', sistema: 'oneshot', name: 'A casa da rua 7' };

test('são dez talentos, com id único', () => {
  // Dez para uma mesa de seis escolher sem repetir e ainda sobrar.
  assert.equal(TALENTOS.length, 10);
  const ids = TALENTOS.map(t => t.id);
  assert.equal(new Set(ids).size, 10, 'há id repetido');
});

test('todo talento diz o que faz e quando vale', () => {
  for (const t of TALENTOS) {
    assert.ok(t.nome?.trim(), `talento ${t.id} sem nome`);
    assert.ok(t.resumo?.trim(), `${t.nome} sem resumo`);
    assert.ok(t.efeito?.trim().length > 40, `${t.nome} sem efeito descrito`);
    // O "quando" é o que evita a discussão no meio da cena.
    assert.ok(t.quando?.trim(), `${t.nome} não diz quando vale`);
    assert.ok(t.limite?.trim(), `${t.nome} não diz quantas vezes vale`);
  }
});

test('quase todo talento é uma vez por noite', () => {
  // Talento que vale sempre vira conta e some na planilha; talento que vale
  // uma vez vira decisão, e a mesa lembra dela.
  const umaVez = TALENTOS.filter(t => /uma vez/i.test(t.limite));
  assert.ok(umaVez.length >= 8, `só ${umaVez.length} talentos são de uma vez por noite`);
});

test('cada pessoa fica com um', () => {
  assert.equal(TALENTOS_POR_PERSONAGEM, 1);
});

test('o talento é achado pelo id e o nome cai no texto livre', () => {
  assert.equal(talentoPorId('protetor').nome, 'O Protetor');
  assert.equal(talentoPorId('nada-disso'), null);
  // Do catálogo: mostra o nome do catálogo.
  assert.equal(nomeDoTalento({ talento: 'ancora' }), 'Âncora');
  // Inventado pelo Mestre: mostra o que foi escrito.
  assert.equal(nomeDoTalento({ talento: 'Cresci nesta rua' }), 'Cresci nesta rua');
  assert.equal(nomeDoTalento({ talento: '' }), '');
});

test('a ficha sabe quais talentos já estão com outra pessoa', () => {
  const fichas = [
    { id: 'f1', nome: 'Vera', talento: 'protetor' },
    { id: 'f2', nome: 'Dominic', talento: 'ancora' },
    { id: 'f3', nome: 'Rui', talento: 'protetor' },
    { id: 'f4', nome: 'Sem talento', talento: '' },
    { id: 'f5', nome: 'Inventado', talento: 'Cresci nesta rua' },
  ];
  const tomados = talentosTomados(fichas, 'f1');
  // A própria ficha não conta contra si mesma.
  assert.deepEqual(tomados.get('protetor'), ['Rui']);
  assert.deepEqual(tomados.get('ancora'), ['Dominic']);
  // Texto livre não entra na lista: não é talento do catálogo.
  assert.equal(tomados.has('Cresci nesta rua'), false);
  // Sem lista nenhuma, nada quebra — a ficha abre em vários lugares.
  assert.equal(talentosTomados(undefined, 'f1').size, 0);
  assert.equal(talentosTomados([null, undefined], 'f1').size, 0);
});

/* ─── A aba ───────────────────────────────────────────────────────────── */

test('os Talentos são uma aba da mesa, ao lado das Regras', () => {
  assert.ok(sistemaTemAba(mesa, 'talentos'), 'a aba de talentos não foi declarada');
  const itens = navegacaoDoSistema(mesa).flatMap(g => g.items);
  const aba = itens.find(i => i.id === 'talentos');
  assert.ok(aba, 'os talentos não aparecem na navegação');
  assert.equal(aba.label, 'Talentos');
  // Mesmo grupo que Regras: para quem está na mesa, são a mesma coisa —
  // texto que se consulta, não tela que se opera.
  const grupoDasRegras = navegacaoDoSistema(mesa)
    .find(g => g.items.some(i => i.id === 'regras'));
  assert.ok(grupoDasRegras.items.some(i => i.id === 'talentos'),
    'os talentos caíram num grupo diferente do das regras');
});

test('a aba de talentos está ligada a uma página de verdade', () => {
  // Aba declarada sem rota abre tela branca, e só se descobre na mesa.
  const app = semComentarios(fonte('src/App.jsx'));
  assert.match(app, /talentos:\s*\(\)\s*=>\s*import\("\.\/features\/oneshot\/TalentosOneShotPage"\)/);
  assert.match(app, /talentos:\s*'Talentos Especiais'/);
});

test('a página de talentos não inventa talento que o sistema não tem', () => {
  // A página lê do módulo; se um dia alguém escrever a lista na mão lá, a
  // mesa passa a ter duas versões do mesmo talento.
  const pagina = semComentarios(fonte('src/features/oneshot/TalentosOneShotPage.jsx'));
  assert.match(pagina, /TALENTOS\.map|lista\.map/);
  assert.match(pagina, /from '\.\/talentosOneShot\.mjs'/);
});

test('as regras mandam escolher da lista e avisam do antes de rolar', () => {
  const texto = SECOES_DAS_REGRAS.flatMap(s => s.corpo).join(' ');
  assert.match(texto, new RegExp(`${TALENTOS.length} da aba de Talentos`));
  assert.match(texto, /ANTES de o dado sair da mão/);
  assert.match(texto, /não deveriam repetir/);
});
