'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const M=require('./organizer-mocks.js');
const now=Date.UTC(2026,10,18,8),data=M.generate('rong',now),before=JSON.stringify(data);

assert.deepEqual(M.stats(data),{teams:8,submittedTeams:6,anomalyTeams:2,blacklistedTeams:1});
assert.equal(data.tasks.length,16);
assert.deepEqual(M.teamSummary(data,'T-001'),{taskCount:4,passedCount:2,anomalyCount:1,lastSubmittedAt:new Date(now-0.5*3600000).toISOString()});
assert.equal(M.teamSummary(data,'T-003').taskCount,0);
assert.equal(M.teamSummary(data,'T-003').lastSubmittedAt,null);
assert.equal(data.tasks.find(t=>t.id==='Task-021').versions.length,2);
const duplicated={...data,tasks:[...data.tasks,data.tasks.find(t=>t.id==='Task-021')]};
assert.equal(M.teamSummary(duplicated,'T-001').taskCount,4,'one Task counts once even with multiple versions or repeated rows');
assert.deepEqual(M.stats(duplicated),M.stats(data));

const blocked=M.setBlocked(data,'T-001',true,'  重复材料核查中  ','rong',now);
assert.equal(JSON.stringify(data),before,'blocking must not mutate the prior store');
assert.equal(blocked.teams[0].blacklistReason,'重复材料核查中');
assert.equal(M.stats(blocked).blacklistedTeams,2);
assert.equal(blocked.logs.length,data.logs.length+1);
assert.match(M.submissionPermission(blocked,'T-001'),/重复材料核查中/);
assert.match(M.submissionPermission(blocked,'T-001','closed'),/限制提交/,'blacklist reason takes precedence over a closed phase');
for(const member of blocked.teams[0].members)assert.ok(M.submissionPermission(blocked,'T-001'),member.name+' must share the team restriction');
assert.equal(M.submissionPermission(blocked,'T-002'),'','other teams keep their own eligibility');
assert.deepEqual(blocked.tasks,data.tasks,'blocking preserves tasks, reviews and historical versions');
assert.deepEqual(blocked.anomalies,data.anomalies,'blocking does not resolve anomalies');
assert.throws(()=>M.setBlocked(blocked,'T-001',true,'重复点击','rong',now),/已被拉黑/);
assert.throws(()=>M.setBlocked(data,'T-001',true,'  ','rong',now),/1～200/);
assert.throws(()=>M.setBlocked(data,'T-001',true,'长'.repeat(201),'rong',now),/1～200/);
assert.equal(JSON.stringify(data),before,'invalid mutations leave data untouched');
assert.throws(()=>M.setBlocked(data,'T-001',true,'核查','chen',now),/创建者/);

const unblocked=M.setBlocked(blocked,'T-001',false,'核查完成，恢复提交','rong',now+60000);
assert.equal(M.submissionPermission(unblocked,'T-001'),'');
assert.match(M.submissionPermission(unblocked,'T-001','closed'),/窗口已结束/,'unblocking does not extend a deadline');
assert.equal(unblocked.teams[0].blockedAt,null);
assert.equal(unblocked.logs.at(-1).action,'解除拉黑');
assert.equal(unblocked.anomalies[0].status,'待处理','unblocking does not automatically handle an anomaly');

const resolved=M.resolveAnomaly(blocked,'A-001','排除异常','核查为授权共用的示例材料。','rong',now+120000);
assert.equal(M.stats(resolved).anomalyTeams,0,'a shared anomaly resolves for both linked teams');
assert.equal(resolved.teams[0].blacklisted,true,'resolving an anomaly does not unblock the team');
assert.deepEqual(resolved.tasks,blocked.tasks,'anomaly handling does not alter review results');
assert.equal(blocked.anomalies[0].status,'待处理');
assert.throws(()=>M.resolveAnomaly(data,'A-001','排除异常','  ','rong',now),/处理说明/);
assert.throws(()=>M.resolveAnomaly(resolved,'A-001','排除异常','重复处理','rong',now),/已处理/);
assert.throws(()=>M.resolveAnomaly(data,'A-001','排除异常','完成','chen',now),/创建者/);

const other=M.generate('chen',now);
assert.equal(other.ownerId,'chen');
assert.equal(data.ownerId,'rong');
assert.notEqual(other.teams,data.teams);
other.teams[0].name='另一份演示';
assert.equal(data.teams[0].name,'极光数据队','owner-scoped fixtures do not share mutable objects');
assert.throws(()=>M.setBlocked(other,'T-001',true,'核查','rong',now),/创建者/);

for(const task of data.tasks)for(const v of task.versions){
  assert.equal(v.revision>=1,true);
  assert.ok(v.review.status&&v.review.note);
  if(task.type==='harbor'){
    const file=path.join(__dirname,v.file.archivePath),bytes=fs.readFileSync(file);
    assert.equal(bytes.length,v.file.size,'download size matches the actual fixture');
    assert.equal(bytes.readUInt32LE(0),0x04034b50,'download points to a real ZIP');
  }else assert.ok(v.content.description&&v.content.input&&v.content.expected&&v.content.verification);
}
const hashOf=id=>{
  const t=data.tasks.find(t=>t.id===id),file=t.versions.at(-1).file;
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,file.archivePath))).digest('hex');
};
assert.equal(hashOf('Task-021'),hashOf('Task-030'));
assert.ok(data.anomalies[0].evidence.includes(hashOf('Task-021')),'duplicate evidence describes the actual downloads');
assert.equal(JSON.stringify(data),before);

// Publishing state and the live event phase are separate concepts.
const events=M.listEvents('rong',now);
assert.equal(events.length,8);
assert.equal(new Set(events.map(e=>e.id)).size,8);
assert.deepEqual(events.map(e=>e.stage),['已发布','已发布','已发布','已发布','已发布','审核中','待付款','草稿']);
assert.deepEqual(events.map(e=>M.lifecycle(e,now)),['进行中','报名中','待开赛','审核补正中','已结束','未上线','未上线','未上线']);
assert.deepEqual(events.map(e=>M.submissionPhase(e,now)),['open','before','before','correction','closed','before','before','before']);
assert.ok(Date.parse(events.find(e=>e.id==='od-medical').paymentDeadline)>now);
assert.equal(data.event.title,'专业评测任务挑战赛');
assert.equal(data.event.stage,'已发布');
for(const event of events){
  assert.equal(event.ownerId,'rong');
  assert.equal(event.demo,true);
  const v=event.values;
  assert.ok(Date.parse(v.registrationStart)<Date.parse(v.registrationEnd));
  assert.ok(Date.parse(v.registrationEnd)<=Date.parse(v.submissionStart));
  assert.ok(Date.parse(v.submissionStart)<Date.parse(v.submissionEnd));
  assert.ok(Date.parse(v.submissionEnd)<Date.parse(v.correctionEnd));
  assert.ok(Date.parse(v.correctionEnd)<Date.parse(v.publicationAt));
}
const active=events[0],v=active.values;
for(const [at,label] of [
  [Date.parse(v.registrationStart)-1,'未开始'],[Date.parse(v.registrationStart),'报名中'],
  [Date.parse(v.registrationEnd),'待开赛'],[Date.parse(v.submissionStart),'进行中'],
  [Date.parse(v.submissionEnd),'审核补正中'],[Date.parse(v.correctionEnd),'待公示'],[Date.parse(v.publicationAt),'已结束']
])assert.equal(M.lifecycle(active,at),label,'phase transition must use the exact boundary');
assert.equal(M.lifecycle({...active,values:{...v,publicationAt:''}},Date.parse(v.correctionEnd)+1),'待公示','a missing publication date must not invent a completed event');
assert.equal(M.submissionPhase(active,Date.parse(v.submissionStart)-1),'before');
assert.equal(M.submissionPhase(active,Date.parse(v.submissionStart)),'open');
assert.equal(M.submissionPhase(active,Date.parse(v.submissionEnd)),'correction');
assert.equal(M.submissionPhase(active,Date.parse(v.correctionEnd)),'closed');
assert.match(M.submissionPermission(data,'T-001','before'),/尚未开始/);
assert.equal(M.submissionPermission(data,'T-001','correction'),'','the caller still decides whether this is a permitted correction, not a new Task');

const expectedCounts=[[8,16],[5,0],[4,0],[6,12],[7,14],[0,0],[0,0],[0,0]];
const generated=events.map(e=>M.generate('rong',now,e.id));
for(let i=0;i<generated.length;i++){
  const current=generated[i],event=current.event;
  assert.deepEqual([current.teams.length,current.tasks.length],expectedCounts[i]);
  assert.equal(event.id,events[i].id);
  assert.equal(new Set(current.tasks.map(t=>t.id)).size,current.tasks.length);
  for(const team of current.teams){
    assert.ok(Date.parse(team.registeredAt)>=Date.parse(event.values.registrationStart));
    assert.ok(Date.parse(team.registeredAt)<=Math.min(now,Date.parse(event.values.registrationEnd)));
  }
  for(const task of current.tasks){
    assert.ok(current.teams.some(t=>t.id===task.teamId));
    assert.equal(task.submittedAt,task.versions.at(-1).submittedAt);
    for(const snapshot of task.versions){
      assert.ok(Date.parse(snapshot.submittedAt)>=Date.parse(event.values.submissionStart));
      assert.ok(Date.parse(snapshot.submittedAt)<Date.parse(event.values.correctionEnd));
      assert.ok(Date.parse(snapshot.submittedAt)<=now,'formal submissions cannot come from the future');
      assert.ok(Date.parse(snapshot.review.at)<=now,'review results cannot come from the future');
    }
  }
  if(!current.tasks.length){
    assert.equal(current.anomalies.length,0);
    assert.equal(M.stats(current).blacklistedTeams,0);
  }
}
assert.ok(generated[3].tasks.some(t=>Date.parse(t.submittedAt)>=Date.parse(generated[3].event.values.submissionEnd)),'the correction-phase example includes a genuine correction version');
assert.ok(generated[4].tasks.every(t=>['审核通过','已录用','审核不通过'].includes(t.status)),'completed event examples have settled review outcomes');
const changedScience=M.setBlocked(generated[3],'T-001',true,'核查科学推理材料','rong',now);
assert.equal(changedScience.teams[0].blacklisted,true);
assert.equal(generated[3].teams[0].blacklisted,false);
assert.equal(generated[4].teams[0].blacklisted,false,'identical team identifiers in another event remain independent');
assert.throws(()=>M.generate('rong',now,'not-an-event'),/赛事不存在/);
assert.throws(()=>M.listEvents('',now),/演示身份/);
assert.equal(M.listEvents('chen',now)[0].ownerId,'chen');
// The full approval process is a declared fixture for just the default Task-081 v2.
const processTask=data.tasks.find(t=>t.id==='Task-081'),currentProcess=processTask.versions.find(v=>v.revision===2);
assert.equal(currentProcess.processMock,true);
assert.deepEqual(currentProcess.reviews.map(r=>r.status),['终检中','已录用']);
assert.equal(currentProcess.reviews[0].at,new Date(Date.parse(currentProcess.submittedAt)+60000).toISOString());
assert.equal(currentProcess.reviews[0].simulated,true);
assert.deepEqual(currentProcess.reviews[1],currentProcess.review,'the recorded final review remains unchanged');
assert.ok(data.tasks.filter(t=>t.id!=='Task-081').every(t=>t.versions.every(v=>!Object.hasOwn(v,'reviews'))),'pending and unrelated tasks are not given invented approval nodes');
for(const current of generated.slice(1))assert.ok(current.tasks.every(t=>t.versions.every(v=>!Object.hasOwn(v,'reviews')&&!v.processMock)),'a process from the default event cannot leak into differently timed event fixtures');

const legacy=JSON.parse(JSON.stringify(data));
const legacyVersion=legacy.tasks.find(t=>t.id==='Task-081').versions.find(v=>v.revision===2);
delete legacyVersion.reviews;delete legacyVersion.processMock;
legacy.logs.push({id:'manual',action:'人工核查备注',actor:'rong',at:new Date(now).toISOString(),reason:'保留操作历史'});
const legacyBefore=JSON.stringify(legacy),upgraded=M.upgradeProcess(legacy);
assert.notEqual(upgraded,legacy);
assert.equal(JSON.stringify(legacy),legacyBefore,'process migration never mutates an old cache');
assert.equal(upgraded.tasks.length,legacy.tasks.length);
assert.deepEqual(upgraded.logs,legacy.logs,'manual management logs are retained');
assert.deepEqual(upgraded.tasks.find(t=>t.id==='Task-081').versions[1].review,legacyVersion.review);
assert.equal(M.upgradeProcess(upgraded),upgraded,'process migration is idempotent');
assert.equal(M.upgradeProcess(data),data,'an already upgraded current seed is returned unchanged');
const changes=[
  t=>t.title='用户自行修改的任务名称',
  t=>t.status='审核不通过',
  t=>t.versions[1].file.name='changed.zip',
  t=>t.versions[1].file.size++,
  t=>t.versions[1].review.note='用户已更新评审意见',
  t=>t.versions[1].review.reviewer='另一位评审',
  t=>t.versions[1].review.at=new Date(now).toISOString(),
  t=>t.versions[1].review.status='审核通过',
  t=>t.versions[1].submittedAt=new Date(now).toISOString(),
  t=>t.versions[0].file.archivePath='user-material.zip',
  t=>t.versions[1].reviews=[]
];
for(const change of changes){
  const edited=JSON.parse(legacyBefore);change(edited.tasks.find(t=>t.id==='Task-081'));
  const original=JSON.stringify(edited);
  assert.equal(M.upgradeProcess(edited),edited,'edited task evidence must not be replaced by a bundled process');
  assert.equal(JSON.stringify(edited),original);
}
assert.equal(M.upgradeProcess(generated[3]),generated[3]);
assert.equal(M.upgradeProcess(generated[4]),generated[4]);
console.log('Organizer mocks passed: eight independent events, exact phase boundaries, downloads, owner isolation, restrictions and a strictly scoped, idempotent approval-process migration.');
