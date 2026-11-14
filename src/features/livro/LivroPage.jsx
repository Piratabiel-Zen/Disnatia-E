import AcquiredKnowledge from "../../experience/AcquiredKnowledge";
import ImageViewer from "../../experience/ImageViewer";
import { onSnapshot } from '../../adventure/sharedSnapshot';
import { useEffect,useRef,useState } from "react";
import { collection,deleteDoc,doc,setDoc } from "firebase/firestore";
import { db } from "../../core/firebase";
import { compressImage } from "../../core/media";
import { MILESTONES,ENTITIES_DATA,ARTEFATOS_DATA,getArtifactPowers,ArtifactGlyph } from "../../data/gameData";

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
    {lightbox&&<ImageViewer src={lightbox.img} title={lightbox.nome||"Ilustração ampliada"} onClose={()=>setLightbox(null)}/>}
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


const newMasterPage=id=>({id,titulo:'',dataAquisicao:new Date().toLocaleDateString('pt-BR'),descricao:''});
// ─── PÁGINAS DO MESTRE NO LIVRO DA MANDÍBULA ─────────────────────────────────
function MasterPagesBook({masterMode}){
  const[pages,setPages]=useState([]);const[loaded,setLoaded]=useState(false);const[open,setOpen]=useState(null);
  const saveTimeout=useRef({});
  useEffect(()=>{const unsub=onSnapshot(collection(db,'livro_pages'),snap=>{const data=snap.docs.map(d=>({id:d.id,...d.data()}));data.sort((a,b)=>b.id-a.id);setPages(data);setLoaded(true);});return()=>unsub();},[]);
  const save=p=>{clearTimeout(saveTimeout.current[p.id]);saveTimeout.current[p.id]=setTimeout(async()=>{try{await setDoc(doc(db,'livro_pages',String(p.id)),p);}catch(e){console.error(e);}},700);};
  const add=()=>{const p=newMasterPage(Date.now());setDoc(doc(db,'livro_pages',String(p.id)),p);setOpen(p.id);};
  const upd=(id,data)=>{setPages(prev=>prev.map(p=>p.id===id?data:p));save(data);};
  const del=async id=>{await deleteDoc(doc(db,'livro_pages',String(id)));if(open===id)setOpen(null);};

  return(
    <div>
      <div style={{marginBottom:20,padding:'14px 18px',border:'1px solid rgba(168,85,247,0.18)',borderRadius:10,background:'rgba(168,85,247,0.05)',fontFamily:'Crimson Text,Georgia,serif',fontSize:14,color:'#9A8A9A',lineHeight:1.8,fontStyle:'italic',textAlign:'center'}}>
        "Páginas escritas pelos escribas do Mestre — registros do que o grupo descobriu, ganhou ou testemunhou ao longo de sua jornada."
      </div>
      {masterMode&&<div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}><button onClick={add} style={{padding:'8px 20px',borderRadius:8,border:'1px solid rgba(168,85,247,0.4)',background:'rgba(168,85,247,0.1)',color:'#C8A8E8',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:12,letterSpacing:'0.08em'}}>+ Nova Página</button></div>}
      {!loaded&&<div style={{textAlign:'center',color:'#5A5070',fontFamily:'Cinzel,serif',fontSize:13,padding:30}}>Conectando ao cosmos...</div>}
      {loaded&&pages.length===0&&<div style={{textAlign:'center',padding:38,border:'1px dashed rgba(168,85,247,0.18)',borderRadius:12}}><div style={{fontSize:30,marginBottom:10}}>📖</div><div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#6A5A7A'}}>Nenhuma página adicionada ainda.</div><div style={{fontSize:12,marginTop:5,color:'#4A4050'}}>{masterMode?'Clique em "+ Nova Página" para começar.':'Aguarde o Mestre registrar novas descobertas.'}</div></div>}
      {pages.map(page=>(
        <div key={page.id} style={{border:'1px solid rgba(168,85,247,0.15)',borderRadius:11,marginBottom:11,overflow:'hidden',background:'rgba(8,10,22,0.85)'}}>
          <div onClick={()=>setOpen(open===page.id?null:page.id)} style={{padding:'13px 17px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',userSelect:'none'}}>
            <span style={{fontSize:17}}>📖</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#C8A8E8',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{page.titulo||'(Sem título)'}</div>
              <div style={{fontSize:11,color:'#5A5070',marginTop:2,fontFamily:'Cinzel,serif',letterSpacing:'0.03em'}}>📅 {page.dataAquisicao}</div>
            </div>
            <div style={{display:'flex',gap:7}}>
              {masterMode&&<button onClick={e=>{e.stopPropagation();del(page.id);}} style={{background:'rgba(232,25,60,0.09)',border:'1px solid rgba(232,25,60,0.22)',color:'#E8193C',borderRadius:5,cursor:'pointer',padding:'3px 8px',fontSize:11}}>✕</button>}
              <span style={{color:'rgba(168,85,247,0.4)',fontSize:11,transform:open===page.id?'rotate(90deg)':'none',transition:'transform 0.3s',display:'flex',alignItems:'center'}}>▶</span>
            </div>
          </div>
          {open===page.id&&(
            <div style={{padding:'0 17px 17px',borderTop:'1px solid rgba(168,85,247,0.1)',animation:'pageTurn 0.3s ease'}}>
              <div style={{height:11}}/>
              {masterMode?(<>
                <div style={{display:'grid',gridTemplateColumns:'1fr 140px',gap:10,marginBottom:11}}>
                  <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Título</label><input value={page.titulo||''} onChange={e=>upd(page.id,{...page,titulo:e.target.value})} placeholder="Ex: O Pacto com o Homem Água..." style={{width:'100%'}}/></div>
                  <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Data</label><input value={page.dataAquisicao||''} onChange={e=>upd(page.id,{...page,dataAquisicao:e.target.value})} style={{width:'100%'}}/></div>
                </div>
                <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Descritivo</label><textarea value={page.descricao||''} onChange={e=>upd(page.id,{...page,descricao:e.target.value})} rows={6} style={{width:'100%',resize:'vertical',lineHeight:1.85}}/></div>
                <div style={{marginTop:7,fontSize:11,color:'#4A4050',textAlign:'right',fontFamily:'Cinzel,serif'}}>salvo automaticamente</div>
              </>):(
                <div style={{fontSize:14,color:'#9A8A7A',lineHeight:1.85,fontStyle:'italic',whiteSpace:'pre-line'}}>{page.descricao||<span style={{color:'#4A4050'}}>Esta página ainda não foi escrita.</span>}</div>
              )}
              <LivroImageGallery scope={`master-page:${page.id}`} masterMode={masterMode} compact/>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── LIVRO DA MANDÍBULA ───────────────────────────────────────────────────────
function LibroSection({masterMode}){
  const [activeTab,setActiveTab]=useState('marcos');
  const [tabPages,setTabPages]=useState({marcos:0,entidades:0,artefatos:0,elyon:0,mestre:0});
  const [mobileSide,setMobileSide]=useState(0);
  const [turning,setTurning]=useState(false);
  const [turnDir,setTurnDir]=useState(1);
  const touchStart=useRef(null);
  const [unlocked,setUnlocked]=useState({});
  const [artefatosUnlocked,setArtefatosUnlocked]=useState({});
  const [coordRevealed,setCoordRevealed]=useState(false);
  const [artefatosHabs,setArtefatosHabs]=useState({});
  const [formHab,setFormHab]=useState({});

  useEffect(()=>{
    const u1=onSnapshot(doc(db,'config','entities'),snap=>{if(snap.exists())setUnlocked(snap.data().unlocked||{});});
    const u2=onSnapshot(doc(db,'config','artefatos'),snap=>{if(snap.exists())setArtefatosUnlocked(snap.data().unlocked||{});});
    const u3=onSnapshot(doc(db,'config','prophecy'),snap=>{if(snap.exists())setCoordRevealed(snap.data().coordRevealed||false);});
    const u4=onSnapshot(doc(db,'config','artefatos_habilidades'),snap=>{if(snap.exists())setArtefatosHabs(snap.data()||{});});
    return()=>{u1();u2();u3();u4();};
  },[]);

  const toggleUnlock=async id=>{const updated={...unlocked,[id]:!unlocked[id]};await setDoc(doc(db,'config','entities'),{unlocked:updated});};
  const toggleArtefato=async id=>{const updated={...artefatosUnlocked,[id]:!artefatosUnlocked[id]};await setDoc(doc(db,'config','artefatos'),{unlocked:updated});};
  const toggleCoord=async()=>setDoc(doc(db,'config','prophecy'),{coordRevealed:!coordRevealed});
  const saveHab=async artefatoId=>{const nova=formHab[artefatoId];if(!nova?.nome)return;const next={...artefatosHabs,[artefatoId]:[...(artefatosHabs[artefatoId]||[]),{...nova,id:Date.now()}]};await setDoc(doc(db,'config','artefatos_habilidades'),next);setFormHab(p=>({...p,[artefatoId]:{nome:'',descricao:'',custo:'',dano:'',cooldown:''}}));};
  const deleteHab=async(artefatoId,habId)=>{const next={...artefatosHabs,[artefatoId]:(artefatosHabs[artefatoId]||[]).filter(h=>h.id!==habId)};await setDoc(doc(db,'config','artefatos_habilidades'),next);};
  const isEntityRevealed=(ent,i)=>i<2||!!unlocked[ent.id];

  const tabs=[
    {id:'marcos',label:'Marcos & Profecia',icon:'▣'},
    {id:'entidades',label:'As Seis Entidades',icon:'◈'},
    {id:'artefatos',label:'Os 6 Artefatos',icon:'✧'},
    {id:'elyon',label:'O Último Capítulo',icon:'⌛'},
    {id:'mestre',label:'Páginas do Mestre',icon:'▤'},
    {id:'magias',label:'Magias adquiridas',icon:'✦'},
    {id:'arquivos',label:'Arquivos adquiridos',icon:'▤'},
  ];
  const totals={marcos:2,entidades:ENTITIES_DATA.length,artefatos:ARTEFATOS_DATA.length,elyon:ELYON_CHAPTER_SPREADS.length,mestre:1};
  const spread=tabPages[activeTab]||0;
  const acquired=activeTab==='magias'||activeTab==='arquivos';

  const changeTab=id=>{if(turning)return;setActiveTab(id);setMobileSide(0);};
  const turnPage=dir=>{
    if(turning||acquired)return;
    if(window.innerWidth<=720){
      if(dir>0&&mobileSide===0){setTurnDir(1);setTurning(true);setTimeout(()=>setMobileSide(1),390);setTimeout(()=>setTurning(false),900);return;}
      if(dir<0&&mobileSide===1){setTurnDir(-1);setTurning(true);setTimeout(()=>setMobileSide(0),390);setTimeout(()=>setTurning(false),900);return;}
    }
    const next=Math.max(0,Math.min(totals[activeTab]-1,spread+dir));
    if(next===spread)return;
    setTurnDir(dir);setTurning(true);
    setTimeout(()=>{setTabPages(p=>({...p,[activeTab]:next}));setMobileSide(dir>0?0:1);},390);
    setTimeout(()=>setTurning(false),900);
  };

  useEffect(()=>{
    const onKey=e=>{if(e.key==='ArrowRight')turnPage(1);if(e.key==='ArrowLeft')turnPage(-1);};
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  },[activeTab,spread,turning,mobileSide]);

  const milestoneDescriptions={
    'Descoberta e controle do fogo':'O domínio das chamas inaugurou a era da transformação.',
    'Revolução agrícola — os humanos se tornam sedentários':'A civilização começa a florescer e a memória passa a criar raízes.',
    'Surgimento das primeiras civilizações: Mesopotâmia e Egito':'Culturas antigas erguem os pilares do conhecimento.',
    'Albert Einstein publica a Teoria da Relatividade':'A compreensão do tempo e do espaço muda para sempre.',
    'Era Atômica — o poder de destruição da humanidade se torna real':'O poder de destruição da humanidade se torna real.',
  };
  const milestoneChunk=spread===0?MILESTONES.slice(0,5):MILESTONES.slice(5);

  const MarcosLeft=()=> <>
    <h3 className="livro-page-title">{spread===0?'Marcos da Humanidade':'Os Últimos Presságios'}</h3>
    <div className="livro-timeline">{milestoneChunk.map((m,i)=><div className="livro-milestone" key={`${m.year}-${i}`}>
      <div className="livro-milestone-icon">{m.icon}</div><div><div className="livro-year">{m.year}</div><div className="livro-event">{m.event}</div><div className="livro-desc">{milestoneDescriptions[m.event]||(m.prophecy?'Quatro estrelas aparecem nos céus de Cosmum. Elas se aproximam.':'Um novo capítulo muda o destino da humanidade.')}</div></div>
    </div>)}</div>
  </>;
  const MarcosRight=()=>spread===0?<>
    <h3 className="livro-page-title">Revelação do Livro</h3>
    <div className="livro-revelation"><p>Estes escritos foram deixados pelos primeiros <strong>Magos do Prólogo</strong> para guiar aqueles que vierem depois.</p><p>Aqui estão registrados os marcos da humanidade, as entidades que nos observam, os artefatos capazes de mudar destinos e as páginas que o Mestre escreve conforme a história se desenrola.</p><p className="emphasis">Cada página é uma verdade. Cada escolha, uma consequência.<br/>Que a Mandíbula guie seus passos.</p><div className="livro-info-grid"><div className="livro-engraved"><strong>◈ As Seis Entidades</strong><span>Seis forças antigas que moldam o destino.</span></div><div className="livro-engraved"><strong>◆ Os 6 Artefatos</strong><span>Seis relíquias de poder inimaginável.</span></div><div className="livro-engraved"><strong>▤ Páginas do Mestre</strong><span>Páginas mágicas escritas conforme a jornada avança.</span></div></div></div><div className="livro-note">Novas páginas serão preenchidas conforme a história avança.<br/>Volte sempre e descubra o que foi revelado.</div>
  </>:<>
    <h3 className="livro-page-title">A Profecia das Quatro Estrelas</h3><div className="livro-revelation"><div className="prophecy-stars" aria-label="Quatro estrelas da profecia"><span className="prophecy-star blue">✦</span><span className="prophecy-star yellow">✦</span><span className="prophecy-star red">✦</span><span className="prophecy-star purple">✦</span></div><p>“Quatro estrelas surgirão nos céus de Cosmum — visíveis tanto de dia quanto de noite. A cada dia que passa, elas se aproximam.”</p><p>Quando chegarem ao máximo possível de proximidade, algo acontecerá. O Livro não ousou descrever.</p>{coordRevealed?<><div className="livro-section-label">As Coordenadas do Destino</div><div style={{font:'700 18px Cinzel,serif',letterSpacing:'.13em',color:'#6d358c'}}>45° 30′ 53.6″ N<br/>25° 22′ 1.8″ E</div>{masterMode&&<button onClick={toggleCoord} style={parchmentBtn}>Selar novamente</button>}</>:<><div className="livro-seal">⌾</div><p>A próxima passagem permanece selada por uma magia poderosa.</p>{masterMode&&<button onClick={toggleCoord} style={parchmentBtn}>Quebrar selo</button>}</>}</div>
  </>;

  const EntityPages=()=>{const ent=ENTITIES_DATA[spread];const revealed=isEntityRevealed(ent,spread);return [
    revealed?<div className="livro-record"><div className="livro-record-icon">{ent.icon}</div><div className="livro-record-name">{ent.name}</div><div className="livro-status">Entidade registrada</div>{spread>=2&&masterMode&&<button onClick={()=>toggleUnlock(ent.id)} style={parchmentBtn}>Ocultar registro</button>}</div>:<div className="livro-locked"><div className="livro-seal">🔒</div><h3 className="livro-page-title">Registro Selado</h3><p>O nome desta entidade foi apagado das páginas. Seu símbolo aguarda revelação.</p>{masterMode&&<button onClick={()=>toggleUnlock(ent.id)} style={parchmentBtn}>Revelar entidade</button>}</div>,
    revealed?<div><h3 className="livro-page-title">Registro da Entidade</h3><div className="livro-section-label">Lore & Origem</div><div className="livro-copy">{ent.lore||'A origem desta entidade ainda não foi registrada.'}</div><div className="livro-section-label">Características Físicas</div><div className="livro-copy">{ent.fisico||'Sua forma verdadeira permanece envolta em sombras e versões contraditórias.'}</div><div className="livro-note">Conhecimento atual dos jogadores: {spread<2?'parcialmente revelado':'registro autorizado pelo Mestre'}.</div></div>:<div className="livro-locked"><div style={{fontSize:44}}>◈</div><p>“Registro ainda não revelado.”</p><p>As palavras foram cobertas por tinta e seladas por runas.</p></div>
  ]};

  const ArtifactPages=()=>{const art=ARTEFATOS_DATA[spread];const revealed=!!artefatosUnlocked[art.id];const canSee=masterMode||revealed;const powers=getArtifactPowers(art,artefatosHabs);return [
    canSee?<div className="livro-record"><div className="livro-record-icon"><ArtifactGlyph art={art} size={96}/></div><div className="livro-record-name">{art.name}</div><div className="livro-status">{revealed?'Artefato revelado':'Visível apenas ao Mestre'}</div>{masterMode&&<button onClick={()=>toggleArtefato(art.id)} style={parchmentBtn}>{revealed?'Selar artefato':'Revelar'}</button>}</div>:<div className="livro-locked"><div className="livro-seal">◆</div><h3 className="livro-page-title">Artefato {spread+1}</h3><p>Esta relíquia permanece selada por uma magia poderosa.</p>{masterMode&&<button onClick={()=>toggleArtefato(art.id)} style={parchmentBtn}>Revelar</button>}</div>,
    canSee?<div>
      <h3 className="livro-page-title">{art.name}</h3>
      <div className="livro-section-label">Descrição & Origem</div>
      <div className="livro-copy" style={{whiteSpace:'pre-line'}}>{art.lore||'Informações sobre este artefato serão reveladas conforme a campanha avança.'}</div>
      {art.fisico&&<><div className="livro-section-label">Registro físico</div><div className="livro-copy" style={{whiteSpace:'pre-line'}}>{art.fisico}</div></>}
      {art.requisitos&&<><div className="livro-section-label">Requisitos para o Portador</div><div className="livro-note" style={{textAlign:'left'}}>{art.requisitos.texto}</div></>}
      {art.ruptura&&<><div className="livro-section-label">Rupturas Temporais</div><div className="livro-copy">{art.ruptura}</div></>}
      {art.risco&&<><div className="livro-section-label">Risco</div><div className="livro-note" style={{textAlign:'left',borderColor:'rgba(125,48,81,.55)',color:'#78364f'}}>{art.risco}</div></>}
      <div className="livro-section-label">Poderes registrados</div>
      {powers.length===0?<div className="livro-copy" style={{fontStyle:'italic'}}>Nenhum poder foi inscrito nesta página.</div>:powers.map(h=><div className="livro-engraved" key={h.id} style={{textAlign:'left',marginBottom:8}}><strong>{h.nome}{h.custo!==undefined&&h.custo!==''?(Number(h.custo)===0?' · Sem custo':` · ${h.custo} VC`):''}</strong><span>{h.dano&&`⚔ ${h.dano} · `}{h.cooldown&&h.cooldown!=='—'&&`⏱ ${h.cooldown} · `}{h.descricao}</span>{masterMode&&!h.builtIn&&<button onClick={()=>deleteHab(art.id,h.id)} style={{...parchmentBtn,float:'right',marginTop:5}}>Remover</button>}</div>)}
      {masterMode&&<div style={{marginTop:12,borderTop:'1px solid rgba(91,55,24,.28)',paddingTop:12}}><input value={formHab[art.id]?.nome||''} onChange={e=>setFormHab(p=>({...p,[art.id]:{...p[art.id],nome:e.target.value}}))} placeholder="Nome do poder" style={parchmentInput}/><textarea value={formHab[art.id]?.descricao||''} onChange={e=>setFormHab(p=>({...p,[art.id]:{...p[art.id],descricao:e.target.value}}))} placeholder="Descrição" rows={2} style={parchmentInput}/><div style={{display:'flex',gap:6}}><input value={formHab[art.id]?.dano||''} onChange={e=>setFormHab(p=>({...p,[art.id]:{...p[art.id],dano:e.target.value}}))} placeholder="Dano" style={parchmentInput}/><input value={formHab[art.id]?.custo||''} onChange={e=>setFormHab(p=>({...p,[art.id]:{...p[art.id],custo:e.target.value}}))} placeholder="VC" style={parchmentInput}/><input value={formHab[art.id]?.cooldown||''} onChange={e=>setFormHab(p=>({...p,[art.id]:{...p[art.id],cooldown:e.target.value}}))} placeholder="Recarga" style={parchmentInput}/></div><button onClick={()=>saveHab(art.id)} style={parchmentBtn}>Inscrever poder</button></div>}
    </div>:<div className="livro-locked"><div style={{fontSize:54}}>◇</div><p>Nome, origem e poder foram apagados desta página.</p></div>
  ]};

  let leftContent,rightContent;
  if(activeTab==='marcos'){leftContent=<MarcosLeft/>;rightContent=<MarcosRight/>;}
  if(activeTab==='entidades')[leftContent,rightContent]=EntityPages();
  if(activeTab==='artefatos')[leftContent,rightContent]=ArtifactPages();
  if(activeTab==='elyon'){const chapter=ELYON_CHAPTER_SPREADS[spread]||ELYON_CHAPTER_SPREADS[0];const totalPages=ELYON_CHAPTER_SPREADS.length*2;leftContent=<ElyonChapterPage page={chapter.left} pageNo={spread*2+1} total={totalPages} masterMode={masterMode}/>;rightContent=<ElyonChapterPage page={chapter.right} pageNo={spread*2+2} total={totalPages} masterMode={masterMode}/>;}
  if(activeTab==='mestre'){leftContent=<div className="livro-record"><div className="livro-record-icon">✒</div><div className="livro-record-name">Páginas do Mestre</div><div className="livro-copy" style={{marginTop:16}}>Registros encontrados durante a campanha aparecem como folhas anexadas ao artefato.</div></div>;rightContent=<div><h3 className="livro-page-title">Registros da Jornada</h3><div className="livro-master-embed"><MasterPagesBook masterMode={masterMode}/></div></div>}

  const hasPrev=spread>0||mobileSide===1;
  const hasNext=spread<totals[activeTab]-1||mobileSide===0;
  return <div className={`livro-shell ${activeTab==='artefatos'?'livro-artifacts-premium':''}`} onTouchStart={e=>touchStart.current=e.touches[0]?.clientX} onTouchEnd={e=>{if(touchStart.current==null)return;const dx=e.changedTouches[0].clientX-touchStart.current;if(Math.abs(dx)>45)turnPage(dx<0?1:-1);touchStart.current=null;}}>
    <header className="livro-heading"><div className="livro-kicker">{activeTab==='artefatos'?'Relíquias Supremas · Registros Selados':'O Artefato da Profecia'}</div><h2 className="livro-title">Livro da Mandíbula</h2><div className="livro-ornament"/></header>
    <nav className="livro-tabs" aria-label="Seções do Livro da Mandíbula">{tabs.map(t=><button className={`livro-tab ${activeTab===t.id?'active':''}`} key={t.id} onClick={()=>changeTab(t.id)}><span style={{marginRight:9}}>{t.icon}</span>{t.label}</button>)}</nav>
    {acquired?<AcquiredKnowledge key={activeTab} section={activeTab}/>:<><div className={`livro-stage ${turning?'livro-turning':''}`} style={{'--flip-dir':`${turnDir*16}deg`}}>
      <button className="livro-arrow prev" onClick={()=>turnPage(-1)} disabled={!hasPrev} aria-label="Página anterior">‹</button>
      <div className="livro-cover"><div className="livro-pages">{turning&&<div className={`livro-page-flip ${turnDir>0?'forward':'backward'}`} aria-hidden="true" onAnimationEnd={()=>setTurning(false)}/>}<section className={`livro-page left ${mobileSide===0?'mobile-visible':''}`}>{leftContent}</section><section className={`livro-page right ${mobileSide===1?'mobile-visible':''}`}>{rightContent}</section><div className="livro-gutter"/></div><div className="livro-bookmark"/></div>
      <button className="livro-arrow next" onClick={()=>turnPage(1)} disabled={!hasNext} aria-label="Próxima página">›</button>
    </div>
    <div className="livro-page-count">{tabs.find(t=>t.id===activeTab)?.label} · Página {spread+1} de {totals[activeTab]}</div></>}
  </div>;
}

const parchmentBtn={marginTop:14,padding:'7px 13px',border:'1px solid rgba(91,55,24,.5)',background:'rgba(111,61,24,.09)',color:'#533822',fontFamily:'Cinzel,serif',fontSize:10,fontWeight:600,letterSpacing:'.06em',cursor:'pointer',borderRadius:3};
const parchmentInput={width:'100%',marginBottom:6,padding:'7px 8px',border:'1px solid rgba(91,55,24,.4)',background:'rgba(255,246,210,.38)',color:'#3c2c20',fontFamily:'Crimson Text,serif',fontSize:13,borderRadius:3};

// ─── CRÔNICAS ─────────────────────────────────────────────────────────────────

export default LibroSection;
