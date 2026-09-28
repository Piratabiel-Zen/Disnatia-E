export const db={};
const rows=new Map([
  ['sheets/necro',{id:'necro',nome:'Necromante',classe:'magos',hp:40,vigos:8}],
  ['cronicas/1',{id:1,titulo:'A torre',sessao:'1',conteudo:'Uma história para verificar o leitor.',imagens:[]}],
  ['ovas/2',{id:2,titulo:'A jornada paralela',episodio:'2',conteudo:'Uma história paralela.',imagens:[]}],
]);
const listeners=new Set();
export const collection=(_db,name)=>name;
export const doc=(_db,...parts)=>parts.join('/');
export const where=(field,op,value)=>({field,value});
export const query=(ref,filter)=>({ref,filter});
function snap(ref){const name=typeof ref==='string'?ref:ref.ref;return {exists:()=>rows.has(name),data:()=>rows.get(name),metadata:{fromCache:false},docs:[...rows].filter(([key,row])=>key.startsWith(name+'/')&&(!ref.filter?.field||row[ref.filter.field]===ref.filter.value)).map(([key,row])=>({id:key.split('/')[1],data:()=>row}))};}
export function onSnapshot(ref,...args){const callback=args.find(value=>typeof value==='function');const fn=()=>callback(snap(ref));const listener={name:typeof ref==='string'?ref:ref.ref,fn};listeners.add(listener);queueMicrotask(fn);return()=>listeners.delete(listener);}
export const getDoc=async ref=>snap(ref);
export const updateDoc=setDoc;
export const serverTimestamp=()=>Date.now();
export const limit=()=>({});export const orderBy=()=>({});
export const runTransaction=async(_db,callback)=>callback({get:getDoc,set:setDoc});
export async function getDocs(ref){window.__reads=(window.__reads||[]).concat(typeof ref==='string'?ref:ref.ref);return snap(ref);}
function notify(key){listeners.forEach(({name,fn})=>{if(name===key||name===key.split('/')[0])queueMicrotask(fn);});}
export async function setDoc(key,data,options){rows.set(key,options?.merge?{...rows.get(key),...data}:data);window.__writes=(window.__writes||[]).concat(key);notify(key);}
export async function deleteDoc(key){rows.delete(key);notify(key);}
export function writeBatch(){const changes=[];return {set:(key,data)=>changes.push([key,data]),commit:async()=>{for(const [key,data] of changes)await setDoc(key,data);}};}
