import {useEffect,useRef,useState} from 'react';
import {CLASSES,SHEET_COLORS} from '../data/gameData';

function DockIcon({enemy=false}) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{enemy?<><path d="M6 4 3 2v7a9 9 0 0 0 18 0V2l-3 2M6 5h12v8l-6 7-6-7Z"/><path d="m8 9 2 2m6-2-2 2M10 15h4"/></>:<><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2M4 3h3M17 3h3"/></>}</svg>;
}
const FAMILIAR_ICONS={cachorro:'🐕',aguia:'🦅',gato:'🐈',leao:'🦁',tigre:'🐅',cavalo:'🐎',fada:'🧚',corvo:'🐦‍⬛',lobo:'🐺',coruja:'🦉',raposa:'🦊',outro:'✨'};

export default function MapSheetDock({masterMode,sheets,enemies,floatingSheets=[],floatingEnemies,onSelectSheet,onSelectEnemy,onCreateSheet,onChangeSheet}) {
  const [panel,setPanel]=useState('');
  const [activeFamiliar,setActiveFamiliar]=useState(null);
  const root=useRef(null),playersButton=useRef(null),enemiesButton=useRef(null),familiarsButton=useRef(null);
  useEffect(()=>{
    if(!panel)return;
    const close=event=>{if(!root.current?.contains(event.target))setPanel('');};
    const key=event=>{if(event.key==='Escape'){event.stopPropagation();setPanel('');(panel==='enemies'?enemiesButton:panel==='familiars'?familiarsButton:playersButton).current?.focus();}};
    document.addEventListener('pointerdown',close);root.current?.addEventListener('keydown',key);
    const element=root.current;
    return()=>{document.removeEventListener('pointerdown',close);element?.removeEventListener('keydown',key);};
  },[panel]);
  useEffect(()=>{if(!masterMode)setPanel('');},[masterMode]);
  const enemyPanel=panel==='enemies', familiarPanel=panel==='familiars';
  const rows=enemyPanel?enemies:sheets;
  const familiarRows=sheets.flatMap(sheet=>(Array.isArray(sheet.familiares)?sheet.familiares:[]).map((f,index)=>({
    sheet,f,index,key:String(f.id??index),sheetId:String(sheet.id),
  })));
  const selectedFamiliar=activeFamiliar&&familiarRows.find(row=>row.sheetId===activeFamiliar.sheetId&&row.key===activeFamiliar.familiarId);
  const updateFamiliar=patch=>{
    if(!selectedFamiliar||!onChangeSheet)return;
    const updated={...selectedFamiliar.sheet,familiares:(selectedFamiliar.sheet.familiares||[]).map((f,index)=>
      String(f.id??index)===selectedFamiliar.key?{...f,...patch}:f
    )};
    onChangeSheet(updated);
  };
  const closeFamiliar=()=>setActiveFamiliar(null);
  return <div className="map-sheet-dock" ref={root}>
    <button ref={playersButton} type="button" className="map-dock-trigger" title={masterMode?'Fichas dos personagens':(sheets[0]?.nome||'Minha ficha')} aria-label={masterMode?'Fichas dos personagens':'Minha ficha'} aria-expanded={masterMode?panel==='players':undefined} aria-controls={masterMode?'map-sheet-picker':undefined} onClick={()=>{if(!masterMode){if(sheets[0])onSelectSheet(sheets[0]);return;}setPanel(panel==='players'?'':'players');}}>
      {!masterMode&&sheets[0]?.foto?<img src={sheets[0].foto} alt=""/>:<DockIcon/>}
    </button>
    <button ref={familiarsButton} type="button" className="map-dock-trigger familiars" title="Familiares" aria-label="Familiares" aria-expanded={familiarPanel} aria-controls="map-family-picker" onClick={()=>setPanel(familiarPanel?'':'familiars')}><span aria-hidden="true">🐾</span><span>Familiares</span></button>
    {masterMode&&<button ref={enemiesButton} type="button" className="map-dock-trigger enemies" title="Fichas dos inimigos" aria-label="Fichas dos inimigos" aria-expanded={enemyPanel} aria-controls="map-sheet-picker" onClick={()=>setPanel(enemyPanel?'':'enemies')}><DockIcon enemy/><small>{enemies.length}</small></button>}
    {masterMode&&panel==='players'&&<section id="map-sheet-picker" className="map-sheet-picker" aria-label="Fichas dos personagens">
      <header><b>PERSONAGENS</b><button type="button" aria-label="Fechar lista de fichas" onClick={()=>setPanel('')}>{'\u00D7'}</button></header>
      <div className="map-sheet-picker-list">{sheets.map(row=>{
        const cls=CLASSES.find(c=>c.id===row.classe);
        const color=SHEET_COLORS[row.classe]||cls?.color||'#a855f7';
        const open=floatingSheets.some(item=>item.sheetId===String(row.id));
        return <button type="button" key={row.id} className={open?'open':''} style={{'--class-color':color}} aria-pressed={open} onClick={()=>{onSelectSheet(row);setPanel('');}}>
          <span className="map-picker-portrait">{row.foto?<img src={row.foto} alt="" loading="lazy" decoding="async"/>:<span aria-hidden="true">{cls?.icon||row.nome?.[0]||'?'}</span>}</span><span><b>{row.nome||'Sem nome'}</b><small>{cls?.name||'Personagem'}</small></span><i aria-hidden="true">↗</i>
        </button>;
      })}{!sheets.length&&<p>Nenhuma ficha cadastrada.</p>}</div>
      {sheets.length<15&&<button type="button" className="map-picker-create" onClick={()=>{onCreateSheet();setPanel('');}}>+ Criar ficha</button>}
    </section>}
    {masterMode&&enemyPanel&&<section id="map-sheet-picker" className="map-sheet-picker enemies" aria-label="Fichas dos inimigos">
      <header><b>INIMIGOS</b><button type="button" aria-label="Fechar lista de fichas" onClick={()=>setPanel('')}>{'\u00D7'}</button></header>
      <div className="map-sheet-picker-list">{rows.map(row=>{
        const color='#E8193C';
        const open=floatingEnemies.some(item=>item.enemyId===String(row.id));
        return <button type="button" key={row.id} className={open?'open':''} style={{'--class-color':color}} aria-pressed={open} onClick={()=>{onSelectEnemy(String(row.id));setPanel('');}}>
          <span className="map-picker-portrait">{row.foto?<img src={row.foto} alt="" loading="lazy" decoding="async"/>:<span aria-hidden="true">💀</span>}</span><span><b>{row.nome||'Sem nome'}</b><small>{row.tipo||'Inimigo'}</small></span><i aria-hidden="true">{open?'−':'↗'}</i>
        </button>;
      })}{!rows.length&&<p>Nenhuma ficha cadastrada.</p>}</div>
    </section>}
    {familiarPanel&&<section id="map-family-picker" className="map-sheet-picker familiars" aria-label="Familiares disponíveis">
      <header><b>FAMILIARES</b><button type="button" aria-label="Fechar lista de familiares" onClick={()=>setPanel('')}>{'\u00D7'}</button></header>
      <div className="map-sheet-picker-list">{familiarRows.map(row=>{
        const kind=row.f.tipo||'outro',icon=FAMILIAR_ICONS[kind]||'✨';
        const selected=selectedFamiliar?.sheetId===row.sheetId&&selectedFamiliar?.key===row.key;
        const color=SHEET_COLORS[row.sheet.classe]||CLASSES.find(c=>c.id===row.sheet.classe)?.color||'#C084FC';
        return <button type="button" key={row.sheetId+':'+row.key} className={selected?'open':''} style={{'--class-color':color}} onClick={()=>{setActiveFamiliar({sheetId:row.sheetId,familiarId:row.key});setPanel('');}}>
          <span className="map-picker-portrait">{icon}</span><span><b>{row.f.nome||'Familiar'}{masterMode&&' · '+(row.sheet.nome||'Personagem')}</b><small>{row.f.hp??10}/{row.f.hpMax??10} HP · {Math.min(2,Number(row.f.vigos??2)||0)}/2 VC</small></span><i aria-hidden="true">{selected?'●':'↗'}</i>
        </button>;
      })}{!familiarRows.length&&<p>Nenhum familiar definido para esta ficha.</p>}</div>
    </section>}
    {selectedFamiliar&&(()=>{const {f,sheet,index}=selectedFamiliar;const hpMax=Math.max(1,Number(f.hpMax??10)||10),hp=Math.min(hpMax,Math.max(0,Number(f.hp??10)||0)),vigor=Math.min(2,Math.max(0,Number(f.vigos??2)||0)),icon=FAMILIAR_ICONS[f.tipo]||'✨';const skills=Array.isArray(f.habilidades)?f.habilidades:[];return <section className="map-familiar-sheet" aria-label={'Ficha de '+(f.nome||'familiar')}>
      <header><span>{icon} FICHA DO FAMILIAR</span><button type="button" aria-label="Fechar ficha do familiar" onClick={closeFamiliar}>{'\u00D7'}</button></header>
      <div className="map-familiar-name">{f.nome||'Familiar'}{masterMode&&<small>{sheet.nome||'Personagem'}</small>}</div>
      <div className="map-familiar-resource"><span>❤️ VIDA</span><div><button type="button" aria-label="Reduzir vida" disabled={hp<=0} onClick={()=>updateFamiliar({hp:Math.max(0,hp-1)})}>−</button><b>{hp} / {hpMax}</b><button type="button" aria-label="Aumentar vida" disabled={hp>=hpMax} onClick={()=>updateFamiliar({hp:Math.min(hpMax,hp+1)})}>＋</button></div></div>
      <div className="map-familiar-resource"><span>✦ VIGOR CÓSMICO</span><div><button type="button" aria-label="Reduzir vigor cósmico" disabled={vigor<=0} onClick={()=>updateFamiliar({vigos:Math.max(0,vigor-1)})}>−</button><b>{vigor} / 2</b><button type="button" aria-label="Aumentar vigor cósmico" disabled={vigor>=2} onClick={()=>updateFamiliar({vigos:Math.min(2,vigor+1)})}>＋</button></div></div>
      {skills.length>0&&<div className="map-familiar-abilities"><b>HABILIDADES</b>{skills.map((ability,i)=>{const cost=Math.min(2,Math.max(0,Number(ability.custo)||0));return <div key={ability.id??i}><span><strong>{ability.nome||'Habilidade'}</strong>{ability.efeito&&<small>{ability.efeito}</small>}{ability.descricao&&<small>{ability.descricao}</small>}</span><button type="button" disabled={vigor<cost} onClick={()=>updateFamiliar({vigos:Math.max(0,vigor-cost)})}>Usar · {cost} VC</button></div>;})}</div>}
    </section>;})()}
  </div>;
}
