'use strict';
const assert=require('node:assert/strict');
const {chromium}=require(process.env.BENCHSQUARE_PLAYWRIGHT||'playwright');

(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BENCHSQUARE_BROWSER||'chrome'});
 try{
  const page=await browser.newPage();
  const base=process.env.DEMO_BASE||'http://127.0.0.1:4173/frontend/';
  const cid='workbench-blocked-demo',reason='你已被本赛事拉黑，无法提交或重新提交数据。';
  await page.goto(base+'#mine');
  await page.locator('[data-wb="blocked-demo"]').click();
  await page.locator('.dd-picker').getByText(reason,{exact:false}).waitFor();
  await page.locator('[data-dd-new]').click();
  const editor=page.frameLocator('iframe');
  const submit=editor.locator('[data-do="submit"]');
  await editor.locator('[data-upload="harbor"]').setInputFiles({name:'blocked-demo.zip',mimeType:'application/zip',buffer:Buffer.from('mock archive')});
  await editor.locator('#f-terms').check();
  assert.match(await editor.locator('#submission-block').innerText(),/仍可保存草稿/);
  assert.equal(await submit.isDisabled(),true);
  await submit.dispatchEvent('click');
  await editor.getByRole('status').getByText(reason,{exact:true}).waitFor();
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
  console.log('Submission block: demo entry, Harbor and ALE controls, submit guard, and draft persistence passed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
