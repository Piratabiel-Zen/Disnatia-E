// A FICHA DE EXORCISTA
//
// A forma da ficha e as travas do sistema, sem React, para poder ser testada
// sozinha. A ficha do CAIN não é uma lista de campos: é um formulário de uma
// burocracia oculta, e várias regras moram nela em vez de na cabeça do Mestre
// — no máximo duas perícias em 3, estresse que limpa ao ganhar ferimento,
// gancho que precisa ser resolvido quando enche. Essas regras ficam aqui.

import { CONDICOES, MAX_PERICIAS_EM_TRES, PERICIAS } from '../../core/sistemas/cain/index.mjs';
import { MAX_PIEDADE } from '../../core/sistemas/cain/regras.mjs';

export const MAX_PERICIA = 3;
export const MAX_ESTRESSE = 6;
export const MAX_FERIMENTOS = 3;
export const MAX_PULSOS = 4;
export const PULSOS_INICIAIS = 3;
export const MAX_PECADO = 6;
export const GANCHOS = 3;
/* O gancho é um talismã curtinho: três traços e ele enche. */
export const CAIXAS_DE_GANCHO = 3;
export const MAX_CATEGORIA = 5;
/* Cinco pontos de kit por missão, e o inventário é abstrato: não se decide o
   que levar na saída, gasta-se ponto na hora em que o item faz falta. */
export const MAX_PONTOS_KIT = 5;
export const TETO_DA_BAGAGEM = 24;
export const MAX_XP = 9;
export const MAX_AVANCOS = 3;

const limitar = (valor, minimo, maximo) =>
  Math.max(minimo, Math.min(maximo, Math.trunc(Number(valor) || 0)));

/** Uma ficha em branco, do jeito que o livro manda começar. */
export function fichaNova(id) {
  return {
    id: String(id),
    sistema: 'cain',
    dono: '',
    // Registro
    nome: '', xid: '', cid: '', categoria: 'I', cat: 1,
    agenda: '', agendaHabilidade: '',
    blasfemia: '', blasfemiaNotas: '',
    foto: '',
    // Perícias: todas em 0. Psique é à parte e sobe sozinha.
    pericias: Object.fromEntries(PERICIAS.map(p => [p.id, 0])),
    psique: 1,
    // Corpo e psique
    estresse: 0, ferimentos: 0, pulsos: PULSOS_INICIAIS, pecado: 0, piedade: 0,
    ganchos: Array.from({ length: GANCHOS }, () => ({ nome: '', cortes: 0 })),
    aflicoes: '',
    condicoes: [],
    // Kit, vínculo, avanço
    kit: [], pontosDeKit: MAX_PONTOS_KIT, vinculo: '', vinculoNivel: 0,
    xp: 0, avancos: 0,
    // Narrativa
    historia: '', notas: '',
    // Só o dono e o Admin veem.
    segredos: '',
    // Controle de Agonia Divina
    agoniaUsadaNaSessao: false,
  };
}

/* ───────────────────────────── perícias ───────────────────────────── */

/** Quantas perícias estão no 3. O livro diz que são no máximo duas. */
export const periciasNoMaximo = ficha =>
  PERICIAS.filter(p => Number(ficha?.pericias?.[p.id]) >= MAX_PERICIA).length;

/**
 * Esta perícia pode subir?
 *
 * Devolve o motivo junto, porque "o botão está apagado e eu não sei por quê"
 * é pior do que não ter botão. O jogador precisa ler a regra na hora.
 */
export function podeSubirPericia(ficha, periciaId) {
  const atual = Number(ficha?.pericias?.[periciaId]) || 0;
  if (atual >= MAX_PERICIA) return { pode: false, motivo: 'Já está no máximo.' };
  if (atual === MAX_PERICIA - 1 && periciasNoMaximo(ficha) >= MAX_PERICIAS_EM_TRES) {
    return { pode: false, motivo: `Um exorcista tem no máximo ${MAX_PERICIAS_EM_TRES} perícias em ${MAX_PERICIA}.` };
  }
  return { pode: true, motivo: '' };
}

/**
 * Mexe numa perícia respeitando o teto de duas em 3.
 *
 * A trava é conferida contra o ALVO, não contra o passo. Conferindo o passo,
 * um delta grande (+9, ou um campo numérico colado) pularia de 0 direto para
 * 3 sem nunca passar pelo 2, e a mesa ganharia uma terceira perícia no topo
 * sem ninguém notar.
 */
export function ajustarPericia(ficha, periciaId, delta) {
  const atual = Number(ficha?.pericias?.[periciaId]) || 0;
  let alvo = limitar(atual + delta, 0, MAX_PERICIA);
  if (alvo >= MAX_PERICIA && atual < MAX_PERICIA && periciasNoMaximo(ficha) >= MAX_PERICIAS_EM_TRES) {
    alvo = MAX_PERICIA - 1;
  }
  return { ...ficha, pericias: { ...ficha.pericias, [periciaId]: alvo } };
}

/* ───────────────────────── corpo e psique ───────────────────────── */

/**
 * O teto do talismã de execução desta ficha.
 *
 * Começa em 6 e perde uma caixa por ferimento carregado. É por isso que o
 * segundo ferimento chega bem mais rápido que o primeiro: o exorcista ferido
 * não aguenta o mesmo tanto de estresse que aguentava inteiro.
 */
export const estresseMaximo = ficha =>
  Math.max(1, MAX_ESTRESSE - (Number(ficha?.ferimentos) || 0));

/**
 * Marcar estresse.
 *
 * No limite o talismã enche: vira ferimento, o estresse zera e o que sobrou
 * transborda para o talismã novo — que já é menor, porque o ferimento comeu
 * uma caixa. Sem o transbordo, um golpe pesado custaria exatamente o mesmo
 * que um arranhão, e é essa diferença que faz a cena de conflito ter peso.
 *
 * À beira da morte o transbordo para: pelo livro, quem está nos três
 * ferimentos e marca qualquer estresse morre na hora — quem decide isso é a
 * mesa, narrando, e não uma conta rodando sozinha aqui dentro.
 */
export function marcarEstresse(ficha, quantidade = 1) {
  let atual = { ...ficha };
  let restante = Math.trunc(quantidade);

  if (restante <= 0) {
    return { ...atual, estresse: Math.max(0, (Number(atual.estresse) || 0) + restante) };
  }

  // Cada volta do laço enche no máximo um talismã, e encher um talismã sempre
  // soma um ferimento — que tem teto. O laço termina.
  for (let volta = 0; volta <= MAX_FERIMENTOS; volta += 1) {
    const teto = estresseMaximo(atual);
    const bruto = (Number(atual.estresse) || 0) + restante;
    if (bruto < teto) return { ...atual, estresse: bruto };

    restante = bruto - teto;
    atual = ganharFerimento({ ...atual, estresse: 0 });
    if ((Number(atual.ferimentos) || 0) >= MAX_FERIMENTOS) return { ...atual, estresse: 0 };
    if (restante <= 0) return atual;
  }
  return { ...atual, estresse: 0 };
}

/* ─────────────────────────── A BAGAGEM ───────────────────────────
   O kit do livro é abstrato — cinco pontos e pronto. Mas durante a caçada o
   exorcista recolhe coisas em campo, e isso tem que morar em algum lugar que
   não seja a memória de quem está jogando. É essa a função da bagagem: uma
   lista simples, do dono da ficha, com o que ele está carregando.

   Linha vazia não entra, e item repetido não duplica: as duas coisas que uma
   lista digitada à mão acumula sozinha em duas sessões. */

const itemLimpo = nome => String(nome || '').trim().slice(0, 80);
const mesmaCoisa = (a, b) => itemLimpo(a).toLowerCase() === itemLimpo(b).toLowerCase();

export function guardarNaBagagem(ficha, nome) {
  const limpo = itemLimpo(nome);
  const bagagem = Array.isArray(ficha?.kit) ? ficha.kit : [];
  if (!limpo || bagagem.length >= TETO_DA_BAGAGEM) return ficha;
  if (bagagem.some(item => mesmaCoisa(item?.nome ?? item, limpo))) return ficha;
  return {
    ...ficha,
    kit: [...bagagem, { id: `i${Date.now().toString(36)}${bagagem.length}`, nome: limpo }],
  };
}

export function tirarDaBagagem(ficha, id) {
  const bagagem = Array.isArray(ficha?.kit) ? ficha.kit : [];
  return { ...ficha, kit: bagagem.filter(item => String(item?.id) !== String(id)) };
}

/**
 * Fichas antigas guardavam o kit como lista de texto puro. Normaliza para o
 * formato com id, sem perder o que já estava escrito.
 */
export const bagagemDe = ficha => (Array.isArray(ficha?.kit) ? ficha.kit : [])
  .map((item, i) => (typeof item === 'string'
    ? { id: `antigo${i}`, nome: item }
    : { id: String(item?.id ?? `antigo${i}`), nome: itemLimpo(item?.nome) }))
  .filter(item => item.nome);

/**
 * A perícia PSIQUE não é escolhida: é metade da categoria, arredondada para
 * cima. Fica calculada para a ficha não deixar a mesa discutindo uma conta
 * que o livro já fez.
 */
export const psiqueDaCategoria = cat =>
  Math.max(1, Math.ceil(limitar(cat, 1, MAX_CATEGORIA) / 2));

/** Ganhar ferimento limpa o estresse e pode levar à beira da morte. */
export function ganharFerimento(ficha) {
  const ferimentos = limitar((Number(ficha.ferimentos) || 0) + 1, 0, MAX_FERIMENTOS);
  const beiraDaMorte = ferimentos >= MAX_FERIMENTOS;
  const condicoes = new Set(ficha.condicoes || []);
  condicoes.add('ferido');
  if (beiraDaMorte) condicoes.add('beira-da-morte');
  return {
    ...ficha, ferimentos, estresse: 0,
    condicoes: [...condicoes],
    piedade: limitar((Number(ficha.piedade) || 0) + 1, 0, MAX_PIEDADE),
  };
}

/** Acumular pecado. No limite, o exorcista verte no fim da cena. */
export function marcarPecado(ficha, quantidade = 1) {
  const pecado = limitar((Number(ficha.pecado) || 0) + quantidade, 0, MAX_PECADO);
  const condicoes = new Set(ficha.condicoes || []);
  if (pecado >= MAX_PECADO) condicoes.add('vertendo'); else condicoes.delete('vertendo');
  return { ...ficha, pecado, condicoes: [...condicoes] };
}

/** Gastar um pulso psíquico para usar os poderes (+1D). */
export function gastarPulso(ficha) {
  const pulsos = Number(ficha.pulsos) || 0;
  if (pulsos <= 0) return { ficha, gastou: false, motivo: 'Sem pulsos psíquicos.' };
  return { ficha: { ...ficha, pulsos: pulsos - 1 }, gastou: true, motivo: '' };
}

/* ───────────────────────────── ganchos ───────────────────────────── */

/**
 * Cortar um gancho. Cheio, tem que ser apagado e resolvido.
 *
 * Devolve `encheu` para a tela poder avisar na hora: um gancho que enche sem
 * ninguém perceber é uma consequência que a mesa deixou de jogar.
 */
export function cortarGancho(ficha, indice) {
  const ganchos = (ficha.ganchos || []).map((g, i) => (
    i === indice ? { ...g, cortes: limitar((Number(g.cortes) || 0) + 1, 0, CAIXAS_DE_GANCHO) } : g
  ));
  const encheu = (ganchos[indice]?.cortes || 0) >= CAIXAS_DE_GANCHO;
  // Encher um gancho dá piedade, pelo livro.
  const piedade = encheu
    ? limitar((Number(ficha.piedade) || 0) + 1, 0, MAX_PIEDADE)
    : (Number(ficha.piedade) || 0);
  return { ficha: { ...ficha, ganchos, piedade }, encheu };
}

/** Apagar um gancho resolvido: volta a zero e fica livre para outro nome. */
export function resolverGancho(ficha, indice) {
  const ganchos = (ficha.ganchos || []).map((g, i) => (
    i === indice ? { nome: '', cortes: 0 } : g
  ));
  return { ...ficha, ganchos };
}

/* ───────────────────────────── avanço ───────────────────────────── */

/** Cada 4 de XP vira um avanço. As perguntas de fim de sessão ficam na tela. */
export function marcarXP(ficha, quantidade = 1) {
  const total = (Number(ficha.xp) || 0) + Math.trunc(quantidade);
  const avancosGanhos = Math.floor(total / 4);
  return {
    ...ficha,
    xp: limitar(total % 4, 0, MAX_XP),
    avancos: limitar((Number(ficha.avancos) || 0) + avancosGanhos, 0, MAX_AVANCOS),
  };
}

/* ─────────────────────────── apresentação ─────────────────────────── */

/** O estado do exorcista numa linha, para a lista e para o mapa. */
export function estadoDoExorcista(ficha) {
  const lista = new Set(ficha?.condicoes || []);
  if (lista.has('beira-da-morte')) return { chave: 'beira-da-morte', rotulo: 'À beira da morte', cor: '#8E1F2B' };
  if (lista.has('vertendo')) return { chave: 'vertendo', rotulo: 'Vertendo pecado', cor: '#5B2C6F' };
  if ((Number(ficha?.ferimentos) || 0) > 0) return { chave: 'ferido', rotulo: 'Ferido', cor: '#B4543A' };
  if ((Number(ficha?.estresse) || 0) >= estresseMaximo(ficha) - 1) return { chave: 'no-limite', rotulo: 'No limite', cor: '#C79A3C' };
  return { chave: 'inteiro', rotulo: 'Em campo', cor: '#6F8F6A' };
}

/** As condições ativas, com nome e cor, para a tela não procurar. */
export const condicoesDaFicha = ficha =>
  (ficha?.condicoes || []).map(id => CONDICOES.find(c => c.id === id)).filter(Boolean);
