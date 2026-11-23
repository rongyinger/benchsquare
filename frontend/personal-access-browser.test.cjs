'use strict';
const assert=require('node:assert/strict');
const {chromium}=require(process.env.BENCHSQUARE_PLAYWRIGHT||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.BENCHSQUARE_BROWSER||'chrome'});
 try{
  const context=await browser.newContext(),page=await context.newPage(),base=process.env.DEMO_BASE||'http://127.0.0.1:4173/frontend/',cid='blocked-team-demo';
  const submit=()=>page.locator('#main [data-submit-data]');
  await page.goto(base+'#competition/'+cid);await page.locator('[data-sad="toggle"]').waitFor();
  await submit().click();const dialog=page.getByRole('dialog',{name:'提交已拦截',exact:true});await dialog.waitFor();
  await dialog.getByText('您在本赛事已禁止提交，详情联系工作人员。',{exact:true}).waitFor();
  assert.doesNotMatch(await dialog.innerText(),/扫码|二维码|团队已被拉黑/);
  assert.equal(await dialog.locator('img').count(),0);assert.equal(await page.locator('.dd-picker,iframe').count(),0);
  await dialog.getByRole('button',{name:'我知道了',exact:true}).click();
  await page.reload();await submit().click();await dialog.waitFor();await dialog.getByRole('button',{name:'我知道了',exact:true}).click();
  const first=await page.evaluate(()=>JSON.parse(localStorage.getItem('ale-frontend-v1')).participation.active||'rong');
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('ale-frontend-v1'));s.participation.active='chen';localStorage.setItem('ale-frontend-v1',JSON.stringify(s));});
  await page.reload();await submit().click();await page.locator('.dd-picker').waitFor();assert.equal(await page.locator('#event-contact-dialog[open]').count(),0);
  await page.evaluate(user=>{const s=JSON.parse(localStorage.getItem('ale-frontend-v1'));s.participation.active=user;localStorage.setItem('ale-frontend-v1',JSON.stringify(s));},first);
  await page.reload();await page.locator('[data-sad="toggle"]').click();await submit().click();await page.locator('.dd-picker').waitFor();
  console.log('Personal submission browser: text-only warning, reload, unaffected teammate and unblock passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
