import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const appFile=path.join(root,'src','App.generated.jsx');
const expFile=path.join(root,'src','experience','ExperienceKit.generated.jsx');
const must=(ok,msg)=>{if(!ok)throw new Error(`Desktop nav fix: ${msg}`)};
for(const f of [appFile,expFile]) must(fs.existsSync(f),`arquivo ausente: ${path.relative(root,f)}`);

let app=fs.readFileSync(appFile,'utf8');
let exp=fs.readFileSync(expFile,'utf8');

// Corrige somente o desktop. O mobile fica exatamente como os patches anteriores
// deixaram: navegação restrita e hub próprio.
if(!app.includes('DESKTOP NAV MASTER ROLE 2026-09-11')){
  const navRe=/<ImmersiveNavigation\b[^>]*\/>/;
  const match=app.match(navRe);
  must(match,'chamada ImmersiveNavigation não encontrada');
  let call=match[0];
  if(!/\bmasterMode=/.test(call)) call=call.replace('/>',' masterMode={masterMode}/>');
  app=app.replace(match[0],`{/* DESKTOP NAV MASTER ROLE 2026-09-11 */}\n        ${call}`);
}

if(!exp.includes('DESKTOP FULL NAV 2026-09-11')){
  const sigRe=/export function ImmersiveNavigation\(\{([^}]*)\}\)\{/;
  const sigMatch=exp.match(sigRe);
  must(sigMatch,'assinatura ImmersiveNavigation não encontrada');
  const props=sigMatch[1].includes('masterMode')?sigMatch[1]:`${sigMatch[1].trimEnd()}, masterMode=false `;
  exp=exp.replace(sigMatch[0],`// DESKTOP FULL NAV 2026-09-11\nexport function ImmersiveNavigation({${props}}){`);

  const contextRe=/  const \{\s*combat\s*,\s*selectedSheet\s*\}=useExperience\(\);/;
  const contextMatch=exp.match(contextRe);
  must(contextMatch,'contexto da navegação não encontrado');
  exp=exp.replace(contextMatch[0],`${contextMatch[0]}\n  const desktopGroups = NAV_GROUPS.map(group=>({\n    ...group,\n    items:group.items.filter(item=>item.id!=='inimigos'||masterMode),\n  })).filter(group=>group.items.length);`);

  const asideStart=exp.indexOf('<aside className="grim-nav">');
  const mobileStart=exp.indexOf('<nav className="mobile-dock">');
  must(asideStart>=0&&mobileStart>asideStart,'blocos desktop/mobile não encontrados');

  let desktopSlice=exp.slice(asideStart,mobileStart);
  const hasFull=desktopSlice.includes('NAV_GROUPS.map(group=>');
  const hasFiltered=desktopSlice.includes('mobileAllowedGroups20260910.map(group=>');
  must(hasFull||hasFiltered,'render dos grupos desktop não encontrado');
  desktopSlice=desktopSlice.replace('mobileAllowedGroups20260910.map(group=>','desktopGroups.map(group=>');
  desktopSlice=desktopSlice.replace('NAV_GROUPS.map(group=>','desktopGroups.map(group=>');

  exp=exp.slice(0,asideStart)+desktopSlice+exp.slice(mobileStart);
}

must(app.includes('masterMode={masterMode}'),'masterMode não foi passado à navegação');
must(exp.includes('desktopGroups.map(group=>'),'desktop não usa grupos completos por perfil');
must(exp.includes("item.id!=='inimigos'||masterMode"),'regra da aba Inimigos ausente');
must(exp.includes("{id:'mapamundi',label:'Mapa Múndi'"),'Mapa Múndi ausente do NAV_GROUPS');
must(exp.includes("{id:'mapabatalha',label:'Mapa de Batalha'"),'Mapa de Batalha ausente do NAV_GROUPS');

fs.writeFileSync(appFile,app);
fs.writeFileSync(expFile,exp);
console.log('Dinastia E: desktop restaurado com Mapa Múndi e Mapa de Batalha; Inimigos visível somente ao Mestre; mobile preservado.');
