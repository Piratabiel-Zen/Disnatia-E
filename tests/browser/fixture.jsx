import React from 'react';
import {createRoot} from 'react-dom/client';
import Cronicas from '../../.generated/src/features/cronicas/CronicasPage.jsx';
import {ExperienceProvider,ImmersiveNavigation,ExperienceLayer} from '../../.generated/src/experience/ExperienceKit.generated.jsx';
import GameExperience3 from '../../.generated/src/experience/GameExperience3.adventure.jsx';
import {ArtifactSheetPanel} from '../../.generated/src/experience/ArtifactPowers.jsx';
import Livro from '../../.generated/src/features/livro/LivroPage.jsx';
import {useExperience} from '../../.generated/src/experience/ExperienceKit.generated.jsx';
import SheetsSection from '../../.generated/src/features/sheets/SheetsPage.jsx';
import {applyRoundAutomation} from '../../.generated/src/experience/combatRoundEngine.js';
import {SummonCard} from '../../.generated/src/features/sheets/SheetComponents.jsx';
import '../../.generated/src/styles/global.css';
import '../../.generated/src/experience/experience.css';
import '../../.generated/src/experience/site-polish.css';
import '../../src/experience/mobile-player-polish.css';
import App from '../../.generated/src/App.generated.jsx';
import VisitorsPage from '../../.generated/src/experience/VisitorsPage.jsx';
import {passwordRecord} from '../../src/adventure/visitorAccess.mjs';
import '../../.generated/src/experience/visitor-summons.css';
import { PreferenceSurface } from '../../.generated/src/experience/PlayerComfort.jsx';
import RealtimeBroadcasts from '../../.generated/src/experience/RealtimeBroadcasts.jsx';
const params=new URLSearchParams(location.search);
const hud=params.has('hud')||params.has('combat')||params.has('map');
const master=params.has('master');
const combat=params.has('combat');
import BattleMap from '../../.generated/src/features/mapa-batalha/BattleMapPage.jsx';
if(combat){window.__testStore.set('config/combat',{active:true});window.__testStore.set('config/combat_state',{initiative:[{id:'p_necro',nome:'Necromante',type:'player'}],turnIdx:0,round:1});}
if(params.has('map-summons'))window.__testStore.set('sheets/necro',{id:'necro',nome:'Necromante',classe:'necromante',nivel:10,hp:40,vigos:8,invocacoes:[{id:'bird',nome:'Corvo',hp:40,hp_bonus:7,revealed:true,ataques:[{id:1,nome:'Bicada',custo:1}]}]});
const summon={id:'bird',nome:'Corvo',hp:40,hp_bonus:7,revealed:true,forca:8,ataques:[{id:1,nome:'Bicada',custo:1}]};
const render=async()=>{
if(params.has('abilities')){
 if(!window.__testStore.get('config/abilityFixture')){
  window.__testStore.set('sheets/necro',{id:'necro',nome:'Personagem de teste',classe:params.has('custom')?'personalizado':'fogo',nivel:22,hp:40,vigos:7,cooldowns:{'skill-1':2}});
  window.__testStore.set('config/customAbilities',{necro:[{id:'skill-1',nome:'Raio de teste',descricao:'Descrição original',custo:2,cooldown:'3 rodadas',dano:'1D8',req:1,tipoHab:'especial',lore:'Preservar'},{id:'skill-2',nome:'Aura de teste',descricao:'Passiva',tipoHab:'passiva',custo:0,req:1},{id:'skill-3',nome:'Golpe de teste',descricao:'Normal',tipoHab:'normal',custo:1,req:1}],other:[{id:'other',nome:'Não alterar'}]});
  window.__testStore.set('config/abilityFixture',{ready:true});
 }
 window.__roundAutomation=applyRoundAutomation;
 createRoot(document.getElementById('root')).render(<ExperienceProvider playerSheetId="necro" access={{role:master?'master':'player',sheetId:'necro'}} masterMode={master} tab="fichas"><SheetsSection masterMode={master} playerSheetId="necro" access={{role:master?'master':'player',sheetId:'necro'}}/></ExperienceProvider>);
 return;
}
if(params.has('artifact')){
 const sheet={id:'necro',nome:'Portador de teste',classe:'magos',nivel:10,hp:40,vigos:8,agilidade:8,percepcao:4,artefato_id:'artefato-2'};
 window.__testStore.set('sheets/necro',sheet);
 if(!window.__testStore.get('config/artefatos'))window.__testStore.set('config/artefatos',{unlocked:{'artefato-2':true}});
 window.__testStore.set('config/artefatos_habilidades',{'artefato-2':[{id:'flight',nome:'Voo de Serafim',custo:'0',descricao:'Movimentação de teste'},{id:'dodge',nome:'Intocável',custo:'3',cooldown:'3',descricao:'Esquiva de teste'}]});
 const ArtifactView=()=>{const {sheets,useQuickAbility}=useExperience();window.__artifactUse=useQuickAbility;return <ArtifactSheetPanel sheet={sheets.find(s=>s.id==='necro')||sheet} onChange={next=>window.__testStore.set('sheets/necro',next)} revealedArtefatos={window.__artifacts||[]}/>;};
 const {ARTEFATOS_DATA}=await import('../../.generated/src/data/gameData.jsx');window.__artifacts=ARTEFATOS_DATA.filter(a=>a.id==='artefato-2');
 createRoot(document.getElementById('root')).render(<ExperienceProvider playerSheetId="necro" access={{role:'player',sheetId:'necro'}} masterMode={false} tab="fichas"><main style={{padding:20,maxWidth:800,background:'#010207',minHeight:'100vh'}}>{params.has('book')?<Livro masterMode={false}/>:<ArtifactView/>}</main><GameExperience3 access={{role:'player',sheetId:'necro'}} masterMode={false} tab="session" onNavigate={()=>{}}/></ExperienceProvider>);
 return;
}
if(params.has('visitors')||params.has('visitor-admin')){
 window.__testStore.set('visitors/guest-a',{id:'guest-a',name:'Convidado A',active:true,authVersion:1,password:await passwordRecord('Senha123')});
 window.__testStore.set('visitors/guest-b',{id:'guest-b',name:'Convidado B',active:true,authVersion:1,password:await passwordRecord('Outra123')});
 window.__testStore.set('sheets/guest-1',{id:'guest-1',nome:'Cavaleiro visitante',audience:'visitor',visitorId:'guest-a',classe:'fogo',hp:20,vigos:5});
 window.__testStore.set('sheets/guest-2',{id:'guest-2',nome:'Maga visitante',audience:'visitor',visitorId:'guest-a',classe:'magos',hp:20,vigos:5});
 window.__testStore.set('sheets/guest-3',{id:'guest-3',nome:'Personagem secreto B',audience:'visitor',visitorId:'guest-b',classe:'fogo',hp:20,vigos:5});
 createRoot(document.getElementById('root')).render(params.has('visitor-admin')?<ExperienceProvider access={{role:'master'}} masterMode={true} tab='visitantes'><VisitorsPage masterMode={true}/></ExperienceProvider>:<App/>);
 return;
}
createRoot(document.getElementById('root')).render(<div className="adventure-shell access-player" style={{background:'#010207',minHeight:'100vh',color:'#eee'}}>{hud?<ExperienceProvider tab={params.has('map')?'mapabatalha':'session'} masterMode={master} playerSheetId="necro"><ImmersiveNavigation tab="session" onNavigate={()=>{}}/><main style={{marginLeft:params.has('map')?76:0,height:params.has('map')?'calc(100vh - 100px)':undefined,display:params.has('map')?'flex':undefined,flexDirection:'column',padding:'70px 12px 170px'}}>{params.has('map')?<BattleMap masterMode={master} playerSheetId="necro"/>:<SummonCard summon={summon} ownerSheet={{id:'necro'}} color="#a855f7" masterMode={false} onChange={()=>{}}/>}</main>{params.has('live-events')&&<><ExperienceLayer onNavigate={()=>{}}/><RealtimeBroadcasts/></>}<PreferenceSurface/><GameExperience3 access={{role:'player',sheetId:'necro'}} masterMode={master} tab={params.has('map')?'mapabatalha':'session'} onNavigate={()=>{}}/></ExperienceProvider>:<Cronicas masterMode={true}/>}</div>);

};render();
