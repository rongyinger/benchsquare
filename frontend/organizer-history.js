(function(root){
  'use strict';
  const SubmissionModel=typeof module!=='undefined'&&module.exports?require('./submission-model.js'):root.SubmissionModel;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const statusMap={
    '审核中':'待初审','待审核':'待初审','已提交':'待初审','待初审':'待初审',
    '初审通过':'终检中','初审通过 · 终检中':'终检中','终检中':'终检中',
    '需补正':'需修改','需修改':'需修改',
    '审核通过':'已审核','审核通过 · 待录用':'已审核','通过待录用':'已审核','已审核':'已审核',
    '已录用':'已通过','录用':'已通过','已通过':'已通过',
    '审核不通过':'未通过','未通过':'未通过','草稿':'草稿'
  };
  const reviewTitles={'终检中':'初审通过 · 终检中','需修改':'需补正','已审核':'审核通过','已通过':'已录用','未通过':'审核不通过'};
  const canonical=value=>statusMap[String(value||'').trim()]||String(value||'').trim();
  const clock=value=>{const n=typeof value==='number'?value:Date.parse(value);return Number.isFinite(n)?n:-Infinity;};
  const latest=values=>values.filter(Boolean).sort((a,b)=>clock(b)-clock(a))[0]||null;
  const scope=(task,data={})=>[data.ownerId||data.event?.ownerId||'',data.event?.id||task.competitionId||task.eventId||'organizer-mock-event',task.id||''].map(encodeURIComponent).join('/');
  function hash(value){let n=2166136261;for(const c of String(value)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return (n>>>0).toString(16);}
  function memberOwner(task,data={}){
    if(task.ownerId||task.submitterId)return task.ownerId||task.submitterId;
    const team=data.teams?.find(t=>t.id===task.teamId);
    return team?.members?.find(m=>m.name===task.submitter)?.id||task.submitter||'';
  }
  function snapshots(task){
    const rows=new Map();
    for(const value of task.versions||[]){
      const revision=Number(value.revision);
      if(Number.isInteger(revision)&&revision>0)rows.set(revision,value);
    }
    const revision=Number(task.revision);
    if(Number.isInteger(revision)&&revision>0&&!rows.has(revision))rows.set(revision,{revision,submittedAt:task.submittedAt,submitter:task.submitter,
      ...(task.file?{file:task.file}:{}),...(task.content?{content:task.content}:{}),...(task.form?{form:task.form}:{})});
    return [...rows.values()].sort((a,b)=>a.revision-b.revision);
  }
  function formOf(task,version){
    const saved=version.form?clone(version.form):null;
    const type=saved?.submissionFormat||version.submissionFormat||version.type||
      (version.file?'harbor':version.content?'question':saved?SubmissionModel.format(saved):task.submissionFormat||task.type)||'harbor';
    const form={name:version.title||task.title||task.id,...saved,submissionFormat:type==='ale'?'question':type};
    if(form.submissionFormat==='harbor'&&version.file){
      const f=version.file,name=f.name||'Harbor 任务包';
      form.attachments=[{id:task.id+'-v'+version.revision,category:'harbor',name,size:f.size||0,source:'mock',
        ...(f.archivePath?{archivePath:f.archivePath}:{}),type:/\.zip$/i.test(name)?'application/zip':'application/gzip'}];
    }else if(form.submissionFormat==='question'){
      const c=version.content||{};
      for(const field of ['description','input','expected','verification'])form[field]=c[field]??form[field]??'';
      if(Array.isArray(c.attachments))form.attachments=clone(c.attachments);
    }
    return SubmissionModel.normalize(form);
  }
  function reviewsOf(task,versions){
    const existing=new Set(versions.map(v=>Number(v.revision))),found=new Map(),evidenceSeen=new Set();
    for(const version of versions){
      const source=Array.isArray(version.reviews)?version.reviews:version.review?[version.review]:[];
      for(const item of source){
        if(!item||typeof item!=='object')continue;
        const revision=Number(item.revision??version.revision),to=canonical(item.to||item.status);
        if(!existing.has(revision)||!to||['待初审','草稿','提交审核'].includes(to))continue;
        const normalized={revision,to,note:item.note||'',at:item.at||null,by:item.by||item.reviewer||'',
          ...(item.from?{from:canonical(item.from)}:{}),...(item.score!==undefined?{score:item.score}:{}),
          ...(item.simulated!==undefined?{simulated:item.simulated}:{}),...(item.id?{id:item.id}:{})};
        const evidence=JSON.stringify([revision,to,normalized.note,normalized.at,normalized.by,normalized.from||'',normalized.score??null]);
        const identity=item.id?'id:'+revision+':'+item.id:'evidence:'+evidence;
        // An explicit node id is stable; otherwise identical recorded evidence is one node.
        if(!found.has(identity)&&!evidenceSeen.has(evidence)){
          found.set(identity,{...normalized,_evidence:evidence,_identity:identity,_sequence:found.size});
          evidenceSeen.add(evidence);
        }
      }
    }
    return [...found.values()].sort((a,b)=>clock(a.at)-clock(b.at)||a.revision-b.revision||a._sequence-b._sequence);
  }
  function toRecord(task,data={}){
    if(!task||!task.id)throw Error('未找到任务记录。');
    if(!inScope(task,data))throw Error('任务不属于当前赛事或主办方。');
    const versions=snapshots(task),revision=Number(task.revision)||Number(versions.at(-1)?.revision)||0;
    const current=versions.find(v=>Number(v.revision)===revision)||versions.at(-1)||{revision};
    const reviews=reviewsOf(task,versions).map(({_evidence,_identity,_sequence,...r})=>r);
    const currentReviews=reviews.filter(r=>r.revision===revision),status=canonical(task.status||currentReviews.at(-1)?.to||current.review?.status||'待初审');
    const ownerId=memberOwner(task,data),history=versions.map(v=>({revision:Number(v.revision),form:formOf(task,v),
      at:v.submittedAt||v.at||(Number(v.revision)===revision?task.submittedAt:null)||null,
      by:v.submitter||v.by||task.submitter||ownerId,number:v.number||task.id+'-V'+v.revision}));
    const submittedAt=history.find(h=>h.revision===revision)?.at||task.submittedAt||null;
    return {id:task.id,scopeId:scope(task,data),sourceTaskId:task.id,ownerId,
      competitionId:data.event?.id||task.competitionId||task.eventId||'organizer-mock-event',teamId:task.teamId,
      form:formOf(task,current),revision,status,number:task.number||current.number||task.id+'-V'+revision,
      createdAt:history[0]?.at||task.createdAt||submittedAt,submittedAt,
      updatedAt:latest([task.updatedAt,submittedAt,...reviews.map(r=>r.at)]),history,reviews,
      reviewOutcome:({'需修改':'需补正','未通过':'审核不通过','已审核':'审核通过 · 待录用','已通过':'已录用'})[status]||'',
      reviewNote:currentReviews.at(-1)?.note||'',mock:true};
  }
  function inScope(row,data){
    const event=row.competitionId||row.eventId,owner=row.eventOwnerId||row.organizerId;
    return (!event||!data.event?.id||event===data.event.id)&&(!owner||!data.ownerId||owner===data.ownerId);
  }
  function teamEvents(data,teamId){
    if(!data||!data.teams?.some(t=>t.id===teamId))return [];
    const events=new Map(),context=[data.ownerId||'',data.event?.id||'',teamId].map(encodeURIComponent).join('/');
    const tasks=(data.tasks||[]).filter(t=>t.teamId===teamId&&inScope(t,data));
    const add=(id,value)=>{if(!events.has(id))events.set(id,{id,...value});};
    for(const task of tasks){
      const versions=snapshots(task),record=toRecord(task,data);
      for(const version of record.history){
        add(context+'/task/'+encodeURIComponent(task.id)+'/v'+version.revision+'/submit',{
          type:'submission',taskId:task.id,revision:version.revision,title:version.revision===1?'首次提交':'补正重提',
          taskTitle:version.form.name,actor:version.by||'',at:version.at,note:'正式提交 v'+version.revision+'，已保存该版本材料快照。',targetStatus:'待初审',_sequence:0});
      }
      for(const review of reviewsOf(task,versions)){
        const id=context+'/task/'+encodeURIComponent(task.id)+'/v'+review.revision+'/review/'+(review.id?encodeURIComponent(review.id):hash(review._evidence));
        add(id,{type:'review',taskId:task.id,revision:review.revision,title:reviewTitles[review.to]||review.to,
          taskTitle:task.title||task.id,actor:review.by,at:review.at,note:review.note,targetStatus:review.to,_sequence:review._sequence});
      }
    }
    const taskIds=new Set(tasks.map(t=>t.id)),anomalyIds=new Set((data.anomalies||[]).filter(a=>a.teamIds?.includes(teamId)).map(a=>a.id));
    for(const entry of data.logs||[]){
      if(!inScope(entry,data)||!(entry.teamId===teamId||taskIds.has(entry.taskId)||anomalyIds.has(entry.anomalyId)))continue;
      const evidence=JSON.stringify([entry.action,entry.teamId,entry.anomalyId,entry.taskId,entry.revision,entry.actor,entry.at,entry.reason||entry.note]);
      add(context+'/management/'+(entry.id?encodeURIComponent(entry.id):hash(evidence)),{
        type:'management',title:entry.action||'管理操作',actor:entry.actor||entry.by||'',at:entry.at||null,
        note:entry.reason||entry.note||'',...(entry.taskId?{taskId:entry.taskId}:{}),...(entry.revision?{revision:entry.revision}:{}),
        ...(entry.targetStatus?{targetStatus:entry.targetStatus}:{}),_sequence:0});
    }
    const priority={review:0,submission:1,management:2};
    return [...events.values()].sort((a,b)=>clock(b.at)-clock(a.at)||priority[a.type]-priority[b.type]||String(a.taskId||'').localeCompare(String(b.taskId||''))||
      (b.revision||0)-(a.revision||0)||b._sequence-a._sequence||a.id.localeCompare(b.id)).map(({_sequence,...e})=>e);
  }
  const api={toRecord,teamEvents};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OrganizerHistory=api;
})(typeof globalThis!=='undefined'?globalThis:this);
