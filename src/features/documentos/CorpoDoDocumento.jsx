import { comprimirParaDocumento } from '../../core/media';
import { CAMPOS_POR_TIPO } from './camposDoDocumento.mjs';
import './documentos-tipos.css';

/**
 * CADA DOCUMENTO PARECE O QUE ELE É.
 *
 * Antes os seis tipos eram o mesmo retângulo com um ícone diferente no
 * canto: título, imagem, parágrafo. O tipo era um rótulo, não uma coisa — e
 * um recorte de jornal que se parece com uma carta não funciona como prova
 * na mesa, porque metade do que uma prova diz, ela diz pela forma.
 *
 * Aqui cada tipo tem estrutura própria, e não só cor:
 *
 *   jornal    duas colunas justificadas sob um cabeçalho com filetes
 *   carta     coluna única, entrelinha larga, assinatura à direita
 *   foto      a imagem é o documento; a legenda vem embaixo
 *   relatório grade de campos, monoespaçada, com carimbo
 *   gravação  transcrição com marca de tempo à esquerda
 *   objeto    etiqueta de recolhimento, com furo e barbante
 *
 * Os campos extras (edição, data, remetente, referência) vivem no próprio
 * documento e ficam vazios quando o tipo não os usa. Nenhum é obrigatório:
 * o Mestre preenche o que quiser e o resto some da folha.
 */

function Campos({ tipo, doc, salvar }) {
  const campos = CAMPOS_POR_TIPO[tipo] || [];
  if (!campos.length) return null;
  return (
    <div className="doc-campos">
      {campos.map(c => (
        <label key={c.id}>
          <span>{c.rotulo}</span>
          <input
            value={doc[c.id] || ''} placeholder={c.dica}
            onChange={e => salvar({ ...doc, [c.id]: e.target.value })}
          />
        </label>
      ))}
    </div>
  );
}

/**
 * A fotografia precisa de um lugar real para a imagem, não de um campo de
 * texto com um endereço dentro. Comprimimos para caber no documento do
 * Firestore, que tem teto de 400 KiB — a mesma conta da ficha.
 */
function Anexo({ doc, salvar, rotulo = 'Anexar imagem' }) {
  const receber = async arquivo => {
    if (!arquivo) return;
    const cru = await new Promise(resolver => {
      const leitor = new FileReader();
      leitor.onload = () => resolver(String(leitor.result || ''));
      leitor.readAsDataURL(arquivo);
    });
    const imagem = await comprimirParaDocumento(cru, { largura: 1600, altura: 1600, limite: 230 * 1024 });
    salvar({ ...doc, imagem });
  };
  return (
    <div className="doc-anexo">
      <label className="doc-anexo-botao">
        {doc.imagem ? 'Trocar imagem' : rotulo}
        <input type="file" accept="image/*" onChange={e => receber(e.target.files?.[0])} />
      </label>
      {doc.imagem && (
        <button type="button" className="doc-anexo-tirar" onClick={() => salvar({ ...doc, imagem: '' })}>
          Tirar
        </button>
      )}
    </div>
  );
}

function Texto({ doc, salvar, mestre, classe, dica }) {
  if (!mestre) return <div className={classe}>{doc.corpo}</div>;
  return (
    <textarea
      className={classe} value={doc.corpo} placeholder={dica}
      onChange={e => salvar({ ...doc, corpo: e.target.value })}
    />
  );
}

export default function CorpoDoDocumento({ doc, tipo, mestre, salvar }) {
  const campo = id => doc[id] || '';

  if (tipo === 'jornal') {
    return (
      <div className="doc doc-jornal">
        {mestre && <Campos tipo="jornal" doc={doc} salvar={salvar} />}
        <div className="doc-jornal-folha">
          <header className="doc-jornal-cabeca">
            <b>{campo('veiculo') || 'A Gazeta'}</b>
            <small>{campo('data')}</small>
          </header>
          <h4 className="doc-jornal-manchete">{doc.titulo || 'Sem manchete'}</h4>
          {campo('chamada') && <p className="doc-jornal-chamada">{campo('chamada')}</p>}
          {mestre && <Anexo doc={doc} salvar={salvar} rotulo="Anexar foto da matéria" />}
          {doc.imagem && <img className="doc-jornal-foto" src={doc.imagem} alt="" />}
          <Texto doc={doc} salvar={salvar} mestre={mestre}
                 classe="doc-jornal-colunas" dica="O corpo da matéria…" />
        </div>
      </div>
    );
  }

  if (tipo === 'carta') {
    return (
      <div className="doc doc-carta">
        {mestre && <Campos tipo="carta" doc={doc} salvar={salvar} />}
        <div className="doc-carta-folha">
          <div className="doc-carta-topo">
            {campo('destinatario') && <span>A {campo('destinatario')},</span>}
            {campo('data') && <small>{campo('data')}</small>}
          </div>
          <Texto doc={doc} salvar={salvar} mestre={mestre}
                 classe="doc-carta-texto" dica="O que a carta diz…" />
          {campo('remetente') && <p className="doc-carta-assinatura">{campo('remetente')}</p>}
        </div>
      </div>
    );
  }

  if (tipo === 'foto') {
    return (
      <div className="doc doc-foto">
        {mestre && <Campos tipo="foto" doc={doc} salvar={salvar} />}
        <figure className="doc-foto-moldura">
          {doc.imagem
            ? <img src={doc.imagem} alt={campo('legenda')} />
            : (
              <div className="doc-foto-vazia">
                {mestre ? 'Nenhuma imagem anexada ainda.' : 'A fotografia não foi revelada.'}
              </div>
            )}
          <figcaption>
            {campo('legenda') || doc.titulo}
            {campo('data') && <em>{campo('data')}</em>}
          </figcaption>
        </figure>
        {mestre && <Anexo doc={doc} salvar={salvar} rotulo="Anexar fotografia" />}
        {(mestre || doc.corpo) && (
          <Texto doc={doc} salvar={salvar} mestre={mestre}
                 classe="doc-foto-verso" dica="O que está escrito no verso…" />
        )}
      </div>
    );
  }

  if (tipo === 'relatorio') {
    return (
      <div className="doc doc-relatorio">
        {mestre && <Campos tipo="relatorio" doc={doc} salvar={salvar} />}
        <div className="doc-relatorio-folha">
          <div className="doc-relatorio-grade">
            <span>Ref.<b>{campo('referencia') || '—'}</b></span>
            <span>Data<b>{campo('data') || '—'}</b></span>
            <span>Assunto<b>{doc.titulo || '—'}</b></span>
          </div>
          {campo('classificacao') && (
            <div className="doc-relatorio-carimbo">{campo('classificacao')}</div>
          )}
          {mestre && <Anexo doc={doc} salvar={salvar} rotulo="Anexar anexo do relatório" />}
          {doc.imagem && <img className="doc-relatorio-anexo" src={doc.imagem} alt="" />}
          <Texto doc={doc} salvar={salvar} mestre={mestre}
                 classe="doc-relatorio-texto" dica="O corpo do relatório…" />
        </div>
      </div>
    );
  }

  if (tipo === 'gravacao') {
    return (
      <div className="doc doc-gravacao">
        {mestre && <Campos tipo="gravacao" doc={doc} salvar={salvar} />}
        <div className="doc-gravacao-folha">
          <header className="doc-gravacao-cabeca">
            <span className="doc-gravacao-carretel" aria-hidden="true" />
            <b>{doc.titulo || 'Gravação sem título'}</b>
            <small>{[campo('suporte'), campo('duracao')].filter(Boolean).join(' · ')}</small>
          </header>
          <p className="doc-gravacao-aviso">Transcrição</p>
          <Texto doc={doc} salvar={salvar} mestre={mestre}
                 classe="doc-gravacao-texto"
                 dica={'00:00  — fala\n00:12  — [ruído]\n'} />
        </div>
      </div>
    );
  }

  return (
    <div className="doc doc-objeto">
      {mestre && <Campos tipo="objeto" doc={doc} salvar={salvar} />}
      <div className="doc-objeto-etiqueta">
        <span className="doc-objeto-furo" aria-hidden="true" />
        <b>{doc.titulo || 'Objeto sem identificação'}</b>
        <dl>
          <div><dt>Recolhido em</dt><dd>{campo('recolhidoEm') || '—'}</dd></div>
          <div><dt>Estado</dt><dd>{campo('estado') || '—'}</dd></div>
        </dl>
      </div>
      {mestre && <Anexo doc={doc} salvar={salvar} rotulo="Anexar foto do objeto" />}
      {doc.imagem && <img className="doc-objeto-foto" src={doc.imagem} alt="" />}
      <Texto doc={doc} salvar={salvar} mestre={mestre}
             classe="doc-objeto-texto" dica="Descrição, análise, o que foi notado…" />
    </div>
  );
}
