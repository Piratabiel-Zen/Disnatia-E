import fs from 'node:fs';

const componentPath='src/features/sheets/SheetComponents.jsx';
const source=fs.readFileSync('App.jsx','utf8');
let component=fs.readFileSync(componentPath,'utf8');
const defined=/\bfunction FamiliaresPanel\s*\(/.test(component);
if(!defined){
  const familyStart=source.indexOf('const FAMILIAR_TYPES = [');
  const panelStart=source.indexOf('function FamiliaresPanel(',familyStart);
  const familyEnd=source.indexOf('\nconst newSheet',panelStart);
  if(familyStart<0||panelStart<0||familyEnd<0)throw new Error('Fonte de FamiliaresPanel ausente no App.jsx.');
  const helpers=component.includes('const FAMILIAR_TYPES')?'':source.slice(familyStart,panelStart);
  const panel=source.slice(panelStart,familyEnd);
  const exportIndex=component.lastIndexOf('\nexport {');
  component=exportIndex>=0
    ?component.slice(0,exportIndex)+'\n'+helpers+panel+component.slice(exportIndex)
    :component+'\n'+helpers+panel+'\n';
  fs.writeFileSync(componentPath,component);
}
if(!/\bfunction FamiliaresPanel\s*\(/.test(component))throw new Error('FamiliaresPanel não chegou ao módulo final das fichas.');
if(!component.includes('const FAMILIAR_TYPES')||!component.includes('const newFamiliar'))throw new Error('Dados do painel de familiares incompletos.');
console.log('Painel de familiares presente no módulo final das fichas.');
