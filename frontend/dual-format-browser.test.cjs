'use strict';
const assert=require('node:assert/strict');
const {chromium}=require(process.env.BENCHSQUARE_PLAYWRIGHT||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto((process.env.DEMO_BASE||'http://127.0.0.1:4173/frontend/')+'submission.html?dashboard=1&fresh=dual#new');
  await page.locator('[data-format="question"]').click();assert.equal(await page.locator('.harbor-confirmations input[type="checkbox"]').count(),1);assert.equal(await page.locator('.harbor-confirmations .demo-terms, .harbor-confirmations .section-head p').count(),0);
  assert.equal(await page.locator('[data-format="question"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('[data-format="harbor"]').innerText(),'harbor 格式');assert.equal(await page.locator('[data-format="question"]').innerText(),'ALE 任务格式');
  const association=await page.locator('.dd-association').boundingBox(),selector=await page.locator('.submission-format').boundingBox();
  assert.ok(selector.y>=association.y+association.height);
  await page.locator('#f-description').fill('保留的问题说明');await page.locator('#f-name').fill('dual_question_1');
  await page.locator('[data-upload="input"]').setInputFiles({name:'input.txt',mimeType:'text/plain',buffer:Buffer.from('input')});
  await page.locator('[data-format="harbor"]').click();
  await page.locator('[data-upload="harbor"]').setInputFiles({name:'package.zip',mimeType:'application/zip',buffer:Buffer.from('package')});
  await page.locator('[data-do="save"]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('benchsquare-submissions-v1')).records.length===1);
  await page.reload();await page.locator('[data-upload="harbor"]').waitFor();
  await page.locator('[data-format="question"]').click();assert.equal(await page.locator('#f-description').inputValue(),'保留的问题说明');assert.match(await page.locator('.file-list').innerText(),/input.txt/);assert.doesNotMatch(await page.locator('.file-list').innerText(),/需要重新选择/);
  await page.locator('#f-domain').fill('Engineering');await page.locator('#f-software').fill('Python 3.12');await page.locator('[name="os"][value="Linux"]').check();await page.locator('[name="license"]').first().check();
  await page.locator('#f-verification').fill('# 成功标准\n- 输出正确');await page.locator('#f-terms').check();
  await page.locator('[data-do="preview"]').click();assert.match(await page.locator('#preview-content').innerText(),/保留的问题说明/);await page.locator('#close-preview').click();
  await page.locator('[data-do="save"]').click();await page.reload();await page.locator('#f-description').waitFor();assert.equal(await page.locator('#f-description').inputValue(),'保留的问题说明');
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'.artifacts/dual-format/question-mobile.png',fullPage:true});
  // Use the existing demo competition to exercise real submission permissions.
  await page.goto((process.env.DEMO_BASE||'http://127.0.0.1:4173/frontend/')+'#mine');await page.locator('[data-wb="demo"]').click();await page.locator('[data-dd-new]').click();
  const frame=page.frameLocator('iframe');await frame.locator('[data-format="question"]').click();
  await frame.locator('#f-name').fill('question_submission_1');await frame.locator('#f-domain').fill('Engineering');await frame.locator('#f-software').fill('Python');await frame.locator('[name="os"][value="Linux"]').check();await frame.locator('[name="license"]').first().check();await frame.locator('#f-description').fill('问题任务');await frame.locator('#f-verification').fill('验证成功');await frame.locator('#f-terms').check();
  await frame.locator('[data-do="submit"]').click();await frame.locator('.detail-meta').waitFor();await frame.locator('.version-submission-preview').click();await frame.locator('#preview[open]').waitFor();assert.match(await frame.locator('#preview-content').innerText(),/问题任务/);await frame.locator('#close-preview').click();
  assert.deepEqual(errors,[]);console.log('Dual format browser passed: selector placement, switching without loss, both attachment categories, persistence, preview, question submission/history and mobile layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
