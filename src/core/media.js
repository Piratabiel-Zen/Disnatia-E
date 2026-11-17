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

export async function comprimirParaDocumento(dataUrl, {
  largura = 1600,
  altura = 1600,
  limite = 230 * 1024,
} = {}) {
  const menor = f => [Math.round(largura * f), Math.round(altura * f)];
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
