import {characterMaxVigor,VIGOR_UNLOCK_LEVELS} from '../adventure/characterResources.mjs';
export default function CharacterVigorPoints({value,nivel,color,onChange}) {
 const max=characterMaxVigor({nivel});
 const current=Math.max(0,Math.min(max,Number(value)||0));
 return <div className="character-vigor-points" role="group" aria-label={'Vigor Cósmico '+current+' de '+max} style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>{Array.from({length:8},(_,i)=>{
  const locked=i>=max,required=VIGOR_UNLOCK_LEVELS[i-5];
  return <button key={i} type="button" disabled={locked} aria-label={locked?'VC '+(i+1)+' bloqueado até o nível '+required:'Definir '+(i+1)+' VC'} title={locked?'Desbloqueado no Nível '+required:'Definir '+(i+1)+' VC'} onClick={()=>onChange(i<current?(i===current-1?0:i+1):i+1)} style={{width:22,height:22,borderRadius:'50%',border:'1.5px solid '+(locked?'rgba(255,200,0,.28)':i<current?color:'rgba(255,255,255,.13)'),background:locked?'rgba(255,200,0,.04)':i<current?color+'33':'transparent',color:'rgba(255,200,0,.6)',padding:0,cursor:locked?'default':'pointer',boxShadow:!locked&&i<current?'0 0 5px '+color+'55':'none',flexShrink:0,marginLeft:i===5?5:0}}>{locked?<span aria-hidden="true" style={{fontSize:9}}>{'\uD83D\uDD12'}</span>:i<current?<span style={{display:'block',width:8,height:8,borderRadius:'50%',background:color,margin:'auto'}}/>:null}</button>;
 })}</div>;
}
