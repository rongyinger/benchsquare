'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require(process.env.BENCHSQUARE_PLAYWRIGHT||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const base=process.env.DEMO_BASE||'http://127.0.0.1:4173/frontend/';
  await page.goto(base+'index.html#mine');
  const stages=['forming','upcoming','active','finished','expired'];
  for(const stage of stages){
   const section=page.locator('.mine-group-'+stage);
   const expected=stage==='active'?2:1;
   assert.equal(await section.locator('.mine-card').count(),expected,stage+' should include its examples');
   assert.equal(await section.locator('.mine-group-count').innerText(),String(expected));
  }
  assert.equal(await page.locator('.mine-group-review').count(),0);
  assert.equal(await page.locator('.mine-group-active .mine-review-status').innerText(),'审核与补正中');
  assert.equal(await page.locator('.mine-group-active').getByRole('link',{name:'查看提交与审核进度 ↗',exact:true}).count(),1);
  assert.equal(await page.locator('.mine-group:not(.mine-group-expired) .mine-delete').count(),0);
  await page.screenshot({path:path.join(__dirname,'mine-status-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile should not overflow');
  await page.screenshot({path:path.join(__dirname,'mine-status-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1600,height:1000});
  const seed=await page.evaluate(()=>JSON.parse(localStorage.getItem('ale-frontend-v1')));
  assert.equal(seed.competitions.filter(c=>c.mineStatusExample).length,6);
  const initialTeams=seed.participation.teams.length;
  await page.reload();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ale-frontend-v1')).participation.teams.length),initialTeams,'reload must not duplicate teams');
  // Expired registrations have no actionable team creation entry.
  const expired=page.locator('.mine-group-expired');
  assert.equal(await expired.getByRole('link',{name:'完成组队 →',exact:true}).count(),0);
  await expired.getByRole('link',{name:'查看赛事 →',exact:true}).click();
  await page.getByRole('tab',{name:'团队',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'创建团队',exact:true}).count(),0);
  await page.goto(base+'index.html#mine');
  await page.getByRole('tab',{name:'组队邀请',exact:false}).click();
  assert.equal(await page.locator('.mine-groups').count(),0);
  await page.getByRole('tab',{name:'报名的比赛',exact:true}).click();
  assert.equal(await page.locator('.mine-group').count(),5);
  // Deletion removes only this user's expired card and survives a reload.
  await page.locator('.mine-group-expired').getByRole('button',{name:'删除',exact:true}).click();
  assert.equal(await page.locator('.mine-group-expired .mine-card').count(),0);
  assert.equal(await page.locator('.mine-group-expired .mine-group-count').innerText(),'0');
  await page.reload();
  assert.equal(await page.locator('.mine-group-expired .mine-card').count(),0);
  const removed=await page.evaluate(()=>JSON.parse(localStorage.getItem('ale-frontend-v1')));
  assert.deepEqual(removed.participation.hiddenExpired.rong,['mine-example-expired']);
  assert.equal(removed.participation.hiddenExpired.chen,undefined);
  assert.ok(removed.competitions.some(c=>c.id==='mine-example-expired'));
  assert.ok(removed.participation.regs['mine-example-expired'].chen);
  // Completing a team moves the same registration into the upcoming group.
  await page.locator('.mine-group-forming').getByRole('link',{name:'完成组队 →',exact:true}).click();
  await page.getByRole('tab',{name:'团队',exact:true}).click();
  await page.getByRole('button',{name:'创建团队',exact:true}).click();
  await page.locator('input[name="name"]').fill('分类验证团队');
  await page.getByRole('button',{name:'创建团队并正式参赛',exact:true}).click();
  await page.goto(base+'index.html#mine');
  assert.equal(await page.locator('.mine-group-forming .mine-card').count(),0);
  assert.equal(await page.locator('.mine-group-upcoming .mine-card').count(),2);
  assert.deepEqual(errors,[]);
  console.log('Passed: five groups, merged review cards, counts, persistent user-scoped deletion, expired actions, tabs, team state transition and mobile layout.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
