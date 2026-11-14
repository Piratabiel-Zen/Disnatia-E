import { useState } from "react";
import { MASTER_PIN } from "../data/gameData";
async function hashAccessPin(value){const bytes=new TextEncoder().encode(String(value||'').trim().toLowerCase());const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('')}
function MasterToggle({masterMode,setMasterMode}){
  const[showInput,setShowInput]=useState(false);const[pin,setPin]=useState('');const[shake,setShake]=useState(false);
  const tryUnlock=async()=>{const digest=await hashAccessPin(pin);if(digest===MASTER_PIN){setMasterMode(true);setShowInput(false);setPin('');}else{setShake(true);setTimeout(()=>setShake(false),500);setPin('');}};
  if(masterMode)return(<button onClick={()=>setMasterMode(false)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(232,25,60,0.4)',background:'rgba(232,25,60,0.12)',color:'#E8193C',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.08em',animation:'pulse 2s ease-in-out infinite'}}>🔴 MESTRE</button>);
  return(<div style={{display:'flex',alignItems:'center',gap:6}}>{showInput&&(<div style={{display:'flex',gap:5}}><input type="password" value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==='Enter'&&tryUnlock()} placeholder="senha..." autoFocus style={{width:80,padding:'3px 7px',fontSize:12,border:`1px solid ${shake?'rgba(232,25,60,0.6)':'rgba(255,255,255,0.15)'}`,transition:'border-color 0.3s'}}/><button onClick={tryUnlock} style={{padding:'3px 8px',borderRadius:5,border:'1px solid rgba(168,85,247,0.3)',background:'rgba(168,85,247,0.1)',color:'#C8A8E8',cursor:'pointer',fontSize:11}}>✓</button><button onClick={()=>{setShowInput(false);setPin('');}} style={{padding:'3px 7px',borderRadius:5,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'#5A5070',cursor:'pointer',fontSize:11}}>✕</button></div>)}{!showInput&&(<button onClick={()=>setShowInput(true)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.03)',color:'#5A5070',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.08em'}}>🔒 Mestre</button>)}</div>);
}


export default MasterToggle;
