/**
 * OS TALENTOS DA NOITE
 *
 * Numa one-shot não se evolui: a ficha que entra é a ficha que sai. O talento
 * é a única coisa que cada pessoa tem e mais ninguém — não um bônus a mais em
 * número, mas uma permissão para quebrar uma regra uma vez.
 *
 * Por isso quase todos são UMA VEZ POR NOITE. Talento que vale sempre vira
 * conta e some na planilha; talento que vale uma vez vira decisão, e a mesa
 * lembra dela. O jogador que guarda "Vontade Maior" até a hora certa tomou a
 * melhor decisão da noite dele.
 *
 * São dez e cada pessoa fica com um. Dez para que uma mesa de seis escolha
 * sem repetir e ainda sobrem quatro — repetir talento é a única coisa que
 * apaga a graça disto, porque o talento é o que diferencia duas fichas que no
 * resto são gente comum.
 *
 * `quando` existe para o Mestre não ter de interpretar no susto: diz em que
 * momento o jogador pode falar, e todos valem só se ele falar ANTES do dado
 * sair da mão, menos os que dizem o contrário.
 */

/** Cada pessoa fica com um. O Mestre pode abrir mão disto se quiser. */
export const TALENTOS_POR_PERSONAGEM = 1;

export const TALENTOS = Object.freeze([
  {
    id: 'calmaria',
    nome: 'Calmaria em Perigo',
    resumo: 'O lugar não pesa contra você.',
    efeito: 'Uma vez por noite, um teste difícil não sofre a desvantagem que o '
      + 'ambiente impunha: o escuro, o barulho, o cheiro, a coisa olhando. A '
      + 'dificuldade continua a mesma; o que sai é a penalidade por estar ali.',
    quando: 'Antes de rolar.',
    limite: 'uma vez por noite',
  },
  {
    id: 'vontade-maior',
    nome: 'Vontade Maior',
    resumo: 'Uma ação que simplesmente dá certo.',
    efeito: 'Uma vez por noite, declare uma ação ao seu alcance e ela passa sem '
      + 'rolagem. Não serve para desfazer o que já aconteceu nem para exigir o '
      + 'impossível — serve para garantir o que era possível.',
    quando: 'Antes de rolar, sempre. Dado na mesa cancela o talento.',
    limite: 'uma vez por noite',
  },
  {
    id: 'protetor',
    nome: 'O Protetor',
    resumo: 'Você chega a tempo.',
    efeito: 'Quando um aliado perto de você está prestes a morrer ou se ferir, '
      + 'role um dado de auxílio imediato. Passando, você o tira do perigo; '
      + 'falhando, ainda assim o prejuízo vem menor — e parte dele vem para você.',
    quando: 'Na hora, interrompendo a cena. O aliado precisa estar ao alcance.',
    limite: 'uma vez por noite',
  },
  {
    id: 'inabalavel',
    nome: 'Vontade Inabalável',
    resumo: 'Errar feio não te para.',
    efeito: 'Ao tirar 1 natural, role outra vez e fique com o segundo resultado. '
      + 'A falha crítica ainda cobra o Pavor dela: você não deixou de errar, '
      + 'você deixou de parar por causa disso.',
    quando: 'Logo depois do 1 natural.',
    limite: 'uma vez por noite',
  },
  {
    id: 'mao-firme',
    nome: 'Mão que Não Treme',
    resumo: 'O medo não chega aos seus dedos.',
    efeito: 'Uma vez por noite, faça um teste como se a sua SANIDADE estivesse '
      + 'em zero — sem a desvantagem, sem a vista embaçada. Vale para o teste '
      + 'inteiro, inclusive se ele for longo.',
    quando: 'Antes de rolar.',
    limite: 'uma vez por noite',
  },
  {
    id: 'ouvido',
    nome: 'Ouvido para o Errado',
    resumo: 'Você pergunta e a casa responde.',
    efeito: 'Uma vez por noite, faça ao Mestre uma pergunta de sim ou não sobre '
      + 'a cena em que você está. Ele responde a verdade. Não pergunte o que a '
      + 'coisa é — pergunte se ela ainda está aqui.',
    quando: 'A qualquer momento da cena.',
    limite: 'uma vez por noite',
  },
  {
    id: 'sangue-frio',
    nome: 'Sangue Frio',
    resumo: 'Você registra depois.',
    efeito: 'Uma vez por noite, ignore 1 ponto de dano de qualquer origem. Você '
      + 'sente na hora seguinte, não nesta: a ferida existe, mas não te derruba '
      + 'agora.',
    quando: 'Ao receber o dano.',
    limite: 'uma vez por noite',
  },
  {
    id: 'lembranca',
    nome: 'O Que Ninguém Lembra',
    resumo: 'Você já esteve em um lugar assim.',
    efeito: 'Uma vez por noite, declare um detalhe pequeno e verdadeiro sobre o '
      + 'lugar: onde fica a outra saída, de que lado abre a janela, o que há '
      + 'embaixo da escada. Se for plausível, o Mestre aceita e aquilo passa a '
      + 'existir.',
    quando: 'A qualquer momento, menos no meio de uma rolagem.',
    limite: 'uma vez por noite',
  },
  {
    id: 'ultimo-folego',
    nome: 'Último Fôlego',
    resumo: 'Você ainda não acabou.',
    efeito: 'Ao chegar a zero de vida, continue agindo por mais um turno antes '
      + 'de cair. Um turno inteiro, para fazer a única coisa que ainda importa.',
    quando: 'Na hora em que a vida zera.',
    limite: 'uma vez por noite',
  },
  {
    id: 'ancora',
    nome: 'Âncora',
    resumo: 'Sua voz traz a pessoa de volta.',
    efeito: 'Uma vez por noite, falando com um aliado que possa te ouvir, tire 1 '
      + 'ponto de SANIDADE dele. Precisa ser dito em voz alta, na mesa, pelo '
      + 'seu personagem.',
    quando: 'A qualquer momento em que dê para falar.',
    limite: 'uma vez por noite',
  },
]);

/** O talento pelo id, ou nada. */
export const talentoPorId = id => TALENTOS.find(t => t.id === id) || null;

/** O nome para mostrar, caindo no texto livre quando o Mestre inventou um. */
export function nomeDoTalento(ficha) {
  const doCatalogo = talentoPorId(ficha?.talento);
  if (doCatalogo) return doCatalogo.nome;
  return String(ficha?.talento || '').trim();
}

/**
 * Quais talentos já estão com outra pessoa.
 *
 * Repetir talento é o que apaga a graça: duas fichas de gente comum só se
 * diferenciam por isto. Então a ficha MOSTRA quem já pegou o quê, em vez de
 * impedir — o Mestre pode ter motivo para deixar repetir, e a tela não é o
 * lugar de discutir com ele.
 */
export function talentosTomados(fichas, idDaFichaAtual) {
  const tomados = new Map();
  for (const ficha of fichas || []) {
    if (!ficha || ficha.id === idDaFichaAtual) continue;
    const id = String(ficha.talento || '').trim();
    if (!id || !talentoPorId(id)) continue;
    if (!tomados.has(id)) tomados.set(id, []);
    tomados.get(id).push(String(ficha.nome || '').trim() || 'sem nome');
  }
  return tomados;
}
