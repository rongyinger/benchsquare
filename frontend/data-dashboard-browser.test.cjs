'use strict';
const assert=require('node:assert/strict');
const {chromium}=require(process.env.BENCHSQUARE_PLAYWRIGHT||'playwright');
(async()=>{
 const b=await chromium.launch({channel:'msedge',headless:true});
 try {
 const p=await b.newPage({viewport:{width:1600,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
 p.setDefaultTimeout(10000);const base=process.env.DEMO_BASE||'http://127.0.0.1:4173/frontend/';
 const read=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('benchsquare-submissions-v1')));
 const f=()=>p.frameLocator('iframe[title="比赛数据提交表单"]');
 const close=async()=>{await p.getByRole('button',{name:'关闭提交面板'}).click();await p.locator('.submission-overlay').waitFor({state:'detached'});};
 await p.goto(base+'#data-dashboard');await p.getByRole('button',{name:'查看示例',exact:true}).click();
 assert.deepEqual(await p.locator('.dd-metric strong').allTextContents(),['3','3','3','3']);
 await p.getByRole('button',{name:'查看示例',exact:true}).click();assert.equal((await read()).records.length,12);
 await p.getByRole('button',{name:'按状态',exact:true}).click();assert.equal(await p.locator('.dd-column').count(),4);
 await p.locator('#dd-search').fill('dependency_conflict');assert.equal(await p.locator('.dd-task-card').count(),1);assert.deepEqual(await p.locator('.dd-metric strong').allTextContents(),['3','3','3','3']);
 await p.getByRole('button',{name:'清除筛选',exact:true}).click();await p.getByRole('button',{name:'按比赛',exact:true}).click();
 const accepted=(await read()).records.find(r=>r.form.name==='thermal_boundary_accepted_03');const original=JSON.stringify(accepted.history);
 await p.locator('[data-data="edit"][data-id="'+accepted.id+'"]').click();await f().locator('#f-name').waitFor();await f().locator('#f-description').fill('Revised working copy');await f().getByRole('button',{name:'保存草稿',exact:true}).click();
 await p.waitForTimeout(200);const edited=(await read()).records.find(r=>r.id===accepted.id);assert.equal(edited.status,'已通过');assert.equal(edited.draftForm.description,'Revised working copy');assert.equal(JSON.stringify(edited.history),original);assert.equal(edited.reviews.length,2);await close();
 await p.locator('.dd-heading-actions [data-data="new"]').click();await f().locator('#f-name').waitFor();await f().locator('#f-name').fill('saved_unbound');await f().locator('[data-upload="input"]').setInputFiles({name:'input.txt',mimeType:'text/plain',buffer:Buffer.from('persistent payload')});await f().getByRole('button',{name:'保存草稿',exact:true}).click();await p.waitForTimeout(200);let unbound=(await read()).records.find(r=>r.form.name==='saved_unbound');assert.ok(unbound&&!unbound.competitionId);await close();
 await p.reload();await p.locator('[data-data="detail"][data-id="'+unbound.id+'"]').click();await f().locator('[data-download]').waitFor();const dl=p.waitForEvent('download');await f().locator('[data-download]').first().click();assert.equal((await dl).suggestedFilename(),'input.txt');await close();
 await p.goto(base+'#mine');await p.locator('[data-wb="demo"]').click();await p.locator('[data-dd-draft="'+unbound.id+'"]').waitFor();const before=JSON.stringify((await read()).records.find(r=>r.id===unbound.id));await p.locator('[data-dd-draft="'+unbound.id+'"]').click();await f().locator('#f-name').waitFor();assert.equal(JSON.stringify((await read()).records.find(r=>r.id===unbound.id)),before);await close();
 await p.locator('.detail-heading [data-submit-data]').click();await p.locator('[data-dd-new]').click();await f().locator('#f-name').waitFor();const child=p.frames().find(f=>f.url().includes('submission.html'));await child.evaluate(()=>{const q=new URLSearchParams(location.search),k='dashboard:'+WorkbenchModel.read().participation.active+':'+q.get('fresh'),s=JSON.parse(localStorage.getItem('benchsquare-submissions-v1'));const form={...SubmissionModel.sample(),name:'dashboard_submit',attachments:[],consent:true,terms:true};s.workspaces[k]={id:null,form,baseline:JSON.stringify(form)};localStorage.setItem('benchsquare-submissions-v1',JSON.stringify(s));});await child.goto(child.url().replace('#','&reload=1#'));await f().locator('[data-do="submit"]').click();await f().locator('.detail-meta').waitFor();const submitted=(await read()).records.find(r=>r.form.name==='dashboard_submit');assert.equal(submitted.status,'待初审');assert.equal(submitted.competitionId,'workbench-demo');assert.equal(submitted.revision,1);await close();
 await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('ale-frontend-v1'));s.participation.workbenchClock['workbench-demo']='closed';localStorage.setItem('ale-frontend-v1',JSON.stringify(s));});await p.reload();await p.locator('.detail-heading [data-submit-data]').click();await p.locator('[data-dd-new]').click();await f().locator('#f-name').fill('after_deadline_draft');await f().getByRole('button',{name:'保存草稿',exact:true}).click();await p.waitForTimeout(200);assert.ok((await read()).records.find(r=>r.form.name==='after_deadline_draft'));await close();
 await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('ale-frontend-v1'));s.participation.active='xu';localStorage.setItem('ale-frontend-v1',JSON.stringify(s));});await p.goto(base+'#data-dashboard');await p.reload();assert.deepEqual(await p.locator('.dd-metric strong').allTextContents(),['0','0','0','0']);assert.deepEqual(errors,[]);
 console.log('Dashboard passed: 12 examples, idempotency, views/filter, immutable history, unbound draft, persistent attachment/download, draft picker, submission, deadline drafts and identity isolation.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});


