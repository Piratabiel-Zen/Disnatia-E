import { useEffect, useRef } from 'react';
import { ATTRS, CLASSES, SHEET_COLORS } from '../data/gameData';
import { hpColor } from '../core/ui';
import { StatusPanel } from '../features/sheets/SheetComponents';

const dangerColor = { Baixo:'#4ADE80', Médio:'#E8A020', Alto:'#FF6B35', Extremo:'#E8193C' };
const getClass = enemy => CLASSES.find(c=>c.id===enemy?.classe)||null;
const getColor = enemy => { const cls=getClass(enemy); return cls ? (SHEET_COLORS[cls.id]||cls.color||'#FF4F65') : (dangerColor[enemy?.perigo]||'#FF4F65'); };
const getMaxHp = enemy => Math.max(1,Number(enemy?.hp_max??Math.max(10,Number(enemy?.hp||10)))+Math.max(0,Number(enemy?.hp_bonus||0)));
const cooldownTurns = value => {const text=String(value||'').toLowerCase();if(text.includes('combate'))return 99;const n=Number((text.match(/\d+/)||[0])[0]);return Number.isFinite(n)?n:0;};
const getAbilities = enemy => {const cls=getClass(enemy);return [
  ...(cls?.normal||[]).map((a,i)=>({...a,id:`class_${cls.id}_normal_${i}`,nome:a.name,custo:Number(a.cost||0),tipoHab:'normal',source:'classe'})),
  ...(cls?.specials||[]).filter(a=>Number(a.req||1)<=Number(enemy?.nivel||1)).map((a,i)=>({...a,id:`class_${cls.id}_special_${i}`,nome:a.name,custo:Number(a.cost||0),tipoHab:'especial',source:'classe'})),
  ...(enemy?.habilidades||[]).map(a=>({...a,source:'custom'})),
];};

function AbilityMini({ enemy, ability, onChangeEnemy }) {
  const color=ability.tipoHab==='especial'?'#A855F7':ability.tipoHab==='passiva'?'#E8A020':getColor(enemy);
  const key=String(ability.id||ability.nome||ability.name);
  const cooldowns=enemy.cooldowns||{};
  const cd=Number(cooldowns[key]||0);
  const cost=Number(ability.custo??ability.cost??0);
  const passive=ability.tipoHab==='passiva';
  const canUse=!passive&&cd<=0&&Number(enemy.vigos||0)>=cost;
  const use=()=>{if(!canUse)return;const turns=cooldownTurns(ability.cooldown);onChangeEnemy({...enemy,vigos:Math.max(0,Number(enemy.vigos||0)-cost),cooldowns:{...cooldowns,...(turns>0?{[key]:turns}:{})}});};
  const cdDown=()=>onChangeEnemy({...enemy,cooldowns:{...cooldowns,[key]:cd>=90?0:Math.max(0,cd-1)}});
  return <div className="enemy-mini-ability" style={{borderColor:`${color}28`}}>
    <header><b>{ability.nome||ability.name||'Habilidade'}</b><span style={{font:'8px Cinzel,serif',color}}>{passive?'PASSIVA':ability.source==='classe'?'CLASSE':'PRÓPRIA'}</span></header>
    {(ability.dano||ability.desc||ability.descricao)&&<p>{ability.dano&&<b style={{color:'#b89455'}}>⚔ {ability.dano} · </b>}{ability.descricao||ability.desc||''}</p>}
    <div className="enemy-mini-actions">
      {!passive&&<button disabled={!canUse} onClick={use} style={{border:`1px solid ${color}45`,background:`${color}10`,color:canUse?color:'#574e55',cursor:canUse?'pointer':'not-allowed'}}>{cd>0?(cd>=90?'USADO':`CD ${cd}`):`Usar · ${cost} VC`}</button>}
      {!passive&&cd>0&&<button onClick={cdDown} style={{border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.02)',color:'#84767f',cursor:'pointer'}}>{cd>=90?'Resetar':'−1 CD'}</button>}
    </div>
  </div>;
}

export function BattleMapEnemyPanel({ enemy, onChangeEnemy }) {
  const cls=getClass(enemy);
  const color=getColor(enemy);
  const maxHp=getMaxHp(enemy);
  const hp=Math.max(0,Math.min(maxHp,Number(enemy.hp||0)));
  const abilities=getAbilities(enemy);
  const f=(k,v)=>onChangeEnemy({...enemy,[k]:v});
  return <div style={{'--enemy-color':color}}>
    <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:11}}>
      {enemy.foto?<img src={enemy.foto} alt="" style={{width:39,height:39,borderRadius:9,objectFit:'cover',border:`1.5px solid ${color}66`}}/>:<div style={{width:39,height:39,borderRadius:9,display:'grid',placeItems:'center',border:`1px solid ${color}55`,background:`${color}0d`,fontSize:17}}>{cls?.icon||'💀'}</div>}
      <div style={{minWidth:0}}><div style={{font:'700 12px Cinzel,serif',color,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{enemy.nome||'Inimigo'}</div><div style={{font:'8px Cinzel,serif',color:'#6c5c65',marginTop:3}}>{cls?`${cls.icon} ${cls.name}`:'◌ Sem classe'} · Nv {enemy.nivel||1}</div></div>
    </div>
    <div style={{padding:10,border:'1px solid rgba(232,25,60,.16)',background:'rgba(232,25,60,.045)',borderRadius:9,marginBottom:9}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><button onClick={()=>f('hp',Math.max(0,hp-1))} style={{width:28,height:28,padding:0,borderRadius:7,border:'1px solid rgba(232,25,60,.35)',background:'rgba(232,25,60,.1)',color:'#E8193C'}}>−</button><b style={{font:'900 26px Cinzel,serif',color:hpColor(hp,maxHp)}}>{hp}</b><span style={{fontSize:9,color:'#5e535b'}}>/ {maxHp}</span><button onClick={()=>f('hp',Math.min(maxHp,hp+1))} style={{width:28,height:28,padding:0,borderRadius:7,border:'1px solid rgba(74,222,128,.35)',background:'rgba(74,222,128,.1)',color:'#4ADE80'}}>+</button></div>
      <div className="enemy-hp-track" style={{marginTop:8}}><i style={{width:`${Math.min(100,(hp/maxHp)*100)}%`,background:hpColor(hp,maxHp)}}/></div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:7,marginTop:9}}><span style={{font:'8px Cinzel,serif',color:'#716270'}}>VC</span><button onClick={()=>f('vigos',Math.max(0,Number(enemy.vigos||0)-1))} style={{width:25,height:25,padding:0,border:`1px solid ${color}33`,background:`${color}09`,color}}>−</button><b style={{font:'700 15px Cinzel,serif',color}}>{enemy.vigos||0}</b><button onClick={()=>f('vigos',Number(enemy.vigos||0)+1)} style={{width:25,height:25,padding:0,border:`1px solid ${color}33`,background:`${color}09`,color}}>+</button></div>
    </div>
    <StatusPanel sheet={enemy} onChange={onChangeEnemy}/>
    <div style={{margin:'9px 0'}}><div style={{font:'8px Cinzel,serif',letterSpacing:'.16em',color:'#665967',marginBottom:6}}>BÔNUS DE ATRIBUTOS</div><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5}}>{ATTRS.map(a=>{const b=Math.floor(Number(enemy[a.key]||0)/2);return <div key={a.key} style={{padding:'6px 3px',borderRadius:6,border:`1px solid ${a.color}22`,background:`${a.color}08`,textAlign:'center'}}><div style={{font:'7px Cinzel,serif',color:a.color,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.label}</div><b style={{font:'700 12px Cinzel,serif',color:b>0?a.color:'#4e474e'}}>{b>0?`+${b}`:'—'}</b></div>})}</div></div>
    <div style={{marginTop:10}}><div style={{font:'8px Cinzel,serif',letterSpacing:'.16em',color:color,marginBottom:6}}>HABILIDADES</div>{abilities.length?abilities.map(a=><AbilityMini key={String(a.id)} enemy={enemy} ability={a} onChangeEnemy={onChangeEnemy}/>):<div style={{fontSize:10,color:'#5c5058',padding:8,border:'1px dashed rgba(255,255,255,.06)',borderRadius:7}}>Sem habilidades cadastradas.</div>}</div>
  </div>;
}

export function FloatingEnemyPanel({ enemy, pos, zIndex, onChangeEnemy, onDrag, onFocus, onClose }) {
  const dragRef=useRef(false);
  const startRef=useRef({x:0,y:0,px:0,py:0});
  const movedRef=useRef(false);
  const color=getColor(enemy);
  const down=e=>{onFocus();dragRef.current=true;movedRef.current=false;const x=e.touches?e.touches[0].clientX:e.clientX;const y=e.touches?e.touches[0].clientY:e.clientY;startRef.current={x:pos.x,y:pos.y,px:x,py:y};};
  useEffect(()=>{const move=e=>{if(!dragRef.current)return;const x=e.touches?e.touches[0].clientX:e.clientX;const y=e.touches?e.touches[0].clientY:e.clientY;const dx=x-startRef.current.px,dy=y-startRef.current.py;if(Math.abs(dx)>3||Math.abs(dy)>3)movedRef.current=true;onDrag(Math.min(window.innerWidth-60,Math.max(-250,startRef.current.x+dx)),Math.min(window.innerHeight-40,Math.max(0,startRef.current.y+dy)));};const up=()=>{dragRef.current=false;};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('touchmove',move,{passive:false});window.addEventListener('touchend',up);return()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('touchmove',move);window.removeEventListener('touchend',up);};},[onDrag]);
  return <div className="floating-sheet enemy-floating-sheet" style={{'--enemy-color':color,position:'fixed',left:pos.x,top:pos.y,width:310,maxHeight:'70vh',zIndex,display:'flex',flexDirection:'column',overflow:'hidden',borderRadius:12,boxShadow:'0 16px 48px rgba(0,0,0,.78)'}} onPointerDown={onFocus}>
    <div className="enemy-floating-head" onPointerDown={down} onTouchStart={down}><span style={{color}}>⠿</span><b>{enemy.nome||'Inimigo'}</b><span style={{font:'7px Cinzel,serif',color:'#806872'}}>MESTRE</span><button onClick={onClose} onPointerDown={e=>e.stopPropagation()} style={{background:'none',border:'1px solid rgba(255,255,255,.1)',borderRadius:5,color:'#8b7780',cursor:'pointer',padding:'2px 7px'}}>✕</button></div>
    <div className="enemy-float-body"><BattleMapEnemyPanel enemy={enemy} onChangeEnemy={onChangeEnemy}/></div>
  </div>;
}
