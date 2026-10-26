'use strict';
const assert=require('node:assert/strict');
const {chromium}=require(process.env.BENCHSQUARE_PLAYWRIGHT||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  async function loadFixture(target){await target.evaluate(()=>{const key=SubmissionModel.config.storageKey,s=JSON.parse(localStorage.getItem(key)||'{"version":1,"records":[],"work":null}'),p=new URLSearchParams(location.search),work={id:s.work?.id||null,form:SubmissionModel.sample(),baseline:JSON.stringify(SubmissionModel.sample())};if(p.has('competition')){const k=p.get('competition')+':'+p.get('team')+':'+WorkbenchModel.read().participation.active;s.workspaces={...s.workspaces,[k]:work};}else s.work=work;localStorage.setItem(key,JSON.stringify(s));});await target.reload();}
 const base='http://127.0.0.1:4173/frontend/';
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('benchsquare-submissions-v1')));
 const action=a=>page.locator('[data-do="'+a+'"]').click();
 try{
  await page.goto(base+'index.html#mine');await page.locator('[data-wb="demo"]').click();await page.waitForURL(/#workbench/);
  await page.locator('.wb-title h1').waitFor();assert.equal(await page.locator('.wb-status').innerText(),'提交与审核中');
  await page.screenshot({path:__dirname+'/workbench-desktop-preview.png',fullPage:true});
  await page.getByRole('link',{name:'＋ 新建任务'}).click();await page.waitForURL(/submission.html/);
  await loadFixture(page);await page.locator('#f-consent').check();await action('save');
  let r=(await read()).records[0];assert.equal(r.competitionId,'workbench-demo');assert.equal(r.teamId,'wb-team-rong');assert.equal(r.status,'草稿');
  await action('submit');await page.waitForURL(/#detail/);r=(await read()).records[0];const id=r.id;assert.equal(r.revision,1);assert.equal(r.history[0].form.name,r.form.name);
  await action('edit:'+id);await page.locator('#f-name').fill('修改中的团队任务');await action('save');r=(await read()).records[0];assert.equal(r.status,'待初审');assert.equal(r.draftForm.name,'修改中的团队任务');assert.notEqual(r.form.name,r.draftForm.name);
  await action('submit');await page.waitForURL(/#detail/);r=(await read()).records[0];assert.equal(r.revision,2);assert.equal(r.history.length,2);assert.notEqual(r.history[0].form.name,r.history[1].form.name);
  await action('history:'+id+':1');assert.ok((await page.locator('#preview-content').innerText()).includes(r.history[0].form.name));await page.locator('#close-preview').click();
  const scopedUrl=page.url();await page.goto(base+'index.html#submissions');await page.waitForURL(/#mine$/);assert.equal(await page.locator('.sidebar [data-nav="workbench"],.sidebar [data-nav="submissions"]').count(),0);await page.goto(base+'index.html#workbench');await page.waitForURL(/#mine$/);assert.equal(await page.getByRole('link',{name:'进入参赛工作台 →'}).count(),1);
  await page.goto(base+'index.html#workbench/workbench-demo');assert.equal(await page.locator('.wb-table tbody tr').count(),1);
  await page.locator('#wb-clock').selectOption('closed');assert.equal(await page.getByRole('link',{name:'＋ 新建任务'}).count(),0);
  await page.goto(scopedUrl);assert.equal(await page.locator('[data-do^="edit:"]').count(),0);await page.goto(scopedUrl.split('#')[0]+'#new');assert.ok((await page.locator('.context-locked').innerText()).includes('已截止'));
  await page.goto(base+'index.html#workbench/workbench-demo');await page.locator('#wb-clock').selectOption('before');assert.equal(await page.locator('.wb-status').innerText(),'提交未开始');await page.locator('#wb-clock').selectOption('open');
  // Each participant independently owns drafts, submissions and versions.
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('ale-frontend-v1'));s.participation.teams.find(t=>t.id==='wb-team-rong').members.push('chen');s.participation.regs['workbench-demo'].chen={at:Date.now()};s.participation.active='chen';localStorage.setItem('ale-frontend-v1',JSON.stringify(s));});
  await page.goto(scopedUrl);assert.ok((await page.locator('#app').innerText()).includes('未找到本地记录'));
  await page.goto(scopedUrl.split('#')[0]+'#new');assert.equal(await page.locator('#f-name').inputValue(),'');assert.equal(await page.locator('[data-do="submit"]').count(),1);
  await loadFixture(page);await page.locator('#f-name').fill('陈思远独立提交');await page.locator('#f-consent').check();await action('save');let member=(await read()).records.find(r=>r.ownerId==='chen');assert.equal(member.status,'草稿');await page.reload();assert.equal(await page.locator('#f-name').inputValue(),'陈思远独立提交');
  await action('submit');await page.waitForURL(/#detail/);member=(await read()).records.find(r=>r.ownerId==='chen');assert.equal(member.status,'待初审');assert.equal(member.history[0].by,'chen');assert.equal((await read()).records.find(r=>r.id===id).revision,2);
  await page.goto(base+'index.html#workbench/workbench-demo');assert.equal(await page.locator('.wb-table tbody tr').count(),1);assert.ok((await page.locator('.wb-table').innerText()).includes('陈思远独立提交'));
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('ale-frontend-v1'));s.participation.active='rong';localStorage.setItem('ale-frontend-v1',JSON.stringify(s));});await page.reload();assert.equal(await page.locator('.wb-table tbody tr').count(),1);assert.ok(!(await page.locator('.wb-table').innerText()).includes('陈思远独立提交'));
  await page.goto(scopedUrl.split('#')[0]+'#detail/'+member.id);assert.ok((await page.locator('#app').innerText()).includes('未找到本地记录'));
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('ale-frontend-v1'));s.participation.active='chen';localStorage.setItem('ale-frontend-v1',JSON.stringify(s));});
  // Guessing another team does not reveal its records.
  await page.goto(scopedUrl.replace('wb-team-rong','another-team'));assert.ok((await page.locator('#app').innerText()).includes('无权访问'));assert.equal(await page.locator('.detail-content').count(),0);
  // An already-open page revalidates identity before saving.
  await page.goto(scopedUrl.split('#')[0]+'#new');await page.locator('#f-name').fill('不得保存');await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('ale-frontend-v1'));s.participation.active='zhou';localStorage.setItem('ale-frontend-v1',JSON.stringify(s));});await action('save');assert.ok((await page.locator('#notice').innerText()).includes('身份已变化'));assert.equal((await read()).records.length,2);
  // Standalone records and team records are isolated in list and detail routes.
  await page.goto(base+'submission.html#detail/'+id);assert.ok((await page.locator('#app').innerText()).includes('未找到本地记录'));
  await page.goto(base+'index.html#mine');await page.locator('[data-wb="demo"]').click();await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=0);await page.screenshot({path:__dirname+'/workbench-mobile-preview.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);console.log('Workbench browser checks passed: team linking, personal drafts, snapshots, independent member submission, date gates, scope isolation, identity revalidation and mobile layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
