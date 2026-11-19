'use strict';
const assert=require('node:assert/strict');
const M=require('./organizer-mocks.js'),H=require('./organizer-history.js'),D=require('./data-items.js');
const now=Date.UTC(2026,10,19,8),data=M.generate('rong',now),before=JSON.stringify(data);
const copy=value=>JSON.parse(JSON.stringify(value));

assert.equal(data.tasks.length,16);
for(const task of data.tasks){
  const record=H.toRecord(task,data),timeline=D.timeline(record);
  assert.equal(record.id,task.id);
  assert.equal(record.competitionId,data.event.id);
  assert.equal(record.teamId,task.teamId);
  assert.equal(record.revision,task.revision);
  assert.equal(timeline.length,task.versions.length);
  assert.equal(new Set(record.history.map(h=>h.revision)).size,record.history.length);
  assert.equal(record.history[0].at,task.versions[0].submittedAt);
  for(const version of task.versions){
    const snapshot=record.history.find(h=>h.revision===version.revision);
    assert.equal(snapshot.by,version.submitter);
    if(task.type==='harbor'){
      assert.equal(snapshot.form.attachments[0].archivePath,version.file.archivePath);
      assert.equal(snapshot.form.attachments[0].size,version.file.size);
      assert.equal(snapshot.form.attachments[0].source,'mock');
      assert.equal(snapshot.form.attachments[0].id,task.id+'-v'+version.revision);
    }else{
      for(const field of ['description','input','expected','verification'])assert.equal(snapshot.form[field],version.content[field]);
    }
  }
  if(task.status==='审核中')assert.equal(record.reviews.filter(r=>r.revision===record.revision).length,0,'a pending placeholder is not a recorded approval');
}

const pending=H.toRecord(data.tasks.find(t=>t.id==='Task-021'),data);
assert.equal(pending.status,'待初审');
assert.equal(D.status(pending),'审核中');
assert.equal(D.reviewInfo(pending).current,undefined);
assert.equal(D.reviewInfo(pending).correction,false,'the old correction must not unlock the current pending version');
assert.deepEqual(pending.reviews.map(r=>[r.revision,r.to]),[[1,'需修改']]);
assert.equal(D.timeline(pending)[0].reviews.length,0);
assert.equal(D.timeline(pending)[1].reviews[0].to,'需修改');
assert.notEqual(pending.form.attachments[0].archivePath,pending.history[0].form.attachments[0].archivePath);

const processTask=data.tasks.find(t=>t.id==='Task-081'),process=H.toRecord(processTask,data);
assert.deepEqual(process.reviews.map(r=>[r.revision,r.to]),[[1,'需修改'],[2,'终检中'],[2,'已通过']]);
assert.equal(D.timeline(process)[0].reviews.length,2,'all recorded review stages survive adaptation');
assert.equal(D.reviewInfo(process).outcome,'已录用');
const t1=H.teamEvents(data,'T-001');
assert.equal(t1.filter(e=>e.type==='submission').length,5,'four Tasks have five formal versions');
assert.equal(t1.filter(e=>e.type==='review').length,4);
assert.equal(t1.filter(e=>e.taskId==='Task-021'&&e.revision===2&&e.type==='review').length,0);
assert.equal(t1.find(e=>e.taskId==='Task-021'&&e.revision===2).title,'补正重提');
assert.ok(t1.every(e=>!e.taskId||data.tasks.some(t=>t.id===e.taskId&&t.teamId==='T-001')));
assert.equal(H.teamEvents(data,'T-004').filter(e=>e.type==='management').length,3);
assert.equal(H.teamEvents(data,'T-003').length,0);
assert.deepEqual(H.teamEvents(data,'unknown-team'),[]);

const repeated=copy(data);
repeated.tasks.push(copy(repeated.tasks[0]));
repeated.logs.push(copy(repeated.logs[0]));
repeated.tasks.find(t=>t.id==='Task-081').versions[1].reviews.push(copy(processTask.versions[1].reviews[0]));
assert.deepEqual(H.teamEvents(repeated,'T-001'),t1,'duplicated source records do not duplicate submissions or reviews');
assert.deepEqual(H.teamEvents(repeated,'T-004'),H.teamEvents(data,'T-004'));
assert.deepEqual(H.teamEvents(repeated,'T-008'),H.teamEvents(data,'T-008'),'the same review evidence is counted once');
assert.deepEqual(H.teamEvents(data,'T-008'),H.teamEvents(data,'T-008'),'repeated rendering has stable event ids and order');

const arrayVersion=copy(processTask);
arrayVersion.versions[1].reviews.push({...copy(arrayVersion.versions[1].reviews[0]),id:'different-id-same-evidence'});
arrayVersion.versions[1].review={status:'审核不通过',note:'old summary must lose to the explicit review array',at:new Date(now).toISOString(),reviewer:'not applicable'};
assert.deepEqual(H.toRecord(arrayVersion,data).reviews.map(r=>r.to),['需修改','终检中','已通过']);
const explicitEmpty=copy(processTask);
explicitEmpty.versions[1].reviews=[];
assert.equal(H.toRecord(explicitEmpty,data).reviews.filter(r=>r.revision===2).length,0,'an explicit empty array does not fall back to a stale single summary');

const movedOpinion=copy(data.tasks[0]);
movedOpinion.versions[1].reviews=[{revision:1,to:'需修改',note:'belongs to v1',at:movedOpinion.versions[0].review.at,by:'原评审'}];
assert.equal(H.toRecord(movedOpinion,data).reviews.filter(r=>r.revision===2).length,0,'explicit old-version review references stay on the old version');

const sameTime=copy(data),task=sameTime.tasks.find(t=>t.id==='Task-081');
task.versions[1].reviews.forEach(r=>r.at=task.versions[1].submittedAt);
const tied=H.teamEvents(sameTime,'T-008').filter(e=>e.taskId==='Task-081'&&e.revision===2);
assert.deepEqual(tied.map(e=>e.title),['已录用','初审通过 · 终检中','补正重提'],'equal timestamps retain recorded review order and place the triggering submission last');

const otherOwner=M.generate('chen',now),otherEvent=M.generate('rong',now,'od-science');
const ids=new Set(t1.map(e=>e.id));
assert.ok(H.teamEvents(otherOwner,'T-001').every(e=>!ids.has(e.id)));
assert.ok(H.teamEvents(otherEvent,'T-001').every(e=>!ids.has(e.id)));
assert.notEqual(H.toRecord(otherOwner.tasks[0],otherOwner).scopeId,pending.scopeId);
assert.notEqual(H.toRecord(otherEvent.tasks[0],otherEvent).competitionId,pending.competitionId);
const contaminated=copy(data);
contaminated.tasks.push({...copy(data.tasks[0]),id:'foreign-task',eventId:'od-science'});
contaminated.logs.push({id:'foreign-log',eventId:'od-science',teamId:'T-001',actor:'rong',at:new Date(now).toISOString(),action:'另一赛事操作'});
assert.deepEqual(H.teamEvents(contaminated,'T-001'),t1,'explicit foreign-event evidence is excluded');
assert.throws(()=>H.toRecord({...data.tasks[0],eventId:'od-science'},data),/不属于当前赛事/);
assert.equal(H.toRecord({...data.tasks[0],competitionId:'explicit-event'}).competitionId,'explicit-event','standalone adaptation accepts an explicitly supplied task scope');
assert.equal(JSON.stringify(data),before,'adapter and event aggregation never mutate source data');
console.log('Organizer history passed: formal snapshots, pending vs reviewed versions, complete review nodes, stable deduplication, event ownership and immutable source data.');
