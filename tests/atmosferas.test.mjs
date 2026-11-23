// AS ATMOSFERAS DE MESA E O CENÁRIO DA ESTRELA DE ABSINTO
//
// O risco aqui não é o código quebrar: é ele continuar rodando e as cinco
// atmosferas voltarem a ser a mesma tela escura com um botão de outra cor.
// Isso não dá erro em lugar nenhum — só some, e ninguém percebe até alguém
// abrir duas mesas lado a lado.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { semComentarios } from './ajuda/semComentarios.mjs';
import { dirname, join as joinPath } from 'node:path';

import { CAMPAIGN_THEMES } from '../src/core/temas.mjs';
import { cenarioDaMesa, temaDaMesa } from '../src/core/atmosferaDaMesa.mjs';

const raiz = joinPath(dirname(fileURLToPath(import.meta.url)), '..');
const ler = caminho => readFileSync(joinPath(raiz, caminho), 'utf8');

const TEMAS = ['cosmico', 'sombrio', 'medieval', 'veneziano', 'moderno'];
const corValida = cor => /^#[0-9A-Fa-f]{6}$/.test(String(cor || ''));

/* ─────────────────────────── as paletas ─────────────────────────── */

test('todo tema traz a paleta inteira, não só o acento', () => {
  for (const chave of TEMAS) {
    const tema = CAMPAIGN_THEMES[chave];
    assert.ok(tema, `sumiu o tema ${chave}`);
    for (const campo of ['accent', 'accentSoft', 'contraste', 'bg', 'superficie', 'linha', 'ink']) {
      assert.ok(corValida(tema[campo]), `${chave}.${campo} não é uma cor válida: ${tema[campo]}`);
    }
    assert.ok(tema.label && tema.sigil, `${chave} sem rótulo ou sigilo`);
  }
});

test('nenhum tema repete a cor de outro', () => {
  // Se dois temas têm o mesmo acento, escolher entre eles não muda nada —
  // e foi assim que "investigativo" e "vitoriano" viveram sendo a mesma tela.
  const acentos = TEMAS.map(c => CAMPAIGN_THEMES[c].accent.toLowerCase());
  assert.equal(new Set(acentos).size, TEMAS.length, 'dois temas com o mesmo acento');
  const fundos = TEMAS.map(c => CAMPAIGN_THEMES[c].bg.toLowerCase());
  assert.equal(new Set(fundos).size, TEMAS.length, 'dois temas com o mesmo fundo');
});

test('o contraste de cada tema contrasta de verdade com o acento dele', () => {
  // "Uma outra cor que contraste bastante" era o pedido. Cor de contraste
  // que é quase o próprio acento não quebra paleta nenhuma.
  const dist = (a, b) => {
    const n = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const [ra, ga, ba] = n(a); const [rb, gb, bb] = n(b);
    return Math.hypot(ra - rb, ga - gb, ba - bb);
  };
  for (const chave of TEMAS) {
    const { accent, contraste } = CAMPAIGN_THEMES[chave];
    assert.ok(dist(accent, contraste) > 90,
      `em ${chave}, o contraste (${contraste}) está perto demais do acento (${accent})`);
  }
});

test('os dois temas de investigação são vermelhos, e nenhum é dourado', () => {
  // A primeira versão do vitoriano era carvão com latão, e na tela leu como
  // salão antigo em vez de caso aberto. Investigação pede sangue, noite e
  // preto — então os dois temas escuros são vermelhos, e o que os separa é a
  // segunda cor: branco frio num, azul-marinho no outro.
  const canais = cor => [1, 3, 5].map(i => parseInt(cor.slice(i, i + 2), 16));
  const vermelho = cor => { const [r, g, b] = canais(cor); return r > 150 && r > g * 2 && r > b * 2; };
  const dourado = cor => { const [r, g, b] = canais(cor); return r > 150 && g > 110 && b < 110; };

  for (const chave of ['sombrio', 'veneziano']) {
    assert.ok(vermelho(CAMPAIGN_THEMES[chave].accent),
      `${chave} precisa de acento vermelho`);
    assert.ok(!dourado(CAMPAIGN_THEMES[chave].accent),
      `${chave} voltou a ser dourado`);
  }

  // E o azul-marinho do vitoriano: é ele que impede os dois de virarem a
  // mesma tela vermelha.
  const [r, g, b] = canais(CAMPAIGN_THEMES.veneziano.contraste);
  assert.ok(b > 140 && b > r * 1.5, 'o vitoriano perdeu o azul-marinho');
  const [, , bFundo] = canais(CAMPAIGN_THEMES.veneziano.bg);
  const [rFundo] = canais(CAMPAIGN_THEMES.veneziano.bg);
  assert.ok(bFundo > rFundo, 'o fundo do vitoriano puxa para a noite, não para o preto morto');
});

test('cada tema tem a luz de ambiente dele na folha de estilo', () => {
  const css = ler('src/experience/atmosferas-de-mesa.css');
  for (const chave of TEMAS) {
    assert.ok(css.includes(`data-tema-mesa="${chave}"`), `${chave} ficou sem luz de ambiente`);
  }
  // Onde existe foto de cenário, a mancha de cor sai: duas paisagens
  // sobrepostas não é clima, é sujeira.
  assert.match(css, /:has\(\.cenario-mesa\)::before\{content:none\}/);
});

/* ─────────────────────── o cenário da mesa ─────────────────────── */

test('a Estrela de Absinto tem praça, chuva e véu; outras mesas não têm nada', () => {
  const cenario = cenarioDaMesa({ name: 'Estrela de Absinto' });
  assert.ok(cenario, 'a Estrela de Absinto perdeu o cenário');
  assert.equal(cenario.chuva, true, 'na Terra Dourada chove sempre');
  assert.ok(cenario.escurecer > 0 && cenario.escurecer < 1,
    'sem véu o texto some em cima de uma foto de contraste alto');

  assert.equal(cenarioDaMesa({ name: 'Dinastia E' }), null);
  assert.equal(cenarioDaMesa({ name: 'Outra mesa de CAIN', sistema: 'cain' }), null,
    'o cenário é desta mesa, não do sistema');
  assert.equal(cenarioDaMesa(null), null);
});

test('o nome da mesa casa sem acento, sem caixa e com espaço sobrando', () => {
  // Ninguém digita duas vezes exatamente igual.
  for (const nome of ['ESTRELA DE ABSINTO', '  estrela de absinto ', 'Estréla de Absinto']) {
    assert.ok(cenarioDaMesa({ name: nome }), `não casou com "${nome}"`);
  }
});

test('os arquivos de imagem do cenário existem de verdade', () => {
  // O caminho é uma string: errar uma letra dá fundo preto sem erro nenhum
  // no console — some calado, que é o pior jeito de quebrar.
  const cenario = cenarioDaMesa({ name: 'Estrela de Absinto' });
  for (const caminho of [cenario.imagem, cenario.alternativa].filter(Boolean)) {
    assert.ok(existsSync(joinPath(raiz, 'public', caminho.replace(/^\//, ''))),
      `o arquivo ${caminho} não está em public/`);
  }
});

test('a chuva é feita de pingos, não de riscos de tela inteira', () => {
  const css = ler('src/experience/cenario-da-mesa.css');
  // A primeira versão usava repeating-linear-gradient e saiu uma grade de
  // listras verticais contínuas — parecia filme arranhado, não chuva.
  assert.ok(!/cenario-chuva-\w+\{[^}]*repeating-linear-gradient/.test(css),
    'a chuva voltou a ser risco contínuo em vez de pingo');
  assert.match(css, /@keyframes chuvaCai/);
  // E a inclinação vem de girar o plano, que é o que permite usar gradiente
  // radial para desenhar a gota.
  assert.match(css, /transform:rotate\(\d+deg\)/);
});

test('o cenário cede onde o movimento cede e fica atrás de tudo', () => {
  const css = ler('src/experience/cenario-da-mesa.css');
  assert.match(css, /html\[data-motion="reduced"\][\s\S]{0,200}animation:none/);
  assert.ok(!css.includes('prefers-reduced-motion'),
    'use html[data-motion="reduced"], que é a trava do site inteiro');
  assert.match(css, /\.cenario-mesa\{[^}]*position:fixed/);
  assert.match(css, /\.cenario-mesa\{[^}]*pointer-events:none/,
    'a parede não pode roubar clique do conteúdo');
});

test('a sessão troca o céu cósmico pela foto onde a mesa tem cenário', () => {
  const sessao = ler('src/AuthenticatedSession.jsx');
  assert.match(sessao, /<CenarioDaMesa campaign=\{campaign\}\/>/);
  assert.match(sessao, /!cenarioDaMesa\(campaign\) && <CosmicLivingBackground/,
    'as duas paisagens voltaram a aparecer ao mesmo tempo');
});

test('o tema da Estrela de Absinto continua vindo do nome dela', () => {
  assert.equal(temaDaMesa({ name: 'Estrela de Absinto', theme: 'moderno' }), 'veneziano',
    'o nome manda sobre o que foi escolhido no formulário');
  assert.equal(temaDaMesa({ name: 'Mesa qualquer', theme: 'medieval' }), 'medieval');
});

/* ──────── o cenário é parede, e parede não empurra móvel ──────── */

test('nenhuma folha de atmosfera manda na posição dos filhos da sessão', () => {
  // O ESTRAGO QUE ISTO EVITA, e que já aconteceu uma vez:
  //
  // ".cenario-mesa ~ *{position:relative}" e
  // "html[data-tema-mesa] .adventure-shell>*{position:relative}" parecem
  // inofensivos — só garantiriam que o conteúdo ficasse na frente da parede.
  // Só que os dois são MAIS ESPECÍFICOS que ".grim-nav{position:fixed}".
  // A navegação deixou de ser fixa, caiu no fluxo, ocupou altura no topo e
  // empurrou a sessão inteira para baixo do cenário. A tela virou uma coluna
  // torta com a foto no lugar do cabeçalho.
  //
  // Não é preciso regra nenhuma: a parede é fixed em z-index 0 e a sessão
  // já vive acima disso, como o fundo cósmico sempre funcionou.
  for (const arquivo of ['src/experience/cenario-da-mesa.css',
                         'src/experience/atmosferas-de-mesa.css']) {
    const css = semComentarios(ler(arquivo));
    const curingas = css.match(/[~>]\s*\*\s*\{[^}]*\}/g) || [];
    for (const regra of curingas) {
      assert.ok(!/position\s*:/.test(regra),
        `${arquivo} voltou a mandar na posição de todos os irmãos: ${regra}`);
    }
  }
});

test('a navegação continua fixa e a parede continua atrás', () => {
  const nav = ler('src/experience/experience.css');
  assert.match(nav, /\.grim-nav\{position:fixed/,
    'a navegação precisa continuar fixa, senão ela entra no fluxo');
  const cenario = ler('src/experience/cenario-da-mesa.css');
  assert.match(cenario, /\.cenario-mesa\{[^}]*z-index:0/,
    'a parede precisa ficar na camada de fundo');
});
