/**
 * A ROLAGEM DA NOITE
 *
 * Numa one-shot ninguém decora a ficha: a mesa dura uma sessão, metade das
 * pessoas nunca jogou este sistema, e o bônus de cada competência muda
 * conforme o atributo e o reforço. Pedir "some sua competência" é pedir uma
 * conta errada — e conta errada num teste de Pavor custa a cena.
 *
 * Então o dado PERGUNTA qual é a ação e faz a conta sozinho. A pessoa escolhe
 * "Furtividade" e o bônus entra no resultado; ela não precisa saber que
 * Furtividade escala de Agilidade e reforça com Percepção.
 *
 * O EFEITO NA TELA vem junto, e é por isso que a escolha acontece ANTES da
 * rolagem e não depois: investigar acende uma lupa, esconder-se apaga a luz,
 * resistir ao medo treme a tela. Se a competência fosse informada depois do
 * resultado, o efeito chegaria quando a cena já passou.
 */
import {
  COMPETENCIAS, DIFICULDADES, valorDaCompetencia, reforcoAtivo, ATRIBUTOS,
} from './fichaOneShot.mjs';

/**
 * O clima de cada competência, para a tela saber o que fazer.
 *
 * Três e só três, porque foram os três que a mesa pediu e porque efeito
 * demais vira ruído: a terceira vez que a tela treme, ninguém olha mais.
 * Competência sem clima rola sem efeito nenhum, e está certo assim.
 */
export const CLIMAS = Object.freeze({
  lupa: 'lupa',
  escuro: 'escuro',
  tremor: 'tremor',
});

const CLIMA_DA_COMPETENCIA = Object.freeze({
  investigacao: CLIMAS.lupa,
  ocultismo: CLIMAS.lupa,
  medicina: CLIMAS.lupa,
  furtividade: CLIMAS.escuro,
  // Vontade não é competência, é o atributo que sustenta resistir ao medo.
  // Quem resiste rola Ocultismo ou Sobrevivência conforme a cena, mas o
  // tremor é da RESISTÊNCIA, então ele vem pelo tipo de teste, abaixo.
});

export const climaDaCompetencia = id => CLIMA_DA_COMPETENCIA[id] || '';

/** Teste de resistir ao medo: treme a tela, qualquer que seja a competência. */
export const CLIMA_DO_PAVOR = CLIMAS.tremor;

/**
 * O que a mesa escolhe antes de rolar.
 *
 * `bonus` já é o número que entra na soma — a tela não recalcula nada, e é
 * isso que garante que o que aparece no resultado é o que a ficha diz.
 */
export function opcoesDeRolagem(ficha) {
  if (!ficha) return [];
  return COMPETENCIAS.map(c => {
    const bonus = valorDaCompetencia(ficha, c.id);
    return {
      id: c.id,
      nome: c.nome,
      bonus,
      reforcado: reforcoAtivo(ficha, c.id),
      clima: climaDaCompetencia(c.id),
      // De onde vem, para a pessoa entender a conta sem abrir a ficha.
      vemDe: c.de.map(a => ATRIBUTOS.find(x => x.id === a)?.nome).filter(Boolean).join(' ou '),
    };
  });
}

/** O bônus de uma competência nesta ficha. Sem ficha ou sem id, zero. */
export function bonusDaAcao(ficha, idDaCompetencia) {
  if (!ficha || !idDaCompetencia) return 0;
  const existe = COMPETENCIAS.some(c => c.id === idDaCompetencia);
  return existe ? valorDaCompetencia(ficha, idDaCompetencia) : 0;
}

/**
 * O resultado lido pelas regras da casa.
 *
 * O 20 e o 1 naturais mandam no resultado mesmo com bônus: é regra escrita
 * das Regras, e repetir a conta aqui em vez de confiar no total é o que
 * impede um bônus alto de transformar 1 natural em sucesso.
 */
export function lerResultado({ dado, bonus = 0, alvo } = {}) {
  const natural = Number(dado);
  const soma = natural + Number(bonus || 0);
  const critico = natural === 20;
  const falhaCritica = natural === 1;
  const dificuldade = Number(alvo);
  const temAlvo = Number.isFinite(dificuldade);

  let passou = null;
  if (critico) passou = true;
  else if (falhaCritica) passou = false;
  else if (temAlvo) passou = soma >= dificuldade;

  return Object.freeze({
    natural,
    total: soma,
    passou,
    critico,
    falhaCritica,
    // 1 natural cobra 1 de Pavor: errar feio na frente do que está ali custa
    // mais do que a tentativa.
    custaPavor: falhaCritica,
  });
}

/** As dificuldades, para a tela não inventar números próprios. */
export const ALVOS = DIFICULDADES;
