/* O MURAL DE INVESTIGAÇÃO
   Seis pessoas mexendo no mesmo mural ao mesmo tempo. O que quebra em silêncio
   aqui é ligação duplicada e barbante apontando para cartão que já sumiu — os
   dois só aparecem no meio de uma cena, que é o pior momento. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ESTADOS_DA_PISTA, ESTADO_PADRAO, TIPOS_DE_CARTAO,
  cartaoNovo, chaveDaLigacao, contagemPorTipo, definirEstado, desligar,
  estadoDoCartao, filtrarMural, ligar, linhasDoMural, moverCartao, podeMexerNoCartao, prender,
  removerCartao, tipoDoCartao, vizinhos,
  alternarPessoaNoCartao, cartaoTemImagem, cartoesVisiveis,
  liberarCartaoParaTodos, podeVerCartao, resumoDeQuemVe,
} from '../src/features/investigacao/mural.mjs';

const montar = () => ([
  cartaoNovo({ id: 'p1', tipo: 'pista', titulo: 'Luva no canal', x: .2, y: .3 }),
  cartaoNovo({ id: 's1', tipo: 'suspeito', titulo: 'Il Carnefice', x: .6, y: .2 }),
  cartaoNovo({ id: 'l1', tipo: 'local', titulo: 'Arsenale', x: .5, y: .7 }),
]);

test('cartão nasce preso ao mural e com estado inicial', () => {
  const c = cartaoNovo({ id: 'x', tipo: 'pista' });
  assert.equal(c.estado, ESTADO_PADRAO);
  assert.equal(c.x, .5);
  // Fora do mural, volta para dentro: cartão que sai pela borda some da mesa.
  assert.equal(cartaoNovo({ id: 'y', x: 5, y: -3 }).x, .98);
  assert.equal(cartaoNovo({ id: 'y', x: 5, y: -3 }).y, .02);
  assert.equal(prender('nada'), .5, 'lixo cai no centro, não em NaN');
});

test('tipo inventado vira pista, em vez de quebrar a tela', () => {
  assert.equal(cartaoNovo({ id: 'x', tipo: 'fantasma' }).tipo, 'pista');
  assert.equal(tipoDoCartao({ tipo: 'inexistente' }).id, 'pista');
  assert.equal(estadoDoCartao({ estado: 'inexistente' }).id, 'encontrada');
  for (const t of TIPOS_DE_CARTAO) assert.match(t.cor, /^#[0-9A-F]{6}$/i);
  for (const e of ESTADOS_DA_PISTA) assert.ok(e.nome && e.resumo);
});

test('suspeito ganha página própria; os outros não carregam campo vazio', () => {
  assert.ok(cartaoNovo({ id: 's', tipo: 'suspeito' }).ficha);
  const ficha = cartaoNovo({ id: 's', tipo: 'suspeito' }).ficha;
  for (const campo of ['foto', 'descricao', 'alibi', 'relacoes', 'evidencias']) {
    assert.equal(ficha[campo], '', `a página do suspeito perdeu "${campo}"`);
  }
  assert.equal(cartaoNovo({ id: 'p', tipo: 'pista' }).ficha, null);
});

test('mover prende o cartão dentro do mural', () => {
  const c = moverCartao(montar(), 'p1', 9, -9);
  assert.equal(c.find(x => x.id === 'p1').x, .98);
  assert.equal(c.find(x => x.id === 'p1').y, .02);
  // Os outros não se mexem.
  assert.equal(c.find(x => x.id === 's1').x, .6);
});

test('ligar A→B e B→A é a MESMA linha', () => {
  // Sem isso, dois jogadores ligando a mesma dupla ao mesmo tempo criam duas
  // linhas sobrepostas, e apagar uma deixa um barbante fantasma.
  assert.equal(chaveDaLigacao('p1', 's1'), chaveDaLigacao('s1', 'p1'));
  let l = ligar([], 'p1', 's1');
  l = ligar(l, 's1', 'p1');
  assert.equal(l.length, 1, 'a segunda ligação era a mesma');
});

test('cartão não se liga a si mesmo', () => {
  assert.deepEqual(ligar([], 'p1', 'p1'), []);
});

test('desligar some com a linha nos dois sentidos', () => {
  const l = ligar([], 'p1', 's1');
  assert.equal(desligar(l, 's1', 'p1').length, 0);
  assert.equal(desligar(l, 'p1', 's1').length, 0);
});

test('apagar o cartão leva junto todo barbante preso nele', () => {
  const cartoes = montar();
  let ligacoes = ligar([], 'p1', 's1');
  ligacoes = ligar(ligacoes, 'p1', 'l1');
  ligacoes = ligar(ligacoes, 's1', 'l1');
  const r = removerCartao(cartoes, ligacoes, 'p1');
  assert.equal(r.cartoes.length, 2);
  assert.equal(r.ligacoes.length, 1, 'só sobra a ligação que não tocava p1');
  assert.equal(r.ligacoes[0].chave, chaveDaLigacao('s1', 'l1'));
});

test('barbante apontando para cartão que sumiu não é desenhado', () => {
  // Acontece quando o cartão some por outro caminho: outra aba, outro jogador.
  const ligacoes = ligar([], 'p1', 'fantasma');
  assert.deepEqual(linhasDoMural(montar(), ligacoes), []);
});

test('as linhas trazem as pontas resolvidas, prontas para desenhar', () => {
  const linhas = linhasDoMural(montar(), ligar([], 'p1', 'l1'));
  assert.equal(linhas.length, 1);
  const [linha] = linhas;
  // Ordenado: 'l1' < 'p1', então a ponta 1 é l1.
  assert.equal(linha.x1, .5);
  assert.equal(linha.y1, .7);
  assert.equal(linha.x2, .2);
  assert.equal(linha.y2, .3);
  assert.match(linha.cor, /^#[0-9A-F]{6}$/i);
});

test('vizinhos encontra os dois sentidos da ligação', () => {
  const cartoes = montar();
  let ligacoes = ligar([], 'p1', 's1');
  ligacoes = ligar(ligacoes, 'l1', 'p1');
  assert.deepEqual(vizinhos(cartoes, ligacoes, 'p1').map(c => c.id).sort(), ['l1', 's1']);
  assert.deepEqual(vizinhos(cartoes, ligacoes, 's1').map(c => c.id), ['p1']);
});

test('o estado da pista anda pelos quatro', () => {
  let c = montar();
  for (const estado of ['investigando', 'confirmada', 'descartada']) {
    c = definirEstado(c, 'p1', estado);
    assert.equal(c.find(x => x.id === 'p1').estado, estado);
  }
  // Estado inventado não entra.
  c = definirEstado(c, 'p1', 'resolvida-magicamente');
  assert.equal(c.find(x => x.id === 'p1').estado, 'descartada');
});

test('o filtro apaga, mas não some: o mural guarda a forma que a mesa decorou', () => {
  const cartoes = montar();
  const sóSuspeitos = filtrarMural(cartoes, { tipos: ['suspeito'] });
  assert.deepEqual([...sóSuspeitos], ['s1']);
  // E os outros continuam existindo para o barbante não se partir.
  assert.equal(cartoes.length, 3);

  assert.deepEqual([...filtrarMural(cartoes, { busca: 'arsenale' })], ['l1'], 'busca sem caixa');
  assert.deepEqual([...filtrarMural(cartoes, { busca: 'CARNEFICE' })], ['s1']);
  assert.equal(filtrarMural(cartoes, { busca: 'nada disso' }).size, 0);
  assert.equal(filtrarMural(cartoes, {}).size, 3, 'sem filtro, tudo visível');
});

test('a busca ignora acento, porque ninguém digita acento com pressa', () => {
  const cartoes = [cartaoNovo({ id: 'a', titulo: 'Máscara de médico da peste' })];
  assert.equal(filtrarMural(cartoes, { busca: 'mascara' }).size, 1);
  assert.equal(filtrarMural(cartoes, { busca: 'MÉDICO' }).size, 1);
});

test('a contagem por tipo cobre todos os tipos, mesmo os zerados', () => {
  const c = contagemPorTipo(montar());
  assert.equal(c.pista, 1);
  assert.equal(c.suspeito, 1);
  assert.equal(c.teoria, 0, 'tipo sem cartão aparece como zero, não sumido');
  assert.equal(Object.keys(c).length, TIPOS_DE_CARTAO.length);
});

/* ═════════════ QUEM VÊ CADA CARTÃO ═════════════ */

const mestre = { uid: 'm1', papel: 'mestre' };
const rafael = { uid: 'r1', papel: 'jogador' };
const joao = { uid: 'j1', papel: 'jogador' };

test('cartão novo nasce aberto para a mesa', () => {
  // Se nascesse trancado, a mesa teria que liberar um por um para o mural
  // voltar a funcionar como sempre funcionou. Trancar é o caso excepcional.
  const c = cartaoNovo({ id: 'c1' });
  assert.equal(c.liberadoParaTodos, true);
  assert.deepEqual(c.liberadoPara, []);
  assert.equal(podeVerCartao(c, joao), true);
});

test('cartão restrito só aparece para quem foi nomeado', () => {
  let cartoes = [cartaoNovo({ id: 'c1', titulo: 'A carta rasgada' })];
  cartoes = alternarPessoaNoCartao(cartoes, 'c1', 'r1');

  assert.equal(podeVerCartao(cartoes[0], rafael), true, 'Rafael foi nomeado');
  assert.equal(podeVerCartao(cartoes[0], joao), false, 'João não achou isso');
  assert.equal(podeVerCartao(cartoes[0], mestre), true, 'o Mestre vê tudo');
  // Nomear alguém tira o "para todos": ou é da mesa, ou é de quem foi nomeado.
  assert.equal(cartoes[0].liberadoParaTodos, false);
});

test('nomear de novo a mesma pessoa a retira', () => {
  let cartoes = [cartaoNovo({ id: 'c1' })];
  cartoes = alternarPessoaNoCartao(cartoes, 'c1', 'r1');
  cartoes = alternarPessoaNoCartao(cartoes, 'c1', 'h1');
  assert.deepEqual(cartoes[0].liberadoPara, ['r1', 'h1']);
  cartoes = alternarPessoaNoCartao(cartoes, 'c1', 'r1');
  assert.deepEqual(cartoes[0].liberadoPara, ['h1']);
  assert.equal(podeVerCartao(cartoes[0], rafael), false);
});

test('liberar para todos limpa a lista de nomeados', () => {
  // Guardar os nomes junto com "todos" deixaria um estado que não quer dizer
  // nada, e que volta sozinho ao se fechar o cartão de novo.
  let cartoes = alternarPessoaNoCartao([cartaoNovo({ id: 'c1' })], 'c1', 'r1');
  cartoes = liberarCartaoParaTodos(cartoes, 'c1', true);
  assert.equal(cartoes[0].liberadoParaTodos, true);
  assert.deepEqual(cartoes[0].liberadoPara, []);
  assert.equal(podeVerCartao(cartoes[0], joao), true);
});

test('cartão de antes desta regra continua aberto', () => {
  // Sem isto, publicar a mudança faria o mural inteiro de toda mesa sumir
  // para os jogadores — eles veriam um quadro vazio sem nenhum aviso.
  const antigo = { id: 'velho', tipo: 'pista', titulo: 'Pegada', x: .5, y: .5 };
  assert.equal(podeVerCartao(antigo, joao), true);
  assert.equal(cartoesVisiveis([antigo], joao).length, 1);
});

test('quem não está na mesa não vê cartão nenhum', () => {
  assert.equal(podeVerCartao(cartaoNovo({ id: 'c1' }), null), false);
  assert.deepEqual(cartoesVisiveis([cartaoNovo({ id: 'c1' })], null), []);
});

test('o resumo diz em uma linha quem está vendo', () => {
  const nomes = { r1: 'Rafael', h1: 'Henrique', j1: 'João' };
  const aberto = cartaoNovo({ id: 'c1' });
  assert.equal(resumoDeQuemVe(aberto, nomes), 'Toda a mesa');

  let cartoes = alternarPessoaNoCartao([aberto], 'c1', 'r1');
  assert.equal(resumoDeQuemVe(cartoes[0], nomes), 'Só Rafael');

  cartoes = alternarPessoaNoCartao(cartoes, 'c1', 'h1');
  assert.equal(resumoDeQuemVe(cartoes[0], nomes), 'Rafael e Henrique');

  cartoes = alternarPessoaNoCartao(cartoes, 'c1', 'j1');
  assert.equal(resumoDeQuemVe(cartoes[0], nomes), 'Rafael, Henrique e João');

  // Trancado e sem ninguém nomeado é um estado real: o Mestre está montando.
  const trancado = liberarCartaoParaTodos([cartaoNovo({ id: 'c2' })], 'c2', false)[0];
  assert.equal(resumoDeQuemVe(trancado, nomes), 'Ninguém ainda');
});

test('a fotografia é um tipo de cartão e carrega imagem', () => {
  const foto = cartaoNovo({ id: 'f1', tipo: 'fotografia', titulo: 'O retrato na escrivaninha' });
  assert.equal(foto.tipo, 'fotografia');
  assert.equal(foto.imagem, '', 'a fotografia nasce com lugar para a imagem');
  assert.equal(cartaoTemImagem(foto), true);
  // Os outros tipos não ganham campo de imagem à toa.
  assert.equal(cartaoTemImagem(cartaoNovo({ id: 'p1', tipo: 'pista' })), false);
  assert.ok(TIPOS_DE_CARTAO.some(t => t.id === 'fotografia'), 'o tipo precisa estar na lista');
});

/* ───────────────────────────────────────────────────────────────────────
   O QUE CADA UM PREGOU É DE QUEM PREGOU

   Um jogador pregou uma nota por engano e não achou como despregar: o
   "Tirar do mural" morava dentro do modo de edição, atrás de um duplo
   clique no título. E, achando, ele poderia despregar o cartão do colega
   também, porque a tela dava a mesma permissão a todo mundo.
   ─────────────────────────────────────────────────────────────────────── */

test('o autor mexe no que é dele; o Admin, em tudo', () => {
  const admin = { uid: 'u-admin', papel: 'mestre' };
  const ana = { uid: 'u-ana', papel: 'jogador' };
  const bob = { uid: 'u-bob', papel: 'jogador' };
  const daAna = { id: 'c1', autor: 'u-ana' };

  assert.equal(podeMexerNoCartao(daAna, ana), true);
  assert.equal(podeMexerNoCartao(daAna, bob), false);
  assert.equal(podeMexerNoCartao(daAna, admin), true);
});

test('cartão sem autor é de antes da regra e fica com o Admin', () => {
  // Liberar os antigos para qualquer um seria abrir a exceção justamente
  // nos cartões em que a investigação já construiu em cima.
  const antigo = { id: 'c0' };
  assert.equal(podeMexerNoCartao(antigo, { uid: 'u-ana', papel: 'jogador' }), false);
  assert.equal(podeMexerNoCartao(antigo, { uid: 'u-admin', papel: 'mestre' }), true);
  // E nem uid vazio casa com autor vazio.
  assert.equal(podeMexerNoCartao(antigo, { uid: '', papel: 'jogador' }), false);
});

test('sem membro, ninguém mexe', () => {
  assert.equal(podeMexerNoCartao({ autor: 'u-ana' }, null), false);
});

test('descartar está à vista, sem precisar entrar em edição', () => {
  const tela = readFileSync(new URL('../src/features/investigacao/MuralInvestigacao.jsx', import.meta.url), 'utf8');
  assert.match(tela, /className="mural-acao perigo"[\s\S]{0,160}>Descartar<\/button>/,
    'despregar voltou a ficar escondido atrás do modo de edição');
  // E a permissão é por cartão, não uma chave única para a parede toda.
  assert.match(tela, /podeEditar=\{podeMexer\(c\)\}/);
});
