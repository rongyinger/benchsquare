(() => {
  'use strict';let connection;
  function db(){return connection||=(new Promise((resolve,reject)=>{const r=indexedDB.open('benchsquare-data-files-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>{connection=null;reject(r.error);};}));}
  async function put(user,entries){if(!entries.length)return;const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('files','readwrite');for(const [id,file] of entries)t.objectStore('files').put(file,user+':'+id);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('文件保存失败'));});}
  async function get(user,id){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('files').objectStore('files').get(user+':'+id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function restore(user,attachments,map){for(const a of attachments){if(map.has(a.id))continue;if(a.source==='mock')map.set(a.id,new Blob([a.content||'Benchsquare 合成示例文件'],{type:a.type||'text/plain'}));else if(a.source==='file'){const file=await get(user,a.id);if(file)map.set(a.id,file);}}}
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
  window.DataFiles={put,get,restore,download};
})();
