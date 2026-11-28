import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  medianaDe, proximoPalco, LIMITE_RUIM_MS, LIMITE_BOM_MS, PALCO_MAXIMO,
} from '../src/adventure/palcoAutomatico.mjs';

const fonte = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');

/** Roda uma sessão inteira de medições, como a tela faria. */
const sessao = (medianas, inicio = { palco: 0, folgas: 0 }) =>
  medianas.reduce((estado, m) => proximoPalco(estado, m), inicio);

test('um quadro horrível sozinho não derruba o palco', () => {
  /* Carregar imagem, abrir aba, o navegador recolher memória: tudo isso
     dá um quadro ruim isolado. É a mediana da janela que decide, e ela
     ignora o acidente. */
  assert.equal(medianaDe([16, 17, 16, 400, 16, 17, 16]), 16);
  assert.equal(proximoPalco({ palco: 0, folgas: 0 }, medianaDe([16, 17, 16, 400, 16])).palco, 0);
});

test('máquina sofrendo desce de palco na primeira medição', () => {
  // Esperar confirmação é deixar a pessoa engasgando para provar o óbvio.
  assert.equal(proximoPalco({ palco: 0, folgas: 0 }, 42).palco, 1);
  assert.equal(proximoPalco({ palco: 1, folgas: 0 }, 42).palco, 2);
});

test('o palco não desce para sempre', () => {
  assert.equal(sessao([60, 60, 60, 60, 60, 60]).palco, PALCO_MAXIMO);
});

test('voltar exige folga de verdade, e duas vezes seguidas', () => {
  /* Descer a 30 quadros e subir a 31 faria a tela piscar entre dois
     palcos a cada respiro da máquina. */
  const depoisDeCair = proximoPalco({ palco: 0, folgas: 0 }, 40);
  assert.equal(depoisDeCair.palco, 1);
  const umaFolga = proximoPalco(depoisDeCair, 14);
  assert.equal(umaFolga.palco, 1, 'subiu com uma medição só');
  assert.equal(proximoPalco(umaFolga, 14).palco, 0);
});

test('folga interrompida não conta como seguida', () => {
  const caiu = proximoPalco({ palco: 0, folgas: 0 }, 40);
  const comUmaFolga = proximoPalco(caiu, 14);
  const mornou = proximoPalco(comUmaFolga, 24);   // entre os dois limites
  assert.equal(mornou.folgas, 0, 'a folga antiga ficou valendo');
  assert.equal(proximoPalco(mornou, 14).palco, 1, 'subiu com uma folga só');
});

test('a zona morta entre os limites não mexe em nada', () => {
  for (const m of [LIMITE_BOM_MS + 1, 24, LIMITE_RUIM_MS - 1]) {
    assert.equal(proximoPalco({ palco: 1, folgas: 0 }, m).palco, 1, `${m}ms mexeu no palco`);
  }
});

test('medição inválida é ignorada em vez de virar decisão', () => {
  // Aba em segundo plano, rAF congelado: vem 0 ou NaN. Não é máquina ruim.
  for (const m of [0, -5, NaN, undefined, null]) {
    assert.deepEqual(proximoPalco({ palco: 1, folgas: 1 }, m), { palco: 1, folgas: 1 });
  }
  assert.equal(medianaDe([]), 0);
  assert.equal(medianaDe([0, NaN, -3]), 0);
});

test('o palco mexe em cenografia e nunca na resposta ao jogador', () => {
  /* A mesma regra de paridade-animacoes, agora valendo para o palco
     automático: quem está na máquina fraca perde CAMADA DE CENÁRIO,
     nunca o token respirando nem o relógio da caçada. Se o seletor do
     palco encostar nessas coisas, o teste cai. */
  const proibidos = [
    '.map-token-body', '.ability-type-especial', '.g3-use-ability',
    '.avc', '.cac', '.tksp',
  ];
  for (const arquivo of ['src/features/oneshot/atmosfera-da-casa.css',
                         'src/experience/cenario-da-mesa.css',
                         'src/features/mapa-batalha/atmosfera.css',
                         'src/adventure/adventure.css']) {
    const css = fonte(arquivo);
    for (const linha of css.split('\n')) {
      if (!linha.includes('data-palco')) continue;
      for (const alvo of proibidos) {
        assert.ok(!linha.includes(alvo),
          `o palco automático desligou ${alvo} em ${arquivo} — isso é resposta ao jogador, não cenografia`);
      }
    }
  }
});
