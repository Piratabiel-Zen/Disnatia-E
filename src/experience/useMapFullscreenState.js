import { useEffect, useState } from 'react';

export default function useMapFullscreenState() {
  const [state,setState] = useState({ active:false, since:0 });
  useEffect(() => {
    const sync = () => {
      const active = document.documentElement.classList.contains('dinastia-map-fullscreen');
      setState(previous => previous.active === active
        ? previous
        : { active, since: active ? Date.now() : 0 });
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    document.addEventListener('fullscreenchange',sync);
    document.addEventListener('webkitfullscreenchange',sync);
    window.addEventListener('resize',sync);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener('fullscreenchange',sync);
      document.removeEventListener('webkitfullscreenchange',sync);
      window.removeEventListener('resize',sync);
    };
  },[]);
  return state;
}
