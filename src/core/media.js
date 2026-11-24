function encodeImage(dataUrl,maxW,maxH,quality,type){
  return new Promise((resolve,reject)=>{
    const image=new Image();
    const timer=setTimeout(()=>fail(new Error('A imagem demorou demais para abrir. Use JPG, PNG ou WebP.')),20000);
    const fail=error=>{clearTimeout(timer);image.onload=null;image.onerror=null;reject(error);};
    image.onload=()=>{
      try{
        const ratio=Math.min(1,maxW/image.naturalWidth,maxH/image.naturalHeight);
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));
        canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
        const ctx=canvas.getContext('2d');
        if(!ctx)throw new Error('Não foi possível preparar a imagem.');
        ctx.drawImage(image,0,0,canvas.width,canvas.height);
        let result=canvas.toDataURL(type,quality);
        // Budget below the per-document ceiling, leaving room for sheet fields.
        for(let attempt=0;result.length>650000&&attempt<7;attempt++){
          const next=document.createElement('canvas');next.width=Math.max(1,Math.round(canvas.width*.8));next.height=Math.max(1,Math.round(canvas.height*.8));
          next.getContext('2d').drawImage(canvas,0,0,next.width,next.height);
          canvas.width=next.width;canvas.height=next.height;ctx.drawImage(next,0,0);
          result=canvas.toDataURL(type,Math.max(.55,quality-attempt*.05));
        }
        if(result==='data:')throw new Error('Formato de imagem inválido.');
        clearTimeout(timer);resolve(result);
      }catch(error){fail(error);}
    };
    image.onerror=()=>fail(new Error('Formato não suportado. Converta a imagem para JPG, PNG ou WebP.'));
    image.src=dataUrl;
  });
}
export function compressImage(dataUrl,maxW=900,maxH=900,quality=.72){return encodeImage(dataUrl,maxW,maxH,quality,'image/jpeg');}
export function compressImagePNG(dataUrl,maxW=320,maxH=320){return encodeImage(dataUrl,maxW,maxH,1,'image/png');}
export function compressImageSmall(dataUrl){return compressImage(dataUrl,700,700,.55);}

/* ═══════════════════════════════════════════════════════════════════════
   IMAGEM EM HD, DENTRO DO QUE O DOCUMENTO AGUENTA

   A imagem da ficha e a da criatura são guardadas DENTRO do documento, em
   base64 — não num armazenamento de arquivos à parte. E as regras recusam
   documento acima de 400 KiB, para que ninguém encha a cota da mesa.

   Então "HD" aqui não pode ser um número fixo de qualidade: uma foto de
   celular em 0,9 passa de um mega e a gravação é recusada; a mesma
   qualidade num desenho pequeno desperdiça resolução à toa.

   A saída é mirar no tamanho final. Começa grande e bom, mede o que saiu, e
   só cede se não couber — primeiro na compressão, depois na resolução. O
   resultado é sempre a melhor imagem que cabe, e não uma imagem média
   escolhida por chute.
   ═══════════════════════════════════════════════════════════════════════ */

/* O que ocupa no documento é o TEXTO da data URL, caractere por caractere —
   não o tamanho do arquivo original nem o do JPEG decodificado. */
export const bytesDaDataUrl = dataUrl => String(dataUrl || '').length;

/* ───────── A IMAGEM TEM FUNDO VAZADO? ─────────

   Esta pergunta existe por um defeito que chegou à mesa: o vulto do Mestre
   aparecia dentro de um retângulo PRETO, mesmo sendo um PNG recortado.

   A causa não estava em nenhum CSS. Estava aqui: TODA imagem era gravada em
   JPEG, e JPEG não tem canal alfa. O que era transparente na tela do Mestre
   virava preto no momento de salvar — a tela do canvas nasce transparente, e
   `toDataURL('image/jpeg')` achata isso contra preto. A imagem já chegava
   errada no banco, e nada depois dela poderia consertar.

   Então a decisão de formato passa a ser da IMAGEM e não do código: tem
   pixel vazado, grava em PNG; não tem, continua em JPEG, que é muito menor.
   Ler os pixels custa um passe de canvas e paga por si — um recorte entregue
   com tapa-sexo preto é imagem perdida. */
function temTransparencia(image) {
  try {
    // Uma amostra pequena basta: recorte tem borda vazada em toda a volta, e
    // 64 por 64 já pega qualquer canto. Imagem grande inteira seria lenta à
    // toa num passo que roda a cada anexo.
    const lado = 64;
    const prova = document.createElement('canvas');
    prova.width = Math.min(lado, image.naturalWidth || lado);
    prova.height = Math.min(lado, image.naturalHeight || lado);
    const ctx = prova.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(image, 0, 0, prova.width, prova.height);
    const dados = ctx.getImageData(0, 0, prova.width, prova.height).data;
    // Margem de 250 e não 255: PNG salvo por editor costuma ter borda com
    // alfa quase cheio, e exigir o 255 exato perderia esses recortes.
    for (let i = 3; i < dados.length; i += 4) if (dados[i] < 250) return true;
    return false;
  } catch {
    // Imagem de outra origem suja o canvas e a leitura é proibida. Nesse
    // caso não dá para saber, e o palpite seguro é PNG: pesa mais, e não
    // destrói nada.
    return true;
  }
}

export function imagemTemTransparencia(dataUrl) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(temTransparencia(image));
    image.onerror = () => resolve(false);
    image.src = dataUrl;
  });
}

export async function comprimirParaDocumento(dataUrl, {
  largura = 1600,
  altura = 1600,
  limite = 230 * 1024,
  preservarTransparencia = 'auto',
} = {}) {
  const vazada = preservarTransparencia === 'auto'
    ? await imagemTemTransparencia(dataUrl)
    : Boolean(preservarTransparencia);
  const menor = f => [Math.round(largura * f), Math.round(altura * f)];

  if (vazada) {
    /* PNG não tem qualidade para ceder: o que cede é o TAMANHO. E cede mais
       depressa, porque PNG de foto pesa muito mais que o JPEG equivalente —
       começar nos 1600px do outro caminho estouraria o limite sempre. */
    const passos = [1024, 820, 660, 520, 400, 320, 240];
    let resultado = dataUrl;
    for (const lado of passos) {
      resultado = await encodeImage(dataUrl, lado, lado, 1, 'image/png');
      if (bytesDaDataUrl(resultado) <= limite) return resultado;
    }
    return resultado;
  }

  const tentativas = [
    [largura, altura, 0.92],
    [largura, altura, 0.84],
    [largura, altura, 0.76],
    [...menor(0.78), 0.8],
    [...menor(0.6), 0.76],
    [...menor(0.45), 0.7],
    [...menor(0.32), 0.62],
  ];
  let resultado = dataUrl;
  for (const [w, h, q] of tentativas) {
    resultado = await encodeImage(dataUrl, w, h, q, 'image/jpeg');
    if (bytesDaDataUrl(resultado) <= limite) return resultado;
  }
  // Mesmo a menor tentativa estourou: devolve assim mesmo. A gravação pode
  // ser recusada, e quem chama avisa — melhor isso do que um erro mudo.
  return resultado;
}
