'use strict';
const assert=require('node:assert/strict');
const {chromium}=require(process.env.BENCHSQUARE_PLAYWRIGHT||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const url=(process.env.DEMO_BASE||'http://127.0.0.1:4173/frontend/')+'#competition/mine-example-active';
  await page.goto(url);
  await page.evaluate(()=>{
   const state=JSON.parse(localStorage.getItem('ale-frontend-v1')),p=state.participation;
   p.teams=p.teams.filter(t=>t.cid!=='mine-example-active');
   p.teams.push({id:'test-team',cid:'mine-example-active',leader:'rong',members:['rong','chen'],name:'贡献验证团队'});
   localStorage.setItem('ale-frontend-v1',JSON.stringify(state));
   const record=(id,ownerId,status,extra={})=>({id,ownerId,status,competitionId:'mine-example-active',teamId:'test-team',revision:1,form:{name:'PRIVATE_TASK',hidden:'PRIVATE_CONTENT'},...extra});
   localStorage.setItem('benchsquare-submissions-v1',JSON.stringify({version:1,records:[record('a','rong','已通过',{revision:2}),record('b','chen','待初审'),record('c','chen','需修改'),record('d','chen','草稿',{revision:0}),record('e','chen','已通过',{mock:true}),record('f','chen','已通过',{teamId:'other-team'})]}));
  });
  await page.reload();
  await page.getByRole('tab',{name:'团队',exact:true}).click();
  const panel=page.locator('.team-contributions');
  assert.deepEqual(await panel.locator('tbody tr').allTextContents(),['容莹（我） · 队长110','陈思远 · 成员201']);
  assert.equal((await panel.innerText()).includes('PRIVATE_'),false);
  await page.screenshot({path:'.artifacts/team-contributions-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await panel.screenshot({path:'.artifacts/team-contributions-mobile.png'});
  await page.getByRole('tab',{name:'排行榜',exact:true}).click();
  assert.equal(await page.locator('.team-contributions').count(),0);
  assert.equal(await page.locator('.lb-table thead th').count(),6);
  for(const user of ['chen','zhou']){
   await page.evaluate(user=>{const s=JSON.parse(localStorage.getItem('ale-frontend-v1'));s.participation.active=user;localStorage.setItem('ale-frontend-v1',JSON.stringify(s));},user);
   await page.reload();
   await page.getByRole('tab',{name:'团队',exact:true}).click();
   assert.equal(await page.locator('.team-contributions').count(),user==='chen'?1:0);
  }
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('ale-frontend-v1'));s.participation.active='rong';localStorage.setItem('ale-frontend-v1',JSON.stringify(s));localStorage.setItem('benchsquare-submissions-v1','invalid');});
  await page.reload();await page.getByRole('tab',{name:'团队',exact:true}).click();
  assert.equal(await page.getByText('暂时无法读取任务记录，请保留本地数据后重试。').count(),1);
  assert.deepEqual(errors,[]);
  console.log('Team contribution browser checks passed: desktop/mobile, counts, teammate/outsider visibility, private content exclusion, public leaderboard and corrupt storage.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
