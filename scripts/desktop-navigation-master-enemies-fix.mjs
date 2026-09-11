import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const appFile=path.join(root,'src','App.generated.jsx');
const expFile=path.join(root,'src','experience','ExperienceKit.generated.jsx');
const must=(ok,msg)=>{if(!ok)throw new Error(`Desktop nav fix: ${msg}`)};
for(const f of [appFile,expFile]) must(fs.existsSync(f),`arquivo ausente: ${path.relative(root,f)}`);

let app=fs.readFileSync(appFile,'utf8');
let exp=fs.readFileSync(expFile,'utf8');

// O desktop sempre usa a navegação completa. A única exceção de perfil é Inimigos,
// que fica visível apenas para o login do Mestre. As restrições mobile continuam
// sendo aplicadas separadamente pelos patches mobile anteriores.
if(!app.includes('DESKTOP NAV MASTER ROLE 2026-09-11')){
  const navCall='<ImmersiveNavigation tab={tab} onNavigate={navigate} accent={atm.accent}/>';
  must(app.includes(navCall),'chamada ImmersiveNavigation não encontrada');
  app=app.replace(navCall,`{/* DESKTOP NAV MASTER ROLE 2026-09-11 */}\n        <ImmersiveNavigation tab={tab} onNavigate={navigate} accent={atm.accent} masterMode={masterMode}/>`);
}

if(!exp.includes('DESKTOP FULL NAV 2026-09-11')){
  const sig="export function ImmersiveNavigation({ tab, onNavigate, accent='#A855F7' }){";
  must(exp.includes(sig),'assinatura ImmersiveNavigation não encontrada');
  exp=exp.replace(sig,"// DESKTOP FULL NAV 2026-09-11\nexport function ImmersiveNavigation({ tab, onNavigate, accent='#A855F7', masterMode=false }){");

  const contextAnchor='  const { combat, selectedSheet }=useExperience();';
  must(exp.includes(contextAnchor),'contexto da navegação não encontrado');
  exp=exp.replace(contextAnchor,`${contextAnchor}\n  const desktopGroups = NAV_GROUPS.map(group=>({\n    ...group,\n    items:group.items.filter(item=>item.id!=='inimigos'||masterMode),\n  })).filter(group=>group.items.length);`);

  const asideStart=exp.indexOf('<aside className="grim-nav">');
  const mobileStart=exp.indexOf('<nav className="mobile-dock">');
  must(asideStart>=0&&mobileStart>asideStart,'blocos desktop/mobile não encontrados');
  const desktopSlice=exp.slice(asideStart,mobileStart);
  must(desktopSlice.includes('NAV_GROUPS.map(group=>'),'render desktop já não usa NAV_GROUPS');
  const fixedDesktop=desktopSlice.replace('NAV_GROUPS.map(group=>','desktopGroups.map(group=>');
  exp=exp.slice(0,asideStart)+fixedDesktop+exp.slice(mobileStart);
}

must(app.includes('masterMode={masterMode}'),'masterMode não foi passado à navegação');
must(exp.includes('desktopGroups.map(group=>'),'desktop não usa grupos completos por perfil');
must(exp.includes("item.id!=='inimigos'||masterMode"),'regra da aba Inimigos ausente');
must(exp.includes("{id:'mapamundi',label:'Mapa Múndi'"),'Mapa Múndi ausente do NAV_GROUPS');
must(exp.includes("{id:'mapabatalha',label:'Mapa de Batalha'"),'Mapa de Batalha ausente do NAV_GROUPS');
must(exp.includes('mobileAllowedGroups20260910.map(group=>'),'filtro mobile foi perdido');

fs.writeFileSync(appFile,app);
fs.writeFileSync(expFile,exp);
console.log('Dinastia E: desktop restaurado com Mapa Múndi e Mapa de Batalha; Inimigos visível somente ao Mestre; mobile preservado.');
