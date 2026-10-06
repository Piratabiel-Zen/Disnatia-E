// An enemy sheet is a reusable template. Health belongs to each map token.
export function hasIndividualHp(token){return !!token?.enemyId||token?.tipo==='inimigo';}
const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
export function enemyTokenVitals(token,template){
  const ownsHp=token.hpMode==='individual'||number(token.maxHp)>0;
  const maxHp=Math.max(0,ownsHp?number(token.maxHp):number(template?.maxHp));
  const hp=Math.max(0,Math.min(maxHp||Infinity,ownsHp?number(token.hp):number(template?.hp,number(token.hp))));
  return {kind:'individual',entity:null,hp,maxHp};
}
export function initializeEnemyToken(token,template){
  if(!hasIndividualHp(token)||token.hpMode==='individual'||!template)return token;
  const {hp,maxHp}=enemyTokenVitals(token,template);
  return {...token,hp,maxHp,hpMode:'individual'};
}
