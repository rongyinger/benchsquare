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
assert.equal(D.status(adopted),'草稿');assert.equal(JSON.stringify(adopted.history),snapshot);assert.equal(adopted.reviews.length,2);
assert.equal(JSON.parse(mine[0].form.attachments[2].content).mock,true);assert.ok(mine[0].form.attachments[0].content.includes('\nid,value\n'));
for(const status of ['待初审','终检中','已审核','已通过','需修改','未通过']){
 const legacy={...M.generate('rong')[3],competitionId:undefined,status};
 const before=JSON.stringify(legacy);
 assert.equal(D.status(legacy),'草稿');
 assert.equal(D.result(legacy),'未关联比赛 · 关联后可提交');
 assert.equal(D.filter([legacy],{stage:'待审核'}).length,0);
 assert.equal(D.drafts([legacy],'code').length,1);
 assert.equal(JSON.stringify(legacy),before,'display compatibility preserves stored history and status');
}
console.log('Data items passed: ownership, four states, stable examples, draft eligibility, combined filters and frozen review history.');
