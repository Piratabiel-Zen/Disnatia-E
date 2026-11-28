/**
 * A NÉVOA DE EXPLORAÇÃO E O VULTO
 *
 * As duas últimas peças da noite, e as duas guardam a mesma promessa: o
 * jogador só vê o que descobriu, e a coisa só aparece pelo tempo que o
 * Mestre deu.
 *
 * A armadilha que estes testes existem para pegar é a máscara. `mask` com
 * vários gradientes só soma os buracos se a composição for `intersect`;
 * sem isso, só a última clareira aparece, e o Mestre conclui que revelar
 * parou de funcionar depois do primeiro clique — sem erro nenhum no console.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import {
  RAIO_DA_VISAO, RAIO_MAXIMO, RAIO_MINIMO, COMPOSICAO,
  clareiraNova, jaDescoberto, mascaraDaExploracao, visaoDaMesa,
} from '../src/features/oneshot/exploracao.mjs';
import {
  DURACOES, TAMANHOS, VULTO_VELHO_MS,
  duracaoPorId, estagioDoVulto, tamanhoPorId, valeNesteMapa, vultoAindaVale, vultoNovo,
} from '../src/features/oneshot/vultoNoMapa.mjs';

const fonte = c => readFileSync(new URL(`../${c}`, import.meta.url), 'utf8');

/* ─── A névoa ─────────────────────────────────────────────────────────── */

test('sem nada descoberto, não há buraco nenhum', () => {
  // É o começo da noite: a casa inteira por descobrir.
  assert.equal(mascaraDaExploracao({}), null);
  assert.equal(mascaraDaExploracao({ clareiras: [], visoes: [] }), null);
});

test('cada clareira vira um buraco, e todos somam', () => {
  /* A armadilha: sem `intersect`, só a última clareira apareceria. */
  const m = mascaraDaExploracao({
    clareiras: [clareiraNova(0.2, 0.3), clareiraNova(0.7, 0.6)],
  });
  assert.equal(m.match(/radial-gradient/g).length, 2);
  assert.equal(COMPOSICAO, 'intersect');
  const jsx = semComentarios(fonte('src/features/oneshot/NevoaDeExploracao.jsx'));
  assert.match(jsx, /maskComposite: COMPOSICAO/);
});

test('a máscara é toda em porcentagem, nunca em pixel', () => {
  // O mapa é redimensionado pela tela; máscara em pixel escorrega do lugar
  // no primeiro resize e a lanterna fica longe da criança.
  const m = mascaraDaExploracao({ clareiras: [clareiraNova(0.5, 0.5)] });
  assert.ok(!/\d(px|rem|em)\b/.test(m), `entrou unidade fixa: ${m}`);
  assert.match(m, /%/);
});

test('a máscara usa ELIPSE, porque círculo em porcentagem é CSS inválido', () => {
  /* O bug que custou uma rodada e não deu um aviso sequer: `circle` com raio
     em porcentagem é inválido, o CSSOM descarta a declaração INTEIRA em
     silêncio, e o resultado é a casa toda preta com o Mestre achando que
     revelar parou de funcionar. Só `ellipse` aceita porcentagem. */
  const m = mascaraDaExploracao({ clareiras: [clareiraNova(0.3, 0.5, 0.07)] });
  assert.ok(!/radial-gradient\(circle/.test(m),
    'voltou o `circle` com porcentagem: a máscara inteira vai ser descartada');
  assert.match(m, /radial-gradient\(ellipse [\d.]+% [\d.]+% at /);
});

test('o buraco sai redondo na tela, não achatado', () => {
  // Os dois raios saem de eixos diferentes: o vertical precisa da proporção
  // do mapa, senão a lanterna vira uma faixa esticada.
  const m = mascaraDaExploracao({ clareiras: [clareiraNova(0.5, 0.5, 0.1)], aspecto: 2 });
  const [, rx, ry] = m.match(/ellipse ([\d.]+)% ([\d.]+)%/);
  assert.equal(Number(ry) / Number(rx), 2);
  // Mapa quadrado: os dois raios iguais.
  const q = mascaraDaExploracao({ clareiras: [clareiraNova(0.5, 0.5, 0.1)], aspecto: 1 });
  const [, qx, qy] = q.match(/ellipse ([\d.]+)% ([\d.]+)%/);
  assert.equal(qx, qy);
});

test('só as propriedades padrão de máscara entram no estilo', () => {
  /* Declarar `WebkitMaskComposite` junto fazia o caminho antigo do WebKit
     vencer o `mask-composite`, e os buracos paravam de somar. */
  const jsx = semComentarios(fonte('src/features/oneshot/NevoaDeExploracao.jsx'));
  assert.ok(!/WebkitMaskComposite/.test(jsx),
    'o composite do WebKit voltou e vai atropelar o padrão');
  assert.match(jsx, /maskComposite: COMPOSICAO/);
});

test('a visão acompanha o token e some quando ele sai', () => {
  const clareiras = [clareiraNova(0.2, 0.2)];
  const com = visaoDaMesa({ clareiras, tokens: [{ dono: 'u1', x: 0.8, y: 0.8 }], dono: 'u1' });
  const sem = visaoDaMesa({ clareiras, tokens: [], dono: 'u1' });
  assert.equal(com.mascara.match(/radial-gradient/g).length, 2);
  // Sem token sobra a clareira: o que ficou para trás continua visível.
  assert.equal(sem.mascara.match(/radial-gradient/g).length, 1);
});

test('o jogador não vê a visão dos outros', () => {
  // Enxergar pelo olho do primo acabaria com a separação da mesa.
  const tokens = [{ dono: 'u1', x: 0.3, y: 0.3 }, { dono: 'u2', x: 0.9, y: 0.1 }];
  const u1 = visaoDaMesa({ clareiras: [], tokens, dono: 'u1' });
  assert.equal(u1.mascara.match(/radial-gradient/g).length, 1);
});

test('jogador sem token não fica cego', () => {
  // Quem ainda não pôs ficha na mesa veria uma tela preta.
  const v = visaoDaMesa({ clareiras: [clareiraNova(0.4, 0.4)], tokens: [], dono: '' });
  assert.ok(v.mascara, 'o jogador sem token perdeu até as clareiras');
});

test('o Mestre vê a mesma névoa que a mesa, e espia por fora dela', () => {
  /* Esta parte já errou nas duas direções. Primeiro o Mestre não recebia
     névoa nenhuma e pintava às cegas. Depois passou a recebê-la a 50% — e
     aí ENXERGAVA o mapa por baixo, e concluiu, com razão, que a névoa não
     tapava nada: na tela dele realmente não tapava.

     O acerto é a névoa cheia por padrão. O que ele vê é o que a mesa vê,
     que é a única referência honesta para julgar se está boa; e um botão
     clareia enquanto ele segura, para narrar o que tem lá. */
  const css = semComentarios(readFileSync(
    new URL('../src/features/oneshot/exploracao.css', import.meta.url), 'utf8'));
  assert.ok(!/\.nev\[data-previa\]\{opacity/.test(css),
    'ser Mestre não pode, sozinho, clarear a névoa');
  assert.match(css, /\.nev\[data-espiando\]\{opacity:\.\d+\}/,
    'o que clareia é ele PEDIR, e só enquanto pede');

  const jsx = semComentarios(readFileSync(
    new URL('../src/features/oneshot/NevoaDeExploracao.jsx', import.meta.url), 'utf8'));
  assert.match(jsx, /data-espiando=\{previa && espiando \? '' : undefined\}/,
    'espiar é do Mestre: jogador que mande `espiando` não pode clarear nada');
});

test('a prévia do Mestre mostra a visão de todas as crianças', () => {
  // Ele precisa enxergar o que cada uma está enxergando, não a de um dono.
  const tokens = [{ dono: 'u1', x: 0.2, y: 0.2 }, { dono: 'u2', x: 0.8, y: 0.8 }];
  const v = visaoDaMesa({ mestre: true, clareiras: [], tokens, dono: '' });
  assert.equal(v.mascara.match(/radial-gradient/g).length, 2);
});

test('o raio fica dentro dos limites, mesmo com lixo', () => {
  assert.equal(clareiraNova(0.5, 0.5, 99).r, RAIO_MAXIMO);
  assert.equal(clareiraNova(0.5, 0.5, -3).r, RAIO_MINIMO);
  assert.equal(clareiraNova(0.5, 0.5, 'nada').r, RAIO_MINIMO);
  // E a posição nunca sai do mapa.
  assert.equal(clareiraNova(9, -4).x, 1);
  assert.equal(clareiraNova(9, -4).y, 0);
});

test('clicar dentro de uma clareira não cria outra igual', () => {
  const c = clareiraNova(0.5, 0.5, 0.1);
  assert.equal(jaDescoberto({ x: 0.5, y: 0.5 }, [c]), true);
  // Mas na beirada ainda abre mais chão: é como o Mestre amplia o corredor.
  assert.equal(jaDescoberto({ x: 0.58, y: 0.5 }, [c]), false);
});

test('a névoa não rouba o clique dos tokens', () => {
  // O Mestre move a criança para dentro do escuro e a visão abre o caminho.
  const css = semComentarios(fonte('src/features/oneshot/exploracao.css'));
  assert.match(css.match(/\.nev\{[^}]*\}/)[0], /pointer-events:\s*none/);
});

/* ─── O vulto ─────────────────────────────────────────────────────────── */

test('o vulto some sozinho', () => {
  // Vulto preso num cômodo é pior que vulto nenhum: a mesa passaria a noite
  // achando que a coisa está parada ali.
  const v = vultoNovo({ mapa: 'porao', x: .4, y: .5, duracao: 'piscada' });
  const total = duracaoPorId('piscada').ms;
  assert.ok(estagioDoVulto(v, v.comecouEm + 10));
  assert.equal(estagioDoVulto(v, v.comecouEm + total), null);
  assert.equal(estagioDoVulto(v, v.comecouEm + 999999), null);
  assert.equal(estagioDoVulto({ ...v, comecouEm: NaN }), null);
  assert.equal(estagioDoVulto(null), null);
});

test('entra depressa e sai depressa', () => {
  // Vulto que desmancha devagar vira fantasma de desenho animado; o que
  // assusta é já não estar lá.
  const v = vultoNovo({ mapa: 'porao', duracao: 'parado' });
  const t = ms => estagioDoVulto(v, v.comecouEm + ms);
  assert.ok(t(50).presenca < t(400).presenca);
  assert.equal(t(2000).presenca, 1);
  assert.ok(t(duracaoPorId('parado').ms - 100).presenca < 1);
});

test('vulto de outro mapa não aparece', () => {
  // A mesa pode estar olhando outro andar: um vulto no sótão enquanto todos
  // olham o porão não assusta, só confunde.
  const v = vultoNovo({ mapa: 'sotao' });
  assert.equal(valeNesteMapa(v, 'sotao'), true);
  assert.equal(valeNesteMapa(v, 'porao'), false);
});

test('vulto não se repete para quem chegou depois', () => {
  const agora = Date.now();
  assert.equal(vultoAindaVale({ comecouEm: agora }, agora), true);
  assert.equal(vultoAindaVale({ comecouEm: agora - VULTO_VELHO_MS - 1 }, agora), false);
});

test('as três durações e os três tamanhos existem, e o alto é o maior', () => {
  assert.equal(DURACOES.length, 3);
  assert.equal(TAMANHOS.length, 3);
  for (const d of DURACOES) assert.ok(d.ms > 0 && d.resumo, `${d.id} incompleta`);
  assert.ok(tamanhoPorId('alto').escala > tamanhoPorId('pessoa').escala);
  assert.ok(tamanhoPorId('pessoa').escala > tamanhoPorId('crianca').escala);
  // Valor inventado cai no padrão em vez de quebrar.
  assert.equal(tamanhoPorId('nada').id, 'pessoa');
  assert.equal(duracaoPorId(undefined).id, 'instante');
});

test('o vulto fica por cima do escuro', () => {
  /* A coisa não precisa de lanterna para ser vista: é ela que escolhe
     aparecer. Embaixo da névoa, o vulto só apareceria onde o jogador já
     tinha descoberto — e aí nunca assustaria ninguém. */
  const css = semComentarios(fonte('src/features/oneshot/exploracao.css'));
  const nev = Number(css.match(/\.nev\{[^}]*z-index:(\d+)/)[1]);
  const vul = Number(css.match(/\.vul\{[^}]*z-index:(\d+)/)[1]);
  assert.ok(vul > nev, `o vulto (${vul}) tem que ficar acima da névoa (${nev})`);
});

test('o canal do vulto ignora o que já estava lá', () => {
  const canal = semComentarios(fonte('src/core/liveChannel.js'));
  const assinar = canal.match(/export function assinarVulto[\s\S]*?\n\}/)[0];
  /* O `primed` é o que importa aqui: o retardatário não recebe o vulto
     que já estava no canal. O valor passa por `carimbarChegada` antes de
     seguir — a hora de chegada, no relógio de quem recebe, é o que mede a
     duração; comparar com o relógio de quem disparou era o que fazia o
     vulto não aparecer para a mesa. Ver core/horaDoAviso.mjs. */
  assert.match(assinar, /if \(primed && value\) cb\(carimbarChegada\(value\)\)/);
});
