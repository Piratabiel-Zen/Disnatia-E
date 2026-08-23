import { useEffect, useRef, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../core/firebase';
import { compressImage } from '../core/media';
import { RestrictedAccess, hpColor } from '../core/ui';
import { ARTEFATOS_DATA, ATTRS, CLASSES, SHEET_COLORS } from '../data/gameData';
import { AttrDots, StatusPanel, ArtefatoFichaPanel } from '../features/sheets/SheetComponents';

const ENEMY_DEFAULT = '#FF4F65';
const DANGER_COLORS = { Baixo:'#4ADE80', Médio:'#E8A020', Alto:'#FF6B35', Extremo:'#E8193C' };
const DANGER_LEVELS = ['Baixo','Médio','Alto','Extremo'];

const makeAbility = () => ({
  id:`enemy_ab_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  nome:'', descricao:'', dano:'', custo:0, cooldown:'—', tipoHab:'normal',
});

const makeEnemy = id => ({
  id,
  nome:'', tipo:'', classe:'', nivel:1, perigo:'Médio',
  hp:10, hp_max:10, hp_bonus:0, vigos:10, alcance:'',
  forca:0, agilidade:0, durabilidade:0, inteligencia:0, percepcao:0, sorte:0,
  foto:'', habilidades:[], cooldowns:{}, notas:'', lore:'', status:{},
});

const classFor = enemy => CLASSES.find(c => c.id === enemy?.classe) || null;
const enemyColor = enemy => {
  const cls = classFor(enemy);
  if (!cls) return DANGER_COLORS[enemy?.perigo] || ENEMY_DEFAULT;
  return SHEET_COLORS[cls.id] || cls.color || ENEMY_DEFAULT;
};
const maxHpFor = enemy => Math.max(1, Number(enemy?.hp_max ?? Math.max(10, Number(enemy?.hp || 10))) + Math.max(0, Number(enemy?.hp_bonus || 0)));
const parseCooldown = value => {
  const text = String(value || '').toLowerCase();
  if (!text || text === '—' || text === '-') return 0;
  if (text.includes('combate')) return 99;
  const n = Number((text.match(/\d+/) || [0])[0]);
  return Number.isFinite(n) ? n : 0;
};

function mergedAbilities(enemy) {
  const cls = classFor(enemy);
  const classNormal = (cls?.normal || []).map((a,i) => ({
    ...a, id:`class_${cls.id}_normal_${i}`, nome:a.name, custo:Number(a.cost || 0), tipoHab:'normal', source:'classe',
  }));
  const classSpecial = (cls?.specials || []).filter(a => Number(a.req || 1) <= Number(enemy?.nivel || 1)).map((a,i) => ({
    ...a, id:`class_${cls.id}_special_${i}`, nome:a.name, custo:Number(a.cost || 0), tipoHab:'especial', source:'classe',
  }));
  const custom = (enemy?.habilidades || []).map(a => ({ ...a, source:'custom' }));
  return [...classNormal, ...classSpecial, ...custom];
}

function EnemyIcon({ enemy, active, onClick }) {
  const color = enemyColor(enemy);
  const cls = classFor(enemy);
  return (
    <button className={`enemy-icon-button ${active ? 'active' : ''}`} style={{'--enemy-color':color}} onClick={onClick} title={enemy.nome || 'Inimigo'}>
      {enemy.foto ? <img src={enemy.foto} alt=""/> : <span>{cls?.icon || '💀'}</span>}
    </button>
  );
}

function NumberControl({ value, min=0, max=999, onChange, color=ENEMY_DEFAULT }) {
  const n = Number(value || 0);
  return (
    <div style={{display:'flex',alignItems:'center',gap:6}}>
      <button onClick={()=>onChange(Math.max(min,n-1))} style={{width:28,height:28,padding:0,borderRadius:7,border:`1px solid ${color}44`,background:`${color}0d`,color,cursor:'pointer'}}>−</button>
      <input type="number" value={n} min={min} max={max} onChange={e=>onChange(Math.max(min,Math.min(max,Number(e.target.value)||0)))} style={{width:60,textAlign:'center'}}/>
      <button onClick={()=>onChange(Math.min(max,n+1))} style={{width:28,height:28,padding:0,borderRadius:7,border:`1px solid ${color}44`,background:`${color}0d`,color,cursor:'pointer'}}>+</button>
    </div>
  );
}

function AbilityCard({ enemy, ability, onChange, onDelete }) {
  const color = ability.tipoHab === 'especial' ? '#A855F7' : ability.tipoHab === 'passiva' ? '#E8A020' : enemyColor(enemy);
  const cooldowns = enemy.cooldowns || {};
  const key = String(ability.id || ability.nome);
  const cd = Number(cooldowns[key] || 0);
  const cost = Number(ability.custo ?? ability.cost ?? 0);
  const passive = ability.tipoHab === 'passiva';
  const canUse = !passive && cd <= 0 && Number(enemy.vigos || 0) >= cost;
  const useAbility = () => {
    if (!canUse) return;
    const turns = parseCooldown(ability.cooldown);
    onChange({
      ...enemy,
      vigos:Math.max(0,Number(enemy.vigos || 0)-cost),
      cooldowns:{...cooldowns,...(turns>0?{[key]:turns}:{})},
    });
  };
  const updateCooldown = next => onChange({...enemy,cooldowns:{...cooldowns,[key]:Math.max(0,next)}});
  return (
    <div className="enemy-ability-card" style={{'--ability-color':color}}>
      <header>
        <span style={{color}}>{ability.tipoHab==='especial'?'✦':ability.tipoHab==='passiva'?'◇':'⚔'}</span>
        <b>{ability.nome || ability.name || 'Habilidade'}</b>
        <small>{ability.source === 'classe' ? 'CLASSE' : 'PRÓPRIA'}</small>
      </header>
      <small>{ability.dano ? `Dano/Efeito: ${ability.dano}` : ''}{ability.dano && cost ? ' · ' : ''}{cost ? `${cost} VC` : passive ? 'Passiva' : '0 VC'}{ability.cooldown && ability.cooldown !== '—' ? ` · CD ${ability.cooldown}` : ''}</small>
      {(ability.descricao || ability.desc) && <p>{ability.descricao || ability.desc}</p>}
      <div className="enemy-ability-actions">
        {!passive && <button disabled={!canUse} onClick={useAbility} style={{border:`1px solid ${color}55`,background:`${color}12`,color:canUse?color:'#5e555f',cursor:canUse?'pointer':'not-allowed'}}>{cd>0?(cd>=90?'USADO':`CD ${cd}`):`Usar · ${cost} VC`}</button>}
        {!passive && cd>0 && <button onClick={()=>updateCooldown(cd>=90?0:cd-1)} style={{border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.025)',color:'#8b7b88',cursor:'pointer'}}>{cd>=90?'Resetar':'−1 CD'}</button>}
        {ability.source === 'custom' && <button onClick={onDelete} style={{marginLeft:'auto',border:'1px solid rgba(232,25,60,.25)',background:'rgba(232,25,60,.07)',color:'#db6678',cursor:'pointer'}}>Excluir</button>}
      </div>
    </div>
  );
}

function AbilityEditor({ enemy, onChange }) {
  const [form,setForm] = useState(makeAbility());
  const save = () => {
    if (!form.nome.trim()) return;
    onChange({...enemy,habilidades:[...(enemy.habilidades || []),{...form,id:form.id || `enemy_ab_${Date.now()}`}]});
    setForm(makeAbility());
  };
  return (
    <div className="enemy-sheet-panel" style={{'--enemy-color':enemyColor(enemy),marginTop:12}}>
      <h4>✦ Criar habilidade própria</h4>
      <div className="enemy-form-grid">
        <div className="enemy-form-field"><label>Nome</label><input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Corte Abissal"/></div>
        <div className="enemy-form-field"><label>Tipo</label><select value={form.tipoHab} onChange={e=>setForm(f=>({...f,tipoHab:e.target.value}))}><option value="normal">Normal</option><option value="especial">Especial</option><option value="passiva">Passiva</option></select></div>
        <div className="enemy-form-field"><label>Dano / efeito</label><input value={form.dano} onChange={e=>setForm(f=>({...f,dano:e.target.value}))} placeholder="Ex: 1D8 + Força"/></div>
        <div className="enemy-form-field"><label>Custo VC</label><input type="number" min="0" value={form.custo} onChange={e=>setForm(f=>({...f,custo:Number(e.target.value)||0}))}/></div>
        <div className="enemy-form-field"><label>Cooldown</label><input value={form.cooldown} onChange={e=>setForm(f=>({...f,cooldown:e.target.value}))} placeholder="Ex: 3 rodadas"/></div>
        <div className="enemy-form-field wide"><label>Descrição</label><textarea rows="3" value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Efeito, alcance, condição e detalhes..."/></div>
      </div>
      <button onClick={save} disabled={!form.nome.trim()} style={{marginTop:10,padding:'8px 13px',borderRadius:7,border:`1px solid ${enemyColor(enemy)}55`,background:`${enemyColor(enemy)}12`,color:form.nome.trim()?enemyColor(enemy):'#5b5059',cursor:form.nome.trim()?'pointer':'not-allowed',fontFamily:'Cinzel,serif',fontSize:9}}>✦ Adicionar habilidade</button>
    </div>
  );
}

function EnemySheet({ enemy, onChange, onDelete, revealedArtefatos, artefatosHabs }) {
  const [tab,setTab] = useState('geral');
  const photoRef = useRef(null);
  const color = enemyColor(enemy);
  const cls = classFor(enemy);
  const maxHp = maxHpFor(enemy);
  const hp = Math.max(0,Math.min(maxHp,Number(enemy.hp || 0)));
  const abilities = mergedAbilities(enemy);
  const f = (k,v) => onChange({...enemy,[k]:v});

  const handlePhoto = e => {
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=async ev=>f('foto',await compressImage(ev.target.result,1000,1000,.8));
    reader.readAsDataURL(file); e.target.value='';
  };
  const setBaseHp = value => {
    const base=Math.max(1,Number(value)||1);
    const nextMax=base+Math.max(0,Number(enemy.hp_bonus||0));
    onChange({...enemy,hp_max:base,hp:Math.min(Number(enemy.hp||0),nextMax)});
  };
  const setBonusHp = value => {
    const bonus=Math.max(0,Number(value)||0);
    const nextMax=Math.max(1,Number(enemy.hp_max??10))+bonus;
    onChange({...enemy,hp_bonus:bonus,hp:Math.min(Number(enemy.hp||0),nextMax)});
  };
  const setClass = value => {
    const nextClass=CLASSES.find(c=>c.id===value);
    onChange({...enemy,classe:value,alcance:enemy.alcance || nextClass?.alcance || ''});
  };
  const deleteAbility = id => onChange({...enemy,habilidades:(enemy.habilidades||[]).filter(a=>String(a.id)!==String(id))});

  return (
    <div className="enemy-sheet-shell" style={{'--enemy-color':color}}>
      <div className="enemy-sheet-accent"/>
      <div className="enemy-sheet-header">
        <button className="enemy-sheet-avatar" onClick={()=>photoRef.current?.click()} title="Trocar imagem">
          {enemy.foto?<img src={enemy.foto} alt=""/>:<span>{cls?.icon || '💀'}</span>}
        </button>
        <input ref={photoRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}}/>
        <div className="enemy-sheet-title"><h3>{enemy.nome || 'Inimigo sem nome'}</h3><p>{cls ? `${cls.icon} ${cls.name}` : '◌ Sem classe'} · Nv {enemy.nivel || 1}{enemy.tipo?` · ${enemy.tipo}`:''}</p></div>
        <div className="enemy-sheet-meta"><span style={{color:DANGER_COLORS[enemy.perigo]}}>Perigo {enemy.perigo || 'Médio'}</span><span>{abilities.length} habilidades</span><span>{hp}/{maxHp} HP</span></div>
      </div>
      <div className="enemy-sheet-tabs">
        {[['geral','◈ Visão Geral'],['combate','⚔ Combate & Habilidades'],['lore','✦ Lore & Inventário']].map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}
      </div>
      <div className="enemy-sheet-body">
        {tab==='geral'&&<div className="enemy-sheet-grid">
          <section className="enemy-sheet-panel" style={{'--enemy-color':color}}>
            <h4>Identidade & origem</h4>
            <div className="enemy-form-grid">
              <div className="enemy-form-field wide"><label>Nome</label><input value={enemy.nome||''} onChange={e=>f('nome',e.target.value)} placeholder="Nome do inimigo"/></div>
              <div className="enemy-form-field"><label>Tipo / origem</label><input value={enemy.tipo||''} onChange={e=>f('tipo',e.target.value)} placeholder="Humano, entidade..."/></div>
              <div className="enemy-form-field"><label>Nível</label><input type="number" min="1" max="30" value={enemy.nivel||1} onChange={e=>f('nivel',Math.max(1,Math.min(30,Number(e.target.value)||1)))}/></div>
              <div className="enemy-form-field wide"><label>Classe</label><select value={enemy.classe||''} onChange={e=>setClass(e.target.value)}><option value="">◌ Sem classe · habilidades próprias</option>{CLASSES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></div>
              <div className="enemy-form-field"><label>Perigo</label><select value={enemy.perigo||'Médio'} onChange={e=>f('perigo',e.target.value)}>{DANGER_LEVELS.map(x=><option key={x} value={x}>{x}</option>)}</select></div>
              <div className="enemy-form-field"><label>Alcance</label><input value={enemy.alcance||''} onChange={e=>f('alcance',e.target.value)} placeholder={cls?.alcance||'Ex: 3m'}/></div>
            </div>
            {cls&&<div className="enemy-class-note"><b style={{color}}>{cls.passive?.name || cls.name}</b><br/>{cls.passive?.desc || cls.role || 'Classe vinculada à ficha.'}</div>}
          </section>
          <section className="enemy-sheet-panel" style={{'--enemy-color':color}}>
            <h4>Vida & recursos</h4>
            <div className="enemy-hp-box">
              <div style={{font:'8px Cinzel,serif',letterSpacing:'.18em',color:'#8b6068'}}>PONTOS DE VIDA</div>
              <div className="enemy-hp-controls"><button onClick={()=>f('hp',Math.max(0,hp-1))} style={{border:'1px solid rgba(232,25,60,.35)',background:'rgba(232,25,60,.1)',color:'#E8193C'}}>−</button><div className="enemy-hp-value" style={{color:hpColor(hp,maxHp)}}>{hp}</div><button onClick={()=>f('hp',Math.min(maxHp,hp+1))} style={{border:'1px solid rgba(74,222,128,.35)',background:'rgba(74,222,128,.1)',color:'#4ADE80'}}>+</button></div>
              <div className="enemy-hp-track"><i style={{width:`${Math.min(100,(hp/maxHp)*100)}%`,background:hpColor(hp,maxHp)}}/></div>
            </div>
            <div className="enemy-form-grid" style={{marginTop:11}}>
              <div className="enemy-form-field"><label>HP base máximo</label><NumberControl value={enemy.hp_max??10} min={1} max={999} onChange={setBaseHp} color="#E8193C"/></div>
              <div className="enemy-form-field"><label>HP bônus</label><NumberControl value={enemy.hp_bonus||0} min={0} max={999} onChange={setBonusHp} color="#4ADE80"/></div>
              <div className="enemy-form-field wide"><label>Vigor Cósmico</label><NumberControl value={enemy.vigos||0} min={0} max={99} onChange={v=>f('vigos',v)} color={color}/></div>
            </div>
          </section>
          <section className="enemy-sheet-panel" style={{'--enemy-color':color}}>
            <h4>Atributos</h4>
            <div className="enemy-attrs">{ATTRS.map(a=>{const val=Number(enemy[a.key]||0);const bonus=Math.floor(val/2);return <div className="enemy-attr-row" key={a.key}><span style={{color:a.color}}>{a.label}</span><AttrDots value={val} color={a.color} onChange={v=>f(a.key,v)} masterMode={true}/><span className="enemy-attr-bonus" style={{color:bonus>0?a.color:'#4a424b'}}>{bonus>0?`+${bonus}`:'—'}</span></div>})}</div>
          </section>
          <section className="enemy-sheet-panel" style={{'--enemy-color':color}}><h4>Status ativos</h4><StatusPanel sheet={enemy} onChange={onChange}/></section>
        </div>}

        {tab==='combate'&&<>
          <div className="enemy-sheet-panel" style={{'--enemy-color':color}}>
            <h4>⚔ Arsenal de combate</h4>
            {cls&&<div className="enemy-class-note" style={{margin:'0 0 10px'}}>A ficha herda as habilidades de <b style={{color}}>{cls.name}</b> compatíveis com o nível atual e continua aceitando habilidades próprias abaixo.</div>}
            {abilities.length?<div className="enemy-ability-grid">{abilities.map(a=><AbilityCard key={String(a.id)} enemy={enemy} ability={a} onChange={onChange} onDelete={()=>deleteAbility(a.id)}/>)}</div>:<div className="enemy-empty">Nenhuma habilidade cadastrada. Escolha uma classe ou crie habilidades próprias.</div>}
          </div>
          <AbilityEditor enemy={enemy} onChange={onChange}/>
        </>}

        {tab==='lore'&&<div className="enemy-sheet-grid">
          <section className="enemy-sheet-panel" style={{'--enemy-color':color}}><h4>✦ Lore, comportamento & segredos</h4><textarea value={enemy.lore||''} onChange={e=>f('lore',e.target.value)} rows="12" placeholder="Origem, motivações, padrões de comportamento, fraquezas e segredos..." style={{width:'100%',resize:'vertical',lineHeight:1.75}}/></section>
          <section className="enemy-sheet-panel" style={{'--enemy-color':color}}><h4>🎒 Inventário & notas do Mestre</h4><textarea value={enemy.notas||''} onChange={e=>f('notas',e.target.value)} rows="8" placeholder="Itens, armas, drops, anotações táticas..." style={{width:'100%',resize:'vertical',lineHeight:1.7}}/><div style={{marginTop:12}}><ArtefatoFichaPanel sheet={enemy} onChange={onChange} sheetColor={color} revealedArtefatos={revealedArtefatos||[]} artefatosHabs={artefatosHabs||{}}/></div></section>
        </div>}

        <div style={{display:'flex',justifyContent:'flex-end',marginTop:14}}><button onClick={()=>{if(confirm('Excluir permanentemente esta ficha de inimigo?'))onDelete();}} style={{padding:'7px 12px',borderRadius:7,border:'1px solid rgba(232,25,60,.3)',background:'rgba(232,25,60,.08)',color:'#df6074',cursor:'pointer',fontFamily:'Cinzel,serif',fontSize:9}}>✕ Excluir ficha</button></div>
      </div>
    </div>
  );
}

export default function EnemySheetExperience({ masterMode }) {
  if (!masterMode) return <RestrictedAccess title="Acesso Restrito ao Mestre" text="As fichas dos inimigos estão ocultas nas sombras. Apenas o Mestre possui este conhecimento."/>;
  const [enemies,setEnemies] = useState([]);
  const [loaded,setLoaded] = useState(false);
  const [activeId,setActiveId] = useState(null);
  const [artefatosUnlocked,setArtefatosUnlocked] = useState({});
  const [artefatosHabs,setArtefatosHabs] = useState({});
  const saveTimeout=useRef({});

  useEffect(()=>{
    const u1=onSnapshot(collection(db,'enemies'),snap=>{const data=snap.docs.map(d=>({id:d.id,...d.data()}));data.sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));setEnemies(data);setLoaded(true);});
    const u2=onSnapshot(doc(db,'config','artefatos'),snap=>{if(snap.exists())setArtefatosUnlocked(snap.data().unlocked||{});});
    const u3=onSnapshot(doc(db,'config','artefatos_habilidades'),snap=>{if(snap.exists())setArtefatosHabs(snap.data()||{});});
    return()=>{u1();u2();u3();};
  },[]);

  useEffect(()=>{if(loaded&&enemies.length&&!enemies.some(e=>String(e.id)===String(activeId)))setActiveId(String(enemies[0].id));},[loaded,enemies,activeId]);

  const save = enemy => {clearTimeout(saveTimeout.current[enemy.id]);saveTimeout.current[enemy.id]=setTimeout(()=>setDoc(doc(db,'enemies',String(enemy.id)),enemy).catch(console.error),650);};
  const update = (id,data) => {setEnemies(prev=>prev.map(e=>String(e.id)===String(id)?data:e));save(data);};
  const add = async()=>{if(enemies.length>=15)return;const enemy=makeEnemy(Date.now());await setDoc(doc(db,'enemies',String(enemy.id)),enemy);setActiveId(String(enemy.id));};
  const remove = async id=>{await deleteDoc(doc(db,'enemies',String(id)));setActiveId(null);};
  const active=enemies.find(e=>String(e.id)===String(activeId));
  const revealedArtefatos=ARTEFATOS_DATA.filter(a=>artefatosUnlocked[a.id]);

  return <div className="enemy-sheet-page">
    <div className="enemy-sheet-head"><div className="enemy-sheet-kicker">As forças que desafiam os portadores</div><h2>Fichas dos Inimigos</h2><div style={{font:'9px Cinzel,serif',color:'#5e5059',marginTop:7}}>✦ Mesmo padrão das fichas de personagem · controle exclusivo do Mestre</div></div>
    {!loaded?<div className="enemy-empty">Conectando às forças do cosmos...</div>:<>
      <div className="enemy-icon-strip">{enemies.map(e=><EnemyIcon key={e.id} enemy={e} active={String(e.id)===String(activeId)} onClick={()=>setActiveId(String(e.id))}/>)}{enemies.length<15&&<button className="enemy-create-button" onClick={add}>＋ Criar Inimigo</button>}</div>
      {active?<EnemySheet enemy={active} onChange={d=>update(active.id,d)} onDelete={()=>remove(active.id)} revealedArtefatos={revealedArtefatos} artefatosHabs={artefatosHabs}/>:<div className="enemy-empty">{enemies.length?'Selecione um inimigo acima para abrir a ficha.':'Nenhum inimigo registrado. Crie a primeira ficha acima.'}</div>}
    </>}
  </div>;
}

export { enemyColor, classFor, maxHpFor, mergedAbilities };
