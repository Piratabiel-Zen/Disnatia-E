/**
 * OS ESCONDERIJOS MARCADOS
 *
 * O Mestre aponta, durante a cena, um lugar onde dá para se enfiar: atrás
 * do armário do sótão, embaixo da mesa coberta, no vão da escada. Nasce um
 * ponto branco minúsculo, como uma estrela, que pisca DOIS SEGUNDOS e
 * some.
 *
 * Some de verdade. A primeira versão deixava a estrela acesa depois do
 * pulso, achando que servia de lembrete, e o que aconteceu no teste de
 * mesa foi o previsível: cada cena acumulava pontos sobre o mapa até ele
 * virar um céu estrelado e nenhum deles querer dizer nada.
 *
 * O ponto é um GESTO, não um marcador. Vale enquanto o Mestre está
 * falando daquele canto — "dá para entrar ali" — e morre junto com a
 * frase. Por isso também não há botão de apagar: não existe nada para
 * apagar dois segundos depois.
 *
 * E ele não diz se o esconderijo é bom. Só diz "aqui tem alguma coisa" —
 * o resto o Mestre fala, e a dúvida é metade da cena.
 */

/** Quanto o pulso dura. O limite que Gabriel pediu, em milissegundos. */
export const DURACAO_DO_PULSO = 2000;

/* Dois pontos a menos de 1,5% de distância são, na prática, o mesmo lugar:
   cliques repetidos num mapa grande ficam assim. Sem isto, um toque trêmulo
   deixa três estrelas empilhadas no mesmo armário. */
const PERTO_DEMAIS = 1.5;

const emFaixa = n => Math.max(0, Math.min(100, Number(n) || 0));

/** Uma marca nova, nas coordenadas percentuais do mapa. */
export function marcaNova({ x, y, mapa, por = '', agora = Date.now() }) {
  const onde = String(mapa || '').trim();
  if (!onde) return null;
  return {
    x: Math.round(emFaixa(x) * 100) / 100,
    y: Math.round(emFaixa(y) * 100) / 100,
    mapa: onde,
    por: String(por || ''),
    em: Number(agora) || 0,
  };
}

/** Se o pulso dessa marca ainda está correndo. */
export function aindaPulsando(marca, agora = Date.now()) {
  if (!marca?.em) return false;
  const passou = (Number(agora) || 0) - Number(marca.em);
  return passou >= 0 && passou < DURACAO_DO_PULSO;
}

/**
 * As marcas VIVAS de um mapa.
 *
 * O corte por tempo acontece aqui, e não só na tela, porque é a mesma
 * resposta para as duas perguntas que importam: o que desenhar agora, e o
 * que já pode ser apagado do banco. Deixar a tela esconder e o banco
 * guardar seria juntar lixo que ninguém vê.
 */
export function marcasDoMapa(marcas, mapaId, agora = Date.now()) {
  const onde = String(mapaId || '');
  if (!onde) return [];
  const boas = [];
  for (const m of marcas || []) {
    if (!m || String(m.mapa || '') !== onde) continue;
    if (!Number.isFinite(Number(m.x)) || !Number.isFinite(Number(m.y))) continue;
    if (!aindaPulsando(m, agora)) continue;
    const repetida = boas.some(b =>
      Math.hypot(Number(b.x) - Number(m.x), Number(b.y) - Number(m.y)) < PERTO_DEMAIS);
    if (!repetida) boas.push(m);
  }
  return boas;
}

/** O que já passou dos dois segundos e pode sair do banco. */
export function marcasVencidas(marcas, agora = Date.now()) {
  return (marcas || []).filter(m => m?.id && !aindaPulsando(m, agora));
}
