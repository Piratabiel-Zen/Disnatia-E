import { useCallback,useEffect,useRef,useState } from 'react';
export default function useMapFullscreen(){
  const [expanded,setExpanded]=useState(false),[notice,setNotice]=useState('');
  const active=useRef(false),native=useRef(false);
  const reset=useCallback(()=>{active.current=false;native.current=false;document.documentElement.classList.remove('dinastia-map-fullscreen');setExpanded(false);setNotice('');},[]);
  const exit=useCallback(async()=>{
    if(native.current&&(document.fullscreenElement||document.webkitFullscreenElement)){
      try{await (document.exitFullscreen?.()||document.webkitExitFullscreen?.());}catch{}
    }
    reset();
  },[reset]);
  const enter=useCallback(async()=>{
    if(active.current)return;
    active.current=true;setExpanded(true);setNotice('');document.documentElement.classList.add('dinastia-map-fullscreen');
    const root=document.documentElement;
    try{
      if(root.requestFullscreen){await root.requestFullscreen();native.current=true;}
      else if(root.webkitRequestFullscreen){root.webkitRequestFullscreen();native.current=true;}
      else setNotice('Mapa expandido no navegador. Este dispositivo não oferece tela cheia nativa.');
    }catch{setNotice('Mapa expandido no navegador. A tela cheia nativa foi bloqueada.');}
    window.dispatchEvent(new Event('resize'));
  },[]);
  useEffect(()=>{
    const change=()=>{if(native.current&&!document.fullscreenElement&&!document.webkitFullscreenElement)reset();window.dispatchEvent(new Event('resize'));};
    const key=event=>{if(event.key==='Escape'&&active.current)exit();};
    document.addEventListener('fullscreenchange',change);document.addEventListener('webkitfullscreenchange',change);window.addEventListener('keydown',key);
    return()=>{
      document.removeEventListener('fullscreenchange',change);document.removeEventListener('webkitfullscreenchange',change);window.removeEventListener('keydown',key);
      if(active.current){document.documentElement.classList.remove('dinastia-map-fullscreen');if(native.current){try{const pending=document.exitFullscreen?.()||document.webkitExitFullscreen?.();pending?.catch?.(()=>{});}catch{}}}
    };
  },[exit,reset]);
  return {expanded,notice,toggle:expanded?exit:enter};
}
