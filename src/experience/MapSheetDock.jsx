import {useEffect,useRef,useState} from 'react';
import {CLASSES,SHEET_COLORS} from '../data/gameData';

function DockIcon({enemy=false}) {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{enemy?<><path d="M6 4 3 2v7a9 9 0 0 0 18 0V2l-3 2M6 5h12v8l-6 7-6-7Z"/><path d="m8 9 2 2m6-2-2 2M10 15h4"/></>:<><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2M4 3h3M17 3h3"/></>}</svg>;
}

export default function MapSheetDock({masterMode,sheets,enemies,floatingEnemies,onSelectSheet,onSelectEnemy,onCreateSheet}) {
  const [panel,setPanel]=useState('');
  const root=useRef(null),playersButton=useRef(null),enemiesButton=useRef(null);
  useEffect(()=>{
    if(!panel)return;
    const close=event=>{if(!root.current?.contains(event.target))setPanel('');};
    const key=event=>{if(event.key==='Escape'){event.stopPropagation();setPanel('');(panel==='enemies'?enemiesButton:playersButton).current?.focus();}};
    document.addEventListener('pointerdown',close);root.current?.addEventListener('keydown',key);
    const element=root.current;
    return()=>{document.removeEventListener('pointerdown',close);element?.removeEventListener('keydown',key);};
  },[panel]);
  useEffect(()=>{if(!masterMode)setPanel('');},[masterMode]);
  const enemyPanel=panel==='enemies';
  const rows=enemyPanel?enemies:sheets;
  return <div className="map-sheet-dock" ref={root}>
    <button ref={playersButton} type="button" className="map-dock-trigger" title={masterMode?'Fichas dos personagens':(sheets[0]?.nome||'Minha ficha')} aria-label={masterMode?'Fichas dos personagens':'Minha ficha'} aria-expanded={masterMode?panel==='players':undefined} aria-controls={masterMode?'map-sheet-picker':undefined} onClick={()=>{if(!masterMode){if(sheets[0])onSelectSheet(sheets[0]);return;}setPanel(panel==='players'?'':'players');}}>
      {!masterMode&&sheets[0]?.foto?<img src={sheets[0].foto} alt=""/>:<DockIcon/>}
    </button>
    {masterMode&&<button ref={enemiesButton} type="button" className="map-dock-trigger enemies" title="Fichas dos inimigos" aria-label="Fichas dos inimigos" aria-expanded={enemyPanel} aria-controls="map-sheet-picker" onClick={()=>setPanel(enemyPanel?'':'enemies')}><DockIcon enemy/><small>{enemies.length}</small></button>}
    {masterMode&&panel&&<section id="map-sheet-picker" className={'map-sheet-picker '+(enemyPanel?'enemies':'')} aria-label={enemyPanel?'Fichas dos inimigos':'Fichas dos personagens'}>
      <header><b>{enemyPanel?'INIMIGOS':'PERSONAGENS'}</b><button type="button" aria-label="Fechar lista de fichas" onClick={()=>{setPanel('');(enemyPanel?enemiesButton:playersButton).current?.focus();}}>{'\u00D7'}</button></header>
      <div className="map-sheet-picker-list">{rows.map(row=>{
        const cls=CLASSES.find(c=>c.id===row.classe);
        const color=SHEET_COLORS[row.classe]||cls?.color||(enemyPanel?'#E8193C':'#a855f7');
        const open=enemyPanel&&floatingEnemies.some(item=>item.enemyId===String(row.id));
        return <button type="button" key={row.id} className={open?'open':''} style={{'--class-color':color}} aria-pressed={enemyPanel?open:undefined} onClick={()=>{if(enemyPanel)onSelectEnemy(String(row.id));else onSelectSheet(row);setPanel('');}}>
          <span className="map-picker-portrait">{row.foto?<img src={row.foto} alt="" loading="lazy" decoding="async"/>:<span aria-hidden="true">{cls?.icon||row.nome?.[0]||'?'}</span>}</span><span><b>{row.nome||'Sem nome'}</b><small>{open?'Ficha aberta':cls?.name||row.tipo||(enemyPanel?'Inimigo':'Personagem')}</small></span><i aria-hidden="true">{open?'\u2212':'\u2197'}</i>
        </button>;
      })}{!rows.length&&<p>Nenhuma ficha cadastrada.</p>}</div>
      {!enemyPanel&&sheets.length<15&&<button type="button" className="map-picker-create" onClick={()=>{onCreateSheet();setPanel('');}}>+ Criar ficha</button>}
    </section>}
  </div>;
}
