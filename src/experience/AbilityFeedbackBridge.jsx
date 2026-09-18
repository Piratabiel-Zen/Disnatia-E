import { useEffect } from 'react';

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
    document.addEventListener('click',onClick,true);
    return()=>document.removeEventListener('click',onClick,true);
  },[]);
  return null;
}
