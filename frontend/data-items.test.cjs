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
assert.equal(D.status(adopted),'已录用');assert.equal(D.locked(adopted),true);assert.equal(D.form(adopted),adopted.form);assert.ok(!D.drafts([adopted],adopted.competitionId).length);assert.equal(JSON.stringify(adopted.history),snapshot);assert.equal(adopted.reviews.length,2);
assert.deepEqual(mine[0].form.attachments.map(a=>a.category),['input','reference']);assert.ok(!('model' in mine[0].form));assert.ok(mine[0].form.attachments[0].content.includes('\nid,value\n'));
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
