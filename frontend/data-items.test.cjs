'use strict';
const assert=require('node:assert/strict'),D=require('./data-items.js'),M=require('./data-mocks.js');
const mine=M.generate('rong'),other=M.generate('xu'),store={records:[...mine,...other]};
assert.equal(D.list(store,'rong').length,32);
for(const [i,stage] of D.statuses.entries())assert.equal(mine.filter(r=>D.status(r)===stage).length,[8,8,10,6][i]);
assert.equal(new Set([...mine,...other].map(r=>r.id)).size,64);
assert.equal(JSON.stringify(M.generate('rong')),JSON.stringify(mine));
assert.ok(D.drafts(mine,'code').every(r=>!r.competitionId||r.competitionId==='code'));
assert.ok(D.drafts(mine,'code').some(r=>!r.competitionId));
assert.equal(D.filter(mine,{competition:'code',stage:'已审核',submissionFormat:'harbor',search:'dependency_conflict'}).length,1);
assert.equal(D.filter(mine,{competition:'unbound'}).length,2);
const adopted=mine[11],snapshot=JSON.stringify(adopted.history);adopted.draftForm={...adopted.form,description:'changed'};
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
  if(r.form.submissionFormat==='harbor')assert.notEqual(r.history[0].form.attachments[0].archivePath,r.history[1].form.attachments[0].archivePath);
  assert.ok(r.history[0].at<r.history[1].at);
  assert.equal(r.form.attachments[0].id,r.history[1].form.attachments[0].id);
 }
}
const twice=M.generate('rong')[11],rounds=D.timeline(twice);assert.deepEqual(rounds.map(h=>h.revision),[2,1]);assert.equal(rounds[0].reviews.length,2);assert.equal(rounds[1].reviews[0].to,'需修改');
const pending=D.timeline(M.generate('rong')[5]);assert.equal(pending[0].reviews.length,0);assert.equal(pending[1].reviews[0].to,'需修改');
const sparse={revision:2,form:{name:'current'},createdAt:'2026-10-01',history:[{revision:1,form:{name:'original'}}],reviews:[{revision:1,note:'old'}]};assert.equal(D.timeline(sparse)[0].form.name,'current');assert.equal(D.timeline(sparse)[0].reviews.length,0);assert.equal(D.timeline(sparse)[1].form.name,'original');
const oldBundled={...M.generate('rong')[11],mockVersion:undefined};assert.equal(M.upgrade({records:[oldBundled]}).records[0].mockVersion,M.version);
const edited={...oldBundled,form:{...oldBundled.form,attachments:[{id:'actual',source:'file',category:'harbor',name:'mine.zip'}]}};assert.equal(M.upgrade({records:[edited]}).records[0],edited,'participant edits must not be replaced');
assert.equal(D.reviewInfo(M.generate('rong')[8]).score,87.5);assert.equal(D.reviewInfo(M.generate('rong')[7]).passed,false);assert.equal(D.reviewInfo(M.generate('rong')[7]).score,null);assert.equal(D.reviewInfo(M.generate('rong')[5]).score,null);for(const value of [undefined,null,'87.5',-1,NaN,Infinity])assert.equal(D.validScore(value),false);assert.equal(D.validScore(0),true);const zero=M.generate('rong')[8];zero.reviews.at(-1).score=0;assert.equal(D.reviewInfo(zero).score,0);const old=M.generate('rong')[8];old.revision=2;assert.equal(D.reviewInfo(old).score,null);const legacyScores={records:M.generate('rong')};delete legacyScores.records[8].reviews[0].score;assert.equal(M.upgradeScores(legacyScores,'rong'),true);assert.equal(legacyScores.records[8].reviews[0].score,87.5);assert.equal(M.upgradeScores(legacyScores,'rong'),false);const actual={...M.generate('rong')[8],mock:false};delete actual.reviews[0].score;assert.equal(M.upgradeScores({records:[actual]},'rong'),false);assert.equal(actual.reviews[0].score,undefined);

const repeated=M.generate('rong')[7];assert.equal(repeated.revision,2);assert.deepEqual(repeated.reviews.map(h=>h.to),['未通过','未通过']);assert.equal(repeated.history.length,2);assert.equal(D.reviewInfo(repeated).note,repeated.reviews[1].note);assert.equal(D.locked(repeated),true);const cached=structuredClone(repeated);cached.revision=1;cached.updatedAt=cached.reviews[0].at;cached.reviewNote=cached.reviews[0].note;cached.reviews=cached.reviews.slice(0,1);cached.history=cached.history.slice(0,1);cached.form=Object.fromEntries(Object.entries(cached.form).reverse());const originalForm=JSON.stringify(cached.form);const originalReview=JSON.stringify(cached.reviews[0]),originalSnapshot=JSON.stringify(cached.history[0]);assert.equal(M.upgradeReviewExample({records:[cached]},'rong'),true);assert.equal(cached.revision,2);assert.equal(JSON.stringify(cached.form),originalForm);assert.equal(JSON.stringify(cached.reviews[0]),originalReview);assert.equal(JSON.stringify(cached.history[0]),originalSnapshot);assert.equal(M.upgradeReviewExample({records:[cached]},'rong'),false);const editedCached=structuredClone(cached);editedCached.revision=1;editedCached.reviews=editedCached.reviews.slice(0,1);editedCached.history=editedCached.history.slice(0,1);editedCached.updatedAt=editedCached.reviews[0].at;editedCached.form.name='my_edited_task';assert.equal(M.upgradeReviewExample({records:[editedCached]},'rong'),false);

// Version groups retain scores and keep historical failures out of the current result.
const scoreTimeline=D.timeline(M.generate('rong')[11]);assert.equal(scoreTimeline[0].revision,2);assert.equal(scoreTimeline[0].reviews.at(-1).score,94.75);assert.equal(scoreTimeline[1].reviews[0].score,undefined);
const repeatedTimeline=D.timeline(M.generate('rong')[7]);assert.deepEqual(repeatedTimeline.map(v=>v.revision),[2,1]);assert.ok(repeatedTimeline.every(v=>v.reviews.length===1&&v.reviews[0].to==='未通过'));assert.notEqual(repeatedTimeline[0].reviews[0].note,repeatedTimeline[1].reviews[0].note);

// Both formats cover matching lifecycle states and have distinct complete snapshots.
const Submission=require('./submission-model.js');
for(const format of ['harbor','question']){
 const group=mine.filter(r=>r.form.submissionFormat===format);
 assert.equal(group.length,16);assert.equal(new Set(group.map(r=>r.mockScenario)).size,14);
 assert.ok(group.some(r=>!r.competitionId&&D.status(r)==='草稿'));
 assert.ok(group.some(r=>r.status==='终检中'));
 assert.ok(group.some(r=>r.revision===3&&D.reviewInfo(r).correction));
 assert.ok(group.some(r=>D.reviewInfo(r).score===0));
 assert.equal(D.filter(mine,{submissionFormat:format}).length,16);
 for(const r of group){
  if(format==='question'&&r.revision){
   assert.deepEqual(Submission.validate(r.form,new Map()),{},r.form.name);
   assert.ok(r.form.description.includes('目标：'));assert.ok(r.form.verification.includes('参考输出'));
   assert.ok(r.history.every(h=>h.form.submissionFormat==='question'));
  }
  if(format==='harbor')for(const f of [r.form,r.draftForm,...r.history.map(h=>h.form)].filter(Boolean))for(const a of f.attachments)assert.ok(require('node:fs').existsSync(require('node:path').join(__dirname,a.archivePath)),a.archivePath);
 }
}
const seedStore={records:[structuredClone(mine[1]),{id:'own',ownerId:'rong',form:{name:'user-draft'}}],workspaces:{keep:{form:{description:'unsaved'}}}};
seedStore.records[0].form.name='user-edited-example';const preserved=JSON.stringify(seedStore.records[0]),work=JSON.stringify(seedStore.workspaces);
assert.equal(M.ensureExamples(seedStore,'rong'),31);assert.equal(M.ensureExamples(seedStore,'rong'),0);assert.equal(seedStore.records.length,33);assert.equal(JSON.stringify(seedStore.records[0]),preserved);assert.equal(JSON.stringify(seedStore.workspaces),work);assert.equal(seedStore.records[1].form.name,'user-draft');
console.log('Dual example catalog: 16 scenarios per format, valid ALE content, real archives, zero scores, three-round corrections and non-destructive idempotent loading passed.');
