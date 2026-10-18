import { useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../core/firebase';

export default function AbilityFeedbackBridge(){
  useEffect(()=>{
    const onClick=e=>{
      const button=e.target?.closest?.('.hud-ability');
      if(!button || button.disabled) return;
      button.classList.remove('ability-fired');
      void button.offsetWidth;
      button.classList.add('ability-fired');
      window.setTimeout(()=>button.classList.remove('ability-fired'),420);
    };
    const announce=event=>{
      const detail=event?.detail||{};
      const id=String(detail.id||('sheet_ability_'+Date.now()+'_'+Math.random().toString(36).slice(2,8)));
      const action={
        id,type:'combat_action',source:'character-sheet',ts:Date.now(),
        actorId:String(detail.actorId||''),actorName:String(detail.actorName||'Personagem'),
        abilityName:String(detail.abilityName||'Habilidade'),targetId:'',targetName:'',targetType:'none',
        icon:String(detail.icon||'✦'),color:String(detail.color||'#A855F7'),cost:Math.max(0,Number(detail.cost)||0),
      };
      Promise.allSettled([
        setDoc(doc(db,'config','combat_action'),action,{merge:true}),
        setDoc(doc(db,'combat_action_events',id),action,{merge:true}),
      ]).then(results=>{if(results.every(result=>result.status==='rejected'))console.warn('Não foi possível publicar o uso da habilidade para a mesa.');});
    };
    document.addEventListener('click',onClick,true);
    window.addEventListener('dinastia:ability-used',announce);
    return()=>{document.removeEventListener('click',onClick,true);window.removeEventListener('dinastia:ability-used',announce);};
  },[]);
  return null;
}
