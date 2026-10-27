(function(root){
  'use strict';
  const key='benchsquare-submissions-v1',statuses=['草稿','待审核','已审核','已录用'];
  function owner(r,state={}){if(r.ownerId)return r.ownerId;const team=state.participation?.teams?.find(t=>t.id===r.teamId);const by=r.history?.[0]?.by||r.updatedBy;return by&&by!=='独立演示用户'?by:team?.leader||'rong';}
  function status(r){if(r.draftForm||r.status==='草稿')return '草稿';if(['已录用','已通过'].includes(r.status))return '已录用';if(['已审核','需修改','未通过'].includes(r.status))return '已审核';return '待审核';}
  const form=r=>r.draftForm||r.form;
  function read(){const s=JSON.parse(localStorage.getItem(key)||'{"version":1,"records":[],"work":null}');if(s.version!==1||!Array.isArray(s.records))throw Error('本地数据格式无法读取，请先保留原始数据。');return s;}
  function list(store,user,state){return store.records.filter(r=>owner(r,state)===user);}
  function filter(records,{search='',competition='',stage='',sort='updated'}={},competitions=[]){
    const q=search.trim().toLowerCase();return records.filter(r=>(!competition||(competition==='unbound'?!r.competitionId:r.competitionId===competition))&&(!stage||status(r)===stage)&&(!q||[form(r).name,form(r).domain,form(r).description,competitions.find(c=>c.id===r.competitionId)?.title].some(s=>String(s||'').toLowerCase().includes(q)))).sort((a,b)=>sort==='name'?String(form(a).name).localeCompare(String(form(b).name),'zh-CN'):String(sort==='created'?b.createdAt||b.history?.[0]?.at||b.updatedAt:b.updatedAt).localeCompare(String(sort==='created'?a.createdAt||a.history?.[0]?.at||a.updatedAt:a.updatedAt)));
  }
  function drafts(records,cid){return records.filter(r=>status(r)==='草稿'&&(!r.competitionId||r.competitionId===cid));}
  function result(r){const s=status(r);if(s==='草稿')return r.revision?'修改草稿 · 原提交与审核记录保留':'尚未提交';if(s==='待审核')return r.status==='终检中'?'初审通过 · 终检中':'等待人工审核';return r.reviewOutcome||({'已通过':'已录用','需修改':'需补正','未通过':'审核不通过'})[r.status]||'审核通过 · 待录用';}
  const api={key,statuses,owner,status,form,read,list,filter,drafts,result};if(typeof module!=='undefined')module.exports=api;else root.DataItems=api;
})(typeof window==='undefined'?globalThis:window);
