/**
 * A ASSOMBRAÇÃO
 *
 * É o único momento do sistema em que a interface tira o controle das mãos
 * do jogador, e por isso quase tudo que estes testes guardam é sobre ela
 * DEVOLVER esse controle:
 *
 *  - termina sozinha, calculando o fim do horário de início, e não esperando
 *    um segundo aviso que pode nunca chegar;
 *  - não bloqueia clique nenhum enquanto está na tela;
 *  - não se repete para quem chegou depois.
 *
 * Uma sobreposição preta presa na tela de um jogador acabaria com a sessão
 * dele. É o pior jeito possível de uma feature de clima falhar, e é o que
 * está guardado aqui.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './ajuda/semComentarios.mjs';

import {
  INTENSIDADES, DURACOES, TETO_DA_IMAGEM, AVISO_VELHO_MS,
  avisoDeAssombracao, avisoAindaVale, duracaoPorId, estagioDaAssombracao,
  intensidadePorId,
} from '../src/features/oneshot/assombracao.mjs';
import { pesoDaIntensidade } from '../src/features/oneshot/somDaAssombracao.mjs';

const fonte = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');
const aparicao = { titulo: 'A mulher no corredor', imagem: 'data:image/webp;base64,xx' };

test('a assombração sempre termina sozinha', () => {
  // A garantia mais importante do arquivo: o fim sai do relógio de quem
  // assiste. Mestre que fecha a aba no meio, rede que cai, navegador que
  // engasga — a tela volta do mesmo jeito.
  const aviso = avisoDeAssombracao({ aparicao, duracao: 'relance' });
  const total = duracaoPorId('relance').ms;
  assert.ok(estagioDaAssombracao(aviso, aviso.comecouEm + 10));
  assert.equal(estagioDaAssombracao(aviso, aviso.comecouEm + total), null);
  assert.equal(estagioDaAssombracao(aviso, aviso.comecouEm + total + 60000), null);
  // E um aviso com horário quebrado não deixa nada preso na tela.
  assert.equal(estagioDaAssombracao({ ...aviso, comecouEm: NaN }), null);
  assert.equal(estagioDaAssombracao(null), null);
});

test('ela entra devagar, fica, e sai depressa', () => {
  // Aparecer devagar é o que assusta; sumir devagar só atrasa a mesa.
  const aviso = avisoDeAssombracao({ aparicao, duracao: 'fica' });
  const t = ms => estagioDaAssombracao(aviso, aviso.comecouEm + ms);
  assert.equal(t(100).fase, 'entrando');
  assert.ok(t(100).presenca < t(600).presenca, 'a entrada não está crescendo');
  assert.equal(t(4000).fase, 'parada');
  assert.equal(t(4000).presenca, 1);
  const total = duracaoPorId('fica').ms;
  assert.equal(t(total - 200).fase, 'saindo');
  assert.ok(t(total - 200).presenca < 1);
});

test('quem chega depois não leva o susto que a mesa já levou', () => {
  const agora = Date.now();
  const novo = { comecouEm: agora };
  const velho = { comecouEm: agora - AVISO_VELHO_MS - 1 };
  assert.equal(avisoAindaVale(novo, agora), true);
  assert.equal(avisoAindaVale(velho, agora), false);
  assert.equal(avisoAindaVale(null, agora), false);
});

test('a intensidade manda em quanto da tela ela toma', () => {
  // Não é volume de efeito: "Vulto" é a coisa mal aparecendo no escuro,
  // "Encarar" é ela ocupando tudo.
  const ordenadas = [...INTENSIDADES].sort((a, b) => a.ordem - b.ordem);
  for (let i = 1; i < ordenadas.length; i += 1) {
    assert.ok(ordenadas[i].veu >= ordenadas[i - 1].veu, 'o véu não cresce com a intensidade');
    assert.ok(ordenadas[i].nitidez > ordenadas[i - 1].nitidez, 'a nitidez não cresce');
  }
  assert.equal(intensidadePorId('encarar').nitidez, 1);
  // Intensidade inventada cai no padrão em vez de quebrar.
  assert.equal(intensidadePorId('nao-existe').id, 'presenca');
  assert.equal(duracaoPorId(undefined).id, 'demora');
});

test('imagem grande demais não viaja, mas a assombração acontece', () => {
  // O escuro e o som sozinhos já valem a cena, e é melhor do que não
  // acontecer nada.
  const enorme = { titulo: 'Coisa', imagem: 'x'.repeat(TETO_DA_IMAGEM + 1) };
  const aviso = avisoDeAssombracao({ aparicao: enorme });
  assert.equal(aviso.imagem, '');
  assert.equal(aviso.titulo, 'Coisa');
  assert.ok(estagioDaAssombracao(aviso, aviso.comecouEm + 50));
  // A que cabe viaja inteira.
  assert.equal(avisoDeAssombracao({ aparicao }).imagem, aparicao.imagem);
});

test('cada aviso tem id próprio', () => {
  // Dois avisos no mesmo milissegundo com o mesmo id fariam a segunda
  // assombração ser ignorada como repetida.
  const a = avisoDeAssombracao({ aparicao });
  const b = avisoDeAssombracao({ aparicao });
  assert.notEqual(a.id, b.id);
});

/* ─── A tela ──────────────────────────────────────────────────────────── */

test('a assombração não bloqueia clique nenhum', () => {
  /* O jogador continua podendo rolar, escrever e clicar enquanto a coisa
     está lá — ele só não enxerga direito. Uma camada que trava a tela de
     todo mundo por nove segundos é a diferença entre clima e sessão
     travada. */
  const css = semComentarios(fonte('src/features/oneshot/assombracao.css'));
  const raiz = css.match(/\.asb\{[^}]*\}/)[0];
  assert.match(raiz, /pointer-events:\s*none/);
  const jsx = semComentarios(fonte('src/features/oneshot/Assombracao.jsx'));
  assert.ok(!/onClick|onPointerDown/.test(jsx), 'a assombração passou a capturar clique');
});

test('ela mora na casca, não numa aba', () => {
  // A tela tem que escurecer esteja a pessoa onde estiver: a graça é pegar
  // quem estava mexendo na ficha.
  const sessao = semComentarios(fonte('src/AuthenticatedSession.jsx'));
  assert.match(sessao, /<Assombracao \/>/);
});

test('o fim vem do relógio de quem assiste, não de um segundo aviso', () => {
  const jsx = semComentarios(fonte('src/features/oneshot/Assombracao.jsx'));
  assert.match(jsx, /requestAnimationFrame/);
  assert.match(jsx, /estagioDaAssombracao\(aviso\)/);
  // E quando o estágio acaba, o aviso é jogado fora.
  assert.match(jsx, /else setAviso\(null\)/);
});

test('o Mestre revela antes de assombrar', () => {
  // Depois do susto a mesa vai querer olhar a coisa de perto; aparição que
  // escureceu a tela e sumiu sem deixar nada frustra em vez de assustar.
  const pagina = semComentarios(fonte('src/features/oneshot/AparicoesPage.jsx'));
  const fn = pagina.match(/const assombrar = useCallback\([\s\S]*?\}, \[/)[0];
  assert.match(fn, /revelarParaTodos\(aparicao, true\)/);
  assert.match(fn, /publicarAssombracao/);
});

test('o som é sintetizado, sem arquivo nem host novo', () => {
  /* Arquivo de som precisa carregar, e um susto que chega meio segundo
     depois do escuro não é susto, é defeito. E todo host novo que entrou
     neste projeto quebrou alguma coisa. */
  const som = semComentarios(fonte('src/features/oneshot/somDaAssombracao.mjs'));
  assert.ok(!/https?:\/\/|\.mp3|\.ogg|\.wav/.test(som), 'entrou arquivo ou host de áudio');
  assert.match(som, /createOscillator/);
  // Bloqueado pelo navegador, cala a boca em vez de encher o console.
  assert.match(som, /state === 'suspended'/);
  // E os nós são desligados: nó esquecido ligado vaza e vira estalo.
  assert.match(som, /disconnect\(\)/);
});

test('o som pesa conforme a intensidade', () => {
  assert.ok(pesoDaIntensidade('vulto') < pesoDaIntensidade('presenca'));
  assert.ok(pesoDaIntensidade('presenca') < pesoDaIntensidade('encarar'));
  assert.equal(pesoDaIntensidade('inventada'), pesoDaIntensidade('presenca'));
});

test('o canal da assombração ignora o que já estava lá', () => {
  // Senão todo mundo que abre a mesa leva o susto da última assombração.
  const canal = semComentarios(fonte('src/core/liveChannel.js'));
  const assinar = canal.match(/export function assinarAssombracao[\s\S]*?\n\}/)[0];
  assert.match(assinar, /if \(primed && value\) cb\(value\)/);
});

test('as três durações e as três intensidades estão todas declaradas', () => {
  assert.equal(DURACOES.length, 3);
  assert.equal(INTENSIDADES.length, 3);
  for (const d of DURACOES) assert.ok(d.ms > 0 && d.resumo, `duração ${d.id} incompleta`);
  for (const i of INTENSIDADES) assert.ok(i.resumo, `intensidade ${i.id} sem resumo`);
});
