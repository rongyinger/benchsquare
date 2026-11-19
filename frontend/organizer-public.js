(() => {
  'use strict';
  const M=OrganizerMocks,previous=render;
  const homeTabs=['概览','参赛规则','赛程与奖励'];
  const store=()=>window.OrganizerDemoStore;
  const manageHref=id=>'#organizer-teams/'+encodeURIComponent(id);
  function date(value){
    if(!value)return '待确定';
    const n=typeof value==='number'?value:Date.parse(value);
    return Number.isFinite(n)?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(n):'待确定';
  }
  function stage(label){
    const tone=label==='进行中'?'green':label==='报名中'?'blue':label==='审核补正中'||label==='待公示'?'amber':'neutral';
    return `<span class="op-phase op-${tone}">${esc(label)}</span>`;
  }
  function valuesFor(event){
    const raw=event.values||{},profile=typeof demoTaskProfiles!=='undefined'?(demoTaskProfiles[raw.domain]||{}):{};
    return competitionValues({id:event.id,title:event.title,org:event.organizer,values:{
      topic:profile.topic,boundary:profile.boundary,environment:profile.environment,formats:profile.formats,
      ...raw
    }});
  }
  function overview(values){return `<section class="op-overview" aria-label="赛事概览"><div class="op-overview-heading"><span class="op-kicker">ABOUT THE CHALLENGE</span><h2>关于这场挑战</h2></div><p class="op-description">${esc(values.description||'赛事简介尚未填写。')}</p>${values.topic?'<p class="op-topic">'+esc(values.topic)+'</p>':''}<div class="op-requirements"><article><span class="op-step-number">01</span><h3>任务范围</h3><p>${esc(values.boundary||values.materials||'任务范围尚未填写。')}</p></article><article><span class="op-step-number">02</span><h3>提交材料</h3><p>${esc(values.materials||'提交材料要求尚未填写。')}</p>${values.formats?'<p class="op-secondary-copy">'+esc(values.formats)+'</p>':''}</article><article><span class="op-step-number">03</span><h3>验证与验收</h3><p>${esc(values.acceptance||'验收标准尚未填写。')}</p></article></div>${values.environment?'<section class="op-environment"><h3>运行环境与依赖</h3><p>'+esc(values.environment)+'</p></section>':''}</section>`;}
  function rules(values){return `<section class="op-rules" aria-label="参赛规则"><span class="op-kicker">PARTICIPATION RULES</span><h2>参赛规则</h2><p class="op-rule-intro">${esc(values.eligibility||'参赛资格以赛事正式规则为准。')}</p><dl class="op-rule-facts"><div><dt>参赛形式</dt><dd>${esc(values.teamMode||'待确定')}</dd></div><div><dt>团队规模</dt><dd>${values.teamMode==='仅个人参赛'?'每队 1 人':'每队最多 '+esc(values.teamMax||'待确定')+' 人'}</dd></div><div><dt>报名与组队截止</dt><dd>${esc(date(values.registrationEnd))}</dd></div></dl><div class="op-rule-copy"><h3>报名与团队</h3><p>报名赛事前，请先在个人资料完成实名认证并上传简历。</p><p>报名后需在截止前完成创建或加入团队。个人参赛也需要创建单人团队；每人在同一赛事中仅可归属一支团队。</p><p>报名截止后团队锁定。申请待审批、邀请待接受均不代表已正式入队。</p><h3>提交与补正</h3><p>任务提交期内可提交正式任务。新增提交截止后，已有任务继续审核，需补正的任务按原补正期限和任务状态处理；补正截止后不再接受重提。</p><p>团队被限制提交时，全队在本赛事暂停新提交和补正重提；历史记录继续保留。解除限制后仍须遵守赛事原有赛程。</p></div></section>`;}
  function schedule(values){return `<section class="op-schedule" aria-label="赛程与奖励">${competitionTimeline(values)}<section class="op-awards"><div><span class="op-kicker">REWARD POOL</span><h2>赛事奖励</h2><p>总奖金池</p><strong>${money(values.pool||0)}</strong></div><p>${esc(values.rankRule||'具体奖项、获奖资格与分配方式以赛事正式公示为准。')}</p>${values.distribution?'<p>'+esc(values.distribution)+'</p>':''}</section></section>`;}
  function page(data){
    const event=data.event,values=valuesFor(event),phase=M.lifecycle(event),summary=M.stats(data),tab=homeTabs.includes(detailTab)?detailTab:'概览';
    detailTab=tab;
    return `<article class="op-home" data-op-event="${esc(event.id)}"><nav class="op-breadcrumb" aria-label="赛事导航"><a class="op-back" href="#organizer">返回主办方中心</a><span aria-hidden="true">/</span><span>赛事主页</span></nav><header class="op-event-heading"><div><div class="op-heading-labels"><span class="op-domain">${esc(values.domain||'专业挑战')}</span><span class="op-example">示例赛事</span>${stage(phase)}</div><h1>${esc(values.name||event.title)}</h1><p class="op-host">主办方 · ${esc(values.organizer||event.organizer)}</p></div><div class="op-heading-actions">${phase==='报名中'?'<button type="button" class="button dark" data-op-register="'+esc(event.id)+'">'+(data.participantRegistration?'已报名 · 入群交流':'报名参加比赛')+'</button>':''}<a class="button op-manage" href="${manageHref(event.id)}">管理赛事 →</a></div></header>${data.participantRegistration?'<div class="op-registration-note">你已报名本场示例赛事。可随时从“赛事交流群”入口查看企业微信入群二维码。</div>':''}<section class="op-summary" aria-label="赛事基本信息"><div><span>总奖金池</span><strong>${money(values.pool||0)}</strong></div><div><span>参赛团队</span><strong>${summary.teams}<small>支团队</small></strong></div><div><span>正式提交</span><strong>${new Set(data.tasks.map(t=>t.id)).size}<small>条任务</small></strong></div><div class="op-deadline"><span>${phase==='报名中'?'报名截止':phase==='待开赛'?'任务提交开始':phase==='审核补正中'?'补正截止':phase==='已结束'?'结果公示':'新增提交截止'}</span><strong>${esc(date(phase==='报名中'?values.registrationEnd:phase==='待开赛'?values.submissionStart:phase==='审核补正中'?values.correctionEnd:phase==='已结束'?values.publicationAt:values.submissionEnd))}</strong></div></section><div class="op-tabs" role="tablist" aria-label="赛事详情">${homeTabs.map((label,index)=>`<button type="button" id="op-tab-${index}" role="tab" class="${tab===label?'active':''}" aria-selected="${tab===label}" aria-controls="op-tab-panel" data-tab="${label}">${label}</button>`).join('')}</div><div class="op-content" id="op-tab-panel" role="tabpanel" aria-labelledby="op-tab-${homeTabs.indexOf(tab)}">${tab==='参赛规则'?rules(values):tab==='赛程与奖励'?schedule(values):overview(values)}</div><p class="op-example-note">本页为已发布示例赛事的主页，团队和任务统计与赛事管理保持一致。</p></article>`;
  }
  const sameRegistration=(id,actor)=>location.hash==='#competition/'+id&&store().owner()===actor;
  const reportRegistrationError=error=>toast(error.message||'报名暂未保存，请重试。');
  function openRegistrationData(id){
    const data=store().read(id);
    if(M.lifecycle(data.event)!=='报名中')throw Error('当前不在报名期。');
    return data;
  }
  function registrationGate(id,actor,isCurrent,rulesAccepted){
    const center=window.expertCenter;
    if(sessionStorage.getItem('expert-demo-out')==='yes'){toast('请先登录演示身份。');return false;}
    const continueRegistration=()=>{
      if(!sameRegistration(id,actor))return;
      close();
      return registration(id,actor,rulesAccepted).catch(reportRegistrationError);
    };
    if(!window.CompetitionIdentity.verifiedAt(center.db,actor)){
      window.expertProfile.openVerification(id,{onVerified:continueRegistration});
      return false;
    }
    return center.requireResume({actor,isCurrent,onContinue:continueRegistration});
  }
  async function registration(id,actor,rulesAccepted=false){
    const isCurrent=()=>sameRegistration(id,actor)&&!document.querySelector('#dialog').open;
    if(!isCurrent())return;
    let data=openRegistrationData(id);
    if(data.participantRegistration)return window.EventContact?.openGroup(data.event,{registered:false});
    if(!await registrationGate(id,actor,isCurrent,rulesAccepted)||!isCurrent())return;
    data=openRegistrationData(id);
    if(data.participantRegistration)return window.EventContact?.openGroup(data.event,{registered:false});
    const {event}=data;
    modal('<h2 id="op-registration-title">报名参加比赛</h2><p>'+esc(event.title)+'</p><div class="review-summary"><p>报名需在个人资料完成实名认证并上传简历。</p><p><b>参赛形式：</b>'+esc(event.values.teamMode)+'</p><p><b>人数上限：</b>'+esc(event.values.teamMax)+' 人</p></div><div class="notice">报名成功后请扫码加入赛事企业微信群，获取规则答疑和后续赛事通知。本次报名仅保存在本赛事示例中。</div><label class="check"><input id="op-registration-rules" type="checkbox" '+(rulesAccepted?'checked':'')+'>我已阅读并同意比赛规则与数据许可（v1.0）</label><p id="op-registration-error" role="alert"></p><button type="button" class="button dark" data-op-confirm-register="'+esc(id)+'" data-actor="'+esc(actor)+'">确认报名</button>');
  }
  document.addEventListener('click',async e=>{
    const button=e.target.closest('[data-op-register],[data-op-confirm-register]');if(!button)return;
    e.preventDefault();e.stopImmediatePropagation();
    try{
      const id=button.dataset.opRegister||button.dataset.opConfirmRegister,actor=store().owner();
      if(!sameRegistration(id,actor))throw Error('当前赛事已变化，请重新操作。');
      if(button.hasAttribute('data-op-register'))return await registration(id,actor);
      if(button.dataset.actor!==actor){close();throw Error('演示身份已变化，请重新报名。');}
      const dialog=document.querySelector('#dialog'),rules=dialog.querySelector('#op-registration-rules');
      if(!rules?.checked){dialog.querySelector('#op-registration-error').textContent='请先阅读并同意比赛规则。';return;}
      const isCurrent=()=>sameRegistration(id,actor)&&dialog.open&&dialog.contains(button)&&rules.checked;
      if(!isCurrent())return;
      openRegistrationData(id);
      if(!await registrationGate(id,actor,isCurrent,true)||!isCurrent())return;
      const data=openRegistrationData(id);
      if(!data.participantRegistration){data.participantRegistration={at:new Date().toISOString(),userId:actor,rulesVersion:1};store().save(data);}
      close();render();toast('报名成功，请扫码加入赛事企业微信群。');
      window.EventContact?.openGroup(data.event,{registered:true,continueLabel:'返回赛事详情'});
    }catch(error){reportRegistrationError(error);}
  },true);
  function unpublished(event){return `<section class="op-unpublished" data-op-event="${esc(event.id)}"><span class="op-example">尚未发布</span><h1>赛事尚未上线</h1><p>该赛事尚未成功发布，发布完成后才会开放赛事主页。</p><a class="button op-back" href="#organizer">返回主办方中心</a></section>`;}
  render=function(){
    previous();
    const [root,id]=location.hash.slice(1).split('/');
    if(root!=='competition'||!id||!M.listEvents(store().owner()).some(event=>event.id===id))return;
    document.body.classList.remove('portal-page','admin-page','has-competition-search');
    document.querySelectorAll('[data-nav]').forEach(link=>link.classList.toggle('active',link.dataset.nav==='explore'));
    currentId=id;
    try{
      const data=store().read(id);
      document.querySelector('#main').innerHTML=data.event.stage==='已发布'?page(data):unpublished(data.event);
      document.title=data.event.stage==='已发布'?(data.event.values?.name||data.event.title)+' · benchsquare':'赛事尚未上线 · benchsquare';
    }catch(error){
      document.querySelector('#main').innerHTML='<section class="op-unpublished"><h1>暂时无法读取赛事</h1><p>'+esc(error.message||'请稍后重试。')+'</p><a class="button op-back" href="#organizer">返回主办方中心</a></section>';
      document.title='赛事暂时无法读取 · benchsquare';
    }
  };
  render();
})();
