import { query, where } from 'firebase/firestore';
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { col } from '../../core/campaign';
import { ehMestre } from '../../core/acesso.mjs';

/**
 * ACOMPANHA UMA COLEÇÃO DE ACESSO SELETIVO.
 *
 * Por que isto não é um onSnapshot simples:
 *
 * No Firestore, uma regra de leitura que olha `resource.data` NÃO filtra uma
 * consulta — ela a reprova inteira. Pedir "todos os documentos da mesa" sendo
 * jogador faz o servidor avaliar a regra documento a documento e, no primeiro
 * que o jogador não pode ver, a ESCUTA TODA é negada. Não voltam os
 * permitidos: não volta nada.
 *
 * Era exatamente este o sintoma. O Mestre liberava um documento para alguém,
 * o jogador abria o Arquivo e via uma gaveta vazia — porque bastava existir um
 * único documento guardado na mesa para a consulta dele morrer antes de
 * chegar ao que era dele. E como a escuta não tinha callback de erro, nem o
 * console dizia nada.
 *
 * O mural escapava por sorte: cartão nasce aberto, então todos passavam na
 * regra e a consulta inteira era aprovada. Na primeira vez que o Mestre
 * restringisse um cartão, o mural dos jogadores sumiria do mesmo jeito.
 *
 * A saída é pedir só o que a regra aprova, em duas consultas que o servidor
 * consegue conferir sem abrir documento nenhum: o que foi liberado para a
 * mesa, e o que tem o meu uid na lista. O Mestre segue com a consulta direta,
 * porque para ele a regra aprova tudo.
 */
export function observarLiberados(colecao, membro, aoMudar, aoFalhar) {
  if (!membro) { aoMudar([]); return () => {}; }

  const entregar = mapa => aoMudar([...mapa.values()]);

  if (ehMestre(membro)) {
    return onSnapshot(
      col(colecao),
      snap => aoMudar(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
      erro => aoFalhar?.(erro),
    );
  }

  // Duas escutas, um resultado. Um documento liberado para a mesa E para mim
  // aparece nas duas, por isso o mapa por id: ele é quem desduplica.
  const porConsulta = [new Map(), new Map()];
  const juntar = () => {
    const todos = new Map();
    for (const parcial of porConsulta) for (const [id, dado] of parcial) todos.set(id, dado);
    entregar(todos);
  };

  const consultas = [
    query(col(colecao), where('liberadoParaTodos', '==', true)),
    query(col(colecao), where('liberadoPara', 'array-contains', String(membro.uid))),
  ];

  const parar = consultas.map((consulta, i) => onSnapshot(
    consulta,
    snap => {
      porConsulta[i] = new Map(snap.docs.map(d => [d.id, { ...d.data(), id: d.id }]));
      juntar();
    },
    erro => aoFalhar?.(erro),
  ));

  return () => { for (const p of parar) p(); };
}
