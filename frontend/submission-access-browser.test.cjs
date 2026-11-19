'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.BENCHSQUARE_PLAYWRIGHT||'playwright');

(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BENCHSQUARE_BROWSER||'chrome'});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const base=process.env.DEMO_BASE||'http://127.0.0.1:4173/frontend/';
 const output=process.env.BENCHSQUARE_CONTACT_QA||'/private/tmp/benchsquare-contact-qa';
 const cid='blocked-team-demo',tid='blocked-demo-team',errors=[];
 const watch=page=>{page.on('pageerror',error=>errors.push(error.message));return page;};
 const page=watch(await context.newPage());
 const archive=name=>({name,mimeType:'application/zip',buffer:Buffer.from('Only file selection and local persistence are tested.')});
 const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('benchsquare-submissions-v1'))||{records:[]});
 const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('ale-frontend-v1')));
 const setBlocked=(page,blocked)=>page.evaluate(({tid,blocked})=>{
  const key='ale-frontend-v1',s=JSON.parse(localStorage.getItem(key));
  s.participation.teams.find(team=>team.id===tid).blacklisted=blocked;
  localStorage.setItem(key,JSON.stringify(s));
 },{tid,blocked});
 const closeAppeal=async scope=>{
  await scope.locator('#event-contact-dialog [data-event-contact-close]').first().click();
  await scope.locator('#event-contact-dialog[open]').waitFor({state:'hidden'});
 };
 const appeal=async scope=>{
  const dialog=scope.locator('#event-contact-dialog[open]');
  await dialog.waitFor();
  assert.match(await dialog.innerText(),/当前团队已被拉黑/);
  assert.match(await dialog.innerText(),/联系企业微信申诉/);
  assert.match(await dialog.innerText(),/证据共创队/);
  assert.match(await dialog.innerText(),/演示/);
  const qr=dialog.locator('img');
  assert.equal(await qr.count(),1,'an appeal displays a local demo QR code');
  assert.match(await qr.getAttribute('src'),/assets\/.*\.svg/);
  await qr.evaluate(image=>image.decode());
  assert.equal(await qr.evaluate(image=>image.naturalWidth>0),true);
  return dialog;
 };
 const prepare=async(scope,name)=>{
  await scope.locator('[data-upload="harbor"]').waitFor();
  await scope.locator('[data-upload="harbor"]').setInputFiles(archive(name));
  await scope.locator('#f-terms').check();
 };
 fs.mkdirSync(output,{recursive:true});
 try{
  // The actual competition entry is clickable, but a restricted team never opens the picker or editor.
  await page.goto(base+'#competition/'+cid);
  await page.locator('[data-sad="toggle"]').waitFor();
  assert.match(await page.locator('.sad-demo-status').innerText(),/当前团队已被拉黑/);
  await page.locator('#main [data-submit-data]').click();
  await appeal(page);
  assert.equal(await page.locator('.dd-picker, iframe').count(),0);
  assert.equal((await read(page)).records.length,0);
  await page.screenshot({path:output+'/team-blocked-appeal-desktop.png',animations:'disabled'});
  await closeAppeal(page);
  await page.reload();
  assert.equal((await state(page)).participation.teams.find(team=>team.id===tid).blacklisted,true);

  // The persisted restriction applies to the captain and every other member, without relying on button state.
  for(const member of ['rong','chen','zhou','xu']){
   await page.evaluate(member=>{const key='ale-frontend-v1',s=JSON.parse(localStorage.getItem(key));s.participation.active=member;localStorage.setItem(key,JSON.stringify(s));},member);
   await page.reload();
   await page.locator('#main [data-submit-data]').click();
   await appeal(page);
   assert.equal(await page.locator('.dd-picker, iframe').count(),0);
   await closeAppeal(page);
  }
  await page.evaluate(()=>{const key='ale-frontend-v1',s=JSON.parse(localStorage.getItem(key));s.participation.active='rong';localStorage.setItem(key,JSON.stringify(s));});
  await page.reload();

  // Unblocking restores the real Harbor submission flow and produces a single formal version.
  await page.locator('[data-sad="toggle"]').click();
  assert.match(await page.locator('.sad-demo-status').innerText(),/已模拟解除拉黑/);
  await page.locator('#main [data-submit-data]').click();
  await page.locator('[data-dd-new]').click();
  let editor=page.frameLocator('iframe');
  await prepare(editor,'allowed.zip');
  await editor.locator('[data-do="submit"]').click();
  await editor.locator('.detail-meta').waitFor();
  const accepted=(await read(page)).records.find(record=>record.form.name==='allowed');
  assert.equal(accepted.revision,1);
  assert.equal(accepted.status,'待初审');
  assert.equal(accepted.history.length,1);
  await page.getByRole('button',{name:'关闭提交面板'}).click();
  await page.locator('iframe').waitFor({state:'detached'});
  await page.locator('[data-sad="toggle"]').click();

  // An existing formal record remains readable. A correction draft can be saved, but cannot become v2.
  await page.evaluate(id=>{
   const key='benchsquare-submissions-v1',s=JSON.parse(localStorage.getItem(key)),record=s.records.find(record=>record.id===id);
   record.status='需修改';
   record.reviews=[{revision:1,from:'待初审',to:'需修改',note:'测试审核意见：请补充材料来源说明。',at:new Date().toISOString(),by:'测试评审员',simulated:true}];
   localStorage.setItem(key,JSON.stringify(s));
  },accepted.id);
  const correction=watch(await context.newPage());
  await correction.goto(base+'submission.html?dashboard=1&competition='+cid+'&item='+encodeURIComponent(accepted.id)+'#detail/'+encodeURIComponent(accepted.id));
  await correction.locator('.submission-version[data-revision="1"]').waitFor();
  assert.match(await correction.locator('.review-message-content').innerText(),/材料来源说明/);
  await correction.locator('[data-do^="edit:"]').click();
  await prepare(correction,'correction.zip');
  await correction.locator('[data-do="save"]').click();
  await correction.waitForFunction(id=>JSON.parse(localStorage.getItem('benchsquare-submissions-v1')).records.find(record=>record.id===id)?.draftForm?.name==='correction',accepted.id);
  const beforeCorrection=(await read(correction)).records.find(record=>record.id===accepted.id);
  await correction.locator('[data-do="submit"]').click();
  await appeal(correction);
  const afterCorrection=(await read(correction)).records.find(record=>record.id===accepted.id);
  assert.equal(afterCorrection.revision,1);
  assert.equal(afterCorrection.status,'需修改');
  assert.deepEqual(afterCorrection.history,beforeCorrection.history);
  assert.deepEqual(afterCorrection.reviews,beforeCorrection.reviews);
  assert.equal(afterCorrection.form.name,'allowed');
  assert.equal(afterCorrection.draftForm.name,'correction');
  await correction.close();

  // A direct editor URL cannot bypass the restriction, and draft persistence remains available.
  const direct=watch(await context.newPage());
  await direct.goto(base+'submission.html?dashboard=1&competition='+cid+'&fresh=blocked-direct#new');
  await prepare(direct,'blocked-draft.zip');
  await direct.locator('[data-do="save"]').click();
  await direct.waitForFunction(()=>JSON.parse(localStorage.getItem('benchsquare-submissions-v1')).records.some(record=>record.form.name==='blocked-draft'));
  const beforeDirect=(await read(direct)).records;
  const draft=beforeDirect.find(record=>record.form.name==='blocked-draft');
  assert.equal(draft.revision,0);
  assert.equal(draft.status,'草稿');
  await direct.locator('[data-do="submit"]').click();
  await appeal(direct);
  assert.deepEqual((await read(direct)).records,beforeDirect);
  assert.match(await direct.locator('.file-list').innerText(),/blocked-draft.zip/);
  await direct.setViewportSize({width:390,height:844});
  const mobile=direct.locator('#event-contact-dialog');
  assert.equal(await direct.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await mobile.evaluate(dialog=>dialog.scrollWidth<=dialog.clientWidth),true);
  const bounds=await mobile.boundingBox();
  assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390,'the complete appeal dialog fits the mobile viewport');
  await direct.screenshot({path:output+'/team-blocked-appeal-mobile.png',animations:'disabled'});
  await closeAppeal(direct);
  await direct.locator('[data-format="question"]').click();
  await direct.locator('#f-name').fill('blocked_ale_task');
  await direct.locator('#f-domain').fill('Engineering');
  await direct.locator('#f-software').fill('Python');
  await direct.locator('[name="os"][value="Linux"]').check();
  await direct.locator('[name="license"]').first().check();
  await direct.locator('#f-description').fill('根据输入记录生成汇总结果。');
  await direct.locator('#f-verification').fill('汇总结果与逐条计算的结果相同。');
  await direct.locator('#f-terms').check();
  const beforeAle=(await read(direct)).records;
  await direct.locator('[data-do="submit"]').click();
  await appeal(direct);
  assert.deepEqual((await read(direct)).records,beforeAle);
  assert.equal(await direct.locator('#f-name').inputValue(),'blocked_ale_task');
  await direct.close();

  // The form rechecks live team state after attachment persistence and before writing a formal record.
  await setBlocked(page,false);await page.reload();
  await page.locator('#main [data-submit-data]').click();
  await page.locator('[data-dd-new]').click();
  editor=page.frameLocator('iframe');
  await prepare(editor,'late-block.zip');
  await editor.locator('[data-do="save"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('benchsquare-submissions-v1')).records.some(record=>record.form.name==='late-block'));
  const controller=watch(await context.newPage());
  await controller.goto(base+'#competition/'+cid);
  const child=page.frames().find(frame=>frame.url().includes('submission.html'));
  await child.evaluate(()=>{
    const put=DataFiles.put;
    DataFiles.put=async(...args)=>{
      DataFiles.put=put;
      await put(...args);
      await new Promise(resolve=>{window.finishAttachmentSave=resolve;});
    };
  });
  const beforeLate=(await read(page)).records;
  await editor.locator('[data-do="submit"]').click();
  await child.waitForFunction(()=>typeof window.finishAttachmentSave==='function');
  await setBlocked(controller,true);
  await child.evaluate(()=>window.finishAttachmentSave());
  await appeal(editor);
  assert.deepEqual((await read(page)).records,beforeLate);
  assert.match(await editor.locator('.file-list').innerText(),/late-block.zip/);
  await closeAppeal(editor);
  await editor.locator('[data-do="save"]').click();
  assert.equal((await read(page)).records.find(record=>record.form.name==='late-block').revision,0);
  await controller.close();

  assert.deepEqual(errors,[]);
  console.log('Submission access browser passed: entry interception, all members, refresh, unblocking, formal Harbor submit, blocked Harbor and ALE direct URLs, correction/history preservation, late cross-page restriction, draft retention and mobile appeal.');
 }finally{await context.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
