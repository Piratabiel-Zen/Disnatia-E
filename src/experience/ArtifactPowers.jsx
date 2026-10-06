import {useEffect,useRef,useState} from 'react';
import {doc} from 'firebase/firestore';
import {onSnapshot} from '../adventure/sharedSnapshot';
import {db} from '../core/firebase';
import {ARTEFATOS_DATA,ArtifactGlyph} from '../data/gameData';
import {artifactAbilities,artifactRequirements,artifactUseReason} from '../adventure/artifactRules.mjs';
import {abilityAvailability} from '../adventure/playerPreferences.mjs';
import {useExperience} from './ExperienceKit.generated';
import './artifact-powers.css';

export function ArtifactPowerControls({sheet}) {
  const {sheets,masterMode,access,selectedSheet,combat,combatState,useQuickAbility}=useExperience();
  const [config,setConfig]=useState({}),[custom,setCustom]=useState({}),[ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const pending=useRef(false);
  useEffect(()=>{
    const off=onSnapshot(doc(db,'config','artefatos'),snap=>{setConfig(snap.data()||{});setReady(true);},()=>setMessage('Não foi possível consultar os artefatos.'));
    const powers=onSnapshot(doc(db,'config','artefatos_habilidades'),snap=>setCustom(snap.data()||{}),()=>setMessage('Não foi possível consultar os poderes.'));
    return()=>{off();powers();};
  },[]);
  const current=sheets.find(row=>String(row.id)===String(sheet?.id))||sheet;
  const artifact=ARTEFATOS_DATA.find(row=>row.id===sheet?.artefato_id);
  if(!artifact)return null;
  const requirements=artifactRequirements(artifact,current),powers=artifactAbilities(artifact,custom);
  const owner=masterMode||String(current?.id)===String(access?.sheetId||selectedSheet?.id);
  const actor=combatState?.initiative?.[Number(combatState?.turnIdx||0)];
  const myTurn=masterMode||(actor?.type==='player'&&String(actor.id||'').replace(/^p_/,'')===String(current?.id));
  const reason=!owner?'Somente o portador pode usar este artefato':!ready?'Consultando artefato':!config.unlocked?.[artifact.id]?'Artefato selado':artifactUseReason(artifact,current);
  const use=async power=>{
    if(pending.current)return;
    pending.current=true;setBusy(true);setMessage('');
    try{const ok=await useQuickAbility(power,current);setMessage(ok?`${power.nome} utilizado.`:'Ação não confirmada. Confira os atributos, VC, turno e recarga.');}
    catch{setMessage('Não foi possível confirmar a ação. Confira a conexão antes de tentar novamente.');}
    finally{pending.current=false;setBusy(false);}
  };
  return <section className="artifact-powers" aria-label={'Poderes de '+artifact.name}>
    <header><ArtifactGlyph art={artifact} size={22}/><strong>{artifact.name}</strong></header>
    {requirements.length>0&&<div className={'artifact-requirements '+(artifactUseReason(artifact,current)?'blocked':'ready')}>
      <b>{artifactUseReason(artifact,current)||'Requisitos naturais atendidos'}</b>
      <p>{artifact.requisitos.texto}</p>
      <small>Atual: {requirements.map(row=>`+${row.actual} ${row.label}`).join(' · ')}. Equipamentos e efeitos temporários não contam.</small>
    </div>}
    {powers.length===0?<p>Nenhum poder registrado pelo mestre.</p>:powers.map(power=>{
      const blocked=reason||(artifact.id==='artefato-2'&&power.nome==='Intocável'&&(current.status?.atordoado||current.status?.incapacitado)?'Não pode esquivar enquanto incapacitado':'')||abilityAvailability(power,current,{combat:!!combat?.active,myTurn,busy});
      return <article key={power.id}><h4>{power.nome}</h4><small>{Number(power.custo||0)} VC{power.cooldown&&power.cooldown!=='—'?` · Recarga: ${power.cooldown}`:''}{power.dano?` · ${power.dano}`:''}</small>
        <p>{power.descricao}</p><button type="button" disabled={!!blocked} title={blocked||'Usar poder do artefato'} onClick={()=>use(power)}>{blocked||'Usar '+power.nome}</button></article>;
    })}
    <div role="status" aria-live="polite">{message}</div>
  </section>;
}

export function ArtifactSheetPanel({sheet,onChange,revealedArtefatos=[],showHeader=true}) {
  return <div className="artifact-sheet-panel">
    {showHeader&&<h4>Artefato Portado</h4>}
    <div className="artifact-select"><button type="button" className={!sheet.artefato_id?'active':''} onClick={()=>onChange({...sheet,artefato_id:''})}>Nenhum</button>
      {revealedArtefatos.map(artifact=><button type="button" key={artifact.id} className={sheet.artefato_id===artifact.id?'active':''} onClick={()=>onChange({...sheet,artefato_id:sheet.artefato_id===artifact.id?'':artifact.id})}><ArtifactGlyph art={artifact} size={18}/>{artifact.name}</button>)}
    </div>
    {revealedArtefatos.some(row=>row.id===sheet.artefato_id)&&<ArtifactPowerControls sheet={sheet}/>}
  </div>;
}
