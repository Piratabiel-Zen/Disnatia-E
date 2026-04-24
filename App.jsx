import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, collection, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAnaJjwoJ6YgGrR5pIoPrTIj7PculaIfyA",
  authDomain: "dinastia-e-a4b28.firebaseapp.com",
  projectId: "dinastia-e-a4b28",
  storageBucket: "dinastia-e-a4b28.firebasestorage.app",
  messagingSenderId: "855332392669",
  appId: "1:855332392669:web:9fc06c8f633bb8cce89534",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function compressImage(dataUrl, maxW=900, maxH=900, quality=0.72){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.width,h=img.height;
      if(w>maxW||h>maxH){const r=Math.min(maxW/w,maxH/h);w=Math.round(w*r);h=Math.round(h*r);}
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      resolve(canvas.toDataURL('image/jpeg',quality));
    };
    img.onerror=()=>resolve(dataUrl);
    img.src=dataUrl;
  });
}

const GLOBAL_CSS=`
@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
html,body,#root{margin:0;padding:0;height:100%;background:#04060F;}
*{box-sizing:border-box;}
::-webkit-scrollbar{width:5px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(155,89,182,0.4);border-radius:3px;}
@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes shimmer{0%,100%{opacity:0.4}50%{opacity:1}}
@keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}}
input,textarea,select{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.11);color:#C8B8A0;border-radius:6px;font-family:'Crimson Text',Georgia,serif;font-size:15px;padding:6px 10px;outline:none;transition:border-color 0.2s;}
input:focus,textarea:focus,select:focus{border-color:rgba(155,89,182,0.55);}
input[type=number]::-webkit-inner-spin-button{opacity:1;}
select option{background:#0E1020;}
button{font-family:'Crimson Text',Georgia,serif;}
`;

const SHEET_COLORS={fogo:'#1EC8FF',escarlate:'#E8193C',corvos:'#E8A020',magos:'#A855F7',marfim:'#4ADE80'};
const SHEET_GLOWS={fogo:'rgba(30,200,255,0.16)',escarlate:'rgba(232,25,60,0.16)',corvos:'rgba(232,160,32,0.16)',magos:'rgba(168,85,247,0.16)',marfim:'rgba(74,222,128,0.16)'};
const MASTER_PIN='dinastia';

const CLASSES=[
  {id:'fogo',alcance:'1m',name:'Assassinos do Fogo Azul',icon:'🔥',color:'#1EC8FF',glow:'rgba(30,200,255,0.16)',role:'Assassino · DPS Furtivo',passive:{name:'Energia Vital',desc:'A cada 3 rodadas ganha 2 pontos.'},normal:[{name:'Esquiva da Catedral',cost:2,cooldown:'4 rodadas',dano:'—',desc:'Esquiva de qualquer ataque.'},{name:'Golpe Cintilante',cost:2,cooldown:'3 rodadas',dano:'1D6+2',desc:'Estocada veloz que atravessa o alvo.'},{name:'Clemência Letal',cost:2,cooldown:'4 rodadas',dano:'—',desc:'+3 em quaisquer atributos por 2 rodadas.'}],specials:[{name:'Olho da Mente',cost:3,cooldown:'4 rodadas',dano:'2D8',desc:'Vê os pontos fracos do oponente.',req:3},{name:'Fúria Flamejante',cost:3,cooldown:'5 rodadas',dano:'1D10+4',desc:'Envolve-se em chamas azuis.',req:7}]},
  {id:'escarlate',alcance:'1m',name:'Cavaleiros Escarlate',icon:'🛡️',color:'#E8193C',glow:'rgba(232,25,60,0.16)',role:'Tanque · Protetor',passive:{name:'Pele de Rubi',desc:'Ganha atributos bônus de defesa.'},normal:[{name:'Reflexo Escarlate',cost:2,cooldown:'3 rodadas',dano:'0.5x',desc:'Reflete o dano recebido.'},{name:'Lança Defensiva',cost:2,cooldown:'1 rodada',dano:'1D6',desc:'Arremessa o escudo no inimigo.'},{name:'Investida Ágil',cost:2,cooldown:'2 rodadas',dano:'—',desc:'Move-se 3 passos em 1 ação.'}],specials:[{name:'Provocação Extrema',cost:3,cooldown:'4 rodadas',dano:'—',desc:'Todos os inimigos focam em você.',req:3},{name:'Modo Berserker',cost:3,cooldown:'4 rodadas',dano:'2D10+6',desc:'Troca resistência por dano.',req:7}]},
  {id:'corvos',alcance:'5m',name:'Corvos do Horizonte',icon:'🦅',color:'#E8A020',glow:'rgba(232,160,32,0.16)',role:'Atirador · Precisão Absoluta',passive:{name:'Visão do Gavião',desc:'Nunca sofre penalidade por distância.'},normal:[{name:'Sniper Americano',cost:2,cooldown:'—',dano:'0.5x',desc:'Garante acerto em alvos de 5–10 metros.'},{name:'Saque Rápido',cost:2,cooldown:'2 rodadas',dano:'1D8',desc:'Realiza um ataque fora do turno.'},{name:'Foco Absoluto',cost:2,cooldown:'2 rodadas',dano:'—',desc:'Garante acerto crítico na próxima rodada.'}],specials:[{name:'Precisão Celestial',cost:3,cooldown:'4 rodadas',dano:'1D12',desc:'Disparo crítico perfurante.',req:3},{name:'Chuva Mortal',cost:3,cooldown:'5 rodadas',dano:'3D6',desc:'Múltiplos acertos em área.',req:7}]},
  {id:'magos',alcance:'5m',name:'Magos do Prólogo do Céu',icon:'☄️',color:'#A855F7',glow:'rgba(168,85,247,0.16)',role:'Vidente · Mago Cósmico',passive:{name:'Visão Profética',desc:'Podem ver acontecimentos futuros.'},normal:[{name:'Fortitude Ígnia',cost:2,cooldown:'1× por combate',dano:'—',desc:'Um aliado recebe +3 de defesa.'},{name:'Fluxo de Magia',cost:2,cooldown:'4 rodadas',dano:'—',desc:'Buffa dano dos aliados em +2.'},{name:'Telecinese',cost:2,cooldown:'variável',dano:'1D6',desc:'Controla e arremessa objetos.'}],specials:[{name:'Recuperação Divina',cost:3,cooldown:'7 rodadas',dano:'—',desc:'Remove efeitos negativos e cura.',req:3},{name:'Flecha do Último Guardião',cost:3,cooldown:'5 rodadas',dano:'1D12+6',desc:'Invoca arco gigante com elemento.',req:7}]},
  {id:'marfim',alcance:'1m',name:'Cientistas de Marfim',icon:'🧪',color:'#4ADE80',glow:'rgba(212,197,169,0.16)',role:'Inventor · Gênio Adaptável',passive:{name:'Percepção Elevada',desc:'Pode revelar objetos escondidos.'},normal:[{name:'Material de Pesquisa',cost:2,cooldown:'—',dano:'—',desc:'Combina itens em um novo item.'},{name:'Seringa da Juventude',cost:2,cooldown:'3 rodadas',dano:'—',desc:'Cura 2 de vida ao alvo.'},{name:'QI Distorcido',cost:2,cooldown:'1× por arma',dano:'+1D4',desc:'Melhora qualquer arma.'}],specials:[{name:'O 1° Alquimista',cost:3,cooldown:'4 rodadas',dano:'2D8+4',desc:'Combina itens criando algo poderoso.',req:3},{name:'Anti-Matéria',cost:3,cooldown:'6 rodadas',dano:'3D10',desc:'Invoca antimatéria com efeitos.',req:7}]},
];

const ATTRS=[{key:'forca',label:'Força',color:'#E8193C'},{key:'agilidade',label:'Agilidade',color:'#E8A020'},{key:'durabilidade',label:'Durabilidade',color:'#1EC8FF'},{key:'inteligencia',label:'Inteligência',color:'#A855F7'},{key:'percepcao',label:'Percepção',color:'#D4C5A9'}];

function resolveEquipIcon(tipo=''){
  if(!tipo)return'📦';
  const t=tipo.toLowerCase();
  if(t.includes('pistola')||t.includes('rifle'))return'🔫';
  if(t.includes('arco')||t.includes('besta'))return'🏹';
  if(t.includes('bomba')||t.includes('granada'))return'💣';
  if(t.includes('espada'))return'⚔️';
  if(t.includes('adaga')||t.includes('faca'))return'🗡️';
  if(t.includes('escudo'))return'🛡️';
  if(t.includes('martelo')||t.includes('maça'))return'🔨';
  if(t.includes('machado'))return'🪓';
  if(t.includes('armadura')||t.includes('couraça'))return'🦺';
  if(t.includes('manto')||t.includes('capa'))return'🎽';
  if(t.includes('bota')||t.includes('sandália'))return'👟';
  if(t.includes('luva'))return'🥊';
  if(t.includes('poção')||t.includes('frasco'))return'🧪';
  if(t.includes('cajado')||t.includes('varinha'))return'🪄';
  if(t.includes('livro')||t.includes('grimório'))return'📖';
  if(t.includes('orbe')||t.includes('cristal'))return'🔮';
  if(t.includes('bolsa')||t.includes('mochila'))return'🎒';
  if(t.includes('anel')||t.includes('amuleto'))return'💍';
  if(t.includes('colar'))return'📿';
  return'📦';
}

function AttrDots({value,color,onChange}){
  return(
    <div style={{display:'flex',gap:4}}>
      {Array.from({length:10}).map((_,i)=>(
        <button key={i} onClick={()=>onChange(i<value?(i===value-1?0:i+1):i+1)} 
          style={{width:15,height:15,borderRadius:'50%',border:`1.5px solid ${i<value?color:'rgba(255,255,255,0.12)'}`,background:i<value?color+'44':'transparent',cursor:'pointer',transition:'all 0.15s',padding:0,flexShrink:0}}/>
      ))}
    </div>
  );
}

function VigosDots({value,max,color,onChange}){
  return(
    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
      {Array.from({length:max}).map((_,i)=>(
        <button key={i} onClick={()=>onChange(i<value?(i===value-1?0:i+1):i+1)} 
          style={{width:22,height:22,borderRadius:'50%',border:`1.5px solid ${i<value?color:'rgba(255,255,255,0.13)'}`,background:i<value?color+'33':'transparent',cursor:'pointer',transition:'all 0.2s',padding:0,boxShadow:i<value?`0 0 5px ${color}55`:'none'}}>
          {i<value&&<span style={{display:'block',width:8,height:8,borderRadius:'50%',background:color,margin:'auto'}}/>}
        </button>
      ))}
    </div>
  );
}

function CompactEquipSlot({label,color,data,onChange,placeholder}){
  const d={nome:'',dano:'',tipo:placeholder,...(data||{})};
  const dynIcon=resolveEquipIcon(d.tipo||placeholder);
  return(
    <div style={{background:'rgba(255,255,255,0.02)',border:`1px solid ${color}20`,borderRadius:9,padding:'9px 11px',display:'flex',flexDirection:'column',gap:6}}>
      <div style={{fontSize:8,letterSpacing:'0.3em',color:`${color}99`,fontFamily:'Cinzel,serif',textTransform:'uppercase',marginBottom:1}}>{label}</div>
      <div style={{display:'flex',alignItems:'center',gap:7}}>
        <span style={{fontSize:17,flexShrink:0}}>{dynIcon}</span>
        <input value={d.nome} onChange={e=>onChange({...d,nome:e.target.value})} placeholder="Nome..." style={{flex:1,fontSize:13,padding:'4px 7px'}}/>
      </div>
      <div style={{display:'flex',gap:6}}>
        <input value={d.dano} onChange={e=>onChange({...d,dano:e.target.value})} placeholder="Dano" style={{flex:1,fontSize:12,padding:'3px 7px',color:'rgba(255,200,80,0.85)'}}/>
        <input value={d.tipo} onChange={e=>onChange({...d,tipo:e.target.value})} placeholder={placeholder} style={{flex:1,fontSize:12,padding:'3px 7px',color:'rgba(200,184,160,0.6)'}}/>
      </div>
    </div>
  );
}

function EquipamentoPanel({sheet,onChange,sheetColor}){
  const f=(slot,val)=>onChange({...sheet,[slot]:val});
  return(
    <div style={{marginBottom:16}}>
      <div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:10,textTransform:'uppercase',display:'flex',alignItems:'center',gap:8}}>
        <span style={{color:sheetColor}}>⚔</span> Equipamentos
      </div>
      <div style={{display:'flex',gap:10,alignItems:'flex-start',justifyContent:'center',flexWrap:'wrap',marginBottom:10}}>
        <CompactEquipSlot label="Mão Esquerda" color={sheetColor} data={sheet.equip_mao_esq} onChange={v=>f('equip_mao_esq',v)} placeholder="Espada"/>
        <div style={{fontSize:16,opacity:0.4,color:sheetColor,display:'flex',flexDirection:'column',gap:4,justifyContent:'center'}}>⬤</div>
        <CompactEquipSlot label="Mão Direita" color={sheetColor} data={sheet.equip_mao_dir} onChange={v=>f('equip_mao_dir',v)} placeholder="Escudo"/>
      </div>
      <CompactEquipSlot label="Corpo" color={sheetColor} data={sheet.equip_corpo} onChange={v=>f('equip_corpo',v)} placeholder="Armadura"/>
    </div>
  );
}

function HabilidadesRow({a,isSpecial,color}){
  return(
    <div style={{background:isSpecial?`${color}09`:'rgba(255,255,255,0.02)',border:`1px solid ${isSpecial?color+'22':'rgba(255,255,255,0.06)'}`,borderRadius:8,padding:'9px 12px',display:'flex',gap:10,alignItems:'flex-start'}}>
      <div style={{flex:1}}>
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3,flexWrap:'wrap'}}>
          {isSpecial&&<span style={{fontSize:10,color}}>✦</span>}
          <span style={{fontFamily:'Cinzel,serif',fontSize:12,color:'#C8B8A0',fontWeight:600}}>{a.name}</span>
        </div>
        <div style={{fontSize:13,color:'#7A6A5A',lineHeight:1.65}}>{a.desc}</div>
      </div>
      <div style={{flexShrink:0,textAlign:'right',display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
        <div style={{fontSize:11,color:`${color}BB`,fontFamily:'Cinzel,serif'}}>{a.cost} VC</div>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.18)'}}>⏱ {a.cooldown}</div>
        {a.dano&&<div style={{fontSize:10,color:'rgba(255,200,80,0.7)',fontFamily:'Cinzel,serif'}}>⚔ {a.dano}</div>}
      </div>
    </div>
  );
}

function HabilidadesPanel({cls}){
  const[open,setOpen]=useState(false);
  const color=cls.color;
  return(
    <div style={{marginBottom:14,border:`1px solid ${open?color+'33':'rgba(255,255,255,0.07)'}`,borderRadius:10,overflow:'hidden',transition:'border-color 0.2s'}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:'100%',padding:'12px 16px',display:'flex',alignItems:'center',gap:10,background:open?`${color}08`:'rgba(255,255,255,0.02)',border:'none',cursor:'pointer',textAlign:'left'}}>
        <span style={{fontSize:15,color}}>{cls.icon}</span>
        <span style={{fontFamily:'Cinzel,serif',fontSize:13,color:'#C8B8A0',fontWeight:600,flex:1}}>Habilidades — {cls.name}</span>
        <span style={{color:`${color}88`,fontSize:11,transform:open?'rotate(90deg)':'none',transition:'transform 0.3s'}}>▶</span>
      </button>
      {open&&(
        <div style={{padding:'0 14px 14px',animation:'fadeIn 0.3s ease'}}>
          <div style={{height:8}}/>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:9,letterSpacing:'0.3em',color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Passiva</div>
            <div style={{background:`${color}0D`,border:`1px solid ${color}28`,borderRadius:8,padding:'9px 12px'}}>
              <div style={{fontFamily:'Cinzel,serif',fontSize:12,color,fontWeight:600,marginBottom:3}}>{cls.passive.name}</div>
              <div style={{fontSize:13,color:'#7A6A5A',lineHeight:1.65}}>{cls.passive.desc}</div>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:9,letterSpacing:'0.3em',color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Ataques Normais — 2 VC cada</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>{cls.normal.map((a,i)=>(<HabilidadesRow key={i} a={a} isSpecial={false} color={color}/>))}</div>
          </div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:9,letterSpacing:'0.3em',color:'rgba(255,255,255,0.22)',fontFamily:'Cinzel,serif',marginBottom:6,textTransform:'uppercase'}}>Especiais — 3 VC cada</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>{cls.specials.map((a,i)=>(<HabilidadesRow key={i} a={a} isSpecial={true} color={color}/>))}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const newSheet=id=>({id,nome:'',classe:'fogo',nivel:1,xp:0,hp:10,hp_bonus:0,vigos:5,forca:0,agilidade:0,durabilidade:0,inteligencia:0,percepcao:0,especial1:false,especial2:false,lore_personagem:'',notas:'',foto:'',equip_mao_esq:{},equip_mao_dir:{},equip_corpo:{}});

function SheetFull({sheet,onChange}){
  const cls=CLASSES.find(c=>c.id===sheet.classe)||CLASSES[0];
  const sheetColor=SHEET_COLORS[sheet.classe]||cls.color;
  const label=v=>v<=3?'Aprendiz Cósmico':v<=6?'Portador do Destino':v<=9?'Arauto do Fim':'Transcendente';
  const f=(k,v)=>onChange({...sheet,[k]:v});
  const hp=sheet.hp||0;
  const photoInputRef=useRef(null);
  const handlePhotoFile=async e=>{const file=e.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=async ev=>{const compressed=await compressImage(ev.target.result,900,900,0.75);f('foto',compressed);};reader.readAsDataURL(file);};
  const attrBonus=val=>Math.floor(val/2);
  return(
    <div style={{border:`1px solid ${sheetColor}44`,borderRadius:16,overflow:'hidden',background:'rgba(8,10,22,0.95)',boxShadow:`0 6px 32px ${sheetColor}44`,animation:'fadeIn 0.4s ease'}}>
      <div style={{height:4,background:`linear-gradient(90deg,${sheetColor},${sheetColor}44,transparent)`}}/>
      <div onClick={()=>photoInputRef.current?.click()} style={{position:'relative',width:'100%',cursor:'pointer',background:'#04060F',overflow:'hidden',minHeight:sheet.foto?0:130}}>
        {sheet.foto?<img src={sheet.foto} alt="personagem" style={{width:'100%',display:'block',objectFit:'contain',background:'#04060F'}}/>:<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'36px 20px',gap:10}}><div style={{fontSize:40,opacity:0.15}}>📷</div><div style={{fontSize:12,color:'rgba(255,255,255,0.18)',fontFamily:'Cinzel,serif'}}>Toque para adicionar foto</div></div>}
        <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoFile} style={{display:'none'}}/>
      </div>
      <div style={{padding:'18px'}}>
        <div style={{display:'flex',gap:10,alignItems:'flex-end',marginBottom:16,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:120}}><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Nome</label><input value={sheet.nome} onChange={e=>f('nome',e.target.value)} placeholder="Nome do personagem" style={{width:'100%'}}/></div>
          <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:5,textTransform:'uppercase'}}>Classe</label><select value={sheet.classe} onChange={e=>f('classe',e.target.value)}>{CLASSES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(138px,1fr))',gap:9,marginBottom:16}}>
          <div style={{background:'rgba(232,25,60,0.07)',border:'1px solid rgba(232,25,60,0.2)',borderRadius:10,padding:'12px 14px'}}>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:'#E8193C',fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Pontos de Vida</div>
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              <button onClick={()=>f('hp',Math.max(0,hp-1))} style={{width:26,height:26,borderRadius:5,border:'1px solid rgba(232,25,60,0.3)',background:'rgba(232,25,60,0.1)',color:'#E8193C',cursor:'pointer',fontSize:16,lineHeight:1,padding:0}}>−</button>
              <span style={{fontFamily:'Cinzel,serif',fontSize:22,fontWeight:700,color:'#E8193C',minWidth:30,textAlign:'center'}}>{hp}</span>
              <button onClick={()=>f('hp',hp+1)} style={{width:26,height:26,borderRadius:5,border:'1px solid rgba(232,25,60,0.3)',background:'rgba(232,25,60,0.1)',color:'#E8193C',cursor:'pointer',fontSize:16,lineHeight:1,padding:0}}>+</button>
            </div>
            <div style={{marginTop:6,height:3,background:'rgba(255,255,255,0.06)',borderRadius:2}}><div style={{height:'100%',width:`${Math.min(100,(hp/Math.max(1,hp))*100)}%`,background:'#E8193C',borderRadius:2,transition:'width 0.3s'}}/></div>
          </div>
          <div style={{background:`${sheetColor}09`,border:`1px solid ${sheetColor}24`,borderRadius:10,padding:'12px 14px'}}>
            <div style={{fontSize:10,letterSpacing:'0.3em',color:sheetColor,fontFamily:'Cinzel,serif',marginBottom:7,textTransform:'uppercase'}}>Nível · XP</div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <input type="number" min={1} max={30} value={sheet.nivel} onChange={e=>f('nivel',Math.min(30,Math.max(1,+e.target.value)))} style={{width:44,textAlign:'center'}}/>
              <span style={{color:'rgba(255,255,255,0.14)',fontSize:11}}>Nv</span>
              <input type="number" min={0} value={sheet.xp} onChange={e=>f('xp',+e.target.value)} style={{width:65,textAlign:'center'}}/>
              <span style={{fontSize:11,color:'rgba(255,255,255,0.18)'}}>XP</span>
            </div>
            <div style={{fontSize:10,color:'#7A6A5A',marginTop:6,fontFamily:'Cinzel,serif'}}>{label(sheet.nivel)}</div>
          </div>
        </div>
        <div style={{marginBottom:15}}>
          <div style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',marginBottom:9,textTransform:'uppercase'}}>Atributos</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {ATTRS.map(a=>{const bonus=attrBonus(sheet[a.key]||0);return(<div key={a.key} style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:11,fontFamily:'Cinzel,serif',color:a.color,minWidth:92,letterSpacing:'0.03em'}}>{a.label}</span><AttrDots value={sheet[a.key]||0} color={a.color} onChange={v=>f(a.key,v)}/><span style={{fontSize:11,color:'rgba(255,255,255,0.22)',minWidth:16,textAlign:'right'}}>{sheet[a.key]||0}</span><span style={{fontSize:11,fontFamily:'Cinzel,serif',fontWeight:700,color:bonus>0?a.color:'rgba(255,255,255,0.12)',minWidth:26,textAlign:'center',background:bonus>0?`${a.color}15`:'transparent',borderRadius:4,padding:'1px 4px',border:bonus>0?`1px solid ${a.color}33`:'1px solid transparent'}}>{bonus>0?`+${bonus}`:'—'}</span></div>);})}
          </div>
        </div>
        <div style={{height:1,background:'rgba(255,255,255,0.05)',marginBottom:14}}/>
        <HabilidadesPanel cls={cls}/>
        <div style={{height:1,background:'rgba(255,255,255,0.05)',marginBottom:14}}/>
        <EquipamentoPanel sheet={sheet} onChange={onChange} sheetColor={sheetColor}/>
        <div style={{height:1,background:'rgba(255,255,255,0.05)',marginBottom:14}}/>
        <div style={{marginBottom:14}}><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:6,textTransform:'uppercase'}}>Lore do Personagem</label><textarea value={sheet.lore_personagem||''} onChange={e=>f('lore_personagem',e.target.value)} placeholder="Escreva aqui a história..." rows={4} style={{width:'100%',resize:'vertical',lineHeight:1.8}}/></div>
        <div><label style={{fontSize:10,letterSpacing:'0.3em',color:'#5A5070',fontFamily:'Cinzel,serif',display:'block',marginBottom:6,textTransform:'uppercase'}}>Itens & Inventário</label><textarea value={sheet.notas||''} onChange={e=>f('notas',e.target.value)} placeholder="Liste outros itens..." rows={3} style={{width:'100%',resize:'vertical'}}/></div>
      </div>
    </div>
  );
}

function SheetsSection(){
  const[sheets,setSheets]=useState([]);const[loaded,setLoaded]=useState(false);const[activeId,setActiveId]=useState(null);
  useEffect(()=>{const unsub=onSnapshot(collection(db,'sheets'),snap=>{const data=snap.docs.map(d=>({id:d.id,...d.data()}));setSheets(data);setLoaded(true);});return()=>unsub();},[]);
  const saveSheet=sheet=>{try{setDoc(doc(db,'sheets',String(sheet.id)),sheet);}catch(e){console.error(e);}};
  const add=()=>{if(sheets.length>=5)return;const s=newSheet(Date.now());setDoc(doc(db,'sheets',String(s.id)),s);setActiveId(String(s.id));};
  const upd=(id,data)=>{setSheets(prev=>prev.map(s=>s.id===id?data:s));saveSheet(data);};
  const activeSheet=sheets.find(s=>String(s.id)===activeId);
  return(
    <div style={{maxWidth:820,margin:'0 auto',padding:'24px 14px 80px',animation:'fadeIn 0.6s ease'}}>
      <div style={{textAlign:'center',marginBottom:20}}>
        <h2 style={{fontFamily:'Cinzel Decorative,serif',fontSize:22,color:'#E8D8C0',fontWeight:700,margin:0}}>Fichas dos Personagens</h2>
        <div style={{fontSize:11,color:'#4A4050',marginTop:6,fontFamily:'Cinzel,serif'}}>✦ Sincronizado em tempo real</div>
      </div>
      {!loaded?<div style={{textAlign:'center',padding:40}}>Conectando...</div>:(<>
        <div style={{display:'flex',gap:6,marginBottom:20,overflowX:'auto',paddingBottom:2}}>
          {sheets.map(s=>{const cls=CLASSES.find(c=>c.id===s.classe)||CLASSES[0];const sc=SHEET_COLORS[s.classe];const isActive=String(s.id)===activeId;return(<button key={s.id} onClick={()=>setActiveId(isActive?null:String(s.id))} style={{display:'flex',alignItems:'center',gap:7,padding:'8px 14px',borderRadius:10,border:`1px solid ${isActive?sc+'66':sc+'28'}`,background:isActive?`${sc}15`:'rgba(255,255,255,0.02)',cursor:'pointer',transition:'all 0.2s',flexShrink:0,whiteSpace:'nowrap'}}><span style={{fontSize:18}}>{cls.icon}</span><div style={{textAlign:'left'}}><div style={{fontFamily:'Cinzel,serif',fontSize:12,fontWeight:700,color:isActive?sc:'#8A7A8A'}}>{s.nome||'Sem nome'}</div><div style={{fontSize:10,color:'#5A5070',fontFamily:'Cinzel,serif'}}>Nv {s.nivel||1}</div></div></button>);})}
          {sheets.length<5&&(<button onClick={add} style={{padding:'8px 16px',borderRadius:10,border:'1px dashed rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.01)',color:'#6A5A7A',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:11,flexShrink:0}}>+ Novo</button>)}
        </div>
        {activeSheet?<SheetFull sheet={activeSheet} onChange={d=>upd(activeSheet.id,d)}/>:<div style={{textAlign:'center',padding:44}}>Selecione um personagem</div>}
      </>)}
    </div>
  );
}

export default function App(){
  useEffect(()=>{const s=document.createElement('style');s.textContent=GLOBAL_CSS;document.head.appendChild(s);return()=>s.remove();},[]);
  return(
    <div style={{height:'100vh',overflow:'hidden',display:'flex',flexDirection:'column',background:'#04060F',color:'#C8B8A0',fontFamily:"'Crimson Text',Georgia,serif",position:'relative'}}>
      <header style={{position:'relative',zIndex:10,textAlign:'center',padding:'14px 18px 10px',borderBottom:'1px solid rgba(255,255,255,0.05)',background:'linear-gradient(180deg,rgba(4,6,15,0.98),rgba(4,6,15,0.92))'}}>
        <h1 style={{fontFamily:'Cinzel Decorative,serif',fontSize:22,fontWeight:900,margin:0,letterSpacing:'0.08em',background:'linear-gradient(135deg,#C8A8E8,#E8D8C0,#A855F7)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Dinastia E</h1>
        <div style={{fontSize:10,color:'#4A3A5A',fontFamily:'Cinzel,serif',marginTop:2}}>Livro do Mundo</div>
      </header>
      <main style={{flex:1,overflowY:'auto',position:'relative',zIndex:10}}>
        <SheetsSection/>
      </main>
    </div>
  );
}
