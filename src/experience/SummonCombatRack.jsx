import { useEffect, useRef, useState } from 'react';
import { useExperience } from './ExperienceKit';
import './visitor-summons.css';
import { SummonAttrRows } from './SummonSheetParts';
import AbilityTypeBadge from './AbilityTypeBadge';
import './summon-rack-ficha.css';

function SummonMiniSheet({record,memory,api,ownerName}) {
  const [draft,setDraft]=useState(null);
  const [showAttrs,setShowAttrs]=useState(false);
  const draftRef=useRef(null);
  const pendingCount=useRef(0);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const queue=useRef(Promise.resolve());
  const live=useRef(true);
  useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  const max=Math.max(1,Number(memory?.hp??record.maxHp??10)+Number(memory?.hp_bonus||0));
  const hp=Math.max(0,Math.min(max,Number(draft?.hp??record.hp??0)));
  const vc=Math.max(0,Math.min(3,Number(draft?.vc??record.vigos??3)));
  useEffect(()=>{if(!pendingCount.current){draftRef.current=null;setDraft(null);}},[record.hp,record.vigos,record.updatedAt]);
  const adjust=(field,delta)=>{
    if(busy)return;
    const current=draftRef.current||{hp,vc};
    const actualDelta=field==='hp'?Math.max(0,Math.min(max,current.hp+delta))-current.hp:Math.max(0,Math.min(3,current.vc+delta))-current.vc;
    if(!actualDelta)return;
    setError('');pendingCount.current++;draftRef.current={...current,[field]:current[field]+actualDelta};setDraft(draftRef.current);
    queue.current=queue.current.then(async()=>{
      try {
        const ok=field==='hp'?await api.updateSummonHp(record.id,actualDelta,max):await api.updateSummonVc(record.id,actualDelta);
        if(!ok)throw new Error('rejected');
      }catch{if(live.current){draftRef.current=null;setDraft(null);setError('Não foi possível salvar. Confira a conexão e tente novamente.');}}
      finally{pendingCount.current--;}
    });
  };
  const act=async callback=>{
    if(busy)return;setBusy(true);setError('');
    try{await queue.current;if(!await callback())throw new Error('rejected');}
    catch{if(live.current)setError('A ação não foi concluída. Confira HP, VC e conexão.');}
    finally{if(live.current)setBusy(false);}
  };
  return <article className="summon-mini-sheet" style={{'--summon-color':record.color||'#a855f7'}} aria-label={`Invocação ${record.nome}`}>
    <header>
      <span className="summon-mini-portrait" aria-hidden="true">{(memory?.foto||record.foto)?<img src={memory?.foto||record.foto} alt="" loading="lazy" decoding="async" />:'\uD83D\uDC80'}</span>
      <span className="summon-mini-identity"><strong>{record.nome||'Invocação'}</strong><small>{ownerName?`de ${ownerName} · `:''}Ameaça {memory?.ameaca||record.ameaca||'Baixa'}</small></span>
      <button disabled={busy} onClick={()=>act(()=>api.storeSummon(record.id))}>Guardar</button></header>
    <div className="summon-mini-hpbar" aria-hidden="true"><i style={{width:Math.round(hp/max*100)+'%'}} data-low={hp/max<=.34?'true':'false'}/></div>
    <div className="summon-mini-resource"><label>HP</label><button aria-label={`Diminuir HP de ${record.nome}`} disabled={busy||hp<=0} onClick={()=>adjust('hp',-1)}>{'\u2212'}</button><output>{hp}/{max}</output><button aria-label={`Aumentar HP de ${record.nome}`} disabled={busy||hp>=max} onClick={()=>adjust('hp',1)}>+</button></div>
    <div className="summon-mini-resource"><label>VC</label><div className="summon-vigor-dots" role="group" aria-label={`Vigor cósmico ${vc} de 3`}>{[0,1,2].map(index=>{const active=index<vc;const next=active?index:index+1;return <button type="button" key={index} className={active?'active':''} aria-label={`Definir vigor em ${next}`} aria-pressed={active} disabled={busy} onClick={()=>act(()=>api.updateSummonVc(record.id,next-vc))}><i/></button>;})}<output>{vc}/3</output></div></div>
    <details className="summon-mini-attrs"><summary>Atributos</summary><SummonAttrRows source={memory||record} compact/></details>
    <div className="summon-mini-actions">{(record.ataques||[]).map((action,index)=>{
      const type=action.tipoHab||'normal';
      const cost=Math.max(0,Math.min(3,Number(action.custo??1)));
      const body=<><span className="summon-mini-action-head"><b>{action.nome||action.name||'Habilidade'}</b><AbilityTypeBadge ability={action} fallback={type}/></span>{(action.desc||action.descricao)&&<em>{action.desc||action.descricao}</em>}<small>{type==='passiva'?'Sempre ativa':`${cost} VC`}{action.dano?` · \u2694 ${action.dano}`:''}</small></>;
      // Passiva não se usa: aparece como informação, não como botão.
      if(type==='passiva')return <div key={action.id||index} className="summon-mini-passive" data-ability-tier="passiva">{body}</div>;
      return <button key={action.id||index} data-ability-tier={type} disabled={busy||hp<=0||vc<cost} onClick={()=>act(()=>api.useSummonAction(record.id,action))} title={action.desc||action.descricao||''}>{body}</button>;
    })}</div>
    {error&&<p className="visitor-error" role="alert">{error}</p>}
  </article>;
}

export default function SummonCombatRack({access,tab}) {
  const api=useExperience();
  const {selectedSheet,summons,sheets,masterMode}=api;
  const [open,setOpen]=useState(true);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  if(tab!=='mapabatalha')return null;
  // O Mestre acompanha todas as invocações em campo, de qualquer necromante,
  // com a mesma mini ficha — sem precisar abrir a ficha de cada jogador.
  const overseeing=Boolean(masterMode||access?.role==='master');
  if(overseeing){
    const field=(summons||[]).filter(row=>row.active!==false&&row.type==='summon');
    if(!field.length)return null;
    const ownerOf=row=>(sheets||[]).find(sheet=>String(sheet.id)===String(row.ownerSheetId));
    return <aside className="summon-combat-rack is-master" aria-label="Invocações em campo">
      <button className="summon-rack-toggle" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{'\uD83D\uDC80'} Invocações em campo <b>{field.length}</b><span>{open?'Recolher':'Abrir'}</span></button>
      {open&&<div className="summon-rack-body">{field.map(record=>{const owner=ownerOf(record);return <SummonMiniSheet key={record.id} record={record} ownerName={owner?.nome||''} memory={(owner?.invocacoes||[]).find(memory=>String(memory.id)===String(record.summonMemoryId))} api={api}/>;})}</div>}
    </aside>;
  }
  if(!['player','visitor'].includes(access?.role)||selectedSheet?.classe!=='necromante')return null;
  const memories=(selectedSheet.invocacoes||[]).filter(memory=>memory.revealed===true);
  const active=summons.filter(row=>row.active!==false&&String(row.ownerSheetId)===String(selectedSheet.id));
  const available=memories.filter(memory=>!active.some(row=>String(row.summonMemoryId)===String(memory.id)));
  if(!memories.length&&!active.length)return null;
  const release=async memory=>{
    if(busy)return;setBusy(String(memory.id));setError('');
    try{if(!await api.useSummonAbility({},memory))throw new Error('rejected');setOpen(true);}
    catch{setError('Não foi possível liberar a invocação. Confira sua conexão.');}
    finally{setBusy('');}
  };
  return <aside className="summon-combat-rack" aria-label="Controle das invocações">
    <button className="summon-rack-toggle" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{'\uD83D\uDC80'} Invocações <b>{active.length}</b><span>{open?'Recolher':'Abrir'}</span></button>
    {open&&<div className="summon-rack-body">{active.map(record=><SummonMiniSheet key={record.id} record={record} memory={memories.find(memory=>String(memory.id)===String(record.summonMemoryId))} api={api}/>)}
      {!!available.length&&<details className="summon-mini-available" open={!active.length}><summary>Liberar invocação ({available.length})</summary>{available.map(memory=><button key={memory.id} disabled={!!busy} onClick={()=>release(memory)}><span>{memory.nome||'Invocação'}</span><b>{busy===String(memory.id)?'Liberando...':'Liberar'}</b></button>)}</details>}
      {error&&<p className="visitor-error" role="alert">{error}</p>}
    </div>}
  </aside>;
}
