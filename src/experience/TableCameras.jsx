import { lazy,Suspense,useState } from 'react';
import { createPortal } from 'react-dom';
import './table-cameras.css';
const CameraRoom=lazy(()=>import('./TableCameraRoom'));
function CameraIcon(){return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="6" width="12" height="12" rx="2"/><path d="m15 10 6-3v10l-6-3z"/></svg>;}
export default function TableCameras({access,selectedSheet,masterMode}){
  const [loaded,setLoaded]=useState(false),[pinned,setPinned]=useState(false),[joined,setJoined]=useState(false),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false);
  const close=()=>{setLoaded(false);setPinned(false);setJoined(false);};
  return createPortal(<div className="table-cameras-surface">
    <div className="table-camera-menu" data-pinned={pinned} onPointerEnter={()=>setHovered(true)} onPointerLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}} onKeyDown={event=>{if(event.key==='Escape'){setPinned(false);event.currentTarget.querySelector('.table-camera-launch')?.blur();}}}>
      <button className={'table-camera-launch'+(joined?' connected':'')} aria-label="Câmeras da mesa" aria-controls="table-camera-options" aria-expanded={pinned||hovered||focused} onClick={event=>{setLoaded(true);setPinned(value=>!value);if(pinned&&event.detail>0)event.currentTarget.blur();}}><CameraIcon/><span>Câmeras da mesa</span></button>
      {loaded&&<Suspense fallback={<div className="table-camera-controls">Abrindo câmeras...</div>}><CameraRoom access={access} selectedSheet={selectedSheet} masterMode={masterMode} onClose={close} onJoined={value=>{setJoined(value);if(value)setPinned(false);}}/></Suspense>}
    </div>
  </div>,document.body);
}
