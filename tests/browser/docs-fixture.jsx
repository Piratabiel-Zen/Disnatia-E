// Os seis tipos de documento, um embaixo do outro, nas cores da Estrela de Absinto.
import { createRoot } from 'react-dom/client';
import CorpoDoDocumento from '../../src/features/documentos/CorpoDoDocumento.jsx';

const veneziano = {
  '--fundo-mesa': '#070910', '--superficie-mesa': '#0F1320', '--linha-mesa': '#232C42',
  '--contraste-mesa': '#8CA0C4', '--contraste-claro-mesa': '#C3D0E6', '--ink-mesa': '#D4D7E0',
};
for (const [k, v] of Object.entries(veneziano)) document.documentElement.style.setProperty(k, v);

const corpo = 'A testemunha diz ter visto a luz sobre o canal pouco antes das três. Os guardas do turno não registraram ocorrência. O pároco de San Trovaso recusou-se a comentar e pediu que seu nome não constasse. Duas famílias deixaram a paróquia na mesma semana, sem avisar os vizinhos.';

const docs = [
  { tipo:'jornal', titulo:'Luz sobre o canal assusta moradores', veiculo:'A Gazeta de Terra Dourada', data:'14 de outubro', chamada:'Autoridades falam em reflexo; testemunhas discordam', corpo },
  { tipo:'carta', titulo:'Carta de Beatriz', remetente:'Beatriz V.', destinatario:'Dominic', data:'11 de outubro', corpo:'Não volte à casa da ponte. O que você procura não está mais lá, e o que está não deve ser encontrado por você.\n\nQueime esta carta.' },
  { tipo:'foto', titulo:'A doca ao amanhecer', legenda:'A doca, antes de a maré subir', data:'outubro', corpo:'No verso: três nomes riscados.' },
  { tipo:'relatorio', titulo:'Ocorrência em San Trovaso', referencia:'CAIN-0094/TD', classificacao:'Confidencial', data:'15/10', corpo },
  { tipo:'gravacao', titulo:'Fita recolhida na sacristia', suporte:'Fita magnética', duracao:'00:04:12', corpo:'00:00  — [chiado]\n00:07  — Não é a primeira vez.\n00:19  — [interrupção]\n00:31  — Ele atende por outro nome agora.' },
  { tipo:'objeto', titulo:'Chave sem fechadura conhecida', recolhidoEm:'Sob o altar lateral', estado:'Oxidada, dente partido', corpo:'Metal não identificado. Pesa mais do que deveria.' },
];

createRoot(document.getElementById('root')).render(
  <div style={{ background:'#070910', minHeight:'100vh', padding:20, display:'grid', gap:26, maxWidth:720, margin:'0 auto' }}>
    {docs.map(d => <CorpoDoDocumento key={d.tipo} doc={{ id:d.tipo, ...d }} tipo={d.tipo} mestre={false} salvar={()=>{}} />)}
  </div>,
);
