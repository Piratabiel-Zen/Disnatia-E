import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../core/firebase';
import { useExperience } from './ExperienceKit.generated';
import './visitor-summons.css';

export function VisitorSessionGuard({access,onLogout}) {
  useEffect(()=>{
    if(access?.role!=='visitor')return;
    return onSnapshot(doc(db,'visitors',String(access.visitorId||'invalid')),snap=>{
      const visitor=snap.exists()?snap.data():null;
      if(!visitor||visitor.active===false||Number(visitor.authVersion||1)!==Number(access.authVersion||1))onLogout();
    });
  },[access?.role,access?.visitorId,access?.authVersion,onLogout]);
  return null;
}
export function VisitorCharacterPicker({access}) {
  const {sheets,selectedSheet,setSelectedSheetId}=useExperience();
  if(access?.role!=='visitor')return null;
  return <div className="visitor-character-picker"><label>Meu personagem<select aria-label="Meu personagem" value={selectedSheet?.id||''} onChange={event=>setSelectedSheetId(event.target.value)}><option value="" disabled>{sheets.length?'Escolha um personagem':'Aguardando personagem do Mestre'}</option>{sheets.map(sheet=><option key={sheet.id} value={sheet.id}>{sheet.nome||'Personagem'}</option>)}</select></label></div>;
}
