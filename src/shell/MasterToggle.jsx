import { useState } from "react";
import { activeCampaign } from "../core/campaign";
import { requiredMasterHash } from "../core/campaignPassword.mjs";
import { auth, entrarNaMesa } from "../core/auth";
async function hashAccessPin(value){const bytes=new TextEncoder().encode(String(value||'').trim().toLowerCase());const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('')}
// A senha de Mestre é da mesa aberta, não do site: quem sabe a do Arquivo de
// Veneza não vira Mestre da Dinastia E.
function MasterToggle({masterMode,setMasterMode,campaign}){
  const[showInput,setShowInput]=useState(false);const[pin,setPin]=useState('');const[shake,setShake]=useState(false);
  const[aviso,setAviso]=useState('');
  // Acertar a senha liga o modo Mestre na tela. Isso sozinho não bastava: o
  // servidor continuava vendo um jogador, e todo comando de Mestre era
  // negado. Agora a senha certa também grava o papel de Mestre no registro de
  // membro — é o que faz quem tem a senha enxergar e mandar na mesa de
  // verdade, igual a quem a criou.
  const tryUnlock=async()=>{
    const mesa=campaign||activeCampaign();
    const exigido=requiredMasterHash(mesa);
    const digest=await hashAccessPin(pin);
    if(!exigido||digest!==exigido){setShake(true);setTimeout(()=>setShake(false),500);setPin('');return;}
    setAviso('');
    if(!mesa?.primary){
      try{
        await entrarNaMesa({campanhaId:mesa.id,senhaHash:digest,papel:'mestre'});
      }catch(erro){
        setAviso(!auth.currentUser
          ?'Entre na sua conta antes: o comando da mesa é dado à pessoa, não ao aparelho.'
          :(erro?.message||'O servidor não aceitou a promoção.'));
        setPin('');
        return;
      }
    }
    setMasterMode(true);setShowInput(false);setPin('');
  };
  if(masterMode)return(<button onClick={()=>setMasterMode(false)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(232,25,60,0.4)',background:'rgba(232,25,60,0.12)',color:'#E8193C',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.08em',animation:'pulse 2s ease-in-out infinite'}}>🔴 MESTRE</button>);
  return(<div style={{display:'flex',alignItems:'center',gap:6,position:'relative'}}>{aviso&&(<span role="alert" style={{position:'absolute',top:'100%',right:0,marginTop:6,maxWidth:260,padding:'6px 9px',borderRadius:5,background:'rgba(32,12,16,.96)',border:'1px solid rgba(232,25,60,.4)',color:'#F0B8C2',fontSize:10.5,lineHeight:1.45,zIndex:60}}>{aviso}</span>)}{showInput&&(<div style={{display:'flex',gap:5}}><input type="password" value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==='Enter'&&tryUnlock()} placeholder="senha..." autoFocus style={{width:80,padding:'3px 7px',fontSize:12,border:`1px solid ${shake?'rgba(232,25,60,0.6)':'rgba(255,255,255,0.15)'}`,transition:'border-color 0.3s'}}/><button onClick={tryUnlock} style={{padding:'3px 8px',borderRadius:5,border:'1px solid rgba(168,85,247,0.3)',background:'rgba(168,85,247,0.1)',color:'#C8A8E8',cursor:'pointer',fontSize:11}}>✓</button><button onClick={()=>{setShowInput(false);setPin('');}} style={{padding:'3px 7px',borderRadius:5,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'#5A5070',cursor:'pointer',fontSize:11}}>✕</button></div>)}{!showInput&&(<button onClick={()=>setShowInput(true)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.03)',color:'#5A5070',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:10,letterSpacing:'0.08em'}}>🔒 Mestre</button>)}</div>);
}


export default MasterToggle;
