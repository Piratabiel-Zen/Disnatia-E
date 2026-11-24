/**
 * A PRESSÃO DA NOITE
 *
 * A casa não devia escurecer só quando o Mestre aperta um botão. A queixa
 * da mesa foi exatamente essa: o mapa é bonito, mas não dá medo — ele fica
 * igual enquanto a cena piora.
 *
 * Então a atmosfera passa a ter DUAS fontes, e só uma delas é operada:
 *
 *  - A HORA, que o Mestre vira (ou que o relógio vira sozinho). É a
 *    estrutura da noite: 22h é diferente de 3h da manhã, aconteça o que
 *    acontecer.
 *  - A PRESSÃO, que vem do Pavor acumulado das crianças. Ninguém aperta
 *    nada: quanto mais a mesa se assusta, mais a casa responde. É o que faz
 *    o cenário parecer vivo em vez de cenário.
 *
 * A segunda é a que muda a sensação. Quando um jogador falha feio e toma
 * Pavor, a luz da sala inteira hesita — e ele vê acontecer, sem o Mestre ter
 * tocado em nada. A casa está reagindo a ELE.
 *
 * A pressão NUNCA clareia. Ela só soma ao que a hora já determinou: uma
 * mesa calma vê a noite que o Mestre marcou, e uma mesa apavorada vê pior.
 * O contrário — a casa melhorando porque todos estão bem — tiraria a única
 * direção que esta mecânica tem.
 */
import { PAVOR_MAXIMO, SANIDADE_MAXIMA } from './fichaOneShot.mjs';
import { fasePorId } from './mapasDaCasa.mjs';

/** Quanto a pressão pode somar, no limite. */
export const PESO_DA_PRESSAO = Object.freeze({
  escuridao: 0.26,
  nevoa: 0.1,
  sombras: 0.12,
  instabilidade: 0.7,
});

const entre = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));

/**
 * O quanto a mesa está mal, de 0 a 1.
 *
 * Pavor pesa o dobro da Sanidade porque é o medidor que enche rápido e
 * esvazia: é ele que acompanha a cena. Sanidade é o estrago que fica, anda
 * devagar, e se pesasse igual a casa escureceria de vez na primeira visão e
 * nunca mais aliviaria.
 *
 * É a MÉDIA da mesa e não o pior caso: uma criança apavorada no porão não
 * deveria escurecer a casa para os quatro primos que estão bem na cozinha.
 */
export function pressaoDaMesa(fichas = []) {
  const vivas = (fichas || []).filter(Boolean);
  if (vivas.length === 0) return 0;
  const soma = vivas.reduce((total, f) => {
    const pavor = PAVOR_MAXIMO > 0 ? entre(f.pavor, 0, PAVOR_MAXIMO) / PAVOR_MAXIMO : 0;
    const sanidade = SANIDADE_MAXIMA > 0 ? entre(f.sanidade, 0, SANIDADE_MAXIMA) / SANIDADE_MAXIMA : 0;
    return total + (pavor * 2 + sanidade) / 3;
  }, 0);
  return entre(soma / vivas.length, 0, 1);
}

/**
 * A atmosfera final: a hora, mais o que a mesa está sentindo.
 *
 * Os tetos existem para a casa nunca ficar impossível de ler. Escuridão
 * acima de 0.88 apaga o mapa, e um mapa que não se lê não assusta — irrita,
 * que é outra coisa.
 */
export function atmosferaComPressao(idDaFase, pressao = 0) {
  const fase = fasePorId(idDaFase);
  const p = entre(pressao, 0, 1);
  return Object.freeze({
    fase: fase.id,
    pressao: p,
    escuridao: entre(fase.escuridao + PESO_DA_PRESSAO.escuridao * p, 0, 0.95),
    nevoa: entre(fase.nevoa + PESO_DA_PRESSAO.nevoa * p, 0, 0.42),
    sombras: entre(fase.sombras + PESO_DA_PRESSAO.sombras * p, 0, 0.4),
    instabilidade: entre(fase.instabilidade + PESO_DA_PRESSAO.instabilidade * p, 0.2, 3),
    /* QUANTO AS LUZES BRILHAM E QUANTO ELAS FALHAM.
       Os dois crescem juntos com a noite, e crescem porque a casa escurece:
       numa sala quase preta a mesma lâmpada precisa queimar mais forte para
       continuar sendo lâmpada, e cada falha dela pesa muito mais do que
       pesava no começo, quando ainda havia luz em volta. É por isso que a
       última hora é a que mais pisca — não porque o gerador piorou, mas
       porque agora é só aquilo que existe. */
    brilho: 1 + fase.escuridao * 1.5 + p * 0.55,
    tremor: entre(fase.escuridao * 0.72 + p * 0.3, 0, 0.9),
  });
}

/* ─── O RELÓGIO DA NOITE ──────────────────────────────────────────────
 *
 * A noite anda sozinha, para a pressão não depender de o Mestre lembrar.
 * Ele conduz a cena; virar a hora no meio de uma perseguição é a coisa que
 * mais se esquece de fazer, e é justamente quando mais importa.
 *
 * O relógio é OPCIONAL e o Mestre manda nele: ligou, a noite anda; parou,
 * fica onde está; e ele pode virar a hora na mão a qualquer momento, o que
 * reinicia a contagem a partir dali. Automatismo que tira o controle de
 * quem narra é automatismo errado.
 */

/** Quanto dura cada hora da noite, em minutos de sessão. */
export const MINUTOS_POR_FASE = 45;

export const ORDEM_DAS_FASES = Object.freeze(['estranheza', 'assombracao', 'cacada']);

/**
 * Que hora é agora, dado quando a noite começou.
 *
 * A última fase não vira: depois da Caçada vem o amanhecer, e o amanhecer é
 * o fim da sessão, não mais uma volta no relógio.
 */
export function faseDoRelogio(comecouEm, agora = Date.now(), minutos = MINUTOS_POR_FASE) {
  const inicio = Number(comecouEm);
  if (!Number.isFinite(inicio) || inicio <= 0) return ORDEM_DAS_FASES[0];
  const passados = (agora - inicio) / 60000;
  if (!Number.isFinite(passados) || passados < 0) return ORDEM_DAS_FASES[0];
  const indice = Math.min(ORDEM_DAS_FASES.length - 1, Math.floor(passados / minutos));
  return ORDEM_DAS_FASES[indice];
}

/** Quantos minutos faltam para a próxima hora. Null na última. */
export function minutosAteVirar(comecouEm, agora = Date.now(), minutos = MINUTOS_POR_FASE) {
  const atual = faseDoRelogio(comecouEm, agora, minutos);
  if (atual === ORDEM_DAS_FASES[ORDEM_DAS_FASES.length - 1]) return null;
  const passados = (agora - Number(comecouEm)) / 60000;
  return Math.max(0, Math.ceil(minutos - (passados % minutos)));
}
