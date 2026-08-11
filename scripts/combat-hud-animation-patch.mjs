import fs from 'node:fs';
import path from 'node:path';

function replaceRequired(source, before, after, label) {
  if (source.includes(after)) return source;
  const next = source.replace(before, after);
  if (next === source) throw new Error(`Combat HUD patch falhou: ${label}`);
  return next;
}

const experienceFile = path.join(process.cwd(), 'src', 'experience', 'ExperienceKit.jsx');
let experience = fs.readFileSync(experienceFile, 'utf8');

// O patch anterior filtrava especiais/customizadas antes de renderizar.
// Agora toda habilidade pertencente à ficha aparece no rail; requisitos apenas bloqueiam o uso.
experience = replaceRequired(
  experience,
  "  const classSpecials=(selectedClass?.specials||[]).filter((_,i)=>!!selectedSheet[i===0?'especial1':'especial2']).map(a=>({...a,_source:'special'}));\n  const campaignAbilities=(Array.isArray(customAbilities?.[selectedSheet.id])?customAbilities[selectedSheet.id]:[]).filter(a=>a&&Number(a.req||1)<=Number(selectedSheet.nivel||1)).map(a=>({...a,_source:'campaign'}));",
  "  const classSpecials=(selectedClass?.specials||[]).map((a,i)=>({...a,_source:'special',_locked:!selectedSheet[i===0?'especial1':'especial2']}));\n  const campaignAbilities=(Array.isArray(customAbilities?.[selectedSheet.id])?customAbilities[selectedSheet.id]:[]).filter(Boolean).map(a=>({...a,_source:'campaign',_locked:Number(a.req||1)>Number(selectedSheet.nivel||1)}));",
  'listar especiais e habilidades de campanha sem remover as bloqueadas'
);

experience = replaceRequired(
  experience,
  "{abilities.map(a=>{const key=String(a.id||a.name||a.nome);const cd=Number(selectedSheet.cooldowns?.[key]||0);const cost=Number(a.cost??a.custo??0);const passive=a.tipoHab==='passiva';const label=a.name||a.nome||'Habilidade';const disabled=!passive&&(cd>0||Number(selectedSheet.vigos||0)<cost);const badge=passive?'◇ PASSIVA':cd>0?`⏳ ${cd}`:a._source==='special'?`✦ ${cost} VC`:a._source==='campaign'?`◆ ${cost} VC`:`⚡ ${cost} VC`;return <button key={key} className={`hud-ability ${a._source||''} ${passive?'passive':''}`} disabled={disabled} onClick={()=>{if(!passive)useQuickAbility(a)}} title={a.desc||a.descricao||label}><span>{label}</span><small>{badge}</small></button>})}",
  "{abilities.map(a=>{const key=String(a.id||a.name||a.nome);const cd=Number(selectedSheet.cooldowns?.[key]||0);const cost=Number(a.cost??a.custo??0);const passive=a.tipoHab==='passiva';const locked=!!a._locked;const label=a.name||a.nome||'Habilidade';const disabled=locked||(!passive&&(cd>0||Number(selectedSheet.vigos||0)<cost));const badge=locked?`🔒 ${a.req?`Nv ${a.req}`:'Bloqueada'}`:passive?'◇ PASSIVA':cd>0?`⏳ ${cd}`:a._source==='special'?`✦ ${cost} VC`:a._source==='campaign'?`◆ ${cost} VC`:`⚡ ${cost} VC`;return <button key={key} className={`hud-ability ${a._source||''} ${passive?'passive':''} ${locked?'locked':''}`} disabled={disabled} onClick={()=>{if(!passive&&!locked)useQuickAbility(a)}} title={a.desc||a.descricao||label}><span>{label}</span><small>{badge}</small></button>})}",
  'estado visual e bloqueio sem esconder habilidades'
);

// O uso de habilidade passa a publicar também no feed durável, garantindo a animação global.
experience = replaceRequired(
  experience,
  "    await setDoc(doc(db,'config','cosmic_event'),{\n      id:nowId('ability'),type:'ability',text:ability.name||ability.nome||'Habilidade',ts:Date.now(),\n      color:selectedClass?.color||'#A855F7',icon:selectedClass?.icon||'⚡',soft:true,\n    });",
  "    const abilityEvent={\n      id:nowId('ability'),type:'ability',text:ability.name||ability.nome||'Habilidade',ts:Date.now(),\n      color:selectedClass?.color||'#A855F7',icon:selectedClass?.icon||'⚡',soft:true,\n    };\n    await Promise.all([\n      setDoc(doc(db,'config','cosmic_event'),abilityEvent),\n      setDoc(doc(db,'cosmic_events',abilityEvent.id),abilityEvent),\n    ]);",
  'broadcast durável da animação de habilidade'
);

fs.writeFileSync(experienceFile, experience);

const cssFile = path.join(process.cwd(), 'src', 'experience', 'experience.css');
let css = fs.readFileSync(cssFile, 'utf8');
if (!css.includes('/* HUD TODAS AS HABILIDADES */')) {
  css += `\n/* HUD TODAS AS HABILIDADES */\n.hud-abilities .hud-ability.locked{opacity:.42;filter:saturate(.45)}\n.hud-abilities .hud-ability.locked small{color:#776a80}\n`;
  fs.writeFileSync(cssFile, css);
}

for (const marker of ['classSpecials=', 'campaignAbilities=', "_locked", "cosmic_events',abilityEvent.id", 'abilityRailRef']) {
  if (!experience.includes(marker)) throw new Error(`Validação ausente: ${marker}`);
}

console.log('Dinastia E: HUD exibe todas as habilidades da ficha e animação de uso publica no feed durável.');
