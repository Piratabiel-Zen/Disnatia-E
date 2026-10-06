import { lazy,Suspense,useState } from 'react';
import { createPortal } from 'react-dom';
import './table-cameras.css';
const CameraRoom=lazy(()=>import('./TableCameraRoom'));
export default function TableCameras({access,selectedSheet,masterMode}){
  const [open,setOpen]=useState(false);
  return createPortal(<div className="table-cameras-surface">
    {!open?<button className="table-camera-launch" onClick={()=>setOpen(true)}>Câmeras da mesa</button>:<Suspense fallback={<div className="table-camera-controls">Abrindo câmeras...</div>}><CameraRoom access={access} selectedSheet={selectedSheet} masterMode={masterMode} onClose={()=>setOpen(false)}/></Suspense>}
  </div>,document.body);
}
