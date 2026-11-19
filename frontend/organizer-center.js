(() => {
  'use strict';
  const M=OrganizerMocks;
  const filters=new Map();
  const store=()=>window.OrganizerDemoStore;
  const owner=()=>store().owner();
  const view=()=>{if(!filters.has(owner()))filters.set(owner(),{query:'',stage:'',phase:''});return filters.get(owner());};
  function time(value){
    if(typeof value==='number')return value;
    if(!value)return NaN;
    let text=String(value).replace(' ','T');
    if(/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?$/.test(text))text+='+08:00';
    return Date.parse(text);
  }
  function date(value,year=false){const n=time(value);return Number.isFinite(n)?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',...(year?{year:'numeric'}:{}),month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(n):'待确定';}
  function badge(label){
    const tone=({报名中:'blue',进行中:'green',审核补正中:'amber',待开赛:'neutral',待公示:'amber',已结束:'neutral',未上线:'neutral',未开始:'neutral',已发布:'green',审核中:'blue',待付款:'amber',奖金已托管:'amber',待上线:'amber',已驳回:'red',审核已过期:'red',草稿:'neutral'})[label]||'neutral';
    return `<span class="oc-badge oc-${tone}">${esc(label)}</span>`;
  }
  function rows(){
    const examples=M.listEvents(owner()).map(definition=>{
      const data=store().read(definition.id),event=data.event,summary=M.stats(data);
      return {id:event.id,event,demo:true,data,stage:event.stage||'已发布',phase:M.lifecycle(event),registered:new Set(data.teams.flatMap(t=>t.members.map(m=>m.id))).size,teams:summary.teams,tasks:new Set(data.tasks.map(t=>t.id)).size,passed:new Set(data.tasks.filter(t=>['审核通过','已录用'].includes(t.status)).map(t=>t.id)).size,anomalyTeams:summary.anomalyTeams};
    });
    const actual=(state.competitions||[]).filter(c=>(c.ownerId||'rong')===owner()).map(event=>{
      const participation=state.participation;
      return {id:event.id,event,demo:false,stage:event.stage||'草稿',phase:M.lifecycle(event),registered:participation?Object.keys(participation.regs[event.id]||{}).length:(state.registrations[event.id]?1:0),teams:participation?participation.teams.filter(t=>t.cid===event.id).length:(state.registrations[event.id]?.team?1:0),tasks:null,passed:null,anomalyTeams:null};
    });
    return [...actual,...examples];
  }
  const title=row=>row.event.values?.name||row.event.title||'未命名赛事';
  const host=row=>row.event.values?.organizer||row.event.organizer||'主办方待填写';
  function schedule(row){
    const e=row.event,v=e.values||e;
    if(row.stage==='待付款')return ['奖金托管截止',e.paymentDeadline||v.paymentDeadline];
    if(row.stage!=='已发布')return ['计划报名',v.registrationStart];
    return ({报名中:['报名截止',v.registrationEnd],待开赛:['任务提交开始',v.submissionStart],进行中:['任务提交截止',v.submissionEnd],审核补正中:['补正截止',v.correctionEnd],待公示:['结果公示',v.publicationAt],已结束:['结果已公示',v.publicationAt],未开始:['报名开始',v.registrationStart]})[row.phase]||['赛事时间',v.registrationStart];
  }
  const managementHref=row=>'#organizer-teams/'+encodeURIComponent(row.id);
  const homepageHref=row=>'#competition/'+encodeURIComponent(row.id);
  function eventName(row){
    const published=row.stage==='已发布';
    return `<div class="oc-event-name">${published?'<a class="oc-manage-link" href="'+managementHref(row)+'">'+esc(title(row))+' <span aria-hidden="true">→</span></a>':'<strong>'+esc(title(row))+'</strong>'}${row.demo?'<span class="oc-example">示例</span>':''}</div><span class="oc-event-meta">${esc(host(row))} · ${money(row.event.values?.pool||0)}</span><div class="oc-event-links">${published?'<a class="oc-home-link" href="'+homepageHref(row)+'">赛事信息 ↗</a>':'<button type="button" class="oc-text-button" data-oc="progress" data-oc-event="'+esc(row.id)+'">查看进度 →</button>'}</div>`;
  }
  function filtered(list){const f=view(),q=f.query.trim().toLowerCase();return list.filter(row=>(!q||[title(row),host(row),row.id].some(s=>s.toLowerCase().includes(q)))&&(!f.stage||row.stage===f.stage)&&(!f.phase||row.phase===f.phase));}
  function filterBar(list){
    const f=view(),stages=[...new Set(list.map(row=>row.stage))],phases=['未开始','报名中','待开赛','进行中','审核补正中','待公示','已结束','未上线'];
    return `<div class="oc-filter-bar"><label class="oc-search"><span aria-hidden="true">⌕</span><input type="search" id="oc-search" value="${esc(f.query)}" placeholder="搜索赛事名称或主办方" aria-label="搜索赛事名称或主办方"></label><select id="oc-stage" aria-label="筛选发布状态"><option value="">全部发布状态</option>${stages.map(s=>'<option value="'+esc(s)+'" '+(s===f.stage?'selected':'')+'>'+esc(s)+'</option>').join('')}</select><select id="oc-phase" aria-label="筛选赛事进度"><option value="">全部赛事进度</option>${phases.filter(s=>list.some(row=>row.phase===s)).map(s=>'<option value="'+s+'" '+(s===f.phase?'selected':'')+'>'+s+'</option>').join('')}</select><button type="button" class="oc-text-button" data-oc="clear">清除筛选</button></div>`;
  }
  function eventTable(list,mode='manage'){
    const labels=mode==='overview'?'<th>赛事</th><th>赛事进度</th><th class="oc-number">报名人数</th><th class="oc-number">团队数</th><th class="oc-number">提交任务</th><th class="oc-number">审核通过</th><th class="oc-number">异常团队</th>':'<th>赛事 / 主办方</th><th>发布状态</th><th>赛事进度</th><th>报名 / 团队</th><th class="oc-number">提交任务</th><th>关键赛程</th>';
    return `<div class="oc-table-wrap" role="region" aria-label="${mode==='overview'?'赛事数据概览':'赛事管理列表'}，可横向滚动" tabindex="0"><table class="oc-table ${mode==='overview'?'oc-overview-table':''}"><thead><tr>${labels}</tr></thead><tbody>${list.map(row=>{
      const [label,at]=schedule(row),published=row.stage==='已发布';
      const cells=mode==='overview'?`<td>${badge(row.phase)}</td><td class="oc-number">${row.registered}</td><td class="oc-number">${row.teams}</td><td class="oc-number">${row.tasks===null?'—':row.tasks}</td><td class="oc-number">${row.passed===null?'—':row.passed}</td><td class="oc-number">${row.anomalyTeams===null?'—':row.anomalyTeams}</td>`:`<td>${badge(row.stage)}</td><td>${badge(row.phase)}</td><td><span>${row.registered} 人报名</span><small>${row.teams} 支团队</small></td><td class="oc-number">${row.tasks===null?'<span class="oc-unavailable">尚未接入</span>':row.tasks}</td><td><span class="oc-schedule-label">${label}</span><small class="oc-schedule-date">${esc(date(at))}</small></td>`;
      return `<tr data-oc-row="${esc(row.id)}" ${published?'data-oc-manage="'+managementHref(row)+'"':''}><td>${eventName(row)}</td>${cells}</tr>`;
    }).join('')}</tbody></table></div>`;
  }
  function groups(list,mode='manage'){
    return [['published','已发布赛事','点击赛事进入管理，赛事信息打开赛事主页。',list.filter(row=>row.stage==='已发布')],['unpublished','待发布赛事','完成发布流程后开放赛事管理。',list.filter(row=>row.stage!=='已发布')]].filter(([, , ,items])=>items.length).map(([kind,label,hint,items])=>`<section class="oc-event-group oc-group-${kind}" data-oc-group="${kind}"><header class="oc-group-heading"><div><h3>${label}<span>${items.length}</span></h3><p>${hint}</p></div></header>${eventTable(items,mode)}</section>`).join('');
  }
  function managementResults(list){
    const shown=filtered(list);
    if(!shown.length)return '<div class="oc-empty"><h3>没有符合条件的赛事</h3><p>试试其他关键词或调整状态筛选。</p><button type="button" class="button" data-oc="clear">清除筛选</button></div>';
    return `<div class="oc-result-count">显示 ${shown.length} / ${list.length} 场赛事</div>${groups(shown)}`;
  }
  function overview(list){
    const submitted=list.filter(row=>row.demo).reduce((sum,row)=>sum+row.tasks,0),passed=list.filter(row=>row.demo).reduce((sum,row)=>sum+row.passed,0),anomalies=list.filter(row=>row.demo).reduce((sum,row)=>sum+row.anomalyTeams,0);
    return `<section class="oc-overview"><div class="oc-overview-summary"><div><span>示例正式任务</span><strong>${submitted}<small>条</small></strong></div><div><span>示例审核通过</span><strong>${passed}<small>条</small></strong></div><div><span>待处理异常团队</span><strong>${anomalies}<small>支</small></strong></div></div><p class="oc-caption">报名和团队按赛事分别统计；示例任务按 Task 去重。你创建的赛事继续使用现有报名记录，任务统计尚未接入。</p>${groups(list,'overview')}</section>`;
  }
  function drafts(){return creationDraftList().map(([key,draft])=>`<div class="team-card oc-local-draft"><div class="team-avatar">D</div><div><h3>${esc(draft.name||'未命名比赛')}</h3><p>${draft.editId?'本地修改稿 · 基于 v'+esc(draft._baseVersion||1):'本地草稿 · 尚未提交'}</p></div><div class="participation-actions"><button class="button" data-action="resume-draft" data-key="${esc(key)}">继续编辑</button><button class="button" data-action="delete-draft" data-key="${esc(key)}">删除草稿</button></div></div>`).join('');}
  organizer=function(){
    try{
      const list=rows(),totals=list.reduce((sum,row)=>({registered:sum.registered+row.registered,teams:sum.teams+row.teams}),{registered:0,teams:0});
      const stats=[['管理赛事',list.length],['已发布赛事',list.filter(row=>row.stage==='已发布').length],['累计报名人次',totals.registered],['参赛团队',totals.teams]];
      return `<div class="oc-page">${heading('主办方中心','管理赛事进度、报名团队和提交数据。','<button class="button dark" data-action="create">＋ 创建比赛</button>')}<section class="organizer-stats oc-stats" aria-label="当前主办方赛事统计">${stats.map(([label,n])=>'<div class="panel"><span>'+label+'</span><strong>'+n+'</strong></div>').join('')}</section><div class="tabs" role="tablist" aria-label="主办方中心"><button class="tab ${organizerTab==='manage'?'active':''}" role="tab" aria-selected="${organizerTab==='manage'}" data-organizer-tab="manage">赛事管理</button><button class="tab ${organizerTab==='data'?'active':''}" role="tab" aria-selected="${organizerTab==='data'}" data-organizer-tab="data">数据概览</button></div>${organizerTab==='data'?overview(list):drafts()+'<section class="oc-management"><div class="oc-section-heading"><div><h2>我的赛事</h2><p>从赛事进入团队管理，查看提交、核查异常与管理提交限制。</p></div><span class="oc-stage-help">发布状态与赛事进度分别展示</span></div>'+filterBar(list)+'<div id="oc-results" aria-live="polite">'+managementResults(list)+'</div></section>'}<p class="oc-caption oc-bottom-caption">示例赛事仅用于本地体验；你创建的赛事照常保留。</p></div>`;
    }catch(error){return heading('主办方中心','管理赛事与报名团队。','<button class="button dark" data-action="create">＋ 创建比赛</button>')+'<section class="oc-empty"><h2>暂时无法读取赛事</h2><p>'+esc(error.message||'请稍后重试。')+'</p><button type="button" class="button" data-oc="retry">重新读取</button></section>';}
  };
  const stageNotes={草稿:'完善赛事方案后提交审核。',审核中:'方案已提交，等待平台审核。',待付款:'方案审核已通过，等待完成奖金托管。',待托管核验:'托管凭据已提交，等待核验。',奖金已托管:'奖金已托管，等待上线确认。',待发布:'托管核验已通过，等待上线确认。',待上线:'等待上线确认。',已驳回:'方案审核未通过，请按审核意见修改。',审核已过期:'奖金托管期限已过，需重新提交审核。'};
  function showProgress(id){
    const row=rows().find(row=>row.id===id);if(!row)return toast('未找到当前身份的赛事。');
    if(row.stage==='已发布'){go(homepageHref(row));return;}
    const stages=['完善方案','平台审核','奖金托管','上线确认','发布成功'];
    const current=({草稿:0,审核中:1,已驳回:1,待付款:2,待托管核验:2,审核已过期:2,奖金已托管:3,待发布:3,待上线:3})[row.stage]??0;
    const failed=['已驳回','审核已过期'].includes(row.stage),e=row.event;
    document.querySelector('#dialog').classList.add('oc-event-dialog','oc-progress-dialog');
    modal(`<span class="oc-dialog-kicker">赛事发布进度</span><h2>${esc(title(row))}</h2><div class="oc-dialog-status">${badge(row.stage)}</div><div class="oc-release-track" role="progressbar" aria-label="赛事发布进度" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${current}" aria-valuetext="${esc(stages[current])}，${esc(row.stage)}"><span style="width:${current/4*100}%"></span></div><ol class="oc-release-steps">${stages.map((label,i)=>`<li data-oc-step="${i}" data-state="${i<current?'done':i===current?(failed?'error':'current'):'upcoming'}" ${i===current?'aria-current="step"':''}><span class="oc-release-dot" aria-hidden="true">${i<current?'✓':i+1}</span><strong>${label}</strong><small>${i<current?'已完成':i===current?(failed?'需处理':'当前阶段'):'未开始'}</small></li>`).join('')}</ol><p class="oc-release-hint">${esc(stageNotes[row.stage]||'赛事尚未成功发布。')}</p>${row.stage==='待付款'&&e.paymentDeadline?'<p class="oc-release-deadline">托管截止：'+esc(date(e.paymentDeadline,true))+'</p>':''}${failed&&e.reason?'<p class="oc-release-error">'+esc(e.reason)+'</p>':''}<div class="oc-dialog-actions"><button type="button" class="button" data-action="close">关闭</button></div>`);
  }
  function updateResults(){const target=document.querySelector('#oc-results');if(!target)return;try{target.innerHTML=managementResults(rows());}catch(error){toast(error.message||'暂时无法读取赛事。');}}
  document.addEventListener('input',e=>{if(e.target.id==='oc-search'){view().query=e.target.value;updateResults();}});
  document.addEventListener('change',e=>{if(e.target.id==='oc-stage'){view().stage=e.target.value;updateResults();}if(e.target.id==='oc-phase'){view().phase=e.target.value;updateResults();}});
  document.addEventListener('click',e=>{const eventRow=e.target.closest('[data-oc-manage]');if(eventRow&&!e.target.closest('a,button,input,select')){go(eventRow.dataset.ocManage);return;}const b=e.target.closest('[data-oc]');if(!b)return;try{if(b.dataset.oc==='clear'){Object.assign(view(),{query:'',stage:'',phase:''});render();}if(b.dataset.oc==='retry')render();if(b.dataset.oc==='progress')showProgress(b.dataset.ocEvent);}catch(error){toast(error.message||'操作失败，请重试。');}});
  document.querySelector('#dialog').addEventListener('close',()=>document.querySelector('#dialog').classList.remove('oc-event-dialog','oc-progress-dialog'));
  render();
})();
