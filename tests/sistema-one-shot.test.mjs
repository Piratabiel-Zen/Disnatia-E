/**
 * ONE SHOT TERROR — O SISTEMA MONTADO
 *
 * Mesa de uma noite. O que estes testes guardam é o que faz dela um sistema
 * e não um tema: abas próprias, ficha em coleção própria, só d20, paleta
 * própria — e, principalmente, que nenhuma aba da Dinastia E ou do CAIN se
 * infiltre nela. Já aconteceu duas vezes: a aba Livro apareceu numa mesa de
 * CAIN mostrando o Livro da Mandíbula, e a barra do celular oferecia Classes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/* Tira comentário antes de procurar: o texto que EXPLICA uma armadilha cita a
   armadilha, e o teste não pode confundir o aviso com o erro. */
const semComentarios = fonte => fonte
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');
import { SISTEMAS, dadosDoSistema, navegacaoDoSistema, sistemaDe, termo } from '../src/core/sistemas/index.mjs';
import { temaDaMesa } from '../src/core/atmosferaDaMesa.mjs';
import { CAMPAIGN_THEMES } from '../src/core/temas.mjs';

const mesa = { id: 'noite', sistema: 'oneshot', name: 'A casa da rua 7' };

test('o sistema está registrado e é achado pela mesa', () => {
  assert.ok(SISTEMAS.oneshot, 'One Shot Terror não está no registro');
  assert.equal(sistemaDe(mesa).id, 'oneshot');
  assert.equal(sistemaDe(mesa).nome, 'One Shot Terror');
});

test('só d20 — e no máximo dois', () => {
  // Oferecer d6 aqui convida a rolar uma coisa que o sistema não interpreta,
  // e depois a mesa discute o que aquele 4 queria dizer.
  const dados = dadosDoSistema(mesa);
  assert.deepEqual(dados.faces, [20]);
  assert.equal(dados.maximo, 2);
});

test('as abas são só as três, mais as estruturais', () => {
  assert.deepEqual([...SISTEMAS.oneshot.abas], ['investigacao', 'regras', 'aparicoes']);
  const abas = navegacaoDoSistema(mesa, []).flatMap(g => g.items.map(i => i.id));
  for (const alheia of ['livro', 'classes', 'bestiario', 'pecados', 'documentos', 'manual', 'agendas']) {
    assert.ok(!abas.includes(alheia), `"${alheia}" é de outro sistema e entrou na navegação da noite`);
  }
  assert.ok(abas.includes('fichas') && abas.includes('aparicoes') && abas.includes('regras'));
});

test('mapa de combate fica de fora: uma noite não tem tabuleiro', () => {
  const abas = navegacaoDoSistema(mesa, []).flatMap(g => g.items.map(i => i.id));
  assert.ok(!abas.includes('mapabatalha'));
  assert.ok(!abas.includes('mapamundi'));
});

test('a ficha mora em coleção própria', () => {
  // Misturar com as outras daria fichas meio preenchidas dos dois lados: a
  // desta mesa não se parece com a da Dinastia E nem com a do CAIN.
  assert.equal(SISTEMAS.oneshot.colecaoDeFichas, 'fichas_oneshot');
  assert.notEqual(SISTEMAS.oneshot.colecaoDeFichas, SISTEMAS.cain.colecaoDeFichas);
});

test('a paleta vem do sistema, não do formulário', () => {
  // Qualquer mesa de uma noite é preto e cinza, mesmo que quem criou tenha
  // deixado o seletor no padrão.
  assert.equal(temaDaMesa(mesa), 'mortalha');
  assert.equal(temaDaMesa({ ...mesa, theme: 'cosmico' }), 'mortalha');
  // Mesa com nome próprio ainda manda: a Estrela de Absinto tem a dela.
  assert.equal(temaDaMesa({ sistema: 'cain', name: 'Estrela de Absinto' }), 'veneziano');
});

test('a mortalha é preto e cinza, sem cor que quebre', () => {
  const tema = CAMPAIGN_THEMES.mortalha;
  assert.ok(tema, 'o tema mortalha sumiu');
  // O acento é osso. Vermelho fica reservado ao dano e à visão — gastá-lo em
  // botão apagaria o único sinal de que algo está muito errado.
  assert.equal(tema.accent, '#C9C2B4');
  for (const chave of ['bg', 'superficie', 'linha']) {
    const cor = tema[chave];
    const r = parseInt(cor.slice(1, 3), 16);
    const g = parseInt(cor.slice(3, 5), 16);
    const b = parseInt(cor.slice(5, 7), 16);
    assert.ok(Math.max(r, g, b) - Math.min(r, g, b) <= 6, `${chave} (${cor}) tem matiz: devia ser cinza`);
  }
});

test('o vocabulário é seco: não há instituição nesta mesa', () => {
  assert.equal(termo(mesa, 'mestre', 'Mestre'), 'Mestre');
  assert.equal(termo(mesa, 'personagem', 'personagem'), 'personagem');
  assert.equal(termo(mesa, 'inimigos', 'inimigos'), 'aparições');
});

test('a aba Regras bifurca por sistema', () => {
  // Sem isto, uma mesa de terror abriria as regras da Dinastia E — o mesmo
  // erro da aba Livro no CAIN.
  const bifurcacao = readFileSync(new URL('../src/features/regras/RegrasPage.jsx', import.meta.url), 'utf8');
  assert.match(bifurcacao, /oneshot: lazy/);
  assert.match(bifurcacao, /'dinastia-e': lazy/);
  const fichas = readFileSync(new URL('../src/features/fichas/FichasPage.jsx', import.meta.url), 'utf8');
  assert.match(fichas, /oneshot: lazy/);
});

test('a marca que gira é a caveira, desenhada e não emoji', () => {
  const marcas = readFileSync(new URL('../src/experience/MarcaDaMesa.jsx', import.meta.url), 'utf8');
  assert.match(marcas, /oneshot: SkullMark3D/);
  const caveira = semComentarios(readFileSync(new URL('../src/experience/SkullMark3D.jsx', import.meta.url), 'utf8'));
  // ☠ muda de cara em cada sistema e numa mesa de terror a marca não pode
  // virar engraçada no celular de alguém.
  assert.ok(!/☠|💀/.test(caveira), 'a caveira virou emoji');
  assert.match(caveira, /caveira3d-orbita/);
});

test('névoa e som da noite só aparecem onde o sistema os pede', () => {
  assert.equal(SISTEMAS.oneshot.nevoa, true);
  assert.notEqual(SISTEMAS.cain.nevoa, true);
  const sessao = readFileSync(new URL('../src/AuthenticatedSession.jsx', import.meta.url), 'utf8');
  assert.match(sessao, /temNevoa && <Mortalha/);
  assert.match(sessao, /temNevoa && <ChaveDaNoite/);
});

test('a névoa não posiciona irmão nenhum', () => {
  // Uma regra de irmão foi o que derrubou o layout da Estrela de Absinto:
  // ganhou da posição fixa da navegação e jogou a barra para dentro do fluxo.
  const folha = semComentarios(readFileSync(new URL('../src/features/oneshot/mortalha.css', import.meta.url), 'utf8'));
  assert.ok(!/\.mortalha\s*~/.test(folha), 'voltou a regra de irmão que derruba o layout');
  assert.match(folha, /z-index:0/);
});

test('o som da noite é sintetizado, sem arquivo nem domínio novo', () => {
  // Não há de onde trazer gravação aqui, e pendurar áudio de terceiro
  // levantaria licença e mais um endereço na política de segurança.
  const som = semComentarios(readFileSync(new URL('../src/features/oneshot/somDaNoite.mjs', import.meta.url), 'utf8'));
  assert.ok(!/https?:\/\//.test(som), 'o som da noite passou a baixar alguma coisa');
  assert.match(som, /createOscillator/);
  assert.match(som, /createBufferSource/);
});
