'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require(process.env.BENCHSQUARE_PLAYWRIGHT||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:process.env.BENCHSQUARE_BROWSER||'chrome'});
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  const pageErrors=[],external=[];page.on('pageerror',e=>pageErrors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:4173/'))external.push(r.url());});
  let dialogs=0,acceptDialog=false;page.on('dialog',async d=>{dialogs++;await (acceptDialog?d.accept():d.dismiss());});
  async function loadFixture(target){await target.evaluate(()=>{const key=SubmissionModel.config.storageKey,s=JSON.parse(localStorage.getItem(key)||'{"version":1,"records":[],"work":null}'),p=new URLSearchParams(location.search),work={id:s.work?.id||null,form:SubmissionModel.sample(),baseline:JSON.stringify(SubmissionModel.sample())};if(p.has('competition')){const k=p.get('competition')+':'+p.get('team')+':'+WorkbenchModel.read().participation.active;s.workspaces={...s.workspaces,[k]:work};}else s.work=work;localStorage.setItem(key,JSON.stringify(s));});await target.reload();}
  const click=action=>page.locator(`[data-do="${action}"]`).click();
  const record=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('benchsquare-submissions-v1')));
  const file=(name,text)=>({name,mimeType:'text/plain',buffer:Buffer.from(text)});
  try{
    await page.goto('http://127.0.0.1:4173/frontend/submission.html#new');
    assert.equal(await page.title(),'提交任务 · Benchsquare');
    assert.equal(await page.locator('[data-do="submit"]').isDisabled(),true);await page.locator('#f-consent').check();await page.locator('#f-terms').check();await click('submit');assert.equal(await page.locator('.error:not(:empty)').count(),7);assert.equal(await page.locator('#f-name').evaluate(e=>e===document.activeElement),true);
    await click('save');assert.equal((await record()).records[0].status,'草稿');assert.equal((await record()).records[0].form.name,'');
    await page.locator('#f-name').fill('未保存任务');await page.locator('a[data-nav="list"]').click();assert.ok((await page.url()).endsWith('#new'));assert.equal(dialogs,1);
    acceptDialog=true;await loadFixture(page);assert.equal(await page.locator('[name="os"]:checked').inputValue(),'Linux');
    await page.screenshot({path:path.join(__dirname,'submission-desktop-preview.png'),fullPage:true});
    await page.locator('[data-category="input"]').evaluate(el=>{const dt=new DataTransfer();const large=new File(['x'],'too-large.bin');Object.defineProperty(large,'size',{value:50*1024**3+1});dt.items.add(large);el.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:dt}));});
    assert.equal(await page.locator('.file-list li').count(),3);assert.ok((await page.locator('#notice').innerText()).includes('超过 50 GB'));
    for(const [category,name]of [['input','input.txt'],['input','starter.txt'],['reference','secret.txt']])await page.locator(`[data-upload="${category}"]`).setInputFiles(file(name,category));
    assert.equal(await page.locator('.file-list li').count(),6);
    await page.locator('[data-remove="sample-input"]').click();assert.equal(await page.locator('.file-list li').count(),5);
    // Exercise actual drop event and a multi-file selection without reading source task files.
    await page.locator('[data-category="input"]').evaluate(el=>{const dt=new DataTransfer();dt.items.add(new File(['drop'],'drag.txt',{type:'text/plain'}));el.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:dt}));});
    await page.locator('[data-upload="reference"]').setInputFiles([file('a.txt','a'),file('b.txt','b')]);
    assert.equal(await page.locator('.file-list li').count(),8);
    await page.locator('#f-cloudLink').fill('https://drive.google.com/file/d/SHOULD_STAY_PRIVATE/view');
    await page.locator('#f-verification').fill('# 100 分\n- **正确性：100 分**\n<img src=x onerror="window.xss=1">');await click('md-preview');assert.equal(await page.locator('#markdown-preview img').count(),0);assert.ok((await page.locator('#markdown-preview').innerText()).includes('<img'));await click('md-edit');
    await click('preview');assert.equal(await page.locator('#preview-content .preview-section').first().getByText('私有标记 SHOULD_STAY_PRIVATE').count(),0);assert.ok((await page.locator('#preview-content .private-section').innerText()).includes('secret.txt'));assert.equal(await page.locator('#preview-content .preview-section').first().getByText('secret.txt').count(),0);await page.locator('#close-preview').click();
    await click('save');await page.reload();assert.ok((await page.locator('.warning').innerText()).includes('重新选择'));await page.locator('#f-consent').check();await page.locator('#f-terms').check();await click('submit');assert.ok((await page.locator('#err-attachments').innerText()).includes('部分附件'));
    const unavailable=(await record()).work.form.attachments.filter(a=>a.source==='file');for(const a of unavailable){if(['input.txt','starter.txt','secret.txt'].includes(a.name))await page.locator(`[data-upload="${a.category}"]`).setInputFiles(file(a.name,a.category));else await page.locator(`[data-remove="${a.id}"]`).click();}
    await page.locator('[data-do="submit"]').evaluate(b=>{b.click();b.click();});await page.waitForURL(/#detail\//);let saved=await record();assert.equal(saved.records.length,1);assert.equal(saved.records[0].revision,1);assert.equal(saved.records[0].status,'待初审');assert.ok(saved.records[0].number.startsWith('BS-'));assert.equal(saved.work,null);
    await page.locator('.review-simulator summary').click();await page.locator('#review-note').fill('请补充验证依据');await click('review:'+saved.records[0].id+':revise');assert.equal((await record()).records[0].status,'需修改');
    await page.locator('a[data-nav="list"]').click();await page.locator('tbody tr').waitFor();assert.equal(await page.locator('tbody tr').count(),1);await page.locator('#status-filter').selectOption('草稿');assert.ok((await page.locator('tbody').innerText()).includes('没有该状态'));await page.locator('#status-filter').selectOption('全部');await page.locator('tbody tr a').first().click();
    await click('edit:'+saved.records[0].id);await page.locator('#f-name').fill('data_audit_instance_2');await click('submit');await page.waitForURL(/#detail\//);saved=await record();assert.equal(saved.records.length,1);assert.equal(saved.records[0].revision,2);assert.equal(saved.records[0].history.length,2);assert.equal(saved.records[0].form.name,'data_audit_instance_2');
    await page.reload();assert.ok((await page.locator('.warning').innerText()).includes('仅保留'));assert.equal(await page.locator('img').count(),0);
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(__dirname,'submission-mobile-detail-preview.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await click('edit:'+saved.records[0].id);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(__dirname,'submission-mobile-preview.png'),fullPage:true});
    // Storage write failure may not be reported as success or create a record.
    await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError');};});const before=await record();await click('save');assert.ok((await page.locator('#notice').innerText()).includes('未保存'));assert.deepEqual((await record()).records,before.records);
    assert.deepEqual(pageErrors,[]);assert.deepEqual(external,[]);
    const legacyContext=await browser.newContext(),legacy=await legacyContext.newPage();legacy.on('dialog',d=>d.accept());
    await legacy.goto('http://127.0.0.1:4173/frontend/submission.html#new');
    await legacy.evaluate(()=>{const form={name:'旧版任务',domain:'科学',software:'Python',os:['macOS','Linux'],license:'免费或开源',description:'原任务说明',verification:'原验证标准',requirements:'旧字段保留',consent:true,attachments:[{id:'legacy-project',name:'starter.zip',category:'project',source:'placeholder',size:0}]};localStorage.setItem('benchsquare-submissions-v1',JSON.stringify({version:1,records:[{id:'legacy-id',status:'草稿',form,history:[],updatedAt:new Date().toISOString()}],work:{id:'legacy-id',form,baseline:JSON.stringify(form)}}));});
    await legacy.reload();assert.equal(await legacy.locator('#f-name').inputValue(),'旧版任务');
    assert.equal(await legacy.locator('[name="os"]:checked').inputValue(),'MacOS');
    assert.equal(await legacy.locator('#f-terms').isChecked(),false);
    assert.equal(await legacy.locator('[data-category="input"]').locator('..').getByText('starter.zip',{exact:true}).count(),1);
    await legacy.locator('[data-do="save"]').click();
    const migrated=await legacy.evaluate(()=>JSON.parse(localStorage.getItem('benchsquare-submissions-v1')));
    assert.equal(migrated.records[0].form.requirements,'旧字段保留');assert.equal(migrated.records[0].form.attachments[0].category,'input');assert.equal(migrated.records[0].form.terms,false);
    await legacyContext.close();
    const plainContext=await browser.newContext(),plain=await plainContext.newPage();await plain.goto('http://127.0.0.1:4173/frontend/submission.html#new');await loadFixture(plain);// Remove from a fresh locator each time after render.
    while(await plain.locator('[data-remove]').count())await plain.locator('[data-remove]').first().click();
    await plain.locator('[name="os"][value="Windows"]').check();await plain.locator('#f-consent').check();await plain.locator('#f-terms').check();await plain.locator('[data-do="submit"]').click();await plain.waitForURL(/#detail\//);const plainStore=await plain.evaluate(()=>JSON.parse(localStorage.getItem('benchsquare-submissions-v1')));assert.equal(plainStore.records[0].form.attachments.length,0);assert.deepEqual(plainStore.records[0].form.os,['Windows']);await plainContext.close();
    console.log('Browser passed: empty drafts, required validation/focus, leave guards, three attachment classes, removal/drop/multi-file, safe Markdown, privacy preview, refresh/reselect, duplicate prevention, submission/detail, pending simulation, list/filter, edit/resubmit/history, storage failure, mobile layout. No external requests.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
