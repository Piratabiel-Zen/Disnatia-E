import fs from 'node:fs';
import path from 'node:path';

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  const next = source.replace(before, after);
  if (next === source) throw new Error(`Capítulo de Elyon: ${label}`);
  return next;
}

const livroFile = path.join(process.cwd(), 'src', 'features', 'livro', 'LivroPage.jsx');
const cssFile = path.join(process.cwd(), 'src', 'styles', 'livro.css');

let livro = fs.readFileSync(livroFile, 'utf8');

if (!livro.includes('import { compressImage } from "../../core/media";')) {
  livro = replaceRequired(
    livro,
    'import { db } from "../../core/firebase";',
    'import { db } from "../../core/firebase";\nimport { compressImage } from "../../core/media";',
    'import de mídia não encontrado'
  );
}

const chapterMarker = 'const ELYON_CHAPTER_SPREADS = [';
if (!livro.includes(chapterMarker)) {
  const anchor = "const newMasterPage=id=>({id,titulo:'',dataAquisicao:new Date().toLocaleDateString('pt-BR'),descricao:''});";
  if (!livro.includes(anchor)) throw new Error('Capítulo de Elyon: âncora das Páginas do Mestre não encontrada.');

  const chapterBlock = String.raw`
const BOOK_IMAGE_SAFE_LIMIT = 860000;

async function prepareLivroImage(dataUrl) {
  if (!dataUrl) return '';
  if (dataUrl.length <= BOOK_IMAGE_SAFE_LIMIT) return dataUrl;
  const presets = [
    [2400, 1800, 0.92],
    [2200, 1650, 0.88],
    [2000, 1500, 0.84],
    [1800, 1350, 0.80],
    [1600, 1200, 0.76],
  ];
  let candidate = dataUrl;
  for (const [w,h,q] of presets) {
    candidate = await compressImage(dataUrl, w, h, q);
    if (candidate.length <= BOOK_IMAGE_SAFE_LIMIT) return candidate;
  }
  throw new Error('A imagem continua muito grande para o Livro mesmo após a otimização.');
}

function LivroImageGallery({ scope, masterMode, compact=false }) {
  const [images,setImages]=useState([]);
  const [lightbox,setLightbox]=useState(null);
  const [uploading,setUploading]=useState(false);

  useEffect(()=>{
    const unsub=onSnapshot(collection(db,'livro_media'),snap=>{
      const rows=snap.docs
        .map(d=>({id:d.id,...d.data()}))
        .filter(item=>String(item.scope||'')===String(scope))
        .sort((a,b)=>Number(a.ts||0)-Number(b.ts||0));
      setImages(rows);
    });
    return()=>unsub();
  },[scope]);

  const upload=async file=>{
    if(!file)return;
    setUploading(true);
    try{
      const dataUrl=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result||''));
        reader.onerror=()=>reject(reader.error||new Error('Falha ao ler imagem.'));
        reader.readAsDataURL(file);
      });
      const img=await prepareLivroImage(dataUrl);
      const id=String(Date.now())+'_'+Math.random().toString(36).slice(2,8);
      await setDoc(doc(db,'livro_media',id),{
        scope:String(scope),
        img,
        nome:file.name||'Imagem do Livro',
        ts:Date.now(),
        originalBytes:Number(file.size||0),
      });
    }catch(err){
      console.error(err);
      window.alert(err?.message||'Não foi possível anexar a imagem ao Livro.');
    }finally{
      setUploading(false);
    }
  };

  const remove=async id=>{
    try{await deleteDoc(doc(db,'livro_media',String(id)));}catch(err){console.error(err);}
  };

  return <div className={'livro-hq-gallery '+(compact?'compact':'')}>
    {images.length>0&&<div className="livro-hq-grid">
      {images.map(item=><div className="livro-hq-thumb" key={item.id}>
        <button className="livro-hq-open" onClick={()=>setLightbox(item)} title="Abrir em alta qualidade">
          <img src={item.img} alt={item.nome||'Ilustração do Livro'}/>
          <span>Ampliar</span>
        </button>
        {masterMode&&<button className="livro-hq-remove" onClick={()=>remove(item.id)} title="Remover imagem">✕</button>}
      </div>)}
    </div>}
    {masterMode&&<label className="livro-hq-upload">
      <input type="file" accept="image/*" onChange={e=>{const file=e.target.files?.[0];e.target.value='';upload(file);}}/>
      <span>{uploading?'Otimizando imagem…':'✦ Anexar imagem em alta qualidade'}</span>
      <small>Preserva a maior resolução possível e abre em tela cheia sem recorte.</small>
    </label>}
    {lightbox&&<div className="livro-hq-lightbox" onClick={()=>setLightbox(null)}>
      <button className="livro-hq-lightbox-close" onClick={()=>setLightbox(null)} aria-label="Fechar">✕</button>
      <img src={lightbox.img} alt={lightbox.nome||'Ilustração ampliada'} onClick={e=>e.stopPropagation()}/>
      {lightbox.nome&&<div className="livro-hq-caption">{lightbox.nome}</div>}
    </div>}
  </div>;
}

const ELYON_CHAPTER_SPREADS = [
  {
    left: {
      eyebrow:'Capítulo derradeiro',
      title:'O Último Capítulo de Elyon',
      subtitle:'Aquilo que o tempo escreveu, a Mandíbula já havia lido.',
      quote:'“E quando aquele que conhecia todos os caminhos finalmente encontrou o seu próprio, não havia mais futuro para consultar.”',
      paragraphs:[
        'Pequeninis ardia. As criaturas conhecidas como Cabeças Azuis haviam tomado as ruas em busca do cajado temporal, e entre fumaça, ruínas e gritos, Elyon sabia que não poderia vencê-las daquela maneira.',
        'Então segurou o cajado com ambas as mãos e fechou os olhos. O mundo parou. As cinzas ficaram suspensas no ar, a fumaça congelou sobre as casas destruídas e até o sangue que escorria de seus ferimentos pareceu esquecer como cair.',
        'Uma bolha atemporal nasceu ao redor do mago e, dentro dela, Elyon enxergou aquilo que poucos homens poderiam sequer imaginar: as linhas do tempo. Viu o passado, onde ele e seus companheiros estavam presos, e viu também a linha do presente, de onde haviam partido no início daquela aventura. Duas realidades que jamais deveriam se tocar.'
      ]
    },
    right: {
      paragraphs:[
        'Elyon estendeu as mãos e começou a aproximar as duas linhas. O espaço entre elas se rasgou como tecido, e um portal nasceu diante dele. Do outro lado estavam seus amigos.',
        'Eles o chamaram, tentaram fazê-lo atravessar, mas Elyon sabia que não poderia acompanhá-los. O esforço fazia seu corpo tremer e o sangue escorrer de seu rosto. Ainda assim, manteve o portal aberto até que o último de seus companheiros atravessasse. Então sorriu.',
        '— Vão. Eu encontro vocês depois.',
        'Era uma mentira, e talvez ele já soubesse disso.',
        'Quando o último passou, Elyon fechou a mão. O portal desapareceu. As linhas temporais se separaram novamente, e o tempo voltou a correr.'
      ]
    }
  },
  {
    left: {
      paragraphs:[
        'Pequeninis recebeu o silêncio apenas por um instante. Dezenas de Cabeças Azuis surgiram entre os escombros, cercando o mago ferido e exausto. Elyon mal conseguia permanecer de pé.',
        'Então seus olhos se fecharam e alguma coisa dentro dele despertou. Seu corpo ergueu-se sozinho, o cajado começou a flutuar e seus pés deixaram o chão.',
        'Não havia mais esforço em seus movimentos; sua mente e seu corpo pareciam agir por puro instinto, como se o próprio tempo tivesse encontrado nele uma última arma.',
        'Um Cabeça Azul desapareceu. Depois outro. E outro.',
        'Um por um, eram arrancados daquela realidade e lançados para outras linhas temporais: épocas em que Pequeninis jamais existira, futuros onde não havia homens, passados onde a magia ainda não possuía nome. Elyon permanecia imóvel no ar enquanto o mundo lutava através dele.',
        'Até que restaram apenas dois.'
      ]
    },
    right: {
      paragraphs:[
        'Elyon e o líder dos Cabeças Azuis começaram a flutuar lentamente um em direção ao outro, como se fossem atraídos por forças invisíveis. Os cidadãos que observavam perceberam que aquela já não era uma batalha de corpos. Era uma batalha de mentes.',
        'A criatura começou a se desfazer diante de seus olhos, primeiro os dedos, depois os braços, o rosto e finalmente sua própria existência.',
        'Ao mesmo tempo, Elyon começou a sangrar pelos olhos, pelo nariz e pela boca. Seu corpo tremia violentamente, como se cada pedaço da criatura arrancado daquela realidade também fosse arrancado de dentro dele.',
        'Então os dois gritaram juntos. Um único grito, gutural e agonizante, impossível de distinguir entre a voz do monstro e a do mago.',
        'E, quando o grito terminou, o Cabeça Azul desapareceu.',
        'Elyon caiu entre os escombros.'
      ]
    }
  },
  {
    left: {
      paragraphs:[
        'Foi a xerife quem o encontrou. Ela o retirou das ruínas e levou-o para uma acomodação, onde permaneceu desacordado por vários dias.',
        'Enquanto isso, Pequeninis começou a se reconstruir. As criaturas haviam desaparecido, as casas voltavam a ser levantadas e as ruas lentamente recuperavam seus habitantes.',
        'Até que, certa tarde, a xerife entrou no quarto e encontrou a cama vazia. Do lado de fora do saloon, porém, viu Elyon sentado tranquilamente, cercado por crianças que corriam ao seu redor.',
        'A cidade parecia viva novamente. O sol começava a desaparecer no horizonte e, por um breve momento, parecia que o mago havia se recuperado completamente.',
        'Mas a xerife sabia que havia algo errado. Elyon explicou que aquilo não era uma recuperação. Era uma última lucidez.'
      ]
    },
    right: {
      paragraphs:[
        '— O meu tempo já passou — disse ele, olhando para o céu avermelhado. — O que você está vendo é apenas o que me restou dele.',
        'Ainda assim, havia uma coisa que ele poderia fazer antes que aquele último instante terminasse. O velho poço de Pequeninis estava seco, e sem água a cidade jamais recuperaria sua antiga prosperidade.',
        'Elyon caminhou até ele e apoiou a mão sobre a pedra.',
        '— Essa cidade já perdeu demais — disse.',
        'Então começou seu último feitiço.',
        'O cajado temporal ergueu-se lentamente enquanto o vento desaparecia. As nuvens pararam no céu e uma luz envolveu o corpo do mago. Elyon fechou os olhos e buscou, através das linhas do tempo, aquilo que Pequeninis havia perdido.'
      ]
    }
  },
  {
    left: {
      paragraphs:[
        'Primeiro suas mãos começaram a se desfazer em pequenas partículas luminosas. Depois seus braços. Seu corpo inteiro começou a desaparecer enquanto ele puxava para aquela realidade as águas que um dia haviam corrido sob a cidade.',
        'O chão começou a tremer. As pedras do poço racharam e, do fundo da terra, veio o som de uma primeira gota.',
        'Depois outra.',
        'E então uma torrente.',
        'A água irrompeu do poço, espalhando-se pelas ruas e despertando antigas fontes e córregos. A terra seca começou a beber, as raízes voltaram a encontrar umidade e os campos, durante tanto tempo mortos, começaram a ganhar vida.',
        'Ao mesmo tempo, Elyon desaparecia. Seu peito tornou-se luz, suas pernas perderam a forma e seu rosto começou a se desfazer.',
        'A xerife correu até ele, chorando, mas Elyon apenas sorriu.',
        '— Eu sei — respondeu quando ela disse que ele morreria. — Mas ainda tinha energia para uma última coisa.'
      ]
    },
    right: {
      finale:true,
      paragraphs:[
        'Quando tudo terminou, restava apenas o cajado sobre a pedra do poço.',
        'Elyon havia desaparecido.',
        'As crianças de Pequeninis encontraram o cajado naquela noite. Ninguém soube dizer para onde o mago havia ido. Alguns acreditaram que morrera; outros disseram que havia sido levado pelo próprio tempo. A xerife, porém, guardou consigo as últimas palavras que ouvira dele.',
        'Anos depois, quando Pequeninis já havia se tornado novamente uma cidade próspera, uma criança perguntou quem havia sido Elyon. A velha xerife olhou para o poço, onde a água ainda corria, e respondeu:',
        '— Um homem que sabia o futuro.',
        '— Então ele sabia que morreria?',
        'Ela demorou a responder.',
        '— Sabia.',
        '— E mesmo assim ele morreu?',
        'A velha sorriu.'
      ],
      closing:'— Não. Ele escolheu.',
      gallery:true
    }
  }
];

function ElyonChapterPage({ page, pageNo, total, masterMode }) {
  return <article className={'elyon-chapter-page '+(page?.finale?'finale':'')}>
    {page?.eyebrow&&<div className="elyon-chapter-eyebrow">{page.eyebrow}</div>}
    {page?.title&&<h3 className="elyon-chapter-title">{page.title}</h3>}
    {page?.subtitle&&<div className="elyon-chapter-subtitle">{page.subtitle}</div>}
    {page?.quote&&<blockquote className="elyon-chapter-quote">{page.quote}</blockquote>}
    <div className="elyon-chapter-body">
      {(page?.paragraphs||[]).map((text,i)=><p key={i} className={String(text).trim().startsWith('—')?'dialogue':''}>{text}</p>)}
    </div>
    {page?.closing&&<div className="elyon-chapter-closing">{page.closing}</div>}
    {page?.gallery&&<div className="elyon-chapter-gallery">
      <div className="elyon-chapter-gallery-title">Memórias preservadas neste capítulo</div>
      <LivroImageGallery scope="chapter:elyon" masterMode={masterMode}/>
    </div>}
    <div className="elyon-chapter-folio">Elyon · {pageNo}/{total}</div>
  </article>;
}

`;

  livro = livro.replace(anchor, `${chapterBlock}\n${anchor}`);
}

livro = replaceRequired(
  livro,
  "const [tabPages,setTabPages]=useState({marcos:0,entidades:0,artefatos:0,mestre:0});",
  "const [tabPages,setTabPages]=useState({marcos:0,entidades:0,artefatos:0,elyon:0,mestre:0});",
  'estado de páginas do novo capítulo'
);

livro = replaceRequired(
  livro,
  "    {id:'artefatos',label:'Os 6 Artefatos',icon:'◆'},\n    {id:'mestre',label:'Páginas do Mestre',icon:'▤'},",
  "    {id:'artefatos',label:'Os 6 Artefatos',icon:'◆'},\n    {id:'elyon',label:'O Último Capítulo',icon:'⌛'},\n    {id:'mestre',label:'Páginas do Mestre',icon:'▤'},",
  'aba do capítulo de Elyon'
);

livro = replaceRequired(
  livro,
  "const totals={marcos:2,entidades:ENTITIES_DATA.length,artefatos:ARTEFATOS_DATA.length,mestre:1};",
  "const totals={marcos:2,entidades:ENTITIES_DATA.length,artefatos:ARTEFATOS_DATA.length,elyon:ELYON_CHAPTER_SPREADS.length,mestre:1};",
  'quantidade de spreads do capítulo'
);

livro = replaceRequired(
  livro,
  "  if(activeTab==='artefatos')[leftContent,rightContent]=ArtifactPages();\n  if(activeTab==='mestre')",
  "  if(activeTab==='artefatos')[leftContent,rightContent]=ArtifactPages();\n  if(activeTab==='elyon'){const chapter=ELYON_CHAPTER_SPREADS[spread]||ELYON_CHAPTER_SPREADS[0];const totalPages=ELYON_CHAPTER_SPREADS.length*2;leftContent=<ElyonChapterPage page={chapter.left} pageNo={spread*2+1} total={totalPages} masterMode={masterMode}/>;rightContent=<ElyonChapterPage page={chapter.right} pageNo={spread*2+2} total={totalPages} masterMode={masterMode}/>;}\n  if(activeTab==='mestre')",
  'renderização do capítulo'
);

const masterPageMarker = `              </>):(
                <div style={{fontSize:14,color:'#9A8A7A',lineHeight:1.85,fontStyle:'italic',whiteSpace:'pre-line'}}>{page.descricao||<span style={{color:'#4A4050'}}>Esta página ainda não foi escrita.</span>}</div>
              )}
            </div>`;
const masterPageReplacement = `              </>):(
                <div style={{fontSize:14,color:'#9A8A7A',lineHeight:1.85,fontStyle:'italic',whiteSpace:'pre-line'}}>{page.descricao||<span style={{color:'#4A4050'}}>Esta página ainda não foi escrita.</span>}</div>
              )}
              <LivroImageGallery scope={\`master-page:\${page.id}\`} masterMode={masterMode} compact/>
            </div>`;

livro = replaceRequired(
  livro,
  masterPageMarker,
  masterPageReplacement,
  'galeria de imagens das Páginas do Mestre'
);

fs.writeFileSync(livroFile, livro);

let css = fs.readFileSync(cssFile, 'utf8');
if (!css.includes('/* CAPITULO FINAL DE ELYON + IMAGENS HQ */')) {
  css += String.raw`

/* CAPITULO FINAL DE ELYON + IMAGENS HQ */
.elyon-chapter-page{position:relative;min-height:100%;padding-bottom:34px}
.elyon-chapter-eyebrow{text-transform:uppercase;letter-spacing:.34em;font:700 9px 'Cinzel',serif;color:#704b2e;margin-bottom:10px}
.elyon-chapter-title{margin:0 0 8px;font:900 clamp(23px,2.25vw,34px) 'Cinzel Decorative',serif;line-height:1.12;color:#3b2018;text-shadow:0 1px rgba(255,244,207,.55)}
.elyon-chapter-subtitle{font:600 12px 'Cinzel',serif;letter-spacing:.08em;line-height:1.55;color:#704b2e;margin-bottom:16px}
.elyon-chapter-quote{margin:18px 0 22px;padding:15px 18px;border-left:3px solid rgba(91,55,24,.52);border-right:1px solid rgba(91,55,24,.12);background:rgba(83,51,23,.075);font-style:italic;font-size:16px;line-height:1.55;color:#4e3124}
.elyon-chapter-body p{font-size:15.2px;line-height:1.74;margin:0 0 14px;text-align:justify;text-wrap:pretty}
.elyon-chapter-body p.dialogue{font-style:italic;color:#44291f;padding-left:10px;border-left:1px solid rgba(91,55,24,.25);text-align:left}
.elyon-chapter-page.finale .elyon-chapter-body p:nth-last-child(-n+5){margin-bottom:9px;text-align:left}
.elyon-chapter-closing{margin:22px 0 8px;padding:17px 12px;text-align:center;font:900 21px 'Cinzel Decorative',serif;color:#382017;letter-spacing:.03em;border-top:1px solid rgba(91,55,24,.28);border-bottom:1px solid rgba(91,55,24,.28);text-shadow:0 1px rgba(255,244,207,.7)}
.elyon-chapter-folio{position:absolute;right:0;bottom:2px;font:700 8px 'Cinzel',serif;letter-spacing:.22em;text-transform:uppercase;color:rgba(66,39,27,.5)}
.elyon-chapter-gallery{margin-top:24px;padding-top:16px;border-top:1px solid rgba(91,55,24,.25)}
.elyon-chapter-gallery-title{font:700 9px 'Cinzel',serif;letter-spacing:.22em;text-transform:uppercase;color:#704b2e;margin-bottom:10px}

.livro-hq-gallery{margin-top:14px}
.livro-hq-gallery.compact{margin-top:16px;padding-top:12px;border-top:1px solid rgba(168,85,247,.11)}
.livro-hq-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
.livro-hq-thumb{position:relative;min-width:0}
.livro-hq-open{position:relative;width:100%;padding:0;border:1px solid rgba(91,55,24,.34);border-radius:9px;overflow:hidden;background:#130d0a;cursor:zoom-in;box-shadow:0 6px 16px rgba(44,25,12,.25)}
.livro-hq-open img{display:block;width:100%;height:118px;object-fit:cover;image-rendering:auto;transition:transform .25s ease,filter .25s ease}
.livro-hq-open:hover img{transform:scale(1.025);filter:brightness(1.04)}
.livro-hq-open span{position:absolute;right:6px;bottom:6px;padding:4px 7px;border-radius:99px;background:rgba(8,5,4,.74);color:#ead9b0;font:700 8px 'Cinzel',serif;letter-spacing:.08em}
.livro-hq-remove{position:absolute;top:6px;right:6px;z-index:2;width:25px;height:25px;border-radius:50%;border:1px solid rgba(232,25,60,.42);background:rgba(33,6,9,.88);color:#ff7a8f;cursor:pointer}
.livro-hq-upload{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;margin-top:10px;padding:11px 12px;border:1px dashed rgba(91,55,24,.38);border-radius:9px;background:rgba(255,244,207,.09);color:#563727;cursor:pointer;text-align:center}
.livro-hq-upload input{display:none}
.livro-hq-upload span{font:700 10px 'Cinzel',serif;letter-spacing:.08em}
.livro-hq-upload small{font-size:10px;line-height:1.35;color:rgba(68,41,31,.72)}
.livro-master-embed .livro-hq-upload{border-color:rgba(168,85,247,.22);background:rgba(168,85,247,.045);color:#a990b6}
.livro-master-embed .livro-hq-upload small{color:#62536c}
.livro-hq-lightbox{position:fixed;inset:0;z-index:26000;display:grid;place-items:center;padding:30px;background:rgba(2,1,5,.94);backdrop-filter:blur(10px);cursor:zoom-out}
.livro-hq-lightbox img{display:block;max-width:94vw;max-height:88vh;width:auto;height:auto;object-fit:contain;image-rendering:auto;border-radius:10px;box-shadow:0 25px 90px rgba(0,0,0,.8),0 0 0 1px rgba(218,190,128,.2)}
.livro-hq-lightbox-close{position:fixed;top:18px;right:20px;width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(8,5,13,.9);color:#ead9f0;font-size:18px;cursor:pointer}
.livro-hq-caption{position:fixed;bottom:15px;left:50%;transform:translateX(-50%);max-width:80vw;padding:7px 12px;border-radius:99px;background:rgba(8,5,13,.8);color:#bdaac4;font:600 9px 'Cinzel',serif;letter-spacing:.08em;text-align:center}

@media(max-width:720px){
  .elyon-chapter-body p{font-size:14.5px;line-height:1.68;text-align:left}
  .elyon-chapter-title{font-size:25px}
  .elyon-chapter-quote{font-size:14px;padding:13px 14px}
  .livro-hq-grid{grid-template-columns:1fr}
  .livro-hq-open img{height:auto;max-height:260px;object-fit:contain;background:#120c08}
  .livro-hq-lightbox{padding:18px}
  .livro-hq-lightbox img{max-width:96vw;max-height:84vh}
}
`;
  fs.writeFileSync(cssFile, css);
}

for (const required of [
  'O Último Capítulo de Elyon',
  'Aquilo que o tempo escreveu, a Mandíbula já havia lido.',
  '— Não. Ele escolheu.',
  'LivroImageGallery',
  'BOOK_IMAGE_SAFE_LIMIT',
]) {
  if (!livro.includes(required)) throw new Error(`Capítulo de Elyon: validação final ausente (${required}).`);
}

console.log('Dinastia E: capítulo final de Elyon e imagens HQ do Livro preparados.');
