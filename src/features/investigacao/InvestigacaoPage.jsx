import { useCallback, useEffect, useMemo, useState } from 'react';
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { setDoc, deleteDoc } from 'firebase/firestore';
import { col, docIn } from '../../core/campaign';
import { useMembro } from '../acesso/useMembro';
import { observarLiberados } from '../acesso/observarLiberados';
import MuralInvestigacao from './MuralInvestigacao';
import { cartoesVisiveis, chaveDaLigacao, podeMexerNoCartao } from './mural.mjs';
import { ehMestre } from '../../core/acesso.mjs';

/**
 * A PÁGINA DO MURAL
 *
 * Guarda cada cartão como um documento e cada barbante como outro. Documento
 * por cartão, e não um documento grande com tudo dentro: seis pessoas mexendo
 * no mesmo mural ao mesmo tempo sobrescreveriam o trabalho umas das outras a
 * cada movimento — a última escrita venceria e o resto sumiria.
 */
export default function InvestigacaoPage() {
  const { membro, carregando } = useMembro();
  const [cartoes, setCartoes] = useState([]);
  const [ligacoes, setLigacoes] = useState([]);
  const [fichas, setFichas] = useState([]);

  useEffect(() => {
    // As fichas alimentam a lista de "quem pode ver". Só o Mestre precisa
    // dela, mas a leitura é a mesma que a aba Fichas já faz — e é barata.
    const u0 = onSnapshot(col('fichas'), snap => {
      setFichas(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    }, () => {});
    // O mural escapava por sorte: cartão nasce aberto, então a consulta
    // inteira passava na regra. Bastava o Mestre restringir UM cartão para a
    // parede inteira sumir para os jogadores — uma regra que olha o conteúdo
    // do documento reprova a consulta toda, não filtra. Ver observarLiberados.
    const u1 = observarLiberados('mural_cartoes', membro, setCartoes,
      erro => console.error('Erro ao abrir o mural:', erro));
    const u2 = onSnapshot(col('mural_ligacoes'), snap => {
      setLigacoes(snap.docs.map(d => ({ ...d.data(), chave: d.id })));
    });
    return () => { u0(); u1(); u2(); };
  }, [membro?.uid, membro?.papel]);

  /* Grava só o que mudou. Comparar antes de escrever não é otimização: é o que
     impede uma tela de reescrever os seis cartões a cada movimento de um. */
  const salvarCartoes = useCallback(async novos => {
    const antigos = new Map(cartoes.map(c => [String(c.id), c]));
    const vistos = new Set();
    for (const cartao of novos) {
      vistos.add(String(cartao.id));
      const antigo = antigos.get(String(cartao.id));
      if (antigo && JSON.stringify(antigo) === JSON.stringify(cartao)) continue;
      const { id, ...dados } = cartao;
      await setDoc(docIn('mural_cartoes', String(id)), dados, { merge: true });
    }
    for (const [id] of antigos) {
      if (!vistos.has(id)) await deleteDoc(docIn('mural_cartoes', id));
    }
  }, [cartoes]);

  const salvarLigacoes = useCallback(async novas => {
    const antigas = new Set(ligacoes.map(l => l.chave));
    const vistas = new Set(novas.map(l => l.chave));
    for (const ligacao of novas) {
      if (antigas.has(ligacao.chave)) continue;
      const { chave, ...dados } = ligacao;
      await setDoc(docIn('mural_ligacoes', chave), dados);
    }
    for (const chave of antigas) {
      if (!vistas.has(chave)) await deleteDoc(docIn('mural_ligacoes', chave));
    }
  }, [ligacoes]);

  const mestre = ehMestre(membro);

  // O cartão restrito não fica borrado nem cinza para o jogador: ele não
  // existe naquele mural. É essa a ficção — ele não achou aquilo.
  //
  // O servidor já recusa a leitura; este filtro é o que mantém a tela
  // coerente para quem é Mestre em outra aba, e o que garante que nenhum
  // barbante fique apontando para um cartão que não está lá.
  const meusCartoes = useMemo(() => cartoesVisiveis(cartoes, membro), [cartoes, membro]);

  const normalizadas = useMemo(() => {
    const visiveis = new Set(meusCartoes.map(c => String(c.id)));
    return ligacoes
      .map(l => ({ ...l, chave: l.chave || chaveDaLigacao(l.de, l.para) }))
      .filter(l => visiveis.has(String(l.de)) && visiveis.has(String(l.para)));
  }, [ligacoes, meusCartoes]);

  if (carregando) return <div className="pagina-aviso">Abrindo o mural…</div>;
  if (!membro) {
    return (
      <div className="pagina-aviso">
        <strong>O mural é da mesa.</strong>
        <span>Entre na campanha com a senha dela para ver e mexer nos cartões.</span>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', minHeight: 0, padding: 14, boxSizing: 'border-box' }}>
      <MuralInvestigacao
        cartoes={meusCartoes}
        ligacoes={normalizadas}
        autor={membro.uid}
        mestre={mestre}
        fichas={fichas}
        membro={membro}
        podeMexer={cartao => podeMexerNoCartao(cartao, membro)}
        aoMudarCartoes={salvarCartoes}
        aoMudarLigacoes={salvarLigacoes}
      />
    </div>
  );
}
