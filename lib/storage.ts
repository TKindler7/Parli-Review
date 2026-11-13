import type { Round } from './debate';
let connection:Promise<IDBDatabase>|undefined;
function db(){return connection??=new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open('parli-review-v1',1);req.onupgradeneeded=()=>{req.result.createObjectStore('rounds',{keyPath:'id'});req.result.createObjectStore('chunks',{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>{connection=undefined;reject(new Error('Browser storage is unavailable. Allow site storage to save rounds.'));};});}
async function operation<T>(store:string,mode:IDBTransactionMode,fn:(s:IDBObjectStore)=>IDBRequest):Promise<T>{const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(store,mode);const req=fn(tx.objectStore(store));tx.oncomplete=()=>resolve(req.result as T);tx.onabort=tx.onerror=()=>reject(new Error('Could not save to this browser. Storage may be full; export existing reports and free space.'));});}
export async function allRounds(){const list=await operation<Round[]>('rounds','readonly',s=>s.getAll());for(const r of list){let expired=false;r.assets=r.assets.map(a=>{if(a.blob&&Date.now()-a.created>30*86400000){expired=true;const {blob:_,...rest}=a;return rest;}return a;});if(expired)await putRound(r);}return list.sort((a,b)=>b.created.localeCompare(a.created));}
export const putRound=(r:Round)=>operation('rounds','readwrite',s=>s.put(r));
export const deleteRound=(id:string)=>operation('rounds','readwrite',s=>s.delete(id));
export const saveChunk=(id:string,blob:Blob)=>operation('chunks','readwrite',s=>s.put({id,blob,created:Date.now()}));
export const getChunks=()=>operation<{id:string;blob:Blob;created:number}[]>('chunks','readonly',s=>s.getAll());
export const clearChunks=()=>operation('chunks','readwrite',s=>s.clear());
