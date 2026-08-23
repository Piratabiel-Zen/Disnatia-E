import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mustRead = file => {
  if (!fs.existsSync(file)) throw new Error(`Final interaction patch: arquivo não encontrado: ${file}`);
  return fs.readFileSync(file, 'utf8');
};

// ── 1) CLASSE DA FICHA: SOMENTE O MESTRE PODE TROCAR ──────────────────────
const componentsFile = path.join(root, 'src', 'features', 'sheets', 'SheetComponents.jsx');
let components = mustRead(componentsFile);

// O patch anterior protegia uma variante do seletor, mas o layout desktop possui
// style inline no <select>. Aqui protegemos qualquer seletor remanescente da classe,
// sem reembrulhar os que já estão dentro de sheet-class-readonly.
const classSelectRegex = /<select\s+value=\{sheet\.classe\}[\s\S]*?\{CLASSES\.map\(c=><option key=\{c\.id\} value=\{c\.id\}>\{c\.icon\} \{c\.name\}<\/option>\)\}<\/select>/g;
let protectedNow = 0;
components = components.replace(classSelectRegex, (match, offset, source) => {
  const context = source.slice(Math.max(0, offset - 180), Math.min(source.length, offset + match.length + 520));
  if (context.includes('sheet-class-readonly')) return match;
  protectedNow += 1;
  return `{masterMode ? ${match} : <div className="sheet-class-readonly sheet-class-readonly-final" title="Classe definida pelo Mestre" style={{minHeight:34,display:'flex',alignItems:'center',gap:8,padding:'6px 10px',borderRadius:7,border:\`1px solid \${sheetColor}33\`,background:\`\${sheetColor}0D\`,color:sheetColor,fontFamily:'Cinzel,serif',fontSize:12,fontWeight:700,whiteSpace:'nowrap'}}><span aria-hidden="true">{cls.icon}</span><span>{cls.name}</span></div>}`;
});

const readonlyCount = (components.match(/sheet-class-readonly/g) || []).length;
if (readonlyCount < 2) {
  throw new Error(`Final interaction patch: proteção visual de classe insuficiente (${readonlyCount}).`);
}
fs.writeFileSync(componentsFile, components);

// Segunda barreira: mesmo que algum componente tente enviar outra classe em modo
// jogador, a persistência mantém a classe já cadastrada.
const sheetsPageFile = path.join(root, 'src', 'features', 'sheets', 'SheetsPage.jsx');
let sheetsPage = mustRead(sheetsPageFile);
if (!sheetsPage.includes('const safeData=!masterMode&&current?{...data,classe:current.classe}:data;')) {
  const oldUpdate = "const upd=(id,data)=>{if(data===null){deleteDoc(doc(db,'sheets',String(id)));setActiveId(null);return;}setSheets(prev=>prev.map(s=>s.id===id?data:s));saveSheet(data);};";
  const newUpdate = "const upd=(id,data)=>{if(data===null){deleteDoc(doc(db,'sheets',String(id)));setActiveId(null);return;}const current=sheets.find(s=>String(s.id)===String(id));const safeData=!masterMode&&current?{...data,classe:current.classe}:data;setSheets(prev=>prev.map(s=>s.id===id?safeData:s));saveSheet(safeData);};";
  if (!sheetsPage.includes(oldUpdate)) throw new Error('Final interaction patch: função de persistência da ficha não encontrada.');
  sheetsPage = sheetsPage.replace(oldUpdate, newUpdate);
  fs.writeFileSync(sheetsPageFile, sheetsPage);
}

// ── 2) CRÔNICAS: ZOOM REALMENTE GRADUAL NA ENTRADA E NA SAÍDA ─────────────
// experience.css é importado depois de global.css. Colocar o override aqui evita
// que a camada cosmic-modern sobrescreva a transição de transform das memórias.
const experienceCssFile = path.join(root, 'src', 'experience', 'experience.css');
let experienceCss = mustRead(experienceCssFile);
const FINAL_MARKER = '/* FINAL INTERACTION FIXES · 2026-08-23 */';
if (!experienceCss.includes(FINAL_MARKER)) {
  experienceCss += `\n${FINAL_MARKER}\n
/* Memórias das Crônicas: escala grande preservada, mas com aceleração simétrica.
   A regra precisa viver depois da camada cosmic-modern, que redefine transition. */
@media (hover:hover) and (pointer:fine){
  .chronicles-reading .chronicles-memory{
    transition:transform .88s cubic-bezier(.4,0,.2,1),border-color .42s ease-in-out,box-shadow .52s ease-in-out,background-color .42s ease-in-out!important;
    transition-delay:0s!important;
    will-change:transform;
  }
  .chronicles-reading .chronicles-memory:hover{
    transform:scale(2.96)!important;
  }
  .chronicles-reading .chronicles-memory img{
    object-fit:cover!important;
    transform:none!important;
    transition:filter .42s ease-in-out!important;
  }
  .chronicles-reading .chronicles-memory:hover img{
    object-fit:cover!important;
    transform:none!important;
    filter:brightness(1.025)!important;
  }
}

/* Livro: a folha usa apenas transform 3D no elemento animado. Removemos filter e
   box-shadow animados, que causavam travamentos, e mantemos frente/verso separados. */
.livro-pages{
  perspective:2200px!important;
  perspective-origin:50% 48%;
  transform-style:preserve-3d!important;
}
.livro-turning .livro-pages{animation:none!important}
.livro-page-flip{
  background:transparent!important;
  background-image:none!important;
  box-shadow:none!important;
  backface-visibility:visible!important;
  transform-style:preserve-3d!important;
  will-change:transform;
  filter:none!important;
  isolation:isolate;
}
.livro-page-flip::before,.livro-page-flip::after{
  backface-visibility:hidden!important;
  -webkit-backface-visibility:hidden!important;
  transform-style:preserve-3d;
  box-shadow:inset 0 0 46px rgba(91,55,24,.24);
}
.livro-page-flip::before{
  transform:translateZ(.6px)!important;
  background-color:#d8c391!important;
  background-image:radial-gradient(circle at 18% 20%,rgba(83,51,23,.16),transparent 25%),linear-gradient(100deg,rgba(255,246,209,.58),transparent 28%,rgba(85,48,23,.13)),repeating-linear-gradient(7deg,rgba(82,50,22,.022) 0 1px,transparent 1px 4px)!important;
}
.livro-page-flip::after{
  transform:rotateY(180deg) translateZ(.6px)!important;
  background-color:#d2bb87!important;
  background-image:linear-gradient(270deg,rgba(255,244,205,.18),rgba(88,49,23,.10)),repeating-linear-gradient(-7deg,rgba(82,50,22,.025) 0 1px,transparent 1px 4px)!important;
}
.livro-page-flip.forward{
  left:50%!important;
  transform-origin:left center!important;
  animation:livroLeafForwardSmooth .88s cubic-bezier(.55,.05,.25,1) both!important;
}
.livro-page-flip.backward{
  left:0!important;
  transform-origin:right center!important;
  animation:livroLeafBackwardSmooth .88s cubic-bezier(.55,.05,.25,1) both!important;
}
@keyframes livroLeafForwardSmooth{
  0%{transform:translateZ(0) rotateY(0deg)}
  16%{transform:translateZ(8px) rotateY(-18deg)}
  48%{transform:translateZ(16px) rotateY(-87deg)}
  52%{transform:translateZ(16px) rotateY(-93deg)}
  84%{transform:translateZ(8px) rotateY(-162deg)}
  100%{transform:translateZ(0) rotateY(-180deg)}
}
@keyframes livroLeafBackwardSmooth{
  0%{transform:translateZ(0) rotateY(0deg)}
  16%{transform:translateZ(8px) rotateY(18deg)}
  48%{transform:translateZ(16px) rotateY(87deg)}
  52%{transform:translateZ(16px) rotateY(93deg)}
  84%{transform:translateZ(8px) rotateY(162deg)}
  100%{transform:translateZ(0) rotateY(180deg)}
}
@media(max-width:720px){
  .livro-pages{perspective:1500px!important}
  .livro-page-flip{width:100%!important;left:0!important}
}
@media(prefers-reduced-motion:reduce){
  .chronicles-reading .chronicles-memory{transition:transform .22s ease-in-out!important}
  .livro-page-flip.forward{animation:livroLeafForwardReduced .18s ease-out both!important}
  .livro-page-flip.backward{animation:livroLeafBackwardReduced .18s ease-out both!important}
}
@keyframes livroLeafForwardReduced{from{opacity:.45;transform:rotateY(0)}to{opacity:.1;transform:rotateY(-24deg)}}
@keyframes livroLeafBackwardReduced{from{opacity:.45;transform:rotateY(0)}to{opacity:.1;transform:rotateY(24deg)}}
`;
  fs.writeFileSync(experienceCssFile, experienceCss);
}

// ── 3) LIVRO: SINCRONIZA A TROCA DE CONTEÚDO COM O MEIO DA ANIMAÇÃO ───────
const livroFile = path.join(root, 'src', 'features', 'livro', 'LivroPage.jsx');
let livro = mustRead(livroFile);

// A troca ocorre quando a folha está de perfil (~50%). O timeout maior é apenas
// fallback; animationend encerra imediatamente quando a animação termina.
livro = livro
  .replace(/setTimeout\(\(\)=>setMobileSide\(1\),300\)/g, 'setTimeout(()=>setMobileSide(1),440)')
  .replace(/setTimeout\(\(\)=>setMobileSide\(0\),300\)/g, 'setTimeout(()=>setMobileSide(0),440)')
  .replace(/setTimeout\(\(\)=>setTurning\(false\),760\)/g, 'setTimeout(()=>setTurning(false),980)')
  .replace(/setTimeout\(\(\)=>\{setTabPages\(p=>\(\{\.\.\.p,\[activeTab\]:next\}\)\);setMobileSide\(dir>0\?0:1\);\},360\)/g,
    'setTimeout(()=>{setTabPages(p=>({...p,[activeTab]:next}));setMobileSide(dir>0?0:1);},440)')
  .replace(/setTimeout\(\(\)=>setTurning\(false\),780\)/g, 'setTimeout(()=>setTurning(false),980)');

const oldFlip = "{turning&&<div className={`livro-page-flip ${turnDir>0?'forward':'backward'}`} aria-hidden=\"true\"/>}";
const newFlip = "{turning&&<div className={`livro-page-flip ${turnDir>0?'forward':'backward'}`} aria-hidden=\"true\" onAnimationEnd={()=>setTurning(false)}/>}";
if (livro.includes(oldFlip)) livro = livro.replace(oldFlip, newFlip);
if (!livro.includes('livro-page-flip') || !livro.includes('onAnimationEnd={()=>setTurning(false)}')) {
  throw new Error('Final interaction patch: folha animada do Livro não pôde ser estabilizada.');
}
fs.writeFileSync(livroFile, livro);

// Garantias finais do build.
const finalComponents = fs.readFileSync(componentsFile, 'utf8');
if ((finalComponents.match(/sheet-class-readonly/g) || []).length < 2) throw new Error('Final interaction patch: jogador ainda possui seletor de classe desprotegido.');
const finalCss = fs.readFileSync(experienceCssFile, 'utf8');
for (const marker of ['FINAL INTERACTION FIXES', 'transform .88s cubic-bezier(.4,0,.2,1)', 'livroLeafForwardSmooth']) {
  if (!finalCss.includes(marker)) throw new Error(`Final interaction patch incompleto: ${marker}`);
}

// ── 4) CRÔNICAS: PREVIEW HQ SEM ESCALAR O BITMAP DO THUMBNAIL ──────────────
// O transform:scale anterior mantinha o mesmo bitmap já rasterizado no tamanho pequeno,
// o que deixava a memória borrada durante a aproximação. Mantemos o thumbnail parado e
// sobrepomos a MESMA mídia HQ em um elemento absoluto que cresce por largura real.
const cronicasGeneratedFile = path.join(root, 'src', 'features', 'cronicas', 'CronicasPage.jsx');
let cronicasGenerated = mustRead(cronicasGeneratedFile);
const galleryBefore = `<div className="chronicles-memory-grid">{selectedImages.slice(0,8).map((img,i)=><div key={img?.id||i}><div className="chronicles-memory"><img src={imageSrc(img)} alt=""/></div><div style={{fontSize:10,color:'#87798b',textAlign:'center',marginTop:5}}>Memória {i+1}</div></div>)}</div>`;
const galleryAfter = `<div className="chronicles-memory-grid">{selectedImages.slice(0,8).map((img,i)=><div key={img?.id||i} className="chronicles-memory-cell"><div className="chronicles-memory"><img className="chronicles-memory-thumb" src={imageSrc(img)} alt=""/></div><div className="chronicles-memory-hq" aria-hidden="true"><img src={imageSrc(img)} alt="" loading="eager" decoding="async"/></div><div style={{fontSize:10,color:'#87798b',textAlign:'center',marginTop:5}}>Memória {i+1}</div></div>)}</div>`;
if (!cronicasGenerated.includes('chronicles-memory-hq')) {
  if (!cronicasGenerated.includes(galleryBefore)) throw new Error('Final interaction patch: galeria de leitura das Crônicas não encontrada para preview HQ.');
  cronicasGenerated = cronicasGenerated.replace(galleryBefore, galleryAfter);
  fs.writeFileSync(cronicasGeneratedFile, cronicasGenerated);
}

let nativeZoomCss = mustRead(experienceCssFile);
const NATIVE_ZOOM_MARKER = '/* CRÔNICAS · NATIVE RESOLUTION HOVER · 2026-08-23 */';
if (!nativeZoomCss.includes(NATIVE_ZOOM_MARKER)) {
  nativeZoomCss += `\n${NATIVE_ZOOM_MARKER}\n
@media (hover:hover) and (pointer:fine){
  .chronicles-reading .chronicles-memory-cell{
    position:relative;
    z-index:1;
  }
  .chronicles-reading .chronicles-memory-cell:hover{
    z-index:80;
  }
  .chronicles-reading .chronicles-memory-cell .chronicles-memory,
  .chronicles-reading .chronicles-memory-cell .chronicles-memory:hover{
    width:100%!important;
    transform:none!important;
    will-change:auto!important;
    transition:border-color .42s ease-in-out,box-shadow .52s ease-in-out,background-color .42s ease-in-out!important;
  }
  .chronicles-reading .chronicles-memory-cell .chronicles-memory img{
    image-rendering:auto!important;
    transform:none!important;
    filter:none!important;
  }
  .chronicles-reading .chronicles-memory-hq{
    position:absolute;
    top:0;
    left:0;
    width:100%;
    aspect-ratio:16/10;
    z-index:90;
    overflow:hidden;
    border:1px solid rgba(216,180,254,.20);
    border-radius:10px;
    background:#05030d;
    opacity:0;
    cursor:zoom-out;
    pointer-events:auto;
    transform:translate3d(0,0,0);
    transition:width .88s cubic-bezier(.4,0,.2,1),transform .88s cubic-bezier(.4,0,.2,1),opacity .14s ease .72s,border-color .42s ease-in-out,box-shadow .52s ease-in-out;
    will-change:width,transform;
  }
  .chronicles-reading .chronicles-memory-hq img{
    width:100%;
    height:100%;
    display:block;
    object-fit:cover!important;
    image-rendering:auto!important;
    transform:none!important;
    filter:none!important;
    backface-visibility:visible;
  }
  .chronicles-reading .chronicles-memory-cell:hover .chronicles-memory-hq{
    width:296%;
    opacity:1;
    border-color:rgba(196,151,255,.62);
    box-shadow:0 18px 46px rgba(0,0,0,.68),0 0 24px rgba(124,58,237,.22);
    transition-delay:0s,0s,0s,0s,0s;
  }
  .chronicles-reading .chronicles-memory-grid>div:nth-child(3n+1):hover .chronicles-memory-hq{
    transform:translate3d(0,-66.216%,0);
  }
  .chronicles-reading .chronicles-memory-grid>div:nth-child(3n+2):hover .chronicles-memory-hq{
    transform:translate3d(-33.108%,-66.216%,0);
  }
  .chronicles-reading .chronicles-memory-grid>div:nth-child(3n):hover .chronicles-memory-hq{
    transform:translate3d(-66.216%,-66.216%,0);
  }
}
@media (prefers-reduced-motion:reduce){
  .chronicles-reading .chronicles-memory-hq{
    transition:width .18s ease-out,transform .18s ease-out,opacity .08s linear!important;
  }
}
`;
  fs.writeFileSync(experienceCssFile, nativeZoomCss);
}

const finalCronicas = fs.readFileSync(cronicasGeneratedFile, 'utf8');
const finalNativeCss = fs.readFileSync(experienceCssFile, 'utf8');
for (const marker of ['chronicles-memory-hq', 'NATIVE RESOLUTION HOVER', 'width:296%', 'image-rendering:auto']) {
  if (!(finalCronicas.includes(marker) || finalNativeCss.includes(marker))) throw new Error(`Final interaction patch: preview HQ incompleto (${marker}).`);
}

console.log(`Dinastia E: correções finais aplicadas — ${protectedNow} seletor(es) adicional(is) de classe protegido(s), zoom gradual, folhear 3D fluido e preview HQ nativo nas Crônicas.`);
