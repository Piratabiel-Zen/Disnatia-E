import React from 'react';
import {createRoot} from 'react-dom/client';
import Cronicas from '../../.generated/src/features/cronicas/CronicasPage.jsx';
import {ExperienceProvider,ImmersiveNavigation} from '../../.generated/src/experience/ExperienceKit.generated.jsx';
import GameExperience3 from '../../.generated/src/experience/GameExperience3.adventure.jsx';
import {SummonCard} from '../../.generated/src/features/sheets/SheetComponents.jsx';
import '../../.generated/src/styles/global.css';
import '../../.generated/src/experience/experience.css';
import '../../.generated/src/experience/site-polish.css';
import '../../src/experience/mobile-player-polish.css';
import { PreferenceSurface } from '../../.generated/src/experience/PlayerComfort.jsx';
const params=new URLSearchParams(location.search);
const hud=params.has('hud')||params.has('combat')||params.has('map');
const master=params.has('master');
const combat=params.has('combat');
import BattleMap from '../../.generated/src/features/mapa-batalha/BattleMapPage.jsx';
if(combat){window.__testStore.set('config/combat',{active:true});window.__testStore.set('config/combat_state',{initiative:[{id:'p_necro',nome:'Necromante',type:'player'}],turnIdx:0,round:1});}
const summon={id:'bird',nome:'Corvo',hp:40,hp_bonus:7,revealed:true,forca:8,ataques:[{id:1,nome:'Bicada',custo:1}]};
createRoot(document.getElementById('root')).render(<div className="adventure-shell access-player" style={{background:'#010207',minHeight:'100vh',color:'#eee'}}>{hud?<ExperienceProvider tab={params.has('map')?'mapabatalha':'session'} masterMode={master} playerSheetId="necro"><ImmersiveNavigation tab="session" onNavigate={()=>{}}/><main style={{height:params.has('map')?'calc(100vh - 100px)':undefined,display:params.has('map')?'flex':undefined,flexDirection:'column',padding:'70px 12px 170px'}}>{params.has('map')?<BattleMap masterMode={master} playerSheetId="necro"/>:<SummonCard summon={summon} ownerSheet={{id:'necro'}} color="#a855f7" masterMode={false} onChange={()=>{}}/>}</main><PreferenceSurface/><GameExperience3 access={{role:'player',sheetId:'necro'}} masterMode={master} tab={params.has('map')?'mapabatalha':'session'} onNavigate={()=>{}}/></ExperienceProvider>:<Cronicas masterMode={true}/>}</div>);
