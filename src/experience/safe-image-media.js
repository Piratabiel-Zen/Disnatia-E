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
