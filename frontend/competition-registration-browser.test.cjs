'use strict';

const assert=require('node:assert/strict');
const {chromium}=require(process.env.BENCHSQUARE_PLAYWRIGHT||'playwright');
const base=process.env.DEMO_BASE||'http://127.0.0.1:4173/frontend/';
const first='identity-verification-demo',second='resume-reuse-test';
const resume={name:'参赛简历.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nTest resume')};

(async()=>{
 const browser=await chromium.launch({channel:process.env.BENCHSQUARE_BROWSER||'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const dialog=page.locator('#dialog');
  const signup=dialog.locator('#competition-registration-form');
  const upload=dialog.locator('#expert-resume-form');
  const identity=dialog.locator('#expert-identity-form');
  const button=(scope,name)=>scope.getByRole('button',{name,exact:true});
  const next=button(signup,'下一步');
  const confirm=button(upload,'确认提交');
  const rules=signup.getByRole('checkbox');
  const start=()=>button(page.locator('.detail-heading'),'报名参加比赛').click();
  const closeDialog=()=>button(dialog,'关闭').click();
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ale-frontend-v1')).participation);
  const profile=async()=>{
   await page.locator('.site-header [data-action="profile"]').click();
   await page.locator('.expert-menu [data-expert="profile-page"]').click();
  };
  const finishVerification=async()=>{
   await identity.getByLabel('姓名',{exact:true}).fill('演示用户');
   await identity.getByLabel('身份证号码',{exact:true}).fill('000000200001010010');
   await button(identity,'立即核验').click();
  };
  const uploadResume=async file=>{
   await upload.getByLabel('简历文件').setInputFiles(file);
   await upload.locator('[type="submit"]').click();
  };
  const continueToTeam=async()=>{
   const group=page.locator('#event-contact-dialog[open]');
   if(await page.evaluate(()=>Boolean(window.EventContact))){
    await group.waitFor();
    await button(group,'继续组队').click();
   }
   await page.getByRole('heading',{name:'报名成功，继续完成组队'}).waitFor();
  };

  await page.goto(base+'#competition/'+first);
  await start();
  await signup.getByText('提交参赛简历并完成实名认证。').waitFor();
  await next.click();
  assert.equal(await upload.count(),0);
  await rules.check();
  await next.click();
  await upload.waitFor();
  assert.equal(await confirm.isEnabled(),false);
  assert.equal(await identity.count(),0);
  await button(dialog,'返回报名规则').click();
  assert.equal(await rules.isChecked(),true);
  await next.click();

  await uploadResume({name:'简历.txt',mimeType:'text/plain',buffer:Buffer.from('unsupported')});
  await upload.getByRole('alert').getByText('请上传 PDF、DOC 或 DOCX 格式的简历。').waitFor();
  assert.equal(await confirm.isEnabled(),false);
  await uploadResume(resume);
  await dialog.getByText(resume.name,{exact:true}).waitFor();
  await button(dialog,'预览简历').click();
  await dialog.getByTitle('简历 PDF 预览').waitFor();
  assert.equal((await read()).regs[first].rong,undefined,'uploading alone must not register the user');
  await confirm.click();
  await identity.waitFor();
  assert.equal((await read()).accounts.rong?.realNameVerifiedAt,undefined);
  assert.equal((await read()).regs[first].rong,undefined);
  await button(dialog,'返回我的简历').click();
  await dialog.getByText(resume.name,{exact:true}).waitFor();
  await confirm.click();
  await identity.waitFor();
  // The form reads the current attachment again when verification resumes submission.
  await page.evaluate(()=>{
   const get=ResumeFiles.get;
   ResumeFiles.get=actor=>{ResumeFiles.get=get;return Promise.resolve(null);};
  });
  await finishVerification();
  await upload.getByText('请上传参赛简历后再提交。').waitFor();
  assert.equal((await read()).regs[first].rong,undefined);
  assert.ok((await read()).accounts.rong.realNameVerifiedAt);
  await confirm.click();
  await continueToTeam();
  assert.ok((await read()).regs[first].rong);
  await page.locator('[data-event-community] .ec-community-qr img').waitFor();

  await profile();
  await dialog.getByText(resume.name,{exact:true}).waitFor();
  await button(dialog,'更换简历').click();
  const updated={...resume,name:'更新版简历.pdf'};
  await uploadResume(updated);
  await dialog.getByText(updated.name,{exact:true}).waitFor();
  await closeDialog();

  await page.evaluate(({first,second})=>{
   const source=state.competitions.find(c=>c.id===first);
   state.competitions.push({...source,id:second,values:{...source.values,name:'简历复用测试赛'}});
   persist();
  },{first,second});
  await page.goto(base+'#competition/'+second);
  await page.reload();
  assert.deepEqual(await page.evaluate(async()=>{
   const {file}=await ResumeFiles.get('rong');
   return {name:file.name,text:await file.text(),otherResume:await ResumeFiles.get('xu')};
  }),{name:updated.name,text:resume.buffer.toString(),otherResume:null});
  await start();
  await rules.check();
  await next.click();
  await dialog.getByText(updated.name,{exact:true}).waitFor();
  await confirm.click();
  await continueToTeam();

  await page.locator('[data-expert="demo"]').click();
  await page.locator('#participation-user').selectOption('xu');
  await button(dialog,'应用演示设置').click();
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'#competition/'+first);
  await start();
  await rules.check();
  await next.click();
  await upload.waitFor();
  assert.equal((await read()).accounts.xu?.realNameVerifiedAt,undefined);
  assert.equal(await confirm.isEnabled(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await uploadResume(resume);
  await confirm.click();
  await identity.waitFor();
  await closeDialog();
  assert.equal((await read()).regs[first].xu,undefined);
  await page.goto(base+'#profile/resume');
  await upload.waitFor();
  await uploadResume(updated);
  await dialog.getByText(updated.name,{exact:true}).waitFor();
  assert.equal(await confirm.count(),0);
  assert.equal((await read()).regs[first].xu,undefined);
  assert.deepEqual(errors,[]);
  console.log('Competition registration passed: identity and resume gates, validation, confirmation, persistence, reuse, account isolation and mobile.');
 }finally{
  await browser.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
