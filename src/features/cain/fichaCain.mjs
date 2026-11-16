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
export const MAX_PECADO = 6;
export const GANCHOS = 3;
export const CAIXAS_DE_GANCHO = 4;
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
    nome: '', xid: '', cid: '', categoria: 'I',
    agenda: '', agendaHabilidade: '',
    blasfemia: '', blasfemiaNotas: '',
    foto: '',
    // Perícias: todas em 0. Psique é à parte e sobe sozinha.
    pericias: Object.fromEntries(PERICIAS.map(p => [p.id, 0])),
    psique: 1,
    // Corpo e psique
    estresse: 0, ferimentos: 0, pulsos: MAX_PULSOS, pecado: 0, piedade: 0,
    ganchos: Array.from({ length: GANCHOS }, () => ({ nome: '', cortes: 0 })),
    aflicoes: '',
    condicoes: [],
    // Kit, vínculo, avanço
    kit: [], vinculo: '', vinculoNivel: 0,
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
 * Marcar estresse.
 *
 * No limite, vira ferimento e o estresse zera — é assim no livro, e é a parte
 * que mais se esquece de implementar: sem isso o estresse cresce para sempre e
 * o ferimento nunca chega.
 */
export function marcarEstresse(ficha, quantidade = 1) {
  const bruto = (Number(ficha.estresse) || 0) + Math.trunc(quantidade);
  if (bruto < MAX_ESTRESSE) return { ...ficha, estresse: Math.max(0, bruto) };
  return ganharFerimento({ ...ficha, estresse: 0 });
}

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
  if ((Number(ficha?.estresse) || 0) >= MAX_ESTRESSE - 1) return { chave: 'no-limite', rotulo: 'No limite', cor: '#C79A3C' };
  return { chave: 'inteiro', rotulo: 'Em campo', cor: '#6F8F6A' };
}

/** As condições ativas, com nome e cor, para a tela não procurar. */
export const condicoesDaFicha = ficha =>
  (ficha?.condicoes || []).map(id => CONDICOES.find(c => c.id === id)).filter(Boolean);
