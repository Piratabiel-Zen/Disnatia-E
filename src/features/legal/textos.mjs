// OS DOCUMENTOS LEGAIS
//
// Política de Privacidade e Termos de Uso, em dados estruturados para a tela
// só desenhar — e para o teste conseguir conferir que nenhum item exigido por
// lei desapareceu numa edição futura.
//
// AVISO QUE PRECISA FICAR AQUI: isto foi escrito a partir do que a LGPD (Lei
// 13.709/2018) e o Marco Civil da Internet (Lei 12.965/2014) exigem, e
// descreve com honestidade o que o site faz de verdade. Mas não substitui a
// revisão de um advogado, principalmente se o site passar a ser cobrado.
// Há dois campos que só o responsável pode preencher (identificação e
// contato) e um ponto que ele precisa decidir (menores de idade na mesa).

export const CONTROLADOR = Object.freeze({
  // PREENCHER antes de publicar para gente de fora.
  nome: '',
  contato: '',
  aviso: 'Preencha a identificação do responsável e um e-mail de contato antes de abrir o site para pessoas fora do seu círculo. A LGPD exige que o titular saiba a quem recorrer.',
});

export const ATUALIZADO_EM = '16 de novembro de 2026';

/* Os nove direitos do Art. 18 da LGPD, na ordem da lei. */
export const DIREITOS_ART_18 = Object.freeze([
  { inciso: 'I', titulo: 'Confirmação', texto: 'Saber se tratamos dados seus.' },
  { inciso: 'II', titulo: 'Acesso', texto: 'Receber uma cópia do que guardamos sobre você.' },
  { inciso: 'III', titulo: 'Correção', texto: 'Corrigir dado incompleto, inexato ou desatualizado.' },
  { inciso: 'IV', titulo: 'Anonimização, bloqueio ou eliminação', texto: 'Pedir que dado desnecessário, excessivo ou tratado fora da lei seja anonimizado, bloqueado ou apagado.' },
  { inciso: 'V', titulo: 'Portabilidade', texto: 'Levar seus dados para outro serviço, em formato legível por máquina.' },
  { inciso: 'VI', titulo: 'Eliminação', texto: 'Apagar os dados tratados com o seu consentimento, salvo o que a lei obrigue a guardar.' },
  { inciso: 'VII', titulo: 'Informação sobre compartilhamento', texto: 'Saber com quem compartilhamos seus dados.' },
  { inciso: 'VIII', titulo: 'Informação sobre a recusa', texto: 'Saber o que acontece se você não consentir, e que pode negar.' },
  { inciso: 'IX', titulo: 'Revogação do consentimento', texto: 'Voltar atrás no consentimento a qualquer momento.' },
]);

export const POLITICA_DE_PRIVACIDADE = Object.freeze({
  titulo: 'Política de Privacidade',
  resumo: 'Este é um site de mesa de RPG. Ele guarda o que você escreve para jogar, e o mínimo para saber quem é você. Não vende, não anuncia e não rastreia ninguém.',
  secoes: [
    {
      id: 'quem',
      titulo: 'Quem trata os seus dados',
      paragrafos: [
        'O responsável pelo site (o "controlador", no vocabulário da LGPD) é quem o mantém e decide o que acontece com os dados aqui dentro.',
        'Qualquer pedido sobre os seus dados — ver, corrigir, apagar, levar embora — vai para o contato indicado ao fim desta página.',
      ],
    },
    {
      id: 'o-que',
      titulo: 'O que o site guarda',
      lista: [
        'Seu e-mail e, se você quiser, o nome pelo qual a mesa te chama. É isso que permite ao Mestre liberar um documento para você e não para os outros.',
        'O que você escreve jogando: fichas, anotações, pistas no mural, documentos, crônicas, posições de token.',
        'Imagens que você enviar para a mesa (retratos, mapas, documentos).',
        'Preferências do seu aparelho: modo de qualidade, animações, tamanho do texto, volume. Ficam só no seu navegador.',
        'Registro de quando sua conta foi criada e quando você entrou em cada mesa.',
      ],
      paragrafos: [
        'O site NÃO pede nem usa dados sensíveis na definição do Art. 5º, II da LGPD — origem racial, convicção religiosa, opinião política, saúde, vida sexual, biometria. Se você escrever algo assim num campo de texto livre, isso é escolha sua, e vale a pena pensar duas vezes: o que está numa mesa é visível para quem está nela.',
        'Não há cookies de publicidade, pixels de rastreamento, nem ferramentas de análise de comportamento.',
      ],
    },
    {
      id: 'para-que',
      titulo: 'Para que servem',
      lista: [
        'Fazer a mesa funcionar: mostrar a ficha certa para a pessoa certa, guardar o que a mesa criou, sincronizar o que todos veem.',
        'Saber quem é quem, para que "liberar este documento só para a Ana" signifique alguma coisa.',
        'Manter o site de pé e corrigir defeitos.',
      ],
      paragrafos: [
        'Nenhum dado é usado para publicidade, perfilamento, venda ou cessão a terceiros com fins comerciais.',
      ],
    },
    {
      id: 'base-legal',
      titulo: 'Com que base legal',
      lista: [
        'Execução do serviço que você pediu (Art. 7º, V): sem guardar a sua ficha, não há mesa.',
        'Consentimento (Art. 7º, I): para o que você escolhe enviar, como imagens e textos de personagem.',
        'Legítimo interesse (Art. 7º, IX): manter o site seguro e funcionando.',
      ],
    },
    {
      id: 'com-quem',
      titulo: 'Com quem são compartilhados',
      lista: [
        'Com as pessoas da sua própria mesa — é o ponto do site. O que o Mestre guardar não chega a ninguém além dele.',
        'Google (Firebase): autenticação e banco de dados. Os dados ficam em servidores do Google, que podem estar fora do Brasil.',
        'Vercel: hospedagem do site.',
      ],
      paragrafos: [
        'Essa hospedagem no exterior é uma transferência internacional de dados, prevista no Art. 33 da LGPD. Os dois serviços declaram adequação à LGPD e ao GDPR europeu.',
        'Fora isso, nada é compartilhado — exceto se a lei obrigar, e nesse caso você será avisado quando for possível.',
      ],
    },
    {
      id: 'quanto-tempo',
      titulo: 'Por quanto tempo ficam',
      paragrafos: [
        'Enquanto a sua conta existir e a mesa estiver ativa.',
        'Se você pedir para apagar sua conta, os seus dados pessoais são removidos. O que você escreveu na mesa pode permanecer, porque pertence à história que o grupo construiu junto — mas deixa de estar ligado ao seu nome. Se quiser que também saia, diga: é um pedido que atendemos.',
      ],
    },
    {
      id: 'direitos',
      titulo: 'Os seus direitos',
      paragrafos: [
        'O Art. 18 da LGPD te dá nove direitos sobre os seus dados, e eles valem aqui integralmente:',
      ],
      direitos: true,
      depois: [
        'Para exercer qualquer um deles, escreva para o contato abaixo. O prazo que seguimos é o da lei: resposta imediata quando simples, e no máximo 15 dias para os pedidos de acesso e portabilidade.',
      ],
    },
    {
      id: 'seguranca',
      titulo: 'Como os dados são protegidos',
      lista: [
        'Senhas nunca são guardadas em texto: o banco só tem o resumo criptográfico (SHA-256) delas.',
        'Quem pode ler o quê é decidido no servidor, não na tela. Um documento que o Mestre guardou não chega ao navegador de quem não pode vê-lo, nem abrindo o console.',
        'Cada mesa fica isolada das outras: os dados de uma campanha não são alcançáveis de dentro de outra.',
        'Todo o tráfego é cifrado por HTTPS.',
        'O login é feito pelo Firebase Authentication, do Google — o site nunca vê a sua senha do Google.',
      ],
      paragrafos: [
        'Nenhum sistema é inviolável. Se houver um incidente que possa trazer risco ou dano relevante, os afetados e a ANPD serão comunicados, como manda o Art. 48.',
      ],
    },
    {
      id: 'menores',
      titulo: 'Menores de idade',
      paragrafos: [
        'Mesas de RPG costumam ter gente de todas as idades. A LGPD (Art. 14) exige consentimento específico de um dos pais ou do responsável legal para tratar dados de crianças com menos de 12 anos.',
        'Se há alguém nessa faixa na sua mesa, quem convida precisa ter esse consentimento. Adolescentes de 12 a 17 anos são tratados no melhor interesse deles, e a recomendação é que o responsável saiba que a conta existe.',
      ],
    },
    {
      id: 'mudancas',
      titulo: 'Mudanças nesta política',
      paragrafos: [
        'Quando algo relevante mudar, a data no topo muda junto e o aviso aparece na entrada do site. Continuar usando depois disso significa que você viu.',
      ],
    },
  ],
});

export const TERMOS_DE_USO = Object.freeze({
  titulo: 'Termos de Uso',
  resumo: 'As regras de convivência deste site. Em resumo: jogue, respeite quem joga com você, e não tente quebrar nada.',
  secoes: [
    {
      id: 'o-que-e',
      titulo: 'O que é este site',
      paragrafos: [
        'Uma ferramenta para jogar RPG de mesa: fichas, mapas, documentos, murais de investigação e registros de campanha.',
        'Ele é oferecido como está. Não há promessa de funcionamento ininterrupto, e pode haver manutenção, falha ou perda de dados — faça cópia do que for insubstituível para você.',
      ],
    },
    {
      id: 'conta',
      titulo: 'Sua conta',
      lista: [
        'A conta é pessoal. Não empreste nem compartilhe o acesso.',
        'Você responde pelo que acontece com ela. Se suspeitar que alguém entrou, troque a senha.',
        'Dados falsos de cadastro podem levar à remoção da conta.',
        'Você pode apagar sua conta quando quiser.',
      ],
    },
    {
      id: 'mesas',
      titulo: 'Mesas e conteúdo',
      lista: [
        'Quem cria a mesa é o Mestre dela, e decide quem entra e o que cada um vê.',
        'O que você escreve continua seu. Ao colocar na mesa, você autoriza o site a guardar e mostrar esse conteúdo às pessoas da mesa — e nada além disso.',
        'Só envie imagens e textos que você tem o direito de usar.',
        'O Mestre pode remover conteúdo da mesa dele; o responsável pelo site pode remover o que violar estes termos ou a lei.',
      ],
    },
    {
      id: 'conduta',
      titulo: 'O que não é permitido',
      lista: [
        'Usar o site para assediar, ameaçar, discriminar ou expor alguém.',
        'Publicar conteúdo ilegal, ou material sexual envolvendo menores — o que leva a remoção imediata e comunicação às autoridades.',
        'Tentar acessar mesa, conta ou dado que não é seu.',
        'Sondar, varrer ou atacar a infraestrutura; tentar burlar as regras de segurança; automatizar acesso para extrair dados em massa.',
        'Sobrecarregar o serviço de propósito.',
      ],
      paragrafos: [
        'O Marco Civil da Internet e o Código Penal (Art. 154-A, invasão de dispositivo informático) se aplicam a estas condutas.',
      ],
    },
    {
      id: 'propriedade',
      titulo: 'Sistemas de RPG e material de terceiros',
      paragrafos: [
        'Os sistemas de regras usados nas mesas pertencem a seus autores e editoras. O site é uma ferramenta para jogar, e não distribui o conteúdo desses livros: cada mesa usa o material que já possui legalmente.',
        'Imagens, textos e mapas enviados pelas mesas são de responsabilidade de quem os enviou.',
      ],
    },
    {
      id: 'responsabilidade',
      titulo: 'Limites de responsabilidade',
      paragrafos: [
        'O site não se responsabiliza pelo conteúdo criado pelas mesas, nem por desentendimentos entre participantes.',
        'Na extensão permitida pela lei, não há responsabilidade por perda de dados, lucro cessante ou dano indireto decorrente do uso.',
      ],
    },
    {
      id: 'encerramento',
      titulo: 'Encerramento',
      paragrafos: [
        'Você pode parar de usar quando quiser e apagar sua conta.',
        'Contas que violarem estes termos podem ser suspensas ou removidas, com aviso sempre que for possível.',
      ],
    },
    {
      id: 'lei',
      titulo: 'Lei aplicável',
      paragrafos: [
        'Estes termos seguem a lei brasileira. Questões não resolvidas de outro modo ficam no foro do domicílio do usuário, como prevê o Código de Defesa do Consumidor.',
      ],
    },
  ],
});
