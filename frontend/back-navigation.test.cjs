'use strict';
const assert=require('node:assert/strict');
const {chromium}=require(process.env.BENCHSQUARE_PLAYWRIGHT||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let accept=false;page.on('dialog',d=>accept?d.accept():d.dismiss());
  const base='http://127.0.0.1:4173/frontend/';const back=()=>page.locator('.page-backbar .page-back');const waitBack=label=>page.waitForFunction(label=>document.querySelector('.page-backbar .page-back')?.textContent===label,label);
  await page.goto(base+'index.html#explore');await page.locator('.card-cover').first().click();await page.waitForURL(/#competition/);
  await waitBack('返回赛事广场');assert.equal(await back().evaluate(e=>e.getBoundingClientRect().height>=44),true);
  await page.screenshot({path:__dirname+'/back-navigation-preview.png',fullPage:false});
  await page.evaluate(()=>window.scrollTo({top:700,behavior:'instant'}));assert.ok(await back().evaluate(e=>e.getBoundingClientRect().top>=76));await back().click();await page.waitForURL(/#explore$/);
  await page.goto(base+'index.html#mine');await page.locator('[data-wb="demo"]').click();await page.waitForURL(/#workbench\//);await waitBack('返回我的比赛');
  await page.locator('.wb-schedule a').click();await page.waitForURL(/#competition/);await waitBack('返回比赛工作台');await back().click();await page.waitForURL(/#workbench\//);
  await page.getByRole('link',{name:'＋ 新建任务'}).click();await page.waitForURL(/submission.html/);await waitBack('返回任务与提交');
  await page.locator('#f-name').fill('未保存的任务');await back().click();assert.ok(page.url().endsWith('#new'));assert.equal(await page.locator('#f-name').inputValue(),'未保存的任务');
  accept=true;await back().click();await page.waitForURL(/#list$/);await waitBack('返回比赛工作台');await back().click();await page.waitForURL(/#workbench\//);
  for(const [route,label] of [['create','返回主办方中心'],['admin','返回用户端'],['organizer','返回首页'],['mine','返回首页']]){await page.goto(base+'index.html#'+route);await waitBack(label);assert.equal(await page.locator('.page-backbar').count(),1);}
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  console.log('Back navigation passed: explicit destinations, competition origin, sticky visibility, form leave protection, management pages and mobile width.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
