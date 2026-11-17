// O QUE A MESA DE CAIN GANHA ALÉM DA FICHA
//
// Três abas de referência (manual, agendas e blasfêmias, tipos de inimigo),
// a mesa de dados restrita ao d6, e a marca que gira. São coisas pequenas de
// implementar e fáceis de quebrar sem ninguém notar: uma aba que sai da
// navegação, um dado de 20 lados reaparecendo numa mesa que não sabe lê-lo,
// uma seção do manual que some numa refatoração.
//
// Os testes de conteúdo aqui não conferem redação. Conferem que as regras
// que a mesa precisa consultar no meio de uma cena continuam estando lá.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join as joinPath } from 'node:path';

import { MANUAL_CAIN, buscarNoManual } from '../src/features/cain/manualCain.mjs';
import { TIPOS_DE_PECADO, COMO_UM_PECADO_E_FEITO } from '../src/features/cain/tiposDePecado.mjs';
import { BLASFEMIAS, BLASFEMIAS_DETALHADAS } from '../src/core/sistemas/cain/index.mjs';
import {
  colecaoDeFichas as colecaoDeFichasImportada,
  dadosDoSistema, navegacaoDoSistema, sistemaTemAba,
} from '../src/core/sistemas/index.mjs';

const raiz = joinPath(dirname(fileURLToPath(import.meta.url)), '..');
const ler = caminho => readFileSync(joinPath(raiz, caminho), 'utf8');

const mesaCain = { id: 'estrela', sistema: 'cain', world: 'Terra Dourada', primary: false };
const mesaDinastia = { id: 'dinastia-e', primary: true };

/* ───────────────────────────── dados ───────────────────────────── */

test('uma mesa de CAIN só oferece d6', () => {
  const { faces, notacao } = dadosDoSistema(mesaCain);
  assert.deepEqual(faces, [6]);
  assert.equal(notacao, 'd6');
});

test('a Dinastia E mantém a mesa de dados que sempre teve', () => {
  const { faces, maximo } = dadosDoSistema(mesaDinastia);
  assert.deepEqual(faces, [4, 6, 8, 10, 12, 20]);
  assert.equal(maximo, 5);
});

test('a reserva do CAIN vai até seis dados', () => {
  // 3 de perícia + 3 de vantagem é o teto do livro. Menos que isso não
  // rolaria a jogada mais importante do sistema; mais seriam caixas que
  // ninguém clica.
  assert.equal(dadosDoSistema(mesaCain).maximo, 6);
});

test('o sistema CAIN não oferece mais o bestiário da Dinastia E', () => {
  assert.equal(sistemaTemAba(mesaCain, 'inimigos'), false);
  const nav = navegacaoDoSistema(mesaCain, []);
  const ids = nav.flatMap(g => g.items.map(i => i.id));
  assert.ok(!ids.includes('inimigos'),
    'a aba de fichas de inimigo da Dinastia E voltou à navegação do CAIN');
});

test('sistema sem dados declarados não quebra a mesa de dados', () => {
  const { faces, maximo } = dadosDoSistema({ sistema: 'sistema-que-nao-existe' });
  assert.ok(Array.isArray(faces) && faces.length > 0);
  assert.ok(maximo >= 1);
});

test('a mesa de dados não tem mais lista de lados escrita à mão', () => {
  // O erro que isto pega: alguém "consertar" um estilo e trazer de volta o
  // [4,6,8,10,12,20] fixo, e a mesa de CAIN voltar a oferecer d20.
  const widget = ler('src/shell/DiceWidget.jsx');
  assert.ok(!/\[4,\s*6,\s*8,\s*10,\s*12,\s*20\]/.test(widget),
    'DiceWidget voltou a ter os lados fixos no código');
  assert.ok(widget.includes('dadosDoSistema'), 'DiceWidget deve perguntar ao sistema');
});

/* ──────────────────────────── navegação ──────────────────────────── */

test('as três abas de referência existem na mesa de CAIN', () => {
  for (const aba of ['manual', 'agendas', 'tiposdepecado']) {
    assert.equal(sistemaTemAba(mesaCain, aba), true, `falta a aba ${aba}`);
    assert.equal(sistemaTemAba(mesaDinastia, aba), false, `${aba} não é da Dinastia E`);
  }
});

test('toda aba da navegação do CAIN tem página carregável', () => {
  const app = ler('src/App.jsx');
  const grupos = navegacaoDoSistema(mesaCain, []);
  const ids = grupos.flatMap(g => g.items.map(i => i.id));
  assert.ok(ids.length > 0);
  for (const id of ids) {
    if (id === 'session') continue;
    assert.ok(new RegExp(`\\b${id}\\s*:`).test(app), `App.jsx não sabe abrir a aba ${id}`);
  }
});

test('a aba Fichas bifurca por sistema em vez de abrir a ficha da Dinastia E', () => {
  const app = ler('src/App.jsx');
  assert.ok(!/fichas:\s*\(\)\s*=>\s*import\(["'].*sheets\/SheetsPage/.test(app),
    'a aba Fichas voltou a apontar direto para a ficha da Dinastia E');
  const roteador = ler('src/features/fichas/FichasPage.jsx');
  assert.ok(roteador.includes('cain'), 'o roteador precisa conhecer o CAIN');
  assert.ok(roteador.includes('dinastia-e'), 'o roteador precisa manter a Dinastia E');
});

/* ───────────────────────────── manual ───────────────────────────── */

test('o manual cobre o corpo das regras', () => {
  const texto = JSON.stringify(MANUAL_CAIN).toLowerCase();
  const indispensaveis = [
    '4+', 'difícil', 'arriscado', 'dado de risco', 'menor',
    'agonia divina', 'piedade', 'talism', 'categoria', 'psique',
    'pulso psíquico', 'rajada', 'blasfêmia', 'agenda',
    'pecado', 'marca de pecado', 'ferimento', 'morte instantânea',
    'aflições', 'gancho', 'barganh', 'kit', 'scrip',
    'tensão', 'pressão', 'palácio', 'avanço', 'xp',
  ];
  for (const termo of indispensaveis) {
    assert.ok(texto.includes(termo.toLowerCase()), `o manual perdeu "${termo}"`);
  }
});

test('o manual guarda os números que a mesa consulta no meio da cena', () => {
  const texto = JSON.stringify(MANUAL_CAIN);
  assert.ok(texto.includes('+3'), 'o teto de vantagem');
  assert.ok(/6 cortes|6 cortes|começa com 6|começa em 6/.test(texto), 'o talismã de execução começa em 6');
  assert.ok(texto.includes('1d3'), 'o pecado no lugar do pulso');
  assert.ok(texto.includes('5 pontos de kit'), 'os pontos de kit');
  assert.ok(texto.includes('7 ou mais'), 'o teste de resistência');
});

test('toda seção do manual tem título, resumo e corpo', () => {
  assert.ok(MANUAL_CAIN.length >= 12);
  const ids = new Set();
  for (const secao of MANUAL_CAIN) {
    assert.ok(secao.id && !ids.has(secao.id), `id repetido ou vazio: ${secao.id}`);
    ids.add(secao.id);
    assert.ok(secao.titulo && secao.resumo, `seção sem título ou resumo: ${secao.id}`);
    assert.ok(Array.isArray(secao.partes) && secao.partes.length > 0, `seção vazia: ${secao.id}`);
    for (const parte of secao.partes) {
      if (parte.tipo === 'lista') assert.ok(parte.itens.length > 0);
      else if (parte.tipo === 'tabela') {
        assert.ok(parte.cabecalho.length > 0 && parte.linhas.length > 0);
        for (const linha of parte.linhas) {
          assert.equal(linha.length, parte.cabecalho.length, `tabela torta em ${secao.id}`);
        }
      } else assert.ok(String(parte.texto || '').trim().length > 0);
    }
  }
});

test('a busca do manual acha pelo corpo, não só pelo título', () => {
  // "scrip" não é título de seção nenhuma: se a busca só olhasse o título,
  // quem procurasse por isso não acharia nada.
  const achou = buscarNoManual(MANUAL_CAIN, 'scrip');
  assert.ok(achou.length > 0);
  // E acha sem acento, porque ninguém digita acento procurando depressa.
  assert.ok(buscarNoManual(MANUAL_CAIN, 'talisma').length > 0);
  assert.equal(buscarNoManual(MANUAL_CAIN, '').length, MANUAL_CAIN.length);
  assert.equal(buscarNoManual(MANUAL_CAIN, 'xilofone').length, 0);
});

/* ──────────────────── blasfêmias e tipos de Pecado ──────────────────── */

test('as doze blasfêmias do livro, sem repetição', () => {
  assert.equal(BLASFEMIAS_DETALHADAS.length, 12);
  assert.equal(new Set(BLASFEMIAS).size, 12);
  assert.ok(BLASFEMIAS_DETALHADAS.every(b => b.nome && b.resumo));
  // A primeira versão trazia nomes que não existem no livro. Estes quatro
  // eram os inventados — se algum voltar, voltou o erro.
  for (const invento of ['Tempo', 'Espaço', 'Cópia', 'Possessão']) {
    assert.ok(!BLASFEMIAS.includes(invento), `${invento} não é uma blasfêmia do livro`);
  }
  for (const real of ['Tensão', 'Ardor', 'Fluxo', 'Vetor', 'Portão', 'Sufoco',
                      'Sussurro', 'Edit', 'Vínculo', 'Palácio', 'Assombração', 'Simpatia']) {
    assert.ok(BLASFEMIAS.includes(real), `falta a blasfêmia ${real}`);
  }
});

test('os seis tipos de Pecado, do Ogro ao Lorde', () => {
  assert.deepEqual(
    TIPOS_DE_PECADO.map(p => p.nome),
    ['Ogro', 'Ídolo', 'Cão', 'Centopeia', 'Sapo', 'Lorde'],
  );
  assert.deepEqual(TIPOS_DE_PECADO.map(p => p.numeral), ['I', 'II', 'III', 'IV', 'V', 'VI']);
  for (const p of TIPOS_DE_PECADO) {
    assert.ok(p.nasce && p.comoAge && p.aMesaSente, `${p.nome} está incompleto`);
    assert.ok(/^#[0-9A-Fa-f]{6}$/.test(p.cor), `${p.nome} sem cor válida`);
  }
});

test('a anatomia do Pecado traz as peças que o Admin precisa escolher', () => {
  const texto = JSON.stringify(COMO_UM_PECADO_E_FEITO).toLowerCase();
  for (const peca of ['tipo', 'forma', 'categoria', 'domínio', 'palácio',
                      'talismã de execução', 'trauma', 'vestígio', 'pressão']) {
    assert.ok(texto.includes(peca), `a anatomia perdeu "${peca}"`);
  }
});

/* ───────────────────────────── a marca ───────────────────────────── */

test('a marca da mesa é escolhida pelo sistema', () => {
  const marca = ler('src/experience/MarcaDaMesa.jsx');
  assert.ok(marca.includes('CrossMark3D') && marca.includes('BookMark3D'));
  assert.ok(marca.includes('sistemaDe'), 'quem escolhe é o sistema, não um if na tela');
  const kit = ler('src/experience/ExperienceKit.jsx');
  assert.ok(kit.includes('MarcaDaMesa'), 'a navegação precisa usar a marca da mesa');
});

test('a cruz gira e flutua como o tomo, e cede onde o movimento cede', () => {
  const css = ler('src/experience/cruz-3d.css');
  assert.ok(css.includes('@keyframes cruzGira'), 'a cruz precisa girar');
  assert.ok(css.includes('@keyframes cruzFlutua'), 'a cruz precisa flutuar');
  assert.ok(css.includes('preserve-3d') && css.includes('perspective:'), 'é 3D de verdade');
  // A mesma trava de movimento do resto do site: nada de prefers-reduced-motion
  // solto, que foi o que apagou as animações no computador uma vez.
  assert.ok(css.includes('html[data-motion="reduced"]'));
  assert.ok(!css.includes('prefers-reduced-motion'),
    'use html[data-motion="reduced"], não a media query');
});

/* ──────────────── a porta de entrada da mesa de CAIN ──────────────── */

test('a porta lista as fichas da coleção que o sistema usa', () => {
  const colecaoDeFichas = colecaoDeFichasImportada;
  assert.equal(colecaoDeFichas(mesaCain), 'fichas');
  assert.equal(colecaoDeFichas(mesaDinastia), 'sheets');
  assert.equal(colecaoDeFichas({}), 'sheets', 'sistema desconhecido cai no padrão');

  const porta = ler('src/experience/PlayerAccess.jsx');
  // O erro que isto pega: a porta voltar a ler 'sheets' fixo e mostrar uma
  // lista vazia numa mesa de CAIN cujas fichas existem, só que noutro lugar.
  assert.ok(!porta.includes("col('sheets')"),
    'a porta voltou a ler a coleção da Dinastia E em qualquer mesa');
  assert.ok(porta.includes('colecaoDeFichas'));
});

test('entrar como Mestre pela porta também promove no servidor', () => {
  const porta = ler('src/experience/PlayerAccess.jsx');
  assert.match(porta, /entrarNaMesa\(\{[^}]*papel: 'mestre'/,
    'a senha de Mestre na porta voltou a ser só um interruptor de tela');
});

test('o Admin consegue definir a senha de cada ficha', () => {
  const registro = ler('src/features/cain/FichasCainPage.jsx');
  assert.match(registro, /Senha desta ficha/);
  assert.match(registro, /definirSenha/);
  // E a ficha aberta pela senha vale como da pessoa, mesmo sem conta amarrada.
  assert.match(registro, /fichaLiberada=\{playerSheetId\}/);
});

/* ──────────────── os controles do token no mapa ──────────────── */

test('o punho de rotação responde ao clique, não só ao arrasto', () => {
  const mapa = ler('src/features/mapa-batalha/BattleMapPage.jsx');
  // O sintoma: apertar o botão e não acontecer nada. A rotação só existia
  // por arrasto, e o próprio código dizia que o clique não mexia no ângulo.
  assert.match(mapa, /const girarToken = \(token, passo\)/,
    'o giro por passo sumiu: o botão volta a parecer quebrado');
  assert.match(mapa, /girarToken\(token,-45\)/);
  assert.match(mapa, /girarToken\(token,45\)/);
  // Oito passos de 45° fecham a volta.
  assert.equal(360 % 45, 0);
});

test('os controles do token são uma barra só, não círculos soltos', () => {
  const mapa = ler('src/features/mapa-batalha/BattleMapPage.jsx');
  const css = ler('src/features/mapa-batalha/tokens-vivos.css');
  assert.match(mapa, /className="battlemap-token-controles"/);
  assert.match(css, /\.battlemap-token-controles\{/);
  // O deslocamento fixo em pixels que separava os dois círculos some.
  assert.ok(!/translate\(calc\(-50% \+ \$\{Math\.max\(26/.test(mapa),
    'o botão de espelhar voltou a flutuar por conta própria');
  // E o punho ganha agulha: sem ela, girar um token de foto não dava
  // retorno nenhum na tela.
  assert.match(css, /\.battlemap-facing-dial i::before/);
});
