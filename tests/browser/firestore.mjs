// Isolated browser fixture. Never connects to Firebase or campaign data.
export const db={};
const baseline=[
 ['sheets/necro',{id:'necro',nome:'Necromante',classe:'magos',nivel:10,hp:40,vigos:8}],
 ['cronicas/1',{id:1,titulo:'A torre',sessao:'1',conteudo:'Uma história para verificar o leitor.',imagens:[]}],
 ['ovas/2',{id:2,titulo:'A jornada paralela',episodio:'2',conteudo:'Uma história paralela.',imagens:[]}],
];
const rows=new Map(baseline),listeners=new Set();
const bus=new BroadcastChannel('dinastia-isolated-fixture');
const storageKey='dinastia-isolated-store';
function restore(){try{const saved=localStorage.getItem(storageKey);if(saved){rows.clear();JSON.parse(saved).forEach(([k,v])=>rows.set(k,v));}}catch{}}
restore();
function publish(key){try{localStorage.setItem(storageKey,JSON.stringify([...rows]));}catch{}notify(key);bus.postMessage(key);}
bus.onmessage=event=>{restore();notify(event.data)};
export const collection=(_db,name)=>name;
export const doc=(_db,...parts)=>parts.join('/');
export const where=(field,op,value)=>({field,value});
export const query=(ref,...filters)=>({ref,filters:filters.filter(filter=>filter?.field)});
function snap(ref){const name=typeof ref==='string'?ref:ref.ref;return {exists:()=>rows.has(name),data:()=>rows.get(name),metadata:{fromCache:false,hasPendingWrites:false},docs:[...rows].filter(([key,row])=>key.startsWith(name+'/')&&(ref.filters||[]).every(filter=>row[filter.field]===filter.value)).map(([key,row])=>({id:key.slice(name.length+1),data:()=>row,metadata:{fromCache:false,hasPendingWrites:false}}))};}
export function onSnapshot(ref,...args){const callback=args.find(value=>typeof value==='function');let previous=new Map();const fn=()=>{const snapshot=snap(ref);const next=new Map(snapshot.docs.map(d=>[d.id,JSON.stringify(d.data())]));snapshot.docChanges=()=>[...snapshot.docs.filter(d=>previous.get(d.id)!==next.get(d.id)).map(d=>({type:previous.has(d.id)?'modified':'added',doc:d})),...[...previous.keys()].filter(id=>!next.has(id)).map(id=>({type:'removed',doc:{id,data:()=>({})}}))];callback(snapshot);previous=next;};const listener={name:typeof ref==='string'?ref:ref.ref,fn};listeners.add(listener);queueMicrotask(fn);return()=>listeners.delete(listener);}
export const getDoc=async ref=>snap(ref);
export const getDocFromServer=getDoc;
export const updateDoc=setDoc;
export const serverTimestamp=()=>Date.now();
export const limit=()=>({});export const orderBy=()=>({});
export const runTransaction=async(_db,callback)=>navigator.locks.request('dinastia-fixture-transaction',async()=>{restore();const operations=[];const result=await callback({get:getDoc,set:(key,data,options)=>operations.push([key,data,options])});for(const args of operations)await setDoc(...args);return result;});
export async function getDocs(ref){window.__reads=(window.__reads||[]).concat(typeof ref==='string'?ref:ref.ref);return snap(ref);}
function notify(key){listeners.forEach(({name,fn})=>{if(name===key||name===key.split('/')[0])queueMicrotask(fn);});}
function merge(left,right){const next={...left};for(const [key,value] of Object.entries(right)){next[key]=value&&typeof value==='object'&&!Array.isArray(value)?merge(next[key]||{},value):value;}return next;}
export async function setDoc(key,data,options){return navigator.locks.request('dinastia-fixture-write',()=>{restore();rows.set(key,options?.merge?merge(rows.get(key)||{},data):data);window.__writes=(window.__writes||[]).concat(key);publish(key);});}
export async function deleteDoc(key){return navigator.locks.request('dinastia-fixture-write',()=>{restore();rows.delete(key);publish(key);});}
export function writeBatch(){const changes=[];return {set:(key,data)=>changes.push([key,data]),commit:async()=>{for(const [key,data] of changes)await setDoc(key,data);}};}
window.__testStore={set:(key,value)=>{rows.set(key,value);publish(key)},get:key=>rows.get(key)};
export const queryEqual=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const refEqual=(a,b)=>a===b;
