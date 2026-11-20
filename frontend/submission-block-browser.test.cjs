'use strict';
const assert=require('node:assert/strict');
const {chromium}=require(process.env.BENCHSQUARE_PLAYWRIGHT||'playwright');

(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BENCHSQUARE_BROWSER||'chrome'});
 try{
  const context=await browser.newContext(),page=await context.newPage();
  const base=process.env.DEMO_BASE||'http://127.0.0.1:4173/frontend/';
  const cid='workbench-blocked-demo',reason='你已被本赛事拉黑，无法提交或重新提交数据。';
  const warning=reason+'详情加入企业微信联系工作人员。';
  const blockedDialog=async editor=>{
   const dialog=editor.getByRole('dialog',{name:'提交已拦截',exact:true});
   const message=dialog.getByText(warning,{exact:true});
   await message.waitFor();
   assert.equal(await message.evaluate(node=>getComputedStyle(node).color),'rgb(180, 35, 24)');
   const qr=dialog.getByRole('img',{name:/企业微信演示二维码/});
   assert.equal(await qr.getAttribute('src'),'assets/wecom-demo.svg');
   await qr.evaluate(image=>image.decode());
   return dialog;
  };
  await page.goto(base+'#mine');
  await page.locator('[data-wb="blocked-demo"]').click();
  const entry=page.locator('#main [data-submit-data="'+cid+'"]');
  await entry.waitFor();
  assert.equal(await page.locator('#event-contact-dialog[open], .submission-overlay').count(),0);
  await entry.click();
  const dialog=await blockedDialog(page);
  assert.equal(await page.locator('.submission-overlay, iframe').count(),0);
  await dialog.getByRole('button',{name:'我知道了',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  await page.waitForFunction(id=>document.activeElement?.dataset.submitData===id,cid);

  const editor=await context.newPage();
  await editor.goto(base+'submission.html?dashboard=1&competition='+cid+'#new');
  const submit=editor.locator('[data-do="submit"]');
  await editor.locator('[data-upload="harbor"]').setInputFiles({name:'blocked-demo.zip',mimeType:'application/zip',buffer:Buffer.from('mock archive')});
  await editor.locator('#f-terms').check();
  assert.match(await editor.locator('#submission-block').innerText(),/仍可保存草稿/);
  assert.equal(await submit.isDisabled(),true);
  await submit.dispatchEvent('click');
  await editor.getByRole('status').getByText(reason,{exact:true}).waitFor();
  const directDialog=await blockedDialog(editor);
  await directDialog.getByRole('button',{name:'我知道了',exact:true}).click();
  await directDialog.waitFor({state:'hidden'});
  await editor.locator('[data-do="save"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('benchsquare-submissions-v1')||'null')?.records.length===1);
  const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('benchsquare-submissions-v1')).records[0]);
  assert.equal(record.competitionId,cid);
  assert.equal(record.status,'草稿');
  assert.equal(record.revision,0);
  assert.deepEqual(record.history,[]);
  await editor.locator('[data-format="question"]').click();
  await editor.locator('#submission-block').waitFor();
  assert.equal(await submit.isDisabled(),true);
  console.log('Submission block: exact red text and QR dialog, no draft picker, focus restoration, editor guard, and draft persistence passed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
