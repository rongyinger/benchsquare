'use strict';
(() => {
const api=window.expertCenter;
const identity=window.CompetitionIdentity;
const resumes=window.ResumeFiles;
const verificationContinuations=new WeakMap();
api.db.profiles ||= {};
api.db.accounts ||= {};
let anchor=null;
function show(html){modal(html);document.querySelector('#dialog').scrollTop=0;document.querySelector('#dialog-content').scrollTop=0;}
const fields=[['name','昵称',30],['field','专业方向',60],['organization','所属机构',80],['title','职业 / 身份',60],['skills','擅长技能',120],['bio','个人简介',400],['projects','项目经历',800]];
const get=id=>({name:api.names(id),field:'',organization:'',title:'',skills:'',bio:'',projects:'',available:true,...api.db.profiles[id]});
const button=(action,label,extra='')=>`<button type="button" class="button" data-expert="${action}" ${extra}>${label}</button>`;
function dismiss(focus=false){document.querySelector('.expert-menu')?.remove();document.querySelectorAll('[data-action="profile"]').forEach(b=>b.setAttribute('aria-expanded','false'));if(focus)anchor?.focus();}
function menu(b){if(document.querySelector('.expert-menu'))return dismiss(true);anchor=b;const p=get(api.uid());const el=document.createElement('div');el.className='expert-menu';el.setAttribute('aria-label','个人中心');const loggedOut=sessionStorage.getItem('expert-demo-out')==='yes';el.innerHTML=loggedOut?`<strong>尚未登录</strong><p>登录后管理你的专家名片</p>${button('login','使用演示身份登录')}`:`<div class="expert-menu-head"><span class="expert-avatar">${esc(p.name.slice(0,1))}</span><div><strong>${esc(p.name)}</strong><p>${esc(p.field||'完善专业方向，让队友了解你')}</p></div></div><button data-expert="card">我的专家名片 <span>↗</span></button><button data-expert="profile-page">个人资料 <span>›</span></button><button data-expert="notices">通知中心 <span>${api.unread()||'›'}</span></button><button data-expert="account">账号设置 <span>›</span></button>${window.competitionAdmin?.canEnter()?'<button data-expert="admin">管理后台 <span>↗</span></button>':''}<div class="expert-menu-separator"></div><button data-expert="logout">退出登录</button>`;document.body.append(el);const r=b.getBoundingClientRect();el.style.top=`${r.bottom+12}px`;el.style.right=`${Math.max(12,innerWidth-r.right)}px`;b.setAttribute('aria-expanded','true');el.querySelector('button')?.focus();}
function card(id=api.uid(),fromProfile=false) {const p=get(id),own=id===api.uid();show(`<div class="expert-card"><div class="expert-cover"><span>BENCHSQUARE / EXPERT</span><span>专家名片</span></div><div class="expert-card-body"><span class="expert-avatar large">${esc(p.name.slice(0,1))}</span><div class="expert-card-heading"><div><h2>${esc(p.name)}</h2><p>${esc([p.title,p.organization].filter(Boolean).join(' · ')||'职业与机构待补充')}</p></div><span class="expert-availability">${p.available?'愿意组队交流':'暂不寻找队友'}</span></div><div class="expert-tags">${[p.field,...p.skills.split(/[,，、]/)].filter(s=>s.trim()).map(s=>`<span>${esc(s.trim())}</span>`).join('')||'<span>专业方向待补充</span>'}</div><section><h3>关于我</h3><p class="expert-prose">${esc(p.bio||'还没有填写个人简介。')}</p></section><section><h3>项目经历</h3><p class="expert-prose">${esc(p.projects||'还没有添加项目经历。')}</p></section><p class="expert-card-note">以上资料由用户填写 · 联系方式不在名片中展示</p>${own?`<div class="expert-form-actions">${button('edit','编辑个人资料',fromProfile?'data-from-profile':'')}${fromProfile?button('profile-page','返回个人资料'):''}<small>其他参赛者会看到以上内容</small></div>`:''}</div></div>`);}
function edit(fromProfile=false){const p=get(api.uid());show(`<div class="expert-editor"><span class="expert-eyebrow">PERSONAL PROFILE</span><h2>让队友认识你的专业</h2><p>这些资料会展示在你的专家名片上。</p><form id="expert-profile-form" ${fromProfile?'data-from-profile':''}><div class="expert-fields">${fields.map(([k,label,max])=>`<label class="field ${['bio','projects','skills'].includes(k)?'wide':''}">${label}${k==='name'?' *':''}${['bio','projects'].includes(k)?`<textarea name="${k}" maxlength="${max}" rows="${k==='projects'?4:3}" placeholder="${k==='bio'?'介绍你的研究方向、专业经验与希望参与的工作':'介绍项目背景、你的职责与成果'}">${esc(p[k])}</textarea>`:`<input name="${k}" maxlength="${max}" value="${esc(p[k])}" ${k==='name'?'required':''} placeholder="${k==='skills'?'用逗号分隔，例如：材料分析、实验设计、Python':'请输入'+label}">`}</label>`).join('')}</div><label class="check"><input type="checkbox" name="available" ${p.available?'checked':''}>愿意组队交流</label><div class="expert-form-actions"><button class="button dark" type="submit">保存并预览名片</button>${button(fromProfile?'profile-page':'card','取消')}</div><p class="expert-card-note">当前为本地原型，资料保存在此浏览器中。</p></form></div>`);}
function account(){const a=api.db.accounts[api.uid()]||{};show(`<span class="expert-eyebrow">ACCOUNT</span><h2>账号设置</h2><p>管理私人联系方式和通知偏好。</p><div class="info-row"><span>登录方式</span><b>本地演示身份</b></div><form id="expert-account-form"><label class="field">联系邮箱（仅自己可见）<input type="email" name="email" value="${esc(a.email||'')}" maxlength="120" placeholder="name@example.com"></label><label class="field">联系电话（仅自己可见）<input type="tel" name="phone" value="${esc(a.phone||'')}" maxlength="30" placeholder="选填"></label><label class="check"><input type="checkbox" name="digest" ${a.digest?'checked':''}>接收赛事动态邮件</label><p class="expert-card-note">此版仅保存联系方式与偏好；邮箱验证、账号绑定和邮件发送待接入。</p><div class="expert-form-actions"><button class="button dark" type="submit">保存设置</button></div></form>`);}
function decorate(){document.querySelectorAll('.profile').forEach(b=>{b.setAttribute('aria-haspopup','true');b.firstChild.textContent=sessionStorage.getItem('expert-demo-out')==='yes'?'登':api.names(api.uid()).slice(0,1);});document.querySelectorAll('#main .participation-row, #main .participation-card').forEach(row=>{const strong=row.querySelector('strong');if(!strong||row.querySelector('[data-expert="person"]'))return;const user=api.users.find(u=>strong.textContent.replace('（我）','').trim()===api.names(u.id));if(user)strong.insertAdjacentHTML('afterend',` <button class="expert-person-link" data-expert="person" data-user="${user.id}">查看名片</button>`);});}

function openProfile({competitionId='',verifyAfterLogin=false,resumeAfterLogin=false,onLogin}={}){
 if(sessionStorage.getItem('expert-demo-out')==='yes'){
  const context=`data-profile-login ${verifyAfterLogin?'data-verify':''} ${resumeAfterLogin?'data-resume-login':''} data-competition="${esc(competitionId)}"`;
  show(`<div class="expert-profile"><h2 id="expert-profile-dialog-title" tabindex="-1">个人资料</h2>
   <p>请登录演示身份后查看个人资料。</p>${button('login','使用演示身份登录',context)}</div>`);
  if(onLogin)verificationContinuations.set($('[data-profile-login]'),onLogin);
  $('#expert-profile-dialog-title').focus();
  return;
 }
 const user=api.uid(),p=get(user),verified=Boolean(identity.verifiedAt(api.db,user));
 const profileDetails=[p.field,p.title,p.organization].filter(Boolean).join(' · ');
 const description=verified?'你的账号已通过实名认证。':'平台赛事报名需要完成实名认证。';
 show(`<div class="expert-profile" data-expert-profile-actor="${esc(user)}">
  <h2 id="expert-profile-dialog-title" tabindex="-1">个人资料</h2>
  <p class="expert-profile-name">${esc(p.name)}</p>
  <div class="expert-profile-panels">
   <section class="panel expert-identity-panel" aria-labelledby="profile-identity-title">
    <div class="expert-identity-heading">
     <h3 id="profile-identity-title">实名认证</h3>
     <span class="badge ${verified?'green':'orange'}">${verified?'已认证':'未认证'}</span>
    </div>
    <p>${description}</p>
    ${verified?'':`<div class="expert-form-actions"><button type="button" class="button dark" data-expert="profile-verify" data-competition="${esc(competitionId)}">开始实名认证</button></div>`}
   </section>
   <section class="panel" aria-labelledby="profile-resume-title">
    <div class="expert-identity-heading">
     <h3 id="profile-resume-title">参赛简历</h3>
     <span class="badge" data-resume-status role="status">读取中</span>
    </div>
    <p class="expert-resume-filename" data-resume-filename>报名比赛前需上传简历。</p>
    <div class="expert-form-actions">${button('profile-resume','上传简历')}</div>
   </section>
   <section class="panel" aria-labelledby="profile-card-title">
    <h3 id="profile-card-title">专家名片</h3>
    ${profileDetails?`<p>${esc(profileDetails)}</p>`:''}
    <div class="expert-form-actions">${button('edit','编辑个人资料','data-from-profile')}${button('card','预览专家名片','data-from-profile')}</div>
   </section>
  </div>
 </div>`);
 $('#expert-profile-dialog-title').focus();
 const resumePanel=$('#profile-resume-title').closest('section');
 resumes.get(user).then(record=>{
  if(!resumeViewActive(resumePanel,user))return;
  showResumeStatus(resumePanel,record,'报名比赛前需上传简历。');
  if(record)resumePanel.querySelector('[data-expert="profile-resume"]').textContent='更换简历';
 }).catch(()=>{
  if(resumeViewActive(resumePanel,user))resumePanel.querySelector('[data-resume-status]').textContent='读取失败';
 });
}

function resumeViewActive(view,user){
 return view.isConnected&&$('#dialog').open&&api.uid()===user&&sessionStorage.getItem('expert-demo-out')!=='yes';
}

function showResumeStatus(view,record,emptyMessage){
 const badge=view.querySelector('[data-resume-status]');
 badge.classList.toggle('green',Boolean(record));
 badge.classList.toggle('orange',!record);
 badge.textContent=record?'已上传':'未上传';
 view.querySelector('[data-resume-filename]').textContent=record?.file.name||emptyMessage;
}

async function openResume({onSubmit,onBack,initialError=''}={}){
 if(sessionStorage.getItem('expert-demo-out')==='yes')return openProfile({resumeAfterLogin:true});
 const user=api.uid();
 show(`<div class="expert-resume" data-expert-profile-actor="${esc(user)}">
  <button type="button" class="text-link expert-verification-back" ${onBack?'data-resume-back':'data-expert="profile-page"'}><span aria-hidden="true">←</span> ${onBack?'返回报名规则':'返回个人资料'}</button>
  <h2 id="expert-resume-title" tabindex="-1">${onSubmit?'我的简历':'上传简历'}</h2>
  <p>${onSubmit?'请确认用于本次报名的简历。已有简历会自动带出。':'上传后的简历可用于后续比赛报名。'}</p>
  <div class="expert-resume-current">
   <span class="badge" data-resume-status role="status">读取中</span>
   <span class="expert-resume-filename" data-resume-filename></span>
   <button type="button" class="text-link" data-resume-preview aria-expanded="false" aria-controls="expert-resume-preview" hidden>预览简历</button>
  </div>
  <div id="expert-resume-preview" class="expert-resume-preview" hidden></div>
  <form id="expert-resume-form">
   <fieldset disabled>
    <label class="field">简历文件
     <input type="file" name="resume" accept=".pdf,.doc,.docx" required aria-describedby="expert-resume-formats expert-resume-error">
    </label>
    <p class="expert-resume-hint" id="expert-resume-formats">支持 PDF、DOC、DOCX，文件最大 10 MB。</p>
    <p class="error" id="expert-resume-error" role="alert">${esc(initialError)}</p>
    <p class="expert-resume-feedback" role="status"></p>
    <div class="expert-form-actions">
     <button class="button ${onSubmit?'':'dark'}" type="submit">上传简历</button>
     ${onSubmit?'<button class="button dark" type="button" data-resume-confirm disabled>确认提交</button>':''}
    </div>
   </fieldset>
  </form>
  <p class="expert-card-note">当前演示将简历保存在此浏览器中。</p>
 </div>`);
 const form=$('#expert-resume-form'),view=form.closest('.expert-resume');
 const fields=form.querySelector('fieldset'),input=form.elements.resume;
 const error=form.querySelector('.error'),feedback=form.querySelector('.expert-resume-feedback');
 const upload=form.querySelector('[type="submit"]'),confirm=form.querySelector('[data-resume-confirm]');
 const previewButton=view.querySelector('[data-resume-preview]'),preview=view.querySelector('#expert-resume-preview');
 const active=()=>resumeViewActive(view,user);
 let record=null,previewUrl='';
 function clearPreview(){
  if(previewUrl)URL.revokeObjectURL(previewUrl);
  previewUrl='';
  preview.replaceChildren();
  preview.hidden=true;
  previewButton.setAttribute('aria-expanded','false');
  previewButton.textContent='预览简历';
 }
 function display(next){
  clearPreview();
  record=next;
  showResumeStatus(view,record,'请上传参赛简历');
  upload.textContent=record?'保存新简历':'上传简历';
  previewButton.hidden=!record;
  if(confirm)confirm.disabled=!record;
 }
 const dialog=$('#dialog'),observer=new MutationObserver(()=>{
  if(active())return;
  clearPreview();
  observer.disconnect();
 });
 observer.observe($('#dialog-content'),{childList:true});
 observer.observe(dialog,{attributes:true,attributeFilter:['open']});
 previewButton.addEventListener('click',()=>{
  if(!record||!active())return;
  if(!preview.hidden)return clearPreview();
  const {file}=record,pdf=/\.pdf$/i.test(file.name);
  previewUrl=URL.createObjectURL(pdf?new Blob([file],{type:'application/pdf'}):file);
  if(pdf){
   const frame=document.createElement('iframe');
   frame.title='简历 PDF 预览';
   frame.src=previewUrl;
   preview.append(frame);
  }else{
   const note=document.createElement('p');
   note.textContent='请下载 Word 文件，在本地查看简历。';
   preview.append(note);
  }
  const download=document.createElement('a');
  download.href=previewUrl;
  download.download=file.name;
  download.textContent='下载简历';
  preview.append(download);
  preview.hidden=false;
  previewButton.setAttribute('aria-expanded','true');
  previewButton.textContent='收起预览';
 });
 $('#expert-resume-title').focus();
 view.querySelector('[data-resume-back]')?.addEventListener('click',()=>{if(active())onBack();});
 confirm?.addEventListener('click',async()=>{
  if(!active()||fields.disabled||!record)return;
  fields.disabled=true;
  try{await onSubmit();}
  finally{fields.disabled=false;}
 });
 input.addEventListener('change',()=>{
  error.textContent='';
  feedback.textContent='';
  input.removeAttribute('aria-invalid');
  if(confirm)confirm.disabled=!record||input.files.length>0;
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(fields.disabled||!active())return;
  fields.disabled=true;
  error.textContent='';
  input.removeAttribute('aria-invalid');
  feedback.textContent='正在上传简历…';
  try{
   const saved=await resumes.save(user,input.files[0]);
   if(!active())return;
   display(saved);
   form.reset();
   feedback.textContent='简历已上传。';
  }catch(err){
   if(!active())return;
   feedback.textContent='';
   error.textContent=err?.message||'简历上传失败，请重试。';
   input.setAttribute('aria-invalid','true');
  }finally{
   fields.disabled=false;
  }
  if(confirm&&!confirm.disabled&&!error.textContent)confirm.focus();
 });
 try{
  const record=await resumes.get(user);
  if(active())display(record);
 }catch{
  if(active()){
   view.querySelector('[data-resume-status]').textContent='读取失败';
   error.textContent='暂时无法读取简历，请重试或重新上传。';
  }
 }finally{
  fields.disabled=false;
 }
}

function openVerification(competitionId='',registration){
 if(sessionStorage.getItem('expert-demo-out')==='yes')return openProfile({competitionId,verifyAfterLogin:true});
 const user=api.uid();
 if(identity.verifiedAt(api.db,user)){
  if(registration)return registration.onVerified();
  return openProfile({competitionId});
 }
 show(`<div class="expert-verification" data-expert-profile-actor="${esc(user)}">
  <button type="button" class="text-link expert-verification-back" data-expert="profile-back" data-competition="${esc(competitionId)}"><span aria-hidden="true">←</span> 返回${registration?'我的简历':''}</button>
  <h2 id="expert-verification-title" tabindex="-1">实名认证</h2>
  ${registration?'<p>完成实名认证后，将继续提交本次报名。</p>':competitionId?'<p>请先完成实名认证，再报名赛事。</p>':''}
  <form id="expert-identity-form" data-actor="${esc(user)}" data-competition="${esc(competitionId)}">
   ${identity.fields()}
   <div class="error" role="alert"></div>
   <button class="button dark" type="submit">立即核验</button>
  </form>
 </div>`);
 if(registration)verificationContinuations.set($('#expert-identity-form'),registration);
 $('#expert-verification-title').focus();
}

function finishIdentity(form){
 const competition=find(form.dataset.competition),registration=verificationContinuations.get(form);
 if(registration)return registration.onVerified();
 if(competition){
  close();
  go('#competition/'+competition.id);
  toast('实名认证已通过。');
  $('#main .detail-heading [data-action="register"], #main .detail-heading [data-action="team"]')?.focus({preventScroll:true});
 }else openProfile();
}

function openRegistrationResume({id,actor,onBack,canSubmit,onSubmit}){
 const route=location.hash,dialog=$('#dialog');
 const sameEntry=()=>location.hash===route&&api.uid()===actor;
 const showResume=initialError=>{
  if(sameEntry()&&dialog.open)openResume({onBack,onSubmit:confirm,initialError});
 };
 let submitting=false;
 async function confirm(){
  if(submitting||!sameEntry()||!dialog.open||!canSubmit())return;
  const content=$('#dialog-content').firstElementChild;
  const isCurrent=()=>sameEntry()&&dialog.open&&$('#dialog-content').firstElementChild===content&&sessionStorage.getItem('expert-demo-out')!=='yes';
  submitting=true;
  try{
   let record;
   try{record=await resumes.get(actor);}
   catch{if(isCurrent())showResume('暂时无法读取简历，请重试。');return;}
   if(!isCurrent()||!canSubmit())return;
   if(!record)return showResume('请上传参赛简历后再提交。');
   if(!identity.verifiedAt(api.db,actor))return openVerification(id,{onBack:()=>showResume(),onVerified:confirm});
   onSubmit();
  }finally{submitting=false;}
 }
 if(sessionStorage.getItem('expert-demo-out')==='yes')return openProfile({onLogin:()=>showResume()});
 showResume();
}

function submitIdentity(form){
 const user=api.uid(),error=form.querySelector('.error');
 if(form.dataset.actor!==user||sessionStorage.getItem('expert-demo-out')==='yes'){
  error.textContent='演示身份已变化，请重新进入个人资料。';
  return;
 }
 if(identity.verifiedAt(api.db,user))return finishIdentity(form);
 const data=new FormData(form);
 const name=String(data.get('realName')||'').trim();
 const number=String(data.get('idNumber')||'').trim().toUpperCase();
 error.textContent=identity.verifyDemo(name,number);
 if(error.textContent)return;
 const previous=api.db.accounts[user];
 api.db.accounts[user]={...previous,realNameVerifiedAt:Date.now()};
 if(!persist()){
  if(previous)api.db.accounts[user]=previous;
  else delete api.db.accounts[user];
  return;
 }
 form.reset();
 finishIdentity(form);
}

document.addEventListener('submit',e=>{
 if(e.target.id!=='expert-identity-form')return;
 e.preventDefault();
 e.stopImmediatePropagation();
 submitIdentity(e.target);
},true);
$('#dialog').addEventListener('close',()=>{if(!$('#dialog').open)$('#expert-identity-form')?.reset();});
window.expertProfile={openVerification};
api.openResume=openResume;
api.openRegistrationResume=openRegistrationResume;

function restoreProfileLink(){
 const [root,section,id]=location.hash.slice(1).split('/');
 if(root!=='profile')return;
 const verify=section==='verification',competition=verify&&id&&find(id);
 history.replaceState(null,'',competition?'#competition/'+competition.id:'#discover');
 render();
 if(verify)openVerification(competition?.id);
 else if(section==='resume')openResume();
 else openProfile();
}

window.addEventListener('click',e=>{
 const profile=e.target.closest('[data-action="profile"]');
 const b=e.target.closest('[data-expert]');
 if(profile){e.preventDefault();e.stopImmediatePropagation();return menu(profile);}
 const inMenu=!!e.target.closest('.expert-menu');
 if(!inMenu)dismiss();
 if(!b)return;
 e.preventDefault();
 e.stopImmediatePropagation();
 const action=b.dataset.expert,fromProfile=b.hasAttribute('data-from-profile');
 dismiss(inMenu&&action==='profile-page');
 switch(action){
  case 'profile-page':openProfile();break;
  case 'profile-verify':openVerification(b.dataset.competition);break;
  case 'profile-resume':openResume();break;
  case 'profile-back':{
   const registration=verificationContinuations.get($('#expert-identity-form'));
   if(registration)registration.onBack();
   else openProfile({competitionId:b.dataset.competition});
   break;
  }
  case 'admin':close();go('#admin');break;
  case 'card':card(api.uid(),fromProfile);break;
  case 'person':card(b.dataset.user);break;
  case 'edit':edit(fromProfile);break;
  case 'account':account();break;
  case 'notices':api.notices();break;
  case 'demo':api.demoSettings();break;
  case 'logout':
   show(`<h2>退出当前演示身份？</h2><p>本地资料和参赛记录会保留。此原型尚未接入真实账号登录。</p><div class="expert-form-actions">${button('confirm-logout','退出演示')}${button('cancel','取消')}</div>`);
   break;
  case 'confirm-logout':
   sessionStorage.setItem('expert-demo-out','yes');close();render();toast('已退出演示，可点击头像重新进入。');
   break;
  case 'login':
   sessionStorage.removeItem('expert-demo-out');
   render();
   if(verificationContinuations.has(b))verificationContinuations.get(b)();
   else if(b.hasAttribute('data-verify'))openVerification(b.dataset.competition);
   else if(b.hasAttribute('data-resume-login'))openResume();
   else if(b.hasAttribute('data-profile-login'))openProfile({competitionId:b.dataset.competition});
   else toast('已进入演示身份');
   break;
  case 'cancel':close();break;
 }
},true);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.expert-menu')){e.preventDefault();dismiss(true);}});
window.addEventListener('resize',()=>dismiss());window.addEventListener('hashchange',()=>{dismiss();restoreProfileLink();});
document.addEventListener('submit',e=>{if(!['expert-profile-form','expert-account-form'].includes(e.target.id))return;e.preventDefault();const data=new FormData(e.target);if(e.target.id==='expert-profile-form'){const p=Object.fromEntries(fields.map(([k,,max])=>[k,String(data.get(k)||'').trim().slice(0,max)]));if(!p.name)return toast('请填写昵称');p.available=data.has('available');api.db.profiles[api.uid()]=p;api.save();render();card(api.uid(),e.target.hasAttribute('data-from-profile'));toast('专家名片已保存');}else{api.db.accounts[api.uid()]={...api.db.accounts[api.uid()],email:String(data.get('email')||'').trim(),phone:String(data.get('phone')||'').trim(),digest:data.has('digest')};api.save();toast('账号设置已保存');}});
document.querySelector('.sidebar-foot')?.insertAdjacentHTML('afterend','<button class="expert-demo-link" data-expert="demo">演示设置</button>');
const previous=render;render=function(){previous();decorate();};decorate();restoreProfileLink();
})();
