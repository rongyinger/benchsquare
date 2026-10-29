'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.BENCHSQUARE_PLAYWRIGHT||'playwright');
(async()=>{
 const b=await chromium.launch({channel:process.env.BENCHSQUARE_BROWSER||'msedge',headless:true});
 const out=path.resolve(__dirname,'../.artifacts/submission-no-selftest');fs.mkdirSync(out,{recursive:true});
 try{
  const p=await b.newPage({viewport:{width:1600,height:1050}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  const base=process.env.DEMO_BASE||'http://127.0.0.1:4173/frontend/';
  await p.goto(base+'submission.html#new');
  assert.equal(await p.locator('.form-card').count(),4);assert.equal(await p.locator('[data-step]').count(),4);
  assert.equal(await p.locator('[data-upload]').count(),2);
  assert.equal(await p.locator('#f-model,#f-harness,#f-estimatedScore,[data-upload="evidence"]').count(),0);
  await p.evaluate(()=>{const f={...SubmissionModel.sample(),consent:true,terms:true,model:'LEGACY_MODEL',harness:'LEGACY_HARNESS',estimatedScore:'invalid-retired-value'};f.attachments.push({id:'retired-evidence',category:'evidence',name:'retired-selftest.log',source:'file',size:51*1024**3});const r={id:'legacy-task',status:'需修改',revision:1,form:f,history:[{revision:1,name:f.name,form:structuredClone(f)}],updatedAt:new Date().toISOString()};localStorage.setItem(SubmissionModel.config.storageKey,JSON.stringify({version:1,records:[r],work:{id:r.id,form:f,baseline:JSON.stringify(f)}}));});
  await p.reload();
  const read=()=>p.evaluate(()=>JSON.parse(localStorage.getItem(SubmissionModel.config.storageKey)));
  const oldHistory=JSON.stringify((await read()).records[0].history[0]);
  assert.equal(await p.locator('.warning').count(),0,'retired missing files do not require reselection');
  await p.locator('[data-do="preview"]').click();
  const preview=await p.locator('#preview-content').innerText();
  for(const text of ['LEGACY_MODEL','LEGACY_HARNESS','invalid-retired-value','retired-selftest.log','使用的模型','预估得分'])assert.ok(!preview.includes(text));
  await p.locator('#close-preview').click();await p.locator('[data-do="save"]').click();
  assert.equal(JSON.stringify((await read()).records[0].history[0]),oldHistory);
  await p.locator('[data-do="submit"]').click();await p.waitForURL(/#detail\//);
  assert.equal((await read()).records[0].revision,2);assert.equal(JSON.stringify((await read()).records[0].history[0]),oldHistory);
  assert.ok(!(await p.locator('.detail-content').innerText()).includes('retired-selftest.log'));
  await p.goto(base+'#data-dashboard');
  await p.locator('.dd-heading-actions [data-data="new"]').click();
  const frame=p.frameLocator('iframe[title="比赛数据提交表单"]');await frame.locator('#f-name').waitFor();
  assert.equal(await frame.locator('.form-card').count(),4);assert.equal(await frame.locator('[data-upload]').count(),2);
  await frame.locator('#f-domain').fill('代码工程 / 数据校验');await frame.locator('#f-software').fill('Python 3.12, pandas 2.2');
  await frame.locator('[name="os"][value="Linux"]').check();await frame.locator('[name="license"][value="免费或开源"]').check();
  await frame.locator('#f-description').fill('目标：核对合成数据并输出可复查报告。\n起始状态：提供 CSV 与字段说明。\n指令与规则：不得修改输入；输出 report.md 和 results.csv。');
  await frame.locator('#f-name').fill('data_validation_instance_1');
  await frame.locator('#f-verification').fill('# 成功验证标准\n- 必须交付 report.md 与 results.csv。\n- 主键、单位及必填字段完整；数值误差不超过 1e-6。\n- 缺少结果或错误处理缺失值判为失败。');
  for(const category of ['input','reference'])await frame.locator('[data-upload="'+category+'"]').setInputFiles({name:category+'.csv',mimeType:'text/csv',buffer:Buffer.from('id,value\n1,0.25\n2,0.75\n')});
  await frame.locator('[data-do="save"]').click();
  await frame.locator('#notice:not(.show)').waitFor({state:'attached'});
  for(const [id,section]of [['p05-form',1],['p06-files',2],['p07-verification',3],['p08-confirm',4]]){
   await frame.locator('#section-'+section).evaluate(e=>e.scrollIntoView({behavior:'instant',block:'start'}));
   await p.screenshot({path:path.join(out,id+'.png')});
  }
  assert.equal(await frame.locator('#section-4 h2').innerText(),'提交确认');
  assert.ok((await frame.locator('#progress-label').innerText()).includes('/ 4'));
  assert.ok(!(await frame.locator('body').innerText()).includes('难度自测'));
  await frame.locator('[data-do="preview"]').click();await p.screenshot({path:path.join(out,'p10-preview.png')});await frame.locator('#close-preview').click();
  const draftId=await p.evaluate(()=>JSON.parse(localStorage.getItem('benchsquare-submissions-v1')).records.find(r=>r.form.name==='data_validation_instance_1').id);
  await p.getByRole('button',{name:'关闭提交面板'}).click();
  await p.locator('[data-data="detail"][data-id="'+draftId+'"]').click();await frame.locator('.detail-meta').waitFor();
  await p.screenshot({path:path.join(out,'p10-detail.png')});
  await p.setViewportSize({width:390,height:844});
  assert.ok(await frame.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.screenshot({path:path.join(out,'mobile.png')});
  assert.deepEqual(errors,[]);
  console.log('Retired self-test UI passed: four sections, two upload categories, legacy evidence excluded from validation/preview, unchanged prior snapshot, save/resubmit, embedded form and mobile.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
