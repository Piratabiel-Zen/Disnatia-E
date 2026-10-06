import { useEffect, useRef, useState } from 'react';
import { useExperience } from './ExperienceKit.generated';
import './visitor-summons.css';

function SummonMiniSheet({record,memory,api}) {
  const [draft,setDraft]=useState(null);
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
    <header><strong>{record.nome||'Invocação'}</strong><button disabled={busy} onClick={()=>act(()=>api.storeSummon(record.id))}>Guardar</button></header>
    <div className="summon-mini-resource"><label>HP</label><button aria-label={`Diminuir HP de ${record.nome}`} disabled={busy||hp<=0} onClick={()=>adjust('hp',-1)}>{'\u2212'}</button><output>{hp}/{max}</output><button aria-label={`Aumentar HP de ${record.nome}`} disabled={busy||hp>=max} onClick={()=>adjust('hp',1)}>+</button></div>
    <div className="summon-mini-resource"><label>VC</label><button aria-label={`Diminuir VC de ${record.nome}`} disabled={busy||vc<=0} onClick={()=>adjust('vc',-1)}>{'\u2212'}</button><output>{vc}/3</output><button aria-label={`Aumentar VC de ${record.nome}`} disabled={busy||vc>=3} onClick={()=>adjust('vc',1)}>+</button></div>
    <div className="summon-mini-actions">{(record.ataques||[]).map((action,index)=>{const cost=Math.max(0,Math.min(3,Number(action.custo??1)));return <button key={action.id||index} disabled={busy||hp<=0||vc<cost} onClick={()=>act(()=>api.useSummonAction(record.id,action))} title={action.desc||action.descricao||''}><b>{action.nome||action.name||'Habilidade'}</b><small>{cost} VC{action.dano?` · ${action.dano}`:''}</small></button>;})}</div>
    {error&&<p className="visitor-error" role="alert">{error}</p>}
  </article>;
}

export default function SummonCombatRack({access,tab}) {
  const api=useExperience();
  const {selectedSheet,summons}=api;
  const [open,setOpen]=useState(true);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  if(tab!=='mapabatalha'||!['player','visitor'].includes(access?.role)||selectedSheet?.classe!=='necromante')return null;
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
