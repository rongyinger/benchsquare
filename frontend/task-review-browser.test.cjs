'use strict';
const assert=require('node:assert/strict');
const {chromium}=require(process.env.BENCHSQUARE_PLAYWRIGHT||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const base='http://127.0.0.1:4173/frontend/';
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('benchsquare-submissions-v1')));
  const click=a=>page.locator('[data-do="'+a+'"]').click();
  const review=async(id,action,note='')=>{if(!await page.locator('#review-note').isVisible())await page.locator('.review-simulator summary').click();if(note)await page.locator('#review-note').fill(note);await click('review:'+id+':'+action);};
  async function sample(){await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('benchsquare-submissions-v1')||'{"version":1,"records":[]}'),p=new URLSearchParams(location.search),k=p.get('competition')+':'+p.get('team')+':'+WorkbenchModel.read().participation.active;s.workspaces={...s.workspaces,[k]:{id:null,form:{...SubmissionModel.sample(),name:'review_instance_'+(s.records.length+1),consent:true,terms:true},baseline:''}};localStorage.setItem('benchsquare-submissions-v1',JSON.stringify(s));});await page.reload();}
  await page.goto(base+'index.html#mine');await page.locator('[data-wb="demo"]').click();await page.locator('[data-dd-new]').click();await page.frameLocator('iframe').locator('#f-name').waitFor();const formUrl=page.frames().find(f=>f.url().includes('submission.html')).url().replace('&embed=1','').replace('dashboard=1','dashboard=0&team=wb-team-rong');await page.goto(formUrl);
  await sample();await click('submit');await page.waitForURL(/#detail/);let r=(await read()).records[0],id=r.id;assert.equal(r.status,'待初审');assert.equal(await page.locator('[data-do="review:'+id+':pass"]').count(),0);
  await review(id,'revise');assert.equal((await read()).records[0].status,'待初审');assert.ok((await page.locator('#notice').innerText()).includes('请填写'));
  await review(id,'revise','输入文件缺少字段说明，请补充。');assert.equal((await read()).records[0].status,'需修改');
  await click('edit:'+id);await page.locator('#f-description').fill('已补充完整字段定义。');await click('submit');await page.waitForURL(/#detail/);r=(await read()).records[0];assert.equal(r.status,'待初审');assert.equal(r.revision,2);assert.equal(r.reviews[0].revision,1);
  await review(id,'initial');assert.equal((await read()).records[0].status,'终检中');assert.equal(await page.locator('[data-do="edit:'+id+'"]').count(),0);
  await review(id,'pass');r=(await read()).records[0];assert.equal(r.status,'已通过');assert.equal(r.reviews.length,3);assert.equal(await page.locator('[data-do="edit:'+id+'"]').count(),0);
  await page.screenshot({path:__dirname+'/task-review-preview.png',fullPage:true});
  // A late initial review can still request correction; only an existing task may be corrected.
  await page.goto(formUrl.replace('#new','#list'));await click('new');await sample();await click('submit');await page.waitForURL(/#detail/);const id2=page.url().split('#detail/')[1];
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('ale-frontend-v1')),c=s.competitions.find(c=>c.id==='workbench-demo');c.values.submissionStart=new Date(Date.now()-86400000*2).toISOString();c.values.submissionEnd=new Date(Date.now()-86400000).toISOString();c.values.correctionEnd=new Date(Date.now()+86400000).toISOString();c.values.publicationAt=new Date(Date.now()+86400000*2).toISOString();s.participation.workbenchClock['workbench-demo']='real';localStorage.setItem('ale-frontend-v1',JSON.stringify(s));});await page.reload();
  await review(id2,'revise','按初审意见补正');await click('edit:'+id2);await page.locator('#f-name').fill('review_correction_instance_1');await click('submit');await page.waitForURL(/#detail/);r=(await read()).records.find(r=>r.id===id2);assert.equal(r.status,'待初审');assert.equal(r.revision,2);
  await page.goto(base+'index.html#workbench/workbench-demo');assert.equal(await page.getByRole('link',{name:'＋ 新建任务'}).count(),0);
  await page.goto(formUrl);assert.ok((await page.locator('.context-locked').innerText()).includes('已截止'));
  await page.goto(base+'index.html#competition/workbench-demo');await page.locator('[data-tab="赛程与奖励"]').click();assert.equal(await page.locator('[data-timeline-key]').count(),6);assert.ok((await page.locator('.competition-schedule').innerText()).includes('初审通过后进入终检'));assert.equal(await page.locator('[data-timeline-key="reviewStart"]').count(),0);
  await page.screenshot({path:__dirname+'/task-schedule-preview.png',fullPage:false});assert.deepEqual(errors,[]);
  console.log('Task review passed: initial review gate, required feedback, versioned correction, final check and result, late corrections, no late new tasks, updated six-point schedule.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
