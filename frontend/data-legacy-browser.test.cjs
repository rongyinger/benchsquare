'use strict';
const assert=require('node:assert/strict');
const {chromium}=require(process.env.BENCHSQUARE_PLAYWRIGHT||'playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
const p=await b.newPage({viewport:{width:1600,height:1000}}),errors=[];p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));
const base=process.env.DEMO_BASE||'http://127.0.0.1:4173/frontend/';
await p.goto(base+'#mine');await p.locator('[data-wb="demo"]').click();await p.locator('[data-dd-new]').waitFor();await p.getByRole('button',{name:'关闭提交面板'}).click();
await p.evaluate(()=>{const form={...SubmissionModel.sample(),name:'same_example',attachments:[],consent:true,terms:true},at=new Date().toISOString();const original={id:'legacy-unbound',ownerId:'rong',form,status:'待初审',revision:1,updatedAt:at,number:'BS-OLD',history:[{revision:1,at,name:form.name,form:structuredClone(form),by:'rong'}],reviews:[]};localStorage.setItem('benchsquare-submissions-v1',JSON.stringify({version:1,records:[original,{...structuredClone(original),id:'bound',competitionId:'workbench-demo',teamId:'wb-team-rong'}],work:null}));});
await p.goto(base+'#data-dashboard');await p.reload();assert.deepEqual(await p.locator('.dd-metric strong').allTextContents(),['1','1','0','0']);
assert.equal(await p.locator('[data-data="detail"]').count(),2);
const before=await p.evaluate(()=>JSON.parse(localStorage.getItem('benchsquare-submissions-v1')).records[0]);
await p.locator('[data-data="detail"][data-id="legacy-unbound"]').click();const f=p.frameLocator('iframe');await f.locator('.detail-meta').waitFor();assert.ok((await f.locator('.detail-meta').innerText()).includes('草稿'));assert.equal(await f.locator('.review-simulator').count(),0);assert.ok((await f.locator('#app').innerText()).includes('旧版演示的编号和历史记录仅作留档'));
await f.locator('[data-do="edit:legacy-unbound"]').click();assert.ok(await f.locator('#data-target-competition').isEnabled());await f.locator('[data-do="submit"]').click();assert.ok((await f.locator('#notice').innerText()).includes('请先选择要提交的比赛'));
await f.locator('#data-target-competition').selectOption('workbench-demo');await f.locator('[data-do="submit"]').click();assert.ok((await f.locator('#err-name').innerText()).length>0,'duplicate task in same competition blocked');await f.locator('#f-name').fill('rebound_legacy');await f.locator('[data-do="submit"]').click();await f.locator('.detail-meta').waitFor();
const after=await p.evaluate(()=>JSON.parse(localStorage.getItem('benchsquare-submissions-v1')).records.find(r=>r.id==='legacy-unbound'));assert.equal(after.competitionId,'workbench-demo');assert.equal(after.status,'待初审');assert.equal(after.revision,2);assert.deepEqual(after.history[0],before.history[0]);assert.equal(after.history.length,2);assert.deepEqual(errors,[]);
console.log('Legacy association passed: unbound pending record appears as draft, original retained, editable competition, submission gate, duplicate check and version-preserving resubmission.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
