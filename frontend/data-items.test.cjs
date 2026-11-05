'use strict';
const assert=require('node:assert/strict'),D=require('./data-items.js'),M=require('./data-mocks.js');
const mine=M.generate('rong'),other=M.generate('xu'),store={records:[...mine,...other]};
assert.equal(D.list(store,'rong').length,12);
for(const stage of D.statuses)assert.equal(mine.filter(r=>D.status(r)===stage).length,3);
assert.equal(new Set([...mine,...other].map(r=>r.id)).size,24);
assert.equal(JSON.stringify(M.generate('rong')),JSON.stringify(mine));
assert.ok(D.drafts(mine,'code').every(r=>!r.competitionId||r.competitionId==='code'));
assert.ok(D.drafts(mine,'code').some(r=>!r.competitionId));
assert.equal(D.filter(mine,{competition:'code',stage:'已审核',search:'dependency'}).length,1);
assert.equal(D.filter(mine,{competition:'unbound'}).length,1);
const adopted=mine.at(-1),snapshot=JSON.stringify(adopted.history);adopted.draftForm={...adopted.form,description:'changed'};
assert.equal(D.status(adopted),'已录用');assert.equal(D.locked(adopted),true);assert.equal(D.form(adopted),adopted.form);assert.ok(!D.drafts([adopted],adopted.competitionId).length);assert.equal(JSON.stringify(adopted.history),snapshot);assert.equal(adopted.reviews.length,3);
assert.deepEqual(mine[0].form.attachments.map(a=>a.category),['harbor']);assert.ok(!('model' in mine[0].form));assert.equal(mine[0].form.attachments[0].archive,true);assert.equal(mine[0].form.submissionFormat,'harbor');
for(const status of ['待初审','终检中','已审核','已通过','需修改','未通过']){
 const legacy={...M.generate('rong')[3],competitionId:undefined,status};
 const before=JSON.stringify(legacy);
 assert.equal(D.status(legacy),'草稿');
 assert.equal(D.result(legacy),'未关联比赛 · 关联后可提交');
 assert.equal(D.filter([legacy],{stage:'审核中'}).length,0);
 assert.equal(D.drafts([legacy],'code').length,1);
 assert.equal(JSON.stringify(legacy),before,'display compatibility preserves stored history and status');
}
for(const stage of ['待初审','终检中','已提交','待质检','已审核','已通过','已录用','未通过']){
 const record={...M.generate('rong')[8],status:stage,draftForm:{name:'stale working copy'}};
 assert.equal(D.locked(record),true,stage+' must be read-only');
 assert.equal(D.form(record),record.form,'read-only records show submitted content');
 assert.notEqual(D.status(record),'草稿');assert.equal(D.drafts([record],record.competitionId).length,0);
}
for(const record of [M.generate('rong')[0],M.generate('rong')[2],M.generate('rong')[6]])assert.equal(D.locked(record),false,'draft and explicit revision request stay editable');
const resubmitted=M.generate('rong')[5];assert.equal(resubmitted.reviews.at(-1).to,'需修改');assert.equal(D.locked(resubmitted),true,'feedback on an older revision must not unlock a submission under review');
console.log('Data items passed: ownership, four states, stable examples, draft eligibility, combined filters and frozen review history.');

assert.equal(D.label('已审核'),'审核结果');assert.equal(D.label(M.generate('rong')[6]),'审核结果');assert.equal(D.reviewInfo(M.generate('rong')[6]).correction,true);assert.equal(D.reviewInfo(M.generate('rong')[5]).note,'');assert.equal(D.reviewInfo(M.generate('rong')[5]).correction,false);assert.equal(D.reviewInfo(M.generate('rong')[7]).correction,false);

assert.equal(D.reviewLabel(M.generate('rong')[6]),'已审核 · 需补正');assert.equal(D.reviewLabel(M.generate('rong')[7]),'已审核 · 审核不通过');assert.equal(D.reviewLabel(M.generate('rong')[8]),'已审核 · 审核通过');

const oldExample={...mine[6],form:{name:'legacy-example',description:'old fields',attachments:[]},history:[{revision:1,form:{name:'legacy-example',description:'old snapshot',attachments:[]}}]};
const upgraded=M.upgrade({records:[oldExample]});assert.equal(upgraded.records[0].form.submissionFormat,'harbor');assert.equal(upgraded.records[0].history[0].form.attachments.length,1);assert.deepEqual(upgraded.records[0].reviews,oldExample.reviews);assert.equal(oldExample.form.description,'old fields');

for(const r of M.generate('rong')){
 const timeline=D.timeline(r);
 for(const version of timeline){
  assert.ok(version.reviews.every(review=>review.revision===version.revision));
  for(const review of version.reviews)assert.ok(review.at>version.at,'reviews follow their submission');
 }
 if(r.revision===2){
  assert.notEqual(r.history[0].form.attachments[0].name,r.history[1].form.attachments[0].name);
  assert.notEqual(r.history[0].form.attachments[0].archivePath,r.history[1].form.attachments[0].archivePath);
  assert.ok(r.history[0].at<r.history[1].at);
  assert.equal(r.form.attachments[0].id,r.history[1].form.attachments[0].id);
 }
}
const twice=M.generate('rong')[11],rounds=D.timeline(twice);assert.deepEqual(rounds.map(h=>h.revision),[2,1]);assert.equal(rounds[0].reviews.length,2);assert.equal(rounds[1].reviews[0].to,'需修改');
const pending=D.timeline(M.generate('rong')[5]);assert.equal(pending[0].reviews.length,0);assert.equal(pending[1].reviews[0].to,'需修改');
const sparse={revision:2,form:{name:'current'},createdAt:'2026-10-01',history:[{revision:1,form:{name:'original'}}],reviews:[{revision:1,note:'old'}]};assert.equal(D.timeline(sparse)[0].form.name,'current');assert.equal(D.timeline(sparse)[0].reviews.length,0);assert.equal(D.timeline(sparse)[1].form.name,'original');
const oldBundled={...M.generate('rong')[11],mockVersion:undefined};assert.equal(M.upgrade({records:[oldBundled]}).records[0].mockVersion,3);
const edited={...oldBundled,form:{...oldBundled.form,attachments:[{id:'actual',source:'file',category:'harbor',name:'mine.zip'}]}};assert.equal(M.upgrade({records:[edited]}).records[0],edited,'participant edits must not be replaced');
