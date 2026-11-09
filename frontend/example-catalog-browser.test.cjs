'use strict';
const assert=require('node:assert/strict');
const {chromium}=require(process.env.BENCHSQUARE_PLAYWRIGHT||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BENCHSQUARE_BROWSER||'chrome'});
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const base=process.env.DEMO_BASE||'http://127.0.0.1:4173/frontend/';
 const frame=()=>page.frameLocator('iframe');
 const close=async()=>{await page.getByRole('button',{name:'关闭提交面板'}).click();await page.locator('.submission-overlay').waitFor({state:'detached'});};
 const read=()=>page.evaluate(()=>DataItems.read());
 try{
  await page.goto(base+'#data-dashboard');await page.locator('[data-data="examples"]').click();
  assert.equal((await read()).records.length,32);assert.deepEqual(await page.locator('.dd-metric strong').allTextContents(),['8','8','10','6']);
  await page.locator('[data-data="examples"]').click();assert.equal((await read()).records.length,32);
  for(const format of ['harbor','question']){
   await page.locator('#dd-format').selectOption(format);assert.equal(await page.locator('.dd-table tbody tr').count(),16);
   await page.locator('#dd-stage').selectOption('已审核');assert.equal(await page.locator('.dd-table tbody tr').count(),5);
   await page.locator('#dd-stage').selectOption('');
  }
  await page.locator('[data-data="clear"]').click();
  const records=(await read()).records;
  for(const r of records){
   await page.locator('.dd-text-button[data-data="detail"][data-id="'+r.id+'"]').click();await frame().locator('.detail-meta').waitFor();
   const locked=await page.evaluate(id=>DataItems.locked(DataItems.read().records.find(r=>r.id===id)),r.id);
   assert.equal(await frame().locator('[data-do^="edit:"]').count(),locked?0:1,r.form.name);
   assert.equal(await frame().locator('.submission-version').count(),r.revision,r.form.name);
   const versions=await page.evaluate(id=>DataItems.timeline(DataItems.read().records.find(r=>r.id===id)),r.id);
   if(r.revision){
    assert.equal(await frame().locator('details.submission-version[open]').count(),1);
    assert.equal(await frame().locator('details.submission-version[open]').getAttribute('data-revision'),String(r.revision));
    assert.equal(await frame().locator('.submission-version .read-field').count(),0,'ALE content lives in a version preview');
    for(const version of versions){
     const card=frame().locator('.submission-version[data-revision="'+version.revision+'"]');
     if(!await card.getAttribute('open').then(x=>x!==null))await card.locator('summary').click();
     // Header supports keyboard collapse/expand without affecting other versions.
     await card.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await card.getAttribute('open'),null);
     await page.keyboard.press('Enter');assert.notEqual(await card.getAttribute('open'),null);
     if(r.form.submissionFormat==='question'){
      assert.equal(await card.locator('.version-package button').innerText(),'预览提交');
      assert.equal(await card.locator('.version-package [data-download]').count(),0);
     }else assert.match(await card.locator('.version-package').innerText(),/下载压缩包/);
     await card.locator('[data-do^="history:"]').click();await frame().locator('#preview[open]').waitFor();
     assert.equal(await frame().locator('#preview-content .read-field').count()>0,r.form.submissionFormat==='question');
     if(r.form.submissionFormat==='question')assert.match(await frame().locator('#preview-content').innerText(),new RegExp('提交版本：v'+version.revision));
     if(version.form.attachments.length){
      const download=page.waitForEvent('download');await frame().locator('#preview-content [data-download]').first().click();const result=await download;
      assert.ok(require('node:fs').statSync(await result.path()).size>0,r.form.name);
     }
     await frame().locator('#close-preview').click();
    }
   }else{
    assert.equal(await frame().locator('.read-field').count()>0,r.form.submissionFormat==='question');
    if(r.form.attachments.length){
     const download=page.waitForEvent('download');await frame().locator('[data-download]').first().click();const result=await download;
     assert.ok(require('node:fs').statSync(await result.path()).size>0,r.form.name);
    }
   }
   await close();
  }
  for(const format of ['harbor','question']){
   const seed=records.find(r=>r.form.submissionFormat===format&&r.form.name.includes('material_zero_score'));
   await page.locator('[data-data="review"][data-id="'+seed.id+'"]').click();assert.equal(await page.locator('.dd-final-score strong').innerText(),'0.00分');await close();
   const draft=records.find(r=>r.form.submissionFormat===format&&r.mockScenario==='补正中的修改草稿');
   await page.locator('.dd-text-button[data-data="detail"][data-id="'+draft.id+'"]').click();await frame().locator('[data-do^="edit:"]').click();
   assert.equal(await frame().locator('[data-format="'+format+'"]').getAttribute('aria-pressed'),'true');
   if(format==='question')assert.match(await frame().locator('#f-description').inputValue(),/本轮补正/);
   else await frame().locator('[data-upload="harbor"]').waitFor();await close();
  }
  const repeated=records.find(r=>r.form.name==='ale_dependency_correction_rounds_06');
  await page.locator('.dd-text-button[data-data="detail"][data-id="'+repeated.id+'"]').click();await frame().locator('.submission-version').first().waitFor();
  await page.frames().find(f=>f.url().includes('submission.html')).evaluate(()=>document.fonts.ready);
  await page.screenshot({path:'.artifacts/dual-format/versions-desktop.png'});
  await frame().locator('.version-submission-preview').first().click();await frame().locator('#preview[open]').waitFor();assert.match(await frame().locator('#preview-content').innerText(),/依赖/);await frame().locator('#close-preview').click();
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.artifacts/dual-format/versions-mobile.png'});assert.ok(await page.frames().find(f=>f.url().includes('submission.html')).evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await close();await page.setViewportSize({width:1600,height:1000});
  // Old cached Harbor catalogs gain the new scenarios without replacing participant work.
  await page.evaluate(()=>{
   const seeds=DataMocks.generate('rong').slice(0,12);seeds[0].form.name='participant_edited_example';
   localStorage.setItem(DataItems.key,JSON.stringify({version:1,records:[...seeds,{id:'participant-own',ownerId:'rong',status:'草稿',form:{...SubmissionModel.empty(),name:'my_own_draft'},updatedAt:new Date().toISOString()}],work:null,workspaces:{keep:{form:{description:'unsaved text'}}}}));
  });await page.reload();const migrated=await read();assert.equal(migrated.records.length,33);assert.equal(migrated.records[0].form.name,'participant_edited_example');assert.equal(migrated.workspaces.keep.form.description,'unsaved text');
  await page.setViewportSize({width:390,height:844});await page.locator('#dd-format').selectOption('question');assert.equal(await page.locator('.dd-table tbody tr').count(),16);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'.artifacts/dual-format/examples-mobile.png',fullPage:true});
  await page.setViewportSize({width:1600,height:1000});await page.screenshot({path:'.artifacts/dual-format/examples-desktop.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('Example catalog browser passed: both 16-case catalogs, all detail/history pages, real downloads, permissions, zero scores, correction editors, format/status filtering, idempotency, non-destructive migration and mobile layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
